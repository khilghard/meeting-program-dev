/**
 * MigrationSystem.js
 * Handles migration detection, validation, and user preferences.
 */

import {
  getMigration,
  saveMigration,
  createDatabase,
  getProfile as getProfileDB,
  saveProfile as saveProfileDB,
  getMetadata,
  setMetadata
} from "./IndexedDBManager.js";
import { initProfileManager, addProfile } from "./ProfileManager.js";

const MIGRATION_PREFERENCE_KEY = "migration_preference";

let initialized = false;

export async function initMigrationSystem() {
  if (initialized) return;
  await createDatabase();
  initialized = true;
}

export async function checkMigrationRequired(profileId, csvData) {
  await initMigrationSystem();

  if (!profileId || !csvData) {
    return { required: false, url: null, ignored: false };
  }

  // Check if user previously ignored migration for this profile
  const preference = await getMigrationPreference(profileId);
  if (preference && preference.ignored) {
    return { required: false, url: null, ignored: true };
  }

  // Check for 'obsolete' key in CSV data
  const isObsolete = csvData.some((row) => row.key === "obsolete" && row.value === "true");

  // Check for 'migrationUrl' key in CSV data
  const migrationUrlRow = csvData.find((row) => row.key === "migrationUrl");
  const migrationUrl = migrationUrlRow ? migrationUrlRow.value : null;

  // If both conditions are met, migration is required
  if (isObsolete && migrationUrl) {
    return { required: true, url: migrationUrl, ignored: false };
  }

  return { required: false, url: null, ignored: false };
}

export async function validateMigrationUrl(url) {
  await initMigrationSystem();

  if (!url || typeof url !== "string") {
    return { valid: false, data: null, error: "URL is required" };
  }

  // Validate URL format
  try {
    const urlObj = new URL(url);
    if (
      !urlObj.hostname.includes("docs.google.com") ||
      !urlObj.pathname.includes("/spreadsheets/")
    ) {
      return { valid: false, data: null, error: "URL must be a Google Sheets URL" };
    }
  } catch (e) {
    return { valid: false, data: null, error: "Invalid URL format" };
  }

  // Validate URL by fetching the actual content
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return { valid: false, data: null, error: "Failed to fetch Google Sheets data" };
    }

    // Parse the CSV content
    const csvText = await response.text();
    if (!csvText || csvText.length === 0) {
      return { valid: false, data: null, error: "Empty response from Google Sheets" };
    }

    // Extract unit name and stake name from CSV data
    const lines = csvText.split("\n");
    if (lines.length < 2) {
      return { valid: false, data: null, error: "Invalid CSV format" };
    }

    // Parse first row as headers
    const headers = lines[0].split(",").map((h) => h.trim());

    // Find unit name and stake name in data rows
    let unitName = "";
    let stakeName = "";

    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;

      const values = lines[i].split(",").map((v) => v.trim());

      // Look for unit name and stake name in common header positions
      const unitIndex =
        headers.indexOf("unitName") !== -1
          ? headers.indexOf("unitName")
          : headers.indexOf("unit") !== -1
            ? headers.indexOf("unit")
            : -1;
      const stakeIndex =
        headers.indexOf("stakeName") !== -1
          ? headers.indexOf("stakeName")
          : headers.indexOf("stake") !== -1
            ? headers.indexOf("stake")
            : -1;

      if (unitIndex !== -1 && values[unitIndex]) {
        unitName = values[unitIndex];
      }

      if (stakeIndex !== -1 && values[stakeIndex]) {
        stakeName = values[stakeIndex];
      }

      // If we found both, break
      if (unitName && stakeName) break;
    }

    // If we have valid data, return it
    if (unitName && stakeName) {
      return {
        valid: true,
        data: {
          unitName,
          stakeName
        },
        error: null
      };
    } else {
      return { valid: false, data: null, error: "Could not find required data in Google Sheets" };
    }
  } catch (error) {
    return {
      valid: false,
      data: null,
      error: "Network error fetching Google Sheets data: " + error.message
    };
  }
}

export async function getMigrationPreference(profileId) {
  await initMigrationSystem();

  if (!profileId) return null;

  const preference = await getMigration(profileId);

  if (!preference) return null;

  return {
    ignored: preference.ignored || false,
    lastChecked: preference.lastChecked || null
  };
}

export async function saveMigrationPreference(profileId, ignored) {
  await initMigrationSystem();

  if (!profileId) return false;

  const migrationRecord = {
    ignored: ignored,
    lastChecked: Date.now()
  };

  if (ignored) {
    // Store migration preference
    await saveMigration(profileId, migrationRecord);
    return true;
  } else {
    // Remove migration preference if confirmed
    await saveMigration(profileId, null);
    return true;
  }
}

export async function scheduleMigrationCheck(profileId) {
  await initMigrationSystem();

  if (!profileId) return;

  // In a real implementation, this would use the Background Sync API
  // For now, we'll just log that it's scheduled
  console.log(`[Migration] Scheduled check for profile ${profileId}`);
}

export async function executeMigrationCheck(profileId) {
  await initMigrationSystem();

  if (!profileId) return;

  // Get the current profile
  const profile = await getProfileDB(profileId);
  if (!profile) return;

  // Skip if user previously ignored
  const preference = await getMigrationPreference(profileId);
  if (preference && preference.ignored) return;

  // Simulate fetching current CSV data from Google Sheets
  // In reality, this would come from the live data source
  // For now, we'll use a placeholder
  const csvData = [];

  // Check for migration requirement
  const result = await checkMigrationRequired(profileId, csvData);

  if (result.required) {
    console.log(`[Migration] Migration required for profile ${profileId}: ${result.url}`);
    // In a real app, this would trigger the UI banner
    // We'll just update the lastChecked timestamp
  }

  // Update lastChecked timestamp
  await saveMigrationPreference(profileId, false);
}

export { MIGRATION_PREFERENCE_KEY };
