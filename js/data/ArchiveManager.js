/**
 * ArchiveManager.js
 * Manages program archives using IndexedDB for persistence.
 */

import {
  getArchive,
  getAllArchives,
  saveArchive,
  deleteArchive,
  clearProfileArchives as clearProfileArchivesDB,
  clearAllArchives as clearAllArchivesDB,
  getStorageInfo as getIDBStorageInfo,
  cleanupOldArchives,
  calculateChecksum,
  getArchiveWithValidation,
  getStorageIntegrity,
  removeCorruptedArchive,
  getAllProfiles,
  createDatabase
} from "./IndexedDBManager.js";

const MAX_SIZE_BYTES = 10 * 1024 * 1024;
const WARNING_THRESHOLD_BYTES = 8 * 1024 * 1024;
const MAX_AGE_DAYS = 730;

let initialized = false;

function generateArchiveId(profileId, programDate) {
  return `${profileId}||${programDate}`;
}

function isContentEqual(csv1, csv2) {
  if (!csv1 || !csv2) return false;
  if (typeof csv1 === "string" && typeof csv2 === "string") {
    return csv1 === csv2;
  }
  return JSON.stringify(csv1) === JSON.stringify(csv2);
}

export async function initArchiveManager() {
  if (initialized) return;
  await createDatabase();
  initialized = true;
}

export async function autoArchive(profileId, programDate, csvData, options = {}) {
  await initArchiveManager();

  if (!profileId || !programDate || !csvData) {
    return { archived: false, reason: "missing_params" };
  }

  const { force = false, profileUrl = null } = options;

  const existing = await getArchive(profileId, programDate);

  const now = Date.now();

  if (existing) {
    if (!force && isContentEqual(existing.csvData, csvData)) {
      return { archived: false, reason: "no_changes" };
    }

    existing.csvData = csvData;
    existing.profileUrl = profileUrl || existing.profileUrl;
    existing.cachedAt = now;
    await saveArchive(existing);

    return {
      archived: true,
      updated: true,
      warning: await checkStorageWarning(),
      size: await getStorageSize()
    };
  }

  const newArchive = {
    id: generateArchiveId(profileId, programDate),
    profileId,
    programDate,
    csvData,
    profileUrl,
    cachedAt: now
  };

  await saveArchive(newArchive);

  return {
    archived: true,
    updated: false,
    warning: await checkStorageWarning(),
    size: await getStorageSize()
  };
}

export async function getProfileArchives(profileId) {
  await initArchiveManager();

  if (!profileId) return [];

  const archives = await getAllArchives(profileId);

  return archives.sort((a, b) => {
    const dateA = new Date(a.programDate || "");
    const dateB = new Date(b.programDate || "");
    return dateB - dateA;
  });
}

export async function getArchiveEntry(profileId, programDate) {
  await initArchiveManager();
  return await getArchive(profileId, programDate);
}

export async function getLatestArchive(profileId) {
  await initArchiveManager();

  const archives = await getAllArchives(profileId);
  if (archives.length === 0) return null;

  return archives.reduce((latest, current) => {
    if (!latest) return current;
    const latestDate = new Date(latest.programDate || "");
    const currentDate = new Date(current.programDate || "");
    return currentDate > latestDate ? current : latest;
  });
}

export async function verifyArchive(archive) {
  if (!archive || !archive.id) {
    return { valid: false, error: "Invalid archive" };
  }

  const profileId = archive.profileId;
  const programDate = archive.programDate;

  return await getArchiveWithValidation(profileId, programDate);
}

export async function handleCorruption(profileId, programDate) {
  await initArchiveManager();
  await removeCorruptedArchive(profileId, programDate);
}

export async function getStorageInfo() {
  await initArchiveManager();

  const info = await getIDBStorageInfo();

  return {
    totalSizeBytes: info.used,
    totalSizeMB: (info.used / (1024 * 1024)).toFixed(2),
    profiles: info.profiles,
    totalEntries: info.archives,
    maxSizeBytes: MAX_SIZE_BYTES,
    maxSizeMB: (MAX_SIZE_BYTES / (1024 * 1024)).toFixed(2),
    warning: info.used > WARNING_THRESHOLD_BYTES
  };
}

async function getStorageSize() {
  const info = await getIDBStorageInfo();
  return info.used;
}

async function checkStorageWarning() {
  const size = await getStorageSize();
  return size > WARNING_THRESHOLD_BYTES;
}

export async function cleanupBySize() {
  await initArchiveManager();

  const info = await getStorageInfo();
  if (info.totalSizeBytes <= WARNING_THRESHOLD_BYTES) {
    return { cleaned: false, removedCount: 0 };
  }

  const allArchives = [];
  const profiles = await getAllProfiles();

  for (const profile of profiles) {
    const archives = await getAllArchives(profile.id);
    for (const archive of archives) {
      allArchives.push(archive);
    }
  }

  allArchives.sort((a, b) => (a.cachedAt || 0) - (b.cachedAt || 0));

  let currentSize = 0;
  let removedCount = 0;
  const newestCount = Math.min(10, allArchives.length);

  for (let i = 0; i < allArchives.length - newestCount; i++) {
    const archive = allArchives[i];
    const size = JSON.stringify(archive.csvData).length;
    currentSize += size;

    if (currentSize > WARNING_THRESHOLD_BYTES && i < allArchives.length - newestCount) {
      await deleteArchive(archive.profileId, archive.programDate);
      removedCount++;
    }
  }

  return { cleaned: true, removedCount };
}

export async function cleanupByAge() {
  await initArchiveManager();

  const deleted = await cleanupOldArchives(MAX_AGE_DAYS);
  return { cleaned: true, removedCount: deleted };
}

export async function clearProfileArchives(profileId) {
  await initArchiveManager();
  return await clearProfileArchivesDB(profileId);
}

export async function clearAllArchives() {
  await initArchiveManager();
  return await clearAllArchivesDB();
}

export async function getStorageIntegrityReport() {
  await initArchiveManager();
  return await getStorageIntegrity();
}

export { deleteArchive };
export { MAX_SIZE_BYTES, WARNING_THRESHOLD_BYTES, MAX_AGE_DAYS };
