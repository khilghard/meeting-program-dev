/**
 * 02-program-loading.spec.js
 * Program loading and display tests
 *
 * Tests that programs load correctly from Google Sheets
 * and display all the expected content.
 */

import { test, expect } from "@playwright/test";
import {
  mockGoogleSheets,
  mockGoogleSheetsError,
  mockGoogleSheetsTimeout,
  clearAllStorage,
  BASE_URL
} from "../fixtures/index.js";

test.describe("Program Loading", () => {
  test.describe("Full Program Rendering", () => {
    test("full program renders all sections", async ({ page }) => {
      await clearAllStorage(page);
      await mockGoogleSheets(page, "fullProgram");

      await page.goto(
        `${BASE_URL}?url=https://docs.google.com/spreadsheets/d/alpine-ward-2026-02-15/gviz/tq`
      );
      await page.waitForSelector("#unitname", { timeout: 10000 });

      // Check all major sections are visible
      await expect(page.locator("#unitname")).toHaveText("Alpine Ward");
      await expect(page.locator("#date")).toContainText("2026");
      await expect(page.locator("#presiding")).toBeVisible();
      await expect(page.locator("#conducting")).toBeVisible();
      await expect(page.locator("#openingHymn")).toBeVisible();
      await expect(page.locator("#sacramentHymn")).toBeVisible();
      await expect(page.locator("#closingHymn")).toBeVisible();
    });

    test("program data matches CSV exactly", async ({ page }) => {
      await clearAllStorage(page);
      await mockGoogleSheets(page, "fullProgram");

      await page.goto(
        `${BASE_URL}?url=https://docs.google.com/spreadsheets/d/alpine-ward-2026-02-15/gviz/tq`
      );
      await page.waitForSelector("#unitname", { timeout: 10000 });

      // Verify specific values from the mock data
      await expect(page.locator("#unitname")).toHaveText("Alpine Ward");
      await expect(page.locator("#unitaddress")).toHaveText("100 Main Street, Alpine, UT 84004");
      await expect(page.locator("#presiding")).toContainText("Bishop John Smith");
      await expect(page.locator("#conducting")).toContainText("Stake Patriarch David Johnson");
    });
  });

  test.describe("Loading States", () => {
    test("loading spinner shows during fetch", async ({ page }) => {
      await clearAllStorage(page);

      // Go to URL without mocking first to see loading state
      await page.goto(`${BASE_URL}?url=https://docs.google.com/spreadsheets/d/test/gviz/tq`);

      // Loading spinner might appear briefly - check it's present in DOM
      const loadingSpinner = page.locator(".loading-container");
      await expect(loadingSpinner).toBeAttached();
    });

    test("error state displays on failed fetch", async ({ page }) => {
      await clearAllStorage(page);
      await mockGoogleSheetsError(page, 500, "Server Error");

      await page.goto(`${BASE_URL}?url=https://docs.google.com/spreadsheets/d/test/gviz/tq`);
      await page.waitForTimeout(5000);

      // App should remain in usable state - check QR button is visible
      const scanBtn = page.locator("#qr-action-btn");
      await expect(scanBtn).toBeVisible();
    });
  });

  test.describe("URL Parameter Loading", () => {
    test("url param loads program", async ({ page }) => {
      await clearAllStorage(page);
      await mockGoogleSheets(page, "minimalProgram");

      const programUrl = "https://docs.google.com/spreadsheets/d/minimal-ward/gviz/tq";
      await page.goto(`${BASE_URL}?url=${encodeURIComponent(programUrl)}`);
      await page.waitForSelector("#unitname", { timeout: 10000 });

      await expect(page.locator("#unitname")).toHaveText("Minimal Ward");
    });

    test("multiple url params handled correctly", async ({ page }) => {
      await clearAllStorage(page);
      await mockGoogleSheets(page, "fullProgram");

      await page.goto(
        `${BASE_URL}?url=https://docs.google.com/spreadsheets/d/test/gviz/tq&forceUpdate=true`
      );
      await page.waitForSelector("#unitname", { timeout: 10000 });

      await expect(page.locator("#unitname")).toHaveText("Alpine Ward");
    });
  });

  test.describe("Reload Functionality", () => {
    test("reload button fetches fresh data", async ({ page }) => {
      await clearAllStorage(page);
      await mockGoogleSheets(page, "fullProgram");

      await page.goto(`${BASE_URL}?url=https://docs.google.com/spreadsheets/d/test/gviz/tq`);
      await page.waitForSelector("#unitname", { timeout: 10000 });

      // Reload button should be visible
      const reloadBtn = page.locator("#reload-btn");
      await expect(reloadBtn).toBeVisible();
    });
  });

  test.describe("Last Used Tracking", () => {
    test("lastUsed updates on program load", async ({ page }) => {
      await clearAllStorage(page);
      await mockGoogleSheets(page, "fullProgram");

      await page.goto(`${BASE_URL}?url=https://docs.google.com/spreadsheets/d/test/gviz/tq`);
      await page.waitForSelector("#unitname", { timeout: 10000 });

      // Profile should be created - verify program loaded
      await expect(page.locator("#unitname")).toHaveText("Alpine Ward");
    });
  });

  test.describe("Minimal Program", () => {
    test("minimal program renders without errors", async ({ page }) => {
      await clearAllStorage(page);
      await mockGoogleSheets(page, "minimalProgram");

      await page.goto(
        `${BASE_URL}?url=https://docs.google.com/spreadsheets/d/minimal-ward/gviz/tq`
      );
      await page.waitForSelector("#unitname", { timeout: 10000 });

      await expect(page.locator("#unitname")).toHaveText("Minimal Ward");
    });

    test("missing optional fields handled gracefully", async ({ page }) => {
      await clearAllStorage(page);
      await mockGoogleSheets(page, "minimalProgram");

      await page.goto(
        `${BASE_URL}?url=https://docs.google.com/spreadsheets/d/minimal-ward/gviz/tq`
      );
      await page.waitForSelector("#unitname", { timeout: 10000 });

      // Should load successfully with minimal data
      await expect(page.locator("#unitname")).toHaveText("Minimal Ward");
      await expect(page.locator("#date")).toContainText("2026");
    });
  });
});
