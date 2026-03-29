/**
 * Diagnostic Data Collector
 * Gathers all diagnostic information needed for troubleshooting
 * including console logs, localStorage, profile data, and URLs.
 */

import { getConsoleLogs } from "./console-capture.js";
import { getCurrentProfile } from "../profiles.js";
import { getLanguage } from "../i18n/index.js";
import { getTheme } from "../theme.js";

/**
 * @typedef {Object} DiagnosticData
 * @property {string} timestamp - ISO timestamp of collection
 * @property {string} userAgent - Browser user agent
 * @property {string} siteUrl - Current site URL
 * @property {string} googleSheetUrl - Google Sheet URL from profile
 * @property {Object} deviceInfo - Device and browser information
 * @property {Object|null} profile - Current profile data
 * @property {Object} localStorage - All localStorage entries
 * @property {Array} consoleLogs - Captured console logs
 */

/**
 * Collect all diagnostic data for troubleshooting
 * @returns {Promise<DiagnosticData>} Diagnostic data object
 */
export async function collectDiagnosticData() {
  const profile = getCurrentProfile();

  // Collect localStorage data, excluding sensitive keys
  const localStorageData = {};
  const excludedKeys = [
    // Add any keys you want to exclude for privacy/security
  ];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && !excludedKeys.includes(key)) {
      try {
        localStorageData[key] = localStorage.getItem(key);
      } catch {
        localStorageData[key] = "[Unable to access]";
      }
    }
  }

  // Collect console logs
  const consoleLogs = getConsoleLogs();

  // Build diagnostic data object
  const diagnosticData = {
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    siteUrl: window.location.href,
    googleSheetUrl: profile?.url || localStorage.getItem("sheetUrl") || "",
    deviceInfo: {
      language: getLanguage(),
      theme: getTheme(),
      isOnline: navigator.onLine,
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    },
    profile: profile
      ? {
        id: profile.id,
        unitName: profile.unitName,
        stakeName: profile.stakeName,
        lastUsed: new Date(profile.lastUsed).toISOString()
      }
      : null,
    localStorage: localStorageData,
    consoleLogs
  };

  return diagnosticData;
}

/**
 * Format diagnostic data as readable email body text
 * @param {DiagnosticData} data - Diagnostic data to format
 * @returns {string} Formatted email body
 */
export function formatDiagnosticEmail(data) {
  const lines = [];

  lines.push("=== DEVICE INFORMATION ===");
  lines.push(`Timestamp: ${data.timestamp}`);
  lines.push(`User Agent: ${data.userAgent}`);
  lines.push(`Online Status: ${data.deviceInfo.isOnline ? "Online" : "Offline"}`);
  lines.push(`Language: ${data.deviceInfo.language}`);
  lines.push(`Theme: ${data.deviceInfo.theme}`);
  lines.push(`Screen: ${data.deviceInfo.screenWidth}x${data.deviceInfo.screenHeight}`);
  lines.push(`Timezone: ${data.deviceInfo.timezone}`);
  lines.push("");

  lines.push("=== SITE INFORMATION ===");
  lines.push(`Site URL: ${data.siteUrl}`);
  lines.push(`Google Sheet URL: ${data.googleSheetUrl || "[Not set]"}`);
  lines.push("");

  if (data.profile) {
    lines.push("=== CURRENT PROFILE ===");
    lines.push(`Unit Name: ${data.profile.unitName}`);
    lines.push(`Stake Name: ${data.profile.stakeName}`);
    lines.push(`Last Used: ${data.profile.lastUsed}`);
    lines.push("");
  }

  lines.push("=== LOCAL STORAGE ===");
  if (Object.keys(data.localStorage).length === 0) {
    lines.push("[No localStorage data found]");
  } else {
    Object.entries(data.localStorage).forEach(([key, value]) => {
      // Truncate very long values
      const displayValue = value.length > 200 ? value.substring(0, 200) + "..." : value;
      lines.push(`${key}: ${displayValue}`);
    });
  }
  lines.push("");

  lines.push("=== CONSOLE LOGS ===");
  if (data.consoleLogs.length === 0) {
    lines.push("[No console logs captured]");
  } else {
    data.consoleLogs.forEach((log) => {
      const timestamp = new Date(log.timestamp).toLocaleTimeString();
      const level = log.level.toUpperCase().padEnd(6);
      lines.push(`[${timestamp}] ${level} ${log.message}`);
    });
  }

  return lines.join("\n");
}
