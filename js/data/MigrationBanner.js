/**
 * MigrationBanner.js
 * Handles the migration banner UI and user interactions.
 */

import { t } from "../i18n/index.js";
import { addProfile, selectProfile } from "./ProfileManager.js";
import { createTimer, clearTimer } from "../utils/timer-manager.js";

let bannerElement = null;
let currentMigrationUrl = null;
let currentProfileId = null;
let hasShownThisSession = false;

export function initMigrationBanner() {
  if (bannerElement) return;

  bannerElement = document.createElement("div");
  bannerElement.id = "migration-banner";
  bannerElement.className = "migration-banner hidden";
  bannerElement.setAttribute("role", "alert");
  bannerElement.setAttribute("aria-live", "polite");

  const icon = document.createElement("span");
  icon.className = "migration-icon";
  icon.textContent = "⚠️";
  bannerElement.appendChild(icon);

  const message = document.createElement("span");
  message.className = "migration-message";
  message.textContent = t("migrationAvailable");
  bannerElement.appendChild(message);

  const viewBtn = document.createElement("button");
  viewBtn.className = "migration-btn";
  viewBtn.id = "migration-view-btn";
  viewBtn.textContent = t("viewNewProgram");
  bannerElement.appendChild(viewBtn);

  const dismissBtn = document.createElement("button");
  dismissBtn.className = "migration-btn secondary";
  dismissBtn.id = "migration-dismiss-btn";
  dismissBtn.textContent = t("remindMeLater");
  bannerElement.appendChild(dismissBtn);

  const closeBtn = document.createElement("button");
  closeBtn.className = "migration-close-btn";
  closeBtn.id = "migration-close-btn";
  closeBtn.setAttribute("aria-label", t("close"));
  closeBtn.textContent = "×";
  bannerElement.appendChild(closeBtn);

  const app = document.getElementById("app");
  if (app) {
    app.insertBefore(bannerElement, app.firstChild);
  }

  document.getElementById("migration-view-btn").addEventListener("click", handleViewNewProgram);
  document.getElementById("migration-dismiss-btn").addEventListener("click", handleRemindLater);
  document.getElementById("migration-close-btn").addEventListener("click", handleClose);
}

export function showMigrationBanner(profileId, migrationUrl) {
  if (hasShownThisSession) return;

  initMigrationBanner();

  currentProfileId = profileId;
  currentMigrationUrl = migrationUrl;

  bannerElement.classList.remove("hidden");
  hasShownThisSession = true;

  clearTimer("migration_auto_hide");
  createTimer(10000, "migration_auto_hide");
  const autoHideTimer = setTimeout(() => {
    hideMigrationBanner();
    clearTimeout(autoHideTimer);
  }, 10000);
}

export function hideMigrationBanner() {
  if (!bannerElement) return;

  bannerElement.classList.add("hidden");

  clearTimer("migration_auto_hide");
  clearTimer("migration_error_reset");
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

      globalThis.window.location.reload();
    } else {
      throw new Error("Failed to create profile");
    }
  } catch (error) {
    console.error("Migration failed:", error);
    viewBtn.textContent = t("migrationError");

    clearTimer("migration_error_reset");
    createTimer(3000, "migration_error_reset");
    const errorResetTimer = setTimeout(() => {
      viewBtn.textContent = originalText;
      viewBtn.disabled = false;
      clearTimeout(errorResetTimer);
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
