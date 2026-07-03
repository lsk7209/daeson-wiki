import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const versesPath = path.join(process.cwd(), "data", "verses.json");
const integrityPath = path.join(process.cwd(), "data", "verses.integrity.json");
const shouldWrite = process.argv.includes("--write");

const lockFields = ["id", "book", "cate", "chapter", "verse", "title", "sourceTitle", "text", "sourceUrl"];

const verses = JSON.parse(await readFile(versesPath, "utf8"));

if (!Array.isArray(verses)) {
  throw new Error("data/verses.json must be an array.");
}

const manifest = {
  version: 1,
  description:
    "Locks the official Jeongyeong verse text. Display annotations must be stored separately from data/verses.json text.",
  count: verses.length,
  generatedFrom: "data/verses.json",
  lockedFields: lockFields,
  items: verses.map((verse) => ({
    id: verse.id,
    hash: hashVerse(verse),
  })),
};

if (shouldWrite) {
  await writeFile(integrityPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  console.log(`Wrote ${manifest.count} integrity hashes to ${integrityPath}`);
} else {
  const expected = JSON.parse(await readFile(integrityPath, "utf8"));
  const expectedById = new Map(expected.items.map((item) => [item.id, item.hash]));
  const seen = new Set();
  const failures = [];

  for (const verse of verses) {
    const expectedHash = expectedById.get(verse.id);
    const actualHash = hashVerse(verse);
    seen.add(verse.id);

    if (!expectedHash) {
      failures.push(`${verse.id}: missing from integrity manifest`);
      continue;
    }

    if (expectedHash !== actualHash) {
      failures.push(`${verse.id}: official text or locked metadata changed`);
    }
  }

  for (const item of expected.items) {
    if (!seen.has(item.id)) {
      failures.push(`${item.id}: missing from verses.json`);
    }
  }

  if (expected.count !== verses.length) {
    failures.push(`verse count changed: expected ${expected.count}, got ${verses.length}`);
  }

  if (failures.length > 0) {
    console.error("Verse integrity check failed.");
    for (const failure of failures.slice(0, 20)) {
      console.error(`- ${failure}`);
    }
    if (failures.length > 20) {
      console.error(`...and ${failures.length - 20} more`);
    }
    process.exit(1);
  }

  console.log(`Verse integrity check passed for ${verses.length} verses.`);
}

function hashVerse(verse) {
  const locked = Object.fromEntries(
    lockFields.map((field) => [field, verse[field]]),
  );

  return createHash("sha256")
    .update(JSON.stringify(locked))
    .digest("hex");
}
