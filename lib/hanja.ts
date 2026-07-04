export type HanjaAnnotation = {
  id: string;
  hanja: string;
  reading: string;
  meaning: string;
};

const hanjaPattern = /[\u3400-\u9fff\uf900-\ufaff]/;
const parenthesizedHanjaPattern =
  /\(([\u3400-\u9fff\uf900-\ufaff0-9一二三四五六七八九十百千萬億兆零〇○\sㆍ·,，爲]+)\)/g;
const standaloneHanjaNumeralPattern =
  /(?<![\u3400-\u9fff\uf900-\ufaff])([一二三四五六七八九十百千萬億兆零〇○六]+)(?![\u3400-\u9fff\uf900-\ufaff])/g;
const standaloneHanjaPhrasePattern =
  /(?<![\u3400-\u9fff\uf900-\ufaff])([\u3400-\u9fff\uf900-\ufaff]{2,}(?:\s+[\u3400-\u9fff\uf900-\ufaff]{2,})*)(?![\u3400-\u9fff\uf900-\ufaff])/g;

const charGlossary: Record<string, string> = {
  一: "하나",
  二: "둘",
  三: "셋",
  四: "넷",
  五: "다섯",
  六: "여섯",
  六: "여섯",
  七: "일곱",
  八: "여덟",
  九: "아홉",
  十: "열",
  百: "백",
  千: "천",
  萬: "만",
  億: "억",
  天: "하늘",
  地: "땅",
  人: "사람",
  神: "신령",
  道: "도리",
  大: "큰",
  中: "가운데",
  國: "나라",
  山: "산",
  水: "물",
  日: "날",
  月: "달",
  年: "해",
  生: "날",
  氏: "씨",
  姓: "성",
  始: "비롯할",
  祖: "조상",
  農: "농사",
  古: "옛",
  阜: "언덕",
  仙: "신선",
  方: "모",
  丈: "어른",
  望: "바랄",
  帝: "임금",
  峰: "봉우리",
  村: "마을",
  谷: "골짜기",
  洞: "골",
  德: "덕",
  川: "내",
  里: "마을",
  新: "새",
  文: "글",
  會: "모일",
  興: "일어날",
  周: "두루",
  化: "될",
  朝: "아침",
  高: "높을",
  宗: "마루",
  玉: "구슬",
  士: "선비",
  辛: "매울",
  未: "아닐",
  東: "동녘",
  西: "서녘",
  南: "남녘",
  北: "북녘",
  上: "위",
  下: "아래",
  前: "앞",
  後: "뒤",
  心: "마음",
  精: "정할",
  氣: "기운",
  明: "밝을",
  陰: "그늘",
  陽: "볕",
  相: "서로",
  書: "글",
  體: "몸",
  符: "부적",
  圖: "그림",
  省: "덜",
  略: "간략할",
  呪: "빌",
  學: "배울",
  公: "공평할",
  太: "클",
  子: "아들",
  聖: "성스러울",
  長: "길",
  王: "임금",
  京: "서울",
  全: "온전할",
  羅: "벌일",
  郡: "고을",
  面: "낯",
  步: "걸음",
  拾: "주울",
  金: "쇠",
  剛: "굳셀",
  景: "경치",
  靑: "푸를",
  皆: "다",
  骨: "뼈",
  餘: "남을",
  其: "그",
  騎: "말탈",
  驢: "나귀",
  客: "나그네",
  無: "없을",
  但: "다만",
  躊: "머뭇거릴",
  躇: "머뭇거릴",
};

const knownHanjaTerms: Record<
  string,
  {
    reading: string;
    meaning: string;
  }
> = {
  步拾金剛景: {
    reading: "보습금강경",
    meaning: "금강산의 경치를 걸음마다 주워 담는다는 뜻의 한문 구절입니다.",
  },
  靑山皆骨餘: {
    reading: "청산개골여",
    meaning: "푸른 산은 모두 뼈대만 남은 듯하다는 뜻의 한문 구절입니다.",
  },
  其後騎驢客: {
    reading: "기후기려객",
    meaning: "그 뒤의 나귀 탄 나그네를 가리키는 한문 구절입니다.",
  },
  無興但躊躇: {
    reading: "무흥단주저",
    meaning: "흥취 없이 다만 머뭇거린다는 뜻의 한문 구절입니다.",
  },
};

const numeralValues: Record<string, number> = {
  零: 0,
  〇: 0,
  "○": 0,
  一: 1,
  二: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  六: 6,
  七: 7,
  八: 8,
  九: 9,
};

const unitValues: Record<string, number> = {
  十: 10,
  百: 100,
  千: 1000,
  萬: 10000,
  億: 100000000,
  兆: 1000000000000,
};

const sinoDigits = ["영", "일", "이", "삼", "사", "오", "육", "칠", "팔", "구"];

export function hasHanja(text: string) {
  return hanjaPattern.test(text);
}

export function getHanjaReadingText(text: string) {
  return text
    .replace(parenthesizedHanjaPattern, "")
    .replace(standaloneHanjaNumeralPattern, (value) => {
      const number = parseHanjaNumber(value);
      return number === null ? value : toSinoKoreanNumber(number);
    })
    .replace(standaloneHanjaPhrasePattern, (value) => {
      const number = parseHanjaNumber(value);
      return number === null
        ? value
            .split(/\s+/)
            .filter(Boolean)
            .map((part) => {
              const knownTerm = knownHanjaTerms[normalizeHanjaTerm(part)];
              return knownTerm?.reading ?? `[독음 검수 필요: ${part}]`;
            })
            .join(" ")
        : toSinoKoreanNumber(number);
    })
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function getHanjaAnnotations(text: string): HanjaAnnotation[] {
  const annotations = new Map<string, HanjaAnnotation>();

  for (const match of text.matchAll(parenthesizedHanjaPattern)) {
    const hanja = normalizeHanjaTerm(match[1]);
    if (!hanja || annotations.has(hanja)) {
      continue;
    }

    const reading = inferReadingBefore(text, match.index ?? 0, hanja);
    annotations.set(hanja, buildAnnotation(hanja, reading));
  }

  for (const match of text.matchAll(standaloneHanjaNumeralPattern)) {
    const hanja = normalizeHanjaTerm(match[1]);
    if (!hanja || annotations.has(hanja)) {
      continue;
    }

    const number = parseHanjaNumber(hanja);
    annotations.set(
      hanja,
      buildAnnotation(hanja, number === null ? "" : toSinoKoreanNumber(number)),
    );
  }

  const textWithoutParenthetical = text.replace(parenthesizedHanjaPattern, "");

  for (const match of textWithoutParenthetical.matchAll(standaloneHanjaPhrasePattern)) {
    for (const part of match[1].split(/\s+/).filter(Boolean)) {
      const hanja = normalizeHanjaTerm(part);
      if (!hanja || annotations.has(hanja)) {
        continue;
      }

      annotations.set(hanja, buildAnnotation(hanja, knownHanjaTerms[hanja]?.reading ?? ""));
    }
  }

  return Array.from(annotations.values());
}

function buildAnnotation(hanja: string, reading: string): HanjaAnnotation {
  const knownTerm = knownHanjaTerms[hanja];
  if (knownTerm) {
    return {
      id: hanja,
      hanja,
      reading: knownTerm.reading,
      meaning: knownTerm.meaning,
    };
  }

  const charMeanings = Array.from(hanja)
    .map((char) => {
      const meaning = charGlossary[char];
      return meaning ? `${char}: ${meaning}` : null;
    })
    .filter((item): item is string => Boolean(item));
  const meaning =
    charMeanings.length > 0
      ? charMeanings.join(", ")
      : reading
        ? `원문에서 "${reading}"로 읽는 표현입니다.`
        : "개별 뜻 검수가 필요한 한자 표현입니다.";

  return {
    id: hanja,
    hanja,
    reading: reading || "독음 검수 필요",
    meaning,
  };
}

function inferReadingBefore(text: string, matchIndex: number, hanja: string) {
  const prefix = text.slice(0, matchIndex);
  const immediateReading = prefix.match(/([\uac00-\ud7a30-9ㆍ·]+)\s*$/)?.[1];

  if (immediateReading) {
    return prefixCommonReading(hanja, immediateReading.replace(/^[ㆍ·]+/, ""));
  }

  const sentenceStart = Math.max(
    prefix.lastIndexOf("."),
    prefix.lastIndexOf("。"),
    prefix.lastIndexOf("“"),
    prefix.lastIndexOf("”"),
    prefix.lastIndexOf(","),
    prefix.lastIndexOf("，"),
  );
  const candidate = prefix
    .slice(sentenceStart + 1)
    .replace(/[^\uac00-\ud7a30-9\sㆍ·]+/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  if (candidate) {
    return prefixCommonReading(hanja, trimReadingCandidate(candidate));
  }

  const number = parseHanjaNumber(hanja);
  return number === null ? "" : toSinoKoreanNumber(number);
}

function prefixCommonReading(hanja: string, reading: string) {
  if (hanja.startsWith("一名") && !reading.startsWith("일명")) {
    return `일명 ${reading}`;
  }

  return reading;
}

function trimReadingCandidate(value: string) {
  const parts = value.split(/\s+/).filter(Boolean);

  if (parts.length <= 3) {
    return value;
  }

  return parts.slice(-3).join(" ");
}

function normalizeHanjaTerm(value: string) {
  return value.replace(/\s+/g, "").replace(/[，,]/g, "ㆍ").trim();
}

function parseHanjaNumber(value: string) {
  if (!/^[一二三四五六七八九十百千萬億兆零〇○六]+$/.test(value)) {
    return null;
  }

  let total = 0;
  let section = 0;
  let current = 0;

  for (const char of value) {
    if (char in numeralValues) {
      current = numeralValues[char];
      continue;
    }

    const unit = unitValues[char];

    if (!unit) {
      return null;
    }

    if (unit >= 10000) {
      section = (section + (current || 0)) || 1;
      total += section * unit;
      section = 0;
    } else {
      section += (current || 1) * unit;
    }

    current = 0;
  }

  return total + section + current;
}

function toSinoKoreanNumber(value: number) {
  if (value === 0) {
    return sinoDigits[0];
  }

  const parts: string[] = [];
  const units = [
    { value: 1000000000000, label: "조" },
    { value: 100000000, label: "억" },
    { value: 10000, label: "만" },
    { value: 1000, label: "천" },
    { value: 100, label: "백" },
    { value: 10, label: "십" },
  ];
  let rest = value;

  for (const unit of units) {
    const count = Math.floor(rest / unit.value);

    if (count > 0) {
      parts.push(`${count === 1 ? "" : toSinoKoreanNumber(count)}${unit.label}`);
      rest %= unit.value;
    }
  }

  if (rest > 0) {
    parts.push(sinoDigits[rest]);
  }

  return parts.join("");
}
