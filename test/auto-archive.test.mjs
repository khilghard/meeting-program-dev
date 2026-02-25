import { describe, test, expect, beforeEach } from "vitest";

describe("auto-archive.js", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test("should archive new program", async () => {
    const { autoArchive, getProfileArchives } = await import("../js/auto-archive.js");

    const profileId = "test-profile";
    const date = "March 1 2026";
    const programData = [
      { key: "date", value: "March 1 2026" },
      { key: "unitName", value: "Test Ward" },
      { key: "speaker1", value: "John Smith" }
    ];

    const result = autoArchive(profileId, date, programData);
    expect(result.archived).toBe(true);

    const archives = getProfileArchives(profileId);
    expect(archives).toHaveLength(1);
    expect(archives[0].programDate).toBe(date);
  });

  test("should not archive when no changes detected", async () => {
    const { autoArchive, getProfileArchives } = await import("../js/auto-archive.js");

    const profileId = "test-profile";
    const date = "March 1 2026";
    const programData = [{ key: "unitName", value: "Test Ward" }];

    autoArchive(profileId, date, programData);
    const result = autoArchive(profileId, date, programData);

    expect(result.archived).toBe(false);
    expect(result.reason).toBe("no_changes");

    const archives = getProfileArchives(profileId);
    expect(archives).toHaveLength(1);
  });

  test("should update existing archive when content changes", async () => {
    const { autoArchive, getProfileArchives } = await import("../js/auto-archive.js");

    const profileId = "test-profile";
    const date = "March 1 2026";

    autoArchive(profileId, date, [{ key: "speaker1", value: "John" }]);
    const result = autoArchive(profileId, date, [{ key: "speaker1", value: "Jane" }]);

    expect(result.archived).toBe(true);
    expect(result.updated).toBe(true);

    const archives = getProfileArchives(profileId);
    expect(archives).toHaveLength(1);
    expect(archives[0].csvData).toEqual([{ key: "speaker1", value: "Jane" }]);
  });

  test("should handle multiple dates for same profile", async () => {
    const { autoArchive, getProfileArchives } = await import("../js/auto-archive.js");

    const profileId = "test-profile";

    autoArchive(profileId, "March 1 2026", [{ key: "date", value: "March 1" }]);
    autoArchive(profileId, "March 8 2026", [{ key: "date", value: "March 8" }]);
    autoArchive(profileId, "March 15 2026", [{ key: "date", value: "March 15" }]);

    const archives = getProfileArchives(profileId);
    expect(archives).toHaveLength(3);
  });

  test("should handle missing profileId", async () => {
    const { autoArchive } = await import("../js/auto-archive.js");

    const result = autoArchive(null, "March 1 2026", [{ key: "a" }]);
    expect(result.archived).toBe(false);
    expect(result.reason).toBe("missing_params");
  });

  test("should handle missing date", async () => {
    const { autoArchive } = await import("../js/auto-archive.js");

    const result = autoArchive("profile", "", [{ key: "a" }]);
    expect(result.archived).toBe(false);
    expect(result.reason).toBe("missing_params");
  });

  test("should handle missing csvData", async () => {
    const { autoArchive } = await import("../js/auto-archive.js");

    const result = autoArchive("profile", "March 1", null);
    expect(result.archived).toBe(false);
    expect(result.reason).toBe("missing_params");
  });

  test("should return empty array when no archives", async () => {
    const { getProfileArchives } = await import("../js/auto-archive.js");

    const archives = getProfileArchives("nonexistent");
    expect(archives).toEqual([]);
  });

  test("should return specific archive entry", async () => {
    const { autoArchive, getArchiveEntry } = await import("../js/auto-archive.js");

    const profileId = "test-profile";
    const date = "March 1 2026";
    const programData = [{ key: "unitName", value: "Test Ward" }];

    autoArchive(profileId, date, programData);
    const entry = getArchiveEntry(profileId, date);

    expect(entry).not.toBeNull();
    expect(entry.programDate).toBe(date);
  });

  test("should return null for nonexistent archive entry", async () => {
    const { getArchiveEntry } = await import("../js/auto-archive.js");

    const entry = getArchiveEntry("profile", "nonexistent");
    expect(entry).toBeNull();
  });

  test("should clear all archives for a profile", async () => {
    const { autoArchive, getProfileArchives, clearProfileArchives } =
      await import("../js/auto-archive.js");

    const profileId = "test-profile";
    autoArchive(profileId, "March 1", [{ key: "a" }]);
    autoArchive(profileId, "March 8", [{ key: "a" }]);

    expect(getProfileArchives(profileId)).toHaveLength(2);

    clearProfileArchives(profileId);
    expect(getProfileArchives(profileId)).toHaveLength(0);
  });

  test("should clear all archives", async () => {
    const { autoArchive, getProfileArchives, clearAllArchives } =
      await import("../js/auto-archive.js");

    autoArchive("profile1", "March 1", [{ key: "a" }]);
    autoArchive("profile2", "March 1", [{ key: "a" }]);

    clearAllArchives();

    expect(getProfileArchives("profile1")).toHaveLength(0);
    expect(getProfileArchives("profile2")).toHaveLength(0);
  });

  test("should return storage info", async () => {
    const { autoArchive, getStorageInfo } = await import("../js/auto-archive.js");

    autoArchive("profile", "March 1", [{ key: "unitName", value: "Test Ward" }], { force: true });

    const info = getStorageInfo();
    expect(info.totalEntries).toBeGreaterThan(0);
    expect(info.totalSizeBytes).toBeGreaterThan(0);
    expect(info.maxSizeMB).toBe("10.00");
  });

  test("should sort archives by date descending", async () => {
    const { autoArchive, getProfileArchives } = await import("../js/auto-archive.js");

    const profileId = "test-profile";
    autoArchive(profileId, "March 1 2026", [{ key: "date", value: "March 1" }]);
    autoArchive(profileId, "March 15 2026", [{ key: "date", value: "March 15" }]);
    autoArchive(profileId, "March 8 2026", [{ key: "date", value: "March 8" }]);

    const archives = getProfileArchives(profileId);
    expect(archives[0].programDate).toBe("March 15 2026");
    expect(archives[1].programDate).toBe("March 8 2026");
    expect(archives[2].programDate).toBe("March 1 2026");
  });

  test("should force archive even without changes", async () => {
    const { autoArchive, getProfileArchives } = await import("../js/auto-archive.js");

    const profileId = "test-profile";
    const date = "March 1 2026";
    const programData = [{ key: "unitName", value: "Test Ward" }];

    autoArchive(profileId, date, programData);
    const result = autoArchive(profileId, date, programData, { force: true });

    expect(result.archived).toBe(true);
    expect(result.updated).toBe(true);
  });
});
