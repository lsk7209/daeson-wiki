# 대순회보 지식베이스 운영 안내

## 결론

대순회보 1~309호 ZIP은 별도의 **canonical KB**로 유지합니다. `daeson-wiki`는
10,027개 기사 원문이나 13,919개 RAG 청크를 직접 포함하지 않고, 다음 소비 계층만
제공합니다.

```text
Canonical KB release
  기사 Markdown + 기사 ID + 원문 URL + 문단 ID + 콘텐츠 해시
          ↓ 재생성 가능
  catalog.jsonl + chunks/*.jsonl + SQLite FTS
          ↓ 검색 후보
  private / not_reviewed projection proposal
          ↓ 사람의 문맥·권리·연결 검수
  approved citation projection
          ↓
  daeson-wiki / Hermes / OpenClaw / 향후 앱
```

이 경계는 원문 보존, 앱 용량, 인용 추적성, 저작권, 검수 상태를 동시에 지킵니다.

## 정보 계층

| 계층 | 역할 | 변경 규칙 |
|---|---|---|
| Canonical source | 호별·기사별 Markdown 원문 | 수집/재수집 외에는 수정하지 않음 |
| Derived search | catalog, chunks, SQLite | 원문에서 언제든 재생성 가능 |
| Review | OCR·기사·근거 연결 검수 | 원문과 분리하고 담당자·시각 기록 |
| Knowledge | 검수된 인물·개념·장소·사건 | 복수 근거 확인 후 승인 |
| Outputs | 요약·칼럼·퀴즈·발표·앱 export | 원문과 분리, 외부 사용 전 승인 |

## 공통 식별자

- 기사: `ds-{호수 3자리}-b{게시물 번호 6자리}`
- 청크: `{article_id}-c{청크 번호 3자리}`
- 문단: `p0001` 형태
- KB 릴리스: manifest·summary·CSV·catalog·호/기사 Markdown·청크의 경로와 바이트로
  계산한 논리적 `sha256:<64자리>`
- 원본 아카이브: ZIP 자체의 별도 `artifactDigest`
- 앱 citation: `cite-{chunk_id}`

URL은 표현이 달라질 수 있으므로 동일 기사 판정의 기본 키로 사용하지 않습니다.
`article_id`, 또는 원본의 `webzine_id + menu_no + bno` 조합을 사용합니다.
동일 자료를 ZIP 또는 압축 해제 폴더로 열어도 `kbRelease`는 같으며, ZIP 바이트의
무결성 확인에는 `artifactDigest`를 사용합니다.

## 소비자별 문서

- [사용자 빠른 시작](USER_GUIDE.md)
- [Hermes·OpenClaw 에이전트 규칙](AGENT_GUIDE.md)
- [현재·향후 앱 통합 계약](APP_INTEGRATION.md)
- [검수·권리·공개 정책](GOVERNANCE.md)

## 현재 품질 기준선

| 항목 | 값 |
|---|---:|
| 발행호 | 309 |
| 기사 | 10,027 |
| 검색 청크 | 13,919 |
| 원 코너명 | 607 |
| OCR 필요 | 1,008 |
| 이미지 전용 | 274 |
| 기사 검수 상태 | 10,027개 모두 `not_reviewed` |

“검색 결과 없음”과 “OCR 미완료”를 구분해야 하며, 원 코너명은 보존하되 탐색용
`category_normalized`는 별도의 버전 관리된 매핑으로 만들어야 합니다.
