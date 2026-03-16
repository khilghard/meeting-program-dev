/**
 * history.js
 * Program history management with IndexedDB backend
 *
 * Automatic migration from localStorage to IndexedDB on first load (v2.1.1 → v2.2.0).
 * Falls back to localStorage during read if not yet migrated.
 */

import { db } from "./data/db.js";

const LEGACY_HISTORY_STORAGE_KEY = "meeting_program_history";
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
const TWO_YEAR_MS = 2 * ONE_YEAR_MS;
const SIZE_THRESHOLD_BYTES = 20 * 1024 * 1024; // 20 MB — appropriate for IndexedDB
const SAVE_THROTTLE_MS = 5 * 60 * 1000; // 5 minutes
const CLEANUP_THROTTLE_MS = 60 * 60 * 1000; // 1 hour

let lastSaveAttempt = {};
let lastCleanupTime = 0;
let migrationAttempted = false;

// Helper: Generate history entry ID from profileId and date
function generateHistoryId(profileId, date) {
  return `${profileId}||${date}`;
}

/**
 * Ensure legacy localStorage history is migrated to IndexedDB
 * This is a fallback migration in case the main Dexie upgrade hook missed anything
 */
async function ensureLegacyMigration() {
  if (migrationAttempted) return;
  migrationAttempted = true;

  const raw = localStorage.getItem(LEGACY_HISTORY_STORAGE_KEY);
  if (!raw) return; // Nothing to migrate

  try {
    const legacy = JSON.parse(raw);
    console.log("[History] Ensuring legacy localStorage history is in IndexedDB...");

    for (const [profileId, entries] of Object.entries(legacy || {})) {
      if (!Array.isArray(entries)) continue;

      for (const entry of entries) {
        const historyEntry = {
          id: generateHistoryId(profileId, entry.date),
          profileId,
          date: entry.date,
          data: entry.data,
          cachedAt: entry.cachedAt || Date.now()
        };
        try {
          // Check if already exists (might have been migrated)
          const existing = await db.history.get(historyEntry.id);
          if (!existing) {
            await db.history.put(historyEntry);
          }
        } catch (err) {
          console.warn(`[History] Failed to migrate entry ${historyEntry.id}`, err);
        }
      }
    }

    // Only remove after ALL entries migrated
    localStorage.removeItem(LEGACY_HISTORY_STORAGE_KEY);
    console.log("[History] Legacy history confirmed in IndexedDB");
  } catch (err) {
    console.warn("[History] Legacy migration fallback failed:", err);
    // Don't block app; can retry next session
  }
}

// Helper: Check if save should be skipped due to caching
function shouldSkipCachedSave(isFromCache, forceSave) {
  return isFromCache && !forceSave;
}

// Helper: Validate save parameters
function validateSaveParams(profileId, date) {
  return !profileId || !date ? { saved: false, reason: "missing_params" } : null;
}

// Helper: Check if save is throttled
function isSaveThrottled(profileId, forceSave, now) {
  if (forceSave) return false;
  const lastSave = lastSaveAttempt[profileId] || 0;
  return now - lastSave < SAVE_THROTTLE_MS;
}

// Helper: Check if entry is duplicate content
async function isDuplicateContent(profileId, date, programData, forceSave) {
  if (forceSave) return false;
  const existingId = generateHistoryId(profileId, date);
  const existing = await db.history.get(existingId);
  return existing && isContentEqual(existing.data, programData);
}

// Helper: Perform asynchronous cleanup if needed
function scheduleCleanupIfNeeded(now) {
  if (now - lastCleanupTime > CLEANUP_THROTTLE_MS) {
    lastCleanupTime = now;
    cleanupHistory().catch((err) => {
      console.warn("[History] Cleanup failed:", err.message);
    });
  }
}

/**
 * Save a program history entry to IndexedDB
 */
export async function saveProgramHistory(profileId, date, programData, options = {}) {
  const { isFromCache = false, forceSave = false } = options;

  try {
    if (shouldSkipCachedSave(isFromCache, forceSave)) {
      return { saved: false, reason: "cached" };
    }

    const paramError = validateSaveParams(profileId, date);
    if (paramError) return paramError;

    // Trigger migration if needed (non-blocking)
    ensureLegacyMigration().catch((err) => {
      console.warn("[History] Background migration error:", err.message);
    });

    const now = Date.now();

    if (isSaveThrottled(profileId, forceSave, now)) {
      return { saved: false, reason: "throttled" };
    }

    if (await isDuplicateContent(profileId, date, programData, forceSave)) {
      return { saved: false, reason: "duplicate_content" };
    }

    const existingId = generateHistoryId(profileId, date);
    const existing = await db.history.get(existingId);

    const historyEntry = {
      id: existingId,
      profileId,
      date,
      data: programData,
      cachedAt: now
    };

    await db.history.put(historyEntry);
    lastSaveAttempt[profileId] = now;

    scheduleCleanupIfNeeded(now);

    return { saved: true, reason: existing ? "updated" : "new" };
  } catch (err) {
    console.warn("[History] Failed to save program history:", err);
    return { saved: false, reason: "error", error: err.message };
  }
}

/**
 * Check if two program datasets are equal (ignoring order)
 */
function isContentEqual(data1, data2) {
  if (!data1 || !data2) return false;
  if (Array.isArray(data1) && Array.isArray(data2)) {
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

  // Fallback to JSON comparison
  return JSON.stringify(data1) === JSON.stringify(data2);
}

// Helper: Get history from IndexedDB for a specific profile
async function getProfileHistoryFromIndexedDB(profileId) {
  const entries = await db.history.where("profileId").equals(profileId).toArray();
  // Sort by date descending (newest first)
  entries.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  return entries;
}

// Helper: Try to read legacy history from localStorage
function legacyHistoryFallback() {
  try {
    const raw = localStorage.getItem(LEGACY_HISTORY_STORAGE_KEY);
    if (!raw) return [];

    const legacy = JSON.parse(raw);
    // Convert legacy format to flat array
    if (Array.isArray(legacy)) {
      return legacy;
    } else if (typeof legacy === "object") {
      // If it's organized by profileId, flatten it
      return Object.values(legacy).flat();
    }
  } catch (error_) {
    console.warn("[History] Failed to parse legacy history:", error_);
  }
  return [];
}

// Helper: Sort history entries by date (newest first)
function sortHistoryEntries(entries) {
  if (!Array.isArray(entries)) return [];

  entries.sort((a, b) => {
    const dateA = a.date || a.timestamp || "";
    const dateB = b.date || b.timestamp || "";
    return dateB.localeCompare(dateA);
  });
  return entries;
}

/**
 * Get all history with IndexedDB fallback to localStorage
 */
async function getHistoryWithFallback() {
  let entries = await db.history.toArray();

  // If no entries in IndexedDB, fall back to legacy localStorage
  if (entries.length === 0) {
    entries = legacyHistoryFallback();
  }

  return sortHistoryEntries(entries);
}

/**
 * Get program history for a profile or all history with fallback
 */
export async function getProgramHistory(profileId) {
  try {
    // If profileId provided, get specific profile history
    if (profileId) {
      return await getProfileHistoryFromIndexedDB(profileId);
    }

    return await getHistoryWithFallback();
  } catch (err) {
    console.warn("[History] Failed to get program history:", err);

    // Final fallback: try to read from localStorage
    const fallbackEntries = legacyHistoryFallback();
    return fallbackEntries.length > 0 ? fallbackEntries : [];
  }
}

/**
 * Get a specific history entry
 */
export async function getHistoryItem(profileId, date) {
  try {
    const id = generateHistoryId(profileId, date);
    return (await db.history.get(id)) || null;
  } catch (err) {
    console.warn("[History] Failed to get history item:", err);
    return null;
  }
}

/**
 * Get latest history entry for profile
 */
export async function getLatestHistoryItem(profileId) {
  try {
    const entries = await getProgramHistory(profileId);
    return entries.length > 0 ? entries[0] : null;
  } catch (err) {
    console.warn("[History] Failed to get latest history item:", err);
    return null;
  }
}

/**
 * Delete a history entry
 */
export async function deleteHistoryItem(profileId, date) {
  try {
    const id = generateHistoryId(profileId, date);
    await db.history.delete(id);
    return true;
  } catch (err) {
    console.warn("[History] Failed to delete history item:", err);
    return false;
  }
}

// Helper: Remove old entries by age
async function removeOldEntriesByAgeFromAllProfiles() {
  const profiles = await db.profiles.toArray();
  const cutoffDate = Date.now() - TWO_YEAR_MS;

  for (const profile of profiles) {
    const entries = await db.history.where("profileId").equals(profile.id).toArray();
    for (const entry of entries) {
      if (entry.cachedAt && entry.cachedAt < cutoffDate) {
        await db.history.delete(entry.id);
      }
    }
  }
}

// Helper: Remove oldest entries if total size exceeds threshold
async function removeOldestEntriesIfSizeExceeds() {
  const allEntries = await db.history.toArray();
  const estimatedSize = new Blob([JSON.stringify(allEntries)]).size;

  if (estimatedSize > SIZE_THRESHOLD_BYTES) {
    const sorted = allEntries.sort((a, b) => (a.cachedAt || 0) - (b.cachedAt || 0));
    for (const entry of sorted) {
      await db.history.delete(entry.id);
      const newSize = new Blob([JSON.stringify(await db.history.toArray())]).size;
      if (newSize < SIZE_THRESHOLD_BYTES) break;
    }
  }
}

/**
 * Clean up old history entries by age and total size
 */
export async function cleanupHistory() {
  try {
    await removeOldEntriesByAgeFromAllProfiles();
    await removeOldestEntriesIfSizeExceeds();
    return true;
  } catch (err) {
    console.warn("[History] Cleanup failed:", err);
    return false;
  }
}

/**
 * Clear all history for a profile (called when profile is deleted)
 */
export async function clearHistory(profileId) {
  try {
    if (profileId) {
      await db.history.where("profileId").equals(profileId).delete();
      delete lastSaveAttempt[profileId];
    } else {
      await db.history.clear();
      lastSaveAttempt = {};
    }
    return true;
  } catch (err) {
    console.warn("[History] Failed to clear history:", err);
    return false;
  }
}

/**
 * Get storage size estimate for history
 */
export async function getHistorySize() {
  try {
    const entries = await db.history.toArray();
    const data = JSON.stringify(entries);
    return new Blob([data]).size;
  } catch (err) {
    console.warn("[History] Failed to get storage size:", err);
    return 0;
  }
}

/**
 * Get retention policy info
 */
export async function getRetentionInfo() {
  try {
    const size = await getHistorySize();
    const retentionMs = size < SIZE_THRESHOLD_BYTES ? TWO_YEAR_MS : ONE_YEAR_MS;
    const retentionDays = Math.round(retentionMs / (24 * 60 * 60 * 1000));

    return {
      currentSizeBytes: size,
      retentionDays,
      thresholdBytes: SIZE_THRESHOLD_BYTES
    };
  } catch {
    return {
      currentSizeBytes: 0,
      retentionDays: 365,
      thresholdBytes: SIZE_THRESHOLD_BYTES
    };
  }
}

/**
 * Reset throttle for a profile
 */
export function resetThrottle(profileId) {
  if (profileId) {
    delete lastSaveAttempt[profileId];
  } else {
    lastSaveAttempt = {};
  }
}

// Export constants for backward compatibility
export {
  LEGACY_HISTORY_STORAGE_KEY as HISTORY_STORAGE_KEY,
  ONE_YEAR_MS,
  TWO_YEAR_MS,
  SIZE_THRESHOLD_BYTES,
  SAVE_THROTTLE_MS
};
