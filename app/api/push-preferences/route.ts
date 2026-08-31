import { NextResponse } from "next/server";
import {
  getPushPreferences,
  savePushPreferences,
} from "@/lib/push-preferences";
import { parsePushPreferences } from "@/lib/push-schedule";
import { isTursoConfigured } from "@/lib/turso";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isTursoConfigured()) {
    return unavailable();
  }

  return NextResponse.json(
    { preferences: await getPushPreferences() },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function PUT(request: Request) {
  if (!isTursoConfigured()) {
    return unavailable();
  }

  const preferences = parsePushPreferences(await request.json().catch(() => null));
  if (!preferences) {
    return NextResponse.json(
      { error: "Choose one to three valid slots when notifications are enabled." },
      { status: 400 },
    );
  }

  await savePushPreferences(preferences);
  return NextResponse.json(
    { preferences },
    { headers: { "Cache-Control": "no-store" } },
  );
}

function unavailable() {
  return NextResponse.json(
    { error: "Turso is not configured." },
    { status: 503 },
  );
}
