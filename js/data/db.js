/**
 * db.js
 * Dexie database configuration for MeetingProgramDB
 *
 * Handles schema versioning and automatic migrations for existing users.
 * Version 1: Initial schema (profiles, archives, metadata, migrations)
 * Version 2: Added history store for data loss prevention on v2.1.1 upgrade
 * Version 3: Added date index to history, inactive index to profiles
 * Version 4: Migrate all localStorage data to IndexedDB (v2.2.0 migration)
 */

import Dexie from "dexie";

// For compatibility with older test environments, check if databases() is available
const hasIdbDatabases =
  typeof globalThis !== "undefined" &&
  globalThis.indexedDB &&
  typeof globalThis.indexedDB.databases === "function";

// Configure Dexie to work with test environments that lack databases()
if (!hasIdbDatabases) {
  // Disable the databases check temporarily for initialization
  // This is needed for fake-indexeddb compatibility
}

// Helper: Insert a single history entry safely
async function insertHistoryEntry(tx, historyEntry) {
  try {
    await tx.history.put(historyEntry);
  } catch (e) {
    console.warn("[DB] Failed to migrate history entry:", e);
  }
}

// Helper: Build history entry from legacy data
function buildHistoryEntry(profileId, entry) {
  const id = `${profileId}||${entry.date || entry.timestamp || Date.now()}`;
  return {
    id,
    profileId,
    date: entry.date || entry.timestamp || "",
    data: entry.url ? { url: entry.url, name: entry.name } : entry.data,
    cachedAt: entry.cachedAt || Date.now()
  };
}

// Helper: Migrate array format history entries to IndexedDB
async function migrateArrayFormatHistory(tx, legacy) {
  for (const entry of legacy) {
    const historyEntry = buildHistoryEntry("default", entry);
    await insertHistoryEntry(tx, historyEntry);
  }
}

// Helper: Migrate object format history entries to IndexedDB
async function migrateObjectFormatHistory(tx, legacy) {
  for (const [profileId, entries] of Object.entries(legacy)) {
    if (!Array.isArray(entries)) continue;
    for (const entry of entries) {
      const historyEntry = buildHistoryEntry(profileId, entry);
      await insertHistoryEntry(tx, historyEntry);
    }
  }
}

// Helper: Parse and prepare legacy history data for migration
function parseLegacyHistory(raw) {
  try {
    return JSON.parse(raw);
  } catch (err) {
    console.warn("[DB] Failed to parse legacy history:", err);
    return null;
  }
}

// Helper: Delegate to appropriate migration handler based on data format
async function handleLegacyHistoryMigration(tx, legacy) {
  if (Array.isArray(legacy)) {
    await migrateArrayFormatHistory(tx, legacy);
  } else if (typeof legacy === "object" && legacy !== null) {
    await migrateObjectFormatHistory(tx, legacy);
  }
}

export const db = new Dexie("MeetingProgramDB");

// Define schema with automatic version step-up support
db.version(1).stores({
  profiles: "id, url, lastUsed",
  archives: "id, profileId, programDate, [profileId+programDate]",
  metadata: "key",
  migrations: "profileId"
});

async function migrateHistoryToIndexedDB(tx) {
  const raw = localStorage.getItem("meeting_program_history");
  if (!raw) return; // No legacy history, skip

  try {
    const legacy = parseLegacyHistory(raw);
    if (!legacy) return;

    console.log("[DB] Migrating legacy history to IndexedDB...");
    await handleLegacyHistoryMigration(tx, legacy);

    localStorage.removeItem("meeting_program_history");
    console.log("[DB] Legacy history migrated successfully");
  } catch (err) {
    console.warn("[DB] Legacy history migration failed:", err);
  }
}

db.version(2)
  .stores({
    profiles: "id, url, lastUsed",
    archives: "id, profileId, programDate, [profileId+programDate]",
    metadata: "key",
    migrations: "profileId",
    history: "id, profileId, cachedAt, [profileId+cachedAt]" // NEW store
  })
  .upgrade(async (tx) => {
    await migrateHistoryToIndexedDB(tx);
  });

db.version(3).stores({
  profiles: "id, url, lastUsed, inactive", // +inactive index
  archives: "id, profileId, programDate, [profileId+programDate]",
  metadata: "key",
  migrations: "profileId",
  history: "id, profileId, date, cachedAt, [profileId+cachedAt]" // +date index
  // No .upgrade() needed — only adding indexes, no data transformation
});

// Migration keys from localStorage
const LEGACY_STORAGE_KEYS = {
  THEME: "theme",
  LANGUAGE: "language",
  HELP_SHOWN: "meeting_program_help_shown",
  INSTALL_PROMPTED: "meeting_program_install_prompted",
  SHEET_URL: "sheetUrl",
  PROGRAM_CACHE: "programCache"
};

// Helper: Migrate a single localStorage item to IndexedDB metadata
async function migrateSingleItem(tx, localStorageKey, metadataKey, migratedObj, objKey) {
  const value = localStorage.getItem(localStorageKey);
  if (value) {
    await tx.metadata.put({ key: metadataKey, value });
    migratedObj[objKey] = true;
    localStorage.removeItem(localStorageKey);
  }
}

async function migrateLocalStorageToIndexedDB(tx) {
  const migrated = {
    theme: false,
    language: false,
    helpShown: false,
    sheetUrl: false,
    programCache: false
  };

  try {
    await migrateSingleItem(
      tx,
      LEGACY_STORAGE_KEYS.THEME,
      "userPreference_theme",
      migrated,
      "theme"
    );
    await migrateSingleItem(
      tx,
      LEGACY_STORAGE_KEYS.LANGUAGE,
      "userPreference_language",
      migrated,
      "language"
    );
    await migrateSingleItem(
      tx,
      LEGACY_STORAGE_KEYS.HELP_SHOWN,
      "userPreference_helpShown",
      migrated,
      "helpShown"
    );

    const installPrompted = localStorage.getItem(LEGACY_STORAGE_KEYS.INSTALL_PROMPTED);
    if (installPrompted) {
      await tx.metadata.put({ key: "userPreference_installPrompted", value: installPrompted });
      localStorage.removeItem(LEGACY_STORAGE_KEYS.INSTALL_PROMPTED);
    }

    await migrateSingleItem(
      tx,
      LEGACY_STORAGE_KEYS.SHEET_URL,
      "legacy_sheetUrl",
      migrated,
      "sheetUrl"
    );
    await migrateSingleItem(
      tx,
      LEGACY_STORAGE_KEYS.PROGRAM_CACHE,
      "legacy_programCache",
      migrated,
      "programCache"
    );

    console.log("[DB] localStorage migration completed:", migrated);
  } catch (err) {
    console.error("[DB] localStorage migration failed:", err);
  }
}

db.version(4)
  .stores({
    profiles: "id, url, lastUsed, inactive",
    archives: "id, profileId, programDate, [profileId+programDate]",
    metadata: "key",
    migrations: "profileId",
    history: "id, profileId, date, cachedAt, [profileId+cachedAt]"
  })
  .upgrade(async (tx) => {
    await migrateLocalStorageToIndexedDB(tx);
  });

// Export default for convenience
export default db;
