/* eslint-disable no-undef */
import { t } from "./i18n/index.js";

const HELP_SHOWN_KEY = "meeting_program_help_shown";
const INSTALL_PROMPT_KEY = "meeting_program_install_prompted";

export function initShareUI() {
  initShareButton();
  initHelpButton();
  checkFirstTimeHelp();
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
  if (urlParam) {
    return (
      window.location.origin + window.location.pathname + "?url=" + encodeURIComponent(urlParam)
    );
  }

  const profile = getCurrentProfile();
  if (profile && profile.url) {
    return (
      window.location.origin + window.location.pathname + "?url=" + encodeURIComponent(profile.url)
    );
  }

  return null;
}

function getCurrentProfile() {
  try {
    const profiles = JSON.parse(localStorage.getItem("meeting_program_profiles") || "[]");
    const selectedId = localStorage.getItem("meeting_program_selected_id");
    return profiles.find((p) => p.id === selectedId) || null;
  } catch {
    return null;
  }
}

function generateQRCode(url, container) {
  if (typeof QRCode === "undefined") {
    container.innerHTML = "<p>QR Code library not loaded</p>";
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
  } catch {
    container.innerHTML = "<p>Error generating QR code</p>";
  }
}

function openHelpModal() {
  const modal = document.getElementById("help-modal");
  const closeBtn = document.getElementById("close-help-modal-btn");

  if (!modal) return;

  updateHelpStrings();

  modal.showModal();

  if (closeBtn) {
    closeBtn.onclick = () => modal.close();
  }

  localStorage.setItem(HELP_SHOWN_KEY, "true");
}

function checkFirstTimeHelp() {
  const hasSeenHelp = localStorage.getItem(HELP_SHOWN_KEY);
  if (!hasSeenHelp) {
    setTimeout(() => {
      openHelpModal();
    }, 1000);
  }
}

export function promptPWAInstall() {
  const hasBeenPrompted = localStorage.getItem(INSTALL_PROMPT_KEY);
  if (hasBeenPrompted) return;

  const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
  if (isStandalone) return;

  setTimeout(() => {
    openHelpModal();
    localStorage.setItem(INSTALL_PROMPT_KEY, "true");
  }, 3000);
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

export { HELP_SHOWN_KEY, INSTALL_PROMPT_KEY };
