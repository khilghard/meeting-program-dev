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

    const keyColLetter = columnIndexToLetter(keyColIdx);
    const localeColLetter = columnIndexToLetter(localeColIdx);

    // Read from key column through locale column in one request
    const maxColIdx = Math.max(keyColIdx, localeColIdx);
    const rangeEnd = columnIndexToLetter(maxColIdx);
    const allRows = await this._client.getValues(
      id,
      toSheetRange(sheetName, `${keyColLetter}:${rangeEnd}`)
    );

    const span = localeColIdx - keyColIdx;
    const rows = allRows
      .slice(1) // skip header
      .map(row => ({ key: row[0] ?? "", value: row[span] ?? "" }))
      .filter(r => r.key);

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

    const keyColLetter = columnIndexToLetter(keyColIdx);
    const localeColLetter = columnIndexToLetter(localeColIdx);
    const maxColIdx = Math.max(keyColIdx, localeColIdx);
    const rangeEnd = columnIndexToLetter(maxColIdx);

    // Read current values (key column through locale column)
    const allRows = await this._client.getValues(
      id,
      toSheetRange(sheetName, `${keyColLetter}:${rangeEnd}`)
    );
    const dataRows = allRows.slice(1); // skip header

    const editMap = Object.fromEntries(edits.map(({ key, value }) => [key, value]));
    const span = localeColIdx - keyColIdx;

    // Merge edits over existing values; only build the locale column
    const newLocaleValues = dataRows.map(row => {
      const key = row[0] ?? "";
      const existing = row[span] ?? "";
      return [Object.hasOwn(editMap, key) ? editMap[key] : existing];
    });

    const rowCount = dataRows.length + 1; // +1 for header row
    await this._client.valueUpdate(
      id,
      toSheetRange(sheetName, `${localeColLetter}2:${localeColLetter}${rowCount}`),
      newLocaleValues
    );

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
