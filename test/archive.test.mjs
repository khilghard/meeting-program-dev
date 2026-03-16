/**
 * archive.test.mjs
 * Unit tests for archive.js
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { JSDOM } from "jsdom";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("archive.js - Exported Helper Functions", () => {
  let escapeHtml, extractMetadataFromRow, extractSpeakers, extractProgramInfo;

  beforeEach(async () => {
    const module = await import("../js/archive.js");
    escapeHtml = module.escapeHtml;
    extractMetadataFromRow = module.extractMetadataFromRow;
    extractSpeakers = module.extractSpeakers;
    extractProgramInfo = module.extractProgramInfo;
  });

  describe("escapeHtml", () => {
    test("should escape ampersand", () => {
      expect(escapeHtml("A & B")).toBe("A &amp; B");
    });

    test("should escape less than", () => {
      expect(escapeHtml("<script>")).toBe("&lt;script&gt;");
    });

    test("should escape greater than", () => {
      expect(escapeHtml("a > b")).toBe("a &gt; b");
    });

    test("should escape double quotes", () => {
      expect(escapeHtml('He said "Hello"')).toBe("He said &quot;Hello&quot;");
    });

    test("should escape single quotes", () => {
      expect(escapeHtml("It's")).toBe("It&#039;s");
    });

    test("should escape multiple special characters", () => {
      expect(escapeHtml('<script>alert("XSS")</script>')).toBe(
        "&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;"
      );
    });

    test("should handle empty string", () => {
      expect(escapeHtml("")).toBe("");
    });

    test("should handle null", () => {
      expect(escapeHtml(null)).toBe("");
    });

    test("should handle undefined", () => {
      expect(escapeHtml(undefined)).toBe("");
    });
  });

  describe("extractMetadataFromRow", () => {
    test("should extract presiding metadata", () => {
      const info = {};
      extractMetadataFromRow({ key: "presiding", value: "Elder Smith" }, info);
      expect(info.presiding).toBe("Elder Smith");
    });

    test("should extract conducting metadata", () => {
      const info = {};
      extractMetadataFromRow({ key: "conducting", value: "Brother Jones" }, info);
      expect(info.conducting).toBe("Brother Jones");
    });

    test("should extract programDate metadata", () => {
      const info = {};
      extractMetadataFromRow({ key: "programDate", value: "2024-01-15" }, info);
      expect(info.programDate).toBe("2024-01-15");
    });

    test("should extract unitName metadata", () => {
      const info = {};
      extractMetadataFromRow({ key: "unitName", value: "Salem Ward" }, info);
      expect(info.unitName).toBe("Salem Ward");
    });

    test("should not extract unknown keys", () => {
      const info = {};
      extractMetadataFromRow({ key: "unknown", value: "value" }, info);
      expect(info.unknown).toBeUndefined();
    });

    test("should not extract rows with empty values", () => {
      const info = {};
      extractMetadataFromRow({ key: "presiding", value: "" }, info);
      expect(info.presiding).toBeUndefined();
    });
  });

  describe("extractSpeakers", () => {
    test("should extract all speakers", () => {
      const csvData = [
        { key: "speaker", value: "Elder Smith" },
        { key: "speaker", value: "Elder Jones" },
        { key: "speaker", value: "Elder Brown" }
      ];
      const speakers = extractSpeakers(csvData);
      expect(speakers).toEqual(["Elder Smith", "Elder Jones", "Elder Brown"]);
    });

    test("should skip empty speaker values", () => {
      const csvData = [
        { key: "speaker", value: "" },
        { key: "speaker", value: "Elder Smith" }
      ];
      const speakers = extractSpeakers(csvData);
      expect(speakers).toEqual(["Elder Smith"]);
    });

    test("should skip rows with empty values", () => {
      const csvData = [
        { key: "speaker", value: "" },
        { key: "speaker", value: "Elder Smith" }
      ];
      const speakers = extractSpeakers(csvData);
      expect(speakers).toEqual(["Elder Smith"]);
    });

    test("should return empty array for empty input", () => {
      const speakers = extractSpeakers([]);
      expect(speakers).toEqual([]);
    });
  });

  describe("extractProgramInfo", () => {
    test("should extract all program metadata and speakers", () => {
      const csvData = [
        { key: "presiding", value: "Elder Smith" },
        { key: "conducting", value: "Brother Jones" },
        { key: "programDate", value: "2024-01-15" },
        { key: "unitName", value: "Salem Ward" },
        { key: "speaker", value: "Speaker 1" },
        { key: "speaker", value: "Speaker 2" }
      ];
      const info = extractProgramInfo(csvData);
      expect(info.presiding).toBe("Elder Smith");
      expect(info.conducting).toBe("Brother Jones");
      expect(info.programDate).toBe("2024-01-15");
      expect(info.unitName).toBe("Salem Ward");
      expect(info.speakers).toEqual(["Speaker 1", "Speaker 2"]);
    });

    test("should return empty object for null input", () => {
      const info = extractProgramInfo(null);
      expect(info).toEqual({});
    });

    test("should return empty object for undefined input", () => {
      const info = extractProgramInfo(undefined);
      expect(info).toEqual({});
    });

    test("should return empty object for empty array", () => {
      const info = extractProgramInfo([]);
      expect(info).toEqual({});
    });

    test("should handle data without speakers", () => {
      const csvData = [
        { key: "presiding", value: "Elder Smith" },
        { key: "conducting", value: "Brother Jones" }
      ];
      const info = extractProgramInfo(csvData);
      expect(info.presiding).toBe("Elder Smith");
      expect(info.conducting).toBe("Brother Jones");
      expect(info.speakers).toBeUndefined();
    });
  });
});
