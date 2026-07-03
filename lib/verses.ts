import versesRaw from "@/data/verses.json";
import type { JeongyeongBook, JeongyeongVerse } from "@/lib/verse-types";

export const bookOrder = [
  "행록",
  "공사",
  "교운",
  "교법",
  "권지",
  "제생",
  "예시",
] as const satisfies readonly JeongyeongBook[];

export const bookSlugByName = {
  행록: "haengrok",
  공사: "gongsa",
  교운: "gyoun",
  교법: "gyobeop",
  권지: "gwonji",
  제생: "jesaeng",
  예시: "yesi",
} as const satisfies Record<JeongyeongBook, string>;

const bookBySlug = new Map<string, JeongyeongBook>(
  Object.entries(bookSlugByName).map(([book, slug]) => [
    slug,
    book as JeongyeongBook,
  ]),
);

const verses = [...(versesRaw as JeongyeongVerse[])].sort(compareVerses);
const verseById = new Map(verses.map((verse) => [verse.id, verse]));
const verseIndexById = new Map(
  verses.map((verse, index) => [verse.id, index]),
);
const groups = buildBookGroups();
const summaries = buildBookSummaries();

export function getAllVerses() {
  return verses;
}

export function getVerseById(id: string) {
  return verseById.get(id);
}

export function getAdjacentVerses(id: string) {
  const index = verseIndexById.get(id);

  return {
    previous: index !== undefined && index > 0 ? verses[index - 1] : undefined,
    next:
      index !== undefined && index < verses.length - 1
        ? verses[index + 1]
        : undefined,
  };
}

export function getDailyVerse(date = new Date()) {
  if (verses.length === 0) {
    return undefined;
  }

  const { year, month, day } = getKoreaDateParts(date);
  const utcDay = Date.UTC(year, month - 1, day);
  const baseDay = Date.UTC(2026, 0, 1);
  const dayOffset = Math.floor((utcDay - baseDay) / 86_400_000);
  const index = modulo(dayOffset, verses.length);

  return verses[index];
}

export function getVersePreview(text: string, length = 96) {
  if (text.length <= length) {
    return text;
  }

  return `${text.slice(0, length).trim()}...`;
}

export function getBookGroups() {
  return groups;
}

export function getBookSummaries() {
  return summaries;
}

export function getBookBySlug(slug: string) {
  return bookBySlug.get(slug);
}

export function getBookSlug(book: JeongyeongBook) {
  return bookSlugByName[book];
}

export function getVersesByBook(book: JeongyeongBook) {
  const chapters = groups.get(book);

  if (!chapters) {
    return [];
  }

  return Array.from(chapters.values()).flat();
}

export function getBookChapterEntries(book: JeongyeongBook) {
  return Array.from(groups.get(book)?.entries() ?? []);
}

function buildBookGroups() {
  const nextGroups = new Map<
    JeongyeongBook,
    Map<number, JeongyeongVerse[]>
  >();

  for (const book of bookOrder) {
    nextGroups.set(book, new Map());
  }

  for (const verse of verses) {
    const chapters = nextGroups.get(verse.book) ?? new Map<number, JeongyeongVerse[]>();
    const chapter = chapters.get(verse.chapter) ?? [];
    chapter.push(verse);
    chapters.set(verse.chapter, chapter);
    nextGroups.set(verse.book, chapters);
  }

  return nextGroups;
}

function buildBookSummaries() {
  return bookOrder.map((book) => {
    const chapters = groups.get(book) ?? new Map<number, JeongyeongVerse[]>();
    const chapterEntries = Array.from(chapters.entries());
    const firstVerse = chapterEntries.at(0)?.[1].at(0);
    const lastChapter = chapterEntries.at(-1)?.[1];
    const lastVerse = lastChapter?.at(-1);
    const verseCount = chapterEntries.reduce(
      (sum, [, chapterVerses]) => sum + chapterVerses.length,
      0,
    );

    return {
      book,
      slug: getBookSlug(book),
      chapterCount: chapterEntries.length,
      verseCount,
      firstVerse,
      lastVerse,
    };
  });
}

function compareVerses(a: JeongyeongVerse, b: JeongyeongVerse) {
  return (
    bookOrder.indexOf(a.book) - bookOrder.indexOf(b.book) ||
    a.chapter - b.chapter ||
    a.verse - b.verse
  );
}

function getKoreaDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const read = (type: "year" | "month" | "day") => {
    const value = parts.find((part) => part.type === type)?.value;
    if (!value) {
      throw new Error(`Missing ${type} in formatted date.`);
    }

    return Number(value);
  };

  return {
    year: read("year"),
    month: read("month"),
    day: read("day"),
  };
}

function modulo(value: number, divisor: number) {
  return ((value % divisor) + divisor) % divisor;
}
