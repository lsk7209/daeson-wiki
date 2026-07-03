import { NextResponse } from "next/server";
import { getSourceLinkById } from "@/lib/source-links";
import {
  getSourceLinkReview,
  isSourceReviewStatus,
  upsertSourceLinkReview,
} from "@/lib/source-reviews";
import { isTursoConfigured } from "@/lib/turso";

type SourceReviewRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: SourceReviewRouteContext) {
  const { id } = await context.params;

  if (!getSourceLinkById(id)) {
    return NextResponse.json({ error: "Source link not found." }, { status: 404 });
  }

  if (!isTursoConfigured()) {
    return NextResponse.json(
      {
        review: null,
        storage: "local",
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }

  const review = await getSourceLinkReview(id);

  return NextResponse.json(
    {
      review,
      storage: "turso",
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

export async function PUT(request: Request, context: SourceReviewRouteContext) {
  const { id } = await context.params;

  if (!getSourceLinkById(id)) {
    return NextResponse.json({ error: "Source link not found." }, { status: 404 });
  }

  if (!isTursoConfigured()) {
    return NextResponse.json(
      { error: "Turso is not configured." },
      { status: 503 },
    );
  }

  const body = await request.json().catch(() => null);
  const reviewStatus = body?.reviewStatus;

  if (!isSourceReviewStatus(reviewStatus)) {
    return NextResponse.json(
      { error: "Invalid review status." },
      { status: 400 },
    );
  }

  const note = typeof body?.note === "string" ? body.note.slice(0, 20_000) : "";
  const review = await upsertSourceLinkReview({
    sourceLinkId: id,
    reviewStatus,
    note,
  });

  return NextResponse.json(
    {
      review,
      storage: "turso",
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
