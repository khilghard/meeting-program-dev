import { showScanner, extractSheetUrl } from "./qr.js";
import * as Profiles from "./profiles.js";
import { hasLegacyProfiles, migrateLegacyProfiles } from "./data/ProfileManager.js";
import * as ArchiveManager from "./data/ArchiveManager.js";
import { initArchiveManager } from "./data/ArchiveManager.js";
import { t, getLanguage, initI18n, setLanguage } from "./i18n/index.js";
import { fetchSheet, parseCSV, sanitizeSheetUrl } from "./utils/csv.js";
import { isSafeUrl } from "./sanitize.js";
import { createWorker } from "./workers/workerInterface.js";
import { initConsoleCapture } from "./utils/console-capture.js";
import { initDiagnosticButton } from "./components/diagnostic-button.js";
import {
  renderers,
  renderProgram,
  renderUnitName,
  renderUnitAddress,
  renderDate,
  renderLineBreak,
  splitHymn,
  splitLeadership,
  appendRow,
  appendRowHymn,
  renderSpeaker,
  renderLeader,
  renderGeneralStatementWithLink,
  renderGeneralStatement,
  renderLink,
  renderLinkWithSpace,
  normalizeRenderableKey
} from "./utils/renderers.js";
import { saveProgramHistory, getProgramHistory, cleanupHistory } from "./history.js";
import { getMetadata, setMetadata } from "./data/IndexedDBManager.js";
import { initShareUI, promptPWAInstall, openHelpModal } from "./share.js";
import { checkMigrationRequired } from "./data/MigrationSystem.js";
import { initAgendaSettings } from "./agenda/AgendaSettings.js";
import { clearElement, setText, createTextElement } from "./utils/dom-utils.js";
import { showMigrationBanner } from "./data/MigrationBanner.js";
import { initTheme, toggleTheme, getTheme, applyTheme } from "./theme.js";
import { createTimer, clearTimer, clearAllTimers } from "./utils/timer-manager.js";
import { isAgendaKey, isBusinessKey, isLessonKey, LESSON_ICONS } from "./agenda/constants.js";

/* global MessageChannel */

// DIAGNOSTIC: Initialize console capture first, before any other logging
initConsoleCapture();

// DIAGNOSTIC: Log that main.js has loaded
console.log("[MAIN] main.js module loaded - version from package");

// ------------------------------------------------------------------
// Leadership Agenda State
// ------------------------------------------------------------------
let leadershipState = {
  mainRows: [],
  agendaMap: new Map(),
  hasAgendaContent: false,
  currentView: "program", // 'program' | 'agenda'
  agendaValid: false
};

// ------------------------------------------------------------------
// Theme & Install Manager Initialization
// ------------------------------------------------------------
initTheme();

// Initialize Install Manager
(async () => {
  try {
    const module = await import("./install-manager.js");
    if (module.init) {
      await module.init();
    }
  } catch (err) {
    console.warn("[main] Install manager initialization failed:", err);
  }
})();

function addGlobalCleanup() {
  if (typeof window !== "undefined") {
    window.addEventListener("beforeunload", () => {
      clearAllTimers();
    });
  }
}

function showOfflineBanner() {
  const banner = document.getElementById("offline-banner");
  if (!banner) return;

  banner.textContent = "";

  const offlineText = document.createElement("span");
  offlineText.textContent = t("offlineMode");
  banner.appendChild(offlineText);

  const nbsp = document.createTextNode(" ");
  banner.appendChild(nbsp);

  const retryLink = document.createElement("a");
  retryLink.href = "#";
  retryLink.id = "retry-offline";
  retryLink.style.color = "#fff";
  retryLink.style.textDecoration = "underline";
  retryLink.textContent = t("tryNow");
  banner.appendChild(retryLink);

  banner.classList.add("visible");

  retryLink.onclick = (e) => {
    e.preventDefault();
    init();
  };
}

function initNetworkStatus() {
  const statusEl = document.getElementById("network-status");
  if (!statusEl) return;

  // Timer storage for cleanup
  let statusHideTimer = null;

  const updateStatus = async () => {
    const statusEl = document.getElementById("network-status");
    if (!statusEl) return;

    const iconEl = statusEl.querySelector(".status-icon");
    const textEl = statusEl.querySelector(".status-text");
    const lastSyncEl = statusEl.querySelector(".last-sync");

    // Guard against navigator not being available
    const isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;

    if (isOnline) {
      iconEl.textContent = "🌐";
      textEl.textContent = "Online";
      statusEl.classList.remove("offline");
      statusEl.classList.add("online");
      statusEl.classList.remove("hidden");

      const lastUpdated = await getMetadata("programLastUpdatedDate");
      if (lastUpdated) {
        lastSyncEl.textContent = `Last sync: ${lastUpdated}`;
      } else {
        lastSyncEl.textContent = "";
      }

      if (statusHideTimer) clearTimeout(statusHideTimer);
      statusHideTimer = setTimeout(() => {
        statusEl.classList.add("hidden");
      }, 3000);
    } else {
      iconEl.textContent = "📱";
      textEl.textContent = "Working offline";
      statusEl.classList.remove("online");
      statusEl.classList.add("offline");
      statusEl.classList.remove("hidden");

      const lastUpdated = await getMetadata("programLastUpdatedDate");
      if (lastUpdated) {
        lastSyncEl.textContent = `Last updated: ${lastUpdated}`;
      } else {
        lastSyncEl.textContent = "";
      }
    }
  };

  globalThis.window.addEventListener("online", () => {
    updateStatus();
  });

  globalThis.window.addEventListener("offline", () => {
    updateStatus();
  });

  updateStatus();
}

function initPrintButton() {
  const printBtn = document.getElementById("print-btn");
  if (!printBtn) return;

  printBtn.addEventListener("click", () => {
    globalThis.window.print();
  });
}

function updateTimestamp() {
  const el = document.getElementById("last-updated");
  const now = new Date();

  const options = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  };

  const datePart = now.toLocaleDateString(undefined, options);
  const hh = now.getHours().toString().padStart(2, "0");
  const mm = now.getMinutes().toString().padStart(2, "0");

  el.textContent = `${t("lastUpdated")} ${datePart} at ${hh}:${mm}`;
  el.classList.remove("hidden");

  // Save specific date for Sunday logic
  const todayKey = now.toISOString().split("T")[0]; // YYYY-MM-DD
  setMetadata("programLastUpdatedDate", todayKey).catch((e) =>
    console.warn("Failed to save update timestamp:", e)
  );
}

function handleVersionVisibility() {
  const appVersion = document.getElementById("app-version");
  if (!appVersion) return;

  const THRESHOLD = 120;
  let ticking = false; // prevents redundant work

  function update() {
    ticking = false;

    const scrollBottom = globalThis.window.innerHeight + globalThis.window.scrollY;
    const docHeight = document.documentElement.scrollHeight;

    const nearBottom = docHeight - scrollBottom <= THRESHOLD;
    appVersion.classList.toggle("visible", nearBottom);
  }

  function onScroll() {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  }

  globalThis.window.addEventListener("scroll", onScroll, { passive: true });
  update(); // run once on load
}

/**
 * Simple debounce utility
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Helper function with timeout for fetching
async function fetchWithTimeout(url, timeout) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    return response.text();
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// Helper: Setup initialization prerequisites
async function initializePrerequisites(currentVersion) {
  const { getCanonicalUrl } = await import("./config/baseUrl.js");
  const canonicalUrl = await getCanonicalUrl();
  const canonicalLink = document.querySelector("#canonical-link");
  if (canonicalLink) {
    canonicalLink.href = canonicalUrl;
  }

  // Cleanup and migration
  cleanupHistory();
  if (await hasLegacyProfiles()) {
    console.log("[INIT] Found legacy profiles, migrating to IndexedDB...");
    const result = await migrateLegacyProfiles();
    if (result.success) {
      console.log(`[INIT] Migrated ${result.migrated} profiles`);
    } else {
      console.warn("[INIT] Migration failed:", result.message);
    }
  }

  await initArchiveManager();
  const migrationResult = await Profiles.initProfiles(currentVersion);
  console.log("[INIT] Profiles loaded:", Profiles.getProfiles().length);

  initProfileUI();

  return migrationResult;
}

// Helper: Determine the sheet URL to load
async function determineSheetUrl() {
  const params = new URLSearchParams(globalThis.window.location.search);
  let sheetUrl = params.get("url");

  const currentProfile = Profiles.getCurrentProfile();

  if (!currentProfile && !sheetUrl) {
    const { getMetadata } = await import("./data/IndexedDBManager.js");
    const legacyUrl = await getMetadata("legacy_sheetUrl");
    if (legacyUrl) sheetUrl = legacyUrl;
  } else if (currentProfile && !sheetUrl) {
    sheetUrl = currentProfile.url;
  }

  if (sheetUrl) {
    const extractedUrl = extractSheetUrl(sheetUrl);
    if (extractedUrl) sheetUrl = extractedUrl;
  }

  return sheetUrl;
}

// Helper: Cache common DOM elements for state management functions
function getUIElements() {
  return {
    actionBtn: document.getElementById("qr-action-btn"),
    header: document.getElementById("program-header"),
    reloadBtn: document.getElementById("reload-btn"),
    main: document.getElementById("main-program"),
    churchContainer: document.querySelector(".church-name-container"),
    welcomeBar: document.querySelector(".welcome-bar"),
    welcomeText: document.getElementById("welcome-to-text"),
    themeToggle: document.getElementById("theme-toggle"),
    unitHeader: document.querySelector(".sacrament-unit-header"),
    helpBtn: document.getElementById("help-btn")
  };
}

// Helper: Toggle CSS classes on multiple elements
function toggleElementClasses(elements, classesToAdd = [], classesToRemove = []) {
  const elementList = Array.isArray(elements) ? elements : [elements];
  elementList.forEach((el) => {
    if (!el) return;
    classesToAdd.forEach((cls) => el.classList.add(cls));
    classesToRemove.forEach((cls) => el.classList.remove(cls));
  });
}

// Helper: Handle zero state (no program loaded)
async function handleZeroState() {
  const ui = getUIElements();
  const {
    actionBtn,
    header,
    main,
    churchContainer,
    welcomeBar,
    welcomeText,
    themeToggle,
    unitHeader,
    helpBtn
  } = ui;

  console.log("[INIT] No sheetUrl found, entering zero state.");
  actionBtn.textContent = t("scanProgramQR");
  actionBtn.onclick = () => showScanner();

  // Always show reset button on zero state page
  const resetBtn = document.getElementById("reset-data-btn");
  if (resetBtn) {
    resetBtn.classList.remove("hidden");
    resetBtn.onclick = handleUpdateClick;
    console.log("[INIT] Reset button visible on zero state page.");
  }

  toggleElementClasses(header, [], ["hidden"]);
  toggleElementClasses([welcomeBar, helpBtn], [], ["hidden"]);
  toggleElementClasses([churchContainer, unitHeader, welcomeText, themeToggle], ["hidden"], []);
  toggleElementClasses(main, ["hidden"], ["loading"]);

  const { getMetadata } = await import("./data/IndexedDBManager.js");
  const helpShown = await getMetadata("userPreference_helpShown");
  if (!helpShown) {
    openHelpModal();
  }
}

// Helper: Add reset button to help modal with warnings
function addResetButtonToHelpModal() {
  const helpSections = document.querySelector(".help-sections");
  if (!helpSections) return;

  // Check if reset section already exists to avoid duplicates
  if (document.getElementById("reset-data-section")) {
    return;
  }

  const resetSection = document.createElement("div");
  resetSection.id = "reset-data-section";
  resetSection.className = "help-section";

  const h4 = document.createElement("h4");
  h4.style.color = "#d32f2f";
  h4.textContent = "⚠️ Delete All Data & Cache";
  resetSection.appendChild(h4);

  const warningBox = document.createElement("div");
  warningBox.style.cssText =
    "background: #fff3cd; padding: 12px; border-radius: 4px; margin: 10px 0; border-left: 4px solid #ff9800; color: #333;";
  const warningP = document.createElement("p");
  warningP.style.color = "#333";
  const strong1 = document.createElement("strong");
  strong1.style.color = "#333";
  strong1.textContent = "WARNING:";
  warningP.appendChild(strong1);
  warningP.appendChild(document.createTextNode(" This action will:"));
  warningBox.appendChild(warningP);

  const ul = document.createElement("ul");
  ul.style.cssText = "margin: 5px 0; padding-left: 20px; color: #333;";
  const warnings = [
    "Delete all saved program data",
    "Clear local cache and storage",
    "Force download fresh data from the server",
    "This cannot be undone and is immediate"
  ];
  warnings.forEach((text) => {
    const li = document.createElement("li");
    li.style.color = "#333";
    li.textContent = text;
    ul.appendChild(li);
  });
  warningBox.appendChild(ul);

  const warningFooter = document.createElement("p");
  warningFooter.style.cssText = "margin-top: 10px; font-size: 12px; color: #d32f2f;";
  const strong2 = document.createElement("strong");
  strong2.textContent = "Use only if the app is not working properly.";
  warningFooter.appendChild(strong2);
  warningBox.appendChild(warningFooter);

  resetSection.appendChild(warningBox);

  const createResetBtn = document.createElement("button");
  createResetBtn.id = "help-reset-btn";
  createResetBtn.className = "qr-action-btn";
  createResetBtn.style.cssText = "background: #d32f2f; width: 100%; margin-top: 10px;";
  createResetBtn.textContent = "Delete All Data & Reload";
  resetSection.appendChild(createResetBtn);

  // Append reset section at the end (after "Need a New Program?")
  helpSections.appendChild(resetSection);

  // Move Close button just before the reset section, with an hr below it
  const modalActions = document.querySelector("#help-modal .modal-actions");
  if (modalActions) {
    modalActions.style.cssText = "display: flex; justify-content: center; margin: 4px 0 8px;";
    helpSections.insertBefore(modalActions, resetSection);
    const razorHr = document.createElement("hr");
    razorHr.className = "help-razor";
    helpSections.insertBefore(razorHr, resetSection);
  }

  // Attach click handler
  const resetBtn = document.getElementById("help-reset-btn");
  if (resetBtn) {
    resetBtn.onclick = handleUpdateClick;
  }
}

// Helper: Handle active state (program loaded)
// Helper: Setup UI when a program sheet is loaded
function setupActiveStateUI() {
  const ui = getUIElements();
  const {
    actionBtn,
    header,
    reloadBtn,
    main,
    churchContainer,
    welcomeBar,
    welcomeText,
    themeToggle,
    unitHeader
  } = ui;

  actionBtn.textContent = t("useNewQR");
  actionBtn.onclick = () => showScanner();

  // Hide reset button from main UI (will be in help modal instead)
  const resetBtn = document.getElementById("reset-data-btn");
  if (resetBtn) {
    resetBtn.classList.add("hidden");
  }

  // Add reset button to help modal with warnings
  addResetButtonToHelpModal();

  // Show UI elements
  toggleElementClasses(
    [header, churchContainer, welcomeBar, welcomeText, themeToggle, unitHeader, main, reloadBtn],
    [],
    ["hidden"]
  );

  reloadBtn.onclick = () => {
    const urlParams = new URLSearchParams(globalThis.window.location.search);
    urlParams.set("t", Date.now().toString());
    urlParams.set("force", "true");
    const newUrl = globalThis.window.location.pathname + "?" + urlParams.toString();
    globalThis.window.location.href = newUrl;
  };
}

// Helper: Sync current profile to UI selector
function syncCurrentProfileToSelector() {
  const currentProfile = Profiles.getCurrentProfile();
  if (currentProfile) {
    const selector = document.getElementById("profile-selector");
    if (selector) selector.value = currentProfile.id;
  }
}

async function handleActiveState(sheetUrl) {
  console.log("[INIT] sheetUrl identified:", sheetUrl);
  setupActiveStateUI();
  syncCurrentProfileToSelector();
  await loadAndRenderProgram(sheetUrl);
}

// Helper: Load and render program from network
async function loadAndRenderProgram(sheetUrl) {
  try {
    const url = sanitizeSheetUrl(sheetUrl);
    const csv = await fetchWithTimeout(url, 8000);
    const rows = await createWorker("parseCSV", csv, { language: getLanguage() });
    await processAndRenderProgram(rows, sheetUrl);
  } catch (err) {
    console.warn("Failed to fetch sheet:", err);
    await tryLoadCachedProgram();
  }
}

// Helper: Process program data and render
// Helper: Create profile from URL if none exists
async function ensureProfileExists(sheetUrl, unitName, stakeName) {
  try {
    const { setMetadata } = await import("./data/IndexedDBManager.js");
    const currentUrl = globalThis.window.location.href;
    const parsedCurrent = new URL(currentUrl);
    let siteUrl = `${parsedCurrent.protocol}//${parsedCurrent.host}${parsedCurrent.pathname}`;
    if (siteUrl.endsWith("/")) siteUrl = siteUrl.slice(0, -1);
    await setMetadata("siteUrl", siteUrl);
  } catch (e) {
    console.warn("Failed to store site URL:", e);
  }

  await Profiles.addProfile(sheetUrl, unitName, stakeName);
  initProfileUI();
}

// Helper: Cache program data
async function cacheProgramData(rowsToCache) {
  const profileToCache = Profiles.getCurrentProfile();
  if (profileToCache) {
    try {
      const { setMetadata } = await import("./data/IndexedDBManager.js");
      await setMetadata(`programCache_${profileToCache.id}`, rowsToCache);
    } catch (e) {
      console.warn("[Cache] IndexedDB write failed:", e);
    }
  }
}

// Helper: Handle archive view for loaded profile
function updateArchiveViewForProfile() {
  const loadedProfile = Profiles.getCurrentProfile();
  if (loadedProfile?.archived) {
    document.body.classList.add("archive-view");
  } else {
    document.body.classList.remove("archive-view");
  }
}

// Helper: Find a row value by key from CSV data
function findRowValue(rows, key, defaultValue = "") {
  return rows.find((r) => r.key === key)?.value || defaultValue;
}

// Helper: Handle auto-archive and history
async function handleAutoArchiveAndHistory(rows, agendaData = null) {
  const loadedProfile = Profiles.getCurrentProfile();
  const programDate = findRowValue(rows, "date");

  if (loadedProfile && programDate) {
    const options = {
      profileUrl: loadedProfile.url
    };
    if (agendaData) {
      options.agendaRows = agendaData.privateRows;
      options.agendaCsvData = agendaData.csv;
    }

    const archiveResult = await ArchiveManager.autoArchive(
      loadedProfile.id,
      programDate,
      rows,
      options
    );
    if (archiveResult.archived) {
      console.log(
        `Program auto-archived: ${programDate} (${archiveResult.updated ? "updated" : "new"})`
      );
    }

    saveProgramHistory(loadedProfile.id, programDate, rows, { isFromCache: false });
  }
}

async function processAndRenderProgram(rows, sheetUrl) {
  const currentProfile = Profiles.getCurrentProfile();
  const unitName = findRowValue(rows, "unitName", "Unknown Unit");
  const stakeName = findRowValue(rows, "stakeName");

  // Update profile metadata
  if (currentProfile) {
    await Profiles.addProfile(currentProfile.url, unitName, stakeName);
    initProfileUI();
  }

  // Create profile from URL if needed
  if (!currentProfile && sheetUrl) {
    await ensureProfileExists(sheetUrl, unitName, stakeName);
  }

  // Cache program data
  await cacheProgramData(rows);

  // Archive handling
  updateArchiveViewForProfile();

  // Check for migration requirement
  const loadedProfile = Profiles.getCurrentProfile();
  if (loadedProfile) {
    const migrationCheck = await checkMigrationRequired(loadedProfile.id, rows);
    if (migrationCheck.required && migrationCheck.url) {
      showMigrationBanner(loadedProfile.id, migrationCheck.url);
    }
  }

  // Leadership agenda system
  leadershipState.mainRows = rows;
  console.log(
    "[Leadership] processAndRenderProgram calling loadAgendaForCurrentProfile. Profile:",
    currentProfile?.id,
    "agendaUrl:",
    currentProfile?.agendaUrl
  );
  await loadAgendaForCurrentProfile(currentProfile);
  updateTimestamp();

  // Archive (uses full rows including agenda key placeholders)
  await handleAutoArchiveAndHistory(rows, null);
}

/**
 * Load the private agenda for a profile and append to main program.
 * @param {string} profileId
 * @param {Array<{key:string, value:string}>} mainRows - Already rendered main program rows
 * @returns {{csv: string, privateRows: Array<{key:string, value:string}>}|null}
 */
// ------------------------------------------------------------------
// Leadership Agenda System
// ------------------------------------------------------------------

/**
 * Load the private agenda for the current profile, build the agendaMap,
 * and show/hide the toggle button. Finally, render the appropriate view.
 */
async function loadAgendaForCurrentProfile(profile) {
  // Reset state
  leadershipState.agendaMap = new Map();
  leadershipState.hasAgendaContent = false;
  leadershipState.agendaValid = false;

  const toggleBtn = document.getElementById("agenda-toggle-btn");

  if (!profile?.agendaUrl) {
    // No agenda configured
    console.log("[Leadership] No agendaUrl configured for profile:", profile?.id);
    if (toggleBtn) toggleBtn.style.display = "none";
    leadershipState.currentView = "program";
    renderMain();
    return;
  }

  console.log(
    "[Leadership] Loading agenda for profile:",
    profile.id,
    "agendaUrl:",
    profile.agendaUrl
  );

  // Fetch agenda CSV (network-first with cache fallback)
  let csv;
  try {
    const url = sanitizeSheetUrl(profile.agendaUrl);
    csv = await fetchWithTimeout(url, 8000);
    await setMetadata(`agendaCache_${profile.id}`, csv);
    profile.agendaValid = true;
    profile.agendaLastLoaded = Date.now();
    await Profiles.updateProfile(profile);
  } catch (err) {
    console.warn("[Leadership] Agenda fetch failed, trying cache:", err);
    csv = await getMetadata(`agendaCache_${profile.id}`);
    if (csv) {
      profile.agendaValid = true;
    } else {
      profile.agendaValid = false;
      await Profiles.updateProfile(profile);
      if (toggleBtn) toggleBtn.style.display = "none";
      leadershipState.currentView = "program";
      renderMain();
      return;
    }
  }

  // Parse agenda CSV (multi‑column) - request raw rows to preserve all value columns
  const rawRows = await createWorker("parseCSV", csv, { raw: true, language: getLanguage() });
  // rawRows: array of arrays; first row is header
  const map = new Map();
  let hasContent = false;

  for (let i = 1; i < rawRows.length; i++) {
    const cells = rawRows[i];
    if (!cells || cells.length < 3) continue; // need at least key, agendaId, one value
    const key = String(cells[0]).trim();
    const agendaId = String(cells[1]).trim();
    const values = cells
      .slice(2)
      .map((v) => String(v).trim())
      .filter((v) => v !== "");
    if (values.length === 0) continue;

    const mapKey = `${key}|${agendaId}`;
    map.set(mapKey, { key, agendaId, values });
    hasContent = true;
  }

  leadershipState.agendaMap = map;
  leadershipState.hasAgendaContent = hasContent;
  leadershipState.agendaValid = profile.agendaValid;

  console.log("[Leadership] Agenda loaded:", {
    profileId: profile.id,
    agendaValid: profile.agendaValid,
    hasContent,
    entryCount: map.size,
    toggleButtonVisible: toggleBtn ? profile.agendaValid && hasContent : false
  });

  // Show toggle button if we have content
  if (toggleBtn) {
    toggleBtn.style.display = profile.agendaValid && hasContent ? "inline-block" : "none";
    console.log("[Leadership] Toggle button display:", toggleBtn.style.display);
  }

  // Determine initial view from sessionStorage or URL, default to program
  const urlParams = new URLSearchParams(window.location.search);
  const urlView = urlParams.get("view");
  const savedView = sessionStorage.getItem("agendaView");
  let view = "program";
  if ((urlView === "agenda" || savedView === "agenda") && hasContent) {
    view = "agenda";
  }
  leadershipState.currentView = view;

  console.log("[Leadership] Initial view:", view, "from:", { urlView, savedView });

  renderMain();
}

/**
 * Group all isLessonKey rows from mainRows by key, build one unlocked accordion panel per key.
 * Multiple rows with the same lesson key become multiple list items in a single panel.
 * @param {Array} rows - leadershipState.mainRows
 * @returns {Map<string, HTMLElement>} key → panel element (insertion-ordered)
 */
function buildLessonPanelMap(rows) {
  const groups = new Map(); // key → string[]
  rows.forEach((row) => {
    if (isLessonKey(row.key)) {
      if (!groups.has(row.key)) groups.set(row.key, []);
      groups.get(row.key).push(row.value);
    }
  });
  const panels = new Map();
  for (const [key, values] of groups) {
    panels.set(key, createAgendaAccordionPanel(key, values, key, false));
  }
  return panels;
}

/**
 * Build and insert Expand All / Collapse All controls into mainEl.
 * Returns true to indicate controls were inserted.
 */
function insertExpandCollapseControls(mainEl) {
  const controls = document.createElement("div");
  controls.className = "agenda-expand-controls";
  const expandBtn = document.createElement("button");
  expandBtn.className = "agenda-expand-btn";
  expandBtn.textContent = t("expandAll") || "Expand All";
  expandBtn.addEventListener("click", () => {
    mainEl.querySelectorAll(".agenda-panel").forEach((p) => {
      p.classList.add("expanded");
      const h = p.querySelector(".panel-header");
      if (h) h.setAttribute("aria-expanded", "true");
    });
  });
  const collapseBtn = document.createElement("button");
  collapseBtn.className = "agenda-expand-btn";
  collapseBtn.textContent = t("collapseAll") || "Collapse All";
  collapseBtn.addEventListener("click", () => {
    mainEl.querySelectorAll(".agenda-panel").forEach((p) => {
      p.classList.remove("expanded");
      const h = p.querySelector(".panel-header");
      if (h) h.setAttribute("aria-expanded", "false");
    });
  });
  controls.appendChild(expandBtn);
  controls.appendChild(collapseBtn);
  mainEl.appendChild(controls);
  return true;
}

/**
 * Render the main program according to currentView.
 * Reads from leadershipState.mainRows, leadershipState.agendaMap.
 */
function renderMain() {
  console.log("[Leadership] renderMain() called. Current view:", leadershipState.currentView, {
    agendaValid: leadershipState.agendaValid,
    hasAgendaContent: leadershipState.hasAgendaContent,
    mainRowsCount: leadershipState.mainRows.length,
    agendaMapSize: leadershipState.agendaMap.size
  });

  const mainEl = document.getElementById("main-program");
  mainEl.innerHTML = "";

  if (leadershipState.currentView === "program") {
    // Public view: render rows in sheet order; lesson panels are public (unlocked); agenda rows are hidden.
    // Lesson key rows are read directly from mainRows — multiple rows with the same key become one panel.
    const lessonPanelMap = buildLessonPanelMap(leadershipState.mainRows);
    console.log(
      "[Leadership] Rendering program view with",
      leadershipState.mainRows.length,
      "rows,",
      lessonPanelMap.size,
      "lesson panels"
    );
    const renderedLessonKeys = new Set();
    let expandCollapseInserted = false;
    leadershipState.mainRows.forEach((row) => {
      if (isLessonKey(row.key)) {
        if (!renderedLessonKeys.has(row.key)) {
          const panel = lessonPanelMap.get(row.key);
          if (panel) {
            if (!expandCollapseInserted && lessonPanelMap.size > 1) {
              expandCollapseInserted = insertExpandCollapseControls(mainEl);
            }
            mainEl.appendChild(panel);
            renderedLessonKeys.add(row.key);
          }
        }
      } else if (isAgendaKey(row.key)) {
        // Skip private agenda rows in public view
      } else {
        renderSingleRow(row);
      }
    });
  } else {
    // Leadership view: iterate in original order.
    // Lesson keys are rendered from mainRows directly (public, unlocked).
    // Private agenda keys are rendered from agendaMap (locked).
    const lessonPanelMap = buildLessonPanelMap(leadershipState.mainRows);
    const renderedLessonKeys = new Set();

    // Collect private agenda panels from agendaMap
    const agendaPanels = [];
    leadershipState.mainRows.forEach((row) => {
      if (isAgendaKey(row.key)) {
        const mapKey = `${row.key}|${row.value}`;
        const entry = leadershipState.agendaMap.get(mapKey);
        if (entry && entry.values.length > 0) {
          agendaPanels.push({ row, panel: createAgendaAccordionPanel(row.key, entry.values, row.value, true) });
        }
      }
    });

    const totalPanels = agendaPanels.length + lessonPanelMap.size;
    let expandCollapseInserted = false;
    let renderedAgendaPanels = 0;
    let renderedRegularRows = 0;

    leadershipState.mainRows.forEach((row) => {
      if (isLessonKey(row.key)) {
        if (!renderedLessonKeys.has(row.key)) {
          const panel = lessonPanelMap.get(row.key);
          if (panel) {
            if (!expandCollapseInserted && totalPanels > 1) {
              expandCollapseInserted = insertExpandCollapseControls(mainEl);
            }
            mainEl.appendChild(panel);
            renderedLessonKeys.add(row.key);
          }
        }
      } else if (isAgendaKey(row.key)) {
        const mapKey = `${row.key}|${row.value}`;
        const found = agendaPanels.find((p) => `${p.row.key}|${p.row.value}` === mapKey);
        if (found) {
          if (!expandCollapseInserted && totalPanels > 1) {
            expandCollapseInserted = insertExpandCollapseControls(mainEl);
          }
          mainEl.appendChild(found.panel);
          renderedAgendaPanels++;
        }
      } else {
        renderSingleRow(row);
        renderedRegularRows++;
      }
    });

    console.log(
      "[Leadership] Rendered agenda view:",
      renderedAgendaPanels,
      "agenda panels,",
      lessonPanelMap.size,
      "lesson panels,",
      renderedRegularRows,
      "regular rows"
    );
  }
}

/**
 * Render a single row using the appropriate renderer.
 */
function renderSingleRow(row) {
  if (row.key === "stakeName" || row.key === "obsolete" || row.key === "migrationUrl") {
    return;
  }
  const normalizedKey = normalizeRenderableKey(row.key);
  const renderer = renderers[normalizedKey];
  if (renderer) {
    renderer(row.value);
  } else if (normalizedKey && !normalizedKey.startsWith("_")) {
    appendRow(row.key, row.value, normalizedKey);
  }
}

/**
 * Toggle between program and leadership views.
 */
function toggleLeadershipView() {
  console.log("[Leadership] Toggle clicked. State:", {
    agendaValid: leadershipState.agendaValid,
    hasAgendaContent: leadershipState.hasAgendaContent,
    currentView: leadershipState.currentView
  });

  if (!leadershipState.agendaValid || !leadershipState.hasAgendaContent) {
    console.warn("[Leadership] Toggle blocked: agendaValid or hasAgendaContent is false");
    return;
  }

  leadershipState.currentView = leadershipState.currentView === "program" ? "agenda" : "program";
  console.log("[Leadership] Switched to view:", leadershipState.currentView);

  sessionStorage.setItem("agendaView", leadershipState.currentView);
  // Update URL param
  const url = new URL(window.location);
  url.searchParams.set("view", leadershipState.currentView);
  window.history.replaceState(null, "", url);
  renderMain();
}

/**
 * Initialize the leadership toggle button (add click listener).
 */
function initLeadershipToggle() {
  const toggleBtn = document.getElementById("agenda-toggle-btn");
  if (toggleBtn) {
    console.log("[Leadership] Initializing toggle button. Current state:", {
      agendaValid: leadershipState.agendaValid,
      hasAgendaContent: leadershipState.hasAgendaContent,
      currentView: leadershipState.currentView
    });
    toggleBtn.addEventListener("click", toggleLeadershipView);
    // visibility is managed by loadAgendaForCurrentProfile
  } else {
    console.warn("[Leadership] Toggle button not found in DOM");
  }
}

/**
 * Render a single agenda accordion panel (replaces createAgendaAccordionPanel).
 * Panel is collapsed by default.
 */
function createAgendaAccordionPanel(key, items, agendaId, isLocked = true) {
  const panelId = `panel-content-${key}-${agendaId}`;
  const section = document.createElement("section");
  section.className = isLessonKey(key) ? "agenda-panel lesson-panel" : "agenda-panel";

  const header = document.createElement("div");
  header.className = "panel-header";
  header.setAttribute("role", "button");
  header.setAttribute("tabindex", "0");
  header.setAttribute("aria-expanded", "false");
  header.setAttribute("aria-controls", panelId);

  const lockIcon = isLocked ? document.createElement("span") : null;
  if (lockIcon) {
    lockIcon.className = "lock-icon";
    lockIcon.setAttribute("aria-hidden", "true");
    lockIcon.textContent = "🔒";
  }

  const title = document.createElement("h3");
  title.className = "panel-title";
  const baseTitle = t(key) !== key ? t(key) : capitalizeKey(key);
  // Add ✅ or ❌ for the Stake Business panel based on value
  if (key === "agendaBusinessStake") {
    const raw = (items[0] || "").trim();
    const isYes = /^(yes|true)$/i.test(raw) || raw === "";
    title.textContent = `${baseTitle} ${isYes ? "✅" : "❌"}`;
  } else {
    title.textContent = baseTitle;
  }

  const chevron = document.createElement("span");
  chevron.className = "chevron-icon";
  chevron.setAttribute("aria-hidden", "true");
  chevron.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M5.41 7.59L4 9l8 8 8-8-1.41-1.41L12 14.17z"/></svg>`;

  if (lockIcon) header.appendChild(lockIcon);

  // Class-specific emoji icon for lesson panels
  if (isLessonKey(key) && LESSON_ICONS[key]) {
    const iconEl = document.createElement("span");
    iconEl.className = "lesson-icon";
    iconEl.setAttribute("aria-hidden", "true");
    iconEl.textContent = LESSON_ICONS[key];
    header.appendChild(iconEl);
  }

  header.appendChild(title);
  header.appendChild(chevron);
  section.appendChild(header);

  const content = document.createElement("div");
  content.className = "panel-content";
  content.id = panelId;

  // Dispatch to structured renderer
  renderAgendaContent(key, items, content);

  section.appendChild(content);

  const toggle = () => {
    const expanded = section.classList.toggle("expanded");
    header.setAttribute("aria-expanded", String(expanded));
  };
  header.addEventListener("click", toggle);
  header.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggle();
    }
  });

  return section;
}

/**
 * Render structured content into a panel content element based on key type.
 *
 * agendaGeneral          → <p> per item
 * agendaBusinessStake    → checkbox (pre-checked if value is "yes" or "true")
 * agendaBusinessReleases → wording script + bullets "Name — Position"
 * agendaBusinessCallings → wording script + bullets "Name — Position"
 * agendaBusinessPriesthood → wording script + bullets "Name — Office"
 * agendaBusinessNewMoveIns   → name-only bullets
 * agendaBusinessNewConverts  → name-only bullets
 * everything else         → plain bulleted list
 */
// Regex to detect a leading month+day at the start of a lesson text value.
const LESSON_DATE_RE =
  /^(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}\b/i;

function renderAgendaContent(key, items, el) {
  if (isLessonKey(key)) {
    // Each item is optionally "Month D Title | https://url".
    // Render as styled lesson cards: date badge + title + study button.
    const list = document.createElement("div");
    list.className = "lesson-card-list";
    items.forEach((item) => {
      const parts = item.split("|").map((s) => s.trim());
      const maybeUrl = parts[parts.length - 1];
      const hasUrl = parts.length >= 2 && isSafeUrl(maybeUrl);
      const rawText = hasUrl ? parts.slice(0, -1).join(" | ") : item.trim();

      // Parse optional leading date (e.g. "February 8")
      const dateMatch = LESSON_DATE_RE.exec(rawText);
      const dateText = dateMatch ? dateMatch[0] : null;
      const titleText = dateText ? rawText.slice(dateText.length).trim() : rawText;

      const card = document.createElement("article");
      card.className = "lesson-card";

      if (dateText) {
        const dateEl = document.createElement("div");
        dateEl.className = "lesson-card__date";
        dateEl.textContent = dateText;
        card.appendChild(dateEl);
      }

      const titleEl = document.createElement("div");
      titleEl.className = "lesson-card__title";
      titleEl.textContent = titleText || rawText;
      card.appendChild(titleEl);

      if (hasUrl) {
        const btn = document.createElement("a");
        btn.className = "lesson-card__btn";
        btn.href = maybeUrl;
        btn.target = "_blank";
        btn.rel = "noopener noreferrer";
        btn.textContent = "📖 Study this lesson →";
        card.appendChild(btn);
      }

      list.appendChild(card);
    });
    el.appendChild(list);
    return;
  }

  if (key === "agendaGeneral") {
    items.forEach((item) => {
      const p = document.createElement("p");
      p.textContent = item;
      el.appendChild(p);
    });
    return;
  }

  if (key === "agendaBusinessStake") {
    const p = document.createElement("p");
    p.className = "agenda-stake-confirmed";
    // Show the cell value if it's descriptive, otherwise a standard label
    const raw = (items[0] || "").trim();
    const isBoolean = /^(yes|true)$/i.test(raw);
    const isNo = /^(no|false)$/i.test(raw);
    if (isNo) {
      p.textContent = "\u274C No stake business this week";
    } else if (isBoolean || raw === "") {
      p.textContent = "\u2705 Stake business to be presented";
    } else {
      p.textContent = `\u2705 ${raw}`;
    }
    el.appendChild(p);
    return;
  }

  // Each entry is [prefix, between-name-and-role, suffix].
  // The bullet is built with DOM nodes so name is <strong> and role is <em>.
  const WORDING_PARTS = {
    agendaBusinessReleases: [
      "",
      " has been released as ",
      ". Those who wish to express appreciation for their service, please do so by raising your hand."
    ],
    agendaBusinessCallings: [
      "",
      " has been called as ",
      ". Those in favor, please manifest by raising your hand. Those opposed, if any, may so manifest."
    ],
    agendaBusinessPriesthood: [
      "We propose that ",
      " receive the Aaronic Priesthood and be ordained as a ",
      ". Those in favor please manifest it by the uplifted hand. Those opposed, if any, may so indicate."
    ]
  };

  const PIPE_KEYS = new Set([
    "agendaBusinessReleases",
    "agendaBusinessCallings",
    "agendaBusinessPriesthood"
  ]);

  if (key === "agendaAckVisitingLeaders") {
    const intro = document.createElement("p");
    intro.textContent = "We would like to acknowledge our visiting leaders:";
    el.appendChild(intro);
  }

  if (key === "agendaAnnouncements") {
    const intro = document.createElement("p");
    intro.textContent = "We do have some announcements today.";
    el.appendChild(intro);
  }

  if (key === "agendaBusinessNewMoveIns") {
    const intro = document.createElement("p");
    intro.textContent = "We would like to welcome the following new members to our congregation:";
    el.appendChild(intro);
  }

  if (key === "agendaBusinessNewConverts") {
    const intro = document.createElement("p");
    intro.textContent = "We would like to recognize our recent converts:";
    el.appendChild(intro);
  }

  const ul = document.createElement("ul");
  items.forEach((item) => {
    const li = document.createElement("li");
    if (PIPE_KEYS.has(key)) {
      const [name, role] = item.split("|").map((s) => s.trim());
      const parts = WORDING_PARTS[key];
      if (parts && name && role) {
        li.appendChild(document.createTextNode(parts[0]));
        const nameEl = document.createElement("strong");
        nameEl.textContent = name;
        li.appendChild(nameEl);
        li.appendChild(document.createTextNode(parts[1]));
        const roleEl = document.createElement("em");
        roleEl.textContent = role;
        li.appendChild(roleEl);
        li.appendChild(document.createTextNode(parts[2]));
      } else {
        li.textContent = role ? `${name} — ${role}` : (name || item.trim());
      }
    } else {
      li.textContent = item.trim();
    }
    ul.appendChild(li);
  });
  el.appendChild(ul);

  if (key === "agendaAnnouncements") {
    const outro = document.createElement("p");
    outro.textContent = "Please see the meeting bulletin for other announcements.";
    el.appendChild(outro);
  }
}
/**
 * Capitalize a key for display: 'openingHymn' -> 'Opening Hymn'
 */
function capitalizeKey(key) {
  if (!key) return "";
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

// Expose for AgendaSettings to reload agenda for current profile
window.loadAgendaForCurrentProfile = loadAgendaForCurrentProfile;

// Helper: Load cached program from IndexedDB
async function loadIndexedDBCache(cachedProfile) {
  try {
    const { getMetadata } = await import("./data/IndexedDBManager.js");
    return await getMetadata(`programCache_${cachedProfile.id}`);
  } catch (e) {
    console.warn("Failed to load cached program from IndexedDB:", e);
    return null;
  }
}

// Helper: Load and migrate legacy localStorage cache
async function loadLegacyCache(cachedProfile) {
  const legacy = localStorage.getItem("programCache");
  if (!legacy) return null;

  try {
    const cachedRows = JSON.parse(legacy);
    if (cachedProfile) {
      try {
        const { setMetadata } = await import("./data/IndexedDBManager.js");
        await setMetadata(`programCache_${cachedProfile.id}`, cachedRows);
        localStorage.removeItem("programCache");
        console.log("[Cache] Migrated legacy programCache to IndexedDB");
      } catch (e) {
        console.warn("[Cache] Failed to migrate legacy cache:", e);
      }
    }
    return cachedRows;
  } catch (e) {
    console.warn("Failed to parse legacy cache:", e);
    return null;
  }
}

// Helper: Render cached program and handle archive/history
async function renderCachedProgram(cachedRows, cachedProfile) {
  const main = document.getElementById("main-program");
  main.textContent = "";
  renderProgram(cachedRows);

  if (cachedProfile?.archived) {
    document.body.classList.add("archive-view");
  } else {
    document.body.classList.remove("archive-view");
  }

  updateTimestamp();
  showOfflineBanner();

  const cachedDate = findRowValue(cachedRows, "date");
  if (cachedProfile && cachedDate) {
    const archiveResult = await ArchiveManager.autoArchive(
      cachedProfile.id,
      cachedDate,
      cachedRows,
      { profileUrl: cachedProfile.url }
    );
    if (archiveResult.archived) {
      console.log(`Cached program auto-archived: ${cachedDate}`);
    }
  }

  if (cachedProfile && cachedDate) {
    saveProgramHistory(cachedProfile.id, cachedDate, cachedRows, { isFromCache: true });
  }
}

// Helper: Try loading cached program with fallbacks
async function tryLoadCachedProgram() {
  const main = document.getElementById("main-program");
  const cachedProfile = Profiles.getCurrentProfile();

  let cachedRows = null;
  if (cachedProfile) {
    cachedRows = await loadIndexedDBCache(cachedProfile);
  }

  if (!cachedRows) {
    cachedRows = await loadLegacyCache(cachedProfile);
  }

  if (cachedRows) {
    await renderCachedProgram(cachedRows, cachedProfile);
  } else {
    main.textContent = "";

    const wrapper = document.createElement("div");
    wrapper.style.textAlign = "center";
    wrapper.style.padding = "20px";

    const paragraph = document.createElement("p");
    paragraph.textContent = t("unableToLoad");
    wrapper.appendChild(paragraph);

    const retryBtn = document.createElement("button");
    retryBtn.className = "qr-action-btn";
    retryBtn.textContent = t("retry");
    retryBtn.onclick = () => location.reload();
    wrapper.appendChild(retryBtn);

    main.appendChild(wrapper);
  }
}

// Main initialization function
async function init() {
  const main = document.getElementById("main-program");
  const pageContainer = document.getElementById("page-container");

  if (pageContainer) pageContainer.classList.add("loading");
  if (main) main.classList.add("loading");

  // Initialize theme
  initTheme();
  try {
    // Load and log version
    const versionResponse = await fetch("./version.json");
    const versionData = await versionResponse.json();
    console.log(`[VERSION] App running version: ${versionData.version}`);

    console.log("[INIT] Starting initialization...");
    const migrationResult = await initializePrerequisites(versionData.version);

    // If database migration occurred, reload the page to re-initialize with new data
    if (migrationResult && migrationResult.shouldReload) {
      console.log("[INIT] Database migration completed, reloading page to re-initialize...");
      // Wait longer to ensure all IndexedDB metadata is fully flushed and committed
      await new Promise((resolve) => setTimeout(resolve, 1000));
      // Force hard refresh from server, bypassing service worker cache
      window.location.reload(true);
      return;
    }

    const sheetUrl = await determineSheetUrl();

    if (!sheetUrl) {
      await handleZeroState();
      return;
    }

    // Save sheetUrl to localStorage as fallback for future upgrades
    if (sheetUrl) {
      localStorage.setItem("sheetUrl", sheetUrl);
    }

    await handleActiveState(sheetUrl);
  } finally {
    if (main) main.classList.remove("loading");
    if (pageContainer) pageContainer.classList.remove("loading");
    handleVersionVisibility();
  }

  globalThis.window.scrollTo({ top: 0, behavior: "smooth" });
}

// ------------------------------------------------------------
// 8. Profile Management UI
// ------------------------------------------------------------

async function handleBackToHome() {
  const activeProfiles = Profiles.getActiveProfiles();
  if (activeProfiles.length > 0) {
    activeProfiles.sort((a, b) => b.lastUsed - a.lastUsed);
    await Profiles.selectProfile(activeProfiles[0].id);
    location.reload();
  } else {
    await Profiles.selectProfile(null);
    globalThis.window.history.replaceState({}, document.title, globalThis.window.location.pathname);
    location.reload();
  }
}

function populateProfileSelector(selector, profiles, currentProfile, isViewingArchive) {
  selector.textContent = "";
  profiles.forEach((p) => {
    const opt = document.createElement("option");
    opt.value = p.id;
    const stakeNameDisplay = p.stakeName ? ` (${p.stakeName})` : "";
    opt.textContent = `${p.unitName}${stakeNameDisplay}`;
    selector.appendChild(opt);
  });

  if (isViewingArchive) {
    const opt = document.createElement("option");
    opt.value = currentProfile.id;
    opt.textContent = `${currentProfile.unitName} (Archived)`;
    opt.selected = true;
    selector.appendChild(opt);
    selector.disabled = true;
  } else {
    selector.value = Profiles.getSelectedProfileId();
    selector.disabled = false;
  }

  selector.onchange = async (e) => {
    const newId = e.target.value;
    await Profiles.selectProfile(newId);
    location.reload();
  };
}

async function handleCheckForUpdates() {
  try {
    console.log("[CHECK-UPDATE] Force upgrade initiated - clearing static caches only...");

    // Clear service worker caches (HTML, CSS, JS, manifestsetc)
    if (typeof caches !== "undefined") {
      const cacheNames = await caches.keys();
      console.log("[CHECK-UPDATE] Found caches:", cacheNames);
      await Promise.all(
        cacheNames.map((name) => {
          console.log("[CHECK-UPDATE] Clearing cache:", name);
          return caches.delete(name);
        })
      );
    }

    // Notify service worker to clear cache
    if (navigator.serviceWorker?.controller) {
      console.log("[CHECK-UPDATE] Sending clearCache to service worker...");
      try {
        await Promise.race([
          new Promise((resolve) => {
            const channel = new MessageChannel();
            const timeout = setTimeout(() => {
              console.warn("[CHECK-UPDATE] SW clearCache timeout - proceeding anyway");
              resolve();
            }, 2000);
            channel.port1.onmessage = () => {
              clearTimeout(timeout);
              resolve();
            };
            navigator.serviceWorker.controller.postMessage({ action: "clearCache" }, [
              channel.port2
            ]);
          })
        ]);
      } catch (err) {
        console.warn("[CHECK-UPDATE] SW message failed:", err);
      }
    }

    // Unregister all service worker registrations
    const registrations = await navigator.serviceWorker?.getRegistrations?.();
    if (registrations?.length) {
      console.log("[CHECK-UPDATE] Unregistering service workers:", registrations.length);
      await Promise.all(registrations.map((reg) => reg.unregister()));
    }

    // NOTE: NOT clearing IndexedDB or localStorage - user data is preserved
    console.log(
      "[CHECK-UPDATE] User data and profiles preserved. Reloading page to get fresh static assets..."
    );

    // Give browser time to process cache clears before navigation
    await new Promise((resolve) => globalThis.window.setTimeout(resolve, 500));

    // Reload with new static assets
    globalThis.window.location.replace(globalThis.window.location.href);
  } catch (error) {
    console.error("[CHECK-UPDATE] Force upgrade failed:", error);
    // Force reload as fallback
    globalThis.window.location.replace(globalThis.window.location.href);
  }
}

async function handleUpdateClick() {
  try {
    console.log("[UPDATE] Full cache and data reset initiated...");

    // Clear all browser caches directly
    if (typeof caches !== "undefined") {
      const cacheNames = await caches.keys();
      console.log("[UPDATE] Found caches:", cacheNames);
      await Promise.all(
        cacheNames.map((name) => {
          console.log("[UPDATE] Clearing cache:", name);
          return caches.delete(name);
        })
      );
    }

    // Notify service worker to clear cache
    if (navigator.serviceWorker?.controller) {
      console.log("[UPDATE] Sending clearCache to service worker...");
      try {
        await Promise.race([
          new Promise((resolve) => {
            const channel = new MessageChannel();
            const timeout = setTimeout(() => {
              console.warn("[UPDATE] SW clearCache timeout - proceeding anyway");
              resolve();
            }, 2000);
            channel.port1.onmessage = () => {
              clearTimeout(timeout);
              resolve();
            };
            navigator.serviceWorker.controller.postMessage({ action: "clearCache" }, [
              channel.port2
            ]);
          })
        ]);
      } catch (err) {
        console.warn("[UPDATE] SW message failed:", err);
      }
    }

    // Unregister all service worker registrations
    const registrations = await navigator.serviceWorker?.getRegistrations?.();
    if (registrations?.length) {
      console.log("[UPDATE] Unregistering service workers:", registrations.length);
      await Promise.all(registrations.map((reg) => reg.unregister()));
    }

    // Clear all storage (localStorage, sessionStorage, IndexedDB)
    try {
      sessionStorage.clear();
      localStorage.clear();
      console.log("[UPDATE] Cleared sessionStorage and localStorage");
    } catch (err) {
      console.warn("[UPDATE] Could not clear storage:", err);
    }

    // Clear IndexedDB databases
    try {
      if (typeof indexedDB !== "undefined" && indexedDB.databases) {
        const dbs = await indexedDB.databases();
        if (dbs?.length) {
          await Promise.all(
            dbs.map((db) => {
              console.log("[UPDATE] Deleting IndexedDB:", db.name);
              return new Promise((resolve) => {
                const req = indexedDB.deleteDatabase(db.name);
                req.onsuccess = resolve;
                req.onerror = resolve;
                req.onblocked = resolve;
              });
            })
          );
        }
      }
    } catch (err) {
      console.warn("[UPDATE] Could not clear IndexedDB:", err);
    }

    // Hard reload with cache-busting: force network-first for this request
    console.log("[UPDATE] Performing hard reload with cache invalidation...");

    // Give browser time to process cache clears before navigation
    await new Promise((resolve) => globalThis.window.setTimeout(resolve, 500));

    // Hard reload (bypasses cache, forces network request for index.html)
    globalThis.window.location.replace(globalThis.window.location.href);
  } catch (error) {
    console.error("[UPDATE] Cache clear failed:", error);
    // Force hard reload as fallback
    globalThis.window.location.replace(globalThis.window.location.href);
  }
}

function initProfileUI() {
  const container = document.getElementById("profile-selector-container");
  const selector = document.getElementById("profile-selector");
  const manageBtn = document.getElementById("manage-profiles-btn");
  const backToHomeBtn = document.getElementById("back-to-home-btn");

  if (!container || !selector) return;

  const profiles = Profiles.getActiveProfiles();
  const currentProfile = Profiles.getCurrentProfile();
  const isViewingArchive = currentProfile?.archived;

  if (backToHomeBtn) {
    if (isViewingArchive) {
      backToHomeBtn.classList.remove("hidden");
      backToHomeBtn.onclick = handleBackToHome;
    } else {
      backToHomeBtn.classList.add("hidden");
    }
  }

  if (profiles.length === 0 && !isViewingArchive) {
    container.classList.add("hidden");
  } else {
    container.classList.remove("hidden");
    populateProfileSelector(selector, profiles, currentProfile, isViewingArchive);
  }

  if (manageBtn) {
    manageBtn.onclick = openManageModal;
  }

  const viewArchivesBtn = document.getElementById("view-archives-btn");
  if (viewArchivesBtn) {
    viewArchivesBtn.onclick = () => {
      globalThis.window.location.href = "archive.html";
    };
  }

  const updateBtn = document.getElementById("update-btn");
  if (updateBtn) {
    updateBtn.onclick = handleCheckForUpdates;
  }

  renderProfileCards();
}

function renderProfileCards() {
  const container = document.getElementById("profile-cards-container");
  if (!container) {
    createProfileCardsContainer();
    return;
  }

  const profiles = Profiles.getProfiles();
  const currentProfile = Profiles.getCurrentProfile();

  container.textContent = "";

  // First card: Scan for New Program
  const addCard = document.createElement("div");
  addCard.className = "profile-card add-profile-card";
  addCard.setAttribute("role", "button");
  addCard.setAttribute("tabindex", "0");

  const addCardContent = document.createElement("div");
  addCardContent.className = "profile-card-content";
  addCardContent.style.textAlign = "center";

  const addCardName = document.createElement("div");
  addCardName.className = "profile-card-name";
  addCardName.textContent = "+ Scan for New Program";
  addCardContent.appendChild(addCardName);

  addCard.appendChild(addCardContent);

  addCard.addEventListener("click", () => showScanner());
  addCard.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      showScanner();
    }
  });
  container.appendChild(addCard);

  // Second card: Active profile (if exists)
  if (currentProfile) {
    const card = createProfileCard(currentProfile, true, false);
    container.appendChild(card);
  }

  // Rest: All other profiles (not current) get gray bubble - they are not active
  const otherProfiles = profiles.filter((p) => p.id !== currentProfile?.id);
  otherProfiles.forEach((p) => {
    const card = createProfileCard(p, false, true);
    container.appendChild(card);
  });
}

function createProfileCardsContainer() {
  const container = document.getElementById("profile-selector-container");
  if (!container) return;

  const cardsContainer = document.createElement("div");
  cardsContainer.id = "profile-cards-container";
  cardsContainer.className = "profile-cards-container";

  container.appendChild(cardsContainer);

  renderProfileCards();
}

function createProfileCard(profile, isSelected, isInactive) {
  const card = document.createElement("div");
  card.className = `profile-card${isSelected ? " selected" : ""}`;
  card.setAttribute("role", "button");
  card.setAttribute("tabindex", "0");
  card.setAttribute("aria-pressed", isSelected);

  const statusDot = document.createElement("div");
  statusDot.className = "profile-status-dot";

  if (profile.obsolete) {
    statusDot.classList.add("migration");
  } else if (isInactive) {
    statusDot.classList.add("inactive");
  } else {
    statusDot.classList.add("active");
  }

  const content = document.createElement("div");
  content.className = "profile-card-content";

  const name = document.createElement("div");
  name.className = "profile-card-name";
  name.textContent = profile.unitName;

  const details = document.createElement("div");
  details.className = "profile-card-details";
  if (profile.stakeName) {
    details.textContent = profile.stakeName;
  }

  const meta = document.createElement("div");
  meta.className = "profile-card-meta";
  const lastUsedDate = new Date(profile.lastUsed);
  meta.textContent = `Last used: ${lastUsedDate.toLocaleDateString()}`;

  content.appendChild(name);
  if (profile.stakeName) {
    content.appendChild(details);
  }
  content.appendChild(meta);

  card.appendChild(statusDot);
  card.appendChild(content);

  card.addEventListener("click", async () => {
    await Profiles.selectProfile(profile.id);
    location.reload();
  });

  card.addEventListener("keydown", async (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      await Profiles.selectProfile(profile.id);
      location.reload();
    }
  });

  return card;
}

// Archive-related functions removed - functionality moved to archive.html page

function openManageModal() {
  const modal = document.getElementById("manage-profiles-modal");
  const closeBtn = document.getElementById("close-modal-btn");
  const addBtn = document.getElementById("add-new-program-btn");

  if (!modal) return;

  // Render list
  renderManageList();

  modal.showModal();

  closeBtn.onclick = () => modal.close();
  addBtn.onclick = () => {
    modal.close();
    showScanner();
  };
}

function renderManageList() {
  const list = document.getElementById("profiles-list");
  const archivedSection = document.getElementById("archived-section");
  const archivedList = document.getElementById("archived-list");
  if (!list) return;

  const profiles = Profiles.getProfiles();
  const currentProfile = Profiles.getCurrentProfile();

  list.textContent = "";

  if (profiles.length === 0) {
    const li = document.createElement("li");
    li.style.justifyContent = "center";
    li.style.opacity = "0.6";
    li.textContent = t("noSavedPrograms") || "No saved programs";
    list.appendChild(li);
  } else {
    // Show current profile first (no delete button - cannot delete active profile)
    if (currentProfile) {
      const li = createProfileListItem(currentProfile, currentProfile, false);
      list.appendChild(li);
    }

    // Show all other profiles (can be deleted)
    const otherProfiles = profiles.filter((p) => p.id !== currentProfile?.id);
    otherProfiles.forEach((p) => {
      const li = createProfileListItem(p, currentProfile, true);
      list.appendChild(li);
    });
  }

  // Hide archived section - we no longer separate inactive profiles
  if (archivedSection) {
    archivedSection.classList.add("hidden");
    if (archivedList) {
      clearElement(archivedList);
    }
  }
}

function createProfileListItem(p, currentProfile, canDelete) {
  const li = document.createElement("li");

  const info = document.createElement("div");
  info.className = "profile-info";

  const unit = document.createElement("span");
  unit.className = "profile-unit";
  unit.textContent = p.unitName;

  const stake = document.createElement("span");
  stake.className = "profile-stake";
  stake.textContent = p.stakeName || "";

  info.appendChild(unit);
  info.appendChild(stake);

  const actionsDiv = document.createElement("div");

  if (canDelete) {
    const delBtn = document.createElement("button");
    delBtn.className = "delete-btn";
    delBtn.textContent = t("delete");
    delBtn.onclick = async () => {
      if (
        confirm(
          `${t("remove")} ${p.unitName}? This will also delete all archived programs for this profile.`
        )
      ) {
        await Profiles.removeProfile(p.id);
        renderManageList();
        initProfileUI();
      }
    };
    actionsDiv.appendChild(delBtn);
  }
  // Active profile: no delete button (cannot be deleted)

  li.appendChild(info);
  li.appendChild(actionsDiv);
  return li;
}

// Helper: Handle adding a new program via QR code
async function handleNewProgramFromQR(url, unitName, stakeName) {
  const modal = document.getElementById("confirm-program-modal");
  const nameEl = document.getElementById("new-program-name");
  const addBtn = document.getElementById("confirm-add-btn");
  const cancelBtn = document.getElementById("cancel-add-btn");

  if (modal) {
    console.log("[MAIN] Modal found, showing...");
    const stakeNameDisplay = stakeName ? ` (${stakeName})` : "";
    nameEl.textContent = `${unitName}${stakeNameDisplay}`;

    addBtn.onclick = async () => {
      await Profiles.addProfile(url, unitName, stakeName);
      modal.close();
      location.reload();
    };

    cancelBtn.onclick = () => {
      modal.close();
      location.reload();
    };

    modal.showModal();
    console.log("[MAIN] modal.showModal() called");
  } else if (confirm(`Add Program: ${unitName}?`)) {
    // Fallback
    await Profiles.addProfile(url, unitName, stakeName);
    location.reload();
  } else {
    location.reload();
  }
}

// Helper: Parse QR code data
async function parseQRCodeData(url) {
  const csv = await fetchWithTimeout(url, 5000);
  const rows = await createWorker("parseCSV", csv, { language: getLanguage() });
  return rows;
}

// Helper: Process scanned QR code and handle profile switching/creation
async function handleQRCodeScanned(url) {
  const { setMetadata } = await import("./data/IndexedDBManager.js");
  const rows = await parseQRCodeData(url);
  const unitName = findRowValue(rows, "unitName", "Unknown Unit");
  const stakeName = findRowValue(rows, "stakeName");

  // Check if profile already exists
  const profiles = Profiles.getProfiles();
  const existingProfile = profiles.find((p) => p.url === url);

  // Skip onboarding help modal when switching profiles via QR
  await setMetadata("userPreference_helpShown", "true");

  if (existingProfile) {
    // Profile exists - just switch to it without modal
    await Profiles.selectProfile(existingProfile.id);
    location.reload();
    return;
  }

  // Show Confirm Modal for new profile
  await handleNewProgramFromQR(url, unitName, stakeName);
}

// Global listener for QR Scanned
globalThis.window.addEventListener("qr-scanned", async (e) => {
  const url = e.detail.url;
  if (!url) return;

  await Profiles.initProfiles();

  try {
    await handleQRCodeScanned(url);
  } catch (err) {
    console.error("QR Scan Failed:", err);
    alert("Could not load program from that QR code. Please try again.");
    location.reload();
  }
});

function updateElementText(elementId, translationKey) {
  const el = document.getElementById(elementId);
  if (el) el.textContent = t(translationKey);
}

function updateElementHTML(elementId, translationKey) {
  const el = document.getElementById(elementId);
  if (el) el.textContent = t(translationKey);
}

function updateElementAriaLabel(elementId, translationKey) {
  const el = document.getElementById(elementId);
  if (el) el.setAttribute("aria-label", t(translationKey));
}

function updateBasicStrings() {
  updateElementText("sacrament-services-title", "sacramentServices");
  updateElementHTML("church-name-display", "churchName");
  updateElementText("reload-btn", "reloadProgram");
  updateElementAriaLabel("manage-profiles-btn", "managePrograms");
  updateElementText("add-new-program-btn", "scanNewProgram");
  updateElementText("close-modal-btn", "close");
  updateElementAriaLabel("theme-toggle", "toggleDarkMode");
  updateElementText("welcome-to-text", "welcomeTo");
  updateElementText("manage-profiles-title", "managePrograms");
  updateElementText("confirm-program-title", "addProgram");
  updateElementText("language-modal-title", "selectLanguage");
  updateElementText("close-language-modal-btn", "close");
  updateElementText("history-modal-title", "programHistory");
  updateElementText("close-history-modal-btn", "close");
  updateElementText("found-label", "found");
  updateElementText("confirm-add-btn", "add");
  updateElementText("cancel-add-btn", "cancel");
}

function updateUpdateNotification() {
  const updateNotification = document.getElementById("update-notification");
  if (updateNotification && !updateNotification.hidden) {
    updateNotification.textContent = "";

    const updateText = document.createElement("span");
    updateText.textContent = t("updateAvailable");
    updateNotification.appendChild(updateText);

    const nbsp = document.createTextNode(" ");
    updateNotification.appendChild(nbsp);

    const updateBtn = document.createElement("button");
    updateBtn.textContent = t("update");
    updateBtn.onclick = () => refreshPage();
    updateNotification.appendChild(updateBtn);
  }
}

function updateOfflineBanner() {
  const offlineBanner = document.getElementById("offline-banner");
  if (offlineBanner) {
    offlineBanner.textContent = "";

    const offlineText = document.createElement("span");
    offlineText.textContent = t("offlineMode");
    offlineBanner.appendChild(offlineText);

    const nbsp = document.createTextNode(" ");
    offlineBanner.appendChild(nbsp);

    const retryLink = document.createElement("a");
    retryLink.href = "#";
    retryLink.id = "retry-offline";
    retryLink.style.color = "inherit";
    retryLink.style.textDecoration = "underline";
    retryLink.textContent = t("tryNow");
    offlineBanner.appendChild(retryLink);

    retryLink.onclick = (e) => {
      e.preventDefault();
      location.reload();
    };
  }
}

function updateLoadingText() {
  const loadingText = document.querySelector(".loading-text");
  if (loadingText) {
    loadingText.textContent = t("loading");
  }
}

async function updateActionButton() {
  const actionBtn = document.getElementById("qr-action-btn");
  if (actionBtn) {
    const params = new URLSearchParams(globalThis.window.location.search);
    const { getMetadata } = await import("./data/IndexedDBManager.js");
    const legacyUrl = await getMetadata("legacy_sheetUrl");
    const hasUrl = params.get("url") || Profiles.getCurrentProfile() || legacyUrl;
    actionBtn.textContent = hasUrl ? t("useNewQR") : t("scanProgramQR");
  }
}

function updateChurchSvgName() {
  const churchSvgText = document.getElementById("church-svg-text");
  if (!churchSvgText) return;

  const tspans = churchSvgText.getElementsByTagName("tspan");
  if (tspans.length < 2) return;

  const fullChurchName = t("churchName");
  if (fullChurchName.length <= 30) {
    tspans[0].textContent = fullChurchName;
    tspans[1].textContent = "";
    return;
  }

  const splitters = ["of ", " de ", " la ", " La "];
  for (const splitter of splitters) {
    const splitIdx = fullChurchName.indexOf(splitter);
    if (splitIdx !== -1) {
      tspans[0].textContent = fullChurchName.substring(0, splitIdx).trim();
      tspans[1].textContent = fullChurchName.substring(splitIdx).trim();
      return;
    }
  }

  tspans[0].textContent = fullChurchName;
  tspans[1].textContent = "";
}

async function updateStaticStrings() {
  updateBasicStrings();
  updateUpdateNotification();
  updateOfflineBanner();
  updateLoadingText();
  await updateActionButton();
  updateChurchSvgName();
}

function initLanguageSelector() {
  const btn = document.getElementById("language-selector-btn");
  if (!btn) return;

  btn.addEventListener("click", openLanguageModal);

  // Set initial text
  const currentLang = getLanguage();
  const langNames = {
    en: "English",
    es: "Español",
    fr: "Français",
    swa: "Kiswahili"
  };
  const textEl = document.getElementById("current-language-text");
  if (textEl) textEl.textContent = langNames[currentLang] || currentLang;
}

function openLanguageModal() {
  const modal = document.getElementById("language-modal");
  const closeBtn = document.getElementById("close-language-modal-btn");

  if (!modal) return;

  renderLanguageList();
  modal.showModal();

  if (closeBtn) {
    closeBtn.onclick = () => modal.close();
  }
}

// Helper: Handle language selection
let languageReloadTimer = null;

async function handleLanguageSelection(langCode) {
  await setLanguage(langCode);
  if (languageReloadTimer) clearTimeout(languageReloadTimer);
  languageReloadTimer = setTimeout(async () => {
    await updateStaticStrings();
    location.reload();
  }, 50);
}

function renderLanguageList() {
  const list = document.getElementById("language-list");
  if (!list) return;

  const languages = [
    { code: "en", name: "English" },
    { code: "es", name: "Español" },
    { code: "fr", name: "Français" },
    { code: "swa", name: "Kiswahili" }
  ];

  const currentLang = getLanguage();
  list.textContent = "";

  languages.forEach((lang) => {
    const li = document.createElement("li");
    li.className = "language-item";
    li.onclick = () => handleLanguageSelection(lang.code);

    const nameSpan = document.createElement("span");
    nameSpan.className = "language-name";
    nameSpan.textContent = lang.name;

    li.appendChild(nameSpan);

    if (lang.code === currentLang) {
      const check = document.createElement("span");
      check.className = "selected-check";
      check.textContent = "✓";
      li.appendChild(check);
    }

    list.appendChild(li);
  });
}

function initHistoryUI() {
  const historyBtn = document.getElementById("history-btn");
  if (!historyBtn) return;

  historyBtn.onclick = openHistoryModal;
}

function openHistoryModal() {
  const modal = document.getElementById("history-modal");
  const closeBtn = document.getElementById("close-history-modal-btn");

  if (!modal) return;

  renderHistoryList();
  modal.showModal();

  if (closeBtn) {
    closeBtn.onclick = () => modal.close();
  }
}

function renderHistoryList() {
  const list = document.getElementById("history-list");
  if (!list) return;

  const currentProfile = Profiles.getCurrentProfile();
  if (!currentProfile) {
    const li = document.createElement("li");
    li.style.justifyContent = "center";
    li.style.opacity = "0.6";
    li.textContent = t("noHistory") || "No history available";
    list.appendChild(li);
    return;
  }

  const history = getProgramHistory(currentProfile.id);

  if (history.length === 0) {
    const li = document.createElement("li");
    li.style.justifyContent = "center";
    li.style.opacity = "0.6";
    li.textContent = t("noHistory") || "No history available";
    list.appendChild(li);
    return;
  }

  list.textContent = "";

  history.forEach((entry) => {
    const li = document.createElement("li");
    li.className = "history-item";

    const info = document.createElement("div");
    info.className = "history-info";

    const date = document.createElement("span");
    date.className = "history-date";
    date.textContent = entry.date;

    info.appendChild(date);

    const loadBtn = document.createElement("button");
    loadBtn.className = "load-history-btn";
    loadBtn.textContent = t("loadProgram");
    loadBtn.onclick = () => {
      loadProgramFromHistory(entry.data);
      document.getElementById("history-modal").close();
    };

    li.appendChild(info);
    li.appendChild(loadBtn);
    list.appendChild(li);
  });
}

function loadProgramFromHistory(rows) {
  const main = document.getElementById("main-program");
  clearElement(main);
  renderProgram(rows);
  updateTimestamp();
}

if (typeof globalThis.window !== "undefined" && !globalThis.window.__VITEST__) {
  // Check for force update parameter
  const urlParams = new URLSearchParams(globalThis.window.location.search);
  const forceUpdate = urlParams.get("forceUpdate") === "true";
  const nocache = urlParams.get("nocache") === "true";

  if (forceUpdate || nocache) {
    // Remove both parameters and reload with clean URL
    urlParams.delete("forceUpdate");
    urlParams.delete("nocache");

    // Add timestamp to bust any browser cache
    urlParams.set("t", Date.now().toString());

    const newUrl = globalThis.window.location.pathname + "?" + urlParams.toString();

    if (navigator.serviceWorker?.controller) {
      navigator.serviceWorker.controller.postMessage({ action: "skipWaiting" });
      const navRedirectTimer = setTimeout(() => {
        globalThis.window.location.href = newUrl;
        clearTimeout(navRedirectTimer);
      }, 1000);
    } else {
      // No SW, just reload with cache-busted URL
      globalThis.window.location.href = newUrl;
    }
  }

  const debouncedHandleVisibility = debounce(handleVersionVisibility, 100);
  globalThis.window.addEventListener("scroll", debouncedHandleVisibility);
  globalThis.window.addEventListener("resize", debouncedHandleVisibility);

  globalThis.window.addEventListener("online", () => {
    const banner = document.getElementById("offline-banner");
    if (banner) {
      banner.classList.remove("visible");
    }
    // Auto-refresh program when back online
    init();
  });

  // Ensure help modal is properly initialized before init()
  if (typeof window !== "undefined") {
    const initializeApp = async () => {
      const mainProgram = document.getElementById("main-program");
      if (mainProgram) {
        mainProgram.classList.add("loading");
      }

      // after renderProgram(...)
      if (mainProgram) {
        mainProgram.classList.remove("loading");
      }

      // Run once on load
      handleVersionVisibility();

      await initI18n();
      initNetworkStatus();
      initPrintButton();
      initLanguageSelector();
      initHistoryUI();
      initShareUI();
      initAgendaSettings();
      initLeadershipToggle();
      initDiagnosticButton();
      promptPWAInstall();
      await updateStaticStrings();
      // Ensure help modal is properly initialized before init()
      if (typeof globalThis.window !== "undefined" && !globalThis.window.__VITEST__) {
        const { getMetadata } = await import("./data/IndexedDBManager.js");
        const helpShown = await getMetadata("userPreference_helpShown");
        if (!helpShown) {
          openHelpModal();
        }
      }
      if (!globalThis.window.__VITEST__) {
        await init();
      }
    };

    initializeApp().catch((err) => {
      console.error("[INIT] Fatal initialization error:", err);
      const main = document.getElementById("main-program");
      if (main) {
        const errorContainer = createTextElement("div", "", {
          padding: "20px",
          color: "red",
          textAlign: "center",
          fontFamily: "monospace"
        });

        const title = document.createElement("p");
        const titleStrong = document.createElement("strong");
        titleStrong.textContent = "Failed to initialize app";
        title.appendChild(titleStrong);

        const errorDetails = createTextElement("p", err.message, {
          fontSize: "12px",
          whiteSpace: "pre-wrap",
          textAlign: "left",
          background: "#f0f0f0",
          padding: "10px",
          borderRadius: "4px",
          overflowX: "auto"
        });

        const helpText = createTextElement(
          "p",
          "Check browser console (DevTools) for full error stack",
          {
            fontSize: "12px"
          }
        );

        errorContainer.appendChild(title);
        errorContainer.appendChild(errorDetails);
        errorContainer.appendChild(helpText);
        main.appendChild(errorContainer);
      }
    });
  }
}

// Re-export from utils/renderers.js
export {
  splitHymn,
  splitLeadership,
  appendRow,
  appendRowHymn,
  renderSpeaker,
  renderLeader,
  renderGeneralStatementWithLink,
  renderGeneralStatement,
  renderLink,
  renderLinkWithSpace,
  renderProgram,
  renderLineBreak,
  renderDate,
  renderUnitAddress,
  renderUnitName,
  renderers
} from "./utils/renderers.js";

// Re-export from utils/csv.js
export { fetchSheet, parseCSV } from "./utils/csv.js";

// Keep local exports
export { init, fetchWithTimeout };
