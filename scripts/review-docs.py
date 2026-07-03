from __future__ import annotations

import hashlib
import json
import re
from datetime import date
from pathlib import Path

from docx import Document
from pypdf import PdfReader


DOCS_ROOT = Path("docs")
CATALOG_PATH = DOCS_ROOT / "catalog.json"
OUT_PATH = DOCS_ROOT / "content-review.json"

KEYWORDS = [
    "전경",
    "행록",
    "공사",
    "교운",
    "교법",
    "권지",
    "제생",
    "예시",
    "대순지침",
    "대순진리회",
    "상제",
    "도주",
    "해원상생",
    "보은상생",
    "포덕",
    "교화",
    "도통",
]


def main() -> None:
    catalog = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
    reviews = []

    for item in catalog:
        path = Path(item["file_path"])
        if not path.exists():
            reviews.append(make_error_review(item, "missing_file"))
            continue

        print(f"reviewing {path}")
        if path.suffix.lower() == ".pdf":
            review = review_pdf(item, path)
        elif path.suffix.lower() == ".docx":
            review = review_docx(item, path)
        elif path.suffix.lower() == ".md":
            review = review_text(item, path)
        else:
            review = make_error_review(item, "unsupported_format")

        reviews.append(review)

    OUT_PATH.write_text(
        json.dumps(reviews, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"saved {len(reviews)} reviews to {OUT_PATH}")


def review_pdf(item: dict, path: Path) -> dict:
    try:
        reader = PdfReader(str(path))
        page_count = len(reader.pages)
        chunks = []

        for page in reader.pages:
            try:
                chunks.append(page.extract_text() or "")
            except Exception:
                chunks.append("")

        text = normalize_text("\n".join(chunks))
        return make_review(item, path, text, page_count=page_count)
    except Exception as error:
        return make_error_review(item, f"pdf_error: {error.__class__.__name__}")


def review_docx(item: dict, path: Path) -> dict:
    try:
        document = Document(str(path))
        text = normalize_text("\n".join(paragraph.text for paragraph in document.paragraphs))
        return make_review(item, path, text, word_count=count_words(text))
    except Exception as error:
        return make_error_review(item, f"docx_error: {error.__class__.__name__}")


def review_text(item: dict, path: Path) -> dict:
    text = normalize_text(path.read_text(encoding="utf-8"))
    return make_review(item, path, text, word_count=count_words(text))


def make_review(
    item: dict,
    path: Path,
    text: str,
    *,
    page_count: int | None = None,
    word_count: int | None = None,
) -> dict:
    text_chars = len(text)
    if text_chars >= 100:
        text_status = "extractable"
    elif page_count and page_count > 0:
        text_status = "ocr_needed"
    else:
        text_status = "unknown"

    return {
        "id": item["id"],
        "file_path": item["file_path"],
        "format": item["format"],
        "reviewed_at": date.today().isoformat(),
        "sha256": sha256(path),
        "page_count": page_count,
        "word_count": word_count if word_count is not None else count_words(text),
        "text_chars": text_chars,
        "text_status": text_status,
        "keyword_counts": {keyword: text.count(keyword) for keyword in KEYWORDS},
        "sample": make_sample(text),
    }


def make_error_review(item: dict, error: str) -> dict:
    return {
        "id": item["id"],
        "file_path": item["file_path"],
        "format": item["format"],
        "reviewed_at": date.today().isoformat(),
        "error": error,
        "text_status": "unknown",
    }


def make_sample(text: str) -> list[str]:
    lines = [
        line.strip()
        for line in re.split(r"[\n\r]+", text)
        if len(line.strip()) >= 8
    ]
    return [line[:180] for line in lines[:5]]


def normalize_text(value: str) -> str:
    return re.sub(r"[ \t]+", " ", value.replace("\u3000", " ")).strip()


def count_words(text: str) -> int:
    return len(re.findall(r"\S+", text))


def sha256(path: Path) -> str:
    hasher = hashlib.sha256()
    with path.open("rb") as file:
        for chunk in iter(lambda: file.read(1024 * 1024), b""):
            hasher.update(chunk)
    return hasher.hexdigest()


if __name__ == "__main__":
    main()
