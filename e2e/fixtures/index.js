/**
 * fixtures/index.js
 * Reusable test fixtures for E2E testing
 */

import { test as base, expect } from "@playwright/test";
import {
  mockGoogleSheets,
  mockGoogleSheetsMultiple,
  mockGoogleSheetsWithData,
  mockGoogleSheetsError,
  mockGoogleSheetsTimeout
} from "../helpers/mock-sheets.js";
import {
  mockQRCodeScan,
  enableQRMock,
  mockGetUserMedia,
  startQRScanner
} from "../helpers/mock-qr.js";
import {
  fullProgram,
  week1WardA,
  week2WardA,
  wardB,
  week1WardB,
  minimalProgram,
  DB_NAME
} from "../helpers/mock-data.js";
import { ConsoleTracker } from "../helpers/console-tracker.js";
import { injectV211Storage } from "./data/v211-localstorage.js";

const BASE_URL = "http://localhost:8000/meeting-program/";

/**
 * Base fixture - provides a page and handles basic navigation
 */
const baseFixture = {
  page: async ({ page }, use) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState("domcontentloaded");

    // Wait a bit for any scripts to initialize
    await page.waitForTimeout(500);

    // Close help modal if visible (first visit)
    try {
      const helpModal = page.locator("#help-modal");
      if (await helpModal.isVisible({ timeout: 2000 })) {
        await page.click("#close-help-modal-btn");
        await page.waitForTimeout(300);
      }
    } catch (e) {
      // Ignore if modal not present
    }

    await use(page);
  }
};

/**
 * Clear all storage - IndexedDB and localStorage
 */
async function clearAllStorage(page) {
  try {
    await page.evaluate(() => {
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch (e) {
        // localStorage might not be available
      }
    });

    // Clear IndexedDB
    await page.evaluate(() => {
      return new Promise((resolve) => {
        try {
          const databases = indexedDB.databases();
          databases
            .then((dbs) => {
              dbs.forEach((db) => {
                if (db.name) {
                  indexedDB.deleteDatabase(db.name);
                }
              });
              resolve();
            })
            .catch(() => resolve());
        } catch (e) {
          resolve();
        }
      });
    });
  } catch (e) {
    // Ignore errors during cleanup
  }

  // Wait a bit for IndexedDB to clear
  await page.waitForTimeout(100);
}

/**
 * Fixture: No program loaded (zero state)
 * Fresh install - no profiles exist
 */
const noProgramLoadedFixture = {
  ...baseFixture,
  storage: async ({ page }, use) => {
    await clearAllStorage(page);
    await page.reload();
    await page.waitForLoadState("load");

    // Close help modal if visible
    try {
      const helpModal = page.locator("#help-modal");
      if (await helpModal.isVisible({ timeout: 1000 })) {
        await page.click("#close-help-modal-btn");
      }
    } catch (e) {
      // Ignore
    }

    await use({});

    // Cleanup after test
    await clearAllStorage(page);
  }
};

/**
 * Fixture: Full program loaded
 * A complete program is loaded and displayed
 */
const withFullProgramFixture = {
  ...baseFixture,
  storage: async ({ page }, use) => {
    await clearAllStorage(page);

    // Mock Google Sheets and navigate to program URL
    await mockGoogleSheets(page, "fullProgram");
    await page.goto(
      `${BASE_URL}?url=https://docs.google.com/spreadsheets/d/alpine-ward-2026-02-15/gviz/tq`
    );
    await page.waitForSelector("#unitname", { timeout: 10000 });

    // Close help modal if visible
    try {
      const helpModal = page.locator("#help-modal");
      if (await helpModal.isVisible({ timeout: 1000 })) {
        await page.click("#close-help-modal-btn");
      }
    } catch (e) {
      // Ignore
    }

    await use({});

    await clearAllStorage(page);
  }
};

/**
 * Fixture: Two programs loaded
 * Week 1 is archived, week 2 is active
 */
const withTwoProgramsFixture = {
  ...baseFixture,
  storage: async ({ page }, use) => {
    await clearAllStorage(page);

    // First, load week 1
    await mockGoogleSheets(page, "week1WardA");
    await page.goto(
      `${BASE_URL}?url=https://docs.google.com/spreadsheets/d/alpha-ward-week1/gviz/tq`
    );
    await page.waitForSelector("#unitname", { timeout: 10000 });

    // Archive week 1
    await page.click("#view-archives-btn");
    await page.waitForSelector("#archive-title", { timeout: 5000 });
    await page.click("#archive-current-btn");
    await page.waitForTimeout(500);

    // Now load week 2 (replaces week 1 in UI, but week 1 is archived)
    await mockGoogleSheets(page, "week2WardA");
    await page.goto(
      `${BASE_URL}?url=https://docs.google.com/spreadsheets/d/alpha-ward-week2/gviz/tq`
    );
    await page.waitForSelector("#unitname", { timeout: 10000 });

    // Close help modal if visible
    try {
      const helpModal = page.locator("#help-modal");
      if (await helpModal.isVisible({ timeout: 1000 })) {
        await page.click("#close-help-modal-btn");
      }
    } catch (e) {
      // Ignore
    }

    await use({});

    await clearAllStorage(page);
  }
};

/**
 * Fixture: Ready to scan
 * Camera is available, scanner can be opened
 */
const withScanningFixture = {
  ...baseFixture,
  storage: async ({ page }, use) => {
    await clearAllStorage(page);
    await page.reload();
    await page.waitForLoadState("load");

    // Close help modal if visible
    try {
      const helpModal = page.locator("#help-modal");
      if (await helpModal.isVisible({ timeout: 1000 })) {
        await page.click("#close-help-modal-btn");
      }
    } catch (e) {
      // Ignore
    }

    // Mock camera
    await mockGetUserMedia(page);

    await use({});

    await clearAllStorage(page);
  }
};

/**
 * Fixture: With specific language
 */
const withLanguageFixture = (langCode) => ({
  ...baseFixture,
  storage: async ({ page }, use) => {
    await clearAllStorage(page);

    // Set language preference
    await page.evaluate((lang) => {
      localStorage.setItem("meeting_program_language", lang);
    }, langCode);

    await mockGoogleSheets(page, "fullProgram");
    await page.goto(
      `${BASE_URL}?url=https://docs.google.com/spreadsheets/d/alpine-ward-2026-02-15/gviz/tq`
    );
    await page.waitForSelector("#unitname", { timeout: 10000 });

    await use({});

    await clearAllStorage(page);
  }
});

/**
 * Fixture: With specific theme
 */
const withThemeFixture = (themeName) => ({
  ...baseFixture,
  storage: async ({ page }, use) => {
    await clearAllStorage(page);

    // Set theme preference
    await page.evaluate((theme) => {
      localStorage.setItem("meeting_program_theme", theme);
    }, themeName);

    await mockGoogleSheets(page, "fullProgram");
    await page.goto(
      `${BASE_URL}?url=https://docs.google.com/spreadsheets/d/alpine-ward-2026-02-15/gviz/tq`
    );
    await page.waitForSelector("#unitname", { timeout: 10000 });

    await use({});

    await clearAllStorage(page);
  }
});

/**
 * Fixture: Offline network simulation
 */
const withOfflineNetworkFixture = {
  ...baseFixture,
  storage: async ({ page }, use) => {
    await clearAllStorage(page);

    // First load program
    await mockGoogleSheets(page, "fullProgram");
    await page.goto(
      `${BASE_URL}?url=https://docs.google.com/spreadsheets/d/alpine-ward-2026-02-15/gviz/tq`
    );
    await page.waitForSelector("#unitname", { timeout: 10000 });

    // Now go offline
    await page.context().setOffline(true);

    await use({});

    // Cleanup
    await page.context().setOffline(false);
    await clearAllStorage(page);
  }
};

/**
 * Fixture: Multiple archived programs
 */
const withArchivedProgramsFixture = {
  ...baseFixture,
  storage: async ({ page }, use) => {
    await clearAllStorage(page);

    // Load and archive multiple weeks
    const weeks = [
      { name: "week1WardA", url: "alpha-ward-week1" },
      { name: "week1WardB", url: "beta-ward-week1" }
    ];

    for (const week of weeks) {
      await mockGoogleSheets(page, week.name);
      await page.goto(`${BASE_URL}?url=https://docs.google.com/spreadsheets/d/${week.url}/gviz/tq`);
      await page.waitForSelector("#unitname", { timeout: 10000 });

      // Archive
      await page.click("#view-archives-btn");
      await page.waitForSelector("#archive-title", { timeout: 5000 });
      await page.click("#archive-current-btn");
      await page.waitForTimeout(500);
    }

    await use({});

    await clearAllStorage(page);
  }
};

/**
 * Fixture: With migration available
 */
const withMigrationAvailableFixture = {
  ...baseFixture,
  storage: async ({ page }, use) => {
    await clearAllStorage(page);

    // Mock obsolete program and migration program
    await mockGoogleSheetsMultiple(page, {
      "old-ward": `key,value
unitName,Old Ward
date,2025-01-01
obsolete,true
migrationUrl,https://docs.google.com/spreadsheets/d/new-ward/gviz/tq`,
      "new-ward": `key,value
unitName,New Ward
date,2026-02-15
openingHymn,#1 The Morning Breaks`
    });

    await page.goto(`${BASE_URL}?url=https://docs.google.com/spreadsheets/d/old-ward/gviz/tq`);
    await page.waitForTimeout(2000);

    await use({});

    await clearAllStorage(page);
  }
};

/**
 * Fixture: v211 Migration state
 * Pre-loads realistic 2.1.1 user data for migration testing
 */
const withV211MigrationFixture = {
  ...baseFixture,
  storage: async ({ page }, use) => {
    await clearAllStorage(page);
    
    // Inject v211 data
    await injectV211Storage(page);
    
    // Reload to let app detect the state
    await page.reload();
    await page.waitForLoadState("load");
    
    // Close help modal if visible
    try {
      const helpModal = page.locator("#help-modal");
      if (await helpModal.isVisible({ timeout: 1000 })) {
        await page.click("#close-help-modal-btn");
      }
    } catch (e) {
      // Ignore
    }

    await page.waitForTimeout(1000);
    await use({});

    await clearAllStorage(page);
  }
};

/**
 * Fixture: Console tracking
 * Enables automatic console error/warning tracking for hybrid validation
 */
const withConsoleTrackingFixture = {
  consoleTracker: async ({ page }, use) => {
    const tracker = new ConsoleTracker(page);
    tracker.listenToConsoleMessages();
    
    // Allow tests to ignore known safe patterns
    tracker.ignorePattern("Non-Error promise rejection caught");
    
    await use(tracker);
  }
};

// Create the test fixture with all extensions
export const test = base.extend({
  ...baseFixture,
  ...withConsoleTrackingFixture
});

// Export parameterized fixtures
export const withFullProgram = test.extend(withFullProgramFixture);
export const withTwoPrograms = test.extend(withTwoProgramsFixture);
export const noProgramLoaded = test.extend(noProgramLoadedFixture);
export const withScanning = test.extend(withScanningFixture);
export const withLanguage = (lang) => test.extend(withLanguageFixture(lang));
export const withTheme = (theme) => test.extend(withThemeFixture(theme));
export const withOfflineNetwork = test.extend(withOfflineNetworkFixture);
export const withArchivedPrograms = test.extend(withArchivedProgramsFixture);
export const withMigrationAvailable = test.extend(withMigrationAvailableFixture);
export const withV211Migration = test.extend(withV211MigrationFixture);
export const withConsoleTracking = test.extend(withConsoleTrackingFixture);

// Re-export helpers for use in tests
export {
  mockGoogleSheets,
  mockGoogleSheetsMultiple,
  mockGoogleSheetsWithData,
  mockGoogleSheetsError,
  mockGoogleSheetsTimeout,
  mockQRCodeScan,
  enableQRMock,
  mockGetUserMedia,
  startQRScanner,
  clearAllStorage,
  ConsoleTracker,
  expect
};

// Export BASE_URL for direct navigation
export { BASE_URL };
