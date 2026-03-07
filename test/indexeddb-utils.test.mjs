import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";

describe("IndexedDBManager - Helper Functions", () => {
  let calculateChecksum, getStorageIntegrity, cleanupOldArchives;

  beforeEach(async () => {
    vi.resetModules();
    const module = await import("../js/data/IndexedDBManager.js");
    calculateChecksum = module.calculateChecksum;
    getStorageIntegrity = module.getStorageIntegrity;
    cleanupOldArchives = module.cleanupOldArchives;
  });

  afterEach(() => {
    vi.resetModules();
  });

  describe("calculateChecksum", () => {
    test("should calculate checksum for string data", async () => {
      const checksum = await calculateChecksum("test data");
      expect(checksum).toBeDefined();
      expect(typeof checksum).toBe("string");
      expect(checksum.length).toBe(64); // SHA-256 produces 64 hex chars
    });

    test("should calculate checksum for object data", async () => {
      const data = { key: "value", number: 123 };
      const checksum = await calculateChecksum(data);
      expect(checksum).toBeDefined();
      expect(typeof checksum).toBe("string");
    });

    test("should return empty string for null data", async () => {
      const checksum = await calculateChecksum(null);
      expect(checksum).toBe("");
    });

    test("should return same checksum for same data", async () => {
      const data = "consistent data";
      const checksum1 = await calculateChecksum(data);
      const checksum2 = await calculateChecksum(data);
      expect(checksum1).toBe(checksum2);
    });

    test("should return different checksum for different data", async () => {
      const checksum1 = await calculateChecksum("data 1");
      const checksum2 = await calculateChecksum("data 2");
      expect(checksum1).not.toBe(checksum2);
    });
  });

  describe("cleanupOldArchives", () => {
    test("should be a function", () => {
      expect(typeof cleanupOldArchives).toBe("function");
    });

    test("should accept days parameter", () => {
      expect(cleanupOldArchives.length).toBe(1);
    });
  });

  describe("getStorageIntegrity", () => {
    test("should be a function", () => {
      expect(typeof getStorageIntegrity).toBe("function");
    });
  });
});
