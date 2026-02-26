import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("Update System Integration Tests", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="update-notification" class="update-banner hidden">
        <span class="update-message"></span>
        <button id="update-now-btn">Update</button>
        <button id="update-close-btn">Close</button>
      </div>
    `;

    global.localStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn()
    };

    global.fetch = vi.fn();
    global.navigator.serviceWorker = {
      register: vi.fn().mockResolvedValue({
        scope: "/test/",
        update: vi.fn().mockResolvedValue(undefined),
        waiting: null
      }),
      controller: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    };
  });

  afterEach(() => {
    delete global.localStorage;
    delete global.navigator.serviceWorker;
    vi.resetModules();
  });

  describe("Happy Path: Update Available", () => {
    it("shows update banner when new version available", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ version: "2.0.0" })
      });

      const { checkForUpdates } = await import("../js/update-manager.js");
      await checkForUpdates(true);

      const banner = document.getElementById("update-notification");
      expect(banner.classList.contains("hidden")).toBe(false);
    });

    it("displays correct version info in banner", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ version: "2.0.0" })
      });

      const { checkForUpdates } = await import("../js/update-manager.js");
      await checkForUpdates(true);

      const message = document.querySelector(".update-message");
      expect(message.textContent).toContain("2.0.0");
    });
  });

  describe("No Update Path", () => {
    it("hides banner when up to date", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ version: "2.0.0" })
      });

      const banner = document.getElementById("update-notification");
      banner.classList.remove("hidden");

      const { checkForUpdates } = await import("../js/update-manager.js");
      await checkForUpdates(true);

      expect(banner.classList.contains("hidden")).toBe(true);
    });
  });

  describe("Error Recovery", () => {
    it("handles network error gracefully", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

      const banner = document.getElementById("update-notification");
      banner.classList.remove("hidden");

      const { checkForUpdates } = await import("../js/update-manager.js");
      await checkForUpdates(true);

      expect(banner.classList.contains("hidden")).toBe(true);
    });

    it("handles invalid JSON gracefully", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.reject(new Error("Invalid JSON"))
      });

      const banner = document.getElementById("update-notification");
      banner.classList.remove("hidden");

      const { checkForUpdates } = await import("../js/update-manager.js");
      await checkForUpdates(true);

      expect(banner.classList.contains("hidden")).toBe(true);
    });
  });

  describe("Offline Behavior", () => {
    it("continues with cached version when offline", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("Offline"));

      const { checkForUpdates } = await import("../js/update-manager.js");
      await checkForUpdates(true);

      // Banner should stay hidden (no update shown)
      const banner = document.getElementById("update-notification");
      expect(banner.classList.contains("hidden")).toBe(true);
    });
  });

  describe("User Interactions", () => {
    it("hides banner on close button click", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ version: "2.0.0" })
      });

      const { checkForUpdates, resetSessionCheck } = await import("../js/update-manager.js");
      resetSessionCheck();
      await checkForUpdates(true);

      const banner = document.getElementById("update-notification");
      expect(banner.classList.contains("hidden")).toBe(false);

      const closeBtn = document.getElementById("update-close-btn");
      closeBtn.click();

      expect(banner.classList.contains("hidden")).toBe(true);
    });

    it("only checks once per session without force", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ version: "2.0.0" })
      });

      const { checkForUpdates } = await import("../js/update-manager.js");

      // First check
      await checkForUpdates();
      let banner = document.getElementById("update-notification");
      expect(banner.classList.contains("hidden")).toBe(false);

      // Reset banner for second check
      banner.classList.add("hidden");

      // Second check without force should not trigger
      await checkForUpdates();
      banner = document.getElementById("update-notification");
      expect(banner.classList.contains("hidden")).toBe(true);

      // With force=true, should check again
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ version: "2.0.0" })
      });
      await checkForUpdates(true);
      banner = document.getElementById("update-notification");
      expect(banner.classList.contains("hidden")).toBe(false);
    });
  });
});
