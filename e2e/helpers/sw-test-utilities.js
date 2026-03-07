/**
 * Service Worker Testing Utilities
 * Provides helper functions for inspecting and interacting with service workers in tests
 */

import { test, expect } from "@playwright/test";

/**
 * Service Worker Inspector - Provides utilities to inspect SW state and behavior
 */
export class ServiceWorkerInspector {
  constructor(page) {
    this.page = page;
    this.swLogs = [];
    this.lifecycleEvents = [];
  }

  /**
   * Get all service worker registrations
   */
  async getAllRegistrations() {
    return await this.page.evaluate(async () => {
      const registrations = await navigator.serviceWorker.getRegistrations();
      return registrations.map((reg) => ({
        scope: reg.scope,
        active: reg.active?.state,
        waiting: reg.waiting?.state,
        installing: reg.installing?.state,
        updateViaCache: reg.updateViaCache
      }));
    });
  }

  /**
   * Check if a waiting service worker exists (new version ready to install)
   */
  async hasWaitingServiceWorker() {
    return await this.page.evaluate(async () => {
      const reg = await navigator.serviceWorker.ready;
      return !!reg.waiting;
    });
  }

  /**
   * Get the current active service worker version
   */
  async getActiveVersion() {
    return await this.page.evaluate(async () => {
      const reg = await navigator.serviceWorker.ready;
      return new Promise((resolve) => {
        const channel = new MessageChannel();
        channel.port1.onmessage = (event) => {
          resolve(event.data.version || "unknown");
        };
        channel.port1.onerror = () => resolve("unknown");

        if (navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({ action: "getVersion" }, [
            channel.port2
          ]);
        } else {
          resolve("no-controller");
        }

        setTimeout(() => resolve("timeout"), 2000);
      });
    });
  }

  /**
   * Trigger an update check on the service worker
   */
  async checkForUpdate() {
    return await this.page.evaluate(async () => {
      const reg = await navigator.serviceWorker.ready;
      await reg.update();
      return {
        hasWaiting: !!reg.waiting,
        activeState: reg.active?.state,
        waitingState: reg.waiting?.state,
        installingState: reg.installing?.state
      };
    });
  }

  /**
   * Send skipWaiting message to waiting service worker
   */
  async triggerSkipWaiting() {
    return await this.page.evaluate(async () => {
      const reg = await navigator.serviceWorker.ready;
      if (!reg.waiting) {
        return { success: false, reason: "No waiting service worker" };
      }

      try {
        reg.waiting.postMessage({ action: "skipWaiting" });
        return { success: true };
      } catch (error) {
        return { success: false, reason: error.message };
      }
    });
  }

  /**
   * Wait for the service worker controller to change
   */
  async waitForControllerChange(timeoutMs = 5000) {
    return await this.page.evaluate(
      async ({ timeoutMs }) => {
        return new Promise((resolve) => {
          const timeout = setTimeout(() => resolve(false), timeoutMs);

          const listener = () => {
            clearTimeout(timeout);
            resolve(true);
          };

          navigator.serviceWorker.addEventListener("controllerchange", listener, {
            once: true
          });
        });
      },
      { timeoutMs }
    );
  }

  /**
   * Get all cache names
   */
  async getAllCaches() {
    return await this.page.evaluate(async () => {
      return await caches.keys();
    });
  }

  /**
   * Check if a specific cache exists
   */
  async cacheExists(cacheName) {
    return await this.page.evaluate(
      async ({ cacheName }) => {
        const keys = await caches.keys();
        return keys.includes(cacheName);
      },
      { cacheName }
    );
  }

  /**
   * Get all URLs in a specific cache
   */
  async getCacheUrls(cacheName) {
    return await this.page.evaluate(
      async ({ cacheName }) => {
        const cache = await caches.open(cacheName);
        const requests = await cache.keys();
        return requests.map((req) => req.url);
      },
      { cacheName }
    );
  }

  /**
   * Check if a specific URL is in a cache
   */
  async urlInCache(cacheName, url) {
    return await this.page.evaluate(
      async ({ cacheName, url }) => {
        const cache = await caches.open(cacheName);
        const response = await cache.match(url);
        return !!response;
      },
      { cacheName, url }
    );
  }

  /**
   * Get the number of caches with a specific prefix
   */
  async countCachesWithPrefix(prefix) {
    return await this.page.evaluate(
      async ({ prefix }) => {
        const keys = await caches.keys();
        return keys.filter((key) => key.startsWith(prefix)).length;
      },
      { prefix }
    );
  }

  /**
   * Clear all app caches with a specific prefix
   */
  async clearCachesWithPrefix(prefix) {
    return await this.page.evaluate(
      async ({ prefix }) => {
        const keys = await caches.keys();
        const toDelete = keys.filter((key) => key.startsWith(prefix));
        const results = await Promise.all(toDelete.map((key) => caches.delete(key)));
        return { deleted: toDelete.length, results };
      },
      { prefix }
    );
  }

  /**
   * Subscribe to service worker console messages
   */
  listenToSWConsole() {
    this.page.on("console", (msg) => {
      if (msg.text().includes("[SW]")) {
        this.swLogs.push({
          text: msg.text(),
          type: msg.type(),
          timestamp: new Date()
        });
      }
    });
  }

  /**
   * Get all SW logs
   */
  getSWLogs() {
    return this.swLogs;
  }

  /**
   * Filter SW logs by pattern
   */
  getSWLogsByPattern(pattern) {
    const regex = new RegExp(pattern);
    return this.swLogs.filter((log) => regex.test(log.text));
  }

  /**
   * Get SW error logs
   */
  getSWErrors() {
    return this.swLogs.filter((log) => log.type === "error" || log.type === "warning");
  }

  /**
   * Clear log history
   */
  clearLogs() {
    this.swLogs = [];
  }

  /**
   * Get current page's app version (if exposed globally)
   */
  async getAppVersion() {
    return await this.page.evaluate(() => {
      return window.APP_VERSION || "unknown";
    });
  }

  /**
   * Wait for app to load and become ready
   */
  async waitForAppReady(timeoutMs = 10000) {
    return await this.page.waitForFunction(
      () => {
        const header = document.getElementById("program-header");
        return header && !header.classList.contains("hidden");
      },
      { timeout: timeoutMs }
    );
  }
}

/**
 * Version Checker Spy - Mock and inspect version checking behavior
 */
export class VersionCheckerSpy {
  constructor(page) {
    this.page = page;
    this.versionHistory = [];
    this.mockResponses = new Map();
  }

  /**
   * Setup mock version.json endpoint to return specific version
   */
  async mockVersionResponse(version, metadata = {}) {
    await this.page.context().unroute("**/version.json*");
    await this.page.context().route("**/version.json*", (route) => {
      this.versionHistory.push({
        requestedVersion: version,
        timestamp: new Date(),
        success: true
      });

      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          version,
          releaseDate: metadata.releaseDate || new Date().toISOString().split("T")[0],
          compatibility: metadata.compatibility || {
            minimum: version,
            current: version
          },
          features: metadata.features || {},
          ...metadata
        })
      });
    });
  }

  /**
   * Setup mock to fail on first N attempts, then succeed
   */
  async mockFailThenSucceed(version, failCount = 1, metadata = {}) {
    let attemptCount = 0;

    await this.page.context().unroute("**/version.json*");
    await this.page.context().route("**/version.json*", (route) => {
      attemptCount++;

      if (attemptCount <= failCount) {
        this.versionHistory.push({
          requestedVersion: version,
          timestamp: new Date(),
          success: false,
          reason: "simulated-failure"
        });
        route.abort("failed");
      } else {
        this.versionHistory.push({
          requestedVersion: version,
          timestamp: new Date(),
          success: true,
          attempt: attemptCount
        });
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            version,
            releaseDate: metadata.releaseDate || new Date().toISOString().split("T")[0],
            compatibility: metadata.compatibility || {
              minimum: version,
              current: version
            },
            features: metadata.features || {},
            ...metadata
          })
        });
      }
    });
  }

  /**
   * Setup mock to always fail
   */
  async mockAlwaysFail() {
    await this.page.context().unroute("**/version.json*");
    await this.page.context().route("**/version.json*", (route) => {
      this.versionHistory.push({
        timestamp: new Date(),
        success: false,
        reason: "always-fails"
      });
      route.abort("failed");
    });
  }

  /**
   * Setup mock to return malformed JSON
   */
  async mockMalformedJson() {
    await this.page.context().unroute("**/version.json*");
    await this.page.context().route("**/version.json*", (route) => {
      this.versionHistory.push({
        timestamp: new Date(),
        success: false,
        reason: "malformed-json"
      });
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: "not valid json {{{{"
      });
    });
  }

  /**
   * Setup mock to return missing required field
   */
  async mockMissingVersionField() {
    await this.page.context().unroute("**/version.json*");
    await this.page.context().route("**/version.json*", (route) => {
      this.versionHistory.push({
        timestamp: new Date(),
        success: false,
        reason: "missing-version"
      });
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          releaseDate: "2025-03-04",
          // no version field
        })
      });
    });
  }

  /**
   * Get all version check history
   */
  getHistory() {
    return this.versionHistory;
  }

  /**
   * Get successful checks
   */
  getSuccessfulChecks() {
    return this.versionHistory.filter((h) => h.success);
  }

  /**
   * Get failed checks
   */
  getFailedChecks() {
    return this.versionHistory.filter((h) => !h.success);
  }

  /**
   * Clear history
   */
  clearHistory() {
    this.versionHistory = [];
  }

  /**
   * Get number of attempts for a specific version
   */
  getAttemptCount(version) {
    return this.versionHistory.filter((h) => h.requestedVersion === version).length;
  }
}

/**
 * Data Persistence Spy - Verify data survives updates
 */
export class DataPersistenceSpy {
  constructor(page) {
    this.page = page;
    this.dataSnapshots = [];
  }

  /**
   * Take a snapshot of localStorage
   */
  async snapshotLocalStorage(label = "snapshot") {
    const data = await this.page.evaluate(() => {
      const items = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        items[key] = localStorage.getItem(key);
      }
      return items;
    });

    const snapshot = {
      label,
      timestamp: new Date(),
      type: "localStorage",
      data
    };

    this.dataSnapshots.push(snapshot);
    return snapshot;
  }

  /**
   * Take a snapshot of sessionStorage
   */
  async snapshotSessionStorage(label = "snapshot") {
    const data = await this.page.evaluate(() => {
      const items = {};
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        items[key] = sessionStorage.getItem(key);
      }
      return items;
    });

    const snapshot = {
      label,
      timestamp: new Date(),
      type: "sessionStorage",
      data
    };

    this.dataSnapshots.push(snapshot);
    return snapshot;
  }

  /**
   * Set a test item in localStorage
   */
  async setTestData(key, value) {
    return await this.page.evaluate(
      ({ key, value }) => {
        localStorage.setItem(key, value);
        return localStorage.getItem(key);
      },
      { key, value }
    );
  }

  /**
   * Get a test item from localStorage
   */
  async getTestData(key) {
    return await this.page.evaluate(
      ({ key }) => {
        return localStorage.getItem(key);
      },
      { key }
    );
  }

  /**
   * Compare two snapshots
   */
  compareSnapshots(snapshot1, snapshot2) {
    const data1 = snapshot1.data;
    const data2 = snapshot2.data;

    const differences = {
      added: [],
      removed: [],
      modified: [],
      unchanged: []
    };

    // Check for added or modified keys
    Object.entries(data2).forEach(([key, value]) => {
      if (!(key in data1)) {
        differences.added.push(key);
      } else if (data1[key] !== value) {
        differences.modified.push({
          key,
          before: data1[key],
          after: value
        });
      } else {
        differences.unchanged.push(key);
      }
    });

    // Check for removed keys
    Object.entries(data1).forEach(([key]) => {
      if (!(key in data2)) {
        differences.removed.push(key);
      }
    });

    return differences;
  }

  /**
   * Get all snapshots
   */
  getSnapshots() {
    return this.dataSnapshots;
  }

  /**
   * Get snapshots by type
   */
  getSnapshotsByType(type) {
    return this.dataSnapshots.filter((s) => s.type === type);
  }

  /**
   * Clear snapshots
   */
  clearSnapshots() {
    this.dataSnapshots = [];
  }
}

/**
 * Page Reload Manager - Track and verify page reloads
 */
export class PageReloadManager {
  constructor(page) {
    this.page = page;
    this.reloadHistory = [];
  }

  /**
   * Reload the page and wait for it to be ready
   */
  async reloadPage() {
    const startTime = Date.now();
    const startVersion = await this.page.evaluate(() => window.APP_VERSION || "unknown");

    await this.page.reload();

    // Wait for app to be ready
    await this.page.waitForFunction(
      () => {
        const header = document.getElementById("program-header");
        return header && !header.classList.contains("hidden");
      },
      { timeout: 10000 }
    );

    const duration = Date.now() - startTime;
    const endVersion = await this.page.evaluate(() => window.APP_VERSION || "unknown");

    const reload = {
      timestamp: new Date(),
      duration,
      startVersion,
      endVersion,
      versionChanged: startVersion !== endVersion
    };

    this.reloadHistory.push(reload);
    return reload;
  }

  /**
   * Wait for app to reach a specific version
   */
  async waitForVersion(expectedVersion, timeoutMs = 10000) {
    try {
      await this.page.waitForFunction(
        ({ expectedVersion }) => {
          const currentVersion = window.APP_VERSION || "unknown";
          return currentVersion === expectedVersion;
        },
        { timeout: timeoutMs },
        { expectedVersion }
      );
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get reload history
   */
  getHistory() {
    return this.reloadHistory;
  }

  /**
   * Clear history
   */
  clearHistory() {
    this.reloadHistory = [];
  }
}
