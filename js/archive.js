/**
 * archive.js
 * Archive page logic
 * Handles viewing and managing archived programs
 */

console.log("[Archive] archive.js loaded");

import * as ArchiveManager from "./data/ArchiveManager.js";
import { t } from "./i18n/index.js";

function escapeHtml(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

let initTheme, toggleTheme;
let Profiles;
let currentProfile = null;
let currentArchive = null;

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

    // Load profile and archives
    await loadProfileAndArchives();
  } catch (err) {
    console.error("[Archive] Error in init:", err);
  } finally {
    // Hide loading spinner
    const loadingContainer = document.querySelector(".loading-container");
    if (loadingContainer) {
      loadingContainer.classList.add("hidden");
    }
  }
}

async function loadProfileAndArchives() {
  console.log("[Archive] loadProfileAndArchives called");

  // Ensure Profiles module is initialized
  if (!Profiles || !Profiles.getCurrentProfile) {
    console.warn("[Archive] Profiles module not initialized");
    return;
  }

  currentProfile = await Profiles.getCurrentProfile();
  console.log("[Archive] Current profile:", currentProfile);
  console.log("[Archive] currentProfile variable type:", typeof currentProfile);
  console.log("[Archive] currentProfile is defined:", typeof currentProfile !== "undefined");

  // If no profile selected but there are profiles, select the first one
  if (!currentProfile) {
    const profiles = await Profiles.getActiveProfiles();
    console.log("[Archive] Active profiles:", profiles);
    if (profiles && profiles.length > 0) {
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
  elements.archivesList.innerHTML = "";
  elements.noArchives.textContent = "No profile selected";
  elements.noArchives.classList.remove("hidden");
  console.log("[Archive] showNoProfileMessage called");
  console.log("[Archive] currentProfile in showNoProfileMessage:", currentProfile);
  console.log("[Archive] currentProfile is defined:", typeof currentProfile !== "undefined");
}

function extractArchiveInfo(csvData) {
  if (!csvData || !Array.isArray(csvData)) return {};

  const info = {};
  const speakers = [];

  csvData.forEach((row) => {
    if (row.key === "presiding" && row.value) info.presiding = row.value;
    if (row.key === "conducting" && row.value) info.conducting = row.value;
    if (row.key === "programDate" && row.value) info.programDate = row.value;
    if (row.key === "date" && row.value) info.date = row.value;
    if (row.key === "unitName" && row.value) info.unitName = row.value;
    if (row.key === "unitAddress" && row.value) info.unitAddress = row.value;

    // Extract speakers
    if (row.key.startsWith("speaker") && row.key !== "speaker") {
      const speakerNum = row.key.replace("speaker", "");
      if (row.value) {
        speakers.push(row.value);
      }
    }
  });

  if (speakers.length > 0) {
    info.speakers = speakers;
  }

  return info;
}

async function loadArchives() {
  console.log("[Archive] loadArchives called, profile:", currentProfile?.id);
  console.log("[Archive] currentProfile in loadArchives:", currentProfile);
  console.log("[Archive] currentProfile is defined:", typeof currentProfile !== "undefined");
  if (!currentProfile) {
    console.log("[Archive] No profile, cannot load archives");
    return;
  }

  // Set the unit name display
  if (elements.archiveUnitName && currentProfile.unitName) {
    elements.archiveUnitName.textContent = currentProfile.unitName;
    elements.archiveUnitName.classList.remove("hidden");
  }

  console.log("[Archive] Getting archives for profile:", currentProfile.id);
  const archives = await ArchiveManager.getProfileArchives(currentProfile.id);
  console.log("[Archive] Got archives:", archives?.length || 0, archives);

  elements.archivesList.innerHTML = "";

  if (!archives || archives.length === 0) {
    elements.noArchives.textContent = "No archived programs";
    elements.noArchives.classList.remove("hidden");
    return;
  }

  elements.noArchives.classList.add("hidden");

  archives.forEach((archive) => {
    const info = extractArchiveInfo(archive.csvData);

    const card = document.createElement("div");
    card.className = "profile-card";

    const date = escapeHtml(archive.programDate) || "Unknown Date";
    const conducting = escapeHtml(info.conducting) || "";
    const presiding = escapeHtml(info.presiding) || "";

    card.innerHTML = `
      <div class="profile-card-content">
        <div class="profile-card-name">${date}</div>
        <div class="profile-card-details">${conducting ? `Conducting: ${conducting}` : ""}</div>
        <div class="profile-card-details">Speakers:</div>
        ${info.speakers && info.speakers.length > 0 ? info.speakers.map((speaker) => `<div class="profile-card-details">${escapeHtml(speaker)}</div>`).join("") : "<div class=\"profile-card-details\">No speakers</div>"}
      </div>
    `;

    card.onclick = () => viewArchive(archive);

    elements.archivesList.appendChild(card);
  });
}

function viewArchive(archive) {
  console.log("[Archive] viewArchive called, currentProfile:", currentProfile);
  console.log("[Archive] currentProfile is defined:", typeof currentProfile !== "undefined");
  currentArchive = archive;

  // Extract archive info for display
  const info = extractArchiveInfo(archive.csvData);

  // Use renderers to properly format unit information
  if (elements.unitName && info.unitName) renderers.unitName(info.unitName);
  if (elements.unitAddress && info.unitAddress) renderers.unitAddress(info.unitAddress);
  if (elements.date && archive.programDate) renderers.date(archive.programDate);

  // Render program data
  elements.mainProgram.innerHTML = "";
  renderProgram(archive.csvData);

  // Show program view, hide list view
  elements.archiveListView.classList.add("hidden");
  elements.archiveProgramView.classList.remove("hidden");

  // Add archive-view class for styling
  document.body.classList.add("archive-view");
}

import { renderers } from "./utils/renderers.js";

function renderProgram(rows) {
  if (!rows || !Array.isArray(rows)) {
    elements.mainProgram.innerHTML = "<p>" + t("noProgramDataAvailable") + "</p>";
    return;
  }

  // Clear existing content
  elements.mainProgram.innerHTML = "";

  // Use the same rendering logic as the main application
  rows.forEach(({ key, value }) => {
    const isHorizontalLine = key.toLowerCase() === "horizontalline";
    const isEmpty = !value || value.trim() === "";

    if (isEmpty && !isHorizontalLine) return;

    const renderer = renderers[key];
    if (renderer) renderer(value || "");
  });
}

async function deleteArchive(archive) {
  if (!confirm(`Delete archive for ${archive.programDate}?`)) {
    return;
  }

  await ArchiveManager.deleteArchive(currentProfile.id, archive.programDate);
  await loadArchives();
}

function setupEventListeners() {
  console.log("[Archive] Setting up event listeners");

  // Return to home
  const backToHomeBtn = document.getElementById("back-to-home-btn");
  console.log("[Archive] Back to home button:", backToHomeBtn);
  if (backToHomeBtn) {
    backToHomeBtn.onclick = () => {
      console.log("[Archive] Back to home clicked");
      window.location.href = "index.html";
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
