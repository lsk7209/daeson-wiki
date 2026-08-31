# 웹/앱 최적화 로그

## 5인 역할 구성

1. 성능/아키텍처: 초기 HTML, 데이터 접근, 빌드 산출물 크기 관리
2. PWA/앱화: 설치형 웹앱, 서비스워커, 오프라인 접근 기반
3. UX/읽기 경험: 권별 탐색, 상세 페이지, 모바일 터치 영역
4. 데이터/콘텐츠: 전경 구절 정규화, 중복 ID, 권/장/절 구조
5. QA/보안: `robots.txt`, `noindex` 헤더, 타입체크, 빌드, 런타임 응답 검증

## 이번 최적화

- 홈에서 839개 구절 전체 미리보기 렌더링을 제거하고 권별 요약 카드로 전환
- 권별 구절 목록 페이지 `/books/[book]` 추가
- 전경 데이터 정렬, ID 조회, 이전/다음 이동을 모듈 로드 시 캐시
- PWA manifest, 앱 아이콘, 서비스워커, 오프라인 페이지 추가
- 모바일 설치 버튼을 지원 브라우저에서만 노출
- 개인 첨언/낙서장에 저장 상태 표시 추가
- 검색 차단 유지: `robots.txt` 전체 차단, 모든 라우트 `X-Robots-Tag: noindex`

## 알림/PWA 확장

- `/today` 동적 라우트 추가: 한국 날짜 기준 오늘의 구절 상세 페이지로 이동
- `/api/daily` 추가: 향후 서버 푸시/스케줄러가 사용할 오늘의 구절 JSON 제공
- 일일 구절 순서는 2026-07-03 KST를 1일차로 두고 `행록 1장 1절`부터 시작
- 홈에 알림 권한 버튼 추가: 지원 브라우저에서 서비스워커 알림 테스트 가능
- 서비스워커에 `push`, `notificationclick` 핸들러 추가
- manifest shortcut을 `/today`로 연결

### 2026-08-31 예약 푸시 완성

- `/settings/notifications`에서 08:00·13:00·20:00 KST 중 1~3개를 선택
- `web-push` VAPID 서버 발송기와 `CRON_SECRET` Bearer 인증 예약 API 추가
- `vercel.json`에 Hobby 무료 범위의 하루 3개 UTC Cron 등록
- 새 휴대폰 구독이 이전 활성 구독을 원자적으로 끄는 단일 기기 정책 적용
- `(target_date, channel)` 유니크 인덱스로 구절 데이터가 바뀌어도 같은 날짜·슬롯 중복 발송 차단
- 푸시 서비스의 404/410 응답 시 만료 구독 자동 비활성화
- 운영 Basic Auth 미설정 시 503으로 닫히는 fail-closed 정책 적용
- iPhone 홈 화면 추가 안내, Android 설치 안내, malformed push fallback 추가

## 검증 기준

- `npm run type-check`
- `npm run push:test`
- `npm run verify:all`
- `npm run build`
- `/`, `/books/gyobeop`, `/verses/haengrok-1-1` HTTP 200
- `/today` HTTP 307 redirect
- `/api/daily` HTTP 200 JSON
- `/manifest.webmanifest`, `/sw.js`, `/robots.txt` HTTP 200
- 전경 데이터 839구절, 중복 ID 0개, 장 표기 누락 0개

## 다음 단계

- 실제 Turso에서 날짜+채널 중복 preflight 후 migration 0003 적용
- Basic Auth, Turso, VAPID, Cron 환경값을 설정한 HTTPS 배포 승인
- 사용자 휴대폰 설치 후 테스트 푸시 1건과 세 예약 슬롯 수신 확인
- 향후 조건형 트리거는 기존 발송기와 별도 idempotency channel을 재사용해 추가

## 원문 불변

- 전경 원문 `data/verses.json`의 `text`는 직접 수정 금지
- 볼드, 링크, 클릭, 주석, 해설은 별도 화면/데이터 레이어에서 처리
- `npm run verify:verses`로 원문과 잠금 메타데이터 변경 여부 확인

## 관련 자료 레이어

- 공식/관련 자료 URL은 `data/source-seeds.json`에 추가
- `npm run collect:sources`는 제목, URL, 출처, 구절 주변 짧은 근거 문구만 저장
- 외부 자료 전문은 저장하지 않고 `data/verse-source-links.json`에서 구절 ID와 연결
- 구절 상세 페이지는 이 연결 레이어를 읽어 원문 아래에 관련 자료를 표시
