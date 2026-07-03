import sourceDocumentsRaw from "@/data/source-documents.json";
import verseSourceLinksRaw from "@/data/verse-source-links.json";
import type {
  SourceDocument,
  VerseSourceLink,
  VerseSourceLinkWithDocument,
} from "@/lib/source-types";

const sourceDocuments = sourceDocumentsRaw as SourceDocument[];
const verseSourceLinks = verseSourceLinksRaw as VerseSourceLink[];

const documentById = new Map(
  sourceDocuments.map((document) => [document.id, document]),
);

const linksByVerse = buildLinksByVerse();

export function getSourceLinksForVerse(
  verseId: string,
): VerseSourceLinkWithDocument[] {
  return linksByVerse.get(verseId) ?? [];
}

export function getSourceDocumentById(id: string) {
  return documentById.get(id);
}

function buildLinksByVerse() {
  const nextLinks = new Map<string, VerseSourceLinkWithDocument[]>();

  for (const link of verseSourceLinks) {
    const document = documentById.get(link.sourceDocumentId);

    if (!document) {
      continue;
    }

    const links = nextLinks.get(link.verseId) ?? [];
    links.push({ ...link, document });
    nextLinks.set(link.verseId, links);
  }

  for (const links of nextLinks.values()) {
    links.sort(compareSourceLinks);
  }

  return nextLinks;
}

function compareSourceLinks(
  a: VerseSourceLinkWithDocument,
  b: VerseSourceLinkWithDocument,
) {
  return (
    relationRank(a.relationType) - relationRank(b.relationType) ||
    a.document.sourceName.localeCompare(b.document.sourceName, "ko") ||
    a.document.title.localeCompare(b.document.title, "ko")
  );
}

function relationRank(relationType: VerseSourceLink["relationType"]) {
  if (relationType === "direct_interpretation") {
    return 0;
  }

  if (relationType === "term_gloss") {
    return 1;
  }

  return 2;
}
