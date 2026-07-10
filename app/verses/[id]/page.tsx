import Link from "next/link";
import { notFound } from "next/navigation";
import NotePad from "@/app/verses/[id]/note-pad";
import { getSourceLinksForVerse } from "@/lib/source-links";
import {
  applySourceLinkReviews,
  getAllSourceLinkReviewMap,
} from "@/lib/source-reviews";
import type {
  VerseSourceLink,
  VerseSourceLinkWithDocument,
} from "@/lib/source-types";
import { getVerseCommentary } from "@/lib/verse-commentaries";
import {
  getAdjacentVerses,
  getAllVerses,
  getVerseById,
} from "@/lib/verses";

type VersePageProps = {
  params: Promise<{
    id: string;
  }>;
};

export function generateStaticParams() {
  return getAllVerses().map((verse) => ({
    id: verse.id,
  }));
}

export async function generateMetadata({ params }: VersePageProps) {
  const { id } = await params;
  const verse = getVerseById(id);

  return {
    title: verse ? `${verse.title} | 전경 개인 기록` : "구절 없음",
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function VersePage({ params }: VersePageProps) {
  const { id } = await params;
  const verse = getVerseById(id);

  if (!verse) {
    notFound();
  }

  const adjacent = getAdjacentVerses(verse.id);
  const verseCommentary = getVerseCommentary(verse.id);
  const reviewMap = await getAllSourceLinkReviewMap();
  const relatedSources = applySourceLinkReviews(
    getSourceLinksForVerse(verse.id),
    reviewMap,
  );
  const officialCommentarySources = relatedSources.filter(
    isOfficialCommentarySource,
  );
  const officialCommentarySourceIds = new Set(
    officialCommentarySources.map((sourceLink) => sourceLink.id),
  );
  const supplementalSources = relatedSources.filter(
    (sourceLink) => !officialCommentarySourceIds.has(sourceLink.id),
  );

  return (
    <div className="page-shell verse-layout">
      <nav className="breadcrumb" aria-label="이동 경로">
        <Link href="/">전체 구절</Link>
        <span>{verse.book}</span>
        <span>{verse.chapter}장</span>
      </nav>

      <article className="verse-detail">
        <header>
          <p className="eyebrow">원문</p>
          <h1>{verse.title}</h1>
        </header>
        <p className="verse-text">{verse.text}</p>
        <a className="source-link" href={verse.sourceUrl} rel="noreferrer">
          공식 사이트 원문
        </a>
      </article>

      <section className="commentary-panel">
        <header className="commentary-heading">
          <p className="eyebrow">해설</p>
          <h2>해설 영역</h2>
        </header>

        {verseCommentary ? (
          <section className="source-commentary-section">
            <div className="source-commentary-heading">
              <h3>{verseCommentary.title}</h3>
              <span>직접 정리</span>
            </div>
            <div className="source-commentary-list">
              <article className="source-commentary-row">
                <p>{verseCommentary.summary}</p>
              </article>
              {verseCommentary.items.map((item) => (
                <article className="source-commentary-row" key={item.term}>
                  <strong>{item.term}</strong>
                  <p>{item.description}</p>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        <section className="source-commentary-section">
          <div className="source-commentary-heading">
            <h3>공식 자료 기반 해설</h3>
            <span>우선 검토</span>
          </div>
          {officialCommentarySources.length > 0 ? (
            <div className="source-commentary-list">
              {officialCommentarySources.map((sourceLink) => (
                <article className="source-commentary-row" key={sourceLink.id}>
                  <a href={sourceLink.document.url} rel="noreferrer">
                    <strong>{sourceLink.document.title}</strong>
                    <span>
                      {sourceLink.document.sourceName} ·{" "}
                      {getRelationLabel(sourceLink.relationType)}
                    </span>
                  </a>
                  <p>{sourceLink.evidenceSnippet}</p>
                </article>
              ))}
            </div>
          ) : (
            <p className="source-commentary-empty">
              수집된 대순회보, 교무부, 대순종교문화연구소 자료 중 이 구절의
              직접 해설이나 용어 해설은 아직 연결되지 않았습니다.
            </p>
          )}
        </section>

      </section>

      {supplementalSources.length > 0 ? (
        <section className="related-sources">
          <div className="related-sources-heading">
            <div>
              <p className="eyebrow">연결 자료</p>
              <h2>공식/관련 자료</h2>
            </div>
            <span>{supplementalSources.length}건</span>
          </div>
          <div className="related-source-list">
            {supplementalSources.map((sourceLink) => (
              <div className="related-source-row" key={sourceLink.id}>
                <a href={sourceLink.document.url} rel="noreferrer">
                  <strong>{sourceLink.document.title}</strong>
                  <span>
                    {sourceLink.document.sourceName} ·{" "}
                    {getRelationLabel(sourceLink.relationType)}
                  </span>
                </a>
                <p>{sourceLink.evidenceSnippet}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <NotePad verseId={verse.id} />

      <nav className="verse-nav" aria-label="구절 이동">
        {adjacent.previous ? (
          <Link href={`/verses/${adjacent.previous.id}`}>
            이전: {adjacent.previous.title}
          </Link>
        ) : (
          <span />
        )}
        {adjacent.next ? (
          <Link href={`/verses/${adjacent.next.id}`}>
            다음: {adjacent.next.title}
          </Link>
        ) : null}
      </nav>
    </div>
  );
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

function isOfficialCommentarySource(sourceLink: VerseSourceLinkWithDocument) {
  if (sourceLink.reviewStatus === "rejected") {
    return false;
  }

  return (
    sourceLink.relationType === "direct_interpretation" ||
    sourceLink.relationType === "term_gloss"
  );
}
