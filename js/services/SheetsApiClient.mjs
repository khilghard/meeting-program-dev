/**
 * SheetsApiClient.mjs
 *
 * Low-level Google Sheets REST v4 client.
 * Handles auth token injection, AbortController timeouts, and typed HTTP errors.
 *
 * Callers: ProgramSheetService, AgendaSheetService
 *
 * OAuth scopes required:
 *   - https://www.googleapis.com/auth/spreadsheets  (getValues, valueUpdate, batchUpdate)
 *   - https://www.googleapis.com/auth/drive.metadata.readonly  (getSpreadsheetMeta)
 */

const SHEETS_BASE = "https://sheets.googleapis.com/v4/spreadsheets";
const DRIVE_BASE = "https://www.googleapis.com/drive/v3/files";
const DEFAULT_TIMEOUT_MS = 30_000;

// ---------------------------------------------------------------------------
// Typed errors
// ---------------------------------------------------------------------------

export class SheetsApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "SheetsApiError";
    this.status = status;
  }
}

export class SheetsAuthError extends SheetsApiError {
  constructor() {
    super("Google Sheets: not authorized (403) — access token may be expired", 403);
    this.name = "SheetsAuthError";
  }
}

export class SheetsRateLimitError extends SheetsApiError {
  constructor() {
    super("Google Sheets: quota exceeded (429) — retry after a moment", 429);
    this.name = "SheetsRateLimitError";
  }
}

export class SheetsTimeoutError extends SheetsApiError {
  constructor() {
    super("Google Sheets: request timed out", 0);
    this.name = "SheetsTimeoutError";
  }
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

export class SheetsApiClient {
  /**
   * @param {() => string|Promise<string>} getToken  — returns a valid OAuth access token
   * @param {object} [options]
   * @param {number} [options.timeoutMs]  — per-request timeout in ms (default 30 000)
   */
  constructor(getToken, { timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
    if (typeof getToken !== "function") {
      throw new Error("SheetsApiClient: getToken must be a function");
    }
    this._getToken = getToken;
    this._timeoutMs = timeoutMs;
  }

  // -------------------------------------------------------------------------
  // Internal
  // -------------------------------------------------------------------------

  async _fetch(url, options = {}) {
    const token = await this._getToken();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this._timeoutMs);

    const isWrite = options.method && options.method !== "GET";
    const headers = {
      Authorization: `Bearer ${token}`,
      ...(isWrite ? { "Content-Type": "application/json" } : {}),
      ...(options.headers ?? {})
    };

    let response;
    try {
      response = await fetch(url, { ...options, signal: controller.signal, headers });
    } catch (err) {
      if (err.name === "AbortError") throw new SheetsTimeoutError();
      throw err;
    } finally {
      clearTimeout(timer);
    }

    if (response.status === 403) throw new SheetsAuthError();
    if (response.status === 429) throw new SheetsRateLimitError();
    if (!response.ok) {
      throw new SheetsApiError(
        `Google Sheets API error ${response.status}`,
        response.status
      );
    }
    return response.json();
  }

  // -------------------------------------------------------------------------
  // Sheets API v4
  // -------------------------------------------------------------------------

  /**
   * Read cell values for a range.
   *
   * @param {string} spreadsheetId
   * @param {string} range  — e.g. "Sheet1!A:C" or "Sheet1!1:1"
   * @returns {Promise<string[][]>}  — 2-D array; empty array if range is empty
   */
  async getValues(spreadsheetId, range) {
    const url = `${SHEETS_BASE}/${spreadsheetId}/values/${encodeURIComponent(range)}`;
    const data = await this._fetch(url);
    return data.values ?? [];
  }

  /**
   * Write values to a single range (PUT).
   *
   * @param {string} spreadsheetId
   * @param {string} range  — e.g. "Sheet1!B2:B20"
   * @param {string[][]} values  — 2-D array matching the range dimensions
   * @returns {Promise<object>}  — Sheets API UpdateValuesResponse
   */
  async valueUpdate(spreadsheetId, range, values) {
    const url =
      `${SHEETS_BASE}/${spreadsheetId}/values/${encodeURIComponent(range)}` +
      `?valueInputOption=USER_ENTERED`;
    return this._fetch(url, {
      method: "PUT",
      body: JSON.stringify({ range, values })
    });
  }

  /**
   * Write values to multiple ranges in one request (POST).
   *
   * @param {string} spreadsheetId
   * @param {Array<{range: string, values: string[][]}>} data  — range+values pairs
   * @returns {Promise<object>}  — Sheets API BatchUpdateValuesResponse
   */
  async batchUpdate(spreadsheetId, data) {
    const url = `${SHEETS_BASE}/${spreadsheetId}/values:batchUpdate`;
    return this._fetch(url, {
      method: "POST",
      body: JSON.stringify({ valueInputOption: "USER_ENTERED", data })
    });
  }

  /**
   * Read spreadsheet-level metadata from the Sheets API.
   * Used for sheet tab listing and other structural operations.
   *
   * @param {string} spreadsheetId
   * @param {string} [fields]  — partial response selector, e.g. "sheets.properties"
   * @returns {Promise<object>}  — Sheets API Spreadsheet resource (partial if fields supplied)
   */
  async getSpreadsheet(spreadsheetId, fields = "") {
    const fieldQuery = fields ? `?fields=${encodeURIComponent(fields)}` : "";
    const url = `${SHEETS_BASE}/${spreadsheetId}${fieldQuery}`;
    return this._fetch(url);
  }

  /**
   * Spreadsheet-level structural update (not values).
   * Used for tab duplication, reordering, and renaming.
   *
   * @param {string} spreadsheetId
   * @param {object[]} requests  — Sheets API Request objects
   * @returns {Promise<object>}  — BatchUpdateSpreadsheetResponse
   */
  async spreadsheetBatchUpdate(spreadsheetId, requests) {
    const url = `${SHEETS_BASE}/${spreadsheetId}:batchUpdate`;
    return this._fetch(url, {
      method: "POST",
      body: JSON.stringify({ requests })
    });
  }

  // -------------------------------------------------------------------------
  // Drive API v3 — requires drive.metadata.readonly scope
  // -------------------------------------------------------------------------

  /**
   * Fetch spreadsheet metadata (modifiedTime, name) from Drive API.
   * Used for concurrency conflict detection (AD-13).
   *
   * @param {string} spreadsheetId
   * @returns {Promise<{modifiedTime: string, name: string}>}
   */
  async getSpreadsheetMeta(spreadsheetId) {
    const url = `${DRIVE_BASE}/${spreadsheetId}?fields=modifiedTime%2Cname`;
    return this._fetch(url);
  }
}
