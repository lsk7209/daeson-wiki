import Link from "next/link";
import { getAllSourceLinks, getSourceReviewSummary } from "@/lib/source-links";
import { getVerseById } from "@/lib/verses";
import type { VerseSourceLink } from "@/lib/source-types";

export const metadata = {
  title: "연결 자료 검수 | 전경 개인 기록",
  robots: {
    index: false,
    follow: false,
  },
};

export default function SourcesPage() {
  const links = getAllSourceLinks();
  const summary = getSourceReviewSummary();

  return (
    <div className="page-shell">
      <section className="section-heading">
        <div>
          <p className="eyebrow">연결 자료</p>
          <h1>자동 연결 검수</h1>
          <p>
            자동 추출된 구절 연결을 확인하는 작업 목록입니다. 원문은 수정하지
            않고 출처, 구절, 근거 문구만 검토합니다.
          </p>
        </div>
        <div className="metric-strip">
          <span>전체 {summary.total}건</span>
          <span>자동 {summary.auto}건</span>
          <span>확정 {summary.reviewed}건</span>
          <span>제외 {summary.rejected}건</span>
        </div>
      </section>

      <div className="review-list">
        {links.map((sourceLink) => {
          const verse = getVerseById(sourceLink.verseId);

          return (
            <article className="review-row" key={sourceLink.id}>
              <div className="review-row-main">
                <div className="review-row-title">
                  <span className={`status-pill ${sourceLink.reviewStatus}`}>
                    {getReviewLabel(sourceLink.reviewStatus)}
                  </span>
                  <strong>
                    {verse ? (
                      <Link href={`/verses/${verse.id}`}>{verse.title}</Link>
                    ) : (
                      sourceLink.verseId
                    )}
                  </strong>
                </div>
                <a href={sourceLink.document.url} rel="noreferrer">
                  {sourceLink.document.title}
                </a>
                <p>{sourceLink.evidenceSnippet}</p>
              </div>
              <dl className="review-meta">
                <div>
                  <dt>출처</dt>
                  <dd>{sourceLink.document.sourceName}</dd>
                </div>
                <div>
                  <dt>관계</dt>
                  <dd>{getRelationLabel(sourceLink.relationType)}</dd>
                </div>
                <div>
                  <dt>매칭</dt>
                  <dd>{sourceLink.matchedText}</dd>
                </div>
              </dl>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function getReviewLabel(status: VerseSourceLink["reviewStatus"]) {
  if (status === "reviewed") {
    return "확정";
  }

  if (status === "rejected") {
    return "제외";
  }

  return "자동";
}

function getRelationLabel(relationType: VerseSourceLink["relationType"]) {
  if (relationType === "direct_interpretation") {
    return "직접 해설";
  }

  if (relationType === "term_gloss") {
    return "용어 해설";
  }

  return "관련 인용";
}
