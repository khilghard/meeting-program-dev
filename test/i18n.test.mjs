import { describe, test, expect, beforeEach, vi } from "vitest";

// Prevent init() from auto-running during tests
window.__VITEST__ = true;

// Mock i18n.js - default to 'es' (Spanish) for these tests
vi.mock("../js/i18n/index.js", () => ({
  t: vi.fn((key) => key),
  getLanguage: vi.fn(() => "es"),
  initI18n: vi.fn(() => "en"),
  setLanguage: vi.fn(),
  getSupportedLanguages: vi.fn(() => ["en", "es", "fr", "swa"])
}));

// Mock sanitize.js
vi.mock("../js/sanitize.js", () => ({
  sanitizeEntry: vi.fn((key, value) => {
    if (!key || !key.trim()) return null;
    return { key: key.trim(), value: value || "" };
  }),
  isSafeUrl: vi.fn((url) => url.startsWith("http"))
}));

// Mock qr.js
vi.mock("../js/qr.js", () => ({
  showScanner: vi.fn(),
  stopQRScanner: vi.fn()
}));

// Mock profiles.js
vi.mock("../js/profiles.js", () => ({
  getProfiles: vi.fn(() => []),
  getCurrentProfile: vi.fn(() => null),
  addProfile: vi.fn(),
  selectProfile: vi.fn(),
  removeProfile: vi.fn()
}));

// Import main.js AFTER mocks
import * as Main from "../js/main.js";

describe("CSV Multi-Language Parsing", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test("should parse standard 2-column CSV format", () => {
    const csv = `key,value
unitName,Test Ward
date,January 1 2026`;

    const result = Main.parseCSV(csv);

    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("unitName");
    expect(result[0].value).toBe("Test Ward");
  });

  test("should parse multi-language CSV and use selected language", () => {
    // With mocked getLanguage returning 'es', should use Spanish column
    const csv = `key,en,es,fr,swa
unitName,Riverview Branch,Rama Riverview,Branche Riverview,Tawi la Riverview
openingHymn,#1001 Come Thou Fount,#1001 Himno Espanol,#1001 Hymne Francais,#1001 Himno Swahili`;

    const result = Main.parseCSV(csv);

    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("unitName");
    // Should use Spanish (es) column
    expect(result[0].value).toBe("Rama Riverview");
  });

  test("should fallback to English when selected language column is empty", () => {
    // Spanish column is empty for unitName, but speaker has Spanish value
    const csv = `key,en,es,fr,swa
unitName,Riverview Branch,,,Tawi la Riverview
speaker,John Smith,Johannes Smith,,Yohana Mto`;

    const result = Main.parseCSV(csv);

    expect(result).toHaveLength(2);
    // First row: es column is empty - fallback to English
    expect(result[0].value).toBe("Riverview Branch");
    // Second row: es column has value - use Spanish
    expect(result[1].value).toBe("Johannes Smith");
  });

  test("should handle mixed format - some rows with all languages, some with only English", () => {
    const csv = `key,en,es,fr,swa
unitName,Riverview Branch,Rama Riverview,Branche Riverview,Tawi la Riverview
presiding,Brother Chad,Herman Chad,Frere Chad,Ndugu Chad
openingHymn,#1001 Come Thou Fount,,,#1001 Hymne Francais,`;

    const result = Main.parseCSV(csv);

    expect(result).toHaveLength(3);
    // First row: has es column - use Spanish
    expect(result[0].value).toBe("Rama Riverview");
    // Second row: has es column - use Spanish
    expect(result[1].value).toBe("Herman Chad");
    // Third row: no es column - fallback to English
    expect(result[2].value).toBe("#1001 Come Thou Fount");
  });
});
