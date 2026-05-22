import { beforeEach, describe, expect, test, vi } from "vitest";
import { JSDOM } from "jsdom";

import { buildCmsDraftKey, createCmsApp } from "../js/cms.js";

describe("cms.js", () => {
  let dom;
  let document;
  let window;
  let editorInstance;

  beforeEach(() => {
    dom = new JSDOM(
      `<!doctype html>
      <html>
        <body>
          <div id="cms-page-status" hidden></div>
          <section id="cms-auth-panel" hidden>
            <p id="cms-auth-message"></p>
            <button id="cms-setup-btn" type="button">Configure</button>
            <button id="cms-sign-in-btn" type="button">Sign in</button>
          </section>
          <dialog id="cms-setup-modal" hidden>
            <input id="cms-setup-client-id" type="text" />
            <input id="cms-setup-sheet-url" type="text" />
            <div id="cms-setup-status" hidden></div>
            <button id="cms-setup-save-btn" type="button">Save settings</button>
            <button id="cms-setup-cancel-btn" type="button">Cancel</button>
          </dialog>
          <div id="cms-loading">Loading CMS...</div>
          <section id="cms-content" hidden>
            <p id="cms-shell-title"></p>
            <h1 id="cms-profile-name"></h1>
            <div id="cms-modified-time"></div>
            <div id="cms-toolbar">
              <label><span id="cms-locale-label"></span><select id="cms-locale-select"></select></label>
              <label><span id="cms-tab-label"></span><select id="cms-tab-select"></select></label>
              <button id="cms-save-btn" type="button">Save</button>
              <button id="cms-discard-btn" type="button">Discard</button>
            </div>
            <div id="cms-editor-container"></div>
          </section>
        </body>
      </html>`,
      {
        url: "https://example.test/cms/"
      }
    );

    document = dom.window.document;
    window = dom.window;
    global.document = document;
    global.window = window;
    global.navigator = window.navigator;
    global.sessionStorage = window.sessionStorage;
    document.getElementById("cms-setup-modal").showModal = function () {
      this.hidden = false;
      this.open = true;
    };
    document.getElementById("cms-setup-modal").close = function () {
      this.hidden = true;
      this.open = false;
    };
  });

  test("loads the current profile sheet rows for the active locale and tab", async () => {
    const readSheet = vi.fn().mockResolvedValue({
      rows: [{ key: "unitName", value: "Millcreek 5th Ward" }],
      modifiedTime: "2026-05-16T12:00:00.000Z"
    });

    const app = createCmsApp({
      documentRef: document,
      windowRef: window,
      profileManager: {
        initProfileManager: vi.fn().mockResolvedValue(),
        getCurrentProfile: vi.fn().mockResolvedValue({
          id: "profile-1",
          url: "https://docs.google.com/spreadsheets/d/abc123/edit",
          unitName: "Millcreek 5th Ward"
        })
      },
      initI18n: vi.fn().mockResolvedValue("es"),
      getSupportedLanguages: () => ["en", "es", "fr"],
      setLanguage: vi.fn().mockResolvedValue(),
      t: (key) => key,
      getMetadata: vi.fn().mockResolvedValue("test-client-id"),
      getDraft: vi.fn().mockResolvedValue(null),
      saveDraft: vi.fn().mockResolvedValue(true),
      clearDraft: vi.fn().mockResolvedValue(true),
      auth: {
        initialize: vi.fn(),
        isAuthenticated: () => true,
        getAccessToken: () => "token"
      },
      createClient: vi.fn().mockReturnValue({}),
      ProgramSheetServiceClass: class {
        async readSheet(locale, tab) {
          return readSheet(locale, tab);
        }

        async writeSheet() {
          return { conflict: false, modifiedTime: "2026-05-16T12:00:00.000Z" };
        }

        async writeSheetWithDeletes() {
          return { conflict: false, modifiedTime: "2026-05-16T12:00:00.000Z" };
        }
      },
      SheetTabServiceClass: class {
        async listTabs() {
          return [{ sheetId: 22, title: "May 18", index: 0, isActive: true }];
        }
      },
      CmsEditorClass: class {
        constructor(containerId, options) {
          this.container = document.getElementById(containerId);
          this.options = options;
          this.rows = [];
          editorInstance = this;
        }

        initialize(rows) {
          this.rows = rows;
          this.container.textContent = JSON.stringify(rows);
        }

        getRows() {
          return this.rows;
        }

        getAllRows() {
          return this.rows;
        }

        getRemovedKeys() {
          return [];
        }

        discardChanges() {}
      }
    });

    await app.initialize();

    expect(readSheet).toHaveBeenCalledWith("es", expect.objectContaining({ title: "May 18" }));
    expect(document.getElementById("cms-profile-name").textContent).toContain("Millcreek 5th Ward");
    expect(document.getElementById("cms-editor-container").textContent).toContain("unitName");
    expect(document.getElementById("cms-content").hidden).toBe(false);
  });

  test("persists a draft for the current locale and selected tab when the editor changes", async () => {
    const saveDraft = vi.fn().mockResolvedValue(true);

    const app = createCmsApp({
      documentRef: document,
      windowRef: window,
      profileManager: {
        initProfileManager: vi.fn().mockResolvedValue(),
        getCurrentProfile: vi.fn().mockResolvedValue({
          id: "profile_underscore",
          url: "https://docs.google.com/spreadsheets/d/abc123/edit",
          unitName: "Test Ward"
        })
      },
      initI18n: vi.fn().mockResolvedValue("en"),
      getSupportedLanguages: () => ["en", "es"],
      setLanguage: vi.fn().mockResolvedValue(),
      t: (key) => key,
      getMetadata: vi.fn().mockResolvedValue("test-client-id"),
      getDraft: vi.fn().mockResolvedValue(null),
      saveDraft,
      clearDraft: vi.fn().mockResolvedValue(true),
      auth: {
        initialize: vi.fn(),
        isAuthenticated: () => true,
        getAccessToken: () => "token"
      },
      createClient: vi.fn().mockReturnValue({}),
      ProgramSheetServiceClass: class {
        async readSheet() {
          return {
            rows: [{ key: "unitName", value: "Test Ward" }],
            modifiedTime: "2026-05-16T12:00:00.000Z"
          };
        }

        async writeSheet() {
          return { conflict: false, modifiedTime: "2026-05-16T12:00:00.000Z" };
        }

        async writeSheetWithDeletes() {
          return { conflict: false, modifiedTime: "2026-05-16T12:00:00.000Z" };
        }
      },
      SheetTabServiceClass: class {
        async listTabs() {
          return [{ sheetId: 9, title: "Sheet1", index: 0, isActive: true }];
        }
      },
      CmsEditorClass: class {
        constructor(containerId, options) {
          this.container = document.getElementById(containerId);
          this.options = options;
          this.rows = [];
          editorInstance = this;
        }

        initialize(rows) {
          this.rows = rows;
          this.container.textContent = "ready";
        }

        getRows() {
          return this.rows;
        }

        getAllRows() {
          return this.rows;
        }

        getRemovedKeys() {
          return [];
        }

        discardChanges() {}
      }
    });

    await app.initialize();
    editorInstance.rows = [{ key: "unitName", value: "Updated Ward" }];
    await editorInstance.options.onChangeCallback();

    expect(saveDraft).toHaveBeenCalledWith(buildCmsDraftKey("profile_underscore"), {
      version: 2,
      locale: "en",
      selectedTabTitle: "Sheet1",
      rows: [{ key: "unitName", value: "Updated Ward" }],
      savedAt: expect.any(Number)
    });
  });

  test("reloads the page when Discard Draft is clicked", async () => {
    const clearDraft = vi.fn().mockResolvedValue(true);
    const reloadSpy = vi.fn();
    const discardChanges = vi.fn();
    const windowRef = {
      ...window,
      location: {
        href: window.location.href,
        reload: reloadSpy
      },
      sessionStorage: window.sessionStorage,
      addEventListener: window.addEventListener.bind(window),
      removeEventListener: window.removeEventListener.bind(window),
      dispatchEvent: window.dispatchEvent.bind(window)
    };

    const app = createCmsApp({
      documentRef: document,
      windowRef,
      profileManager: {
        initProfileManager: vi.fn().mockResolvedValue(),
        getCurrentProfile: vi.fn().mockResolvedValue({
          id: "profile-discard",
          url: "https://docs.google.com/spreadsheets/d/abc123/edit",
          unitName: "Test Ward"
        })
      },
      initI18n: vi.fn().mockResolvedValue("en"),
      getSupportedLanguages: () => ["en", "es"],
      setLanguage: vi.fn().mockResolvedValue(),
      t: (key) => key,
      getMetadata: vi.fn().mockResolvedValue("test-client-id"),
      getDraft: vi.fn().mockResolvedValue(null),
      saveDraft: vi.fn().mockResolvedValue(true),
      clearDraft,
      auth: {
        initialize: vi.fn(),
        isAuthenticated: () => true,
        getAccessToken: () => "token"
      },
      createClient: vi.fn().mockReturnValue({}),
      ProgramSheetServiceClass: class {
        async readSheet() {
          return {
            rows: [{ key: "unitName", value: "Test Ward" }],
            modifiedTime: "2026-05-16T12:00:00.000Z"
          };
        }

        async writeSheet() {
          return { conflict: false, modifiedTime: "2026-05-16T12:00:00.000Z" };
        }

        async writeSheetWithDeletes() {
          return { conflict: false, modifiedTime: "2026-05-16T12:00:00.000Z" };
        }
      },
      SheetTabServiceClass: class {
        async listTabs() {
          return [{ sheetId: 9, title: "Sheet1", index: 0, isActive: true }];
        }
      },
      CmsEditorClass: class {
        constructor(containerId, options) {
          this.container = document.getElementById(containerId);
          this.options = options;
          this.rows = [];
        }

        initialize(rows) {
          this.rows = rows;
          this.container.textContent = "ready";
        }

        getRows() {
          return this.rows;
        }

        getAllRows() {
          return this.rows;
        }

        getRemovedKeys() {
          return [];
        }

        discardChanges() {
          discardChanges();
        }
      }
    });

    await app.initialize();

    document.getElementById("cms-discard-btn").click();

    await Promise.resolve();
    expect(discardChanges).toHaveBeenCalledOnce();
    expect(clearDraft).toHaveBeenCalledWith("cms_draft_profile-discard");
    expect(reloadSpy).toHaveBeenCalledOnce();
  });

  test("renders tab titles as text instead of HTML", async () => {
    const maliciousTitle = '<img src=x onerror="alert(1)">';

    const app = createCmsApp({
      documentRef: document,
      windowRef: window,
      profileManager: {
        initProfileManager: vi.fn().mockResolvedValue(),
        getCurrentProfile: vi.fn().mockResolvedValue({
          id: "profile-1",
          url: "https://docs.google.com/spreadsheets/d/abc123/edit",
          unitName: "Test Ward"
        })
      },
      initI18n: vi.fn().mockResolvedValue("en"),
      getSupportedLanguages: () => ["en"],
      setLanguage: vi.fn().mockResolvedValue(),
      t: (key) => key,
      getMetadata: vi.fn().mockResolvedValue("test-client-id"),
      getDraft: vi.fn().mockResolvedValue(null),
      saveDraft: vi.fn().mockResolvedValue(true),
      clearDraft: vi.fn().mockResolvedValue(true),
      auth: {
        initialize: vi.fn(),
        isAuthenticated: () => true,
        getAccessToken: () => "token"
      },
      createClient: vi.fn().mockReturnValue({}),
      ProgramSheetServiceClass: class {
        async readSheet() {
          return {
            rows: [{ key: "unitName", value: "Test Ward" }],
            modifiedTime: "2026-05-16T12:00:00.000Z"
          };
        }

        async writeSheet() {
          return { conflict: false, modifiedTime: "2026-05-16T12:00:00.000Z" };
        }

        async writeSheetWithDeletes() {
          return { conflict: false, modifiedTime: "2026-05-16T12:00:00.000Z" };
        }
      },
      SheetTabServiceClass: class {
        async listTabs() {
          return [{ sheetId: 1, title: maliciousTitle, index: 0, isActive: true }];
        }
      },
      CmsEditorClass: class {
        constructor(containerId) {
          this.container = document.getElementById(containerId);
        }

        initialize(rows) {
          this.rows = rows;
          this.container.textContent = JSON.stringify(rows);
        }

        getRows() {
          return this.rows;
        }

        getAllRows() {
          return this.rows;
        }

        getRemovedKeys() {
          return [];
        }

        discardChanges() {}
      }
    });

    await app.initialize();

    const tabSelect = document.getElementById("cms-tab-select");
    expect(tabSelect.options).toHaveLength(1);
    expect(tabSelect.options[0].textContent).toBe(`★ ${maliciousTitle}`);
    expect(tabSelect.querySelector("img")).toBeNull();
  });

  test("reloads rows when the locale selection changes", async () => {
    const readSheet = vi
      .fn()
      .mockResolvedValueOnce({
        rows: [{ key: "unitName", value: "English Ward" }],
        modifiedTime: "2026-05-16T12:00:00.000Z"
      })
      .mockResolvedValueOnce({
        rows: [{ key: "unitName", value: "Barrio Espanol" }],
        modifiedTime: "2026-05-16T12:05:00.000Z"
      });
    const setLanguage = vi.fn().mockResolvedValue();

    const app = createCmsApp({
      documentRef: document,
      windowRef: window,
      profileManager: {
        initProfileManager: vi.fn().mockResolvedValue(),
        getCurrentProfile: vi.fn().mockResolvedValue({
          id: "profile-2",
          url: "https://docs.google.com/spreadsheets/d/abc123/edit",
          unitName: "Test Ward"
        })
      },
      initI18n: vi.fn().mockResolvedValue("en"),
      getSupportedLanguages: () => ["en", "es"],
      setLanguage,
      t: (key) => key,
      getMetadata: vi.fn().mockResolvedValue("test-client-id"),
      getDraft: vi.fn().mockResolvedValue(null),
      saveDraft: vi.fn().mockResolvedValue(true),
      clearDraft: vi.fn().mockResolvedValue(true),
      auth: {
        initialize: vi.fn(),
        isAuthenticated: () => true,
        getAccessToken: () => "token"
      },
      createClient: vi.fn().mockReturnValue({}),
      ProgramSheetServiceClass: class {
        async readSheet(locale, tab) {
          return readSheet(locale, tab);
        }

        async writeSheet() {
          return { conflict: false, modifiedTime: "2026-05-16T12:05:00.000Z" };
        }
      },
      SheetTabServiceClass: class {
        async listTabs() {
          return [{ sheetId: 9, title: "Sheet1", index: 0, isActive: true }];
        }
      },
      CmsEditorClass: class {
        constructor(containerId) {
          this.container = document.getElementById(containerId);
        }

        initialize(rows) {
          this.rows = rows;
          this.container.textContent = JSON.stringify(rows);
        }

        getRows() {
          return this.rows;
        }

        getAllRows() {
          return this.rows;
        }

        getRemovedKeys() {
          return [];
        }

        discardChanges() {}
      }
    });

    await app.initialize();

    const localeSelect = document.getElementById("cms-locale-select");
    localeSelect.value = "es";
    localeSelect.dispatchEvent(new window.Event("change", { bubbles: true }));

    await vi.waitFor(() => {
      expect(document.getElementById("cms-editor-container").textContent).toContain(
        "Barrio Espanol"
      );
    });

    expect(setLanguage).toHaveBeenCalledWith("es");
    expect(readSheet).toHaveBeenNthCalledWith(
      2,
      "es",
      expect.objectContaining({ title: "Sheet1" })
    );
  });

  test("falls back to the first available supported locale when the selected locale is missing", async () => {
    const readSheet = vi
      .fn()
      .mockRejectedValueOnce(
        new Error(
          'ProgramSheetService: column "fr" not found in sheet header. Available columns: key, en, es'
        )
      )
      .mockResolvedValueOnce({
        rows: [{ key: "unitName", value: "Fallback Ward" }],
        modifiedTime: "2026-05-16T12:00:00.000Z"
      });

    const app = createCmsApp({
      documentRef: document,
      windowRef: window,
      profileManager: {
        initProfileManager: vi.fn().mockResolvedValue(),
        getCurrentProfile: vi.fn().mockResolvedValue({
          id: "profile-3",
          url: "https://docs.google.com/spreadsheets/d/abc123/edit",
          unitName: "Fallback Ward"
        })
      },
      initI18n: vi.fn().mockResolvedValue("fr"),
      getSupportedLanguages: () => ["en", "es", "fr"],
      setLanguage: vi.fn().mockResolvedValue(),
      t: (key) => key,
      getMetadata: vi.fn().mockResolvedValue("test-client-id"),
      getDraft: vi.fn().mockResolvedValue(null),
      saveDraft: vi.fn().mockResolvedValue(true),
      clearDraft: vi.fn().mockResolvedValue(true),
      auth: {
        initialize: vi.fn(),
        isAuthenticated: () => true,
        getAccessToken: () => "token"
      },
      createClient: vi.fn().mockReturnValue({}),
      ProgramSheetServiceClass: class {
        async readSheet(locale, tab) {
          return readSheet(locale, tab);
        }

        async writeSheet() {
          return { conflict: false, modifiedTime: "2026-05-16T12:00:00.000Z" };
        }

        async writeSheetWithDeletes() {
          return { conflict: false, modifiedTime: "2026-05-16T12:00:00.000Z" };
        }
      },
      SheetTabServiceClass: class {
        async listTabs() {
          return [{ sheetId: 9, title: "Sheet1", index: 0, isActive: true }];
        }
      },
      CmsEditorClass: class {
        constructor(containerId) {
          this.container = document.getElementById(containerId);
        }

        initialize(rows) {
          this.rows = rows;
          this.container.textContent = JSON.stringify(rows);
        }

        getRows() {
          return this.rows;
        }

        getAllRows() {
          return this.rows;
        }

        getRemovedKeys() {
          return [];
        }

        discardChanges() {}
      }
    });

    await app.initialize();

    expect(readSheet).toHaveBeenNthCalledWith(
      1,
      "fr",
      expect.objectContaining({ title: "Sheet1" })
    );
    expect(readSheet).toHaveBeenNthCalledWith(
      2,
      "en",
      expect.objectContaining({ title: "Sheet1" })
    );
    expect(document.getElementById("cms-locale-select").value).toBe("en");
    expect(document.getElementById("cms-page-status").textContent).toContain("Switched to EN");
  });

  test("recovers the loading state when a save fails", async () => {
    const app = createCmsApp({
      documentRef: document,
      windowRef: window,
      profileManager: {
        initProfileManager: vi.fn().mockResolvedValue(),
        getCurrentProfile: vi.fn().mockResolvedValue({
          id: "profile-4",
          url: "https://docs.google.com/spreadsheets/d/abc123/edit",
          unitName: "Failure Ward"
        })
      },
      initI18n: vi.fn().mockResolvedValue("en"),
      getSupportedLanguages: () => ["en", "es"],
      setLanguage: vi.fn().mockResolvedValue(),
      t: (key) => key,
      getMetadata: vi.fn().mockResolvedValue("test-client-id"),
      getDraft: vi.fn().mockResolvedValue(null),
      saveDraft: vi.fn().mockResolvedValue(true),
      clearDraft: vi.fn().mockResolvedValue(true),
      auth: {
        initialize: vi.fn(),
        isAuthenticated: () => true,
        getAccessToken: () => "token"
      },
      createClient: vi.fn().mockReturnValue({}),
      ProgramSheetServiceClass: class {
        async readSheet() {
          return {
            rows: [{ key: "unitName", value: "Failure Ward" }],
            modifiedTime: "2026-05-16T12:00:00.000Z"
          };
        }

        async writeSheet() {
          throw new Error("Save failed");
        }

        async writeSheetWithDeletes() {
          throw new Error("Save failed");
        }
      },
      SheetTabServiceClass: class {
        async listTabs() {
          return [{ sheetId: 9, title: "Sheet1", index: 0, isActive: true }];
        }
      },
      CmsEditorClass: class {
        constructor(containerId) {
          this.container = document.getElementById(containerId);
          this.rows = [];
        }

        initialize(rows) {
          this.rows = rows;
          this.container.textContent = JSON.stringify(rows);
        }

        getRows() {
          return this.rows;
        }

        getAllRows() {
          return this.rows;
        }

        getRemovedKeys() {
          return [];
        }

        discardChanges() {}
      }
    });

    await app.initialize();
    await app.handleSave();

    expect(document.getElementById("cms-loading").hidden).toBe(true);
    expect(document.getElementById("cms-content").hidden).toBe(false);
    expect(document.getElementById("cms-page-status").textContent).toContain("Save failed");
  });

  test("shows the sign-in gate again when sheet loading hits an auth error", async () => {
    const app = createCmsApp({
      documentRef: document,
      windowRef: window,
      profileManager: {
        initProfileManager: vi.fn().mockResolvedValue(),
        getCurrentProfile: vi.fn().mockResolvedValue({
          id: "profile-5",
          url: "https://docs.google.com/spreadsheets/d/abc123/edit",
          unitName: "Auth Ward"
        })
      },
      initI18n: vi.fn().mockResolvedValue("en"),
      getSupportedLanguages: () => ["en", "es"],
      setLanguage: vi.fn().mockResolvedValue(),
      t: (key) => key,
      getMetadata: vi.fn().mockResolvedValue("test-client-id"),
      getDraft: vi.fn().mockResolvedValue(null),
      saveDraft: vi.fn().mockResolvedValue(true),
      clearDraft: vi.fn().mockResolvedValue(true),
      auth: {
        initialize: vi.fn(),
        isAuthenticated: () => true,
        getAccessToken: () => "token"
      },
      createClient: vi.fn().mockReturnValue({}),
      ProgramSheetServiceClass: class {
        async readSheet() {
          const error = new Error(
            "Google Sheets: not authorized (403) — access token may be expired"
          );
          error.name = "SheetsAuthError";
          error.status = 403;
          throw error;
        }

        async writeSheet() {
          return { conflict: false, modifiedTime: "2026-05-16T12:00:00.000Z" };
        }

        async writeSheetWithDeletes() {
          return { conflict: false, modifiedTime: "2026-05-16T12:00:00.000Z" };
        }
      },
      SheetTabServiceClass: class {
        async listTabs() {
          return [{ sheetId: 9, title: "Sheet1", index: 0, isActive: true }];
        }
      },
      CmsEditorClass: class {
        constructor(containerId) {
          this.container = document.getElementById(containerId);
        }

        initialize(rows) {
          this.rows = rows;
        }

        getRows() {
          return this.rows;
        }

        getAllRows() {
          return this.rows;
        }

        getRemovedKeys() {
          return [];
        }

        discardChanges() {}
      }
    });

    await app.initialize();

    expect(document.getElementById("cms-auth-panel").hidden).toBe(false);
    expect(document.getElementById("cms-toolbar").hidden).toBe(true);
    expect(document.getElementById("cms-save-btn").disabled).toBe(true);
    expect(document.getElementById("cms-content").hidden).toBe(true);
    expect(document.getElementById("cms-page-status").textContent).toContain("session expired");
  });

  test("confirms before overwriting newer sheet changes", async () => {
    const clearDraft = vi.fn().mockResolvedValue(true);
    const confirm = vi.fn().mockReturnValue(true);
    const writeSheet = vi
      .fn()
      .mockResolvedValueOnce({ conflict: true, modifiedTime: "2026-05-16T12:30:00.000Z" })
      .mockResolvedValueOnce({ conflict: false, modifiedTime: "2026-05-16T12:31:00.000Z" });

    const app = createCmsApp({
      documentRef: document,
      windowRef: { ...window, confirm },
      profileManager: {
        initProfileManager: vi.fn().mockResolvedValue(),
        getCurrentProfile: vi.fn().mockResolvedValue({
          id: "profile-6",
          url: "https://docs.google.com/spreadsheets/d/abc123/edit",
          unitName: "Conflict Ward"
        })
      },
      initI18n: vi.fn().mockResolvedValue("en"),
      getSupportedLanguages: () => ["en", "es"],
      setLanguage: vi.fn().mockResolvedValue(),
      t: (key) => key,
      getMetadata: vi.fn().mockResolvedValue("test-client-id"),
      getDraft: vi.fn().mockResolvedValue(null),
      saveDraft: vi.fn().mockResolvedValue(true),
      clearDraft,
      auth: {
        initialize: vi.fn(),
        isAuthenticated: () => true,
        getAccessToken: () => "token"
      },
      createClient: vi.fn().mockReturnValue({}),
      ProgramSheetServiceClass: class {
        async readSheet() {
          return {
            rows: [{ key: "unitName", value: "Conflict Ward" }],
            modifiedTime: "2026-05-16T12:00:00.000Z"
          };
        }

        async writeSheet(...args) {
          return writeSheet(...args);
        }

        async writeSheetWithDeletes(...args) {
          return writeSheet(...args);
        }
      },
      SheetTabServiceClass: class {
        async listTabs() {
          return [{ sheetId: 9, title: "Sheet1", index: 0, isActive: true }];
        }
      },
      CmsEditorClass: class {
        constructor(containerId) {
          this.container = document.getElementById(containerId);
          this.rows = [];
        }

        initialize(rows) {
          this.rows = rows;
        }

        getRows() {
          return this.rows;
        }

        getAllRows() {
          return this.rows;
        }

        getRemovedKeys() {
          return [];
        }

        discardChanges() {}
      }
    });

    await app.initialize();
    await app.handleSave();

    expect(confirm).toHaveBeenCalledTimes(1);
    expect(writeSheet).toHaveBeenNthCalledWith(
      2,
      [{ key: "unitName", value: "Conflict Ward" }],
      "en",
      null,
      expect.objectContaining({ title: "Sheet1" }),
      []
    );
    expect(clearDraft).toHaveBeenCalledTimes(1);
  });

  test("keeps the draft when the user cancels a save conflict overwrite", async () => {
    const clearDraft = vi.fn().mockResolvedValue(true);
    const confirm = vi.fn().mockReturnValue(false);
    const writeSheet = vi
      .fn()
      .mockResolvedValueOnce({ conflict: true, modifiedTime: "2026-05-16T12:30:00.000Z" });

    const app = createCmsApp({
      documentRef: document,
      windowRef: { ...window, confirm },
      profileManager: {
        initProfileManager: vi.fn().mockResolvedValue(),
        getCurrentProfile: vi.fn().mockResolvedValue({
          id: "profile-7",
          url: "https://docs.google.com/spreadsheets/d/abc123/edit",
          unitName: "Conflict Ward"
        })
      },
      initI18n: vi.fn().mockResolvedValue("en"),
      getSupportedLanguages: () => ["en", "es"],
      setLanguage: vi.fn().mockResolvedValue(),
      t: (key) => key,
      getMetadata: vi.fn().mockResolvedValue("test-client-id"),
      getDraft: vi.fn().mockResolvedValue(null),
      saveDraft: vi.fn().mockResolvedValue(true),
      clearDraft,
      auth: {
        initialize: vi.fn(),
        isAuthenticated: () => true,
        getAccessToken: () => "token"
      },
      createClient: vi.fn().mockReturnValue({}),
      ProgramSheetServiceClass: class {
        async readSheet() {
          return {
            rows: [{ key: "unitName", value: "Conflict Ward" }],
            modifiedTime: "2026-05-16T12:00:00.000Z"
          };
        }

        async writeSheet(...args) {
          return writeSheet(...args);
        }

        async writeSheetWithDeletes(...args) {
          return writeSheet(...args);
        }
      },
      SheetTabServiceClass: class {
        async listTabs() {
          return [{ sheetId: 9, title: "Sheet1", index: 0, isActive: true }];
        }
      },
      CmsEditorClass: class {
        constructor(containerId) {
          this.container = document.getElementById(containerId);
          this.rows = [];
        }

        initialize(rows) {
          this.rows = rows;
        }

        getRows() {
          return this.rows;
        }

        getAllRows() {
          return this.rows;
        }

        getRemovedKeys() {
          return [];
        }

        discardChanges() {}
      }
    });

    await app.initialize();
    await app.handleSave();

    expect(confirm).toHaveBeenCalledTimes(1);
    expect(writeSheet).toHaveBeenCalledTimes(1);
    expect(clearDraft).not.toHaveBeenCalled();
    expect(document.getElementById("cms-page-status").textContent).toContain("Save cancelled");
  });

  test("saves the Google Client ID from the setup modal", async () => {
    const getMetadata = vi.fn().mockResolvedValue(null);
    const setMetadata = vi.fn().mockResolvedValue(true);

    const app = createCmsApp({
      documentRef: document,
      windowRef: window,
      profileManager: {
        initProfileManager: vi.fn().mockResolvedValue(),
        getCurrentProfile: vi.fn().mockResolvedValue({
          id: "profile-8",
          url: "https://docs.google.com/spreadsheets/d/abc123/edit",
          unitName: "Setup Ward"
        })
      },
      initI18n: vi.fn().mockResolvedValue("en"),
      getSupportedLanguages: () => ["en", "es"],
      setLanguage: vi.fn().mockResolvedValue(),
      t: (key) => key,
      getMetadata,
      setMetadata,
      getDraft: vi.fn().mockResolvedValue(null),
      saveDraft: vi.fn().mockResolvedValue(true),
      clearDraft: vi.fn().mockResolvedValue(true),
      auth: {
        initialize: vi.fn(),
        isAuthenticated: () => false,
        getAccessToken: () => "token"
      },
      createClient: vi.fn().mockReturnValue({}),
      ProgramSheetServiceClass: class {},
      SheetTabServiceClass: class {},
      CmsEditorClass: class {}
    });

    await app.initialize();
    document.getElementById("cms-setup-btn").click();
    document.getElementById("cms-setup-client-id").value = "client-123.apps.googleusercontent.com";
    document.getElementById("cms-setup-save-btn").click();

    await vi.waitFor(() => {
      expect(setMetadata).toHaveBeenCalledWith(
        "googleClientId",
        "client-123.apps.googleusercontent.com"
      );
    });
    expect(document.getElementById("cms-sign-in-btn").hidden).toBe(false);
    expect(document.getElementById("cms-page-status").textContent).toContain("settings saved");
  });

  test("shows a restore message after returning with a matching saved draft", async () => {
    window.sessionStorage.setItem("cms_auth_pending", "1");

    const app = createCmsApp({
      documentRef: document,
      windowRef: window,
      profileManager: {
        initProfileManager: vi.fn().mockResolvedValue(),
        getCurrentProfile: vi.fn().mockResolvedValue({
          id: "profile-9",
          url: "https://docs.google.com/spreadsheets/d/abc123/edit",
          unitName: "Restore Ward"
        })
      },
      initI18n: vi.fn().mockResolvedValue("en"),
      getSupportedLanguages: () => ["en", "es"],
      setLanguage: vi.fn().mockResolvedValue(),
      t: (key) => key,
      getMetadata: vi.fn().mockResolvedValue("test-client-id"),
      getDraft: vi.fn().mockResolvedValue({
        version: 2,
        locale: "en",
        selectedTabTitle: "Sheet1",
        rows: [{ key: "unitName", value: "Restored Ward" }]
      }),
      saveDraft: vi.fn().mockResolvedValue(true),
      clearDraft: vi.fn().mockResolvedValue(true),
      auth: {
        initialize: vi.fn(),
        isAuthenticated: () => true,
        getAccessToken: () => "token"
      },
      createClient: vi.fn().mockReturnValue({}),
      ProgramSheetServiceClass: class {
        async readSheet() {
          return {
            rows: [{ key: "unitName", value: "Sheet Ward" }],
            modifiedTime: "2026-05-16T12:00:00.000Z"
          };
        }

        async writeSheet() {
          return { conflict: false, modifiedTime: "2026-05-16T12:00:00.000Z" };
        }

        async writeSheetWithDeletes() {
          return { conflict: false, modifiedTime: "2026-05-16T12:00:00.000Z" };
        }
      },
      SheetTabServiceClass: class {
        async listTabs() {
          return [{ sheetId: 9, title: "Sheet1", index: 0, isActive: true }];
        }
      },
      CmsEditorClass: class {
        constructor(containerId) {
          this.container = document.getElementById(containerId);
        }

        initialize(rows) {
          this.rows = rows;
          this.container.textContent = JSON.stringify(rows);
        }

        getRows() {
          return this.rows;
        }

        getAllRows() {
          return this.rows;
        }

        getRemovedKeys() {
          return [];
        }

        discardChanges() {}
      }
    });

    await app.initialize();

    expect(document.getElementById("cms-editor-container").textContent).toContain("Restored Ward");
    expect(document.getElementById("cms-page-status").textContent).toContain("Session restored");
    expect(window.sessionStorage.getItem("cms_auth_pending")).toBeNull();
  });

  test("restores saved locale but defaults to active tab on hard reload", async () => {
    const readSheet = vi.fn().mockResolvedValue({
      rows: [{ key: "unitName", value: "Sheet Ward" }],
      modifiedTime: "2026-05-16T12:00:00.000Z"
    });

    const app = createCmsApp({
      documentRef: document,
      windowRef: window,
      profileManager: {
        initProfileManager: vi.fn().mockResolvedValue(),
        getCurrentProfile: vi.fn().mockResolvedValue({
          id: "profile-restore-view",
          url: "https://docs.google.com/spreadsheets/d/abc123/edit",
          unitName: "Restore Ward"
        })
      },
      initI18n: vi.fn().mockResolvedValue("en"),
      getSupportedLanguages: () => ["en", "es"],
      setLanguage: vi.fn().mockResolvedValue(),
      t: (key) => key,
      getMetadata: vi.fn().mockResolvedValue("test-client-id"),
      getDraft: vi.fn().mockResolvedValue({
        version: 2,
        locale: "es",
        selectedTabTitle: "May 18",
        rows: [{ key: "unitName", value: "Borrador Restaurado" }]
      }),
      saveDraft: vi.fn().mockResolvedValue(true),
      clearDraft: vi.fn().mockResolvedValue(true),
      auth: {
        initialize: vi.fn(),
        isAuthenticated: () => true,
        getAccessToken: () => "token"
      },
      createClient: vi.fn().mockReturnValue({}),
      ProgramSheetServiceClass: class {
        async readSheet(locale, tab) {
          return readSheet(locale, tab);
        }

        async writeSheet() {
          return { conflict: false, modifiedTime: "2026-05-16T12:00:00.000Z" };
        }

        async writeSheetWithDeletes() {
          return { conflict: false, modifiedTime: "2026-05-16T12:00:00.000Z" };
        }
      },
      SheetTabServiceClass: class {
        async listTabs() {
          return [
            { sheetId: 1, title: "Sheet1", index: 0, isActive: true },
            { sheetId: 2, title: "May 18", index: 1, isActive: false }
          ];
        }
      },
      CmsEditorClass: class {
        constructor(containerId) {
          this.container = document.getElementById(containerId);
        }

        initialize(rows) {
          this.rows = rows;
          this.container.textContent = JSON.stringify(rows);
        }

        getRows() {
          return this.rows;
        }

        getAllRows() {
          return this.rows;
        }

        getRemovedKeys() {
          return [];
        }

        discardChanges() {}
      }
    });

    await app.initialize();

    expect(readSheet).toHaveBeenCalledWith("es", expect.objectContaining({ title: "Sheet1" }));
    expect(document.getElementById("cms-locale-select").value).toBe("es");
    expect(document.getElementById("cms-tab-select").value).toBe("Sheet1");
    expect(document.getElementById("cms-editor-container").textContent).toContain("Sheet Ward");
  });

  test("translates the desktop CMS shell", async () => {
    const translations = {
      "cms.pageTitle": "Programa CMS",
      "cms.localeLabel": "Idioma",
      "cms.sheetTabLabel": "Pesta\u00f1a",
      "cms.saveButton": "Guardar",
      "cms.discardDraftButton": "Descartar borrador",
      "cms.signInPrompt": "Inicie sesi\u00f3n para editar.",
      "cms.signInButton": "Entrar",
      "cms.editGoogleSettings": "Editar Google",
      "cms.loadingEditor": "Cargando CMS..."
    };

    const app = createCmsApp({
      documentRef: document,
      windowRef: window,
      profileManager: {
        initProfileManager: vi.fn().mockResolvedValue(),
        getCurrentProfile: vi.fn().mockResolvedValue({
          id: "profile-shell",
          url: "https://docs.google.com/spreadsheets/d/abc123/edit",
          unitName: "Test Ward"
        })
      },
      initI18n: vi.fn().mockResolvedValue("en"),
      getSupportedLanguages: () => ["en"],
      setLanguage: vi.fn().mockResolvedValue(),
      t: (key) => translations[key] ?? key,
      getMetadata: vi.fn().mockResolvedValue("test-client-id"),
      getDraft: vi.fn().mockResolvedValue(null),
      saveDraft: vi.fn().mockResolvedValue(true),
      clearDraft: vi.fn().mockResolvedValue(true),
      auth: {
        initialize: vi.fn(),
        isAuthenticated: () => false,
        getAccessToken: () => null
      },
      createClient: vi.fn().mockReturnValue({}),
      ProgramSheetServiceClass: class {},
      SheetTabServiceClass: class {},
      CmsEditorClass: class {}
    });

    await app.initialize();

    expect(document.title).toBe("Programa CMS");
    expect(document.getElementById("cms-shell-title").textContent).toBe("Programa CMS");
    expect(document.getElementById("cms-locale-label").textContent).toBe("Idioma");
    expect(document.getElementById("cms-tab-label").textContent).toBe("Pesta\u00f1a");
    expect(document.getElementById("cms-save-btn").textContent).toBe("Guardar");
    expect(document.getElementById("cms-auth-message").textContent).toBe(
      "Inicie sesi\u00f3n para editar."
    );
  });
});
