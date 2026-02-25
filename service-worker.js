// ------------------------------------------------------------
// CONFIG
// NOTE: Keep VERSION in sync with js/version.js
// ------------------------------------------------------------
const MPPATH = "/meeting-program";
const APP_PREFIX = "smpwa";
const VERSION = "1.5.1"; // bump this every deploy - also update js/version.js
const CACHE_NAME = `${APP_PREFIX}-${VERSION}`;

// Files to precache
const URLS = [
  `${MPPATH}/index.html?v=${VERSION}`,
  `${MPPATH}/css/styles.css?v=${VERSION}`,
  `${MPPATH}/js/version.js?v=${VERSION}`,
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
    caches.open(CACHE_NAME).then((cache) => {
      console.log("Installing cache:", CACHE_NAME);

      return Promise.all(
        URLS.map((url) => cache.add(url).catch((err) => console.warn("Failed to cache:", url, err)))
      );
    })
  );

  // Activate immediately
  self.skipWaiting();
});

// ------------------------------------------------------------
// ACTIVATE — Clean Old Caches
// ------------------------------------------------------------
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => {
            console.log("Deleting old cache:", key);
            return caches.delete(key);
          })
      )
    )
  );

  // Take control immediately
  clients.claim();
});

// ------------------------------------------------------------
// FETCH — Cache-first for static assets, network-first for others
// ------------------------------------------------------------
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle GET requests
  if (req.method !== "GET") return;

  // Cache-first for same-origin static files
  if (url.origin === location.origin && url.pathname.startsWith(MPPATH)) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;

        return fetch(req)
          .then((res) => {
            // Save a copy to cache
            return caches.open(CACHE_NAME).then((cache) => {
              cache.put(req, res.clone());
              return res;
            });
          })
          .catch(() => cached); // fallback if offline
      })
    );
    return;
  }

  // Network-first for external resources (Google Sheets, jsQR CDN)
  event.respondWith(
    fetch(req)
      .then((res) => res)
      .catch(() => caches.match(req))
  );
});

// ------------------------------------------------------------
// MESSAGE — Allow manual skipWaiting()
// ------------------------------------------------------------
self.addEventListener("message", (event) => {
  if (event.data && event.data.action === "skipWaiting") {
    self.skipWaiting();
  }
});
