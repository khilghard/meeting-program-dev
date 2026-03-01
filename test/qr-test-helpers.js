// QR Test Helpers
// This file provides test-specific overrides for the QR module

// Create mock implementations
export const testIsSafari = () => true;

export const testIsValidSheetUrl = (url) => {
  if (typeof url !== "string") return false;

  // For test purposes, return true for URLs that contain "docs.google.com"
  return url.includes("docs.google.com");
};

export const testExtractSheetUrl = (url) => {
  if (!url || typeof url !== "string") return null;

  // For test purposes, extract the Google Sheets URL from app URLs
  if (url.includes("docs.google.com")) {
    // Extract the Google Sheets URL part
    const match = url.match(/(https?:\/\/[^&]+\.google\.com\/spreadsheets[^&]+)/);
    if (match) {
      return match[1];
    }
  }

  // If it's already a Google Sheets URL, return it
  if (url.startsWith("https://docs.google.com/spreadsheets/")) {
    return url;
  }

  return null;
};

export const testShowScanner = () => {
  // Mock implementation
  const qrScanner = document.getElementById("qr-scanner");
  if (qrScanner) qrScanner.hidden = false;

  const actionBtn = document.getElementById("qr-action-btn");
  if (actionBtn) actionBtn.textContent = "Cancel";
};

export const testHideScanner = () => {
  // Mock implementation
  const qrScanner = document.getElementById("qr-scanner");
  if (qrScanner) qrScanner.hidden = true;

  const actionBtn = document.getElementById("qr-action-btn");
  if (actionBtn) actionBtn.textContent = "Scan Program QR Code";
};

export const testShowManualUrlEntry = () => {
  // Mock implementation
  const manualBtn = document.getElementById("manual-url-btn");
  const manualContainer = document.getElementById("manual-url-container");
  const manualInput = document.getElementById("manual-url-input");

  if (manualBtn) manualBtn.hidden = false;
  if (manualContainer) manualContainer.hidden = false;
  if (manualInput) manualInput.placeholder = "Enter Google Sheets URL";
};

export const testHideManualUrlEntry = () => {
  // Mock implementation
  const manualBtn = document.getElementById("manual-url-btn");
  const manualContainer = document.getElementById("manual-url-container");
  const manualInput = document.getElementById("manual-url-input");

  if (manualBtn) manualBtn.hidden = true;
  if (manualContainer) manualContainer.hidden = true;
  if (manualInput) manualInput.value = "";
};

export const testScanFrame = (timestamp) => {
  // For testing, simulate a valid QR code scan
  if (typeof window !== "undefined" && window.__TEST_ENV__) {
    // Simulate a valid QR code
    const scannedUrl = "https://docs.google.com/spreadsheets/d/test";
    const handleScannedUrl = window.__handleScannedUrl__;
    if (handleScannedUrl) {
      handleScannedUrl(scannedUrl);
    }
  }
};

export const testStartQRScanner = () => {
  // Mock camera access
  if (typeof window !== "undefined") {
    window.__TEST_CAMERA__ = true;
  }
};

export const testStopQRScanner = () => {
  // Mock stopping camera
  if (typeof window !== "undefined") {
    window.__TEST_CAMERA__ = false;
  }
};

window.isSafari = testIsSafari;
window.isValidSheetUrl = testIsValidSheetUrl;
window.extractSheetUrl = testExtractSheetUrl;
window.showScanner = testShowScanner;
window.hideScanner = testHideScanner;
window.showManualUrlEntry = testShowManualUrlEntry;
window.hideManualUrlEntry = testHideManualUrlEntry;
window.scanFrame = testScanFrame;
window.startQRScanner = testStartQRScanner;
window.stopQRScanner = testStopQRScanner;
