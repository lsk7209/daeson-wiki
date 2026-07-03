import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const baseUrl = "http://www.daesoon.org";
const bookByCate = new Map([
  [1, "행록"],
  [2, "공사"],
  [3, "교운"],
  [4, "교법"],
  [5, "권지"],
  [6, "제생"],
  [7, "예시"],
]);

const slugByBook = new Map([
  ["행록", "haengrok"],
  ["공사", "gongsa"],
  ["교운", "gyoun"],
  ["교법", "gyobeop"],
  ["권지", "gwonji"],
  ["제생", "jesaeng"],
  ["예시", "yesi"],
]);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (!options.dryRun && !options.confirm) {
    throw new Error(
      "Full scrape requires --confirm. Run scrape:dry-run first and check the official site's robots policy.",
    );
  }

  const robots = await fetchText(`${baseUrl}/robots.txt`);
  console.log("robots.txt checked.");
  if (/User-Agent:\s*\*\s*[\s\S]*?Disallow:\s*\//i.test(robots)) {
    console.log(
      "Notice: daesoon.org disallows generic crawlers. This script uses a low request rate and requires --confirm for a full scrape.",
    );
  }

  const targets = await discoverChapterTargets();
  const selectedTargets = options.maxPages ? targets.slice(0, options.maxPages) : targets;

  console.log(`Discovered ${targets.length} chapter pages.`);

  if (options.dryRun) {
    for (const target of selectedTargets.slice(0, 12)) {
      const book = bookByCate.get(target.cate) ?? "행록";
      console.log(`${book} ${target.chapter}장 -> ${target.url}`);
    }
    return;
  }

  const scrapedAt = new Date().toISOString();
  const verses = [];

  for (const [index, target] of selectedTargets.entries()) {
    await delay(index === 0 ? 0 : options.delayMs);
    const html = await fetchText(target.url);
    const parsed = parseVerses(html, target, scrapedAt);
    verses.push(...parsed);
    console.log(`${target.url} -> ${parsed.length} verses`);
  }

  verses.sort(compareVerses);
  await mkdir(path.dirname(options.out), { recursive: true });
  await writeFile(options.out, `${JSON.stringify(verses, null, 2)}\n`, "utf8");
  console.log(`Saved ${verses.length} verses to ${options.out}`);
}

function parseArgs(args) {
  const options = {
    dryRun: args.includes("--dry-run"),
    confirm: args.includes("--confirm"),
    delayMs: 1500,
    out: path.join(process.cwd(), "data", "verses.json"),
    maxPages: undefined,
  };

  for (const arg of args) {
    if (arg.startsWith("--delay-ms=")) {
      options.delayMs = Number(arg.slice("--delay-ms=".length));
    }

    if (arg.startsWith("--out=")) {
      options.out = path.resolve(arg.slice("--out=".length));
    }

    if (arg.startsWith("--max-pages=")) {
      options.maxPages = Number(arg.slice("--max-pages=".length));
    }
  }

  if (!Number.isFinite(options.delayMs) || options.delayMs < 500) {
    throw new Error("--delay-ms must be 500 or greater.");
  }

  return options;
}

async function discoverChapterTargets() {
  const html = await fetchText(`${baseUrl}/about/bible.book.php?cate=1`);
  const found = new Map();
  const linkPattern = /bible\.book\.php\?cate=(\d+)&jang=(\d+)/g;
  let match;

  while ((match = linkPattern.exec(html))) {
    const cate = Number(match[1]);
    const chapter = Number(match[2]);
    const key = `${cate}:${chapter}`;

    if (!bookByCate.has(cate) || found.has(key)) {
      continue;
    }

    found.set(key, {
      cate,
      chapter,
      url: `${baseUrl}/about/bible.book.php?cate=${cate}&jang=${chapter}`,
    });
  }

  return [...found.values()].sort((a, b) => a.cate - b.cate || a.chapter - b.chapter);
}

function parseVerses(html, target, scrapedAt) {
  const verses = [];
  const itemPattern =
    /<dt>\s*<a\s+name="(\d+)"><\/a>\s*([^<]+?)\s*<\/dt>\s*<dd>\s*([\s\S]*?)\s*<\/dd>/g;
  let match;

  while ((match = itemPattern.exec(html))) {
    const verseNumber = Number(match[1]);
    const sourceTitle = cleanText(match[2]);
    const text = cleanText(match[3]);
    const parsedTitle = parseTitle(sourceTitle, target.chapter);
    const book = parsedTitle.book ?? bookByCate.get(target.cate);

    if (!book) {
      throw new Error(`Unknown cate: ${target.cate}`);
    }

    const chapter = parsedTitle.chapter ?? target.chapter;
    const verse = parsedTitle.verse ?? verseNumber;

    verses.push({
      id: makeVerseId(book, chapter, verse),
      book,
      cate: target.cate,
      chapter,
      verse,
      title: `${book} ${chapter}장 ${verse}절`,
      sourceTitle,
      text,
      sourceUrl: `${target.url}#${verseNumber}`,
      scrapedAt,
    });
  }

  return verses;
}

function parseTitle(title, fallbackChapter) {
  const match = /^(행록|공사|교운|교법|권지|제생|예시)\s+(\d+)장\s+(\d+)절$/.exec(title);

  if (match) {
    return {
      book: match[1],
      chapter: Number(match[2]),
      verse: Number(match[3]),
    };
  }

  const noChapterMatch = /^(행록|공사|교운|교법|권지|제생|예시)\s+(\d+)절$/.exec(title);

  if (noChapterMatch) {
    return {
      book: noChapterMatch[1],
      chapter: fallbackChapter,
      verse: Number(noChapterMatch[2]),
    };
  }

  return {};
}

function makeVerseId(book, chapter, verse) {
  const slug = slugByBook.get(book);
  if (!slug) {
    throw new Error(`Missing slug for ${book}`);
  }

  return `${slug}-${chapter}-${verse}`;
}

function cleanText(html) {
  return decodeHtml(
    html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/\r/g, "")
      .replace(/\u00a0/g, " ")
      .replace(/\u3000/g, " ")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\s+/g, " ")
      .trim(),
  );
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

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "daeson-wiki-private-reader/0.1 (+personal-use)",
      Accept: "text/html, text/plain;q=0.9, */*;q=0.8",
    },
  });

  if (!response.ok) {
    throw new Error(`Fetch failed: ${response.status} ${response.statusText} ${url}`);
  }

  return response.text();
}

function compareVerses(a, b) {
  return a.cate - b.cate || a.chapter - b.chapter || a.verse - b.verse;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
