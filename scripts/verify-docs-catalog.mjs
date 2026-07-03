import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

const catalogPath = path.join(process.cwd(), "docs", "catalog.json");
const reviewPath = path.join(process.cwd(), "docs", "content-review.json");

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const catalog = await readJson(catalogPath);
  const reviews = await readJson(reviewPath);
  const reviewIds = new Set(reviews.map((review) => review.id));
  const ids = new Set();
  const errors = [];

  for (const item of catalog) {
    if (ids.has(item.id)) {
      errors.push(`Duplicate catalog id: ${item.id}`);
    }

    ids.add(item.id);

    if (!reviewIds.has(item.id)) {
      errors.push(`Missing content review: ${item.id}`);
    }

    const filePath = path.resolve(item.file_path);
    const hash = await sha256(filePath).catch(() => undefined);

    if (!hash) {
      errors.push(`Missing document file: ${item.file_path}`);
    } else if (hash !== item.sha256) {
      errors.push(`Hash mismatch: ${item.file_path}`);
    }
  }

  if (errors.length > 0) {
    throw new Error(errors.join("\n"));
  }

  console.log(`Docs catalog check passed for ${catalog.length} entries.`);
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function sha256(filePath) {
  const buffer = await readFile(filePath);
  return createHash("sha256").update(buffer).digest("hex");
}
