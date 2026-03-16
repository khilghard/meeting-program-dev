/**
 * editor.js
 *
 * Editor page initialization and state management
 * This is a simplified entry point that loads the editor interface
 */

import * as Profiles from "./data/ProfileManager.js";
import EditorStateManager from "./data/EditorStateManager.js";
import SheetEditor from "./components/SheetEditor.mjs";
import { fetchSheet, parseCSV } from "./utils/csv.js";
import GoogleAuth from "./auth/googleAuth.js";
import SheetsAPI from "./services/sheetsApiService.js";

console.log("[Editor] editor.js loaded");

// State
let currentProfile = null;
let sheetEditor = null;
let sessionId = null;
let authToken = null;

/**
 * Initialize the editor page
 */
async function initializeEditor() {
  try {
    console.log("[Editor] Initializing editor page");

    // Initialize Google Auth
    await initializeAuth();

    // Show auth status section
    const authStatus = document.getElementById("auth-status");
    const signInBtn = document.getElementById("sign-in-btn");
    if (authStatus) {
      authStatus.classList.remove("hidden");
    }
    if (signInBtn) {
      signInBtn.classList.remove("hidden");
    }

    // Hide loading modal for editor page
    const pageContainer = document.getElementById("page-container");
    if (pageContainer) {
      pageContainer.classList.remove("loading");
    }

    // Initialize profiles
    console.log("[Editor] Calling initProfileManager");
    await Profiles.initProfileManager();
    console.log("[Editor] initProfileManager completed");

    // Get current profile
    console.log("[Editor] Getting current profile");
    currentProfile = await Profiles.getCurrentProfile();
    console.log("[Editor] getCurrentProfile result:", currentProfile);

    if (!currentProfile) {
      console.log("[Editor] No current profile, loading all profiles");
      const profiles = await Profiles.getProfiles();
      console.log("[Editor] All profiles:", profiles);
      if (profiles && profiles.length > 0) {
        currentProfile = profiles[0];
        console.log("[Editor] Selected first profile:", currentProfile);
      }
    }

    if (!currentProfile || !currentProfile.url) {
      console.log("[Editor] No profile or URL found");
      showError("No program loaded. Please add a program first from the main page.");
      return;
    }

    console.log("[Editor] Loaded profile:", currentProfile.unitName);
    console.log("[Editor] Sheet URL:", currentProfile.url);

    // Fetch and parse sheet data
    console.log("[Editor] Fetching sheet data");
    const csvData = await fetchSheet(currentProfile.url);
    console.log("[Editor] Sheet data fetched, rows:", csvData.length);

    if (!csvData || csvData.length === 0) {
      showError("Could not load sheet data. Please check your connection.");
      return;
    }

    // Convert CSV to raw array format for SheetEditor (handle both object and array formats)
    let rawRows;
    if (Array.isArray(csvData) && csvData.length > 0 && !Array.isArray(csvData[0])) {
      // If we get {key, value} objects (not arrays), convert to array format [key, value, "", "", ""]
      // Note: Must check !Array.isArray(csvData[0]) because arrays are also "objects" in JS
      rawRows = [["key", "en", "es", "fr", "swa"]]; // Header row
      csvData.forEach((item) => {
        if (item.key) {
          rawRows.push([item.key, item.value || "", "", "", ""]);
        }
      });
    } else if (Array.isArray(csvData)) {
      // Already array format, use as-is
      rawRows = csvData;
    } else {
      showError("Unexpected CSV data format");
      return;
    }

    console.log("[Editor] Converted to raw rows format:", rawRows.length, "rows");
    console.log("[Editor] First 3 rows of raw data:", rawRows.slice(0, 3));

    // Create session
    sessionId = await EditorStateManager.startSession(currentProfile.id, currentProfile.url);
    console.log("[Editor] Session started:", sessionId);

    // Initialize editor component - pass raw CSV data
    const editorContainer = document.getElementById("editor-container");
    if (!editorContainer) {
      showError("Editor container not found in HTML.");
      return;
    }

    // Show editor container and header
    editorContainer.classList.remove("hidden");
    const header = document.getElementById("editor-header");
    if (header) header.classList.remove("hidden");

    sheetEditor = new SheetEditor("editor-container", {
      languages: ["en", "es", "fr", "swa"],
      onChangeCallback: (data) => {
        console.log("[Editor] Change recorded:", data.key, data.language);
      },
      onSaveCallback: async (data) => {
        console.log("[Editor] Changes saved to local:", data.rowCount);

        // Upload to Google Sheets if authenticated
        if (authToken) {
          const csv = sheetEditor.exportCSV();
          const result = await uploadToGoogleSheets(csv);
          if (result.success) {
            console.log("[Editor] Uploaded to Google Sheets:", result.rowsWritten, "rows");
            sheetEditor.updateStatusBar("Saved locally and uploaded to Google Sheets!");
          } else {
            console.error("[Editor] Upload failed:", result.error);
            sheetEditor.updateStatusBar("Saved locally but upload failed: " + result.error);
          }
        } else {
          sheetEditor.updateStatusBar("Saved locally. Sign in to upload to Google Sheets.");
        }
      }
    });

    await sheetEditor.initialize(sessionId, rawRows);

    // Listen for import requests
    document.addEventListener("import-requested", async (e) => {
      await handleImport();
    });

    // Setup navigation
    setupNavigation();
    setupTheme();

    console.log("[Editor] Editor initialized successfully");
  } catch (error) {
    console.error("[Editor] Initialization failed:", error);
    showError("Failed to initialize editor: " + error.message);
  }
}

/**
 * Setup navigation
 */
function setupNavigation() {
  // The back button is handled by the link itself in the HTML
  // No additional setup needed

  // Setup sign-out button if exists
  const signOutBtn = document.getElementById("sign-out-btn");
  if (signOutBtn) {
    signOutBtn.addEventListener("click", () => {
      console.log("[Editor] User requested sign out");
      window.location.href = window.location.pathname + "?logout=true";
    });
  }
}

/**
 * Handle import from current profile
 */
async function handleImport() {
  console.log("[Editor] Importing from current profile");
  try {
    const csvData = await fetchSheet(currentProfile.url);
    if (!csvData || csvData.length === 0) {
      alert("Could not load data from current profile");
      return;
    }

    // Convert to raw rows format
    let rawRows;
    if (Array.isArray(csvData) && csvData.length > 0 && !Array.isArray(csvData[0])) {
      // If we get {key, value} objects (not arrays), convert to array format
      // Note: Must check !Array.isArray because arrays are also "objects" in JS
      rawRows = [["key", "en", "es", "fr", "swa"]];
      csvData.forEach((item) => {
        if (item.key) {
          rawRows.push([item.key, item.value || "", "", "", ""]);
        }
      });
    } else {
      rawRows = csvData;
    }

    // Reload editor with imported data
    if (sheetEditor) {
      sheetEditor.csvData = rawRows;
      sheetEditor.rows = rawRows.slice(1);
      sheetEditor.currentRowIndex = 0;
      sheetEditor.selectedLanguage = "en";
      sheetEditor.render();
      sheetEditor.populateKeyDropdown();
      sheetEditor.selectRow(0);
      console.log("[Editor] Data imported successfully");
    }
  } catch (error) {
    console.error("[Editor] Import failed:", error);
    alert("Failed to import data: " + error.message);
  }
}

/**
 * Initialize Google Auth
 */
async function initializeAuth() {
  // Wait for Google Identity Services to load
  await waitForGoogleLib();

  const clientId = window.GOOGLE_CLIENT_ID;

  if (!clientId || clientId === "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com") {
    console.warn("[Editor] Google Client ID not configured. Sign-in will not be available.");
    showAuthMessage(
      "Google sign-in not configured. Edit editor.html to add your Google OAuth Client ID."
    );
    return;
  }

  const redirectUri = window.location.origin + window.location.pathname;

  try {
    GoogleAuth.initialize(clientId, redirectUri);
    console.log("[Editor] GoogleAuth initialized");

    // Set up sign-in button
    const signInBtn = document.getElementById("sign-in-btn");
    if (signInBtn) {
      signInBtn.addEventListener("click", handleSignIn);
    }

    // Check if already authenticated
    if (GoogleAuth.isAuthenticated()) {
      const token = GoogleAuth.getAccessToken();
      if (token) {
        authToken = token;
        SheetsAPI.initialize(token);
        console.log("[Editor] Already authenticated with token");
        updateAuthUI(true);
      }
    }
  } catch (error) {
    console.error("[Editor] Auth initialization failed:", error);
    showAuthMessage("Failed to initialize Google sign-in: " + error.message);
  }
}

/**
 * Wait for Google Identity Services library to load
 */
function waitForGoogleLib() {
  return new Promise((resolve) => {
    if (typeof google !== "undefined" && google.accounts) {
      resolve();
      return;
    }

    // Check every 100ms
    const interval = setInterval(() => {
      if (typeof google !== "undefined" && google.accounts) {
        clearInterval(interval);
        console.log("[Editor] Google Identity Services loaded");
        resolve();
      }
    }, 100);

    // Timeout after 10 seconds
    setTimeout(() => {
      clearInterval(interval);
      console.warn("[Editor] Google Identity Services timed out loading");
      resolve();
    }, 10000);
  });
}

/**
 * Handle sign-in button click
 */
async function handleSignIn() {
  try {
    console.log("[Editor] Starting sign-in");
    const result = await GoogleAuth.signIn();

    if (result && result.token) {
      authToken = result.token;
      SheetsAPI.initialize(authToken);
      console.log("[Editor] Sign-in successful, token:", authToken.substring(0, 20) + "...");
      updateAuthUI(true);
    } else {
      console.log("[Editor] Sign-in cancelled or failed");
      showAuthMessage("Sign-in cancelled");
    }
  } catch (error) {
    console.error("[Editor] Sign-in error:", error);
    showAuthMessage("Sign-in failed: " + error.message);
  }
}

/**
 * Update auth UI based on authentication state
 */
function updateAuthUI(isAuthenticated) {
  const signInBtn = document.getElementById("sign-in-btn");
  const authMessage = document.getElementById("auth-message");

  if (isAuthenticated) {
    if (signInBtn) {
      signInBtn.textContent = "Signed In";
      signInBtn.disabled = true;
    }
    if (authMessage) {
      authMessage.textContent = "Ready to edit and save";
    }
  }
}

/**
 * Show auth message
 */
function showAuthMessage(message) {
  const authMessage = document.getElementById("auth-message");
  if (authMessage) {
    authMessage.textContent = message;
  }
}

/**
 * Upload CSV to Google Sheets
 */
async function uploadToGoogleSheets(csvData) {
  if (!authToken) {
    alert("Please sign in with Google to save changes to the sheet.");
    return { success: false, error: "Not authenticated" };
  }

  const sheetId = SheetsAPI.extractSheetIdFromUrl(currentProfile.url);
  if (!sheetId) {
    return { success: false, error: "Invalid sheet URL" };
  }

  console.log("[Editor] Uploading to sheet:", sheetId);
  const result = await SheetsAPI.uploadCSV(sheetId, csvData);

  if (result.success) {
    console.log("[Editor] Upload successful:", result.rowsWritten, "rows");
  } else {
    console.error("[Editor] Upload failed:", result.error);
  }

  return result;
}

/**
 * Setup theme toggle
 */
function setupTheme() {
  const themeToggle = document.getElementById("theme-toggle");
  if (!themeToggle) return;

  // Read current theme from data attribute
  const html = document.documentElement;
  const currentTheme = html.getAttribute("data-theme") || "light";

  // Update toggle appearance
  updateThemeToggle(currentTheme === "dark");

  themeToggle.addEventListener("click", () => {
    const isDark = html.getAttribute("data-theme") === "dark";
    const newTheme = isDark ? "light" : "dark";

    html.setAttribute("data-theme", newTheme);
    localStorage.setItem("theme", newTheme);
    updateThemeToggle(newTheme === "dark");

    console.log("[Editor] Theme switched to", newTheme);
  });
}

/**
 * Update theme toggle appearance
 */
function updateThemeToggle(isDark) {
  const themeToggle = document.getElementById("theme-toggle");
  if (!themeToggle) return;

  themeToggle.title = isDark ? "Switch to Light Mode" : "Switch to Dark Mode";
  themeToggle.textContent = isDark ? "☀️" : "🌓";
}

/**
 * Show error message
 */
function showError(message) {
  console.error("[Editor] Error:", message);

  // Show error in auth message area
  const authStatus = document.getElementById("auth-status");
  const authMessage = document.getElementById("auth-message");
  const loader = document.getElementById("editor-loading");

  if (authStatus) authStatus.classList.remove("hidden");
  if (loader) loader.classList.add("hidden");

  if (authMessage) {
    authMessage.textContent = "Error: " + message;
  }
}

/**
 * Cleanup on page unload
 */
window.addEventListener("beforeunload", async (event) => {
  if (sheetEditor && sheetEditor.getState) {
    const state = sheetEditor.getState();
    if (state.changeCount > 0) {
      event.preventDefault();
      event.returnValue = "You have unsaved changes. Are you sure you want to leave?";
    }
  }
});

// Start initialization when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeEditor);
} else {
  // DOM is already loaded
  console.log("[Editor] DOM already loaded, starting initialization immediately");
  initializeEditor();
}

// Export for testing
export { initializeEditor, sheetEditor, sessionId, currentProfile };
