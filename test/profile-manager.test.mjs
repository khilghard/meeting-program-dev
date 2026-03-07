import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import {
  addProfile,
  selectProfile,
  getSelectedProfileId,
  getCurrentProfile,
  removeProfile,
  getProfiles,
  getActiveProfiles,
  getProfileById,
  searchProfiles,
  migrateLegacyProfiles,
  hasLegacyProfiles,
  initProfileManager
} from "../js/data/ProfileManager.js";

describe("ProfileManager", () => {
  beforeEach(async () => {
    localStorage.clear();
    if (globalThis.__resetStorage) globalThis.__resetStorage();
    await initProfileManager();
  });

  afterEach(async () => {
    // Clear all profiles after each test
    try {
      const { db } = await import("../js/data/db.js");
      await db.profiles.clear();
      await db.metadata.clear();
    } catch (e) {
      // Ignore errors if db isn't initialized
    }
    localStorage.clear();
  });

  describe("Profile Creation", () => {
    test("adds a new profile", async () => {
      const profile = await addProfile(
        "https://docs.google.com/spreadsheets/d/test",
        "Test Ward",
        "Test Stake"
      );
      expect(profile.id).toBeDefined();
      expect(profile.url).toBe("https://docs.google.com/spreadsheets/d/test");
      expect(profile.unitName).toBe("Test Ward");
      expect(profile.stakeName).toBe("Test Stake");
    });

    test("throws error for invalid URL", async () => {
      await expect(addProfile("invalid-url", "Ward", "Stake")).rejects.toThrow(
        "Invalid URL format"
      );
    });

    test("throws error for empty URL", async () => {
      await expect(addProfile("", "Ward", "Stake")).rejects.toThrow("URL is required");
    });

    test("updates existing profile by URL", async () => {
      await addProfile("https://docs.google.com/spreadsheets/d/test", "Ward A", "Stake A");
      const p2 = await addProfile(
        "https://docs.google.com/spreadsheets/d/test",
        "Ward B",
        "Stake B"
      );

      const profiles = await getProfiles();
      expect(profiles).toHaveLength(1);
      expect(profiles[0].unitName).toBe("Ward B");
    });

    test("auto-selects newly added profile", async () => {
      const profile = await addProfile(
        "https://docs.google.com/spreadsheets/d/test",
        "Test Ward",
        "Test Stake"
      );
      const selectedId = await getSelectedProfileId();
      expect(selectedId).toBe(profile.id);
    });
  });

  describe("Profile Selection", () => {
    test("selects a profile", async () => {
      const p1 = await addProfile("https://docs.google.com/spreadsheets/d/a", "Ward A", "Stake A");
      const p2 = await addProfile("https://docs.google.com/spreadsheets/d/b", "Ward B", "Stake B");

      await selectProfile(p1.id);
      const current = await getCurrentProfile();
      expect(current.id).toBe(p1.id);
    });

    test("updates lastUsed on selection", async () => {
      const profile = await addProfile(
        "https://docs.google.com/spreadsheets/d/test",
        "Test Ward",
        "Test Stake"
      );
      const before = profile.lastUsed;

      await new Promise((resolve) => setTimeout(resolve, 10));
      await selectProfile(profile.id);

      const updated = await getProfileById(profile.id);
      expect(updated.lastUsed).toBeGreaterThan(before);
    });
  });

  describe("Profile Modification", () => {
    test("removes a profile", async () => {
      await addProfile("https://docs.google.com/spreadsheets/d/test", "Test Ward", "Test Stake");
      const profile = await addProfile(
        "https://docs.google.com/spreadsheets/d/a",
        "Ward A",
        "Stake A"
      );

      await removeProfile(profile.id);

      const profiles = await getProfiles();
      expect(profiles).toHaveLength(1);
    });
  });

  describe("Profile Queries", () => {
    test("searches profiles by unit name", async () => {
      await addProfile("https://docs.google.com/spreadsheets/d/a", "Salt Lake Ward", "Stake A");
      await addProfile("https://docs.google.com/spreadsheets/d/b", "Provo Ward", "Stake B");

      const results = await searchProfiles("salt");
      expect(results).toHaveLength(1);
      expect(results[0].unitName).toBe("Salt Lake Ward");
    });

    test("searches profiles by stake name", async () => {
      await addProfile("https://docs.google.com/spreadsheets/d/a", "Ward A", "Salt Lake Stake");
      await addProfile("https://docs.google.com/spreadsheets/d/b", "Ward B", "Provo Stake");

      const results = await searchProfiles("salt");
      expect(results).toHaveLength(1);
      expect(results[0].stakeName).toBe("Salt Lake Stake");
    });

    test("returns all profiles for empty search", async () => {
      await addProfile("https://docs.google.com/spreadsheets/d/a", "Ward A", "Stake A");
      await addProfile("https://docs.google.com/spreadsheets/d/b", "Ward B", "Stake B");

      const results = await searchProfiles("");
      expect(results).toHaveLength(2);
    });
  });

  describe("Legacy Migration", () => {
    test("detects legacy profiles", async () => {
      localStorage.setItem(
        "meeting_program_profiles",
        JSON.stringify([{ id: "1", url: "https://test.com", unitName: "Test" }])
      );
      const hasLegacy = await hasLegacyProfiles();
      expect(hasLegacy).toBe(true);
    });

    test("returns false when no legacy profiles", async () => {
      localStorage.clear();
      const hasLegacy = await hasLegacyProfiles();
      expect(hasLegacy).toBe(false);
    });

    test("migrates legacy profiles", async () => {
      localStorage.setItem(
        "meeting_program_profiles",
        JSON.stringify([
          {
            id: "legacy-1",
            url: "https://docs.google.com/spreadsheets/d/legacy",
            unitName: "Legacy Ward",
            stakeName: "Legacy Stake",
            lastUsed: 1000
          }
        ])
      );
      localStorage.setItem("meeting_program_selected_id", "legacy-1");

      const result = await migrateLegacyProfiles();
      expect(result.success).toBe(true);
      expect(result.migrated).toBe(1);

      const profiles = await getProfiles();
      expect(profiles).toHaveLength(1);
      expect(profiles[0].url).toBe("https://docs.google.com/spreadsheets/d/legacy");

      const selected = await getCurrentProfile();
      expect(selected.id).toBe(profiles[0].id);
    });

    test("skips duplicate URLs during migration", async () => {
      await addProfile("https://docs.google.com/spreadsheets/d/existing", "Existing Ward", "Stake");

      localStorage.setItem(
        "meeting_program_profiles",
        JSON.stringify([
          {
            id: "legacy-1",
            url: "https://docs.google.com/spreadsheets/d/existing",
            unitName: "Legacy Ward",
            stakeName: "Legacy Stake",
            lastUsed: 1000
          }
        ])
      );

      const result = await migrateLegacyProfiles();
      expect(result.success).toBe(true);
      expect(result.migrated).toBe(0);

      const profiles = await getProfiles();
      expect(profiles).toHaveLength(1);
    });
  });
});
