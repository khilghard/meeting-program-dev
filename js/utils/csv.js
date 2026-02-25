import { getLanguage } from "../i18n/index.js";
import { sanitizeEntry } from "../sanitize.js";

const LANGUAGE_HEADERS = ["en", "es", "fr", "swa"];

function parseCSV(csv) {
  const rows = [];
  let currentRow = [];
  let currentField = "";
  let inQuotes = false;

  const str = csv.trim();

  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    const nextChar = str[i + 1];

    if (char === "\"") {
      if (inQuotes && nextChar === "\"") {
        currentField += "\"";
        i++; // skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      currentRow.push(currentField);
      currentField = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") i++; // skip \n in \r\n

      currentRow.push(currentField);
      currentField = "";
      if (currentRow.length > 0) rows.push(currentRow);
      currentRow = [];
    } else {
      currentField += char;
    }
  }

  // push last field and row
  currentRow.push(currentField);
  if (currentRow.length > 0) rows.push(currentRow);

  // Check if this is a multi-language CSV (more than 2 columns and has language headers)
  const headerRow = rows[0] || [];
  const isMultiLang =
    headerRow.length > 2 && LANGUAGE_HEADERS.includes(headerRow[1]?.toLowerCase());

  // Get language column index (default to 1 for 'en')
  const currentLang = getLanguage() || "en";
  const langIndex = LANGUAGE_HEADERS.indexOf(currentLang);

  const result = [];
  // assume first line is header
  rows.slice(1).forEach((row) => {
    const rawKey = row[0];
    let rawValue;

    if (isMultiLang) {
      // Multi-language format: key,en,es,fr,swa
      // Try current language first, then fall back to English
      const langValue = row[langIndex + 1];
      const enValue = row[1]; // English is always column 1
      rawValue = langValue && langValue.trim() !== "" ? langValue : enValue;
    } else {
      // Original format: key,value
      rawValue = row[1];
    }

    const entry = sanitizeEntry(rawKey, rawValue);
    if (!entry) return;

    // replace ~ with comma
    if (entry.value) {
      entry.value = entry.value.replace(/~/g, ",");
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
