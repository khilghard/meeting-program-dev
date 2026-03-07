globalThis.onmessage = function (e) {
  const { type, payload, options = {}, id } = e.data;

  try {
    let result = null;

    switch (type) {
      case "parseCSV":
        result = parseCSV(payload, options);
        break;
      case "calculateChecksum":
        result = calculateChecksum(payload);
        break;
      case "compareData":
        result = compareData(payload.old, payload.new);
        break;
      case "sortData":
        result = sortData(payload.data, payload.sortKey);
        break;
      case "cleanupArchives":
        result = cleanupOldArchives(payload.archives, payload.daysOld, payload.maxArchives);
        break;
      default:
        throw new Error(`Unknown worker type: ${type}`);
    }

    self.postMessage({ type, id, result });
  } catch (error) {
    console.error("Worker error:", error);
    self.postMessage({ type, id, error: error.message });
  }
};

function processCharInWorker(char, nextChar, currentField, inQuotes) {
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

function parseCSV(csv, options = {}) {
  const rows = [];
  let currentRow = [];
  let currentField = "";
  let inQuotes = false;
  const str = csv.trim();

  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    const nextChar = str[i + 1];
    const result = processCharInWorker(char, nextChar, currentField, inQuotes);

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

  return processWorkerCSVRows(rows, options);
}

function processWorkerCSVRows(rows, options) {
  const headerRow = rows[0] || [];
  const isMultiLang =
    headerRow.length > 2 && ["en", "es", "fr", "swa"].includes(headerRow[1]?.toLowerCase());
  const currentLang = options.language || "en";
  const langIndex = ["en", "es", "fr", "swa"].indexOf(currentLang);
  const safeLangIndex = Math.max(0, langIndex);

  const result = [];
  rows.slice(1).forEach((row) => {
    const rawKey = row[0];
    let rawValue;

    if (isMultiLang) {
      const langValue = row[safeLangIndex + 1];
      const enValue = row[1];
      rawValue = langValue?.trim() !== "" ? langValue : enValue;
    } else {
      rawValue = row[1];
    }

    const entry = {
      key: rawKey?.trim(),
      value: rawValue?.trim()
    };

    if (!entry.key) return;

    if (entry.value) {
      entry.value = entry.value.replaceAll(/~/g, ",");
    }

    result.push(entry);
  });

  return result;
}

function calculateChecksum(data) {
  let hash = 0;
  const str = JSON.stringify(data);

  for (let i = 0; i < str.length; i++) {
    const char = str.codePointAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }

  return Math.abs(hash).toString(16);
}

function compareData(oldData, newData) {
  if (!oldData || !newData) return false;

  const oldChecksum = calculateChecksum(oldData);
  const newChecksum = calculateChecksum(newData);

  return oldChecksum === newChecksum;
}

function sortData(data, sortKey) {
  if (!data || !sortKey) return data;

  return [...data].sort((a, b) => {
    const valA = a[sortKey] || "";
    const valB = b[sortKey] || "";

    if (typeof valA === "string" && typeof valB === "string") {
      return valA.localeCompare(valB);
    }

    return valA - valB;
  });
}

function cleanupOldArchives(archives, daysOld = 730, maxArchives = 100) {
  if (!archives || !Array.isArray(archives)) {
    return { removed: [], kept: archives || [] };
  }

  const now = Date.now();
  const maxAge = daysOld * 24 * 60 * 60 * 1000;
  const cutoffDate = new Date(now - maxAge);

  const sortedArchives = [...archives].sort((a, b) => {
    const dateA = new Date(a.programDate || 0);
    const dateB = new Date(b.programDate || 0);
    return dateB - dateA;
  });

  const kept = [];
  const removed = [];

  sortedArchives.forEach((archive) => {
    const archiveDate = new Date(archive.programDate);
    const isTooOld = archiveDate < cutoffDate;
    const exceedsLimit = kept.length >= maxArchives;
    const isNewest = kept.length === 0;

    if (isTooOld || (exceedsLimit && !isNewest)) {
      removed.push(archive);
    } else {
      kept.push(archive);
    }
  });

  return { removed, kept };
}
