/**
 * SheetTabService.mjs
 *
 * Domain service for spreadsheet tab management.
 * Supports listing tabs, duplicating a tab, and moving a tab to the front.
 */

import { extractSpreadsheetId } from "../utils/sheetsUrl.js";

function normalizeTab(properties = {}) {
  return {
    sheetId: properties.sheetId,
    title: properties.title,
    index: properties.index,
    isActive: properties.index === 0
  };
}

function requireSheetId(sheetId) {
  if (!Number.isInteger(sheetId) || sheetId < 0) {
    throw new Error("SheetTabService: sheetId must be a non-negative integer");
  }
}

function requireSheetTitle(title) {
  if (!title || typeof title !== "string" || !title.trim()) {
    throw new Error("SheetTabService: newTitle must be a non-empty string");
  }
}

export class SheetTabService {
  /**
   * @param {import("./SheetsApiClient.mjs").SheetsApiClient} client
   * @param {string} spreadsheetUrl  — any Google Sheets URL variant
   */
  constructor(client, spreadsheetUrl) {
    this._client = client;
    this._spreadsheetId = extractSpreadsheetId(spreadsheetUrl);
  }

  /**
   * List all sheet tabs sorted by tab index.
   *
   * @returns {Promise<Array<{sheetId: number, title: string, index: number, isActive: boolean}>>}
   */
  async listTabs() {
    const data = await this._client.getSpreadsheet(this._spreadsheetId, "sheets.properties");
    const tabs = (data.sheets ?? [])
      .map(sheet => normalizeTab(sheet.properties))
      .filter(tab => Number.isInteger(tab.sheetId) && typeof tab.title === "string")
      .sort((left, right) => left.index - right.index);
    return tabs;
  }

  /**
   * Duplicate a sheet tab and return the new tab metadata.
   *
   * @param {number} sourceSheetId
   * @param {string} newTitle
   * @param {number|null} [insertSheetIndex]
   * @returns {Promise<{sheetId: number, title: string, index: number, isActive: boolean}>}
   */
  async duplicateTab(sourceSheetId, newTitle, insertSheetIndex = null) {
    requireSheetId(sourceSheetId);
    requireSheetTitle(newTitle);

    const duplicateSheet = {
      sourceSheetId,
      newSheetName: newTitle.trim()
    };

    if (insertSheetIndex !== null) {
      if (!Number.isInteger(insertSheetIndex) || insertSheetIndex < 0) {
        throw new Error("SheetTabService: insertSheetIndex must be a non-negative integer");
      }
      duplicateSheet.insertSheetIndex = insertSheetIndex;
    }

    const response = await this._client.spreadsheetBatchUpdate(this._spreadsheetId, [
      { duplicateSheet }
    ]);

    const properties = response.replies?.[0]?.duplicateSheet?.properties;
    if (!properties) {
      throw new Error("SheetTabService: duplicateTab response missing duplicated sheet metadata");
    }

    return normalizeTab(properties);
  }

  /**
   * Move a tab to index 0 so it becomes the leftmost (active/default) tab.
   *
   * @param {number} sheetId
   * @returns {Promise<void>}
   */
  async makeActiveTab(sheetId) {
    requireSheetId(sheetId);
    await this._client.spreadsheetBatchUpdate(this._spreadsheetId, [
      {
        updateSheetProperties: {
          properties: { sheetId, index: 0 },
          fields: "index"
        }
      }
    ]);
  }
}