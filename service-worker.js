// ------------------------------------------------------------
// CONFIG
// NOTE: Keep VERSION in sync with js/version.js
// ------------------------------------------------------------
const MPPATH = "/meeting-program";
const APP_PREFIX = "smpwa";
const VERSION = "2.1.0";
const CACHE_NAME = `${APP_PREFIX}-${VERSION}`;

// Separate caches for different content types
const STATIC_CACHE = "meeting-program-static-v1";
const DYNAMIC_CACHE = "meeting-program-dynamic-v1";
const MAX_DYNAMIC_CACHE = 50;
const MAX_CACHE_AGE_DAYS = 30;

// Cache expiration for Google Sheets (24 hours in milliseconds)
const SHEET_CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000;

const MAX_CACHES_TO_KEEP = 3;

// Files to precache
const URLS = [
  `${MPPATH}/index.html?v=${VERSION}`,
  `${MPPATH}/css/styles.css?v=${VERSION}`,
  `${MPPATH}/js/version.js?v=${VERSION}`,
  `${MPPATH}/js/version-parser.js?v=${VERSION}`,
  `${MPPATH}/js/version-checker.js?v=${VERSION}`,
  `${MPPATH}/js/service-worker-manager.js?v=${VERSION}`,
  `${MPPATH}/js/update-manager.js?v=${VERSION}`,
  `${MPPATH}/js/main.js?v=${VERSION}`,
  `${MPPATH}/js/qr.js?v=${VERSION}`,
  `${MPPATH}/js/sanitize.js?v=${VERSION}`,
  `${MPPATH}/js/profiles.js?v=${VERSION}`,
  `${MPPATH}/js/i18n/index.js?v=${VERSION}`,
  `${MPPATH}/js/i18n/honorifics.js?v=${VERSION}`,
  `${MPPATH}/js/history.js?v=${VERSION}`,
  `${MPPATH}/js/auto-archive.js?v=${VERSION}`,
  `${MPPATH}/js/archive.js?v=${VERSION}`,
  `${MPPATH}/archive.html?v=${VERSION}`,
  `${MPPATH}/js/utils/csv.js?v=${VERSION}`,
  `${MPPATH}/js/utils/renderers.js?v=${VERSION}`,
  `${MPPATH}/img/icon.png`,
  `${MPPATH}/img/favicon.png`,
  `${MPPATH}/manifest.webmanifest`,
  "https://cdn.jsdelivr.net/npm/jsqr/dist/jsQR.js"
];

// ------------------------------------------------------------
// INSTALL — Precache App Shell
// ------------------------------------------------------------
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log("Installing static cache:", STATIC_CACHE);

      return Promise.all(
        URLS.map((url) => cache.add(url).catch((err) => console.warn("Failed to cache:", url, err)))
      );
    })
  );

  self.skipWaiting();
});

// ------------------------------------------------------------
// ACTIVATE — Clean Old Caches
// ------------------------------------------------------------
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      // Filter to only our app's caches
      const appCaches = keys
        .filter((key) => key.startsWith(`${APP_PREFIX}-`))
        .sort()
        .reverse();

      // Keep only the most recent MAX_CACHES_TO_KEEP caches
      const cachesToDelete = appCaches.slice(MAX_CACHES_TO_KEEP);

      console.log(`[SW] Current caches: ${appCaches.length}, keeping: ${MAX_CACHES_TO_KEEP}`);

      return Promise.all(
        cachesToDelete.map((key) => {
          console.log("[SW] Deleting old cache:", key);
          return caches.delete(key);
        })
      );
    })
  );

  // Take control immediately
  clients.claim();
});

// ------------------------------------------------------------
// FETCH — Different strategies based on content type
// ------------------------------------------------------------
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle GET requests
  if (req.method !== "GET") return;

  // Cache-only for: App manifest and icons
  if (
    url.pathname.includes("manifest.webmanifest") ||
    url.pathname.includes("/img/") ||
    url.pathname.includes("favicon")
  ) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          return caches.open(STATIC_CACHE).then((cache) => {
            cache.put(req, res.clone());
            return res;
          });
        });
      })
    );
    return;
  }

  // Cache-first for: /index.html, /css/*.css, /js/*.js
  if (
    url.pathname.endsWith("/index.html") ||
    url.pathname.includes("/css/") ||
    url.pathname.includes("/js/")
  ) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;

        return fetch(req)
          .then((res) => {
            return caches.open(STATIC_CACHE).then((cache) => {
              cache.put(req, res.clone());
              return res;
            });
          })
          .catch(() => caches.match(req));
      })
    );
    return;
  }

  // Network-first for: Google Sheets URLs (migration validation)
  if (url.hostname.includes("docs.google.com")) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          // Cache the fresh response
          if (res.ok) {
            const resClone = res.clone();
            const cacheWithTimestamp = new Response(resClone.body, {
              status: res.status,
              statusText: res.statusText,
              headers: new Headers({
                ...Object.fromEntries(res.headers.entries()),
                "cached-at": Date.now().toString()
              })
            });
            caches.open(DYNAMIC_CACHE).then((cache) => {
              cache.put(req, cacheWithTimestamp);
            });
          }
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // Check for cache-bust parameter (reload button adds t=timestamp)
  const forceRefresh = url.searchParams.has("t") && url.searchParams.get("force") === "true";

  // Dynamic cache with expiration for other requests
  event.respondWith(
    fetch(req)
      .then((res) => {
        // Cache successful responses in dynamic cache
        if (res.ok) {
          const resClone = res.clone();
          const cacheWithTimestamp = new Response(resClone.body, {
            status: res.status,
            statusText: res.statusText,
            headers: new Headers({
              ...Object.fromEntries(res.headers.entries()),
              "cached-at": Date.now().toString()
            })
          });
          caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(req, cacheWithTimestamp);
          });
        }
        return res;
      })
      .catch(() => {
        // Fallback to cache
        return caches.open(DYNAMIC_CACHE).then((cache) => {
          return cache.match(req).then((cachedResponse) => {
            if (cachedResponse) {
              // Check if cache has expired (24 hours for Google Sheets)
              const cachedAt = cachedResponse.headers.get("cached-at");
              if (cachedAt) {
                const age = Date.now() - parseInt(cachedAt, 10);
                if (url.hostname.includes("docs.google.com") && age > SHEET_CACHE_EXPIRY_MS) {
                  console.log("[SW] Google Sheet cache expired but offline - serving stale cache");
                  // Return stale cache when offline even if expired
                  return cachedResponse;
                }
              }
              return cachedResponse;
            }
            return new Response("Offline", { status: 503 });
          });
        });
      })
  );
});

// ------------------------------------------------------------
// MESSAGE — Allow manual skipWaiting(), clearCache, and version queries
// ------------------------------------------------------------
self.addEventListener("message", (event) => {
  if (event.data && event.data.action === "skipWaiting") {
    self.skipWaiting();
  }

  if (event.data && event.data.action === "getVersion") {
    event.ports[0].postMessage({ version: VERSION });
  }

  if (event.data && event.data.action === "clearCache") {
    event.waitUntil(
      caches
        .keys()
        .then((keys) => {
          return Promise.all(
            keys.map((key) => {
              if (key.startsWith(APP_PREFIX)) {
                return caches.delete(key);
              }
            })
          );
        })
        .then(() => {
          event.ports[0].postMessage({ success: true });
        })
    );
  }
});

// ------------------------------------------------------------
// BACKGROUND SYNC — For migration checks
// ------------------------------------------------------------
self.addEventListener("sync", (event) => {
  if (event.tag === "migration-check") {
    event.waitUntil(
      // Migration check will be triggered from the main app
      // This is a placeholder for background sync functionality
      console.log("[SW] Background sync: migration-check")
    );
  }
});

// ------------------------------------------------------------
// PERIODIC CACHE CLEANUP
// ------------------------------------------------------------
async function cleanupOldCaches() {
  const keys = await caches.keys();
  const now = Date.now();
  const maxAge = MAX_CACHE_AGE_DAYS * 24 * 60 * 60 * 1000;

  for (const key of keys) {
    if (key.startsWith(APP_PREFIX)) {
      // Check if cache is older than MAX_CACHE_AGE_DAYS
      const cache = await caches.open(key);
      const requests = await cache.keys();

      let oldestTimestamp = now;
      for (const request of requests) {
        const response = await cache.match(request);
        if (response) {
          const date = response.headers.get("date");
          if (date) {
            const timestamp = new Date(date).getTime();
            if (timestamp < oldestTimestamp) {
              oldestTimestamp = timestamp;
            }
          }
        }
      }

      if (now - oldestTimestamp > maxAge) {
        await caches.delete(key);
        console.log("[SW] Deleted old cache:", key);
      }
    }
  }
}

// Run cleanup on activate
self.addEventListener("activate", (event) => {
  event.waitUntil(cleanupOldCaches());
});
