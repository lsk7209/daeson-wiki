import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const bookSlugByName = new Map([
  ["행록", "haengrok"],
  ["공사", "gongsa"],
  ["교운", "gyoun"],
  ["교법", "gyobeop"],
  ["권지", "gwonji"],
  ["제생", "jesaeng"],
  ["예시", "yesi"],
]);

const defaultChapterBooks = new Set(["제생", "예시"]);

const requestHeaders = {
  "User-Agent": "daeson-wiki-private-source-mapper/0.1 (+personal-use)",
  Accept: "text/html, text/plain;q=0.9, */*;q=0.8",
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const [verses, seeds] = await Promise.all([
    readJson(options.verses),
    readJson(options.seeds),
  ]);
  const knownVerseIds = new Set(verses.map((verse) => verse.id));
  const collectedAt = new Date().toISOString();
  const documents = [];
  const linkByKey = new Map();

  for (const [index, seed] of seeds.entries()) {
    if (index > 0) {
      await delay(options.delayMs);
    }

    try {
      const html = await fetchHtml(seed.url);
      const title = cleanText(seed.title ?? extractTitle(html) ?? seed.url);
      const text = htmlToText(html);
      const document = {
        id: seed.id ?? makeDocumentId(seed.url),
        sourceName: seed.sourceName,
        sourceSite: seed.sourceSite ?? new URL(seed.url).hostname,
        sourceType: seed.sourceType ?? "reference",
        ...(seed.category ? { category: seed.category } : {}),
        title,
        url: seed.url,
        fetchedAt: collectedAt,
        copyrightNote: "metadata_snippet_only",
      };
      const directVerseIds = new Set(
        extractVerseReferences(title)
          .map((reference) => reference.verseId)
          .filter((verseId) => knownVerseIds.has(verseId)),
      );
      const references = extractVerseReferences(`${title} ${text}`);

      documents.push(document);

      for (const reference of references) {
        if (!knownVerseIds.has(reference.verseId)) {
          continue;
        }

        const key = `${document.id}:${reference.verseId}`;
        const existing = linkByKey.get(key);
        const relationType = directVerseIds.has(reference.verseId)
          ? "direct_interpretation"
          : "source_reference";
        const confidence =
          relationType === "direct_interpretation"
            ? "official_direct"
            : "official_reference";
        const link = {
          id: `${document.id}-${reference.verseId}`,
          verseId: reference.verseId,
          sourceDocumentId: document.id,
          relationType,
          confidence,
          matchedText: reference.matchedText,
          evidenceSnippet: makeSnippet(reference.fullText, reference.index, reference.matchedText),
          createdAt: collectedAt,
        };

        if (!existing || shouldReplaceLink(existing, link)) {
          linkByKey.set(key, link);
        }
      }

      console.log(`${document.title} -> ${references.length} references scanned`);
    } catch (error) {
      console.warn(`Skipped ${seed.url}: ${error.message}`);
    }
  }

  const links = [...linkByKey.values()].sort(compareLinks);
  documents.sort((a, b) => a.sourceSite.localeCompare(b.sourceSite) || a.title.localeCompare(b.title, "ko"));

  await mkdir(path.dirname(options.documentsOut), { recursive: true });
  await writeJson(options.documentsOut, documents);
  await writeJson(options.linksOut, links);

  console.log(`Saved ${documents.length} source documents.`);
  console.log(`Saved ${links.length} verse source links.`);
}

function parseArgs(args) {
  const options = {
    verses: path.join(process.cwd(), "data", "verses.json"),
    seeds: path.join(process.cwd(), "data", "source-seeds.json"),
    documentsOut: path.join(process.cwd(), "data", "source-documents.json"),
    linksOut: path.join(process.cwd(), "data", "verse-source-links.json"),
    delayMs: 1200,
  };

  for (const arg of args) {
    if (arg.startsWith("--verses=")) {
      options.verses = path.resolve(arg.slice("--verses=".length));
    }

    if (arg.startsWith("--seeds=")) {
      options.seeds = path.resolve(arg.slice("--seeds=".length));
    }

    if (arg.startsWith("--documents-out=")) {
      options.documentsOut = path.resolve(arg.slice("--documents-out=".length));
    }

    if (arg.startsWith("--links-out=")) {
      options.linksOut = path.resolve(arg.slice("--links-out=".length));
    }

    if (arg.startsWith("--delay-ms=")) {
      options.delayMs = Number(arg.slice("--delay-ms=".length));
    }
  }

  if (!Number.isFinite(options.delayMs) || options.delayMs < 500) {
    throw new Error("--delay-ms must be 500 or greater.");
  }

  return options;
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function writeJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function fetchHtml(url) {
  try {
    return await fetchHtmlDirect(url);
  } catch (error) {
    if (url.startsWith("https://")) {
      const fallbackUrl = `http://${url.slice("https://".length)}`;

      try {
        return await fetchHtmlDirect(fallbackUrl);
      } catch {
        throw error;
      }
    }

    throw error;
  }
}

async function fetchHtmlDirect(url) {
  const response = await fetch(url, {
    headers: requestHeaders,
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(`Fetch failed: ${response.status} ${response.statusText}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  return decodeResponse(buffer, response.headers.get("content-type") ?? "");
}

function decodeResponse(buffer, contentType) {
  const sniffText = buffer.toString("latin1", 0, Math.min(buffer.length, 4096));
  const contentTypeCharset = /charset=([^;\s]+)/i.exec(contentType)?.[1];
  const metaCharset =
    /<meta[^>]+charset=["']?\s*([^"'\s/>]+)/i.exec(sniffText)?.[1] ??
    /<meta[^>]+content=["'][^"']*charset=([^"'\s;]+)/i.exec(sniffText)?.[1];
  const charset = normalizeCharset(contentTypeCharset ?? metaCharset ?? "utf-8");

  try {
    return new TextDecoder(charset).decode(buffer);
  } catch {
    return new TextDecoder("utf-8").decode(buffer);
  }
}

function normalizeCharset(charset) {
  const normalized = charset.toLowerCase().replace(/_/g, "-");

  if (
    normalized.includes("euc-kr") ||
    normalized.includes("ks-c-5601") ||
    normalized.includes("windows-949") ||
    normalized.includes("x-windows-949")
  ) {
    return "euc-kr";
  }

  return "utf-8";
}

function extractTitle(html) {
  const ogTitle = extractMetaContent(html, "og:title");

  if (ogTitle) {
    return ogTitle;
  }

  const titleMatch = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  return titleMatch ? cleanText(titleMatch[1]) : undefined;
}

function extractMetaContent(html, targetName) {
  const metaPattern = /<meta\s+[^>]*>/gi;
  let match;

  while ((match = metaPattern.exec(html))) {
    const tag = match[0];
    const name = getAttribute(tag, "property") ?? getAttribute(tag, "name");

    if (name?.toLowerCase() === targetName.toLowerCase()) {
      return getAttribute(tag, "content");
    }
  }

  return undefined;
}

function getAttribute(tag, name) {
  const match = new RegExp(`${name}\\s*=\\s*(["'])([\\s\\S]*?)\\1`, "i").exec(tag);
  return match ? decodeHtml(match[2]) : undefined;
}

function htmlToText(html) {
  return cleanText(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<\/(p|div|li|td|th|tr|h[1-6]|article|section)>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  );
}

function cleanText(value) {
  return decodeHtml(value)
    .replace(/\r/g, " ")
    .replace(/\u00a0/g, " ")
    .replace(/\u3000/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeHtml(value) {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) =>
      String.fromCodePoint(Number.parseInt(code, 16)),
    );
}

function extractVerseReferences(fullText) {
  return [
    ...extractChapterReferences(fullText),
    ...extractCompactReferences(fullText),
    ...extractDefaultChapterReferences(fullText),
  ].sort((a, b) => a.index - b.index);
}

function extractChapterReferences(fullText) {
  const references = [];
  const pattern =
    /(행록|공사|교운|교법|권지|제생|예시)\s*(\d+)\s*장\s*(\d+)\s*(?:[~∼\-–]\s*(\d+))?\s*절/g;
  let match;

  while ((match = pattern.exec(fullText))) {
    const [, book, chapterText, startVerseText, endVerseText] = match;
    const chapter = Number(chapterText);
    const startVerse = Number(startVerseText);
    const endVerse = endVerseText ? Number(endVerseText) : startVerse;

    references.push(
      ...makeRangeReferences({
        fullText,
        index: match.index,
        matchedText: match[0],
        book,
        chapter,
        startVerse,
        endVerse,
      }),
    );
  }

  return references;
}

function extractCompactReferences(fullText) {
  const references = [];
  const pattern = /(행록|공사|교운|교법|권지|제생|예시)\s*(\d+)\s*[-:]\s*(\d+)\b/g;
  let match;

  while ((match = pattern.exec(fullText))) {
    const [, book, chapterText, verseText] = match;

    references.push(
      makeReference({
        fullText,
        index: match.index,
        matchedText: match[0],
        book,
        chapter: Number(chapterText),
        verse: Number(verseText),
      }),
    );
  }

  return references;
}

function extractDefaultChapterReferences(fullText) {
  const references = [];
  const pattern = /(제생|예시)\s*(\d+)\s*(?:[~∼\-–]\s*(\d+))?\s*절/g;
  let match;

  while ((match = pattern.exec(fullText))) {
    const [, book, startVerseText, endVerseText] = match;
    const startVerse = Number(startVerseText);
    const endVerse = endVerseText ? Number(endVerseText) : startVerse;

    references.push(
      ...makeRangeReferences({
        fullText,
        index: match.index,
        matchedText: match[0],
        book,
        chapter: 1,
        startVerse,
        endVerse,
      }),
    );
  }

  return references.filter(({ book }) => defaultChapterBooks.has(book));
}

function makeRangeReferences({
  fullText,
  index,
  matchedText,
  book,
  chapter,
  startVerse,
  endVerse,
}) {
  if (endVerse < startVerse || endVerse - startVerse > 30) {
    return [
      makeReference({
        fullText,
        index,
        matchedText,
        book,
        chapter,
        verse: startVerse,
      }),
    ];
  }

  const references = [];

  for (let verse = startVerse; verse <= endVerse; verse += 1) {
    references.push(
      makeReference({
        fullText,
        index,
        matchedText,
        book,
        chapter,
        verse,
      }),
    );
  }

  return references;
}

function makeReference({ fullText, index, matchedText, book, chapter, verse }) {
  return {
    fullText,
    index,
    matchedText,
    book,
    chapter,
    verse,
    verseId: makeVerseId(book, chapter, verse),
  };
}

function makeVerseId(book, chapter, verse) {
  const slug = bookSlugByName.get(book);

  if (!slug) {
    throw new Error(`Unknown book: ${book}`);
  }

  return `${slug}-${chapter}-${verse}`;
}

function makeSnippet(fullText, index, matchedText) {
  const before = 78;
  const after = 118;
  const start = Math.max(0, index - before);
  const end = Math.min(fullText.length, index + matchedText.length + after);
  const prefix = start > 0 ? "..." : "";
  const suffix = end < fullText.length ? "..." : "";

  return `${prefix}${fullText.slice(start, end).trim()}${suffix}`;
}

function shouldReplaceLink(existing, next) {
  if (
    existing.relationType !== "direct_interpretation" &&
    next.relationType === "direct_interpretation"
  ) {
    return true;
  }

  return next.evidenceSnippet.length < existing.evidenceSnippet.length;
}

function compareLinks(a, b) {
  return (
    a.verseId.localeCompare(b.verseId) ||
    a.sourceDocumentId.localeCompare(b.sourceDocumentId)
  );
}

function makeDocumentId(url) {
  return `source-${createHash("sha1").update(url).digest("hex").slice(0, 12)}`;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
