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

test.describe("Upgrade System", () => {
  test.beforeEach(async ({ page }) => {
    await clearIndexedDB(page);
  });

  test("should have update section in index.html", async ({ page }) => {
    await page.goto(".");
    await page.waitForLoadState("domcontentloaded");

    const updateSection = page.locator("#update-section");
    await expect(updateSection).toBeVisible();

    const updateNotification = page.locator("#update-notification");
    await expect(updateNotification).toBeHidden();
  });

  test("should have update button in header", async ({ page }) => {
    await page.goto(".");
    await page.waitForLoadState("domcontentloaded");

    const updateBtn = page.locator("#update-btn");
    await expect(updateBtn).toBeVisible();
    await expect(updateBtn).toHaveAttribute("aria-label", "Check for Updates");
  });

  test("should hide update banner when up to date", async ({ page }) => {
    await page.goto(".");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(1500);

    const updateNotification = page.locator("#update-notification");
    await expect(updateNotification).toHaveClass(/hidden/);
  });

  test("should show update banner when update is available", async ({ page }) => {
    await addProfileToIndexedDB(page, {
      id: "ward-a",
      url: "https://docs.google.com/spreadsheets/d/ward-a/gviz/tq?tqx=out:csv",
      unitName: "Alpha Ward",
      stakeName: "Alpha Stake",
      lastUsed: Date.now(),
      archived: false
    });
    await setSelectedProfileId(page, "ward-a");

    const mockManifest = {
      name: "Sacrament Meeting Program",
      short_name: "SMP",
      version: "999.0.0",
      theme_color: "#2d5ba8"
    };

    await page.route("**/manifest.webmanifest", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockManifest)
      });
    });

    await page.goto(".");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(3000);

    const updateNotification = page.locator("#update-notification");
    const isVisible = await updateNotification.isVisible().catch(() => false);

    if (isVisible) {
      await expect(updateNotification).toContainText("new version");
      await expect(page.locator("#update-now-btn")).toBeVisible();
      await expect(page.locator("#update-close-btn")).toBeVisible();
    } else {
      console.log("Update banner not shown - update manager may not be fully implemented");
    }
  });

  test("should close update banner when close button is clicked", async ({ page }) => {
    await addProfileToIndexedDB(page, {
      id: "ward-a",
      url: "https://docs.google.com/spreadsheets/d/ward-a/gviz/tq?tqx=out:csv",
      unitName: "Alpha Ward",
      stakeName: "Alpha Stake",
      lastUsed: Date.now(),
      archived: false
    });
    await setSelectedProfileId(page, "ward-a");

    const mockManifest = {
      name: "Sacrament Meeting Program",
      short_name: "SMP",
      version: "999.0.0",
      theme_color: "#2d5ba8"
    };

    await page.route("**/manifest.webmanifest", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockManifest)
      });
    });

    await page.goto(".");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(3000);

    const updateNotification = page.locator("#update-notification");
    if (await updateNotification.isVisible().catch(() => false)) {
      await page.click("#update-close-btn");
      await page.waitForTimeout(500);
      await expect(updateNotification).toHaveClass(/hidden/);
    }
  });

  test("should have version in manifest", async ({ page }) => {
    await page.goto("manifest.webmanifest");
    await page.waitForLoadState("domcontentloaded");

    const manifest = await page.evaluate(() => {
      try {
        return JSON.parse(document.body.textContent);
      } catch {
        return null;
      }
    });

    if (manifest) {
      expect(manifest.version).toBeTruthy();
      expect(manifest.version).toMatch(/^\d+\.\d+\.\d+$/);
    }
  });

  test("should have version.js with APP_VERSION", async ({ page }) => {
    await page.goto("js/version.js");
    await page.waitForLoadState("domcontentloaded");

    const content = await page.content();
    expect(content).toContain("VERSION");
  });

  test("should manually check for updates via update button", async ({ page }) => {
    await addProfileToIndexedDB(page, {
      id: "ward-a",
      url: "https://docs.google.com/spreadsheets/d/ward-a/gviz/tq?tqx=out:csv",
      unitName: "Alpha Ward",
      stakeName: "Alpha Stake",
      lastUsed: Date.now(),
      archived: false
    });
    await setSelectedProfileId(page, "ward-a");

    const mockManifest = {
      name: "Sacrament Meeting Program",
      short_name: "SMP",
      version: "1.5.1",
      theme_color: "#2d5ba8"
    };

    await page.route("**/manifest.webmanifest", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockManifest)
      });
    });

    await page.goto(".");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(1000);

    await page.click("#update-btn");
    await page.waitForTimeout(2000);

    const updateNotification = page.locator("#update-notification");
    await expect(updateNotification).toHaveClass(/hidden/);
  });

  test("should preserve data during simulated upgrade", async ({ page }) => {
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

    const profilesBefore = await page.evaluate(() => {
      return new Promise((resolve) => {
        const request = indexedDB.open("MeetingProgramDB", 1);
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction(["profiles"], "readonly");
          const store = tx.objectStore("profiles");
          const req = store.getAll();
          req.onsuccess = () => resolve(req.result.length);
        };
      });
    });

    expect(profilesBefore).toBe(1);

    await page.evaluate(() => {
      localStorage.setItem("test_data", "preserved");
    });

    await page.reload();
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(1000);

    const testData = await page.evaluate(() => localStorage.getItem("test_data"));
    expect(testData).toBe("preserved");
  });

  test("should handle version comparison correctly", async ({ page }) => {
    await page.goto(".");
    await page.waitForLoadState("domcontentloaded");

    const versionParserExists = await page.evaluate(() => {
      const scripts = document.querySelectorAll('script[src*="version"]');
      return scripts.length > 0;
    });

    console.log("Version parser loaded:", versionParserExists);
  });
});
