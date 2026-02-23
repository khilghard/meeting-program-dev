import { describe, test, expect, beforeEach, vi } from "vitest";
import * as Profiles from "../js/profiles.js";

describe("Profiles Module", () => {
    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
    });

    test("starts empty", () => {
        expect(Profiles.getProfiles()).toEqual([]);
        expect(Profiles.getCurrentProfile()).toBeNull();
    });

    test("adds a profile", () => {
        const p = Profiles.addProfile("https://test.com", "Ward A", "Stake A");
        expect(p.id).toBeDefined();
        expect(p.url).toBe("https://test.com");
        expect(p.unitName).toBe("Ward A");
        expect(p.stakeName).toBe("Stake A");

        const all = Profiles.getProfiles();
        expect(all).toHaveLength(1);
        expect(all[0]).toEqual(p);
    });

    test("auto-selects newly added profile", () => {
        const p = Profiles.addProfile("https://test.com", "Ward A", "Stake A");
        expect(Profiles.getSelectedProfileId()).toBe(p.id);
        expect(Profiles.getCurrentProfile()).toEqual(p);
    });

    test("updates existing profile by URL", () => {
        Profiles.addProfile("https://test.com", "Ward A", "Stake A");
        const p2 = Profiles.addProfile("https://test.com", "Ward B", "Stake B"); // Same URL, new names

        const all = Profiles.getProfiles();
        expect(all).toHaveLength(1); // Should still be 1
        expect(all[0].unitName).toBe("Ward B");
        expect(all[0].stakeName).toBe("Stake B");
        expect(all[0].id).toBeDefined();
    });

    test("supports multiple profiles", () => {
        const p1 = Profiles.addProfile("https://a.com", "A", "S1");
        const p2 = Profiles.addProfile("https://b.com", "B", "S1");

        const all = Profiles.getProfiles();
        expect(all).toHaveLength(2);

        // p2 was added last, so it should be current
        expect(Profiles.getCurrentProfile().url).toBe("https://b.com");

        // switch back to p1
        Profiles.selectProfile(p1.id);
        expect(Profiles.getCurrentProfile().url).toBe("https://a.com");
    });

    test("removes a profile", () => {
        const p1 = Profiles.addProfile("https://a.com", "A", "S1");
        const p2 = Profiles.addProfile("https://b.com", "B", "S1");

        Profiles.removeProfile(p1.id);
        const all = Profiles.getProfiles();
        expect(all).toHaveLength(1);
        expect(all[0].id).toBe(p2.id);
    });

    test("removing selected profile switches to another available one", () => {
        const p1 = Profiles.addProfile("https://a.com", "A", "S1");
        // Ensure p1 has an older timestamp
        const profiles = Profiles.getProfiles();
        profiles[0].lastUsed -= 1000;
        localStorage.setItem("meeting_program_profiles", JSON.stringify(profiles));

        const p2 = Profiles.addProfile("https://b.com", "B", "S1");

        // Currently p2 is selected
        expect(Profiles.getCurrentProfile().id).toBe(p2.id);

        // Remove p2
        Profiles.removeProfile(p2.id);

        // Should contain p1
        expect(Profiles.getProfiles()).toHaveLength(1);
        // Should auto-select p1
        expect(Profiles.getCurrentProfile().id).toBe(p1.id);
    });

    test("removing last profile clears selection", () => {
        const p1 = Profiles.addProfile("https://a.com", "A", "S1");
        Profiles.removeProfile(p1.id);
        expect(Profiles.getCurrentProfile()).toBeNull();
    });
});
