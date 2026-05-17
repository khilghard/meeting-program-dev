import { beforeEach, describe, expect, test, vi } from "vitest";
import { JSDOM } from "jsdom";

let profilesState;
let getActiveProfiles;
let getProfile;
let updateProfile;
let getSelectedProfileId;
let showScanner;

vi.mock("../js/i18n/index.js", () => ({
  t: key => key
}));

vi.mock("../js/profiles.js", () => ({
  getActiveProfiles: () => getActiveProfiles(),
  getProfile: id => getProfile(id),
  updateProfile: profile => updateProfile(profile),
  getSelectedProfileId: () => getSelectedProfileId()
}));

vi.mock("../js/qr.js", () => ({
  showScanner: () => showScanner()
}));

const { openAgendaSettingsModal, saveAgendaUrl } = await import("../js/agenda/AgendaSettings.js");

describe("AgendaSettings", () => {
  let document;
  let window;

  beforeEach(() => {
    const dom = new JSDOM(
      `<!doctype html>
      <html>
        <body>
          <dialog id="agenda-settings-modal">
            <h2 id="agenda-modal-title"></h2>
            <div id="agenda-profiles-list"></div>
          </dialog>
        </body>
      </html>`,
      { url: "https://example.test/" }
    );

    document = dom.window.document;
    window = dom.window;
    global.document = document;
    global.window = window;
    global.fetch = vi.fn();

    document.getElementById("agenda-settings-modal").showModal = function() {
      this.open = true;
    };
    document.getElementById("agenda-settings-modal").close = function() {
      this.open = false;
    };

    profilesState = [
      {
        id: "profile-1",
        unitName: "Test Ward",
        stakeName: "Test Stake",
        agendaUrl: "https://docs.google.com/spreadsheets/d/agenda123/edit",
        agendaValid: false,
        agendaLastLoaded: 1234
      }
    ];

    getActiveProfiles = vi.fn(() => profilesState);
    getProfile = vi.fn(async id => profilesState.find(profile => profile.id === id) ?? null);
    updateProfile = vi.fn(async profile => {
      profilesState = profilesState.map(existing => existing.id === profile.id ? { ...profile } : existing);
      return profile;
    });
    getSelectedProfileId = vi.fn(() => "profile-1");
    showScanner = vi.fn();
    window.loadAgendaForCurrentProfile = vi.fn().mockResolvedValue();
  });

  test("renders editor configuration and legacy availability separately", () => {
    openAgendaSettingsModal();

    const listText = document.getElementById("agenda-profiles-list").textContent;
    expect(listText).toContain("Configured for editor");
    expect(listText).toContain("Needs refresh in main app");
    expect(listText).not.toContain("Connected");
    expect(document.querySelector(".edit-agenda-btn").getAttribute("href")).toBe(
      "cms_agenda/index.html?profileId=profile-1"
    );
  });

  test("saves the URL and delegates legacy refresh to the main app loader", async () => {
    await saveAgendaUrl("profile-1", "https://docs.google.com/spreadsheets/d/agenda456/edit");

    expect(updateProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "profile-1",
        agendaUrl: "https://docs.google.com/spreadsheets/d/agenda456/edit",
        agendaValid: false,
        agendaLastLoaded: null
      })
    );
    expect(window.loadAgendaForCurrentProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "profile-1",
        agendaUrl: "https://docs.google.com/spreadsheets/d/agenda456/edit"
      })
    );
    expect(global.fetch).not.toHaveBeenCalled();
  });
});