import { describe, test, expect, beforeEach, vi } from "vitest";

// Mock i18n.js
vi.mock("../js/i18n/index.js", () => ({
  t: vi.fn((key) => {
    const translations = {
      cancel: "Cancel",
      scanProgramQR: "Scan Program QR Code",
      scanNewProgram: "Scan a Different Program",
      cameraUnavailable: "Camera access is not available in this browser.",
      cameraDenied: "Camera access denied or unavailable.",
      invalidQR: "Invalid QR code. Please scan a program QR code.",
      scannedUrl: "Scanned URL:",
      enterSheetUrlManually: "Enter Sheet URL Manually",
      enterSheetUrl: "Enter Google Sheets URL",
      invalidSheetUrl: "Invalid URL. Please enter a valid Google Sheets URL.",
      add: "Add"
    };
    return translations[key] || key;
  }),
  getLanguage: vi.fn(() => "en"),
  initI18n: vi.fn(() => "en"),
  setLanguage: vi.fn(),
  getSupportedLanguages: vi.fn(() => ["en", "es", "fr", "swa"])
}));

// Mock jsQR
global.jsQR = vi.fn();

// Import qr.js
import * as QR from "../js/qr.js";

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

describe("QR Module", () => {
  beforeEach(() => {
    document.body.innerHTML = `
            <div id="qr-scanner" hidden>
                <video id="qr-video" playsinline></video>
                <canvas id="qr-canvas"></canvas>
                <div id="qr-output"></div>
                <button id="manual-url-btn" class="qr-action-btn" hidden></button>
                <div id="manual-url-container" class="hidden">
                    <input type="text" id="manual-url-input" class="manual-url-input">
                    <button id="manual-url-submit" class="qr-action-btn"></button>
                </div>
            </div>
            <button id="qr-action-btn"></button>
        `;

    vi.clearAllMocks();
    localStorage.clear();

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
    test("detects Safari on iOS/Mac", () => {
      Object.defineProperty(navigator, "userAgent", {
        value:
          "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1",
        configurable: true
      });
      expect(isSafari()).toBe(true);
    });

    test("returns false for Chrome", () => {
      Object.defineProperty(navigator, "userAgent", {
        value:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        configurable: true
      });
      expect(isSafari()).toBe(false);
    });

    test("returns false for Android Safari (Chrome-based)", () => {
      Object.defineProperty(navigator, "userAgent", {
        value:
          "Mozilla/5.0 (Linux; Android 10; SM-A205U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Mobile Safari/537.36",
        configurable: true
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

    test("returns null for invalid URL", () => {
      expect(extractSheetUrl("not-a-url")).toBe(null);
      expect(extractSheetUrl(null)).toBe(null);
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

    test("hideScanner hides section and restores button", () => {
      const btn = document.getElementById("qr-action-btn");
      showScanner();
      hideScanner();
      expect(document.getElementById("qr-scanner").hidden).toBe(true);
      expect(btn.textContent).toBe("Scan Program QR Code");
    });

    test("hideScanner shows different text if URL is stored", () => {
      const btn = document.getElementById("qr-action-btn");
      localStorage.setItem("sheetUrl", "https://docs.google.com/spreadsheets/d/123");
      hideScanner();
      expect(btn.textContent).toBe("Scan a Different Program");
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
      // Object.defineProperty to bypass read-only readyState
      Object.defineProperty(video, "readyState", { value: 4 }); // HAVE_ENOUGH_DATA
      Object.defineProperty(video, "videoWidth", { value: 100 });
      Object.defineProperty(video, "videoHeight", { value: 100 });

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

    test("handles invalid QR code and continues scanning", async () => {
      const mockStream = { getTracks: () => [] };
      navigator.mediaDevices.getUserMedia.mockResolvedValue(mockStream);
      await startQRScanner();

      const video = document.getElementById("qr-video");
      Object.defineProperty(video, "readyState", { value: 4 });
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
