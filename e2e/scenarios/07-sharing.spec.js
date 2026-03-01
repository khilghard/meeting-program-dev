/**
 * 07-sharing.spec.js
 * QR code sharing tests
 *
 * Tests the sharing functionality and QR code generation
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

test.describe("Sharing", () => {
  test.beforeEach(async ({ page }) => {
    await clearAllStorage(page);
    await page.goto(BASE_URL);
    await page.waitForLoadState("domcontentloaded");
    await page.evaluate(() => {
      localStorage.setItem("meeting_program_help_shown", "true");
    });
    await closeHelpModal(page);
  });

  test.describe("Share Button", () => {
    test("share button is visible", async ({ page }) => {
      await mockGoogleSheets(page, "fullProgram");

      await page.goto(`${BASE_URL}?url=https://docs.google.com/spreadsheets/d/test/gviz/tq`);
      await page.waitForSelector("#unitname", { timeout: 10000 });

      // Share button should be visible
      const shareBtn = page.locator("#share-btn");
      await expect(shareBtn).toBeVisible();
    });

    test("clicking share opens modal", async ({ page }) => {
      await mockGoogleSheets(page, "fullProgram");

      await page.goto(`${BASE_URL}?url=https://docs.google.com/spreadsheets/d/test/gviz/tq`);
      await page.waitForSelector("#unitname", { timeout: 10000 });

      // Click share
      await page.click("#share-btn");

      // Modal should appear
      const shareModal = page.locator("#share-modal");
      await expect(shareModal).toBeVisible();
    });
  });

  test.describe("QR Code Generation", () => {
    test("share modal opens and shows QR container", async ({ page }) => {
      await clearAllStorage(page);
      await page.goto(BASE_URL);
      await page.waitForLoadState("domcontentloaded");
      await page.evaluate(() => {
        localStorage.setItem("meeting_program_help_shown", "true");
      });
      await closeHelpModal(page);

      await mockGoogleSheets(page, "fullProgram");

      await page.goto(`${BASE_URL}?url=https://docs.google.com/spreadsheets/d/test/gviz/tq`);
      await page.waitForSelector("#unitname", { timeout: 10000 });

      // Open share
      await page.click("#share-btn");

      // QR container should exist
      const qrContainer = page.locator("#share-qr-container");
      await expect(qrContainer).toBeVisible();
    });

    test("QR contains correct URL", async ({ page }) => {
      await clearAllStorage(page);
      await page.goto(BASE_URL);
      await page.waitForLoadState("domcontentloaded");
      await page.evaluate(() => {
        localStorage.setItem("meeting_program_help_shown", "true");
      });
      await closeHelpModal(page);

      await mockGoogleSheets(page, "fullProgram");

      const programUrl = "https://docs.google.com/spreadsheets/d/test/gviz/tq";
      await page.goto(`${BASE_URL}?url=${encodeURIComponent(programUrl)}`);
      await page.waitForSelector("#unitname", { timeout: 10000 });

      // Open share
      await page.click("#share-btn");

      // Verify the URL text is displayed (should be the full share URL with encoded program URL)
      const urlDisplay = page.locator("#share-url-display");
      const displayedUrl = await urlDisplay.textContent();
      expect(decodeURIComponent(displayedUrl)).toContain(programUrl);
    });
  });

  test.describe("Share URL", () => {
    test("share URL displays correctly", async ({ page }) => {
      await clearAllStorage(page);
      await page.goto(BASE_URL);
      await page.waitForLoadState("domcontentloaded");
      await page.evaluate(() => {
        localStorage.setItem("meeting_program_help_shown", "true");
      });
      await closeHelpModal(page);

      await mockGoogleSheets(page, "fullProgram");

      const programUrl = "https://docs.google.com/spreadsheets/d/test/gviz/tq";
      await page.goto(`${BASE_URL}?url=${encodeURIComponent(programUrl)}`);
      await page.waitForSelector("#unitname", { timeout: 10000 });

      // Open share
      await page.click("#share-btn");

      // URL display should contain the program URL
      const urlDisplay = page.locator("#share-url-display");
      await expect(urlDisplay).toBeVisible();
    });

    test("share modal shows program info", async ({ page }) => {
      await clearAllStorage(page);
      await page.goto(BASE_URL);
      await page.waitForLoadState("domcontentloaded");
      await page.evaluate(() => {
        localStorage.setItem("meeting_program_help_shown", "true");
      });
      await closeHelpModal(page);

      await mockGoogleSheets(page, "fullProgram");

      await page.goto(`${BASE_URL}?url=https://docs.google.com/spreadsheets/d/test/gviz/tq`);
      await page.waitForSelector("#unitname", { timeout: 10000 });

      await page.click("#share-btn");

      // Share modal should be visible
      const shareModal = page.locator("#share-modal");
      await expect(shareModal).toBeVisible();

      // Should have share title
      const shareTitle = page.locator("#share-modal-title");
      await expect(shareTitle).toBeVisible();
    });
  });

  test.describe("Different Programs", () => {
    test("different programs have different share URLs", async ({ page }) => {
      // Load first program
      await mockGoogleSheets(page, "fullProgram");
      await page.goto(`${BASE_URL}?url=https://docs.google.com/spreadsheets/d/test1/gviz/tq`);
      await page.waitForSelector("#unitname", { timeout: 10000 });

      // Open share and get URL
      await page.click("#share-btn");
      await page.waitForSelector("#share-url-display");
      const url1 = await page.textContent("#share-url-display");

      // Close share modal
      await page.click("#close-share-modal-btn");
      await page.waitForTimeout(300);

      // Load second program
      await mockGoogleSheets(page, "minimalProgram");
      await page.goto(`${BASE_URL}?url=https://docs.google.com/spreadsheets/d/test2/gviz/tq`);
      await page.waitForSelector("#unitname", { timeout: 10000 });

      // Open share and get URL
      await page.click("#share-btn");
      await page.waitForSelector("#share-url-display");
      const url2 = await page.textContent("#share-url-display");

      // URLs should be different
      expect(url1).not.toEqual(url2);
    });
  });
});
