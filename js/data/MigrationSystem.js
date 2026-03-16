/**
 * MigrationSystem.js
 * Handles migration detection, validation, and user preferences.
 */

import {
  getMigration,
  saveMigration,
  createDatabase,
  getProfile as getProfileDB
} from "./IndexedDBManager.js";

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
  if (preference?.ignored) {
    return { required: false, url: null, ignored: true };
  }

  // Check for 'obsolete' key in CSV data
  const isObsolete = csvData.some((row) => row.key === "obsolete" && row.value === "true");

  // Check for 'migrationUrl' key in CSV data
  const migrationUrlRow = csvData.find((row) => row.key === "migrationUrl");
  const migrationUrl = migrationUrlRow?.value ?? null;

  // If both conditions are met, migration is required
  if (isObsolete && migrationUrl) {
    return { required: true, url: migrationUrl, ignored: false };
  }

  return { required: false, url: null, ignored: false };
}

// Helper: Find header index by trying multiple names
function findHeaderIndex(headers, names) {
  for (const name of names) {
    const index = headers.indexOf(name);
    if (index !== -1) return index;
  }
  return -1;
}

// Helper: Validate URL format
function isValidGoogleSheetsUrl(urlObj) {
  return urlObj.hostname.includes("docs.google.com") && urlObj.pathname.includes("/spreadsheets/");
}

// Helper: Validate input parameters
function validateUrlInput(url) {
  if (!url || typeof url !== "string") {
    return { valid: false, error: "URL is required" };
  }
  return { valid: true };
}

// Helper: Validate URL format and fetch response
async function validateAndFetchUrl(url) {
  try {
    const urlObj = new URL(url);
    if (!isValidGoogleSheetsUrl(urlObj)) {
      return { valid: false, error: "URL must be a Google Sheets URL" };
    }
  } catch {
    return { valid: false, error: "Invalid URL format" };
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      return { valid: false, error: "Failed to fetch Google Sheets data" };
    }
    return { valid: true, response };
  } catch (error) {
    return {
      valid: false,
      error: "Network error fetching Google Sheets data: " + error.message
    };
  }
}

// Helper: Parse CSV text and validate headers
function validateCsvText(csvText) {
  if (!csvText || csvText.length === 0) {
    return { valid: false, error: "Empty response from Google Sheets" };
  }

  const lines = csvText.split("\n");
  if (lines.length < 2) {
    return { valid: false, error: "Invalid CSV format" };
  }

  const headers = lines[0].split(",").map((h) => h.trim());
  return { valid: true, headers, lines };
}

// Helper: Extract unit and stake names from CSV data
function extractUnitAndStakeNames(headers, lines) {
  const unitIndex = findHeaderIndex(headers, ["unitName", "unit"]);
  const stakeIndex = findHeaderIndex(headers, ["stakeName", "stake"]);
  
  let unitName = "";
  let stakeName = "";

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;

    const values = lines[i].split(",").map((v) => v.trim());

    if (unitIndex !== -1 && values[unitIndex]) {
      unitName = values[unitIndex];
    }

    if (stakeIndex !== -1 && values[stakeIndex]) {
      stakeName = values[stakeIndex];
    }

    if (unitName && stakeName) break;
  }

  return { unitName, stakeName };
}

export async function validateMigrationUrl(url) {
  await initMigrationSystem();

  const inputValidation = validateUrlInput(url);
  if (!inputValidation.valid) {
    return { valid: false, data: null, error: inputValidation.error };
  }

  const urlValidation = await validateAndFetchUrl(url);
  if (!urlValidation.valid) {
    return { valid: false, data: null, error: urlValidation.error };
  }

  const csvText = await urlValidation.response.text();
  const csvValidation = validateCsvText(csvText);
  if (!csvValidation.valid) {
    return { valid: false, data: null, error: csvValidation.error };
  }

  const { unitName, stakeName } = extractUnitAndStakeNames(
    csvValidation.headers,
    csvValidation.lines
  );

  if (unitName && stakeName) {
    return {
      valid: true,
      data: {
        unitName,
        stakeName
      },
      error: null
    };
  }

  return {
    valid: false,
    data: null,
    error: "Could not find required data in Google Sheets"
  };
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
  if (preference?.ignored) return;

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
