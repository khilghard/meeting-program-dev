import { describe, test, expect, beforeEach } from "vitest";
import {
  initArchiveManager,
  autoArchive,
  getProfileArchives,
  getArchiveEntry,
  getLatestArchive,
  verifyArchive,
  getStorageInfo,
  cleanupBySize,
  cleanupByAge,
  clearProfileArchives,
  clearAllArchives
} from "../js/data/ArchiveManager.js";

describe("ArchiveManager", () => {
  beforeEach(async () => {
    await initArchiveManager();
    await clearAllArchives();
  });

  describe("Archive Creation", () => {
    test("creates a new archive", async () => {
      const result = await autoArchive("profile-1", "2026-02-24", "test,data");
      expect(result.archived).toBe(true);
      expect(result.updated).toBe(false);
    });

    test("skips archive if content is identical", async () => {
      await autoArchive("profile-1", "2026-02-24", "test,data");
      const result = await autoArchive("profile-1", "2026-02-24", "test,data");
      expect(result.archived).toBe(false);
      expect(result.reason).toBe("no_changes");
    });

    test("updates archive if content is different", async () => {
      await autoArchive("profile-1", "2026-02-24", "test,data");
      const result = await autoArchive("profile-1", "2026-02-24", "new,data");
      expect(result.archived).toBe(true);
      expect(result.updated).toBe(true);
    });

    test("returns error for missing params", async () => {
      const result = await autoArchive(null, "2026-02-24", "test");
      expect(result.archived).toBe(false);
      expect(result.reason).toBe("missing_params");

      const result2 = await autoArchive("profile-1", null, "test");
      expect(result2.archived).toBe(false);

      const result3 = await autoArchive("profile-1", "2026-02-24", null);
      expect(result3.archived).toBe(false);
    });
  });

  describe("Archive Retrieval", () => {
    test("gets all archives for profile sorted by date", async () => {
      await autoArchive("profile-1", "2026-01-01", "data1");
      await autoArchive("profile-1", "2026-03-01", "data3");
      await autoArchive("profile-1", "2026-02-01", "data2");

      const archives = await getProfileArchives("profile-1");
      expect(archives).toHaveLength(3);
      expect(archives[0].programDate).toBe("2026-03-01");
      expect(archives[1].programDate).toBe("2026-02-01");
      expect(archives[2].programDate).toBe("2026-01-01");
    });

    test("gets single archive entry", async () => {
      await autoArchive("profile-1", "2026-02-24", "test,data");
      const archive = await getArchiveEntry("profile-1", "2026-02-24");
      expect(archive).toBeDefined();
      expect(archive.programDate).toBe("2026-02-24");
    });

    test("returns null for non-existent entry", async () => {
      const archive = await getArchiveEntry("profile-1", "2099-01-01");
      expect(archive).toBeNull();
    });

    test("gets latest archive", async () => {
      await autoArchive("profile-1", "2026-01-01", "old");
      await autoArchive("profile-1", "2026-02-24", "new");

      const latest = await getLatestArchive("profile-1");
      expect(latest.programDate).toBe("2026-02-24");
    });
  });

  describe("Storage Info", () => {
    test("gets storage info", async () => {
      await autoArchive("profile-1", "2026-02-24", "test,data");

      const info = await getStorageInfo();
      expect(info.totalEntries).toBe(1);
      expect(info.totalSizeBytes).toBeGreaterThan(0);
    });
  });

  describe("Archive Cleanup", () => {
    test("clears all archives for profile", async () => {
      await autoArchive("profile-1", "2026-02-24", "data1");
      await autoArchive("profile-1", "2026-02-25", "data2");

      await clearProfileArchives("profile-1");

      const archives = await getProfileArchives("profile-1");
      expect(archives).toHaveLength(0);
    });

    test("clears all archives", async () => {
      await autoArchive("profile-1", "2026-02-24", "data1");
      await autoArchive("profile-2", "2026-02-24", "data2");

      await clearAllArchives();

      const archives1 = await getProfileArchives("profile-1");
      const archives2 = await getProfileArchives("profile-2");
      expect(archives1).toHaveLength(0);
      expect(archives2).toHaveLength(0);
    });
  });
});
