import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";

vi.mock("../js/utils/diagnostic-data-collector.js", () => ({
  collectDiagnosticData: vi.fn(),
  formatDiagnosticEmail: vi.fn()
}));

vi.mock("../js/i18n/index.js", () => ({
  t: vi.fn((key) => key)
}));

import { initDiagnosticButton, destroyDiagnosticButton } from "../js/components/diagnostic-button.js";
import {
  collectDiagnosticData,
  formatDiagnosticEmail
} from "../js/utils/diagnostic-data-collector.js";

describe("Diagnostic Button", () => {
  const originalLocation = window.location;
  const originalUserAgent = navigator.userAgent;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    document.body.innerHTML = "";
    global.alert = vi.fn();

    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: vi.fn().mockResolvedValue(undefined)
      },
      configurable: true
    });

    delete window.location;
    window.location = { href: "" };

    collectDiagnosticData.mockResolvedValue({
      timestamp: "2026-05-19T02:13:37.836Z",
      siteUrl: "http://localhost:8000/meeting-program/",
      googleSheetUrl: "https://docs.google.com/spreadsheets/d/FILE_ID/gviz/tq?tqx=out:csv",
      consoleLogs: []
    });

    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      value: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"
    });
  });

  afterEach(() => {
    destroyDiagnosticButton();
    delete navigator.clipboard;
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      value: originalUserAgent
    });
    window.location = originalLocation;
    vi.useRealTimers();
  });

  test("opens a regular mailto draft when payload is small", async () => {
    formatDiagnosticEmail.mockReturnValue("short diagnostic body");

    let capturedAnchor = null;
    const origCreate = document.createElement.bind(document);
    const createSpy = vi.spyOn(document, "createElement").mockImplementation((tag) => {
      const el = origCreate(tag);
      if (tag === "a") {
        capturedAnchor = el;
      }
      return el;
    });

    initDiagnosticButton();
    document.getElementById("diagnostic-button").click();
    await vi.runAllTimersAsync();

    expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
    expect(capturedAnchor).not.toBeNull();
    expect(capturedAnchor.href).toContain("mailto:?subject=");
    expect(decodeURIComponent(capturedAnchor.href)).toContain("short diagnostic body");
    createSpy.mockRestore();
  });

  test("copies full diagnostics and opens a short draft when payload is too large", async () => {
    const oversizedBody = "X".repeat(5000);
    formatDiagnosticEmail.mockReturnValue(oversizedBody);

    initDiagnosticButton();
    document.getElementById("diagnostic-button").click();
    await vi.runAllTimersAsync();

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(oversizedBody);
    // Anchor is removed after click, so we verify via the click event listener
    // by re-running with a spy on the document
    const clickSpy = vi.spyOn(document, "createElement");
    destroyDiagnosticButton();
    clickSpy.mockClear();

    // Re-init with fresh mocks to verify the anchor path
    formatDiagnosticEmail.mockReturnValue(oversizedBody);
    initDiagnosticButton();
    document.getElementById("diagnostic-button").click();
    await vi.runAllTimersAsync();

    // Find the <a> that was created with mailto href
    const createdElements = clickSpy.mock.calls.map(([tag]) => tag);
    expect(createdElements).toContain("a");
    clickSpy.mockRestore();
  });

  test("fallback draft includes only error logs when oversized", async () => {
    const oversizedBody = "X".repeat(5000);
    formatDiagnosticEmail.mockReturnValue(oversizedBody);
    collectDiagnosticData.mockResolvedValue({
      timestamp: "2026-05-19T02:13:37.836Z",
      siteUrl: "http://localhost:8000/meeting-program/",
      googleSheetUrl: "https://docs.google.com/spreadsheets/d/FILE_ID/gviz/tq?tqx=out:csv",
      consoleLogs: [
        {
          timestamp: "2026-05-19T02:13:37.836Z",
          level: "warn",
          message: "warn message"
        },
        {
          timestamp: "2026-05-19T02:13:38.000Z",
          level: "error",
          message: "error message"
        }
      ]
    });

    let capturedAnchor = null;
    const origCreate = document.createElement.bind(document);
    const createSpy = vi.spyOn(document, "createElement").mockImplementation((tag) => {
      const el = origCreate(tag);
      if (tag === "a") {
        capturedAnchor = el;
      }
      return el;
    });

    initDiagnosticButton();
    document.getElementById("diagnostic-button").click();
    await vi.runAllTimersAsync();

    expect(capturedAnchor).not.toBeNull();
    const decodedMailto = decodeURIComponent(capturedAnchor.href);
    expect(decodedMailto).toContain("Error Logs:");
    expect(decodedMailto).toContain("error message");
    expect(decodedMailto).not.toContain("warn message");
    createSpy.mockRestore();
  });

  test("keeps full oversized diagnostics on Android", async () => {
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      value: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/126.0.0.0 Mobile Safari/537.36"
    });

    const oversizedBody = "X".repeat(5000);
    formatDiagnosticEmail.mockReturnValue(oversizedBody);

    let capturedAnchor = null;
    const origCreate = document.createElement.bind(document);
    const createSpy = vi.spyOn(document, "createElement").mockImplementation((tag) => {
      const el = origCreate(tag);
      if (tag === "a") {
        capturedAnchor = el;
      }
      return el;
    });

    initDiagnosticButton();
    document.getElementById("diagnostic-button").click();
    await vi.runAllTimersAsync();

    expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
    expect(capturedAnchor).not.toBeNull();
    const decodedMailto = decodeURIComponent(capturedAnchor.href);
    expect(decodedMailto).toContain(oversizedBody);
    createSpy.mockRestore();
  });
});