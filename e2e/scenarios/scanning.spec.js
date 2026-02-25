import { expect } from "@playwright/test";
import { test } from "../fixtures/base.js";
import { mockQRCodeScan, enableQRMock, startQRScanner } from "../helpers/mock-qr.js";
import { mockGoogleSheets, mockGoogleSheetsError } from "../helpers/mock-sheets.js";

test.describe("QR Code Scanning & Import", () => {
  test.beforeEach(async ({ page }) => {
    await page.evaluate(() => localStorage.clear());
  });

  test("should show scan button on first visit", async ({ page }) => {
    const scanBtn = page.locator("#qr-action-btn");
    await expect(scanBtn).toBeVisible();
    await expect(scanBtn).toHaveText("Scan Program QR Code");
  });

  test("should open camera when scan button clicked", async ({ page }) => {
    await page.click("#qr-action-btn");
    await expect(page.locator("#qr-scanner")).toBeVisible();
    await expect(page.locator("#qr-video")).toBeVisible();
  });

  test("should scan valid QR code, prompt modal, and add program", async ({ page }) => {
    await mockGoogleSheets(page, "minimal-program");
    const testSheetUrl = "https://docs.google.com/spreadsheets/d/test123/gviz/tq?tqx=out:csv";
    await mockQRCodeScan(page, testSheetUrl);
    await enableQRMock(page);

    await startQRScanner(page);

    const modal = page.locator("#confirm-program-modal");
    await expect(modal).toBeVisible({ timeout: 10000 });

    await expect(page.locator("#new-program-name")).toContainText("Test Ward");

    await page.click("#confirm-add-btn");

    await page.waitForSelector("#unitname", { timeout: 10000 });
    await expect(page.locator("#unitname")).toHaveText("Test Ward");
  });

  test("should NOT add program when modal is cancelled", async ({ page }) => {
    await mockGoogleSheets(page, "minimal-program");
    const sheetUrl = "https://docs.google.com/spreadsheets/d/test-cancel/gviz/tq?tqx=out:csv";
    await mockQRCodeScan(page, sheetUrl);
    await enableQRMock(page);

    await startQRScanner(page);

    const modal = page.locator("#confirm-program-modal");
    await expect(modal).toBeVisible();

    await page.click("#cancel-add-btn");
    await expect(modal).toBeHidden();

    const profiles = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("meeting_program_profiles") || "[]")
    );
    expect(profiles).toHaveLength(0);
    await expect(page.locator("#qr-action-btn")).toHaveText("Scan Program QR Code");
  });

  test("should show onboarding help modal on first visit, then skip it on profile switch", async ({
    page,
    isMobile
  }) => {
    // This test only works with full camera mocking - skip on mobile
    test.skip(isMobile, "Test uses mock QR which may not work on mobile emulation");

    // Clear localStorage to ensure fresh first-visit state
    await page.evaluate(() => localStorage.clear());

    // Step 1-5: First visit - onboarding help modal should show
    const helpModal = page.locator("#help-modal");

    // Wait for the checkFirstTimeHelp to run (500ms + 1500ms delay)
    await page.waitForTimeout(2500);
    await expect(helpModal).toBeVisible();

    // Close the help modal
    await page.click("#close-help-modal-btn");
    await expect(helpModal).toBeHidden();

    // Additional wait to ensure modal is fully closed
    await page.waitForTimeout(500);

    // Verify help_shown flag is set
    const helpShown = await page.evaluate(() => localStorage.getItem("meeting_program_help_shown"));
    expect(helpShown).toBe("true");

    // Step 6-12: Scan first QR code - profile modal should show
    await mockGoogleSheets(page, "minimal-program");
    const testSheetUrl1 = "https://docs.google.com/spreadsheets/d/ward-a/gviz/tq?tqx=out:csv";
    await mockQRCodeScan(page, testSheetUrl1);
    await enableQRMock(page);

    await startQRScanner(page);

    const confirmModal = page.locator("#confirm-program-modal");
    await expect(confirmModal).toBeVisible({ timeout: 10000 });
    await expect(page.locator("#new-program-name")).toContainText("Test Ward");

    // Add the profile
    await page.click("#confirm-add-btn");
    await page.waitForSelector("#unitname", { timeout: 10000 });

    // Step 13-17: Scan second QR code - no onboarding, new profile modal shows
    // Onboarding help modal should NOT show this time (help_shown is already set)
    await mockGoogleSheets(page, "minimal-program");
    const testSheetUrl2 = "https://docs.google.com/spreadsheets/d/ward-b/gviz/tq?tqx=out:csv";
    await mockQRCodeScan(page, testSheetUrl2);
    await enableQRMock(page);

    await startQRScanner(page);
    await page.waitForTimeout(500);
    await expect(helpModal).not.toBeVisible();

    // Profile confirm modal SHOULD show (new profile)
    await expect(confirmModal).toBeVisible({ timeout: 10000 });

    // Cancel to avoid test pollution
    await page.click("#cancel-add-btn");
  });

  test("should show onboarding help only once on first visit (no program loaded)", async ({
    page,
    isMobile
  }) => {
    test.skip(isMobile, "Test designed for desktop browsers only");

    await page.evaluate(() => localStorage.clear());

    const helpModal = page.locator("#help-modal");

    await page.waitForTimeout(2500);
    await expect(helpModal).toBeVisible();

    await page.click("#close-help-modal-btn");
    await expect(helpModal).toBeHidden();

    await page.waitForTimeout(2000);
    await expect(helpModal).not.toBeVisible();
  });

  test("should show onboarding help once when loading program with URL", async ({
    page,
    isMobile
  }) => {
    test.skip(isMobile, "Test designed for desktop browsers only");

    await page.evaluate(() => localStorage.clear());

    const sheetUrl = "https://docs.google.com/spreadsheets/d/test-id/gviz/tq?tqx=out:csv";
    await mockGoogleSheets(page, "minimal-program");
    await page.goto(`?url=${encodeURIComponent(sheetUrl)}`);

    const helpModal = page.locator("#help-modal");

    await page.waitForTimeout(2500);
    await expect(helpModal).toBeVisible();

    await page.click("#close-help-modal-btn");
    await expect(helpModal).toBeHidden();

    await page.waitForTimeout(2000);
    await expect(helpModal).not.toBeVisible();
  });

  test("should handle network failure during scan gracefully", async ({ page }) => {
    await page.route("**/*tqx=out:csv", (route) => route.abort("failed"));

    await mockQRCodeScan(page, "https://docs.google.com/spreadsheets/d/fail/gviz/tq?tqx=out:csv");
    await enableQRMock(page);

    let dialogBlocked = false;
    page.on("dialog", (dialog) => {
      dialogBlocked = true;
      dialog.accept();
    });

    await startQRScanner(page);

    const modal = page.locator("#confirm-program-modal");
    await expect(modal).toBeHidden();

    await expect.poll(() => dialogBlocked, { timeout: 5000 }).toBe(true);
  });

  test("should cancel scanning state", async ({ page }) => {
    await page.click("#qr-action-btn");
    await expect(page.locator("#qr-scanner")).toBeVisible();
    await expect(page.locator("#qr-action-btn")).toHaveText("Cancel");

    await page.click("#qr-action-btn");
    await expect(page.locator("#qr-scanner")).toBeHidden();
    await expect(page.locator("#qr-action-btn")).toHaveText("Scan Program QR Code");
  });

  test("should reject invalid QR code", async ({ page }) => {
    await mockQRCodeScan(page, "https://example.com/not-a-sheet");
    await startQRScanner(page);
    await enableQRMock(page);

    await expect(page.locator("#qr-output")).toContainText(" Invalid QR code");
  });

  test("should show manual URL input when camera permission is denied", async ({
    page,
    isMobile
  }, testInfo) => {
    test.skip(isMobile, "Test designed for desktop browsers only");
    test.skip(
      testInfo.project.name === "chromium",
      "Test designed for chromium (no camera) project only"
    );

    await mockGoogleSheets(page, "minimal-program");

    await page.click("#qr-action-btn");
    await page.waitForTimeout(1500);

    await expect(page.locator("#manual-url-btn")).toBeVisible();
  });

  test("should allow pressing Enter to submit manual URL", async ({ page, isMobile }, testInfo) => {
    test.skip(isMobile, "Test designed for desktop browsers only");
    test.skip(
      testInfo.project.name === "chromium",
      "Test designed for chromium (no camera) project only"
    );

    await mockGoogleSheets(page, "minimal-program");

    await page.click("#qr-action-btn");
    await page.waitForTimeout(1500);

    await expect(page.locator("#manual-url-btn")).toBeVisible();

    await page.click("#manual-url-btn");

    await expect(page.locator("#manual-url-container")).toBeVisible();

    await page
      .locator("#manual-url-input")
      .fill("https://docs.google.com/spreadsheets/d/test-enter/gviz/tq?tqx=out:csv");
    await page.locator("#manual-url-input").press("Enter");

    await expect(page.locator("#confirm-program-modal")).toBeVisible({ timeout: 10000 });
  });

  test("should auto-archive previous program when adding new program", async ({
    page,
    isMobile
  }, testInfo) => {
    test.skip(
      isMobile || testInfo.project.name !== "chromium",
      "Test uses mock QR which may not work on mobile or non-chromium browsers"
    );

    // First, add a program
    await mockGoogleSheets(page, "minimal-program");
    const sheetUrl1 = "https://docs.google.com/spreadsheets/d/ward-a/gviz/tq?tqx=out:csv";
    await mockQRCodeScan(page, sheetUrl1);
    await enableQRMock(page);
    await startQRScanner(page);

    // Accept the new program
    await expect(page.locator("#confirm-program-modal")).toBeVisible({ timeout: 10000 });
    await page.click("#confirm-add-btn");
    await page.waitForSelector("#unitname", { timeout: 10000 });

    // Verify first profile exists
    let profiles = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem("meeting_program_profiles") || "[]");
    });
    expect(profiles.length).toBe(1);
    expect(profiles[0].archived).toBeUndefined();

    // Now scan a second program - this should auto-archive the first
    await mockGoogleSheets(page, "minimal-program");
    const sheetUrl2 = "https://docs.google.com/spreadsheets/d/ward-b/gviz/tq?tqx=out:csv";
    await mockQRCodeScan(page, sheetUrl2);
    await enableQRMock(page);
    await startQRScanner(page);

    // Accept the new program
    await expect(page.locator("#confirm-program-modal")).toBeVisible({ timeout: 10000 });
    await page.click("#confirm-add-btn");
    await page.waitForSelector("#unitname", { timeout: 10000 });

    // Verify first profile is now archived
    profiles = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem("meeting_program_profiles") || "[]");
    });
    expect(profiles.length).toBe(2);
    const wardA = profiles.find((p) => p.url.includes("ward-a"));
    expect(wardA.archived).toBe(true);
  });
});
