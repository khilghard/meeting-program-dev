import { expect } from "@playwright/test";
import { test } from "../fixtures/base.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe("Language Switching", () => {
  test.beforeEach(async ({ page }) => {
    console.log("--- STARTING TEST CASE ---");
    await page.evaluate(() => localStorage.clear());
    page.on("console", (msg) => {
      console.log(`BROWSER [${msg.type()}]:`, msg.text());
    });
  });

  test("should update all UI fields and program content when switching languages", async ({
    page
  }) => {
    const csvPath = path.join(__dirname, "../fixtures/multi-language-program.csv");
    const csvData = fs.readFileSync(csvPath, "utf8");

    console.log("SETTING UP MOCK for docs.google.com");
    await page.context().route(/^https:\/\/docs\.google\.com\//, async (route) => {
      console.log(`FULFILLING route: ${route.request().url()}`);
      await route.fulfill({
        status: 200,
        contentType: "text/csv",
        body: csvData
      });
    });

    const targetUrl = "./?url=https://docs.google.com/spreadsheets/d/test-id/gviz/tq?tqx=out:csv";
    console.log(`NAVIGATING to: ${targetUrl}`);

    await page.goto(targetUrl);
    console.log("PAGE GOTO COMPLETED");

    await page.waitForLoadState("domcontentloaded");
    console.log("PAGE DOM LOADED");

    const welcome = page.locator("#welcome-to-text");
    await expect(welcome).toBeVisible({ timeout: 15000 });
    console.log("welcome-to-text VISIBLE");

    // ===== VERIFY ENGLISH (Initial) =====
    console.log("VERIFYING ENGLISH...");
    await expect(welcome).toHaveText("Welcome to");
    await expect(page.locator("#sacrament-services-title")).toHaveText("Sacrament Services");
    await expect(page.locator("#unitname")).toHaveText("Unit Name");
    await expect(page.locator("#main-program")).toContainText("Brother Leader A");
    await expect(page.locator("hr.hr-text").first()).toHaveAttribute(
      "data-content",
      "Announcements"
    );

    // ===== SWITCH TO SPANISH =====
    console.log("SWITCHING TO SPANISH...");
    await page.locator("#language-selector-btn").click();
    await expect(page.locator("#language-modal")).toBeVisible();
    await page.locator(".language-item", { hasText: "Español" }).click();

    console.log("Spanish selected, waiting for reload...");
    await page.waitForLoadState("load");

    await expect(welcome).toHaveText("Bienvenido a");
    await expect(page.locator("#sacrament-services-title")).toHaveText("Servicios Sacramentales");
    await expect(page.locator("#unitname")).toHaveText("Unit Name");

    const esContent = await page.locator("#main-program").textContent();
    expect(esContent).toContain("Herman Leader A");
    await expect(page.locator("hr.hr-text").first()).toHaveAttribute("data-content", "Anuncios");

    // ===== SWITCH TO KISWAHILI =====
    console.log("SWITCHING TO KISWAHILI...");
    await page.locator("#language-selector-btn").click();
    await page.locator(".language-item", { hasText: "Kiswahili" }).click();

    console.log("Kiswahili selected, waiting for reload...");
    await page.waitForLoadState("load");

    await expect(welcome).toHaveText("Karibu");
    await expect(page.locator("#sacrament-services-title")).toHaveText("Huduma za Sakramenti");
    await expect(page.locator("#unitname")).toHaveText("Unit Name");

    const swaContent = await page.locator("#main-program").textContent();
    expect(swaContent).toContain("Ndugu Leader A");
    await expect(page.locator("hr.hr-text").first()).toHaveAttribute("data-content", "Matangazo");
  });

  test("should persist language preference across reloads", async ({ page }) => {
    const dummyUrl = "./?url=https://docs.google.com/spreadsheets/d/dummy/gviz/tq?tqx=out:csv";
    console.log(`NAVIGATING to dummy URL: ${dummyUrl}`);
    await page.goto(dummyUrl);

    console.log("WAITING for language-selector-btn (visible)");
    const btn = page.locator("#language-selector-btn");
    await expect(btn).toBeVisible();

    console.log('SELECTING "fr"');
    await btn.click();
    await page.locator(".language-item", { hasText: "Français" }).click();

    console.log("Français selected, waiting for reload...");
    await page.waitForLoadState("load");

    console.log('VERIFYING selector VISIBLE and text is "Français"');
    await expect(btn).toBeVisible();
    await expect(btn).toContainText("Français");

    console.log("VERIFYING welcome text is in French");
    await expect(page.locator("#welcome-to-text")).toHaveText("Bienvenue à");

    // Final verify checkmark
    await btn.click();
    await expect(
      page.locator(".language-item", { hasText: "Français" }).locator(".selected-check")
    ).toBeVisible();
  });

  test("should update language modal title when switching languages", async ({ page }) => {
    await page.goto("./");
    await page.waitForLoadState("domcontentloaded");

    // Open language modal and verify default English title
    await page.locator("#language-selector-btn").click();
    await expect(page.locator("#language-modal")).toBeVisible();
    await expect(page.locator("#language-modal-title")).toHaveText("Select Language");
    await page.locator("#close-language-modal-btn").click();

    // Switch to Spanish and verify modal title updates
    await page.locator("#language-selector-btn").click();
    await page.locator(".language-item", { hasText: "Español" }).click();
    await page.waitForLoadState("load");

    await page.locator("#language-selector-btn").click();
    await expect(page.locator("#language-modal-title")).toHaveText("Seleccionar Idioma");
    await page.locator("#close-language-modal-btn").click();

    // Switch to French and verify modal title updates
    await page.locator("#language-selector-btn").click();
    await page.locator(".language-item", { hasText: "Français" }).click();
    await page.waitForLoadState("load");

    await page.locator("#language-selector-btn").click();
    await expect(page.locator("#language-modal-title")).toHaveText("Sélectionner la Langue");
    await page.locator("#close-language-modal-btn").click();

    // Switch to Kiswahili and verify modal title updates
    await page.locator("#language-selector-btn").click();
    await page.locator(".language-item", { hasText: "Kiswahili" }).click();
    await page.waitForLoadState("load");

    await page.locator("#language-selector-btn").click();
    await expect(page.locator("#language-modal-title")).toHaveText("Chagua Lugha");
  });

  test("should update onboarding welcome text when switching languages (no program loaded)", async ({
    page
  }) => {
    await page.goto("./");
    await page.waitForLoadState("domcontentloaded");

    // Default English - welcome text should be hidden in zero state but verify it would show correct text
    await expect(page.locator("#welcome-to-text")).toBeHidden();

    // Switch to Spanish
    await page.locator("#language-selector-btn").click();
    await page.locator(".language-item", { hasText: "Español" }).click();
    await page.waitForLoadState("load");

    // Load with URL to see welcome text
    await page.goto("./?url=https://docs.google.com/spreadsheets/d/test-id/gviz/tq?tqx=out:csv");
    await expect(page.locator("#welcome-to-text")).toHaveText("Bienvenido a");

    // Switch to French
    await page.locator("#language-selector-btn").click();
    await page.locator(".language-item", { hasText: "Français" }).click();
    await page.waitForLoadState("load");

    await page.goto("./?url=https://docs.google.com/spreadsheets/d/test-id/gviz/tq?tqx=out:csv");
    await expect(page.locator("#welcome-to-text")).toHaveText("Bienvenue à");

    // Switch to Kiswahili
    await page.locator("#language-selector-btn").click();
    await page.locator(".language-item", { hasText: "Kiswahili" }).click();
    await page.waitForLoadState("load");

    await page.goto("./?url=https://docs.google.com/spreadsheets/d/test-id/gviz/tq?tqx=out:csv");
    await expect(page.locator("#welcome-to-text")).toHaveText("Karibu");
  });

  test("should update close language modal button when switching languages", async ({ page }) => {
    await page.goto("./?url=https://docs.google.com/spreadsheets/d/test-id/gviz/tq?tqx=out:csv");
    await page.waitForLoadState("domcontentloaded");

    await page.locator("#language-selector-btn").click();
    await expect(page.locator("#close-language-modal-btn")).toHaveText("Close");

    await page.locator(".language-item", { hasText: "Español" }).click();
    await page.waitForLoadState("load");

    await page.goto("./?url=https://docs.google.com/spreadsheets/d/test-id/gviz/tq?tqx=out:csv");
    await page.locator("#language-selector-btn").click();
    await expect(page.locator("#close-language-modal-btn")).toHaveText("Cerrar");

    await page.locator(".language-item", { hasText: "Français" }).click();
    await page.waitForLoadState("load");

    await page.goto("./?url=https://docs.google.com/spreadsheets/d/test-id/gviz/tq?tqx=out:csv");
    await page.locator("#language-selector-btn").click();
    await expect(page.locator("#close-language-modal-btn")).toHaveText("Fermer");

    await page.locator(".language-item", { hasText: "Kiswahili" }).click();
    await page.waitForLoadState("load");

    await page.goto("./?url=https://docs.google.com/spreadsheets/d/test-id/gviz/tq?tqx=out:csv");
    await page.locator("#language-selector-btn").click();
    await expect(page.locator("#close-language-modal-btn")).toHaveText("Funga");
  });
});
