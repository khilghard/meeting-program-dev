/* eslint-disable no-undef */
import { t } from "./i18n/index.js";
import * as Profiles from "./profiles.js";
import { getMetadata, setMetadata } from "./data/IndexedDBManager.js";
import { createTimer, clearTimer } from "./utils/timer-manager.js";

const HELP_SHOWN_KEY = "userPreference_helpShown";
const INSTALL_PROMPT_KEY = "userPreference_installPrompted";

async function checkFirstTimeHelp() {
  if (clearTimer("help_initial_check") || clearTimer("help_modal")) {
    return;
  }

  createTimer(500, "help_initial_check");
  const initialCheckTimer = setTimeout(async () => {
    const hasSeenHelp = await getMetadata(HELP_SHOWN_KEY);
    if (!hasSeenHelp) {
      createTimer(1500, "help_modal");
      const helpModalTimer = setTimeout(async () => {
        const stillNoHelp = !(await getMetadata(HELP_SHOWN_KEY));
        if (stillNoHelp) {
          openHelpModal();
        }
        clearTimer("help_modal");
        clearTimer("help_initial_check");
        clearTimeout(helpModalTimer);
      }, 1500);
    }
    clearTimer("help_initial_check");
    clearTimeout(initialCheckTimer);
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

export async function openShareModal() {
  const modal = document.getElementById("share-modal");
  const closeBtn = document.getElementById("close-share-modal-btn");
  const qrContainer = document.getElementById("share-qr-container");
  const urlDisplay = document.getElementById("share-url-display");

  if (!modal) return;

  qrContainer.textContent = "";
  urlDisplay.textContent = "";

  const currentUrl = await getCurrentProgramUrl();

  if (currentUrl) {
    generateQRCode(currentUrl, qrContainer);
    urlDisplay.textContent = currentUrl;
  } else {
    const paragraph = document.createElement("p");
    paragraph.textContent = "No program loaded";
    qrContainer.appendChild(paragraph);
  }

  updateShareStrings();

  modal.showModal();

  if (closeBtn) {
    closeBtn.onclick = () => modal.close();
  }
}

async function getCurrentProgramUrl() {
  const params = new URLSearchParams(globalThis.window.location.search);
  const urlParam = params.get("url");

  // Get the sheet URL
  let sheetUrl = null;

  // If we have a direct Google Sheets URL parameter, use it
  if (urlParam?.startsWith("https://docs.google.com/spreadsheets/")) {
    sheetUrl = urlParam;
  }

  // If we have an app URL with sheet as parameter, extract the sheet URL
  if (!sheetUrl && urlParam) {
    try {
      const parsed = new URL(urlParam);
      const extracted = parsed.searchParams.get("url");
      if (extracted?.startsWith("https://docs.google.com/spreadsheets/")) {
        sheetUrl = extracted;
      }
    } catch {
      // Invalid URL format
    }
  }

  // If we have a profile, use its URL
  if (!sheetUrl) {
    const profile = getCurrentProfile();
    if (profile?.url) {
      sheetUrl = profile.url;
    }
  }

  if (!sheetUrl) {
    return null;
  }

  // Build the full site URL with sheet URL as parameter
  // Get the site URL from IndexedDB or use default
  const siteUrl = await getSiteUrl();
  if (siteUrl) {
    const fullUrl = new URL(siteUrl);
    fullUrl.searchParams.set("url", sheetUrl);
    return fullUrl.toString();
  }

  // Fallback to just the sheet URL if no site URL found
  return sheetUrl;
}

async function getSiteUrl() {
  // This will be set after the first program load
  // Get from IndexedDB metadata
  try {
    const stored = await getMetadata("siteUrl");
    if (stored) return stored;
  } catch (e) {
    console.warn("Failed to read siteUrl from metadata:", e);
  }

  // Default fallback
  return "https://khilghard.github.io/meeting-program/";
}

function getCurrentProfile() {
  return Profiles.getCurrentProfile();
}

function generateQRCode(url, container) {
  if (typeof QRCode === "undefined") {
    const paragraph = document.createElement("p");
    paragraph.textContent = "QR Code library not loaded";
    container.appendChild(paragraph);
    return;
  }

  if (!url) {
    const paragraph = document.createElement("p");
    paragraph.textContent = "No program loaded";
    container.appendChild(paragraph);
    return;
  }

  try {
    const canvas = document.createElement("canvas");
    QRCode.toCanvas(canvas, url, { width: 250, margin: 2 }, (error) => {
      if (error) {
        const errorParagraph = document.createElement("p");
        errorParagraph.textContent = "Error generating QR code";
        container.appendChild(errorParagraph);
        return;
      }
      container.appendChild(canvas);
    });
  } catch (err) {
    const errorParagraph = document.createElement("p");
    errorParagraph.textContent = `Error generating QR code: ${err.message}`;
    container.appendChild(errorParagraph);
  }
}

async function openHelpModal() {
  const modal = document.getElementById("help-modal");
  const closeBtn = document.getElementById("close-help-modal-btn");

  if (!modal) {
    return;
  }

  if (modal.hasAttribute("open")) {
    return;
  }

  updateHelpStrings();

  modal.showModal();

  if (closeBtn) {
    closeBtn.onclick = () => modal.close();
  }

  await setMetadata(HELP_SHOWN_KEY, "true");
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
