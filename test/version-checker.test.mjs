import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  fetchRemoteManifest,
  checkForUpdates,
  addCacheBusting,
  REMOTE_URL,
  MAX_RETRIES,
  withRetry
} from "../js/version-checker.js";

describe("addCacheBusting", () => {
  it("adds timestamp parameter to simple URL", () => {
    const url = "https://example.com/manifest.webmanifest";
    const result = addCacheBusting(url);

    expect(result).toContain("?t=");
    expect(new URL(result).searchParams.get("t")).toBeDefined();
  });

  it("preserves existing query parameters", () => {
    const url = "https://example.com/manifest.webmanifest?foo=bar";
    const result = addCacheBusting(url);

    expect(result).toContain("foo=bar");
    expect(result).toContain("t=");
  });

  it("preserves URL fragments", () => {
    const url = "https://example.com/manifest.webmanifest#section";
    const result = addCacheBusting(url);

    expect(result).toContain("#section");
  });

  it("handles invalid URL gracefully", () => {
    const result = addCacheBusting("not-a-url");
    expect(result).toBe("not-a-url");
  });
});

describe("fetchRemoteManifest", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns manifest on successful fetch", async () => {
    const mockManifest = { version: "2.0.0", name: "Test App" };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockManifest)
    });

    const result = await fetchRemoteManifest();
    expect(result).toEqual(mockManifest);
  });

  it("returns null on HTTP 404", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404
    });

    const result = await fetchRemoteManifest();
    expect(result).toBeNull();
  });

  it("returns null on HTTP 500", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500
    });

    const result = await fetchRemoteManifest();
    expect(result).toBeNull();
  });

  it("returns null on network error", async () => {
    vi.useFakeTimers();
    global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    const resultPromise = fetchRemoteManifest();

    // Advance timers through all retry delays (1s + 2s + initial attempts)
    await vi.advanceTimersByTimeAsync(4000);

    const result = await resultPromise;
    expect(result).toBeNull();
    vi.useRealTimers();
  });

  it("returns null on invalid JSON", async () => {
    vi.useFakeTimers();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.reject(new Error("Invalid JSON"))
    });

    const resultPromise = fetchRemoteManifest();
    await vi.advanceTimersByTimeAsync(4000);
    const result = await resultPromise;

    expect(result).toBeNull();
    vi.useRealTimers();
  });

  it("uses cache busting parameter", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ version: "1.0.0" })
    });

    await fetchRemoteManifest();

    expect(global.fetch).toHaveBeenCalled();
    const calledUrl = global.fetch.mock.calls[0][0];
    expect(calledUrl).toContain("t=");
  });
});

describe("checkForUpdates", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns needsUpdate true when remote version is newer", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ version: "3.0.0" })
    });

    const result = await checkForUpdates();

    expect(result.needsUpdate).toBe(true);
    expect(result.localVersion).toBeDefined();
    expect(result.remoteVersion).toBe("3.0.0");
  });

  it("returns needsUpdate false when versions are equal", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ version: "1.5.1" })
    });

    const result = await checkForUpdates();

    expect(result.needsUpdate).toBe(false);
    expect(result.remoteVersion).toBe("1.5.1");
  });

  it("returns needsUpdate false when remote is older", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ version: "1.0.0" })
    });

    const result = await checkForUpdates();

    expect(result.needsUpdate).toBe(false);
  });

  it("handles missing version in remote manifest", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ name: "Test App" })
    });

    const result = await checkForUpdates();

    expect(result.needsUpdate).toBe(false);
    expect(result.reason).toContain("Unable to fetch");
  });

  it("handles network error gracefully", async () => {
    vi.useFakeTimers();
    global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    const resultPromise = checkForUpdates();
    await vi.advanceTimersByTimeAsync(4000);
    const result = await resultPromise;

    expect(result.needsUpdate).toBe(false);
    expect(result.remoteVersion).toBeNull();
    vi.useRealTimers();
  });
});

describe("Retry Logic", () => {
  it("succeeds on first attempt", async () => {
    const fn = vi.fn().mockResolvedValue("success");
    const result = await withRetry(fn, 3);
    expect(result).toBe("success");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries on failure and succeeds", async () => {
    const fn = vi.fn().mockRejectedValueOnce(new Error("fail")).mockResolvedValue("success");

    const result = await withRetry(fn, 3);
    expect(result).toBe("success");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("fails after max retries", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("fail"));

    const result = await withRetry(fn, 3);
    expect(result).toBeNull();
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("uses exponential backoff", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("fail"))
      .mockRejectedValueOnce(new Error("fail"))
      .mockResolvedValue("success");

    vi.useFakeTimers();

    const promise = withRetry(fn, 3);

    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toBe("success");
    vi.useRealTimers();
  });

  it("does not retry on HTTP errors", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404
    });

    const result = await fetchRemoteManifest();
    expect(result).toBeNull();
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});
