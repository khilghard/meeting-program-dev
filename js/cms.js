import * as Profiles from "./data/ProfileManager.js";
import {
  clearDraft,
  getDraft,
  getMetadata,
  setMetadata,
  saveDraft
} from "./data/IndexedDBManager.js";
import GoogleAuth from "./auth/googleAuth.js";
import CmsEditor from "./components/CmsEditor.mjs";
import { getLanguage, getSupportedLanguages, initI18n, setLanguage, t } from "./i18n/index.js";
import { ProgramSheetService } from "./services/ProgramSheetService.mjs";
import { SheetTabService } from "./services/SheetTabService.mjs";
import { SheetsApiClient } from "./services/SheetsApiClient.mjs";
import { DEFAULT_SHEET_TAB_NAME } from "./utils/sheetRanges.js";

const CMS_AUTH_PENDING_KEY = "cms_auth_pending";

export function buildCmsDraftKey(profileId) {
  return `cms_draft_${profileId}`;
}

function getFallbackLocaleFromError(error, supportedLanguages = []) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const match = /Available columns:\s*(.+)$/i.exec(message);
  if (!match) {
    return null;
  }

  const availableColumns = match[1]
    .split(",")
    .map((column) => column.trim())
    .filter(Boolean);

  return supportedLanguages.find((locale) => availableColumns.includes(locale)) ?? null;
}

function normalizeSelectedTab(tabs, preferredTitle = "") {
  const normalizedTabs = Array.isArray(tabs) ? tabs : [];
  if (preferredTitle) {
    const matched = normalizedTabs.find((tab) => tab.title === preferredTitle);
    if (matched) return matched;
  }

  // Default to the active tab (index 0 = leftmost/current program tab)
  return (
    normalizedTabs.find((tab) => tab.isActive) ??
    normalizedTabs[0] ?? {
      sheetId: null,
      title: preferredTitle || DEFAULT_SHEET_TAB_NAME,
      index: 0,
      isActive: true
    }
  );
}

function summarizeTabsForDebug(tabs = []) {
  return (Array.isArray(tabs) ? tabs : []).map((tab) => ({
    title: tab.title,
    index: tab.index,
    isActive: Boolean(tab.isActive)
  }));
}

const CMS_DRAFT_VERSION = 2; // Increment when serialization format changes

function getEditorRows(editor) {
  if (!editor) return [];
  if (typeof editor.getAllRows === "function") {
    return editor.getAllRows();
  }
  if (typeof editor.getRows === "function") {
    return editor.getRows();
  }
  return [];
}

function buildDraftPayload(state) {
  return {
    version: CMS_DRAFT_VERSION,
    locale: state.locale,
    selectedTabTitle: state.selectedTab?.title ?? DEFAULT_SHEET_TAB_NAME,
    rows: getEditorRows(state.editor),
    savedAt: Date.now()
  };
}

function isCmsDraftPayload(draft) {
  return Boolean(draft && typeof draft === "object" && Array.isArray(draft.rows));
}

function isDraftVersionValid(draft) {
  return !draft || draft.version === CMS_DRAFT_VERSION;
}

function isAuthError(error) {
  if (!error) return false;
  const message = error instanceof Error ? error.message : String(error);
  return (
    error.name === "SheetsAuthError" ||
    error.status === 403 ||
    /access token|not authorized/i.test(message)
  );
}

function getTranslatedText(translator, key, fallback) {
  const translated = translator(key);
  return translated === key ? fallback : translated;
}

function replaceSelectOptions(select, options, selectedValue, documentRef = globalThis.document) {
  if (!select || !documentRef) return;

  select.replaceChildren(
    ...options.map(({ value, label }) => {
      const option = documentRef.createElement("option");
      option.value = value;
      option.textContent = label;
      option.selected = value === selectedValue;
      return option;
    })
  );
}

export function createCmsApp(dependencies = {}) {
  const deps = {
    profileManager: Profiles,
    auth: GoogleAuth,
    getDraft,
    saveDraft,
    clearDraft,
    getMetadata,
    setMetadata,
    initI18n,
    getLanguage,
    setLanguage,
    getSupportedLanguages,
    t,
    createClient: (getToken) => new SheetsApiClient(getToken),
    ProgramSheetServiceClass: ProgramSheetService,
    SheetTabServiceClass: SheetTabService,
    CmsEditorClass: CmsEditor,
    documentRef: globalThis.document,
    windowRef: globalThis.window,
    ...dependencies
  };

  const text = (key, fallback) => getTranslatedText(deps.t, key, fallback);

  const state = {
    profile: null,
    locale: DEFAULT_SHEET_TAB_NAME,
    selectedTab: null,
    tabs: [],
    modifiedTime: "",
    hasConfiguredClientId: false,
    lastDraftRestored: false,
    draftSelectedTabTitle: "",
    pendingDraft: null,
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
      authMessage: documentRef.getElementById("cms-auth-message"),
      signInButton: documentRef.getElementById("cms-sign-in-btn"),
      setupButton: documentRef.getElementById("cms-setup-btn"),
      loading: documentRef.getElementById("cms-loading"),
      content: documentRef.getElementById("cms-content"),
      toolbar: documentRef.getElementById("cms-toolbar"),
      profileName: documentRef.getElementById("cms-profile-name"),
      localeSelect: documentRef.getElementById("cms-locale-select"),
      tabSelect: documentRef.getElementById("cms-tab-select"),
      modifiedTime: documentRef.getElementById("cms-modified-time"),
      saveButton: documentRef.getElementById("cms-save-btn"),
      discardButton: documentRef.getElementById("cms-discard-btn"),
      editorContainer: documentRef.getElementById("cms-editor-container"),
      setupModal: documentRef.getElementById("cms-setup-modal"),
      setupClientId: documentRef.getElementById("cms-setup-client-id"),
      setupSheetUrl: documentRef.getElementById("cms-setup-sheet-url"),
      setupStatus: documentRef.getElementById("cms-setup-status"),
      setupSaveButton: documentRef.getElementById("cms-setup-save-btn"),
      setupCancelButton: documentRef.getElementById("cms-setup-cancel-btn")
    };
  }

  function setLoading(isLoading, message = "") {
    const elements = getElements();
    if (elements.loading) {
      elements.loading.hidden = !isLoading;
      elements.loading.textContent = message || text("cms.loadingEditor", "Loading CMS...");
    }
    if (elements.content) {
      const authPanelVisible = elements.authPanel ? !elements.authPanel.hidden : false;
      elements.content.hidden = isLoading || authPanelVisible;
    }
  }

  function setStatus(message, tone = "info") {
    const { pageStatus } = getElements();
    if (!pageStatus) return;
    pageStatus.textContent = message;
    pageStatus.dataset.tone = tone;
    pageStatus.hidden = !message;
  }

  function setAuthPanelState() {
    const { authMessage, signInButton, setupButton } = getElements();
    if (authMessage) {
      authMessage.textContent = state.hasConfiguredClientId
        ? text("cms.signInPrompt", "Sign in with Google to edit the selected program sheet.")
        : text(
            "cms.configurePrompt",
            "Configure Google settings before signing in to edit this program sheet."
          );
    }
    if (signInButton) {
      signInButton.hidden = !state.hasConfiguredClientId;
      signInButton.disabled = !state.hasConfiguredClientId;
      signInButton.textContent = text("cms.signInButton", "Sign in with Google");
    }
    if (setupButton) {
      setupButton.hidden = false;
      setupButton.textContent = state.hasConfiguredClientId
        ? text("cms.editGoogleSettings", "Edit Google Settings")
        : text("cms.configureGoogleSettings", "Configure Google Settings");
    }
  }

  function setElementText(id, value) {
    const element = deps.documentRef.getElementById(id);
    if (element) {
      element.textContent = value;
    }
  }

  function setInputPlaceholder(id, value) {
    const element = deps.documentRef.getElementById(id);
    if (element) {
      element.setAttribute("placeholder", value);
    }
  }

  function translateShell() {
    deps.documentRef.title = text("cms.pageTitle", "Sacrament Meeting Program CMS");
    const appleTitle = deps.documentRef.querySelector('meta[name="apple-mobile-web-app-title"]');
    if (appleTitle) {
      appleTitle.setAttribute("content", text("cms.pageTitle", "Sacrament Meeting Program CMS"));
    }

    setElementText("cms-shell-title", text("cms.pageTitle", "Sacrament Meeting Program CMS"));
    if (!state.profile) {
      setElementText("cms-profile-name", text("cms.loadingProfile", "Loading profile..."));
    }
    setElementText("cms-locale-label", text("cms.localeLabel", "Locale"));
    setElementText("cms-tab-label", text("cms.sheetTabLabel", "Sheet Tab"));
    setElementText("cms-save-btn", text("cms.saveButton", "Save"));
    setElementText("cms-discard-btn", text("cms.discardDraftButton", "Discard Draft"));
    setElementText("cms-setup-title", text("cms.googleSettingsTitle", "Google Settings"));
    setElementText(
      "cms-setup-client-id-label",
      text("cms.googleClientIdLabel", "Google Client ID")
    );
    setInputPlaceholder(
      "cms-setup-client-id",
      text("cms.googleClientIdPlaceholder", "12345.apps.googleusercontent.com")
    );
    setElementText(
      "cms-setup-sheet-url-label",
      text("cms.programSheetUrlLabel", "Program Sheet URL")
    );
    setElementText("cms-setup-cancel-btn", text("cancel", "Cancel"));
    setElementText("cms-setup-save-btn", text("cms.saveSettingsButton", "Save Settings"));
    setElementText("cms-loading", text("cms.loadingEditor", "Loading CMS..."));
  }

  function setToolbarState(isEnabled) {
    const elements = getElements();
    if (elements.toolbar) {
      elements.toolbar.hidden = !isEnabled;
    }

    [elements.localeSelect, elements.tabSelect, elements.saveButton, elements.discardButton]
      .filter(Boolean)
      .forEach((control) => {
        control.disabled = !isEnabled;
      });
  }

  function showAuthGate(message, tone = "info") {
    const elements = getElements();
    if (elements.loading) {
      elements.loading.hidden = true;
    }
    if (elements.content) {
      elements.content.hidden = true;
    }
    if (elements.authPanel) {
      elements.authPanel.hidden = false;
    }
    setAuthPanelState();
    setToolbarState(false);
    setStatus(message, tone);
  }

  function showAuthWarning(message, tone = "warning") {
    const { authPanel } = getElements();
    if (authPanel) {
      authPanel.hidden = false;
    }
    setAuthPanelState();
    setStatus(message, tone);
  }

  function showEditorChrome() {
    const { authPanel } = getElements();
    if (authPanel) {
      authPanel.hidden = true;
    }
    setToolbarState(true);
  }

  function openSetupModal() {
    const { setupModal, setupClientId, setupSheetUrl, setupStatus } = getElements();
    if (!setupModal) return;

    if (setupClientId) {
      setupClientId.value = state.hasConfiguredClientId
        ? deps.windowRef.sessionStorage.getItem("cms_last_client_id") || ""
        : "";
    }
    if (setupSheetUrl) {
      setupSheetUrl.value = state.profile?.url || "";
    }
    if (setupStatus) {
      setupStatus.hidden = true;
      setupStatus.textContent = "";
    }

    if (typeof setupModal.showModal === "function") {
      setupModal.showModal();
    } else {
      setupModal.hidden = false;
    }
  }

  function closeSetupModal() {
    const { setupModal } = getElements();
    if (!setupModal) return;

    if (typeof setupModal.close === "function") {
      setupModal.close();
    } else {
      setupModal.hidden = true;
    }
  }

  async function saveSetupSettings() {
    const { setupClientId, setupStatus } = getElements();
    const clientId = setupClientId?.value?.trim() ?? "";

    if (!clientId || clientId.startsWith("YOUR_GOOGLE_CLIENT_ID")) {
      if (setupStatus) {
        setupStatus.hidden = false;
        setupStatus.dataset.tone = "error";
        setupStatus.textContent = text(
          "cms.invalidClientId",
          "Enter a valid Google Client ID before saving."
        );
      }
      return false;
    }

    await deps.setMetadata("googleClientId", clientId);
    deps.windowRef.sessionStorage.setItem("cms_last_client_id", clientId);
    deps.auth.initialize(clientId, deps.windowRef.location.href.split(/[?#]/)[0]);
    state.hasConfiguredClientId = true;
    closeSetupModal();
    showAuthGate(
      text("cms.settingsSaved", "Google settings saved. Sign in to continue editing."),
      "success"
    );
    return true;
  }

  function maybeNotifyRestoredSession() {
    const hasPendingAuthReturn =
      deps.windowRef.sessionStorage.getItem(CMS_AUTH_PENDING_KEY) === "1";
    if (!hasPendingAuthReturn) return;

    deps.windowRef.sessionStorage.removeItem(CMS_AUTH_PENDING_KEY);
    if (state.lastDraftRestored) {
      setStatus("Session restored from your saved draft.", "success");
    }
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

    replaceSelectOptions(
      localeSelect,
      deps.getSupportedLanguages().map((locale) => ({
        value: locale,
        label: locale.toUpperCase()
      })),
      state.locale,
      deps.documentRef
    );
  }

  function populateTabOptions() {
    const { tabSelect } = getElements();
    if (!tabSelect) return;

    replaceSelectOptions(
      tabSelect,
      state.tabs.map((tab) => ({
        value: tab.title,
        label: tab.isActive ? `★ ${tab.title}` : tab.title
      })),
      state.selectedTab?.title ?? "",
      deps.documentRef
    );

    console.log("[CMS][TabDebug] populateTabOptions", {
      selectedTabTitle: state.selectedTab?.title ?? "",
      renderedOptions: state.tabs.map((tab) => ({
        value: tab.title,
        label: tab.isActive ? `★ ${tab.title}` : tab.title,
        isActive: Boolean(tab.isActive)
      })),
      domValue: tabSelect.value
    });
  }

  function draftMatchesCurrentView(draft) {
    return (
      draft &&
      Array.isArray(draft.rows) &&
      draft.locale === state.locale &&
      draft.selectedTabTitle === (state.selectedTab?.title ?? DEFAULT_SHEET_TAB_NAME)
    );
  }

  async function persistDraft() {
    if (!state.profile || !state.editor) return;
    const draftPayload = buildDraftPayload(state);
    state.pendingDraft = draftPayload;
    await deps.saveDraft(buildCmsDraftKey(state.profile.id), draftPayload);
  }

  async function restoreDraftViewPreference() {
    if (!state.profile) return null;

    const draft = await deps.getDraft(buildCmsDraftKey(state.profile.id));
    console.log("[CMS][TabDebug] restoreDraftViewPreference: draft lookup", {
      hasDraft: Boolean(draft),
      selectedTabTitle: draft?.selectedTabTitle,
      locale: draft?.locale,
      version: draft?.version
    });

    if (!isCmsDraftPayload(draft) || !isDraftVersionValid(draft)) {
      // Discard corrupted or outdated drafts
      if (draft && !isDraftVersionValid(draft)) {
        await deps.clearDraft(buildCmsDraftKey(state.profile.id));
      }
      return null;
    }

    if (deps.getSupportedLanguages().includes(draft.locale)) {
      state.locale = draft.locale;
    }

    // Defer tab selection until tabs are fetched in connectServices().
    state.draftSelectedTabTitle = draft.selectedTabTitle ?? "";
    console.log("[CMS][TabDebug] restoreDraftViewPreference: deferred tab preference", {
      draftSelectedTabTitle: state.draftSelectedTabTitle,
      tabsKnown: state.tabs.length > 0
    });
    state.pendingDraft = draft;

    return draft;
  }

  function mountEditor(rows) {
    if (!state.editor) {
      state.editor = new deps.CmsEditorClass("cms-editor-container", {
        includeAgenda: true,
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

  async function loadSheetRows({ allowLocaleFallback = true } = {}) {
    setLoading(true, "Loading CMS...");

    try {
      const { rows, modifiedTime } = await state.programService.readSheet(
        state.locale,
        state.selectedTab
      );
      showEditorChrome();
      state.modifiedTime = modifiedTime;
      state.sheetRows = rows;

      const draft =
        state.pendingDraft ??
        (state.profile ? await deps.getDraft(buildCmsDraftKey(state.profile.id)) : null);
      // Discard corrupted or outdated drafts
      const validDraft = draft && isCmsDraftPayload(draft) && isDraftVersionValid(draft) ? draft : null;
      if (draft && !isDraftVersionValid(draft)) {
        await deps.clearDraft(buildCmsDraftKey(state.profile.id));
      }
      state.lastDraftRestored = draftMatchesCurrentView(validDraft);
      mountEditor(state.lastDraftRestored ? validDraft.rows : rows);
      state.pendingDraft = state.lastDraftRestored ? validDraft : null;
      updateHeader();
      setStatus("");
      return true;
    } catch (error) {
      if (isAuthError(error)) {
        console.warn("[CMS] Authentication expired while loading rows", error);
        showAuthGate("Your Google session expired. Sign in again to continue editing.", "warning");
        return false;
      }

      const fallbackLocale = allowLocaleFallback
        ? getFallbackLocaleFromError(error, deps.getSupportedLanguages())
        : null;

      if (fallbackLocale && fallbackLocale !== state.locale) {
        const requestedLocale = state.locale;
        state.locale = fallbackLocale;
        populateLocaleOptions();

        const reloaded = await loadSheetRows({ allowLocaleFallback: false });
        if (reloaded) {
          setStatus(
            `Locale ${requestedLocale.toUpperCase()} is unavailable in this sheet. Switched to ${fallbackLocale.toUpperCase()}.`,
            "warning"
          );
        }
        return reloaded;
      }

      console.error("[CMS] Failed to load sheet rows", error);
      setStatus(error instanceof Error ? error.message : "Failed to load CMS rows.", "error");
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function handleLocaleChange(event) {
    state.locale = event.currentTarget.value;
    await deps.setLanguage(state.locale);
    translateShell();
    await loadSheetRows();
  }

  async function handleTabChange(event) {
    console.log("[CMS][TabDebug] handleTabChange: before", {
      requestedTitle: event.currentTarget.value,
      previousSelectedTab: state.selectedTab,
      tabs: summarizeTabsForDebug(state.tabs)
    });
    state.selectedTab = normalizeSelectedTab(state.tabs, event.currentTarget.value);
    console.log("[CMS][TabDebug] handleTabChange: after", {
      selectedTab: state.selectedTab
    });
    await loadSheetRows();
  }

  async function handleSave() {
    if (!state.editor) return;

    setLoading(true, "Saving CMS...");
    const currentRows = getEditorRows(state.editor);
    const removedKeys = state.editor.getRemovedKeys();

    try {
      let result = await state.programService.writeSheetWithDeletes(
        currentRows,
        state.locale,
        state.modifiedTime || null,
        state.selectedTab,
        removedKeys
      );

      if (result.conflict) {
        const shouldOverwrite =
          deps.windowRef?.confirm?.(
            "This sheet was modified by another user since you opened it. Save anyway?"
          ) ?? false;

        if (!shouldOverwrite) {
          state.modifiedTime = result.modifiedTime || state.modifiedTime;
          setStatus("Save cancelled to avoid overwriting newer sheet changes.", "warning");
          return;
        }

        result = await state.programService.writeSheetWithDeletes(
          currentRows,
          state.locale,
          null,
          state.selectedTab,
          removedKeys
        );
      }

      await deps.clearDraft(buildCmsDraftKey(state.profile.id));
      state.pendingDraft = null;
      await loadSheetRows();
      setStatus("Saved to Google Sheets.", "success");
    } catch (error) {
      if (isAuthError(error)) {
        console.warn("[CMS] Authentication expired while saving rows", error);
        showAuthGate("Your Google session expired. Sign in again to continue editing.", "warning");
        return;
      }

      console.error("[CMS] Failed to save sheet rows", error);
      setStatus(error instanceof Error ? error.message : "Failed to save CMS rows.", "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleDiscard() {
    if (!state.editor || !state.profile) return;
    state.editor.discardChanges();
    await deps.clearDraft(buildCmsDraftKey(state.profile.id));
    state.pendingDraft = null;
    deps.windowRef?.location?.reload?.();
  }

  async function initializeAuth() {
    const clientId = (await deps.getMetadata("googleClientId")) || deps.windowRef?.GOOGLE_CLIENT_ID;
    if (!clientId || clientId.startsWith("YOUR_GOOGLE_CLIENT_ID")) {
      state.hasConfiguredClientId = false;
      return false;
    }

    state.hasConfiguredClientId = true;
    deps.windowRef.sessionStorage.setItem("cms_last_client_id", clientId);
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
    console.log("[CMS][TabDebug] connectServices: tabs fetched", {
      tabs: summarizeTabsForDebug(state.tabs),
      preExistingSelectedTab: state.selectedTab,
      draftSelectedTabTitle: state.draftSelectedTabTitle
    });

    const hasPendingAuthReturn =
      deps.windowRef.sessionStorage.getItem(CMS_AUTH_PENDING_KEY) === "1";
    // Hard reload default: active tab. Use draft tab preference only after auth redirect.
    const preferredTitle = hasPendingAuthReturn
      ? state.draftSelectedTabTitle || state.selectedTab?.title || ""
      : state.selectedTab?.title || "";
    state.selectedTab = normalizeSelectedTab(state.tabs, preferredTitle);
    console.log("[CMS][TabDebug] connectServices: selected tab resolved", {
      hasPendingAuthReturn,
      preferredTitle,
      selectedTab: state.selectedTab
    });
  }

  async function signIn() {
    try {
      const result = await deps.auth.signIn();
      if (!result) {
        setStatus("Google sign-in was cancelled.", "warning");
        return;
      }

      deps.windowRef.sessionStorage.removeItem(CMS_AUTH_PENDING_KEY);
      showEditorChrome();
      await connectServices();
      populateTabOptions();
      await loadSheetRows();
      maybeNotifyRestoredSession();
    } catch (error) {
      if (isAuthError(error)) {
        showAuthGate("Your Google session expired. Sign in again to continue editing.", "warning");
        return;
      }

      console.error("[CMS] Google sign-in failed", error);
      setStatus(error instanceof Error ? error.message : "Google sign-in failed.", "error");
    }
  }

  async function initialize() {
    const elements = getElements();
    console.log("[CMS][TabDebug] initialize start", {
      location: deps.windowRef?.location?.href,
      hasSessionAuthPending: deps.windowRef?.sessionStorage?.getItem?.(CMS_AUTH_PENDING_KEY) === "1"
    });
    state.locale = await deps.initI18n();
    translateShell();
    populateLocaleOptions();

    const handleAuthRefreshFailure = (event) => {
      const detail = event?.detail || {};
      showAuthGate(
        detail.message || "Google session expired. Sign in again to continue editing.",
        "warning"
      );
    };

    const handleAuthRefreshWarning = (event) => {
      const detail = event?.detail || {};
      showAuthWarning(
        detail.message ||
          "Your Google session will refresh soon. Sign in again now if you want to avoid interruption.",
        "warning"
      );
    };

    deps.windowRef?.addEventListener?.("gm-auth-refresh-failed", handleAuthRefreshFailure);
    deps.windowRef?.addEventListener?.("gm-auth-refresh-warning", handleAuthRefreshWarning);

    await deps.profileManager.initProfileManager();
    state.profile = await deps.profileManager.getCurrentProfile();
    if (!state.profile?.url) {
      setLoading(false);
      setStatus("No program profile is selected.", "error");
      return state;
    }

    await restoreDraftViewPreference();
    updateHeader();
    translateShell();
    populateLocaleOptions();

    elements.localeSelect?.addEventListener("change", handleLocaleChange);
    elements.tabSelect?.addEventListener("change", handleTabChange);
    elements.saveButton?.addEventListener("click", handleSave);
    elements.discardButton?.addEventListener("click", handleDiscard);
    elements.setupButton?.addEventListener("click", openSetupModal);
    elements.setupSaveButton?.addEventListener("click", saveSetupSettings);
    elements.setupCancelButton?.addEventListener("click", closeSetupModal);
    elements.signInButton?.addEventListener("click", async () => {
      try {
        await persistDraft();
      } catch (error) {
        console.error("[CMS] Failed to persist draft before sign-in", error);
      }
      deps.windowRef.sessionStorage.setItem(CMS_AUTH_PENDING_KEY, "1");
      await signIn();
    });

    const isAuthenticated = await initializeAuth();
    if (!isAuthenticated) {
      showAuthGate("Sign in with Google to load and edit CMS rows.", "info");
      return state;
    }

    try {
      showEditorChrome();

      await connectServices();
      populateTabOptions();
      await loadSheetRows();
      maybeNotifyRestoredSession();
      return state;
    } catch (error) {
      if (isAuthError(error)) {
        showAuthGate("Your Google session expired. Sign in again to continue editing.", "warning");
        return state;
      }

      throw error;
    }
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
    initializeCmsPage().catch((error) => {
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
