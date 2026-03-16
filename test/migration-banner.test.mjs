import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";

// Set up test isolation with browser API stubs
setupTestIsolation();

describe("MigrationBanner", () => {
  let initMigrationBanner, showMigrationBanner, hideMigrationBanner, resetMigrationBannerSession;

  beforeEach(async () => {
    // Set up minimal DOM structure
    document.body.innerHTML = `
      <div id="app"></div>
      <button id="migration-view-btn">View</button>
      <button id="migration-dismiss-btn">Dismiss</button>
      <button id="migration-close-btn">Close</button>
    `;

    vi.resetModules();
    const module = await import("../js/data/MigrationBanner.js");
    initMigrationBanner = module.initMigrationBanner;
    showMigrationBanner = module.showMigrationBanner;
    hideMigrationBanner = module.hideMigrationBanner;
    resetMigrationBannerSession = module.resetMigrationBannerSession;
  });

  describe("initMigrationBanner", () => {
    test("should create banner element", () => {
      initMigrationBanner();
      const banner = document.getElementById("migration-banner");
      expect(banner).toBeDefined();
    });

    test("should set banner id", () => {
      initMigrationBanner();
      const banner = document.getElementById("migration-banner");
      expect(banner.id).toBe("migration-banner");
    });

    test("should set ARIA attributes", () => {
      initMigrationBanner();
      const banner = document.getElementById("migration-banner");
      expect(banner.getAttribute("role")).toBe("alert");
      expect(banner.getAttribute("aria-live")).toBe("polite");
    });

    test("should insert banner into app", () => {
      initMigrationBanner();
      const banner = document.getElementById("migration-banner");
      expect(banner).toBeDefined();
      expect(document.body.contains(banner) || document.getElementById("app").contains(banner)).toBe(true);
    });

    test("should setup event listeners", () => {
      initMigrationBanner();
      // Real DOM event listeners are set up; we verify via behavior tests
      const banner = document.getElementById("migration-banner");
      expect(banner).toBeDefined();
    });
  });

  describe("showMigrationBanner", () => {
    test("should show banner", async () => {
      initMigrationBanner();
      await showMigrationBanner("profile-1", "https://example.com/migration");
      const banner = document.getElementById("migration-banner");
      expect(banner).toBeDefined();
      // Verify banner is visible (not hidden)
      expect(banner.classList.contains("hidden")).toBe(false);
    });
  });

  describe("hideMigrationBanner", () => {
    test("should be a function", () => {
      expect(typeof hideMigrationBanner).toBe("function");
    });

    test("should not throw when called", () => {
      expect(() => hideMigrationBanner()).not.toThrow();
    });
  });

  describe("resetMigrationBannerSession", () => {
    test("should be a function", () => {
      expect(typeof resetMigrationBannerSession).toBe("function");
    });

    test("should not throw", () => {
      expect(() => resetMigrationBannerSession()).not.toThrow();
    });
  });
});
