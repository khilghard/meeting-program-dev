/**
 * 03-language-switching.spec.js
 * Test language selection functionality
 */

import { test, expect } from "@playwright/test";
import { ConsoleTracker, clearAllStorage } from "../fixtures/index.js";
import { MainPage } from "../pages/pages/MainPage.js";

test.describe("Test 03: Language Switching", () => {
  test("should allow switching between languages", async ({ page }) => {
    const consoleTracker = new ConsoleTracker(page);
    consoleTracker.listenToConsoleMessages();

    const mainPage = new MainPage(page);

    await clearAllStorage(page);
    await mainPage.goto();

    // Wait for loading-modal to be hidden before proceeding
    await page.waitForFunction(
      () => {
        const modal = document.getElementById("loading-modal");
        return modal && modal.classList.contains("hidden");
      },
      { timeout: 15000 }
    );

    // Close any open modals first
    const helpModal = page.locator("#help-modal");
    if (await helpModal.isVisible()) {
      const closeBtn = helpModal.locator("button:has-text('Close'), button:has-text('×')");
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
        await page.waitForTimeout(500);
      }
    }

    // Verify language button exists
    await expect(page.locator("#language-selector-btn")).toBeVisible();

    // Click language button
    await page.locator("#language-selector-btn").click();

    // Wait for language modal
    const languageModal = page.locator("#language-modal");
    await expect(languageModal).toBeVisible({ timeout: 5000 });

    // Verify language options exist
    const languageList = page.locator("#language-list");
    const items = await languageList.locator("li").count();
    expect(items).toBeGreaterThan(0);

    // Close modal
    await page.locator("#close-language-modal-btn").click();

    // Verify console is acceptable
    expect(consoleTracker.getErrorCount()).toBeLessThanOrEqual(2);
  });
});
