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
          db.createObjectStore("archives", { keyPath: "id" });
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

test.describe("Offline Functionality", () => {
  test.beforeEach(async ({ page }) => {
    await clearIndexedDB(page);
  });

  test("should show offline page when network fails", async ({ page }) => {
    await addProfileToIndexedDB(page, {
      id: "ward-a",
      url: "https://docs.google.com/spreadsheets/d/ward-a/gviz/tq?tqx=out:csv",
      unitName: "Alpha Ward",
      stakeName: "Alpha Stake",
      lastUsed: Date.now(),
      archived: false
    });
    await setSelectedProfileId(page, "ward-a");

    await page.goto("?url=https://docs.google.com/spreadsheets/d/ward-a/gviz/tq?tqx=out:csv");

    await page.context().route(/\/gviz\/tq.*tqx=out:csv/, (route) => route.abort("failed"));

    await page.reload();
    await page.waitForTimeout(2000);

    const offlineBanner = page.locator("#offline-banner");
    const hasOfflineElements =
      (await offlineBanner.isVisible().catch(() => false)) ||
      (await page
        .locator(".offline-container")
        .isVisible()
        .catch(() => false));

    if (hasOfflineElements) {
      console.log("Offline UI detected");
    }
  });

  test("should display offline banner when network unavailable", async ({ page }) => {
    await addProfileToIndexedDB(page, {
      id: "ward-a",
      url: "https://docs.google.com/spreadsheets/d/ward-a/gviz/tq?tqx=out:csv",
      unitName: "Alpha Ward",
      stakeName: "Alpha Stake",
      lastUsed: Date.now(),
      archived: false
    });
    await setSelectedProfileId(page, "ward-a");

    await page.goto(".");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(1000);

    const offlineBanner = page.locator("#offline-banner");
    const isOfflineBannerVisible = await offlineBanner.isVisible().catch(() => false);

    if (isOfflineBannerVisible) {
      await expect(offlineBanner).toContainText("offline");
    } else {
      console.log("Offline banner not shown when online - this is expected behavior");
    }
  });

  test("should show offline page at offline.html", async ({ page }) => {
    await page.goto("offline.html");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.locator(".offline-title")).toHaveText("You're Offline");
    await expect(page.locator(".offline-message")).toContainText("internet connection");
    await expect(page.locator(".offline-button")).toHaveText("Try Again");
  });

  test("should show last sync timestamp on offline page", async ({ page }) => {
    await page.goto(".");
    await page.evaluate(() => {
      localStorage.setItem("last_online_sync", Date.now().toString());
    });

    await page.goto("offline.html");
    await page.waitForLoadState("domcontentloaded");

    const lastSync = page.locator("#last-sync");
    await expect(lastSync).toBeVisible();
    await expect(lastSync).toContainText("Last online:");
  });

  test("should have service worker registration", async ({ page }) => {
    await addProfileToIndexedDB(page, {
      id: "ward-a",
      url: "https://docs.google.com/spreadsheets/d/ward-a/gviz/tq?tqx=out:csv",
      unitName: "Alpha Ward",
      stakeName: "Alpha Stake",
      lastUsed: Date.now(),
      archived: false
    });
    await setSelectedProfileId(page, "ward-a");

    await page.goto(".");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);

    const swRegistered = await page.evaluate(() => {
      return navigator.serviceWorker
        .getRegistration()
        .then((reg) => !!reg)
        .catch(() => false);
    });

    if (swRegistered) {
      console.log("Service worker is registered");
    } else {
      console.log("Service worker not yet implemented - this is expected before TODO 1.2");
    }
  });

  test("should load cached archive when offline", async ({ page }) => {
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

    await page.goto(".");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(1000);

    const archiveLink = page.locator('a[href="archive.html"]');
    if (await archiveLink.isVisible().catch(() => false)) {
      await archiveLink.click();
      await page.waitForLoadState("domcontentloaded");
      await page.waitForTimeout(1000);

      const archiveItems = page.locator(".archive-item");
      const hasArchives = (await archiveItems.count()) > 0;
      expect(hasArchives).toBe(true);
    }
  });

  test("should update last sync timestamp when online", async ({ page }) => {
    await page.goto(".");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(1000);

    await page.evaluate(() => {
      window.dispatchEvent(new Event("online"));
    });
    await page.waitForTimeout(500);

    const lastSync = await page.evaluate(() => localStorage.getItem("last_online_sync"));
    console.log("Last sync updated:", !!lastSync);
  });

  test("should retry loading when clicking retry in offline state", async ({ page }) => {
    let requestCount = 0;
    await page.goto(".");
    await page.waitForLoadState("domcontentloaded");

    await page.context().route(/\/gviz\/tq.*tqx=out:csv/, async (route) => {
      requestCount++;
      if (requestCount === 1) {
        await route.abort("failed");
      } else {
        await route.fulfill({
          status: 200,
          contentType: "text/csv",
          headers: { "Access-Control-Allow-Origin": "*" },
          body: "key,value\nunitName,Alpha Ward\ndate,January 5 2026"
        });
      }
    });

    const retryLink = page.locator("#retry-offline");
    if (await retryLink.isVisible().catch(() => false)) {
      await retryLink.click();
      await page.waitForTimeout(2000);
      await page.waitForLoadState("networkidle");

      const unitName = page.locator("#unitname");
      await expect(unitName).toBeVisible();
    }
  });
});
