/**
 * profiles.js
 * Manages storage and retrieval of multiple program profiles.
 */

const STORAGE_KEY = "meeting_program_profiles";
const SELECTED_PROFILE_KEY = "meeting_program_selected_id";

/**
 * @typedef {Object} Profile
 * @property {string} id - Unique identifier (UUID or timestamp based)
 * @property {string} url - The Google Sheet URL
 * @property {string} unitName - Name of the Ward/Branch
 * @property {string} stakeName - Name of the Stake
 * @property {number} lastUsed - Timestamp of last usage
 */

/**
 * Generates a simple unique ID
 * @returns {string}
 */
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Retrieves all saved profiles
 * @returns {Profile[]}
 */
export function getProfiles() {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        console.error("Failed to parse profiles:", e);
        return [];
    }
}

/**
 * Saves the list of profiles
 * @param {Profile[]} profiles 
 */
function saveProfiles(profiles) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
}

/**
 * Adds a new profile. If a profile with the same URL exists, updates it.
 * @param {string} url 
 * @param {string} unitName 
 * @param {string} stakeName 
 * @returns {Profile} The added or updated profile
 */
export function addProfile(url, unitName, stakeName) {
    const profiles = getProfiles();
    const existingIndex = profiles.findIndex(p => p.url === url);

    const now = Date.now();
    let profile;

    if (existingIndex >= 0) {
        // Update existing
        profiles[existingIndex].unitName = unitName || profiles[existingIndex].unitName;
        profiles[existingIndex].stakeName = stakeName || profiles[existingIndex].stakeName;
        profiles[existingIndex].lastUsed = now;
        profile = profiles[existingIndex];
    } else {
        // Create new
        profile = {
            id: generateId(),
            url,
            unitName: unitName || "Unknown Unit",
            stakeName: stakeName || "Unknown Stake",
            lastUsed: now
        };
        profiles.push(profile);
    }

    saveProfiles(profiles);
    selectProfile(profile.id); // Auto-select on add
    return profile;
}

/**
 * Removes a profile by ID
 * @param {string} id 
 */
export function removeProfile(id) {
    let profiles = getProfiles();
    profiles = profiles.filter(p => p.id !== id);
    saveProfiles(profiles);

    // If we deleted the selected one, select the most recently used one remaining
    if (getSelectedProfileId() === id) {
        if (profiles.length > 0) {
            // Sort by lastUsed desc
            profiles.sort((a, b) => b.lastUsed - a.lastUsed);
            selectProfile(profiles[0].id);
        } else {
            localStorage.removeItem(SELECTED_PROFILE_KEY);
        }
    }
}

/**
 * Selects a profile to be the active one
 * @param {string} id 
 */
export function selectProfile(id) {
    localStorage.setItem(SELECTED_PROFILE_KEY, id);

    // Also update the legacy key for backward compatibility if needed, 
    // or just so main.js can use it easily if we want to keep that pattern.
    // But strictly speaking, main.js should likely ask profiles.js for the current URL.
    const profile = getProfileById(id);
    if (profile) {
        // Update the timestamp
        updateProfileTimestamp(id);
    }
}

/**
 * Updates the lastUsed timestamp for a profile
 * @param {string} id 
 */
function updateProfileTimestamp(id) {
    const profiles = getProfiles();
    const profile = profiles.find(p => p.id === id);
    if (profile) {
        profile.lastUsed = Date.now();
        saveProfiles(profiles);
    }
}

/**
 * Gets the ID of the currently selected profile
 * @returns {string|null}
 */
export function getSelectedProfileId() {
    return localStorage.getItem(SELECTED_PROFILE_KEY);
}

/**
 * Gets a profile by ID
 * @param {string} id 
 * @returns {Profile|undefined}
 */
export function getProfileById(id) {
    const profiles = getProfiles();
    return profiles.find(p => p.id === id);
}

/**
 * Gets the currently active profile object
 * @returns {Profile|null}
 */
export function getCurrentProfile() {
    const id = getSelectedProfileId();
    if (!id) return null;
    return getProfileById(id) || null;
}
