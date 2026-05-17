import * as Profiles from "./data/ProfileManager.js";
import {
  clearDraft,
  getDraft,
  getMetadata,
  saveDraft,
  setMetadata
} from "./data/IndexedDBManager.js";
import GoogleAuth from "./auth/googleAuth.js";
import { AGENDA_KEYS } from "./agenda/constants.js";
import AgendaKeyEditor from "./components/AgendaKeyEditor.mjs";
import { initI18n, t } from "./i18n/index.js";
import { AgendaSheetService } from "./services/AgendaSheetService.mjs";
import { SheetTabService } from "./services/SheetTabService.mjs";
import { SheetsApiClient } from "./services/SheetsApiClient.mjs";
import { DEFAULT_SHEET_TAB_NAME } from "./utils/sheetRanges.js";

const CMS_AGENDA_AUTH_PENDING_KEY = "cms_agenda_auth_pending";

export function buildAgendaDraftKey(profileId) {
  return `agenda_draft_${profileId}`;
}

function normalizeSelectedTab(tabs, preferredTitle = "") {
  const normalizedTabs = Array.isArray(tabs) ? tabs : [];
  if (preferredTitle) {
    const matched = normalizedTabs.find(tab => tab.title === preferredTitle);
    if (matched) return matched;
  }

  return normalizedTabs[0] ?? {
    sheetId: null,
    title: preferredTitle || DEFAULT_SHEET_TAB_NAME,
    index: 0,
    isActive: true
  };
}

function isAuthError(error) {
  if (!error) return false;
  const message = error instanceof Error ? error.message : String(error);
  return error.name === "SheetsAuthError" || error.status === 403 || /access token|not authorized/i.test(message);
}

function cloneEntries(values) {
  return (Array.isArray(values) ? values : []).map(row => [...row]);
}

function stringifyEntries(values) {
  return JSON.stringify(cloneEntries(values));
}

function getRequestedProfileId(windowRef) {
  try {
    return new URL(windowRef.location.href).searchParams.get("profileId") || "";
  } catch {
    return "";
  }
}

function isAgendaDraftPayload(draft) {
  return Boolean(draft && typeof draft === "object");
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

export function createCmsAgendaApp(dependencies = {}) {
  const deps = {
    profileManager: Profiles,
    auth: GoogleAuth,
    getDraft,
    saveDraft,
    clearDraft,
    getMetadata,
    setMetadata,
    initI18n,
    t,
    createClient: getToken => new SheetsApiClient(getToken),
    AgendaSheetServiceClass: AgendaSheetService,
    SheetTabServiceClass: SheetTabService,
    AgendaKeyEditorClass: AgendaKeyEditor,
    documentRef: globalThis.document,
    windowRef: globalThis.window,
    ...dependencies
  };

  const text = (key, fallback) => {
    const translated = deps.t(key);
    return translated === key ? fallback : translated;
  };

  const state = {
    profile: null,
    tabs: [],
    selectedTab: null,
    selectedKey: AGENDA_KEYS[0],
    dirtyMap: {},
    loadedMap: {},
    publishStatusMap: {},
    editor: null,
    agendaService: null,
    tabService: null,
    hasConfiguredClientId: false,
    isAuthenticated: false
  };

  function getElements() {
    const documentRef = deps.documentRef;
    return {
      pageStatus: documentRef.getElementById("cms-agenda-page-status"),
      authPanel: documentRef.getElementById("cms-agenda-auth-panel"),
      authMessage: documentRef.getElementById("cms-agenda-auth-message"),
      signInButton: documentRef.getElementById("cms-agenda-sign-in-btn"),
      setupButton: documentRef.getElementById("cms-agenda-setup-btn"),
      loading: documentRef.getElementById("cms-agenda-loading"),
      content: documentRef.getElementById("cms-agenda-content"),
      profileName: documentRef.getElementById("cms-agenda-profile-name"),
      tabSelect: documentRef.getElementById("cms-agenda-tab-select"),
      keySelect: documentRef.getElementById("cms-agenda-key-select"),
      publishButton: documentRef.getElementById("cms-agenda-publish-btn"),
      saveDraftButton: documentRef.getElementById("cms-agenda-save-draft-btn"),
      publishAllButton: documentRef.getElementById("cms-agenda-publish-all-btn"),
      makeActiveButton: documentRef.getElementById("cms-agenda-make-active-btn"),
      pendingList: documentRef.getElementById("cms-agenda-pending-list"),
      editorContainer: documentRef.getElementById("cms-agenda-editor-container"),
      setupModal: documentRef.getElementById("cms-agenda-setup-modal"),
      setupClientId: documentRef.getElementById("cms-agenda-setup-client-id"),
      setupSheetUrl: documentRef.getElementById("cms-agenda-setup-sheet-url"),
      setupStatus: documentRef.getElementById("cms-agenda-setup-status"),
      setupSaveButton: documentRef.getElementById("cms-agenda-setup-save-btn"),
      setupCancelButton: documentRef.getElementById("cms-agenda-setup-cancel-btn")
    };
  }

  function setLoading(isLoading, message = "") {
    const { loading } = getElements();
    if (!loading) return;
    loading.hidden = !isLoading;
    loading.textContent = message || text("cmsAgenda.loading", "Loading agenda editor...");
  }

  function setStatus(message, tone = "info") {
    const { pageStatus } = getElements();
    if (!pageStatus) return;
    pageStatus.textContent = message;
    pageStatus.dataset.tone = tone;
    pageStatus.hidden = !message;
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
    deps.documentRef.title = text("cmsAgenda.pageTitle", "Ward Agenda CMS");
    const appleTitle = deps.documentRef.querySelector('meta[name="apple-mobile-web-app-title"]');
    if (appleTitle) {
      appleTitle.setAttribute("content", text("cmsAgenda.pageTitle", "Ward Agenda CMS"));
    }

    setElementText("cms-agenda-shell-title", text("cmsAgenda.pageTitle", "Ward Agenda CMS"));
    if (!state.profile) {
      setElementText("cms-agenda-profile-name", text("cmsAgenda.loadingProfile", "Loading profile..."));
    }
    setElementText("cms-agenda-setup-title", text("cmsAgenda.googleSettingsTitle", "Google Settings"));
    setElementText("cms-agenda-setup-client-id-label", text("cmsAgenda.googleClientIdLabel", "Google Client ID"));
    setInputPlaceholder(
      "cms-agenda-setup-client-id",
      text("cmsAgenda.googleClientIdPlaceholder", "12345.apps.googleusercontent.com")
    );
    setElementText("cms-agenda-setup-sheet-url-label", text("cmsAgenda.agendaSheetUrlLabel", "Agenda Sheet URL"));
    setElementText("cms-agenda-setup-cancel-btn", text("cancel", "Cancel"));
    setElementText("cms-agenda-setup-save-btn", text("cmsAgenda.saveSettingsButton", "Save Settings"));
    setElementText("cms-agenda-tab-label", text("cmsAgenda.sheetTabLabel", "Sheet Tab"));
    setElementText("cms-agenda-key-label", text("cmsAgenda.keyLabel", "Agenda Key"));
    setElementText("cms-agenda-make-active-btn", text("cmsAgenda.makeActiveButton", "Make Active"));
    setElementText("cms-agenda-save-draft-btn", text("cmsAgenda.saveDraftButton", "Save Draft"));
    setElementText("cms-agenda-publish-btn", text("cmsAgenda.publishButton", "Publish"));
    setElementText("cms-agenda-publish-all-btn", text("cmsAgenda.publishAllButton", "Publish All Pending"));
    setElementText("cms-agenda-pending-title", text("cmsAgenda.pendingChangesTitle", "Pending Changes"));
    setElementText("cms-agenda-loading", text("cmsAgenda.loading", "Loading agenda editor..."));
  }

  function showContent() {
    const { content } = getElements();
    if (content) {
      content.hidden = false;
    }
  }

  function setAuthPanelState() {
    const { authPanel, authMessage, signInButton, setupButton } = getElements();
    if (authPanel) {
      authPanel.hidden = false;
    }
    if (authMessage) {
      authMessage.textContent = state.hasConfiguredClientId
        ? text("cmsAgenda.signInAgainPrompt", "Tap to sign in again to publish agenda changes.")
        : text("cmsAgenda.configurePrompt", "Configure Google settings before signing in to edit the agenda.");
    }
    if (signInButton) {
      signInButton.hidden = !state.hasConfiguredClientId;
      signInButton.disabled = !state.hasConfiguredClientId;
    }
    if (setupButton) {
      setupButton.hidden = false;
      setupButton.textContent = state.hasConfiguredClientId
        ? text("cmsAgenda.editGoogleSettings", "Edit Google Settings")
        : text("cmsAgenda.configureGoogleSettings", "Configure Google Settings");
    }
  }

  function hideAuthPanel() {
    const { authPanel } = getElements();
    if (authPanel) {
      authPanel.hidden = true;
    }
  }

  function setActionState() {
    const { publishButton, publishAllButton, makeActiveButton, tabSelect } = getElements();
    [publishButton, publishAllButton, makeActiveButton].filter(Boolean).forEach(control => {
      control.disabled = !state.isAuthenticated;
    });
    if (tabSelect) {
      tabSelect.disabled = !state.isAuthenticated || state.tabs.length === 0;
    }
  }

  function updateHeader() {
    const { profileName } = getElements();
    if (profileName && state.profile) {
      profileName.textContent = state.profile.unitName || state.profile.agendaUrl;
    }
  }

  function populateKeyOptions() {
    const { keySelect } = getElements();
    if (!keySelect) return;

    replaceSelectOptions(
      keySelect,
      AGENDA_KEYS.map(key => ({
        value: key,
        label: text(key, key)
      })),
      state.selectedKey,
      deps.documentRef
    );
  }

  function populateTabOptions() {
    const { tabSelect } = getElements();
    if (!tabSelect) return;

    replaceSelectOptions(
      tabSelect,
      state.tabs.map(tab => ({
        value: tab.title,
        label: tab.title
      })),
      state.selectedTab?.title ?? "",
      deps.documentRef
    );
  }

  function renderPendingList() {
    const { pendingList } = getElements();
    if (!pendingList) return;

    const dirtyKeys = Object.keys(state.dirtyMap);
    if (dirtyKeys.length === 0) {
      pendingList.innerHTML = `<p>${text("cmsAgenda.noPendingChanges", "No pending changes.")}</p>`;
      return;
    }

    pendingList.innerHTML = dirtyKeys
      .map(key => {
        const status = state.publishStatusMap[key] || text("cmsAgenda.pendingStatus", "Pending");
        return `<div class="cms-agenda__pending-item" data-key="${key}"><strong>${text(key, key)}</strong><span>${status}</span></div>`;
      })
      .join("");
  }

  function ensureEditor() {
    if (state.editor) {
      return state.editor;
    }

    state.editor = new deps.AgendaKeyEditorClass("cms-agenda-editor-container", {
      onChangeCallback: async values => {
        updateDirtyMap(state.selectedKey, values);
        renderPendingList();
        try {
          await persistDraft();
        } catch (error) {
          console.error("[CMS Agenda] Failed to persist draft", error);
        }
      }
    });

    return state.editor;
  }

  function mountEditor(values) {
    const editor = ensureEditor();
    editor.initialize({ key: state.selectedKey, values });
    showContent();
  }

  function updateDirtyMap(key, values) {
    const draftValues = cloneEntries(values);
    const loadedValues = state.loadedMap[key] ?? [];
    if (stringifyEntries(draftValues) === stringifyEntries(loadedValues)) {
      delete state.dirtyMap[key];
      delete state.publishStatusMap[key];
      return;
    }

    state.dirtyMap[key] = draftValues;
    state.publishStatusMap[key] = text("cmsAgenda.pendingStatus", "Pending");
  }

  async function persistDraft() {
    if (!state.profile) return;
    const draftKey = buildAgendaDraftKey(state.profile.id);
    if (Object.keys(state.dirtyMap).length === 0) {
      await deps.clearDraft(draftKey);
      return;
    }

    await deps.saveDraft(draftKey, {
      selectedTabTitle: state.selectedTab?.title ?? DEFAULT_SHEET_TAB_NAME,
      selectedKey: state.selectedKey,
      dirtyMap: state.dirtyMap,
      savedAt: Date.now()
    });
  }

  async function restoreDraft(preferredTabTitle = "") {
    if (!state.profile) return;
    const draft = await deps.getDraft(buildAgendaDraftKey(state.profile.id));
    if (!isAgendaDraftPayload(draft)) {
      return;
    }

    const draftTabTitle = draft.selectedTabTitle ?? DEFAULT_SHEET_TAB_NAME;
    if (!preferredTabTitle) {
      state.selectedTab = normalizeSelectedTab(state.tabs, draftTabTitle);
    }
    const targetTabTitle = preferredTabTitle || state.selectedTab?.title || draftTabTitle;
    if (draftTabTitle !== targetTabTitle) {
      return;
    }

    state.selectedKey = AGENDA_KEYS.includes(draft.selectedKey) ? draft.selectedKey : state.selectedKey;
    state.dirtyMap = Object.fromEntries(
      Object.entries(draft.dirtyMap ?? {}).filter(([key]) => AGENDA_KEYS.includes(key))
    );
    Object.keys(state.dirtyMap).forEach(key => {
      state.publishStatusMap[key] = text("cmsAgenda.pendingStatus", "Pending");
    });
  }

  async function loadSelectedKey() {
    setLoading(true);
    try {
      let values = state.dirtyMap[state.selectedKey];
      if (!values && state.isAuthenticated && state.agendaService) {
        values = await state.agendaService.readAgendaKey(state.selectedKey, state.selectedTab);
        state.loadedMap[state.selectedKey] = cloneEntries(values);
      }
      mountEditor(values ?? []);
      setStatus("");
    } catch (error) {
      if (isAuthError(error)) {
        state.isAuthenticated = false;
        setAuthPanelState();
        setActionState();
        mountEditor(state.dirtyMap[state.selectedKey] ?? []);
        setStatus(text("cmsAgenda.signInAgainPrompt", "Tap to sign in again to publish agenda changes."), "warning");
        return;
      }

      console.error("[CMS Agenda] Failed to load agenda key", error);
      setStatus(error instanceof Error ? error.message : text("cmsAgenda.loadFailed", "Failed to load agenda data."), "error");
    } finally {
      setLoading(false);
    }
  }

  async function initializeAuth() {
    const clientId = (await deps.getMetadata("googleClientId")) || deps.windowRef?.GOOGLE_CLIENT_ID;
    if (!clientId || clientId.startsWith("YOUR_GOOGLE_CLIENT_ID")) {
      state.hasConfiguredClientId = false;
      return false;
    }

    state.hasConfiguredClientId = true;
    deps.auth.initialize(clientId, deps.windowRef.location.href.split(/[?#]/)[0]);
    return deps.auth.isAuthenticated();
  }

  async function connectServices() {
    const client = deps.createClient(() => {
      const token = deps.auth.getAccessToken();
      if (!token) {
        throw new Error("Agenda CMS requires a Google access token");
      }
      return token;
    });

    state.agendaService = new deps.AgendaSheetServiceClass(client, state.profile.agendaUrl);
    state.tabService = new deps.SheetTabServiceClass(client, state.profile.agendaUrl);
    state.tabs = await state.tabService.listTabs();
    state.selectedTab = normalizeSelectedTab(
      state.tabs,
      state.selectedTab?.title ?? DEFAULT_SHEET_TAB_NAME
    );
  }

  function openSetupModal() {
    const { setupModal, setupClientId, setupSheetUrl, setupStatus } = getElements();
    if (!setupModal) return;
    if (setupClientId) {
      setupClientId.value = "";
    }
    if (setupSheetUrl) {
      setupSheetUrl.value = state.profile?.agendaUrl || "";
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
        setupStatus.textContent = text("cmsAgenda.invalidClientId", "Enter a valid Google Client ID before saving.");
      }
      return false;
    }

    await deps.setMetadata("googleClientId", clientId);
  deps.auth.initialize(clientId, deps.windowRef.location.href.split(/[?#]/)[0]);
    state.hasConfiguredClientId = true;
    closeSetupModal();
    setAuthPanelState();
    setStatus(text("cmsAgenda.settingsSaved", "Google settings saved. Sign in to continue."), "success");
    return true;
  }

  async function handleSignIn() {
    try {
      await persistDraft();
      deps.windowRef.sessionStorage.setItem(CMS_AGENDA_AUTH_PENDING_KEY, "1");
      const result = await deps.auth.signIn();
      if (!result) {
        setStatus(text("cmsAgenda.signInCancelled", "Google sign-in was cancelled."), "warning");
        return;
      }

      state.isAuthenticated = true;
      hideAuthPanel();
      await connectServices();
      populateTabOptions();
      setActionState();
      await loadSelectedKey();
      if (deps.windowRef.sessionStorage.getItem(CMS_AGENDA_AUTH_PENDING_KEY) === "1") {
        deps.windowRef.sessionStorage.removeItem(CMS_AGENDA_AUTH_PENDING_KEY);
        if (Object.keys(state.dirtyMap).length > 0) {
          setStatus(text("cmsAgenda.sessionRestored", "Draft restored. You can publish pending agenda changes now."), "success");
        }
      }
    } catch (error) {
      console.error("[CMS Agenda] Google sign-in failed", error);
      setStatus(error instanceof Error ? error.message : text("cmsAgenda.signInFailed", "Google sign-in failed."), "error");
    }
  }

  async function handleKeyChange(event) {
    state.selectedKey = event.currentTarget.value;
    renderPendingList();
    await loadSelectedKey();
  }

  async function handleTabChange(event) {
    state.selectedTab = normalizeSelectedTab(state.tabs, event.currentTarget.value);
    state.loadedMap = {};
    state.selectedKey = AGENDA_KEYS[0];
    state.dirtyMap = {};
    state.publishStatusMap = {};
    await restoreDraft(state.selectedTab.title);
    populateKeyOptions();
    renderPendingList();
    await loadSelectedKey();
  }

  async function handleSaveDraft() {
    await persistDraft();
    renderPendingList();
    setStatus(text("cmsAgenda.draftSaved", "Draft saved on this device."), "success");
  }

  async function publishKey(key, values) {
    await state.agendaService.writeAgendaKey(key, values, state.selectedTab);
    state.loadedMap[key] = cloneEntries(values);
    delete state.dirtyMap[key];
    state.publishStatusMap[key] = text("cmsAgenda.savedStatus", "Saved");
    await persistDraft();
  }

  async function handlePublishCurrent() {
    if (!state.isAuthenticated) {
      setAuthPanelState();
      setStatus(text("cmsAgenda.signInAgainPrompt", "Tap to sign in again to publish agenda changes."), "warning");
      return;
    }

    const values = state.editor?.getValues?.() ?? [];
    try {
      state.publishStatusMap[state.selectedKey] = text("cmsAgenda.savingStatus", "Saving");
      renderPendingList();
      await publishKey(state.selectedKey, values);
      renderPendingList();
      setStatus(text("cmsAgenda.publishSuccess", "Agenda changes published."), "success");
    } catch (error) {
      if (isAuthError(error)) {
        state.isAuthenticated = false;
        setAuthPanelState();
        setActionState();
        setStatus(text("cmsAgenda.signInAgainPrompt", "Tap to sign in again to publish agenda changes."), "warning");
        return;
      }

      console.error("[CMS Agenda] Failed to publish agenda key", error);
      state.publishStatusMap[state.selectedKey] = text("cmsAgenda.failedStatus", "Failed");
      renderPendingList();
      setStatus(error instanceof Error ? error.message : text("cmsAgenda.publishFailed", "Failed to publish agenda changes."), "error");
    }
  }

  async function handlePublishAll() {
    if (!state.isAuthenticated) {
      setAuthPanelState();
      setStatus(text("cmsAgenda.signInAgainPrompt", "Tap to sign in again to publish agenda changes."), "warning");
      return;
    }

    const currentValues = state.editor?.getValues?.() ?? [];
    updateDirtyMap(state.selectedKey, currentValues);
    await persistDraft();
    renderPendingList();

    let failedCount = 0;
    let publishedCount = 0;

    for (const key of Object.keys(state.dirtyMap)) {
      try {
        state.publishStatusMap[key] = text("cmsAgenda.savingStatus", "Saving");
        renderPendingList();
        await publishKey(key, key === state.selectedKey ? currentValues : state.dirtyMap[key]);
        publishedCount += 1;
      } catch (error) {
        if (isAuthError(error)) {
          state.isAuthenticated = false;
          setAuthPanelState();
          setActionState();
          setStatus(text("cmsAgenda.signInAgainPrompt", "Tap to sign in again to publish agenda changes."), "warning");
          return;
        }

        console.error("[CMS Agenda] Failed to publish pending agenda key", error);
        state.publishStatusMap[key] = text("cmsAgenda.failedStatus", "Failed");
        failedCount += 1;
      }
      renderPendingList();
    }

    if (failedCount > 0) {
      setStatus(
        text(
          "cmsAgenda.publishAllPartial",
          "Finished publishing pending agenda changes, but some items failed."
        ),
        publishedCount > 0 ? "warning" : "error"
      );
      return;
    }

    setStatus(text("cmsAgenda.publishAllComplete", "Finished publishing pending agenda changes."), "success");
  }

  async function handleMakeActive() {
    if (!state.isAuthenticated || !state.selectedTab?.sheetId) {
      return;
    }

    try {
      await state.tabService.makeActiveTab(state.selectedTab.sheetId);
      state.tabs = await state.tabService.listTabs();
      state.selectedTab = normalizeSelectedTab(state.tabs, state.selectedTab.title);
      populateTabOptions();
      setStatus(text("cmsAgenda.makeActiveSuccess", "Selected tab is now active."), "success");
    } catch (error) {
      console.error("[CMS Agenda] Failed to make tab active", error);
      setStatus(error instanceof Error ? error.message : text("cmsAgenda.makeActiveFailed", "Failed to make the selected tab active."), "error");
    }
  }

  async function initialize() {
    await deps.initI18n();
    translateShell();
    populateKeyOptions();

    await deps.profileManager.initProfileManager();
    const requestedProfileId = getRequestedProfileId(deps.windowRef);
    state.profile = requestedProfileId && typeof deps.profileManager.getProfileById === "function"
      ? await deps.profileManager.getProfileById(requestedProfileId)
      : await deps.profileManager.getCurrentProfile();
    if (!state.profile?.agendaUrl) {
      setLoading(false);
      setStatus(text("cmsAgenda.noAgendaProfile", "No agenda sheet is configured for the current profile."), "error");
      return state;
    }

    updateHeader();

    const elements = getElements();
    elements.keySelect?.addEventListener("change", handleKeyChange);
    elements.tabSelect?.addEventListener("change", handleTabChange);
    elements.publishButton?.addEventListener("click", handlePublishCurrent);
    elements.saveDraftButton?.addEventListener("click", handleSaveDraft);
    elements.publishAllButton?.addEventListener("click", handlePublishAll);
    elements.makeActiveButton?.addEventListener("click", handleMakeActive);
    elements.signInButton?.addEventListener("click", handleSignIn);
    elements.setupButton?.addEventListener("click", openSetupModal);
    elements.setupSaveButton?.addEventListener("click", saveSetupSettings);
    elements.setupCancelButton?.addEventListener("click", closeSetupModal);

    state.selectedTab = normalizeSelectedTab([], DEFAULT_SHEET_TAB_NAME);
    await restoreDraft();
    populateKeyOptions();
    renderPendingList();

    state.isAuthenticated = await initializeAuth();
    if (state.isAuthenticated) {
      hideAuthPanel();
      await connectServices();
      populateTabOptions();
      setActionState();
      await restoreDraft(state.selectedTab.title);
      populateKeyOptions();
      renderPendingList();
      await loadSelectedKey();
      return state;
    }

    setAuthPanelState();
    setActionState();
    populateTabOptions();
    mountEditor(state.dirtyMap[state.selectedKey] ?? []);
    setStatus(text("cmsAgenda.signInAgainPrompt", "Tap to sign in again to publish agenda changes."), "info");
    return state;
  }

  return {
    initialize,
    state,
    handlePublishCurrent,
    handlePublishAll,
    handleMakeActive,
    handleSaveDraft,
    handleSignIn
  };
}

export async function initializeCmsAgendaPage() {
  const app = createCmsAgendaApp();
  await app.initialize();
  return app;
}

if (typeof document !== "undefined") {
  const start = () => {
    initializeCmsAgendaPage().catch(error => {
      console.error("[CMS Agenda] Failed to initialize page", error);
      const status = document.getElementById("cms-agenda-page-status");
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
