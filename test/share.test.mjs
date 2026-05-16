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

describe("share.js - helpModal", () => {
  let openHelpModal;

  beforeEach(async () => {
    document.body.innerHTML = `
      <dialog id="help-modal">
        <button id="close-help-modal-top-btn" aria-label="Close">×</button>
        <button id="close-help-modal-btn">Done</button>
        <h3 id="help-modal-title">Help & FAQ</h3>
      </dialog>
    `;

    const modal = document.getElementById("help-modal");
    modal.showModal = vi.fn();
    modal.close = vi.fn();

    vi.resetModules();
    const module = await import("../js/share.js");
    openHelpModal = module.openHelpModal;
  });

  test("should wire both help modal close buttons", async () => {
    const modal = document.getElementById("help-modal");
    const closeBtn = document.getElementById("close-help-modal-btn");
    const closeTopBtn = document.getElementById("close-help-modal-top-btn");

    await openHelpModal();

    expect(modal.showModal).toHaveBeenCalled();
    expect(closeBtn.onclick).toBeDefined();
    expect(closeTopBtn.onclick).toBeDefined();

    closeTopBtn.onclick();
    expect(modal.close).toHaveBeenCalledTimes(1);

    closeBtn.onclick();
    expect(modal.close).toHaveBeenCalledTimes(2);
  });
});
