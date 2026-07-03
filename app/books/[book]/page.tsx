import Link from "next/link";
import { notFound } from "next/navigation";
import {
  bookOrder,
  getBookBySlug,
  getBookChapterEntries,
  getBookSlug,
  getVersePreview,
} from "@/lib/verses";

type BookPageProps = {
  params: Promise<{
    book: string;
  }>;
};

export function generateStaticParams() {
  return bookOrder.map((book) => ({
    book: getBookSlug(book),
  }));
}

export async function generateMetadata({ params }: BookPageProps) {
  const { book: slug } = await params;
  const book = getBookBySlug(slug);

  return {
    title: book ? `${book} | 전경 개인 기록` : "권 없음",
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function BookPage({ params }: BookPageProps) {
  const { book: slug } = await params;
  const book = getBookBySlug(slug);

  if (!book) {
    notFound();
  }

  const chapterEntries = getBookChapterEntries(book);
  const total = chapterEntries.reduce(
    (sum, [, verses]) => sum + verses.length,
    0,
  );

  return (
    <div className="page-shell">
      <nav className="breadcrumb" aria-label="이동 경로">
        <Link href="/">전체 구절</Link>
        <span>{book}</span>
      </nav>

      <section className="index-heading">
        <div>
          <p className="eyebrow">권별 구절</p>
          <h1>{book}</h1>
        </div>
        <span className="count-badge">{total.toLocaleString("ko-KR")}구절</span>
      </section>

      <div className="chapter-grid">
        {chapterEntries.map(([chapter, chapterVerses]) => (
          <article className="chapter-card" key={`${book}-${chapter}`}>
            <div className="chapter-title">
              <strong>{chapter}장</strong>
              <span>{chapterVerses.length}절</span>
            </div>
            <ol>
              {chapterVerses.map((verse) => (
                <li key={verse.id}>
                  <Link href={`/verses/${verse.id}`}>
                    <span>{verse.verse}절</span>
                    <p>{getVersePreview(verse.text, 96)}</p>
                  </Link>
                </li>
              ))}
            </ol>
          </article>
        ))}
      </div>
    </div>
  );
}
