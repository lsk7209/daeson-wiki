"use client";

import { useEffect, useState } from "react";

type DailyReminderProps = {
  verseId: string;
  title: string;
  preview: string;
};

type ReminderState = "unsupported" | "default" | "granted" | "denied";

const preferenceKey = "daeson-wiki:daily-reminder";

export default function DailyReminder({
  verseId,
  title,
  preview,
}: DailyReminderProps) {
  const [state, setState] = useState<ReminderState>("unsupported");
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      setState("unsupported");
      return;
    }

    navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    setState(Notification.permission as ReminderState);
    setEnabled(window.localStorage.getItem(preferenceKey) === "enabled");
  }, []);

  if (state === "unsupported") {
    return null;
  }

  const label =
    state === "granted" && enabled
      ? "오늘 알림"
      : state === "denied"
        ? "알림 차단됨"
        : "알림 켜기";

  return (
    <button
      className="secondary-link"
      disabled={state === "denied"}
      type="button"
      onClick={async () => {
        const permission =
          Notification.permission === "granted"
            ? "granted"
            : await Notification.requestPermission();

        setState(permission as ReminderState);

        if (permission !== "granted") {
          return;
        }

        window.localStorage.setItem(preferenceKey, "enabled");
        setEnabled(true);

        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification(title, {
          body: preview,
          icon: "/icon.svg",
          badge: "/icon.svg",
          tag: `daily-${verseId}`,
          data: {
            url: `/verses/${verseId}`,
          },
        });
      }}
    >
      {label}
    </button>
  );
}
