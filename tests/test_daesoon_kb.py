import importlib.util
import io
import json
import sys
import tempfile
import unittest
import zipfile
from contextlib import redirect_stderr, redirect_stdout
from copy import deepcopy
from pathlib import Path
from unittest.mock import patch


SCRIPT = Path(__file__).parents[1] / "scripts" / "daesoon_kb.py"
SPEC = importlib.util.spec_from_file_location("daesoon_kb", SCRIPT)
daesoon_kb = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
sys.modules["daesoon_kb"] = daesoon_kb
SPEC.loader.exec_module(daesoon_kb)


ARTICLE_ID = "ds-001-b000001"
CHUNK_ID = f"{ARTICLE_ID}-c001"
ARTICLE_HASH = "a" * 64
CHUNK_HASH = "b" * 64
SOURCE_URL = (
    "https://webzine.daesoon.org/board/index.asp?"
    "webzine=123&menu_no=1&bno=1&page=1"
)
CHUNK_TEXT = "해원상생은 이 기사에서 근거 문단과 함께 설명됩니다."


def fixture_entries():
    summary = {
        "generated_at": "2026-08-29T19:01:28+00:00",
        "issue_range": [1, 1],
        "issues_collected": 1,
        "articles_collected": 1,
        "chunks_generated": 1,
        "markdown_files": 1,
        "ocr_required_articles": 0,
        "image_only_articles": 0,
        "unique_categories": 1,
        "repeated_content_groups": 0,
    }
    catalog = {
        "id": ARTICLE_ID,
        "issue_no": 1,
        "webzine_id": 123,
        "category_original": "전경 성구",
        "title": "해원상생의 뜻",
        "publication_date": "1983-07",
        "source_url": SOURCE_URL,
        "content_sha256": ARTICLE_HASH,
        "parse_status": "parsed",
        "ocr_status": "not_required",
        "review_status": "not_reviewed",
    }
    chunk = {
        "chunk_id": CHUNK_ID,
        "article_id": ARTICLE_ID,
        "issue_no": 1,
        "publication_date": "1983-07",
        "category": "전경 성구",
        "title": "해원상생의 뜻",
        "paragraph_ids": ["p0001"],
        "text": CHUNK_TEXT,
        "source_url": SOURCE_URL,
        "content_type": "original",
        "content_sha256": CHUNK_HASH,
    }
    articles_csv = (
        "id,issue_no,publication_date,category_original,title,bno,character_count,"
        "paragraph_count,image_count,parse_status,ocr_status,source_url,"
        "content_sha256,review_status\n"
        f'{ARTICLE_ID},1,1983-07,전경 성구,해원상생의 뜻,1,31,1,0,parsed,'
        f'not_required,"{SOURCE_URL}",{ARTICLE_HASH},not_reviewed\n'
    )
    issues_csv = (
        "issue_no,webzine_id,publication_date,article_count,source_url,cover_url\n"
        "1,123,1983-07,1,https://webzine.daesoon.org/index.asp?webzine=123,\n"
    )
    return {
        "knowledge-base/KB_MANIFEST.yaml": (
            'name: "fixture"\nschema_version: "1.0.0"\n'
        ),
        "knowledge-base/quality-reports/collection-summary.json": (
            json.dumps(summary, ensure_ascii=False) + "\n"
        ),
        "knowledge-base/datasets/catalog.jsonl": (
            json.dumps(catalog, ensure_ascii=False) + "\n"
        ),
        "knowledge-base/datasets/articles.csv": articles_csv,
        "knowledge-base/datasets/issues.csv": issues_csv,
        "knowledge-base/datasets/chunks/001.jsonl": (
            json.dumps(chunk, ensure_ascii=False) + "\n"
        ),
        "knowledge-base/issues/001/issue.md": "# 대순회보 1호\n",
        f"knowledge-base/issues/001/articles/{ARTICLE_ID}.md": "# fixture\n",
    }


class DaesoonKBTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.zip_path = Path(self.temp_dir.name) / "fixture.zip"
        with zipfile.ZipFile(self.zip_path, "w", zipfile.ZIP_DEFLATED) as archive:
            for name, content in fixture_entries().items():
                archive.writestr(name, content.encode("utf-8"))

    def tearDown(self):
        self.temp_dir.cleanup()

    def test_inspect_reconciles_source_counts(self):
        with daesoon_kb.KBSource(self.zip_path) as source:
            report = daesoon_kb.inspect_source(source)
        self.assertEqual(report["status"], "passed")
        self.assertEqual(report["actual"]["issues"], 1)
        self.assertEqual(report["actual"]["articles"], 1)
        self.assertEqual(report["actual"]["chunks"], 1)

    def test_search_returns_provenance(self):
        with daesoon_kb.KBSource(self.zip_path) as source:
            results = daesoon_kb.search_source(
                source, daesoon_kb.SearchOptions(query="해원상생", limit=5)
            )
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["articleId"], ARTICLE_ID)
        self.assertEqual(results[0]["paragraphIds"], ["p0001"])
        self.assertEqual(results[0]["sourceUrl"], SOURCE_URL)

    def test_title_only_search_prefers_first_chunk_on_equal_scores(self):
        entries = fixture_entries()
        summary_path = "knowledge-base/quality-reports/collection-summary.json"
        summary = json.loads(entries[summary_path])
        summary["chunks_generated"] = 2
        entries[summary_path] = json.dumps(summary, ensure_ascii=False) + "\n"
        chunks_path = "knowledge-base/datasets/chunks/001.jsonl"
        second_chunk = json.loads(entries[chunks_path])
        second_chunk["chunk_id"] = f"{ARTICLE_ID}-c002"
        second_chunk["paragraph_ids"] = ["p0002"]
        second_chunk["text"] = "제목의 검색어가 없는 두 번째 문단입니다."
        entries[chunks_path] += json.dumps(second_chunk, ensure_ascii=False) + "\n"
        multi_chunk_zip = Path(self.temp_dir.name) / "multi-chunk.zip"
        with zipfile.ZipFile(multi_chunk_zip, "w", zipfile.ZIP_DEFLATED) as archive:
            for name, content in entries.items():
                archive.writestr(name, content.encode("utf-8"))
        with daesoon_kb.KBSource(multi_chunk_zip) as source:
            results = daesoon_kb.search_source(
                source, daesoon_kb.SearchOptions(query="뜻", limit=5)
            )
        self.assertEqual(results[0]["chunkId"], CHUNK_ID)

    def test_show_returns_canonical_article(self):
        with daesoon_kb.KBSource(self.zip_path) as source:
            article = daesoon_kb.get_article(source, ARTICLE_ID)
        self.assertEqual(article["articleId"], ARTICLE_ID)
        self.assertEqual(article["issueNo"], 1)
        self.assertIn("# fixture", article["markdown"])

    def test_export_is_private_unreviewed_and_valid(self):
        with daesoon_kb.KBSource(self.zip_path) as source:
            results = daesoon_kb.search_source(
                source, daesoon_kb.SearchOptions(query="해원상생")
            )
            projection = daesoon_kb.build_projection(source, results)
            report = daesoon_kb.validate_projection(source, projection)
        citation = projection["citations"][0]
        self.assertEqual(citation["reviewStatus"], "not_reviewed")
        self.assertEqual(citation["rightsStatus"], "internal_research_only")
        self.assertEqual(citation["visibility"], "private")
        self.assertEqual(report["status"], "passed")

    def test_release_digest_is_stable_across_zip_and_directory(self):
        extracted = Path(self.temp_dir.name) / "extracted"
        with zipfile.ZipFile(self.zip_path) as archive:
            archive.extractall(extracted)
        with daesoon_kb.KBSource(self.zip_path) as zip_source:
            zip_release = zip_source.release_digest()
            zip_artifact = zip_source.artifact_digest()
        with daesoon_kb.KBSource(extracted) as directory_source:
            directory_release = directory_source.release_digest()
            directory_artifact = directory_source.artifact_digest()
        self.assertEqual(zip_release, directory_release)
        self.assertIsNotNone(zip_artifact)
        self.assertIsNone(directory_artifact)

        with daesoon_kb.KBSource(extracted) as directory_source:
            results = daesoon_kb.search_source(
                directory_source, daesoon_kb.SearchOptions(query="해원상생")
            )
            directory_projection = daesoon_kb.build_projection(
                directory_source, results
            )
        self.assertIsNone(directory_projection["source"]["artifactDigest"])
        with daesoon_kb.KBSource(self.zip_path) as zip_source:
            cross_package_report = daesoon_kb.validate_projection(
                zip_source, directory_projection
            )
        self.assertEqual(cross_package_report["status"], "passed")

        article_path = (
            extracted
            / "knowledge-base"
            / "issues"
            / "001"
            / "articles"
            / f"{ARTICLE_ID}.md"
        )
        article_path.write_text("# changed canonical article\n", "utf-8")
        with daesoon_kb.KBSource(extracted) as changed_source:
            self.assertNotEqual(changed_source.release_digest(), directory_release)

    def test_release_digest_changes_when_chunk_changes(self):
        extracted = Path(self.temp_dir.name) / "changed-chunk"
        with zipfile.ZipFile(self.zip_path) as archive:
            archive.extractall(extracted)
        with daesoon_kb.KBSource(extracted) as source:
            original_release = source.release_digest()
        chunk_path = (
            extracted / "knowledge-base" / "datasets" / "chunks" / "001.jsonl"
        )
        chunk_path.write_text(chunk_path.read_text("utf-8") + "\n", "utf-8")
        with daesoon_kb.KBSource(extracted) as changed_source:
            self.assertNotEqual(changed_source.release_digest(), original_release)

    def test_validator_rejects_tampered_excerpt(self):
        with daesoon_kb.KBSource(self.zip_path) as source:
            results = daesoon_kb.search_source(
                source, daesoon_kb.SearchOptions(query="해원상생")
            )
            projection = daesoon_kb.build_projection(source, results)
            projection["citations"][0]["excerpt"] = "원문에 없는 문장"
            report = daesoon_kb.validate_projection(source, projection)
        self.assertEqual(report["status"], "failed")
        self.assertTrue(any("exact substring" in error for error in report["errors"]))

    def test_validator_rejects_stale_citation_release(self):
        with daesoon_kb.KBSource(self.zip_path) as source:
            results = daesoon_kb.search_source(
                source, daesoon_kb.SearchOptions(query="해원상생")
            )
            projection = daesoon_kb.build_projection(source, results)
            projection["citations"][0]["kbRelease"] = f"sha256:{'0' * 64}"
            report = daesoon_kb.validate_projection(source, projection)
        self.assertEqual(report["status"], "failed")
        self.assertTrue(any("kbRelease" in error for error in report["errors"]))

    def test_validator_rejects_wrong_archive_digest(self):
        with daesoon_kb.KBSource(self.zip_path) as source:
            results = daesoon_kb.search_source(
                source, daesoon_kb.SearchOptions(query="해원상생")
            )
            projection = daesoon_kb.build_projection(source, results)
            projection["source"]["artifactDigest"] = f"sha256:{'0' * 64}"
            report = daesoon_kb.validate_projection(source, projection)
        self.assertEqual(report["status"], "failed")
        self.assertTrue(any("artifactDigest" in error for error in report["errors"]))

    def test_validator_rejects_unapproved_public_record(self):
        with daesoon_kb.KBSource(self.zip_path) as source:
            results = daesoon_kb.search_source(
                source, daesoon_kb.SearchOptions(query="해원상생")
            )
            projection = daesoon_kb.build_projection(source, results)
            unsafe = deepcopy(projection)
            unsafe["citations"][0]["visibility"] = "public"
            report = daesoon_kb.validate_projection(source, unsafe)
        self.assertEqual(report["status"], "failed")
        self.assertTrue(any("public visibility" in error for error in report["errors"]))

    def test_validator_rejects_public_link_only_excerpt_projection(self):
        with daesoon_kb.KBSource(self.zip_path) as source:
            results = daesoon_kb.search_source(
                source, daesoon_kb.SearchOptions(query="해원상생")
            )
            projection = daesoon_kb.build_projection(source, results)
            citation = projection["citations"][0]
            citation.update(
                {
                    "reviewStatus": "approved",
                    "reviewer": "reviewer-1",
                    "reviewedAt": "2026-08-31T00:00:00+00:00",
                    "rightsStatus": "public_link_only",
                    "visibility": "public",
                }
            )
            report = daesoon_kb.validate_projection(source, projection)
        self.assertEqual(report["status"], "failed")
        self.assertTrue(
            any(
                "approved_excerpt" in error or "public visibility" in error
                for error in report["errors"]
            )
        )

    def test_validator_accepts_reviewed_public_approved_excerpt(self):
        with daesoon_kb.KBSource(self.zip_path) as source:
            results = daesoon_kb.search_source(
                source, daesoon_kb.SearchOptions(query="해원상생")
            )
            projection = daesoon_kb.build_projection(source, results)
            citation = projection["citations"][0]
            citation.update(
                {
                    "reviewStatus": "approved",
                    "reviewer": "reviewer-1",
                    "reviewedAt": "2026-08-31T00:00:00+00:00",
                    "rightsStatus": "approved_excerpt",
                    "visibility": "public",
                }
            )
            report = daesoon_kb.validate_projection(source, projection)
        self.assertEqual(report["status"], "passed")

    def test_runtime_schema_rejects_invalid_contract_fields(self):
        with daesoon_kb.KBSource(self.zip_path) as source:
            results = daesoon_kb.search_source(
                source, daesoon_kb.SearchOptions(query="해원상생")
            )
            projection = daesoon_kb.build_projection(source, results)
            cases = {
                "citationMode": ("citationMode", "invented"),
                "relationType": ("relationType", "invented"),
                "confidence": ("confidence", 2),
                "additionalProperty": ("unexpected", True),
            }
            for label, (field, value) in cases.items():
                with self.subTest(label=label):
                    candidate = deepcopy(projection)
                    candidate["citations"][0][field] = value
                    report = daesoon_kb.validate_projection(source, candidate)
                    self.assertEqual(report["status"], "failed")
                    self.assertTrue(any("schema" in error for error in report["errors"]))

            invalid_target = deepcopy(projection)
            invalid_target["citations"][0]["targets"] = [
                {"type": "verse", "id": ""}
            ]
            target_report = daesoon_kb.validate_projection(source, invalid_target)
        self.assertEqual(target_report["status"], "failed")
        self.assertTrue(any("schema" in error for error in target_report["errors"]))

    def test_export_refuses_to_overwrite_without_force(self):
        proposal_root = Path(self.temp_dir.name) / "proposals"
        proposal_root.mkdir()
        output = proposal_root / "existing.json"
        output.write_text("keep", "utf-8")
        stdout = io.StringIO()
        stderr = io.StringIO()
        with (
            patch.object(daesoon_kb, "PROPOSALS_DIR", proposal_root),
            redirect_stdout(stdout),
            redirect_stderr(stderr),
        ):
            status = daesoon_kb.main(
                [
                    "export",
                    "해원상생",
                    "--source",
                    str(self.zip_path),
                    "--output",
                    str(output),
                    "--write",
                ]
            )
        self.assertEqual(status, 2)
        self.assertEqual(output.read_text("utf-8"), "keep")
        self.assertIn("already exists", stderr.getvalue())

    def test_export_rejects_paths_outside_proposal_boundary(self):
        proposal_root = Path(self.temp_dir.name) / "proposals"
        outside = Path(self.temp_dir.name) / "source-documents.json"
        with self.assertRaises(daesoon_kb.KBError):
            daesoon_kb.validate_output_path(outside, proposal_root)


if __name__ == "__main__":
    unittest.main()
