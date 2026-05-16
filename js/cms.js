import * as Profiles from "./data/ProfileManager.js";
import {
  clearDraft,
  getDraft,
  getMetadata,
  saveDraft
} from "./data/IndexedDBManager.js";
import GoogleAuth from "./auth/googleAuth.js";
import CmsEditor from "./components/CmsEditor.mjs";
import {
  getLanguage,
  getSupportedLanguages,
  initI18n,
  setLanguage,
  t
} from "./i18n/index.js";
import { ProgramSheetService } from "./services/ProgramSheetService.mjs";
import { SheetTabService } from "./services/SheetTabService.mjs";
import { SheetsApiClient } from "./services/SheetsApiClient.mjs";
import { DEFAULT_SHEET_TAB_NAME } from "./utils/sheetRanges.js";

const CMS_AUTH_PENDING_KEY = "cms_auth_pending";

export function buildCmsDraftKey(profileId) {
  return `cms_draft_${profileId}`;
}

function normalizeSelectedTab(tabs, preferredTitle = "") {
  const normalizedTabs = Array.isArray(tabs) ? tabs : [];
  if (preferredTitle) {
    const matched = normalizedTabs.find(tab => tab.title === preferredTitle);
    if (matched) return matched;
  }

  return normalizedTabs[0] ?? {
    sheetId: null,
    title: DEFAULT_SHEET_TAB_NAME,
    index: 0,
    isActive: true
  };
}

function buildDraftPayload(state) {
  return {
    locale: state.locale,
    selectedTabTitle: state.selectedTab?.title ?? DEFAULT_SHEET_TAB_NAME,
    rows: state.editor?.getRows?.() ?? [],
    savedAt: Date.now()
  };
}

export function createCmsApp(dependencies = {}) {
  const deps = {
    profileManager: Profiles,
    auth: GoogleAuth,
    getDraft,
    saveDraft,
    clearDraft,
    getMetadata,
    initI18n,
    getLanguage,
    setLanguage,
    getSupportedLanguages,
    t,
    createClient: getToken => new SheetsApiClient(getToken),
    ProgramSheetServiceClass: ProgramSheetService,
    SheetTabServiceClass: SheetTabService,
    CmsEditorClass: CmsEditor,
    documentRef: globalThis.document,
    windowRef: globalThis.window,
    ...dependencies
  };

  const state = {
    profile: null,
    locale: DEFAULT_SHEET_TAB_NAME,
    selectedTab: null,
    tabs: [],
    modifiedTime: "",
    editor: null,
    programService: null,
    tabService: null,
    sheetRows: []
  };

  function getElements() {
    const documentRef = deps.documentRef;
    return {
      pageStatus: documentRef.getElementById("cms-page-status"),
      authPanel: documentRef.getElementById("cms-auth-panel"),
      signInButton: documentRef.getElementById("cms-sign-in-btn"),
      loading: documentRef.getElementById("cms-loading"),
      content: documentRef.getElementById("cms-content"),
      profileName: documentRef.getElementById("cms-profile-name"),
      localeSelect: documentRef.getElementById("cms-locale-select"),
      tabSelect: documentRef.getElementById("cms-tab-select"),
      modifiedTime: documentRef.getElementById("cms-modified-time"),
      saveButton: documentRef.getElementById("cms-save-btn"),
      discardButton: documentRef.getElementById("cms-discard-btn"),
      editorContainer: documentRef.getElementById("cms-editor-container")
    };
  }

  function setLoading(isLoading, message = "") {
    const elements = getElements();
    if (elements.loading) {
      elements.loading.hidden = !isLoading;
      elements.loading.textContent = message || deps.t("loading");
    }
    if (elements.content) {
      elements.content.hidden = isLoading;
    }
  }

  function setStatus(message, tone = "info") {
    const { pageStatus } = getElements();
    if (!pageStatus) return;
    pageStatus.textContent = message;
    pageStatus.dataset.tone = tone;
    pageStatus.hidden = !message;
  }

  function updateHeader() {
    const elements = getElements();
    if (elements.profileName && state.profile) {
      elements.profileName.textContent = state.profile.unitName || state.profile.url;
    }
    if (elements.modifiedTime) {
      elements.modifiedTime.textContent = state.modifiedTime
        ? `${deps.t("lastUpdated").trim()}: ${new Date(state.modifiedTime).toLocaleString()}`
        : "";
    }
  }

  function populateLocaleOptions() {
    const { localeSelect } = getElements();
    if (!localeSelect) return;

    const options = deps.getSupportedLanguages()
      .map(locale => {
        const selected = locale === state.locale ? " selected" : "";
        return `<option value="${locale}"${selected}>${locale.toUpperCase()}</option>`;
      })
      .join("");

    localeSelect.innerHTML = options;
  }

  function populateTabOptions() {
    const { tabSelect } = getElements();
    if (!tabSelect) return;

    tabSelect.innerHTML = state.tabs
      .map(tab => {
        const selected = tab.title === state.selectedTab?.title ? " selected" : "";
        return `<option value="${tab.title}"${selected}>${tab.title}</option>`;
      })
      .join("");
  }

  function draftMatchesCurrentView(draft) {
    return draft &&
      Array.isArray(draft.rows) &&
      draft.locale === state.locale &&
      draft.selectedTabTitle === (state.selectedTab?.title ?? DEFAULT_SHEET_TAB_NAME);
  }

  async function persistDraft() {
    if (!state.profile || !state.editor) return;
    await deps.saveDraft(buildCmsDraftKey(state.profile.id), buildDraftPayload(state));
  }

  function mountEditor(rows) {
    if (!state.editor) {
      state.editor = new deps.CmsEditorClass("cms-editor-container", {
        onChangeCallback: async () => {
          try {
            await persistDraft();
          } catch (error) {
            console.error("[CMS] Failed to persist draft", error);
          }
        }
      });
    }

    state.editor.initialize(rows);
  }

  async function loadSheetRows() {
    setLoading(true, "Loading CMS...");

    const { rows, modifiedTime } = await state.programService.readSheet(state.locale, state.selectedTab);
    state.modifiedTime = modifiedTime;
    state.sheetRows = rows;

    const draft = state.profile ? await deps.getDraft(buildCmsDraftKey(state.profile.id)) : null;
    mountEditor(draftMatchesCurrentView(draft) ? draft.rows : rows);
    updateHeader();
    setLoading(false);
    setStatus("");
  }

  async function handleLocaleChange(event) {
    state.locale = event.currentTarget.value;
    await deps.setLanguage(state.locale);
    await loadSheetRows();
  }

  async function handleTabChange(event) {
    state.selectedTab = normalizeSelectedTab(state.tabs, event.currentTarget.value);
    await loadSheetRows();
  }

  async function handleSave() {
    if (!state.editor) return;

    setLoading(true, "Saving CMS...");
    const result = await state.programService.writeSheet(
      state.editor.getRows(),
      state.locale,
      state.modifiedTime || null,
      state.selectedTab
    );

    if (result.conflict) {
      setLoading(false);
      setStatus(
        "This sheet changed since you loaded it. Reload the latest version before saving.",
        "error"
      );
      return;
    }

    await deps.clearDraft(buildCmsDraftKey(state.profile.id));
    await loadSheetRows();
    setStatus("Saved to Google Sheets.", "success");
  }

  async function handleDiscard() {
    if (!state.editor || !state.profile) return;
    state.editor.discardChanges();
    await deps.clearDraft(buildCmsDraftKey(state.profile.id));
    setStatus("Draft discarded.", "info");
  }

  async function initializeAuth() {
    const clientId = (await deps.getMetadata("googleClientId")) || deps.windowRef?.GOOGLE_CLIENT_ID;
    if (!clientId || clientId.startsWith("YOUR_GOOGLE_CLIENT_ID")) {
      setStatus("Google sign-in is not configured for CMS.", "error");
      return false;
    }

    deps.auth.initialize(clientId, deps.windowRef.location.href.split(/[?#]/)[0]);
    return deps.auth.isAuthenticated();
  }

  async function connectServices() {
    const client = deps.createClient(() => {
      const token = deps.auth.getAccessToken();
      if (!token) {
        throw new Error("CMS requires a Google access token");
      }
      return token;
    });

    state.programService = new deps.ProgramSheetServiceClass(client, state.profile.url);
    state.tabService = new deps.SheetTabServiceClass(client, state.profile.url);
    state.tabs = await state.tabService.listTabs();
    state.selectedTab = normalizeSelectedTab(state.tabs);
  }

  async function signIn() {
    const result = await deps.auth.signIn();
    if (!result) {
      setStatus("Google sign-in was cancelled.", "warning");
      return;
    }

    deps.windowRef.sessionStorage.removeItem(CMS_AUTH_PENDING_KEY);
    getElements().authPanel.hidden = true;
    await connectServices();
    populateTabOptions();
    await loadSheetRows();
  }

  async function initialize() {
    const elements = getElements();
    state.locale = await deps.initI18n();
    populateLocaleOptions();

    await deps.profileManager.initProfileManager();
    state.profile = await deps.profileManager.getCurrentProfile();
    if (!state.profile?.url) {
      setLoading(false);
      setStatus("No program profile is selected.", "error");
      return state;
    }

    updateHeader();

    elements.localeSelect?.addEventListener("change", handleLocaleChange);
    elements.tabSelect?.addEventListener("change", handleTabChange);
    elements.saveButton?.addEventListener("click", handleSave);
    elements.discardButton?.addEventListener("click", handleDiscard);
    elements.signInButton?.addEventListener("click", async () => {
      deps.windowRef.sessionStorage.setItem(CMS_AUTH_PENDING_KEY, "1");
      await signIn();
    });

    const isAuthenticated = await initializeAuth();
    if (!isAuthenticated) {
      setLoading(false);
      if (elements.authPanel) {
        elements.authPanel.hidden = false;
      }
      setStatus("Sign in with Google to load and edit CMS rows.", "info");
      return state;
    }

    if (elements.authPanel) {
      elements.authPanel.hidden = true;
    }

    await connectServices();
    populateTabOptions();
    await loadSheetRows();
    return state;
  }

  return {
    initialize,
    state,
    handleLocaleChange,
    handleTabChange,
    handleSave,
    handleDiscard,
    signIn
  };
}

export async function initializeCmsPage() {
  const app = createCmsApp();
  await app.initialize();
  return app;
}

if (typeof document !== "undefined") {
  const start = () => {
    initializeCmsPage().catch(error => {
      console.error("[CMS] Failed to initialize page", error);
      const status = document.getElementById("cms-page-status");
      if (status) {
        status.hidden = false;
        status.dataset.tone = "error";
        status.textContent = error.message;
      }
    });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
}