/**
 * 07-manage-profiles.spec.js
 * Test profile management functionality
 */

import { test, expect } from "@playwright/test";
import { ConsoleTracker, clearAllStorage } from "../fixtures/index.js";
import { MainPage } from "../pages/pages/MainPage.js";

test.describe("Test 07: Profile Management", () => {
  test("should open manage profiles modal", async ({ page }) => {
    const consoleTracker = new ConsoleTracker(page);
    consoleTracker.listenToConsoleMessages();
    
    const mainPage = new MainPage(page);
    
    await clearAllStorage(page);
    await mainPage.goto();
    
    // Wait for app to initialize
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
    
    // Verify manage profiles button exists
    const manageBtn = page.locator("#manage-profiles-btn");
    await expect(manageBtn).toBeVisible();
    
    // Click manage profiles button
    await manageBtn.click();
    
    // Wait for modal to appear
    const modal = page.locator("#manage-profiles-modal");
    await expect(modal).toBeVisible({ timeout: 5000 });
    
    // Verify modal has expected content
    const title = page.locator("#manage-profiles-title");
    await expect(title).toBeVisible();
    
    // Verify close button exists
    const closeBtn = page.locator("#close-modal-btn");
    await expect(closeBtn).toBeVisible();
    
    // Close modal
    await closeBtn.click();
    await page.waitForTimeout(300);
    
    // Verify modal is closed
    const isVisible = await modal.isVisible().catch(() => false);
    expect(isVisible).toBeFalsy();
    
    // Verify console is acceptable
    expect(consoleTracker.getErrorCount()).toBeLessThanOrEqual(2);
  });
});
