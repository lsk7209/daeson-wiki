import { NextResponse } from "next/server";
import { disablePushSubscription, getActivePushSubscription } from "@/lib/push-subscriptions";
import { isTursoConfigured } from "@/lib/turso";
import { getDailyVerse, getVersePreview } from "@/lib/verses";
import {
  describePushError,
  isExpiredPushEndpoint,
  PushConfigurationError,
  sendPushNotification,
} from "@/lib/web-push-sender";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  if (!isTursoConfigured()) {
    return NextResponse.json(
      { error: "Turso is not configured." },
      { status: 503 },
    );
  }

  const subscription = await getActivePushSubscription();
  if (!subscription) {
    return NextResponse.json(
      { error: "No active phone subscription." },
      { status: 404 },
    );
  }

  const verse = getDailyVerse();
  const message = verse
    ? {
        title: `테스트 · ${verse.title}`,
        body: getVersePreview(verse.text, 120),
        url: `/verses/${verse.id}`,
        tag: "daeson-test",
      }
    : {
        title: "전경 알림 테스트",
        body: "푸시 알림 연결이 완료되었습니다.",
        url: "/",
        tag: "daeson-test",
      };

  try {
    await sendPushNotification(subscription, message);
    return NextResponse.json({ sent: true });
  } catch (error: unknown) {
    if (isExpiredPushEndpoint(error)) {
      await disablePushSubscription(subscription.endpoint);
    }

    return NextResponse.json(
      { error: describePushError(error) },
      { status: error instanceof PushConfigurationError ? 503 : 502 },
    );
  }
}
