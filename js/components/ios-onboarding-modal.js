/**
 * ios-onboarding-modal.js
 * Modal shown on iOS Home Screen PWA when no profiles exist.
 * Auto-opens camera for QR scan and shows manual URL entry.
 * Dispatches "qr-scanned" event on success, which the existing
 * main.js handler picks up to load the program.
 */

import { isValidSheetUrl, extractSheetUrl } from "../qr.js";
import { t } from "../i18n/index.js";

let modal = null;
let videoEl = null;
let canvasEl = null;
let stream = null;
let animFrameId = null;
let lastScanTime = 0;

export function isIOSStandalone() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const isIOS = /ipad|iphone|ipod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (!isIOS) return false;
  return window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && navigator.standalone);
}

export function isIOS() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const isMobile = /ipad|iphone|ipod/i.test(ua);
  const isMacTouch = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  if (isMobile || isMacTouch) {
    console.log("[iOS-Onboarding] iOS detected, will show onboarding modal");
  }
  return isMobile || isMacTouch;
}

function createModal() {
  if (modal) return;

  modal = document.createElement("dialog");
  modal.id = "ios-onboarding-modal";
  modal.className = "modal ios-onboarding-modal";
  modal.innerHTML = `
    <div class="modal-content">
      <h3>${t("iosOnboardingTitle") || "Set Up Your Program"}</h3>
      <p class="ios-onboarding-instructions">${t("iosOnboardingInstructions") || "Scan the QR code on your meeting program, or enter the URL manually below."}</p>
      <div class="ios-onboarding-camera">
        <video id="ios-onboarding-video" autoplay playsinline></video>
        <canvas id="ios-onboarding-canvas" hidden></canvas>
        <div id="ios-onboarding-output" class="ios-onboarding-output"></div>
      </div>
      <div class="ios-onboarding-manual">
        <input type="text" id="ios-onboarding-url-input" class="manual-url-input" placeholder="${t("enterSheetUrl") || "Enter Google Sheets URL"}" />
        <button id="ios-onboarding-url-submit" class="primary-btn">${t("add") || "Add"}</button>
      </div>
      <div class="ios-onboarding-skip">
        <button id="ios-onboarding-skip-btn" class="secondary-btn">${t("skip") || "Skip"}</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  videoEl = document.getElementById("ios-onboarding-video");
  canvasEl = document.getElementById("ios-onboarding-canvas");

  document.getElementById("ios-onboarding-url-submit").onclick = handleManualSubmit;
  document.getElementById("ios-onboarding-url-input").addEventListener("keypress", (e) => {
    if (e.key === "Enter") handleManualSubmit();
  });
  document.getElementById("ios-onboarding-skip-btn").onclick = close;
}

function handleManualSubmit() {
  const input = document.getElementById("ios-onboarding-url-input");
  const output = document.getElementById("ios-onboarding-output");
  const url = input?.value?.trim() || "";

  if (isValidSheetUrl(url)) {
    dispatchScanned(extractSheetUrl(url) || url);
  } else {
    output.textContent = t("invalidSheetUrl") || "Invalid URL. Please enter a valid Google Sheets URL.";
  }
}

function dispatchScanned(url) {
  stopCamera();
  window.dispatchEvent(new CustomEvent("qr-scanned", { detail: { url } }));
}

function startCamera() {
  const output = document.getElementById("ios-onboarding-output");
  if (!navigator.mediaDevices?.getUserMedia) {
    output.textContent = t("cameraUnavailable") || "Camera not available.";
    return;
  }

  navigator.mediaDevices
    .getUserMedia({ video: { facingMode: "environment" } })
    .then((s) => {
      stream = s;
      videoEl.srcObject = stream;
      videoEl.play();
      scanLoop();
    })
    .catch((err) => {
      console.error("[iOS-Onboarding] Camera error:", err);
      output.textContent = t("cameraDenied") || "Camera access denied.";
    });
}

function scanLoop() {
  if (!stream) return;

  const now = performance.now();
  if (now - lastScanTime < 150) {
    animFrameId = requestAnimationFrame(scanLoop);
    return;
  }
  lastScanTime = now;

  if (videoEl.readyState === videoEl.HAVE_ENOUGH_DATA && canvasEl && window.jsQR) {
    canvasEl.width = videoEl.videoWidth;
    canvasEl.height = videoEl.videoHeight;
    const ctx = canvasEl.getContext("2d");
    ctx.drawImage(videoEl, 0, 0, canvasEl.width, canvasEl.height);
    const code = jsQR(ctx.getImageData(0, 0, canvasEl.width, canvasEl.height).data, canvasEl.width, canvasEl.height);
    if (code && code.data) {
      const scanned = code.data.trim();
      if (isValidSheetUrl(scanned)) {
        dispatchScanned(extractSheetUrl(scanned) || scanned);
        return;
      }
    }
  }

  animFrameId = requestAnimationFrame(scanLoop);
}

function stopCamera() {
  if (animFrameId) {
    globalThis.cancelAnimationFrame(animFrameId);
    animFrameId = null;
  }
  if (stream) {
    stream.getTracks().forEach((track) => track.stop());
    stream = null;
  }
}

export function open() {
  createModal();
  modal.showModal();
  const output = document.getElementById("ios-onboarding-output");
  if (output) output.textContent = "";
  const input = document.getElementById("ios-onboarding-url-input");
  if (input) input.value = "";
  startCamera();
}

export function close() {
  stopCamera();
  if (modal && modal.open) {
    modal.close();
  }
}
