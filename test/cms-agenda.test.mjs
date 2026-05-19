import { beforeEach, describe, expect, test, vi } from "vitest";
import { JSDOM } from "jsdom";

import { buildAgendaDraftKey, createCmsAgendaApp } from "../js/cms-agenda.js";

describe("cms-agenda.js", () => {
  let dom;
  let document;
  let window;
  let editorInstance;

  beforeEach(() => {
    dom = new JSDOM(
      `<!doctype html>
      <html>
        <body>
          <div id="cms-agenda-page-status" hidden></div>
          <section id="cms-agenda-auth-panel" hidden>
            <p id="cms-agenda-auth-message"></p>
            <button id="cms-agenda-setup-btn" type="button">Configure</button>
            <button id="cms-agenda-sign-in-btn" type="button">Sign in</button>
          </section>
          <dialog id="cms-agenda-setup-modal" hidden>
            <input id="cms-agenda-setup-client-id" type="text" />
            <input id="cms-agenda-setup-sheet-url" type="text" />
            <div id="cms-agenda-setup-status" hidden></div>
            <button id="cms-agenda-setup-save-btn" type="button">Save</button>
            <button id="cms-agenda-setup-cancel-btn" type="button">Cancel</button>
          </dialog>
          <div id="cms-agenda-loading">Loading...</div>
          <section id="cms-agenda-content" hidden>
            <p id="cms-agenda-shell-title"></p>
            <h1 id="cms-agenda-profile-name"></h1>
            <label><span id="cms-agenda-tab-label"></span><select id="cms-agenda-tab-select"></select></label>
            <label><span id="cms-agenda-key-label"></span><select id="cms-agenda-key-select"></select></label>
            <label id="cms-agenda-row-field" hidden>
              <span id="cms-agenda-row-label"></span>
              <div class="cms-agenda__row-selector">
                <button id="cms-agenda-row-prev-btn" type="button">&larr;</button>
                <select id="cms-agenda-row-select"></select>
                <button id="cms-agenda-row-next-btn" type="button">&rarr;</button>
              </div>
            </label>
            <p id="cms-agenda-sheet-row-hint" hidden></p>
            <button id="cms-agenda-make-active-btn" type="button">Make Active</button>
            <button id="cms-agenda-save-draft-btn" type="button">Save Draft</button>
            <button id="cms-agenda-publish-btn" type="button">Publish</button>
            <button id="cms-agenda-publish-all-btn" type="button">Publish All</button>
            <div id="cms-agenda-editor-container"></div>
            <h2 id="cms-agenda-pending-title"></h2>
            <div id="cms-agenda-pending-list"></div>
          </section>
        </body>
      </html>`,
      { url: "https://example.test/cms_agenda/" }
    );

    document = dom.window.document;
    window = dom.window;
    global.document = document;
    global.window = window;
    global.navigator = window.navigator;
    global.sessionStorage = window.sessionStorage;

    document.getElementById("cms-agenda-setup-modal").showModal = function() {
      this.hidden = false;
      this.open = true;
    };
    document.getElementById("cms-agenda-setup-modal").close = function() {
      this.hidden = true;
      this.open = false;
    };
  });

  function createApp(overrides = {}) {
    return createCmsAgendaApp({
      documentRef: document,
      windowRef: window,
      profileManager: {
        initProfileManager: vi.fn().mockResolvedValue(),
        getCurrentProfile: vi.fn().mockResolvedValue({
          id: "profile-1",
          agendaUrl: "https://docs.google.com/spreadsheets/d/agenda123/edit",
          unitName: "Millcreek 5th Ward"
        })
      },
      initI18n: vi.fn().mockResolvedValue("en"),
      t: key => key,
      getMetadata: vi.fn().mockResolvedValue("test-client-id"),
      setMetadata: vi.fn().mockResolvedValue(true),
      getDraft: vi.fn().mockResolvedValue(null),
      saveDraft: vi.fn().mockResolvedValue(true),
      clearDraft: vi.fn().mockResolvedValue(true),
      auth: {
        initialize: vi.fn(),
        isAuthenticated: () => true,
        getAccessToken: () => "token",
        signIn: vi.fn().mockResolvedValue({ token: "token" })
      },
      createClient: vi.fn().mockReturnValue({}),
      AgendaSheetServiceClass: class {
        constructor() {
          this.readAgendaRows = vi.fn().mockResolvedValue([
            { key: "agendaGeneral", agendaId: "gen1", sheetRow: 2, values: [["General note"]] }
          ]);
          this.writeAgendaRow = vi.fn().mockResolvedValue();
        }
      },
      SheetTabServiceClass: class {
        constructor() {
          this.listTabs = vi.fn().mockResolvedValue([
            { sheetId: 11, title: "Sheet1", index: 0, isActive: true }
          ]);
          this.makeActiveTab = vi.fn().mockResolvedValue();
        }
      },
      AgendaKeyEditorClass: class {
        constructor(containerId, options) {
          this.container = document.getElementById(containerId);
          this.options = options;
          this.values = [];
          this.key = "agendaGeneral";
          editorInstance = this;
        }

        initialize({ key, values }) {
          this.key = key;
          this.values = values;
          this.container.textContent = `${key}:${JSON.stringify(values)}`;
        }

        getValues() {
          return this.values;
        }
      },
      ...overrides
    });
  }

  test("loads the selected agenda key for the current profile", async () => {
    const readAgendaRows = vi.fn().mockResolvedValue([
      { key: "agendaGeneral", agendaId: "gen1", sheetRow: 2, values: [["General note"]] }
    ]);

    const app = createApp({
      AgendaSheetServiceClass: class {
        async readAgendaRows(key, selectedTab) {
          return readAgendaRows(key, selectedTab);
        }

        async writeAgendaRow() {}
      }
    });

    await app.initialize();

    expect(readAgendaRows).toHaveBeenCalledWith(
      "agendaGeneral",
      expect.objectContaining({ title: "Sheet1" })
    );
    expect(document.getElementById("cms-agenda-profile-name").textContent).toContain(
      "Millcreek 5th Ward"
    );
    expect(document.getElementById("cms-agenda-content").hidden).toBe(false);
  });

  test("persists a dirty agenda draft when the editor changes", async () => {
    const saveDraft = vi.fn().mockResolvedValue(true);

    const app = createApp({ saveDraft });
    await app.initialize();

    editorInstance.values = [["Updated note"]];
    await editorInstance.options.onChangeCallback(editorInstance.values);

    expect(saveDraft).toHaveBeenCalled();
    const [, payload] = saveDraft.mock.calls.at(-1);
    expect(payload.selectedTabTitle).toBe("Sheet1");
    expect(payload.selectedKey).toBe("agendaGeneral");
    expect(payload.selectedRowToken).toEqual(expect.any(String));
    expect(Object.values(payload.dirtyMap)).toEqual([
      expect.objectContaining({
        key: "agendaGeneral",
        agendaId: "gen1",
        sheetRow: 2,
        values: [["Updated note"]]
      })
    ]);
  });

  test("publishes all pending agenda keys and clears the draft", async () => {
    const writeAgendaRow = vi.fn().mockResolvedValue();
    const clearDraft = vi.fn().mockResolvedValue(true);

    const app = createApp({
      getDraft: vi.fn().mockResolvedValue({
        selectedTabTitle: "Sheet1",
        selectedKey: "agendaGeneral",
        dirtyMap: {
          agendaGeneral: [["General note"]],
          agendaBusinessCallings: [["Alice", "Primary President"]]
        }
      }),
      clearDraft,
      AgendaSheetServiceClass: class {
        async readAgendaRows(key) {
          if (key === "agendaGeneral") {
            return [{ key, agendaId: "gen1", sheetRow: 2, values: [["General note"]] }];
          }
          if (key === "agendaBusinessCallings") {
            return [{ key, agendaId: "call1", sheetRow: 3, values: [["Alice", "Primary President"]] }];
          }
          return [];
        }

        async writeAgendaRow(row, selectedTab) {
          return writeAgendaRow(row, selectedTab);
        }
      }
    });

    await app.initialize();
    await app.handlePublishAll();

    expect(writeAgendaRow).toHaveBeenCalledTimes(2);
    expect(writeAgendaRow).toHaveBeenCalledWith(
      expect.objectContaining({
        key: "agendaGeneral",
        values: [["General note"]]
      }),
      expect.objectContaining({ title: "Sheet1" })
    );
    expect(writeAgendaRow).toHaveBeenCalledWith(
      expect.objectContaining({
        key: "agendaBusinessCallings",
        values: [["Alice", "Primary President"]]
      }),
      expect.objectContaining({ title: "Sheet1" })
    );
    expect(clearDraft).toHaveBeenCalledWith(buildAgendaDraftKey("profile-1"));
    expect(document.getElementById("cms-agenda-page-status").textContent).toContain(
      "Finished publishing"
    );
  });

  test("renders agenda tab titles as text instead of HTML", async () => {
    const maliciousTitle = '<img src=x onerror="alert(1)">';

    const app = createApp({
      SheetTabServiceClass: class {
        constructor() {
          this.listTabs = vi.fn().mockResolvedValue([
            { sheetId: 11, title: maliciousTitle, index: 0, isActive: true }
          ]);
          this.makeActiveTab = vi.fn().mockResolvedValue();
        }
      }
    });

    await app.initialize();

    const tabSelect = document.getElementById("cms-agenda-tab-select");
    expect(tabSelect.options).toHaveLength(1);
    expect(tabSelect.options[0].textContent).toBe(maliciousTitle);
    expect(tabSelect.querySelector("img")).toBeNull();
  });

  test("reports a partial failure when publish all does not fully succeed", async () => {
    const writeAgendaRow = vi.fn().mockImplementation(async row => {
      if (row.key === "agendaBusinessCallings") {
        throw new Error("Write failed");
      }
    });

    const app = createApp({
      getDraft: vi.fn().mockResolvedValue({
        selectedTabTitle: "Sheet1",
        selectedKey: "agendaGeneral",
        dirtyMap: {
          agendaGeneral: [["General note"]],
          agendaBusinessCallings: [["Alice", "Primary President"]]
        }
      }),
      AgendaSheetServiceClass: class {
        async readAgendaRows(key) {
          if (key === "agendaGeneral") {
            return [{ key, agendaId: "gen1", sheetRow: 2, values: [["General note"]] }];
          }
          if (key === "agendaBusinessCallings") {
            return [{ key, agendaId: "call1", sheetRow: 3, values: [["Alice", "Primary President"]] }];
          }
          return [];
        }

        async writeAgendaRow(row, selectedTab) {
          return writeAgendaRow(row, selectedTab);
        }
      }
    });

    await app.initialize();
    await app.handlePublishAll();

    expect(writeAgendaRow).toHaveBeenCalledTimes(2);
    expect(document.getElementById("cms-agenda-page-status").dataset.tone).toBe("warning");
    expect(document.getElementById("cms-agenda-page-status").textContent).toContain(
      "some items failed"
    );
    expect(document.getElementById("cms-agenda-pending-list").textContent).toContain("Failed");
  });

  test("shows the configure prompt when Google settings are missing", async () => {
    const app = createApp({
      getMetadata: vi.fn().mockResolvedValue(null),
      auth: {
        initialize: vi.fn(),
        isAuthenticated: () => false,
        getAccessToken: () => null,
        signIn: vi.fn().mockResolvedValue(null)
      }
    });

    await app.initialize();

    expect(document.getElementById("cms-agenda-auth-panel").hidden).toBe(false);
    expect(document.getElementById("cms-agenda-sign-in-btn").hidden).toBe(true);
    expect(document.getElementById("cms-agenda-content").hidden).toBe(false);
  });

  test("keeps the sign-in control hidden when the session is already authenticated", async () => {
    const app = createApp({
      auth: {
        initialize: vi.fn(),
        isAuthenticated: () => true,
        getAccessToken: () => "token",
        signIn: vi.fn().mockResolvedValue({ token: "token" })
      }
    });

    await app.initialize();

    expect(document.getElementById("cms-agenda-auth-panel").hidden).toBe(true);
    expect(document.getElementById("cms-agenda-sign-in-btn").hidden).toBe(true);
  });

  test("makes the selected tab active", async () => {
    const makeActiveTab = vi.fn().mockResolvedValue();

    const app = createApp({
      SheetTabServiceClass: class {
        async listTabs() {
          return [{ sheetId: 22, title: "May 18", index: 0, isActive: true }];
        }

        async makeActiveTab(sheetId) {
          return makeActiveTab(sheetId);
        }
      }
    });

    await app.initialize();
    await app.handleMakeActive();

    expect(makeActiveTab).toHaveBeenCalledWith(22);
    expect(document.getElementById("cms-agenda-page-status").textContent).toContain(
      "Selected tab is now active."
    );
  });

  test("restores the saved tab and key before the first agenda load", async () => {
    const readAgendaRows = vi.fn().mockResolvedValue([
      {
        key: "agendaBusinessCallings",
        agendaId: "call1",
        sheetRow: 3,
        values: [["Existing value"]]
      }
    ]);

    const app = createApp({
      getDraft: vi.fn().mockResolvedValue({
        selectedTabTitle: "May 18",
        selectedKey: "agendaBusinessCallings",
        dirtyMap: {
          agendaBusinessCallings: [["Alice", "Primary President"]]
        }
      }),
      AgendaSheetServiceClass: class {
        async readAgendaRows(key, selectedTab) {
          return readAgendaRows(key, selectedTab);
        }

        async writeAgendaRow() {}
      },
      SheetTabServiceClass: class {
        constructor() {
          this.listTabs = vi.fn().mockResolvedValue([
            { sheetId: 11, title: "Sheet1", index: 0, isActive: true },
            { sheetId: 22, title: "May 18", index: 1, isActive: false }
          ]);
          this.makeActiveTab = vi.fn().mockResolvedValue();
        }
      }
    });

    await app.initialize();

    expect(readAgendaRows).toHaveBeenCalledWith(
      "agendaBusinessCallings",
      expect.objectContaining({ title: "May 18" })
    );
    expect(document.getElementById("cms-agenda-tab-select").value).toBe("May 18");
    expect(document.getElementById("cms-agenda-key-select").value).toBe("agendaBusinessCallings");
    expect(document.getElementById("cms-agenda-editor-container").textContent).toContain("agendaBusinessCallings");
    expect(document.getElementById("cms-agenda-editor-container").textContent).toContain("Alice");
  });

  test("shows row choices and a sheet-row cue for duplicate agenda keys", async () => {
    const app = createApp({
      AgendaSheetServiceClass: class {
        async listAgendaRows() {
          return [
            {
              key: "agendaGeneral",
              agendaId: "gen1",
              sheetRow: 2,
              values: [["First note"]]
            },
            {
              key: "agendaGeneral",
              agendaId: "gen2",
              sheetRow: 4,
              values: [["Second note"]]
            }
          ];
        }

        async writeAgendaRow() {}
      }
    });

    await app.initialize();

    const rowField = document.getElementById("cms-agenda-row-field");
    const rowSelect = document.getElementById("cms-agenda-row-select");
    const rowHint = document.getElementById("cms-agenda-sheet-row-hint");

    expect(rowField.hidden).toBe(false);
    expect(rowSelect.options).toHaveLength(2);
    expect(rowSelect.options[0].textContent).toBe("gen1");
    expect(rowHint.hidden).toBe(false);
    expect(rowHint.textContent).toBe("Sheet row 2");

    rowSelect.value = rowSelect.options[1].value;
    rowSelect.dispatchEvent(new Event("change", { bubbles: true }));
    await Promise.resolve();

    expect(document.getElementById("cms-agenda-editor-container").textContent).toContain("Second note");
    expect(rowHint.textContent).toBe("Sheet row 4");
  });

  test("shows all agenda ids across keys and syncs the key when a row id is selected", async () => {
    const app = createApp({
      AgendaSheetServiceClass: class {
        async listAgendaRows() {
          return [
            {
              key: "agendaAnnouncements",
              agendaId: "a1",
              sheetRow: 2,
              values: [["Announcement one"]]
            },
            {
              key: "agendaBusinessCallings",
              agendaId: "a4",
              sheetRow: 5,
              values: [["Brother Smith", "Clerk"]]
            },
            {
              key: "agendaBusinessNewConverts",
              agendaId: "a14",
              sheetRow: 15,
              values: [["Jane Doe"]]
            }
          ];
        }

        async readAgendaRows() {
          return [];
        }

        async writeAgendaRow() {}
      }
    });

    await app.initialize();

    const rowSelect = document.getElementById("cms-agenda-row-select");
    const keySelect = document.getElementById("cms-agenda-key-select");

    expect(Array.from(rowSelect.options).map((option) => option.textContent)).toEqual(
      expect.arrayContaining(["a1", "a4", "a14"])
    );

    const targetOption = Array.from(rowSelect.options).find((option) => option.textContent === "a14");
    rowSelect.value = targetOption?.value ?? "";
    rowSelect.dispatchEvent(new Event("change", { bubbles: true }));
    await Promise.resolve();

    expect(keySelect.value).toBe("agendaBusinessNewConverts");
    expect(document.getElementById("cms-agenda-editor-container").textContent).toContain("Jane Doe");
    expect(document.getElementById("cms-agenda-sheet-row-hint").textContent).toBe("Sheet row 15");
  });

  test("moves between agenda rows with previous and next buttons", async () => {
    const app = createApp({
      AgendaSheetServiceClass: class {
        async listAgendaRows() {
          return [
            {
              key: "agendaAnnouncements",
              agendaId: "a1",
              sheetRow: 2,
              values: [["Announcement one"]]
            },
            {
              key: "agendaBusinessCallings",
              agendaId: "a4",
              sheetRow: 5,
              values: [["Brother Smith", "Clerk"]]
            },
            {
              key: "agendaBusinessNewConverts",
              agendaId: "a14",
              sheetRow: 15,
              values: [["Jane Doe"]]
            }
          ];
        }

        async writeAgendaRow() {}
      }
    });

    await app.initialize();

    const prevButton = document.getElementById("cms-agenda-row-prev-btn");
    const nextButton = document.getElementById("cms-agenda-row-next-btn");
    const keySelect = document.getElementById("cms-agenda-key-select");

    expect(prevButton.disabled).toBe(true);
    nextButton.click();
    await Promise.resolve();

    expect(keySelect.value).toBe("agendaAnnouncements");
    expect(document.getElementById("cms-agenda-editor-container").textContent).toContain("Announcement one");
    expect(document.getElementById("cms-agenda-sheet-row-hint").textContent).toBe("Sheet row 2");

    nextButton.click();
    await Promise.resolve();

    expect(keySelect.value).toBe("agendaBusinessCallings");
    expect(document.getElementById("cms-agenda-editor-container").textContent).toContain("Brother Smith");
    expect(document.getElementById("cms-agenda-sheet-row-hint").textContent).toBe("Sheet row 5");

    nextButton.click();
    await Promise.resolve();

    expect(keySelect.value).toBe("agendaBusinessNewConverts");
    expect(document.getElementById("cms-agenda-editor-container").textContent).toContain("Jane Doe");
    expect(nextButton.disabled).toBe(true);

    prevButton.click();
    await Promise.resolve();

    expect(keySelect.value).toBe("agendaBusinessCallings");
    expect(document.getElementById("cms-agenda-sheet-row-hint").textContent).toBe("Sheet row 5");
  });

  test("translates the agenda CMS shell", async () => {
    const app = createApp({
      initI18n: vi.fn().mockResolvedValue("en"),
      t: key => ({
        "cmsAgenda.pageTitle": "Agenda CMS",
        "cmsAgenda.sheetTabLabel": "Pesta\u00f1a",
        "cmsAgenda.keyLabel": "Clave",
        "cmsAgenda.makeActiveButton": "Activar",
        "cmsAgenda.saveDraftButton": "Guardar borrador",
        "cmsAgenda.publishButton": "Publicar",
        "cmsAgenda.publishAllButton": "Publicar todo",
        "cmsAgenda.pendingChangesTitle": "Pendientes",
        "cmsAgenda.loading": "Cargando agenda...",
        "cmsAgenda.signInAgainPrompt": "Inicie sesi\u00f3n de nuevo."
      }[key] ?? key),
      getMetadata: vi.fn().mockResolvedValue("test-client-id"),
      auth: {
        initialize: vi.fn(),
        isAuthenticated: () => false,
        getAccessToken: () => null,
        signIn: vi.fn().mockResolvedValue(null)
      }
    });

    await app.initialize();

    expect(document.title).toBe("Agenda CMS");
    expect(document.getElementById("cms-agenda-shell-title").textContent).toBe("Agenda CMS");
    expect(document.getElementById("cms-agenda-tab-label").textContent).toBe("Pesta\u00f1a");
    expect(document.getElementById("cms-agenda-key-label").textContent).toBe("Clave");
    expect(document.getElementById("cms-agenda-make-active-btn").textContent).toBe("Activar");
    expect(document.getElementById("cms-agenda-pending-title").textContent).toBe("Pendientes");
    expect(document.getElementById("cms-agenda-auth-message").textContent).toBe("Inicie sesi\u00f3n de nuevo.");
  });
});
