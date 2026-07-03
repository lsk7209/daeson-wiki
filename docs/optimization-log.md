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

## 검증 기준

- `npm run type-check`
- `npm run build`
- `/`, `/books/gyobeop`, `/verses/haengrok-1-1` HTTP 200
- `/today` HTTP 307 redirect
- `/api/daily` HTTP 200 JSON
- `/manifest.webmanifest`, `/sw.js`, `/robots.txt` HTTP 200
- 전경 데이터 839구절, 중복 ID 0개, 장 표기 누락 0개

## 다음 단계

- Turso DB 도입 시 메모/첨언을 기기 저장에서 서버 저장으로 이전
- 로그인 또는 Basic Auth 추가 전까지 검색 차단은 보안 장벽이 아님
- 푸시 알림은 사용자 로그인, 구독 정보 저장, 발송 스케줄러가 필요
