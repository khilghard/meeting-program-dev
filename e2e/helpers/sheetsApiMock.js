function columnToIndex(column) {
  let index = 0;
  for (const char of column.toUpperCase()) {
    index = index * 26 + (char.charCodeAt(0) - 64);
  }
  return index - 1;
}

function parseRange(rawRange) {
  const decodedRange = decodeURIComponent(rawRange);
  const [sheetNamePart, coordinatePart] = decodedRange.includes("!")
    ? decodedRange.split("!")
    : ["Sheet1", decodedRange];

  const sheetName = sheetNamePart.replace(/^'/, "").replace(/'$/, "");
  const coordinate = coordinatePart.trim();

  if (/^\d+:\d+$/.test(coordinate)) {
    const [startRow, endRow] = coordinate.split(":").map(value => Number.parseInt(value, 10) - 1);
    return { sheetName, startRow, endRow, startCol: 0, endCol: null };
  }

  if (/^[A-Z]+:[A-Z]+$/i.test(coordinate)) {
    const [startCol, endCol] = coordinate.split(":").map(value => columnToIndex(value));
    return { sheetName, startRow: 0, endRow: null, startCol, endCol };
  }

  const match = /^([A-Z]+)(\d+)(?::([A-Z]+)(\d+))?$/i.exec(coordinate);
  if (!match) {
    throw new Error(`Unsupported Sheets range: ${decodedRange}`);
  }

  const [, startColumn, startRow, endColumn = startColumn, endRow = startRow] = match;
  return {
    sheetName,
    startRow: Number.parseInt(startRow, 10) - 1,
    endRow: Number.parseInt(endRow, 10) - 1,
    startCol: columnToIndex(startColumn),
    endCol: columnToIndex(endColumn)
  };
}

function normalizeTabs(tabs = []) {
  return tabs.map((tab, index) => ({
    sheetId: tab.sheetId,
    title: tab.title,
    index,
    isActive: index === 0
  }));
}

function cloneMatrix(matrix = []) {
  return matrix.map(row => [...row]);
}

function ensureCell(matrix, rowIndex, columnIndex) {
  while (matrix.length <= rowIndex) {
    matrix.push([]);
  }
  while (matrix[rowIndex].length <= columnIndex) {
    matrix[rowIndex].push("");
  }
}

function readRange(matrix, range) {
  const source = cloneMatrix(matrix);
  const endRow = range.endRow ?? source.length - 1;
  const endCol = range.endCol ?? Math.max(...source.map(row => row.length - 1), range.startCol);

  const rows = [];
  for (let rowIndex = range.startRow; rowIndex <= endRow; rowIndex += 1) {
    const row = source[rowIndex] ?? [];
    rows.push(row.slice(range.startCol, endCol + 1));
  }
  return rows;
}

function writeRange(matrix, range, values) {
  values.forEach((rowValues, rowOffset) => {
    rowValues.forEach((cellValue, columnOffset) => {
      const rowIndex = range.startRow + rowOffset;
      const columnIndex = range.startCol + columnOffset;
      ensureCell(matrix, rowIndex, columnIndex);
      matrix[rowIndex][columnIndex] = cellValue;
    });
  });
}

function parseRequestSpreadsheetId(url) {
  const match = url.pathname.match(/\/v4\/spreadsheets\/([^/:?]+)/);
  return match ? match[1] : "";
}

function buildSheetsState(definition) {
  const tabs = normalizeTabs(definition.tabs ?? [{ sheetId: 0, title: "Sheet1" }]);
  const sheets = new Map();
  Object.entries(definition.sheets ?? {}).forEach(([title, rows]) => {
    sheets.set(title, cloneMatrix(rows));
  });

  tabs.forEach(tab => {
    if (!sheets.has(tab.title)) {
      sheets.set(tab.title, []);
    }
  });

  return {
    spreadsheetId: definition.spreadsheetId,
    modifiedTime: definition.modifiedTime ?? "2026-05-16T12:00:00.000Z",
    driveMetaSequence: Array.isArray(definition.driveMetaSequence)
      ? [...definition.driveMetaSequence]
      : null,
    valueUpdateFailures: Array.isArray(definition.valueUpdateFailures)
      ? [...definition.valueUpdateFailures]
      : [],
    name: definition.name ?? "Mock Spreadsheet",
    tabs,
    sheets,
    writes: []
  };
}

export function buildProgramSheet(rows, locales = ["en", "es", "fr", "swa"]) {
  const header = ["key", ...locales];
  return [
    header,
    ...rows.map(row => [row.key, ...locales.map(locale => row[locale] ?? "")])
  ];
}

export function buildAgendaSheet(rows) {
  return [
    ["key", "value"],
    ...rows.map(row => [row.key, row.value])
  ];
}

export async function setupSheetsApiMock(page, definition) {
  const state = buildSheetsState(definition);

  await page.context().route(/https:\/\/sheets\.googleapis\.com\/v4\/spreadsheets\/.*/, async route => {
    const request = route.request();
    const url = new URL(request.url());
    const spreadsheetId = parseRequestSpreadsheetId(url);

    if (spreadsheetId !== state.spreadsheetId) {
      await route.fallback();
      return;
    }

    if (request.method() === "GET" && /\/values\//.test(url.pathname)) {
      const rawRange = url.pathname.split("/values/")[1];
      const range = parseRange(rawRange);
      const values = readRange(state.sheets.get(range.sheetName) ?? [], range);
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ range: decodeURIComponent(rawRange), values })
      });
      return;
    }

    if (request.method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          sheets: state.tabs.map(tab => ({
            properties: {
              sheetId: tab.sheetId,
              title: tab.title,
              index: tab.index
            }
          }))
        })
      });
      return;
    }

    if (request.method() === "PUT" && /\/values\//.test(url.pathname)) {
      const failure = state.valueUpdateFailures.shift();
      if (failure) {
        await route.fulfill({
          status: failure.status ?? 500,
          contentType: "application/json",
          body: JSON.stringify(failure.body ?? { error: { message: failure.message ?? "Mock failure" } })
        });
        return;
      }

      const rawRange = url.pathname.split("/values/")[1];
      const range = parseRange(rawRange);
      const payload = JSON.parse(request.postData() || "{}");
      const targetSheet = state.sheets.get(range.sheetName) ?? [];
      writeRange(targetSheet, range, payload.values ?? []);
      state.sheets.set(range.sheetName, targetSheet);
      state.writes.push({ type: "valueUpdate", range: decodeURIComponent(rawRange), values: payload.values ?? [] });
      state.modifiedTime = new Date(Date.now()).toISOString();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ updatedRange: decodeURIComponent(rawRange), updatedRows: payload.values?.length ?? 0 })
      });
      return;
    }

    if (request.method() === "POST" && url.pathname.endsWith(":batchUpdate")) {
      const payload = JSON.parse(request.postData() || "{}");
      const requests = payload.requests ?? [];
      requests.forEach(item => {
        if (item.updateSheetProperties?.properties?.sheetId != null) {
          const targetSheetId = item.updateSheetProperties.properties.sheetId;
          const matched = state.tabs.find(tab => tab.sheetId === targetSheetId);
          if (matched) {
            state.tabs = normalizeTabs([
              matched,
              ...state.tabs.filter(tab => tab.sheetId !== targetSheetId)
            ]);
          }
        }
      });
      state.writes.push({ type: "spreadsheetBatchUpdate", requests });
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ replies: [] })
      });
      return;
    }

    await route.fulfill({ status: 501, body: "Unsupported Sheets mock request" });
  });

  await page.context().route(/https:\/\/www\.googleapis\.com\/drive\/v3\/files\/.*/, async route => {
    const request = route.request();
    const url = new URL(request.url());
    const fileId = url.pathname.split("/files/")[1];

    if (fileId !== state.spreadsheetId) {
      await route.fallback();
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        modifiedTime: state.driveMetaSequence?.length
          ? state.driveMetaSequence.shift()
          : state.modifiedTime,
        name: state.name
      })
    });
  });

  return {
    getWrites() {
      return [...state.writes];
    },
    getSheet(title) {
      return cloneMatrix(state.sheets.get(title) ?? []);
    },
    getTabs() {
      return state.tabs.map(tab => ({ ...tab }));
    }
  };
}
