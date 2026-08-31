import { NextResponse } from "next/server";
import { finishDailyDelivery, claimDailyDelivery } from "@/lib/push-deliveries";
import { getPushPreferences } from "@/lib/push-preferences";
import {
  getActivePushSubscription,
  disablePushSubscription,
} from "@/lib/push-subscriptions";
import {
  getDailyChannel,
  getKoreaDateKey,
  getPushSlot,
  isPushSlotId,
  isSlotEnabled,
} from "@/lib/push-schedule";
import { matchesBearerAuthorization } from "@/lib/request-auth";
import { isTursoConfigured } from "@/lib/turso";
import { getDailyVerseWithOffset, getVersePreview } from "@/lib/verses";
import {
  describePushError,
  isExpiredPushEndpoint,
  PushConfigurationError,
  sendPushNotification,
} from "@/lib/web-push-sender";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ slot: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return response({ error: "Cron authentication is not configured." }, 503);
  }

  if (!matchesBearerAuthorization(request.headers.get("authorization"), cronSecret)) {
    return response({ error: "Unauthorized." }, 401);
  }

  if (!isTursoConfigured()) {
    return response({ error: "Turso is not configured." }, 503);
  }

  const { slot: rawSlot } = await context.params;
  if (!isPushSlotId(rawSlot)) {
    return response({ error: "Unknown notification slot." }, 404);
  }

  const preferences = await getPushPreferences();
  if (!isSlotEnabled(preferences, rawSlot)) {
    return response({ status: "disabled", slot: rawSlot });
  }

  const slot = getPushSlot(rawSlot);
  const verse = getDailyVerseWithOffset(new Date(), slot.position);
  if (!verse) {
    return response({ error: "No verse is available." }, 503);
  }

  const deliveryKey = {
    targetDate: getKoreaDateKey(),
    verseId: verse.id,
    channel: getDailyChannel(rawSlot),
  };
  const claimed = await claimDailyDelivery(deliveryKey);
  if (!claimed) {
    return response({ status: "duplicate", slot: rawSlot });
  }

  const subscription = await getActivePushSubscription();
  if (!subscription) {
    await finishDailyDelivery(deliveryKey, "skipped", "No active push subscription.");
    return response({ status: "skipped", reason: "no_subscription", slot: rawSlot });
  }

  try {
    await sendPushNotification(subscription, {
      title: `${slot.label}의 전경 · ${verse.title}`,
      body: getVersePreview(verse.text, 140),
      url: `/verses/${verse.id}`,
      tag: `daily-${rawSlot}-${deliveryKey.targetDate}`,
    });
    await finishDailyDelivery(deliveryKey, "sent");
    return response({ status: "sent", slot: rawSlot, verseId: verse.id });
  } catch (error: unknown) {
    if (isExpiredPushEndpoint(error)) {
      await disablePushSubscription(subscription.endpoint);
      await finishDailyDelivery(deliveryKey, "skipped", "Push subscription expired.");
      return response({ status: "skipped", reason: "expired_subscription", slot: rawSlot });
    }

    const errorMessage = describePushError(error);
    await finishDailyDelivery(deliveryKey, "failed", errorMessage);
    return response(
      { error: errorMessage, slot: rawSlot },
      error instanceof PushConfigurationError ? 503 : 502,
    );
  }
}

function response(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}
