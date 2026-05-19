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
import { DEFAULT_SHEET_TAB_NAME, normalizeSheetTabName, toSheetRange } from "../utils/sheetRanges.js";

const AGENDA_ROW_SCAN_RANGE = "A:ZZ";

function toColumnLetter(index) {
  let value = index + 1;
  let result = "";

  while (value > 0) {
    const remainder = (value - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    value = Math.floor((value - 1) / 26);
  }

  return result;
}

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
    const existingRow = (await this.readAgendaRows(key, sheetName))[0] ?? null;
    await this.writeAgendaRow(
      {
        key,
        agendaId: existingRow?.agendaId ?? "",
        values,
        sheetRow: existingRow?.sheetRow ?? null
      },
      sheetName
    );
  }

  /**
   * Write a specific agenda sheet row.
   *
   * @param {{key: string, agendaId?: string, values?: string[][], sheetRow?: number|null}} row
   * @param {string|import("../utils/sheetRanges.js").SheetTabSelection} [sheetName]
   * @returns {Promise<void>}
   */
  async writeAgendaRow(row, sheetName = DEFAULT_SHEET_TAB_NAME) {
    const key = String(row?.key ?? "").trim();
    if (!key) {
      throw new Error("AgendaSheetService.writeAgendaRow requires a key");
    }

    const agendaId = String(row?.agendaId ?? "").trim();
    const id = this._spreadsheetId;
    const tabTitle = normalizeSheetTabName(sheetName);
    const rawRows = await this._client.getValues(id, toSheetRange(sheetName, AGENDA_ROW_SCAN_RANGE));
    const offset = this._headerOffset(rawRows);
    const parsedRows = rawRows
      .slice(offset)
      .map((rawRow, index) => this._toAgendaRow(rawRow, offset + index + 1))
      .filter(Boolean);

    const existingRow = parsedRows.find((candidate) => {
      if (Number.isInteger(row?.sheetRow) && row.sheetRow > 0) {
        return candidate.sheetRow === row.sheetRow;
      }
      return candidate.key === key && candidate.agendaId === agendaId;
    });

    const serializedValues = this._serializeRowEntries(row?.values ?? []);
    const rowValues = [key, agendaId, ...serializedValues];

    if (existingRow) {
      const targetWidth = Math.max(existingRow.columnCount, rowValues.length);
      const paddedRow = [...rowValues, ...Array.from({ length: targetWidth - rowValues.length }, () => "")];
      const lastColumn = toColumnLetter(targetWidth - 1);
      const range = toSheetRange(sheetName, `A${existingRow.sheetRow}:${lastColumn}${existingRow.sheetRow}`);
      await this._client.valueUpdate(
        id,
        range,
        [paddedRow]
      );
      return {
        action: "update",
        key,
        agendaId,
        sheetRow: existingRow.sheetRow,
        tabTitle,
        range,
        rowValues: paddedRow
      };
    }

    const appendAt = rawRows.length + 1;
    const lastColumn = toColumnLetter(rowValues.length - 1);
    const range = toSheetRange(sheetName, `A${appendAt}:${lastColumn}${appendAt}`);
    await this._client.valueUpdate(
      id,
      range,
      [rowValues]
    );
    return {
      action: "append",
      key,
      agendaId,
      sheetRow: appendAt,
      tabTitle,
      range,
      rowValues
    };
  }

  /**
   * Read all agenda rows for a specific agenda key.
   *
   * @param {string} key
   * @param {string|import("../utils/sheetRanges.js").SheetTabSelection} [sheetName]
   * @returns {Promise<Array<{key: string, agendaId: string, values: string[][], sheetRow: number, columnCount: number}>>}
   */
  async readAgendaRows(key, sheetName = DEFAULT_SHEET_TAB_NAME) {
    const normalizedKey = String(key ?? "").trim();
    const rows = await this.listAgendaRows(sheetName);
    return rows.filter((row) => row.key === normalizedKey);
  }

  /**
   * Read all agenda sheet rows in the selected tab.
   *
   * @param {string|import("../utils/sheetRanges.js").SheetTabSelection} [sheetName]
   * @returns {Promise<Array<{key: string, agendaId: string, values: string[][], sheetRow: number, columnCount: number}>>}
   */
  async listAgendaRows(sheetName = DEFAULT_SHEET_TAB_NAME) {
    const id = this._spreadsheetId;
    const rows = await this._client.getValues(id, toSheetRange(sheetName, AGENDA_ROW_SCAN_RANGE));
    const offset = this._headerOffset(rows);

    return rows
      .slice(offset)
      .map((row, index) => this._toAgendaRow(row, offset + index + 1))
      .filter(Boolean);
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
    const rows = await this.readAgendaRows(key, sheetName);
    return rows[0]?.values ?? [];
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
    return this._serializeRowEntries(entries).join("||");
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
    return String(raw ?? "")
      .split("||")
      .filter((entry) => entry !== "")
      .map((entry) => this._deserializeCell(entry));
  }

  _serializeRowEntries(entries) {
    const normalizedEntries = Array.isArray(entries) ? entries : [];
    const rowValues = normalizedEntries.map((parts) => this._serializeEntryCell(parts));

    while (rowValues.length > 0 && rowValues[rowValues.length - 1].trim() === "") {
      rowValues.pop();
    }

    return rowValues;
  }

  _serializeEntryCell(parts) {
    const normalizedParts = Array.isArray(parts) ? parts : [parts];
    return normalizedParts.map((part) => String(part ?? "").trim()).join("|");
  }

  _deserializeCell(raw) {
    return String(raw ?? "").split("|");
  }

  _deserializeRowEntries(cells) {
    const normalizedCells = Array.isArray(cells) ? [...cells] : [];
    while (
      normalizedCells.length > 0 &&
      String(normalizedCells[normalizedCells.length - 1] ?? "").trim() === ""
    ) {
      normalizedCells.pop();
    }

    return normalizedCells.map((cell) => this._deserializeCell(cell));
  }

  _toAgendaRow(row, sheetRow) {
    const key = String(row?.[0] ?? "").trim();
    if (!key) {
      return null;
    }

    return {
      key,
      agendaId: String(row?.[1] ?? "").trim(),
      values: this._deserializeRowEntries(row?.slice(2) ?? []),
      sheetRow,
      columnCount: Math.max(Array.isArray(row) ? row.length : 0, 2)
    };
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
