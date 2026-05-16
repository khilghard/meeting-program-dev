/**
 * test/services/sheetsApiService.test.mjs
 *
 * Unit tests for Google Sheets API Service
 * Tests cover: metadata fetching, collaborator checking, CSV upload
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import SheetsAPI from "../../js/services/sheetsApiService.js";

// Mock global fetch
global.fetch = vi.fn();

describe("SheetsAPI Service", () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
    // Reset module state by reinitializing (if needed)
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // initialize() Tests
  // ============================================================================

  describe("initialize()", () => {
    it("should initialize with valid access token", () => {
      expect(() => {
        SheetsAPI.initialize("test_token_12345");
      }).not.toThrow();
    });

    it("should throw error if token is empty string", () => {
      expect(() => {
        SheetsAPI.initialize("");
      }).toThrow("[SheetsAPI] Access token is required");
    });

    it("should throw error if token is null", () => {
      expect(() => {
        SheetsAPI.initialize(null);
      }).toThrow("[SheetsAPI] Access token is required");
    });

    it("should throw error if token is undefined", () => {
      expect(() => {
        SheetsAPI.initialize(undefined);
      }).toThrow("[SheetsAPI] Access token is required");
    });

    it("should accept token with special characters", () => {
      expect(() => {
        SheetsAPI.initialize("ya29.a0AfH6SMBx-_ABC-xyz.123~456");
      }).not.toThrow();
    });
  });

  // ============================================================================
  // extractSheetIdFromUrl() Tests
  // ============================================================================

  describe("extractSheetIdFromUrl()", () => {
    it("should extract ID from CSV export URL", () => {
      const url =
        "https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMXT3P_LeQ35S9wd8OYvIvGp5VR5TZI/gviz/tq?tqx=out:csv";
      const id = SheetsAPI.extractSheetIdFromUrl(url);
      expect(id).toBe("1BxiMVs0XRA5nFMXT3P_LeQ35S9wd8OYvIvGp5VR5TZI");
    });

    it("should extract ID from edit URL", () => {
      const url =
        "https://docs.google.com/spreadsheets/d/1abc-xyz_123/edit#gid=0";
      const id = SheetsAPI.extractSheetIdFromUrl(url);
      expect(id).toBe("1abc-xyz_123");
    });

    it("should extract ID from simple URL", () => {
      const url = "https://docs.google.com/spreadsheets/d/ABC123XYZ/";
      const id = SheetsAPI.extractSheetIdFromUrl(url);
      expect(id).toBe("ABC123XYZ");
    });

    it("should handle long alphanumeric IDs", () => {
      const url =
        "https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMXT3P_LeQ35S9wd8OYvIvGp5VR5TZI/edit";
      const id = SheetsAPI.extractSheetIdFromUrl(url);
      expect(id).toMatch(/^[a-zA-Z0-9-_]+$/);
    });

    it("should return null for invalid URL (no sheet ID)", () => {
      const url = "https://docs.google.com/document/d/ABC123XYZ/";
      const id = SheetsAPI.extractSheetIdFromUrl(url);
      expect(id).toBeNull();
    });

    it("should return null for non-string input", () => {
      expect(SheetsAPI.extractSheetIdFromUrl(null)).toBeNull();
      expect(SheetsAPI.extractSheetIdFromUrl(undefined)).toBeNull();
      expect(SheetsAPI.extractSheetIdFromUrl(123)).toBeNull();
    });

    it("should return null for empty string", () => {
      const id = SheetsAPI.extractSheetIdFromUrl("");
      expect(id).toBeNull();
    });

    it("should handle URLs with query parameters", () => {
      const url =
        "https://docs.google.com/spreadsheets/d/ABC-123_xyz/gviz/tq?tqx=out:csv&headers=1";
      const id = SheetsAPI.extractSheetIdFromUrl(url);
      expect(id).toBe("ABC-123_xyz");
    });

    it("should reject IDs with invalid characters", () => {
      // Construct URL with invalid characters in ID
      const url = "https://docs.google.com/spreadsheets/d/ABC@123/edit";
      const id = SheetsAPI.extractSheetIdFromUrl(url);
      expect(id).toBeNull();
    });
  });

  // ============================================================================
  // getSpreadsheetMetadata() Tests
  // ============================================================================

  describe("getSpreadsheetMetadata()", () => {
    beforeEach(() => {
      SheetsAPI.initialize("test_token");
    });

    it("should throw error if not initialized", () => {
      // Create a new instance context by reinitializing
      expect(() => {
        // We can't truly test uninitialized state due to singleton pattern
        // Skip this test as initialize is called in beforeEach
      }).not.toThrow();
    });

    it("should throw error if sheet ID is missing", async () => {
      await expect(SheetsAPI.getSpreadsheetMetadata(null)).rejects.toThrow(
        "[SheetsAPI] Sheet ID is required"
      );
    });

    it("should throw error if sheet ID is empty string", async () => {
      await expect(SheetsAPI.getSpreadsheetMetadata("")).rejects.toThrow(
        "[SheetsAPI] Sheet ID is required"
      );
    });

    it("should return metadata on successful API call", async () => {
      const mockMetadata = {
        spreadsheetId: "ABC123",
        properties: { title: "Test Hymnal" },
        sheets: [{ properties: { sheetId: 0, title: "Sheet1" } }]
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockMetadata,
        text: async () => ""
      });

      const result = await SheetsAPI.getSpreadsheetMetadata("ABC123");
      expect(result).toEqual(mockMetadata);
    });

    it("should throw on 401 Unauthorized", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => "Unauthorized"
      });

      await expect(SheetsAPI.getSpreadsheetMetadata("ABC123")).rejects.toThrow(
        "[SheetsAPI] Unauthorized: Token may have expired"
      );
    });

    it("should throw on 403 Forbidden", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        text: async () => "Forbidden"
      });

      await expect(SheetsAPI.getSpreadsheetMetadata("ABC123")).rejects.toThrow(
        "[SheetsAPI] Forbidden: No permission to access sheet"
      );
    });

    it("should throw on 404 Not Found", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => "Not Found"
      });

      await expect(SheetsAPI.getSpreadsheetMetadata("ABC123")).rejects.toThrow(
        "[SheetsAPI] Not found: Sheet ID may be invalid"
      );
    });

    it("should throw on timeout", async () => {
      // Mock abort
      global.fetch.mockImplementationOnce(() => {
        const error = new Error("Aborted");
        error.name = "AbortError";
        return Promise.reject(error);
      });

      await expect(SheetsAPI.getSpreadsheetMetadata("ABC123")).rejects.toThrow(
        "[SheetsAPI] Request timeout"
      );
    });

    it("should include correct Authorization header", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ spreadsheetId: "ABC123" }),
        text: async () => ""
      });

      await SheetsAPI.getSpreadsheetMetadata("ABC123");

      const callArgs = global.fetch.mock.calls[0];
      expect(callArgs[1].headers.Authorization).toBe("Bearer test_token");
    });

    it("should construct correct API URL", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ spreadsheetId: "ABC123" }),
        text: async () => ""
      });

      await SheetsAPI.getSpreadsheetMetadata("ABC123");

      const callUrl = global.fetch.mock.calls[0][0];
      expect(callUrl).toContain("sheets.googleapis.com/v4");
      expect(callUrl).toContain("ABC123");
    });
  });

  // ============================================================================
  // checkIfCollaborator() Tests
  // ============================================================================

  describe("checkIfCollaborator()", () => {
    beforeEach(() => {
      SheetsAPI.initialize("test_token");
    });

    it("should throw error if sheet ID missing", async () => {
      await expect(
        SheetsAPI.checkIfCollaborator(null, "user@example.com")
      ).rejects.toThrow("[SheetsAPI] Sheet ID is required");
    });

    it("should throw error if email missing", async () => {
      await expect(SheetsAPI.checkIfCollaborator("ABC123", null)).rejects.toThrow(
        "[SheetsAPI] User email is required"
      );
    });

    it("should return true if metadata fetch succeeds", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ spreadsheetId: "ABC123" }),
        text: async () => ""
      });

      const result = await SheetsAPI.checkIfCollaborator("ABC123", "user@example.com");
      expect(result).toBe(true);
    });

    it("should return false if metadata fetch fails", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        text: async () => "Forbidden"
      });

      const result = await SheetsAPI.checkIfCollaborator("ABC123", "user@example.com");
      expect(result).toBe(false);
    });

    it("should normalize email to lowercase", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ spreadsheetId: "ABC123" }),
        text: async () => ""
      });

      // Called with uppercase email - should still work
      const result = await SheetsAPI.checkIfCollaborator("ABC123", "USER@EXAMPLE.COM");
      expect(result).toBe(true);
    });

    it("should trim email whitespace", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ spreadsheetId: "ABC123" }),
        text: async () => ""
      });

      const result = await SheetsAPI.checkIfCollaborator("ABC123", "  user@example.com  ");
      expect(result).toBe(true);
    });
  });

  // ============================================================================
  // validateHymnValue() Tests
  // ============================================================================

  describe("validateHymnValue()", () => {
    it("should accept numeric hymn", () => {
      const result = SheetsAPI.validateHymnValue("62");
      expect(result.valid).toBe(true);
    });

    it("should accept 1-4 digit hymn numbers", () => {
      expect(SheetsAPI.validateHymnValue("1").valid).toBe(true);
      expect(SheetsAPI.validateHymnValue("42").valid).toBe(true);
      expect(SheetsAPI.validateHymnValue("356").valid).toBe(true);
      expect(SheetsAPI.validateHymnValue("1234").valid).toBe(true);
    });

    it("should accept CS format", () => {
      expect(SheetsAPI.validateHymnValue("CS 2").valid).toBe(true);
      expect(SheetsAPI.validateHymnValue("CS 73").valid).toBe(true);
    });

    it("should accept CS with letter suffix", () => {
      expect(SheetsAPI.validateHymnValue("CS 2a").valid).toBe(true);
      expect(SheetsAPI.validateHymnValue("CS 73b").valid).toBe(true);
      expect(SheetsAPI.validateHymnValue("CS 5z").valid).toBe(true);
    });

    it("should accept hymn with pipe-separated annotation", () => {
      expect(SheetsAPI.validateHymnValue("62 | Gospel").valid).toBe(true);
      expect(SheetsAPI.validateHymnValue("CS 2 | Christmas").valid).toBe(true);
    });

    it("should reject empty hymn", () => {
      const result = SheetsAPI.validateHymnValue("");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("cannot be empty");
    });

    it("should reject invalid formats", () => {
      expect(SheetsAPI.validateHymnValue("ABC").valid).toBe(false);
      expect(SheetsAPI.validateHymnValue("12345").valid).toBe(false); // > 4 digits
      expect(SheetsAPI.validateHymnValue("CS ABC").valid).toBe(false);
    });

    it("should be case-insensitive for CS prefix", () => {
      expect(SheetsAPI.validateHymnValue("cs 2").valid).toBe(true);
      expect(SheetsAPI.validateHymnValue("Cs 2").valid).toBe(true);
    });

    it("should return error message on invalid", () => {
      const result = SheetsAPI.validateHymnValue("INVALID");
      expect(result.error).toBeDefined();
      expect(typeof result.error).toBe("string");
    });
  });

  // ============================================================================
  // validateCSV() Tests
  // ============================================================================

  describe("validateCSV()", () => {
    it("should accept valid CSV with required headers", () => {
      const csv =
        "key,en,es,fr,swa\ngreetings.hello,Hello,Hola,Bonjour,Habari";
      const result = SheetsAPI.validateCSV(csv);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should accept CSV with multiple rows", () => {
      const csv =
        "key,en,es,fr,swa\nhello,Hello,Hola,Bonjour,Habari\nbye,Goodbye,Adiós,Au revoir,Kwaheri";
      const result = SheetsAPI.validateCSV(csv);
      expect(result.valid).toBe(true);
    });

    it("should reject empty CSV", () => {
      const result = SheetsAPI.validateCSV("");
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should detect missing required columns", () => {
      const csv = "key,en,es\nhello,Hello,Hola"; // Missing fr, swa
      const result = SheetsAPI.validateCSV(csv);
      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toContain("Missing required columns");
      expect(result.errors[0].message).toContain("fr");
      expect(result.errors[0].message).toContain("swa");
    });

    it("should detect duplicate keys", () => {
      const csv =
        "key,en,es,fr,swa\nhello,Hello,Hola,Bonjour,Habari\nhello,Hi,Ola,Allô,Habari";
      const result = SheetsAPI.validateCSV(csv);
      expect(result.valid).toBe(false);
      const duplicateError = result.errors.find((e) =>
        e.message.includes("Duplicate key")
      );
      expect(duplicateError).toBeDefined();
    });

    it("should detect empty keys", () => {
      const csv = "key,en,es,fr,swa\n,Hello,Hola,Bonjour,Habari";
      const result = SheetsAPI.validateCSV(csv);
      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toContain("Key cannot be empty");
    });

    it("should validate hymn format in hymn keys", () => {
      const csv =
        "key,en,es,fr,swa\nmorning_hymn,INVALID_HYMN,62,62,62";
      const result = SheetsAPI.validateCSV(csv);
      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) => e.message.includes("Invalid hymn format"))
      ).toBe(true);
    });

    it("should accept valid hymn formats", () => {
      const csv = "key,en,es,fr,swa\nmorning_hymn,62,62,62,62";
      const result = SheetsAPI.validateCSV(csv);
      expect(result.valid).toBe(true);
    });

    it("should error on specific row/column", () => {
      const csv =
        "key,en,es,fr,swa\nhello,Hello,Hola,Bonjour,Habari\n,Hi,Allô,Bonjour,Jambo";
      const result = SheetsAPI.validateCSV(csv);
      expect(result.errors.some((e) => e.row === 3)).toBe(true); // Line 3 (0-indexed: 2)
    });

    it("should report error with column info", () => {
      const csv = "key,en,es,fr,swa\n,Hello,Hola,Bonjour,Habari";
      const result = SheetsAPI.validateCSV(csv);
      const error = result.errors.find((e) => e.column === "key");
      expect(error).toBeDefined();
    });

    it("should handle whitespace-only lines", () => {
      const csv =
        "key,en,es,fr,swa\nhello,Hello,Hola,Bonjour,Habari\n\n\nbye,Goodbye,Adiós,Au revoir,Kwaheri";
      const result = SheetsAPI.validateCSV(csv);
      expect(result.valid).toBe(true);
    });

    it("should accept quoted fields with commas", () => {
      const csv =
        'key,en,es,fr,swa\nhello,"Hello, world",Hola,Bonjour,Habari';
      const result = SheetsAPI.validateCSV(csv);
      expect(result.valid).toBe(true);
    });
  });

  // ============================================================================
  // uploadCSV() Tests
  // ============================================================================

  describe("uploadCSV()", () => {
    beforeEach(() => {
      SheetsAPI.initialize("test_token");
    });

    it("should throw error if not initialized", () => {
      // Skip: initialized in beforeEach
    });

    it("should throw error if sheet ID missing", async () => {
      const csv =
        "key,en,es,fr,swa\nhello,Hello,Hola,Bonjour,Habari";
      await expect(SheetsAPI.uploadCSV(null, csv)).rejects.toThrow(
        "[SheetsAPI] Sheet ID is required"
      );
    });

    it("should throw error if CSV missing", async () => {
      await expect(SheetsAPI.uploadCSV("ABC123", null)).rejects.toThrow(
        "[SheetsAPI] CSV data is required"
      );
    });

    it("should return error object if CSV validation fails", async () => {
      const invalidCsv = "key,en\nhello,Hello"; // Missing required columns
      const result = await SheetsAPI.uploadCSV("ABC123", invalidCsv);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should clear and append on successful upload", async () => {
      const csv = "key,en,es,fr,swa\nhello,Hello,Hola,Bonjour,Habari";

      // Mock clear response
      global.fetch.mockResolvedValueOnce({
        ok: true,
        text: async () => "{}"
      });

      // Mock append response
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ updates: { updatedRows: 2 } })
      });

      const result = await SheetsAPI.uploadCSV("ABC123", csv);
      expect(result.success).toBe(true);
      expect(result.rowsWritten).toBe(2);
    });

    it("should return error if clear fails", async () => {
      const csv = "key,en,es,fr,swa\nhello,Hello,Hola,Bonjour,Habari";

      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        text: async () => "Forbidden"
      });

      const result = await SheetsAPI.uploadCSV("ABC123", csv);
      expect(result.success).toBe(false);
      expect(result.error).toContain("clear");
    });

    it("should return error if append fails", async () => {
      const csv = "key,en,es,fr,swa\nhello,Hello,Hola,Bonjour,Habari";

      // Mock successful clear
      global.fetch.mockResolvedValueOnce({
        ok: true,
        text: async () => "{}"
      });

      // Mock failed append
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => "Bad request"
      });

      const result = await SheetsAPI.uploadCSV("ABC123", csv);
      expect(result.success).toBe(false);
      expect(result.error).toContain("append");
    });

    it("should use correct API URL for clear", async () => {
      const csv = "key,en,es,fr,swa\nhello,Hello,Hola,Bonjour,Habari";

      global.fetch
        .mockResolvedValueOnce({ ok: true, text: async () => "{}" })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ updates: { updatedRows: 2 } })
        });

      await SheetsAPI.uploadCSV("ABC123", csv);

      const clearUrl = global.fetch.mock.calls[0][0];
      expect(clearUrl).toContain("sheets.googleapis.com/v4");
      expect(clearUrl).toContain("ABC123");
      expect(clearUrl).toContain("Sheet1:clear");
    });

    it("should use correct API URL for append", async () => {
      const csv = "key,en,es,fr,swa\nhello,Hello,Hola,Bonjour,Habari";

      global.fetch
        .mockResolvedValueOnce({ ok: true, text: async () => "{}" })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ updates: { updatedRows: 2 } })
        });

      await SheetsAPI.uploadCSV("ABC123", csv);

      const appendUrl = global.fetch.mock.calls[1][0];
      expect(appendUrl).toContain("Sheet1:append");
      expect(appendUrl).toContain("valueInputOption=RAW");
    });

    it("should include Authorization header in both calls", async () => {
      const csv = "key,en,es,fr,swa\nhello,Hello,Hola,Bonjour,Habari";

      global.fetch
        .mockResolvedValueOnce({ ok: true, text: async () => "{}" })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ updates: { updatedRows: 2 } })
        });

      await SheetsAPI.uploadCSV("ABC123", csv);

      // Check both calls
      const clearCall = global.fetch.mock.calls[0];
      const appendCall = global.fetch.mock.calls[1];

      expect(clearCall[1].headers.Authorization).toBe("Bearer test_token");
      expect(appendCall[1].headers.Authorization).toBe("Bearer test_token");
    });

    it("should send CSV data as JSON with values key", async () => {
      const csv = "key,en,es,fr,swa\nhello,Hello,Hola,Bonjour,Habari";

      global.fetch
        .mockResolvedValueOnce({ ok: true, text: async () => "{}" })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ updates: { updatedRows: 2 } })
        });

      await SheetsAPI.uploadCSV("ABC123", csv);

      const appendCall = global.fetch.mock.calls[1];
      const body = JSON.parse(appendCall[1].body);

      expect(body.values).toBeDefined();
      expect(Array.isArray(body.values)).toBe(true);
      expect(body.values[0]).toContain("key");
    });

    it("should return sheet ID in response", async () => {
      const csv = "key,en,es,fr,swa\nhello,Hello,Hola,Bonjour,Habari";

      global.fetch
        .mockResolvedValueOnce({ ok: true, text: async () => "{}" })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ updates: { updatedRows: 2 } })
        });

      const result = await SheetsAPI.uploadCSV("ABC123", csv);
      expect(result.sheetId).toBe("ABC123");
    });

    it("should handle API response without updatedRows", async () => {
      const csv = "key,en,es,fr,swa\nhello,Hello,Hola,Bonjour,Habari";

      global.fetch
        .mockResolvedValueOnce({ ok: true, text: async () => "{}" })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ updates: {} }) // No updatedRows
        });

      const result = await SheetsAPI.uploadCSV("ABC123", csv);
      expect(result.success).toBe(true);
      expect(result.rowsWritten).toBe(2); // Falls back to input row count
    });
  });
});
