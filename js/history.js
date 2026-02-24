const HISTORY_STORAGE_KEY = "meeting_program_history";
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
const TWO_YEAR_MS = 2 * ONE_YEAR_MS;
const SIZE_THRESHOLD_BYTES = 100 * 1024;
const SAVE_THROTTLE_MS = 5 * 60 * 1000; // 5 minutes

let lastSaveAttempt = {};

export function saveProgramHistory(profileId, date, programData, options = {}) {
  const { isFromCache = false, forceSave = false } = options;

  try {
    if (isFromCache && !forceSave) {
      return { saved: false, reason: "cached" };
    }

    if (!profileId || !date) {
      return { saved: false, reason: "missing_params" };
    }

    const history = getHistoryStorage();

    if (!history[profileId]) {
      history[profileId] = [];
    }

    const existingIndex = history[profileId].findIndex((p) => p.date === date);

    if (existingIndex >= 0) {
      const existingEntry = history[profileId][existingIndex];
      if (!forceSave && isContentEqual(existingEntry.data, programData)) {
        return { saved: false, reason: "duplicate_content" };
      }
    }

    const now = Date.now();
    const lastSave = lastSaveAttempt[profileId] || 0;

    if (!forceSave && now - lastSave < SAVE_THROTTLE_MS) {
      return { saved: false, reason: "throttled" };
    }

    const entry = {
      date: date,
      data: programData,
      cachedAt: now
    };

    if (existingIndex >= 0) {
      history[profileId][existingIndex] = entry;
    } else {
      history[profileId].unshift(entry);
    }

    lastSaveAttempt[profileId] = now;
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));

    cleanupHistory();

    return { saved: true, reason: existingIndex >= 0 ? "updated" : "new" };
  } catch (err) {
    console.warn("Failed to save program history:", err);
    return { saved: false, reason: "error" };
  }
}

function isContentEqual(data1, data2) {
  if (!data1 || !data2) return false;
  if (data1.length !== data2.length) return false;

  const sorted1 = [...data1].sort((a, b) => (a.key || "").localeCompare(b.key || ""));
  const sorted2 = [...data2].sort((a, b) => (a.key || "").localeCompare(b.key || ""));

  for (let i = 0; i < sorted1.length; i++) {
    if (sorted1[i].key !== sorted2[i].key || sorted1[i].value !== sorted2[i].value) {
      return false;
    }
  }

  return true;
}

export function getProgramHistory(profileId) {
  try {
    const history = getHistoryStorage();
    return history[profileId] || [];
  } catch (err) {
    console.warn("Failed to get program history:", err);
    return [];
  }
}

export function getHistoryItem(profileId, date) {
  try {
    const history = getProgramHistory(profileId);
    return history.find((p) => p.date === date) || null;
  } catch (err) {
    console.warn("Failed to get history item:", err);
    return null;
  }
}

export function getLatestHistoryItem(profileId) {
  try {
    const history = getProgramHistory(profileId);
    return history.length > 0 ? history[0] : null;
  } catch (err) {
    console.warn("Failed to get latest history item:", err);
    return null;
  }
}

export function cleanupHistory() {
  try {
    const history = getHistoryStorage();
    const retentionMs = calculateRetentionPeriod();
    const now = Date.now();

    for (const profileId in history) {
      history[profileId] = history[profileId].filter((entry) => {
        return now - entry.cachedAt < retentionMs;
      });
    }

    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));

    return true;
  } catch (err) {
    console.warn("Failed to cleanup history:", err);
    return false;
  }
}

function calculateRetentionPeriod() {
  try {
    const history = getHistoryStorage();
    const totalSize = calculateStorageSize(history);

    if (totalSize < SIZE_THRESHOLD_BYTES) {
      return TWO_YEAR_MS;
    }
    return ONE_YEAR_MS;
  } catch (err) {
    return ONE_YEAR_MS;
  }
}

function calculateStorageSize(obj) {
  try {
    const str = JSON.stringify(obj);
    return str.length * 2;
  } catch (err) {
    return 0;
  }
}

function getHistoryStorage() {
  try {
    const stored = localStorage.getItem(HISTORY_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (err) {
    return {};
  }
}

export function clearHistory(profileId) {
  try {
    const history = getHistoryStorage();

    if (profileId) {
      delete history[profileId];
      delete lastSaveAttempt[profileId];
    } else {
      Object.keys(history).forEach((key) => {
        delete history[key];
        delete lastSaveAttempt[key];
      });
    }

    const keysRemaining = Object.keys(history).length;
    if (keysRemaining === 0) {
      localStorage.removeItem(HISTORY_STORAGE_KEY);
    } else {
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
    }
    return true;
  } catch (err) {
    console.warn("Failed to clear history:", err);
    return false;
  }
}

export function getHistorySize() {
  try {
    const history = getHistoryStorage();
    return calculateStorageSize(history);
  } catch (err) {
    return 0;
  }
}

export function getRetentionInfo() {
  try {
    const history = getHistoryStorage();
    const totalSize = calculateStorageSize(history);
    const retentionMs = totalSize < SIZE_THRESHOLD_BYTES ? TWO_YEAR_MS : ONE_YEAR_MS;
    const retentionDays = retentionMs / ONE_YEAR_MS;

    return {
      currentSizeBytes: totalSize,
      retentionDays: retentionDays,
      thresholdBytes: SIZE_THRESHOLD_BYTES
    };
  } catch (err) {
    return {
      currentSizeBytes: 0,
      retentionDays: 1,
      thresholdBytes: SIZE_THRESHOLD_BYTES
    };
  }
}

export function resetThrottle(profileId) {
  if (profileId) {
    delete lastSaveAttempt[profileId];
  } else {
    lastSaveAttempt = {};
  }
}

export { HISTORY_STORAGE_KEY, ONE_YEAR_MS, TWO_YEAR_MS, SIZE_THRESHOLD_BYTES, SAVE_THROTTLE_MS };
