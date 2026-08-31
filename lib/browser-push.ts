export const PUSH_REMINDER_PREFERENCE_KEY = "daeson-wiki:daily-reminder";

export async function ensureBrowserPushSubscription(vapidPublicKey: string) {
  if (!vapidPublicKey) {
    throw new Error("VAPID public key is missing.");
  }

  const registration = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64UrlToUint8Array(vapidPublicKey),
    }));

  await reconcileBrowserPushSubscription(subscription);
  return subscription;
}

export async function getBrowserPushSubscription() {
  const registration = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
}

export async function removeBrowserPushSubscription() {
  const subscription = await getBrowserPushSubscription();
  if (!subscription) {
    return;
  }

  const response = await fetch("/api/push-subscriptions", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint: subscription.endpoint }),
  });

  if (!response.ok && response.status !== 404) {
    throw new Error(await readResponseError(response));
  }

  await subscription.unsubscribe();
}

export async function reconcileBrowserPushSubscription(
  subscription: PushSubscription,
) {
  const p256dh = subscription.getKey("p256dh");
  const auth = subscription.getKey("auth");

  if (!p256dh || !auth) {
    throw new Error("Push subscription keys are missing.");
  }

  const response = await fetch("/api/push-subscriptions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      endpoint: subscription.endpoint,
      p256dh: arrayBufferToBase64Url(p256dh),
      auth: arrayBufferToBase64Url(auth),
      userAgent: navigator.userAgent,
    }),
  });

  if (!response.ok) {
    throw new Error(await readResponseError(response));
  }
}

async function readResponseError(response: Response) {
  const body = (await response.json().catch(() => null)) as {
    error?: unknown;
  } | null;
  return typeof body?.error === "string"
    ? body.error
    : `Request failed (${response.status}).`;
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
