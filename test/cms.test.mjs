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
          <section id="cms-auth-panel" hidden><button id="cms-sign-in-btn" type="button">Sign in</button></section>
          <div id="cms-loading">Loading CMS...</div>
          <section id="cms-content" hidden>
            <h1 id="cms-profile-name"></h1>
            <div id="cms-modified-time"></div>
            <div id="cms-toolbar">
              <select id="cms-locale-select"></select>
              <select id="cms-tab-select"></select>
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
      t: key => key,
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
      t: key => key,
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

        discardChanges() {}
      }
    });

    await app.initialize();
    editorInstance.rows = [{ key: "unitName", value: "Updated Ward" }];
    await editorInstance.options.onChangeCallback();

    expect(saveDraft).toHaveBeenCalledWith(buildCmsDraftKey("profile_underscore"), {
      locale: "en",
      selectedTabTitle: "Sheet1",
      rows: [{ key: "unitName", value: "Updated Ward" }],
      savedAt: expect.any(Number)
    });
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
      t: key => key,
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
    expect(readSheet).toHaveBeenNthCalledWith(2, "es", expect.objectContaining({ title: "Sheet1" }));
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
      t: key => key,
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

        discardChanges() {}
      }
    });

    await app.initialize();

    expect(readSheet).toHaveBeenNthCalledWith(1, "fr", expect.objectContaining({ title: "Sheet1" }));
    expect(readSheet).toHaveBeenNthCalledWith(2, "en", expect.objectContaining({ title: "Sheet1" }));
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
      t: key => key,
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
      t: key => key,
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
          const error = new Error("Google Sheets: not authorized (403) — access token may be expired");
          error.name = "SheetsAuthError";
          error.status = 403;
          throw error;
        }

        async writeSheet() {
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
      t: key => key,
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
      expect.objectContaining({ title: "Sheet1" })
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
      t: key => key,
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
});