import Link from "next/link";
import { notFound } from "next/navigation";
import NotePad from "@/app/verses/[id]/note-pad";
import {
  getHanjaAnnotations,
  hasHanja,
  shouldUseLongHanjaMode,
} from "@/lib/hanja";
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
  const isLongHanjaPassage = shouldUseLongHanjaMode(hanjaAnnotations);
  const hanjaExplanations = isLongHanjaPassage ? [] : hanjaAnnotations;

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
          <section className="hanja-section">
            <h3>한자읽기</h3>
            <div className="hanja-reading-pair">
              <p className="hanja-original-text">{hanjaOriginalText}</p>
              {isLongHanjaPassage ? (
                <p className="hanja-long-note">
                  긴 한문은 구절별 자동 풀이보다 문장 전체의 흐름이 중요하므로
                  원문 단위로 보존했습니다. 포유문, 각도문 같은 글은 문단 단위
                  해설로 별도 정리하는 편이 적합합니다.
                </p>
              ) : (
                <p className="hanja-reading-text">{hanjaReadingText}</p>
              )}
            </div>

            {hanjaExplanations.length > 0 ? (
              <dl className="hanja-list">
                <dt className="hanja-list-title">한자해석</dt>
                {hanjaExplanations.map((annotation) => (
                  <div key={annotation.id}>
                    <dt>
                      <span>{annotation.hanja}</span>
                      <strong>{annotation.reading}</strong>
                    </dt>
                    <dd>{getDisplayHanjaMeaning(annotation)}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </section>
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

function getDisplayHanjaMeaning(annotation: {
  meaning: string;
  reading: string;
}) {
  if (annotation.meaning.startsWith("원문에서 ")) {
    return `독음은 "${annotation.reading}"입니다. 뜻풀이는 문맥 단위 검수가 필요합니다.`;
  }

  if (annotation.meaning.includes("표현 단위 검수")) {
    return "뜻풀이는 문맥 단위 검수가 필요합니다.";
  }

  return annotation.meaning;
}
