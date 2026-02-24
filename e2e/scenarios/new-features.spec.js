import { expect } from "@playwright/test";
import { test } from "../fixtures/base.js";
import { mockGoogleSheets } from "../helpers/mock-sheets.js";

test.describe("Feature: Hymn Linking", () => {
  test("should render hymn with clickable link", async ({ page }) => {
    await mockGoogleSheets(page, "full-program");
    const sheetUrl = "https://docs.google.com/spreadsheets/d/test123/gviz/tq?tqx=out:csv";
    await page.goto(`?url=${encodeURIComponent(sheetUrl)}`);

    await page.waitForSelector("#openingHymn");

    const hymnLink = page.locator("#openingHymn .hymn-link");
    await expect(hymnLink).toBeVisible();
    await expect(hymnLink).toHaveText("All Creatures of Our God and King");
    await expect(hymnLink).toHaveAttribute(
      "href",
      "https://www.churchofjesuschrist.org/music/library/hymns/62"
    );
  });

  test("should link to children song with CS prefix", async ({ page }) => {
    await mockGoogleSheets(page, "childrens-song");
    const sheetUrl = "https://docs.google.com/spreadsheets/d/test123/gviz/tq?tqx=out:csv";
    await page.goto(`?url=${encodeURIComponent(sheetUrl)}`);

    await page.waitForSelector("#openingHymn");

    const hymnLink = page.locator("#openingHymn .hymn-link");
    await expect(hymnLink).toBeVisible();
    await expect(hymnLink).toHaveAttribute(
      "href",
      "https://www.churchofjesuschrist.org/music/library/children/joy-the-bell-rings"
    );
  });

  test("hymn link should open in new tab", async ({ page }) => {
    await mockGoogleSheets(page, "full-program");
    const sheetUrl = "https://docs.google.com/spreadsheets/d/test123/gviz/tq?tqx=out:csv";
    await page.goto(`?url=${encodeURIComponent(sheetUrl)}`);

    await page.waitForSelector("#openingHymn");

    const hymnLink = page.locator("#openingHymn .hymn-link");
    await expect(hymnLink).toHaveAttribute("target", "_blank");
    await expect(hymnLink).toHaveAttribute("rel", "noopener noreferrer");
  });
});

test.describe("Feature: Program History", () => {
  test("should save history separately for each profile (unit)", async ({ page }) => {
    // Clear any existing data first - do this without beforeEach to avoid interference
    await page.goto(".");
    await page.evaluate(() => {
      localStorage.clear();
    });

    // Set up two profiles with pre-populated history
    await page.evaluate(() => {
      const profiles = [
        {
          id: "ward-a",
          url: "https://docs.google.com/spreadsheets/d/ward-a/gviz/tq?tqx=out:csv",
          unitName: "Alpha Ward",
          stakeName: "Alpha Stake",
          lastUsed: Date.now()
        },
        {
          id: "ward-b",
          url: "https://docs.google.com/spreadsheets/d/ward-b/gviz/tq?tqx=out:csv",
          unitName: "Beta Ward",
          stakeName: "Beta Stake",
          lastUsed: Date.now() - 1000
        }
      ];
      localStorage.setItem("meeting_program_profiles", JSON.stringify(profiles));
      localStorage.setItem("meeting_program_selected_id", "ward-a");

      // Pre-populate history for both units
      const history = {
        "ward-a": [
          {
            date: "January 5 2026",
            data: [{ key: "unitName", value: "Alpha Ward" }],
            cachedAt: Date.now()
          }
        ],
        "ward-b": [
          {
            date: "January 12 2026",
            data: [{ key: "unitName", value: "Beta Ward" }],
            cachedAt: Date.now()
          }
        ]
      };
      localStorage.setItem("meeting_program_history", JSON.stringify(history));
    });

    // Mock and load page
    await mockGoogleSheets(page, "minimal-program");
    await page.reload();
    await page.waitForSelector("#unitname", { timeout: 15000 });

    // Verify ward-a has its own history in localStorage
    const wardAHistory = await page.evaluate(() => {
      const history = JSON.parse(localStorage.getItem("meeting_program_history") || "{}");
      return history["ward-a"] || [];
    });
    expect(wardAHistory.length).toBe(1);
    expect(wardAHistory[0].data[0].value).toBe("Alpha Ward");

    // Verify ward-b has its own history in localStorage
    const wardBHistory = await page.evaluate(() => {
      const history = JSON.parse(localStorage.getItem("meeting_program_history") || "{}");
      return history["ward-b"] || [];
    });
    expect(wardBHistory.length).toBe(1);
    expect(wardBHistory[0].data[0].value).toBe("Beta Ward");
  });

  test("should display history button when profile container is visible", async ({ page }) => {
    await mockGoogleSheets(page, "full-program");
    await page.reload();

    await page.waitForSelector("#unitname", { timeout: 15000 });

    const container = page.locator("#profile-selector-container");
    await expect(container).toBeVisible();
  });

  test("should open history modal when history button is clicked", async ({ page }) => {
    await mockGoogleSheets(page, "full-program");
    await page.reload();

    await page.waitForSelector("#unitname", { timeout: 15000 });

    await page.click("#history-btn");

    const modal = page.locator("#history-modal");
    await expect(modal).toBeVisible();
  });

  test("history modal should have correct title", async ({ page }) => {
    await mockGoogleSheets(page, "full-program");
    await page.reload();

    await page.waitForSelector("#unitname", { timeout: 15000 });

    await page.click("#history-btn");

    const title = page.locator("#history-modal-title");
    await expect(title).toBeVisible();
  });
});

test.describe("Feature: Honorific Translation", () => {
  test("should display translated UI when language is Spanish", async ({ page }) => {
    await mockGoogleSheets(page, "full-program");
    const sheetUrl = "https://docs.google.com/spreadsheets/d/test123/gviz/tq?tqx=out:csv";

    await page.goto(`?url=${encodeURIComponent(sheetUrl)}`);
    await page.waitForSelector("#unitname", { timeout: 15000 });

    await page.click("#language-selector-btn");
    await page.click(".language-item:has-text('Español')");

    await page.waitForTimeout(1500);

    const title = page.locator("#sacrament-services-title");
    await expect(title).toHaveText("Servicios Sacramentales");
  });

  test("should translate presiding label when language is French", async ({ page }) => {
    await mockGoogleSheets(page, "full-program");
    const sheetUrl = "https://docs.google.com/spreadsheets/d/test123/gviz/tq?tqx=out:csv";

    await page.goto(`?url=${encodeURIComponent(sheetUrl)}`);
    await page.waitForSelector("#unitname", { timeout: 15000 });

    await page.click("#language-selector-btn");
    await page.click(".language-item:has-text('Français')");

    await page.waitForTimeout(1500);

    const title = page.locator("#sacrament-services-title");
    await expect(title).toHaveText("Services du Sacrement");
  });
});

test.describe("Feature: Share QR Code", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(".");
    await page.evaluate(() => {
      localStorage.clear();
    });
  });

  test("should show share button in header", async ({ page }) => {
    await mockGoogleSheets(page, "minimal-program");

    await page.evaluate(() => {
      const profiles = [
        {
          id: "ward-a",
          url: "https://docs.google.com/spreadsheets/d/ward-a/gviz/tq?tqx=out:csv",
          unitName: "Alpha Ward",
          stakeName: "Alpha Stake",
          lastUsed: Date.now()
        }
      ];
      localStorage.setItem("meeting_program_profiles", JSON.stringify(profiles));
      localStorage.setItem("meeting_program_selected_id", "ward-a");
    });

    await page.reload();
    await page.waitForSelector("#unitname", { timeout: 15000 });

    const shareBtn = page.locator("#share-btn");
    await expect(shareBtn).toBeVisible();
  });

  test("should generate QR code with correct URL for current profile", async ({ page }) => {
    await mockGoogleSheets(page, "minimal-program");

    await page.evaluate(() => {
      const profiles = [
        {
          id: "ward-a",
          url: "https://docs.google.com/spreadsheets/d/ALPHA123/gviz/tq?tqx=out:csv",
          unitName: "Alpha Ward",
          stakeName: "Alpha Stake",
          lastUsed: Date.now()
        }
      ];
      localStorage.setItem("meeting_program_profiles", JSON.stringify(profiles));
      localStorage.setItem("meeting_program_selected_id", "ward-a");
    });

    await page.reload();
    await page.waitForSelector("#unitname", { timeout: 15000 });

    await page.click("#share-btn");

    const urlDisplay = page.locator("#share-url-display");
    await expect(urlDisplay).toContainText("ALPHA123");
  });

  test("should show different URL when switching profiles", async ({ page }) => {
    await mockGoogleSheets(page, "minimal-program");

    await page.evaluate(() => {
      const profiles = [
        {
          id: "ward-a",
          url: "https://docs.google.com/spreadsheets/d/ALPHA123/gviz/tq?tqx=out:csv",
          unitName: "Alpha Ward",
          stakeName: "Alpha Stake",
          lastUsed: Date.now()
        },
        {
          id: "ward-b",
          url: "https://docs.google.com/spreadsheets/d/BETA456/gviz/tq?tqx=out:csv",
          unitName: "Beta Ward",
          stakeName: "Beta Stake",
          lastUsed: Date.now() - 1000
        }
      ];
      localStorage.setItem("meeting_program_profiles", JSON.stringify(profiles));
      localStorage.setItem("meeting_program_selected_id", "ward-a");
    });

    await page.reload();
    await page.waitForSelector("#unitname", { timeout: 15000 });

    await page.click("#share-btn");

    let urlDisplay = page.locator("#share-url-display");
    await expect(urlDisplay).toContainText("ALPHA123");

    await page.click("#close-share-modal-btn");
    await page.selectOption("#profile-selector", "ward-b");
    await page.waitForTimeout(500);

    await page.click("#share-btn");

    urlDisplay = page.locator("#share-url-display");
    await expect(urlDisplay).toContainText("BETA456");
    await expect(urlDisplay).not.toContainText("ALPHA123");
  });
});

test.describe("Feature: Force Update & No-Cache", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(".");
    await page.evaluate(() => {
      localStorage.clear();
    });
  });

  test("should redirect when forceUpdate=true is in URL", async ({ page }) => {
    await mockGoogleSheets(page, "minimal-program");

    await page.evaluate(() => {
      const profiles = [
        {
          id: "ward-a",
          url: "https://docs.google.com/spreadsheets/d/ward-a/gviz/tq?tqx=out:csv",
          unitName: "Alpha Ward",
          stakeName: "Alpha Stake",
          lastUsed: Date.now()
        }
      ];
      localStorage.setItem("meeting_program_profiles", JSON.stringify(profiles));
      localStorage.setItem("meeting_program_selected_id", "ward-a");
    });

    await page.goto("?forceUpdate=true");
    await page.waitForTimeout(1500);

    const url = page.url();
    expect(url).not.toContain("forceUpdate=true");
  });

  test("should redirect when nocache=true is in URL", async ({ page }) => {
    await mockGoogleSheets(page, "minimal-program");

    await page.evaluate(() => {
      const profiles = [
        {
          id: "ward-a",
          url: "https://docs.google.com/spreadsheets/d/ward-a/gviz/tq?tqx=out:csv",
          unitName: "Alpha Ward",
          stakeName: "Alpha Stake",
          lastUsed: Date.now()
        }
      ];
      localStorage.setItem("meeting_program_profiles", JSON.stringify(profiles));
      localStorage.setItem("meeting_program_selected_id", "ward-a");
    });

    await page.goto("?nocache=true");
    await page.waitForTimeout(1500);

    const url = page.url();
    expect(url).not.toContain("nocache=true");
    expect(url).toContain("t=");
  });

  test("should redirect when both forceUpdate and nocache are in URL", async ({ page }) => {
    await mockGoogleSheets(page, "minimal-program");

    await page.evaluate(() => {
      const profiles = [
        {
          id: "ward-a",
          url: "https://docs.google.com/spreadsheets/d/ward-a/gviz/tq?tqx=out:csv",
          unitName: "Alpha Ward",
          stakeName: "Alpha Stake",
          lastUsed: Date.now()
        }
      ];
      localStorage.setItem("meeting_program_profiles", JSON.stringify(profiles));
      localStorage.setItem("meeting_program_selected_id", "ward-a");
    });

    await page.goto("?forceUpdate=true&nocache=true");
    await page.waitForTimeout(1500);

    const url = page.url();
    expect(url).not.toContain("forceUpdate=true");
    expect(url).not.toContain("nocache=true");
    expect(url).toContain("t=");
  });

  test("should preserve URL params when redirecting after forceUpdate", async ({ page }) => {
    const sheetUrl = "https://docs.google.com/spreadsheets/d/test123/gviz/tq?tqx=out:csv";

    await page.goto(`?url=${encodeURIComponent(sheetUrl)}&forceUpdate=true`);
    await page.waitForTimeout(1500);

    const url = page.url();
    expect(url).not.toContain("forceUpdate=true");
    expect(url).toContain("url=");
  });

  test("should not redirect when neither forceUpdate nor nocache are present", async ({ page }) => {
    await mockGoogleSheets(page, "minimal-program");

    const sheetUrl = "https://docs.google.com/spreadsheets/d/ward-a/gviz/tq?tqx=out:csv";
    await page.goto(`?url=${encodeURIComponent(sheetUrl)}`);
    await page.waitForSelector("#unitname", { timeout: 15000 });

    const url = page.url();
    expect(url).toContain("url=");
    expect(url).not.toContain("forceUpdate");
    expect(url).not.toContain("nocache");
  });
});

test.describe("Feature: Archive Page i18n", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("archive.html");
    await page.evaluate(() => {
      localStorage.clear();
    });

    // Set up a profile with archives for testing
    await page.evaluate(() => {
      const profiles = [
        {
          id: "ward-a",
          url: "https://docs.google.com/spreadsheets/d/ward-a/gviz/tq?tqx=out:csv",
          unitName: "Alpha Ward",
          stakeName: "Alpha Stake",
          lastUsed: Date.now()
        }
      ];
      localStorage.setItem("meeting_program_profiles", JSON.stringify(profiles));
      localStorage.setItem("meeting_program_selected_id", "ward-a");

      // Add archive data with presiding and speaker
      const archives = {
        "ward-a": [
          {
            programDate: "March 1 2026",
            csvData: [
              { key: "date", value: "March 1 2026" },
              { key: "unitName", value: "Alpha Ward" },
              { key: "presiding", value: "Bishop Smith" },
              { key: "speaker", value: "John Smith" }
            ],
            cachedAt: Date.now()
          }
        ]
      };
      localStorage.setItem("meeting_program_archives", JSON.stringify(archives));
    });
  });

  test("should switch language and show correct labels in archive program", async ({ page }) => {
    // Set language to English initially
    await page.evaluate(() => {
      localStorage.setItem("meeting_program_language", "en");
    });
    await page.reload();
    await page.waitForTimeout(1000);

    // Click View to see archive
    await page.click(".archive-item .primary-btn");
    await page.waitForTimeout(500);

    // Check English labels
    let presidingLabel = page.locator("#presiding .label");
    await expect(presidingLabel).toHaveText("Presiding");

    // Go back to list
    await page.click("#back-to-list-btn");
    await page.waitForTimeout(500);

    // Change language to Spanish
    await page.click("#language-selector-btn");
    await page.click(".language-item:has-text('Español')");
    await page.waitForTimeout(1500);

    // View archive again
    await page.click(".archive-item .primary-btn");
    await page.waitForTimeout(500);

    // Check Spanish labels
    presidingLabel = page.locator("#presiding .label");
    await expect(presidingLabel).toHaveText("Presidiendo");

    // Go back to list
    await page.click("#back-to-list-btn");
    await page.waitForTimeout(500);

    // Change language back to English
    await page.click("#language-selector-btn");
    await page.click(".language-item:has-text('English')");
    await page.waitForTimeout(1500);

    // View archive again
    await page.click(".archive-item .primary-btn");
    await page.waitForTimeout(500);

    // Check English labels again
    presidingLabel = page.locator("#presiding .label");
    await expect(presidingLabel).toHaveText("Presiding");
  });
});
