"use client";

import { useEffect, useState } from "react";
import {
  ensureBrowserPushSubscription,
  getBrowserPushSubscription,
  PUSH_REMINDER_PREFERENCE_KEY,
  reconcileBrowserPushSubscription,
  removeBrowserPushSubscription,
} from "@/lib/browser-push";
import {
  DEFAULT_PUSH_PREFERENCES,
  PUSH_SLOTS,
  type PushPreferences,
  type PushSlotId,
} from "@/lib/push-schedule";

type SupportState =
  | "checking"
  | "supported"
  | "ios-install"
  | "unsupported"
  | "missing-config"
  | "missing-key"
  | "denied";

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

export default function NotificationSettings() {
  const [support, setSupport] = useState<SupportState>("checking");
  const [preferences, setPreferences] = useState<PushPreferences>({
    ...DEFAULT_PUSH_PREFERENCES,
    slots: [...DEFAULT_PUSH_PREFERENCES.slots],
  });
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("휴대폰 알림 상태를 확인하고 있습니다.");

  useEffect(() => {
    initialize().catch((error: unknown) => {
      setSupport(
        error instanceof Error && error.message.includes("Turso")
          ? "missing-config"
          : "unsupported",
      );
      setStatus(
        error instanceof Error
          ? translateError(error.message)
          : "알림 상태를 확인하지 못했습니다.",
      );
    });

    async function initialize() {
      if (isIosDevice() && !isStandalone()) {
        setSupport("ios-install");
        setStatus("iPhone에서는 먼저 Safari 공유 메뉴에서 ‘홈 화면에 추가’를 선택하세요.");
        return;
      }

      if (
        !window.isSecureContext ||
        !("Notification" in window) ||
        !("serviceWorker" in navigator) ||
        !("PushManager" in window)
      ) {
        setSupport("unsupported");
        setStatus("이 브라우저에서는 웹 푸시를 사용할 수 없습니다.");
        return;
      }

      if (!vapidPublicKey) {
        setSupport("missing-key");
        setStatus("서버의 VAPID 공개키 설정이 필요합니다.");
        return;
      }

      if (Notification.permission === "denied") {
        setSupport("denied");
        setStatus("브라우저 설정에서 이 사이트의 알림 차단을 해제하세요.");
        return;
      }

      setSupport("supported");
      const subscription = await getBrowserPushSubscription();
      if (subscription) {
        await reconcileBrowserPushSubscription(subscription);
      }
      setSubscribed(Boolean(subscription));

      const response = await fetch("/api/push-preferences", { cache: "no-store" });
      if (!response.ok) {
        throw new Error(await readResponseError(response));
      }

      const body = (await response.json()) as { preferences: PushPreferences };
      setPreferences(body.preferences);
      setStatus(
        subscription && body.preferences.enabled
          ? `${body.preferences.slots.length}회 알림이 켜져 있습니다.`
          : "알림을 켜고 원하는 시간을 선택하세요.",
      );
    }
  }, []);

  const selectable = support === "supported" && !busy;

  return (
    <section className="settings-card" aria-busy={busy}>
      <div className={`status-banner status-${support}`} aria-live="polite">
        <strong>{subscribed && preferences.enabled ? "알림 사용 중" : "알림 준비"}</strong>
        <span>{status}</span>
      </div>

      <fieldset className="slot-fieldset" disabled={!selectable}>
        <legend>매일 받을 시간</legend>
        <div className="slot-list">
          {PUSH_SLOTS.map((slot) => {
            const checked = preferences.slots.includes(slot.id);
            return (
              <label className="slot-option" key={slot.id}>
                <input
                  checked={checked}
                  type="checkbox"
                  onChange={() => toggleSlot(slot.id)}
                />
                <span>
                  <strong>{slot.time}</strong>
                  <small>{slot.label} 알림</small>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <p className="setting-note">
        무료 예약 실행은 선택한 시각이 포함된 1시간 안에 도착할 수 있습니다. 동일한
        날짜·시간대 알림은 중복 발송하지 않습니다.
      </p>

      <div className="settings-actions">
        {subscribed ? (
          <>
            <button className="primary-link" disabled={!selectable} type="button" onClick={save}>
              선택 저장
            </button>
            <button className="secondary-link" disabled={!selectable} type="button" onClick={testPush}>
              테스트 알림
            </button>
            <button className="danger-link" disabled={!selectable} type="button" onClick={disable}>
              알림 끄기
            </button>
          </>
        ) : (
          <button className="primary-link" disabled={!selectable} type="button" onClick={enable}>
            이 휴대폰에서 알림 켜기
          </button>
        )}
      </div>

      <div className="install-guidance">
        <strong>휴대폰 설치 방법</strong>
        <p>Android Chrome: 메뉴 → 앱 설치 또는 홈 화면에 추가</p>
        <p>iPhone Safari: 공유 → 홈 화면에 추가 → 설치된 앱에서 알림 설정</p>
      </div>
    </section>
  );

  function toggleSlot(slotId: PushSlotId) {
    setPreferences((current) => {
      const exists = current.slots.includes(slotId);
      if (exists && current.slots.length === 1) {
        setStatus("알림 시간은 최소 1개를 선택해야 합니다.");
        return current;
      }

      const slots = exists
        ? current.slots.filter((item) => item !== slotId)
        : [...current.slots, slotId];
      return { ...current, slots };
    });
  }

  async function enable() {
    await run(async () => {
      const permission =
        Notification.permission === "granted"
          ? "granted"
          : await Notification.requestPermission();

      if (permission !== "granted") {
        setSupport(permission === "denied" ? "denied" : "supported");
        setStatus("알림 권한이 허용되지 않았습니다.");
        return;
      }

      await ensureBrowserPushSubscription(vapidPublicKey);
      const next = { ...preferences, enabled: true };
      await savePreferences(next);
      window.localStorage.setItem(PUSH_REMINDER_PREFERENCE_KEY, "enabled");
      setPreferences(next);
      setSubscribed(true);
      setStatus(`${next.slots.length}회 알림을 설정했습니다.`);
    });
  }

  async function save() {
    await run(async () => {
      const next = { ...preferences, enabled: true };
      await savePreferences(next);
      setPreferences(next);
      window.localStorage.setItem(PUSH_REMINDER_PREFERENCE_KEY, "enabled");
      setStatus(`${next.slots.length}회 알림 설정을 저장했습니다.`);
    });
  }

  async function testPush() {
    await run(async () => {
      const response = await fetch("/api/push/test", { method: "POST" });
      if (!response.ok) {
        throw new Error(await readResponseError(response));
      }
      setStatus("테스트 알림을 보냈습니다. 휴대폰 알림 창을 확인하세요.");
    });
  }

  async function disable() {
    await run(async () => {
      const next = { enabled: false, slots: preferences.slots };
      await savePreferences(next);
      await removeBrowserPushSubscription();
      window.localStorage.removeItem(PUSH_REMINDER_PREFERENCE_KEY);
      setPreferences(next);
      setSubscribed(false);
      setStatus("이 휴대폰의 알림을 껐습니다.");
    });
  }

  async function run(action: () => Promise<void>) {
    setBusy(true);
    try {
      await action();
    } catch (error: unknown) {
      setStatus(error instanceof Error ? translateError(error.message) : "요청을 완료하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }
}

async function savePreferences(preferences: PushPreferences) {
  const response = await fetch("/api/push-preferences", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(preferences),
  });

  if (!response.ok) {
    throw new Error(await readResponseError(response));
  }
}

async function readResponseError(response: Response) {
  const body = (await response.json().catch(() => null)) as { error?: unknown } | null;
  return typeof body?.error === "string" ? body.error : `Request failed (${response.status}).`;
}

function translateError(message: string) {
  if (message.includes("Turso")) {
    return "서버의 Turso 데이터베이스 설정이 필요합니다.";
  }
  if (message.includes("VAPID")) {
    return "서버의 푸시 키 설정이 필요합니다.";
  }
  if (message.includes("No active")) {
    return "활성화된 휴대폰 알림 구독이 없습니다.";
  }
  return message;
}

function isIosDevice() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

function isStandalone() {
  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    navigatorWithStandalone.standalone === true
  );
}
