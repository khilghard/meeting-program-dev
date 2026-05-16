# ADR-001: Program Sheet Write Strategy

**Date:** 2026-05-16  
**Status:** Accepted  
**Deciders:** Architecture Review (AD-05)

## Context

The meeting program Google Sheet has multiple language columns:

| key | en | es | fr | swa |
|-----|----|----|----|----|
| presiding | Bishop Jones | ... | ... | ... |

The original plan described "batch-save full CSV". A naïve implementation that writes only column A (key) and column B (en) would **silently erase** all Spanish, French, and Swahili content for every congregation that uses those languages. This is a data-corruption risk.

Additionally, some congregations add custom columns (notes, approval status) that the app does not manage. Those must be preserved too.

## Decision

`ProgramSheetService.mjs` will use a **column-safe read-modify-write** strategy:

### Step 1 — Read Current Sheet Structure

Before any write, call `SheetsApiClient.getValues(spreadsheetId, "Sheet1!1:1")` to fetch the header row. Parse it to build a column-index map:

```js
// e.g. { key: 0, en: 1, es: 2, fr: 3, swa: 4 }
const colMap = {};
headerRow.forEach((colName, i) => { colMap[colName] = i; });
```

### Step 2 — Determine Target Column

The CMS writes to the column matching the user's current locale (from `i18n/index.js`). If the locale column does not exist in the sheet, **abort with an error** — do not create a new column silently.

```js
const targetCol = colMap[currentLocale]; // e.g. colMap["en"] → 1
if (targetCol === undefined) {
  throw new Error(`Column "${currentLocale}" not found in sheet. Cannot write.`);
}
```

### Step 3 — Read Current Values in Target Column

Fetch the full target column to merge with edits:

```js
const colLetter = columnIndexToLetter(targetCol); // e.g. 1 → "B"
const existing = await client.getValues(spreadsheetId, `Sheet1!A:${colLetter}`);
```

### Step 4 — Build Updated Column, Write Only That Column

Construct the updated column array by merging current CMS edits over existing values. Write only the two-column range `A:B` (key + target language), **not** the full sheet.

Sheets API call:

```js
await client.valueUpdate(spreadsheetId, {
  range: `Sheet1!A1:${colLetter}${rowCount}`,
  values: mergedRows,   // [[key, value], [key, value], ...]
});
```

This preserves all other language columns and any custom columns untouched.

### Step 5 — Concurrency Warning

Before writing (Step 4), re-fetch `spreadsheetMeta.modifiedTime`. If it differs from the value fetched on page load (AD-13), show the warning:

> "This sheet was modified by another user since you opened it. Save anyway?"

If user confirms, proceed. If they cancel, discard the write.

## API Calls Summary

| # | Operation | Sheets API call |
|---|-----------|----------------|
| 1 | Read header row | `GET /values/Sheet1!1:1` |
| 2 | Read target column | `GET /values/Sheet1!A:${col}` |
| 3 | Write key + target column | `PUT /values/Sheet1!A1:${col}${n}?valueInputOption=USER_ENTERED` |
| 4 | Concurrency check | `GET /` (spreadsheet metadata, `fields=modifiedTime`) |

All calls use `SheetsApiClient.mjs` which handles auth token injection and 403/429/timeout errors.

## Rollback

The Sheets API does not support transactions. Rollback approach:

1. The `getValues()` call in Step 3 captures the pre-write state.
2. If the `valueUpdate()` call fails (non-2xx), `ProgramSheetService` throws — the UI stays dirty, the user may retry.
3. There is no automatic rollback write. The failure case leaves the sheet **unchanged** (write failed, not partially written).
4. Partial writes are not possible because the entire range is sent in a single `PUT` call.

This is an acceptable trade-off for a no-backend PWA serving volunteer-operated congregations.

## Consequences

- **Positive:** Multi-language data is safe. Custom columns are preserved.
- **Positive:** Write failures are atomic (all-or-nothing per Sheets API `PUT`).
- **Negative:** Requires 2–3 API round-trips instead of 1 direct write. For a low-frequency CMS (weekly edits), this is acceptable.
- **Negative:** If the sheet has no locale column for the user's language, the write is blocked. This is the correct behaviour — silent writes to the wrong column are worse.

## Out of Scope

- Multi-sheet tabs: the plan targets `Sheet1` (the default). If a congregation uses a different tab name, this will fail loudly (column not found). Tab name configuration is a future enhancement.
- Batch key writes: this ADR covers writing all edited keys in a single Sheets `PUT`. The UI "Save to Sheets" button triggers one write pass, not one API call per key.
