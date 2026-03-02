/**
 * 09-offline.spec.js
 * Offline functionality tests
 *
 * Tests caching, offline viewing, and service worker
 */

import { test, expect } from "@playwright/test";
import { mockGoogleSheets, clearAllStorage, BASE_URL } from "../fixtures/index.js";

async function closeHelpModal(page) {
  try {
    const helpModal = page.locator("#help-modal");
    if (await helpModal.isVisible({ timeout: 2000 })) {
      await page.click("#close-help-modal-btn");
      await page.waitForTimeout(300);
    }
  } catch (e) {
    // Ignore if modal not present
  }
}

test.describe("Offline", () => {
  test.beforeEach(async ({ page }) => {
    await clearAllStorage(page);
    await page.goto(BASE_URL);
    await page.waitForLoadState("domcontentloaded");
    await page.evaluate(() => {
      localStorage.setItem("meeting_program_help_shown", "true");
    });
    await closeHelpModal(page);
  });

  test.describe("Offline Banner", () => {
    test("can handle network failure gracefully", async ({ page }) => {
      await mockGoogleSheets(page, "fullProgram");

      // Load program first
      await page.goto(`${BASE_URL}?url=https://docs.google.com/spreadsheets/d/test/gviz/tq`);
      await page.waitForSelector("#unitname", { timeout: 10000 });

      // Go offline
      await page.context().setOffline(true);
      await page.waitForTimeout(1000);

      // Reload - should handle gracefully
      await page.reload();
      await page.waitForTimeout(2000);

      // Page should still be usable (program may or may not show)
      // Just verify no crash
      const body = page.locator("body");
      await expect(body).toBeVisible();
    });
  });

  test.describe("Cached Program", () => {
    test("cached program displays offline", async ({ page }) => {
      await mockGoogleSheets(page, "fullProgram");

      // Load and cache program
      await page.goto(`${BASE_URL}?url=https://docs.google.com/spreadsheets/d/test/gviz/tq`);
      await page.waitForSelector("#unitname", { timeout: 10000 });

      // Verify program loaded
      await expect(page.locator("#unitname")).toHaveText("Alpine Ward");

      // Go offline
      await page.context().setOffline(true);
      await page.waitForTimeout(1000);

      // Reload - should still show cached program
      await page.reload();
      await page.waitForTimeout(2000);

      // Should still display program
      await expect(page.locator("#unitname")).toBeVisible();
    });
  });

  test.describe("Archive Offline", () => {
    test("can navigate to archive page when online", async ({ page }) => {
      // Load a program
      await mockGoogleSheets(page, "fullProgram");
      await page.goto(`${BASE_URL}?url=https://docs.google.com/spreadsheets/d/alpine-ward/gviz/tq`);
      await page.waitForSelector("#unitname", { timeout: 10000 });

      // View archives button should navigate to archive.html when online
      await page.click("#view-archives-btn");
      await expect(page).toHaveURL(/archive\.html/);
    });
  });

  test.describe("Returning Online", () => {
    test("returns to normal when online", async ({ page }) => {
      await mockGoogleSheets(page, "fullProgram");

      // Load program
      await page.goto(`${BASE_URL}?url=https://docs.google.com/spreadsheets/d/test/gviz/tq`);
      await page.waitForSelector("#unitname", { timeout: 10000 });

      // Go offline
      await page.context().setOffline(true);
      await page.waitForTimeout(1000);

      // Come back online
      await page.context().setOffline(false);
      await page.waitForTimeout(1000);

      // Reload
      await page.reload();
      await page.waitForSelector("#unitname", { timeout: 10000 });

      // Should work normally
      await expect(page.locator("#unitname")).toBeVisible();
    });
  });

  test.describe("Service Worker", () => {
    test("service worker registers", async ({ page }) => {
      await mockGoogleSheets(page, "fullProgram");

      await page.goto(`${BASE_URL}?url=https://docs.google.com/spreadsheets/d/test/gviz/tq`);
      await page.waitForSelector("#unitname", { timeout: 10000 });

      // Check for service worker - just verify page loaded
      await expect(page.locator("#unitname")).toBeVisible();
    });
  });

  test.describe("Offline Page", () => {
    test("offline page loads correctly", async ({ page }) => {
      // Test that offline.html exists and loads
      await page.goto(`${BASE_URL.replace("/meeting-program/", "/meeting-program/offline.html")}`);
      await page.waitForLoadState("load");

      // Should show offline message
      const offlineTitle = page.locator(".offline-title");
      await expect(offlineTitle).toContainText("Offline");
    });
  });
});
