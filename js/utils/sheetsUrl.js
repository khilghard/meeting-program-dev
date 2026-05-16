/**
 * sheetsUrl.js
 * Shared Google Sheets URL utilities (browser + Node compatible).
 *
 * Single source of truth for spreadsheet ID extraction and URL conversion.
 * Used by: ProgramSheetService, AgendaSheetService, generate-qr.js
 */

const SPREADSHEET_ID_RE = /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/;

/**
 * Extract the spreadsheet ID from any Google Sheets URL variant.
 * Accepts edit URLs, CSV export URLs, and publish URLs.
 * Only accepts URLs on a google.com domain.
 *
 * @param {string} url
 * @returns {string} spreadsheetId
 * @throws {Error} if no valid ID is found or domain is not google.com
 */
export function extractSpreadsheetId(url) {
  if (typeof url !== "string" || !url) {
    throw new Error("extractSpreadsheetId: url must be a non-empty string");
  }
  let hostname;
  try {
    hostname = new URL(url).hostname;
  } catch {
    throw new Error("extractSpreadsheetId: invalid URL");
  }
  if (!hostname.endsWith(".google.com") && hostname !== "google.com") {
    throw new Error("extractSpreadsheetId: URL must be on a google.com domain");
  }
  const match = url.match(SPREADSHEET_ID_RE);
  if (!match) {
    throw new Error("extractSpreadsheetId: URL does not contain a recognizable Google Sheets spreadsheet ID");
  }
  return match[1];
}

/**
 * Convert any Google Sheets URL to a gviz CSV export URL.
 * If the URL is already a CSV export URL it is returned unchanged (preserving any embedded gid).
 *
 * @param {string} url
 * @param {object} [options]
 * @param {number|string} [options.gid] - sheet tab ID as a non-negative integer (defaults to first sheet)
 * @returns {string} CSV export URL
 * @throws {Error} if gid is provided but is not a non-negative integer
 */
export function toCsvUrl(url, { gid } = {}) {
  // Preserve pre-formed CSV export URLs (including any embedded gid param)
  if (url.includes("/gviz/tq") && url.includes("tqx=out:csv")) {
    return url;
  }
  const id = extractSpreadsheetId(url);
  const base = `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv`;
  if (gid == null) return base;
  if (typeof gid !== "number" && typeof gid !== "string") {
    throw new Error("toCsvUrl: gid must be a number or numeric string");
  }
  if (typeof gid === "string" && gid.trim() === "") {
    throw new Error("toCsvUrl: gid must be a non-negative integer");
  }
  const gidNum = Number(gid);
  if (!Number.isInteger(gidNum) || gidNum < 0) {
    throw new Error("toCsvUrl: gid must be a non-negative integer");
  }
  return `${base}&gid=${gidNum}`;
}

/**
 * Return the canonical browser-edit URL for a spreadsheet.
 *
 * @param {string} url
 * @returns {string}
 */
export function toEditUrl(url) {
  const id = extractSpreadsheetId(url);
  return `https://docs.google.com/spreadsheets/d/${id}/edit`;
}

/**
 * Return the Sheets API v4 base URL for a spreadsheet.
 * Convenience helper for SheetsApiClient.
 *
 * @param {string} url
 * @returns {string}
 */
export function toApiBaseUrl(url) {
  const id = extractSpreadsheetId(url);
  return `https://sheets.googleapis.com/v4/spreadsheets/${id}`;
}
