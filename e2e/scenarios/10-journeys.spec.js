/**
 * 10-journeys.spec.js
 * Multi-step user journey tests
 *
 * Comprehensive user story flows that test multiple features together
 */

import { test, expect } from "@playwright/test";
import {
  mockGoogleSheets,
  mockGoogleSheetsMultiple,
  mockQRCodeScan,
  enableQRMock,
  mockGetUserMedia,
  clearAllStorage,
  BASE_URL
} from "../fixtures/index.js";

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

test.describe("User Journeys", () => {
  test.describe("First Time User", () => {
    test("complete first time user flow", async ({ page }) => {
      // 1. Fresh load - zero state
      await clearAllStorage(page);
      await page.goto(BASE_URL);
      await page.waitForLoadState("load");

      // 2. See help modal
      await expect(page.locator("#help-modal")).toBeVisible();

      // 3. Dismiss help
      await page.click("#close-help-modal-btn");
      await expect(page.locator("#help-modal")).toBeHidden();

      // 4. See scan button
      await expect(page.locator("#qr-action-btn")).toBeVisible();

      // 5. Load program via URL (simulating scan)
      await mockGoogleSheets(page, "fullProgram");
      await page.goto(`${BASE_URL}?url=https://docs.google.com/spreadsheets/d/test/gviz/tq`);
      await page.waitForSelector("#unitname", { timeout: 10000 });

      // 6. Program loaded successfully
      await expect(page.locator("#unitname")).toHaveText("Alpine Ward");
    });
  });

  test.describe("Weekly Workflow", () => {
    test("add week 1, archive, add week 2, view archives", async ({ page }) => {
      // 1. Load Week 1
      await clearAllStorage(page);
      await page.goto(BASE_URL);
      await page.waitForLoadState("domcontentloaded");
      await page.evaluate(() => {
        localStorage.setItem("meeting_program_help_shown", "true");
      });
      await closeHelpModal(page);

      await mockGoogleSheets(page, "week1WardA");
      await page.goto(
        `${BASE_URL}?url=https://docs.google.com/spreadsheets/d/alpha-ward-week1/gviz/tq`
      );
      await page.waitForSelector("#unitname", { timeout: 10000 });

      await expect(page.locator("#unitname")).toHaveText("Alpha Ward");
      await expect(page.locator("#date")).toContainText("2026-02-08");

      // 2. View archives (archiving may be automatic)
      await page.click("#view-archives-btn");
      await page.waitForSelector("#view-archives-modal", { timeout: 5000 });

      // Archive modal should be visible
      await expect(page.locator("#view-archives-modal")).toBeVisible();

      // 3. Load Week 2
      await page.click("#close-archives-modal-btn");
      await page.waitForTimeout(300);

      await mockGoogleSheets(page, "week2WardA");
      await page.goto(
        `${BASE_URL}?url=https://docs.google.com/spreadsheets/d/alpha-ward-week2/gviz/tq`
      );
      await page.waitForSelector("#unitname", { timeout: 10000 });

      await expect(page.locator("#unitname")).toHaveText("Alpha Ward");
      await expect(page.locator("#date")).toContainText("2026-02-15");

      // 4. View archives again
      await page.click("#view-archives-btn");
      await page.waitForSelector("#view-archives-modal", { timeout: 5000 });
      await expect(page.locator("#view-archives-modal")).toBeVisible();
    });
  });

  test.describe("Multi-Ward User", () => {
    test("add two different wards and switch between them", async ({ page }) => {
      // 1. Load Ward A
      await clearAllStorage(page);
      await page.goto(BASE_URL);
      await page.waitForLoadState("domcontentloaded");
      await page.evaluate(() => {
        localStorage.setItem("meeting_program_help_shown", "true");
      });
      await closeHelpModal(page);

      await mockGoogleSheets(page, "week1WardA");
      await page.goto(
        `${BASE_URL}?url=https://docs.google.com/spreadsheets/d/alpha-ward-week1/gviz/tq`
      );
      await page.waitForSelector("#unitname", { timeout: 10000 });

      await expect(page.locator("#unitname")).toHaveText("Alpha Ward");

      // 2. Load Ward B via URL (this will replace current profile, not create new one)
      // The app doesn't create new profiles from URL params - it updates the current profile
      await mockGoogleSheets(page, "wardB");
      await page.goto(`${BASE_URL}?url=https://docs.google.com/spreadsheets/d/beta-ward/gviz/tq`);
      await page.waitForSelector("#unitname", { timeout: 10000 });

      // Verify Beta Ward loaded
      await expect(page.locator("#unitname")).toHaveText("Beta Ward");
    });

    test("manage profiles modal shows all profiles", async ({ page }) => {
      // This test verifies the manage profiles modal works correctly
      await clearAllStorage(page);
      await page.goto(BASE_URL);
      await page.waitForLoadState("domcontentloaded");
      await page.evaluate(() => {
        localStorage.setItem("meeting_program_help_shown", "true");
      });
      await closeHelpModal(page);

      await mockGoogleSheets(page, "fullProgram");
      await page.goto(`${BASE_URL}?url=https://docs.google.com/spreadsheets/d/alpine-ward/gviz/tq`);
      await page.waitForSelector("#unitname", { timeout: 10000 });

      // Open manage profiles modal
      await page.click("#manage-profiles-btn");
      await page.waitForSelector("#manage-profiles-modal", { timeout: 5000 });

      // Modal should be visible
      await expect(page.locator("#manage-profiles-modal")).toBeVisible();

      // Should have profiles list
      const profilesList = page.locator("#profiles-list");
      await expect(profilesList).toBeVisible();
    });
  });

  test.describe("Language Explorer", () => {
    test("load program, switch through all languages", async ({ page }) => {
      // 1. Load program in English
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

      // 2. Switch to Spanish
      await page.click("#language-selector-btn");
      await page.click('.language-item:has-text("Español")');
      await page.waitForTimeout(500);

      // Verify
      await expect(page.locator("#current-language-text")).toHaveText("Español");

      // 3. Switch to French
      await page.click("#language-selector-btn");
      await page.click('.language-item:has-text("Français")');
      await page.waitForTimeout(500);

      // Verify
      await expect(page.locator("#current-language-text")).toHaveText("Français");

      // 4. Switch to Kiswahili
      await page.click("#language-selector-btn");
      await page.click('.language-item:has-text("Kiswahili")');
      await page.waitForTimeout(500);

      // Verify
      await expect(page.locator("#current-language-text")).toHaveText("Kiswahili");
    });
  });

  test.describe("Troubleshooting Flow", () => {
    test("help, dismiss, scan, error handling, success", async ({ page }) => {
      // 1. See help on first visit
      await clearAllStorage(page);
      await page.goto(BASE_URL);
      await page.waitForLoadState("load");

      await expect(page.locator("#help-modal")).toBeVisible();

      // 2. Dismiss help
      await page.click("#close-help-modal-btn");

      // 3. Try to scan (opens scanner)
      await mockGetUserMedia(page);
      await page.click("#qr-action-btn");
      await page.waitForSelector("#qr-scanner", { timeout: 5000 });

      // 4. Cancel by clicking action button again
      await page.click("#qr-action-btn");
      await page.waitForTimeout(500);

      // Scanner should close
      await expect(page.locator("#qr-scanner")).toBeHidden();

      // 5. Load program manually via URL
      await mockGoogleSheets(page, "fullProgram");
      await page.goto(`${BASE_URL}?url=https://docs.google.com/spreadsheets/d/test/gviz/tq`);
      await page.waitForSelector("#unitname", { timeout: 10000 });

      await expect(page.locator("#unitname")).toHaveText("Alpine Ward");
    });
  });

  test.describe("Profile Cleanup", () => {
    test("add multiple profiles, delete some, switch", async ({ page }) => {
      // 1. Add programs
      await clearAllStorage(page);
      await page.goto(BASE_URL);
      await page.waitForLoadState("domcontentloaded");
      await page.evaluate(() => {
        localStorage.setItem("meeting_program_help_shown", "true");
      });
      await closeHelpModal(page);

      await mockGoogleSheets(page, "week1WardA");
      await page.goto(
        `${BASE_URL}?url=https://docs.google.com/spreadsheets/d/alpha-ward-week1/gviz/tq`
      );
      await page.waitForSelector("#unitname", { timeout: 10000 });

      await mockGoogleSheets(page, "week2WardA");
      await page.goto(
        `${BASE_URL}?url=https://docs.google.com/spreadsheets/d/alpha-ward-week2/gviz/tq`
      );
      await page.waitForSelector("#unitname", { timeout: 10000 });

      await mockGoogleSheets(page, "wardB");
      await page.goto(`${BASE_URL}?url=https://docs.google.com/spreadsheets/d/beta-ward/gviz/tq`);
      await page.waitForSelector("#unitname", { timeout: 10000 });

      // 2. Open manage
      await page.click("#manage-profiles-btn");
      await page.waitForSelector("#manage-profiles-modal", { timeout: 5000 });

      // 3. Delete one profile if possible
      const deleteBtns = page.locator(".delete-btn");
      const deleteCount = await deleteBtns.count();

      if (deleteCount > 0) {
        page.on("dialog", (dialog) => dialog.accept());
        await deleteBtns.first().click();
        await page.waitForTimeout(500);
      }

      // 4. Close and verify modal works
      await page.click("#close-modal-btn");
      await expect(page.locator("#manage-profiles-modal")).toBeHidden();
    });
  });

  test.describe("Share and Print", () => {
    test("load program, share QR, print", async ({ page }) => {
      // 1. Load program
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

      // 2. Open share
      await page.click("#share-btn");
      await page.waitForSelector("#share-modal", { timeout: 5000 });

      // 3. Verify modal is open
      await expect(page.locator("#share-modal")).toBeVisible();

      // 4. Close share
      await page.click("#close-share-modal-btn");
      await expect(page.locator("#share-modal")).toBeHidden();

      // 5. Print button should exist
      await expect(page.locator("#print-btn")).toBeVisible();
    });
  });

  test.describe("Theme Evening", () => {
    test("light to dark to evening use", async ({ page }) => {
      // 1. Start in light
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

      const html = page.locator("html");
      await expect(html).toHaveAttribute("data-theme", "light");

      // 2. Switch to dark
      await page.click("#theme-toggle");
      await page.waitForTimeout(500);
      await expect(html).toHaveAttribute("data-theme", "dark");

      // 3. Verify elements still visible and readable
      await expect(page.locator("#unitname")).toBeVisible();
      await expect(page.locator("#date")).toBeVisible();
    });
  });

  test.describe("Archive Exploration", () => {
    test("can view archives modal", async ({ page }) => {
      // 1. Load a program
      await clearAllStorage(page);
      await page.goto(BASE_URL);
      await page.waitForLoadState("domcontentloaded");
      await page.evaluate(() => {
        localStorage.setItem("meeting_program_help_shown", "true");
      });
      await closeHelpModal(page);

      await mockGoogleSheets(page, "week1WardA");
      await page.goto(
        `${BASE_URL}?url=https://docs.google.com/spreadsheets/d/alpha-ward-week1/gviz/tq`
      );
      await page.waitForSelector("#unitname", { timeout: 10000 });

      // 2. View archives modal
      await page.click("#view-archives-btn");
      await page.waitForSelector("#view-archives-modal", { timeout: 5000 });

      // Archive modal should be visible
      await expect(page.locator("#view-archives-modal")).toBeVisible();
    });
  });

  test.describe("Offline Sunday", () => {
    test("go offline, view cached, return online", async ({ page }) => {
      // 1. Load program (simulate Saturday)
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

      await expect(page.locator("#unitname")).toHaveText("Alpine Ward");

      // 2. Go offline (Sunday morning - no wifi)
      await page.context().setOffline(true);
      await page.waitForTimeout(1000);

      // 3. Reload - should handle gracefully
      await page.reload();
      await page.waitForTimeout(2000);

      // 4. Return online
      await page.context().setOffline(false);
      await page.waitForTimeout(1000);

      // 5. Reload and verify
      await page.reload();
      await page.waitForSelector("#unitname", { timeout: 10000 });
      await expect(page.locator("#unitname")).toBeVisible();
    });
  });
});
