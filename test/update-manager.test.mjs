import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("Update Manager", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="update-notification" class="update-banner hidden">
        <span class="update-message">Test message</span>
        <button id="update-now-btn">Update</button>
        <button id="update-close-btn">Close</button>
      </div>
    `;

    global.localStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn()
    };
  });

  afterEach(() => {
    delete global.localStorage;
    vi.resetModules();
  });

  it("should be importable", async () => {
    const updateManager = await import("../js/update-manager.js");
    expect(updateManager).toBeDefined();
  });

  it("should have showUpdateBanner function", async () => {
    const { showUpdateBanner } = await import("../js/update-manager.js");
    expect(typeof showUpdateBanner).toBe("function");
  });

  it("should have hideUpdateBanner function", async () => {
    const { hideUpdateBanner } = await import("../js/update-manager.js");
    expect(typeof hideUpdateBanner).toBe("function");
  });

  it("should have checkForUpdates function", async () => {
    const { checkForUpdates } = await import("../js/update-manager.js");
    expect(typeof checkForUpdates).toBe("function");
  });

  it("should have init function", async () => {
    const { init } = await import("../js/update-manager.js");
    expect(typeof init).toBe("function");
  });

  it("should have cancelAutoUpdate function", async () => {
    const { cancelAutoUpdate } = await import("../js/update-manager.js");
    expect(typeof cancelAutoUpdate).toBe("function");
  });

  it("should have scheduleAutoUpdate function", async () => {
    const { scheduleAutoUpdate } = await import("../js/update-manager.js");
    expect(typeof scheduleAutoUpdate).toBe("function");
  });

  it("should hide update banner when hideUpdateBanner is called", async () => {
    const { hideUpdateBanner } = await import("../js/update-manager.js");

    const banner = document.getElementById("update-notification");
    banner.classList.remove("hidden");

    hideUpdateBanner();

    expect(banner.classList.contains("hidden")).toBe(true);
  });

  it("should show update banner when showUpdateBanner is called", async () => {
    const { showUpdateBanner } = await import("../js/update-manager.js");

    const versionInfo = {
      localVersion: "1.5.1",
      remoteVersion: "2.0.0",
      needsUpdate: true
    };

    showUpdateBanner(versionInfo);

    const banner = document.getElementById("update-notification");
    expect(banner.classList.contains("hidden")).toBe(false);
  });
});
