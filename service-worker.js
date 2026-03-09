// Offline-first service worker for tg-reader PWA static assets + proxy responses

const CACHE_NAME = "tg-reader-cache-v4";
const POSTS_CACHE_NAME = "tg-reader-proxy-cache-v3";
const urlsToCache = [
  "/",
  "index.html",
  "manifest.json",
  "styles.css",
  "service-worker.js",
  // icons can be added here if present
  // 'icons/icon-192x192.png',
  // 'icons/icon-512x512.png',
];
const NETWORK_FIRST_ASSETS = new Set([
  "/",
  "/index.html",
  "/styles.css",
  "/manifest.json",
]);
const PROXY_HOSTNAMES = new Set([
  "api.codetabs.com",
  "api.allorigins.win",
  "thingproxy.freeboard.io",
]);

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
        const keep = [CACHE_NAME, POSTS_CACHE_NAME];
        return Promise.all(
          keys.map((key) => {
            if (!keep.includes(key)) return caches.delete(key);
            return Promise.resolve();
          }),
        );
      })
      .then(() => self.clients.claim()),
  );
});

function shouldUseNetworkFirst(request) {
  if (request.mode === "navigate") return true;
  const url = new URL(request.url);
  return NETWORK_FIRST_ASSETS.has(url.pathname);
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response && response.ok && response.type !== "opaque") {
      cache.put(request, response.clone()).catch(() => {});
    }
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }
    if (request.mode === "navigate") {
      return cache.match("/index.html");
    }
    return new Response("Offline", {
      status: 503,
      statusText: "Service Unavailable",
    });
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) {
    return cached;
  }
  try {
    const response = await fetch(request);
    if (response && response.ok && response.type !== "opaque") {
      cache.put(request, response.clone()).catch(() => {});
    }
    return response;
  } catch (error) {
    if (request.mode === "navigate") {
      return cache.match("/index.html");
    }
    return new Response("Offline", {
      status: 503,
      statusText: "Service Unavailable",
    });
  }
}

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const requestUrl = new URL(event.request.url);
  const isProxyRequest = PROXY_HOSTNAMES.has(requestUrl.hostname);
  if (isProxyRequest) {
    event.respondWith(
      caches.open(POSTS_CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((cached) => {
          const fetchAndCache = () =>
            fetch(event.request)
              .then((networkResponse) => {
                if (
                  networkResponse &&
                  networkResponse.status === 200 &&
                  networkResponse.type !== "opaque"
                ) {
                  cache.put(event.request, networkResponse.clone());
                }
                return networkResponse;
              })
              .catch(() => {
                return cached;
              });
          if (cached) {
            fetchAndCache().catch(() => {});
            return cached;
          }
          return fetchAndCache().then((response) => {
            if (response) {
              return response;
            }
            return new Response("Offline", {
              status: 503,
              statusText: "Service Unavailable",
            });
          });
        });
      }),
    );
    return;
  }

  if (shouldUseNetworkFirst(event.request)) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  event.respondWith(cacheFirst(event.request));
});
