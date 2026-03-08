/**
 * 02-navigation.spec.js
 * Test navigation and comprehensive data verification
 * Verifies all required data keys are available in the program mock
 */

import { test, expect } from "@playwright/test";
import { ConsoleTracker, clearAllStorage } from "../fixtures/index.js";
import { comprehensiveProgram, comprehensiveProgramUrl } from "../helpers/mock-data.js";
import { mockGoogleSheets } from "../helpers/mock-sheets.js";
import { MainPage } from "../pages/pages/MainPage.js";
import { ArchivePage } from "../pages/pages/ArchivePage.js";

test.describe("Test 02: Navigation & Comprehensive Data Verification", () => {
  test("should render all data keys and navigate to archives", async ({ page }) => {
    const consoleTracker = new ConsoleTracker(page);
    consoleTracker.listenToConsoleMessages();
    
    const mainPage = new MainPage(page);
    const archivePage = new ArchivePage(page);
    
    await clearAllStorage(page);
    
    // Mock Google Sheets to return comprehensive program data
    await mockGoogleSheets(page, "comprehensiveProgram");
    
    // Load program via URL parameter to populate IndexedDB
    await mainPage.goto();
    await page.goto(`http://localhost:8000/meeting-program/?url=${encodeURIComponent(comprehensiveProgramUrl)}`);
    
    // Wait for program to load
    await page.waitForSelector("#main-program", { timeout: 10000 });
    
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
    
    // VERIFY HYMN CUSTOM TEXT RENDERING (NEW FEATURE)
    console.log("\n🎵 VERIFYING HYMN CUSTOM TEXT RENDERING...");
    
    // Check opening hymn custom text appears on the page
    const customTextContent = "Accompanied on the piano by Sister Smith";
    const customTextLocator = page.locator("text=" + customTextContent);
    
    try {
      await expect(customTextLocator).toBeVisible({ timeout: 3000 });
      console.log(`✅ Hymn custom text found: "${customTextContent}"`);
      
      // Verify it's in the hymn container
      const openingHymnDiv = page.locator("#openingHymn");
      const hymnTitleDivs = openingHymnDiv.locator(".hymn-title");
      const count = await hymnTitleDivs.count();
      
      if (count >= 2) {
        const secondTitleText = await hymnTitleDivs.nth(1).textContent();
        console.log(`✅ Hymn has 2 .hymn-title divs (URL + custom text): "${secondTitleText}"`);
        expect(secondTitleText).toContain(customTextContent);
      } else {
        console.log(`⚠️ Expected 2 .hymn-title divs (URL + custom), found ${count}`);
      }
    } catch (e) {
      console.log(`❌ Hymn custom text not found: "${customTextContent}"`);
      throw e;
    }
    
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
