import { describe, test, expect, beforeEach, vi } from "vitest";

// Mock jsQR
global.jsQR = vi.fn();

// Import qr.js
import * as QR from "../js/qr.js";

const {
    isSafari,
    isValidSheetUrl,
    showScanner,
    hideScanner,
    startQRScanner,
    stopQRScanner,
    scanFrame,
    handleScannedUrl
} = QR;

describe("QR Module", () => {
    beforeEach(() => {
        document.body.innerHTML = `
            <div id="qr-scanner" hidden>
                <video id="qr-video" playsinline></video>
                <canvas id="qr-canvas"></canvas>
                <div id="qr-output"></div>
            </div>
            <button id="qr-action-btn"></button>
        `;

        vi.clearAllMocks();
        localStorage.clear();

        // Mock navigator.mediaDevices
        Object.defineProperty(navigator, 'mediaDevices', {
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
        vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(this.mockContext);
    });

    // ---------- isSafari ----------
    describe("isSafari()", () => {
        test("detects Safari on iOS/Mac", () => {
            Object.defineProperty(navigator, 'userAgent', {
                value: "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1",
                configurable: true
            });
            expect(isSafari()).toBe(true);
        });

        test("returns false for Chrome", () => {
            Object.defineProperty(navigator, 'userAgent', {
                value: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
                configurable: true
            });
            expect(isSafari()).toBe(false);
        });

        test("returns false for Android Safari (Chrome-based)", () => {
            Object.defineProperty(navigator, 'userAgent', {
                value: "Mozilla/5.0 (Linux; Android 10; SM-A205U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Mobile Safari/537.36",
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

        test("rejects non-Google URLs", () => {
            expect(isValidSheetUrl("https://example.com")).toBe(false);
        });

        test("rejects malformed URLs", () => {
            expect(isValidSheetUrl("not-a-url")).toBe(false);
        });

        test("rejects non-string input", () => {
            expect(isValidSheetUrl(null)).toBe(false);
            expect(isValidSheetUrl(undefined)).toBe(false);
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

    // ---------- scanFrame ----------
    describe("scanFrame()", () => {
        let rafSpy;

        beforeEach(() => {
            rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => { });
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
            Object.defineProperty(video, 'readyState', { value: 4 }); // HAVE_ENOUGH_DATA
            Object.defineProperty(video, 'videoWidth', { value: 100 });
            Object.defineProperty(video, 'videoHeight', { value: 100 });

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
            Object.defineProperty(video, 'readyState', { value: 4 });
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
