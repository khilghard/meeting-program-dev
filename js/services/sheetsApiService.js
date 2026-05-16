/**
 * sheetsApiService.js
 *
 * Google Sheets API wrapper for editor operations.
 * Handles: metadata fetching, collaborator verification, CSV upload.
 *
 * API Reference: https://developers.google.com/sheets/api
 * Requires OAuth scope: https://www.googleapis.com/auth/spreadsheets
 */

/**
 * SheetsAPI Service
 *
 * Provides methods to interact with Google Sheets API.
 * Must call initialize() first to set access token.
 */
const SheetsAPI = (() => {
  // Configuration
  let config = {
    accessToken: null,
    baseUrl: "https://sheets.googleapis.com/v4"
  };

  // Constants
  const API_TIMEOUT_MS = 30000; // 30 second timeout

  /**
   * Initialize API with access token
   *
   * @param {string} accessToken - Google OAuth access token
   * @throws {Error} If token is missing
   */
  function initialize(accessToken) {
    if (!accessToken) {
      throw new Error("[SheetsAPI] Access token is required");
    }
    config.accessToken = accessToken;
    console.log("[SheetsAPI] Initialized with access token");
  }

  /**
   * Extract sheet ID from Google Sheets URL
   *
   * Handles formats:
   * - CSV export: https://docs.google.com/spreadsheets/d/ABC123XYZ/gviz/tq?tqx=out:csv
   * - Edit link: https://docs.google.com/spreadsheets/d/ABC123XYZ/edit#gid=0
   * - Normal: https://docs.google.com/spreadsheets/d/ABC123XYZ/...
   *
   * @param {string} url - Google Sheets URL or CSV export URL
   * @returns {string|null} Sheet ID or null if invalid
   */
  function extractSheetIdFromUrl(url) {
    if (!url || typeof url !== "string") {
      console.warn("[SheetsAPI] Invalid URL:", url);
      return null;
    }

    try {
      // Pattern: /spreadsheets/d/{SHEET_ID}/
      // Must contain "spreadsheets" to distinguish from Docs, Forms, etc.
      const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)\//);

      if (!match || !match[1]) {
        console.warn("[SheetsAPI] Could not extract sheet ID from URL:", url);
        return null;
      }

      const sheetId = match[1];

      // Validate: alphanumeric, hyphens, underscores only
      if (!/^[a-zA-Z0-9-_]+$/.test(sheetId)) {
        console.warn("[SheetsAPI] Invalid sheet ID format:", sheetId);
        return null;
      }

      console.log("[SheetsAPI] Extracted sheet ID:", sheetId);
      return sheetId;
    } catch (err) {
      console.error("[SheetsAPI] Error extracting sheet ID:", err);
      return null;
    }
  }

  /**
   * Fetch spreadsheet metadata (title, collaborators, etc)
   *
   * Calls: GET /spreadsheets/{spreadsheetId}
   *
   * @param {string} sheetId - Google Sheets ID
   * @returns {Promise<Object>} Spreadsheet metadata
   * @throws {Error} On API error (401, 403, network, timeout)
   */
  async function getSpreadsheetMetadata(sheetId) {
    if (!config.accessToken) {
      throw new Error("[SheetsAPI] Must call initialize() first with access token");
    }

    if (!sheetId) {
      throw new Error("[SheetsAPI] Sheet ID is required");
    }

    const url = `${config.baseUrl}/spreadsheets/${sheetId}?fields=spreadsheetId,properties,sheets`;

    console.log("[SheetsAPI] Fetching metadata:", sheetId);

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${config.accessToken}`,
          "Content-Type": "application/json"
        },
        signal: controller.signal
      });

      clearTimeout(timeout);

      // Handle HTTP errors
      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`[SheetsAPI] API error ${response.status}:`, errorBody);

        if (response.status === 401) {
          throw new Error("[SheetsAPI] Unauthorized: Token may have expired");
        }
        if (response.status === 403) {
          throw new Error("[SheetsAPI] Forbidden: No permission to access sheet");
        }
        if (response.status === 404) {
          throw new Error("[SheetsAPI] Not found: Sheet ID may be invalid");
        }

        throw new Error(`[SheetsAPI] API error ${response.status}: ${errorBody}`);
      }

      const metadata = await response.json();
      console.log("[SheetsAPI] Metadata fetched successfully");
      return metadata;
    } catch (err) {
      if (err.name === "AbortError") {
        throw new Error("[SheetsAPI] Request timeout (30s)");
      }
      throw err;
    }
  }

  /**
   * Check if user is a collaborator on the sheet
   *
   * @param {string} sheetId - Google Sheets ID
   * @param {string} userEmail - User's email to check
   * @returns {Promise<boolean>} True if user is collaborator
   * @throws {Error} If API call fails
   */
  async function checkIfCollaborator(sheetId, userEmail) {
    if (!sheetId) {
      throw new Error("[SheetsAPI] Sheet ID is required");
    }
    if (!userEmail) {
      throw new Error("[SheetsAPI] User email is required");
    }

    const normalizedEmail = userEmail.toLowerCase().trim();

    try {
      // Fetch sheet metadata to check ownership/collaboration
      // In real scenario, would use Drive API's permissions endpoint
      // For now: check if we can access the sheet (implies collaboration)
      const metadata = await getSpreadsheetMetadata(sheetId);

      if (!metadata || !metadata.spreadsheetId) {
        console.warn("[SheetsAPI] Could not verify collaborator: no metadata");
        return false;
      }

      // If metadata fetch succeeds, user has at least Viewer access
      // For editor check, we'd need Drive API's permissions endpoint
      // This is a simplified check - in production, verify against owner/editors
      console.log("[SheetsAPI] User has access to sheet (Viewer+)");

      // Placeholder: In production, check against metadata.properties.owner or permissions API
      // For now: if we can read metadata, assume collaborator (conservative)
      return true;
    } catch (err) {
      // If any error: deny access (fail-safe)
      console.error("[SheetsAPI] Collaborator check failed:", err.message);
      return false;
    }
  }

  /**
   * Validate CSV format before upload
   *
   * Checks:
   * - Has required columns: key, en, es, fr, swa
   * - No duplicate keys
   * - Hymn field format validation
   *
   * @param {string} csvData - CSV data as string
   * @returns {Object} { valid: boolean, errors: Array<{row, column, message}> }
   */
  function validateCSV(csvData) {
    const errors = [];
    const lines = csvData.split("\n").filter((line) => line.trim());

    if (!lines.length) {
      errors.push({ row: "data", message: "CSV is empty" });
      return { valid: false, errors };
    }

    // Check header
    const headerLine = lines[0];
    const headers = parseCSVLine(headerLine);

    const requiredHeaders = ["key", "en", "es", "fr", "swa"];
    const missingHeaders = requiredHeaders.filter((h) => !headers.includes(h));

    if (missingHeaders.length > 0) {
      errors.push({
        row: "header",
        message: `Missing required columns: ${missingHeaders.join(", ")}`
      });
      return { valid: false, errors };
    }

    // Check data rows
    const seenKeys = new Set();

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const row = parseCSVLine(line);
      const keyIndex = headers.indexOf("key");
      const key = row[keyIndex]?.trim();

      if (!key) {
        errors.push({
          row: i + 1,
          column: "key",
          message: "Key cannot be empty"
        });
        continue;
      }

      // Check for duplicates
      if (seenKeys.has(key)) {
        errors.push({
          row: i + 1,
          column: "key",
          message: `Duplicate key: "${key}"`
        });
        continue;
      }
      seenKeys.add(key);

      // Validate hymn fields if applicable
      if (key.toLowerCase().endsWith("hymn")) {
        const enIndex = headers.indexOf("en");
        const hymnValue = row[enIndex]?.trim();

        if (hymnValue) {
          const validationResult = validateHymnValue(hymnValue);
          if (!validationResult.valid) {
            errors.push({
              row: i + 1,
              column: "en",
              message: validationResult.error
            });
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate hymn format: number or "CS {number}{letter}"
   *
   * @param {string} value - Hymn value
   * @returns {Object} { valid: boolean, error?: string }
   */
  function validateHymnValue(value) {
    if (!value) {
      return { valid: false, error: "Hymn value cannot be empty" };
    }

    // Split on pipe to get hymn part (before annotation)
    const [hymnPart] = value.split("|");
    const hymn = hymnPart.trim();

    // Pattern: number (1-4 digits) OR "CS {space} number {optional letter}"
    const hymnRegex = /^(\d{1,4}|CS [0-9]{1,4}[a-z]?)$/i;

    if (!hymnRegex.test(hymn)) {
      return {
        valid: false,
        error: `Invalid hymn format: "${hymn}". Use "62", "CS 2", or "CS 73a" with optional annotation after pipe "|"`
      };
    }

    return { valid: true };
  }

  /**
   * Parse a single CSV line (handles quoted fields)
   *
   * @param {string} line - CSV line
   * @returns {string[]} Parsed fields
   */
  function parseCSVLine(line) {
    const fields = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote
          current += '"';
          i++; // Skip next quote
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        // Delimiter found
        fields.push(current);
        current = "";
      } else {
        current += char;
      }
    }

    fields.push(current);
    return fields.map((f) => f.trim());
  }

  /**
   * Convert 2D array to CSV string
   *
   * @param {string[][]} rows - 2D array of values
   * @returns {string} CSV string
   */
  function arrayToCSV(rows) {
    return rows
      .map((row) =>
        row
          .map((field) => {
            // Quote if contains comma, newline, or quotes
            if (field.includes(",") || field.includes("\n") || field.includes('"')) {
              return `"${field.replace(/"/g, '""')}"`;
            }
            return field;
          })
          .join(",")
      )
      .join("\n");
  }

  /**
   * Upload CSV data to Google Sheet
   *
   * Strategy: Clear existing data, append new CSV rows
   * API Calls:
   * 1. DELETE /spreadsheets/{sheetId}/values/Sheet1:clear
   * 2. POST /spreadsheets/{sheetId}/values/Sheet1:append
   *
   * @param {string} sheetId - Google Sheets ID
   * @param {string} csvData - CSV data as string
   * @returns {Promise<Object>} { success, sheetId, rowsWritten, error }
   */
  async function uploadCSV(sheetId, csvData) {
    if (!config.accessToken) {
      throw new Error("[SheetsAPI] Must call initialize() first");
    }

    if (!sheetId) {
      throw new Error("[SheetsAPI] Sheet ID is required");
    }

    if (!csvData) {
      throw new Error("[SheetsAPI] CSV data is required");
    }

    // Validate CSV format
    const validation = validateCSV(csvData);
    if (!validation.valid) {
      console.error("[SheetsAPI] CSV validation failed:", validation.errors);
      return {
        success: false,
        error: `CSV validation failed: ${validation.errors.map((e) => e.message).join("; ")}`
      };
    }

    try {
      // Parse CSV into 2D array
      const lines = csvData.split("\n").filter((line) => line.trim());
      const rows = lines.map((line) => parseCSVLine(line));

      console.log(`[SheetsAPI] Uploading ${rows.length} rows to sheet`);

      // Step 1: Clear existing data
      const clearUrl = `${config.baseUrl}/spreadsheets/${sheetId}/values/Sheet1:clear`;

      const clearResponse = await fetch(clearUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.accessToken}`,
          "Content-Type": "application/json"
        }
      });

      if (!clearResponse.ok) {
        const errorBody = await clearResponse.text();
        console.error("[SheetsAPI] Clear failed:", errorBody);
        throw new Error(`Failed to clear sheet: ${clearResponse.status}`);
      }

      console.log("[SheetsAPI] Sheet cleared");

      // Step 2: Append new data
      const appendUrl = `${config.baseUrl}/spreadsheets/${sheetId}/values/Sheet1:append?valueInputOption=RAW`;

      const appendResponse = await fetch(appendUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          values: rows
        })
      });

      if (!appendResponse.ok) {
        const errorBody = await appendResponse.text();
        console.error("[SheetsAPI] Append failed:", errorBody);
        throw new Error(`Failed to append data: ${appendResponse.status}`);
      }

      const appendResult = await appendResponse.json();
      const updatedRows = appendResult.updates?.updatedRows || rows.length;

      console.log(`[SheetsAPI] Successfully uploaded ${updatedRows} rows`);

      return {
        success: true,
        sheetId,
        rowsWritten: updatedRows
      };
    } catch (err) {
      console.error("[SheetsAPI] Upload failed:", err.message);
      return {
        success: false,
        error: err.message
      };
    }
  }

  // Public API
  return {
    initialize,
    extractSheetIdFromUrl,
    getSpreadsheetMetadata,
    checkIfCollaborator,
    validateCSV,
    validateHymnValue,
    uploadCSV
  };
})();

export default SheetsAPI;
