/**
 * 09-lesson-panels.spec.js
 * E2E tests for public lesson panels (lessonEQRS, lessonSundaySchool, lessonYouth, lessonPrimary).
 *
 * Lesson panels are rendered directly from main sheet rows.
 * Multiple rows with the same lesson key become list items in one accordion panel.
 * Each value is "display text | https://url" — rendered as a hyperlink.
 *
 * Verifies:
 * - Lesson panels appear in public view with no lock icon
 * - Panel content renders links for "text | url" values
 * - Private agenda keys are hidden in public view
 * - Accordion expand/collapse works
 * - Leadership view shows lesson panels without lock icon
 */

import { test, expect } from "@playwright/test";
import { clearAllStorage } from "../fixtures/index.js";
import {
  lessonPanelProgram,
  lessonPanelProgramUrl,
  mixedAgendaLessonProgram,
  mixedAgendaLessonProgramUrl
} from "../helpers/mock-data.js";
import { mockGoogleSheetsForUrl } from "../helpers/mock-sheets.js";

const BASE_URL = "http://localhost:8000/meeting-program/";

/**
 * Load a program URL and wait for the program to be fully rendered.
 */
async function loadProgram(page, sheetUrl) {
  await page.goto(`${BASE_URL}?url=${encodeURIComponent(sheetUrl)}`);
  await page.waitForSelector("#main-program", { timeout: 10000 });
  await page.waitForFunction(
    () => {
      const modal = document.getElementById("loading-modal");
      return modal && modal.classList.contains("hidden");
    },
    { timeout: 15000 }
  );
  // Close help modal if visible on first visit
  try {
    const helpModal = page.locator("#help-modal");
    if (await helpModal.isVisible({ timeout: 2000 })) {
      await page.click("#close-help-modal-btn");
      await page.waitForTimeout(300);
    }
  } catch {
    // Ignore
  }
}

test.describe("Test 09: Lesson Panels (Public View)", () => {
  test.beforeEach(async ({ page }) => {
    await clearAllStorage(page);
  });

  test("lesson panels appear in public view without a lock icon", async ({ page }) => {
    await mockGoogleSheetsForUrl(page, "lesson-panel-ward", lessonPanelProgram);

    await loadProgram(page, lessonPanelProgramUrl);

    // At least one lesson panel should be in the DOM
    const panels = page.locator(".agenda-panel");
    await expect(panels.first()).toBeVisible({ timeout: 5000 });
    const count = await panels.count();
    expect(count).toBeGreaterThanOrEqual(1);

    // No panel should contain a lock icon (lesson panels are public)
    const lockIcons = page.locator(".agenda-panel .lock-icon");
    expect(await lockIcons.count()).toBe(0);
  });

  test("lesson panel titles are translated and shown in header", async ({ page }) => {
    await mockGoogleSheetsForUrl(page, "lesson-panel-ward", lessonPanelProgram);

    await loadProgram(page, lessonPanelProgramUrl);

    const firstPanel = page.locator(".agenda-panel").first();
    await expect(firstPanel).toBeVisible({ timeout: 5000 });

    // The panel title should be the translated lesson title, not a raw key
    const titleText = await firstPanel.locator(".panel-title").first().textContent();
    expect(titleText).not.toBe("lessonEQRS");
    expect(titleText.length).toBeGreaterThan(0);
  });

  test("lesson panel content renders lesson cards with a study button", async ({ page }) => {
    await mockGoogleSheetsForUrl(page, "lesson-panel-ward", lessonPanelProgram);

    await loadProgram(page, lessonPanelProgramUrl);

    const firstPanel = page.locator(".agenda-panel").first();
    await expect(firstPanel).toBeVisible({ timeout: 5000 });

    // Expand the first panel
    await firstPanel.locator(".panel-header").click();
    await expect(firstPanel).toHaveClass(/expanded/);

    // At least one lesson card should be rendered
    const cards = firstPanel.locator(".lesson-card");
    await expect(cards.first()).toBeVisible({ timeout: 3000 });
    expect(await cards.count()).toBeGreaterThanOrEqual(1);

    // Each card with a URL has a "Study this lesson" button linking externally
    const btn = firstPanel.locator(".lesson-card__btn").first();
    await expect(btn).toBeVisible();
    const href = await btn.getAttribute("href");
    expect(href).toMatch(/^https?:\/\//);
    expect(await btn.getAttribute("target")).toBe("_blank");
  });

  test("lesson panel content is hidden until expanded", async ({ page }) => {
    await mockGoogleSheetsForUrl(page, "lesson-panel-ward", lessonPanelProgram);

    await loadProgram(page, lessonPanelProgramUrl);

    const panel = page.locator(".agenda-panel").first();
    await expect(panel).toBeVisible({ timeout: 5000 });

    // Panel should be collapsed by default (no 'expanded' class)
    await expect(panel).not.toHaveClass(/expanded/);

    // Click header to expand
    await panel.locator(".panel-header").click();
    await expect(panel).toHaveClass(/expanded/);

    // Click again to collapse
    await panel.locator(".panel-header").click();
    await expect(panel).not.toHaveClass(/expanded/);
  });

  test("expand all / collapse all controls work when multiple lesson panels exist", async ({
    page
  }) => {
    await mockGoogleSheetsForUrl(page, "lesson-panel-ward", lessonPanelProgram);

    await loadProgram(page, lessonPanelProgramUrl);

    // Wait for controls to appear (only shown when >1 panel)
    const expandControls = page.locator(".agenda-expand-controls");
    await expect(expandControls).toBeVisible({ timeout: 5000 });

    // Click Expand All
    await expandControls.locator(".agenda-expand-btn").first().click();
    const panels = page.locator(".agenda-panel");
    const panelCount = await panels.count();
    for (let i = 0; i < panelCount; i++) {
      await expect(panels.nth(i)).toHaveClass(/expanded/);
    }

    // Click Collapse All
    await expandControls.locator(".agenda-expand-btn").last().click();
    for (let i = 0; i < panelCount; i++) {
      await expect(panels.nth(i)).not.toHaveClass(/expanded/);
    }
  });

  test("private agenda keys are hidden in public view", async ({ page }) => {
    await mockGoogleSheetsForUrl(page, "mixed-agenda-lesson", mixedAgendaLessonProgram);

    await loadProgram(page, mixedAgendaLessonProgramUrl);

    const mainContent = await page.locator("#main-program").textContent();

    // Private agenda row values (agendaIds) should NOT appear as text
    expect(mainContent).not.toContain("gen-001");
    expect(mainContent).not.toContain("ann-001");

    // The lesson panel for lessonEQRS should be visible (renders from main sheet directly)
    const panels = page.locator(".agenda-panel");
    expect(await panels.count()).toBeGreaterThanOrEqual(1);
  });

  test("lesson panels in leadership view have no lock icon", async ({ page }) => {
    await mockGoogleSheetsForUrl(page, "lesson-panel-ward", lessonPanelProgram);

    // Load with ?view=agenda to go straight to leadership view
    await page.goto(
      `${BASE_URL}?url=${encodeURIComponent(lessonPanelProgramUrl)}&view=agenda`
    );
    await page.waitForSelector("#main-program", { timeout: 10000 });
    await page.waitForFunction(
      () => {
        const modal = document.getElementById("loading-modal");
        return modal && modal.classList.contains("hidden");
      },
      { timeout: 15000 }
    );
    try {
      const helpModal = page.locator("#help-modal");
      if (await helpModal.isVisible({ timeout: 2000 })) {
        await page.click("#close-help-modal-btn");
        await page.waitForTimeout(300);
      }
    } catch {
      // Ignore
    }

    const panels = page.locator(".agenda-panel");
    await expect(panels.first()).toBeVisible({ timeout: 5000 });

    // Lesson panels should not have lock icons even in leadership view
    const lockIcons = page.locator(".agenda-panel .lock-icon");
    expect(await lockIcons.count()).toBe(0);
  });
});

