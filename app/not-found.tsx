import Link from "next/link";

export default function NotFound() {
  return (
    <div className="page-shell empty-state">
      <h1>구절을 찾을 수 없습니다</h1>
      <Link className="primary-link" href="/">
        전체 구절로 이동
      </Link>
    </div>
  );
}
