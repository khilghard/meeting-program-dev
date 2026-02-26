/**
 * @fileoverview Update Manager for PWA updates
 * @module js/update-manager
 */

import { checkForUpdates as doVersionCheck } from "./version-checker.js";
import {
  register,
  triggerUpdate,
  checkForUpdate,
  watchForControllerChange
} from "./service-worker-manager.js";
import { t } from "./i18n/index.js";

const ERROR_TYPES = {
  NETWORK_ERROR: "NETWORK_ERROR",
  PARSE_ERROR: "PARSE_ERROR",
  VERSION_ERROR: "VERSION_ERROR",
  SW_ERROR: "SW_ERROR",
  UNKNOWN_ERROR: "UNKNOWN_ERROR"
};

const ERROR_MESSAGES = {
  networkError: "Unable to check for updates. Please try again later.",
  parseError: "Unable to read update information.",
  updateError: "Update failed. Please try again or refresh the page.",
  unknownError: "An unexpected error occurred."
};

const DEBUG = localStorage.getItem("update_debug") === "true";

let checkedThisSession = false;
let autoUpdateTimer = null;
const AUTO_UPDATE_DELAY_MS = 300000;

function log(message, ...args) {
  if (DEBUG) {
    console.log("[UPDATE]", message, ...args);
  }
}

function logError(context, error) {
  console.error("[UPDATE] Error:", context, error);
}

function handleError(error, context = "unknown") {
  let errorType = ERROR_TYPES.UNKNOWN_ERROR;
  let userMessage = ERROR_MESSAGES.unknownError;
  let errorMessage = error?.message || String(error);

  if (errorMessage.includes("fetch") || errorMessage.includes("network")) {
    errorType = ERROR_TYPES.NETWORK_ERROR;
    userMessage = ERROR_MESSAGES.networkError;
  } else if (errorMessage.includes("JSON") || errorMessage.includes("parse")) {
    errorType = ERROR_TYPES.PARSE_ERROR;
    userMessage = ERROR_MESSAGES.parseError;
  } else if (errorMessage.includes("service worker") || errorMessage.includes("sw")) {
    errorType = ERROR_TYPES.SW_ERROR;
    userMessage = ERROR_MESSAGES.updateError;
  }

  logError(context, error);

  return { errorType, userMessage, originalError: error };
}

export async function init() {
  register();
  watchForControllerChange();
  try {
    await doVersionCheck();
  } catch (error) {
    handleError(error, "init");
  }
}

export async function checkForUpdates(force = false) {
  if (checkedThisSession && !force) {
    log("Already checked this session");
    return;
  }

  checkedThisSession = true;
  log("Checking for updates...");

  try {
    const result = await doVersionCheck();
    log("Result:", result);

    if (result.needsUpdate) {
      showUpdateBanner(result);
      scheduleAutoUpdate(AUTO_UPDATE_DELAY_MS);
    } else {
      hideBanner();
    }
  } catch (error) {
    handleError(error, "checkForUpdates");
  }
}

export function showUpdateBanner(versionInfo) {
  const banner = document.getElementById("update-notification");
  const message = document.querySelector(".update-message");
  const updateBtn = document.getElementById("update-now-btn");
  const closeBtn = document.getElementById("update-close-btn");

  if (!banner) {
    log("Update banner not found");
    return;
  }

  if (message) {
    const updateAvailableText = t("updateAvailable") || "A new version is available.";
    message.textContent = `${updateAvailableText} (${versionInfo.localVersion} → ${versionInfo.remoteVersion})`;
  }

  if (updateBtn) {
    const updateNowText = t("updateNow") || "Update Now";
    updateBtn.textContent = updateNowText;
    updateBtn.onclick = handleUpdateClick;
  }

  if (closeBtn) {
    closeBtn.onclick = handleCloseClick;
  }

  banner.classList.remove("hidden");
  log("Update banner shown");
}

export function hideUpdateBanner() {
  const banner = document.getElementById("update-notification");
  if (banner) {
    banner.classList.add("hidden");
  }
  cancelAutoUpdate();
}

function hideBanner() {
  hideUpdateBanner();
}

export async function handleUpdateClick() {
  const updateBtn = document.getElementById("update-now-btn");

  if (updateBtn) {
    const updatingText = t("updating") || "Updating...";
    updateBtn.textContent = updatingText;
    updateBtn.disabled = true;
  }

  try {
    const { hasUpdate, waiting } = await checkForUpdate();

    if (hasUpdate && waiting) {
      const success = await triggerUpdate();
      if (success) {
        log("Update triggered, waiting for activation...");
      }
    } else {
      log("No waiting worker, reloading to check for updates...");
      window.location.reload();
    }
  } catch (error) {
    const errorInfo = handleError(error, "handleUpdateClick");
    const updateErrorText = t("updateError") || ERROR_MESSAGES.updateError;
    alert(updateErrorText);

    if (updateBtn) {
      const updateNowText = t("updateNow") || "Update Now";
      updateBtn.textContent = updateNowText;
      updateBtn.disabled = false;
    }
  }
}

function handleCloseClick() {
  hideUpdateBanner();
  localStorage.setItem("update_dismissed", Date.now().toString());
}

export function scheduleAutoUpdate(delayMs = AUTO_UPDATE_DELAY_MS) {
  cancelAutoUpdate();

  autoUpdateTimer = setTimeout(() => {
    log("Auto-update triggered");
    handleUpdateClick();
  }, delayMs);
}

export function cancelAutoUpdate() {
  if (autoUpdateTimer) {
    clearTimeout(autoUpdateTimer);
    autoUpdateTimer = null;
  }
}

export function resetSessionCheck() {
  checkedThisSession = false;
}

export { ERROR_TYPES, ERROR_MESSAGES, handleError, DEBUG };
