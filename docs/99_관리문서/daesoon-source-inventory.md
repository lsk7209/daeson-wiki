# 대순진리회 소스 자료 인벤토리

작성일: 2026-07-10
대상 프로젝트: `D:\daeson-wiki`
용도: 다른 프로젝트에서 대순진리회 관련 자료를 재사용할 때 참조할 수 있는 소스 맵

## 핵심 원칙

- 원전 본문과 외부 자료 전문은 별도 권리 확인 없이 복제하지 않는다.
- 이 프로젝트의 웹 수집 데이터는 제목, URL, 출처, 분류, 구절 연결용 짧은 근거 문구 중심으로 보관한다.
- `data/verses.json`의 전경 원문은 잠금 데이터로 보고, 해설·링크·검수 상태는 별도 데이터 레이어에 둔다.
- 다른 프로젝트로 옮길 때는 `sourceDocumentId`, `verseId`, `url`을 기준 키로 사용한다.
- 해설 작성에는 공식/준공식 자료를 근거로 삼되, 표현은 새로 작성하고 출처 링크를 남긴다.

## 현재 보유 현황

| 구분 | 파일 | 수량 | 설명 |
|---|---:|---:|---|
| 수집 시드 | `data/source-seeds.json` | 15 | 수집 대상 URL과 출처 분류 |
| 웹 소스 문서 | `data/source-documents.json` | 57 | 수집·정규화된 웹 문서 메타데이터 |
| 구절-자료 연결 | `data/verse-source-links.json` | 42 | 전경 구절과 소스 문서의 자동 연결 결과 |
| 로컬 문헌 카탈로그 | `docs/catalog.json` | 19 | PDF/DOCX/MD 문헌 목록과 파일 경로 |
| 로컬 문헌 리뷰 | `docs/content-review.json` | 19 | 추출 가능 여부, 키워드 빈도, 샘플 |

## 데이터 파일별 역할

### `data/source-seeds.json`

수집기의 입력 목록이다. 새 자료를 추가하려면 이 파일에 출처명, 사이트, 타입, 카테고리, URL을 먼저 추가한 뒤 수집 스크립트를 실행한다.

현재 시드 출처:

| 출처 | 건수 |
|---|---:|
| 대순회보 | 2 |
| 교화연구 | 6 |
| 대순종교문화연구소 웹진 | 4 |
| 대순종교문화연구소 DIC | 2 |
| 대순진리회 여주본부도장 | 1 |

### `data/source-documents.json`

웹 수집 결과의 표준 문서 테이블이다. 다른 프로젝트에서 가장 먼저 가져갈 기본 메타데이터다.

주요 필드:

| 필드 | 의미 |
|---|---|
| `id` | 내부 문서 ID. 구절 연결에서 `sourceDocumentId`로 참조 |
| `sourceName` | 출처명 |
| `sourceSite` | 도메인 또는 사이트 식별자 |
| `sourceType` | 출처 유형 |
| `category` | 자료 분류 |
| `title` | 문서 제목 |
| `url` | 원문 URL |
| `fetchedAt` | 수집 시각 |
| `copyrightNote` | 보관 범위 메모 |

출처별 문서 수:

| 출처 | 문서 수 |
|---|---:|
| 대순종교문화연구소 DIC | 44 |
| 교화연구 | 6 |
| 대순종교문화연구소 웹진 | 4 |
| 대순회보 | 2 |
| 대순진리회 여주본부도장 | 1 |

유형별 문서 수:

| 유형 | 문서 수 | 활용 방향 |
|---|---:|---|
| `canonical_guidance` | 48 | 교리·제도·수도 기준의 기본 근거 |
| `research_webzine` | 4 | 주제별 해석과 현대적 설명 참고 |
| `education` | 2 | 교화 자료와 기본 원리 설명 |
| `webzine` | 2 | 대순회보 기사 기반 보충 자료 |
| `official_dictionary` | 1 | 전경 용어 풀이 |

카테고리별 문서 수:

| 카테고리 | 문서 수 |
|---|---:|
| 대순지침 | 22 |
| 대순진리회요람 | 22 |
| article | 4 |
| 포덕교화기본원리 | 2 |
| 대순성적도해요람 | 1 |
| 도헌 | 1 |
| 전경 속 이야기 | 1 |
| 전경 용어/해설 | 1 |
| 외부기고 | 1 |
| 전경성구 | 1 |
| 전경용어사전 | 1 |

### `data/verse-source-links.json`

전경 구절과 자료의 연결 테이블이다. 앱에서 “공식 자료 기반 해설”과 “연결 자료”를 만들 때 쓴다.

주요 필드:

| 필드 | 의미 |
|---|---|
| `id` | 연결 ID |
| `verseId` | 전경 구절 ID. 예: `haengrok-3-19` |
| `sourceDocumentId` | `source-documents.json`의 문서 ID |
| `relationType` | 연결 유형 |
| `confidence` | 연결 신뢰도 |
| `reviewStatus` | 자동/확정/제외 상태 |
| `matchedText` | 자료 안에서 발견된 구절 표기 |
| `evidenceSnippet` | 연결 판단용 짧은 주변 문구 |

연결 유형:

| 유형 | 건수 | 의미 |
|---|---:|---|
| `source_reference` | 39 | 해당 구절이 참고문헌·본문에서 언급됨 |
| `direct_interpretation` | 3 | 해당 구절을 직접 풀이하거나 설명함 |

전경 편별 연결 수:

| 편 | 연결 수 |
|---|---:|
| 교법 | 12 |
| 행록 | 11 |
| 교운 | 9 |
| 공사 | 7 |
| 예시 | 3 |

## 웹 소스 문서 목록

| 출처 | 분류 | 제목 | URL |
|---|---|---|---|
| 대순종교문화연구소 DIC | 대순지침 | 대순지침 - 제 1장. 대순진리회의 바른이해 | http://dict.dirc.kr/app/k/2/page#group-9 |
| 대순종교문화연구소 DIC | 대순지침 | 대순지침 - 제 1장. 바른 수도생활 | http://dict.dirc.kr/app/k/2/page#group-13 |
| 대순종교문화연구소 DIC | 대순지침 | 대순지침 - 제 1장. 신앙 생활에서의 모본 | http://dict.dirc.kr/app/k/2/page#group-18 |
| 대순종교문화연구소 DIC | 대순지침 | 대순지침 - 제 1장. 종단 기구의 책무 | http://dict.dirc.kr/app/k/2/page#group-15 |
| 대순종교문화연구소 DIC | 대순지침 | 대순지침 - 제 1장. 종단 사업의 바른인식 | http://dict.dirc.kr/app/k/2/page#group-22 |
| 대순종교문화연구소 DIC | 대순지침 | 대순지침 - 제 2장. 3대 중요사업의 알찬 추진 | http://dict.dirc.kr/app/k/2/page#group-23 |
| 대순종교문화연구소 DIC | 대순지침 | 대순지침 - 제 2장. 신조에 의한 수도생활 | http://dict.dirc.kr/app/k/2/page#group-14 |
| 대순종교문화연구소 DIC | 대순지침 | 대순지침 - 제 2장. 임원과 도인의 관계 | http://dict.dirc.kr/app/k/2/page#group-19 |
| 대순종교문화연구소 DIC | 대순지침 | 대순지침 - 제 2장. 종단 체계의 확립 | http://dict.dirc.kr/app/k/2/page#group-16 |
| 대순종교문화연구소 DIC | 대순지침 | 대순지침 - 제 2장. 진리에 의한 포덕ㆍ교화를 강화 | http://dict.dirc.kr/app/k/2/page#group-10 |
| 대순종교문화연구소 DIC | 대순지침 | 대순지침 - 제 3장. 조직체계의 관리 | http://dict.dirc.kr/app/k/2/page#group-20 |
| 대순종교문화연구소 DIC | 대순지침 | 대순지침 - 제 3장. 체계의 질서 확보 | http://dict.dirc.kr/app/k/2/page#group-17 |
| 대순종교문화연구소 DIC | 대순지침 | 대순지침 - 제 3장. 해원상생과 보은상생의 윤리실천 | http://dict.dirc.kr/app/k/2/page#group-11 |
| 대순종교문화연구소 DIC | 대순지침 | 대순지침 - 제 4장. 개전의 수도 생활 | http://dict.dirc.kr/app/k/2/page#group-21 |
| 대순종교문화연구소 DIC | 대순지침 | 대순지침 - 제 4장. 상생 윤리의 생활화로 보국 안민 성취 | http://dict.dirc.kr/app/k/2/page#group-12 |
| 대순종교문화연구소 DIC | 대순지침 | 대순지침 - 지 침 | http://dict.dirc.kr/app/k/2/page#group-3 |
| 대순종교문화연구소 DIC | 대순지침 | 대순지침 - 훈시의 대지(大志) | http://dict.dirc.kr/app/k/2/page#group-2 |
| 대순종교문화연구소 DIC | 대순지침 | 대순지침 - Ⅰ. 신앙 체계의 정립 | http://dict.dirc.kr/app/k/2/page#group-4 |
| 대순종교문화연구소 DIC | 대순지침 | 대순지침 - Ⅱ. 수도ㆍ공부 | http://dict.dirc.kr/app/k/2/page#group-5 |
| 대순종교문화연구소 DIC | 대순지침 | 대순지침 - Ⅲ. 조직기구 | http://dict.dirc.kr/app/k/2/page#group-6 |
| 대순종교문화연구소 DIC | 대순지침 | 대순지침 - Ⅳ. 처사의 모본 | http://dict.dirc.kr/app/k/2/page#group-7 |
| 대순종교문화연구소 DIC | 대순지침 | 대순지침 - Ⅴ. 종단의 사업 | http://dict.dirc.kr/app/k/2/page#group-8 |
| 대순종교문화연구소 DIC | 대순진리회요람 | 대순진리회요람 - 1. 대순진리회(大巡眞理會) | http://dict.dirc.kr/app/k/3/page#group-2 |
| 대순종교문화연구소 DIC | 대순진리회요람 | 대순진리회요람 - 10. 훈회(訓誨) | http://dict.dirc.kr/app/k/3/page#group-11 |
| 대순종교문화연구소 DIC | 대순진리회요람 | 대순진리회요람 - 11. 수칙(守則) | http://dict.dirc.kr/app/k/3/page#group-12 |
| 대순종교문화연구소 DIC | 대순진리회요람 | 대순진리회요람 - 12. 연중중요행사일(年中重要行事日) | http://dict.dirc.kr/app/k/3/page#group-13 |
| 대순종교문화연구소 DIC | 대순진리회요람 | 대순진리회요람 - 13. 사업(事業) | http://dict.dirc.kr/app/k/3/page#group-14 |
| 대순종교문화연구소 DIC | 대순진리회요람 | 대순진리회요람 - 14. 조직기구(組織機構) | http://dict.dirc.kr/app/k/3/page#group-15 |
| 대순종교문화연구소 DIC | 대순진리회요람 | 대순진리회요람 - 15. 여주본부도장 전경 | http://dict.dirc.kr/app/k/3/page#group-16 |
| 대순종교문화연구소 DIC | 대순진리회요람 | 대순진리회요람 - 16. 중곡도장 전경 | http://dict.dirc.kr/app/k/3/page#group-17 |
| 대순종교문화연구소 DIC | 대순진리회요람 | 대순진리회요람 - 17. 포천수도장 전경 | http://dict.dirc.kr/app/k/3/page#group-18 |
| 대순종교문화연구소 DIC | 대순진리회요람 | 대순진리회요람 - 18. 금강산토성수련도장 전경 | http://dict.dirc.kr/app/k/3/page#group-19 |
| 대순종교문화연구소 DIC | 대순진리회요람 | 대순진리회요람 - 19. 제주수련도장 | http://dict.dirc.kr/app/k/3/page#group-20 |
| 대순종교문화연구소 DIC | 대순진리회요람 | 대순진리회요람 - 2. 신앙의 대상(信仰의 對象) | http://dict.dirc.kr/app/k/3/page#group-3 |
| 대순종교문화연구소 DIC | 대순진리회요람 | 대순진리회요람 - 20. 대진대학교 전경 | http://dict.dirc.kr/app/k/3/page#group-21 |
| 대순종교문화연구소 DIC | 대순진리회요람 | 대순진리회요람 - 21. 분당제생병원 | http://dict.dirc.kr/app/k/3/page#group-22 |
| 대순종교문화연구소 DIC | 대순진리회요람 | 대순진리회요람 - 22. 대순진리회복지재단 전경 | http://dict.dirc.kr/app/k/3/page#group-23 |
| 대순종교문화연구소 DIC | 대순진리회요람 | 대순진리회요람 - 3. 취지(趣旨) | http://dict.dirc.kr/app/k/3/page#group-4 |
| 대순종교문화연구소 DIC | 대순진리회요람 | 대순진리회요람 - 4. 연혁(沿革) | http://dict.dirc.kr/app/k/3/page#group-5 |
| 대순종교문화연구소 DIC | 대순진리회요람 | 대순진리회요람 - 5. 교리개요(敎理槪要) | http://dict.dirc.kr/app/k/3/page#group-6 |
| 대순종교문화연구소 DIC | 대순진리회요람 | 대순진리회요람 - 6. 종지(宗旨) | http://dict.dirc.kr/app/k/3/page#group-7 |
| 대순종교문화연구소 DIC | 대순진리회요람 | 대순진리회요람 - 7. 신조(信條) | http://dict.dirc.kr/app/k/3/page#group-8 |
| 대순종교문화연구소 DIC | 대순진리회요람 | 대순진리회요람 - 8. 목적(目的) | http://dict.dirc.kr/app/k/3/page#group-9 |
| 대순종교문화연구소 DIC | 대순진리회요람 | 대순진리회요람 - 9. 수도(修道) | http://dict.dirc.kr/app/k/3/page#group-10 |
| 교화연구 | 대순성적도해요람 | 대순성적도해요람 | http://gyomubu.or.kr/bbs/content.php?co_id=002_301060 |
| 교화연구 | 도헌 | 도헌 | http://gyomubu.or.kr/bbs/content.php?co_id=002_301070 |
| 교화연구 | 전경 속 이야기 | 선자사지(善者師之) 악자개지(惡者改之) > 청계탑 | http://gyomubu.or.kr/bbs/board.php?bo_table=002_501020&wr_id=100 |
| 교화연구 | 전경 용어/해설 | 전경의 구성과 내용을 설명해 주세요. > Q&A | http://gyomubu.or.kr/bbs/board.php?bo_table=002_501070&wr_id=27 |
| 교화연구 | 포덕교화기본원리 | 포덕교화기본원리1 | http://gyomubu.or.kr/bbs/content.php?co_id=002_301040 |
| 교화연구 | 포덕교화기본원리 | 포덕교화기본원리2 | http://gyomubu.or.kr/bbs/content.php?co_id=002_301050 |
| 대순회보 | 외부기고 | 상제님께서 인용하신 한시 | https://webzine.daesoon.org/board/readcnt.asp?bno=8077&menu_no=4380&page=1&webzine=253 |
| 대순회보 | 전경성구 | 행록 3장 19절의 교훈 | https://webzine.daesoon.org/board/readcnt.asp?webzine=305&menu_no=5137&bno=9497&page=1 |
| 대순종교문화연구소 웹진 | article | 전경 교운 1장 9절 속 지하의 의미 | https://webzine.dirc.kr/article/160 |
| 대순종교문화연구소 웹진 | article | 증산의 언설로 보는 가짜뉴스 | https://webzine.dirc.kr/article/177 |
| 대순종교문화연구소 웹진 | article | 척신과 마(魔)가 풀리는 원리 | https://webzine.dirc.kr/article/115 |
| 대순종교문화연구소 웹진 | article | 초록눈의 괴물 - '질투'의 심리학적 분석 | https://webzine.dirc.kr/article/145 |
| 대순진리회 여주본부도장 | 전경용어사전 | 봉래산(蓬萊山) | http://www.daesoon.org/about/dictionary.php?idx=19 |

## 로컬 문헌 자료

`docs/catalog.json`은 로컬에 보관된 PDF/DOCX/MD 자료의 색인이다. 전체 19개 항목, 합계 5,955쪽, 약 874,918단어가 색인화되어 있다. `docs/content-review.json`에는 키워드 카운트와 일부 샘플이 들어 있다.

시리즈별 보유 현황:

| 시리즈 | 건수 |
|---|---:|
| 동아인문국제논단 | 7 |
| 동아인문논단 | 5 |
| 동아도문화국제학술연토회 | 4 |
| 종단 홍보자료 | 1 |
| 원전/기타자료 | 1 |
| 프로젝트 운영 문서 | 1 |

포맷별 보유 현황:

| 포맷 | 건수 |
|---|---:|
| PDF | 16 |
| DOCX | 2 |
| MD | 1 |

로컬 문헌 목록:

| 시리즈 | 연도 | 제목 | 형식 | 쪽수 | 단어수 | 파일 |
|---|---:|---|---|---:|---:|---|
| 동아도문화국제학술연토회 | 2010 | 2010 동아도문화국제학술연토회 | PDF | 445 | 70509 | `docs/01_학술자료/01_동아도문화국제학술연토회/2010 동아도문화국제학술연토회.pdf` |
| 동아도문화국제학술연토회 | 2011 | 2011 동아도문화국제학술연토회 | PDF | 511 | 72393 | `docs/01_학술자료/01_동아도문화국제학술연토회/2011 동아도문화국제학술연토회.pdf` |
| 동아도문화국제학술연토회 | 2012 | 2012 동아도문화국제학술연토회 - 동아도문화 중 신선사상 | PDF | 389 | 58146 | `docs/01_학술자료/01_동아도문화국제학술연토회/2012 동아도문화국제학술연토회 -동아도문화 중 신선사상-.pdf` |
| 동아도문화국제학술연토회 | 2013 | 2013 동아도문화국제학술연토회 - 도문화 중 양생사상 | PDF | 453 | 64756 | `docs/01_학술자료/01_동아도문화국제학술연토회/2013 동아도문화국제학술연토회 -도문화 중 양생사상-.pdf` |
| 동아인문논단 | 2015 | 2015 동아인문논단 상 - 동방문화와 의도 | PDF | 363 | 46528 | `docs/01_학술자료/02_동아인문논단/2015 동아인문논단(上) -동방문화와 의도 국제학술연토회-.pdf` |
| 동아인문논단 | 2015 | 2015 동아인문논단 하 - 동방문화와 의도 | PDF | 249 | 39201 | `docs/01_학술자료/02_동아인문논단/2015 동아인문논단(下) -동방문화와 의도 국제학술연토회-.pdf` |
| 동아인문논단 | 2016 | 2016 동아인문논단 - 동방문화와 심령건강 | PDF | 310 | 33391 | `docs/01_학술자료/02_동아인문논단/2016 동아인문논단 -동방문화와 심령건강 국제학술연토회-.pdf` |
| 동아인문논단 | 2017 | 2017 동아인문논단 - 동방문명과 심령건강 | PDF | 271 | 41242 | `docs/01_학술자료/02_동아인문논단/2017 동아인문논단 -동방문명과 심령건강 국제학술연토회-.pdf` |
| 동아인문논단 | 2020 | 2020 동아인문논단 - 동방문명과 의궤 | PDF | 294 | 41937 | `docs/01_학술자료/02_동아인문논단/2020동아인문논단 -동방문명과 의궤 국제학술연토회-.pdf` |
| 동아인문국제논단 | 2018 | 2018 국제동아인문논단 - 동방문화와 생명철학 | PDF | 451 | 66196 | `docs/01_학술자료/03_동아인문국제논단/2018국제동아인문논단 -동방문화와 생명철학 국제학술연토회-.pdf` |
| 동아인문국제논단 | 2019 | 2019 동아인문국제논단 상 - 동방문화와 생명철학 | DOCX |  | 31394 | `docs/01_학술자료/03_동아인문국제논단/2019 동아인문국제논단(上) -동방문화와 생명철학국제학술연토회-.docx` |
| 동아인문국제논단 | 2019 | 2019 동아인문국제논단 하 - 동방문화와 생명철학 | DOCX |  | 21856 | `docs/01_학술자료/03_동아인문국제논단/2019 동아인문국제논단(下) -동방문화와 생명철학 국제학술연토회-.docx` |
| 동아인문국제논단 | 2021 | 2021 동아인문국제논단 - 동방문명과 예의 | PDF | 627 | 79742 | `docs/01_학술자료/03_동아인문국제논단/2021동아인문국제논단 -동방문명과 예의 국제학술연토회-.pdf` |
| 동아인문국제논단 | 2022 | 2022 동아인문국제논단 - 동방문명과 예도 | PDF | 601 | 72719 | `docs/01_학술자료/03_동아인문국제논단/2022동아인문국제논단 -동방문명과 예도(藝道) 국제학술연토회-.pdf` |
| 동아인문국제논단 | 2023 | 2023 동아인문국제논단 - 동방문명과 예도 | PDF | 375 | 47733 | `docs/01_학술자료/03_동아인문국제논단/2023동아인문국제논단 -동방문명과 예도(藝道) 국제학술연토회-.pdf` |
| 동아인문국제논단 |  | 제15회 동아인문국제논단 - 동방문명과 자연 | PDF | 572 | 80110 | `docs/01_학술자료/03_동아인문국제논단/제15회 동아인문국제논단 -동방문명과 자연-.pdf` |
| 종단 홍보자료 |  | 종단 홍보책자 영어본 | PDF | 26 | 6722 | `docs/02_홍보자료/종단 홍보책자(영어본).pdf` |
| 원전/기타자료 |  | 채지가 | PDF | 18 | 0 | `docs/03_원전_기타자료/채지가.pdf` |
| 프로젝트 운영 문서 | 2026 | 웹/앱 최적화 로그 | MD |  | 343 | `docs/99_관리문서/optimization-log.md` |

## 로컬 문헌 키워드 총량

`docs/content-review.json` 기준 전체 로컬 문헌에서 집계된 주요 키워드 빈도다. 검색 우선순위나 RAG 색인 가중치 설계에 참고한다.

| 키워드 | 빈도 |
|---|---:|
| 대순진리회 | 716 |
| 상제 | 419 |
| 전경 | 307 |
| 공사 | 247 |
| 도통 | 177 |
| 교화 | 141 |
| 교운 | 113 |
| 도주 | 110 |
| 교법 | 109 |
| 해원상생 | 106 |
| 행록 | 78 |
| 제생 | 75 |
| 예시 | 57 |
| 대순지침 | 28 |
| 권지 | 25 |
| 보은상생 | 17 |
| 포덕 | 7 |

## 다른 프로젝트에서 가져갈 때의 권장 구조

최소 이전:

```text
data/source-documents.json
data/verse-source-links.json
docs/catalog.json
docs/content-review.json
```

수집까지 재사용:

```text
data/source-seeds.json
scripts/collect-source-links.mjs
scripts/verify-source-links.mjs
scripts/verify-docs-catalog.mjs
```

구절 해설 UI까지 재사용:

```text
lib/source-types.ts
lib/source-links.ts
lib/source-reviews.ts
app/sources/page.tsx
app/sources/source-review-controls.tsx
```

## 활용 패턴

### 1. 전경 구절별 관련 자료 표시

1. `verseId`로 `data/verse-source-links.json`를 필터링한다.
2. 각 항목의 `sourceDocumentId`로 `data/source-documents.json`에서 문서 메타데이터를 찾는다.
3. `relationType`이 `direct_interpretation`이면 직접 해설 후보로 먼저 보여준다.
4. `relationType`이 `source_reference`이면 보조 참고 자료로 보여준다.
5. `reviewStatus`가 `rejected`인 항목은 기본 화면에서 제외한다.

주의: 이 프로젝트는 Turso DB에 검수 상태를 따로 저장할 수 있다. 다른 프로젝트로 옮길 때 DB 검수 상태까지 필요하면 `source_link_reviews` 테이블도 함께 이전해야 한다.

### 2. 주제별 자료 추천

1. `docs/content-review.json`의 `keyword_counts`를 이용해 주제 후보 문헌을 먼저 고른다.
2. `docs/catalog.json`의 `file_path`, `page_count`, `text_status`로 실제 열람 가능성을 확인한다.
3. 웹 근거가 필요하면 `source-documents.json`에서 `category`, `sourceType`, `title` 기준으로 추가 자료를 찾는다.

### 3. 해설 작성

1. 원문 문장은 `data/verses.json`에서 직접 수정하지 않는다.
2. 공식 자료 링크는 `source-documents.json`와 `verse-source-links.json`에서 찾는다.
3. 어려운 용어·한자어·인명·지명 중심으로 짧게 풀이한다.
4. 외부 자료 문장을 길게 베끼지 말고, 출처 링크와 요약으로 처리한다.

## 검증 명령

자료를 수정한 뒤에는 다음 명령을 우선 실행한다.

```bash
npm run verify:verses
npm run verify:sources
npm run verify:docs
npm run type-check
```

전체 검증:

```bash
npm run verify:all
```

## 현재 검토 메모

- `data/source-documents.json`와 `data/verse-source-links.json`의 구조 검증은 `npm run verify:sources`로 통과했다.
- 로컬 문헌 카탈로그 검증은 `npm run verify:docs`로 통과했다.
- 전경 원문 무결성은 `npm run verify:verses`로 839개 구절 통과했다.
- Hanja 유틸리티 검증은 `npm run verify:hanja`로 통과했다.
- `npm run type-check`는 통과했다.
- `npm run build`는 이 환경에서 5분 제한 내 완료되지 않아 중단했다. 이전 프로젝트 상태 문서에도 Windows 로컬 SWC/페이징 파일 환경에서 빌드가 막힌 이력이 기록되어 있다.

## 향후 보강 후보

- `verse-source-links.json`의 `reviewStatus`를 DB 검수 상태와 병합하는 공통 헬퍼 추가
- 구절별 연결 누락을 줄이기 위한 `matchedText` 정규화 강화
- 로컬 PDF/DOCX 본문 검색용 별도 색인 파일 생성
- 자료별 권리 상태를 `rights_status` 기준으로 `public_link_only`, `local_reference_only`, `approved_excerpt`처럼 세분화
- 대순회보·교화연구·DIC 자료의 수집 시점과 재검증 시점을 별도 필드로 분리
