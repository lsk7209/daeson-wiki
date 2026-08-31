import Link from "next/link";
import DailyReminder from "@/app/daily-reminder";
import {
  getBookSummaries,
  getDailyVerse,
  getVersePreview,
} from "@/lib/verses";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const today = getDailyVerse();
  const summaries = getBookSummaries();
  const total = summaries.reduce((sum, summary) => sum + summary.verseCount, 0);

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
          <div className="daily-actions">
            <Link className="primary-link" href={`/verses/${today.id}`}>
              상세 보기
            </Link>
            <Link className="secondary-link" href="/today">
              오늘 링크
            </Link>
            <DailyReminder />
          </div>
        ) : null}
      </section>

      <section className="index-heading">
        <div>
          <p className="eyebrow">전체 구절</p>
          <h2>권별 목록</h2>
        </div>
        <span className="count-badge">{total.toLocaleString("ko-KR")}구절</span>
      </section>

      <div className="book-summary-grid">
        {summaries.map((summary) => (
          <Link
            className="book-summary-card"
            href={`/books/${summary.slug}`}
            key={summary.book}
          >
            <span>{summary.book}</span>
            <strong>
              {summary.chapterCount}장 · {summary.verseCount}절
            </strong>
            <p>
              {summary.firstVerse
                ? getVersePreview(summary.firstVerse.text, 88)
                : "수집된 구절이 없습니다."}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
