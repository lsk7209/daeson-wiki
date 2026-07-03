import Link from "next/link";
import { notFound } from "next/navigation";
import NotePad from "@/app/verses/[id]/note-pad";
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
        <p className="eyebrow">해설</p>
        <h2>해설 초안</h2>
        <p>
          해설은 아직 작성되지 않았습니다. 추후 직접 작성하거나 Turso DB에
          저장하는 구조로 확장할 수 있습니다.
        </p>
      </section>

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
