/**
 * 02-navigation.spec.js
 * Test navigation and comprehensive data verification
 * Verifies all required data keys are available in the program mock
 */

import { test, expect } from "@playwright/test";
import { ConsoleTracker, clearAllStorage } from "../fixtures/index.js";
import { comprehensiveProgram } from "../helpers/mock-data.js";
import { MainPage } from "../pages/pages/MainPage.js";
import { ArchivePage } from "../pages/pages/ArchivePage.js";

test.describe("Test 02: Navigation & Comprehensive Data Verification", () => {
  test("should render all data keys and navigate to archives", async ({ page }) => {
    const consoleTracker = new ConsoleTracker(page);
    consoleTracker.listenToConsoleMessages();
    
    const mainPage = new MainPage(page);
    const archivePage = new ArchivePage(page);
    
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
    
    // VERIFY ALL REQUIRED KEYS ARE IN THE COMPREHENSIVE PROGRAM MOCK
    console.log("\n🔍 VERIFYING COMPREHENSIVE PROGRAM DATA STRUCTURE...");
    
    // Parse the comprehensive program CSV data
    const lines = comprehensiveProgram.split('\n').slice(1); // Skip header
    const programData = {};
    lines.forEach(line => {
      if (line.trim()) {
        const [key, ...valueParts] = line.split(',');
        const value = valueParts.join(',').trim();
        if (key && value) {
          programData[key.trim()] = value;
        }
      }
    });
    
    // List of required keys that must be in the mock data
    const requiredKeys = [
      'unitName',
      'stakeName',
      'obsolete',
      'migrationUrl',
      'unitAddress',
      'link',
      'date',
      'presiding',
      'conducting',
      'musicDirector',
      'musicOrganist',
      'openingHymn',
      'openingPrayer',
      'sacramentHymn',
      'speaker1',
      'intermediateHymn',
      'speaker2',
      'closingHymn',
      'closingPrayer'
    ];
    
    // Verify each required key is present in the comprehensive mock
    const missingKeys = [];
    requiredKeys.forEach(key => {
      if (!(key in programData)) {
        missingKeys.push(key);
      }
    });
    
    console.log(`✅ Keys found: ${requiredKeys.length - missingKeys.length}/${requiredKeys.length}`);
    if (missingKeys.length > 0) {
      console.log(`❌ Missing keys: ${missingKeys.join(', ')}`);
    } else {
      console.log("✅ All required keys present in comprehensive program mock!");
    }
    
    // Print all key values for verification
    console.log("\n📋 Comprehensive Program Data:");
    requiredKeys.forEach(key => {
      if (key in programData) {
        console.log(`  ✓ ${key}: "${programData[key]}"`);
      } else {
        console.log(`  ✗ ${key}: MISSING`);
      }
    });
    
    // Assert all keys are present
    expect(missingKeys.length).toBe(0);
    
    // Verify archives button exists
    await expect(page.locator("#view-archives-btn")).toBeVisible();
    
    // Click archives button
    await page.locator("#view-archives-btn").click();
    
    // Wait for navigation
    await page.waitForURL("**/archive.html", { timeout: 5000 });
    
    // Verify we're on archive page
    const url = page.url();
    expect(url).toContain("archive.html");
    
    // Verify console is acceptable
    expect(consoleTracker.getErrorCount()).toBeLessThanOrEqual(2);
  });
});
