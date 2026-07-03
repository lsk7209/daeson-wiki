"use client";

import { useEffect, useState } from "react";

type DailyReminderProps = {
  verseId: string;
  title: string;
  preview: string;
};

type ReminderState =
  | "unsupported"
  | "missing-key"
  | "default"
  | "granted"
  | "denied";

const preferenceKey = "daeson-wiki:daily-reminder";
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

export default function DailyReminder({
  verseId,
  title,
  preview,
}: DailyReminderProps) {
  const [state, setState] = useState<ReminderState>("unsupported");
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [statusLabel, setStatusLabel] = useState<string | null>(null);

  useEffect(() => {
    if (
      !("Notification" in window) ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window)
    ) {
      setState("unsupported");
      return;
    }

    if (!vapidPublicKey) {
      setState("missing-key");
      return;
    }

    navigator.serviceWorker
      .register("/sw.js")
      .then(async (registration) => {
        const subscription = await registration.pushManager.getSubscription();
        setEnabled(Boolean(subscription));

        if (subscription) {
          window.localStorage.setItem(preferenceKey, "enabled");
        } else if (window.localStorage.getItem(preferenceKey) === "enabled") {
          setEnabled(true);
        }
      })
      .catch(() => undefined);

    setState(Notification.permission as ReminderState);
  }, []);

  if (state === "unsupported") {
    return null;
  }

  const label =
    busy
      ? "처리 중"
      : statusLabel
        ? statusLabel
      : state === "missing-key"
        ? "푸시 키 필요"
        : state === "denied"
          ? "알림 차단됨"
          : enabled
            ? "알림 끄기"
            : "알림 켜기";

  return (
    <button
      className="secondary-link"
      disabled={busy || state === "denied" || state === "missing-key"}
      type="button"
      onClick={async () => {
        setBusy(true);
        setStatusLabel(null);

        try {
          if (enabled) {
            await disableReminder();
            setEnabled(false);
            window.localStorage.removeItem(preferenceKey);
            return;
          }

          const permission =
            Notification.permission === "granted"
              ? "granted"
              : await Notification.requestPermission();

          setState(permission as ReminderState);

          if (permission !== "granted") {
            return;
          }

          await enableReminder({
            verseId,
            title,
            preview,
          });
          setEnabled(true);
          window.localStorage.setItem(preferenceKey, "enabled");
        } catch (error: unknown) {
          setStatusLabel(
            error instanceof Error && error.message.includes("configured")
              ? "DB 설정 필요"
              : "저장 실패",
          );
        } finally {
          setBusy(false);
        }
      }}
    >
      {label}
    </button>
  );
}

async function enableReminder({
  verseId,
  title,
  preview,
}: DailyReminderProps) {
  const registration = await navigator.serviceWorker.ready;
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64UrlToUint8Array(vapidPublicKey),
    }));

  await saveSubscription(subscription);

  await registration.showNotification(title, {
    body: preview,
    icon: "/icon.svg",
    badge: "/icon.svg",
    tag: `daily-${verseId}`,
    data: {
      url: `/verses/${verseId}`,
    },
  });
}

async function disableReminder() {
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    return;
  }

  await fetch("/api/push-subscriptions", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      endpoint: subscription.endpoint,
    }),
  }).catch(() => undefined);

  await subscription.unsubscribe();
}

async function saveSubscription(subscription: PushSubscription) {
  const p256dh = subscription.getKey("p256dh");
  const auth = subscription.getKey("auth");

  if (!p256dh || !auth) {
    throw new Error("Push subscription keys are missing.");
  }

  const response = await fetch("/api/push-subscriptions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      endpoint: subscription.endpoint,
      p256dh: arrayBufferToBase64Url(p256dh),
      auth: arrayBufferToBase64Url(auth),
      userAgent: navigator.userAgent,
    }),
  });

  if (!response.ok) {
    if (response.status === 503) {
      throw new Error("Turso is not configured.");
    }

    throw new Error(`Failed to save push subscription: ${response.status}`);
  }
}

function base64UrlToUint8Array(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = `${value}${padding}`.replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const output = new Uint8Array(rawData.length);

  for (let index = 0; index < rawData.length; index += 1) {
    output[index] = rawData.charCodeAt(index);
  }

  return output;
}

function arrayBufferToBase64Url(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return window
    .btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}
