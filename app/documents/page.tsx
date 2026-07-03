import catalogRaw from "@/docs/catalog.json";
import reviewRaw from "@/docs/content-review.json";

type CatalogItem = {
  id: string;
  file_path: string;
  display_title: string;
  year: number | null;
  series: string;
  document_type: string;
  theme: string | null;
  format: string;
  page_count: number | null;
  word_count: number | null;
  text_status: string;
  catalog_status: string;
};

type ReviewItem = {
  id: string;
  text_chars?: number;
};

export const metadata = {
  title: "문서 자료실 | 전경 개인 기록",
  robots: {
    index: false,
    follow: false,
  },
};

const catalog = catalogRaw as CatalogItem[];
const reviews = reviewRaw as ReviewItem[];
const textCharsById = new Map(reviews.map((review) => [review.id, review.text_chars ?? 0]));

export default function DocumentsPage() {
  const summary = catalog.reduce(
    (nextSummary, item) => {
      nextSummary.total += 1;
      nextSummary[item.text_status === "ocr_needed" ? "ocrNeeded" : "extractable"] += 1;
      nextSummary.pages += item.page_count ?? 0;
      nextSummary.words += item.word_count ?? 0;
      return nextSummary;
    },
    {
      total: 0,
      extractable: 0,
      ocrNeeded: 0,
      pages: 0,
      words: 0,
    },
  );

  return (
    <div className="page-shell">
      <section className="section-heading">
        <div>
          <p className="eyebrow">문서 자료실</p>
          <h1>문서 카탈로그</h1>
          <p>
            PDF/DOCX 원자료의 분류, 검토 상태, 텍스트 추출 가능 여부를 관리합니다.
          </p>
        </div>
        <div className="metric-strip">
          <span>문서 {summary.total}개</span>
          <span>추출 가능 {summary.extractable}개</span>
          <span>OCR 필요 {summary.ocrNeeded}개</span>
          <span>{summary.pages.toLocaleString("ko-KR")}쪽</span>
        </div>
      </section>

      <div className="document-table">
        {catalog.map((item) => (
          <article className="document-row" key={item.id}>
            <div>
              <span className={`status-pill ${item.catalog_status}`}>
                {getCatalogStatusLabel(item.catalog_status)}
              </span>
              <h2>{item.display_title}</h2>
              <p>
                {item.series}
                {item.theme ? ` · ${item.theme}` : ""} · {item.format}
              </p>
            </div>
            <dl>
              <div>
                <dt>연도</dt>
                <dd>{item.year ?? "확인 필요"}</dd>
              </div>
              <div>
                <dt>쪽/단어</dt>
                <dd>
                  {item.page_count
                    ? `${item.page_count.toLocaleString("ko-KR")}쪽`
                    : `${(item.word_count ?? 0).toLocaleString("ko-KR")}어`}
                </dd>
              </div>
              <div>
                <dt>추출 문자</dt>
                <dd>{(textCharsById.get(item.id) ?? 0).toLocaleString("ko-KR")}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
    </div>
  );
}

function getCatalogStatusLabel(status: string) {
  if (status === "needs_ocr") {
    return "OCR 필요";
  }

  if (status === "reviewed") {
    return "검토됨";
  }

  return "신규";
}
