/**
 * archive.js
 * Archive page logic
 * Handles viewing and managing archived programs
 */

console.log("[Archive] archive.js loaded");

import * as ArchiveManager from "./data/ArchiveManager.js";
import { t } from "./i18n/index.js";
import { renderers } from "./utils/renderers.js";
import { clearElement, setText } from "./utils/dom-utils.js";

function escapeHtml(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replaceAll(/</g, "&lt;")
    .replaceAll(/>/g, "&gt;")
    .replaceAll(/"/g, "&quot;")
    .replaceAll(/'/g, "&#039;");
}

let initTheme, toggleTheme;
let Profiles;
let currentProfile = null;

// DOM Elements
const elements = {
  archiveListView: null,
  archiveProgramView: null,
  archivesList: null,
  noArchives: null,
  unitName: null,
  unitAddress: null,
  date: null,
  mainProgram: null,
  archiveUnitName: null,
  themeToggle: null
};

function initDOMElements() {
  elements.archiveListView = document.getElementById("archive-list-view");
  elements.archiveProgramView = document.getElementById("archive-program-view");
  elements.archivesList = document.getElementById("archives-list");
  elements.noArchives = document.getElementById("no-archives");
  elements.unitName = document.getElementById("unitname");
  elements.unitAddress = document.getElementById("unitaddress");
  elements.date = document.getElementById("date");
  elements.mainProgram = document.getElementById("main-program");
  elements.archiveUnitName = document.getElementById("archive-unit-name");
  elements.themeToggle = document.getElementById("theme-toggle");
}

async function init() {
  console.log("[Archive] init called");

  // Initialize i18n system first
  // Import and initialize the i18n module
  const i18nModule = await import("./i18n/index.js");
  i18nModule.initI18n();
  console.log("[Archive] i18n initialized");

  // Load theme module
  const themeModule = await import("./theme.js");
  initTheme = themeModule.initTheme;
  toggleTheme = themeModule.toggleTheme;
  console.log("[Archive] Theme module loaded");

  // Initialize theme system immediately
  initTheme();
  console.log("[Archive] Theme system initialized");

  // Load profiles module
  Profiles = await import("./data/ProfileManager.js");
  console.log("[Archive] Profiles module loaded");

  try {
    initDOMElements();
    console.log("[Archive] DOM elements:", {
      archiveListView: !!elements.archiveListView,
      archivesList: !!elements.archivesList,
      noArchives: !!elements.noArchives
    });

    // Initialize profiles
    await Profiles.initProfileManager();
    console.log("[Archive] Profiles initialized");

    // Setup event listeners
    setupEventListeners();

    await loadProfileAndArchives();
  } catch (err) {
    console.error("[Archive] Init failed:", err);
    const loadingContainer = document.querySelector(".loading-container");
    if (loadingContainer) {
      loadingContainer.classList.add("hidden");
    }
    return;
  }

  // Hide loading spinner
  const loadingContainer = document.querySelector(".loading-container");
  if (loadingContainer) {
    loadingContainer.classList.add("hidden");
  }
}

async function loadProfileAndArchives() {
  console.log("[Archive] loadProfileAndArchives called");

  // Ensure Profiles module is initialized
  if (!Profiles?.getCurrentProfile) {
    console.warn("[Archive] Profiles module not initialized");
    return;
  }

  currentProfile = await Profiles.getCurrentProfile();
  console.log("[Archive] Current profile:", currentProfile);
  console.log("[Archive] currentProfile variable type:", typeof currentProfile);
  console.log("[Archive] currentProfile is defined:", currentProfile !== undefined);

  // If no profile selected but there are profiles, select the first one
  if (!currentProfile) {
    const profiles = await Profiles.getActiveProfiles();
    console.log("[Archive] Active profiles:", profiles);
    if (profiles?.length > 0) {
      await Profiles.selectProfile(profiles[0].id);
      currentProfile = await Profiles.getCurrentProfile();
      console.log("[Archive] Auto-selected profile:", currentProfile);
    }
  }

  if (!currentProfile) {
    console.log("[Archive] No profile available");
    showNoProfileMessage();
    return;
  }

  // Initialize archive manager
  await ArchiveManager.initArchiveManager();
  console.log("[Archive] Archive manager initialized");

  // Load archives for current profile
  await loadArchives();
}

function showNoProfileMessage() {
  clearElement(elements.archivesList);
  setText(elements.noArchives, t("noProfileSelected") || "No profile selected");
  elements.noArchives.classList.remove("hidden");
  console.log("[Archive] showNoProfileMessage called");
  console.log("[Archive] currentProfile in showNoProfileMessage:", currentProfile);
  console.log("[Archive] currentProfile is defined:", currentProfile !== undefined);
}

// Helper: Extract metadata from CSV row
function extractMetadataFromRow(row, info) {
  const metadataMap = {
    presiding: "presiding",
    conducting: "conducting",
    programDate: "programDate",
    date: "date",
    unitName: "unitName",
    unitAddress: "unitAddress"
  };

  if (row.key in metadataMap && row.value) {
    info[metadataMap[row.key]] = row.value;
  }
}

// Helper: Extract speakers from CSV data
function extractSpeakers(csvData) {
  const speakers = [];
  csvData.forEach((row) => {
    // Include rows where the key is "speaker" (sanitizeEntry converts speaker1, speaker2, etc. to "speaker")
    if (row.key === "speaker" && row.value) {
      speakers.push(row.value);
    }
  });
  return speakers;
}

function extractProgramInfo(csvData) {
  if (!csvData || !Array.isArray(csvData)) return {};

  const info = {};
  csvData.forEach((row) => {
    extractMetadataFromRow(row, info);
  });

  const speakers = extractSpeakers(csvData);
  if (speakers.length > 0) {
    info.speakers = speakers;
  }

  return info;
}

async function loadArchives() {
  console.log("[Archive] loadArchives called, profile:", currentProfile?.id);
  console.log("[Archive] currentProfile in loadArchives:", currentProfile);
  console.log("[Archive] currentProfile is defined:", currentProfile !== undefined);
  if (!currentProfile) {
    console.log("[Archive] No profile, cannot load archives");
    return;
  }

  // Set the unit name display
  if (elements.archiveUnitName && currentProfile?.unitName) {
    elements.archiveUnitName.textContent = currentProfile.unitName;
    elements.archiveUnitName.classList.remove("hidden");
  }

  console.log("[Archive] Getting archives for profile:", currentProfile.id);
  const archives = await ArchiveManager.getProfileArchives(currentProfile.id);
  console.log("[Archive] Got archives:", archives?.length || 0, archives);

  clearElement(elements.archivesList);

  if (!archives || archives.length === 0) {
    setText(elements.noArchives, t("noArchives") || "No archived programs");
    elements.noArchives.classList.remove("hidden");
    return;
  }

  elements.noArchives.classList.add("hidden");

  archives.forEach((archive) => {
    const info = extractProgramInfo(archive.csvData);

    const card = document.createElement("div");
    card.className = "profile-card";

    const date = escapeHtml(archive.programDate) || "Unknown Date";
    const conducting = escapeHtml(info.conducting) || "";

    const content = document.createElement("div");
    content.className = "profile-card-content";

    const dateDiv = document.createElement("div");
    dateDiv.className = "profile-card-name";
    dateDiv.textContent = date;
    content.appendChild(dateDiv);

    if (conducting) {
      const conductingDiv = document.createElement("div");
      conductingDiv.className = "profile-card-details";
      conductingDiv.textContent = `Conducting: ${conducting}`;
      content.appendChild(conductingDiv);
    }

    if (info.speakers?.length > 0) {
      const speakersLabel = document.createElement("div");
      speakersLabel.className = "profile-card-details";
      speakersLabel.textContent = "Speakers:";
      content.appendChild(speakersLabel);

      info.speakers.forEach((speaker) => {
        const speakerDiv = document.createElement("div");
        speakerDiv.className = "profile-card-details";
        speakerDiv.textContent = escapeHtml(speaker);
        content.appendChild(speakerDiv);
      });
    }

    card.appendChild(content);
    card.onclick = () => viewArchive(archive);

    elements.archivesList.appendChild(card);
  });
}

function viewArchive(archive) {
  console.log("[Archive] viewArchive called, currentProfile:", currentProfile);
  console.log("[Archive] currentProfile is defined:", currentProfile !== undefined);

  // Extract archive info for display
  const info = extractProgramInfo(archive.csvData);

  // Use renderers to properly format unit information
  renderArchiveInfo(info, archive.programDate);

  // Render program data
  elements.mainProgram.textContent = "";
  renderProgram(archive.csvData);

  // Show program view, hide list view
  elements.archiveListView.classList.add("hidden");
  elements.archiveProgramView.classList.remove("hidden");

  // Add archive-view class for styling
  document.body.classList.add("archive-view");
}

// Helper: Render archive metadata in UI
function renderArchiveInfo(info, programDate) {
  if (elements.unitName && info.unitName) renderers.unitName(info.unitName);
  if (elements.unitAddress && info.unitAddress) renderers.unitAddress(info.unitAddress);
  if (elements.date && programDate) renderers.date(programDate);
}

function renderProgram(rows) {
  if (!rows || !Array.isArray(rows)) {
    const paragraph = document.createElement("p");
    paragraph.textContent = t("noProgramDataAvailable") || "No program data available";
    elements.mainProgram.appendChild(paragraph);
    return;
  }

  // Clear existing content
  elements.mainProgram.textContent = "";

  // Use the same rendering logic as the main application
  rows.forEach(({ key, value }) => {
    const isHorizontalLine = key.toLowerCase() === "horizontalline";
    const allowEmpty = isHorizontalLine || key === "sacramentLine" || key === "oilLamp";
    const isEmpty = !value || value.trim() === "";

    if (isEmpty && !allowEmpty) return;

    const renderer = renderers[key];
    if (renderer) renderer(value || "");
  });
}

function setupEventListeners() {
  console.log("[Archive] Setting up event listeners");

  // Return to home
  const backToHomeBtn = document.getElementById("back-to-home-btn");
  console.log("[Archive] Back to home button:", backToHomeBtn);
  if (backToHomeBtn) {
    backToHomeBtn.onclick = () => {
      console.log("[Archive] Back to home clicked");
      globalThis.window.location.href = "index.html";
    };
  }

  // Back to archives (from program view)
  const backToListBtn = document.getElementById("back-to-list-btn");
  if (backToListBtn) {
    // Set the button text after i18n is initialized
    backToListBtn.textContent = t("backToArchiveList");
    backToListBtn.onclick = () => {
      elements.archiveProgramView.classList.add("hidden");
      elements.archiveListView.classList.remove("hidden");
      document.body.classList.remove("archive-view");
    };
  }

  // Theme toggle
  if (elements.themeToggle) {
    elements.themeToggle.onclick = toggleTheme;
  }
}

// Start the app
function runInit() {
  init().catch((err) => {
    console.error("[Archive] Error during init:", err);
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", runInit);
} else {
  runInit();
}

// Export helper functions for testing
export { escapeHtml, extractMetadataFromRow, extractSpeakers, extractProgramInfo };
