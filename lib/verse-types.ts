export type JeongyeongBook =
  | "행록"
  | "공사"
  | "교운"
  | "교법"
  | "권지"
  | "제생"
  | "예시";

export type JeongyeongVerse = {
  id: string;
  book: JeongyeongBook;
  cate: number;
  chapter: number;
  verse: number;
  title: string;
  sourceTitle: string;
  text: string;
  sourceUrl: string;
  scrapedAt: string;
};

export type VerseListItem = Pick<
  JeongyeongVerse,
  "id" | "book" | "chapter" | "verse" | "title" | "text"
>;
