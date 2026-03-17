/**
 * ProfileManager.js
 * Manages profiles using IndexedDB for persistence.
 */

import {
  getProfile as dbGetProfile,
  getAllProfiles as dbGetAllProfiles,
  getActiveProfiles as dbGetActiveProfiles,
  getInactiveProfiles as dbGetInactiveProfiles,
  saveProfile as dbSaveProfile,
  deleteProfile as dbDeleteProfile,
  clearProfileArchives,
  createDatabase,
  getMetadata,
  setMetadata
} from "./IndexedDBManager.js";
import { clearHistory } from "../history.js";

const LEGACY_STORAGE_KEY = "meeting_program_profiles";
const LEGACY_SELECTED_KEY = "meeting_program_selected_id";
const SELECTED_PROFILE_KEY = "meeting_program_selected_id";
const APP_VERSION_KEY = "app_version";

let initialized = false;

// Detect if this is a version upgrade that needs reload
async function migrateFromOldDatabase(currentVersion) {
  try {
    console.log("[ProfileManager] Checking for old database to migrate...");
    console.log("[ProfileManager] Current app version:", currentVersion);
    
    // Get stored app version from metadata
    try {
      const storedVersion = await getMetadata(APP_VERSION_KEY);
      console.log("[ProfileManager] Stored app version:", storedVersion);
      
      // If version changed, we may need to reload after migration
      if (storedVersion && storedVersion !== currentVersion) {
        console.log(`[ProfileManager] Version changed from ${storedVersion} to ${currentVersion}`);
      }
    } catch (e) {
      console.log("[ProfileManager] No stored version found (first run or reset)");
    }
    
    // Check if old database "MeetingProgramDB" exists
    const databases = await indexedDB.databases();
    const hasOldDb = databases.some(db => db.name === "MeetingProgramDB");
    const hasNewDb = databases.some(db => db.name !== "MeetingProgramDB");
    
    if (!hasOldDb || !hasNewDb) {
      console.log("[ProfileManager] No migration needed - both databases don't exist");
      // Store current version for next time
      try {
        await setMetadata(APP_VERSION_KEY, currentVersion);
      } catch (e) {
        console.warn("[ProfileManager] Could not store version:", e);
      }
      return { migratedSuccessfully: false, shouldReload: false };
    }
    
    // Get profiles from new database first
    const newProfiles = await dbGetAllProfiles();
    if (newProfiles.length > 0) {
      console.log("[ProfileManager] New database already has profiles, skipping migration");
      // Store current version
      try {
        await setMetadata(APP_VERSION_KEY, currentVersion);
      } catch (e) {
        console.warn("[ProfileManager] Could not store version:", e);
      }
      return { migratedSuccessfully: false, shouldReload: false };
    }
    
    console.log("[ProfileManager] New database is empty, attempting to migrate from old database...");
    
    // Open old database and get profiles
    const oldProfiles = await new Promise((resolve, reject) => {
      const req = indexedDB.open("MeetingProgramDB");
      req.onsuccess = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains("profiles")) {
          db.close();
          resolve([]);
          return;
        }
        
        const tx = db.transaction("profiles", "readonly");
        const store = tx.objectStore("profiles");
        const getAllReq = store.getAll();
        
        getAllReq.onsuccess = () => {
          db.close();
          resolve(getAllReq.result);
        };
        getAllReq.onerror = () => {
          db.close();
          reject(getAllReq.error);
        };
      };
      req.onerror = () => reject(req.error);
    });
    
    if (!oldProfiles || oldProfiles.length === 0) {
      console.log("[ProfileManager] Old database has no profiles to migrate");
      try {
        await setMetadata(APP_VERSION_KEY, currentVersion);
      } catch (e) {
        console.warn("[ProfileManager] Could not store version:", e);
      }
      return { migratedSuccessfully: false, shouldReload: false };
    }
    
    console.log(`[ProfileManager] Found ${oldProfiles.length} profiles in old database, migrating...`);
    
    // Migrate each profile to new database
    for (const profile of oldProfiles) {
      try {
        await dbSaveProfile(profile);
        console.log(`[ProfileManager] Migrated profile: ${profile.unitName} with url: ${profile.url.substring(0, 80)}`);
      } catch (e) {
        console.warn("[ProfileManager] Failed to migrate profile:", e);
      }
    }
    
    // Try to set selected profile if one exists
    try {
      const selectedReq = await new Promise((resolve, reject) => {
        const req = indexedDB.open("MeetingProgramDB");
        req.onsuccess = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains("metadata")) {
            db.close();
            resolve(null);
            return;
          }
          
          const tx = db.transaction("metadata", "readonly");
          const store = tx.objectStore("metadata");
          const getReq = store.get("meeting_program_selected_id");
          
          getReq.onsuccess = () => {
            db.close();
            resolve(getReq.result?.value || null);
          };
          getReq.onerror = () => {
            db.close();
            reject(getReq.error);
          };
        };
        req.onerror = () => reject(req.error);
      });
      
      if (selectedReq) {
        await setMetadata("meeting_program_selected_id", selectedReq);
        console.log("[ProfileManager] Migrated selected profile ID");
      }
    } catch (e) {
      console.warn("[ProfileManager] Failed to migrate selected profile ID:", e);
    }
    
    // Delete old database
    try {
      await new Promise((resolve, reject) => {
        const req = indexedDB.deleteDatabase("MeetingProgramDB");
        req.onsuccess = () => {
          console.log("[ProfileManager] Deleted old MeetingProgramDB");
          resolve();
        };
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.warn("[ProfileManager] Failed to delete old database:", e);
    }
    
    console.log("[ProfileManager] Migration complete!");
    
    // Store current version to prevent re-migration
    try {
      await setMetadata(APP_VERSION_KEY, currentVersion);
      console.log("[ProfileManager] Stored app version:", currentVersion);
    } catch (e) {
      console.warn("[ProfileManager] Could not store version:", e);
    }
    
    return { migratedSuccessfully: true, shouldReload: true };
  } catch (e) {
    console.error("[ProfileManager] Old database migration failed:", e);
    return { migratedSuccessfully: false, shouldReload: false };
  }
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function validateUrl(url) {
  if (!url || typeof url !== "string") {
    return { valid: false, error: "URL is required" };
  }

  try {
    const urlObj = new URL(url);
    if (!urlObj.href.includes("docs.google.com/spreadsheets/")) {
      return { valid: false, error: "URL must be a Google Sheets URL" };
    }
    return { valid: true, error: null };
  } catch {
    return { valid: false, error: "Invalid URL format" };
  }
}

let migrationResult = { migratedSuccessfully: false, shouldReload: false };

export async function initProfileManager(currentVersion) {
  if (initialized) {
    return migrationResult;
  }
  await createDatabase();
  migrationResult = await migrateFromOldDatabase(currentVersion || "unknown");
  initialized = true;
  return migrationResult;
}

export function getMigrationResult() {
  return migrationResult;
}

export async function addProfile(url, unitName, stakeName) {
  await initProfileManager();

  const validation = validateUrl(url);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const allProfiles = await dbGetAllProfiles();
  const existingByUrl = allProfiles.find((p) => p.url === url);

  if (existingByUrl) {
    existingByUrl.lastUsed = Date.now();
    if (unitName) existingByUrl.unitName = unitName;
    if (stakeName) existingByUrl.stakeName = stakeName;
    await dbSaveProfile(existingByUrl);
    await selectProfile(existingByUrl.id);
    return existingByUrl;
  }

  const profile = {
    id: generateId(),
    url,
    unitName: unitName || "Unknown Unit",
    stakeName: stakeName || "Unknown Stake",
    lastUsed: Date.now(),
    archived: false
  };

  await dbSaveProfile(profile);
  await selectProfile(profile.id);
  return profile;
}

export async function selectProfile(id) {
  await initProfileManager();

  const profile = await dbGetProfile(id);
  if (!profile) {
    throw new Error("Profile not found");
  }

  profile.lastUsed = Date.now();
  await dbSaveProfile(profile);

  await setMetadata(SELECTED_PROFILE_KEY, id);
}

export async function getSelectedProfileId() {
  await initProfileManager();
  return await getMetadata(SELECTED_PROFILE_KEY);
}

export async function getCurrentProfile() {
  const id = await getSelectedProfileId();
  if (!id) return null;
  return await dbGetProfile(id);
}

export async function deactivateProfile(id) {
  await initProfileManager();

  const profile = await dbGetProfile(id);
  if (!profile) {
    throw new Error("Profile not found");
  }

  profile.inactive = true;
  profile.inactiveAt = Date.now();
  await dbSaveProfile(profile);

  const selectedId = await getSelectedProfileId();
  if (selectedId === id) {
    const profiles = await dbGetAllProfiles();
    const active = profiles.filter((p) => !p.inactive && p.id !== id);
    if (active.length > 0) {
      await selectProfile(active[0].id);
    } else {
      await setMetadata(SELECTED_PROFILE_KEY, null);
    }
  }
}

export async function reactivateProfile(id) {
  await initProfileManager();

  const profile = await dbGetProfile(id);
  if (!profile) {
    throw new Error("Profile not found");
  }

  profile.inactive = false;
  delete profile.inactiveAt;
  await dbSaveProfile(profile);
  await selectProfile(id);
}

export async function removeProfile(id) {
  await initProfileManager();

  await dbDeleteProfile(id);
  await clearProfileArchives(id);
  await clearHistory(id); // Clear history entries for deleted profile

  const selectedId = await getSelectedProfileId();
  if (selectedId === id) {
    const profiles = await dbGetAllProfiles();
    if (profiles.length > 0) {
      profiles.sort((a, b) => (b.lastUsed || 0) - (a.lastUsed || 0));
      await selectProfile(profiles[0].id);
    } else {
      await setMetadata(SELECTED_PROFILE_KEY, null);
    }
  }
}

export async function getProfiles() {
  await initProfileManager();
  return await dbGetAllProfiles();
}

export async function getActiveProfiles() {
  await initProfileManager();
  return await dbGetActiveProfiles();
}

export async function getInactiveProfiles() {
  await initProfileManager();
  return await dbGetInactiveProfiles();
}

export async function getProfileById(id) {
  await initProfileManager();
  return await dbGetProfile(id);
}

export async function searchProfiles(query) {
  await initProfileManager();

  if (!query || typeof query !== "string") {
    return await dbGetAllProfiles();
  }

  const lowerQuery = query.toLowerCase();
  const profiles = await dbGetAllProfiles();

  return profiles.filter(
    (p) =>
      p.unitName?.toLowerCase().includes(lowerQuery) ||
      p.stakeName?.toLowerCase().includes(lowerQuery) ||
      p.url?.toLowerCase().includes(lowerQuery)
  );
}

function createProfileFromLegacy(legacyProfile) {
  return {
    id: legacyProfile.id || generateId(),
    url: legacyProfile.url,
    unitName: legacyProfile.unitName || "Unknown Unit",
    stakeName: legacyProfile.stakeName || "Unknown Stake",
    lastUsed: legacyProfile.lastUsed || Date.now(),
    inactive: legacyProfile.inactive || false,
    inactiveAt: legacyProfile.inactiveAt || null
  };
}

async function migrateSingleProfile(legacyProfile, existingProfiles) {
  const existingByUrl = existingProfiles.find((p) => p.url === legacyProfile.url);
  if (!existingByUrl) {
    const profile = createProfileFromLegacy(legacyProfile);
    await dbSaveProfile(profile);
    return true;
  }
  return false;
}

async function restoreSelectedProfile(legacySelectedId) {
  if (!legacySelectedId) return;

  const profiles = await dbGetAllProfiles();
  const profile = profiles.find((p) => p.id === legacySelectedId);
  if (profile) {
    await setMetadata(SELECTED_PROFILE_KEY, profile.id);
  }
}

export async function migrateLegacyProfiles() {
  await initProfileManager();

  try {
    const legacyData = localStorage.getItem(LEGACY_STORAGE_KEY);
    const legacySelectedId = localStorage.getItem(LEGACY_SELECTED_KEY);

    if (!legacyData) {
      return { success: true, migrated: 0, message: "No legacy profiles found" };
    }

    const legacyProfiles = JSON.parse(legacyData);
    if (!Array.isArray(legacyProfiles) || legacyProfiles.length === 0) {
      return { success: true, migrated: 0, message: "No legacy profiles to migrate" };
    }

    const existingProfiles = await dbGetAllProfiles();
    let migratedCount = 0;

    for (const legacyProfile of legacyProfiles) {
      const migrated = await migrateSingleProfile(legacyProfile, existingProfiles);
      if (migrated) {
        migratedCount++;
      }
    }

    await restoreSelectedProfile(legacySelectedId);

    localStorage.removeItem(LEGACY_STORAGE_KEY);
    localStorage.removeItem(LEGACY_SELECTED_KEY);

    return {
      success: true,
      migrated: migratedCount,
      message: `Migrated ${migratedCount} profiles`
    };
  } catch (error) {
    console.error("Migration failed:", error);
    return { success: false, migrated: 0, message: error.message };
  }
}

export async function hasLegacyProfiles() {
  const legacyData = localStorage.getItem(LEGACY_STORAGE_KEY);
  return legacyData !== null;
}
