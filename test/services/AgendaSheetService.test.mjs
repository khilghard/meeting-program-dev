import { describe, test, expect, vi, beforeEach } from "vitest";
import { AgendaSheetService } from "../../js/services/AgendaSheetService.mjs";

const AGENDA_URL = "https://docs.google.com/spreadsheets/d/AGENDASHEET1/edit";

// Minimal mock SheetsApiClient
function makeClient(overrides = {}) {
  return {
    getValues: vi.fn(),
    valueUpdate: vi.fn(() => Promise.resolve({ updatedRows: 1 })),
    batchUpdate: vi.fn(() => Promise.resolve({})),
    getSpreadsheetMeta: vi.fn(() =>
      Promise.resolve({ modifiedTime: "2026-05-16T10:00:00.000Z", name: "Agenda" })
    ),
    ...overrides
  };
}

// Stub agenda sheet — no header row (first cell is NOT "key")
const SHEET_ROWS_NO_HEADER = [
  ["agendaGeneral", "Opening prayer by Elder Brown"],
  ["agendaAnnouncements", "Announcement one||Announcement two"],
  ["agendaBusinessCallings", "John Smith|Elder||Jane Doe|Relief Society President"]
];

// Stub with a "key" header row
const SHEET_ROWS_WITH_HEADER = [["key", "value"], ...SHEET_ROWS_NO_HEADER];

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// readAgendaKey
// ---------------------------------------------------------------------------

describe("AgendaSheetService — readAgendaKey", () => {
  test("returns deserialized single-entry value", async () => {
    const client = makeClient({
      getValues: vi.fn(() => Promise.resolve(SHEET_ROWS_NO_HEADER))
    });
    const svc = new AgendaSheetService(client, AGENDA_URL);
    const result = await svc.readAgendaKey("agendaGeneral");
    expect(result).toEqual([["Opening prayer by Elder Brown"]]);
  });

  test("returns deserialized multi-entry value (pipe-separated entries)", async () => {
    const client = makeClient({
      getValues: vi.fn(() => Promise.resolve(SHEET_ROWS_NO_HEADER))
    });
    const svc = new AgendaSheetService(client, AGENDA_URL);
    const result = await svc.readAgendaKey("agendaBusinessCallings");
    expect(result).toEqual([
      ["John Smith", "Elder"],
      ["Jane Doe", "Relief Society President"]
    ]);
  });

  test("returns empty array when key not found", async () => {
    const client = makeClient({
      getValues: vi.fn(() => Promise.resolve(SHEET_ROWS_NO_HEADER))
    });
    const svc = new AgendaSheetService(client, AGENDA_URL);
    const result = await svc.readAgendaKey("agendaBusinessStake");
    expect(result).toEqual([]);
  });

  test("skips header row when first cell is 'key'", async () => {
    const client = makeClient({
      getValues: vi.fn(() => Promise.resolve(SHEET_ROWS_WITH_HEADER))
    });
    const svc = new AgendaSheetService(client, AGENDA_URL);
    const result = await svc.readAgendaKey("agendaGeneral");
    expect(result).toEqual([["Opening prayer by Elder Brown"]]);
  });

  test("reads from named sheet tab", async () => {
    const client = makeClient({
      getValues: vi.fn(() => Promise.resolve(SHEET_ROWS_NO_HEADER))
    });
    const svc = new AgendaSheetService(client, AGENDA_URL);
    await svc.readAgendaKey("agendaGeneral", "May 18, 2026");
    expect(client.getValues).toHaveBeenCalledWith(expect.any(String), "'May 18, 2026'!A:B");
  });

  test("accepts a selected-tab object from SheetTabService", async () => {
    const client = makeClient({
      getValues: vi.fn(() => Promise.resolve(SHEET_ROWS_NO_HEADER))
    });
    const svc = new AgendaSheetService(client, AGENDA_URL);
    await svc.readAgendaKey("agendaGeneral", {
      sheetId: 10,
      title: "May 18, 2026",
      index: 0,
      isActive: true
    });
    expect(client.getValues).toHaveBeenCalledWith(expect.any(String), "'May 18, 2026'!A:B");
  });

  test("returns empty array when value cell is empty", async () => {
    const client = makeClient({
      getValues: vi.fn(() =>
        Promise.resolve([
          ["agendaGeneral", ""],
          ["agendaAnnouncements", "Ann"]
        ])
      )
    });
    const svc = new AgendaSheetService(client, AGENDA_URL);
    const result = await svc.readAgendaKey("agendaGeneral");
    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// writeAgendaKey — update existing row
// ---------------------------------------------------------------------------

describe("AgendaSheetService — writeAgendaKey (update existing)", () => {
  test("updates only column B of the matching row", async () => {
    const client = makeClient({
      getValues: vi.fn(() => Promise.resolve([["agendaGeneral"], ["agendaAnnouncements"]]))
    });
    const svc = new AgendaSheetService(client, AGENDA_URL);
    await svc.writeAgendaKey("agendaAnnouncements", [["New announcement"]], "Sheet1");

    expect(client.valueUpdate).toHaveBeenCalledTimes(1);
    const [, range, values] = client.valueUpdate.mock.calls[0];
    // Row 2 in the sheet (index 1 in the array + 1 for 1-based = row 2)
    expect(range).toBe("Sheet1!B2");
    expect(values).toEqual([["New announcement"]]);
  });

  test("serialises multi-part entries with pipe separators", async () => {
    const client = makeClient({
      getValues: vi.fn(() => Promise.resolve([["agendaBusinessCallings"]]))
    });
    const svc = new AgendaSheetService(client, AGENDA_URL);
    await svc.writeAgendaKey(
      "agendaBusinessCallings",
      [
        ["John Smith", "Elder"],
        ["Jane Doe", "Relief Society President"]
      ],
      "Sheet1"
    );

    const [, , values] = client.valueUpdate.mock.calls[0];
    expect(values[0][0]).toBe("John Smith|Elder||Jane Doe|Relief Society President");
  });

  test("uses named sheet tab in range", async () => {
    const client = makeClient({
      getValues: vi.fn(() => Promise.resolve([["agendaGeneral"]]))
    });
    const svc = new AgendaSheetService(client, AGENDA_URL);
    await svc.writeAgendaKey("agendaGeneral", [["Test"]], "May 18, 2026");

    const [, range] = client.valueUpdate.mock.calls[0];
    expect(range).toContain("'May 18, 2026'!");
  });

  test("accepts a selected-tab object when writing", async () => {
    const client = makeClient({
      getValues: vi.fn(() => Promise.resolve([["agendaGeneral"]]))
    });
    const svc = new AgendaSheetService(client, AGENDA_URL);
    await svc.writeAgendaKey("agendaGeneral", [["Test"]], {
      sheetId: 10,
      title: "May 18, 2026",
      index: 0,
      isActive: true
    });

    const [, range] = client.valueUpdate.mock.calls[0];
    expect(range).toContain("'May 18, 2026'!");
  });
});

// ---------------------------------------------------------------------------
// writeAgendaKey — append new row
// ---------------------------------------------------------------------------

describe("AgendaSheetService — writeAgendaKey (append new key)", () => {
  test("appends key+value row when key not found in sheet", async () => {
    const client = makeClient({
      getValues: vi.fn(() => Promise.resolve([["agendaGeneral", "Some value"]]))
    });
    const svc = new AgendaSheetService(client, AGENDA_URL);
    await svc.writeAgendaKey("agendaAnnouncements", [["New ann"]], "Sheet1");

    expect(client.valueUpdate).toHaveBeenCalledTimes(1);
    const [, range, values] = client.valueUpdate.mock.calls[0];
    // Sheet has 1 row, so append at row 2
    expect(range).toBe("Sheet1!A2:B2");
    expect(values).toEqual([["agendaAnnouncements", "New ann"]]);
  });

  test("appends after all existing rows on an empty sheet", async () => {
    const client = makeClient({
      getValues: vi.fn(() => Promise.resolve([]))
    });
    const svc = new AgendaSheetService(client, AGENDA_URL);
    await svc.writeAgendaKey("agendaGeneral", [["Hello"]], "Sheet1");

    const [, range] = client.valueUpdate.mock.calls[0];
    expect(range).toBe("Sheet1!A1:B1");
  });
});

// ---------------------------------------------------------------------------
// Serialisation round-trips
// ---------------------------------------------------------------------------

describe("AgendaSheetService — serialisation", () => {
  test("serialize → deserialize round-trip preserves data", () => {
    const svc = new AgendaSheetService(makeClient(), AGENDA_URL);
    const original = [
      ["John Smith", "Elder"],
      ["Jane Doe", "RS Pres"]
    ];
    const serialized = svc._serialize(original);
    const restored = svc._deserialize(serialized);
    expect(restored).toEqual(original);
  });

  test("single-entry single-part round-trip", () => {
    const svc = new AgendaSheetService(makeClient(), AGENDA_URL);
    const original = [["Simple text value"]];
    expect(svc._deserialize(svc._serialize(original))).toEqual(original);
  });
});

// ---------------------------------------------------------------------------
// OilLamp integration — writeAgendaKey with deletion
// ---------------------------------------------------------------------------

describe("AgendaSheetService — oilLamp integration", () => {
  test("writeAgendaKey replaces value and does not create duplicate row", async () => {
    const client = makeClient({
      getValues: vi.fn(() =>
        Promise.resolve([
          ["agendaGeneral", "Original prayer"],
          ["agendaAnnouncements", "Old announcement"]
        ])
      ),
      valueUpdate: vi.fn(() => Promise.resolve({ updatedCells: 1 }))
    });
    const svc = new AgendaSheetService(client, AGENDA_URL);
    await svc.writeAgendaKey("agendaGeneral", [["Updated prayer"]], "Sheet1");

    expect(client.valueUpdate).toHaveBeenCalledTimes(1);
    const [, range] = client.valueUpdate.mock.calls[0];
    // Row 1 in array → sheet row 1 (no header offset)
    expect(range).toBe("Sheet1!B1");
  });

  test("writeAgendaKey with new key appends row", async () => {
    const client = makeClient({
      getValues: vi.fn(() => Promise.resolve([["agendaGeneral", "Some prayer"]])),
      valueUpdate: vi.fn(() => Promise.resolve({ updatedCells: 1 }))
    });
    const svc = new AgendaSheetService(client, AGENDA_URL);
    await svc.writeAgendaKey("agendaNewKey", [["New content"]], "Sheet1");

    expect(client.valueUpdate).toHaveBeenCalledTimes(1);
    const [, range] = client.valueUpdate.mock.calls[0];
    expect(range).toBe("Sheet1!A2:B2");
  });

  test("readAgendaKey with header row returns correct data", async () => {
    const client = makeClient({
      getValues: vi.fn(() =>
        Promise.resolve([
          ["key", "value"],
          ["agendaGeneral", "Opening prayer"],
          ["agendaAnnouncements", "Announcement 1||Announcement 2"]
        ])
      )
    });
    const svc = new AgendaSheetService(client, AGENDA_URL);
    const result = await svc.readAgendaKey("agendaAnnouncements");
    expect(result).toEqual([["Announcement 1"], ["Announcement 2"]]);
  });
});

// ---------------------------------------------------------------------------
// Conflict-retry + deletion integration
// ---------------------------------------------------------------------------

describe("AgendaSheetService — conflict detection", () => {
  test("does not have built-in conflict detection (relies on Sheets API)", async () => {
    const client = makeClient({
      getValues: vi.fn(() => Promise.resolve([["agendaGeneral", "Some value"]]))
    });
    const svc = new AgendaSheetService(client, AGENDA_URL);
    // Should not throw — write is optimistic
    await svc.writeAgendaKey("agendaGeneral", [["Updated"]], "Sheet1");
    expect(client.valueUpdate).toHaveBeenCalledTimes(1);
  });

  test("multiple writes in sequence update different keys", async () => {
    const client = makeClient({
      getValues: vi.fn(() =>
        Promise.resolve([
          ["agendaGeneral", "Prayer"],
          ["agendaHymn", "Hymn 100"]
        ])
      ),
      valueUpdate: vi.fn(() => Promise.resolve({ updatedCells: 1 }))
    });
    const svc = new AgendaSheetService(client, AGENDA_URL);
    await svc.writeAgendaKey("agendaGeneral", [["New prayer"]], "Sheet1");
    await svc.writeAgendaKey("agendaHymn", [["Hymn 101"]], "Sheet1");

    expect(client.valueUpdate).toHaveBeenCalledTimes(2);
    const [, range1] = client.valueUpdate.mock.calls[0];
    const [, range2] = client.valueUpdate.mock.calls[1];
    // Row 0 → sheet row 1, Row 1 → sheet row 2
    expect(range1).toBe("Sheet1!B1");
    expect(range2).toBe("Sheet1!B2");
  });
});
