/**
 * 05-archive.spec.js
 * Archive functionality tests
 *
 * Tests viewing, navigating, and managing archived programs on archive.html
 */

import { test, expect } from "@playwright/test";
import { mockGoogleSheets, clearAllStorage, BASE_URL } from "../fixtures/index.js";

test.describe("Archive", () => {
  test.beforeEach(async ({ page }) => {
    await clearAllStorage(page);
  });

  test.describe("Navigation to Archive", () => {
    test("view archives button navigates to archive.html", async ({ page }) => {
      // Load a program first
      await mockGoogleSheets(page, "fullProgram");
      await page.goto(`${BASE_URL}?url=https://docs.google.com/spreadsheets/d/alpine-ward/gviz/tq`);
      await page.waitForSelector("#unitname", { timeout: 10000 });

      // Close help modal if it's open
      const helpModal = page.locator("#help-modal");
      if (await helpModal.isVisible()) {
        await page.click("#close-help-modal-btn");
      }

      // Click view archives button
      await page.click("#view-archives-btn");

      // Should navigate to archive.html
      await expect(page).toHaveURL(/archive\.html/);
    });
  });

  test.describe("Archive Page", () => {
    test("archive page loads with title", async ({ page }) => {
      await page.goto(`${BASE_URL}archive.html`);
      await page.waitForLoadState("load");

      // Archive title should be visible
      const archiveTitle = page.locator("#archive-title");
      await expect(archiveTitle).toBeVisible();
    });

    test("return to home button visible on archive page", async ({ page }) => {
      await page.goto(`${BASE_URL}archive.html`);
      await page.waitForLoadState("load");

      const returnBtn = page.locator("#back-to-home-btn");
      await expect(returnBtn).toBeVisible();
    });

    test("can return to home from archive page", async ({ page }) => {
      // Navigate to archive
      await page.goto(`${BASE_URL}archive.html`);
      await page.waitForLoadState("load");

      // Click return to home
      await page.click("#back-to-home-btn");
      await expect(page).toHaveURL(/index\.html/);
    });
  });

  test.describe("Archive List", () => {
    test("shows message when no archives exist", async ({ page }) => {
      // Start fresh (no archives)
      await page.goto(`${BASE_URL}archive.html`);
      await page.waitForLoadState("load");

      // Should show "No archives found for this profile." message
      const noArchives = page.locator("#no-archives");
      await expect(noArchives).toBeVisible();
    });

    test("shows archives after loading program", async ({ page }) => {
      // Load a program (this will auto-archive it)
      await mockGoogleSheets(page, "fullProgram");
      await page.goto(`${BASE_URL}?url=https://docs.google.com/spreadsheets/d/alpine-ward/gviz/tq`);
      await page.waitForSelector("#unitname", { timeout: 10000 });

      // Close help modal if it's open
      const helpModal = page.locator("#help-modal");
      if (await helpModal.isVisible()) {
        await page.click("#close-help-modal-btn");
      }

      // Navigate to archive
      await page.click("#view-archives-btn");
      await expect(page).toHaveURL(/archive\.html/);

      // Archive list should be visible
      const archiveList = page.locator("#archives-list");
      await expect(archiveList).toBeVisible();
    });
  });

  test.describe("Theme in Archive", () => {
    test("theme toggle exists on archive page", async ({ page }) => {
      await page.goto(`${BASE_URL}archive.html`);
      await page.waitForLoadState("load");

      // Theme toggle should be visible
      const themeToggle = page.locator("#theme-toggle");
      await expect(themeToggle).toBeVisible();
    });
  });
});
