const CACHE_NAME = "daeson-wiki-v3";
const APP_SHELL = [
  "/",
  "/offline",
  "/settings/notifications",
  "/manifest.webmanifest",
  "/icon.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(async () => {
          return (await caches.match(request)) ?? caches.match("/offline");
        }),
    );
    return;
  }

  if (url.pathname.startsWith("/_next/static/") || APP_SHELL.includes(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        return (
          cached ??
          fetch(request).then((response) => {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
            return response;
          })
        );
      }),
    );
  }
});

self.addEventListener("push", (event) => {
  const fallback = {
    title: "오늘의 전경",
    body: "오늘의 구절을 확인하세요.",
    url: "/today",
  };
  let payload = fallback;

  if (event.data) {
    try {
      const candidate = event.data.json();
      if (candidate && typeof candidate === "object") {
        payload = {
          title: typeof candidate.title === "string" ? candidate.title : fallback.title,
          body: typeof candidate.body === "string" ? candidate.body : fallback.body,
          url: typeof candidate.url === "string" ? candidate.url : fallback.url,
          tag: typeof candidate.tag === "string" ? candidate.tag : "daily-jeongyeong",
        };
      }
    } catch {
      payload = fallback;
    }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title ?? fallback.title, {
      body: payload.body ?? fallback.body,
      icon: "/icon.svg",
      badge: "/icon.svg",
      tag: payload.tag ?? "daily-jeongyeong",
      data: {
        url: payload.url ?? fallback.url,
      },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url ?? "/today";
  const absoluteUrl = new URL(targetUrl, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url === absoluteUrl && "focus" in client) {
          return client.focus();
        }
      }

      return self.clients.openWindow(absoluteUrl);
    }),
  );
});
