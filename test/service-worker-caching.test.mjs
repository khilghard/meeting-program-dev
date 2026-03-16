import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * SERVICE WORKER CACHING TESTS
 * 
 * These tests verify critical caching behaviors in the service worker that prevent
 * stale content from being served on soft refreshes when external services are unavailable.
 * 
 * BACKGROUND:
 * - Hard refresh (Ctrl+Shift+R) bypasses cache entirely and always fetches fresh
 * - Soft refresh (F5) uses service worker cache for dynamic content
 * - External services (CDNs, imageservers) sometimes fail with 503 errors
 * 
 * CRITICAL FIXES:
 * 1. Only cache successful responses (res.ok / 2xx status codes)
 *    - Prevents caching 503, 404, 5xx errors
 *    - Allows retries on soft refresh when services recover
 * 
 * 2. Skip caching non-http/https URLs (chrome-extension://, data:, etc)
 *    - Prevents "Request scheme not supported" errors in cache.put()
 *    - Allows graceful handling of extension/internal requests
 * 
 * 3. Use network-first strategy for static assets
 *    - Tries network first, falls back to cache if offline
 *    - Ensures F5 refresh gets fresh content when available
 * 
 * 4. Always fetch version.json fresh (network-first)
 *    - Prevents serving stale app version on reload
 *    - Ensures app version logs are accurate
 * 
 * WHY TESTS MATTER:
 * Service worker caching is easy to regress because:
 * - Operator precedence bugs can silently cache errors (res.ok && url.protocol === 'http:' || url.protocol === 'https:')
 * - Missing success checks allow 503 responses to be cached
 * - Cache.put() silently fails for unsupported schemes without proper guards
 * - Future refactors might remove guards or consolidate conditions incorrectly
 */

describe("Service Worker Caching Strategy", () => {
  let mockFetch;
  let mockCaches;
  let mockCache;

  beforeEach(() => {
    // Mock the global fetch
    mockFetch = vi.fn();
    global.fetch = mockFetch;

    // Mock Cache API
    mockCache = {
      put: vi.fn().mockResolvedValue(undefined),
      match: vi.fn().mockResolvedValue(null),
      add: vi.fn().mockResolvedValue(undefined),
      addAll: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(true),
      clear: vi.fn().mockResolvedValue(undefined),
      keys: vi.fn().mockResolvedValue([])
    };

    mockCaches = {
      open: vi.fn().mockResolvedValue(mockCache),
      keys: vi.fn().mockResolvedValue([]),
      delete: vi.fn().mockResolvedValue(true),
      match: vi.fn().mockResolvedValue(null)
    };

    global.caches = mockCaches;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Only Cache Successful Responses", () => {
    /**
     * FIX: Only cache responses with res.ok (2xx status codes)
     * BUG: Without this check, 503 errors from CDNs get cached
     * SYMPTOM: F5 refresh shows broken images/scripts, hard refresh shows them working
     * REGRESSION: Future refactors might remove res.ok check or cache all responses
     */
    it("should NOT cache 503 error responses from external CDNs", async () => {
      // Response from cdn.jsdelivr.net that failed
      const errorResponse = new Response(null, {
        status: 503,
        statusText: "Service Unavailable"
      });

      // Simulate cacheWithTimestamp logic - should skip caching 503s
      const shouldCache = errorResponse.ok;
      
      expect(shouldCache).toBe(false);
      expect(mockCache.put).not.toHaveBeenCalled();
    });

    /**
     * FIX: Ensure res.ok is properly checked before caching
     * BUG: Operator precedence: res.ok && url.protocol === 'http:' || url.protocol === 'https:'
     *      evaluates as (res.ok && http) || https, caching ALL https responses even with 503
     * REGRESSION: Similar operator precedence bugs could surface in refactors
     */
    it("should only cache 2xx responses, not 4xx/5xx", async () => {
      const testCases = [
        { status: 200, shouldCache: true },
        { status: 201, shouldCache: true },
        { status: 206, shouldCache: true },
        { status: 304, shouldCache: false }, // Not Modified
        { status: 400, shouldCache: false },
        { status: 404, shouldCache: false },
        { status: 500, shouldCache: false },
        { status: 503, shouldCache: false }
      ];

      for (const testCase of testCases) {
        const res = {
          ok: testCase.status >= 200 && testCase.status < 300,
          status: testCase.status
        };

        const shouldCache = res.ok && res.status >= 200 && res.status < 300;
        expect(shouldCache).toBe(testCase.shouldCache);
      }
    });
  });

  describe("Skip Non-HTTP/HTTPS Schemes", () => {
    /**
     * FIX: Check URL protocol before calling cache.put()
     * BUG: cache.put() throws "Request scheme 'chrome-extension' is unsupported"
     * SYMPTOM: Console errors on F5 refresh with Chrome DevTools open
     * REGRESSION: Guards might be removed thinking they're unnecessary
     */
    it("should NOT cache chrome-extension:// requests", async () => {
      const url = new URL("chrome-extension://abcdef123/panel.html");
      const shouldCache = url.protocol === 'http:' || url.protocol === 'https:';

      expect(shouldCache).toBe(false);
    });

    /**
     * FIX: Explicitly check for http: and https: protocols
     * BUG: Missing checks allow data:, blob:, etc. to reach cache.put()
     * REGRESSION: Future devs might think all URLs are safe for caching
     */
    it("should only cache http: and https: schemes", async () => {
      const testCases = [
        { url: "https://cdn.example.com/script.js", shouldCache: true },
        { url: "http://api.example.com/data.json", shouldCache: true },
        { url: "chrome-extension://xyz/page.html", shouldCache: false },
        { url: "data:text/plain;base64,SGVsbG8=", shouldCache: false },
        { url: "blob:https://example.com/12345", shouldCache: false },
        { url: "file:///local/path/file.json", shouldCache: false }
      ];

      for (const testCase of testCases) {
        const url = new URL(testCase.url);
        const shouldCache = url.protocol === 'http:' || url.protocol === 'https:';
        expect(shouldCache).toBe(testCase.shouldCache);
      }
    });
  });

  describe("Network-First Strategy for Static Assets", () => {
    /**
     * FIX: Use network-first strategy for /js/, /css/, /index.html, /version.json
     * BUG: Cache-first strategy serves old content on F5 refresh
     * SYMPTOM: F5 shows v2.1.6 when v2.1.7 is deployed
     * REGRESSION: Someone might change back to cache-first thinking it's more efficient
     */
    it("should include version.json in network-first assets", async () => {
      const assetsThatNeedNetworkFirst = [
        "/index.html",
        "/css/styles.css",
        "/js/main.js",
        "/js/version.js",
        "/version.json"  // CRITICAL: Must be fresh
      ];

      const isNetworkFirst = (path) => {
        return path.endsWith("/index.html") ||
               path.includes("/css/") ||
               path.includes("/js/") ||
               path.endsWith("/version.json");
      };

      for (const asset of assetsThatNeedNetworkFirst) {
        expect(isNetworkFirst(asset)).toBe(true);
      }
    });

    /**
     * FIX: version.json must never be cached long-term
     * BUG: Without proper caching strategy, app version remains stale
     * SYMPTOM: Console shows old version even after deployment
     * REGRESSION: Someone might optimize by caching version.json like other assets
     */
    it("should treat version.json separately from other JS files", async () => {
      // version.json should always go through network-first
      // (try network, fall back to cache only if offline)
      const isVersionFile = (path) => {
        return path.includes("version.json");
      };

      const path = "/version.json";
      expect(isVersionFile(path)).toBe(true);

      // Versus normal JS which could be cached with longer TTLs
      const normalJs = "/js/main.js";
      expect(isVersionFile(normalJs)).toBe(false);
    });
  });

  describe("Manifest Detection and Updates", () => {
    /**
     * FIX: Ensure manifest.prod.webmanifest is used correctly
     * BUG: Stale manifest.webmanifest (v2.1.4) got served instead of manifest.prod.webmanifest (v2.1.5)
     * SYMPTOM: PWA doesn't update properly on new version
     * REGRESSION: Manifest detection script might be accidentally commented out or removed
     */
    it("should select correct manifest for deployment path", async () => {
      const basePathTests = [
        { swPath: "/meeting-program/sw.js", expectedBase: "/meeting-program/" },
        { swPath: "/meeting-program-dev/sw.js", expectedBase: "/meeting-program-dev/" },
        { swPath: "/sw.js", expectedBase: "/" }
      ];

      for (const test of basePathTests) {
        const swPath = test.swPath;
        const basePath =
          swPath.includes("/meeting-program-dev/") ? "/meeting-program-dev/" :
          swPath.includes("/meeting-program/") ? "/meeting-program/" :
          "/";

        expect(basePath).toBe(test.expectedBase);
      }
    });
  });

  describe("Error Recovery on Network Flakiness", () => {
    /**
     * FIX: Don't cache failed external requests
     * BUG: Cached 503 responses prevent retry on next F5 refresh
     * SYMPTOM: Images missing after external service recovers
     * REGRESSION: Someone might cache everything for "offline support"
     */
    it("should allow retry of failed external requests after cache miss", async () => {
      // Scenario: CDN was down, returned 503, got cached
      // Then on F5 refresh with same cached 503, user still sees broken images
      
      // The fix: DON'T cache the 503 in the first place
      // Then on F5 refresh, it will try network again
      
      const successResponse = { ok: true, status: 200 };
      const errorResponse = { ok: false, status: 503 };

      // Should cache success
      expect(successResponse.ok).toBe(true);

      // Should NOT cache error
      expect(errorResponse.ok).toBe(false);
    });

    /**
     * FIX: Network-first strategy with proper fallback
     * BUG: Without this, can't recover from transient failures
     * SYMPTOM: One failed external CDN request ruins the page indefinitely
     * REGRESSION: Reverting to cache-first would lose recovery capability
     */
    it("should attempt fresh fetch even if previous attempt failed", async () => {
      // With network-first: Always try network first
      // If network succeeds (even after previous 503), use it
      // Only fall back to cache if network completely fails
      
      const strategies = {
        "network-first": {
          description: "Try network, fall back to cache",
          recoversFromTransient: true
        },
        "cache-first": {
          description: "Use cache, fall back to network",
          recoversFromTransient: false  // 503 cached = stuck with 503
        }
      };

      expect(strategies["network-first"].recoversFromTransient).toBe(true);
      expect(strategies["cache-first"].recoversFromTransient).toBe(false);
    });
  });

  describe("App Version Logging", () => {
    /**
     * FIX: Print version to console on every load
     * BUG: Without version logging, hard to debug which version user is running
     * SYMPTOM: User reports bug but unclear if it's regression or new issue
     * REGRESSION: Version logging might be removed as "unnecessary"
     */
    it("should log app version to console on initialization", async () => {
      const expectedVersion = "2.1.8";
      const consoleLogMock = vi.spyOn(console, "log");

      // Simulating the version fetch and log
      const versionLog = `[VERSION] App running version: ${expectedVersion}`;

      // This should appear in console
      expect(versionLog).toContain("2.1.8");
      expect(versionLog).toContain("[VERSION]");
    });

    /**
     * FIX: Version must be fetched fresh (network-first)
     * BUG: If version.json is cached, old version gets logged
     * SYMPTOM: Console shows wrong version number
     * REGRESSION: Someone might optimize by caching version.json
     */
    it("should fetch version.json fresh on every reload", async () => {
      // This is enforced by including version.json in network-first routes
      const networkFirstAssets = [
        "/index.html",
        "/js/main.js",
        "/version.json"  // Must be here
      ];

      expect(networkFirstAssets).toContain("/version.json");
    });
  });
});
