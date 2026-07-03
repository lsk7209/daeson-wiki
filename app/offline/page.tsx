import Link from "next/link";

export const metadata = {
  title: "오프라인 | 전경 개인 기록",
  robots: {
    index: false,
    follow: false,
  },
};

export default function OfflinePage() {
  return (
    <div className="page-shell empty-state">
      <p className="eyebrow">오프라인</p>
      <h1>연결을 확인할 수 없습니다</h1>
      <p className="daily-text">
        이전에 열었던 구절은 기기에 저장된 화면으로 다시 볼 수 있습니다.
      </p>
      <Link className="primary-link" href="/">
        전체 구절로 이동
      </Link>
    </div>
  );
}
