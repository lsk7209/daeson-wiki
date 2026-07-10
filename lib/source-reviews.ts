import { getTursoClient, isTursoConfigured } from "@/lib/turso";
import type { VerseSourceLink } from "@/lib/source-types";

export type SourceReviewStatus = VerseSourceLink["reviewStatus"];

export type SourceLinkReview = {
  sourceLinkId: string;
  reviewStatus: SourceReviewStatus;
  note: string;
  createdAt: string;
  updatedAt: string;
};

type SourceLinkReviewRow = {
  source_link_id: string;
  review_status: SourceReviewStatus;
  note: string;
  created_at: string;
  updated_at: string;
};

export function isSourceReviewStatus(value: unknown): value is SourceReviewStatus {
  return value === "auto" || value === "reviewed" || value === "rejected";
}

export function applySourceLinkReviews<
  T extends Pick<VerseSourceLink, "id" | "reviewStatus">,
>(links: T[], reviewMap: Map<string, SourceLinkReview>) {
  return links.map((sourceLink) => {
    const savedReview = reviewMap.get(sourceLink.id);

    return {
      ...sourceLink,
      reviewStatus: savedReview?.reviewStatus ?? sourceLink.reviewStatus,
      reviewNote: savedReview?.note ?? "",
    };
  });
}

export async function getAllSourceLinkReviewMap() {
  const reviews = new Map<string, SourceLinkReview>();

  if (!isTursoConfigured()) {
    return reviews;
  }

  const result = await getTursoClient().execute(`
    select source_link_id, review_status, note, created_at, updated_at
    from source_link_reviews
  `);

  for (const row of result.rows as unknown as SourceLinkReviewRow[]) {
    if (!isSourceReviewStatus(row.review_status)) {
      continue;
    }

    reviews.set(row.source_link_id, mapSourceLinkReview(row));
  }

  return reviews;
}

export async function getSourceLinkReview(sourceLinkId: string) {
  if (!isTursoConfigured()) {
    return null;
  }

  const result = await getTursoClient().execute({
    sql: `
      select source_link_id, review_status, note, created_at, updated_at
      from source_link_reviews
      where source_link_id = ?
      limit 1
    `,
    args: [sourceLinkId],
  });

  const row = result.rows.at(0) as unknown as SourceLinkReviewRow | undefined;

  return row && isSourceReviewStatus(row.review_status)
    ? mapSourceLinkReview(row)
    : null;
}

export async function upsertSourceLinkReview(input: {
  sourceLinkId: string;
  reviewStatus: SourceReviewStatus;
  note: string;
}) {
  const now = new Date().toISOString();

  await getTursoClient().execute({
    sql: `
      insert into source_link_reviews (
        source_link_id,
        review_status,
        note,
        created_at,
        updated_at
      )
      values (?, ?, ?, ?, ?)
      on conflict (source_link_id) do update set
        review_status = excluded.review_status,
        note = excluded.note,
        updated_at = excluded.updated_at
    `,
    args: [
      input.sourceLinkId,
      input.reviewStatus,
      input.note,
      now,
      now,
    ],
  });

  return getSourceLinkReview(input.sourceLinkId);
}

function mapSourceLinkReview(row: SourceLinkReviewRow): SourceLinkReview {
  return {
    sourceLinkId: row.source_link_id,
    reviewStatus: row.review_status,
    note: row.note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
