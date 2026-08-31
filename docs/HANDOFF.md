# Current Handoff — Git Publication Complete

- Timestamp: 2026-08-31T14:25:00+09:00
- User goal: 현재 검증된 대순회보 KB와 개인용 PWA/푸시 구현을 Git 원격 저장소에 배포
- Exact current state: KB·개인용 PWA·푸시 구현 46개 파일을 기능 스냅샷 `4b64765452498d9d56b65276fdd937b43a9d4bd5`로 커밋해 PRIVATE `lsk7209/daeson-wiki`의 `master`에 비강제 push했다. push 직후 로컬 HEAD와 원격 ref의 전체 OID가 일치했다. 이 문서는 그 게시 증거를 남기는 문서 전용 후속 기록이다.
- Completed work: Git Goal Harness와 위험 공지를 기록하고 원격/추적 브랜치/가시성을 확인했다. `.env*`, 빌드·캐시·KB proposal/cache, Goal Harness와 OMX 런타임을 제외했다. staged 46개 파일에 고신뢰 비밀 패턴과 생성물 경로가 0건임을 확인하고 독립 Luna Git 감사를 통합했다. 전체 검증 후 `feat: add daesoon knowledge base and mobile push alerts`를 커밋·push하고 원격 OID를 재검증했다.
- Changed files or live systems: `.gitignore`에 `.omx/`를 추가했고 PRIVATE `origin/master`를 `c33496d`에서 `4b64765`로 전진시켰다. Vercel, Turso, 환경변수, 도메인, 실제 휴대폰 푸시는 변경하지 않았다.
- Fresh validation evidence: `npm run verify:all` PASS(전경 839, 문서 19, 푸시 11/11, KB 16/16, TypeScript); `npm run build` PASS(Next 16.3.3, 851 pages); 전체 `npm audit` 0 vulnerabilities; `git diff --check` PASS; staged secret/generated gate 0건; push 후 local/remote OID `4b64765452498d9d56b65276fdd937b43a9d4bd5` MATCH; GitHub Dependabot open alerts API 0건; GitHub Actions run 0건.
- Side effects / rollback: PRIVATE `origin/master`에 일반 커밋을 추가했다. 문제 발생 시 history rewrite나 force push 대신 `git revert 4b64765452498d9d56b65276fdd937b43a9d4bd5`를 검토하고 새 커밋으로 push한다.
- Blockers or risks: Git 게시 차단 요소는 없다. 앱의 실제 사용에는 별도로 HTTPS 배포, Basic/Turso/VAPID/Cron 비밀값, migration 0003, 휴대폰 설치와 권한 허용이 필요하다.
- Deliberately not run or sent: Vercel 배포, 실 DB 조회/마이그레이션, 비밀값 생성·등록, GitHub Release/tag 생성, force push, 실제 외부 푸시 발송.
- Single next step: 사용자가 실제 앱 배포를 명시적으로 요청하면 Turso 중복 preflight부터 수행한다.

# Previous Handoff — Mobile PWA And Push

- Timestamp: 2026-08-31T10:55:22+09:00
- User goal: 앱스토어 없이 본인 휴대폰 한 대에서 쓰는 비공개 PWA와 트리거 기반 하루 1~3회 푸시 알림 구현
- Exact current state: 로컬 구현과 검증은 완료했다. 사용자는 08:00·13:00·20:00 KST 중 1~3개를 선택할 수 있고, 서버는 실제 Web Push 발송, 한 대 구독 유지, 날짜+슬롯 중복 차단, 만료 구독 정리를 수행한다. 실제 휴대폰 수신은 아직 배포·비밀값·Turso·권한 허용이 없어 실행하지 않았다.
- Completed work: 모바일 알림 설정 UI, iPhone/Android 설치 안내, 브라우저 구독 재동기화, VAPID 발송기, 테스트/예약 API, 세 개 무료 Cron, production Basic Auth fail-closed, 서비스 워커 안전 파싱, 동적 오늘 구절, 날짜+슬롯 유니크 마이그레이션, 11개 푸시 테스트와 독립 재검토를 완료했다. 독립 리뷰의 구절 ID 기반 중복키와 구독 재동기화 문제도 수정했다.
- Changed files or live systems: `app/settings/notifications/*`, `app/api/push*`, `lib/browser-push.ts`, `lib/push-*`, `lib/request-auth.ts`, `db/migrations/0003_daily_delivery_slot_uniqueness.sql`, `public/sw.js`, manifest/layout/home/CSS/proxy/env/package/README/tsconfig, `tests/push-*`, `vercel.json`, Goal Harness. 외부 시스템은 변경하지 않았다.
- Fresh validation evidence: `npm run verify:all` PASS(verse 839, Hanja, sources 57/42, docs 19, push 11/11, KB 16/16, TypeScript); `npm run build` PASS(Next 16.3.3, 851 pages); `npm audit --omit=dev` 0 vulnerabilities; production HTTP smoke는 Basic 401/200, auth 미설정 503, Cron 401/401/503; 임시 libSQL은 단말 handoff 0/1 및 changed-verse duplicate 차단; Playwright 390x844은 3개 슬롯/설치 안내/체크 상호작용과 구성된 로컬 DB에서 console error 0; 독립 재검토는 새 blocker 없음.
- Side effects / rollback: `web-push@3.6.7`과 `@types/web-push@3.6.4`를 로컬 의존성에 추가했다. 검증용 workspace DB, Playwright 기록, Next가 생성한 agent 파일은 제거했다. 되돌릴 때는 이 handoff에 열거한 push/PWA 범위만 제거하고 기존 KB dirty work는 보존해야 한다.
- Blockers or risks: live 수신은 HTTPS 배포, Basic/Turso/VAPID/Cron 환경값, DB migration, 휴대폰 알림 허용이 필요하다. Vercel Hobby 예약은 목표 시각이 속한 1시간 내 실행된다. 실제 DB에 과거 로그가 있다면 migration 0003 전에 `(target_date, channel)` 중복을 읽기 전용으로 확인해야 한다.
- Deliberately not run or sent: 실제 VAPID 비밀키 생성·기록, 실 Turso 조회/마이그레이션, Vercel 환경변수/프로젝트/배포 변경, Git commit/push, 외부 푸시 발송, 휴대폰 권한 요청. 앱 데이터와 대순회보 canonical KB도 수정하지 않았다.
- Single next step: 사용자가 라이브 설정/배포를 명시적으로 요청하면 실제 Turso의 날짜+채널 중복 preflight를 먼저 실행하고, 비밀값을 구성해 HTTPS 배포한 뒤 사용자 휴대폰에서 `테스트 알림` 1건을 검증한다.

# Previous Handoff — Knowledge Base

- Timestamp: 2026-08-31T09:02:59+09:00
- User goal: 체계적인 대순회보 1~309호 지식베이스 구조와 사용자, Hermes, OpenClaw, 향후 앱용 사용법·소비 계약·검증 도구 구현
- Exact current state: 구현·최종 검증·독립 재검토 완료. 외부 canonical KB와 앱 citation projection의 경계를 적용했고 기존 앱 데이터는 수정하지 않았다.
- Completed work: ZIP/폴더 공통 CLI(`inspect/search/show/export/validate-projection`), 실행되는 strict projection schema, 16개 테스트, 사용자·Hermes/OpenClaw·앱·거버넌스 가이드를 구현했다. 최종 리뷰의 공개 권리, release provenance, schema fail-open, 출력 경계 4개 지적을 모두 수정하고 재검토했다. Next를 16.3.3으로 갱신해 audit 0을 달성했다.
- Changed files or live systems: `scripts/daesoon_kb.py`, `tests/test_daesoon_kb.py`, `schemas/*`, `docs/knowledge-base/*`, `data/kb/README.md`, README/환경/ignore/package/docs catalog 및 Goal Harness. 원본 ZIP·기존 verse/source 데이터·외부 시스템은 변경하지 않았다.
- Fresh validation evidence: 실제 ZIP inspect 및 3-citation export/validate 309호/10,027기사/13,919청크 PASS; 논리 릴리스 `59cdf318e144f96a88a4413b402c4ac97c354eb48fae27b46d205169397af5fe`; ZIP SHA-256 `d6dea186c556b337b9991f1fa90ae214f32a9c808472df5f451250cf143e9574`; Python 16/16, verify:all, TypeScript, Next build 851 pages, npm audit 0 PASS.
- Side effects / rollback: 로컬 저장소 파일만 변경. 새 KB 소비 계층을 제거하고 package/docs 변경을 되돌리면 기존 앱으로 복귀한다. 실제 projection smoke 파일은 시스템 임시 폴더에서 검증 후 삭제했다.
- Blockers or risks: 원문 재배포 권리는 이 패키지가 부여하지 않는다. 1,008개 OCR 필요 기사와 전체 10,027개 미검수 상태를 승인된 해설로 취급하면 안 된다.
- Deliberately not run or sent: 전체 원문 복사, ZIP 재압축, Git commit/push, 배포, 외부 공개·전송, OCR, 자동 승인, 기존 앱 데이터 병합.
- Single next step: 사람이 첫 실제 citation proposal의 문맥·연결 대상·권리를 검수한 뒤에만 approved projection으로 승격한다.
