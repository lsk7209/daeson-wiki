import { NextResponse } from "next/server";
import { getDailyVerse, getVersePreview } from "@/lib/verses";

export const dynamic = "force-dynamic";

export function GET() {
  const verse = getDailyVerse();

  return NextResponse.json(
    {
      date: new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Seoul",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date()),
      verse: verse
        ? {
            id: verse.id,
            title: verse.title,
            preview: getVersePreview(verse.text, 140),
            url: `/verses/${verse.id}`,
          }
        : null,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
