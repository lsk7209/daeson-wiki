export type SourceRelationType =
  | "direct_interpretation"
  | "source_reference"
  | "term_gloss"
  | "person_context"
  | "place_context"
  | "event_context"
  | "gongsa_context"
  | "cross_reference";

export type SourceConfidence =
  | "official_direct"
  | "official_reference"
  | "official_term"
  | "inferred_phrase"
  | "manual_confirmed";

export type SourceDocument = {
  id: string;
  sourceName: string;
  sourceSite: string;
  sourceType: string;
  category?: string;
  title: string;
  url: string;
  fetchedAt: string;
  copyrightNote: "metadata_snippet_only";
};

export type VerseSourceLink = {
  id: string;
  verseId: string;
  sourceDocumentId: string;
  relationType: SourceRelationType;
  confidence: SourceConfidence;
  matchedText: string;
  evidenceSnippet: string;
  createdAt: string;
};

export type VerseSourceLinkWithDocument = VerseSourceLink & {
  document: SourceDocument;
};
