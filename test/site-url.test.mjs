import { describe, test, expect, beforeEach, afterAll, vi } from "vitest";
import { getMetadata, setMetadata } from "../js/data/IndexedDBManager.js";

// Import IndexedDB polyfill for testing
import "fake-indexeddb/auto";

// Mock IndexedDB for testing
const mockDB = {
  metadata: new Map()
};

// Mock getMetadata and setMetadata functions
const originalGetMetadata = getMetadata;
const originalSetMetadata = setMetadata;

beforeEach(() => {
  mockDB.metadata.clear();

  // Mock getMetadata to use our mock DB
  global.getMetadata = async (key) => {
    return mockDB.metadata.get(key) || null;
  };

  // Mock setMetadata to use our mock DB
  global.setMetadata = async (key, value) => {
    mockDB.metadata.set(key, value);
    return true;
  };
});

afterAll(() => {
  // Restore original functions
  global.getMetadata = originalGetMetadata;
  global.setMetadata = originalSetMetadata;
});

describe("siteUrl functionality", () => {
  test("should return default URL when no siteUrl is stored", async () => {
    const siteUrl = await getMetadata("siteUrl");
    expect(siteUrl).toBeNull();
  });

  test("should store siteUrl in IndexedDB", async () => {
    const testUrl = "https://example.com/meeting-program";
    await setMetadata("siteUrl", testUrl);

    const storedUrl = await getMetadata("siteUrl");
    expect(storedUrl).toBe(testUrl);
  });

  test("should store and retrieve multiple siteUrls", async () => {
    const url1 = "https://example1.com/meeting-program";
    const url2 = "https://example2.com/meeting-program";

    await setMetadata("siteUrl", url1);
    await setMetadata("siteUrl", url2);

    const storedUrl = await getMetadata("siteUrl");
    expect(storedUrl).toBe(url2);
  });

  test("should handle empty string as siteUrl", async () => {
    await setMetadata("siteUrl", "");
    const storedUrl = await getMetadata("siteUrl");
    expect(storedUrl).toBe("");
  });

  test("should handle null value for siteUrl", async () => {
    await setMetadata("siteUrl", null);
    const storedUrl = await getMetadata("siteUrl");
    expect(storedUrl).toBeNull();
  });

  test("should handle undefined value for siteUrl", async () => {
    await setMetadata("siteUrl", undefined);
    const storedUrl = await getMetadata("siteUrl");
    expect(storedUrl).toBeUndefined();
  });

  test("should handle URL with query parameters", async () => {
    const testUrl =
      "https://example.com/meeting-program?url=https://docs.google.com/spreadsheets/d/ABC123";
    await setMetadata("siteUrl", testUrl);

    const storedUrl = await getMetadata("siteUrl");
    expect(storedUrl).toBe(testUrl);
  });

  test("should handle URL with trailing slash", async () => {
    const testUrl = "https://example.com/meeting-program/";
    await setMetadata("siteUrl", testUrl);

    const storedUrl = await getMetadata("siteUrl");
    expect(storedUrl).toBe(testUrl);
  });

  test("should handle URL with subdirectory", async () => {
    const testUrl = "https://example.com/my-app/meeting-program";
    await setMetadata("siteUrl", testUrl);

    const storedUrl = await getMetadata("siteUrl");
    expect(storedUrl).toBe(testUrl);
  });

  test("should handle secure HTTPS URLs", async () => {
    const testUrl = "https://secure-site.com/meeting-program";
    await setMetadata("siteUrl", testUrl);

    const storedUrl = await getMetadata("siteUrl");
    expect(storedUrl).toBe(testUrl);
  });

  test("should handle HTTP URLs", async () => {
    const testUrl = "http://insecure-site.com/meeting-program";
    await setMetadata("siteUrl", testUrl);

    const storedUrl = await getMetadata("siteUrl");
    expect(storedUrl).toBe(testUrl);
  });
});