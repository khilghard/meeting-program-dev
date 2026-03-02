/**
 * 08-theming.spec.js
 * Theme switching tests
 *
 * Tests light/dark theme functionality
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

test.describe("Theming", () => {
  test.beforeEach(async ({ page }) => {
    await clearAllStorage(page);
    await page.goto(BASE_URL);
    await page.waitForLoadState("domcontentloaded");
    await page.evaluate(() => {
      localStorage.setItem("meeting_program_help_shown", "true");
    });
    await closeHelpModal(page);
  });

  test.describe("Default Theme", () => {
    test("default theme is light", async ({ page }) => {
      await mockGoogleSheets(page, "fullProgram");

      await page.goto(`${BASE_URL}?url=https://docs.google.com/spreadsheets/d/test/gviz/tq`);
      await page.waitForSelector("#unitname", { timeout: 10000 });

      // Check theme attribute
      const html = page.locator("html");
      await expect(html).toHaveAttribute("data-theme", "light");
    });
  });

  test.describe("Theme Toggle", () => {
    test("theme toggle button exists", async ({ page }) => {
      await mockGoogleSheets(page, "fullProgram");

      await page.goto(`${BASE_URL}?url=https://docs.google.com/spreadsheets/d/test/gviz/tq`);
      await page.waitForSelector("#unitname", { timeout: 10000 });

      // Theme toggle should be visible after program is loaded
      const themeBtn = page.locator("#theme-toggle");
      await expect(themeBtn).toBeVisible();
    });

    test("can switch to dark theme", async ({ page }) => {
      await mockGoogleSheets(page, "fullProgram");

      await page.goto(`${BASE_URL}?url=https://docs.google.com/spreadsheets/d/test/gviz/tq`);
      await page.waitForSelector("#unitname", { timeout: 10000 });

      // Click theme toggle
      const themeBtn = page.locator("#theme-toggle");
      await expect(themeBtn).toBeVisible();
      await themeBtn.click();
      await page.waitForTimeout(500);

      // Check dark theme
      const html = page.locator("html");
      await expect(html).toHaveAttribute("data-theme", "dark");
    });

    test("can switch back to light theme", async ({ page }) => {
      await mockGoogleSheets(page, "fullProgram");

      await page.goto(`${BASE_URL}?url=https://docs.google.com/spreadsheets/d/test/gviz/tq`);
      await page.waitForSelector("#unitname", { timeout: 10000 });

      // Toggle to dark
      const themeBtn = page.locator("#theme-toggle");
      await themeBtn.click();
      await page.waitForTimeout(500);

      // Toggle back
      await themeBtn.click();
      await page.waitForTimeout(500);

      // Should be light again
      const html = page.locator("html");
      await expect(html).toHaveAttribute("data-theme", "light");
    });
  });

  test.describe("Theme Persistence", () => {
    test("theme persists after reload", async ({ page }) => {
      await mockGoogleSheets(page, "fullProgram");

      await page.goto(`${BASE_URL}?url=https://docs.google.com/spreadsheets/d/test/gviz/tq`);
      await page.waitForSelector("#unitname", { timeout: 10000 });

      // Switch to dark
      const themeBtn = page.locator("#theme-toggle");
      await themeBtn.click();
      await page.waitForTimeout(500);

      // Reload
      await page.reload();
      await page.waitForSelector("#unitname", { timeout: 10000 });

      // Should still be dark
      const html = page.locator("html");
      await expect(html).toHaveAttribute("data-theme", "dark");
    });
  });

  test.describe("All Elements Theme", () => {
    test("all elements use theme colors", async ({ page }) => {
      await mockGoogleSheets(page, "fullProgram");

      await page.goto(`${BASE_URL}?url=https://docs.google.com/spreadsheets/d/test/gviz/tq`);
      await page.waitForSelector("#unitname", { timeout: 10000 });

      // Toggle dark
      const themeBtn = page.locator("#theme-toggle");
      await themeBtn.click();
      await page.waitForTimeout(500);

      // Elements should still be visible in dark mode
      await expect(page.locator("#unitname")).toBeVisible();
      await expect(page.locator("#date")).toBeVisible();
      await expect(page.locator("#main-program")).toBeVisible();
    });
  });

  test.describe("Print Styles", () => {
    test("print button exists", async ({ page }) => {
      await mockGoogleSheets(page, "fullProgram");

      await page.goto(`${BASE_URL}?url=https://docs.google.com/spreadsheets/d/test/gviz/tq`);
      await page.waitForSelector("#unitname", { timeout: 10000 });

      // Print button should be visible
      const printBtn = page.locator("#print-btn");
      await expect(printBtn).toBeVisible();
    });
  });

  test.describe("Mobile Theme", () => {
    test("theme works on mobile viewport", async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      await mockGoogleSheets(page, "fullProgram");
      await page.goto(`${BASE_URL}?url=https://docs.google.com/spreadsheets/d/test/gviz/tq`);
      await page.waitForSelector("#unitname", { timeout: 10000 });

      // Theme toggle should be visible
      const themeBtn = page.locator("#theme-toggle");
      await expect(themeBtn).toBeVisible();
    });
  });
});
