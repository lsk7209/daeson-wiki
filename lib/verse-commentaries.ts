import verseCommentariesRaw from "@/data/verse-commentaries.json";

export type VerseCommentaryItem = {
  term: string;
  description: string;
};

export type VerseCommentary = {
  verseId: string;
  title: string;
  summary: string;
  items: VerseCommentaryItem[];
};

const verseCommentaries = verseCommentariesRaw as VerseCommentary[];
const commentaryByVerseId = new Map(
  verseCommentaries.map((commentary) => [commentary.verseId, commentary]),
);

export function getVerseCommentary(verseId: string) {
  return commentaryByVerseId.get(verseId);
}
