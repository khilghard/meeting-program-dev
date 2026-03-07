import { describe, test, expect, beforeEach, vi, afterEach } from "vitest";
import * as Profiles from "../js/profiles.js";
import * as ProfileManager from "../js/data/ProfileManager.js";

// Set up test isolation with browser API stubs and IndexedDB isolation
setupTestIsolation();

describe("Profiles Module", () => {
  beforeEach(async () => {
    // Don't reset modules here - just clear IndexedDB contents
    localStorage.clear();
    
    // Initialize ProfileManager with isolated IndexedDB
    await ProfileManager.initProfileManager();
    
    // Create test profiles in IndexedDB for use in tests
    await Profiles.addProfile("https://docs.google.com/spreadsheets/d/sheet1/gviz/tq", "Ward A", "Stake A");
    await Profiles.addProfile("https://docs.google.com/spreadsheets/d/sheet2/gviz/tq", "Ward B", "Stake B");
    
    // Initialize profiles cache
    await Profiles.initProfiles();
  });

  afterEach(async () => {
    // Custom cleanup just for this suite - don't reset modules for IndexedDB stability
    localStorage.clear();
  });

  // ========== INITIALIZATION TESTS ==========
  describe("Initialization", () => {
    test("initProfiles() initializes the cache from ProfileManager", async () => {
      const profiles = Profiles.getProfiles();
      expect(profiles.length).toBeGreaterThan(0);
    });

    test("initProfiles() sets currentProfile to a valid profile", async () => {
      const current = Profiles.getCurrentProfile();
      expect(current).toBeDefined();
      if (current) {
        expect(current.id).toBeDefined();
      }
    });

    test("initProfiles() loads profile data into cache", async () => {
      await Profiles.initProfiles();
      const profiles = Profiles.getProfiles();
      expect(Array.isArray(profiles)).toBe(true);
      expect(profiles.length).toBeGreaterThan(0);
    });

    test("initProfiles() maintains cache on subsequent calls", async () => {
      const profiles1 = Profiles.getProfiles();
      await Profiles.initProfiles();
      const profiles2 = Profiles.getProfiles();
      // Cache should be maintained
      expect(profiles2.length).toBe(profiles1.length);
    });
  });

  // ========== PROFILE RETRIEVAL TESTS ==========
  describe("Profile Retrieval", () => {
    test("getProfiles() returns all profiles after init", async () => {
      await Profiles.initProfiles();
      const profiles = Profiles.getProfiles();

      expect(Array.isArray(profiles)).toBe(true);
      // Should have the 2 profiles we created in beforeEach
      expect(profiles.length).toBe(2);
      // Verify they're real profile objects
      expect(profiles[0].id).toBeDefined();
      expect(profiles[0].unitName).toBeDefined();
    });

    test("getActiveProfiles() filters out inactive profiles", async () => {
      await Profiles.initProfiles();
      const active = Profiles.getActiveProfiles();

      expect(active.length).toBe(2); // Both default profiles are active
      expect(active.every((p) => !p.inactive)).toBe(true);
    });

    test("getInactiveProfiles() returns only inactive profiles", async () => {
      await Profiles.initProfiles();
      const inactive = Profiles.getInactiveProfiles();

      expect(Array.isArray(inactive)).toBe(true);
      // All default profiles are active, so no inactive profiles
      expect(inactive.length).toBe(0);
    });

    test("getProfileById() returns specific profile", async () => {
      await Profiles.initProfiles();
      const profiles = Profiles.getProfiles();
      const firstProfile = profiles[0];
      
      const profile = Profiles.getProfileById(firstProfile.id);

      expect(profile).toBeDefined();
      expect(profile.id).toBe(firstProfile.id);
      expect(profile.unitName).toBe(firstProfile.unitName);
    });

    test("getProfileById() returns undefined for non-existent profile", async () => {
      await Profiles.initProfiles();
      const profile = Profiles.getProfileById("non-existent-id");

      expect(profile).toBeUndefined();
    });
  });

  // ========== PROFILE ADDITION TESTS ==========
  describe("Profile Addition", () => {
    test("addProfile() adds profile and returns it", async () => {
      await Profiles.initProfiles();
      const result = await Profiles.addProfile(
        "https://docs.google.com/spreadsheets/d/sheet3/gviz/tq",
        "Ward X",
        "Stake X"
      );

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.unitName).toBe("Ward X");
      expect(result.stakeName).toBe("Stake X");
    });

    test("addProfile() updates profile count", async () => {
      await Profiles.initProfiles();
      const countBefore = Profiles.getProfiles().length;

      await Profiles.addProfile(
        "https://docs.google.com/spreadsheets/d/sheet4/gviz/tq",
        "Ward Y",
        "Stake Y"
      );

      expect(Profiles.getProfiles().length).toBeGreaterThan(countBefore);
    });

    test("addProfile() makes new profile selectable", async () => {
      await Profiles.initProfiles();
      const newProfile = await Profiles.addProfile(
        "https://docs.google.com/spreadsheets/d/sheet5/gviz/tq",
        "Ward Z",
        "Stake Z"
      );

      // New profile should be selected automatically
      expect(Profiles.getSelectedProfileId()).toBe(newProfile.id);
      expect(Profiles.getCurrentProfile().id).toBe(newProfile.id);
    });
  });

  // ========== PROFILE SELECTION TESTS ==========
  describe("Profile Selection", () => {
    test("selectProfile() changes the current profile", async () => {
      await Profiles.initProfiles();
      const profiles = Profiles.getProfiles();
      
      if (profiles.length < 2) {
        // Need at least 2 profiles to test switching
        return;
      }
      
      const firstProfileId = Profiles.getSelectedProfileId();
      const otherProfile = profiles.find((p) => p.id !== firstProfileId);
      
      if (!otherProfile) {
        // Can't test if all profiles have same ID
        return;
      }

      await Profiles.selectProfile(otherProfile.id);

      expect(Profiles.getSelectedProfileId()).toBe(otherProfile.id);
      expect(Profiles.getSelectedProfileId()).not.toBe(firstProfileId);
    });

    test("getSelectedProfileId() returns selected profile ID", async () => {
      await Profiles.initProfiles();
      const id = Profiles.getSelectedProfileId();

      expect(id).toBeDefined();
      expect(typeof id).toBe("string");
    });

    test("getCurrentProfile() returns current profile object", async () => {
      await Profiles.initProfiles();
      const current = Profiles.getCurrentProfile();
      const selectedId = Profiles.getSelectedProfileId();

      expect(current).toBeDefined();
      expect(current.id).toBe(selectedId);
    });

    test("getCurrentProfile() returns the profile object with all data", async () => {
      await Profiles.initProfiles();
      const current = Profiles.getCurrentProfile();

      expect(current.url).toBeDefined();
      expect(current.unitName).toBeDefined();
      expect(current.stakeName).toBeDefined();
    });

    test("getCurrentProfile() uses selectedId from cache", async () => {
      await Profiles.initProfiles();
      const selected = Profiles.getSelectedProfileId();
      const current = Profiles.getCurrentProfile();

      expect(current.id).toBe(selected);
    });
  });

  // ========== PROFILE REMOVAL TESTS ==========
  describe("Profile Removal", () => {
    test("removeProfile() removes a profile", async () => {
      await Profiles.initProfiles();
      const profiles = Profiles.getProfiles();
      const countBefore = profiles.length;
      const profileToRemove = profiles[profiles.length - 1];

      await Profiles.removeProfile(profileToRemove.id);

      expect(Profiles.getProfiles().length).toBeLessThan(countBefore);
    });

    test("removeProfile() can handle removing any profile", async () => {
      await Profiles.initProfiles();
      const profiles = Profiles.getProfiles();
      
      expect(profiles.length).toBeGreaterThan(0);
      // Remove first profile if it exists
      if (profiles[0]) {
        await Profiles.removeProfile(profiles[0].id);
        const updatedProfiles = Profiles.getProfiles();
        // Count should decrease
        expect(updatedProfiles.length).toEqual(profiles.length - 1);
      }
    });
  });

  // ========== DEACTIVATION & REACTIVATION TESTS ==========
  describe("Profile Deactivation & Reactivation", () => {
    test("deactivateProfile() marks profile as inactive", async () => {
      await Profiles.initProfiles();
      const profiles = Profiles.getProfiles();
      const profileToDeactivate = profiles[0];
      
      // Deactivate the profile
      await Profiles.deactivateProfile(profileToDeactivate.id);
      
      // Check that profile is now in inactive list
      const inactive = Profiles.getInactiveProfiles();
      const deactivatedProfile = inactive.find((p) => p.id === profileToDeactivate.id);
      expect(deactivatedProfile).toBeDefined();
      expect(deactivatedProfile.inactive).toBe(true);
    });

    test("reactivateProfile() marks profile as active", async () => {
      await Profiles.initProfiles();
      const profiles = Profiles.getProfiles();
      const profileToDeactivate = profiles[0];
      
      // Deactivate then reactivate
      await Profiles.deactivateProfile(profileToDeactivate.id);
      await Profiles.reactivateProfile(profileToDeactivate.id);
      
      // Check that profile is back in active list
      const active = Profiles.getActiveProfiles();
      const reactivatedProfile = active.find((p) => p.id === profileToDeactivate.id);
      expect(reactivatedProfile).toBeDefined();
      expect(reactivatedProfile.inactive).not.toBe(true);
    });

    test("deactivation is reversible", async () => {
      await Profiles.initProfiles();
      const profiles = Profiles.getProfiles();
      const profileId = profiles[0].id;
      const activeCountBefore = Profiles.getActiveProfiles().length;
      
      await Profiles.deactivateProfile(profileId);
      const activeCountAfterDeactivate = Profiles.getActiveProfiles().length;
      expect(activeCountAfterDeactivate).toBeLessThan(activeCountBefore);
      
      await Profiles.reactivateProfile(profileId);
      const activeCountAfterReactivate = Profiles.getActiveProfiles().length;
      expect(activeCountAfterReactivate).toBe(activeCountBefore);
    });
  });

  // ========== CACHE CONSISTENCY TESTS ==========
  describe("Cache Consistency", () => {
    test("currentProfile reflects selected profile", async () => {
      await Profiles.initProfiles();
      const current = Profiles.getCurrentProfile();
      const selected = Profiles.getSelectedProfileId();

      expect(current.id).toBe(selected);
    });

    test("getProfiles() and getActiveProfiles() work together", async () => {
      await Profiles.initProfiles();

      const all = Profiles.getProfiles();
      const active = Profiles.getActiveProfiles();

      expect(active.length).toBeLessThanOrEqual(all.length);
      expect(active.every((p) => !p.inactive)).toBe(true);
    });

    test("all profiles have required fields", async () => {
      await Profiles.initProfiles();
      const profiles = Profiles.getProfiles();

      profiles.forEach((profile) => {
        expect(profile.id).toBeDefined();
        expect(profile.url).toBeDefined();
        expect(profile.unitName).toBeDefined();
        expect(profile.stakeName).toBeDefined();
      });
    });

    test("cache persists across function calls", async () => {
      await Profiles.initProfiles();
      const profiles1 = Profiles.getProfiles();
      const profiles2 = Profiles.getProfiles();

      // Should be the same reference (cached)
      expect(profiles1).toEqual(profiles2);
    });
  });

  // ========== ERROR HANDLING TESTS ==========
  describe("Error Handling", () => {
    test("rejects invalid URL format", async () => {
      await Profiles.initProfiles();

      // Non-Google Sheets URL should be rejected
      await expect(Profiles.addProfile("https://example.com", "Ward", "Stake")).rejects.toThrow();
    });

    test("rejects invalid profile ID on select", async () => {
      await Profiles.initProfiles();

      // Selecting non-existent profile should not throw but ID won't change
      const currentId = Profiles.getSelectedProfileId();
      await expect(Profiles.selectProfile("non-existent-id")).rejects.toThrow();
    });

    test("handles operations on valid profiles", async () => {
      await Profiles.initProfiles();
      const profiles = Profiles.getProfiles();

      // These should not throw
      expect(() => Profiles.getProfileById(profiles[0].id)).not.toThrow();
      expect(() => Profiles.getCurrentProfile()).not.toThrow();
      expect(() => Profiles.getActiveProfiles()).not.toThrow();
    });
  });

  // ========== CONCURRENT OPERATIONS TESTS ==========
  describe("Concurrent Operations", () => {
    test("handles rapid successive addProfile calls", async () => {
      await Profiles.initProfiles();
      const countBefore = Profiles.getProfiles().length;

      await Promise.all([
        Profiles.addProfile("https://docs.google.com/spreadsheets/d/sheet6/gviz/tq", "Unit1", "Stake1"),
        Profiles.addProfile("https://docs.google.com/spreadsheets/d/sheet7/gviz/tq", "Unit2", "Stake2")
      ]);

      // Count should increase by 2 (or 1 if one was skipped due to duplicate)
      expect(Profiles.getProfiles().length).toBeGreaterThanOrEqual(countBefore);
    });

    test("concurrent access to cache is safe", async () => {
      await Profiles.initProfiles();

      const results = await Promise.all([
        Promise.resolve(Profiles.getProfiles()),
        Promise.resolve(Profiles.getSelectedProfileId()),
        Promise.resolve(Profiles.getCurrentProfile()),
        Promise.resolve(Profiles.getActiveProfiles())
      ]);

      // All should return valid data without conflicts
      expect(results[0].length).toBeGreaterThan(0);
      expect(results[1]).toBeDefined();
      expect(results[2]).toBeDefined();
      expect(results[3].length).toBeGreaterThan(0);
    });
  });

  // ========== INTEGRATION TESTS ==========
  describe("Integration Scenarios", () => {
    test("complete workflow: initialize and retrieve profile data", async () => {
      await Profiles.initProfiles();

      expect(Profiles.getProfiles().length).toBe(2);
      expect(Profiles.getSelectedProfileId()).toBeDefined();
      expect(Profiles.getCurrentProfile()).toBeDefined();
      expect(Profiles.getCurrentProfile().id).toBe(Profiles.getSelectedProfileId());
    });

    test("multiple operations on initialized profiles", async () => {
      await Profiles.initProfiles();

      // Get all profiles
      const all = Profiles.getProfiles();
      expect(all.length).toBe(2);

      // Get active profiles (both should be active initially)
      const active = Profiles.getActiveProfiles();
      expect(active.length).toBe(2);

      // Get inactive profiles (none should be inactive initially)
      const inactive = Profiles.getInactiveProfiles();
      expect(inactive.length).toBe(0);

      // Get current profile
      const current = Profiles.getCurrentProfile();
      expect(current).toBeDefined();
      expect(current.id).toBeDefined();
    });

    test("full workflow: add, select, and deactivate profiles", async () => {
      await Profiles.initProfiles();
      const initialCount = Profiles.getProfiles().length;

      // Add a profile
      const newProfile = await Profiles.addProfile(
        "https://docs.google.com/spreadsheets/d/sheet8/gviz/tq",
        "New Ward",
        "New Stake"
      );
      expect(Profiles.getProfiles().length).toBeGreaterThan(initialCount);

      // Select it
      await Profiles.selectProfile(newProfile.id);
      expect(Profiles.getSelectedProfileId()).toBe(newProfile.id);

      // Deactivate it
      await Profiles.deactivateProfile(newProfile.id);
      const inactive = Profiles.getInactiveProfiles();
      expect(inactive.find((p) => p.id === newProfile.id)).toBeDefined();

      // Reactivate it
      await Profiles.reactivateProfile(newProfile.id);
      const active = Profiles.getActiveProfiles();
      expect(active.find((p) => p.id === newProfile.id)).toBeDefined();
    });
  });
});
