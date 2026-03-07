/**
 * 01-migration-login.spec.js
 * Test Case #1: Basic App Initialization
 * 
 * Flow:
 * - Load app and verify it initializes properly
 * - Verify UI elements are visible and interactive
 */

import { test, expect } from "@playwright/test";
import { clearAllStorage, ConsoleTracker } from "../fixtures/index.js";
import { MainPage } from "../pages/pages/MainPage.js";

test.describe("Test 01: App Loads Successfully", () => {
  test("should load the app and make UI interactive", async ({ page }) => {
    // Set up console tracking
    const consoleTracker = new ConsoleTracker(page);
    consoleTracker.listenToConsoleMessages();
    consoleTracker.reset();

    const mainPage = new MainPage(page);

    // Clear storage (fresh start)
    await clearAllStorage(page);

    // Navigate to app
    await mainPage.goto();

    // Verify page loaded
    await expect(page).toHaveTitle(/meeting program|program/i);
    
    // Wait for header to become visible (JS removes .hidden class)
    await page.waitForFunction(
      () => {
        const header = document.getElementById("program-header");
        return header && !header.classList.contains("hidden");
      },
      { timeout: 10000 }
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
    
    await page.waitForTimeout(500);
    
    // Verify QR button is visible and functional
    await expect(page.locator("#qr-action-btn")).toBeVisible();
    
    // Verify view archives button exists
    await expect(page.locator("#view-archives-btn")).toBeVisible();
    
    // Verify help button exists
    await expect(page.locator("#help-btn")).toBeVisible();

    // Verify console error count is acceptable
    const errors = consoleTracker.getErrorCount();
    expect(errors).toBeLessThanOrEqual(2);
  });
});
