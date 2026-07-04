import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const {
  getHanjaAnnotations,
  getHanjaReadingText,
  getOriginalHanjaText,
  hasHanja,
  shouldUseLongHanjaMode,
} = await import("../lib/hanja.ts");

const sample =
  "또 어느 때 상제께서 종도들에게 步拾金剛景 靑山皆骨餘 其後騎驢客 無興但躊躇 를 외워 주시니라.";

assert.equal(hasHanja(sample), true);

const readingText = getHanjaReadingText(sample);
assert.ok(
  readingText.includes("보습금강경 청산개골여 기후기려객 무흥단주저"),
  readingText,
);
assert.equal(
  getOriginalHanjaText(sample),
  "步拾金剛景 靑山皆骨餘 其後騎驢客 無興但躊躇",
);

const annotations = getHanjaAnnotations(sample);
const expected = [
  ["步拾金剛景", "보습금강경", "금강산의 경치를 걸음마다 주워 담는다"],
  ["靑山皆骨餘", "청산개골여", "푸른 산은 모두 뼈대만 남은 듯하다"],
  ["其後騎驢客", "기후기려객", "그 뒤의 나귀 탄 나그네를 가리킨다"],
  ["無興但躊躇", "무흥단주저", "흥취 없이 다만 머뭇거린다"],
];

for (const [hanja, reading, meaning] of expected) {
  const annotation = annotations.find((item) => item.hanja === hanja);
  assert.ok(annotation, `${hanja} annotation is missing.`);
  assert.equal(annotation.reading, reading);
  assert.equal(annotation.meaning, meaning);
}

console.log(`Hanja check passed for ${expected.length} standalone terms.`);

const parenthetical = getHanjaAnnotations("정유(丁酉)에 기록되었다.");
assert.deepEqual(
  parenthetical.map((item) => ({
    hanja: item.hanja,
    reading: item.reading,
    meaning: item.meaning,
  })),
  [
    {
      hanja: "丁酉",
      reading: "정유",
      meaning: "정유년을 나타내는 간지입니다.",
    },
  ],
);

console.log("Parenthetical hanja check passed.");

const verses = JSON.parse(readFileSync("data/verses.json", "utf8"));
const findVerse = (id) => {
  const verse = verses.find((item) => item.id === id);
  assert.ok(verse, `${id} is missing.`);
  return verse;
};

const shortHanjaAnnotations = getHanjaAnnotations(findVerse("haengrok-2-1").text);
assert.equal(shouldUseLongHanjaMode(shortHanjaAnnotations), false);
assert.equal(
  getOriginalHanjaText(findVerse("haengrok-2-1").text),
  "丁酉 鄭南基 永學 亨烈 贊文 儒佛仙陰陽讖緯",
);
assert.deepEqual(
  shortHanjaAnnotations.map((item) => item.hanja),
  ["丁酉", "鄭南基", "永學", "亨烈", "贊文", "儒佛仙陰陽讖緯"],
);
assert.ok(
  shortHanjaAnnotations.some(
    (item) =>
      item.hanja === "儒佛仙陰陽讖緯" &&
      item.reading === "유불선음양참위" &&
      item.meaning.includes("유교, 불교, 선도"),
  ),
);

for (const id of ["gyoun-2-33", "gyoun-2-41"]) {
  const annotations = getHanjaAnnotations(findVerse(id).text);
  assert.equal(shouldUseLongHanjaMode(annotations), true, `${id} should use long mode.`);
}

assert.ok(
  getOriginalHanjaText(findVerse("gyoun-2-33").text).startsWith("覺 道 文"),
);
assert.ok(
  getOriginalHanjaText(findVerse("gyoun-2-41").text).startsWith("布 喩 文"),
);

console.log("Long hanja mode check passed for 포유문 and 각도문.");
