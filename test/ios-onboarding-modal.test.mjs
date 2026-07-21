import { describe, test, expect, beforeEach, vi } from "vitest";
import { stubBrowserAPIs } from "./utils/sandbox.js";

stubBrowserAPIs();

const IOS_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
const ANDROID_UA =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";
const DESKTOP_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15";

function setUA(ua) {
  Object.defineProperty(navigator, "userAgent", {
    value: ua,
    writable: true,
    configurable: true
  });
  Object.defineProperty(navigator, "platform", {
    value: "iPhone",
    writable: true,
    configurable: true
  });
  Object.defineProperty(navigator, "maxTouchPoints", {
    value: 5,
    writable: true,
    configurable: true
  });
}

describe("iOS Onboarding Modal", () => {
  let modal;
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    // Clean up any leftover dialog elements from previous tests
    document.querySelectorAll("#ios-onboarding-modal").forEach((el) => el.remove());

    // Mock jsQR for scan loop
    global.jsQR = vi.fn();

    // Spy on HTMLCanvasElement.getContext
    Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
      writable: true,
      configurable: true,
      value: vi.fn(() => ({
        drawImage: vi.fn(),
        getImageData: vi.fn(() => ({
          data: new Uint8ClampedArray(40000),
          width: 100,
          height: 100
        }))
      }))
    });

    // Spy on dialog property `open` since jsdom doesn't implement HTMLDialogElement.
    // We patch each instance method using a stable assignment.
    Object.defineProperty(HTMLElement.prototype, "open", {
      writable: true,
      configurable: true,
      value: false
    });
    HTMLElement.prototype.showModal = function () {
      this.open = true;
    };
    HTMLElement.prototype.close = function () {
      this.open = false;
    };

    // Mock getUserMedia
    Object.defineProperty(navigator, "mediaDevices", {
      writable: true,
      configurable: true,
      value: {
        getUserMedia: vi.fn().mockResolvedValue({
          getTracks: () => [{ stop: vi.fn() }]
        })
      }
    });

    // Reset module state
    vi.resetModules();
  });

  describe("isIOS()", () => {
    test("returns true for iPhone user agent", async () => {
      setUA(IOS_UA);
      const { isIOS } = await import("../js/components/ios-onboarding-modal.js");
      expect(isIOS()).toBe(true);
    });

    test("returns false for Android user agent", async () => {
      setUA(ANDROID_UA);
      const { isIOS } = await import("../js/components/ios-onboarding-modal.js");
      expect(isIOS()).toBe(false);
    });

    test("returns false for desktop user agent", async () => {
      setUA(DESKTOP_UA);
      const { isIOS } = await import("../js/components/ios-onboarding-modal.js");
      expect(isIOS()).toBe(false);
    });

    test("returns true when platform is MacIntel with maxTouchPoints > 1 (iPad on macOS)", async () => {
      setUA(DESKTOP_UA);
      Object.defineProperty(navigator, "platform", {
        value: "MacIntel",
        writable: true,
        configurable: true
      });
      Object.defineProperty(navigator, "maxTouchPoints", {
        value: 5,
        writable: true,
        configurable: true
      });
      const { isIOS } = await import("../js/components/ios-onboarding-modal.js");
      expect(isIOS()).toBe(true);
    });
  });

  describe("isIOSStandalone()", () => {
    test("returns true when iOS + navigator.standalone", async () => {
      setUA(IOS_UA);
      Object.defineProperty(navigator, "standalone", {
        value: true,
        writable: true,
        configurable: true
      });
      const { isIOSStandalone } = await import("../js/components/ios-onboarding-modal.js");
      expect(isIOSStandalone()).toBe(true);
    });

    test("returns true when iOS + display-mode: standalone matchMedia", async () => {
      setUA(IOS_UA);
      window.matchMedia = vi.fn().mockImplementation((query) => ({
        matches: query === "(display-mode: standalone)",
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn()
      }));
      const { isIOSStandalone } = await import("../js/components/ios-onboarding-modal.js");
      expect(isIOSStandalone()).toBe(true);
    });

    test("returns false when iOS but not standalone", async () => {
      setUA(IOS_UA);
      Object.defineProperty(navigator, "standalone", {
        value: false,
        writable: true,
        configurable: true
      });
      window.matchMedia = vi.fn().mockImplementation(() => ({
        matches: false,
        media: "(display-mode: standalone)",
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn()
      }));
      const { isIOSStandalone } = await import("../js/components/ios-onboarding-modal.js");
      expect(isIOSStandalone()).toBe(false);
    });

    test("returns false on Android", async () => {
      setUA(ANDROID_UA);
      const { isIOSStandalone } = await import("../js/components/ios-onboarding-modal.js");
      expect(isIOSStandalone()).toBe(false);
    });
  });

  describe("open()", () => {
    test("creates and shows the modal dialog", async () => {
      setUA(IOS_UA);
      const { open } = await import("../js/components/ios-onboarding-modal.js");
      open();

      const dialog = document.getElementById("ios-onboarding-modal");
      expect(dialog).not.toBeNull();
      expect(dialog.tagName).toBe("DIALOG");
      expect(dialog.open).toBe(true);
    });

    test("includes camera video, manual URL input, and skip button", async () => {
      setUA(IOS_UA);
      const { open } = await import("../js/components/ios-onboarding-modal.js");
      open();

      const video = document.getElementById("ios-onboarding-video");
      const urlInput = document.getElementById("ios-onboarding-url-input");
      const urlSubmit = document.getElementById("ios-onboarding-url-submit");
      const skipBtn = document.getElementById("ios-onboarding-skip-btn");

      expect(video).not.toBeNull();
      expect(urlInput).not.toBeNull();
      expect(urlSubmit).not.toBeNull();
      expect(skipBtn).not.toBeNull();
    });

    test("requests camera permission via getUserMedia", async () => {
      setUA(IOS_UA);
      const { open } = await import("../js/components/ios-onboarding-modal.js");
      open();

      // Allow promise microtask to flush
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
        video: { facingMode: "environment" }
      });
    });

    test("reuses existing modal on subsequent calls", async () => {
      setUA(IOS_UA);
      const { open } = await import("../js/components/ios-onboarding-modal.js");
      open();
      const first = document.getElementById("ios-onboarding-modal");

      open();
      const allDialogs = document.querySelectorAll("#ios-onboarding-modal");
      expect(allDialogs.length).toBe(1);
      expect(first).toBe(allDialogs[0]);
    });
  });

  describe("manual URL submission", () => {
    test("dispatches qr-scanned event with valid Google Sheets URL", async () => {
      setUA(IOS_UA);
      const { open } = await import("../js/components/ios-onboarding-modal.js");
      open();

      const eventPromise = new Promise((resolve) => {
        window.addEventListener("qr-scanned", (e) => resolve(e.detail.url), { once: true });
      });

      const input = document.getElementById("ios-onboarding-url-input");
      const submit = document.getElementById("ios-onboarding-url-submit");
      input.value = "https://docs.google.com/spreadsheets/d/test123";
      submit.click();

      const url = await eventPromise;
      expect(url).toBe("https://docs.google.com/spreadsheets/d/test123");
    });

    test("shows error for invalid URL", async () => {
      setUA(IOS_UA);
      const { open } = await import("../js/components/ios-onboarding-modal.js");
      open();

      const qrScannedSpy = vi.fn();
      window.addEventListener("qr-scanned", qrScannedSpy);

      const input = document.getElementById("ios-onboarding-url-input");
      const submit = document.getElementById("ios-onboarding-url-submit");
      input.value = "https://example.com/not-a-sheet";
      submit.click();

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(qrScannedSpy).not.toHaveBeenCalled();
      const output = document.getElementById("ios-onboarding-output");
      expect(output.textContent).toBeTruthy();
    });
  });

  describe("close()", () => {
    test("closes the modal dialog", async () => {
      setUA(IOS_UA);
      const { open, close } = await import("../js/components/ios-onboarding-modal.js");
      open();
      expect(document.getElementById("ios-onboarding-modal").open).toBe(true);

      close();
      expect(document.getElementById("ios-onboarding-modal").open).toBe(false);
    });

    test("skip button closes the modal", async () => {
      setUA(IOS_UA);
      const { open } = await import("../js/components/ios-onboarding-modal.js");
      open();

      const skipBtn = document.getElementById("ios-onboarding-skip-btn");
      skipBtn.click();

      expect(document.getElementById("ios-onboarding-modal").open).toBe(false);
    });
  });
});
