import { getLanguage } from "../i18n/index.js";
import { sanitizeEntry } from "../sanitize.js";

const LANGUAGE_HEADERS = ["en", "es", "fr", "swa"];

// Helper: Process a single character in CSV parsing
function processChar(char, nextChar, currentField, inQuotes) {
  if (char === '"') {
    if (inQuotes && nextChar === '"') {
      return { field: currentField + '"', quotes: true, skip: true };
    }
    return { field: currentField, quotes: !inQuotes, skip: false };
  }
  if (char === "," && !inQuotes) {
    return { field: currentField, isDelimiter: true, skip: false };
  }
  if ((char === "\n" || char === "\r") && !inQuotes) {
    return { field: currentField, isLineEnd: true, skipNext: char === "\r", skip: false };
  }
  return { field: currentField + char, skip: false };
}

function parseCSV(csv) {
  const rows = [];
  let currentRow = [];
  let currentField = "";
  let inQuotes = false;
  const str = csv.trim();

  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    const nextChar = str[i + 1];
    const result = processChar(char, nextChar, currentField, inQuotes);

    if (result.skip) {
      currentField = result.field;
      inQuotes = result.quotes ?? inQuotes;
      continue;
    }

    if (result.isDelimiter) {
      currentRow.push(result.field);
      currentField = "";
    } else if (result.isLineEnd) {
      currentRow.push(result.field);
      currentField = "";
      if (currentRow.length > 0) rows.push(currentRow);
      currentRow = [];
    } else {
      currentField = result.field;
      inQuotes = result.quotes ?? inQuotes;
    }
  }

  currentRow.push(currentField);
  if (currentRow.length > 0) rows.push(currentRow);

  return processCSVRows(rows);
}

// Helper: Process parsed rows and apply language formatting
function processCSVRows(rows) {
  if (!rows || rows.length === 0) {
    return [];
  }

  const headerRow = rows[0];

  // Check if this is a multi-language CSV with expected headers
  // Look for 'key' in first column and at least one language code in subsequent columns
  const hasKeyHeader = headerRow && headerRow[0] && headerRow[0].toLowerCase().includes("key");
  const hasLanguageHeaders =
    headerRow &&
    headerRow.length >= 2 &&
    headerRow[1] &&
    LANGUAGE_HEADERS.includes(headerRow[1].toLowerCase());

  // If we have a header row that looks like a multi-language CSV with key and language columns,
  // return the raw rows with all columns intact
  if (hasKeyHeader && hasLanguageHeaders) {
    return rows;
  }

  // Otherwise, fall back to single-language behavior
  const currentLang = getLanguage() || "en";
  const langIndex = LANGUAGE_HEADERS.indexOf(currentLang);
  const safeLangIndex = Math.max(0, langIndex);

  const result = [];
  rows.slice(1).forEach((row) => {
    if (!row || row.length === 0) {
      return;
    }

    const rawKey = row[0];
    let rawValue;

    if (hasKeyHeader && hasLanguageHeaders) {
      // This is a multi-language CSV
      const langValue = row[safeLangIndex + 1];
      const enValue = row[1];
      rawValue = langValue?.trim() !== "" ? langValue : enValue;
    } else {
      // Single-language format
      rawValue = row[1];
    }

    const entry = sanitizeEntry(rawKey, rawValue);
    if (!entry) {
      return;
    }

    if (entry.value) {
      entry.value = entry.value.replaceAll(/~/g, ",");
    }

    result.push(entry);
  });

  return result;
}

async function fetchSheet(sheetUrl) {
  if (!sheetUrl) {
    console.warn("No sheet URL provided. Program will not load.");
    return null;
  }

  let url = sheetUrl;
  if (!url.includes("tqx=out:csv")) {
    if (url.endsWith("/")) url = url.slice(0, -1);
    url = url + "/gviz/tq?tqx=out:csv";
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const text = await response.text();
  return parseCSV(text);
}

export { fetchSheet, parseCSV, LANGUAGE_HEADERS };
