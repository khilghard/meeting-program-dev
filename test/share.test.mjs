import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";

// Set up test isolation with browser API stubs
setupTestIsolation();

describe("share.js - shareModal", () => {
  let openShareModal;

  beforeEach(async () => {
    // Set up real DOM elements that share.js expects
    document.body.innerHTML = `
      <dialog id="share-modal">
        <button id="close-share-modal-btn">Close</button>
        <div id="share-qr-container"></div>
        <div id="share-url-display"></div>
      </dialog>
    `;

    // Mock dialog element methods since jsdom doesn't fully implement them
    const modal = document.getElementById("share-modal");
    modal.showModal = vi.fn();
    modal.close = vi.fn();

    // Mock window.location.search
    delete window.location;
    window.location = new URL("https://example.com/");

    vi.resetModules();
    const module = await import("../js/share.js");
    openShareModal = module.openShareModal;
  });

  describe("openShareModal", () => {
    test("should return early if modal not found", async () => {
      document.body.innerHTML = "";
      const result = await openShareModal();
      expect(result).toBeUndefined();
    });

    test("should show modal", async () => {
      const modal = document.getElementById("share-modal");
      await openShareModal();
      expect(modal.showModal).toHaveBeenCalled();
    });

    test("should setup close button handler", async () => {
      const modal = document.getElementById("share-modal");
      const closeBtn = document.getElementById("close-share-modal-btn");
      
      await openShareModal();
      expect(closeBtn.onclick).toBeDefined();
      closeBtn.onclick();
      expect(modal.close).toHaveBeenCalled();
    });
  });
});

describe("share.js - initShareUI", () => {
  let initShareUI;

  beforeEach(async () => {
    // Set up real DOM elements
    document.body.innerHTML = `
      <button id="share-btn">Share</button>
    `;

    vi.resetModules();
    const module = await import("../js/share.js");
    initShareUI = module.initShareUI;
  });

  describe("initShareUI", () => {
    test("should be a function", () => {
      expect(typeof initShareUI).toBe("function");
    });

    test("should not throw when called", () => {
      expect(() => initShareUI()).not.toThrow();
    });
  });
});
