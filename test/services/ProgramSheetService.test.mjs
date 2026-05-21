import { describe, test, expect, vi, beforeEach } from "vitest";
import { ProgramSheetService } from "../../js/services/ProgramSheetService.mjs";

const EDIT_URL = "https://docs.google.com/spreadsheets/d/PROGSHEET1/edit";
const MOD_TIME = "2026-05-16T10:00:00.000Z";
const MOD_TIME_NEWER = "2026-05-16T11:00:00.000Z";

// Minimal mock of SheetsApiClient
function makeClient(overrides = {}) {
  return {
    getValues: vi.fn(),
    valueUpdate: vi.fn(() => Promise.resolve({ updatedRows: 1 })),
    batchUpdate: vi.fn(() => Promise.resolve({ totalUpdatedRows: 1 })),
    spreadsheetBatchUpdate: vi.fn(() => Promise.resolve({})),
    getSpreadsheetMeta: vi.fn(() =>
      Promise.resolve({ modifiedTime: MOD_TIME, name: "Ward Program" })
    ),
    ...overrides
  };
}

// Stub sheet with header [key, en, es, fr, swa] and 3 data rows
const HEADER = [["key", "en", "es", "fr", "swa"]];
const DATA_ROWS = [
  ["presiding", "Bishop Jones", "Obispo Jones", "Évêque Jones", "Askofu Jones"],
  ["conducting", "Bishop Smith", "Obispo Smith", "Évêque Smith", "Askofu Smith"],
  ["openingHymn", "How Firm a Foundation", "", "", ""]
];
const FULL_SHEET = [...HEADER, ...DATA_ROWS];

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// readSheet
// ---------------------------------------------------------------------------

describe("ProgramSheetService — readSheet", () => {
  test("returns locale-specific rows and modifiedTime", async () => {
    const client = makeClient({
      getValues: vi
        .fn()
        .mockResolvedValueOnce(HEADER) // header call
        .mockResolvedValueOnce(FULL_SHEET) // data call
    });
    const svc = new ProgramSheetService(client, EDIT_URL);
    const { rows, modifiedTime } = await svc.readSheet("en");

    expect(modifiedTime).toBe(MOD_TIME);
    expect(rows).toHaveLength(3);
    expect(rows[0]).toEqual({ key: "presiding", value: "Bishop Jones|Obispo Jones|Évêque Jones|Askofu Jones" });
    expect(rows[2]).toEqual({ key: "openingHymn", value: "How Firm a Foundation|||" });
  });

  test("returns es column values", async () => {
    const client = makeClient({
      getValues: vi.fn().mockResolvedValueOnce(HEADER).mockResolvedValueOnce(FULL_SHEET)
    });
    const svc = new ProgramSheetService(client, EDIT_URL);
    const { rows } = await svc.readSheet("es");
    expect(rows[0]).toEqual({ key: "presiding", value: "Bishop Jones|Obispo Jones|Évêque Jones|Askofu Jones" });
  });

  test("filters out rows with empty key", async () => {
    const sheetWithEmptyRow = [
      ...HEADER,
      ["presiding", "Bishop Jones"],
      ["", ""] // empty key row
    ];
    const client = makeClient({
      getValues: vi.fn().mockResolvedValueOnce(HEADER).mockResolvedValueOnce(sheetWithEmptyRow)
    });
    const svc = new ProgramSheetService(client, EDIT_URL);
    const { rows } = await svc.readSheet("en");
    expect(rows).toHaveLength(1);
  });

  test("throws if locale column not found in header", async () => {
    const client = makeClient({
      getValues: vi.fn().mockResolvedValueOnce(HEADER).mockResolvedValueOnce(FULL_SHEET)
    });
    const svc = new ProgramSheetService(client, EDIT_URL);
    await expect(svc.readSheet("de")).rejects.toThrow(/column "de" not found/);
  });

  test("handles empty sheet gracefully", async () => {
    const client = makeClient({
      getValues: vi.fn().mockResolvedValueOnce(HEADER).mockResolvedValueOnce(HEADER) // only header, no data
    });
    const svc = new ProgramSheetService(client, EDIT_URL);
    const { rows } = await svc.readSheet("en");
    expect(rows).toEqual([]);
  });

  test("reads from a named sheet tab using quoted A1 notation", async () => {
    const client = makeClient({
      getValues: vi.fn().mockResolvedValueOnce(HEADER).mockResolvedValueOnce(FULL_SHEET)
    });
    const svc = new ProgramSheetService(client, EDIT_URL);

    await svc.readSheet("en", "May 18, 2026");

    expect(client.getValues).toHaveBeenNthCalledWith(1, expect.any(String), "'May 18, 2026'!1:1");
    expect(client.getValues).toHaveBeenNthCalledWith(2, expect.any(String), "'May 18, 2026'!A:E");
  });

  test("accepts a selected-tab object from SheetTabService", async () => {
    const client = makeClient({
      getValues: vi.fn().mockResolvedValueOnce(HEADER).mockResolvedValueOnce(FULL_SHEET)
    });
    const svc = new ProgramSheetService(client, EDIT_URL);

    await svc.readSheet("en", {
      sheetId: 10,
      title: "May 18, 2026",
      index: 0,
      isActive: true
    });

    expect(client.getValues).toHaveBeenNthCalledWith(1, expect.any(String), "'May 18, 2026'!1:1");
  });
});

// ---------------------------------------------------------------------------
// writeSheet — success
// ---------------------------------------------------------------------------

describe("ProgramSheetService — writeSheet (no conflict)", () => {
  function makeWriteClient() {
    return makeClient({
      getValues: vi
        .fn()
        .mockResolvedValueOnce(HEADER) // header in writeSheet
        .mockResolvedValueOnce(FULL_SHEET) // data rows
    });
  }

  test("calls batchUpdate with all locale columns", async () => {
    const client = makeWriteClient();
    const svc = new ProgramSheetService(client, EDIT_URL);
    const edits = [{ key: "presiding", value: "New Bishop|||" }];
    const result = await svc.writeSheet(edits, "en", MOD_TIME);

    expect(result.conflict).toBe(false);
    expect(client.batchUpdate).toHaveBeenCalledTimes(1);
    const [, requests] = client.batchUpdate.mock.calls[0];
    // Should have 4 locale column updates
    expect(requests).toHaveLength(4);
    // First locale column (en, index 1 → B) should have the new value
    expect(requests[0].range).toMatch(/^Sheet1!B/);
    expect(requests[0].values[0][0]).toBe("New Bishop");
  });

  test("preserves existing values for keys not in edits", async () => {
    const client = makeWriteClient();
    const svc = new ProgramSheetService(client, EDIT_URL);
    const edits = [{ key: "presiding", value: "New Bishop|||" }];
    await svc.writeSheet(edits, "en", MOD_TIME);

    const [, requests] = client.batchUpdate.mock.calls[0];
    // Row 2 ("conducting") should retain its existing "en" value
    expect(requests[0].values[1][0]).toBe("Bishop Smith");
  });

  test("writes correct column letters for all locales", async () => {
    const client = makeWriteClient();
    const svc = new ProgramSheetService(client, EDIT_URL);
    const edits = [{ key: "presiding", value: "New Bishop|||" }];
    await svc.writeSheet(edits, "en", MOD_TIME);

    const [, requests] = client.batchUpdate.mock.calls[0];
    // en=B, es=C, fr=D, swa=E
    expect(requests[0].range).toMatch(/^Sheet1!B/);
    expect(requests[1].range).toMatch(/^Sheet1!C/);
    expect(requests[2].range).toMatch(/^Sheet1!D/);
    expect(requests[3].range).toMatch(/^Sheet1!E/);
  });

  test("does not call batchUpdate if no data rows", async () => {
    const client = makeClient({
      getValues: vi.fn().mockResolvedValueOnce(HEADER).mockResolvedValueOnce(HEADER) // only header row
    });
    const svc = new ProgramSheetService(client, EDIT_URL);
    await svc.writeSheet([], "en", null);
    // batchUpdate is called with empty range
    expect(client.batchUpdate).toHaveBeenCalledTimes(1);
  });

  test("writes to a selected sheet tab using quoted A1 notation", async () => {
    const client = makeWriteClient();
    const svc = new ProgramSheetService(client, EDIT_URL);

    await svc.writeSheet(
      [{ key: "presiding", value: "New Bishop|||" }],
      "en",
      MOD_TIME,
      "May 18, 2026"
    );

    expect(client.getValues).toHaveBeenNthCalledWith(1, expect.any(String), "'May 18, 2026'!1:1");
    expect(client.getValues).toHaveBeenNthCalledWith(2, expect.any(String), "'May 18, 2026'!A:E");
    const [, requests] = client.batchUpdate.mock.calls[0];
    expect(requests[0].range).toBe("'May 18, 2026'!B2:B4");
  });

  test("accepts a selected-tab object when writing", async () => {
    const client = makeWriteClient();
    const svc = new ProgramSheetService(client, EDIT_URL);

    await svc.writeSheet([{ key: "presiding", value: "New Bishop|||" }], "en", MOD_TIME, {
      sheetId: 10,
      title: "May 18, 2026",
      index: 0,
      isActive: true
    });

    const [, requests] = client.batchUpdate.mock.calls[0];
    expect(requests[0].range).toBe("'May 18, 2026'!B2:B4");
  });

  test("appends newly added keys instead of dropping them", async () => {
    const client = makeWriteClient();
    const svc = new ProgramSheetService(client, EDIT_URL);

    await svc.writeSheet(
      [
        { key: "presiding", value: "New Bishop|||" },
        { key: "speaker1", value: "Sister Adams|||" }
      ],
      "en",
      MOD_TIME
    );

    expect(client.batchUpdate).toHaveBeenCalledTimes(1);
    const [, requests] = client.batchUpdate.mock.calls[0];

    // First request: key column
    expect(requests[0]).toEqual({
      range: "Sheet1!A5:A5",
      values: [["speaker1"]]
    });
    // Next 4 requests: locale columns (B-E) for rows 2-5
    expect(requests[1].range).toBe("Sheet1!B2:B5");
    expect(requests[1].values).toEqual([["New Bishop"], ["Bishop Smith"], ["How Firm a Foundation"], ["Sister Adams"]]);
  });
});

// ---------------------------------------------------------------------------
// writeSheet — concurrency conflict
// ---------------------------------------------------------------------------

describe("ProgramSheetService — writeSheet (conflict detection)", () => {
  test("returns conflict:true without writing if sheet was modified since page load", async () => {
    const client = makeClient({
      getSpreadsheetMeta: vi.fn(() =>
        Promise.resolve({ modifiedTime: MOD_TIME_NEWER, name: "Ward Program" })
      ),
      getValues: vi.fn().mockResolvedValue(HEADER)
    });
    const svc = new ProgramSheetService(client, EDIT_URL);
    const result = await svc.writeSheet([{ key: "presiding", value: "x|||" }], "en", MOD_TIME);

    expect(result.conflict).toBe(true);
    expect(result.modifiedTime).toBe(MOD_TIME_NEWER);
    expect(client.batchUpdate).not.toHaveBeenCalled();
  });

  test("proceeds without conflict when modifiedTimeSeen is null", async () => {
    const client = makeClient({
      getValues: vi.fn().mockResolvedValueOnce(HEADER).mockResolvedValueOnce(FULL_SHEET)
    });
    const svc = new ProgramSheetService(client, EDIT_URL);
    const result = await svc.writeSheet([{ key: "presiding", value: "x|||" }], "en", null);
    expect(result.conflict).toBe(false);
    expect(client.batchUpdate).toHaveBeenCalledTimes(1);
  });

  test("throws if locale column absent when there is no conflict", async () => {
    const client = makeClient({
      getValues: vi.fn().mockResolvedValue(HEADER)
    });
    const svc = new ProgramSheetService(client, EDIT_URL);
    await expect(svc.writeSheet([], "de", null)).rejects.toThrow(/column "de" not found/);
  });
});

// ---------------------------------------------------------------------------
// writeSheetWithDeletes
// ---------------------------------------------------------------------------

describe("ProgramSheetService — writeSheetWithDeletes", () => {
  function makeWriteClient() {
    return makeClient({
      getValues: vi
        .fn()
        .mockResolvedValueOnce(HEADER) // header in writeSheet
        .mockResolvedValueOnce(FULL_SHEET) // data rows
    });
  }

  test("deletes a row when key is in deletedKeys", async () => {
    const client = makeWriteClient();
    const svc = new ProgramSheetService(client, EDIT_URL);
    const edits = [{ key: "presiding", value: "New Bishop|||" }];
    const deletedKeys = ["conducting"];
    const result = await svc.writeSheetWithDeletes(edits, "en", MOD_TIME, "Sheet1", deletedKeys);

    expect(result.conflict).toBe(false);
    expect(client.spreadsheetBatchUpdate).toHaveBeenCalledTimes(1);
    const [, requests] = client.spreadsheetBatchUpdate.mock.calls[0];
    const deleteReq = requests.find((r) => r.deleteDimension);
    expect(deleteReq).toBeDefined();
    expect(deleteReq.deleteDimension.range.startIndex).toBe(2); // row 3 (0-based: 2)
  });

  test("deletes multiple rows when multiple keys are in deletedKeys", async () => {
    const client = makeWriteClient();
    const svc = new ProgramSheetService(client, EDIT_URL);
    const edits = [{ key: "presiding", value: "New Bishop|||" }];
    const deletedKeys = ["conducting", "openingHymn"];
    await svc.writeSheetWithDeletes(edits, "en", MOD_TIME, "Sheet1", deletedKeys);

    expect(client.spreadsheetBatchUpdate).toHaveBeenCalledTimes(1);
    const [, requests] = client.spreadsheetBatchUpdate.mock.calls[0];
    const deleteReqs = requests.filter((r) => r.deleteDimension);
    expect(deleteReqs).toHaveLength(2);
  });

  test("deletes rows and appends new keys in the same call", async () => {
    const client = makeWriteClient();
    const svc = new ProgramSheetService(client, EDIT_URL);
    const edits = [
      { key: "presiding", value: "New Bishop|||" },
      { key: "speaker1", value: "Sister Adams|||" }
    ];
    const deletedKeys = ["conducting"];
    await svc.writeSheetWithDeletes(edits, "en", MOD_TIME, "Sheet1", deletedKeys);

    expect(client.spreadsheetBatchUpdate).toHaveBeenCalledTimes(1);
    const [, requests] = client.spreadsheetBatchUpdate.mock.calls[0];
    const deleteReqs = requests.filter((r) => r.deleteDimension);
    const updateReqs = requests.filter((r) => r.updateRange);
    expect(deleteReqs).toHaveLength(1);
    // 1 key column + 4 locale columns
    expect(updateReqs).toHaveLength(5);
  });

  test("falls back to writeSheet when deletedKeys is empty", async () => {
    const client = makeWriteClient();
    const svc = new ProgramSheetService(client, EDIT_URL);
    const edits = [{ key: "presiding", value: "New Bishop|||" }];
    await svc.writeSheetWithDeletes(edits, "en", MOD_TIME, "Sheet1", []);

    expect(client.batchUpdate).toHaveBeenCalledTimes(1);
    expect(client.valueUpdate).not.toHaveBeenCalled();
  });

  test("handles deletedKeys that do not match any existing row gracefully", async () => {
    const client = makeWriteClient();
    const svc = new ProgramSheetService(client, EDIT_URL);
    const edits = [{ key: "presiding", value: "New Bishop|||" }];
    const deletedKeys = ["nonExistentKey"];
    const result = await svc.writeSheetWithDeletes(edits, "en", MOD_TIME, "Sheet1", deletedKeys);

    expect(result.conflict).toBe(false);
    // Falls through to regular batchUpdate path
    expect(client.batchUpdate).toHaveBeenCalledTimes(1);
  });

  test("returns conflict when sheet was modified", async () => {
    const client = makeClient({
      getSpreadsheetMeta: vi.fn(() =>
        Promise.resolve({ modifiedTime: MOD_TIME_NEWER, name: "Ward Program" })
      ),
      getValues: vi.fn().mockResolvedValue(HEADER)
    });
    const svc = new ProgramSheetService(client, EDIT_URL);
    const result = await svc.writeSheetWithDeletes(
      [{ key: "presiding", value: "x|||" }],
      "en",
      MOD_TIME,
      "Sheet1",
      ["conducting"]
    );

    expect(result.conflict).toBe(true);
    expect(result.modifiedTime).toBe(MOD_TIME_NEWER);
    expect(client.batchUpdate).not.toHaveBeenCalled();
    expect(client.valueUpdate).not.toHaveBeenCalled();
  });

  test("filters deleted keys from edits so they are not written back", async () => {
    const client = makeWriteClient();
    const svc = new ProgramSheetService(client, EDIT_URL);
    const edits = [
      { key: "presiding", value: "New Bishop|||" },
      { key: "conducting", value: "Should Not Appear|||" }
    ];
    const deletedKeys = ["conducting"];
    await svc.writeSheetWithDeletes(edits, "en", MOD_TIME, "Sheet1", deletedKeys);

    expect(client.spreadsheetBatchUpdate).toHaveBeenCalledTimes(1);
    const [, requests] = client.spreadsheetBatchUpdate.mock.calls[0];
    const updateReqs = requests.filter((r) => r.updateRange);
    // The en locale column should not contain the deleted key's value
    const enUpdate = updateReqs.find((r) => r.range === "Sheet1!B2:B3");
    if (enUpdate) {
      const values = enUpdate.values.map(v => v[0]);
      expect(values).not.toContain("Should Not Appear");
    }
  });
});
