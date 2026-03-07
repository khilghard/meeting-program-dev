/**
 * IndexedDBManager.js
 * Manages IndexedDB storage for profiles, archives, metadata, and migrations.
 */

const DB_NAME = "MeetingProgramDB";
const DB_VERSION = 2;
const STORES = ["profiles", "archives", "metadata", "migrations"];

let dbInstance = null;

/**
 * Create indexes for a given object store if they don't exist.
 */
function ensureIndexes(store, indexArray) {
  if (!store || !store.indexNames) return;
  for (const indexConfig of indexArray) {
    const indexName = typeof indexConfig === "string" ? indexConfig : indexConfig.name;
    try {
      if (!store.indexNames.contains(indexName)) {
        if (typeof indexConfig === "object") {
          store.createIndex(indexConfig.name, indexConfig.keyPath, indexConfig.options);
        } else if (indexName === "profileId_programDate") {
          store.createIndex(indexName, ["profileId", "programDate"], { unique: true });
        } else {
          store.createIndex(indexName, indexName, { unique: false });
        }
      }
    } catch (error) {
      // Index creation might fail if in certain transaction modes
    }
  }
}

async function validateAndFixSchema(db) {
  try {
    const requiredIndexes = {
      profiles: ["url", "lastUsed"],
      archives: ["profileId", "programDate", "profileId_programDate"]
    };

    // Check profiles store
    if (db.objectStoreNames.contains("profiles")) {
      try {
        const tx = db.transaction(["profiles"], "readonly");
        const store = tx.objectStore("profiles");
        for (const indexName of requiredIndexes.profiles) {
          if (!store.indexNames?.contains(indexName)) {
            return true;
          }
        }
      } catch (error) {
        console.warn("[IndexedDB] Profiles store validation error:", error);
        return true;
      }
    }

    // Check archives store
    if (db.objectStoreNames.contains("archives")) {
      try {
        const tx = db.transaction(["archives"], "readonly");
        const store = tx.objectStore("archives");
        for (const indexName of requiredIndexes.archives) {
          if (!store.indexNames?.contains(indexName)) {
            return true;
          }
        }
      } catch (error) {
        console.warn("[IndexedDB] Archives store validation error:", error);
        return true;
      }
    }

    return false;
  } catch (error) {
    console.warn("[IndexedDB] Schema validation error:", error);
    return true;
  }
}

function openDB() {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      resolve(dbInstance);
      return;
    }

    let attempt = 0;

    const tryOpen = (version) => {
      attempt++;

      const request =
        typeof version === "number"
          ? globalThis.indexedDB.open(DB_NAME, version)
          : globalThis.indexedDB.open(DB_NAME);

      request.onerror = () => {
        // Try without version if we get a VersionError
        if (attempt === 1 && request.error?.name === "VersionError") {
          tryOpen(); // Retry without version
          return;
        }
        reject(request.error);
      };

      request.onsuccess = () => {
        dbInstance = request.result;
        resolve(dbInstance);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        const tx = event.target.transaction;

        // Profiles store
        if (!db.objectStoreNames.contains("profiles")) {
          const profilesStore = db.createObjectStore("profiles", { keyPath: "id" });
          profilesStore.createIndex("url", "url", { unique: false });
          profilesStore.createIndex("lastUsed", "lastUsed", { unique: false });
        } else if (tx) {
          // Add missing indexes to existing store
          try {
            const store = tx.objectStore("profiles");
            if (store.indexNames && !store.indexNames.contains("url")) {
              store.createIndex("url", "url", { unique: false });
            }
            if (store.indexNames && !store.indexNames.contains("lastUsed")) {
              store.createIndex("lastUsed", "lastUsed", { unique: false });
            }
          } catch (error) {
            console.warn("[IndexedDB] Error adding profiles indexes:", error);
          }
        }

        // Archives store
        if (!db.objectStoreNames.contains("archives")) {
          const archivesStore = db.createObjectStore("archives", { keyPath: "id" });
          archivesStore.createIndex("profileId", "profileId", { unique: false });
          archivesStore.createIndex("programDate", "programDate", { unique: false });
          archivesStore.createIndex("profileId_programDate", ["profileId", "programDate"], {
            unique: true
          });
        } else if (tx) {
          // Add missing indexes to existing store
          try {
            const store = tx.objectStore("archives");
            if (store.indexNames && !store.indexNames.contains("profileId")) {
              store.createIndex("profileId", "profileId", { unique: false });
            }
            if (store.indexNames && !store.indexNames.contains("programDate")) {
              store.createIndex("programDate", "programDate", { unique: false });
            }
            if (store.indexNames && !store.indexNames.contains("profileId_programDate")) {
              store.createIndex("profileId_programDate", ["profileId", "programDate"], {
                unique: true
              });
            }
          } catch (error) {
            console.warn("[IndexedDB] Error adding archives indexes:", error);
          }
        }

        // Metadata store
        if (!db.objectStoreNames.contains("metadata")) {
          db.createObjectStore("metadata", { keyPath: "key" });
        }

        // Migrations store
        if (!db.objectStoreNames.contains("migrations")) {
          db.createObjectStore("migrations", { keyPath: "profileId" });
        }
      };
    };

    tryOpen();
  });
}

async function createDatabase() {
  return openDB();
}

async function getProfile(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["profiles"], "readonly");
    const store = transaction.objectStore("profiles");
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

async function getAllProfiles() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["profiles"], "readonly");
    const store = transaction.objectStore("profiles");
    try {
      const index = store.index("lastUsed");
      const request = index.getAll();

      request.onsuccess = () => {
        const profiles = request.result || [];
        profiles.sort((a, b) => (b.lastUsed || 0) - (a.lastUsed || 0));
        resolve(profiles);
      };
      request.onerror = () => reject(request.error);
    } catch (error) {
      // Index doesn't exist, manually get all and sort
      console.debug("[IndexedDB] Falling back to cursor iteration for getAllProfiles");
      const cursor = store.openCursor();
      const profiles = [];
      cursor.onsuccess = (event) => {
        const cur = event.target.result;
        if (cur) {
          profiles.push(cur.value);
          cur.continue();
        } else {
          profiles.sort((a, b) => (b.lastUsed || 0) - (a.lastUsed || 0));
          resolve(profiles);
        }
      };
      cursor.onerror = () => reject(cursor.error);
    }
  });
}

async function getActiveProfiles() {
  const profiles = await getAllProfiles();
  return profiles.filter((p) => !p.inactive);
}

async function getInactiveProfiles() {
  const profiles = await getAllProfiles();
  return profiles.filter((p) => p.inactive);
}

async function saveProfile(profile) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["profiles"], "readwrite");
    const store = transaction.objectStore("profiles");
    const request = store.put(profile);

    request.onsuccess = () => resolve(profile);
    request.onerror = () => reject(request.error);
  });
}

async function deleteProfile(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["profiles"], "readwrite");
    const store = transaction.objectStore("profiles");
    const request = store.delete(id);

    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
}

async function getArchive(profileId, programDate) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["archives"], "readonly");
    const store = transaction.objectStore("archives");
    try {
      const index = store.index("profileId_programDate");
      const request = index.get([profileId, programDate]);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    } catch (error) {
      // Index doesn't exist, manual search
      console.debug("[IndexedDB] Falling back to cursor iteration for getArchive");
      const cursor = store.openCursor();
      let result = null;
      cursor.onsuccess = (event) => {
        const cur = event.target.result;
        if (cur) {
          const val = cur.value;
          if (val && val.profileId === profileId && val.programDate === programDate) {
            result = val;
          }
          cur.continue();
        } else {
          resolve(result);
        }
      };
      cursor.onerror = () => reject(cursor.error);
    }
  });
}

async function getAllArchives(profileId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["archives"], "readonly");
    const store = transaction.objectStore("archives");
    try {
      const index = store.index("profileId");
      const request = index.getAll(profileId);
      request.onsuccess = () => {
        const archives = request.result || [];
        archives.sort((a, b) => (b.programDate || 0) - (a.programDate || 0));
        resolve(archives);
      };
      request.onerror = () => reject(request.error);
    } catch (error) {
      // Index doesn't exist, manual search
      console.debug("[IndexedDB] Falling back to cursor iteration for getAllArchives");
      const cursor = store.openCursor();
      const archives = [];
      cursor.onsuccess = (event) => {
        const cur = event.target.result;
        if (cur) {
          if (cur.value && cur.value.profileId === profileId) {
            archives.push(cur.value);
          }
          cur.continue();
        } else {
          archives.sort((a, b) => (b.programDate || 0) - (a.programDate || 0));
          resolve(archives);
        }
      };
      cursor.onerror = () => reject(cursor.error);
    }
  });
}

async function saveArchive(archive) {
  const db = await openDB();
  const checksum = await calculateChecksum(archive.csvData);
  const archiveWithChecksum = { ...archive, checksum };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["archives"], "readwrite");
    const store = transaction.objectStore("archives");
    const request = store.put(archiveWithChecksum);

    request.onsuccess = () => resolve(archiveWithChecksum);
    request.onerror = () => reject(request.error);
  });
}

async function deleteArchive(profileId, programDate) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["archives"], "readwrite");
    const store = transaction.objectStore("archives");
    try {
      const index = store.index("profileId_programDate");
      const request = index.getKey([profileId, programDate]);

      request.onsuccess = () => {
        if (request.result) {
          const deleteRequest = store.delete(request.result);
          deleteRequest.onsuccess = () => resolve(true);
          deleteRequest.onerror = () => reject(deleteRequest.error);
        } else {
          resolve(false);
        }
      };
      request.onerror = () => reject(request.error);
    } catch (error) {
      // Index doesn't exist, manual search and delete
      const cursor = store.openCursor();
      let found = false;
      cursor.onsuccess = (event) => {
        const cur = event.target.result;
        if (cur) {
          const val = cur.value;
          if (val && val.profileId === profileId && val.programDate === programDate) {
            cur.delete();
            found = true;
          }
          cur.continue();
        } else {
          resolve(found);
        }
      };
      cursor.onerror = () => reject(cursor.error);
    }
  });
}

async function clearProfileArchives(profileId) {
  const archives = await getAllArchives(profileId);
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["archives"], "readwrite");
    const store = transaction.objectStore("archives");

    archives.forEach((archive) => {
      store.delete(archive.id);
    });

    transaction.oncomplete = () => resolve(true);
    transaction.onerror = () => reject(transaction.error);
  });
}

async function clearAllArchives() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["archives"], "readwrite");
    const store = transaction.objectStore("archives");
    const request = store.clear();

    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
}

async function getMetadata(key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["metadata"], "readonly");
    const store = transaction.objectStore("metadata");
    const request = store.get(key);

    request.onsuccess = () => {
      const result = request.result;
      resolve(result ? result.value : null);
    };
    request.onerror = () => reject(request.error);
  });
}

async function setMetadata(key, value) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["metadata"], "readwrite");
    const store = transaction.objectStore("metadata");
    const request = store.put({ key, value });

    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
}

async function getMigration(profileId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["migrations"], "readonly");
    const store = transaction.objectStore("migrations");
    const request = store.get(profileId);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

async function saveMigration(profileId, migration) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["migrations"], "readwrite");
    const store = transaction.objectStore("migrations");
    const request = store.put({ profileId, ...migration });

    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
}

async function getStorageInfo() {
  const profiles = await getAllProfiles();
  const archives = await getAllArchivesForAllProfiles();

  const profileData = JSON.stringify(profiles);
  const archiveData = JSON.stringify(archives);

  const used = new Blob([profileData + archiveData]).size;

  return {
    used,
    profiles: profiles.length,
    archives: archives.length
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
  const profiles = await getAllProfiles();
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["archives"], "readwrite");
    const store = transaction.objectStore("archives");
    const request = store.openCursor();

    let deletedCount = 0;

    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        const archive = cursor.value;
        if (archive.cachedAt && archive.cachedAt < cutoffDate) {
          cursor.delete();
          deletedCount++;
        }
        cursor.continue();
      }
    };

    transaction.oncomplete = () => resolve(deletedCount);
    transaction.onerror = () => reject(transaction.error);
  });
}

async function calculateChecksum(data) {
  if (!data) return "";
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
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
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["archives"], "readwrite");
    const store = transaction.objectStore("archives");
    try {
      const index = store.index("profileId_programDate");
      const request = index.getKey([profileId, programDate]);

      request.onsuccess = () => {
        if (request.result) {
          const deleteRequest = store.delete(request.result);
          deleteRequest.onsuccess = () => resolve(true);
          deleteRequest.onerror = () => reject(deleteRequest.error);
        } else {
          resolve(false);
        }
      };
      request.onerror = () => reject(request.error);
    } catch (error) {
      // Index doesn't exist, manual search and delete
      const cursor = store.openCursor();
      let found = false;
      cursor.onsuccess = (event) => {
        const cur = event.target.result;
        if (cur) {
          const val = cur.value;
          if (val && val.profileId === profileId && val.programDate === programDate) {
            cur.delete();
            found = true;
          }
          cur.continue();
        } else {
          resolve(found);
        }
      };
      cursor.onerror = () => reject(cursor.error);
    }
  });
}

async function resetDatabase() {
  dbInstance = null;
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
  removeCorruptedArchive
};
