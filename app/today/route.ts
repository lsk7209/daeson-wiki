import { NextResponse } from "next/server";
import { getDailyVerse } from "@/lib/verses";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const verse = getDailyVerse();
  const url = new URL(verse ? `/verses/${verse.id}` : "/", request.url);

  return NextResponse.redirect(url);
}
