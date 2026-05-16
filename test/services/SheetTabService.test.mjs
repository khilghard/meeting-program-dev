import { describe, test, expect, vi, beforeEach } from "vitest";
import { SheetTabService } from "../../js/services/SheetTabService.mjs";

const EDIT_URL = "https://docs.google.com/spreadsheets/d/TABSHEET1/edit";

function makeClient(overrides = {}) {
  return {
    getSpreadsheet: vi.fn(() => Promise.resolve({ sheets: [] })),
    spreadsheetBatchUpdate: vi.fn(() => Promise.resolve({ replies: [] })),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("SheetTabService — listTabs", () => {
  test("returns tabs sorted by index and marks the leftmost tab active", async () => {
    const client = makeClient({
      getSpreadsheet: vi.fn(() =>
        Promise.resolve({
          sheets: [
            { properties: { sheetId: 20, title: "May 25", index: 1 } },
            { properties: { sheetId: 10, title: "May 18", index: 0 } },
          ]
        })
      )
    });

    const svc = new SheetTabService(client, EDIT_URL);
    const tabs = await svc.listTabs();

    expect(client.getSpreadsheet).toHaveBeenCalledWith("TABSHEET1", "sheets.properties");
    expect(tabs).toEqual([
      { sheetId: 10, title: "May 18", index: 0, isActive: true },
      { sheetId: 20, title: "May 25", index: 1, isActive: false },
    ]);
  });

  test("returns an empty list when spreadsheet has no tabs", async () => {
    const svc = new SheetTabService(makeClient(), EDIT_URL);
    await expect(svc.listTabs()).resolves.toEqual([]);
  });
});

describe("SheetTabService — duplicateTab", () => {
  test("sends duplicateSheet request and returns the new tab metadata", async () => {
    const client = makeClient({
      spreadsheetBatchUpdate: vi.fn(() =>
        Promise.resolve({
          replies: [
            {
              duplicateSheet: {
                properties: { sheetId: 99, title: "June 1", index: 2 }
              }
            }
          ]
        })
      )
    });
    const svc = new SheetTabService(client, EDIT_URL);

    const result = await svc.duplicateTab(20, "June 1");

    expect(client.spreadsheetBatchUpdate).toHaveBeenCalledWith("TABSHEET1", [
      {
        duplicateSheet: {
          sourceSheetId: 20,
          newSheetName: "June 1"
        }
      }
    ]);
    expect(result).toEqual({ sheetId: 99, title: "June 1", index: 2, isActive: false });
  });

  test("includes insertSheetIndex when provided", async () => {
    const client = makeClient({
      spreadsheetBatchUpdate: vi.fn(() =>
        Promise.resolve({
          replies: [
            {
              duplicateSheet: {
                properties: { sheetId: 100, title: "June 8", index: 1 }
              }
            }
          ]
        })
      )
    });
    const svc = new SheetTabService(client, EDIT_URL);

    await svc.duplicateTab(20, "June 8", 1);

    expect(client.spreadsheetBatchUpdate).toHaveBeenCalledWith("TABSHEET1", [
      {
        duplicateSheet: {
          sourceSheetId: 20,
          newSheetName: "June 8",
          insertSheetIndex: 1
        }
      }
    ]);
  });
});

describe("SheetTabService — makeActiveTab", () => {
  test("sends updateSheetProperties request with index 0", async () => {
    const client = makeClient();
    const svc = new SheetTabService(client, EDIT_URL);

    await svc.makeActiveTab(20);

    expect(client.spreadsheetBatchUpdate).toHaveBeenCalledWith("TABSHEET1", [
      {
        updateSheetProperties: {
          properties: { sheetId: 20, index: 0 },
          fields: "index"
        }
      }
    ]);
  });
});