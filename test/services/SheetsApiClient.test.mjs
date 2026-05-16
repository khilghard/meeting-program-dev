import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import {
  SheetsApiClient,
  SheetsAuthError,
  SheetsRateLimitError,
  SheetsTimeoutError,
  SheetsApiError,
} from "../../js/services/SheetsApiClient.mjs";

const FAKE_TOKEN = "ya29.test_access_token";
const SHEET_ID = "ABC123spreadsheetId";

function makeClient(token = FAKE_TOKEN, opts = {}) {
  return new SheetsApiClient(() => token, opts);
}

function mockFetchJson(body, status = 200) {
  global.fetch = vi.fn(() =>
    Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(body),
    })
  );
}

function mockFetchStatus(status) {
  global.fetch = vi.fn(() =>
    Promise.resolve({
      ok: false,
      status,
      json: () => Promise.resolve({ error: { code: status } }),
    })
  );
}

function mockFetchNetworkError(err) {
  global.fetch = vi.fn(() => Promise.reject(err));
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Constructor
// ---------------------------------------------------------------------------

describe("SheetsApiClient — constructor", () => {
  test("throws if getToken is not a function", () => {
    expect(() => new SheetsApiClient("not-a-function")).toThrow(/getToken must be a function/);
  });

  test("accepts a getToken function", () => {
    expect(() => makeClient()).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// getValues
// ---------------------------------------------------------------------------

describe("SheetsApiClient — getValues", () => {
  test("returns values array on success", async () => {
    mockFetchJson({ values: [["key", "en"], ["presiding", "Bishop Jones"]] });
    const client = makeClient();
    const result = await client.getValues(SHEET_ID, "Sheet1!1:1");
    expect(result).toEqual([["key", "en"], ["presiding", "Bishop Jones"]]);
  });

  test("returns empty array when values field is absent", async () => {
    mockFetchJson({});
    const client = makeClient();
    const result = await client.getValues(SHEET_ID, "Sheet1!A:A");
    expect(result).toEqual([]);
  });

  test("encodes the range in the URL", async () => {
    mockFetchJson({ values: [] });
    const client = makeClient();
    await client.getValues(SHEET_ID, "Sheet1!A:B");
    const url = global.fetch.mock.calls[0][0];
    expect(url).toContain(encodeURIComponent("Sheet1!A:B"));
  });

  test("injects Authorization header", async () => {
    mockFetchJson({ values: [] });
    const client = makeClient("my-token");
    await client.getValues(SHEET_ID, "A:A");
    const headers = global.fetch.mock.calls[0][1].headers;
    expect(headers.Authorization).toBe("Bearer my-token");
  });

  test("throws SheetsAuthError on 403", async () => {
    mockFetchStatus(403);
    const client = makeClient();
    await expect(client.getValues(SHEET_ID, "A:A")).rejects.toThrow(SheetsAuthError);
  });

  test("throws SheetsRateLimitError on 429", async () => {
    mockFetchStatus(429);
    const client = makeClient();
    await expect(client.getValues(SHEET_ID, "A:A")).rejects.toThrow(SheetsRateLimitError);
  });

  test("throws SheetsApiError on other non-ok status", async () => {
    mockFetchStatus(500);
    const client = makeClient();
    await expect(client.getValues(SHEET_ID, "A:A")).rejects.toThrow(SheetsApiError);
  });

  test("throws SheetsTimeoutError when AbortController fires", async () => {
    global.fetch = vi.fn(
      () =>
        new Promise((_, reject) => {
          // Simulate abort
          const err = new Error("The user aborted a request.");
          err.name = "AbortError";
          setTimeout(() => reject(err), 5);
        })
    );
    const client = new SheetsApiClient(() => FAKE_TOKEN, { timeoutMs: 1 });
    await expect(client.getValues(SHEET_ID, "A:A")).rejects.toThrow(SheetsTimeoutError);
  });
});

// ---------------------------------------------------------------------------
// valueUpdate
// ---------------------------------------------------------------------------

describe("SheetsApiClient — valueUpdate", () => {
  test("sends PUT with correct URL and body", async () => {
    mockFetchJson({ updatedRange: "Sheet1!B2:B5", updatedRows: 4 });
    const client = makeClient();
    const values = [["v1"], ["v2"]];
    await client.valueUpdate(SHEET_ID, "Sheet1!B2:B3", values);

    const [url, opts] = global.fetch.mock.calls[0];
    expect(opts.method).toBe("PUT");
    expect(url).toContain("valueInputOption=USER_ENTERED");
    const body = JSON.parse(opts.body);
    expect(body.range).toBe("Sheet1!B2:B3");
    expect(body.values).toEqual(values);
  });

  test("throws SheetsAuthError on 403", async () => {
    mockFetchStatus(403);
    const client = makeClient();
    await expect(client.valueUpdate(SHEET_ID, "Sheet1!B2", [["x"]])).rejects.toThrow(
      SheetsAuthError
    );
  });
});

// ---------------------------------------------------------------------------
// batchUpdate
// ---------------------------------------------------------------------------

describe("SheetsApiClient — batchUpdate", () => {
  test("sends POST with data array", async () => {
    mockFetchJson({ totalUpdatedRows: 2 });
    const client = makeClient();
    const data = [
      { range: "Sheet1!A2:A3", values: [["k1"], ["k2"]] },
      { range: "Sheet1!C2:C3", values: [["v1"], ["v2"]] },
    ];
    await client.batchUpdate(SHEET_ID, data);

    const [url, opts] = global.fetch.mock.calls[0];
    expect(opts.method).toBe("POST");
    expect(url).toContain("values:batchUpdate");
    const body = JSON.parse(opts.body);
    expect(body.valueInputOption).toBe("USER_ENTERED");
    expect(body.data).toEqual(data);
  });
});

// ---------------------------------------------------------------------------
// getSpreadsheet
// ---------------------------------------------------------------------------

describe("SheetsApiClient — getSpreadsheet", () => {
  test("fetches spreadsheet resource with fields selector", async () => {
    mockFetchJson({ sheets: [{ properties: { sheetId: 1, title: "May 18", index: 0 } }] });
    const client = makeClient();
    const result = await client.getSpreadsheet(SHEET_ID, "sheets.properties");

    expect(result.sheets).toHaveLength(1);
    const url = global.fetch.mock.calls[0][0];
    expect(url).toContain(`/v4/spreadsheets/${SHEET_ID}`);
    expect(url).toContain(`fields=${encodeURIComponent("sheets.properties")}`);
  });
});

// ---------------------------------------------------------------------------
// spreadsheetBatchUpdate
// ---------------------------------------------------------------------------

describe("SheetsApiClient — spreadsheetBatchUpdate", () => {
  test("sends POST to spreadsheets:batchUpdate with requests array", async () => {
    mockFetchJson({ replies: [] });
    const client = makeClient();
    const requests = [
      {
        updateSheetProperties: {
          properties: { sheetId: 123, index: 0 },
          fields: "index"
        }
      }
    ];

    await client.spreadsheetBatchUpdate(SHEET_ID, requests);

    const [url, opts] = global.fetch.mock.calls[0];
    expect(opts.method).toBe("POST");
    expect(url).toContain(`/v4/spreadsheets/${SHEET_ID}:batchUpdate`);
    expect(url).not.toContain("values:batchUpdate");
    expect(JSON.parse(opts.body)).toEqual({ requests });
  });

  test("throws SheetsRateLimitError on 429", async () => {
    mockFetchStatus(429);
    const client = makeClient();
    await expect(client.spreadsheetBatchUpdate(SHEET_ID, [])).rejects.toThrow(
      SheetsRateLimitError
    );
  });
});

// ---------------------------------------------------------------------------
// getSpreadsheetMeta
// ---------------------------------------------------------------------------

describe("SheetsApiClient — getSpreadsheetMeta", () => {
  test("fetches from Drive API and returns modifiedTime and name", async () => {
    const mockMeta = { modifiedTime: "2026-05-16T10:00:00.000Z", name: "Ward Program" };
    mockFetchJson(mockMeta);
    const client = makeClient();
    const result = await client.getSpreadsheetMeta(SHEET_ID);
    expect(result.modifiedTime).toBe(mockMeta.modifiedTime);
    expect(result.name).toBe(mockMeta.name);

    const url = global.fetch.mock.calls[0][0];
    expect(url).toContain("drive/v3/files");
    expect(url).toContain(SHEET_ID);
    expect(url).toContain("fields=");
  });

  test("throws SheetsAuthError on 403", async () => {
    mockFetchStatus(403);
    const client = makeClient();
    await expect(client.getSpreadsheetMeta(SHEET_ID)).rejects.toThrow(SheetsAuthError);
  });
});
