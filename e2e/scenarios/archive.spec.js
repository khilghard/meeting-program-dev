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

async function addArchiveToIndexedDB(page, archive) {
  await page.evaluate((archiveData) => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);

      request.onerror = () => reject(request.error);

      request.onsuccess = () => {
        const db = request.result;

        if (!db.objectStoreNames.contains("archives")) {
          reject(new Error("Archives store not found"));
          return;
        }

        const tx = db.transaction(["archives"], "readwrite");
        const store = tx.objectStore("archives");
        store.put(archiveData);

        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains("archives")) {
          db.createObjectStore("archives", { keyPath: "id" });
        }
      };
    });
  }, archive);
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

test.describe("Archive System", () => {
  test.beforeEach(async ({ page }) => {
    await clearIndexedDB(page);
  });

  test("should display archive list with multiple archives sorted by date", async ({ page }) => {
    await addProfileToIndexedDB(page, {
      id: "ward-a",
      url: "https://docs.google.com/spreadsheets/d/ward-a/gviz/tq?tqx=out:csv",
      unitName: "Alpha Ward",
      stakeName: "Alpha Stake",
      lastUsed: Date.now(),
      archived: false
    });
    await setSelectedProfileId(page, "ward-a");

    await addArchiveToIndexedDB(page, {
      id: "ward-a||2026-01-05",
      profileId: "ward-a",
      programDate: "2026-01-05",
      csvData: "key,value\nunitName,Alpha Ward\ndate,January 5 2026",
      checksum: "abc123",
      cachedAt: Date.now() - 86400000
    });

    await addArchiveToIndexedDB(page, {
      id: "ward-a||2026-01-12",
      profileId: "ward-a",
      programDate: "2026-01-12",
      csvData: "key,value\nunitName,Alpha Ward\ndate,January 12 2026",
      checksum: "def456",
      cachedAt: Date.now()
    });

    await addArchiveToIndexedDB(page, {
      id: "ward-a||2026-01-19",
      profileId: "ward-a",
      programDate: "2026-01-19",
      csvData: "key,value\nunitName,Alpha Ward\ndate,January 19 2026",
      checksum: "ghi789",
      cachedAt: Date.now() + 86400000
    });

    await page.goto("archive.html");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(1000);

    await expect(page.locator("#archive-title")).toBeVisible();

    const archiveItems = page.locator(".archive-item");
    await expect(archiveItems).toHaveCount(3);

    const dates = await archiveItems.allTextContents();
    expect(dates[0]).toContain("January 19");
    expect(dates[1]).toContain("January 12");
    expect(dates[2]).toContain("January 5");
  });

  test("should display storage info in archive page", async ({ page }) => {
    await addProfileToIndexedDB(page, {
      id: "ward-a",
      url: "https://docs.google.com/spreadsheets/d/ward-a/gviz/tq?tqx=out:csv",
      unitName: "Alpha Ward",
      stakeName: "Alpha Stake",
      lastUsed: Date.now(),
      archived: false
    });
    await setSelectedProfileId(page, "ward-a");

    await addArchiveToIndexedDB(page, {
      id: "ward-a||2026-01-05",
      profileId: "ward-a",
      programDate: "2026-01-05",
      csvData: "key,value\nunitName,Alpha Ward\ndate,January 5 2026",
      checksum: "abc123",
      cachedAt: Date.now()
    });

    await page.goto("archive.html");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(1000);

    const storageInfo = page.locator("#storage-info");
    await expect(storageInfo).toBeVisible();
  });

  test("should show no archives message when empty", async ({ page }) => {
    await addProfileToIndexedDB(page, {
      id: "ward-a",
      url: "https://docs.google.com/spreadsheets/d/ward-a/gviz/tq?tqx=out:csv",
      unitName: "Alpha Ward",
      stakeName: "Alpha Stake",
      lastUsed: Date.now(),
      archived: false
    });
    await setSelectedProfileId(page, "ward-a");

    await page.goto("archive.html");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(1000);

    const noArchives = page.locator("#no-archives");
    await expect(noArchives).toBeVisible();
    await expect(noArchives).toContainText("No archives found");
  });

  test("should show message when no profile selected", async ({ page }) => {
    await page.goto("archive.html");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(1000);

    const noArchives = page.locator("#no-archives");
    await expect(noArchives).toBeVisible();
    await expect(noArchives).toContainText("No profile selected");
  });

  test("should view archive program details", async ({ page }) => {
    await addProfileToIndexedDB(page, {
      id: "ward-a",
      url: "https://docs.google.com/spreadsheets/d/ward-a/gviz/tq?tqx=out:csv",
      unitName: "Alpha Ward",
      stakeName: "Alpha Stake",
      lastUsed: Date.now(),
      archived: false
    });
    await setSelectedProfileId(page, "ward-a");

    await addArchiveToIndexedDB(page, {
      id: "ward-a||2026-01-05",
      profileId: "ward-a",
      programDate: "2026-01-05",
      csvData:
        "key,value\nunitName,Alpha Ward\nunitAddress,123 Main St\ndate,January 5 2026\npresiding,Bishop Smith\nopeningHymn,#1",
      checksum: "abc123",
      cachedAt: Date.now()
    });

    await page.goto("archive.html");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(1000);

    await page.click(".archive-item .primary-btn");
    await page.waitForTimeout(500);

    const archiveProgramView = page.locator("#archive-program-view");
    await expect(archiveProgramView).toBeVisible();

    await expect(page.locator("#unitname")).toHaveText("Alpha Ward");
    await expect(page.locator("#date")).toContainText("January");
  });

  test("should navigate back to archive list from program view", async ({ page }) => {
    await addProfileToIndexedDB(page, {
      id: "ward-a",
      url: "https://docs.google.com/spreadsheets/d/ward-a/gviz/tq?tqx=out:csv",
      unitName: "Alpha Ward",
      stakeName: "Alpha Stake",
      lastUsed: Date.now(),
      archived: false
    });
    await setSelectedProfileId(page, "ward-a");

    await addArchiveToIndexedDB(page, {
      id: "ward-a||2026-01-05",
      profileId: "ward-a",
      programDate: "2026-01-05",
      csvData: "key,value\nunitName,Alpha Ward\ndate,January 5 2026",
      checksum: "abc123",
      cachedAt: Date.now()
    });

    await page.goto("archive.html");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(1000);

    await page.click(".archive-item .primary-btn");
    await page.waitForTimeout(500);

    await page.click("#back-to-list-btn");
    await page.waitForTimeout(500);

    const archiveListView = page.locator("#archive-list-view");
    await expect(archiveListView).toBeVisible();
    await expect(page.locator(".archive-item")).toBeVisible();
  });

  test("should switch language in archive page and reflect in program view", async ({ page }) => {
    await addProfileToIndexedDB(page, {
      id: "ward-a",
      url: "https://docs.google.com/spreadsheets/d/ward-a/gviz/tq?tqx=out:csv",
      unitName: "Alpha Ward",
      stakeName: "Alpha Stake",
      lastUsed: Date.now(),
      archived: false
    });
    await setSelectedProfileId(page, "ward-a");

    await addArchiveToIndexedDB(page, {
      id: "ward-a||2026-01-05",
      profileId: "ward-a",
      programDate: "2026-01-05",
      csvData: "key,value\nunitName,Alpha Ward\ndate,January 5 2026\npresiding,Bishop Smith",
      checksum: "abc123",
      cachedAt: Date.now()
    });

    await page.goto("archive.html");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(1000);

    await page.click(".archive-item .primary-btn");
    await page.waitForTimeout(500);

    let presidingLabel = page.locator("#presiding .label");
    await expect(presidingLabel).toHaveText("Presiding");

    await page.click("#back-to-list-btn");
    await page.waitForTimeout(500);

    await page.click("#language-selector-btn");
    await page.click(".language-item:has-text('Español')");
    await page.waitForTimeout(1500);

    await page.click(".archive-item .primary-btn");
    await page.waitForTimeout(500);

    presidingLabel = page.locator("#presiding .label");
    await expect(presidingLabel).toHaveText("Presidiendo");
  });
});
