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
 * @property {Object} pwaInfo - PWA/standalone detection info
 * @property {Object} urlResolution - URL resolution channel details
 */

/**
 * Detect PWA launch context
 * @returns {{isStandalone: boolean, isPwaInstalled: boolean, startUrl: string|null}}
 */
function detectPwaContext() {
  const isStandalone =
    globalThis.window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in globalThis.navigator && globalThis.navigator.standalone) ||
    globalThis.window.location.search.includes("standalone=true");

  const manifestEl = document.querySelector("link[rel=\"manifest\"]");
  const startUrl = manifestEl ? manifestEl.getAttribute("href") : null;
  let displayMode = "unknown";

  if (globalThis.window.matchMedia("(display-mode: standalone)").matches) {
    displayMode = "standalone";
  } else if (globalThis.window.matchMedia("(display-mode: minimal-ui)").matches) {
    displayMode = "minimal-ui";
  } else if (globalThis.window.matchMedia("(display-mode: browser)").matches) {
    displayMode = "browser";
  }

  return {
    isStandalone: isStandalone,
    isPwaInstalled:
      isStandalone ||
      (globalThis.window.innerWidth <= globalThis.window.screen.width &&
        globalThis.window.innerHeight <= globalThis.window.screen.height),
    startUrl: startUrl,
    displayMode,
    fullLaunchUrl: globalThis.window.location.href,
    hasQueryParams: globalThis.window.location.search.length > 0,
    queryParamKeys:
      globalThis.window.location.search.length > 0
        ? [...new URLSearchParams(globalThis.window.location.search).keys()]
        : []
  };
}

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

  // Detect PWA context
  const pwaInfo = detectPwaContext();

  // Determine which URL channel was used
  const params = new URLSearchParams(globalThis.window.location.search);
  const urlParam = params.get("url");
  const localStorageUrl = localStorage.getItem("sheetUrl");
  const currentProfileData = profile;

  let usedChannel = "none";
  let resolvedUrl = "";

  if (urlParam) {
    usedChannel = "url-params";
    resolvedUrl = urlParam;
  } else if (localStorageUrl) {
    usedChannel = "localStorage";
    resolvedUrl = localStorageUrl;
  } else if (currentProfileData?.url) {
    usedChannel = "profile";
    resolvedUrl = currentProfileData.url;
  } else {
    // Check IndexedDB legacy
    const { getMetadata } = await import("../data/IndexedDBManager.js");
    const legacyUrl = await getMetadata("legacy_sheetUrl");
    if (legacyUrl) {
      usedChannel = "indexeddb-legacy";
      resolvedUrl = legacyUrl;
    }
  }

  // Build diagnostic data object
  const profileSummary = profile
    ? {
      id: profile.id,
      unitName: profile.unitName,
      stakeName: profile.stakeName,
      lastUsed: new Date(profile.lastUsed).toISOString()
    }
    : null;

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
    profile: profileSummary,
    localStorage: localStorageData,
    consoleLogs,
    pwaInfo,
    urlResolution: {
      usedChannel,
      resolvedUrl: resolvedUrl || "[none]",
      urlParamPresent: !!urlParam,
      localStorageUrlPresent: !!localStorageUrl,
      profileUrlPresent: !!currentProfileData?.url,
      urlLength: urlParam?.length || 0,
      localStorageLength: localStorageUrl?.length || 0
    }
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

  if (data.pwaInfo) {
    lines.push("=== PWA LAUNCH INFO ===");
    lines.push(`PWA Installed: ${data.pwaInfo.isPwaInstalled ? "Yes" : "No"}`);
    lines.push(`Display Mode: ${data.pwaInfo.displayMode}`);
    lines.push(`Start URL: ${data.pwaInfo.startUrl || "[Not found]"}`);
    lines.push(`Launch URL has query params: ${data.pwaInfo.hasQueryParams ? "Yes" : "No"}`);
    lines.push(
      `Query param keys: ${data.pwaInfo.queryParamKeys?.length > 0 ? data.pwaInfo.queryParamKeys.join(", ") : "none"}`
    );
    lines.push(`Full launch URL: ${data.pwaInfo.fullLaunchUrl || "[unknown]"}`);
    lines.push("");
  }

  if (data.urlResolution) {
    lines.push("=== URL RESOLUTION ===");
    lines.push(`Channel used: ${data.urlResolution.usedChannel}`);
    lines.push(`Resolved URL: ${data.urlResolution.resolvedUrl}`);
    lines.push(`URL param present: ${data.urlResolution.urlParamPresent ? "Yes" : "No"}`);
    lines.push(
      `localStorage sheetUrl: ${data.urlResolution.localStorageUrlPresent ? "Yes" : "No"}`
    );
    lines.push(`Profile URL: ${data.urlResolution.profileUrlPresent ? "Yes" : "No"}`);
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
