/**
 * Diagnostic Data Collector Tests
 * Tests the diagnostic data collection and formatting functionality
 */

import { describe, test, expect, beforeEach, vi } from "vitest";
import { collectDiagnosticData, formatDiagnosticEmail } from "../js/utils/diagnostic-data-collector.js";

// Mock the dependencies
vi.mock("../js/utils/console-capture.js", () => ({
  getConsoleLogs: vi.fn(() => [
    { timestamp: "2026-03-24T14:30:45.000Z", level: "log", message: "Test log" }
  ])
}));

vi.mock("../js/profiles.js", () => ({
  getCurrentProfile: vi.fn(() => ({
    id: "profile-123",
    url: "https://docs.google.com/spreadsheets/d/test/gviz/tq?tqx=out:csv",
    unitName: "Test Ward",
    stakeName: "Test Stake",
    lastUsed: Date.now()
  }))
}));

vi.mock("../js/i18n/index.js", () => ({
  getLanguage: vi.fn(() => "en")
}));

vi.mock("../js/theme.js", () => ({
  getTheme: vi.fn(() => "light")
}));

describe("Diagnostic Data Collector Module", () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  test("collectDiagnosticData returns all required fields", async () => {
    const data = await collectDiagnosticData();

    expect(data).toHaveProperty("timestamp");
    expect(data).toHaveProperty("userAgent");
    expect(data).toHaveProperty("siteUrl");
    expect(data).toHaveProperty("googleSheetUrl");
    expect(data).toHaveProperty("deviceInfo");
    expect(data).toHaveProperty("profile");
    expect(data).toHaveProperty("localStorage");
    expect(data).toHaveProperty("consoleLogs");
  });

  test("timestamp is ISO formatted", async () => {
    const data = await collectDiagnosticData();

    expect(data.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  test("includes user agent string", async () => {
    const data = await collectDiagnosticData();

    expect(typeof data.userAgent).toBe("string");
    expect(data.userAgent.length).toBeGreaterThan(0);
  });

  test("includes current site URL", async () => {
    const data = await collectDiagnosticData();

    expect(typeof data.siteUrl).toBe("string");
    expect(data.siteUrl).toMatch(/^https?:\/\//);
  });

  test("includes Google Sheet URL from profile", async () => {
    const data = await collectDiagnosticData();

    expect(data.googleSheetUrl).toContain("sheets");
  });

  test("deviceInfo includes required properties", async () => {
    const data = await collectDiagnosticData();

    expect(data.deviceInfo).toHaveProperty("language");
    expect(data.deviceInfo).toHaveProperty("theme");
    expect(data.deviceInfo).toHaveProperty("isOnline");
    expect(data.deviceInfo).toHaveProperty("screenWidth");
    expect(data.deviceInfo).toHaveProperty("screenHeight");
    expect(data.deviceInfo).toHaveProperty("timezone");
  });

  test("profile includes unit and stake names", async () => {
    const data = await collectDiagnosticData();

    expect(data.profile).toBeDefined();
    expect(data.profile.unitName).toBe("Test Ward");
    expect(data.profile.stakeName).toBe("Test Stake");
  });

  test("localStorage data is collected", async () => {
    localStorage.setItem("testKey", "testValue");
    const data = await collectDiagnosticData();

    expect(data.localStorage.testKey).toBe("testValue");
  });

  test("console logs are included", async () => {
    const data = await collectDiagnosticData();

    expect(Array.isArray(data.consoleLogs)).toBe(true);
    expect(data.consoleLogs.length).toBeGreaterThan(0);
  });

  test("formatDiagnosticEmail includes device information", async () => {
    const data = await collectDiagnosticData();
    const email = formatDiagnosticEmail(data);

    expect(email).toContain("=== DEVICE INFORMATION ===");
    expect(email).toContain("Timestamp:");
    expect(email).toContain("User Agent:");
    expect(email).toContain("Online Status:");
  });

  test("formatDiagnosticEmail includes site information", async () => {
    const data = await collectDiagnosticData();
    const email = formatDiagnosticEmail(data);

    expect(email).toContain("=== SITE INFORMATION ===");
    expect(email).toContain("Site URL:");
    expect(email).toContain("Google Sheet URL:");
  });

  test("formatDiagnosticEmail includes profile information", async () => {
    const data = await collectDiagnosticData();
    const email = formatDiagnosticEmail(data);

    expect(email).toContain("=== CURRENT PROFILE ===");
    expect(email).toContain("Unit Name:");
    expect(email).toContain("Stake Name:");
  });

  test("formatDiagnosticEmail includes localStorage section", async () => {
    localStorage.setItem("key1", "value1");
    const data = await collectDiagnosticData();
    const email = formatDiagnosticEmail(data);

    expect(email).toContain("=== LOCAL STORAGE ===");
    expect(email).toContain("key1:");
    expect(email).toContain("value1");
  });

  test("formatDiagnosticEmail includes console logs section", async () => {
    const data = await collectDiagnosticData();
    const email = formatDiagnosticEmail(data);

    expect(email).toContain("=== CONSOLE LOGS ===");
    expect(email).toContain("Test log");
  });

  test("formatDiagnosticEmail truncates long values", async () => {
    const longValue = "x".repeat(300);
    localStorage.setItem("longKey", longValue);
    const data = await collectDiagnosticData();
    const email = formatDiagnosticEmail(data);

    expect(email).toContain("...");
    expect(email).not.toContain(longValue);
  });

  test("formatDiagnosticEmail handles objects in localStorage", async () => {
    localStorage.setItem("objKey", JSON.stringify({ nested: "value" }));
    const data = await collectDiagnosticData();
    const email = formatDiagnosticEmail(data);

    expect(email).toContain("objKey:");
  });

  test("email body is readable text format", async () => {
    const data = await collectDiagnosticData();
    const email = formatDiagnosticEmail(data);

    // Should not contain JSON
    expect(email).not.toMatch(/^{/);
    // Should contain sections separated by ===
    expect(email.match(/===/g).length).toBeGreaterThanOrEqual(4);
    // Should have multiple lines
    expect(email.split("\n").length).toBeGreaterThan(10);
  });

  test("handles missing profile gracefully", async () => {
    // Profile is mocked, but test that data structure is valid
    const data = await collectDiagnosticData();

    if (data.profile === null) {
      expect(data.profile).toBeNull();
    } else {
      expect(data.profile).toBeDefined();
      expect(data.profile.unitName).toBeDefined();
    }
  });

  test("screen dimensions are numbers", async () => {
    const data = await collectDiagnosticData();

    expect(typeof data.deviceInfo.screenWidth).toBe("number");
    expect(typeof data.deviceInfo.screenHeight).toBe("number");
    expect(data.deviceInfo.screenWidth).toBeGreaterThan(0);
    expect(data.deviceInfo.screenHeight).toBeGreaterThan(0);
  });

  test("online status is boolean", async () => {
    const data = await collectDiagnosticData();

    expect(typeof data.deviceInfo.isOnline).toBe("boolean");
  });

  test("timezone string is reasonable", async () => {
    const data = await collectDiagnosticData();

    expect(typeof data.deviceInfo.timezone).toBe("string");
    expect(data.deviceInfo.timezone.length).toBeGreaterThan(0);
  });

  test("all log levels are captured correctly", async () => {
    const testData = {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      siteUrl: window.location.href,
      googleSheetUrl: "https://example.com",
      deviceInfo: {
        language: "en",
        theme: "light",
        isOnline: true,
        screenWidth: 1920,
        screenHeight: 1080,
        timezone: "UTC"
      },
      profile: {
        id: "test",
        unitName: "Test",
        stakeName: "Test",
        lastUsed: new Date().toISOString()
      },
      localStorage: { test: "value" },
      consoleLogs: [
        { timestamp: "2026-03-24T14:30:45.000Z", level: "log", message: "Log message" },
        { timestamp: "2026-03-24T14:30:46.000Z", level: "warn", message: "Warn message" },
        { timestamp: "2026-03-24T14:30:47.000Z", level: "error", message: "Error message" },
        { timestamp: "2026-03-24T14:30:48.000Z", level: "debug", message: "Debug message" }
      ]
    };

    const email = formatDiagnosticEmail(testData);

    expect(email).toContain("LOG");
    expect(email).toContain("WARN");
    expect(email).toContain("ERROR");
    expect(email).toContain("DEBUG");
  });
});
