const ARCHIVE_STORAGE_KEY = "meeting_program_archives";
const MAX_STORAGE_BYTES = 10 * 1024 * 1024;
const STORAGE_WARNING_THRESHOLD = 8 * 1024 * 1024;

/**
 * Generate a composite key for profile+date
 */
function generateArchiveKey(profileId, programDate) {
  return `${profileId}||${programDate}`;
}

/**
 * Get all archives from storage
 */
function getArchivesStorage() {
  try {
    const stored = localStorage.getItem(ARCHIVE_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (e) {
    console.error("Failed to parse archives storage:", e);
    return {};
  }
}

/**
 * Save archives to storage with size management
 */
function saveArchivesStorage(archives) {
  try {
    const serialized = JSON.stringify(archives);
    const size = serialized.length * 2;

    if (size > MAX_STORAGE_BYTES) {
      console.warn("Archive storage exceeds maximum size, cleaning up old entries");
      const cleaned = cleanupBySize(archives);
      localStorage.setItem(ARCHIVE_STORAGE_KEY, JSON.stringify(cleaned.cleanedArchives));
      return {
        saved: true,
        cleaned: cleaned.removedCount > 0,
        warning: cleaned.newSize > STORAGE_WARNING_THRESHOLD,
        size: cleaned.newSize
      };
    }

    localStorage.setItem(ARCHIVE_STORAGE_KEY, JSON.stringify(archives));
    return {
      saved: true,
      cleaned: false,
      warning: size > STORAGE_WARNING_THRESHOLD,
      size
    };
  } catch (e) {
    console.error("Failed to save archives:", e);
    return { saved: false, error: e.message };
  }
}

/**
 * Calculate total storage size of archives
 */
function calculateTotalSize(archives) {
  try {
    const serialized = JSON.stringify(archives);
    return serialized.length * 2;
  } catch (e) {
    return 0;
  }
}

/**
 * Cleanup archives by removing oldest entries until under size limit
 */
function cleanupBySize(archives) {
  const allEntries = [];

  for (const profileId in archives) {
    const profileEntries = archives[profileId];
    profileEntries.forEach((entry) => {
      allEntries.push({
        profileId,
        programDate: entry.programDate,
        csvData: entry.csvData,
        cachedAt: entry.cachedAt,
        key: generateArchiveKey(profileId, entry.programDate)
      });
    });
  }

  allEntries.sort((a, b) => a.cachedAt - b.cachedAt);

  let cleanedArchives = {};
  let removedCount = 0;
  let currentSize = 0;

  for (let i = allEntries.length - 1; i >= 0; i--) {
    const entry = allEntries[i];
    const entrySize = JSON.stringify(entry.csvData).length * 2;

    currentSize += entrySize;

    if (currentSize > MAX_STORAGE_BYTES) {
      removedCount++;
      continue;
    }

    if (!cleanedArchives[entry.profileId]) {
      cleanedArchives[entry.profileId] = [];
    }

    cleanedArchives[entry.profileId].push({
      programDate: entry.programDate,
      csvData: entry.csvData,
      cachedAt: entry.cachedAt
    });
  }

  return {
    cleanedArchives,
    removedCount,
    newSize: currentSize
  };
}

/**
 * Auto-archive a program if it doesn't exist or has changed
 */
export function autoArchive(profileId, programDate, csvData, options = {}) {
  if (!profileId || !programDate || !csvData) {
    return { archived: false, reason: "missing_params" };
  }

  const { force = false } = options;
  const archives = getArchivesStorage();

  if (!archives[profileId]) {
    archives[profileId] = [];
  }

  const existingIndex = archives[profileId].findIndex((entry) => entry.programDate === programDate);

  const now = Date.now();

  if (existingIndex >= 0) {
    const existingEntry = archives[profileId][existingIndex];

    if (!force && isContentEqual(existingEntry.csvData, csvData)) {
      return { archived: false, reason: "no_changes" };
    }

    existingEntry.csvData = csvData;
    existingEntry.cachedAt = now;
  } else {
    archives[profileId].push({
      programDate,
      csvData,
      cachedAt: now
    });
  }

  archives[profileId].sort((a, b) => b.cachedAt - a.cachedAt);

  const result = saveArchivesStorage(archives);

  if (result.saved) {
    return {
      archived: true,
      updated: existingIndex >= 0,
      warning: result.warning,
      size: result.size
    };
  }

  return { archived: false, reason: "save_error", error: result.error };
}

/**
 * Check if CSV content has changed
 */
function isContentEqual(csv1, csv2) {
  if (!csv1 || !csv2) return false;
  return JSON.stringify(csv1) === JSON.stringify(csv2);
}

/**
 * Get archives for a specific profile
 */
export function getProfileArchives(profileId) {
  if (!profileId) return [];

  const archives = getArchivesStorage();
  const profileArchives = archives[profileId] || [];

  return profileArchives.sort((a, b) => {
    const dateA = new Date(a.programDate || "");
    const dateB = new Date(b.programDate || "");
    return dateB - dateA;
  });
}

/**
 * Get a specific archive entry
 */
export function getArchiveEntry(profileId, programDate) {
  const archives = getArchivesStorage();
  const profileArchives = archives[profileId] || [];

  return profileArchives.find((entry) => entry.programDate === programDate) || null;
}

/**
 * Remove all archives for a profile
 */
export function clearProfileArchives(profileId) {
  const archives = getArchivesStorage();

  if (archives[profileId]) {
    delete archives[profileId];
    saveArchivesStorage(archives);
    return true;
  }

  return false;
}

/**
 * Remove all archives (for cleanup/testing)
 */
export function clearAllArchives() {
  localStorage.removeItem(ARCHIVE_STORAGE_KEY);
}

/**
 * Get storage usage information
 */
export function getStorageInfo() {
  const archives = getArchivesStorage();
  const totalSize = calculateTotalSize(archives);
  const totalProfiles = Object.keys(archives).length;
  const totalEntries = Object.values(archives).reduce((sum, arr) => sum + arr.length, 0);

  return {
    totalSizeBytes: totalSize,
    totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
    totalProfiles,
    totalEntries,
    maxSizeBytes: MAX_STORAGE_BYTES,
    maxSizeMB: (MAX_STORAGE_BYTES / (1024 * 1024)).toFixed(2),
    warning: totalSize > STORAGE_WARNING_THRESHOLD
  };
}

export { ARCHIVE_STORAGE_KEY, MAX_STORAGE_BYTES, STORAGE_WARNING_THRESHOLD };
