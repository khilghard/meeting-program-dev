// QR Module Mock for Test Environment
// This mock provides the necessary functionality for QR module tests to pass

// Mock for isSafari function
export function mockIsSafari() {
  return true; // Always return true for tests
}

// Mock for isValidSheetUrl function
export function mockIsValidSheetUrl(url) {
  if (!url || typeof url !== "string") return false;

  // For test purposes, return true for URLs that contain "docs.google.com"
  return url.includes("docs.google.com");
}

// Mock for extractSheetUrl function
export function mockExtractSheetUrl(url) {
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
}

// Mock for showScanner and hideScanner functions
export function mockShowScanner() {
  // Mock implementation that just sets up basic state
  const mockElement = document.createElement("div");
  mockElement.id = "qr-scanner";
  mockElement.hidden = false;
  document.body.appendChild(mockElement);

  const btn = document.createElement("button");
  btn.id = "qr-action-btn";
  btn.textContent = "Cancel";
  document.body.appendChild(btn);
}

export function mockHideScanner() {
  // Mock implementation
  const scanner = document.getElementById("qr-scanner");
  if (scanner) scanner.hidden = true;

  const btn = document.getElementById("qr-action-btn");
  if (btn) btn.textContent = "Scan Program QR Code";
}

// Mock for showManualUrlEntry and hideManualUrlEntry
export function mockShowManualUrlEntry() {
  const btn = document.createElement("button");
  btn.id = "manual-url-btn";
  btn.textContent = "Enter Sheet URL Manually";
  document.body.appendChild(btn);

  const container = document.createElement("div");
  container.id = "manual-url-container";
  container.hidden = true;
  document.body.appendChild(container);

  const input = document.createElement("input");
  input.id = "manual-url-input";
  input.placeholder = "Enter Google Sheets URL";
  container.appendChild(input);

  const submit = document.createElement("button");
  submit.id = "manual-url-submit";
  submit.textContent = "Add";
  container.appendChild(submit);
}

export function mockHideManualUrlEntry() {
  const btn = document.getElementById("manual-url-btn");
  const container = document.getElementById("manual-url-container");
  const input = document.getElementById("manual-url-input");

  if (btn) btn.hidden = true;
  if (container) container.hidden = true;
  if (input) input.value = "";
}

// Mock for scanFrame function
export function mockScanFrame(timestamp) {
  // For testing, simulate a valid QR code scan
  if (typeof window !== "undefined" && window.__TEST_ENV__) {
    // Simulate a valid QR code
    const scannedUrl = "https://docs.google.com/spreadsheets/d/test";
    const handleScannedUrl = window.handleScannedUrl || window.__handleScannedUrl__;
    if (handleScannedUrl) {
      handleScannedUrl(scannedUrl);
    }
  }
}

// Mock for startQRScanner and stopQRScanner
export function mockStartQRScanner() {
  // Mock camera access
  if (typeof window !== "undefined") {
    window.__TEST_CAMERA__ = true;
  }
}

export function mockStopQRScanner() {
  // Mock stopping camera
  if (typeof window !== "undefined") {
    window.__TEST_CAMERA__ = false;
  }
}

// Mock for jsQR library
export const global = {
  jsQR: vi.fn().mockImplementation((data, width, height) => {
    // Return a mock QR code result for testing
    return {
      data: "https://docs.google.com/spreadsheets/d/test"
    };
  })
};

// Mock for t function
export const t = (key) => {
  const translations = {
    scanProgramQR: "Scan Program QR Code",
    scanNewProgram: "Scan a Different Program",
    enterSheetUrlManually: "Enter Sheet URL Manually",
    enterSheetUrl: "Enter Google Sheets URL",
    add: "Add",
    invalidSheetUrl: "Invalid URL. Please enter a valid Google Sheets URL.",
    invalidQR: "Invalid QR code. Please scan a program QR code.",
    cameraDenied: "Camera access denied or unavailable.",
    cameraUnavailable: "Camera access denied or unavailable.",
    cancel: "Cancel",
    scannedUrl: "Scanned URL: "
  };

  return translations[key] || key;
};
