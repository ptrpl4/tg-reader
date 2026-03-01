// Simple cache-first service worker for tg-reader PWA

const CACHE_NAME = "tg-reader-cache-v2";
const urlsToCache = [
  "/",
  "index.html",
  "reader.html",
  "manifest.json",
  "styles.css",
  "service-worker.js",
  // icons can be added here if present
  // 'icons/icon-192x192.png',
  // 'icons/icon-512x512.png',
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => {
        return Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) return caches.delete(key);
            return Promise.resolve();
          }),
        );
      })
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  // Only handle GET requests
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        return cached;
      }
      return fetch(event.request)
        .then((networkResponse) => {
          // If response is invalid, just return it without caching
          if (
            !networkResponse ||
            networkResponse.status !== 200 ||
            networkResponse.type === "opaque"
          ) {
            return networkResponse;
          }
          // Cache a clone of the network response for future use
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone).catch(() => {
              /* ignore cache put failures */
            });
          });
          return networkResponse;
        })
        .catch(() => {
          // Fallback: try to serve index.html for navigation requests, otherwise fail
          if (event.request.mode === "navigate") {
            return caches.match("index.html");
          }
          return new Response("Offline", {
            status: 503,
            statusText: "Service Unavailable",
          });
        });
    }),
  );
});
