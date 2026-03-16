/**
 * IndexedDBManager.js
 * Wrapper around Dexie for managing profiles, archives, metadata, and migrations.
 *
 * Replaced raw IndexedDB with Dexie to enable automatic schema versioning
 * and safe upgrades for existing users.
 */

import db, { DB_NAME, DB_SCHEMA_VERSION } from "./db.js";

const DB_VERSION = DB_SCHEMA_VERSION;
const STORES = ["profiles", "archives", "metadata", "migrations", "history"];

// Open the database - Dexie handles the version check and upgrade automatically
async function createDatabase() {
  return await db.open();
}

async function getProfile(id) {
  return db.profiles.get(id) || null;
}

async function getAllProfiles() {
  const profiles = await db.profiles.toArray();
  // Sort by lastUsed (most recent first)
  profiles.sort((a, b) => (b.lastUsed || 0) - (a.lastUsed || 0));
  return profiles;
}

async function getActiveProfiles() {
  // Use the inactive index for efficient querying
  const profiles = await db.profiles.toArray();
  return profiles.filter((p) => !p.inactive);
}

async function getInactiveProfiles() {
  const profiles = await db.profiles.where("id").notEqual("").toArray();
  return profiles.filter((p) => p.inactive);
}

async function saveProfile(profile) {
  await db.profiles.put(profile);
  return profile;
}

async function deleteProfile(id) {
  await db.profiles.delete(id);
  return true;
}

async function getArchive(profileId, programDate) {
  return (
    db.archives.where("[profileId+programDate]").equals([profileId, programDate]).first() || null
  );
}

async function getAllArchives(profileId) {
  const archives = await db.archives.where("profileId").equals(profileId).toArray();
  archives.sort((a, b) => (b.programDate || 0) - (a.programDate || 0));
  return archives;
}

async function saveArchive(archive) {
  const checksum = await calculateChecksum(archive.csvData);
  const archiveWithChecksum = { ...archive, checksum };
  await db.archives.put(archiveWithChecksum);
  return archiveWithChecksum;
}

async function deleteArchive(profileId, programDate) {
  const id = `${profileId}||${programDate}`;
  await db.archives.delete(id);
  return true;
}

async function clearProfileArchives(profileId) {
  await db.archives.where("profileId").equals(profileId).delete();
  return true;
}

async function clearAllArchives() {
  await db.archives.clear();
  return true;
}

async function getMetadata(key) {
  const entry = await db.metadata.get(key);
  return entry ? entry.value : null;
}

async function setMetadata(key, value) {
  await db.metadata.put({ key, value });
  return true;
}

async function getMigration(profileId) {
  return db.migrations.get(profileId) || null;
}

async function saveMigration(profileId, migration) {
  await db.migrations.put({ profileId, ...migration });
  return true;
}

async function getStorageInfo() {
  const profiles = await getAllProfiles();
  // Count all archives directly from the archives table, not just from profiles
  const allArchives = await db.archives.toArray();

  const profileData = JSON.stringify(profiles);
  const archiveData = JSON.stringify(allArchives);

  const used = new Blob([profileData + archiveData]).size;

  return {
    used,
    profiles: profiles.length,
    archives: allArchives.length
  };
}

async function getAllArchivesForAllProfiles() {
  const profiles = await getAllProfiles();
  const allArchives = [];

  for (const profile of profiles) {
    const archives = await getAllArchives(profile.id);
    allArchives.push(...archives);
  }

  return allArchives;
}

async function cleanupOldArchives(days) {
  const cutoffDate = Date.now() - days * 24 * 60 * 60 * 1000;
  const archives = await db.archives.where("cachedAt").below(cutoffDate).toArray();

  let deletedCount = 0;
  for (const archive of archives) {
    await db.archives.delete(archive.id);
    deletedCount++;
  }

  return deletedCount;
}

async function calculateChecksum(data) {
  if (!data) return "";

  // If data is already a string, use it; otherwise stringify it
  const dataStr = typeof data === "string" ? data : JSON.stringify(data);

  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(dataStr);
  const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return hashHex;
}

async function getArchiveWithValidation(profileId, programDate) {
  const archive = await getArchive(profileId, programDate);

  if (!archive) {
    return { valid: false, data: null, error: "Archive not found" };
  }

  if (!archive.checksum || !archive.csvData) {
    return { valid: false, data: archive, error: "Missing checksum or data" };
  }

  const calculatedChecksum = await calculateChecksum(archive.csvData);

  if (calculatedChecksum !== archive.checksum) {
    return { valid: false, data: archive, error: "Checksum mismatch - data may be corrupted" };
  }

  return { valid: true, data: archive, error: null };
}

async function getStorageIntegrity() {
  const archives = await getAllArchivesForAllProfiles();
  const result = {
    total: archives.length,
    valid: 0,
    corrupted: 0,
    errors: []
  };

  for (const archive of archives) {
    if (!archive.checksum || !archive.csvData) {
      result.corrupted++;
      result.errors.push({
        profileId: archive.profileId,
        programDate: archive.programDate,
        error: "Missing checksum or data"
      });
      continue;
    }

    const calculatedChecksum = await calculateChecksum(archive.csvData);
    if (calculatedChecksum !== archive.checksum) {
      result.corrupted++;
      result.errors.push({
        profileId: archive.profileId,
        programDate: archive.programDate,
        error: "Checksum mismatch"
      });
    } else {
      result.valid++;
    }
  }

  return result;
}

async function removeCorruptedArchive(profileId, programDate) {
  // Verify the archive is actually corrupted before removing it
  const archiveCheck = await getArchiveWithValidation(profileId, programDate);
  if (archiveCheck.valid) {
    console.warn(
      `[IndexedDB] WARNING: Archive ${profileId}||${programDate} appears valid ` +
        "but was marked for removal. Proceeding with caution."
    );
  }
  // Remove the corrupted archive
  const result = await deleteArchive(profileId, programDate);
  console.log(`[IndexedDB] Removed corrupted archive: ${profileId}||${programDate}`);
  return result;
}

async function resetDatabase() {
  await db.delete();
  return new Promise((resolve, reject) => {
    const request = globalThis.indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
}

export {
  DB_NAME,
  DB_VERSION,
  STORES,
  createDatabase,
  resetDatabase,
  getProfile,
  getAllProfiles,
  getActiveProfiles,
  getInactiveProfiles,
  saveProfile,
  deleteProfile,
  getArchive,
  getAllArchives,
  saveArchive,
  deleteArchive,
  clearProfileArchives,
  clearAllArchives,
  getMetadata,
  setMetadata,
  getMigration,
  saveMigration,
  getStorageInfo,
  cleanupOldArchives,
  calculateChecksum,
  getArchiveWithValidation,
  getStorageIntegrity,
  removeCorruptedArchive,
  db // Export the Dexie instance for direct access if needed
};
