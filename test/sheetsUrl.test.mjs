import { describe, test, expect } from "vitest";
import {
  extractSpreadsheetId,
  toCsvUrl,
  toEditUrl,
  toApiBaseUrl,
} from "../js/utils/sheetsUrl.js";

const EDIT_URL =
  "https://docs.google.com/spreadsheets/d/ABC123xyz-_/edit#gid=0";
const CSV_URL =
  "https://docs.google.com/spreadsheets/d/ABC123xyz-_/gviz/tq?tqx=out:csv";
const PUBLISH_URL =
  "https://docs.google.com/spreadsheets/d/ABC123xyz-_/pub?output=csv";
const ID = "ABC123xyz-_";

describe("extractSpreadsheetId", () => {
  test("extracts ID from edit URL", () => {
    expect(extractSpreadsheetId(EDIT_URL)).toBe(ID);
  });

  test("extracts ID from CSV export URL", () => {
    expect(extractSpreadsheetId(CSV_URL)).toBe(ID);
  });

  test("extracts ID from publish URL", () => {
    expect(extractSpreadsheetId(PUBLISH_URL)).toBe(ID);
  });

  test("throws on empty string", () => {
    expect(() => extractSpreadsheetId("")).toThrow();
  });

  test("throws on non-Sheets URL", () => {
    expect(() => extractSpreadsheetId("https://example.com/foo")).toThrow();
  });

  test("throws on non-Google domain URL that looks like Sheets", () => {
    expect(() =>
      extractSpreadsheetId("https://evil.example.com/spreadsheets/d/ABC123/edit")
    ).toThrow(/google\.com domain/);
  });

  test("throws on non-string input", () => {
    expect(() => extractSpreadsheetId(null)).toThrow();
  });
});

describe("toCsvUrl", () => {
  test("converts edit URL to CSV export URL", () => {
    expect(toCsvUrl(EDIT_URL)).toBe(
      `https://docs.google.com/spreadsheets/d/${ID}/gviz/tq?tqx=out:csv`
    );
  });

  test("appends gid when provided", () => {
    const url = toCsvUrl(EDIT_URL, { gid: 123456 });
    expect(url).toContain("gid=123456");
  });

  test("gid=0 (first sheet, falsy value) is preserved correctly", () => {
    const url = toCsvUrl(EDIT_URL, { gid: 0 });
    expect(url).toContain("gid=0");
  });

  test("does not append gid=undefined", () => {
    expect(toCsvUrl(EDIT_URL)).not.toContain("gid=");
  });

  test("throws on non-numeric gid", () => {
    expect(() => toCsvUrl(EDIT_URL, { gid: "abc" })).toThrow(/non-negative integer/);
  });

  test("throws on gid with injection characters", () => {
    expect(() => toCsvUrl(EDIT_URL, { gid: "0&tqx=out:json" })).toThrow(/non-negative integer/);
  });

  test("throws on empty string gid", () => {
    expect(() => toCsvUrl(EDIT_URL, { gid: "" })).toThrow(/non-negative integer/);
  });

  test("throws on object gid", () => {
    expect(() => toCsvUrl(EDIT_URL, { gid: {} })).toThrow(/number or numeric string/);
  });

  test("pre-formed CSV URL with gid is returned unchanged", () => {
    const csvWithGid = `https://docs.google.com/spreadsheets/d/${ID}/gviz/tq?tqx=out:csv&gid=99999`;
    expect(toCsvUrl(csvWithGid)).toBe(csvWithGid);
  });
});

describe("toEditUrl", () => {
  test("returns canonical edit URL", () => {
    expect(toEditUrl(CSV_URL)).toBe(
      `https://docs.google.com/spreadsheets/d/${ID}/edit`
    );
  });
});

describe("toApiBaseUrl", () => {
  test("returns Sheets API v4 base URL", () => {
    expect(toApiBaseUrl(EDIT_URL)).toBe(
      `https://sheets.googleapis.com/v4/spreadsheets/${ID}`
    );
  });
});
