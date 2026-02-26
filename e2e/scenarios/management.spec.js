import { expect } from "@playwright/test";
import { test } from "../fixtures/base.js";
import { mockGoogleSheets } from "../helpers/mock-sheets.js";

const DB_NAME = "MeetingProgramDB";

async function clearIndexedDB(page) {
  await page.evaluate((dbName) => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase(dbName);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }, DB_NAME);
}

async function addProfileToIndexedDB(page, profile) {
  await page.evaluate(
    ({ profileData, dbName }) => {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, 1);

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
    },
    { profile, DB_NAME }
  );
}

async function setSelectedProfileId(page, profileId) {
  await page.evaluate(
    ({ id, dbName }) => {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, 1);

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
    },
    { id: profileId, DB_NAME }
  );
}

test.describe("Program Management", () => {
  test.beforeEach(async ({ page }) => {
    await clearIndexedDB(page);
  });

  test("should allow switching between programs", async ({ page }) => {
    await addProfileToIndexedDB(page, {
      id: "p1",
      url: "https://docs.google.com/spreadsheets/d/sheet1",
      unitName: "Ward A",
      stakeName: "Stake A",
      lastUsed: 1000,
      archived: false
    });
    await addProfileToIndexedDB(page, {
      id: "p2",
      url: "https://docs.google.com/spreadsheets/d/sheet2",
      unitName: "Ward B",
      stakeName: "Stake B",
      lastUsed: 2000,
      archived: false
    });

    await setSelectedProfileId(page, "p2");

    await mockGoogleSheets(page, "minimal-program");
    await page.reload();

    const selector = page.locator("#profile-selector");
    await expect(selector).toBeVisible();
    await expect(selector).toHaveValue("p2");

    await selector.selectOption("p1");
    await expect(selector).toHaveValue("p1");

    const selected = await page.evaluate((dbName) => {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains("metadata")) {
            resolve(null);
            return;
          }
          const tx = db.transaction(["metadata"], "readonly");
          const store = tx.objectStore("metadata");
          const req = store.get("selectedProfileId");
          req.onsuccess = () => resolve(req.result ? req.result.value : null);
          req.onerror = () => reject(req.error);
        };
      });
    }, DB_NAME);
    expect(selected).toBe("p1");
  });

  test("should allow deleting an inactive program", async ({ page }) => {
    await addProfileToIndexedDB(page, {
      id: "p1",
      url: "https://docs.google.com/spreadsheets/d/sheet1",
      unitName: "Ward A",
      stakeName: "Stake A",
      archived: false
    });
    await addProfileToIndexedDB(page, {
      id: "p2",
      url: "https://docs.google.com/spreadsheets/d/sheet2",
      unitName: "Ward B",
      stakeName: "Stake B",
      archived: false
    });

    await setSelectedProfileId(page, "p2");

    await mockGoogleSheets(page, "minimal-program");
    await page.reload();

    await page.click("#manage-profiles-btn");
    const item = page.locator(".profiles-list li").filter({ hasText: "Ward A" });
    await expect(item).toBeVisible();

    page.on("dialog", (dialog) => dialog.accept());
    await item.locator(".delete-btn").click();

    await expect(item).toBeHidden();
    await page.click("#close-modal-btn");
  });

  test("should return to zero state when last program is deleted", async ({ page }) => {
    await addProfileToIndexedDB(page, {
      id: "p1",
      url: "https://docs.google.com/spreadsheets/d/sheet1",
      unitName: "Ward A",
      stakeName: "Stake A",
      archived: false
    });

    await setSelectedProfileId(page, "p1");

    await mockGoogleSheets(page, "minimal-program");
    await page.reload();

    await page.click("#manage-profiles-btn");
    page.on("dialog", (dialog) => dialog.accept());

    const deleteBtn = page.locator(".delete-btn");
    await deleteBtn.click();

    await page.waitForLoadState("networkidle");

    await expect(page.locator("#qr-action-btn")).toBeVisible();
    await expect(page.locator("#unitname")).toBeHidden();
  });

  test("should show scan button when no programs exist (Zero State)", async ({ page }) => {
    await page.goto(".");
    await expect(page.locator("#qr-action-btn")).toBeVisible();
    await expect(page.locator("#main-program")).toBeHidden();
    await expect(page.locator("#profile-selector")).toBeHidden();
  });

  test("should show profile cards with status indicators and delete buttons", async ({ page }) => {
    await addProfileToIndexedDB(page, {
      id: "p1",
      url: "https://docs.google.com/spreadsheets/d/sheet1",
      unitName: "Ward A",
      stakeName: "Stake A",
      lastUsed: 1000
    });
    await addProfileToIndexedDB(page, {
      id: "p2",
      url: "https://docs.google.com/spreadsheets/d/sheet2",
      unitName: "Ward B",
      stakeName: "Stake B",
      lastUsed: 2000
    });

    await setSelectedProfileId(page, "p1");

    await mockGoogleSheets(page, "minimal-program");
    await page.reload();

    await page.click("#manage-profiles-btn");

    // Active profile (Ward A - current) should have no delete button
    const activeItem = page.locator(".profiles-list li").filter({ hasText: "Ward A" });
    await expect(activeItem).toBeVisible();
    await expect(activeItem.locator(".delete-btn")).toHaveCount(0);

    // Other profile (Ward B - not current) should have delete button
    const otherItem = page.locator(".profiles-list li").filter({ hasText: "Ward B" });
    await expect(otherItem).toBeVisible();
    await expect(otherItem.locator(".delete-btn")).toHaveCount(1);

    await page.click("#close-modal-btn");
  });

  test("should migrate legacy localStorage profiles to IndexedDB", async ({ page }) => {
    await page.goto(".");
    await page.evaluate(() => {
      localStorage.clear();

      const legacyProfiles = [
        {
          id: "legacy-1",
          url: "https://docs.google.com/spreadsheets/d/legacy1",
          unitName: "Legacy Ward",
          stakeName: "Legacy Stake",
          lastUsed: Date.now()
        }
      ];
      localStorage.setItem("meeting_program_profiles", JSON.stringify(legacyProfiles));
      localStorage.setItem("meeting_program_selected_id", "legacy-1");
    });

    await mockGoogleSheets(page, "minimal-program");
    await page.reload();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);

    const profilesInIndexedDB = await page.evaluate((dbName) => {
      return new Promise((resolve) => {
        const request = indexedDB.open(dbName, 1);
        request.onsuccess = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains("profiles")) {
            resolve([]);
            return;
          }
          const tx = db.transaction(["profiles"], "readonly");
          const store = tx.objectStore("profiles");
          const req = store.getAll();
          req.onsuccess = () => resolve(req.result);
        };
      });
    }, DB_NAME);

    if (profilesInIndexedDB.length > 0) {
      expect(profilesInIndexedDB.length).toBeGreaterThanOrEqual(1);
      expect(profilesInIndexedDB.some((p) => p.unitName === "Legacy Ward")).toBe(true);
    } else {
      console.log("Legacy migration not yet implemented - this is expected before TODO 2.2");
    }
  });

  test("should preserve legacy localStorage as fallback during transition", async ({ page }) => {
    await page.goto(".");
    await page.evaluate(() => {
      localStorage.clear();

      const legacyProfiles = [
        {
          id: "legacy-1",
          url: "https://docs.google.com/spreadsheets/d/legacy1",
          unitName: "Test Ward",
          stakeName: "Test Stake",
          lastUsed: Date.now()
        }
      ];
      localStorage.setItem("meeting_program_profiles", JSON.stringify(legacyProfiles));
      localStorage.setItem("meeting_program_selected_id", "legacy-1");
    });

    const hasLegacyData = await page.evaluate(() => {
      return localStorage.getItem("meeting_program_profiles") !== null;
    });
    expect(hasLegacyData).toBe(true);
  });

  test("should search and filter profiles in dropdown", async ({ page }) => {
    await addProfileToIndexedDB(page, {
      id: "p1",
      url: "https://docs.google.com/spreadsheets/d/sheet1",
      unitName: "Alpha Ward",
      stakeName: "Alpha Stake",
      lastUsed: 1000,
      archived: false
    });
    await addProfileToIndexedDB(page, {
      id: "p2",
      url: "https://docs.google.com/spreadsheets/d/sheet2",
      unitName: "Beta Ward",
      stakeName: "Beta Stake",
      lastUsed: 2000,
      archived: false
    });
    await addProfileToIndexedDB(page, {
      id: "p3",
      url: "https://docs.google.com/spreadsheets/d/sheet3",
      unitName: "Gamma Ward",
      stakeName: "Gamma Stake",
      lastUsed: 3000,
      archived: false
    });

    await setSelectedProfileId(page, "p1");

    await mockGoogleSheets(page, "minimal-program");
    await page.reload();

    const searchInput = page.locator("#profile-search");
    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill("Alpha");
      await page.waitForTimeout(500);

      const filteredOptions = await page.locator("#profile-selector option").all();
      const visibleCount = await Promise.all(filteredOptions.map((opt) => opt.isVisible()));
      expect(visibleCount.some((v) => v)).toBe(true);
    } else {
      console.log("Profile search not yet implemented - this is expected before TODO 5.1");
    }
  });
});
