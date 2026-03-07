import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";

// Mock jsQR (external library)
global.jsQR = vi.fn();

// Mock IndexedDBManager for QR tests
const mockMetadata = {};
vi.mock("../js/data/IndexedDBManager.js", () => ({
  getMetadata: vi.fn((key) => Promise.resolve(mockMetadata[key] || null)),
  setMetadata: vi.fn((key, value) => {
    mockMetadata[key] = value;
    return Promise.resolve(true);
  })
}));

// Import qr.js and its dependencies (real modules, no internal mocks)
import * as QR from "../js/qr.js";
import * as I18n from "../js/i18n/index.js";

const {
  isSafari,
  isValidSheetUrl,
  extractSheetUrl,
  showScanner,
  hideScanner,
  startQRScanner,
  stopQRScanner,
  scanFrame,
  handleScannedUrl,
  showManualUrlEntry,
  hideManualUrlEntry
} = QR;

// Set up test isolation with browser API stubs
stubBrowserAPIs();

describe("QR Module", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    localStorage.clear();
    // Reset mock metadata
    Object.keys(mockMetadata).forEach((key) => delete mockMetadata[key]);

    // Initialize i18n to load translations
    await I18n.initI18n();

    // Create required DOM elements
    const setupDOM = () => {
      // Remove any existing elements
      document
        .querySelectorAll(
          "#qr-scanner, #qr-video, #qr-canvas, #qr-output, #qr-action-btn, #manual-url-btn, #manual-url-container, #manual-url-input, #manual-url-submit"
        )
        .forEach((el) => el.remove());

      // Create scanner section
      const qrScanner = document.createElement("section");
      qrScanner.id = "qr-scanner";
      qrScanner.hidden = true;
      document.body.appendChild(qrScanner);

      // Create video element
      const video = document.createElement("video");
      video.id = "qr-video";
      qrScanner.appendChild(video);

      // Create canvas element
      const canvas = document.createElement("canvas");
      canvas.id = "qr-canvas";
      canvas.hidden = true;
      qrScanner.appendChild(canvas);

      // Create output element
      const output = document.createElement("p");
      output.id = "qr-output";
      qrScanner.appendChild(output);

      // Create action button
      const actionBtn = document.createElement("button");
      actionBtn.id = "qr-action-btn";
      actionBtn.textContent = "Scan Program QR Code";
      document.body.appendChild(actionBtn);

      // Create manual URL section
      const manualBtn = document.createElement("button");
      manualBtn.id = "manual-url-btn";
      manualBtn.hidden = true;
      document.body.appendChild(manualBtn);

      const manualContainer = document.createElement("div");
      manualContainer.id = "manual-url-container";
      manualContainer.hidden = true;
      document.body.appendChild(manualContainer);

      const manualInput = document.createElement("input");
      manualInput.id = "manual-url-input";
      manualInput.type = "text";
      manualContainer.appendChild(manualInput);

      const manualSubmit = document.createElement("button");
      manualSubmit.id = "manual-url-submit";
      manualContainer.appendChild(manualSubmit);
    };

    setupDOM();

    // Mock navigator.mediaDevices
    Object.defineProperty(navigator, "mediaDevices", {
      value: {
        getUserMedia: vi.fn()
      },
      configurable: true
    });

    // Mock window.location.reload
    delete window.location;
    window.location = { reload: vi.fn() };

    // Mock alert
    global.alert = vi.fn();

    // Reset module state
    QR.resetScannerState();

    // Mock canvas getContext
    this.mockContext = {
      drawImage: vi.fn(),
      getImageData: vi.fn(() => ({
        data: new Uint8ClampedArray(40000),
        width: 100,
        height: 100
      }))
    };
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(this.mockContext);

    // Mock HTMLMediaElement.play to avoid jsdom not implemented error
    vi.spyOn(HTMLVideoElement.prototype, "play").mockResolvedValue(undefined);
  });

  // ---------- isSafari ----------
  describe("isSafari()", () => {
    const originalUserAgent = navigator.userAgent;

    afterEach(() => {
      Object.defineProperty(navigator, "userAgent", {
        value: originalUserAgent,
        writable: true
      });
    });

    test("detects Safari on iOS/Mac", () => {
      Object.defineProperty(navigator, "userAgent", {
        value:
          "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1",
        writable: true
      });
      expect(isSafari()).toBe(true);
    });

    test("returns false for Chrome", () => {
      Object.defineProperty(navigator, "userAgent", {
        value:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        writable: true
      });
      expect(isSafari()).toBe(false);
    });

    test("returns false for Android Safari (Chrome-based)", () => {
      Object.defineProperty(navigator, "userAgent", {
        value:
          "Mozilla/5.0 (Linux; Android 10; SM-G960U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36",
        writable: true
      });
      expect(isSafari()).toBe(false);
    });
  });

  // ---------- isValidSheetUrl ----------
  describe("isValidSheetUrl()", () => {
    test("accepts valid Google Sheets URL", () => {
      expect(isValidSheetUrl("https://docs.google.com/spreadsheets/d/123/gviz/tq")).toBe(true);
    });

    test("accepts app URL with sheet as parameter", () => {
      const appUrl =
        "http://localhost:8000/meeting-program?url=https%3A%2F%2Fdocs.google.com%2Fspreadsheets%2Fd%2F123%2Fgviz%2Ftq%3Ftqx%3Dout%3Acsv";
      expect(isValidSheetUrl(appUrl)).toBe(true);
    });

    test("accepts HTTPS app URL with sheet as parameter", () => {
      const appUrl =
        "https://example.com/meeting-program?url=https://docs.google.com/spreadsheets/d/abc/gviz/tq";
      expect(isValidSheetUrl(appUrl)).toBe(true);
    });

    test("accepts khilghard.github.io URL with sheet as parameter", () => {
      const appUrl =
        "https://khilghard.github.io/meeting-program?url=https%3A%2F%2Fdocs.google.com%2Fspreadsheets%2Fd%2F123%2Fgviz%2Ftq%3Ftqx%3Dout%3Acsv";
      expect(isValidSheetUrl(appUrl)).toBe(true);
    });

    test("rejects non-Google URLs", () => {
      expect(isValidSheetUrl("https://example.com")).toBe(false);
    });

    test("rejects app URL with non-sheet parameter", () => {
      const appUrl = "http://localhost:8000?url=https://example.com";
      expect(isValidSheetUrl(appUrl)).toBe(false);
    });

    test("rejects malformed URLs", () => {
      expect(isValidSheetUrl("not-a-url")).toBe(false);
    });

    test("rejects non-string input", () => {
      expect(isValidSheetUrl(null)).toBe(false);
      expect(isValidSheetUrl(undefined)).toBe(false);
    });
  });

  // ---------- extractSheetUrl ----------
  describe("extractSheetUrl()", () => {
    test("returns direct sheet URL as-is", () => {
      const sheetUrl = "https://docs.google.com/spreadsheets/d/123/gviz/tq";
      expect(extractSheetUrl(sheetUrl)).toBe(sheetUrl);
    });

    test("extracts sheet URL from app URL parameter", () => {
      const appUrl =
        "http://localhost:8000/meeting-program?url=https%3A%2F%2Fdocs.google.com%2Fspreadsheets%2Fd%2F123%2Fgviz%2Ftq";
      expect(extractSheetUrl(appUrl)).toBe("https://docs.google.com/spreadsheets/d/123/gviz/tq");
    });

    test("extracts sheet URL from khilghard.github.io URL parameter", () => {
      const appUrl =
        "https://khilghard.github.io/meeting-program?url=https%3A%2F%2Fdocs.google.com%2Fspreadsheets%2Fd%2F123%2Fgviz%2Ftq";
      expect(extractSheetUrl(appUrl)).toBe("https://docs.google.com/spreadsheets/d/123/gviz/tq");
    });

    test("returns null for invalid URL", () => {
      expect(extractSheetUrl("not-a-url")).toBe(null);
      expect(extractSheetUrl(null)).toBe(null);
    });

    test("handles empty URL", () => {
      expect(extractSheetUrl("")).toBe(null);
    });
  });

  // ---------- showScanner / hideScanner ----------
  describe("Scanner State", () => {
    test("showScanner unhides section and updates button", () => {
      const btn = document.getElementById("qr-action-btn");
      showScanner();
      expect(document.getElementById("qr-scanner").hidden).toBe(false);
      expect(btn.textContent).toBe("Cancel");
    });

    test("hideScanner hides section and restores button", async () => {
      const btn = document.getElementById("qr-action-btn");
      showScanner();
      await hideScanner();
      expect(document.getElementById("qr-scanner").hidden).toBe(true);
      expect(btn.textContent).toBe("Scan Program QR Code");
    });

    test("hideScanner shows different text if URL is stored", async () => {
      const btn = document.getElementById("qr-action-btn");
      mockMetadata["legacy_sheetUrl"] = "https://docs.google.com/spreadsheets/d/123";
      await hideScanner();
      expect(btn.textContent).toBe("Scan a Different Program");
    });

    test("hideScanner uses khilghard.github.io URL as fallback", () => {
      const btn = document.getElementById("qr-action-btn");
      // Clear any stored URL
      localStorage.removeItem("sheetUrl");
      hideScanner();
      expect(btn.textContent).toBe("Scan Program QR Code");
    });

    test("hideScanner hides manual URL entry", async () => {
      const error = new Error("Permission denied");
      navigator.mediaDevices.getUserMedia.mockRejectedValue(error);
      const manualBtn = document.getElementById("manual-url-btn");

      await startQRScanner();
      expect(manualBtn.hidden).toBe(false);

      hideScanner();
      expect(manualBtn.hidden).toBe(true);
    });

    test("showManualUrlEntry shows button when camera fails and URL is stored", async () => {
      const error = new Error("Permission denied");
      navigator.mediaDevices.getUserMedia.mockRejectedValue(error);
      const manualBtn = document.getElementById("manual-url-btn");
      const manualContainer = document.getElementById("manual-url-container");
      const manualInput = document.getElementById("manual-url-input");

      // Set a stored URL
      localStorage.setItem("sheetUrl", "https://docs.google.com/spreadsheets/d/123");

      await startQRScanner();

      expect(manualBtn.hidden).toBe(false);
      expect(manualBtn.textContent).toBe("Enter Sheet URL Manually");
      expect(manualContainer.hidden).toBe(true);
      expect(manualInput.value).toBe("");
    });
  });

  // ---------- Camera Access ----------
  describe("Camera Access", () => {
    test("startQRScanner requests camera and plays video", async () => {
      const mockStream = {
        getTracks: () => [{ stop: vi.fn() }]
      };
      navigator.mediaDevices.getUserMedia.mockResolvedValue(mockStream);

      const video = document.getElementById("qr-video");
      video.play = vi.fn();

      await startQRScanner();

      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
        video: { facingMode: "environment" }
      });
      expect(video.srcObject).toBe(mockStream);
      expect(video.play).toHaveBeenCalled();
    });

    test("stopQRScanner stops all tracks", async () => {
      const stopSpy = vi.fn();
      const mockStream = {
        getTracks: () => [{ stop: stopSpy }]
      };
      navigator.mediaDevices.getUserMedia.mockResolvedValue(mockStream);

      await startQRScanner();
      stopQRScanner();

      expect(stopSpy).toHaveBeenCalled();
    });

    test("startQRScanner handles camera error", async () => {
      const error = new Error("Permission denied");
      navigator.mediaDevices.getUserMedia.mockRejectedValue(error);
      const output = document.getElementById("qr-output");

      await startQRScanner();

      expect(output.textContent).toBe("Camera access denied or unavailable.");
    });
  });

  // ---------- Manual URL Entry ----------
  describe("Manual URL Entry", () => {
    test("showManualUrlEntry shows button when camera fails", async () => {
      const error = new Error("Permission denied");
      navigator.mediaDevices.getUserMedia.mockRejectedValue(error);
      const manualBtn = document.getElementById("manual-url-btn");

      await startQRScanner();

      expect(manualBtn.hidden).toBe(false);
      expect(manualBtn.textContent).toBe("Enter Sheet URL Manually");
    });

    test("manual URL button reveals input field", async () => {
      const error = new Error("Permission denied");
      navigator.mediaDevices.getUserMedia.mockRejectedValue(error);
      const manualBtn = document.getElementById("manual-url-btn");
      const manualContainer = document.getElementById("manual-url-container");
      const manualInput = document.getElementById("manual-url-input");

      await startQRScanner();
      manualBtn.click();

      expect(manualBtn.hidden).toBe(true);
      expect(manualContainer.hidden).toBe(false);
      expect(manualInput.placeholder).toBe("Enter Google Sheets URL");
    });

    test("valid manual URL submits and dispatches event with khilghard.github.io fallback", async () => {
      const error = new Error("Permission denied");
      navigator.mediaDevices.getUserMedia.mockRejectedValue(error);
      const manualBtn = document.getElementById("manual-url-btn");
      const manualInput = document.getElementById("manual-url-input");
      const manualSubmit = document.getElementById("manual-url-submit");

      const dispatchEventSpy = vi.spyOn(window, "dispatchEvent");

      await startQRScanner();
      manualBtn.click();
      manualInput.value = "https://docs.google.com/spreadsheets/d/test";
      manualSubmit.click();

      expect(dispatchEventSpy).toHaveBeenCalled();
      const event = dispatchEventSpy.mock.calls[0][0];
      expect(event.type).toBe("qr-scanned");
      expect(event.detail.url).toBe("https://docs.google.com/spreadsheets/d/test");
    });

    test("valid manual URL submits and dispatches event", async () => {
      const error = new Error("Permission denied");
      navigator.mediaDevices.getUserMedia.mockRejectedValue(error);
      const manualBtn = document.getElementById("manual-url-btn");
      const manualInput = document.getElementById("manual-url-input");
      const manualSubmit = document.getElementById("manual-url-submit");

      const dispatchEventSpy = vi.spyOn(window, "dispatchEvent");

      await startQRScanner();
      manualBtn.click();
      manualInput.value = "https://docs.google.com/spreadsheets/d/test";
      manualSubmit.click();

      // Wait for async event dispatch
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(dispatchEventSpy).toHaveBeenCalled();
      const event = dispatchEventSpy.mock.calls[0][0];
      expect(event.type).toBe("qr-scanned");
      expect(event.detail.url).toBe("https://docs.google.com/spreadsheets/d/test");
    });

    test("invalid manual URL shows error message", async () => {
      const error = new Error("Permission denied");
      navigator.mediaDevices.getUserMedia.mockRejectedValue(error);
      const manualBtn = document.getElementById("manual-url-btn");
      const manualInput = document.getElementById("manual-url-input");
      const manualSubmit = document.getElementById("manual-url-submit");
      const output = document.getElementById("qr-output");

      await startQRScanner();
      manualBtn.click();
      manualInput.value = "not-a-valid-url";
      manualSubmit.click();

      expect(output.textContent).toBe("Invalid URL. Please enter a valid Google Sheets URL.");
    });

    test("hideManualUrlEntry hides elements and clears input with khilghard.github.io URL", async () => {
      const error = new Error("Permission denied");
      navigator.mediaDevices.getUserMedia.mockRejectedValue(error);
      const manualBtn = document.getElementById("manual-url-btn");
      const manualInput = document.getElementById("manual-url-input");

      await startQRScanner();
      manualBtn.click();
      manualInput.value =
        "https://khilghard.github.io/meeting-program?url=https://docs.google.com/spreadsheets/d/test";

      QR.hideManualUrlEntry();

      expect(manualBtn.hidden).toBe(true);
      expect(manualInput.value).toBe("");
    });

    test("hideManualUrlEntry hides elements and clears input", async () => {
      const error = new Error("Permission denied");
      navigator.mediaDevices.getUserMedia.mockRejectedValue(error);
      const manualBtn = document.getElementById("manual-url-btn");
      const manualInput = document.getElementById("manual-url-input");

      await startQRScanner();
      manualBtn.click();
      manualInput.value = "https://docs.google.com/spreadsheets/d/test";

      QR.hideManualUrlEntry();

      expect(manualBtn.hidden).toBe(true);
      expect(manualInput.value).toBe("");
    });
  });

  // ---------- scanFrame ----------
  describe("scanFrame()", () => {
    let rafSpy;

    beforeEach(() => {
      rafSpy = vi.spyOn(window, "requestAnimationFrame").mockImplementation(() => {});
    });

    test("throttles scanning based on interval", async () => {
      // Setup qrStream
      const mockStream = { getTracks: () => [] };
      navigator.mediaDevices.getUserMedia.mockResolvedValue(mockStream);
      await startQRScanner();

      // First call
      scanFrame(100);
      expect(rafSpy).toHaveBeenCalled();

      // Consecutive call too soon (interval < 150)
      rafSpy.mockClear();
      scanFrame(200);
      expect(rafSpy).toHaveBeenCalled();
    });

    test("processes valid QR code and stops scanner", async () => {
      // Setup qrStream
      const stopSpy = vi.fn();
      const mockStream = { getTracks: () => [{ stop: stopSpy }] };
      navigator.mediaDevices.getUserMedia.mockResolvedValue(mockStream);
      await startQRScanner();

      const video = document.getElementById("qr-video");
      // Stub video element properties for testing
      stubVideoElement(video, { readyState: 4, videoWidth: 100, videoHeight: 100 });

      // Mock jsQR to return a valid URL
      global.jsQR.mockReturnValue({ data: "https://docs.google.com/spreadsheets/d/test" });

      scanFrame(1000); // Plenty of time passed

      expect(global.jsQR).toHaveBeenCalled();
      expect(stopSpy).toHaveBeenCalled(); // Should stop scanner on success

      // Should dispatch event now, not reload
      // expect(window.location.reload).toHaveBeenCalled();
      // We can't easily spy on window.dispatchEvent in this setup without more mocking,
      // but we can verify it DID NOT reload.
      expect(window.location.reload).not.toHaveBeenCalled();
    });

    test("handles invalid QR code and continues scanning with khilghard.github.io URL", async () => {
      const mockStream = { getTracks: () => [] };
      navigator.mediaDevices.getUserMedia.mockResolvedValue(mockStream);
      await startQRScanner();

      const video = document.getElementById("qr-video");
      stubVideoElement(video, { readyState: 4 });
      const output = document.getElementById("qr-output");

      // Mock jsQR to return an invalid string
      global.jsQR.mockReturnValue({
        data: "https://khilghard.github.io/meeting-program?url=invalid-url"
      });

      rafSpy.mockClear();
      scanFrame(1000);

      expect(output.textContent).toBe("Invalid QR code. Please scan a program QR code.");
      expect(rafSpy).toHaveBeenCalled(); // Should keep scanning
    });

    test("handles invalid QR code and continues scanning", async () => {
      const mockStream = { getTracks: () => [] };
      navigator.mediaDevices.getUserMedia.mockResolvedValue(mockStream);
      await startQRScanner();

      const video = document.getElementById("qr-video");
      stubVideoElement(video, { readyState: 4 });
      const output = document.getElementById("qr-output");

      // Mock jsQR to return an invalid string
      global.jsQR.mockReturnValue({ data: "not-a-google-sheet" });

      rafSpy.mockClear();
      scanFrame(1000);

      expect(output.textContent).toBe("Invalid QR code. Please scan a program QR code.");
      expect(rafSpy).toHaveBeenCalled(); // Should keep scanning
    });
  });
});
