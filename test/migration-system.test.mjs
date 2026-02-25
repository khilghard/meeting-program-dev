import { describe, test, expect, beforeEach } from "vitest";
import {
  initMigrationSystem,
  checkMigrationRequired,
  validateMigrationUrl,
  getMigrationPreference,
  saveMigrationPreference,
  scheduleMigrationCheck,
  executeMigrationCheck
} from "../js/data/MigrationSystem.js";

// Mock dependencies
const mockProfile = {
  id: "profile-1",
  url: "https://docs.google.com/spreadsheets/d/test",
  unitName: "Test Ward",
  stakeName: "Test Stake",
  lastUsed: Date.now()
};

// Mock IndexedDBManager functions
const mockGetMigration = () => {};
const mockSaveMigration = () => {};
const mockCreateDatabase = () => {};
const mockGetProfile = () => {};
const mockSaveProfile = () => {};

// Mock ProfileManager functions
const mockInitProfileManager = () => {};
const mockAddProfile = () => {};

// Mock the getLanguage function from i18n
const mockGetLanguage = () => "en";

// Mock fetch
const mockFetch = async () => ({
  ok: true,
  text: async () =>
    "key,value\nobsolete,true\nmigrationUrl,https://docs.google.com/spreadsheets/d/new"
});

// Mock the functions directly
import * as IndexedDBManager from "../js/data/IndexedDBManager.js";
import * as ProfileManager from "../js/data/ProfileManager.js";
import * as I18n from "../js/i18n/index.js";

const mockGetMigrationSpy = vi
  .spyOn(IndexedDBManager, "getMigration")
  .mockImplementation(mockGetMigration);
const mockSaveMigrationSpy = vi
  .spyOn(IndexedDBManager, "saveMigration")
  .mockImplementation(mockSaveMigration);
const mockCreateDatabaseSpy = vi
  .spyOn(IndexedDBManager, "createDatabase")
  .mockImplementation(mockCreateDatabase);
const mockGetProfileSpy = vi
  .spyOn(IndexedDBManager, "getProfile")
  .mockImplementation(mockGetProfile);
const mockSaveProfileSpy = vi
  .spyOn(IndexedDBManager, "saveProfile")
  .mockImplementation(mockSaveProfile);

const mockInitProfileManagerSpy = vi
  .spyOn(ProfileManager, "initProfileManager")
  .mockImplementation(mockInitProfileManager);
const mockAddProfileSpy = vi.spyOn(ProfileManager, "addProfile").mockImplementation(mockAddProfile);

const mockGetLanguageSpy = vi.spyOn(I18n, "getLanguage").mockImplementation(mockGetLanguage);

// Mock global fetch
global.fetch = vi.fn(mockFetch);

describe("MigrationSystem", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mockGetLanguageSpy.mockReturnValue("en");
    mockFetch.mockResolvedValue({
      ok: true,
      text: async () =>
        "key,value\nobsolete,true\nmigrationUrl,https://docs.google.com/spreadsheets/d/new"
    });

    await initMigrationSystem();
  });

  describe("Migration Detection", () => {
    test("returns required: false if no obsolete flag", async () => {
      const csvData = [
        { key: "migrationUrl", value: "https://docs.google.com/spreadsheets/d/new" }
      ];

      const result = await checkMigrationRequired("profile-1", csvData);
      expect(result.required).toBe(false);
      expect(result.url).toBeNull();
      expect(result.ignored).toBe(false);
    });

    test("returns required: false if no migrationUrl", async () => {
      const csvData = [{ key: "obsolete", value: "true" }];

      const result = await checkMigrationRequired("profile-1", csvData);
      expect(result.required).toBe(false);
      expect(result.url).toBeNull();
      expect(result.ignored).toBe(false);
    });

    test("returns required: true with valid url when both conditions met", async () => {
      const csvData = [
        { key: "obsolete", value: "true" },
        { key: "migrationUrl", value: "https://docs.google.com/spreadsheets/d/new" }
      ];

      const result = await checkMigrationRequired("profile-1", csvData);
      expect(result.required).toBe(true);
      expect(result.url).toBe("https://docs.google.com/spreadsheets/d/new");
      expect(result.ignored).toBe(false);
    });

    test("returns ignored: true if user previously ignored", async () => {
      const mockPreference = { ignored: true, lastChecked: Date.now() };
      mockGetMigrationSpy.mockResolvedValue(mockPreference);

      const csvData = [
        { key: "obsolete", value: "true" },
        { key: "migrationUrl", value: "https://docs.google.com/spreadsheets/d/new" }
      ];

      const result = await checkMigrationRequired("profile-1", csvData);
      expect(result.required).toBe(false);
      expect(result.ignored).toBe(true);
    });

    test("returns required: false if obsolete is false", async () => {
      const csvData = [
        { key: "obsolete", value: "false" },
        { key: "migrationUrl", value: "https://docs.google.com/spreadsheets/d/new" }
      ];

      const result = await checkMigrationRequired("profile-1", csvData);
      expect(result.required).toBe(false);
    });

    test("returns required: false if obsolete is missing", async () => {
      const csvData = [
        { key: "migrationUrl", value: "https://docs.google.com/spreadsheets/d/new" }
      ];

      const result = await checkMigrationRequired("profile-1", csvData);
      expect(result.required).toBe(false);
    });

    test("returns required: false if migrationUrl is empty", async () => {
      const csvData = [
        { key: "obsolete", value: "true" },
        { key: "migrationUrl", value: "" }
      ];

      const result = await checkMigrationRequired("profile-1", csvData);
      expect(result.required).toBe(false);
    });
  });

  describe("Migration Validation", () => {
    test("returns invalid for empty url", async () => {
      const result = await validateMigrationUrl("");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("URL is required");
    });

    test("returns invalid for invalid url format", async () => {
      const result = await validateMigrationUrl("not-a-url");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Invalid URL format");
    });

    test("returns invalid for non-google-sheets url", async () => {
      const result = await validateMigrationUrl("https://example.com");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("URL must be a Google Sheets URL");
    });

    test("returns valid for valid google sheets url", async () => {
      const result = await validateMigrationUrl("https://docs.google.com/spreadsheets/d/test");
      expect(result.valid).toBe(true);
      expect(result.error).toBeNull();
      expect(result.data.unitName).toBe("Migrated Unit");
      expect(result.data.stakeName).toBe("Migrated Stake");
    });
  });

  describe("Migration Preferences", () => {
    test("returns null for non-existent preference", async () => {
      mockGetMigrationSpy.mockResolvedValue(null);

      const result = await getMigrationPreference("profile-1");
      expect(result).toBeNull();
    });

    test("returns preference object for existing preference", async () => {
      const mockPreference = { ignored: true, lastChecked: 1234567890 };
      mockGetMigrationSpy.mockResolvedValue(mockPreference);

      const result = await getMigrationPreference("profile-1");
      expect(result).toEqual({ ignored: true, lastChecked: 1234567890 });
    });

    test("saves ignored preference", async () => {
      mockSaveMigrationSpy.mockResolvedValue(true);

      const result = await saveMigrationPreference("profile-1", true);
      expect(result).toBe(true);
      expect(mockSaveMigrationSpy).toHaveBeenCalledWith("profile-1", {
        ignored: true,
        lastChecked: expect.any(Number)
      });
    });

    test("removes preference when confirmed", async () => {
      mockSaveMigrationSpy.mockResolvedValue(true);

      const result = await saveMigrationPreference("profile-1", false);
      expect(result).toBe(true);
      expect(mockSaveMigrationSpy).toHaveBeenCalledWith("profile-1", null);
    });
  });

  describe("Background Migration", () => {
    test("schedules migration check", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation();

      await scheduleMigrationCheck("profile-1");

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Scheduled check for profile profile-1")
      );
      consoleSpy.mockRestore();
    });

    test("executes migration check when not ignored", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation();

      // Mock getProfile to return a profile
      mockGetProfileSpy.mockResolvedValue(mockProfile);

      // Mock getMigrationPreference to return no preference
      mockGetMigrationSpy.mockResolvedValue(null);

      // Mock checkMigrationRequired to return required: true
      vi.spyOn(
        require("../js/data/MigrationSystem.js"),
        "checkMigrationRequired"
      ).mockResolvedValue({
        required: true,
        url: "https://docs.google.com/spreadsheets/d/new",
        ignored: false
      });

      await executeMigrationCheck("profile-1");

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Migration required for profile profile-1")
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("update the lastChecked timestamp")
      );
      consoleSpy.mockRestore();
    });

    test("skips migration check if previously ignored", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation();

      // Mock getProfile to return a profile
      mockGetProfileSpy.mockResolvedValue(mockProfile);

      // Mock getMigrationPreference to return ignored preference
      mockGetMigrationSpy.mockResolvedValue({ ignored: true, lastChecked: Date.now() });

      await executeMigrationCheck("profile-1");

      // Should not log anything about migration required
      expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringContaining("Migration required"));
      consoleSpy.mockRestore();
    });
  });
});



    await initMigrationSystem();
  });

  describe("Migration Detection", () => {
    test("returns required: false if no obsolete flag", async () => {
      const csvData = [
        { key: "migrationUrl", value: "https://docs.google.com/spreadsheets/d/new" }
      ];

      const result = await checkMigrationRequired("profile-1", csvData);
      expect(result.required).toBe(false);
      expect(result.url).toBeNull();
      expect(result.ignored).toBe(false);
    });

    test("returns required: false if no migrationUrl", async () => {
      const csvData = [{ key: "obsolete", value: "true" }];

      const result = await checkMigrationRequired("profile-1", csvData);
      expect(result.required).toBe(false);
      expect(result.url).toBeNull();
      expect(result.ignored).toBe(false);
    });

    test("returns required: true with valid url when both conditions met", async () => {
      const csvData = [
        { key: "obsolete", value: "true" },
        { key: "migrationUrl", value: "https://docs.google.com/spreadsheets/d/new" }
      ];

      const result = await checkMigrationRequired("profile-1", csvData);
      expect(result.required).toBe(true);
      expect(result.url).toBe("https://docs.google.com/spreadsheets/d/new");
      expect(result.ignored).toBe(false);
    });

    test("returns ignored: true if user previously ignored", async () => {
      const mockPreference = { ignored: true, lastChecked: Date.now() };
      require("../js/data/IndexedDBManager.js").getMigration.mockResolvedValue(mockPreference);

      const csvData = [
        { key: "obsolete", value: "true" },
        { key: "migrationUrl", value: "https://docs.google.com/spreadsheets/d/new" }
      ];

      const result = await checkMigrationRequired("profile-1", csvData);
      expect(result.required).toBe(false);
      expect(result.ignored).toBe(true);
    });

    test("returns required: false if obsolete is false", async () => {
      const csvData = [
        { key: "obsolete", value: "false" },
        { key: "migrationUrl", value: "https://docs.google.com/spreadsheets/d/new" }
      ];

      const result = await checkMigrationRequired("profile-1", csvData);
      expect(result.required).toBe(false);
    });

    test("returns required: false if obsolete is missing", async () => {
      const csvData = [
        { key: "migrationUrl", value: "https://docs.google.com/spreadsheets/d/new" }
      ];

      const result = await checkMigrationRequired("profile-1", csvData);
      expect(result.required).toBe(false);
    });

    test("returns required: false if migrationUrl is empty", async () => {
      const csvData = [
        { key: "obsolete", value: "true" },
        { key: "migrationUrl", value: "" }
      ];

      const result = await checkMigrationRequired("profile-1", csvData);
      expect(result.required).toBe(false);
    });
  });

  describe("Migration Validation", () => {
    test("returns invalid for empty url", async () => {
      const result = await validateMigrationUrl("");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("URL is required");
    });

    test("returns invalid for invalid url format", async () => {
      const result = await validateMigrationUrl("not-a-url");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Invalid URL format");
    });

    test("returns invalid for non-google-sheets url", async () => {
      const result = await validateMigrationUrl("https://example.com");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("URL must be a Google Sheets URL");
    });

    test("returns valid for valid google sheets url", async () => {
      const result = await validateMigrationUrl("https://docs.google.com/spreadsheets/d/test");
      expect(result.valid).toBe(true);
      expect(result.error).toBeNull();
      expect(result.data.unitName).toBe("Migrated Unit");
      expect(result.data.stakeName).toBe("Migrated Stake");
    });
  });

  describe("Migration Preferences", () => {
    test("returns null for non-existent preference", async () => {
      require("../js/data/IndexedDBManager.js").getMigration.mockResolvedValue(null);

      const result = await getMigrationPreference("profile-1");
      expect(result).toBeNull();
    });

    test("returns preference object for existing preference", async () => {
      const mockPreference = { ignored: true, lastChecked: 1234567890 };
      require("../js/data/IndexedDBManager.js").getMigration.mockResolvedValue(mockPreference);

      const result = await getMigrationPreference("profile-1");
      expect(result).toEqual({ ignored: true, lastChecked: 1234567890 });
    });

    test("saves ignored preference", async () => {
      require("../js/data/IndexedDBManager.js").saveMigration.mockResolvedValue(true);

      const result = await saveMigrationPreference("profile-1", true);
      expect(result).toBe(true);
      expect(require("../js/data/IndexedDBManager.js").saveMigration).toHaveBeenCalledWith(
        "profile-1",
        { ignored: true, lastChecked: expect.any(Number) }
      );
    });

    test("removes preference when confirmed", async () => {
      require("../js/data/IndexedDBManager.js").saveMigration.mockResolvedValue(true);

      const result = await saveMigrationPreference("profile-1", false);
      expect(result).toBe(true);
      expect(require("../js/data/IndexedDBManager.js").saveMigration).toHaveBeenCalledWith(
        "profile-1",
        null
      );
    });
  });

  describe("Background Migration", () => {
    test("schedules migration check", async () => {
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      await scheduleMigrationCheck("profile-1");

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Scheduled check for profile profile-1")
      );
      consoleSpy.mockRestore();
    });

    test("executes migration check when not ignored", async () => {
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      // Mock getProfile to return a profile
      require("../js/data/IndexedDBManager.js").getProfile.mockResolvedValue(mockProfile);

      // Mock getMigrationPreference to return no preference
      require("../js/data/IndexedDBManager.js").getMigration.mockResolvedValue(null);

      // Mock checkMigrationRequired to return required: true
      jest
        .spyOn(require("../js/data/MigrationSystem.js"), "checkMigrationRequired")
        .mockResolvedValue({
          required: true,
          url: "https://docs.google.com/spreadsheets/d/new",
          ignored: false
        });

      await executeMigrationCheck("profile-1");

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Migration required for profile profile-1")
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("update the lastChecked timestamp")
      );
      consoleSpy.mockRestore();
    });

    test("skips migration check if previously ignored", async () => {
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      // Mock getProfile to return a profile
      require("../js/data/IndexedDBManager.js").getProfile.mockResolvedValue(mockProfile);

      // Mock getMigrationPreference to return ignored preference
      require("../js/data/IndexedDBManager.js").getMigration.mockResolvedValue({
        ignored: true,
        lastChecked: Date.now()
      });

      await executeMigrationCheck("profile-1");

      // Should not log anything about migration required
      expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringContaining("Migration required"));
      consoleSpy.mockRestore();
    });
  });
});
