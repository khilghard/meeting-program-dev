/**
 * profiles.js
 * Manages storage and retrieval of multiple program profiles.
 * This is a wrapper around ProfileManager.js which uses IndexedDB.
 * Provides both async and sync access patterns.
 */

import {
  addProfile as pmAddProfile,
  selectProfile as pmSelectProfile,
  removeProfile as pmRemoveProfile,
  deactivateProfile as pmDeactivateProfile,
  reactivateProfile as pmReactivateProfile,
  getProfiles as pmGetProfiles,
  getInactiveProfiles as pmGetInactiveProfiles,
  getActiveProfiles as pmGetActiveProfiles,
  getSelectedProfileId as pmGetSelectedProfileId,
  getCurrentProfile as pmGetCurrentProfile,
  getProfileById as pmGetProfileById,
  initProfileManager
} from "./data/ProfileManager.js";

let cache = {
  profiles: [],
  selectedId: null,
  currentProfile: null,
  initialized: false
};

async function ensureInitialized() {
  if (!cache.initialized) {
    await initProfileManager();
    await refreshCache();
    cache.initialized = true;
  }
}

async function refreshCache() {
  cache.profiles = await pmGetProfiles();
  cache.selectedId = await pmGetSelectedProfileId();
  cache.currentProfile = cache.selectedId
    ? cache.profiles.find((p) => p.id === cache.selectedId) || null
    : null;
}

/**
 * @typedef {Object} Profile
 * @property {string} id - Unique identifier (UUID or timestamp based)
 * @property {string} url - The Google Sheet URL
 * @property {string} unitName - Name of the Ward/Branch
 * @property {string} stakeName - Name of the Stake
 * @property {number} lastUsed - Timestamp of last usage
 * @property {boolean} inactive - Whether profile is inactive
 */

/**
 * Retrieves all saved profiles (sync - uses cache)
 * @returns {Profile[]}
 */
export function getProfiles() {
  if (!cache.initialized) {
    console.warn("Profiles not initialized, returning empty array. Call initProfiles() first.");
    return [];
  }
  return cache.profiles;
}

/**
 * Gets all inactive profiles (sync - uses cache)
 * @returns {Profile[]}
 */
export function getInactiveProfiles() {
  if (!cache.initialized) {
    return [];
  }
  return cache.profiles.filter((p) => p.inactive);
}

/**
 * Gets all active profiles (sync - uses cache)
 * @returns {Profile[]}
 */
export function getActiveProfiles() {
  if (!cache.initialized) {
    return [];
  }
  return cache.profiles.filter((p) => !p.inactive);
}

/**
 * Adds a new profile. If a profile with the same URL exists, updates it.
 * If a different profile exists, deactivates it first.
 * @param {string} url
 * @param {string} unitName
 * @param {string} stakeName
 * @returns {Promise<Profile>} The added or updated profile
 */
export async function addProfile(url, unitName, stakeName) {
  await ensureInitialized();
  const profile = await pmAddProfile(url, unitName, stakeName);
  await refreshCache();
  return profile;
}

/**
 * Removes a profile by ID
 * @param {string} id
 */
export async function removeProfile(id) {
  await ensureInitialized();
  await pmRemoveProfile(id);
  await refreshCache();
}

/**
 * Deactivates a profile (soft delete - keeps data but marks as inactive)
 * @param {string} id
 */
export async function deactivateProfile(id) {
  await ensureInitialized();
  await pmDeactivateProfile(id);
  await refreshCache();
}

/**
 * Reactivates an inactive profile
 * @param {string} id
 */
export async function reactivateProfile(id) {
  await ensureInitialized();
  await pmReactivateProfile(id);
  await refreshCache();
}

/**
 * Selects a profile to be the active one
 * @param {string} id
 */
export async function selectProfile(id) {
  await ensureInitialized();
  await pmSelectProfile(id);
  await refreshCache();
}

/**
 * Gets the ID of the currently selected profile (sync - uses cache)
 * @returns {string|null}
 */
export function getSelectedProfileId() {
  if (!cache.initialized) {
    return null;
  }
  return cache.selectedId;
}

/**
 * Gets a profile by ID (sync - uses cache)
 * @returns {Profile|undefined}
 */
export function getProfileById(id) {
  if (!cache.initialized) {
    return undefined;
  }
  return cache.profiles.find((p) => p.id === id);
}

/**
 * Gets the currently active profile object (sync - uses cache)
 * @returns {Profile|null}
 */
export function getCurrentProfile() {
  if (!cache.initialized) {
    return null;
  }
  return cache.currentProfile;
}

/**
 * Initialize and load profiles - call this on app startup
 * @returns {Promise<void>}
 */
export async function initProfiles() {
  await ensureInitialized();
}
