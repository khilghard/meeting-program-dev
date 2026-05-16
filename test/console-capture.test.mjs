/**
 * Console Capture Tests
 * Tests the console capture utility functionality
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import {
  initConsoleCapture,
  getConsoleLogs,
  clearConsoleLogs,
  getConsoleLogCount
} from "../js/utils/console-capture.js";

describe("Console Capture Module", () => {
  beforeEach(() => {
    clearConsoleLogs();
    // Re-initialize to set up the intercepts
    initConsoleCapture();
  });

  afterEach(() => {
    clearConsoleLogs();
  });

  test("captures console.log messages", () => {
    console.log("Test message");
    const logs = getConsoleLogs();

    expect(logs.length).toBeGreaterThan(0);
    const testLog = logs.find((log) => log.message.includes("Test message"));
    expect(testLog).toBeDefined();
    expect(testLog.level).toBe("log");
  });

  test("captures console.warn messages", () => {
    console.warn("Warning message");
    const logs = getConsoleLogs();

    const warnLog = logs.find((log) => log.message.includes("Warning message"));
    expect(warnLog).toBeDefined();
    expect(warnLog.level).toBe("warn");
  });

  test("captures console.error messages", () => {
    console.error("Error message");
    const logs = getConsoleLogs();

    const errorLog = logs.find((log) => log.message.includes("Error message"));
    expect(errorLog).toBeDefined();
    expect(errorLog.level).toBe("error");
  });

  test("captures console.debug messages", () => {
    console.debug("Debug message");
    const logs = getConsoleLogs();

    const debugLog = logs.find((log) => log.message.includes("Debug message"));
    expect(debugLog).toBeDefined();
    expect(debugLog.level).toBe("debug");
  });

  test("includes timestamp in captured logs", () => {
    console.log("Timestamped message");
    const logs = getConsoleLogs();

    const log = logs.find((l) => l.message.includes("Timestamped message"));
    expect(log.timestamp).toBeDefined();
    expect(log.timestamp).toMatch(/\d{4}-\d{2}-\d{2}T/);
  });

  test("captures objects as JSON strings", () => {
    const obj = { key: "value", nested: { prop: 123 } };
    console.log(obj);
    const logs = getConsoleLogs();

    const objLog = logs.find((log) => log.message.includes("key"));
    expect(objLog).toBeDefined();
    expect(objLog.message).toMatch(/value/);
  });

  test("captures multiple console calls in order", () => {
    console.log("First");
    console.log("Second");
    console.log("Third");
    const logs = getConsoleLogs();

    const messages = logs.map((l) => l.message);
    const firstIndex = messages.findIndex((m) => m.includes("First"));
    const secondIndex = messages.findIndex((m) => m.includes("Second"));
    const thirdIndex = messages.findIndex((m) => m.includes("Third"));

    expect(firstIndex).toBeLessThan(secondIndex);
    expect(secondIndex).toBeLessThan(thirdIndex);
  });

  test("getConsoleLogCount returns a number", () => {
    clearConsoleLogs();
    console.log("Message 1");
    console.log("Message 2");

    const count = getConsoleLogCount();
    expect(typeof count).toBe("number");
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test("clearConsoleLogs removes all logs", () => {
    console.log("Message to clear");
    expect(getConsoleLogCount()).toBeGreaterThan(0);

    clearConsoleLogs();
    expect(getConsoleLogCount()).toBe(0);
  });

  test("handles mixed argument types", () => {
    console.log("String", 123, true, { obj: "val" }, null);
    const logs = getConsoleLogs();

    const mixedLog = logs.find((log) => log.message.includes("String"));
    expect(mixedLog).toBeDefined();
    expect(mixedLog.message).toMatch(/String.*123.*true/);
  });

  test("limits console logs to maximum buffer size", () => {
    // Clear and re-initialize
    clearConsoleLogs();

    // Log more than 500 messages
    for (let i = 0; i < 600; i++) {
      console.log(`Message ${i}`);
    }

    const count = getConsoleLogCount();
    expect(count).toBeLessThanOrEqual(500);
    expect(count).toBeGreaterThan(0);
  });

  test("maintains circular buffer behavior", () => {
    clearConsoleLogs();

    // Log exactly 500 messages
    for (let i = 0; i < 500; i++) {
      console.log(`Early ${i}`);
    }

    // Add one more, should remove first
    console.log("Late 500");

    const logs = getConsoleLogs();
    expect(logs.length).toBe(500);

    // First "Early 0" should be gone
    const hasEarlyZero = logs.some((log) => log.message.includes("Early 0"));
    expect(hasEarlyZero).toBe(false);

    // "Late 500" should be present
    const hasLate = logs.some((log) => log.message.includes("Late 500"));
    expect(hasLate).toBe(true);
  });
});
