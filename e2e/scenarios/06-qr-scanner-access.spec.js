/**
 * 06-qr-scanner-access.spec.js
 * Test QR scanner button access
 */

import { test, expect } from "@playwright/test";
import { ConsoleTracker, clearAllStorage } from "../fixtures/index.js";
import { MainPage } from "../pages/pages/MainPage.js";

test.describe("Test 06: QR Scanner Access", () => {
  test("should allow opening QR scanner modal", async ({ page }) => {
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

    // Verify QR button exists and is visible
    const qrButton = page.locator("#qr-action-btn");
    await expect(qrButton).toBeVisible();

    // Check button has text content
    const buttonText = await qrButton.textContent();
    expect(buttonText?.length).toBeGreaterThan(0);

    // Mock camera before clicking
    await page.evaluate(() => {
      navigator.mediaDevices.getUserMedia = async () => {
        const canvas = document.createElement("canvas");
        const stream = canvas.captureStream();
        return stream;
      };
    });

    // Click QR button
    await qrButton.click();
    await page.waitForTimeout(500);

    // Verify QR scanner section becomes visible
    const qrScanner = page.locator("#qr-scanner");
    const isVisible = await qrScanner.isVisible().catch(() => false);
    expect(isVisible).toBeTruthy();

    // Verify console is acceptable
    expect(consoleTracker.getErrorCount()).toBeLessThanOrEqual(2);
  });
});
