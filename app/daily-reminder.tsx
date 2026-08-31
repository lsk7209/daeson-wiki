"use client";

import Link from "next/link";
import { useEffect } from "react";
import {
  ensureBrowserPushSubscription,
  PUSH_REMINDER_PREFERENCE_KEY,
} from "@/lib/browser-push";

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

export default function DailyReminder() {
  useEffect(() => {
    if (
      !vapidPublicKey ||
      !("Notification" in window) ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window) ||
      Notification.permission !== "granted" ||
      window.localStorage.getItem(PUSH_REMINDER_PREFERENCE_KEY) !== "enabled"
    ) {
      return;
    }

    ensureBrowserPushSubscription(vapidPublicKey).catch(() => undefined);
  }, []);

  return (
    <Link className="secondary-link" href="/settings/notifications">
      알림 설정
    </Link>
  );
}
