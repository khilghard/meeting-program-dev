/**
 * ProgramSheetService.mjs
 *
 * Domain service for the meeting program Google Sheet.
 *
 * Sheet contract (per ADR-001):
 *   Row 1  — header: "key", "en", "es", "fr", "swa" (plus any custom columns)
 *   Row 2+ — data: key name in col A, locale values in subsequent named columns
 *
 * Write strategy: column-safe read-modify-write (ADR-001).
 *   - Only the target locale column is written.
 *   - All other columns (other languages, custom) are left untouched.
 *   - Concurrency conflict detected via Drive API modifiedTime (AD-13).
 */

import { extractSpreadsheetId } from "../utils/sheetsUrl.js";
import { DEFAULT_SHEET_TAB_NAME, toSheetRange } from "../utils/sheetRanges.js";

/**
 * Keys whose pipe-delimited value maps 1:1 to locale columns (en|es|fr|swa).
 * Each part is written to its respective column (B=en, C=es, D=fr, E=swa).
 * All other keys store their full pipe payload in the selected locale column only.
 */
const LOCALE_COLUMN_KEYS = new Set([
  "horizontalLine",
  "sacramentLine",
  "generalStatement"
]);

/**
 * Convert a 0-based column index to a Sheets column letter (A, B, ..., Z, AA, ...).
 * @param {number} idx
 * @returns {string}
 */
function columnIndexToLetter(idx) {
  let letter = "";
  let n = idx;
  do {
    letter = String.fromCharCode(65 + (n % 26)) + letter;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return letter;
}

export class ProgramSheetService {
  /**
   * @param {import("./SheetsApiClient.mjs").SheetsApiClient} client
   * @param {string} spreadsheetUrl  — any Google Sheets URL variant
   */
  constructor(client, spreadsheetUrl) {
    this._client = client;
    this._spreadsheetId = extractSpreadsheetId(spreadsheetUrl);
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /**
   * Read all key/value pairs for a given locale from the program sheet.
   *
   * @param {string} locale  — e.g. "en", "es", "fr", "swa"
   * @param {string|import("../utils/sheetRanges.js").SheetTabSelection} [sheetName]
   *   selected sheet tab or tab object (default "Sheet1")
   * @returns {Promise<{rows: Array<{key: string, value: string}>, modifiedTime: string}>}
   * @throws if the locale column or key column is not found in the header row
   */
   async readSheet(locale, sheetName = DEFAULT_SHEET_TAB_NAME) {
     const id = this._spreadsheetId;

     const [meta, headerRows] = await Promise.all([
       this._client.getSpreadsheetMeta(id),
       this._client.getValues(id, toSheetRange(sheetName, "1:1"))
     ]);

     const headerRow = headerRows[0] ?? [];
     const colMap = this._buildColMap(headerRow);
     const { keyColIdx, localeColIdx } = this._resolveColumns(colMap, locale);

     // Read from key through all locale columns so CMS can edit EN/ES/FR/SWA
     // values for user-translated keys in one row payload.
     const LOCALES = ["en", "es", "fr", "swa"];
     const localeColIndices = LOCALES.map((loc) => colMap[loc]).filter((idx) => idx !== undefined);
     const maxLocaleColIdx = localeColIndices.length > 0 ? Math.max(...localeColIndices) : localeColIdx;

     const keyColLetter = columnIndexToLetter(keyColIdx);
     const rangeEnd = columnIndexToLetter(Math.max(maxLocaleColIdx, localeColIdx));

     const allRows = await this._client.getValues(
       id,
       toSheetRange(sheetName, `${keyColLetter}:${rangeEnd}`)
     );

     const localeOffset = localeColIdx - keyColIdx;

     const rows = allRows
       .slice(1) // skip header
       .map((row) => {
         const key = row[0] ?? "";
         if (!key) return { key: "", value: "" };

         const normalizedKey = String(key).replace(/\d+$/, "");
         const value = LOCALE_COLUMN_KEYS.has(normalizedKey)
           ? localeColIndices.map((idx) => row[idx] ?? "").join("|")
           : row[localeOffset] ?? "";

         return { key, value };
       })
       .filter((r) => r.key);

     return { rows, modifiedTime: meta.modifiedTime };
   }

  /**
   * Write edited key/value pairs to the program sheet (column-safe, ADR-001).
   *
   * Only the target locale column is written. All other columns are preserved.
   * If modifiedTimeSeen is provided and the sheet was modified since then,
   * returns { conflict: true } without writing.
   *
   * @param {Array<{key: string, value: string}>} edits
   * @param {string} locale  — target locale column
   * @param {string|null} [modifiedTimeSeen]  — Drive modifiedTime seen at page load (AD-13)
   * @param {string|import("../utils/sheetRanges.js").SheetTabSelection} [sheetName]
   *   selected sheet tab or tab object (default "Sheet1")
   * @returns {Promise<{conflict: boolean, modifiedTime: string}>}
   * @throws if the locale column is not found in the header row
   */
  async writeSheet(edits, locale, modifiedTimeSeen = null, sheetName = DEFAULT_SHEET_TAB_NAME) {
    return this._writeSheetInternal(edits, locale, modifiedTimeSeen, sheetName, []);
  }

  /**
   * Write edited key/value pairs and delete rows from the program sheet.
   *
   * Same as writeSheet but additionally deletes rows matching keys in deletedKeys.
   *
   * @param {Array<{key: string, value: string}>} edits
   * @param {string} locale  — target locale column
   * @param {string|null} [modifiedTimeSeen]  — Drive modifiedTime seen at page load (AD-13)
   * @param {string|import("../utils/sheetRanges.js").SheetTabSelection} [sheetName]
   *   selected sheet tab or tab object (default "Sheet1")
   * @param {string[]} [deletedKeys]  — keys whose rows should be deleted from the sheet
   * @returns {Promise<{conflict: boolean, modifiedTime: string}>}
   * @throws if the locale column is not found in the header row
   */
  async writeSheetWithDeletes(
    edits,
    locale,
    modifiedTimeSeen = null,
    sheetName = DEFAULT_SHEET_TAB_NAME,
    deletedKeys = []
  ) {
    if (!deletedKeys || deletedKeys.length === 0) {
      return this.writeSheet(edits, locale, modifiedTimeSeen, sheetName);
    }
    return this._writeSheetInternal(edits, locale, modifiedTimeSeen, sheetName, deletedKeys);
  }

  async _writeSheetInternal(edits, locale, modifiedTimeSeen, sheetName, deletedKeys = []) {
    const id = this._spreadsheetId;

    // Parallel: concurrency check + header read
    const [meta, headerRows] = await Promise.all([
      this._client.getSpreadsheetMeta(id),
      this._client.getValues(id, toSheetRange(sheetName, "1:1"))
    ]);

    if (modifiedTimeSeen && meta.modifiedTime !== modifiedTimeSeen) {
      return { conflict: true, modifiedTime: meta.modifiedTime };
    }

    const headerRow = headerRows[0] ?? [];
    const colMap = this._buildColMap(headerRow);
    const { keyColIdx, localeColIdx } = this._resolveColumns(colMap, locale);

    // All locale columns in sheet order.
    const LOCALES = ["en", "es", "fr", "swa"];
    const localeColIndices = LOCALES.map((loc) => colMap[loc]).filter((idx) => idx !== undefined);
    const maxLocaleColIdx = localeColIndices.length > 0 ? Math.max(...localeColIndices) : localeColIdx;
    const rangeEnd = columnIndexToLetter(maxLocaleColIdx);
    const keyColLetter = columnIndexToLetter(keyColIdx);

    // Index of the selected locale within localeColIndices (for single-column writes).
    const selectedLocaleIdxInArray = localeColIndices.indexOf(localeColIdx);

    // Read current values so we can clear stale trailing rows.
    const allRows = await this._client.getValues(
      id,
      toSheetRange(sheetName, `${keyColLetter}:${rangeEnd}`)
    );
    const existingDataRowCount = Math.max(0, allRows.length - 1);

    const editedRows = (Array.isArray(edits) ? edits : [])
      .filter((row) => {
        const key = (row?.key ?? "").trim();
        if (!key) return false;
        if (key === "split:program" || key === "split:general") return false;
        return !deletedKeys.includes(key);
      })
      .map((row) => {
        // Normalize key (strip trailing digits e.g. leader1 → leader).
        const normalizedKey = String(row.key ?? "").replace(/\d+$/, "");
        const rawValue = String(row.value ?? "");
        let localeValues;
        if (LOCALE_COLUMN_KEYS.has(normalizedKey)) {
          // Fan out: each pipe-delimited part maps to one locale column.
          const parts = rawValue.split("|");
          localeValues = localeColIndices.map((_, i) => parts[i] ?? "");
        } else {
          // Single-locale payload: write full value to selected locale column only.
          localeValues = localeColIndices.map((_, i) =>
            i === selectedLocaleIdxInArray ? rawValue : ""
          );
        }
        return { key: row.key, localeValues };
      });

    const rowCountToWrite = Math.max(existingDataRowCount, editedRows.length);
    if (rowCountToWrite === 0) {
      return { conflict: false, modifiedTime: meta.modifiedTime };
    }

    const rowEnd = rowCountToWrite + 1; // +1 for header row
    const requests = [
      {
        range: toSheetRange(sheetName, `${keyColLetter}2:${keyColLetter}${rowEnd}`),
        values: Array.from({ length: rowCountToWrite }, (_, idx) => [editedRows[idx]?.key ?? ""])
      }
    ];

    for (let i = 0; i < localeColIndices.length; i++) {
      const colLetter = columnIndexToLetter(localeColIndices[i]);
      requests.push({
        range: toSheetRange(sheetName, `${colLetter}2:${colLetter}${rowEnd}`),
        values: Array.from({ length: rowCountToWrite }, (_, idx) => [editedRows[idx]?.localeValues[i] ?? ""])
      });
    }

    await this._client.batchUpdate(id, requests);

    return { conflict: false, modifiedTime: meta.modifiedTime };
  }

  // -------------------------------------------------------------------------
  // Internal helpers
  // -------------------------------------------------------------------------

  _buildColMap(headerRow) {
    const map = {};
    headerRow.forEach((name, idx) => {
      const trimmed = (name ?? "").trim();
      if (trimmed) map[trimmed] = idx;
    });
    return map;
  }

  _resolveColumns(colMap, locale) {
    const keyColIdx = colMap["key"] ?? 0;
    const localeColIdx = colMap[locale];
    if (localeColIdx === undefined) {
      throw new Error(
        `ProgramSheetService: column "${locale}" not found in sheet header. ` +
          `Available columns: ${Object.keys(colMap).join(", ")}`
      );
    }
    return { keyColIdx, localeColIdx };
  }
}
