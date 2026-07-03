import Link from "next/link";
import { getBookGroups, getDailyVerse, getVersePreview } from "@/lib/verses";

export default function HomePage() {
  const today = getDailyVerse();
  const groups = getBookGroups();
  const total = Array.from(groups.values()).reduce((sum, chapters) => {
    return (
      sum +
      Array.from(chapters.values()).reduce(
        (chapterSum, verses) => chapterSum + verses.length,
        0,
      )
    );
  }, 0);

  return (
    <div className="page-shell">
      <section className="daily-panel">
        <div>
          <p className="eyebrow">오늘의 전경</p>
          {today ? (
            <>
              <h1>{today.title}</h1>
              <p className="daily-text">{getVersePreview(today.text, 160)}</p>
            </>
          ) : (
            <>
              <h1>수집된 구절이 없습니다</h1>
              <p className="daily-text">
                `npm run scrape:dry-run`으로 구조를 확인한 뒤 `npm run scrape`로
                `data/verses.json`을 생성하세요.
              </p>
            </>
          )}
        </div>
        {today ? (
          <Link className="primary-link" href={`/verses/${today.id}`}>
            상세 보기
          </Link>
        ) : null}
      </section>

      <section className="index-heading">
        <div>
          <p className="eyebrow">전체 구절</p>
          <h2>권별 목록</h2>
        </div>
        <span className="count-badge">{total.toLocaleString("ko-KR")}구절</span>
      </section>

      <div className="book-list">
        {Array.from(groups.entries()).map(([book, chapters]) => {
          const chapterEntries = Array.from(chapters.entries());

          if (chapterEntries.length === 0) {
            return null;
          }

          return (
            <section className="book-section" key={book}>
              <h3>{book}</h3>
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
                            <p>{getVersePreview(verse.text, 86)}</p>
                          </Link>
                        </li>
                      ))}
                    </ol>
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
