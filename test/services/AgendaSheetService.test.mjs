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
  ["agendaGeneral", "gen1", "Opening prayer by Elder Brown"],
  ["agendaAnnouncements", "ann1", "Announcement one", "Announcement two"],
  [
    "agendaBusinessCallings",
    "call1",
    "John Smith|Elder",
    "Jane Doe|Relief Society President"
  ]
];

// Stub with a "key" header row
const SHEET_ROWS_WITH_HEADER = [["key", "id", "value1", "value2"], ...SHEET_ROWS_NO_HEADER];

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
    expect(client.getValues).toHaveBeenCalledWith(expect.any(String), "'May 18, 2026'!A:ZZ");
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
    expect(client.getValues).toHaveBeenCalledWith(expect.any(String), "'May 18, 2026'!A:ZZ");
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
  test("updates the matching row and preserves the linked agenda id", async () => {
    const client = makeClient({
      getValues: vi.fn(() => Promise.resolve(SHEET_ROWS_NO_HEADER))
    });
    const svc = new AgendaSheetService(client, AGENDA_URL);
    await svc.writeAgendaKey("agendaAnnouncements", [["New announcement"]], "Sheet1");

    expect(client.valueUpdate).toHaveBeenCalledTimes(1);
    const [, range, values] = client.valueUpdate.mock.calls[0];
    expect(range).toBe("Sheet1!A2:D2");
    expect(values).toEqual([["agendaAnnouncements", "ann1", "New announcement", ""]]);
  });

  test("serialises multi-part entries into separate sheet cells", async () => {
    const client = makeClient({
      getValues: vi.fn(() => Promise.resolve(SHEET_ROWS_NO_HEADER))
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
    expect(values[0]).toEqual([
      "agendaBusinessCallings",
      "call1",
      "John Smith|Elder",
      "Jane Doe|Relief Society President"
    ]);
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
      getValues: vi.fn(() => Promise.resolve(SHEET_ROWS_NO_HEADER))
    });
    const svc = new AgendaSheetService(client, AGENDA_URL);
    await svc.writeAgendaKey("agendaAnnouncements", [["New ann"]], "Sheet1");

    expect(client.valueUpdate).toHaveBeenCalledTimes(1);
    const [, range] = client.valueUpdate.mock.calls[0];
    expect(range).toBe("Sheet1!A2:D2");
  });

  test("appends after all existing rows on an empty sheet", async () => {
    const client = makeClient({
      getValues: vi.fn(() => Promise.resolve([]))
    });
    const svc = new AgendaSheetService(client, AGENDA_URL);
    await svc.writeAgendaKey("agendaGeneral", [["Hello"]], "Sheet1");

    const [, range] = client.valueUpdate.mock.calls[0];
    expect(range).toBe("Sheet1!A1:C1");
  });
});

describe("AgendaSheetService — row metadata", () => {
  test("lists matching rows with sheet row numbers and ids", async () => {
    const client = makeClient({
      getValues: vi.fn(() =>
        Promise.resolve([
          ["key", "id", "value1", "value2"],
          ["agendaAnnouncements", "ann1", "Announcement one", "Announcement two"],
          ["agendaAnnouncements", "ann2", "Follow up announcement"],
          ["agendaBusinessCallings", "call1", "John Smith|Elder"]
        ])
      )
    });
    const svc = new AgendaSheetService(client, AGENDA_URL);

    const rows = await svc.readAgendaRows("agendaAnnouncements");

    expect(rows).toEqual([
      {
        key: "agendaAnnouncements",
        agendaId: "ann1",
        values: [["Announcement one"], ["Announcement two"]],
        sheetRow: 2,
        columnCount: 4
      },
      {
        key: "agendaAnnouncements",
        agendaId: "ann2",
        values: [["Follow up announcement"]],
        sheetRow: 3,
        columnCount: 3
      }
    ]);
  });

  test("writes a specific row and clears stale trailing cells", async () => {
    const client = makeClient({
      getValues: vi.fn(() => Promise.resolve(SHEET_ROWS_NO_HEADER))
    });
    const svc = new AgendaSheetService(client, AGENDA_URL);

    await svc.writeAgendaRow(
      {
        key: "agendaAnnouncements",
        agendaId: "ann1",
        values: [["Only announcement left"]],
        sheetRow: 2
      },
      "Sheet1"
    );

    const [, range, values] = client.valueUpdate.mock.calls[0];
    expect(range).toBe("Sheet1!A2:D2");
    expect(values).toEqual([["agendaAnnouncements", "ann1", "Only announcement left", ""]]);
  });

  test("preserves existing agendaId when updating by sheet row without an agendaId", async () => {
    const client = makeClient({
      getValues: vi.fn(() => Promise.resolve(SHEET_ROWS_NO_HEADER))
    });
    const svc = new AgendaSheetService(client, AGENDA_URL);

    await svc.writeAgendaRow(
      {
        key: "agendaAnnouncements",
        agendaId: "",
        values: [["Updated announcement"]],
        sheetRow: 2
      },
      "Sheet1"
    );

    const [, range, values] = client.valueUpdate.mock.calls[0];
    expect(range).toBe("Sheet1!A2:D2");
    expect(values).toEqual([["agendaAnnouncements", "ann1", "Updated announcement", ""]]);
  });

  test("throws when duplicate non-empty agenda IDs exist in the same tab", async () => {
    const client = makeClient({
      getValues: vi.fn(() =>
        Promise.resolve([
          ["agendaGeneral", "dup1", "A"],
          ["agendaAnnouncements", "dup1", "B"]
        ])
      )
    });
    const svc = new AgendaSheetService(client, AGENDA_URL);

    await expect(svc.listAgendaRows("Sheet1")).rejects.toThrow(/Duplicate agenda IDs/);
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

  test("row entry serialisation trims trailing blank cells but preserves interior blanks", () => {
    const svc = new AgendaSheetService(makeClient(), AGENDA_URL);

    expect(svc._serializeRowEntries([["One"], [""], ["Two"], [""]])).toEqual([
      "One",
      "",
      "Two"
    ]);
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
          ["agendaGeneral", "gen1", "Original prayer"],
          ["agendaAnnouncements", "ann1", "Old announcement"]
        ])
      ),
      valueUpdate: vi.fn(() => Promise.resolve({ updatedCells: 1 }))
    });
    const svc = new AgendaSheetService(client, AGENDA_URL);
    await svc.writeAgendaKey("agendaGeneral", [["Updated prayer"]], "Sheet1");

    expect(client.valueUpdate).toHaveBeenCalledTimes(1);
    const [, range] = client.valueUpdate.mock.calls[0];
    expect(range).toBe("Sheet1!A1:C1");
  });

  test("writeAgendaKey with new key appends row", async () => {
    const client = makeClient({
      getValues: vi.fn(() => Promise.resolve([["agendaGeneral", "gen1", "Some prayer"]])),
      valueUpdate: vi.fn(() => Promise.resolve({ updatedCells: 1 }))
    });
    const svc = new AgendaSheetService(client, AGENDA_URL);
    await svc.writeAgendaKey("agendaNewKey", [["New content"]], "Sheet1");

    expect(client.valueUpdate).toHaveBeenCalledTimes(1);
    const [, range] = client.valueUpdate.mock.calls[0];
    expect(range).toBe("Sheet1!A2:C2");
  });

  test("readAgendaKey with header row returns correct data", async () => {
    const client = makeClient({
      getValues: vi.fn(() =>
        Promise.resolve([
          ["key", "id", "value1", "value2"],
          ["agendaGeneral", "gen1", "Opening prayer"],
          ["agendaAnnouncements", "ann1", "Announcement 1", "Announcement 2"]
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
  test("returns conflict when modifiedTimeSeen does not match", async () => {
    const client = makeClient({
      getSpreadsheetMeta: vi.fn(() =>
        Promise.resolve({ modifiedTime: "2026-05-16T11:00:00.000Z", name: "Agenda" })
      ),
      getValues: vi.fn(() => Promise.resolve([["agendaGeneral", "gen1", "Some value"]]))
    });
    const svc = new AgendaSheetService(client, AGENDA_URL);
    const result = await svc.writeAgendaRow(
      {
        key: "agendaGeneral",
        agendaId: "gen1",
        values: [["Updated"]],
        sheetRow: 1,
        modifiedTimeSeen: "2026-05-16T10:00:00.000Z"
      },
      "Sheet1"
    );

    expect(result.conflict).toBe(true);
    expect(client.valueUpdate).not.toHaveBeenCalled();
  });

  test("multiple writes in sequence update different keys", async () => {
    const client = makeClient({
      getValues: vi.fn(() =>
        Promise.resolve([
          ["agendaGeneral", "gen1", "Prayer"],
          ["agendaHymn", "hymn1", "Hymn 100"]
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
    expect(range1).toBe("Sheet1!A1:C1");
    expect(range2).toBe("Sheet1!A2:C2");
  });
});
