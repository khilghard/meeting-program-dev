/**
 * @fileoverview Unit tests for Install Manager (PWA installation)
 * @module test/install-manager.test
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as InstallManager from "../js/install-manager.js";

describe("Install Manager", () => {
  let mockButton;

  setupTestIsolation(); // Set up browser API stubs and isolation

  beforeEach(() => {
    // Create mock install button
    mockButton = document.createElement("button");
    mockButton.id = "install-pwa-btn";
    mockButton.textContent = "Install App";
    document.body.appendChild(mockButton);
  });

  describe("isPWAInstalled", () => {
    it("should return false when PWA is not installed", () => {
      const result = InstallManager.isPWAInstalled();
      expect(typeof result).toBe("boolean");
      expect(result).toBe(false);
    });

    it("should check display-mode standalone using matchMedia", () => {
      const matchMediaMock = vi.fn().mockReturnValue({ matches: false });
      window.matchMedia = matchMediaMock;

      InstallManager.isPWAInstalled();
      expect(matchMediaMock).toHaveBeenCalledWith("(display-mode: standalone)");
    });

    it("should return true when matchMedia matches", () => {
      window.matchMedia = vi.fn().mockReturnValue({ matches: true });
      const result = InstallManager.isPWAInstalled();
      expect(result).toBe(true);
    });

    it("should return true when navigator.standalone is true", () => {
      window.matchMedia = vi.fn().mockReturnValue({ matches: false });
      Object.defineProperty(window.navigator, "standalone", {
        writable: true,
        value: true,
        configurable: true,
      });

      const result = InstallManager.isPWAInstalled();
      expect(result).toBe(true);
    });
  });

  describe("getInstallPrompt", () => {
    it("should return null initially", () => {
      const prompt = InstallManager.getInstallPrompt();
      expect(prompt).toBeNull();
    });
  });

  describe("ensureInstallButton", () => {
    it("should return existing button if it exists", () => {
      const button = InstallManager.ensureInstallButton();
      expect(button).toBe(mockButton);
    });

    it("should create button if it doesn't exist", () => {
      document.body.innerHTML = "";

      const createdButton = InstallManager.ensureInstallButton();
      expect(createdButton).toBeDefined();
      expect(createdButton.id).toBe("install-pwa-btn");
      expect(createdButton.className).toBe("install-btn");
      expect(createdButton.textContent).toBe("Install App");
    });

    it("should append button to header if it exists", () => {
      document.body.innerHTML = "";
      const header = document.createElement("header");
      document.body.appendChild(header);

      const createdButton = InstallManager.ensureInstallButton();
      expect(header.contains(createdButton)).toBe(true);
    });

    it("should append button to body if no header exists", () => {
      document.body.innerHTML = "";
      const createdButton = InstallManager.ensureInstallButton();
      expect(document.body.contains(createdButton)).toBe(true);
    });
  });

  describe("showInstallButton", () => {
    it("should set button display to block", () => {
      InstallManager.initInstallUI();
      mockButton.style.display = "none";
      InstallManager.showInstallButton();
      expect(mockButton.style.display).toBe("block");
    });

    it("should enable the button", () => {
      InstallManager.initInstallUI();
      mockButton.disabled = true;
      InstallManager.showInstallButton();
      expect(mockButton.disabled).toBe(false);
    });

    it("should add pulse animation class", () => {
      InstallManager.initInstallUI();
      InstallManager.showInstallButton();
      expect(mockButton.classList.contains("pulse")).toBe(true);
    });

    it("should remove pulse class after 1 second", async () => {
      vi.useFakeTimers();
      InstallManager.initInstallUI();
      InstallManager.showInstallButton();
      expect(mockButton.classList.contains("pulse")).toBe(true);

      vi.advanceTimersByTime(1000);
      expect(mockButton.classList.contains("pulse")).toBe(false);

      vi.useRealTimers();
    });

    it("should handle missing button gracefully", () => {
      document.body.innerHTML = "";
      expect(() => {
        InstallManager.showInstallButton();
      }).not.toThrow();
    });
  });

  describe("hideInstallButton", () => {
    it("should set button display to none", () => {
      InstallManager.initInstallUI();
      mockButton.style.display = "block";
      InstallManager.hideInstallButton();
      expect(mockButton.style.display).toBe("none");
    });

    it("should handle missing button gracefully", () => {
      document.body.innerHTML = "";
      expect(() => {
        InstallManager.hideInstallButton();
      }).not.toThrow();
    });
  });

  describe("initInstallUI", () => {
    it("should initialize when PWA is not installed", () => {
      expect(() => {
        InstallManager.initInstallUI();
      }).not.toThrow();
    });

    it("should handle missing install button without throwing", () => {
      document.body.innerHTML = "";
      expect(() => {
        InstallManager.initInstallUI();
      }).not.toThrow();
    });

    it("should add beforeinstallprompt event listener", () => {
      const addEventListenerSpy = vi.spyOn(window, "addEventListener");
      InstallManager.initInstallUI();

      // Verify event listener was added
      const beforeinstallCalls = addEventListenerSpy.mock.calls.filter(
        (call) => call[0] === "beforeinstallprompt"
      );
      expect(beforeinstallCalls.length).toBeGreaterThan(0);
    });

    it("should add appinstalled event listener", () => {
      const addEventListenerSpy = vi.spyOn(window, "addEventListener");
      InstallManager.initInstallUI();

      // Verify event listener was added
      const appinstalledCalls = addEventListenerSpy.mock.calls.filter(
        (call) => call[0] === "appinstalled"
      );
      expect(appinstalledCalls.length).toBeGreaterThan(0);
    });

    it("should not initialize if PWA is already installed", () => {
      window.matchMedia = vi.fn().mockReturnValue({ matches: true });
      expect(() => {
        InstallManager.initInstallUI();
      }).not.toThrow();
    });
  });

  describe("installPWA", () => {
    it("should warn when no deferred prompt available", async () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      await InstallManager.installPWA();
      expect(consoleSpy).toHaveBeenCalledWith("No deferred prompt available");
      consoleSpy.mockRestore();
    });

    it("should handle user dismissing install", async () => {
      const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const mockPrompt = vi.fn();
      const mockUserChoice = Promise.resolve({ outcome: "dismissed" });

      // Create event with all required properties
      const beforeinstallpromptEvent = new Event("beforeinstallprompt");
      beforeinstallpromptEvent.preventDefault = vi.fn();
      beforeinstallpromptEvent.prompt = mockPrompt;
      beforeinstallpromptEvent.userChoice = mockUserChoice;

      InstallManager.initInstallUI();
      window.dispatchEvent(beforeinstallpromptEvent);

      await InstallManager.installPWA();
      expect(mockPrompt).toHaveBeenCalled();
      consoleLogSpy.mockRestore();
    });
  });

  describe("init", () => {
    it("should create install button if missing", () => {
      document.body.innerHTML = "";
      InstallManager.init();
      const button = document.getElementById("install-pwa-btn");
      expect(button).toBeDefined();
      expect(button.id).toBe("install-pwa-btn");
    });

    it("should complete without errors", () => {
      expect(() => {
        InstallManager.init();
      }).not.toThrow();
    });

    it("should ensure button exists before initializing UI", () => {
      document.body.innerHTML = "";
      InstallManager.init();
      const button = document.getElementById("install-pwa-btn");
      expect(button).toBeDefined();
      expect(button.className).toBe("install-btn");
    });
  });

  describe("beforeinstallprompt event flow", () => {
    it("should handle beforeinstallprompt event", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      InstallManager.initInstallUI();

      const mockPrompt = vi.fn();
      const beforeinstallpromptEvent = new Event("beforeinstallprompt");
      beforeinstallpromptEvent.preventDefault = vi.fn();
      beforeinstallpromptEvent.prompt = mockPrompt;

      window.dispatchEvent(beforeinstallpromptEvent);

      expect(beforeinstallpromptEvent.preventDefault).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it("should handle appinstalled event", () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      InstallManager.initInstallUI();

      const appinstalledEvent = new Event("appinstalled");
      window.dispatchEvent(appinstalledEvent);

      expect(consoleSpy).toHaveBeenCalledWith("PWA installed successfully");
      consoleSpy.mockRestore();
    });
  });

  describe("module integration", () => {
    it("should export all required functions", () => {
      expect(typeof InstallManager.initInstallUI).toBe("function");
      expect(typeof InstallManager.showInstallButton).toBe("function");
      expect(typeof InstallManager.hideInstallButton).toBe("function");
      expect(typeof InstallManager.installPWA).toBe("function");
      expect(typeof InstallManager.isPWAInstalled).toBe("function");
      expect(typeof InstallManager.getInstallPrompt).toBe("function");
      expect(typeof InstallManager.ensureInstallButton).toBe("function");
      expect(typeof InstallManager.init).toBe("function");
    });

    it("should handle rapid init/show/hide operations", () => {
      expect(() => {
        InstallManager.init();
        InstallManager.showInstallButton();
        InstallManager.hideInstallButton();
        InstallManager.showInstallButton();
      }).not.toThrow();
    });
  });
});

