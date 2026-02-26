import { showScanner } from "./qr.js";
import * as Profiles from "./profiles.js";
import { hasLegacyProfiles, migrateLegacyProfiles } from "./data/ProfileManager.js";
import * as ArchiveManager from "./data/ArchiveManager.js";
import { t, getLanguage, initI18n, setLanguage } from "./i18n/index.js";
import { fetchSheet, parseCSV } from "./utils/csv.js";
import { createWorker } from "./workers/workerInterface.js";
import {
  renderers,
  renderProgram,
  renderUnitName,
  renderUnitAddress,
  renderDate,
  renderLineBreak,
  splitHymn,
  splitLeadership,
  appendRow,
  appendRowHymn,
  renderSpeaker,
  renderLeader,
  renderGeneralStatementWithLink,
  renderGeneralStatement,
  renderLink,
  renderLinkWithSpace
} from "./utils/renderers.js";
import { saveProgramHistory, getProgramHistory, cleanupHistory } from "./history.js";
import { initShareUI, promptPWAInstall } from "./share.js";
import { checkMigrationRequired } from "./data/MigrationSystem.js";
import { showMigrationBanner, resetMigrationBannerSession } from "./data/MigrationBanner.js";

// ------------------------------------------------------------
// 4. Theme Logic
// ------------------------------------------------------------
function initTheme() {
  const savedTheme = localStorage.getItem("theme");
  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

  const applyTheme = (theme) => {
    document.documentElement.setAttribute("data-theme", theme);
  };

  // 1. Determine initial theme
  let theme = savedTheme;
  if (!theme) {
    theme = mediaQuery.matches ? "dark" : "light";
  }
  applyTheme(theme);

  // 2. Setup Toggle Button
  const toggleBtn = document.getElementById("theme-toggle");
  if (toggleBtn) {
    toggleBtn.onclick = () => {
      const currentTheme = document.documentElement.getAttribute("data-theme");
      const newTheme = currentTheme === "dark" ? "light" : "dark";
      applyTheme(newTheme);
      localStorage.setItem("theme", newTheme);
    };
  }

  // 3. Listen for system changes (only if no manual preference set)
  mediaQuery.addEventListener("change", (e) => {
    if (!localStorage.getItem("theme")) {
      applyTheme(e.matches ? "dark" : "light");
    }
  });
}

// ------------------------------------------------------------
// 7. UI FUNCTIONS
// ------------------------------------------------------------

function fetchWithTimeout(url, ms) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ms);

  return fetch(url, { signal: controller.signal })
    .then((r) => {
      if (!r.ok) throw new Error("Network error");
      return r.text();
    })
    .catch((err) => {
      if (err.name === "AbortError") {
        throw new Error("Timeout");
      }
      throw err;
    })
    .finally(() => {
      clearTimeout(timeoutId);
    });
}

function showOfflineBanner() {
  const banner = document.getElementById("offline-banner");
  if (!banner) return;
  banner.innerHTML = `${t("offlineMode")} &nbsp; <a href="#" id="retry-offline" style="color: #fff; text-decoration: underline;">${t("tryNow")}</a>`;
  banner.classList.add("visible");

  const retryBtn = document.getElementById("retry-offline");
  if (retryBtn) {
    retryBtn.onclick = (e) => {
      e.preventDefault();
      init();
    };
  }
}

function initNetworkStatus() {
  const statusEl = document.getElementById("network-status");
  if (!statusEl) return;

  const iconEl = statusEl.querySelector(".status-icon");
  const textEl = statusEl.querySelector(".status-text");
  const lastSyncEl = statusEl.querySelector(".last-sync");

  const updateStatus = () => {
    const isOnline = navigator.onLine;

    if (isOnline) {
      iconEl.textContent = "🌐";
      textEl.textContent = "Online";
      statusEl.classList.remove("offline");
      statusEl.classList.add("online");
      statusEl.classList.remove("hidden");

      const lastUpdated = localStorage.getItem("programLastUpdatedDate");
      if (lastUpdated) {
        lastSyncEl.textContent = `Last sync: ${lastUpdated}`;
      } else {
        lastSyncEl.textContent = "";
      }

      setTimeout(() => {
        statusEl.classList.add("hidden");
      }, 3000);
    } else {
      iconEl.textContent = "📱";
      textEl.textContent = "Working offline";
      statusEl.classList.remove("online");
      statusEl.classList.add("offline");
      statusEl.classList.remove("hidden");

      const lastUpdated = localStorage.getItem("programLastUpdatedDate");
      if (lastUpdated) {
        lastSyncEl.textContent = `Last updated: ${lastUpdated}`;
      } else {
        lastSyncEl.textContent = "";
      }
    }
  };

  window.addEventListener("online", () => {
    updateStatus();
  });

  window.addEventListener("offline", () => {
    updateStatus();
  });

  updateStatus();
}

function initPrintButton() {
  const printBtn = document.getElementById("print-btn");
  if (!printBtn) return;

  printBtn.addEventListener("click", () => {
    window.print();
  });
}

function updateTimestamp() {
  const el = document.getElementById("last-updated");
  const now = new Date();

  const options = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  };

  const datePart = now.toLocaleDateString(undefined, options);
  const hh = now.getHours().toString().padStart(2, "0");
  const mm = now.getMinutes().toString().padStart(2, "0");

  el.textContent = `${t("lastUpdated")} ${datePart} at ${hh}:${mm}`;
  el.classList.remove("hidden");

  // Save specific date for Sunday logic
  const todayKey = now.toISOString().split("T")[0]; // YYYY-MM-DD
  localStorage.setItem("programLastUpdatedDate", todayKey);
}

function handleVersionVisibility() {
  const appVersion = document.getElementById("app-version");
  if (!appVersion) return;

  const THRESHOLD = 120;
  let ticking = false; // prevents redundant work

  function update() {
    ticking = false;

    const scrollBottom = window.innerHeight + window.scrollY;
    const docHeight = document.documentElement.scrollHeight;

    const nearBottom = docHeight - scrollBottom <= THRESHOLD;
    appVersion.classList.toggle("visible", nearBottom);
  }

  function onScroll() {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  update(); // run once on load
}

/**
 * Simple debounce utility
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// ------------------------------------------------------------
// 7. Initialize
// ------------------------------------------------------------
async function init() {
  const main = document.getElementById("main-program");
  const pageContainer = document.getElementById("page-container");

  // Show spinner
  if (pageContainer) pageContainer.classList.add("loading");
  main.classList.add("loading");

  try {
    console.log("[INIT] Starting initialization...");

    // 0. Cleanup old history entries
    cleanupHistory();

    // 0b. Migrate legacy localStorage profiles to IndexedDB
    if (await hasLegacyProfiles()) {
      console.log("[INIT] Found legacy profiles, migrating to IndexedDB...");
      const result = await migrateLegacyProfiles();
      if (result.success) {
        console.log(`[INIT] Migrated ${result.migrated} profiles`);
      } else {
        console.warn("[INIT] Migration failed:", result.message);
      }
    }

    // 1. Initialize profiles from IndexedDB (including migrated data)
    await Profiles.initProfiles();
    console.log("[INIT] Profiles loaded:", Profiles.getProfiles().length);

    // 2. Setup UI for Profiles (dropdown population)
    initProfileUI();

    // 2. Determine URL to load
    const params = new URLSearchParams(window.location.search);
    let sheetUrl = params.get("url");
    let currentProfile = Profiles.getCurrentProfile();

    // Migration logic for legacy localStorage
    if (!currentProfile && !sheetUrl) {
      const legacyUrl = localStorage.getItem("sheetUrl");
      if (legacyUrl) {
        sheetUrl = legacyUrl;
      }
    } else if (currentProfile && !sheetUrl) {
      sheetUrl = currentProfile.url;
    }

    // 3. Setup UI Selectors
    const actionBtn = document.getElementById("qr-action-btn");
    const header = document.getElementById("program-header");
    const reloadBtn = document.getElementById("reload-btn");

    // New structure selectors
    const churchContainer = document.querySelector(".church-name-container");
    const welcomeBar = document.querySelector(".welcome-bar");
    const welcomeText = document.getElementById("welcome-to-text");
    const themeToggle = document.getElementById("theme-toggle");
    const unitHeader = document.querySelector(".sacrament-unit-header");

    // --- ZERO STATE (No sheetUrl found) ---
    if (!sheetUrl) {
      console.log("[INIT] No sheetUrl found, entering zero state.");

      actionBtn.textContent = t("scanProgramQR");
      actionBtn.onclick = () => showScanner();

      // Show header container so the language selector is visible
      header.classList.remove("hidden");

      // Keep only the Welcome Bar (container for language) visible
      if (welcomeBar) welcomeBar.classList.remove("hidden");

      // Hide everything else
      if (churchContainer) churchContainer.classList.add("hidden");
      if (unitHeader) unitHeader.classList.add("hidden");
      if (welcomeText) welcomeText.classList.add("hidden");
      if (themeToggle) themeToggle.classList.add("hidden");
      if (reloadBtn) reloadBtn.classList.add("hidden");

      // Hide main program area and clean up loading state
      main.classList.add("hidden");
      main.classList.remove("loading");
      if (pageContainer) pageContainer.classList.remove("loading");
      return;
    }

    // --- ACTIVE STATE (Program loaded) ---
    console.log("[INIT] sheetUrl identified:", sheetUrl);

    actionBtn.textContent = t("useNewQR");
    actionBtn.onclick = () => showScanner();

    // Show all header components
    header.classList.remove("hidden");
    if (churchContainer) churchContainer.classList.remove("hidden");
    if (welcomeBar) welcomeBar.classList.remove("hidden");
    if (welcomeText) welcomeText.classList.remove("hidden");
    if (themeToggle) themeToggle.classList.remove("hidden");
    if (unitHeader) unitHeader.classList.remove("hidden");

    reloadBtn.classList.remove("hidden");
    reloadBtn.onclick = () => location.reload();

    // Ensure main program area is visible
    main.classList.remove("hidden");

    // 4. Update Selector State for Profiles
    if (currentProfile) {
      const selector = document.getElementById("profile-selector");
      if (selector) selector.value = currentProfile.id;
    }

    // 5. Fetch & Render Logic
    try {
      const csv = await fetchWithTimeout(sheetUrl, 8000);
      const rows = await createWorker("parseCSV", csv);

      // Identify Unit/Stake from fresh data
      const unitName = rows.find((r) => r.key === "unitName")?.value || "Unknown Unit";
      const stakeName = rows.find((r) => r.key === "stakeName")?.value || "";

      // UPDATE METADATA for current profile
      if (currentProfile) {
        await Profiles.addProfile(currentProfile.url, unitName, stakeName);
        initProfileUI();
      }

      // Handle Profile Creation from URL param or legacy localStorage
      if (!currentProfile && sheetUrl) {
        await Profiles.addProfile(sheetUrl, unitName, stakeName);
        localStorage.removeItem("sheetUrl");
        initProfileUI();
      }

      localStorage.setItem("programCache", JSON.stringify(rows));
      main.innerHTML = "";
      renderProgram(rows);

      // Add archive view class if viewing archived program
      const loadedProfile = Profiles.getCurrentProfile();
      if (loadedProfile && loadedProfile.archived) {
        document.body.classList.add("archive-view");
      } else {
        document.body.classList.remove("archive-view");
      }

      // Auto-archive if program date exists
      const programDate = rows.find((r) => r.key === "date")?.value || "";
      let archiveResult = null;
      if (loadedProfile && programDate) {
        // Archive the program data
        archiveResult = await ArchiveManager.autoArchive(loadedProfile.id, programDate, rows);
        if (archiveResult.archived) {
          console.log(
            `Program auto-archived: ${programDate} (${archiveResult.updated ? "updated" : "new"})`
          );
        } else {
          console.log(`Program not archived: ${archiveResult.reason}`);
        }
      }

      // Check for migration requirement
      if (loadedProfile) {
        const migrationCheck = await checkMigrationRequired(loadedProfile.id, rows);
        if (migrationCheck.required && migrationCheck.url) {
          showMigrationBanner(loadedProfile.id, migrationCheck.url);
        }
      }

      // Save to history (not from cache - this is fresh network fetch)
      if (loadedProfile && programDate) {
        saveProgramHistory(loadedProfile.id, programDate, rows, { isFromCache: false });
      }

      updateTimestamp();
    } catch (err) {
      console.warn("Failed to fetch sheet:", err);

      if (localStorage.getItem("sheetUrl") === sheetUrl) {
        localStorage.removeItem("sheetUrl");
      }

      const cached = localStorage.getItem("programCache");
      if (cached) {
        main.innerHTML = "";
        const cachedRows = JSON.parse(cached);
        renderProgram(cachedRows);

        // Add archive view class if viewing archived program
        const cachedProfile = Profiles.getCurrentProfile();
        if (cachedProfile && cachedProfile.archived) {
          document.body.classList.add("archive-view");
        } else {
          document.body.classList.remove("archive-view");
        }

        updateTimestamp();
        showOfflineBanner();

        const cachedDate = cachedRows.find((r) => r.key === "date")?.value || "";
        let cachedArchiveResult = null;
        if (cachedProfile && cachedDate) {
          // Auto-archive the cached program data
          cachedArchiveResult = await ArchiveManager.autoArchive(
            cachedProfile.id,
            cachedDate,
            cachedRows
          );
          if (cachedArchiveResult.archived) {
            console.log(
              `Cached program auto-archived: ${cachedDate} (${cachedArchiveResult.updated ? "updated" : "new"})`
            );
          }
        }

        // Optionally save cached version to history
        if (cachedProfile && cachedDate) {
          saveProgramHistory(cachedProfile.id, cachedDate, cachedRows, { isFromCache: true });
        }
      } else {
        main.innerHTML = `<div style="text-align:center; padding: 20px;">
           <p>${t("unableToLoad")}</p>
           <button onclick="location.reload()" class="qr-action-btn">${t("retry")}</button>
          </div>`;
      }
    }
  } finally {
    main.classList.remove("loading");
    if (pageContainer) pageContainer.classList.remove("loading");
    handleVersionVisibility();
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ------------------------------------------------------------
// 8. Profile Management UI
// ------------------------------------------------------------

function initProfileUI() {
  const container = document.getElementById("profile-selector-container");
  const selector = document.getElementById("profile-selector");
  const manageBtn = document.getElementById("manage-profiles-btn");
  const backToHomeBtn = document.getElementById("back-to-home-btn");

  if (!container || !selector) return;

  const profiles = Profiles.getActiveProfiles();
  const currentProfile = Profiles.getCurrentProfile();
  const isViewingArchive = currentProfile && currentProfile.archived;

  if (backToHomeBtn) {
    if (isViewingArchive) {
      backToHomeBtn.classList.remove("hidden");
      backToHomeBtn.onclick = async () => {
        const activeProfiles = Profiles.getActiveProfiles();
        if (activeProfiles.length > 0) {
          activeProfiles.sort((a, b) => b.lastUsed - a.lastUsed);
          await Profiles.selectProfile(activeProfiles[0].id);
          location.reload();
        } else {
          localStorage.removeItem("meeting_program_selected_id");
          window.history.replaceState({}, document.title, window.location.pathname);
          location.reload();
        }
      };
    } else {
      backToHomeBtn.classList.add("hidden");
    }
  }

  if (profiles.length === 0 && !isViewingArchive) {
    container.classList.add("hidden");
  } else {
    container.classList.remove("hidden");

    selector.innerHTML = "";
    profiles.forEach((p) => {
      const opt = document.createElement("option");
      opt.value = p.id;
      opt.textContent = `${p.unitName} ${p.stakeName ? `(${p.stakeName})` : ""}`;
      selector.appendChild(opt);
    });

    if (isViewingArchive) {
      const opt = document.createElement("option");
      opt.value = currentProfile.id;
      opt.textContent = `${currentProfile.unitName} (Archived)`;
      opt.selected = true;
      selector.appendChild(opt);
      selector.disabled = true;
    } else {
      selector.value = Profiles.getSelectedProfileId();
      selector.disabled = false;
    }

    selector.onchange = async (e) => {
      const newId = e.target.value;
      await Profiles.selectProfile(newId);
      location.reload();
    };
  }

  if (manageBtn) {
    manageBtn.onclick = openManageModal;
  }

  const viewArchivesBtn = document.getElementById("view-archives-btn");
  if (viewArchivesBtn) {
    viewArchivesBtn.onclick = () => {
      window.location.href = "./archive.html";
    };
  }

  const updateBtn = document.getElementById("update-btn");
  if (updateBtn) {
    updateBtn.onclick = async () => {
      const { checkForUpdates } = await import("./update-manager.js");
      await checkForUpdates(true);
    };
  }

  renderProfileCards();
}

function renderProfileCards() {
  const container = document.getElementById("profile-cards-container");
  if (!container) {
    createProfileCardsContainer();
    return;
  }

  const profiles = Profiles.getProfiles();
  const currentProfile = Profiles.getCurrentProfile();

  container.innerHTML = "";

  // First card: Scan for New Program
  const addCard = document.createElement("div");
  addCard.className = "profile-card add-profile-card";
  addCard.setAttribute("role", "button");
  addCard.setAttribute("tabindex", "0");
  addCard.innerHTML = `
    <div class="profile-card-content" style="text-align: center;">
      <div class="profile-card-name">+ Scan for New Program</div>
    </div>
  `;
  addCard.addEventListener("click", () => showScanner());
  addCard.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      showScanner();
    }
  });
  container.appendChild(addCard);

  // Second card: Active profile (if exists)
  if (currentProfile) {
    const card = createProfileCard(currentProfile, true, false);
    container.appendChild(card);
  }

  // Rest: Inactive profiles
  const inactiveProfiles = profiles.filter((p) => p.inactive && p.id !== currentProfile?.id);
  inactiveProfiles.forEach((p) => {
    const card = createProfileCard(p, false, true);
    container.appendChild(card);
  });
}

function createProfileCardsContainer() {
  const container = document.getElementById("profile-selector-container");
  if (!container) return;

  const cardsContainer = document.createElement("div");
  cardsContainer.id = "profile-cards-container";
  cardsContainer.className = "profile-cards-container";

  container.appendChild(cardsContainer);

  renderProfileCards();
}

function createProfileCard(profile, isSelected, isInactive) {
  const card = document.createElement("div");
  card.className = `profile-card${isSelected ? " selected" : ""}`;
  card.setAttribute("role", "button");
  card.setAttribute("tabindex", "0");
  card.setAttribute("aria-pressed", isSelected);

  const statusDot = document.createElement("div");
  statusDot.className = "profile-status-dot";

  if (profile.obsolete) {
    statusDot.classList.add("migration");
  } else if (isInactive) {
    statusDot.classList.add("inactive");
  } else {
    statusDot.classList.add("active");
  }

  const content = document.createElement("div");
  content.className = "profile-card-content";

  const name = document.createElement("div");
  name.className = "profile-card-name";
  name.textContent = profile.unitName;

  const details = document.createElement("div");
  details.className = "profile-card-details";
  if (profile.stakeName) {
    details.textContent = profile.stakeName;
  }

  const meta = document.createElement("div");
  meta.className = "profile-card-meta";
  const lastUsedDate = new Date(profile.lastUsed);
  meta.textContent = `Last used: ${lastUsedDate.toLocaleDateString()}`;

  content.appendChild(name);
  if (profile.stakeName) {
    content.appendChild(details);
  }
  content.appendChild(meta);

  card.appendChild(statusDot);
  card.appendChild(content);

  card.addEventListener("click", async () => {
    await Profiles.selectProfile(profile.id);
    location.reload();
  });

  card.addEventListener("keydown", async (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      await Profiles.selectProfile(profile.id);
      location.reload();
    }
  });

  return card;
}

function filterProfiles(query) {
  const container = document.getElementById("profile-cards-container");
  if (!container) return;

  const cards = container.querySelectorAll(".profile-card");
  const lowerQuery = query.toLowerCase();

  cards.forEach((card) => {
    const name = card.querySelector(".profile-card-name")?.textContent?.toLowerCase() || "";
    const details = card.querySelector(".profile-card-details")?.textContent?.toLowerCase() || "";

    if (name.includes(lowerQuery) || details.includes(lowerQuery)) {
      card.style.display = "flex";
    } else {
      card.style.display = "none";
    }
  });
}

async function openArchivesModal() {
  const modal = document.getElementById("view-archives-modal");
  const closeBtn = document.getElementById("close-archives-modal-btn");
  const list = document.getElementById("archived-programs-list");

  if (!modal || !list) return;

  const archivedPrograms = ArchiveManager.getProfileArchives(currentProfile.id);

  list.innerHTML = "";

  // If there's an active profile, show option to deactivate it
  if (currentProfile && !currentProfile.inactive) {
    const deactivateCurrentLi = document.createElement("li");
    deactivateCurrentLi.style.flexDirection = "column";
    deactivateCurrentLi.style.alignItems = "flex-start";
    deactivateCurrentLi.style.padding = "16px";

    const deactivateLabel = document.createElement("span");
    deactivateLabel.style.fontWeight = "bold";
    deactivateLabel.textContent = `Deactivate: ${currentProfile.unitName}`;

    const deactivateBtn = document.createElement("button");
    deactivateBtn.className = "deactivate-btn";
    deactivateBtn.style.marginTop = "8px";
    deactivateBtn.textContent = "Deactivate Profile";
    deactivateBtn.onclick = async () => {
      if (confirm(`Deactivate ${currentProfile.unitName}?`)) {
        await Profiles.deactivateProfile(currentProfile.id);
        openArchivesModal(); // Refresh the modal
      }
    };

    deactivateCurrentLi.appendChild(deactivateLabel);
    deactivateCurrentLi.appendChild(deactivateBtn);
    list.appendChild(deactivateCurrentLi);
  }

  if (!archivedPrograms || archivedPrograms.length === 0) {
    list.innerHTML += "<li style='justify-content:center;opacity:0.6;'>No archived programs</li>";
  } else {
    archivedPrograms.forEach((p) => {
      const li = document.createElement("li");
      li.className = "archive-item";

      const info = document.createElement("div");
      info.className = "archive-info";

      const date = document.createElement("span");
      date.className = "archive-date";
      date.textContent = p.programDate || "Unknown Date";

      info.appendChild(date);

      const actions = document.createElement("div");
      actions.className = "archive-actions";

      const loadBtn = document.createElement("button");
      loadBtn.className = "primary-btn";
      loadBtn.style.padding = "6px 12px";
      loadBtn.style.fontSize = "0.85rem";
      loadBtn.textContent = "View";
      loadBtn.onclick = () => {
        const archiveUrl = `archive.html?profileId=${currentProfile.id}&date=${encodeURIComponent(p.programDate)}`;
        window.location.href = archiveUrl;
      };

      const deleteBtn = document.createElement("button");
      deleteBtn.className = "secondary-btn";
      deleteBtn.style.padding = "6px 12px";
      deleteBtn.style.fontSize = "0.85rem";
      deleteBtn.textContent = "Delete";
      deleteBtn.onclick = async () => {
        if (confirm(`Delete archive for ${p.programDate}?`)) {
          await ArchiveManager.deleteArchive(currentProfile.id, p.programDate);
          openArchivesModal(); // Refresh
        }
      };

      actions.appendChild(loadBtn);
      actions.appendChild(deleteBtn);

      li.appendChild(info);
      li.appendChild(actions);
      list.appendChild(li);
    });
  }

  modal.showModal();

  if (closeBtn) {
    closeBtn.onclick = () => modal.close();
  }
}

function openManageModal() {
  const modal = document.getElementById("manage-profiles-modal");
  const closeBtn = document.getElementById("close-modal-btn");
  const addBtn = document.getElementById("add-new-program-btn");

  if (!modal) return;

  // Render list
  renderManageList();

  modal.showModal();

  closeBtn.onclick = () => modal.close();
  addBtn.onclick = () => {
    modal.close();
    showScanner();
  };
}

function renderManageList() {
  const list = document.getElementById("profiles-list");
  const archivedSection = document.getElementById("archived-section");
  const archivedList = document.getElementById("archived-list");
  if (!list) return;

  const profiles = Profiles.getProfiles();
  const activeProfiles = profiles.filter((p) => !p.inactive);
  const inactiveProfiles = profiles.filter((p) => p.inactive);

  list.innerHTML = "";

  if (activeProfiles.length === 0) {
    list.innerHTML = `<li style="justify-content:center; opacity:0.6;">${t("noSavedPrograms")}</li>`;
  } else {
    const currentProfile = Profiles.getCurrentProfile();

    activeProfiles.forEach((p) => {
      const li = createProfileListItem(p, currentProfile, profiles.length, false);
      list.appendChild(li);
    });
  }

  // Show inactive section if there are inactive profiles
  if (archivedSection && archivedList) {
    if (inactiveProfiles.length > 0) {
      archivedSection.classList.remove("hidden");
      archivedList.innerHTML = "";
      const currentProfile = Profiles.getCurrentProfile();

      inactiveProfiles.forEach((p) => {
        const li = createProfileListItem(p, currentProfile, profiles.length, true);
        archivedList.appendChild(li);
      });
    } else {
      archivedSection.classList.add("hidden");
      archivedList.innerHTML = "";
    }
  }
}

function createProfileListItem(p, currentProfile, totalProfiles, isInactive) {
  const li = document.createElement("li");

  const info = document.createElement("div");
  info.className = "profile-info";

  const unit = document.createElement("span");
  unit.className = "profile-unit";
  unit.textContent = p.unitName;

  const stake = document.createElement("span");
  stake.className = "profile-stake";
  stake.textContent = p.stakeName || "";

  info.appendChild(unit);
  info.appendChild(stake);

  const actionsDiv = document.createElement("div");

  if (isInactive) {
    const reactivateBtn = document.createElement("button");
    reactivateBtn.className = "reactivate-btn";
    reactivateBtn.textContent = t("reactivate") || "Reactivate";
    reactivateBtn.onclick = async () => {
      await Profiles.reactivateProfile(p.id);
      renderManageList();
      initProfileUI();
    };
    actionsDiv.appendChild(reactivateBtn);

    const delBtn = document.createElement("button");
    delBtn.className = "delete-btn";
    delBtn.textContent = t("delete");
    delBtn.onclick = async () => {
      if (confirm(`${t("remove")} ${p.unitName}?`)) {
        await Profiles.removeProfile(p.id);
        renderManageList();
      }
    };
    actionsDiv.appendChild(delBtn);
  } else {
    const deactivateBtn = document.createElement("button");
    deactivateBtn.className = "deactivate-btn";
    deactivateBtn.textContent = t("deactivate") || "Deactivate";
    const isActive = currentProfile && currentProfile.id === p.id;
    const isLastProgram = totalProfiles === 1;
    if (isActive || isLastProgram) {
      deactivateBtn.disabled = true;
    }
    deactivateBtn.onclick = async () => {
      if (confirm(`Deactivate ${p.unitName}?`)) {
        await Profiles.deactivateProfile(p.id);
        renderManageList();
        initProfileUI();
        if (isActive) {
          location.reload();
        }
      }
    };
    actionsDiv.appendChild(deactivateBtn);

    const delBtn = document.createElement("button");
    delBtn.className = "delete-btn";
    delBtn.textContent = t("delete");
    if (isActive && !isLastProgram) {
      delBtn.disabled = true;
    }
    delBtn.onclick = async () => {
      if (confirm(`${t("remove")} ${p.unitName}?`)) {
        const currentProfile = Profiles.getCurrentProfile();
        const wasActive = currentProfile && currentProfile.id === p.id;

        await Profiles.removeProfile(p.id);

        if (wasActive) {
          location.reload();
        } else {
          renderManageList();
          initProfileUI();
        }
      }
    };
    actionsDiv.appendChild(delBtn);
  }

  li.appendChild(info);
  li.appendChild(actionsDiv);
  return li;
}

// Global listener for QR Scanned
window.addEventListener("qr-scanned", async (e) => {
  const url = e.detail.url;
  if (!url) return;

  // Ensure profiles are initialized before accessing
  await Profiles.initProfiles();

  try {
    const csv = await fetchWithTimeout(url, 5000);
    const rows = await createWorker("parseCSV", csv);

    const unitName = rows.find((r) => r.key === "unitName")?.value || "Unknown Unit";
    const stakeName = rows.find((r) => r.key === "stakeName")?.value || "";

    // Check if profile already exists
    const profiles = Profiles.getProfiles();
    const existingProfile = profiles.find((p) => p.url === url);

    // Skip onboarding help modal when switching profiles via QR
    localStorage.setItem("meeting_program_help_shown", "true");

    if (existingProfile) {
      // Profile exists - just switch to it without modal
      await Profiles.selectProfile(existingProfile.id);
      location.reload();
      return;
    }

    // 2. Show Confirm Modal for new profile
    const modal = document.getElementById("confirm-program-modal");
    const nameEl = document.getElementById("new-program-name");
    const addBtn = document.getElementById("confirm-add-btn");
    const cancelBtn = document.getElementById("cancel-add-btn");

    if (modal) {
      console.log("[MAIN] Modal found, showing...");
      nameEl.textContent = `${unitName} ${stakeName ? `(${stakeName})` : ""}`;
      // ... setup buttons
      addBtn.onclick = async () => {
        await Profiles.addProfile(url, unitName, stakeName);
        modal.close();
        location.reload();
      };
      cancelBtn.onclick = () => {
        modal.close();
        location.reload();
      };

      modal.showModal();
      console.log("[MAIN] modal.showModal() called");
    } else {
      // Fallback ...
      if (confirm(`Add Program: ${unitName}?`)) {
        await Profiles.addProfile(url, unitName, stakeName);
        location.reload();
      } else {
        location.reload();
      }
    }
  } catch (err) {
    console.error("QR Scan Fetch Failed:", err);
    alert("Could not load program from that QR code. Please try again.");
    location.reload();
  }
});

async function updateStaticStrings() {
  const sacramentTitle = document.getElementById("sacrament-services-title");
  if (sacramentTitle) {
    sacramentTitle.textContent = t("sacramentServices");
  }

  const churchNameDisplay = document.getElementById("church-name-display");
  if (churchNameDisplay) {
    churchNameDisplay.innerHTML = t("churchName");
  }

  const reloadBtn = document.getElementById("reload-btn");
  if (reloadBtn) {
    reloadBtn.textContent = t("reloadProgram");
  }

  const updateNotification = document.getElementById("update-notification");
  if (updateNotification && !updateNotification.hidden) {
    updateNotification.innerHTML = `${t("updateAvailable")} <button onclick="refreshPage()">${t("update")}</button>`;
  }

  const manageBtn = document.getElementById("manage-profiles-btn");
  if (manageBtn) {
    manageBtn.setAttribute("aria-label", t("managePrograms"));
  }

  const addNewProgramBtn = document.getElementById("add-new-program-btn");
  if (addNewProgramBtn) {
    addNewProgramBtn.textContent = t("scanNewProgram");
  }

  const closeModalBtn = document.getElementById("close-modal-btn");
  if (closeModalBtn) {
    closeModalBtn.textContent = t("close");
  }

  const themeToggle = document.getElementById("theme-toggle");
  if (themeToggle) {
    themeToggle.setAttribute("aria-label", t("toggleDarkMode"));
  }

  const welcomeToText = document.getElementById("welcome-to-text");
  if (welcomeToText) {
    welcomeToText.textContent = t("welcomeTo");
  }

  const manageTitle = document.getElementById("manage-profiles-title");
  if (manageTitle) {
    manageTitle.textContent = t("managePrograms");
  }

  const confirmTitle = document.getElementById("confirm-program-title");
  if (confirmTitle) {
    confirmTitle.textContent = t("addProgram");
  }

  const languageModalTitle = document.getElementById("language-modal-title");
  if (languageModalTitle) {
    languageModalTitle.textContent = t("selectLanguage");
  }

  const closeLanguageModalBtn = document.getElementById("close-language-modal-btn");
  if (closeLanguageModalBtn) {
    closeLanguageModalBtn.textContent = t("close");
  }

  const historyModalTitle = document.getElementById("history-modal-title");
  if (historyModalTitle) {
    historyModalTitle.textContent = t("programHistory");
  }

  const closeHistoryModalBtn = document.getElementById("close-history-modal-btn");
  if (closeHistoryModalBtn) {
    closeHistoryModalBtn.textContent = t("close");
  }

  const offlineBanner = document.getElementById("offline-banner");
  if (offlineBanner) {
    // Preserving the retry link structure
    offlineBanner.innerHTML = `${t("offlineMode")} &nbsp; <a href="#" id="retry-offline" style="color: inherit; text-decoration: underline">${t("tryNow")}</a>`;
    const retryBtn = document.getElementById("retry-offline");
    if (retryBtn) {
      retryBtn.onclick = (e) => {
        e.preventDefault();
        location.reload();
      };
    }
  }

  const loadingText = document.querySelector(".loading-text");
  if (loadingText) {
    loadingText.textContent = t("loading");
  }

  const actionBtn = document.getElementById("qr-action-btn");
  if (actionBtn) {
    const params = new URLSearchParams(window.location.search);
    const hasUrl =
      params.get("url") || Profiles.getCurrentProfile() || localStorage.getItem("sheetUrl");
    actionBtn.textContent = hasUrl ? t("useNewQR") : t("scanProgramQR");
  }

  const foundLabel = document.getElementById("found-label");
  if (foundLabel) {
    foundLabel.textContent = t("found");
  }

  const confirmAddBtn = document.getElementById("confirm-add-btn");
  if (confirmAddBtn) {
    confirmAddBtn.textContent = t("add");
  }

  const cancelAddBtn = document.getElementById("cancel-add-btn");
  if (cancelAddBtn) {
    cancelAddBtn.textContent = t("cancel");
  }

  const churchSvgText = document.getElementById("church-svg-text");
  if (churchSvgText) {
    const tspans = churchSvgText.getElementsByTagName("tspan");
    if (tspans.length >= 2) {
      // Logic to split churchName if it contains "of" or similar?
      // For now, let's just use the full string if it fits or hardcode split for known languages.
      // Better yet, just use t("churchName") and handle it more gracefully.
      const fullChurchName = t("churchName");
      if (fullChurchName.length > 30) {
        // Simple attempt to split at "of" or "de" or "la" etc
        const splitters = ["of ", " de ", " la ", " La "];
        let splitIdx = -1;
        for (const s of splitters) {
          splitIdx = fullChurchName.indexOf(s);
          if (splitIdx !== -1) {
            tspans[0].textContent = fullChurchName.substring(0, splitIdx).trim();
            tspans[1].textContent = fullChurchName.substring(splitIdx).trim();
            break;
          }
        }
        if (splitIdx === -1) {
          tspans[0].textContent = fullChurchName;
          tspans[1].textContent = "";
        }
      } else {
        tspans[0].textContent = fullChurchName;
        tspans[1].textContent = "";
      }
    }
  }
}

function initLanguageSelector() {
  const btn = document.getElementById("language-selector-btn");
  if (!btn) return;

  btn.addEventListener("click", openLanguageModal);

  // Set initial text
  const currentLang = getLanguage();
  const langNames = {
    en: "English",
    es: "Español",
    fr: "Français",
    swa: "Kiswahili"
  };
  const textEl = document.getElementById("current-language-text");
  if (textEl) textEl.textContent = langNames[currentLang] || currentLang;
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
          updateStaticStrings();
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

function initHistoryUI() {
  const historyBtn = document.getElementById("history-btn");
  if (!historyBtn) return;

  historyBtn.onclick = openHistoryModal;
}

function openHistoryModal() {
  const modal = document.getElementById("history-modal");
  const closeBtn = document.getElementById("close-history-modal-btn");

  if (!modal) return;

  renderHistoryList();
  modal.showModal();

  if (closeBtn) {
    closeBtn.onclick = () => modal.close();
  }
}

function renderHistoryList() {
  const list = document.getElementById("history-list");
  if (!list) return;

  const currentProfile = Profiles.getCurrentProfile();
  if (!currentProfile) {
    list.innerHTML = `<li style="justify-content:center; opacity:0.6;">${t("noHistory")}</li>`;
    return;
  }

  const history = getProgramHistory(currentProfile.id);

  if (history.length === 0) {
    list.innerHTML = `<li style="justify-content:center; opacity:0.6;">${t("noHistory")}</li>`;
    return;
  }

  list.innerHTML = "";

  history.forEach((entry) => {
    const li = document.createElement("li");
    li.className = "history-item";

    const info = document.createElement("div");
    info.className = "history-info";

    const date = document.createElement("span");
    date.className = "history-date";
    date.textContent = entry.date;

    info.appendChild(date);

    const loadBtn = document.createElement("button");
    loadBtn.className = "load-history-btn";
    loadBtn.textContent = t("loadProgram");
    loadBtn.onclick = () => {
      loadProgramFromHistory(entry.data);
      document.getElementById("history-modal").close();
    };

    li.appendChild(info);
    li.appendChild(loadBtn);
    list.appendChild(li);
  });
}

function loadProgramFromHistory(rows) {
  const main = document.getElementById("main-program");
  main.innerHTML = "";
  renderProgram(rows);
  updateTimestamp();
}

if (typeof window !== "undefined" && !window.__VITEST__) {
  // Check for force update parameter
  const urlParams = new URLSearchParams(window.location.search);
  const forceUpdate = urlParams.get("forceUpdate") === "true";
  const nocache = urlParams.get("nocache") === "true";

  if (forceUpdate || nocache) {
    // Remove both parameters and reload with clean URL
    urlParams.delete("forceUpdate");
    urlParams.delete("nocache");

    // Add timestamp to bust any browser cache
    urlParams.set("t", Date.now().toString());

    const newUrl = window.location.pathname + "?" + urlParams.toString();

    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ action: "skipWaiting" });
      setTimeout(() => {
        window.location.href = newUrl;
      }, 1000);
    } else {
      // No SW, just reload with cache-busted URL
      window.location.href = newUrl;
    }
  }

  const debouncedHandleVisibility = debounce(handleVersionVisibility, 100);
  window.addEventListener("scroll", debouncedHandleVisibility);
  window.addEventListener("resize", debouncedHandleVisibility);

  window.addEventListener("online", () => {
    const banner = document.getElementById("offline-banner");
    if (banner) {
      banner.classList.remove("visible");
    }
    // Auto-refresh program when back online
    init();
  });

  document.getElementById("main-program").classList.add("loading");

  // after renderProgram(...)
  document.getElementById("main-program").classList.remove("loading");

  // Run once on load
  handleVersionVisibility();

  initTheme();
  initI18n();
  initNetworkStatus();
  initPrintButton();
  updateStaticStrings();
  initLanguageSelector();
  initHistoryUI();
  initShareUI();
  promptPWAInstall();
  init();
}

export {
  splitHymn,
  splitLeadership,
  appendRow,
  appendRowHymn,
  renderSpeaker,
  renderLeader,
  renderGeneralStatementWithLink,
  renderGeneralStatement,
  renderLink,
  renderLinkWithSpace,
  renderProgram,
  init,
  fetchSheet,
  parseCSV,
  fetchWithTimeout,
  renderLineBreak,
  renderDate,
  renderUnitAddress,
  renderUnitName,
  renderers
};
