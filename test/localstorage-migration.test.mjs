/**
 * localStorage to IndexedDB Migration Tests (v2.2.0)
 * Tests the migration of all localStorage data to IndexedDB
 */

import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { getMetadata, setMetadata } from "../js/data/IndexedDBManager.js";

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => {
      store[key] = value.toString();
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();

global.localStorage = localStorageMock;

describe("User Preferences Storage (IndexedDB - v2.2.0)", () => {
  beforeEach(async () => {
    localStorage.clear();
    try {
      const req = global.indexedDB.deleteDatabase("MeetingProgramDB");
      await new Promise((resolve) => {
        req.onsuccess = resolve;
      });
    } catch (e) {}

    const { createDatabase } = await import("../js/data/IndexedDBManager.js");
    await createDatabase();
  });

  afterEach(async () => {
    try {
      const req = global.indexedDB.deleteDatabase("MeetingProgramDB");
      await new Promise((resolve) => {
        req.onsuccess = resolve;
      });
    } catch (e) {}
  });

  describe("Theme preference", () => {
    test("should save theme preference to IndexedDB", async () => {
      await setMetadata("userPreference_theme", "dark");
      const theme = await getMetadata("userPreference_theme");
      expect(theme).toBe("dark");
    });

    test("should retrieve light theme preference", async () => {
      await setMetadata("userPreference_theme", "light");
      const theme = await getMetadata("userPreference_theme");
      expect(theme).toBe("light");
    });

    test("should return null for non-existent theme", async () => {
      const theme = await getMetadata("userPreference_theme");
      expect(theme).toBeNull();
    });
  });

  describe("Language preference", () => {
    test("should save language preference to IndexedDB", async () => {
      await setMetadata("userPreference_language", "es");
      const lang = await getMetadata("userPreference_language");
      expect(lang).toBe("es");
    });

    test("should support all language codes", async () => {
      const languages = ["en", "es", "fr", "swa"];
      for (const lang of languages) {
        await setMetadata("userPreference_language", lang);
        const retrieved = await getMetadata("userPreference_language");
        expect(retrieved).toBe(lang);
      }
    });
  });

  describe("Help shown flag", () => {
    test("should save help shown flag to IndexedDB", async () => {
      await setMetadata("userPreference_helpShown", "true");
      const helpShown = await getMetadata("userPreference_helpShown");
      expect(helpShown).toBe("true");
    });

    test("should return null when help flag not set", async () => {
      const helpShown = await getMetadata("userPreference_helpShown");
      expect(helpShown).toBeNull();
    });
  });

  describe("Legacy data storage", () => {
    test("should store legacy sheetUrl", async () => {
      const url = "https://docs.google.com/spreadsheets/d/test123";
      await setMetadata("legacy_sheetUrl", url);
      const stored = await getMetadata("legacy_sheetUrl");
      expect(stored).toBe(url);
    });

    test("should store legacy programCache", async () => {
      const cacheData = JSON.stringify([{ key: "test", value: "data" }]);
      await setMetadata("legacy_programCache", cacheData);
      const stored = await getMetadata("legacy_programCache");
      expect(stored).toBe(cacheData);
    });
  });

  describe("Install prompt flag", () => {
    test("should save install prompt flag to IndexedDB", async () => {
      await setMetadata("userPreference_installPrompted", "true");
      const flag = await getMetadata("userPreference_installPrompted");
      expect(flag).toBe("true");
    });
  });

  describe("Multiple preferences", () => {
    test("should store multiple preferences independently", async () => {
      await setMetadata("userPreference_theme", "dark");
      await setMetadata("userPreference_language", "fr");
      await setMetadata("userPreference_helpShown", "true");

      expect(await getMetadata("userPreference_theme")).toBe("dark");
      expect(await getMetadata("userPreference_language")).toBe("fr");
      expect(await getMetadata("userPreference_helpShown")).toBe("true");
    });

    test("should update existing preferences", async () => {
      await setMetadata("userPreference_theme", "dark");
      expect(await getMetadata("userPreference_theme")).toBe("dark");

      await setMetadata("userPreference_theme", "light");
      expect(await getMetadata("userPreference_theme")).toBe("light");
    });
  });
});

describe("Migration utility functions", () => {
  const LEGACY_STORAGE_KEYS = {
    THEME: "theme",
    LANGUAGE: "language",
    HELP_SHOWN: "meeting_program_help_shown",
    INSTALL_PROMPTED: "meeting_program_install_prompted",
    SHEET_URL: "sheetUrl",
    PROGRAM_CACHE: "programCache"
  };

  beforeEach(async () => {
    localStorage.clear();
    try {
      const req = global.indexedDB.deleteDatabase("MeetingProgramDB");
      await new Promise((resolve) => {
        req.onsuccess = resolve;
      });
    } catch (e) {}

    const { createDatabase } = await import("../js/data/IndexedDBManager.js");
    await createDatabase();
  });

  afterEach(async () => {
    try {
      const req = global.indexedDB.deleteDatabase("MeetingProgramDB");
      await new Promise((resolve) => {
        req.onsuccess = resolve;
      });
    } catch (e) {}
  });

  test("simulates migration: theme from localStorage to IndexedDB", async () => {
    localStorage.setItem(LEGACY_STORAGE_KEYS.THEME, "dark");

    const theme = localStorage.getItem(LEGACY_STORAGE_KEYS.THEME);
    await setMetadata("userPreference_theme", theme);
    localStorage.removeItem(LEGACY_STORAGE_KEYS.THEME);

    const migrated = await getMetadata("userPreference_theme");
    expect(migrated).toBe("dark");
    expect(localStorage.getItem(LEGACY_STORAGE_KEYS.THEME)).toBeNull();
  });

  test("simulates migration: language from localStorage to IndexedDB", async () => {
    localStorage.setItem(LEGACY_STORAGE_KEYS.LANGUAGE, "es");

    const lang = localStorage.getItem(LEGACY_STORAGE_KEYS.LANGUAGE);
    await setMetadata("userPreference_language", lang);
    localStorage.removeItem(LEGACY_STORAGE_KEYS.LANGUAGE);

    const migrated = await getMetadata("userPreference_language");
    expect(migrated).toBe("es");
    expect(localStorage.getItem(LEGACY_STORAGE_KEYS.LANGUAGE)).toBeNull();
  });

  test("simulates migration: all preferences at once", async () => {
    localStorage.setItem(LEGACY_STORAGE_KEYS.THEME, "dark");
    localStorage.setItem(LEGACY_STORAGE_KEYS.LANGUAGE, "fr");
    localStorage.setItem(LEGACY_STORAGE_KEYS.HELP_SHOWN, "true");
    localStorage.setItem(LEGACY_STORAGE_KEYS.SHEET_URL, "https://test.com");
    localStorage.setItem(LEGACY_STORAGE_KEYS.PROGRAM_CACHE, JSON.stringify([]));

    const theme = localStorage.getItem(LEGACY_STORAGE_KEYS.THEME);
    const lang = localStorage.getItem(LEGACY_STORAGE_KEYS.LANGUAGE);
    const helpShown = localStorage.getItem(LEGACY_STORAGE_KEYS.HELP_SHOWN);
    const sheetUrl = localStorage.getItem(LEGACY_STORAGE_KEYS.SHEET_URL);
    const programCache = localStorage.getItem(LEGACY_STORAGE_KEYS.PROGRAM_CACHE);

    await setMetadata("userPreference_theme", theme);
    await setMetadata("userPreference_language", lang);
    await setMetadata("userPreference_helpShown", helpShown);
    await setMetadata("legacy_sheetUrl", sheetUrl);
    await setMetadata("legacy_programCache", programCache);

    localStorage.removeItem(LEGACY_STORAGE_KEYS.THEME);
    localStorage.removeItem(LEGACY_STORAGE_KEYS.LANGUAGE);
    localStorage.removeItem(LEGACY_STORAGE_KEYS.HELP_SHOWN);
    localStorage.removeItem(LEGACY_STORAGE_KEYS.SHEET_URL);
    localStorage.removeItem(LEGACY_STORAGE_KEYS.PROGRAM_CACHE);

    expect(await getMetadata("userPreference_theme")).toBe("dark");
    expect(await getMetadata("userPreference_language")).toBe("fr");
    expect(await getMetadata("userPreference_helpShown")).toBe("true");
    expect(await getMetadata("legacy_sheetUrl")).toBe("https://test.com");
    expect(await getMetadata("legacy_programCache")).toBe(JSON.stringify([]));

    expect(localStorage.getItem(LEGACY_STORAGE_KEYS.THEME)).toBeNull();
    expect(localStorage.getItem(LEGACY_STORAGE_KEYS.LANGUAGE)).toBeNull();
    expect(localStorage.getItem(LEGACY_STORAGE_KEYS.HELP_SHOWN)).toBeNull();
    expect(localStorage.getItem(LEGACY_STORAGE_KEYS.SHEET_URL)).toBeNull();
    expect(localStorage.getItem(LEGACY_STORAGE_KEYS.PROGRAM_CACHE)).toBeNull();
  });
});
