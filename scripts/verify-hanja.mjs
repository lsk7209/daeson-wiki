import assert from "node:assert/strict";

const { getHanjaAnnotations, getHanjaReadingText, hasHanja } = await import(
  "../lib/hanja.ts"
);

const sample =
  "또 어느 때 상제께서 종도들에게 步拾金剛景 靑山皆骨餘 其後騎驢客 無興但躊躇 를 외워 주시니라.";

assert.equal(hasHanja(sample), true);

const readingText = getHanjaReadingText(sample);
assert.ok(
  readingText.includes("보습금강경 청산개골여 기후기려객 무흥단주저"),
  readingText,
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
