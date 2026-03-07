import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import {
    initMigrationSystem,
    checkMigrationRequired,
    getMigrationPreference,
    saveMigrationPreference
} from "../js/data/MigrationSystem.js";

describe("MigrationSystem", () => {
    beforeEach(async () => {
        localStorage.clear();
        vi.resetModules();
        await initMigrationSystem();
    });

    afterEach(async () => {
        vi.clearAllMocks();
        localStorage.clear();
    });

    describe("checkMigrationRequired", () => {
        test("should return not required when profileId is missing", async () => {
            const result = await checkMigrationRequired(null, [{ key: "test", value: "data" }]);
            expect(result).toEqual({ required: false, url: null, ignored: false });
        });

        test("should return not required when csvData is missing", async () => {
            const result = await checkMigrationRequired("profile-1", null);
            expect(result).toEqual({ required: false, url: null, ignored: false });
        });

        test("should return required when obsolete and migrationUrl are present", async () => {
            const csvData = [
                { key: "obsolete", value: "true" },
                { key: "migrationUrl", value: "https://docs.google.com/spreadsheets/d/test" }
            ];

            const result = await checkMigrationRequired("profile-1", csvData);

            expect(result).toEqual({
                required: true,
                url: "https://docs.google.com/spreadsheets/d/test",
                ignored: false
            });
        });

        test("should return not required when obsolete is false", async () => {
            const csvData = [
                { key: "obsolete", value: "false" },
                { key: "migrationUrl", value: "https://test.com" }
            ];

            const result = await checkMigrationRequired("profile-1", csvData);

            expect(result).toEqual({ required: false, url: null, ignored: false });
        });

        test("should return not required when migrationUrl is missing", async () => {
            const csvData = [{ key: "obsolete", value: "true" }];

            const result = await checkMigrationRequired("profile-1", csvData);

            expect(result).toEqual({ required: false, url: null, ignored: false });
        });

        test("should handle empty csvData array", async () => {
            const result = await checkMigrationRequired("profile-1", []);
            expect(result).toEqual({ required: false, url: null, ignored: false });
        });
    });

    describe("getMigrationPreference", () => {
        test("should return null when profileId is missing", async () => {
            const result = await getMigrationPreference(null);
            expect(result).toBeNull();
        });

        test("should return null when no preference exists", async () => {
            const result = await getMigrationPreference("non-existent-profile");
            expect(result).toBeNull();
        });

        test("should return preference when it exists", async () => {
            await saveMigrationPreference("profile-1", true);

            const result = await getMigrationPreference("profile-1");

            expect(result).toEqual({
                ignored: true,
                lastChecked: expect.any(Number)
            });
        });
    });

    describe("saveMigrationPreference", () => {
        test("should save ignored preference as true", async () => {
            await saveMigrationPreference("profile-1", true);

            const result = await getMigrationPreference("profile-1");
            expect(result.ignored).toBe(true);
        });

        test("should save ignored preference as false", async () => {
            await saveMigrationPreference("profile-1", false);

            const result = await getMigrationPreference("profile-1");
            expect(result.ignored).toBe(false);
        });
    });
});
