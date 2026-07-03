# 전경 개인 기록

Next.js 기반 개인용 전경 구절 기록장입니다.

## 현재 구조

- `data/verses.json`: 전경 구절 데이터
- `scripts/scrape-daesoon.mjs`: 대순진리회 공식 사이트 전경 페이지 수집기
- `app/page.tsx`: 오늘의 전경과 권별 목록
- `app/verses/[id]/page.tsx`: 원문, 해설, 나의 첨언, 낙서장
- `public/robots.txt`: 전체 검색 로봇 차단
- `next.config.ts`: `X-Robots-Tag` noindex 헤더 적용

## 수집

공식 사이트:

`http://www.daesoon.org/about/bible.book.php?cate=4`

전체 권은 `cate=1~7`로 구성됩니다.

- `1`: 행록
- `2`: 공사
- `3`: 교운
- `4`: 교법
- `5`: 권지
- `6`: 제생
- `7`: 예시

먼저 구조만 확인합니다.

```bash
npm run scrape:dry-run
```

구절을 저장합니다.

```bash
npm run scrape
```

저장 형식은 다음과 같습니다.

```json
{
  "id": "haengrok-1-1",
  "book": "행록",
  "cate": 1,
  "chapter": 1,
  "verse": 1,
  "title": "행록 1장 1절",
  "sourceTitle": "행록 1장 1절",
  "text": "전경구절 내용",
  "sourceUrl": "http://www.daesoon.org/about/bible.book.php?cate=1&jang=1#1",
  "scrapedAt": "2026-07-03T00:00:00.000Z"
}
```

## 검색 노출 차단

초기 요청대로 로그인 없이 `robots.txt`, HTML metadata, `X-Robots-Tag`만 적용했습니다.
완전한 비공개가 필요하면 이후 로그인 또는 Basic Auth를 추가해야 합니다.
