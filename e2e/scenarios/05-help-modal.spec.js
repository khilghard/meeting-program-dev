/**
 * 05-help-modal.spec.js
 * Test help modal functionality
 */

import { test, expect } from "@playwright/test";
import { ConsoleTracker, clearAllStorage } from "../fixtures/index.js";
import { MainPage } from "../pages/pages/MainPage.js";

test.describe("Test 05: Help Modal", () => {
  test("should open and close help modal", async ({ page }) => {
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
    const openHelpModal = page.locator("#help-modal");
    if (await openHelpModal.isVisible()) {
      const closeBtn = openHelpModal.locator("button:has-text('Close'), button:has-text('×')");
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
        await page.waitForTimeout(500);
      }
    }

    // Verify help button visible
    await expect(page.locator("#help-btn")).toBeVisible();

    // Click help button
    await page.locator("#help-btn").click();

    // Wait for help modal
    const helpModal = page.locator("#help-modal");
    await expect(helpModal).toBeVisible({ timeout: 5000 });

    // Verify modal has content
    const modalTitle = page.locator("#help-modal-title");
    await expect(modalTitle).toBeVisible();

    // Close modal
    const closeBtn = page.locator("#close-help-modal-btn");
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
      await page.waitForTimeout(300);
    }

    // Verify console is acceptable
    expect(consoleTracker.getErrorCount()).toBeLessThanOrEqual(2);
  });
});
