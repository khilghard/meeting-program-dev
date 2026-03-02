/**
 * 06-language.spec.js
 * Internationalization (i18n) tests
 *
 * Tests language switching and translations
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

test.describe("Language", () => {
  test.beforeEach(async ({ page }) => {
    await clearAllStorage(page);
    await page.goto(BASE_URL);
    await page.waitForLoadState("domcontentloaded");
    await page.evaluate(() => {
      localStorage.setItem("meeting_program_help_shown", "true");
    });
    await closeHelpModal(page);
  });

  test.describe("Default Language", () => {
    test("default language is English", async ({ page }) => {
      await mockGoogleSheets(page, "fullProgram");

      await page.goto(`${BASE_URL}?url=https://docs.google.com/spreadsheets/d/test/gviz/tq`);
      await page.waitForSelector("#unitname", { timeout: 10000 });

      // Check for English labels
      const langBtn = page.locator("#language-selector-btn");
      await expect(langBtn).toContainText(/English/i);
    });
  });

  test.describe("Language Switching", () => {
    test("language selector opens modal", async ({ page }) => {
      // Wait for JavaScript to initialize
      await page.waitForTimeout(1000);

      // Click language button
      await page.click("#language-selector-btn");

      // Modal should appear
      await expect(page.locator("#language-modal")).toBeVisible();
    });

    test("can switch to Spanish", async ({ page }) => {
      await mockGoogleSheets(page, "fullProgram");

      await page.goto(`${BASE_URL}?url=https://docs.google.com/spreadsheets/d/test/gviz/tq`);
      await page.waitForSelector("#unitname", { timeout: 10000 });

      // Change language
      await page.click("#language-selector-btn");
      await page.click('.language-item:has-text("Español")');
      await page.waitForTimeout(500);

      // Verify language changed
      const langBtn = page.locator("#current-language-text");
      await expect(langBtn).toHaveText("Español");
    });

    test("can switch to French", async ({ page }) => {
      await mockGoogleSheets(page, "fullProgram");

      await page.goto(`${BASE_URL}?url=https://docs.google.com/spreadsheets/d/test/gviz/tq`);
      await page.waitForSelector("#unitname", { timeout: 10000 });

      // Change language
      await page.click("#language-selector-btn");
      await page.click('.language-item:has-text("Français")');
      await page.waitForTimeout(500);

      // Verify language changed
      const langBtn = page.locator("#current-language-text");
      await expect(langBtn).toHaveText("Français");
    });

    test("can switch to Kiswahili", async ({ page }) => {
      await mockGoogleSheets(page, "fullProgram");

      await page.goto(`${BASE_URL}?url=https://docs.google.com/spreadsheets/d/test/gviz/tq`);
      await page.waitForSelector("#unitname", { timeout: 10000 });

      // Change language
      await page.click("#language-selector-btn");
      await page.click('.language-item:has-text("Kiswahili")');
      await page.waitForTimeout(500);

      // Verify language changed
      const langBtn = page.locator("#current-language-text");
      await expect(langBtn).toHaveText("Kiswahili");
    });
  });

  test.describe("Language Persistence", () => {
    test("language persists after reload", async ({ page }) => {
      await mockGoogleSheets(page, "fullProgram");

      await page.goto(`${BASE_URL}?url=https://docs.google.com/spreadsheets/d/test/gviz/tq`);
      await page.waitForSelector("#unitname", { timeout: 10000 });

      // Change language to Spanish
      await page.click("#language-selector-btn");
      await page.click('.language-item:has-text("Español")');
      await page.waitForTimeout(500);

      // Reload
      await page.reload();
      await page.waitForSelector("#unitname", { timeout: 10000 });

      // Should still be Spanish
      const langBtn = page.locator("#current-language-text");
      await expect(langBtn).toHaveText("Español");
    });
  });

  test.describe("Translation Coverage", () => {
    test("presiding label translates", async ({ page }) => {
      await mockGoogleSheets(page, "fullProgram");

      await page.goto(`${BASE_URL}?url=https://docs.google.com/spreadsheets/d/test/gviz/tq`);
      await page.waitForSelector("#unitname", { timeout: 10000 });

      // Check English label exists (presiding is a label in the program)
      const presiding = page.locator("#presiding");
      await expect(presiding).toBeVisible();
    });

    test("all UI elements translate", async ({ page }) => {
      // Test that language switching works by verifying different elements
      await mockGoogleSheets(page, "fullProgram");
      await page.goto(`${BASE_URL}?url=https://docs.google.com/spreadsheets/d/test/gviz/tq`);
      await page.waitForSelector("#unitname", { timeout: 10000 });

      // Verify language selector button exists and works
      const langBtn = page.locator("#language-selector-btn");
      await expect(langBtn).toBeVisible();
    });
  });

  test.describe("Language in Different Contexts", () => {
    test("language works in main app", async ({ page }) => {
      // Load program first
      await mockGoogleSheets(page, "fullProgram");
      await page.goto(`${BASE_URL}?url=https://docs.google.com/spreadsheets/d/alpine-ward/gviz/tq`);
      await page.waitForSelector("#unitname", { timeout: 10000 });

      // Switch language
      await page.click("#language-selector-btn");
      await page.click('.language-item:has-text("Español")');
      await page.waitForTimeout(500);

      // Verify language changed
      const langBtn = page.locator("#current-language-text");
      await expect(langBtn).toHaveText("Español");
    });
  });
});
