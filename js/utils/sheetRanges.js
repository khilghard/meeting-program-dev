export const DEFAULT_SHEET_TAB_NAME = "Sheet1";

/**
 * @typedef {object} SheetTabSelection
 * @property {number|null} [sheetId]
 * @property {string} title
 * @property {number|null} [index]
 * @property {boolean} [isActive]
 */

export function normalizeSheetTabSelection(sheetTab = DEFAULT_SHEET_TAB_NAME) {
  if (sheetTab && typeof sheetTab === "object" && !Array.isArray(sheetTab)) {
    const title = String(sheetTab.title ?? "").trim() || DEFAULT_SHEET_TAB_NAME;
    return {
      sheetId: Number.isInteger(sheetTab.sheetId) ? sheetTab.sheetId : null,
      title,
      index: Number.isInteger(sheetTab.index) ? sheetTab.index : null,
      isActive: sheetTab.isActive === true || sheetTab.index === 0
    };
  }

  const title = String(sheetTab ?? "").trim() || DEFAULT_SHEET_TAB_NAME;
  return {
    sheetId: null,
    title,
    index: title === DEFAULT_SHEET_TAB_NAME ? 0 : null,
    isActive: title === DEFAULT_SHEET_TAB_NAME
  };
}

export function normalizeSheetTabName(sheetTab = DEFAULT_SHEET_TAB_NAME) {
  return normalizeSheetTabSelection(sheetTab).title;
}

export function toSheetRange(sheetName, range) {
  const tabName = normalizeSheetTabName(sheetName);
  if (/^[A-Za-z0-9_]+$/.test(tabName)) {
    return `${tabName}!${range}`;
  }

  return `'${tabName.replace(/'/g, "''")}'!${range}`;
}