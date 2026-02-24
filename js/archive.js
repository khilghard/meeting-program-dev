import * as Profiles from "./profiles.js";
import { getProfileArchives, getStorageInfo } from "./auto-archive.js";
import { parseCSV } from "./utils/csv.js";
import { renderProgram } from "./utils/renderers.js";
import { t, getLanguage, initI18n, setLanguage } from "./i18n/index.js";

let currentProfile = null;
let archives = [];

const langNames = {
  en: "English",
  es: "Español",
  fr: "Français",
  swa: "Kiswahili"
};

// Theme Logic
function initTheme() {
  const savedTheme = localStorage.getItem("theme");
  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

  const applyTheme = (theme) => {
    document.documentElement.setAttribute("data-theme", theme);
  };

  let theme = savedTheme;
  if (!theme) {
    theme = mediaQuery.matches ? "dark" : "light";
  }
  applyTheme(theme);

  mediaQuery.addEventListener("change", (e) => {
    if (!localStorage.getItem("theme")) {
      applyTheme(e.matches ? "dark" : "light");
    }
  });
}

function init() {
  initI18n();
  initTheme();

  const backToHomeBtn = document.getElementById("back-to-home-btn");
  const backToListBtn = document.getElementById("back-to-list-btn");
  const langBtn = document.getElementById("language-selector-btn");

  // Back to Home button - goes back to index.html
  backToHomeBtn.textContent = t("backToHome");
  backToHomeBtn.onclick = () => {
    window.location.href = "./index.html";
  };

  // Back to List button - shows the archive list
  backToListBtn.onclick = showArchiveList;

  // Language selector
  langBtn.onclick = openLanguageModal;
  updateLanguageButton();

  // Get current profile
  currentProfile = Profiles.getCurrentProfile();

  if (!currentProfile) {
    document.getElementById("archive-title").textContent = t("noProfileSelected");
    document.getElementById("no-archives").classList.remove("hidden");
    document.getElementById("no-archives").innerHTML = `
      <p>${t("noProfileSelected")}</p>
      <button onclick="window.location.href='./index.html'" class="qr-action-btn">${t("goToHome")}</button>
    `;
    return;
  }

  // Get archives for current profile
  archives = getProfileArchives(currentProfile.id);

  // Update UI with profile name
  document.getElementById("archive-unit-name").textContent = currentProfile.unitName;

  // Show storage info
  showStorageInfo();

  // Show archive list
  showArchiveList();
}

function updateLanguageButton() {
  const currentLang = getLanguage();
  const textEl = document.getElementById("current-language-text");
  if (textEl) {
    textEl.textContent = langNames[currentLang] || currentLang;
  }
}

function openLanguageModal() {
  const modal = document.getElementById("language-modal");
  const closeBtn = document.getElementById("close-language-modal-btn");

  if (!modal) return;

  renderLanguageList();
  modal.showModal();

  if (closeBtn) {
    closeBtn.onclick = () => modal.close();
  }
}

function renderLanguageList() {
  const list = document.getElementById("language-list");
  if (!list) return;

  const languages = [
    { code: "en", name: "English" },
    { code: "es", name: "Español" },
    { code: "fr", name: "Français" },
    { code: "swa", name: "Kiswahili" }
  ];

  const currentLang = getLanguage();
  list.innerHTML = "";

  languages.forEach((lang) => {
    const li = document.createElement("li");
    li.className = "language-item";
    li.onclick = () => {
      setLanguage(lang.code).then(() => {
        setTimeout(() => {
          location.reload();
        }, 50);
      });
    };

    const nameSpan = document.createElement("span");
    nameSpan.className = "language-name";
    nameSpan.textContent = lang.name;

    li.appendChild(nameSpan);

    if (lang.code === currentLang) {
      const check = document.createElement("span");
      check.className = "selected-check";
      check.textContent = "✓";
      li.appendChild(check);
    }

    list.appendChild(li);
  });
}

function showStorageInfo() {
  const storageInfo = document.getElementById("storage-info");
  const warningEl = document.getElementById("storage-warning");
  const summaryEl = document.getElementById("storage-summary");

  const info = getStorageInfo();

  summaryEl.textContent = t("storageUsage")
    .replace("{used}", info.totalSizeMB)
    .replace("{max}", info.maxSizeMB)
    .replace("{count}", info.totalEntries);

  if (info.warning) {
    warningEl.textContent = "⚠️ " + t("storageWarning");
    warningEl.classList.remove("hidden");
  }

  storageInfo.classList.remove("hidden");
}

function showArchiveList() {
  const listView = document.getElementById("archive-list-view");
  const programView = document.getElementById("archive-program-view");
  const listEl = document.getElementById("archives-list");
  const noArchivesEl = document.getElementById("no-archives");

  // Show list view, hide program view
  listView.classList.remove("hidden");
  programView.classList.add("hidden");

  // Clear existing list
  listEl.innerHTML = "";

  // Update title with translation
  document.getElementById("archive-title").textContent = t("programArchives");

  if (archives.length === 0) {
    noArchivesEl.innerHTML = `
      <p>${t("noArchives")}</p>
      <p>${t("archivesCreatedAutomatically")}</p>
    `;
    noArchivesEl.classList.remove("hidden");
    return;
  }

  noArchivesEl.classList.add("hidden");

  // Populate list
  archives.forEach((archive, index) => {
    const li = document.createElement("li");
    li.className = "archive-item";

    const dateEl = document.createElement("div");
    dateEl.className = "archive-date";
    dateEl.textContent = archive.programDate;

    const actionsEl = document.createElement("div");
    actionsEl.className = "archive-actions";

    const loadBtn = document.createElement("button");
    loadBtn.className = "primary-btn";
    loadBtn.textContent = t("viewArchive");
    loadBtn.onclick = () => loadArchive(index);

    actionsEl.appendChild(loadBtn);
    li.appendChild(dateEl);
    li.appendChild(actionsEl);
    listEl.appendChild(li);
  });
}

function loadArchive(index) {
  const archive = archives[index];
  if (!archive) return;

  // Parse the CSV data and render it
  const rows = archive.csvData;
  if (!rows || !Array.isArray(rows)) {
    alert("Archive data is corrupted or missing");
    return;
  }

  // Switch views
  const listView = document.getElementById("archive-list-view");
  const programView = document.getElementById("archive-program-view");

  listView.classList.add("hidden");
  programView.classList.remove("hidden");

  // Update back button text
  document.getElementById("back-to-list-btn").textContent = "← " + t("backToArchiveList");

  // Render the program (will use correct language via t())
  const main = document.getElementById("main-program");
  main.innerHTML = "";
  renderProgram(rows);

  // Update header info
  const unitNameEl = document.getElementById("unitname");
  const unitAddressEl = document.getElementById("unitaddress");
  const dateEl = document.getElementById("date");

  if (unitNameEl) {
    const unitNameRow = rows.find((r) => r.key === "unitName");
    unitNameEl.textContent = unitNameRow ? unitNameRow.value : currentProfile.unitName;
  }

  if (unitAddressEl) {
    const unitAddressRow = rows.find((r) => r.key === "unitAddress");
    unitAddressEl.textContent = unitAddressRow ? unitAddressRow.value : "";
  }

  if (dateEl) {
    dateEl.textContent = archive.programDate;
  }
}

init();
