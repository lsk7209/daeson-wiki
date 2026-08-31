# 앱 통합 계약

## 원칙

현재 앱의 `data/verses.json` 원문과 Turso 개인 데이터 경계를 유지합니다. 대순회보
전체 원문이나 RAG 청크를 Next.js 정적 import로 넣지 않습니다. 앱은 검수된 작은
citation projection만 소비합니다.

계약의 JSON Schema는 다음 파일입니다.

```text
schemas/daesoon-kb-app-projection.schema.json
```

## Citation 생명주기

```text
not_reviewed/private proposal
  → in_review/internal
  → approved/private|internal
  → 권리 확인 시에만 approved/public

검수 실패 → rejected/private
```

`approved`에는 `reviewer`와 `reviewedAt`이 필수입니다. 이 citation projection은
발췌문을 필수로 포함하므로 `public`은 `rightsStatus=approved_excerpt`와
`citationMode=exact_excerpt`일 때만 허용합니다. `public_link_only`는 발췌문 없는
별도 메타데이터 출력으로만 공개하고 이 projection에서는 `private|internal`로 둡니다.

## 전경 구절 연결

projection의 `targets`에 기존 `verseId`를 기록합니다.

```json
{
  "type": "verse",
  "id": "haengrok-3-19"
}
```

기존 `sourceDocumentId`를 새로 발명하지 않고 KB `articleId`를 보존합니다. 기존
`source-documents.json`과 호환 어댑터가 필요하면 다음처럼 투영합니다.

```text
SourceDocument.id        ← articleId
SourceDocument.title     ← title
SourceDocument.url       ← sourceUrl
VerseSourceLink.verseId  ← targets[type=verse].id
VerseSourceLink.evidence ← excerpt
```

단, 승인되지 않은 projection을 기존 정적 JSON으로 자동 병합하지 않습니다.

## 앱이 반드시 필터링할 상태

- `reviewStatus=rejected`: 노출 금지
- `reviewStatus!=approved`: 검수 UI 외 기본 노출 금지
- `visibility=private`: 개인/로컬 처리만
- `rightsStatus=restricted`: 원문 발췌 표시 금지
- OCR 필요 기사: 원문 텍스트 정확성 경고

## 릴리스와 회귀 검증

앱 projection은 핵심 canonical/derived 파일을 모두 포함하는, 패키징 방식과 무관한
논리적 `kbRelease=sha256:...`와 ZIP에서 생성했을 때의 정확한
`artifactDigest=sha256:...`를 함께 기록합니다. KB가 갱신되면 다음을 다시 검증합니다.

1. 동일 기사 ID 존재
2. `contentSha256` 일치
3. 동일 청크와 문단 ID 존재
4. 발췌문이 원문 청크에 정확히 포함
5. 연결 대상 `verseId` 존재
6. 검수·권리 상태가 앱 노출 정책을 통과

현재 CLI는 1~4와 검수·권리 조합을 검사합니다. 실제 앱 import를 연결할 때 기존
`verify-source-links.mjs`와 결합해 5까지 강제해야 합니다.
