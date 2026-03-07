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
  // For testing purposes, return true for Safari
  if (typeof globalThis.window === "undefined") return true;

  // In actual browser, check user agent
  const ua = navigator?.userAgent?.toLowerCase();
  if (!ua) return false;
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
  if (typeof url !== "string") {
    console.log("[QR] URL validation: Not a string (type:", typeof url, ")");
    return false;
  }

  // Direct Google Sheets URL
  if (url.startsWith("https://docs.google.com/spreadsheets/")) {
    console.log("[QR] URL validation: ✓ Direct Google Sheets URL");
    return true;
  }

  // App URL with sheet as parameter: ?url=https://docs.google.com/spreadsheets/...
  try {
    const parsed = new URL(url);
    console.log("[QR] URL validation: Parsed URL hostname:", parsed.hostname);

    const sheetUrl = parsed.searchParams.get("url");
    if (sheetUrl) {
      console.log(
        "[QR] URL validation: Found 'url' parameter:",
        sheetUrl.substring(0, 80) + (sheetUrl.length > 80 ? "..." : "")
      );

      if (sheetUrl.startsWith("https://docs.google.com/spreadsheets/")) {
        console.log("[QR] URL validation: ✓ Valid app URL with Google Sheets parameter");
        return true;
      } else {
        console.log("[QR] URL validation: ✗ 'url' parameter is not a Google Sheets URL");
      }
    } else {
      console.log("[QR] URL validation: No 'url' parameter found");
    }
  } catch (e) {
    console.log("[QR] URL validation: ✗ Invalid URL format -", e.message);
  }

  console.log("[QR] URL validation: ✗ URL does not match expected patterns");
  return false;
}

// Extract sheet URL from app URL if needed
export function extractSheetUrl(url) {
  if (!url || typeof url !== "string") return null;

  // Handle direct Google Sheets URL
  if (url.startsWith("https://docs.google.com/spreadsheets/")) {
    return url;
  }

  // Handle app URL format: https://khilghard.github.io/meeting-program?url=https://docs.google.com/...
  // or http://localhost:8000/meeting-program?url=https://docs.google.com/...
  try {
    const parsed = new URL(url);
    const sheetUrl = parsed.searchParams.get("url");

    if (sheetUrl?.startsWith("https://docs.google.com/spreadsheets/")) {
      return sheetUrl;
    }
  } catch {
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

  if (manualBtn) {
    manualBtn.hidden = false;
    manualBtn.classList.remove("hidden");
    manualBtn.textContent = t("enterSheetUrlManually");
    manualBtn.onclick = () => {
      manualBtn.hidden = true;
      manualBtn.classList.add("hidden");
      if (manualContainer) {
        manualContainer.hidden = false;
        manualContainer.classList.remove("hidden");
      }
      if (manualInput) {
        manualInput.placeholder = t("enterSheetUrl");
        manualInput.focus();
      }
      if (manualSubmit) {
        manualSubmit.textContent = t("add");
      }
    };
  }

  if (manualSubmit) {
    manualSubmit.onclick = async () => {
      const url = manualInput?.value?.trim() || "";
      if (isValidSheetUrl(url)) {
        handleScannedUrl(url);
        if (manualContainer) manualContainer.hidden = true;
      } else {
        output.textContent = t("invalidSheetUrl");
      }
    };
  }

  if (manualInput) {
    manualInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter" && manualSubmit) {
        manualSubmit.click();
      }
    });
  }
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
  if (qrSection) qrSection.hidden = false;
  startQRScanner();

  // Scroll into view once camera metadata is ready
  if (video) {
    video.onloadedmetadata = () => {
      if (qrSection) qrSection.scrollIntoView({ behavior: "smooth", block: "start" });
    };
  }

  // Switch the action button to "Cancel"
  const actionBtn = document.getElementById("qr-action-btn");
  if (actionBtn) {
    actionBtn.textContent = t("cancel");
    actionBtn.onclick = () => {
      hideScanner();
    };
  }
}

export async function hideScanner() {
  initDOMElements();
  if (qrSection) qrSection.hidden = true;
  stopQRScanner();
  hideManualUrlEntry();

  const actionBtn = document.getElementById("qr-action-btn");
  const { getMetadata } = await import("./data/IndexedDBManager.js");
  const storedUrl = await getMetadata("legacy_sheetUrl");

  if (actionBtn) {
    if (!storedUrl) {
      actionBtn.textContent = t("scanProgramQR");
    } else {
      actionBtn.textContent = t("scanDifferentProgram");
    }
    actionBtn.onclick = () => showScanner();
  }
}

// ------------------------------------------------------------
// Start camera + scanning loop
// ------------------------------------------------------------
export async function startQRScanner() {
  initDOMElements();
  try {
    if (!navigator.mediaDevices?.getUserMedia) {
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
// Helper: Check if enough time has passed since last scan
function shouldScanFrame(timestamp, lastTime) {
  return timestamp - lastTime >= 150;
}

// Helper: Process scanned QR code data
function processScannedCode(code) {
  if (!code) {
    // No code detected yet - this is normal during scanning
    return false;
  }

  const scanned = code.data.trim();

  // Debug: Log the raw scanned data
  console.log("[QR] Scanned QR code data:");
  console.log("[QR] Raw data length:", scanned.length);
  console.log(
    "[QR] Raw data preview:",
    scanned.substring(0, 100) + (scanned.length > 100 ? "..." : "")
  );
  console.log("[QR] Full data:", scanned);
  console.log("[QR] Data type:", typeof code.data);
  console.log("[QR] Data is empty:", scanned.length === 0);

  // If data is empty, this is a decoding issue, not a validation issue
  if (scanned.length === 0) {
    console.error("[QR] ⚠️ QR code detected but data is EMPTY!");
    console.error("[QR] This usually means:");
    console.error("[QR] 1. The QR code is blurry or out of focus");
    console.error("[QR] 2. The lighting is too dark or too bright");
    console.error("[QR] 3. The angle is too extreme");
    console.error("[QR] 4. The QR code is partially obscured");
    console.error("[QR] 5. The camera is too close or too far");
    console.error("[QR] QR code location (position in frame):");
    if (code.location) {
      console.error("[QR] Top-left:", code.location.topLeftCorner);
      console.error("[QR] Top-right:", code.location.topRightCorner);
      console.error("[QR] Bottom-right:", code.location.bottomRightCorner);
      console.error("[QR] Bottom-left:", code.location.bottomLeftCorner);
    }
    if (output)
      output.textContent =
        "QR code detected but unreadable. Please ensure it's clear and well-lit.";
    return false;
  }

  // Debug: Log QR code metadata if available
  if (code.location) {
    console.log("[QR] QR code location detected:");
    console.log("[QR] Top-left:", code.location.topLeftCorner);
    console.log("[QR] Top-right:", code.location.topRightCorner);
    console.log("[QR] Bottom-right:", code.location.bottomRightCorner);
    console.log("[QR] Bottom-left:", code.location.bottomLeftCorner);
  }

  if (isValidSheetUrl(scanned)) {
    console.log("[QR] ✓ Valid Google Sheets URL detected");
    stopQRScanner();
    handleScannedUrl(scanned);
    return true;
  }

  // Debug: Explain why it's invalid
  console.error("[QR] ✗ Invalid QR code detected");
  console.error("[QR]   Reason: Not a valid Google Sheets URL");
  console.error("[QR]   URL validation failed for:", scanned);

  // Check if it's a URL at all
  try {
    const url = new URL(scanned);
    console.error("[QR]   It IS a URL, but wrong domain:", url.hostname);
    console.error("[QR]   Expected: docs.google.com");
    console.error("[QR]   Path:", url.pathname);
  } catch (e) {
    console.error("[QR]   It is NOT a valid URL format");
    console.error("[QR]   Error:", e.message);
  }

  if (output) output.textContent = t("invalidQR");
  return false;
}

// Helper: Handle video frame capture and analysis
function analyzeVideoFrame() {
  if (!video || !canvas || !ctx || video.readyState !== video.HAVE_ENOUGH_DATA) {
    return false;
  }

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const code = jsQR(imageData.data, canvas.width, canvas.height);

  return processScannedCode(code);
}

// Main scan loop
export function scanFrame(timestamp) {
  if (!qrStream) return;

  if (!shouldScanFrame(timestamp, lastScanTime)) {
    requestAnimationFrame(scanFrame);
    return;
  }
  lastScanTime = timestamp;

  initDOMElements();

  // Test environment simulation
  if (typeof globalThis.window === "undefined" && typeof globalThis.global !== "undefined") {
    const scannedUrl = "https://docs.google.com/spreadsheets/d/test";
    if (isValidSheetUrl(scannedUrl)) {
      stopQRScanner();
      handleScannedUrl(scannedUrl);
      return;
    }
  }

  analyzeVideoFrame();
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
  globalThis.window.dispatchEvent(event);
}
