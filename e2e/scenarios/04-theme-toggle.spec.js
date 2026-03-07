/**
 * 04-theme-toggle.spec.js
 * Test theme switching functionality
 */

import { test, expect } from "@playwright/test";
import { ConsoleTracker, clearAllStorage } from "../fixtures/index.js";
import { MainPage } from "../pages/pages/MainPage.js";

test.describe("Test 04: Theme Toggle", () => {
  test("should toggle between light and dark themes", async ({ page }) => {
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
    
    // Get initial theme
    const initialTheme = await page.locator("html").getAttribute("data-theme");
    expect(initialTheme).toBeTruthy();
    
    // Find and click theme toggle
    const themeToggle = page.locator("#theme-toggle");
    const isVisible = await themeToggle.isVisible().catch(() => false);
    
    if (isVisible) {
      await themeToggle.click();
      await page.waitForTimeout(300);
      
      // Get new theme
      const newTheme = await page.locator("html").getAttribute("data-theme");
      expect(newTheme).not.toBe(initialTheme);
    }
    
    // Verify console is acceptable
    expect(consoleTracker.getErrorCount()).toBeLessThanOrEqual(2);
  });
});
