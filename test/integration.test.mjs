import { describe, test, expect, beforeEach, vi } from "vitest";

// Prevent init() from auto-running during tests
window.__VITEST__ = true;

// Set up test isolation with browser API stubs
stubBrowserAPIs();

// Import all modules (real modules, no internal mocks)
import * as Main from "../js/main.js";
import * as I18n from "../js/i18n/index.js";
import * as Profiles from "../js/profiles.js";
import * as History from "../js/history.js";
import * as Share from "../js/share.js";

describe("Integration: Program Loading Flows", () => {
  beforeEach(() => {
    window.scrollTo = vi.fn();
    localStorage.clear();
    document.body.innerHTML = `
            <header id="program-header" class="hidden">
                 <h2 class="sacrament-unit-header-h2"><span id="unitname"></span></h2>
                 <h6 class="sacrament-unit-header-h6"><span id="unitaddress"></span></h6>
                 <p id="date"></p>
            </header>
            <div id="offline-banner" hidden></div>
            <div id="main-program"></div>
            <button id="qr-action-btn"></button>
            <button id="reload-btn" class="hidden"></button>
            <div id="app-version"></div>
            <div id="last-updated" class="hidden"></div>
        `;
    global.fetch = vi.fn();

    delete window.location;
    window.location = new URL("https://example.com/");
  });

  test("loads program from URL parameter and saves to cache", async () => {
    window.location = new URL(
      "https://example.com/?url=https://docs.google.com/spreadsheets/d/test-url"
    );

    global.fetch.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve("key,value\nunitName,Parameter Ward\nspeaker,Alice")
    });

    await Main.init();

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("test-url"),
      expect.anything()
    );
    expect(document.getElementById("unitname").textContent).toBe("Parameter Ward");
    expect(document.querySelector("#speaker .value-on-right").textContent).toBe("Alice");

    // Verify cache update
    const cache = JSON.parse(localStorage.getItem("programCache"));
    expect(cache).toContainEqual({ key: "unitName", value: "Parameter Ward" });
  });

  test("loads program from localStorage if no URL parameter", async () => {
    localStorage.setItem("sheetUrl", "https://docs.google.com/spreadsheets/d/cached-url");

    global.fetch.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve("key,value\nunitName,Cached Ward")
    });

    await Main.init();

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("cached-url"),
      expect.anything()
    );
    expect(document.getElementById("unitname").textContent).toBe("Cached Ward");
  });

  test("falls back to programCache on fetch failure", async () => {
    localStorage.setItem("sheetUrl", "https://docs.google.com/spreadsheets/d/url");
    localStorage.setItem(
      "programCache",
      JSON.stringify([{ key: "unitName", value: "Offline Ward" }])
    );

    global.fetch.mockRejectedValue(new Error("Network Failure"));

    await Main.init();

    expect(document.getElementById("unitname").textContent).toBe("Offline Ward");
  });
});
