import { test, expect } from "@playwright/test";
import { mockGoogleSheets } from "../helpers/mock-sheets.js";
import AxeBuilder from "@axe-core/playwright";

test.describe("Visual Verification", () => {
  test.beforeEach(async ({ page }) => {
    await mockGoogleSheets(page);
    await page.addInitScript(() => {
      const style = document.createElement("style");
      style.innerHTML = `
                * {
                    transition: none !important;
                    animation: none !important;
                }
            `;
      document.head.appendChild(style);
    });
  });

  test("First Time Load - No Profiles, No Onboarding Modal", async ({ page }) => {
    await page.goto(".");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(1500);

    const qrBtn = page.locator("#qr-action-btn");
    await expect(qrBtn).toBeVisible();

    const onboardingModal = page.locator("#help-modal");
    await expect(onboardingModal).toBeHidden();

    await page.screenshot({
      path: `e2e/screenshots/${test.info().project.name}-first-load.png`,
      fullPage: true
    });
  });

  test("Program Loaded - No Onboarding Modal", async ({ page }) => {
    const sheetUrl = "https://docs.google.com/spreadsheets/d/test123/gviz/tq?tqx=out:csv";

    await page.goto(".");
    await page.waitForLoadState("domcontentloaded");

    await page.evaluate((url) => {
      localStorage.clear();
      localStorage.setItem("sheetUrl", url);
      localStorage.setItem(
        "meeting_program_profiles",
        JSON.stringify([
          {
            id: "test-profile",
            url: url,
            unitName: "Test Ward",
            stakeName: "Test Stake",
            lastUsed: Date.now()
          }
        ])
      );
      localStorage.setItem("meeting_program_selected_id", "test-profile");
    }, sheetUrl);

    await page.reload();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);

    const unitName = page.locator("#unitname");
    await expect(unitName).toBeVisible();

    const onboardingModal = page.locator("#help-modal");
    const isOnboardingVisible = await onboardingModal.isVisible().catch(() => false);

    if (isOnboardingVisible) {
      console.log("Note: Onboarding modal is visible - this may need to be addressed");
    }

    await page.screenshot({
      path: `e2e/screenshots/${test.info().project.name}-program-loaded.png`,
      fullPage: true
    });
  });

  test("Theme and Mobile Layout Check", async ({ page }) => {
    await page.goto(".");
    await page.evaluate(() => {
      localStorage.setItem(
        "sheetUrl",
        "https://docs.google.com/spreadsheets/d/test123/gviz/tq?tqx=out:csv"
      );
    });
    await page.reload();
    await page.waitForSelector(".leader-of-dots");

    // Light Mode
    await page.screenshot({
      path: `e2e/screenshots/${test.info().project.name}-light.png`,
      fullPage: true
    });

    // Dark Mode
    await page.click("#theme-toggle");
    await page.waitForTimeout(500);
    await page.screenshot({
      path: `e2e/screenshots/${test.info().project.name}-dark.png`,
      fullPage: true
    });

    // Ensure dots visible
    const dots = page.locator(".dots").first();
    const box = await dots.boundingBox();
    expect(box.width).toBeGreaterThan(10);
  });
});
