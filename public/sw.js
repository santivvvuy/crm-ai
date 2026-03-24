const CACHE_NAME = "marketphone-crm-v1";
const PRECACHE = ["/", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // Network first, fallback to cache
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// ─── Push event: show notification ──────────────────────────────────────────

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: "MarketPhone", body: event.data.text() };
  }

  const options = {
    body: data.body ?? "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: data.tag ?? "marketphone",
    renotify: true,
    vibrate: [200, 100, 200],
    data: data.data ?? {},
  };

  event.waitUntil(
    self.registration.showNotification(data.title ?? "Nuevo mensaje", options)
  );
});

// ─── Notification click: open or focus the app ──────────────────────────────

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const contactId = event.notification.data?.contactId;

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        for (const client of clients) {
          if (client.url.includes(self.location.origin)) {
            client.focus();
            client.postMessage({ type: "OPEN_CONTACT", contactId });
            return;
          }
        }
        const url = contactId ? `/?contact=${contactId}` : "/";
        return self.clients.openWindow(url);
      })
  );
});
