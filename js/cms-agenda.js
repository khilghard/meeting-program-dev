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
    const matched = normalizedTabs.find((tab) => tab.title === preferredTitle);
    if (matched) return matched;
  }

  return (
    normalizedTabs[0] ?? {
      sheetId: null,
      title: preferredTitle || DEFAULT_SHEET_TAB_NAME,
      index: 0,
      isActive: true
    }
  );
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

function cloneEntries(values) {
  return (Array.isArray(values) ? values : []).map((row) => [...row]);
}

function stringifyEntries(values) {
  return JSON.stringify(cloneEntries(values));
}

function buildAgendaRowToken(agendaId = "", sheetRow = null) {
  return JSON.stringify([String(agendaId ?? ""), Number.isInteger(sheetRow) ? sheetRow : null]);
}

function buildAgendaRowIdentity(key, rowToken) {
  return JSON.stringify([String(key ?? ""), String(rowToken ?? "")]);
}

function createAgendaRowMeta({ key, agendaId = "", sheetRow = null, values = [] } = {}) {
  const normalizedSheetRow = Number.isInteger(sheetRow) ? sheetRow : null;
  const normalizedAgendaId = String(agendaId ?? "").trim();
  return {
    key: String(key ?? "").trim(),
    agendaId: normalizedAgendaId,
    sheetRow: normalizedSheetRow,
    rowToken: buildAgendaRowToken(normalizedAgendaId, normalizedSheetRow),
    values: cloneEntries(values)
  };
}

function normalizeDraftRows(dirtyMap = {}) {
  const normalized = {};

  for (const [draftKey, draftValue] of Object.entries(dirtyMap)) {
    if (draftValue && typeof draftValue === "object" && Array.isArray(draftValue.values)) {
      if (!AGENDA_KEYS.includes(draftValue.key)) {
        continue;
      }

      const row = createAgendaRowMeta(draftValue);
      normalized[buildAgendaRowIdentity(row.key, row.rowToken)] = row;
      continue;
    }

    if (Array.isArray(draftValue) && AGENDA_KEYS.includes(draftKey)) {
      const row = createAgendaRowMeta({ key: draftKey, values: draftValue });
      normalized[buildAgendaRowIdentity(row.key, row.rowToken)] = row;
    }
  }

  return normalized;
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
    createClient: (getToken) => new SheetsApiClient(getToken),
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

  const formatText = (key, fallback, replacements = {}) => {
    let message = text(key, fallback);
    Object.entries(replacements).forEach(([token, value]) => {
      message = message.replaceAll(`{${token}}`, String(value ?? ""));
    });
    return message;
  };

  const state = {
    profile: null,
    tabs: [],
    selectedTab: null,
    selectedKey: AGENDA_KEYS[0],
    selectedRowToken: buildAgendaRowToken("", null),
    rowsForTab: [],
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
      rowField: documentRef.getElementById("cms-agenda-row-field"),
      rowSelect: documentRef.getElementById("cms-agenda-row-select"),
      rowPrevButton: documentRef.getElementById("cms-agenda-row-prev-btn"),
      rowNextButton: documentRef.getElementById("cms-agenda-row-next-btn"),
      rowHint: documentRef.getElementById("cms-agenda-sheet-row-hint"),
      keyChangeHint: documentRef.getElementById("cms-agenda-key-change-hint"),
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
      setElementText(
        "cms-agenda-profile-name",
        text("cmsAgenda.loadingProfile", "Loading profile...")
      );
    }
    setElementText(
      "cms-agenda-setup-title",
      text("cmsAgenda.googleSettingsTitle", "Google Settings")
    );
    setElementText(
      "cms-agenda-setup-client-id-label",
      text("cmsAgenda.googleClientIdLabel", "Google Client ID")
    );
    setInputPlaceholder(
      "cms-agenda-setup-client-id",
      text("cmsAgenda.googleClientIdPlaceholder", "12345.apps.googleusercontent.com")
    );
    setElementText(
      "cms-agenda-setup-sheet-url-label",
      text("cmsAgenda.agendaSheetUrlLabel", "Agenda Sheet URL")
    );
    setElementText("cms-agenda-setup-cancel-btn", text("cancel", "Cancel"));
    setElementText(
      "cms-agenda-setup-save-btn",
      text("cmsAgenda.saveSettingsButton", "Save Settings")
    );
    setElementText("cms-agenda-tab-label", text("cmsAgenda.sheetTabLabel", "Sheet Tab"));
    setElementText("cms-agenda-key-label", text("cmsAgenda.keyLabel", "Agenda Key"));
    setElementText("cms-agenda-row-label", text("cmsAgenda.rowLabel", "Agenda Row"));
    setElementText("cms-agenda-make-active-btn", text("cmsAgenda.makeActiveButton", "Make Active"));
    setElementText("cms-agenda-save-draft-btn", text("cmsAgenda.saveDraftButton", "Save Draft"));
    setElementText("cms-agenda-publish-btn", text("cmsAgenda.publishButton", "Publish"));
    setElementText(
      "cms-agenda-publish-all-btn",
      text("cmsAgenda.publishAllButton", "Publish All Pending")
    );
    setElementText(
      "cms-agenda-pending-title",
      text("cmsAgenda.pendingChangesTitle", "Pending Changes")
    );
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
    if (state.isAuthenticated) {
      hideAuthPanel();
      if (signInButton) {
        signInButton.hidden = true;
        signInButton.disabled = true;
      }
      return;
    }
    if (authPanel) {
      authPanel.hidden = false;
    }
    if (authMessage) {
      authMessage.textContent = state.hasConfiguredClientId
        ? text("cmsAgenda.signInAgainPrompt", "Tap to sign in again to publish agenda changes.")
        : text(
            "cmsAgenda.configurePrompt",
            "Configure Google settings before signing in to edit the agenda."
          );
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
    const { authPanel, signInButton } = getElements();
    if (authPanel) {
      authPanel.hidden = true;
    }
    if (signInButton && state.isAuthenticated) {
      signInButton.hidden = true;
      signInButton.disabled = true;
    }
  }

  function setActionState() {
    const { publishButton, publishAllButton, makeActiveButton, tabSelect } = getElements();
    [publishButton, publishAllButton, makeActiveButton].filter(Boolean).forEach((control) => {
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
      AGENDA_KEYS.map((key) => ({
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
      state.tabs.map((tab) => ({
        value: tab.title,
        label: tab.title
      })),
      state.selectedTab?.title ?? "",
      deps.documentRef
    );
  }

  function buildRowLabel(row) {
    if (row.agendaId) {
      return row.agendaId;
    }

    if (row.sheetRow) {
      return `${text("cmsAgenda.sheetRowPrefix", "Sheet row")} ${row.sheetRow}`;
    }

    return text("cmsAgenda.newRowLabel", "New row");
  }

  function getBaseRowForToken(rowToken) {
    return state.rowsForTab.find((row) => row.rowToken === rowToken) ?? null;
  }

  function getVisibleRowsForCurrentTab() {
    const dirtyRowsByToken = new Map(
      Object.values(state.dirtyMap).map((entry) => [entry.rowToken, createAgendaRowMeta(entry)])
    );

    const rows = state.rowsForTab.map((row) => dirtyRowsByToken.get(row.rowToken) ?? row);
    const existingTokens = new Set(state.rowsForTab.map((row) => row.rowToken));

    dirtyRowsByToken.forEach((row, rowToken) => {
      if (!existingTokens.has(rowToken)) {
        rows.push(row);
      }
    });

    rows.sort((left, right) => {
      const leftRow = left.sheetRow ?? Number.MAX_SAFE_INTEGER;
      const rightRow = right.sheetRow ?? Number.MAX_SAFE_INTEGER;
      return leftRow - rightRow || left.agendaId.localeCompare(right.agendaId);
    });

    return rows;
  }

  function getRowsForSelectedKey() {
    return getVisibleRowsForCurrentTab().filter((row) => row.key === state.selectedKey);
  }

  function getSelectedRow() {
    const allRows = getVisibleRowsForCurrentTab();
    const matchedByToken = allRows.find((row) => row.rowToken === state.selectedRowToken);
    if (matchedByToken) {
      return matchedByToken;
    }

    const matchedByKey = getRowsForSelectedKey()[0];
    if (matchedByKey) {
      return matchedByKey;
    }

    return createAgendaRowMeta({ key: state.selectedKey, values: [] });
  }

  function getSelectedRowIdentity() {
    return buildAgendaRowIdentity(state.selectedKey, state.selectedRowToken);
  }

  function updateRowNavigationState() {
    const { rowSelect, rowPrevButton, rowNextButton } = getElements();
    if (!rowSelect || !rowPrevButton || !rowNextButton) {
      return;
    }

    const selectedIndex = rowSelect.selectedIndex;
    const hasMultiple = rowSelect.options.length > 1;
    rowPrevButton.disabled = !hasMultiple || selectedIndex <= 0;
    rowNextButton.disabled = !hasMultiple || selectedIndex === -1 || selectedIndex >= rowSelect.options.length - 1;
  }

  function populateRowOptions() {
    const { rowField, rowSelect } = getElements();
    if (!rowField || !rowSelect) return;

    const rows = getVisibleRowsForCurrentTab();
    const hasSelectedRow = rows.some((row) => row.rowToken === state.selectedRowToken);
    const firstRowForKey = rows.find((row) => row.key === state.selectedKey);

    if (!hasSelectedRow) {
      state.selectedRowToken = firstRowForKey?.rowToken ?? buildAgendaRowToken("", null);
    }

    const options = [];
    if (!firstRowForKey || state.selectedRowToken === buildAgendaRowToken("", null)) {
      options.push({
        value: buildAgendaRowToken("", null),
        label: `${text("cmsAgenda.newRowLabel", "New row")} — ${text(state.selectedKey, state.selectedKey)}`
      });
    }

    rows.forEach((row) => {
      options.push({
        value: row.rowToken,
        label: buildRowLabel(row)
      });
    });

    replaceSelectOptions(
      rowSelect,
      options,
      state.selectedRowToken,
      deps.documentRef
    );

    rowField.hidden = options.length <= 1;
    rowSelect.disabled = options.length <= 1;
    updateRowNavigationState();
  }

  function renderRowHint() {
    const { rowHint } = getElements();
    if (!rowHint) return;

    const selectedRow = getSelectedRow();
    if (!selectedRow?.sheetRow) {
      rowHint.hidden = true;
      rowHint.textContent = "";
      return;
    }

    rowHint.hidden = false;
    rowHint.textContent = `${text("cmsAgenda.sheetRowPrefix", "Sheet row")} ${selectedRow.sheetRow}`;
  }

  function renderKeyChangeHint() {
    const { keyChangeHint } = getElements();
    if (!keyChangeHint) return;

    const selectedRow = getSelectedRow();
    const baseRow = getBaseRowForToken(selectedRow.rowToken);

    if (!baseRow || !baseRow.key || baseRow.key === state.selectedKey) {
      keyChangeHint.hidden = true;
      keyChangeHint.textContent = "";
      return;
    }

    keyChangeHint.hidden = false;
    keyChangeHint.textContent = formatText(
      "cmsAgenda.keyChangedHint",
      "Key changed from {from} to {to}.",
      {
        from: text(baseRow.key, baseRow.key),
        to: text(state.selectedKey, state.selectedKey)
      }
    );
  }

  function renderPendingList() {
    const { pendingList } = getElements();
    if (!pendingList) return;

    const dirtyEntries = Object.entries(state.dirtyMap);
    if (dirtyEntries.length === 0) {
      pendingList.innerHTML = `<p>${text("cmsAgenda.noPendingChanges", "No pending changes.")}</p>`;
      return;
    }

    pendingList.innerHTML = "";
    for (const [identity, entry] of dirtyEntries) {
      const item = document.createElement("div");
      item.className = "cms-agenda__pending-item";
      item.dataset.key = entry.key;
      const label = document.createElement("strong");
      label.textContent = `${text(entry.key, entry.key)}${entry.agendaId ? ` — ${entry.agendaId}` : ""}`;
      const statusSpan = document.createElement("span");
      const status = state.publishStatusMap[identity] || text("cmsAgenda.pendingStatus", "Pending");
      statusSpan.textContent = status;
      item.appendChild(label);
      item.appendChild(statusSpan);
      pendingList.appendChild(item);
    }
  }

  function ensureEditor() {
    if (state.editor) {
      return state.editor;
    }

    state.editor = new deps.AgendaKeyEditorClass("cms-agenda-editor-container", {
      onChangeCallback: async (values) => {
        updateDirtyMap(values);
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
    populateRowOptions();
    renderRowHint();
    renderKeyChangeHint();
    showContent();
  }

  function updateDirtyMap(values) {
    const selectedRow = getSelectedRow();
    const identity = getSelectedRowIdentity();
    const draftValues = cloneEntries(values);
    const loadedValues = state.loadedMap[identity] ?? [];
    if (stringifyEntries(draftValues) === stringifyEntries(loadedValues)) {
      delete state.dirtyMap[identity];
      delete state.publishStatusMap[identity];
      return;
    }

    state.dirtyMap[identity] = {
      ...selectedRow,
      key: state.selectedKey,
      values: draftValues
    };
    state.publishStatusMap[identity] = text("cmsAgenda.pendingStatus", "Pending");
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
      selectedRowToken: state.selectedRowToken,
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

    state.selectedKey = AGENDA_KEYS.includes(draft.selectedKey)
      ? draft.selectedKey
      : state.selectedKey;
    state.selectedRowToken =
      typeof draft.selectedRowToken === "string"
        ? draft.selectedRowToken
        : buildAgendaRowToken("", null);
    state.dirtyMap = normalizeDraftRows(draft.dirtyMap ?? {});
    Object.keys(state.dirtyMap).forEach((key) => {
      state.publishStatusMap[key] = text("cmsAgenda.pendingStatus", "Pending");
    });
  }

  async function loadSelectedKey() {
    setLoading(true);
    try {
      if (state.isAuthenticated && state.agendaService) {
        const rowSource =
          typeof state.agendaService.listAgendaRows === "function"
            ? await state.agendaService.listAgendaRows(state.selectedTab)
            : await state.agendaService.readAgendaRows(state.selectedKey, state.selectedTab);
        state.rowsForTab = rowSource.map((row) => createAgendaRowMeta(row));
      } else {
        state.rowsForTab = [];
      }

      populateRowOptions();
      const selectedRow = getSelectedRow();
      state.selectedRowToken = selectedRow.rowToken;
      state.selectedKey = selectedRow.key || state.selectedKey;
      populateKeyOptions();
      populateRowOptions();

      const identity = getSelectedRowIdentity();
      let values = state.dirtyMap[identity]?.values;
      if (!values) {
        values = selectedRow.values;
        state.loadedMap[identity] = cloneEntries(values);
      }

      mountEditor(values ?? []);
      setStatus("");
    } catch (error) {
      if (isAuthError(error)) {
        state.isAuthenticated = false;
        setAuthPanelState();
        setActionState();
        populateRowOptions();
        mountEditor(state.dirtyMap[getSelectedRowIdentity()]?.values ?? []);
        setStatus(
          text("cmsAgenda.signInAgainPrompt", "Tap to sign in again to publish agenda changes."),
          "warning"
        );
        return;
      }

      console.error("[CMS Agenda] Failed to load agenda key", error);
      setStatus(
        error instanceof Error
          ? error.message
          : text("cmsAgenda.loadFailed", "Failed to load agenda data."),
        "error"
      );
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
        setupStatus.textContent = text(
          "cmsAgenda.invalidClientId",
          "Enter a valid Google Client ID before saving."
        );
      }
      return false;
    }

    await deps.setMetadata("googleClientId", clientId);
    deps.auth.initialize(clientId, deps.windowRef.location.href.split(/[?#]/)[0]);
    state.hasConfiguredClientId = true;
    closeSetupModal();
    setAuthPanelState();
    setStatus(
      text("cmsAgenda.settingsSaved", "Google settings saved. Sign in to continue."),
      "success"
    );
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
          setStatus(
            text(
              "cmsAgenda.sessionRestored",
              "Draft restored. You can publish pending agenda changes now."
            ),
            "success"
          );
        }
      }
    } catch (error) {
      console.error("[CMS Agenda] Google sign-in failed", error);
      setStatus(
        error instanceof Error
          ? error.message
          : text("cmsAgenda.signInFailed", "Google sign-in failed."),
        "error"
      );
    }
  }

  async function handleKeyChange(event) {
    const nextKey = event.currentTarget.value;
    if (!AGENDA_KEYS.includes(nextKey) || nextKey === state.selectedKey) {
      return;
    }

    const previousIdentity = getSelectedRowIdentity();
    const selectedRow = getSelectedRow();
    const baseRow = getBaseRowForToken(selectedRow.rowToken) ?? selectedRow;
    const currentValues = cloneEntries(
      state.editor?.getValues?.() ?? state.dirtyMap[previousIdentity]?.values ?? selectedRow.values
    );
    const baselineIdentity = buildAgendaRowIdentity(baseRow.key, baseRow.rowToken);
    const baselineValues = cloneEntries(state.loadedMap[baselineIdentity] ?? baseRow.values);

    delete state.dirtyMap[previousIdentity];
    delete state.publishStatusMap[previousIdentity];

    state.selectedKey = nextKey;

    const nextIdentity = getSelectedRowIdentity();
    if (nextKey !== baseRow.key || stringifyEntries(currentValues) !== stringifyEntries(baselineValues)) {
      state.dirtyMap[nextIdentity] = {
        ...selectedRow,
        key: nextKey,
        values: currentValues
      };
      state.publishStatusMap[nextIdentity] = text("cmsAgenda.pendingStatus", "Pending");
    }

    populateKeyOptions();
    renderPendingList();
    mountEditor(currentValues);
    await persistDraft();
  }

  async function handleRowChange(event) {
    state.selectedRowToken = event.currentTarget.value;
    const selectedRow = getSelectedRow();
    state.selectedKey = selectedRow.key || state.selectedKey;
    populateKeyOptions();
    await loadSelectedKey();
  }

  async function handleRowStep(offset) {
    const { rowSelect } = getElements();
    if (!rowSelect || rowSelect.options.length <= 1) {
      return;
    }

    const currentIndex = Math.max(rowSelect.selectedIndex, 0);
    const nextIndex = currentIndex + offset;
    if (nextIndex < 0 || nextIndex >= rowSelect.options.length) {
      return;
    }

    rowSelect.selectedIndex = nextIndex;
    updateRowNavigationState();
    await handleRowChange({ currentTarget: rowSelect });
  }

  async function handleTabChange(event) {
    state.selectedTab = normalizeSelectedTab(state.tabs, event.currentTarget.value);
    state.loadedMap = {};
    state.rowsForTab = [];
    state.selectedKey = AGENDA_KEYS[0];
    state.selectedRowToken = buildAgendaRowToken("", null);
    state.dirtyMap = {};
    state.publishStatusMap = {};
    await restoreDraft(state.selectedTab.title);
    populateKeyOptions();
    populateRowOptions();
    renderPendingList();
    await loadSelectedKey();
  }

  async function handleSaveDraft() {
    await persistDraft();
    renderPendingList();
    setStatus(text("cmsAgenda.draftSaved", "Draft saved on this device."), "success");
  }

  async function publishRow(row) {
    const identity = buildAgendaRowIdentity(row.key, row.rowToken);
    const publishResult = await state.agendaService.writeAgendaRow(
      {
        key: row.key,
        agendaId: row.agendaId,
        values: row.values,
        sheetRow: row.sheetRow
      },
      state.selectedTab
    );
    console.info("[CMS Agenda] Published agenda row", {
      tabTitle: publishResult?.tabTitle ?? state.selectedTab?.title ?? DEFAULT_SHEET_TAB_NAME,
      key: row.key,
      agendaId: row.agendaId || "(new)",
      sheetRow: publishResult?.sheetRow ?? row.sheetRow ?? null,
      range: publishResult?.range ?? "",
      rowValues: publishResult?.rowValues ?? row.values
    });
    const updatedRow = createAgendaRowMeta({
      key: row.key,
      agendaId: row.agendaId,
      sheetRow: publishResult?.sheetRow ?? row.sheetRow,
      values: row.values
    });
    const rowIndex = state.rowsForTab.findIndex((entry) => entry.rowToken === row.rowToken);
    if (rowIndex >= 0) {
      state.rowsForTab[rowIndex] = updatedRow;
    } else {
      state.rowsForTab.push(updatedRow);
    }
    state.loadedMap[identity] = cloneEntries(row.values);
    delete state.dirtyMap[identity];
    state.publishStatusMap[identity] = text("cmsAgenda.savedStatus", "Saved");
    await persistDraft();
    renderKeyChangeHint();
    return publishResult;
  }

  async function handlePublishCurrent() {
    if (!state.isAuthenticated) {
      setAuthPanelState();
      setStatus(
        text("cmsAgenda.signInAgainPrompt", "Tap to sign in again to publish agenda changes."),
        "warning"
      );
      return;
    }

    const values = state.editor?.getValues?.() ?? [];
    updateDirtyMap(values);
    const identity = getSelectedRowIdentity();
    const selectedRow = getSelectedRow();
    try {
      state.publishStatusMap[identity] = text("cmsAgenda.savingStatus", "Saving");
      renderPendingList();
      const publishResult = await publishRow({ ...selectedRow, key: state.selectedKey, values });
      renderPendingList();
      const debugSuffix = publishResult?.sheetRow
        ? ` ${text("cmsAgenda.publishSuccess", "Agenda changes published.")} ${publishResult.tabTitle} / ${text("cmsAgenda.sheetRowPrefix", "Sheet row")} ${publishResult.sheetRow}`
        : text("cmsAgenda.publishSuccess", "Agenda changes published.");
      setStatus(debugSuffix, "success");
    } catch (error) {
      if (isAuthError(error)) {
        state.isAuthenticated = false;
        setAuthPanelState();
        setActionState();
        setStatus(
          text("cmsAgenda.signInAgainPrompt", "Tap to sign in again to publish agenda changes."),
          "warning"
        );
        return;
      }

      console.error("[CMS Agenda] Failed to publish agenda key", error);
      state.publishStatusMap[identity] = text("cmsAgenda.failedStatus", "Failed");
      renderPendingList();
      setStatus(
        error instanceof Error
          ? error.message
          : text("cmsAgenda.publishFailed", "Failed to publish agenda changes."),
        "error"
      );
    }
  }

  async function handlePublishAll() {
    if (!state.isAuthenticated) {
      setAuthPanelState();
      setStatus(
        text("cmsAgenda.signInAgainPrompt", "Tap to sign in again to publish agenda changes."),
        "warning"
      );
      return;
    }

    const currentValues = state.editor?.getValues?.() ?? [];
    updateDirtyMap(currentValues);
    await persistDraft();
    renderPendingList();

    let failedCount = 0;
    let publishedCount = 0;

    for (const [identity, entry] of Object.entries(state.dirtyMap)) {
      try {
        state.publishStatusMap[identity] = text("cmsAgenda.savingStatus", "Saving");
        renderPendingList();
        await publishRow(
          identity === getSelectedRowIdentity() ? { ...entry, values: currentValues } : entry
        );
        publishedCount += 1;
      } catch (error) {
        if (isAuthError(error)) {
          state.isAuthenticated = false;
          setAuthPanelState();
          setActionState();
          setStatus(
            text("cmsAgenda.signInAgainPrompt", "Tap to sign in again to publish agenda changes."),
            "warning"
          );
          return;
        }

        console.error("[CMS Agenda] Failed to publish pending agenda key", error);
        state.publishStatusMap[identity] = text("cmsAgenda.failedStatus", "Failed");
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

    setStatus(
      text("cmsAgenda.publishAllComplete", "Finished publishing pending agenda changes."),
      "success"
    );
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
      setStatus(
        error instanceof Error
          ? error.message
          : text("cmsAgenda.makeActiveFailed", "Failed to make the selected tab active."),
        "error"
      );
    }
  }

  async function initialize() {
    await deps.initI18n();
    translateShell();
    populateKeyOptions();

    await deps.profileManager.initProfileManager();
    const requestedProfileId = getRequestedProfileId(deps.windowRef);
    state.profile =
      requestedProfileId && typeof deps.profileManager.getProfileById === "function"
        ? await deps.profileManager.getProfileById(requestedProfileId)
        : await deps.profileManager.getCurrentProfile();
    if (!state.profile?.agendaUrl) {
      setLoading(false);
      setStatus(
        text("cmsAgenda.noAgendaProfile", "No agenda sheet is configured for the current profile."),
        "error"
      );
      return state;
    }

    updateHeader();

    const elements = getElements();
    elements.keySelect?.addEventListener("change", handleKeyChange);
    elements.tabSelect?.addEventListener("change", handleTabChange);
    elements.rowSelect?.addEventListener("change", handleRowChange);
    elements.rowPrevButton?.addEventListener("click", () => {
      handleRowStep(-1).catch((error) => {
        console.error("[CMS Agenda] Failed to navigate to previous row", error);
      });
    });
    elements.rowNextButton?.addEventListener("click", () => {
      handleRowStep(1).catch((error) => {
        console.error("[CMS Agenda] Failed to navigate to next row", error);
      });
    });
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
    populateRowOptions();
    renderPendingList();

    state.isAuthenticated = await initializeAuth();
    if (state.isAuthenticated) {
      hideAuthPanel();
      await connectServices();
      populateTabOptions();
      setActionState();
      await restoreDraft(state.selectedTab.title);
      populateKeyOptions();
      populateRowOptions();
      renderPendingList();
      await loadSelectedKey();
      return state;
    }

    setAuthPanelState();
    setActionState();
    populateTabOptions();
    populateRowOptions();
    await loadSelectedKey();
    setStatus(
      text("cmsAgenda.signInAgainPrompt", "Tap to sign in again to publish agenda changes."),
      "info"
    );
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
    initializeCmsAgendaPage().catch((error) => {
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
