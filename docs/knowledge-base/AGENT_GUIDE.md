# Hermes·OpenClaw 공통 사용 규칙

## 책임 분리

결정론적인 점검·검색·인용 검증은 `scripts/daesoon_kb.py`가 담당합니다. Hermes와
OpenClaw는 후보를 해석하고 교차 확인하며 결과물을 작성하지만, 원문·검수 상태·권리
상태를 임의로 바꾸지 않습니다.

## 필수 검색 순서

```text
1. inspect로 KB 릴리스와 품질 상태 확인
2. search로 catalog/chunk 후보 검색
3. show로 전체 기사 문맥 확인
4. 기사 reviewStatus와 ocrStatus 확인
5. 출처가 붙은 초안 생성
6. 사람이 검수하기 전까지 outputs/proposals에만 저장
```

청크만 읽고 사실을 단정하거나, 검색 순위를 신뢰도 점수로 해석하지 않습니다.

## 모든 주장에 남길 근거

- 기사 ID
- 대순회보 호수
- 기사 제목
- 원문 URL
- 근거 문단 ID
- 표현 유형: `직접 인용`, `요약`, `해석`, `추론`, `제안`
- OCR 및 검수 상태

직접 인용은 원문과 동일해야 합니다. 요약·해석·추론은 원문인 것처럼 표시하지
않습니다. 한자·고어·고유명사를 현대어로 바꿀 경우 원문 표현을 병기합니다.

## 권장 실행 예시

```powershell
python scripts/daesoon_kb.py inspect --json
python scripts/daesoon_kb.py search '해원상생 보은' --limit 20 --json
python scripts/daesoon_kb.py show ds-001-b001176 --json
```

## 에이전트용 작업 계약

```text
당신은 대순회보 KB를 읽는 근거 우선 연구 에이전트다.
먼저 inspect 결과가 passed인지 확인한다.
search 결과의 기사 ID와 문단 ID를 기록하고 show로 전체 문맥을 확인한다.
직접 인용, 요약, 해석, 추론을 명시적으로 구분한다.
모든 핵심 주장에 호수, 기사 ID, 제목, 원문 URL, 문단 ID를 붙인다.
not_reviewed, OCR required, image_only 자료는 불확실성을 표시한다.
생성 결과는 원문이나 knowledge 디렉터리에 덮어쓰지 않고 proposal로 취급한다.
공개, 발행, 앱 승인 데이터 승격은 사람 검수와 별도 권리 확인 없이는 수행하지 않는다.
```

## 금지 사항

- 원문 Markdown 또는 content hash 덮어쓰기
- `not_reviewed`를 자동으로 `approved`로 변경
- 이미지 전용 기사를 “내용 없음”으로 단정
- URL 문자열만으로 중복 기사 판정
- 개인 메모·검수 메모를 공용 지식 또는 앱 export에 포함
- 원문 전체를 외부 서비스, 공개 RAG API 또는 학습 데이터로 전송
