import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";

describe("i18n/index.js", () => {
  let initI18n, loadTranslations, setLanguage, getLanguage, t, getSupportedLanguages;
  let mockMetadata = {};

  beforeEach(async () => {
    mockMetadata = {};

    global.navigator = {
      language: "en-US"
    };

    global.document = {
      documentElement: { setAttribute: vi.fn() }
    };

    // Mock IndexedDBManager
    const mockGetMetadata = vi.fn((key) => Promise.resolve(mockMetadata[key] || null));
    const mockSetMetadata = vi.fn((key, value) => {
      mockMetadata[key] = value;
      return Promise.resolve(true);
    });

    vi.doMock("../js/data/IndexedDBManager.js", () => ({
      getMetadata: mockGetMetadata,
      setMetadata: mockSetMetadata
    }));

    vi.resetModules();
    const module = await import("../js/i18n/index.js");
    initI18n = module.initI18n;
    loadTranslations = module.loadTranslations;
    setLanguage = module.setLanguage;
    getLanguage = module.getLanguage;
    t = module.t;
    getSupportedLanguages = module.getSupportedLanguages;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  describe("Initialization Sequence", () => {
    test("should complete initI18n before translations are available", async () => {
      const lang = await initI18n();
      expect(t("churchName")).not.toBe("churchName");
      expect(t("sacramentServices")).not.toBe("sacramentServices");
      expect(t("welcomeTo")).not.toBe("welcomeTo");
    });

    test("should store language preference in IndexedDB", async () => {
      await initI18n();
      expect(mockMetadata["userPreference_language"]).toBe("en");
    });

    test("should have all required translation keys for UI initialization", async () => {
      await initI18n();
      const requiredKeys = [
        "churchName",
        "sacramentServices",
        "welcomeTo",
        "reloadProgram",
        "managePrograms",
        "scanNewProgram",
        "close",
        "toggleDarkMode",
        "addProgram",
        "selectLanguage",
        "programHistory",
        "found",
        "add",
        "cancel",
        "updateAvailable",
        "update",
        "offlineMode",
        "tryNow",
        "loading"
      ];

      requiredKeys.forEach((key) => {
        const translation = t(key);
        expect(translation).not.toBe(key);
        expect(typeof translation).toBe("string");
        expect(translation.length).toBeGreaterThan(0);
      });
    });
  });

  describe("initI18n", () => {
    test("should be a function", () => {
      expect(typeof initI18n).toBe("function");
    });

    test("should return a language code", async () => {
      const lang = await initI18n();
      expect(typeof lang).toBe("string");
      expect(lang.length).toBeGreaterThan(0);
    });
  });

  describe("loadTranslations", () => {
    test("should load translations for supported language", () => {
      const result = loadTranslations("en");
      expect(result).toBeDefined();
    });

    test("should return translations object", () => {
      const result = loadTranslations("es");
      expect(typeof result).toBe("object");
    });
  });

  describe("setLanguage", () => {
    test("should set supported language", async () => {
      await setLanguage("es");
      expect(getLanguage()).toBe("es");
    });

    test("should not set unsupported language", async () => {
      await setLanguage("de");
      expect(getLanguage()).not.toBe("de");
    });
  });

  describe("getLanguage", () => {
    test("should return current language", async () => {
      await initI18n();
      const lang = getLanguage();
      expect(typeof lang).toBe("string");
    });
  });

  describe("t (translation function)", () => {
    test("should return translation for existing key", async () => {
      await initI18n();
      const translation = t("home");
      expect(translation).toBeDefined();
      expect(typeof translation).toBe("string");
    });

    test("should return key for missing translation", async () => {
      await initI18n();
      const translation = t("nonexistentKey");
      expect(translation).toBe("nonexistentKey");
    });
  });

  describe("getSupportedLanguages", () => {
    test("should return array of supported languages", () => {
      const languages = getSupportedLanguages();
      expect(Array.isArray(languages)).toBe(true);
      expect(languages).toContain("en");
      expect(languages).toContain("es");
      expect(languages).toContain("fr");
      expect(languages).toContain("swa");
    });
  });
});
