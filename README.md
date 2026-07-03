# 전경 개인 기록

Next.js 기반 개인용 전경 구절 기록장입니다.

## 현재 구조

- `data/verses.json`: 전경 구절 데이터
- `data/source-seeds.json`: 전경 해설/관련 자료 수집 대상 URL
- `data/source-documents.json`: 수집한 자료의 제목, URL, 출처 메타데이터
- `data/verse-source-links.json`: 구절과 관련 자료의 연결 정보
- `scripts/scrape-daesoon.mjs`: 대순진리회 공식 사이트 전경 페이지 수집기
- `scripts/collect-source-links.mjs`: 관련 자료에서 전경 구절 표기를 찾아 연결하는 수집기
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

## 관련 자료 연결

전경 해설, 용어 해설, 공사 해석 등은 원문과 분리된 별도 데이터 레이어에 저장합니다. 외부 자료 전문은 저장하지 않고 제목, URL, 출처, 구절 표기 주변의 짧은 근거 문구만 저장합니다.

```bash
npm run collect:sources
```

새 공식/관련 자료 URL은 `data/source-seeds.json`에 추가한 뒤 위 명령을 다시 실행합니다.

## 검색 노출 차단

`robots.txt`, HTML metadata, `X-Robots-Tag`를 적용했고, 운영 환경에서는 Basic Auth도 적용합니다.

배포 환경에는 다음 환경변수를 설정해야 합니다.

```bash
BASIC_AUTH_USER=원하는_아이디
BASIC_AUTH_PASSWORD=긴_비밀번호
```

운영 환경에서 위 값이 없으면 사이트는 내용을 노출하지 않고 503으로 닫힙니다. 로컬 개발 환경에서는 값이 없어도 개발 편의를 위해 통과합니다. 로컬에서 명시적으로 인증을 끄고 싶을 때만 `.env.local`에 다음 값을 사용할 수 있습니다.

```bash
BASIC_AUTH_DISABLED=true
```

## Turso DB

개인 기록과 검수 상태는 Turso에 저장할 수 있습니다. 전경 원문 `data/verses.json`은 계속 불변 데이터로 두고, DB에는 개인 레이어만 저장합니다.

`.env.local`에 다음 값을 설정합니다.

```bash
TURSO_DATABASE_URL=libsql://...
TURSO_AUTH_TOKEN=...
```

초기 테이블을 생성합니다.

```bash
npm run db:migrate
```

현재 마이그레이션은 다음 테이블을 만듭니다.

- `verse_notes`: 구절별 나의 첨언, 낙서장
- `source_link_reviews`: 자료 연결 검수 상태
- `daily_delivery_log`: 향후 1일 1구절 푸시 발송 기록
- `app_settings`: 개인 설정 저장소

## 원문 불변 규칙

전경 원문은 절대 수정하지 않습니다. `data/verses.json`의 `text`는 공식 사이트에서 수집한 브라우저 표시 기준 원문이며, 볼드/링크/클릭 같은 표시는 원문 데이터를 바꾸지 않고 별도 화면 레이어에서 처리합니다.

원문 또는 잠금 메타데이터가 바뀌었는지 확인합니다.

```bash
npm run verify:verses
```

전체 데이터와 타입을 함께 확인합니다.

```bash
npm run verify:all
```

정당한 공식 재수집으로 기준선을 바꿔야 할 때만 다음 명령을 사용합니다.

```bash
node scripts/verify-verses-integrity.mjs --write
```
