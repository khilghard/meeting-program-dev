/**
 * AgendaSheetService.mjs
 *
 * Domain service for the private agenda Google Sheet.
 *
 * Sheet contract:
 *   Row 1     — header (optional; skipped if first cell is "key")
 *   Row 2+    — one row per agenda key:
 *                 Column A: key name (e.g. "agendaBusinessCallings")
 *                 Column B: pipe-separated value string
 *                           e.g. "John Smith|Elder" for a single calling entry
 *                           e.g. "Text of announcement" for a text key
 *                           Multiple entries are separated by "||"
 *                           (outer separator) when applicable.
 *
 * Sheet tabs:
 *   The `sheetName` parameter selects the sheet tab (default "Sheet1").
 *   Use a date string (e.g. "2026-05-17") to target a specific week's tab.
 *
 * Serialisation convention (shared with the CMS editor):
 *   Each `values[]` entry represents one logical row for the key.
 *   Parts within an entry are joined with "|".
 *   Multiple entries are joined with "||".
 *   e.g. callings: [["John Smith", "Elder"], ["Jane Doe", "Relief Society President"]]
 *        → "John Smith|Elder||Jane Doe|Relief Society President"
 */

import { extractSpreadsheetId } from "../utils/sheetsUrl.js";
import { DEFAULT_SHEET_TAB_NAME, toSheetRange } from "../utils/sheetRanges.js";

export class AgendaSheetService {
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
   * Write (or append) a key's values to the agenda sheet.
   * Finds the existing row for the key and updates column B.
   * If the key has no row yet, appends a new row.
   *
   * @param {string} key  — agenda key name (e.g. "agendaGeneral")
   * @param {string[][]} values  — array of entries; each entry is an array of parts
   *                              [[part1, part2], [part1, part2], ...]
  * @param {string|import("../utils/sheetRanges.js").SheetTabSelection} [sheetName]
  *   selected sheet tab or tab object (default "Sheet1")
   * @returns {Promise<void>}
   */
  async writeAgendaKey(key, values, sheetName = DEFAULT_SHEET_TAB_NAME) {
    const id = this._spreadsheetId;
    const serialized = this._serialize(values);

    const keyCol = await this._client.getValues(id, toSheetRange(sheetName, "A:A"));
    const rowIdx = this._findKeyRow(keyCol, key); // 1-based sheet row, or -1

    if (rowIdx === -1) {
      // Key not in sheet — append after last row
      const appendAt = keyCol.length + 1;
      await this._client.valueUpdate(
        id,
        toSheetRange(sheetName, `A${appendAt}:B${appendAt}`),
        [[key, serialized]]
      );
    } else {
      // Update existing row's value column only
      await this._client.valueUpdate(id, toSheetRange(sheetName, `B${rowIdx}`), [[serialized]]);
    }
  }

  /**
   * Read a key's values from the agenda sheet.
   *
   * @param {string} key  — agenda key name
    * @param {string|import("../utils/sheetRanges.js").SheetTabSelection} [sheetName]
    *   selected sheet tab or tab object (default "Sheet1")
   * @returns {Promise<string[][]>}  — array of entries (empty array if key not found)
   */
  async readAgendaKey(key, sheetName = DEFAULT_SHEET_TAB_NAME) {
    const id = this._spreadsheetId;
    const rows = await this._client.getValues(id, toSheetRange(sheetName, "A:B"));

    const dataRow = rows.slice(this._headerOffset(rows)).find(r => r[0] === key);
    if (!dataRow) return [];

    const raw = dataRow[1] ?? "";
    return raw ? this._deserialize(raw) : [];
  }

  // -------------------------------------------------------------------------
  // Serialisation helpers (exported for testing and use by CmsAgendaEditor)
  // -------------------------------------------------------------------------

  /**
   * Serialise entries array to a pipe-separated string.
   * entries: [["John Smith", "Elder"], ["Jane Doe", "RS Pres"]]
   * → "John Smith|Elder||Jane Doe|RS Pres"
   *
   * @param {string[][]} entries
   * @returns {string}
   */
  _serialize(entries) {
    return entries.map(parts => parts.join("|")).join("||");
  }

  /**
   * Deserialise a pipe string back to an entries array.
   * "John Smith|Elder||Jane Doe|RS Pres"
   * → [["John Smith", "Elder"], ["Jane Doe", "RS Pres"]]
   *
   * @param {string} raw
   * @returns {string[][]}
   */
  _deserialize(raw) {
    return raw.split("||").map(entry => entry.split("|"));
  }

  // -------------------------------------------------------------------------
  // Internal helpers
  // -------------------------------------------------------------------------

  /** Returns 1-based sheet row number for a key, or -1 if not found. */
  _findKeyRow(keyCol, key) {
    const offset = this._headerOffset(keyCol);
    for (let i = offset; i < keyCol.length; i++) {
      if ((keyCol[i][0] ?? "") === key) return i + 1; // 1-based
    }
    return -1;
  }

  /** Returns start index to skip a header row (if row 0 col 0 is "key"). */
  _headerOffset(rows) {
    return rows.length > 0 && (rows[0][0] ?? "").toLowerCase() === "key" ? 1 : 0;
  }
}
