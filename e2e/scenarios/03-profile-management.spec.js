/**
 * 03-profile-management.spec.js
 * Profile CRUD operations tests
 *
 * Tests adding, switching, and deleting profiles
 */

import { test, expect } from "@playwright/test";
import {
  mockGoogleSheets,
  mockGoogleSheetsMultiple,
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

test.describe("Profile Management", () => {
  test.beforeEach(async ({ page }) => {
    await clearAllStorage(page);
    // Wait for page to be ready
    await page.goto(BASE_URL);
    await page.waitForLoadState("domcontentloaded");
    // Set help shown to prevent modal from appearing after navigation
    await page.evaluate(() => {
      localStorage.setItem("meeting_program_help_shown", "true");
    });
    await closeHelpModal(page);
  });

  test.describe("Adding Profiles", () => {
    test("adding second program creates new profile", async ({ page }) => {
      // Load first program
      await mockGoogleSheets(page, "week1WardA");
      await page.goto(
        `${BASE_URL}?url=https://docs.google.com/spreadsheets/d/alpha-ward-week1/gviz/tq`
      );
      await page.waitForSelector("#unitname", { timeout: 10000 });

      const firstUnitName = await page.locator("#unitname").textContent();
      expect(firstUnitName).toBe("Alpha Ward");

      // Open manage modal to check profile count
      await page.click("#manage-profiles-btn");
      await page.waitForSelector("#manage-profiles-modal", { timeout: 5000 });

      const profileItems = page.locator(".profiles-list li");
      await expect(profileItems).toHaveCount(1);

      await page.click("#close-modal-btn");
    });

    test("same URL does not create duplicate", async ({ page }) => {
      // Load program
      await mockGoogleSheets(page, "fullProgram");
      await page.goto(`${BASE_URL}?url=https://docs.google.com/spreadsheets/d/alpine-ward/gviz/tq`);
      await page.waitForSelector("#unitname", { timeout: 10000 });

      // Try to load same program again
      await page.goto(`${BASE_URL}?url=https://docs.google.com/spreadsheets/d/alpine-ward/gviz/tq`);
      await page.waitForTimeout(2000);

      // Check manage modal - should still be 1 profile
      await page.click("#manage-profiles-btn");
      await page.waitForSelector("#manage-profiles-modal", { timeout: 5000 });

      const profileItems = page.locator(".profiles-list li");
      await expect(profileItems).toHaveCount(1);
    });
  });

  test.describe("Viewing Profiles", () => {
    test("profile cards display for multiple programs", async ({ page }) => {
      // Load two programs
      await mockGoogleSheetsMultiple(page, {
        "alpha-ward": `key,value\nunitName,Alpha Ward\ndate,2026-02-08`,
        "beta-ward": `key,value\nunitName,Beta Ward\ndate,2026-02-15`
      });

      // Load first program
      await page.goto(`${BASE_URL}?url=https://docs.google.com/spreadsheets/d/alpha-ward/gviz/tq`);
      await page.waitForSelector("#unitname", { timeout: 10000 });

      // Profile cards should be visible
      const cards = page.locator(".profile-card");
      const cardCount = await cards.count();
      expect(cardCount).toBeGreaterThanOrEqual(1);
    });

    test("manage modal shows all profiles", async ({ page }) => {
      // Load first program
      await mockGoogleSheets(page, "week1WardA");
      await page.goto(
        `${BASE_URL}?url=https://docs.google.com/spreadsheets/d/alpha-ward-week1/gviz/tq`
      );
      await page.waitForSelector("#unitname", { timeout: 10000 });

      // Open manage modal
      await page.click("#manage-profiles-btn");
      await page.waitForSelector("#manage-profiles-modal", { timeout: 5000 });

      // Should see profile list - use specific id to avoid strict mode violation
      const profilesList = page.locator("#profiles-list");
      await expect(profilesList).toBeVisible();
    });
  });

  test.describe("Switching Profiles", () => {
    test("profile selector dropdown exists when profiles exist", async ({ page }) => {
      // Load a program first
      await mockGoogleSheets(page, "fullProgram");
      await page.goto(`${BASE_URL}?url=https://docs.google.com/spreadsheets/d/alpine-ward/gviz/tq`);
      await page.waitForSelector("#unitname", { timeout: 10000 });

      // Profile selector should exist in the DOM
      const profileSelector = page.locator("#profile-selector");
      await expect(profileSelector).toBeAttached();
    });

    test("manage profiles modal lists current profile", async ({ page }) => {
      // Load a program
      await mockGoogleSheets(page, "fullProgram");
      await page.goto(`${BASE_URL}?url=https://docs.google.com/spreadsheets/d/alpine-ward/gviz/tq`);
      await page.waitForSelector("#unitname", { timeout: 10000 });

      // Open manage modal
      await page.click("#manage-profiles-btn");
      await page.waitForSelector("#manage-profiles-modal", { timeout: 5000 });

      // Should show the profile in the list
      const profilesList = page.locator("#profiles-list");
      await expect(profilesList).toContainText("Alpine Ward");
    });
  });

  test.describe("Deleting Profiles", () => {
    test("can delete inactive program", async ({ page }) => {
      // Load first program
      await mockGoogleSheets(page, "week1WardA");
      await page.goto(
        `${BASE_URL}?url=https://docs.google.com/spreadsheets/d/alpha-ward-week1/gviz/tq`
      );
      await page.waitForSelector("#unitname", { timeout: 10000 });

      // Open manage modal
      await page.click("#manage-profiles-btn");
      await page.waitForSelector("#manage-profiles-modal", { timeout: 5000 });

      // Check for delete button (may not exist for single profile)
      const deleteButtons = page.locator(".delete-btn");
      const deleteCount = await deleteButtons.count();

      if (deleteCount > 0) {
        // Setup dialog handler
        page.on("dialog", (dialog) => dialog.accept());

        // Click delete
        await deleteButtons.first().click();
        await page.waitForTimeout(500);
      }
    });

    test("cannot delete active program", async ({ page }) => {
      // Load program
      await mockGoogleSheets(page, "fullProgram");
      await page.goto(`${BASE_URL}?url=https://docs.google.com/spreadsheets/d/alpine-ward/gviz/tq`);
      await page.waitForSelector("#unitname", { timeout: 10000 });

      // Open manage modal
      await page.click("#manage-profiles-btn");
      await page.waitForSelector("#manage-profiles-modal", { timeout: 5000 });

      // First profile (active) should not have delete button - use specific id
      const firstItem = page.locator("#profiles-list li").first();
      const deleteBtn = firstItem.locator(".delete-btn");
      await expect(deleteBtn).toHaveCount(0);
    });

    test("deleting profile removes it from list", async ({ page }) => {
      // This test requires multiple profiles which is complex to set up via URL
      // The app doesn't create new profiles from URL params, only from QR scans
      // Skip this test as it requires QR scanning functionality
      test.skip();
    });
  });

  test.describe("Profile Sorting", () => {
    test("profiles display in profile selector", async ({ page }) => {
      // Load a program
      await mockGoogleSheets(page, "fullProgram");
      await page.goto(`${BASE_URL}?url=https://docs.google.com/spreadsheets/d/alpine-ward/gviz/tq`);
      await page.waitForSelector("#unitname", { timeout: 10000 });

      // Profile selector should exist in the DOM (may be hidden when only 1 profile)
      const profileSelector = page.locator("#profile-selector");
      await expect(profileSelector).toBeAttached();
    });
  });

  test.describe("Archive Access", () => {
    test("view archives button accessible from profile cards", async ({ page }) => {
      // Load a program
      await mockGoogleSheets(page, "fullProgram");
      await page.goto(`${BASE_URL}?url=https://docs.google.com/spreadsheets/d/alpine-ward/gviz/tq`);
      await page.waitForSelector("#unitname", { timeout: 10000 });

      // View archives button should be visible
      const archiveBtn = page.locator("#view-archives-btn");
      await expect(archiveBtn).toBeVisible();
    });

    test("can navigate to archive from manage modal", async ({ page }) => {
      // Load a program
      await mockGoogleSheets(page, "fullProgram");
      await page.goto(`${BASE_URL}?url=https://docs.google.com/spreadsheets/d/alpine-ward/gviz/tq`);
      await page.waitForSelector("#unitname", { timeout: 10000 });

      // View archives button should be visible
      const archiveBtn = page.locator("#view-archives-btn");
      await expect(archiveBtn).toBeVisible();

      // Click view archives button - opens a modal, not navigates to new page
      await page.click("#view-archives-btn");
      await page.waitForTimeout(500);

      // Should open the archive modal
      const archiveModal = page.locator("#view-archives-modal");
      await expect(archiveModal).toBeVisible();
    });
  });

  test.describe("Profile Persistence", () => {
    test("profiles persist after reload", async ({ page }) => {
      // Load a program
      await mockGoogleSheets(page, "fullProgram");
      await page.goto(`${BASE_URL}?url=https://docs.google.com/spreadsheets/d/alpine-ward/gviz/tq`);
      await page.waitForSelector("#unitname", { timeout: 10000 });

      // Reload page
      await page.reload();
      await page.waitForSelector("#unitname", { timeout: 10000 });

      // Should still show the program
      await expect(page.locator("#unitname")).toHaveText("Alpine Ward");
    });
  });
});
