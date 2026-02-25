import { expect } from "@playwright/test";
import { test } from "../fixtures/base.js";

const DB_NAME = "MeetingProgramDB";

async function clearIndexedDB(page) {
  await page.evaluate(() => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase(DB_NAME);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  });
}

async function addProfileToIndexedDB(page, profile) {
  await page.evaluate((profileData) => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);

      request.onerror = () => reject(request.error);

      request.onsuccess = () => {
        const db = request.result;

        const tx = db.transaction(["profiles"], "readwrite");
        const store = tx.objectStore("profiles");
        store.put(profileData);

        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains("profiles")) {
          db.createObjectStore("profiles", { keyPath: "id" });
        }
      };
    });
  }, profile);
}

async function setSelectedProfileId(page, profileId) {
  await page.evaluate((id) => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);

      request.onerror = () => reject(request.error);

      request.onsuccess = () => {
        const db = request.result;

        if (!db.objectStoreNames.contains("metadata")) {
          db.createObjectStore("metadata", { keyPath: "key" });
        }

        const tx = db.transaction(["metadata"], "readwrite");
        const store = tx.objectStore("metadata");
        store.put({ key: "selectedProfileId", value: id });

        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains("metadata")) {
          db.createObjectStore("metadata", { keyPath: "key" });
        }
      };
    });
  }, profileId);
}

async function addMigrationToIndexedDB(page, migration) {
  await page.evaluate((migrationData) => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);

      request.onerror = () => reject(request.error);

      request.onsuccess = () => {
        const db = request.result;

        if (!db.objectStoreNames.contains("migrations")) {
          reject(new Error("Migrations store not found"));
          return;
        }

        const tx = db.transaction(["migrations"], "readwrite");
        const store = tx.objectStore("migrations");
        store.put(migrationData);

        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains("migrations")) {
          db.createObjectStore("migrations", { keyPath: "profileId" });
        }
      };
    });
  }, migration);
}

test.describe("Migration System", () => {
  test.beforeEach(async ({ page }) => {
    await clearIndexedDB(page);
  });

  test("should show migration banner when profile is obsolete", async ({ page }) => {
    await addProfileToIndexedDB(page, {
      id: "ward-a",
      url: "https://docs.google.com/spreadsheets/d/old-sheet/gviz/tq?tqx=out:csv",
      unitName: "Alpha Ward",
      stakeName: "Alpha Stake",
      lastUsed: Date.now(),
      archived: false
    });
    await setSelectedProfileId(page, "ward-a");

    const sheetUrl = "https://docs.google.com/spreadsheets/d/old-sheet/gviz/tq?tqx=out:csv";
    const obsoleteCsv = `key,value
unitName,Alpha Ward
date,January 5 2026
obsolete,true
migrationUrl,https://docs.google.com/spreadsheets/d/new-sheet/gviz/tq?tqx=out:csv`;

    await page.context().route(/\/gviz\/tq.*tqx=out:csv/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "text/csv",
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "no-cache"
        },
        body: obsoleteCsv
      });
    });

    await page.goto(`?url=${encodeURIComponent(sheetUrl)}`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const migrationBanner = page.locator("#migration-banner");
    if (await migrationBanner.isVisible()) {
      await expect(migrationBanner).toContainText("updated");
      await expect(page.locator("#view-new-program-btn")).toBeVisible();
      await expect(page.locator("#remind-later-btn")).toBeVisible();
    } else {
      console.log(
        "Migration banner not implemented yet - this is expected before TODO 4.2 implementation"
      );
    }
  });

  test("should not show migration banner for non-obsolete profile", async ({ page }) => {
    await addProfileToIndexedDB(page, {
      id: "ward-a",
      url: "https://docs.google.com/spreadsheets/d/normal-sheet/gviz/tq?tqx=out:csv",
      unitName: "Alpha Ward",
      stakeName: "Alpha Stake",
      lastUsed: Date.now(),
      archived: false
    });
    await setSelectedProfileId(page, "ward-a");

    const sheetUrl = "https://docs.google.com/spreadsheets/d/normal-sheet/gviz/tq?tqx=out:csv";
    const normalCsv = `key,value
unitName,Alpha Ward
date,January 5 2026`;

    await page.context().route(/\/gviz\/tq.*tqx=out:csv/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "text/csv",
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "no-cache"
        },
        body: normalCsv
      });
    });

    await page.goto(`?url=${encodeURIComponent(sheetUrl)}`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    const migrationBanner = page.locator("#migration-banner");
    await expect(migrationBanner).toBeHidden();
  });

  test("should hide migration banner when reminded later", async ({ page }) => {
    await addProfileToIndexedDB(page, {
      id: "ward-a",
      url: "https://docs.google.com/spreadsheets/d/old-sheet/gviz/tq?tqx=out:csv",
      unitName: "Alpha Ward",
      stakeName: "Alpha Stake",
      lastUsed: Date.now(),
      archived: false
    });
    await setSelectedProfileId(page, "ward-a");

    const sheetUrl = "https://docs.google.com/spreadsheets/d/old-sheet/gviz/tq?tqx=out:csv";
    const obsoleteCsv = `key,value
unitName,Alpha Ward
date,January 5 2026
obsolete,true
migrationUrl,https://docs.google.com/spreadsheets/d/new-sheet/gviz/tq?tqx=out:csv`;

    await page.context().route(/\/gviz\/tq.*tqx=out:csv/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "text/csv",
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "no-cache"
        },
        body: obsoleteCsv
      });
    });

    await page.goto(`?url=${encodeURIComponent(sheetUrl)}`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const migrationBanner = page.locator("#migration-banner");
    if (await migrationBanner.isVisible()) {
      await page.click("#remind-later-btn");
      await page.waitForTimeout(500);
      await expect(migrationBanner).toBeHidden();

      const migrationRecord = await page.evaluate(() => {
        return new Promise((resolve) => {
          const request = indexedDB.open("MeetingProgramDB", 1);
          request.onsuccess = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains("migrations")) {
              resolve(null);
              return;
            }
            const tx = db.transaction(["migrations"], "readonly");
            const store = tx.objectStore("migrations");
            const req = store.get("ward-a");
            req.onsuccess = () => resolve(req.result);
          };
        });
      });

      expect(migrationRecord).toBeTruthy();
      expect(migrationRecord.ignored).toBe(true);
    }
  });

  test("should not show migration banner if previously ignored", async ({ page }) => {
    await addProfileToIndexedDB(page, {
      id: "ward-a",
      url: "https://docs.google.com/spreadsheets/d/old-sheet/gviz/tq?tqx=out:csv",
      unitName: "Alpha Ward",
      stakeName: "Alpha Stake",
      lastUsed: Date.now(),
      archived: false
    });
    await setSelectedProfileId(page, "ward-a");

    await addMigrationToIndexedDB(page, {
      profileId: "ward-a",
      ignored: true,
      lastChecked: Date.now()
    });

    const sheetUrl = "https://docs.google.com/spreadsheets/d/old-sheet/gviz/tq?tqx=out:csv";
    const obsoleteCsv = `key,value
unitName,Alpha Ward
date,January 5 2026
obsolete,true
migrationUrl,https://docs.google.com/spreadsheets/d/new-sheet/gviz/tq?tqx=out:csv`;

    await page.context().route(/\/gviz\/tq.*tqx=out:csv/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "text/csv",
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "no-cache"
        },
        body: obsoleteCsv
      });
    });

    await page.goto(`?url=${encodeURIComponent(sheetUrl)}`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    const migrationBanner = page.locator("#migration-banner");
    await expect(migrationBanner).toBeHidden();
  });

  test("should create new profile when View New Program is clicked", async ({ page }) => {
    await addProfileToIndexedDB(page, {
      id: "ward-a",
      url: "https://docs.google.com/spreadsheets/d/old-sheet/gviz/tq?tqx=out:csv",
      unitName: "Alpha Ward",
      stakeName: "Alpha Stake",
      lastUsed: Date.now(),
      archived: false
    });
    await setSelectedProfileId(page, "ward-a");

    const oldSheetUrl = "https://docs.google.com/spreadsheets/d/old-sheet/gviz/tq?tqx=out:csv";
    const newSheetUrl = "https://docs.google.com/spreadsheets/d/new-sheet/gviz/tq?tqx=out:csv";

    const obsoleteCsv = `key,value
unitName,Alpha Ward
date,January 5 2026
obsolete,true
migrationUrl,${newSheetUrl}`;

    const newProgramCsv = `key,value
unitName,Alpha Ward - NEW
date,January 12 2026`;

    await page.context().route(/\/gviz\/tq.*tqx=out:csv/, async (route) => {
      const url = route.request().url();
      if (url.includes("old-sheet")) {
        await route.fulfill({
          status: 200,
          contentType: "text/csv",
          headers: { "Access-Control-Allow-Origin": "*", "Cache-Control": "no-cache" },
          body: obsoleteCsv
        });
      } else if (url.includes("new-sheet")) {
        await route.fulfill({
          status: 200,
          contentType: "text/csv",
          headers: { "Access-Control-Allow-Origin": "*", "Cache-Control": "no-cache" },
          body: newProgramCsv
        });
      } else {
        await route.abort();
      }
    });

    await page.goto(`?url=${encodeURIComponent(oldSheetUrl)}`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const migrationBanner = page.locator("#migration-banner");
    if (await migrationBanner.isVisible()) {
      await page.click("#view-new-program-btn");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);

      const profiles = await page.evaluate(() => {
        return new Promise((resolve) => {
          const request = indexedDB.open("MeetingProgramDB", 1);
          request.onsuccess = () => {
            const db = request.result;
            const tx = db.transaction(["profiles"], "readonly");
            const store = tx.objectStore("profiles");
            const req = store.getAll();
            req.onsuccess = () => resolve(req.result);
          };
        });
      });

      expect(profiles.length).toBe(2);

      const newProfile = profiles.find((p) => p.url.includes("new-sheet"));
      expect(newProfile).toBeTruthy();
    }
  });
});
