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

const LEGACY_STORAGE_KEY = "meeting_program_profiles";
const LEGACY_SELECTED_KEY = "meeting_program_selected_id";
const SELECTED_PROFILE_KEY = "meeting_program_selected_id";

let initialized = false;

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
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
  } catch (e) {
    return { valid: false, error: "Invalid URL format" };
  }
}

export async function initProfileManager() {
  if (initialized) return;
  await createDatabase();
  initialized = true;
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
      (p.unitName && p.unitName.toLowerCase().includes(lowerQuery)) ||
      (p.stakeName && p.stakeName.toLowerCase().includes(lowerQuery)) ||
      (p.url && p.url.toLowerCase().includes(lowerQuery))
  );
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
      const existingByUrl = existingProfiles.find((p) => p.url === legacyProfile.url);
      if (!existingByUrl) {
        const profile = {
          id: legacyProfile.id || generateId(),
          url: legacyProfile.url,
          unitName: legacyProfile.unitName || "Unknown Unit",
          stakeName: legacyProfile.stakeName || "Unknown Stake",
          lastUsed: legacyProfile.lastUsed || Date.now(),
          inactive: legacyProfile.inactive || false,
          inactiveAt: legacyProfile.inactiveAt || null
        };
        await dbSaveProfile(profile);
        migratedCount++;
      }
    }

    if (legacySelectedId) {
      const profiles = await dbGetAllProfiles();
      const profile = profiles.find((p) => p.id === legacySelectedId);
      if (profile) {
        await setMetadata(SELECTED_PROFILE_KEY, profile.id);
      }
    }

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
