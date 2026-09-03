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
- `app/settings/notifications/`: 휴대폰 설치 안내와 하루 1~3회 푸시 설정
- `app/api/push/`: 테스트 발송과 인증된 예약 발송 API
- `public/sw.js`: 오프라인 화면, 푸시 수신, 알림 클릭 처리
- `vercel.json`: 08:00·13:00·20:00 한국시간 무료 예약 실행
- `scripts/daesoon_kb.py`: 대순회보 canonical KB 검증, 검색, 전체 문맥 확인, 앱 projection 생성·검증
- `docs/knowledge-base/`: 사용자, Hermes/OpenClaw, 향후 앱용 지식베이스 운영 가이드
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

## 공개 열람과 검색 노출

사이트 화면과 조회 API는 계정이나 Basic Auth 입력 없이 공개 열람할 수 있습니다. 다만 `robots.txt`, HTML metadata, `X-Robots-Tag`를 통한 검색 노출 차단은 유지하므로 주소를 아는 사용자가 직접 접속하는 방식입니다.

메모·검수 상태·알림 설정처럼 데이터를 변경하는 요청은 기존 Basic Auth로 보호됩니다. 배포 환경에 다음 값을 설정해야 쓰기 기능을 사용할 수 있으며, 값이 없는 운영 환경에서는 쓰기 요청이 `503`으로 안전하게 닫힙니다.

```bash
BASIC_AUTH_USER=원하는_아이디
BASIC_AUTH_PASSWORD=긴_비밀번호
```

예약 푸시 발송 API의 `CRON_SECRET` 인증은 공개 열람 및 쓰기 인증과 별개로 계속 적용됩니다.

## 휴대폰 앱 설치

이 프로젝트는 앱스토어 배포 없이 설치하는 PWA입니다. 실제 휴대폰에서는 HTTPS 주소로 접속해야 서비스 워커와 푸시가 동작합니다.

- Android Chrome: 브라우저 메뉴에서 `앱 설치` 또는 `홈 화면에 추가`
- iPhone Safari: 공유 버튼 → `홈 화면에 추가` → 설치된 아이콘으로 앱을 연 뒤 알림 설정
- 앱 안에서는 상단 `알림 설정`에서 현재 상태와 설치 방법을 다시 확인할 수 있습니다.

오프라인일 때는 기본 안내 화면과 이전에 열어 캐시된 화면을 사용할 수 있습니다. 개인 화면 캐시는 설치한 휴대폰에 남으므로 기기 잠금도 함께 사용하십시오.

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

이전 발송 로그가 있는 DB를 갱신할 때는 먼저 다음 읽기 전용 SQL 결과가 비어 있는지 확인합니다. 결과가 있으면 자동 삭제하지 말고 중복 행을 사람이 검토한 뒤 마이그레이션합니다.

```sql
select target_date, channel, count(*) as duplicate_count
from daily_delivery_log
group by target_date, channel
having count(*) > 1;
```

현재 마이그레이션은 다음 테이블을 만듭니다.

- `verse_notes`: 구절별 나의 첨언, 낙서장
- `source_link_reviews`: 자료 연결 검수 상태
- `daily_delivery_log`: 날짜·시간대별 푸시 발송 및 중복 방지 기록
- `app_settings`: 개인 설정 저장소
- `push_subscriptions`: 브라우저 푸시 구독 정보

## 하루 1~3회 푸시 알림

실제 Web Push 발송기와 무료 예약 실행 경로가 포함되어 있습니다. 고정 슬롯은 다음 세 개이며 원하는 슬롯을 1~3개 선택합니다.

- 아침: `08:00` KST
- 오후: `13:00` KST
- 저녁: `20:00` KST

[Vercel Cron 사용량/가격 문서](https://vercel.com/docs/cron-jobs/usage-and-pricing)에 따르면 Hobby는 하루 한 번 실행하는 작업을 최대 100개까지 둘 수 있지만, 지정 시각이 포함된 1시간 안에 실행될 수 있습니다. 그래서 이 앱의 표시는 분 단위 보장이 아닌 목표 시간대입니다. 정확한 분 단위 또는 사용자가 임의 시각을 정하는 기능은 유료 스케줄러나 별도 예약 서비스가 필요합니다.

브라우저 구독과 서버 발송에는 한 쌍의 VAPID 키가 필요합니다. 키는 한 번 생성한 뒤 계속 같은 값을 사용합니다.

키는 로컬에서 생성할 수 있습니다.

```bash
npm run push:keys
```

```bash
NEXT_PUBLIC_VAPID_PUBLIC_KEY=브라우저에_노출되는_public_key
VAPID_PRIVATE_KEY=서버에서만_쓰는_private_key
VAPID_SUBJECT=mailto:본인_이메일
CRON_SECRET=16자_이상의_무작위_문자열
```

설정 순서는 다음과 같습니다.

1. 위 네 환경변수와 Basic Auth, Turso 환경변수를 배포 환경에 저장합니다.
2. `npm run db:migrate`로 `push_subscriptions`, `app_settings`, `daily_delivery_log`를 준비합니다.
3. HTTPS 운영 주소를 휴대폰에서 열고 PWA로 설치합니다.
4. `알림 설정`에서 1~3개 시간대를 선택하고 알림을 켭니다.
5. `테스트 알림`으로 실제 휴대폰 수신을 확인합니다.

새 구독을 저장하면 이전 기기의 활성 구독은 자동으로 꺼져 한 대만 유지됩니다. 예약 호출은 `CRON_SECRET` Bearer 인증을 요구하고, 날짜·슬롯별 발송 기록을 먼저 확보해 중복 호출을 차단합니다. 푸시 서비스가 `404` 또는 `410`을 반환한 만료 구독도 자동 비활성화합니다.

Vercel Cron은 `vercel.json`의 세 UTC 스케줄로 같은 예약 API를 호출합니다. [Vercel Cron 보안 문서](https://vercel.com/docs/cron-jobs/manage-cron-jobs)에 따라 `CRON_SECRET`이 설정된 프로젝트의 예약 호출은 `Authorization: Bearer ...` 헤더를 사용합니다. 이 저장소 작업은 구성 파일만 추가했으며 실제 배포나 환경변수 설정은 수행하지 않았습니다. 서버 발송은 upstream [`web-push`](https://github.com/web-push-libs/web-push) 패키지를 사용합니다.

향후 조건형 트리거는 조건 평가 후 현재의 `sendPushNotification` 발송 경계와 별도 idempotency channel을 재사용하면 됩니다. 현재 화면은 매일 시간대 트리거만 제공합니다.

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

## 대순회보 1~309호 지식베이스

대순회보 전체 원문은 이 앱 저장소에 복제하지 않고 별도 canonical KB로 유지합니다.
이 저장소는 ZIP 또는 압축 해제된 KB를 직접 검증·검색하고, 사람이 검수할 작은
citation projection만 생성합니다.

PowerShell에서 현재 ZIP을 지정합니다.

```powershell
$env:DAESOON_KB_PATH = 'D:\다운로드\daesoon-kb-github-ready.zip'
python scripts/daesoon_kb.py inspect
python scripts/daesoon_kb.py search '해원상생' --limit 10
```

전체 운영 원칙과 소비자별 사용법은 [지식베이스 안내](docs/knowledge-base/README.md)를
확인하십시오. 자동 검색 결과는 모두 미검수 후보이며, 원문 문맥·권리·연결 대상을
사람이 확인하기 전에는 앱의 승인 데이터나 공개 콘텐츠로 취급하지 않습니다.
