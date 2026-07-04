import Link from "next/link";
import { notFound } from "next/navigation";
import NotePad from "@/app/verses/[id]/note-pad";
import { getHanjaAnnotations, hasHanja } from "@/lib/hanja";
import { getSourceLinksForVerse } from "@/lib/source-links";
import type { VerseSourceLink } from "@/lib/source-types";
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
  const relatedSources = getSourceLinksForVerse(verse.id);
  const hanjaAnnotations = hasHanja(verse.text)
    ? getHanjaAnnotations(verse.text)
    : [];
  const hanjaOriginalText = hanjaAnnotations
    .map((annotation) => annotation.hanja)
    .join(" ");
  const hanjaReadingText = hanjaAnnotations
    .map((annotation) => annotation.reading)
    .join(" ");

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

        {hanjaAnnotations.length > 0 ? (
          <>
            <section className="hanja-section">
              <h3>한자읽기</h3>
              <div className="hanja-reading-pair">
                <p className="hanja-original-text">{hanjaOriginalText}</p>
                <p className="hanja-reading-text">{hanjaReadingText}</p>
              </div>
            </section>

            <section className="hanja-section">
              <h3>한자해석</h3>
              <dl className="hanja-list">
                {hanjaAnnotations.map((annotation) => (
                  <div key={annotation.id}>
                    <dt>
                      <span>{annotation.hanja}</span>
                      <strong>{annotation.reading}</strong>
                    </dt>
                    <dd>{annotation.meaning}</dd>
                  </div>
                ))}
              </dl>
            </section>
          </>
        ) : null}

        <section className="commentary-draft">
          <h3>해설 초안</h3>
          <p>
            해설은 아직 작성되지 않았습니다. 추후 직접 작성하거나 Turso DB에
            저장하는 구조로 확장할 수 있습니다.
          </p>
        </section>
      </section>

      {relatedSources.length > 0 ? (
        <section className="related-sources">
          <div className="related-sources-heading">
            <div>
              <p className="eyebrow">연결 자료</p>
              <h2>공식/관련 자료</h2>
            </div>
            <span>{relatedSources.length}건</span>
          </div>
          <div className="related-source-list">
            {relatedSources.map((sourceLink) => (
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
