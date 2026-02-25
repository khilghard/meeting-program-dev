/**
 * MigrationBanner.js
 * Handles the migration banner UI and user interactions.
 */

import { t } from "../i18n/index.js";
import { addProfile, selectProfile } from "./ProfileManager.js";

let bannerElement = null;
let currentMigrationUrl = null;
let currentProfileId = null;
let autoHideTimer = null;
let hasShownThisSession = false;

export function initMigrationBanner() {
  if (bannerElement) return;

  bannerElement = document.createElement("div");
  bannerElement.id = "migration-banner";
  bannerElement.className = "migration-banner hidden";
  bannerElement.setAttribute("role", "alert");
  bannerElement.setAttribute("aria-live", "polite");

  bannerElement.innerHTML = `
    <span class="migration-icon">⚠️</span>
    <span class="migration-message">${t("migrationAvailable")}</span>
    <button class="migration-btn" id="migration-view-btn">${t("viewNewProgram")}</button>
    <button class="migration-btn secondary" id="migration-dismiss-btn">${t("remindMeLater")}</button>
    <button class="migration-close-btn" id="migration-close-btn" aria-label="${t("close")}">×</button>
  `;

  const app = document.getElementById("app");
  if (app) {
    app.insertBefore(bannerElement, app.firstChild);
  }

  document.getElementById("migration-view-btn").addEventListener("click", handleViewNewProgram);
  document.getElementById("migration-dismiss-btn").addEventListener("click", handleRemindLater);
  document.getElementById("migration-close-btn").addEventListener("click", handleClose);
}

export async function showMigrationBanner(profileId, migrationUrl) {
  if (hasShownThisSession) return;

  initMigrationBanner();

  currentProfileId = profileId;
  currentMigrationUrl = migrationUrl;

  bannerElement.classList.remove("hidden");
  hasShownThisSession = true;

  autoHideTimer = setTimeout(() => {
    hideMigrationBanner();
  }, 10000);
}

export function hideMigrationBanner() {
  if (!bannerElement) return;

  bannerElement.classList.add("hidden");

  if (autoHideTimer) {
    clearTimeout(autoHideTimer);
    autoHideTimer = null;
  }
}

async function handleViewNewProgram() {
  if (!currentMigrationUrl) return;

  const viewBtn = document.getElementById("migration-view-btn");
  const originalText = viewBtn.textContent;
  viewBtn.textContent = t("migrationLoading");
  viewBtn.disabled = true;

  try {
    const newProfile = await addProfile(currentMigrationUrl, null, null);

    if (newProfile) {
      await selectProfile(newProfile.id);

      hideMigrationBanner();

      window.location.reload();
    } else {
      throw new Error("Failed to create profile");
    }
  } catch (error) {
    console.error("Migration failed:", error);
    viewBtn.textContent = t("migrationError");

    setTimeout(() => {
      viewBtn.textContent = originalText;
      viewBtn.disabled = false;
    }, 3000);
  }
}

async function handleRemindLater() {
  const { saveMigrationPreference } = await import("./MigrationSystem.js");

  if (currentProfileId) {
    await saveMigrationPreference(currentProfileId, true);
  }

  hideMigrationBanner();
}

function handleClose() {
  hideMigrationBanner();
}

export function resetMigrationBannerSession() {
  hasShownThisSession = false;
}
