import webPush from "web-push";
import type { StoredPushSubscription } from "./push-subscriptions.ts";

export type PushMessage = {
  title: string;
  body: string;
  url: string;
  tag: string;
};

export class PushConfigurationError extends Error {}

export async function sendPushNotification(
  subscription: StoredPushSubscription,
  message: PushMessage,
) {
  const vapidDetails = getVapidDetails();

  return webPush.sendNotification(
    {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh,
        auth: subscription.auth,
      },
    },
    JSON.stringify(message),
    {
      vapidDetails,
      TTL: 43_200,
      urgency: "normal",
      topic: message.tag.slice(0, 32),
      timeout: 12_000,
    },
  );
}

export function isExpiredPushEndpoint(error: unknown) {
  const statusCode = readPushStatusCode(error);
  return statusCode === 404 || statusCode === 410;
}

export function describePushError(error: unknown) {
  const statusCode = readPushStatusCode(error);
  return statusCode
    ? `Push service rejected the request (${statusCode}).`
    : "Push delivery failed.";
}

function getVapidDetails() {
  const subject = process.env.VAPID_SUBJECT;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;

  if (!subject || !publicKey || !privateKey) {
    throw new PushConfigurationError("VAPID is not configured.");
  }

  if (!subject.startsWith("mailto:") && !subject.startsWith("https://")) {
    throw new PushConfigurationError(
      "VAPID_SUBJECT must use mailto: or https://.",
    );
  }

  return {
    subject,
    publicKey,
    privateKey,
  };
}

function readPushStatusCode(error: unknown) {
  if (!error || typeof error !== "object" || !("statusCode" in error)) {
    return null;
  }

  return typeof error.statusCode === "number" ? error.statusCode : null;
}
