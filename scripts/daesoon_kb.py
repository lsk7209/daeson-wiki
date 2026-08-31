#!/usr/bin/env python3
"""Inspect, search, export, and validate the Daesoon Hoebo knowledge base.

The source may be the GitHub-ready ZIP or an extracted package directory.  All
commands are read-only except ``export --write``.  Exports are deliberately
private, unreviewed proposals; promotion to an application dataset is a
separate human-reviewed step.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import io
import json
import os
import re
import sys
import unicodedata
import zipfile
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable, Iterator, TextIO
from urllib.parse import urlparse


MANIFEST = "knowledge-base/KB_MANIFEST.yaml"
COLLECTION_SUMMARY = "knowledge-base/quality-reports/collection-summary.json"
CATALOG = "knowledge-base/datasets/catalog.jsonl"
ARTICLES_CSV = "knowledge-base/datasets/articles.csv"
ISSUES_CSV = "knowledge-base/datasets/issues.csv"
CHUNKS_PREFIX = "knowledge-base/datasets/chunks/"
ARTICLE_PATH_RE = re.compile(
    r"^knowledge-base/issues/(?P<issue>\d{3})/articles/.+\.md$"
)
ISSUE_PATH_RE = re.compile(r"^knowledge-base/issues/(?P<issue>\d{3})/issue\.md$")
CHUNK_PATH_RE = re.compile(r"^knowledge-base/datasets/chunks/(?P<issue>\d{3})\.jsonl$")

REQUIRED_SOURCE_ENTRIES = (
    MANIFEST,
    COLLECTION_SUMMARY,
    CATALOG,
    ARTICLES_CSV,
    ISSUES_CSV,
)
SCHEMA_PATH = (
    Path(__file__).resolve().parents[1]
    / "schemas"
    / "daesoon-kb-app-projection.schema.json"
)
PROPOSALS_DIR = Path(__file__).resolve().parents[1] / "data" / "kb" / "proposals"

ALLOWED_REVIEW_STATUS = {"not_reviewed", "in_review", "approved", "rejected"}
ALLOWED_RIGHTS_STATUS = {
    "internal_research_only",
    "metadata_only",
    "approved_excerpt",
    "public_link_only",
    "restricted",
}
ALLOWED_VISIBILITY = {"private", "internal", "public"}
PUBLIC_RIGHTS = {"approved_excerpt"}


class KBError(RuntimeError):
    """Actionable data or usage error."""


class KBSource:
    """Uniform read-only access to a ZIP or extracted KB package."""

    def __init__(self, path: Path):
        self.path = path.resolve()
        self._zip: zipfile.ZipFile | None = None
        self._root: Path | None = None
        self._names: tuple[str, ...] | None = None

        if self.path.is_file() and zipfile.is_zipfile(self.path):
            self._zip = zipfile.ZipFile(self.path, "r")
        elif self.path.is_dir():
            if (self.path / "knowledge-base").is_dir():
                self._root = self.path
            elif self.path.name == "knowledge-base" and (self.path / "KB_MANIFEST.yaml").is_file():
                self._root = self.path.parent
            else:
                raise KBError(
                    f"directory does not contain knowledge-base/: {self.path}"
                )
        else:
            raise KBError(f"knowledge-base source not found or unsupported: {self.path}")

        missing = [entry for entry in REQUIRED_SOURCE_ENTRIES if not self.exists(entry)]
        if missing:
            self.close()
            raise KBError("source is missing required entries: " + ", ".join(missing))

    def close(self) -> None:
        if self._zip is not None:
            self._zip.close()
            self._zip = None

    def __enter__(self) -> "KBSource":
        return self

    def __exit__(self, *_: object) -> None:
        self.close()

    @property
    def kind(self) -> str:
        return "zip" if self._zip is not None else "directory"

    def exists(self, relative: str) -> bool:
        relative = relative.replace("\\", "/")
        if self._zip is not None:
            try:
                self._zip.getinfo(relative)
                return True
            except KeyError:
                return False
        assert self._root is not None
        return (self._root / Path(relative)).is_file()

    def names(self) -> tuple[str, ...]:
        if self._names is None:
            if self._zip is not None:
                self._names = tuple(info.filename for info in self._zip.infolist())
            else:
                assert self._root is not None
                self._names = tuple(
                    path.relative_to(self._root).as_posix()
                    for path in self._root.rglob("*")
                    if path.is_file()
                )
        return self._names

    def open_text(self, relative: str) -> TextIO:
        relative = relative.replace("\\", "/")
        if self._zip is not None:
            try:
                binary = self._zip.open(relative, "r")
            except KeyError as exc:
                raise KBError(f"missing source entry: {relative}") from exc
            return io.TextIOWrapper(binary, encoding="utf-8-sig", newline="")
        assert self._root is not None
        path = self._root / Path(relative)
        try:
            return path.open("r", encoding="utf-8-sig", newline="")
        except FileNotFoundError as exc:
            raise KBError(f"missing source entry: {relative}") from exc

    def read_text(self, relative: str) -> str:
        with self.open_text(relative) as stream:
            return stream.read()

    def read_bytes(self, relative: str) -> bytes:
        relative = relative.replace("\\", "/")
        if self._zip is not None:
            try:
                return self._zip.read(relative)
            except KeyError as exc:
                raise KBError(f"missing source entry: {relative}") from exc
        assert self._root is not None
        path = self._root / Path(relative)
        try:
            return path.read_bytes()
        except FileNotFoundError as exc:
            raise KBError(f"missing source entry: {relative}") from exc

    def iter_jsonl(self, relative: str) -> Iterator[dict]:
        with self.open_text(relative) as stream:
            for line_no, line in enumerate(stream, start=1):
                if not line.strip():
                    continue
                try:
                    value = json.loads(line)
                except json.JSONDecodeError as exc:
                    raise KBError(f"invalid JSONL: {relative}:{line_no}: {exc}") from exc
                if not isinstance(value, dict):
                    raise KBError(f"JSONL record is not an object: {relative}:{line_no}")
                yield value

    def read_json(self, relative: str) -> dict:
        try:
            value = json.loads(self.read_text(relative))
        except json.JSONDecodeError as exc:
            raise KBError(f"invalid JSON: {relative}: {exc}") from exc
        if not isinstance(value, dict):
            raise KBError(f"JSON document is not an object: {relative}")
        return value

    def csv_rows(self, relative: str) -> Iterator[dict[str, str]]:
        with self.open_text(relative) as stream:
            yield from csv.DictReader(stream)

    def release_digest(self) -> str:
        """Return a packaging-independent digest for the logical KB release."""
        digest = hashlib.sha256()
        release_entries = sorted(
            {
                *REQUIRED_SOURCE_ENTRIES,
                *(name for name in self.names() if ISSUE_PATH_RE.fullmatch(name)),
                *(name for name in self.names() if ARTICLE_PATH_RE.fullmatch(name)),
                *(name for name in self.names() if CHUNK_PATH_RE.fullmatch(name)),
            }
        )
        for relative in release_entries:
            digest.update(relative.encode("utf-8"))
            digest.update(b"\0")
            digest.update(self.read_bytes(relative))
            digest.update(b"\0")
        return digest.hexdigest()

    def artifact_digest(self) -> str | None:
        """Return the exact archive digest when the source is a ZIP artifact."""
        if self.kind != "zip":
            return None
        digest = hashlib.sha256()
        with self.path.open("rb") as stream:
            for block in iter(lambda: stream.read(1024 * 1024), b""):
                digest.update(block)
        return digest.hexdigest()


def resolve_source(value: str | None) -> Path:
    candidate = value or os.environ.get("DAESOON_KB_PATH")
    if not candidate:
        raise KBError(
            "provide --source PATH or set DAESOON_KB_PATH to the ZIP/extracted package"
        )
    return Path(candidate).expanduser()


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def normalized(value: object) -> str:
    return unicodedata.normalize("NFKC", str(value or "")).casefold()


def truncate_exact(text: str, limit: int) -> str:
    text = text.strip()
    if len(text) <= limit:
        return text
    return text[:limit].rstrip()


def chunk_paths(source: KBSource) -> list[str]:
    return sorted(name for name in source.names() if CHUNK_PATH_RE.fullmatch(name))


def inspect_source(source: KBSource) -> dict:
    names = source.names()
    summary = source.read_json(COLLECTION_SUMMARY)
    issue_files = [name for name in names if ISSUE_PATH_RE.fullmatch(name)]
    article_files = [name for name in names if ARTICLE_PATH_RE.fullmatch(name)]
    chunk_files = chunk_paths(source)

    issues = list(source.csv_rows(ISSUES_CSV))
    article_rows = list(source.csv_rows(ARTICLES_CSV))
    catalog_count = 0
    article_ids: set[str] = set()
    duplicate_ids: set[str] = set()
    for record in source.iter_jsonl(CATALOG):
        catalog_count += 1
        article_id = str(record.get("id") or "")
        if article_id in article_ids:
            duplicate_ids.add(article_id)
        article_ids.add(article_id)

    chunk_count = 0
    chunk_ids: set[str] = set()
    duplicate_chunk_ids: set[str] = set()
    unknown_article_refs: set[str] = set()
    for path in chunk_files:
        for record in source.iter_jsonl(path):
            chunk_count += 1
            chunk_id = str(record.get("chunk_id") or "")
            article_id = str(record.get("article_id") or "")
            if chunk_id in chunk_ids:
                duplicate_chunk_ids.add(chunk_id)
            chunk_ids.add(chunk_id)
            if article_id not in article_ids:
                unknown_article_refs.add(article_id)

    issue_numbers = sorted(int(row["issue_no"]) for row in issues)
    expected_range = list(summary.get("issue_range") or [])
    start = int(expected_range[0]) if len(expected_range) == 2 else None
    end = int(expected_range[1]) if len(expected_range) == 2 else None
    missing_issues = (
        [number for number in range(start, end + 1) if number not in issue_numbers]
        if start is not None and end is not None
        else []
    )

    parse_status: dict[str, int] = {}
    ocr_status: dict[str, int] = {}
    review_status: dict[str, int] = {}
    for row in article_rows:
        for field, target in (
            ("parse_status", parse_status),
            ("ocr_status", ocr_status),
            ("review_status", review_status),
        ):
            key = row.get(field) or "missing"
            target[key] = target.get(key, 0) + 1

    actual = {
        "issues": len(issues),
        "issueMarkdown": len(issue_files),
        "articles": len(article_rows),
        "articleMarkdown": len(article_files),
        "catalogRecords": catalog_count,
        "chunkFiles": len(chunk_files),
        "chunks": chunk_count,
    }
    expected = {
        "issues": summary.get("issues_collected"),
        "issueMarkdown": summary.get("issues_collected"),
        "articles": summary.get("articles_collected"),
        "articleMarkdown": summary.get("markdown_files"),
        "catalogRecords": summary.get("articles_collected"),
        "chunkFiles": summary.get("issues_collected"),
        "chunks": summary.get("chunks_generated"),
    }
    errors: list[str] = []
    for field, expected_value in expected.items():
        if expected_value is not None and actual[field] != int(expected_value):
            errors.append(
                f"{field} mismatch: expected {expected_value}, found {actual[field]}"
            )
    if duplicate_ids:
        errors.append(f"duplicate article ids: {len(duplicate_ids)}")
    if duplicate_chunk_ids:
        errors.append(f"duplicate chunk ids: {len(duplicate_chunk_ids)}")
    if unknown_article_refs:
        errors.append(f"chunks reference unknown articles: {len(unknown_article_refs)}")
    if missing_issues:
        errors.append("missing issue numbers: " + ", ".join(map(str, missing_issues)))

    return {
        "status": "passed" if not errors else "failed",
        "source": str(source.path),
        "sourceKind": source.kind,
        "releaseDigest": source.release_digest(),
        "artifactDigest": source.artifact_digest(),
        "schemaVersion": extract_yaml_scalar(source.read_text(MANIFEST), "schema_version"),
        "issueRange": expected_range,
        "actual": actual,
        "quality": {
            "parseStatus": parse_status,
            "ocrStatus": ocr_status,
            "reviewStatus": review_status,
            "ocrRequired": summary.get("ocr_required_articles"),
            "imageOnly": summary.get("image_only_articles"),
            "uniqueCategories": summary.get("unique_categories"),
            "repeatedContentGroups": summary.get("repeated_content_groups"),
        },
        "errors": errors,
    }


def extract_yaml_scalar(text: str, key: str) -> str | None:
    match = re.search(rf"(?m)^{re.escape(key)}:\s*[\"']?([^\"'\n]+)", text)
    return match.group(1).strip() if match else None


def load_projection_schema() -> dict:
    try:
        value = json.loads(SCHEMA_PATH.read_text("utf-8"))
    except FileNotFoundError as exc:
        raise KBError(f"projection schema is missing: {SCHEMA_PATH}") from exc
    except json.JSONDecodeError as exc:
        raise KBError(f"projection schema is invalid JSON: {SCHEMA_PATH}: {exc}") from exc
    if not isinstance(value, dict):
        raise KBError("projection schema root must be an object")
    return value


def json_type_matches(value: object, expected: str) -> bool:
    if expected == "null":
        return value is None
    if expected == "object":
        return isinstance(value, dict)
    if expected == "array":
        return isinstance(value, list)
    if expected == "string":
        return isinstance(value, str)
    if expected == "boolean":
        return isinstance(value, bool)
    if expected == "integer":
        return isinstance(value, int) and not isinstance(value, bool)
    if expected == "number":
        return isinstance(value, (int, float)) and not isinstance(value, bool)
    return False


def resolve_local_schema_ref(root_schema: dict, reference: str) -> dict:
    if not reference.startswith("#/"):
        raise KBError(f"unsupported non-local schema reference: {reference}")
    current: object = root_schema
    for raw_part in reference[2:].split("/"):
        part = raw_part.replace("~1", "/").replace("~0", "~")
        if not isinstance(current, dict) or part not in current:
            raise KBError(f"unresolvable schema reference: {reference}")
        current = current[part]
    if not isinstance(current, dict):
        raise KBError(f"schema reference is not an object: {reference}")
    return current


def schema_validation_errors(
    value: object,
    schema: dict,
    root_schema: dict,
    path: str = "$",
) -> list[str]:
    """Validate the JSON-Schema subset used by the projection contract."""
    if "$ref" in schema:
        return schema_validation_errors(
            value,
            resolve_local_schema_ref(root_schema, str(schema["$ref"])),
            root_schema,
            path,
        )

    errors: list[str] = []
    if "const" in schema and value != schema["const"]:
        errors.append(f"schema {path}: must equal {schema['const']!r}")
    if "enum" in schema and value not in schema["enum"]:
        errors.append(f"schema {path}: value is not in the allowed enum")

    expected_types = schema.get("type")
    if expected_types is not None:
        if isinstance(expected_types, str):
            expected_types = [expected_types]
        if not isinstance(expected_types, list) or not all(
            isinstance(item, str) for item in expected_types
        ):
            raise KBError(f"invalid type declaration in projection schema at {path}")
        if not any(json_type_matches(value, item) for item in expected_types):
            errors.append(
                f"schema {path}: expected {' or '.join(expected_types)}, "
                f"found {type(value).__name__}"
            )
            return errors

    if isinstance(value, dict):
        required = schema.get("required") or []
        for key in required:
            if key not in value:
                errors.append(f"schema {path}.{key}: required property is missing")
        properties = schema.get("properties") or {}
        if not isinstance(properties, dict):
            raise KBError(f"invalid properties declaration in projection schema at {path}")
        for key, child in properties.items():
            if key in value and isinstance(child, dict):
                errors.extend(
                    schema_validation_errors(
                        value[key], child, root_schema, f"{path}.{key}"
                    )
                )
        if schema.get("additionalProperties") is False:
            for key in value.keys() - properties.keys():
                errors.append(f"schema {path}.{key}: additional property is not allowed")

    if isinstance(value, list):
        minimum_items = schema.get("minItems")
        maximum_items = schema.get("maxItems")
        if minimum_items is not None and len(value) < int(minimum_items):
            errors.append(f"schema {path}: fewer than {minimum_items} items")
        if maximum_items is not None and len(value) > int(maximum_items):
            errors.append(f"schema {path}: more than {maximum_items} items")
        if schema.get("uniqueItems"):
            encoded = [
                json.dumps(item, ensure_ascii=False, sort_keys=True) for item in value
            ]
            if len(encoded) != len(set(encoded)):
                errors.append(f"schema {path}: items must be unique")
        prefix_items = schema.get("prefixItems") or []
        for index, child in enumerate(prefix_items):
            if index < len(value) and isinstance(child, dict):
                errors.extend(
                    schema_validation_errors(
                        value[index], child, root_schema, f"{path}[{index}]"
                    )
                )
        item_schema = schema.get("items")
        if isinstance(item_schema, dict):
            for index, item in enumerate(value):
                errors.extend(
                    schema_validation_errors(
                        item, item_schema, root_schema, f"{path}[{index}]"
                    )
                )

    if isinstance(value, str):
        minimum_length = schema.get("minLength")
        maximum_length = schema.get("maxLength")
        if minimum_length is not None and len(value) < int(minimum_length):
            errors.append(f"schema {path}: shorter than {minimum_length} characters")
        if maximum_length is not None and len(value) > int(maximum_length):
            errors.append(f"schema {path}: longer than {maximum_length} characters")
        pattern = schema.get("pattern")
        if pattern is not None and re.search(str(pattern), value) is None:
            errors.append(f"schema {path}: does not match required pattern")
        value_format = schema.get("format")
        if value_format == "date-time":
            try:
                parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
                if parsed.tzinfo is None:
                    raise ValueError("timezone required")
            except ValueError:
                errors.append(f"schema {path}: invalid RFC3339 date-time")
        elif value_format == "uri":
            parsed_uri = urlparse(value)
            if not parsed_uri.scheme or not parsed_uri.netloc:
                errors.append(f"schema {path}: invalid absolute URI")

    if isinstance(value, (int, float)) and not isinstance(value, bool):
        minimum = schema.get("minimum")
        maximum = schema.get("maximum")
        if minimum is not None and value < minimum:
            errors.append(f"schema {path}: less than minimum {minimum}")
        if maximum is not None and value > maximum:
            errors.append(f"schema {path}: greater than maximum {maximum}")

    for child in schema.get("allOf") or []:
        if isinstance(child, dict):
            errors.extend(schema_validation_errors(value, child, root_schema, path))
    condition = schema.get("if")
    consequent = schema.get("then")
    if isinstance(condition, dict) and isinstance(consequent, dict):
        if not schema_validation_errors(value, condition, root_schema, path):
            errors.extend(schema_validation_errors(value, consequent, root_schema, path))
    return errors


def validate_output_path(path: Path, proposal_root: Path | None = None) -> Path:
    if proposal_root is None:
        proposal_root = PROPOSALS_DIR
    resolved_root = proposal_root.resolve()
    resolved_path = path.resolve()
    try:
        resolved_path.relative_to(resolved_root)
    except ValueError as exc:
        raise KBError(
            f"export output must stay inside the proposal directory: {resolved_root}"
        ) from exc
    if resolved_path == resolved_root or resolved_path.suffix.casefold() != ".json":
        raise KBError("export output must be a .json file inside the proposal directory")
    return resolved_path


@dataclass(frozen=True)
class SearchOptions:
    query: str
    limit: int = 20
    issue: int | None = None
    category: str | None = None
    article_ids: frozenset[str] = frozenset()
    excerpt_chars: int = 500


def search_source(source: KBSource, options: SearchOptions) -> list[dict]:
    query_terms = [part for part in normalized(options.query).split() if part]
    category_filter = normalized(options.category)
    catalog = {record["id"]: record for record in source.iter_jsonl(CATALOG)}
    best_by_article: dict[str, dict] = {}

    for path in chunk_paths(source):
        for chunk in source.iter_jsonl(path):
            article_id = str(chunk.get("article_id") or "")
            article = catalog.get(article_id)
            if article is None:
                continue
            if options.article_ids and article_id not in options.article_ids:
                continue
            if options.issue is not None and int(article.get("issue_no") or 0) != options.issue:
                continue
            if category_filter and category_filter not in normalized(article.get("category_original")):
                continue

            haystack = "\n".join(
                (
                    str(article.get("title") or ""),
                    str(article.get("category_original") or ""),
                    str(chunk.get("text") or ""),
                )
            )
            folded = normalized(haystack)
            if query_terms and not all(term in folded for term in query_terms):
                continue

            title_folded = normalized(article.get("title"))
            category_folded = normalized(article.get("category_original"))
            text_folded = normalized(chunk.get("text"))
            score = sum(
                title_folded.count(term) * 8
                + category_folded.count(term) * 3
                + text_folded.count(term)
                for term in query_terms
            )
            result = {
                "score": score,
                "articleId": article_id,
                "chunkId": chunk.get("chunk_id"),
                "issueNo": article.get("issue_no"),
                "publicationDate": article.get("publication_date"),
                "categoryOriginal": article.get("category_original"),
                "title": article.get("title"),
                "sourceUrl": article.get("source_url"),
                "contentSha256": article.get("content_sha256"),
                "paragraphIds": chunk.get("paragraph_ids") or [],
                "chunkContentSha256": chunk.get("content_sha256"),
                "excerpt": truncate_exact(str(chunk.get("text") or ""), options.excerpt_chars),
                "parseStatus": article.get("parse_status"),
                "ocrStatus": article.get("ocr_status"),
                "reviewStatus": article.get("review_status"),
            }
            previous = best_by_article.get(article_id)
            if (
                previous is None
                or result["score"] > previous["score"]
                or (
                    result["score"] == previous["score"]
                    and (result["chunkId"] or "") < (previous["chunkId"] or "")
                )
            ):
                best_by_article[article_id] = result

    return sorted(
        best_by_article.values(),
        key=lambda item: (-int(item["score"]), int(item["issueNo"]), str(item["articleId"])),
    )[: max(1, min(options.limit, 200))]


def get_article(source: KBSource, article_id: str) -> dict:
    article = next(
        (record for record in source.iter_jsonl(CATALOG) if record.get("id") == article_id),
        None,
    )
    if article is None:
        raise KBError(f"unknown article id: {article_id}")
    issue_no = int(article.get("issue_no") or 0)
    relative = (
        f"knowledge-base/issues/{issue_no:03d}/articles/{article_id}.md"
    )
    if not source.exists(relative):
        raise KBError(f"canonical article Markdown is missing: {relative}")
    return {
        "articleId": article_id,
        "issueNo": issue_no,
        "title": article.get("title"),
        "sourceUrl": article.get("source_url"),
        "path": relative,
        "markdown": source.read_text(relative),
    }


def build_projection(source: KBSource, results: Iterable[dict]) -> dict:
    summary = source.read_json(COLLECTION_SUMMARY)
    digest = source.release_digest()
    artifact_digest = source.artifact_digest()
    citations = []
    for result in results:
        citations.append(
            {
                "id": f"cite-{result['chunkId']}",
                "kbRelease": f"sha256:{digest}",
                "articleId": result["articleId"],
                "chunkId": result["chunkId"],
                "issueNo": result["issueNo"],
                "publicationDate": result["publicationDate"],
                "categoryOriginal": result["categoryOriginal"],
                "title": result["title"],
                "sourceUrl": result["sourceUrl"],
                "contentSha256": result["contentSha256"],
                "chunkContentSha256": result["chunkContentSha256"],
                "paragraphIds": result["paragraphIds"],
                "excerpt": result["excerpt"],
                "citationMode": "exact_excerpt",
                "relationType": "related_reference",
                "targets": [],
                "confidence": None,
                "reviewStatus": "not_reviewed",
                "reviewer": None,
                "reviewedAt": None,
                "rightsStatus": "internal_research_only",
                "visibility": "private",
            }
        )
    return {
        "schemaVersion": "daesoon-kb-app-projection/1.0.0",
        "generatedAt": utc_now(),
        "source": {
            "name": "대순회보 이식형 지식베이스",
            "kbRelease": f"sha256:{digest}",
            "artifactDigest": (
                f"sha256:{artifact_digest}" if artifact_digest is not None else None
            ),
            "schemaVersion": extract_yaml_scalar(source.read_text(MANIFEST), "schema_version"),
            "issueRange": summary.get("issue_range"),
            "articleCount": summary.get("articles_collected"),
            "chunkCount": summary.get("chunks_generated"),
            "collectedAt": summary.get("generated_at"),
        },
        "citations": citations,
    }


def load_projection(path: Path) -> dict:
    try:
        value = json.loads(path.read_text("utf-8"))
    except FileNotFoundError as exc:
        raise KBError(f"projection file not found: {path}") from exc
    except json.JSONDecodeError as exc:
        raise KBError(f"invalid projection JSON: {path}: {exc}") from exc
    if not isinstance(value, dict):
        raise KBError("projection root must be an object")
    return value


def validate_projection(source: KBSource, projection: dict) -> dict:
    projection_schema = load_projection_schema()
    errors = schema_validation_errors(
        projection, projection_schema, projection_schema
    )
    if projection.get("schemaVersion") != "daesoon-kb-app-projection/1.0.0":
        errors.append("unsupported schemaVersion")
    expected_release = f"sha256:{source.release_digest()}"
    source_metadata = projection.get("source")
    if not isinstance(source_metadata, dict):
        errors.append("projection source must be an object")
        source_metadata = {}
    if source_metadata.get("kbRelease") != expected_release:
        errors.append("projection source kbRelease does not match the supplied KB")
    artifact_digest = source.artifact_digest()
    expected_artifact = (
        f"sha256:{artifact_digest}" if artifact_digest is not None else None
    )
    claimed_artifact = source_metadata.get("artifactDigest")
    if (
        expected_artifact
        and claimed_artifact is not None
        and claimed_artifact != expected_artifact
    ):
        errors.append("projection source artifactDigest does not match the supplied ZIP")

    catalog = {record["id"]: record for record in source.iter_jsonl(CATALOG)}
    citations = projection.get("citations")
    if not isinstance(citations, list):
        errors.append("citations must be an array")
        citations = []
    referenced_chunk_ids = {
        citation.get("chunkId")
        for citation in citations
        if isinstance(citation, dict) and citation.get("chunkId")
    }
    chunks: dict[str, dict] = {}
    for path in chunk_paths(source):
        for chunk in source.iter_jsonl(path):
            if chunk.get("chunk_id") in referenced_chunk_ids:
                chunks[str(chunk["chunk_id"])] = chunk

    seen_ids: set[str] = set()
    for index, citation in enumerate(citations):
        prefix = f"citations[{index}]"
        if not isinstance(citation, dict):
            errors.append(f"{prefix} must be an object")
            continue
        if citation.get("kbRelease") != expected_release:
            errors.append(f"{prefix}.kbRelease does not match the supplied KB")
        citation_id = citation.get("id")
        if not citation_id or citation_id in seen_ids:
            errors.append(f"{prefix}.id is missing or duplicate")
        seen_ids.add(str(citation_id))
        article_id = citation.get("articleId")
        article = catalog.get(article_id)
        if article is None:
            errors.append(f"{prefix}.articleId is unknown: {article_id}")
            continue
        chunk_id = citation.get("chunkId")
        chunk = chunks.get(chunk_id)
        if chunk is None or chunk.get("article_id") != article_id:
            errors.append(f"{prefix}.chunkId is unknown or belongs to another article")
            continue

        comparisons = (
            ("issueNo", article.get("issue_no")),
            ("publicationDate", article.get("publication_date")),
            ("categoryOriginal", article.get("category_original")),
            ("title", article.get("title")),
            ("sourceUrl", article.get("source_url")),
            ("contentSha256", article.get("content_sha256")),
            ("chunkContentSha256", chunk.get("content_sha256")),
        )
        for field, expected in comparisons:
            if citation.get(field) != expected:
                errors.append(f"{prefix}.{field} does not match canonical KB")

        paragraph_ids = citation.get("paragraphIds")
        if not isinstance(paragraph_ids, list) or not paragraph_ids:
            errors.append(f"{prefix}.paragraphIds must be a non-empty array")
        elif not set(paragraph_ids).issubset(set(chunk.get("paragraph_ids") or [])):
            errors.append(f"{prefix}.paragraphIds are not contained in the chunk")

        excerpt = citation.get("excerpt")
        if not isinstance(excerpt, str) or not excerpt.strip():
            errors.append(f"{prefix}.excerpt must be non-empty")
        elif citation.get("citationMode") == "exact_excerpt" and excerpt not in str(
            chunk.get("text") or ""
        ):
            errors.append(f"{prefix}.excerpt is not an exact substring of the chunk")

        review_status = citation.get("reviewStatus")
        rights_status = citation.get("rightsStatus")
        visibility = citation.get("visibility")
        if review_status not in ALLOWED_REVIEW_STATUS:
            errors.append(f"{prefix}.reviewStatus is invalid")
        if rights_status not in ALLOWED_RIGHTS_STATUS:
            errors.append(f"{prefix}.rightsStatus is invalid")
        if visibility not in ALLOWED_VISIBILITY:
            errors.append(f"{prefix}.visibility is invalid")
        if review_status == "approved" and (
            not citation.get("reviewer") or not citation.get("reviewedAt")
        ):
            errors.append(f"{prefix} approved records require reviewer and reviewedAt")
        if visibility == "public" and (
            review_status != "approved" or rights_status not in PUBLIC_RIGHTS
        ):
            errors.append(
                f"{prefix} public visibility requires approved review and public-compatible rights"
            )

    return {
        "status": "passed" if not errors else "failed",
        "checkedCitations": len(citations),
        "kbRelease": expected_release,
        "errors": errors,
    }


def print_search_results(results: list[dict]) -> None:
    if not results:
        print("검색 결과가 없습니다.")
        return
    for index, result in enumerate(results, start=1):
        print(f"{index}. [{result['issueNo']}호] {result['title']}")
        print(f"   기사: {result['articleId']} / 청크: {result['chunkId']}")
        print(f"   코너: {result['categoryOriginal'] or '미확인'}")
        print(f"   문단: {', '.join(result['paragraphIds'])}")
        print(f"   상태: review={result['reviewStatus']}, ocr={result['ocrStatus']}")
        print(f"   원문: {result['sourceUrl']}")
        print(f"   근거: {result['excerpt'].replace(chr(10), ' ')[:300]}")


def add_source_argument(parser: argparse.ArgumentParser) -> None:
    parser.add_argument(
        "--source",
        help="GitHub-ready ZIP or extracted package; defaults to DAESOON_KB_PATH",
    )


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    subparsers = parser.add_subparsers(dest="command", required=True)

    inspect_parser = subparsers.add_parser("inspect", help="verify package counts and quality state")
    add_source_argument(inspect_parser)
    inspect_parser.add_argument("--json", action="store_true")

    search_parser = subparsers.add_parser("search", help="search provenance-rich KB chunks")
    search_parser.add_argument("query", nargs="?", default="")
    add_source_argument(search_parser)
    search_parser.add_argument("--limit", type=int, default=20)
    search_parser.add_argument("--issue", type=int)
    search_parser.add_argument("--category")
    search_parser.add_argument("--article-id", action="append", default=[])
    search_parser.add_argument("--excerpt-chars", type=int, default=500)
    search_parser.add_argument("--json", action="store_true")

    show_parser = subparsers.add_parser(
        "show", help="read the full canonical Markdown for one article"
    )
    show_parser.add_argument("article_id")
    add_source_argument(show_parser)
    show_parser.add_argument("--json", action="store_true")

    export_parser = subparsers.add_parser(
        "export", help="create a private, unreviewed application projection proposal"
    )
    export_parser.add_argument("query", nargs="?", default="")
    add_source_argument(export_parser)
    export_parser.add_argument("--limit", type=int, default=20)
    export_parser.add_argument("--issue", type=int)
    export_parser.add_argument("--category")
    export_parser.add_argument("--article-id", action="append", default=[])
    export_parser.add_argument("--excerpt-chars", type=int, default=500)
    export_parser.add_argument(
        "--output",
        type=Path,
        required=True,
        help="JSON path inside data/kb/proposals/",
    )
    export_parser.add_argument(
        "--write",
        action="store_true",
        help="write the proposal; without this flag export is a dry-run",
    )
    export_parser.add_argument(
        "--force",
        action="store_true",
        help="replace an existing output file; valid only with --write",
    )

    validate_parser = subparsers.add_parser(
        "validate-projection", help="cross-check a projection against the canonical KB"
    )
    add_source_argument(validate_parser)
    validate_parser.add_argument("projection", type=Path)
    validate_parser.add_argument("--json", action="store_true")
    return parser


def main(argv: list[str] | None = None) -> int:
    for stream in (sys.stdout, sys.stderr):
        reconfigure = getattr(stream, "reconfigure", None)
        if reconfigure is not None:
            reconfigure(encoding="utf-8", errors="backslashreplace")
    args = build_parser().parse_args(argv)
    try:
        with KBSource(resolve_source(args.source)) as source:
            if args.command == "inspect":
                report = inspect_source(source)
                if args.json:
                    print(json.dumps(report, ensure_ascii=False, indent=2))
                else:
                    print(f"status: {report['status']}")
                    print(f"source: {report['source']} ({report['sourceKind']})")
                    print(f"release: sha256:{report['releaseDigest']}")
                    if report["artifactDigest"]:
                        print(f"artifact: sha256:{report['artifactDigest']}")
                    for key, value in report["actual"].items():
                        print(f"{key}: {value}")
                    print("quality: " + json.dumps(report["quality"], ensure_ascii=False))
                    for error in report["errors"]:
                        print(f"ERROR: {error}", file=sys.stderr)
                return 0 if report["status"] == "passed" else 1

            if args.command in {"search", "export"}:
                if not args.query and not args.article_id:
                    raise KBError("provide a query or at least one --article-id")
                results = search_source(
                    source,
                    SearchOptions(
                        query=args.query,
                        limit=args.limit,
                        issue=args.issue,
                        category=args.category,
                        article_ids=frozenset(args.article_id),
                        excerpt_chars=max(100, min(args.excerpt_chars, 2000)),
                    ),
                )
                if args.command == "search":
                    if args.json:
                        print(json.dumps(results, ensure_ascii=False, indent=2))
                    else:
                        print_search_results(results)
                    return 0 if results else 1

                output_path = validate_output_path(args.output)
                if args.force and not args.write:
                    raise KBError("--force requires --write")
                if args.write and output_path.exists() and not args.force:
                    raise KBError(
                        f"output already exists: {output_path}; choose a new path or add --force"
                    )
                projection = build_projection(source, results)
                print(
                    json.dumps(
                        {
                            "mode": "write" if args.write else "dry-run",
                            "output": str(output_path),
                            "citations": len(projection["citations"]),
                            "kbRelease": projection["source"]["kbRelease"],
                        },
                        ensure_ascii=False,
                        indent=2,
                    )
                )
                if not args.write:
                    print("dry-run: no file written; add --write after reviewing the selection")
                    return 0
                output_path.parent.mkdir(parents=True, exist_ok=True)
                output_path.write_text(
                    json.dumps(projection, ensure_ascii=False, indent=2) + "\n", "utf-8"
                )
                return 0

            if args.command == "show":
                article = get_article(source, args.article_id)
                if args.json:
                    print(json.dumps(article, ensure_ascii=False, indent=2))
                else:
                    print(article["markdown"], end="")
                return 0

            if args.command == "validate-projection":
                report = validate_projection(source, load_projection(args.projection))
                print(json.dumps(report, ensure_ascii=False, indent=2))
                return 0 if report["status"] == "passed" else 1
    except KBError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2

    return 2


if __name__ == "__main__":
    raise SystemExit(main())
