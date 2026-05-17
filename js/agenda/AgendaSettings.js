/**
 * AgendaSettings.js
 * Manages the Private Agenda configuration modal.
 * Allows users to attach an agenda URL to each profile.
 */

import { t } from "../i18n/index.js";
import * as Profiles from "../profiles.js";
import { showScanner } from "../qr.js";

let currentEditingProfileId = null;

function text(key, fallback) {
  const translated = t(key);
  return translated === key ? fallback : translated;
}

function getAgendaStatusSummary(profile) {
  if (!profile?.agendaUrl) {
    return {
      icon: "",
      editorStatus: text("agendaNoUrl", "No agenda URL set"),
      legacyStatus: ""
    };
  }

  return {
    icon: profile.agendaValid ? "✅" : "📝",
    editorStatus: text("agendaEditorConfigured", "Configured for editor"),
    legacyStatus: profile.agendaValid
      ? text("agendaLegacyAvailable", "Available in main app")
      : text("agendaLegacyPending", "Needs refresh in main app")
  };
}

/**
 * Initialize agenda settings UI: bind buttons and global QR listener.
 */
export function initAgendaSettings() {
  const btn = document.getElementById("agenda-settings-btn");
  if (btn) {
    btn.onclick = openAgendaSettingsModal;
  }

  const modal = document.getElementById("agenda-settings-modal");
  const closeBtn = document.getElementById("close-agenda-modal-btn");
  if (closeBtn) {
    closeBtn.onclick = closeAgendaSettingsModal;
  }

  // Close modal when clicking outside
  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        closeAgendaSettingsModal();
      }
    });
  }

  // Listen for QR scans if modal is open
  window.addEventListener("qr-scanned", handleQrScanned);
}

/**
 * Open the agenda settings modal and render profile list.
 */
export function openAgendaSettingsModal() {
  const modal = document.getElementById("agenda-settings-modal");
  if (!modal) return;

  const title = document.getElementById("agenda-modal-title");
  if (title) title.textContent = t("privateAgenda");

  renderAgendaSettingsList();
  modal.showModal();
}

/**
 * Close the agenda settings modal.
 */
export function closeAgendaSettingsModal() {
  const modal = document.getElementById("agenda-settings-modal");
  if (modal) modal.close();
  // Ensure scanner is stopped if it was running
  // Import dynamically to avoid circular deps? qr.js is independent; we can import at top
}

/**
 * Render the list of active profiles with agenda configuration panels.
 */
function renderAgendaSettingsList() {
  const container = document.getElementById("agenda-profiles-list");
  if (!container) return;
  container.innerHTML = "";

  const profiles = Profiles.getActiveProfiles();
  if (profiles.length === 0) {
    const p = document.createElement("p");
    p.style.textAlign = "center";
    p.style.opacity = "0.7";
    p.textContent = t("noSavedPrograms") || "No saved programs";
    container.appendChild(p);
    return;
  }

  profiles.forEach((profile) => {
    const panel = createProfileAgendaPanel(profile);
    container.appendChild(panel);
  });
}

/**
 * Create an accordion panel for a single profile's agenda settings.
 */
function createProfileAgendaPanel(profile) {
  const panel = document.createElement("div");
  panel.className = "agenda-setting-panel";
  panel.dataset.profileId = profile.id;

  const statusSummary = getAgendaStatusSummary(profile);

  // Header (clickable to toggle)
  const title = document.createElement("div");
  title.className = "setting-title";
  title.innerHTML = `
    <span class="status-icon">${statusSummary.icon}</span>
    <h3>${escapeHtml(profile.unitName)}${profile.stakeName ? ` (${escapeHtml(profile.stakeName)})` : ""}</h3>
  `;
  panel.appendChild(title);

  // Content (collapsible)
  const content = document.createElement("div");
  content.className = "setting-content";

  if (!profile.agendaUrl) {
    content.innerHTML = `
      <p>${t("agendaNoUrl")}</p>
      <button class="scan-agenda-btn" data-profile-id="${profile.id}">${t("scanAgendaQR")}</button>
      <div class="manual-agenda-url">
        <input type="text" class="agenda-url-input" placeholder="${t("agendaUrlPlaceholder")}">
        <button class="save-agenda-btn" data-profile-id="${profile.id}">${t("add") || "Add"}</button>
      </div>
      <div class="qr-scanner-container"></div>
      <div class="agenda-status-message"></div>
    `;
  } else {
    const displayUrl =
      profile.agendaUrl.length > 50
        ? profile.agendaUrl.substring(0, 50) + "..."
        : profile.agendaUrl;
    const agendaEditorUrl = `cms_agenda/index.html?profileId=${encodeURIComponent(profile.id)}`;
    content.innerHTML = `
      <p><strong>URL:</strong> ${escapeHtml(displayUrl)}</p>
      <p>${text("agendaEditorStatus", "Agenda editor")}: ${statusSummary.editorStatus}</p>
      <p>${text("agendaLegacyStatus", "Main app agenda")}: ${statusSummary.legacyStatus}</p>
      <a class="edit-agenda-btn" href="${agendaEditorUrl}">${t("editAgenda") || "Edit Agenda"}</a>
      <button class="scan-agenda-btn" data-profile-id="${profile.id}">${t("scanAgendaQR")}</button>
      <div class="manual-agenda-url">
        <input type="text" class="agenda-url-input" value="${escapeHtml(profile.agendaUrl)}">
        <button class="save-agenda-btn" data-profile-id="${profile.id}">${t("update") || "Update"}</button>
      </div>
      <div class="qr-scanner-container"></div>
      <div class="agenda-status-message"></div>
    `;
  }

  panel.appendChild(content);

  // Toggle panel content
  title.addEventListener("click", () => {
    panel.classList.toggle("active");
  });

  // Bind scan button
  const scanBtn = content.querySelector(".scan-agenda-btn");
  if (scanBtn) {
    scanBtn.onclick = (e) => {
      e.stopPropagation();
      currentEditingProfileId = profile.id;
      showScanner();
    };
  }

  // Bind save button
  const saveBtn = content.querySelector(".save-agenda-btn");
  if (saveBtn) {
    saveBtn.onclick = async (e) => {
      e.stopPropagation();
      const input = content.querySelector(".agenda-url-input");
      const url = (input.value || "").trim();
      if (!url) {
        setStatusMessage(content, "⚠️ URL cannot be empty", "error");
        return;
      }
      setStatusMessage(content, "⏳ Saving...", "info");
      await saveAgendaUrl(profile.id, url);
      // Refresh entire list to reflect changes
      renderAgendaSettingsList();
    };
  }

  return panel;
}

/**
 * Handle QR scanned event when modal is open.
 */
async function handleQrScanned(e) {
  const url = e.detail.url;
  if (!url) return;
  if (!currentEditingProfileId) return;

  const container = document.querySelector(
    `.agenda-setting-panel[data-profile-id="${currentEditingProfileId}"] .setting-content`
  );
  if (container) {
    setStatusMessage(container, "⏳ Saving...", "info");
  }

  await saveAgendaUrl(currentEditingProfileId, url);
  currentEditingProfileId = null;
  renderAgendaSettingsList();
}

/**
 * Save agenda URL for a profile: validate, fetch, cache, update profile.
 */
export async function saveAgendaUrl(profileId, url) {
  const profile = await Profiles.getProfile(profileId);
  if (!profile) {
    return;
  }

  profile.agendaUrl = url;
  profile.agendaValid = false;
  profile.agendaLastLoaded = null;
  await Profiles.updateProfile(profile);

  const currentSelected = Profiles.getSelectedProfileId();
  if (currentSelected && profile.id === currentSelected) {
    if (typeof window.loadAgendaForCurrentProfile === "function") {
      try {
        await window.loadAgendaForCurrentProfile(profile);
      } catch (err) {
        console.error("[Agenda] Failed to refresh legacy agenda state after save:", err);
      }
    }
  }
}

/**
 * Set a status message in the panel's message area.
 */
function setStatusMessage(contentEl, message, type) {
  let msgEl = contentEl.querySelector(".agenda-status-message");
  if (!msgEl) {
    msgEl = document.createElement("div");
    msgEl.className = "agenda-status-message";
    contentEl.appendChild(msgEl);
  }
  msgEl.textContent = message;
  if (type === "error") msgEl.style.color = "#d32f2f";
  else if (type === "success") msgEl.style.color = "#2e7d32";
  else msgEl.style.color = "inherit";
}

/**
 * Escape HTML to prevent XSS.
 */
function escapeHtml(text) {
  if (typeof text !== "string") return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

