// ------------------------------------------------------------
// CONFIG - Auto-detect deployment path for backwards compatibility
// ------------------------------------------------------------
// Detect base path from current service worker location
const BASE_PATH = (() => {
  const swPath = self.location.pathname;

  // Determine which deployment this service worker is for
  // Examples:
  // - https://khilghard.github.io/meeting-program-dev/service-worker.js → /meeting-program-dev/
  // - https://khilghard.github.io/meeting-program/service-worker.js → /meeting-program/
  // - http://localhost:8000/service-worker.js → /

  if (swPath.includes("/meeting-program-dev/")) {
    return "/meeting-program-dev/";
  } else if (swPath.includes("/meeting-program/")) {
    return "/meeting-program/";
  }

  // Fallback for local testing / root deployment
  return "/";
})();

console.log(`[SW] BASE_PATH detected: "${BASE_PATH}"`);

// Legacy support - keep old MPPATH for existing users
const MPPATH = BASE_PATH || "/meeting-program-dev";
const APP_PREFIX = "smpwa";
const VERSION = "2.3.1";
const CACHE_NAME = `${APP_PREFIX}-${VERSION}`;

// All users now on 2.2.x - single unified cache scheme
const STATIC_CACHE = `meeting-program-static-v${VERSION}`;
const DYNAMIC_CACHE = `meeting-program-dynamic-v${VERSION}`;
const MAX_DYNAMIC_CACHE = 50;
const MAX_CACHE_AGE_DAYS = 30;

// Cache expiration for Google Sheets (24 hours in milliseconds)
const SHEET_CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000;

const MAX_CACHES_TO_KEEP = 5; // Increased to support dual cache schemes

// Files to precache - use BASE_PATH for new deployments, MPPATH for legacy
const URLS = [
  `${BASE_PATH || MPPATH}/index.html?v=${VERSION}`,
  `${BASE_PATH || MPPATH}/css/styles.css?v=${VERSION}`,
  `${BASE_PATH || MPPATH}/js/version.js?v=${VERSION}`,
  `${BASE_PATH || MPPATH}/js/version-parser.js?v=${VERSION}`,
  `${BASE_PATH || MPPATH}/js/version-checker.js?v=${VERSION}`,
  `${BASE_PATH || MPPATH}/js/service-worker-manager.js?v=${VERSION}`,
  `${BASE_PATH || MPPATH}/js/main.js?v=${VERSION}`,
  `${BASE_PATH || MPPATH}/js/qr.js?v=${VERSION}`,
  `${BASE_PATH || MPPATH}/js/sanitize.js?v=${VERSION}`,
  `${BASE_PATH || MPPATH}/js/profiles.js?v=${VERSION}`,
  `${BASE_PATH || MPPATH}/js/i18n/index.js?v=${VERSION}`,
  `${BASE_PATH || MPPATH}/js/i18n/honorifics.js?v=${VERSION}`,
  `${BASE_PATH || MPPATH}/js/history.js?v=${VERSION}`,
  `${BASE_PATH || MPPATH}/js/archive.js?v=${VERSION}`,
  `${BASE_PATH || MPPATH}/archive.html?v=${VERSION}`,
  `${BASE_PATH || MPPATH}/img/icon.png`,
  `${BASE_PATH || MPPATH}/img/favicon.png`,
  `${BASE_PATH || MPPATH}/img/oil-lamp.webp`,
  `${BASE_PATH || MPPATH}/img/oil-lamp.jpg`,
  `${BASE_PATH || MPPATH}/img/sacrament.png`,
  `${BASE_PATH || MPPATH}/manifest.webmanifest`,
  "https://cdn.jsdelivr.net/npm/jsqr/dist/jsQR.js",
  "https://cdn.jsdelivr.net/npm/dexie@4.3.0/+esm"
];

// ------------------------------------------------------------
// Helper: Execute Promise.all with individual error handling
// ------------------------------------------------------------
async function promiseAllSafe(promises, options = {}) {
  const { continueOnError = true, logger = console.warn } = options;
  const results = await Promise.all(
    promises.map(async (promise, index) => {
      try {
        const data = await promise;
        return { success: true, data, index };
      } catch (error) {
        if (continueOnError) {
          logger(`Promise ${index} failed:`, error.message);
          return { success: false, error, index };
        }
        throw error;
      }
    })
  );
  return results;
}

// ------------------------------------------------------------
// Helper: Cache operation with timestamp
// Only cache http/https requests (skip chrome-extension, etc)
// ------------------------------------------------------------
async function cacheWithTimestamp(cache, request, response) {
  try {
    // Only cache successful responses (2xx status)
    if (!response.ok) {
      return;
    }

    // Skip caching for non-http schemes (chrome-extension, etc)
    const url = new URL(request.url);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return;
    }

    const resClone = response.clone();
    const cacheWithTimestamp = new Response(resClone.body, {
      status: response.status,
      statusText: response.statusText,
      headers: new Headers({
        ...Object.fromEntries(response.headers.entries()),
        "cached-at": Date.now().toString()
      })
    });
    await cache.put(request, cacheWithTimestamp);
  } catch (e) {
    console.warn("[SW] Failed to create cached response:", e);
  }
}

// ------------------------------------------------------------
// Helper: Static cache handler (network-first, falls back to cache)
// This ensures refresh (F5) shows fresh content while supporting offline
async function handleStaticCache(req) {
  try {
    // NETWORK-FIRST: Try to fetch fresh content first
    const res = await fetch(req);

    if (res.ok) {
      // Update cache with fresh content
      const cache = await caches.open(STATIC_CACHE);
      await cacheWithTimestamp(cache, req, res);
      const isMainJs = req.url.includes("main.js");
      if (isMainJs) {
        console.log(`[SW] Serving FRESH main.js from network (${VERSION})`);
      }
    }

    return res;
  } catch (fetchErr) {
    // Network failed, fall back to cached version (offline support)
    try {
      const cached = await caches.match(req);
      if (cached) {
        const isMainJs = req.url.includes("main.js");
        console.log(
          `[SW] ${isMainJs ? "CRITICAL: Serving CACHED main.js (may be outdated)" : "Serving cached"}: ${req.url}`
        );
        return cached;
      }
    } catch (cacheErr) {
      console.warn(`[SW] Cache lookup failed:`, cacheErr);
    }

    // Both network and cache failed
    console.error(`[SW] No cached or network response for:`, req.url);
    throw fetchErr;
  }
}

// ------------------------------------------------------------
// Helper: Google Sheets network-first handler
// ------------------------------------------------------------
async function handleGoogleSheets(req) {
  try {
    const res = await fetch(req);
    if (res.ok && res.body) {
      const dynamicCache = await caches.open(DYNAMIC_CACHE);
      await cacheWithTimestamp(dynamicCache, req, res);
    }
    return res;
  } catch (err) {
    console.warn("[SW] Google Sheets fetch failed:", err);
    throw err;
  }
}

// ------------------------------------------------------------
// Helper: Dynamic cache with fallback
// ------------------------------------------------------------
async function handleDynamicCache(req, url) {
  try {
    const res = await fetch(req);
    if (res.ok && res.body) {
      const dynamicCache = await caches.open(DYNAMIC_CACHE);
      await cacheWithTimestamp(dynamicCache, req, res);
    }
    return res;
  } catch (fetchErr) {
    console.warn("[SW] Fetch failed:", fetchErr);
    const cache = await caches.open(DYNAMIC_CACHE);
    const cachedResponse = await cache.match(req);
    if (cachedResponse) {
      const cachedAt = cachedResponse.headers.get("cached-at");
      if (cachedAt) {
        const age = Date.now() - Number.parseInt(cachedAt, 10);
        if (url?.hostname?.includes("docs.google.com") && age > SHEET_CACHE_EXPIRY_MS) {
          console.log("[SW] Google Sheet cache expired but offline - serving stale cache");
          return cachedResponse;
        }
      }
      return cachedResponse;
    }
    throw fetchErr;
  }
}

// ------------------------------------------------------------
// INSTALL — Precache App Shell
// ------------------------------------------------------------
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      try {
        console.log("[SW] Installing static cache:", STATIC_CACHE);
        const cache = await caches.open(STATIC_CACHE);
        const results = await promiseAllSafe(
          URLS.map((url) => cache.add(url)),
          { logger: (msg) => console.warn("[SW]", msg) }
        );
        const failed = results.filter((r) => !r.success).length;
        if (failed > 0) {
          console.warn(`[SW] ${failed} URLs failed to cache`);
        }
      } catch (err) {
        console.error("[SW] Installation failed:", err);
        throw err;
      }
    })()
  );

  globalThis.skipWaiting();
});

// ------------------------------------------------------------
// Helper: Clean versioned caches
// ------------------------------------------------------------
async function cleanVersionedCaches() {
  try {
    const keys = await caches.keys();
    const allCaches = keys
      .filter((k) => k.startsWith(APP_PREFIX) && k !== CACHE_NAME && k !== STATIC_CACHE)
      .sort((a, b) => a.localeCompare(b))
      .reverse();

    const toDelete = allCaches.slice(MAX_CACHES_TO_KEEP);

    console.log(`[SW] Found ${allCaches.length} app caches, deleting ${toDelete.length} oldest`);

    const results = await promiseAllSafe(
      toDelete.map((key) => {
        console.log("[SW] Deleting old cache:", key);
        return caches.delete(key);
      }),
      { logger: (msg) => console.warn("[SW]", msg) }
    );

    const failed = results.filter((r) => !r.success).length;
    if (failed > 0) {
      console.warn(`[SW] ${failed} cache deletions failed`);
    }
  } catch (err) {
    console.warn("[SW] Cache keys failed:", err);
  }
}

// ------------------------------------------------------------
// ACTIVATE — Clean Old Caches
// ------------------------------------------------------------
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      try {
        await Promise.all([cleanVersionedCaches(), cleanupOldCaches()]);
      } catch (err) {
        console.error("[SW] Activation failed:", err);
        throw err;
      }
    })()
  );

  clients.claim();
});

// ------------------------------------------------------------
// FETCH — Different strategies based on content type
// ------------------------------------------------------------
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  if (req.method !== "GET") return;

  // Handle requests to deployment root (e.g., /meeting-program/ → /meeting-program/index.html)
  // This handles cases where users access the path without index.html
  if (
    url.pathname === BASE_PATH ||
    url.pathname === `${BASE_PATH}` ||
    (BASE_PATH !== "/" && url.pathname === `${BASE_PATH.slice(0, -1)}`)
  ) {
    // Create RequestInit without 'navigate' mode (which cannot be set in RequestInit)
    const indexReq = new Request(`${BASE_PATH}index.html`, {
      method: req.method,
      headers: req.headers
    });
    event.respondWith(handleStaticCache(indexReq));
    return;
  }

  if (
    url.pathname.includes("manifest") ||
    url.pathname.includes("manifest.webmanifest") ||
    url.pathname.includes(".prod.webmanifest") ||
    url.pathname.includes(".dev.webmanifest") ||
    url.pathname.includes("/img/") ||
    url.pathname.includes("favicon")
  ) {
    event.respondWith(handleStaticCache(req));
    return;
  }

  if (
    url.pathname.endsWith("/index.html") ||
    url.pathname.includes("/css/") ||
    url.pathname.includes("/js/") ||
    url.pathname.endsWith("/version.json")
  ) {
    event.respondWith(handleStaticCache(req));
    return;
  }

  if (url.hostname.includes("docs.google.com")) {
    event.respondWith(handleGoogleSheets(req));
    return;
  }

  event.respondWith(handleDynamicCache(req, url));
});

// ------------------------------------------------------------
// MESSAGE — Allow manual skipWaiting(), clearCache, and version queries
// ------------------------------------------------------------
self.addEventListener("message", (event) => {
  if (event.origin !== self.location.origin && event.origin !== "null") {
    console.warn("[SW] Message from unauthorized origin:", event.origin);
    return;
  }

  if (event.data?.action === "skipWaiting") {
    globalThis.skipWaiting();
  }

  if (event.data?.action === "getVersion") {
    event.ports[0].postMessage({
      version: VERSION
    });
  }

  if (event.data?.action === "clearCache") {
    event.waitUntil(
      (async () => {
        try {
          const keys = await caches.keys();
          console.log("[SW] clearCache: Found caches:", keys);
          const results = await promiseAllSafe(
            keys.map((key) => {
              // Clear ALL caches, not just those with APP_PREFIX
              console.log("[SW] Deleting cache:", key);
              return caches.delete(key);
            }),
            { logger: (msg) => console.warn("[SW]", msg) }
          );

          const deleted = results.filter((r) => r.success).length;
          const failed = results.filter((r) => !r.success).length;
          console.log(`[SW] Cache clear complete: ${deleted} deleted, ${failed} failed`);

          if (event.ports[0]) {
            event.ports[0].postMessage({ success: true, deletedCount: deleted });
          }
        } catch (err) {
          console.error("[SW] Clear cache failed:", err);
          if (event.ports[0]) {
            event.ports[0].postMessage({ success: false, error: err.message });
          }
          throw err;
        }
      })()
    );
  }
});

// ------------------------------------------------------------
// BACKGROUND SYNC — For migration checks
// ------------------------------------------------------------
self.addEventListener("sync", (event) => {
  if (event.tag === "migration-check") {
    event.waitUntil(
      (async () => {
        console.log("[SW] Background sync: migration-check");
      })()
    );
  }
});

// ------------------------------------------------------------
// PERIODIC CACHE CLEANUP
// ------------------------------------------------------------
async function findOldestCacheTimestamp(cache, requests) {
  let oldestTimestamp = Date.now();
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
  return oldestTimestamp;
}

async function shouldDeleteCache(key, maxAge) {
  const cache = await caches.open(key);
  const requests = await cache.keys();
  const oldestTimestamp = await findOldestCacheTimestamp(cache, requests);
  return Date.now() - oldestTimestamp > maxAge;
}

async function cleanupOldCaches() {
  const keys = await caches.keys();
  const maxAge = MAX_CACHE_AGE_DAYS * 24 * 60 * 60 * 1000;

  for (const key of keys) {
    if (key.startsWith(APP_PREFIX)) {
      if (await shouldDeleteCache(key, maxAge)) {
        await caches.delete(key);
        console.log("[SW] Deleted old cache:", key);
      }
    }
  }
}

self.addEventListener("activate", (event) => {
  event.waitUntil(cleanupOldCaches());
});
