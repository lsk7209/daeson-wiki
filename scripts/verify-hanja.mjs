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
  ["步拾金剛景", "보습금강경"],
  ["靑山皆骨餘", "청산개골여"],
  ["其後騎驢客", "기후기려객"],
  ["無興但躊躇", "무흥단주저"],
];

for (const [hanja, reading] of expected) {
  const annotation = annotations.find((item) => item.hanja === hanja);
  assert.ok(annotation, `${hanja} annotation is missing.`);
  assert.equal(annotation.reading, reading);
  assert.notEqual(annotation.meaning, "개별 뜻 검수가 필요한 한자 표현입니다.");
}

console.log(`Hanja check passed for ${expected.length} standalone terms.`);
