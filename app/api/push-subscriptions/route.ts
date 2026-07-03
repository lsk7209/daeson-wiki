import { NextResponse } from "next/server";
import {
  disablePushSubscription,
  isPushSubscriptionPayload,
  upsertPushSubscription,
} from "@/lib/push-subscriptions";
import { isTursoConfigured } from "@/lib/turso";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isTursoConfigured()) {
    return NextResponse.json(
      { error: "Turso is not configured." },
      { status: 503 },
    );
  }

  const body = await request.json().catch(() => null);

  if (!isPushSubscriptionPayload(body)) {
    return NextResponse.json(
      { error: "Invalid push subscription." },
      { status: 400 },
    );
  }

  const subscription = await upsertPushSubscription(body);

  return NextResponse.json(
    {
      subscription,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

export async function DELETE(request: Request) {
  if (!isTursoConfigured()) {
    return NextResponse.json(
      { error: "Turso is not configured." },
      { status: 503 },
    );
  }

  const body = await request.json().catch(() => null);
  const endpoint = typeof body?.endpoint === "string" ? body.endpoint : "";

  if (!endpoint) {
    return NextResponse.json(
      { error: "Missing endpoint." },
      { status: 400 },
    );
  }

  await disablePushSubscription(endpoint);

  return NextResponse.json(
    {
      disabled: true,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
