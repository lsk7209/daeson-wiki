# 사용자 빠른 시작

## 1. 경로 지정

PowerShell에서 현재 ZIP을 환경변수로 지정합니다. 값은 세션에만 적용되며 저장소에
기록되지 않습니다.

```powershell
$env:DAESOON_KB_PATH = 'D:\다운로드\daesoon-kb-github-ready.zip'
```

압축을 해제한 패키지 루트 또는 그 안의 `knowledge-base` 디렉터리도 지정할 수
있습니다. 모든 명령에 `--source <경로>`를 직접 줄 수도 있습니다.

## 2. 상태 점검

```powershell
python scripts/daesoon_kb.py inspect
```

성공 기준은 309호, 기사/기사 Markdown/catalog 각 10,027개, 청크 파일 309개,
청크 13,919개가 collection summary와 일치하는 것입니다. 자동화에서는 JSON을
사용합니다.

```powershell
python scripts/daesoon_kb.py inspect --json
```

## 3. 검색

```powershell
python scripts/daesoon_kb.py search '해원상생' --limit 10
python scripts/daesoon_kb.py search '전경 지명' --issue 261 --limit 20
python scripts/daesoon_kb.py search '상제님' --category '전경 속 이야기' --json
```

결과에는 호수, 기사 ID, 청크 ID, 코너, 문단 ID, OCR/검수 상태, 원문 URL과
짧은 근거가 포함됩니다. 검색은 후보 탐색이며 사실 승인 단계가 아닙니다.

## 4. 전체 원문 문맥 확인

검색에서 얻은 기사 ID로 canonical Markdown 전체를 읽습니다.

```powershell
python scripts/daesoon_kb.py show ds-261-b009497
python scripts/daesoon_kb.py show ds-261-b009497 --json
```

중요한 주장이나 인용은 청크만 보고 확정하지 말고 반드시 이 전체 문맥과 원문
URL을 확인합니다.

## 5. 앱 연결 후보 만들기

내보내기는 기본적으로 dry-run입니다.

```powershell
python scripts/daesoon_kb.py export '행록 3장 19절' `
  --limit 5 `
  --output data/kb/proposals/haengrok-3-19.json
```

선택 결과를 확인한 뒤에만 파일을 만듭니다.

```powershell
python scripts/daesoon_kb.py export '행록 3장 19절' `
  --limit 5 `
  --output data/kb/proposals/haengrok-3-19.json `
  --write
```

생성물은 항상 다음 안전 상태로 시작합니다.

```text
reviewStatus = not_reviewed
rightsStatus = internal_research_only
visibility = private
targets = []
```

출력은 저장소의 `data/kb/proposals/` 아래 `.json`에만 허용됩니다. 기존 파일은
기본적으로 덮어쓰지 않으며, 같은 proposal을 의도적으로 교체할 때만
`--write --force`를 함께 사용합니다. 기존 앱 데이터나 원문 경로는 출력 대상으로
사용할 수 없습니다.

## 6. Projection 검증

```powershell
python scripts/daesoon_kb.py validate-projection `
  data/kb/proposals/haengrok-3-19.json
```

검증기는 KB 릴리스 해시, 기사·청크 ID, 제목·URL·콘텐츠 해시, 문단 ID,
발췌문의 원문 포함 여부, 검수와 공개 권리 조합을 확인합니다.

## 실패 해석

- `source not found`: 경로 또는 `DAESOON_KB_PATH` 확인
- count mismatch: ZIP/디렉터리가 불완전하거나 다른 릴리스가 섞임
- unknown article/chunk: projection과 canonical KB 릴리스가 다름
- excerpt is not exact: 원문 변경 또는 발췌문 변조
- public visibility requires...: 사람 검수나 공개 권리 상태가 부족함
