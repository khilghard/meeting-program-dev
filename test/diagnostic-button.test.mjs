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
      googleSheetUrl: "https://docs.google.com/spreadsheets/d/FILE_ID/gviz/tq?tqx=out:csv"
    });
  });

  afterEach(() => {
    destroyDiagnosticButton();
    delete navigator.clipboard;
    window.location = originalLocation;
    vi.useRealTimers();
  });

  test("opens a regular mailto draft when payload is small", async () => {
    formatDiagnosticEmail.mockReturnValue("short diagnostic body");

    initDiagnosticButton();
    document.getElementById("diagnostic-button").click();
    await vi.runAllTimersAsync();

    expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
    expect(window.location.href).toContain("mailto:?subject=");
    expect(decodeURIComponent(window.location.href)).toContain("short diagnostic body");
  });

  test("copies full diagnostics and opens a short draft when payload is too large", async () => {
    const oversizedBody = "X".repeat(5000);
    formatDiagnosticEmail.mockReturnValue(oversizedBody);

    initDiagnosticButton();
    document.getElementById("diagnostic-button").click();
    await vi.runAllTimersAsync();

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(oversizedBody);
    expect(window.location.href).toContain("mailto:?subject=");
    expect(window.location.href.length).toBeLessThan(1800);
    expect(decodeURIComponent(window.location.href)).toContain(
      "Full diagnostic report was copied to your clipboard"
    );
  });
});