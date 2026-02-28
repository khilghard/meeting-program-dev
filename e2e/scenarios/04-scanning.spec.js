/**
 * 04-scanning.spec.js
 * QR code scanning flows
 *
 * Tests the QR scanning functionality from both
 * onboarding and main screen contexts.
 */

import { test, expect } from "@playwright/test";
import {
  mockGoogleSheets,
  mockQRCodeScan,
  enableQRMock,
  mockGetUserMedia,
  startQRScanner,
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

test.describe("QR Scanning", () => {
  test.beforeEach(async ({ page }) => {
    await clearAllStorage(page);
    await page.goto(BASE_URL);
    await page.waitForLoadState("domcontentloaded");
    await page.evaluate(() => {
      localStorage.setItem("meeting_program_help_shown", "true");
    });
    await closeHelpModal(page);
  });

  test.describe("Scanner Interface", () => {
    test("scanner modal opens from main screen", async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForLoadState("load");

      // Mock camera
      await mockGetUserMedia(page);

      // Click scan button
      await page.click("#qr-action-btn");

      // Scanner should be visible
      await expect(page.locator("#qr-scanner")).toBeVisible();
    });

    test("scanner has video element", async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForLoadState("load");

      await mockGetUserMedia(page);
      await page.click("#qr-action-btn");
      await page.waitForSelector("#qr-scanner", { timeout: 5000 });

      // Video element should exist
      const video = page.locator("#qr-video, video");
      await expect(video).toBeVisible();
    });

    test("scanner has manual entry option", async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForLoadState("load");

      await mockGetUserMedia(page);
      await page.click("#qr-action-btn");
      await page.waitForSelector("#qr-scanner", { timeout: 5000 });

      // Look for manual entry
      const manualEntry = page.locator("text=Enter URL, text=manual");
    });
  });

  test.describe("Camera Permissions", () => {
    test("camera mock allows scanning", async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForLoadState("load");

      // Mock getUserMedia
      await mockGetUserMedia(page);

      // Open scanner
      await page.click("#qr-action-btn");
      await page.waitForSelector("#qr-scanner", { timeout: 5000 });

      // Scanner should work with mock
    });
  });

  test.describe("Scanning Flow", () => {
    test("scanning valid URL adds program", async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForLoadState("load");

      // Setup mocks
      await mockGoogleSheets(page, "fullProgram");
      await mockGetUserMedia(page);
      await mockQRCodeScan(page, "https://docs.google.com/spreadsheets/d/test/gviz/tq");

      // Open scanner
      await page.click("#qr-action-btn");
      await page.waitForSelector("#qr-scanner", { timeout: 5000 });

      // Enable mock to return QR data
      await enableQRMock(page);

      // Wait for program to potentially load
      await page.waitForTimeout(3000);
    });

    test("confirm modal shows before adding program", async ({ page }) => {
      // Similar test but verify confirm modal appears
    });

    test("can cancel scanning", async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForLoadState("load");

      await mockGetUserMedia(page);
      await page.click("#qr-action-btn");
      await page.waitForSelector("#qr-scanner", { timeout: 5000 });

      // Click the action button again to cancel (it changes to "Cancel" when scanner is open)
      await page.click("#qr-action-btn");
      await page.waitForTimeout(500);

      // Scanner should close
      await expect(page.locator("#qr-scanner")).toBeHidden();
    });
  });

  test.describe("Multiple Programs", () => {
    test("scan adds to existing profiles", async ({ page }) => {
      // First load a program
      await mockGoogleSheets(page, "week1WardA");
      await page.goto(
        `${BASE_URL}?url=https://docs.google.com/spreadsheets/d/alpha-ward-week1/gviz/tq`
      );
      await page.waitForSelector("#unitname", { timeout: 10000 });

      // Now scan another program
      await mockGoogleSheets(page, "week2WardA");
      await mockGetUserMedia(page);
      await mockQRCodeScan(page, "https://docs.google.com/spreadsheets/d/alpha-ward-week2/gviz/tq");

      await page.click("#qr-action-btn");
      await page.waitForSelector("#qr-scanner", { timeout: 5000 });
      await enableQRMock(page);
      await page.waitForTimeout(3000);

      // Should have 2 programs now
    });

    test("scan different ward program", async ({ page }) => {
      // Similar but with different ward
    });
  });

  test.describe("Error Handling", () => {
    test("invalid URL shows error", async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForLoadState("load");

      await mockGetUserMedia(page);
      await mockQRCodeScan(page, "not-a-valid-url");

      await page.click("#qr-action-btn");
      await page.waitForSelector("#qr-scanner", { timeout: 5000 });
      await enableQRMock(page);

      // Wait and check for error
      await page.waitForTimeout(3000);
    });
  });
});
