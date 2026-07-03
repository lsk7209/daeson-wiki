import { NextResponse } from "next/server";
import { isTursoConfigured } from "@/lib/turso";
import { getVerseNote, upsertVerseNote } from "@/lib/verse-notes";
import { getVerseById } from "@/lib/verses";

type NoteRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: NoteRouteContext) {
  const { id } = await context.params;

  if (!getVerseById(id)) {
    return NextResponse.json({ error: "Verse not found." }, { status: 404 });
  }

  if (!isTursoConfigured()) {
    return NextResponse.json(
      {
        note: null,
        storage: "local",
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }

  const note = await getVerseNote(id);

  return NextResponse.json(
    {
      note,
      storage: "turso",
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

export async function PUT(request: Request, context: NoteRouteContext) {
  const { id } = await context.params;

  if (!getVerseById(id)) {
    return NextResponse.json({ error: "Verse not found." }, { status: 404 });
  }

  if (!isTursoConfigured()) {
    return NextResponse.json(
      { error: "Turso is not configured." },
      { status: 503 },
    );
  }

  const body = await request.json().catch(() => null);
  const commentary = typeof body?.commentary === "string" ? body.commentary : "";
  const doodle = typeof body?.doodle === "string" ? body.doodle : "";
  const note = await upsertVerseNote(id, {
    commentary: commentary.slice(0, 50_000),
    doodle: doodle.slice(0, 50_000),
  });

  return NextResponse.json(
    {
      note,
      storage: "turso",
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
