import { test, expect } from "@playwright/test";

import { bootstrapCmsPage } from "../fixtures/cmsAuth.js";
import { buildAgendaSheet, setupSheetsApiMock } from "../helpers/sheetsApiMock.js";

test.describe("Mobile Agenda CMS", () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(
      !["Mobile iPhone", "Mobile Android"].includes(testInfo.project.name),
      "Agenda CMS E2E runs on mobile projects only."
    );
  });

  test("opens the deep-linked profile and publishes the selected agenda key", async ({ page }) => {
    const api = await setupSheetsApiMock(page, {
      spreadsheetId: "agenda-sheet-id",
      name: "Ward Agenda",
      tabs: [{ sheetId: 31, title: "Sheet1" }],
      sheets: {
        Sheet1: buildAgendaSheet([
          { key: "agendaGeneral", value: "Old note" },
          { key: "agendaBusinessCallings", value: "" }
        ])
      }
    });

    await bootstrapCmsPage(page, {
      relativePath: "cms_agenda/?profileId=profile-2",
      authenticated: true,
      profiles: [
        {
          id: "profile-1",
          agendaUrl: "https://docs.google.com/spreadsheets/d/other-agenda-sheet/edit",
          unitName: "Other Ward",
          lastUsed: Date.now() - 1000
        },
        {
          id: "profile-2",
          agendaUrl: "https://docs.google.com/spreadsheets/d/agenda-sheet-id/edit",
          unitName: "Target Ward",
          lastUsed: Date.now()
        }
      ],
      selectedProfileId: "profile-1",
      metadata: {
        googleClientId: "test-client-id.apps.googleusercontent.com"
      }
    });

    await expect(page.locator("#cms-agenda-profile-name")).toContainText("Target Ward");
    await page.selectOption("#cms-agenda-key-select", "agendaBusinessCallings");

    const firstRowInputs = page.locator(".agenda-key-editor__input");
    await firstRowInputs.nth(0).fill("Alice Example");
    await firstRowInputs.nth(1).fill("Primary President");
    await page.click("#cms-agenda-publish-btn");

    await expect(page.locator("#cms-agenda-page-status")).toContainText("Agenda changes published.");
    expect(api.getSheet("Sheet1")[2][1]).toBe("Alice Example|Primary President");
  });

  test("publishes pending draft keys and can make a new tab active", async ({ page }) => {
    const api = await setupSheetsApiMock(page, {
      spreadsheetId: "agenda-draft-sheet-id",
      name: "Ward Agenda Draft",
      tabs: [
        { sheetId: 41, title: "Sheet1" },
        { sheetId: 42, title: "May 25" }
      ],
      sheets: {
        Sheet1: buildAgendaSheet([
          { key: "agendaGeneral", value: "" },
          { key: "agendaAnnouncements", value: "" }
        ]),
        "May 25": buildAgendaSheet([{ key: "agendaGeneral", value: "Existing" }])
      }
    });

    await bootstrapCmsPage(page, {
      relativePath: "cms_agenda/?profileId=profile-3",
      authenticated: true,
      profiles: [
        {
          id: "profile-3",
          agendaUrl: "https://docs.google.com/spreadsheets/d/agenda-draft-sheet-id/edit",
          unitName: "Draft Ward",
          lastUsed: Date.now()
        }
      ],
      selectedProfileId: "profile-3",
      metadata: {
        googleClientId: "test-client-id.apps.googleusercontent.com"
      }
    });

    const generalTextarea = page.locator(".agenda-key-editor__textarea");
    await generalTextarea.fill("Remember the youth fireside");

    await page.selectOption("#cms-agenda-key-select", "agendaAnnouncements");
    const announcementInput = page.locator(".agenda-key-editor__input").first();
    await announcementInput.fill("Temple trip on Saturday");

    await expect(page.locator("#cms-agenda-pending-list")).toContainText("General Notes");
    await expect(page.locator("#cms-agenda-pending-list")).toContainText("Announcements");

    await page.click("#cms-agenda-publish-all-btn");
    await expect(page.locator("#cms-agenda-page-status")).toContainText(
      "Finished publishing pending agenda changes."
    );
    expect(api.getSheet("Sheet1")[1][1]).toBe("Remember the youth fireside");
    expect(api.getSheet("Sheet1")[2][1]).toBe("Temple trip on Saturday");

    await page.selectOption("#cms-agenda-tab-select", "May 25");
    await page.click("#cms-agenda-make-active-btn");

    await expect(page.locator("#cms-agenda-page-status")).toContainText(
      "Selected tab is now active."
    );
    expect(api.getTabs()[0].title).toBe("May 25");
  });
});
