import { readFile } from "node:fs/promises";
import path from "node:path";

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const [verses, documents, links] = await Promise.all([
    readJson(path.join(process.cwd(), "data", "verses.json")),
    readJson(path.join(process.cwd(), "data", "source-documents.json")),
    readJson(path.join(process.cwd(), "data", "verse-source-links.json")),
  ]);
  const verseIds = new Set(verses.map((verse) => verse.id));
  const documentIds = new Set(documents.map((document) => document.id));
  const linkIds = new Set();
  const errors = [];

  for (const link of links) {
    if (linkIds.has(link.id)) {
      errors.push(`Duplicate source link id: ${link.id}`);
    }

    linkIds.add(link.id);

    if (!verseIds.has(link.verseId)) {
      errors.push(`Missing verse for link ${link.id}: ${link.verseId}`);
    }

    if (!documentIds.has(link.sourceDocumentId)) {
      errors.push(`Missing document for link ${link.id}: ${link.sourceDocumentId}`);
    }

    if (!["auto", "reviewed", "rejected"].includes(link.reviewStatus)) {
      errors.push(`Invalid reviewStatus for link ${link.id}: ${link.reviewStatus}`);
    }
  }

  if (errors.length > 0) {
    throw new Error(errors.join("\n"));
  }

  console.log(
    `Source link check passed for ${documents.length} documents and ${links.length} links.`,
  );
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}
