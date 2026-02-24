// ------------------------------------------------------------
// QR Scanner Module
// ------------------------------------------------------------
/* eslint-disable no-undef */

import { t } from "./i18n/index.js";

let qrStream = null;
let lastScanTime = 0;

let qrSection, video, canvas, output, ctx;

export function initDOMElements() {
  qrSection = document.getElementById("qr-scanner");
  video = document.getElementById("qr-video");
  canvas = document.getElementById("qr-canvas");
  output = document.getElementById("qr-output");
  if (canvas) ctx = canvas.getContext("2d");
}

export function resetScannerState() {
  stopQRScanner();
  qrSection = null;
  video = null;
  canvas = null;
  output = null;
  ctx = null;
  lastScanTime = 0;
}

// ------------------------------------------------------------
// ------------------------------------------------------------
// Safari Detection
// ------------------------------------------------------------
export function isSafari() {
  const ua = navigator.userAgent.toLowerCase();
  return ua.includes("safari") && !ua.includes("chrome") && !ua.includes("android");
}

export function showSafariCameraHelp() {
  alert(
    "Safari may have blocked camera access.\n\n" +
      "To enable it:\n" +
      "1. Open Settings\n" +
      "2. Scroll down and tap Safari\n" +
      "3. Tap Camera\n" +
      "4. Choose 'Allow'\n\n" +
      "Then return to the app and try again."
  );
}

// ------------------------------------------------------------
// URL Validation
// ------------------------------------------------------------
export function isValidSheetUrl(url) {
  if (typeof url !== "string") return false;

  // Direct Google Sheets URL
  if (url.startsWith("https://docs.google.com/spreadsheets/")) {
    return true;
  }

  // App URL with sheet as parameter: ?url=https://docs.google.com/spreadsheets/...
  try {
    const parsed = new URL(url);
    const sheetUrl = parsed.searchParams.get("url");
    if (sheetUrl && sheetUrl.startsWith("https://docs.google.com/spreadsheets/")) {
      return true;
    }
  } catch (e) {
    // Invalid URL format
  }

  return false;
}

// Extract sheet URL from app URL if needed
export function extractSheetUrl(url) {
  if (!url || typeof url !== "string") return null;

  if (url.startsWith("https://docs.google.com/spreadsheets/")) {
    return url;
  }
  try {
    const parsed = new URL(url);
    const sheetUrl = parsed.searchParams.get("url");
    if (sheetUrl && sheetUrl.startsWith("https://docs.google.com/spreadsheets/")) {
      return sheetUrl;
    }
  } catch (e) {
    // Invalid URL format
  }
  return null;
}

// ------------------------------------------------------------
// Manual URL Entry
// ------------------------------------------------------------
export function showManualUrlEntry() {
  initDOMElements();
  const manualBtn = document.getElementById("manual-url-btn");
  const manualContainer = document.getElementById("manual-url-container");
  const manualInput = document.getElementById("manual-url-input");
  const manualSubmit = document.getElementById("manual-url-submit");

  if (!manualBtn || !manualContainer) return;

  manualBtn.hidden = false;
  manualBtn.classList.remove("hidden");
  manualBtn.textContent = t("enterSheetUrlManually");
  manualBtn.onclick = () => {
    manualBtn.hidden = true;
    manualBtn.classList.add("hidden");
    manualContainer.hidden = false;
    manualContainer.classList.remove("hidden");
    manualInput.placeholder = t("enterSheetUrl");
    manualSubmit.textContent = t("add");
    manualInput.focus();
  };

  manualSubmit.onclick = () => {
    const url = manualInput.value.trim();
    if (isValidSheetUrl(url)) {
      handleScannedUrl(url);
      manualContainer.hidden = true;
    } else {
      output.textContent = t("invalidSheetUrl");
    }
  };

  manualInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      manualSubmit.click();
    }
  });
}

export function hideManualUrlEntry() {
  const manualBtn = document.getElementById("manual-url-btn");
  const manualContainer = document.getElementById("manual-url-container");
  const manualInput = document.getElementById("manual-url-input");

  if (manualBtn) {
    manualBtn.hidden = true;
    manualBtn.classList.add("hidden");
  }
  if (manualContainer) {
    manualContainer.hidden = true;
    manualContainer.classList.add("hidden");
  }
  if (manualInput) manualInput.value = "";
}

// ------------------------------------------------------------
// Public API
// ------------------------------------------------------------
export function showScanner() {
  initDOMElements();
  qrSection.hidden = false;
  startQRScanner();

  // Scroll into view once camera metadata is ready
  video.onloadedmetadata = () => {
    qrSection.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Switch the action button to "Cancel"
  const actionBtn = document.getElementById("qr-action-btn");
  actionBtn.textContent = t("cancel");
  actionBtn.onclick = () => hideScanner();
}

export function hideScanner() {
  initDOMElements();
  qrSection.hidden = true;
  stopQRScanner();
  hideManualUrlEntry();

  const actionBtn = document.getElementById("qr-action-btn");
  const storedUrl = localStorage.getItem("sheetUrl");

  if (!storedUrl) {
    actionBtn.textContent = t("scanProgramQR");
  } else {
    actionBtn.textContent = t("scanNewProgram");
  }

  actionBtn.onclick = () => showScanner();
}

// ------------------------------------------------------------
// Start camera + scanning loop
// ------------------------------------------------------------
export async function startQRScanner() {
  initDOMElements();
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      output.textContent = t("cameraUnavailable");
      return;
    }

    qrStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" }
    });

    video.srcObject = qrStream;
    video.setAttribute("playsinline", true); // Required for iOS Safari
    video.play();

    requestAnimationFrame(scanFrame);
  } catch (err) {
    console.error("Camera error:", err);

    if (isSafari() && (err.name === "NotAllowedError" || err.name === "NotReadableError")) {
      showSafariCameraHelp();
      return;
    }

    output.textContent = t("cameraDenied");
    showManualUrlEntry();
  }
}

// ------------------------------------------------------------
// Stop camera
// ------------------------------------------------------------
export function stopQRScanner() {
  if (qrStream) {
    qrStream.getTracks().forEach((t) => t.stop());
    qrStream = null;
  }
}

// ------------------------------------------------------------
// Scan loop
// ------------------------------------------------------------
export function scanFrame(timestamp) {
  if (!qrStream) return;

  // Limit scanning to ~6–7 fps
  if (timestamp - lastScanTime < 150) {
    requestAnimationFrame(scanFrame);
    return;
  }
  lastScanTime = timestamp;

  if (video.readyState === video.HAVE_ENOUGH_DATA) {
    initDOMElements();
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, canvas.width, canvas.height);

    if (code) {
      const scanned = code.data.trim();

      if (isValidSheetUrl(scanned)) {
        stopQRScanner();
        handleScannedUrl(scanned);
        return;
      }

      // Invalid → keep scanning
      output.textContent = t("invalidQR");
    }
  }

  requestAnimationFrame(scanFrame);
}

// ------------------------------------------------------------
// Handle scanned URL
// ------------------------------------------------------------
export function handleScannedUrl(url) {
  const sheetUrl = extractSheetUrl(url) || url;
  output.textContent = t("scannedUrl") + " " + sheetUrl;
  stopQRScanner();

  // Dispatch event for main.js to handle
  const event = new CustomEvent("qr-scanned", { detail: { url: sheetUrl } });
  window.dispatchEvent(event);
}
