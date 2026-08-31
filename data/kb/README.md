# 대순회보 앱 Projection

이 디렉터리는 대순회보 전체 원문을 저장하지 않습니다. 외부 canonical KB에서
선별하고 사람이 검수한 citation projection만 저장하는 경계입니다.

- `proposals/`: CLI가 만든 미검수·비공개 후보. Git 추적 대상이 아닙니다.
- `approved/`: 출처·발췌·권리·연결 대상을 사람이 확인한 데이터만 둡니다.
- 계약: `schemas/daesoon-kb-app-projection.schema.json`

승인 레코드는 `reviewStatus=approved`, `reviewer`, `reviewedAt`을 가져야 합니다.
외부 공개 citation 레코드는 추가로 `rightsStatus=approved_excerpt` 조건을
충족해야 합니다. `public_link_only` 공개는 발췌 없는 별도 메타데이터 출력으로
처리합니다. 개인 메모와 검수 메모는 projection에 넣지 않습니다.
