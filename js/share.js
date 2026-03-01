/* eslint-disable no-undef */
import { t } from "./i18n/index.js";
import * as Profiles from "./profiles.js";

const HELP_SHOWN_KEY = "meeting_program_help_shown";
const INSTALL_PROMPT_KEY = "meeting_program_install_prompted";
let helpTimeoutId = null;

function checkFirstTimeHelp() {
  if (helpTimeoutId) {
    return;
  }

  setTimeout(() => {
    const hasSeenHelp = localStorage.getItem(HELP_SHOWN_KEY);
    if (!hasSeenHelp) {
      helpTimeoutId = setTimeout(() => {
        const stillNoHelp = !localStorage.getItem(HELP_SHOWN_KEY);
        if (stillNoHelp) {
          openHelpModal();
        }
        helpTimeoutId = null;
      }, 1500);
    }
  }, 500);
}

function initShareButton() {
  const shareBtn = document.getElementById("share-btn");
  if (!shareBtn) return;

  shareBtn.onclick = openShareModal;
}

function initHelpButton() {
  const helpBtn = document.getElementById("help-btn");
  if (!helpBtn) return;

  helpBtn.onclick = openHelpModal;
}

export function initShareUI() {
  initShareButton();
  initHelpButton();
  checkFirstTimeHelp();
}

export function openShareModal() {
  const modal = document.getElementById("share-modal");
  const closeBtn = document.getElementById("close-share-modal-btn");
  const qrContainer = document.getElementById("share-qr-container");
  const urlDisplay = document.getElementById("share-url-display");

  if (!modal) return;

  qrContainer.innerHTML = "";
  urlDisplay.textContent = "";

  const currentUrl = getCurrentProgramUrl();

  if (currentUrl) {
    generateQRCode(currentUrl, qrContainer);
    urlDisplay.textContent = currentUrl;
  } else {
    qrContainer.innerHTML = "<p>No program loaded</p>";
  }

  updateShareStrings();

  modal.showModal();

  if (closeBtn) {
    closeBtn.onclick = () => modal.close();
  }
}

function getCurrentProgramUrl() {
  const params = new URLSearchParams(window.location.search);
  const urlParam = params.get("url");

  // Get the sheet URL
  let sheetUrl = null;

  // If we have a direct Google Sheets URL parameter, use it
  if (urlParam && urlParam.startsWith("https://docs.google.com/spreadsheets/")) {
    sheetUrl = urlParam;
  }

  // If we have an app URL with sheet as parameter, extract the sheet URL
  if (!sheetUrl && urlParam) {
    try {
      const parsed = new URL(urlParam);
      const extracted = parsed.searchParams.get("url");
      if (extracted && extracted.startsWith("https://docs.google.com/spreadsheets/")) {
        sheetUrl = extracted;
      }
    } catch (e) {
      // Invalid URL format
    }
  }

  // If we have a profile, use its URL
  if (!sheetUrl) {
    const profile = getCurrentProfile();
    if (profile && profile.url) {
      sheetUrl = profile.url;
    }
  }

  if (!sheetUrl) {
    return null;
  }

  // Build the full site URL with sheet URL as parameter
  // Get the site URL from IndexedDB or use default
  const siteUrl = getSiteUrl();
  if (siteUrl) {
    const fullUrl = new URL(siteUrl);
    fullUrl.searchParams.set("url", sheetUrl);
    return fullUrl.toString();
  }

  // Fallback to just the sheet URL if no site URL found
  return sheetUrl;
}

function getSiteUrl() {
  // This will be set after the first program load
  // Check localStorage first for quick access
  const stored = localStorage.getItem("meeting_program_site_url");
  if (stored) return stored;

  // Default fallback
  return "https://khilghard.github.io/meeting-program/";
}

function getCurrentProfile() {
  return Profiles.getCurrentProfile();
}

function generateQRCode(url, container) {
  if (typeof QRCode === "undefined") {
    container.innerHTML = "<p>QR Code library not loaded</p>";
    return;
  }

  if (!url) {
    container.innerHTML = "<p>No program loaded</p>";
    return;
  }

  try {
    const canvas = document.createElement("canvas");
    QRCode.toCanvas(canvas, url, { width: 250, margin: 2 }, (error) => {
      if (error) {
        container.innerHTML = "<p>Error generating QR code</p>";
        return;
      }
      container.appendChild(canvas);
    });
  } catch (err) {
    container.innerHTML = "<p>Error generating QR code: " + err.message + "</p>";
  }
}

function openHelpModal() {
  const modal = document.getElementById("help-modal");
  const closeBtn = document.getElementById("close-help-modal-btn");

  if (!modal) {
    return;
  }

  // Don't try to open if already open
  if (modal.hasAttribute("open")) {
    return;
  }

  updateHelpStrings();

  // Ensure the modal is visible
  modal.showModal();

  if (closeBtn) {
    closeBtn.onclick = () => modal.close();
  }

  localStorage.setItem(HELP_SHOWN_KEY, "true");
}

export function promptPWAInstall() {
  // PWA installation prompts are handled by the browser
  // This function can be used for custom PWA install logic if needed
  // Currently disabled to avoid interfering with help modal
}

function updateShareStrings() {
  const title = document.getElementById("share-modal-title");
  const instructions = document.getElementById("share-instructions");

  if (title) title.textContent = t("shareProgram");
  if (instructions) instructions.textContent = t("shareInstructions");
}

function updateHelpStrings() {
  const title = document.getElementById("help-modal-title");
  if (title) title.textContent = t("helpTitle");
}

export { HELP_SHOWN_KEY, INSTALL_PROMPT_KEY, openHelpModal };
