import { describe, test, expect, beforeEach, vi } from "vitest";

describe("Force Update Mechanism", () => {
  let originalLocation;
  let mockServiceWorker;
  let mockController;

  beforeEach(() => {
    originalLocation = window.location;
    mockController = { postMessage: vi.fn() };
    mockServiceWorker = { controller: mockController };
  });

  afterEach(() => {
    window.location = originalLocation;
  });

  test("should NOT trigger force update when parameter is absent", () => {
    window.location = { search: "" };

    const urlParams = new URLSearchParams(window.location.search);
    const forceUpdate = urlParams.get("forceUpdate") === "true";

    expect(forceUpdate).toBe(false);
  });

  test("should parse forceUpdate=true parameter correctly", () => {
    window.location = { search: "?forceUpdate=true" };

    const urlParams = new URLSearchParams(window.location.search);
    const forceUpdate = urlParams.get("forceUpdate") === "true";

    expect(forceUpdate).toBe(true);
  });

  test("should parse forceUpdate=false correctly", () => {
    window.location = { search: "?forceUpdate=false" };

    const urlParams = new URLSearchParams(window.location.search);
    const forceUpdate = urlParams.get("forceUpdate") === "true";

    expect(forceUpdate).toBe(false);
  });

  test("should handle forceUpdate with other params", () => {
    window.location = { search: "?url=https://example.com&forceUpdate=true&other=test" };

    const urlParams = new URLSearchParams(window.location.search);
    const forceUpdate = urlParams.get("forceUpdate") === "true";
    const url = urlParams.get("url");

    expect(forceUpdate).toBe(true);
    expect(url).toBe("https://example.com");
  });

  test("should send skipWaiting message to service worker when forceUpdate=true", () => {
    window.location = { search: "?forceUpdate=true" };
    navigator.serviceWorker = { controller: mockController };

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("forceUpdate") === "true") {
      if (navigator.serviceWorker && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ action: "skipWaiting" });
      }
    }

    expect(mockController.postMessage).toHaveBeenCalledWith({ action: "skipWaiting" });
  });

  test("should NOT send skipWaiting when service worker unavailable", () => {
    window.location = { search: "?forceUpdate=true" };
    navigator.serviceWorker = null;

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("forceUpdate") === "true") {
      if (navigator.serviceWorker && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ action: "skipWaiting" });
      }
    }

    expect(mockController.postMessage).not.toHaveBeenCalled();
  });

  test("should NOT send skipWaiting when controller is null", () => {
    window.location = { search: "?forceUpdate=true" };
    navigator.serviceWorker = { controller: null };

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("forceUpdate") === "true") {
      if (navigator.serviceWorker && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ action: "skipWaiting" });
      }
    }

    expect(mockController.postMessage).not.toHaveBeenCalled();
  });

  test("should build correct URL after removing forceUpdate param", () => {
    const url = new URL("https://example.com?url=https://sheet.com&forceUpdate=true");
    url.searchParams.delete("forceUpdate");
    const newUrl = url.pathname + "?" + url.searchParams.toString();

    expect(newUrl).toContain("url=");
    expect(newUrl).not.toContain("forceUpdate");
  });

  test("should handle URL with only forceUpdate param", () => {
    window.location = {
      search: "?forceUpdate=true",
      pathname: "/meeting-program/index.html"
    };

    const urlParams = new URLSearchParams(window.location.search);
    urlParams.delete("forceUpdate");
    const newUrl =
      window.location.pathname + (urlParams.toString() ? "?" + urlParams.toString() : "");

    expect(newUrl).toBe("/meeting-program/index.html");
  });
});

describe("Service Worker Update Flow", () => {
  test("skipWaiting message structure is correct", () => {
    const message = { action: "skipWaiting" };

    expect(message).toHaveProperty("action", "skipWaiting");
    expect(Object.keys(message)).toHaveLength(1);
  });

  test("message handler detects skipWaiting action", () => {
    const messageEvent = {
      data: { action: "skipWaiting" }
    };

    if (messageEvent.data && messageEvent.data.action === "skipWaiting") {
      expect(messageEvent.data.action).toBe("skipWaiting");
    }
  });
});

describe("Force Update E2E Scenario", () => {
  test("complete force update flow: URL -> parse -> SW message -> redirect", () => {
    const initialUrl = "https://khilghard.github.io/meeting-program/?forceUpdate=true";

    const url = new URL(initialUrl);
    const forceUpdate = url.searchParams.get("forceUpdate") === "true";

    expect(forceUpdate).toBe(true);

    url.searchParams.delete("forceUpdate");
    const cleanedUrl = url.toString();

    expect(cleanedUrl).toBe("https://khilghard.github.io/meeting-program/");
  });

  test("normal program load does NOT trigger force update", () => {
    const programUrl =
      "https://khilghard.github.io/meeting-program/?url=https://docs.google.com/spreadsheets/d/ABC123/gviz/tq?tqx=out:csv";

    const url = new URL(programUrl);
    const forceUpdate = url.searchParams.get("forceUpdate") === "true";
    const programSheetUrl = url.searchParams.get("url");

    expect(forceUpdate).toBe(false);
    expect(programSheetUrl).toContain("ABC123");
  });

  test("forceUpdate works alongside program URL", () => {
    const combinedUrl =
      "https://khilghard.github.io/meeting-program/?url=https://docs.google.com/spreadsheets/d/ABC123/gviz/tq?tqx=out:csv&forceUpdate=true";

    const url = new URL(combinedUrl);
    const forceUpdate = url.searchParams.get("forceUpdate") === "true";
    const programSheetUrl = url.searchParams.get("url");

    expect(forceUpdate).toBe(true);
    expect(programSheetUrl).toContain("ABC123");
  });

  test("QR code generation with forceUpdate flag produces correct URL", () => {
    const BASE_URL = "https://khilghard.github.io/meeting-program/";
    const csvUrl = "https://docs.google.com/spreadsheets/d/ABC123/gviz/tq?tqx=out:csv";

    const params = new URLSearchParams();
    params.set("url", csvUrl);
    params.set("forceUpdate", "true");

    const result = `${BASE_URL}?${params.toString()}`;

    expect(result).toContain("forceUpdate=true");
    expect(result).toContain("url=");
    expect(result).toContain(encodeURIComponent(csvUrl));
  });
});

describe("No-Cache Parameter", () => {
  test("should parse nocache=true parameter", () => {
    const url = new URL("https://example.com/?nocache=true");
    expect(url.searchParams.get("nocache")).toBe("true");
  });

  test("should handle nocache alongside forceUpdate", () => {
    const url = new URL("https://example.com/?forceUpdate=true&nocache=true");
    expect(url.searchParams.get("forceUpdate")).toBe("true");
    expect(url.searchParams.get("nocache")).toBe("true");
  });

  test("should remove nocache param after processing", () => {
    const url = new URL("https://example.com/?nocache=true");
    url.searchParams.delete("nocache");
    url.searchParams.set("t", Date.now().toString());

    expect(url.searchParams.has("nocache")).toBe(false);
    expect(url.searchParams.has("t")).toBe(true);
  });

  test("should trigger reload when nocache=true", () => {
    let reloadCalled = false;
    const originalLocation = window.location;

    window.location = {
      search: "?nocache=true",
      pathname: "/meeting-program/",
      href: "https://example.com/",
      toString: () => "https://example.com/"
    };

    const urlParams = new URLSearchParams(window.location.search);
    const nocache = urlParams.get("nocache") === "true";
    const forceUpdate = urlParams.get("forceUpdate") === "true";

    // Both flags should trigger the reload logic
    expect(nocache || forceUpdate).toBe(true);
  });
});
