import { test, expect } from "@playwright/test";

import { bootstrapCmsPage } from "../fixtures/cmsAuth.js";
import { buildProgramSheet, setupSheetsApiMock } from "../helpers/sheetsApiMock.js";

test.describe("Desktop CMS", () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "Desktop CMS E2E runs on chromium only.");
  });

  test("loads a seeded profile and saves program edits through the Sheets API", async ({ page }) => {
    const api = await setupSheetsApiMock(page, {
      spreadsheetId: "program-sheet-id",
      name: "Ward Program",
      tabs: [{ sheetId: 11, title: "May 18" }],
      sheets: {
        "May 18": buildProgramSheet([
          { key: "unitName", en: "Alpha Ward", es: "Barrio Alpha" },
          { key: "openingHymn", en: "123 | Opening Song", es: "123 | Himno" }
        ])
      }
    });

    await bootstrapCmsPage(page, {
      relativePath: "cms/",
      authenticated: true,
      profiles: [
        {
          id: "profile-1",
          url: "https://docs.google.com/spreadsheets/d/program-sheet-id/edit",
          unitName: "Alpha Ward",
          lastUsed: Date.now()
        }
      ],
      selectedProfileId: "profile-1",
      metadata: {
        googleClientId: "test-client-id.apps.googleusercontent.com"
      }
    });

    const unitNameInput = page.locator(
      '.cms-editor__input[data-key-type="unitName"][data-part-name="text"]'
    );
    await expect(unitNameInput).toBeVisible();
    await expect(page.locator("#cms-profile-name")).toContainText("Alpha Ward");

    await unitNameInput.fill("Beta Ward");
    await page.click("#cms-save-btn");

    await expect(page.locator("#cms-page-status")).toContainText("Saved to Google Sheets.");
    expect(api.getSheet("May 18")[1][1]).toBe("Beta Ward");
    expect(api.getWrites().some(write => write.type === "valueUpdate")).toBe(true);
  });

  test("shows the auth gate until fake Google sign-in completes", async ({ page }) => {
    await setupSheetsApiMock(page, {
      spreadsheetId: "program-sheet-auth-id",
      tabs: [{ sheetId: 21, title: "Sheet1" }],
      sheets: {
        Sheet1: buildProgramSheet([{ key: "unitName", en: "Signed In Ward" }])
      }
    });

    await bootstrapCmsPage(page, {
      relativePath: "cms/",
      authenticated: false,
      profiles: [
        {
          id: "profile-2",
          url: "https://docs.google.com/spreadsheets/d/program-sheet-auth-id/edit",
          unitName: "Signed In Ward",
          lastUsed: Date.now()
        }
      ],
      selectedProfileId: "profile-2",
      metadata: {
        googleClientId: "test-client-id.apps.googleusercontent.com"
      }
    });

    await expect(page.locator("#cms-auth-panel")).toBeVisible();
    await page.click("#cms-sign-in-btn");

    await expect(
      page.locator('.cms-editor__input[data-key-type="unitName"][data-part-name="text"]')
    ).toBeVisible();
    await expect(page.locator("#cms-content")).toBeVisible();
  });

  test("configures Google settings and signs in without a reload", async ({ page }) => {
    await setupSheetsApiMock(page, {
      spreadsheetId: "program-sheet-setup-id",
      tabs: [{ sheetId: 22, title: "Sheet1" }],
      sheets: {
        Sheet1: buildProgramSheet([{ key: "unitName", en: "Setup Ward" }])
      }
    });

    await bootstrapCmsPage(page, {
      relativePath: "cms/",
      authenticated: false,
      profiles: [
        {
          id: "profile-setup",
          url: "https://docs.google.com/spreadsheets/d/program-sheet-setup-id/edit",
          unitName: "Setup Ward",
          lastUsed: Date.now()
        }
      ],
      selectedProfileId: "profile-setup",
      metadata: {}
    });

    await expect(page.locator("#cms-sign-in-btn")).toBeHidden();
    await page.click("#cms-setup-btn");
    await page.fill("#cms-setup-client-id", "test-client-id.apps.googleusercontent.com");
    await page.click("#cms-setup-save-btn");

    await expect(page.locator("#cms-page-status")).toContainText("settings saved");
    await expect(page.locator("#cms-sign-in-btn")).toBeVisible();
    await page.click("#cms-sign-in-btn");

    await expect(
      page.locator('.cms-editor__input[data-key-type="unitName"][data-part-name="text"]')
    ).toBeVisible();
    await expect(page.locator("#cms-profile-name")).toContainText("Setup Ward");
  });

  test("restores a saved draft after an auth return reload", async ({ page }) => {
    await setupSheetsApiMock(page, {
      spreadsheetId: "program-sheet-restore-id",
      tabs: [{ sheetId: 23, title: "Sheet1" }],
      sheets: {
        Sheet1: buildProgramSheet([{ key: "unitName", en: "Sheet Ward" }])
      }
    });

    await bootstrapCmsPage(page, {
      relativePath: "cms/",
      authenticated: true,
      profiles: [
        {
          id: "profile-restore",
          url: "https://docs.google.com/spreadsheets/d/program-sheet-restore-id/edit",
          unitName: "Restore Ward",
          lastUsed: Date.now()
        }
      ],
      selectedProfileId: "profile-restore",
      metadata: {
        googleClientId: "test-client-id.apps.googleusercontent.com"
      },
      drafts: [
        {
          id: "cms_draft_profile-restore",
          profileId: "profile-restore",
          data: {
            locale: "en",
            selectedTabTitle: "Sheet1",
            rows: [{ key: "unitName", value: "Restored Ward" }],
            savedAt: Date.now()
          }
        }
      ],
      sessionStorage: {
        cms_auth_pending: "1"
      }
    });

    const unitNameInput = page.locator(
      '.cms-editor__input[data-key-type="unitName"][data-part-name="text"]'
    );
    await expect(unitNameInput).toBeVisible();
    await expect(unitNameInput).toHaveValue("Restored Ward");
    await expect(page.locator("#cms-page-status")).toContainText("Session restored");
  });

  test("returns to the auth gate when the save request receives an auth expiry", async ({ page }) => {
    await setupSheetsApiMock(page, {
      spreadsheetId: "program-sheet-expiry-id",
      tabs: [{ sheetId: 31, title: "Sheet1" }],
      sheets: {
        Sheet1: buildProgramSheet([{ key: "unitName", en: "Expiry Ward" }])
      },
      valueUpdateFailures: [{ status: 403, message: "expired" }]
    });

    await bootstrapCmsPage(page, {
      relativePath: "cms/",
      authenticated: true,
      profiles: [
        {
          id: "profile-expiry",
          url: "https://docs.google.com/spreadsheets/d/program-sheet-expiry-id/edit",
          unitName: "Expiry Ward",
          lastUsed: Date.now()
        }
      ],
      selectedProfileId: "profile-expiry",
      metadata: {
        googleClientId: "test-client-id.apps.googleusercontent.com"
      }
    });

    const unitNameInput = page.locator(
      '.cms-editor__input[data-key-type="unitName"][data-part-name="text"]'
    );
    await expect(unitNameInput).toBeVisible();

    await unitNameInput.fill("Expired Save Ward");
    await page.click("#cms-save-btn");

    await expect(page.locator("#cms-auth-panel")).toBeVisible();
    await expect(page.locator("#cms-page-status")).toContainText("session expired");
  });

  test("prompts for overwrite and saves after conflict acknowledgement", async ({ page }) => {
    const api = await setupSheetsApiMock(page, {
      spreadsheetId: "program-sheet-conflict-id",
      tabs: [{ sheetId: 41, title: "May 25" }],
      sheets: {
        "May 25": buildProgramSheet([{ key: "unitName", en: "Conflict Ward" }])
      },
      driveMetaSequence: [
        "2026-05-16T12:00:00.000Z",
        "2026-05-16T13:00:00.000Z",
        "2026-05-16T13:00:00.000Z",
        "2026-05-16T13:05:00.000Z"
      ]
    });

    await bootstrapCmsPage(page, {
      relativePath: "cms/",
      authenticated: true,
      profiles: [
        {
          id: "profile-conflict",
          url: "https://docs.google.com/spreadsheets/d/program-sheet-conflict-id/edit",
          unitName: "Conflict Ward",
          lastUsed: Date.now()
        }
      ],
      selectedProfileId: "profile-conflict",
      metadata: {
        googleClientId: "test-client-id.apps.googleusercontent.com"
      }
    });

    page.once("dialog", dialog => dialog.accept());

    const unitNameInput = page.locator(
      '.cms-editor__input[data-key-type="unitName"][data-part-name="text"]'
    );
    await unitNameInput.fill("Conflict Resolved Ward");
    await page.click("#cms-save-btn");

    await expect(page.locator("#cms-page-status")).toContainText("Saved to Google Sheets.");
    expect(api.getSheet("May 25")[1][1]).toBe("Conflict Resolved Ward");
    expect(api.getWrites().filter(write => write.type === "valueUpdate")).toHaveLength(1);
  });
});
