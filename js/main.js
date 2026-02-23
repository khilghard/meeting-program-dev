// main.js
import { showScanner } from "./qr.js";
import { sanitizeEntry, isSafeUrl } from "./sanitize.js";
import * as Profiles from "./profiles.js";

// ------------------------------------------------------------
// 1. Fetch CSV from a dynamic Google Sheets URL
// ------------------------------------------------------------
async function fetchSheet(sheetUrl) {
  if (!sheetUrl) {
    console.warn("No sheet URL provided. Program will not load.");
    return null;
  }

  let url = sheetUrl;
  if (!url.includes("tqx=out:csv")) {
    if (url.endsWith("/")) url = url.slice(0, -1);
    url = url + "/gviz/tq?tqx=out:csv";
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const text = await response.text();
  return parseCSV(text);
}

// ------------------------------------------------------------
// 2. Parse CSV into an array of { key, value }
// ------------------------------------------------------------
function parseCSV(csv) {
  const rows = [];
  let currentRow = [];
  let currentField = "";
  let inQuotes = false;

  const str = csv.trim();

  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    const nextChar = str[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentField += '"';
        i++; // skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      currentRow.push(currentField);
      currentField = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") i++; // skip \n in \r\n
      currentRow.push(currentField);
      currentField = "";
      if (currentRow.length > 0) rows.push(currentRow);
      currentRow = [];
    } else {
      currentField += char;
    }
  }

  // push last field and row
  currentRow.push(currentField);
  if (currentRow.length > 0) rows.push(currentRow);

  const result = [];
  // assume first line is header
  rows.slice(1).forEach((row) => {
    const [rawKey, rawValue] = row;
    const entry = sanitizeEntry(rawKey, rawValue);
    if (!entry) return;

    // replace ~ with comma
    if (entry.value) {
      entry.value = entry.value.replace(/~/g, ",");
    }

    result.push(entry);
  });

  return result;
}

// ------------------------------------------------------------
// 3. RENDERERS (DOM-safe, no innerHTML)
// ------------------------------------------------------------
function renderSpeaker(name) {
  appendRow("Speaker", name, "speaker");
}

function renderIntermediateHymn(name) {
  appendRowHymn("Intermediate Hymn", name, "intermediateHymn");
}

function renderOpeningHymn(name) {
  appendRowHymn("Opening Hymn", name, "openingHymn");
}

function renderClosingHymn(name) {
  appendRowHymn("Closing Hymn", name, "closingHymn");
}

function renderHymn(name) {
  appendRowHymn("Hymn", name, "hymn");
}

function renderSacramentHymn(name) {
  appendRowHymn("Sacrament Hymn", name, "sacramentHymn");
}

function renderOpeningPrayer(name) {
  appendRow("Invocation", name, "openingPrayer");
}

function renderClosingPrayer(name) {
  appendRow("Benediction", name, "closingPrayer");
}

function renderPresiding(name) {
  appendRow("Presiding", name, "presiding");
}

function renderConducting(name) {
  appendRow("Conducting", name, "conducting");
}

function renderMusicDirector(name) {
  appendRow("Music Director", name, "musicDirector");
}

function renderOrganist(name) {
  appendRow("Organist", name, "musicOrganist");
}

function renderLeader(value) {
  const container = document.getElementById("main-program");
  const div = document.createElement("div");

  const leaderSplit = splitLeadership(value);

  const row = document.createElement("div");
  row.className = "leader-of-dots hymn-row";

  const labelSpan = document.createElement("span");
  labelSpan.className = "label";
  labelSpan.textContent = leaderSplit.name;

  const dotsSpan = document.createElement("span");
  dotsSpan.className = "dots";

  const valueSpan = document.createElement("span");
  valueSpan.className = "value-on-right";
  valueSpan.textContent = leaderSplit.position;

  row.appendChild(labelSpan);
  row.appendChild(dotsSpan);
  row.appendChild(valueSpan);

  const phoneDiv = document.createElement("div");
  phoneDiv.className = "hymn-title";
  phoneDiv.textContent = leaderSplit.phone;

  div.appendChild(row);
  div.appendChild(phoneDiv);

  container.appendChild(div);
}

function renderGeneralStatementWithLink(value) {
  const container = document.getElementById("main-program");
  const div = document.createElement("div");

  const [textPart, urlPart] = value.split("|").map(s => s.trim());
  if (!textPart || !urlPart) return;

  const safeUrl = urlPart.startsWith("http") ? urlPart : `https://${urlPart}`;
  if (!isSafeUrl(safeUrl)) return;

  const wrapper = document.createElement("div");
  wrapper.className = "general-statement";

  // Split around <LINK> placeholder
  const parts = textPart.split("<LINK>");
  // text before link
  if (parts[0]) {
    wrapper.appendChild(document.createTextNode(parts[0]));
  }

  // link itself
  const link = document.createElement("a");
  link.href = safeUrl;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.className = "general-link";
  link.textContent = urlPart;
  wrapper.appendChild(link);

  // text after link
  if (parts[1]) {
    wrapper.appendChild(document.createTextNode(parts[1]));
  }

  div.appendChild(wrapper);
  container.appendChild(div);
}

function renderGeneralStatement(value) {
  const container = document.getElementById("main-program");
  const div = document.createElement("div");
  div.className = "general-statement";
  div.textContent = value;
  container.appendChild(div);
}

function renderLink(value) {
  const container = document.getElementById("main-program");
  const div = document.createElement("div");
  div.className = "link-center";

  const [text, url] = value.split("|").map(s => s.trim());
  if (!text || !url) return;

  const safeUrl = url.startsWith("http") ? url : `https://${url}`;
  if (!isSafeUrl(safeUrl)) return;

  const a = document.createElement("a");
  a.href = safeUrl;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  a.textContent = text;

  div.appendChild(a);
  container.appendChild(div);
}

function renderLinkWithSpace(value) {
  const container = document.getElementById("main-program");
  const div = document.createElement("div");
  div.className = "link-with-space";

  const [textRaw, urlRaw, imgLinkRaw] = value.split("|").map(s => s.trim());
  if (!textRaw || !urlRaw) return;

  const safeUrl = urlRaw.startsWith("http") ? urlRaw : `https://${urlRaw}`;
  if (!isSafeUrl(safeUrl)) return;

  const text = textRaw.replace("<IMG>", "").trim();

  const inner = document.createElement("div");
  inner.className = "link-with-space-inner";

  if (imgLinkRaw && imgLinkRaw.toUpperCase() !== "NONE" && isSafeUrl(imgLinkRaw)) {
    const img = document.createElement("img");
    img.src = imgLinkRaw;
    img.className = "link-icon";
    img.setAttribute("role", "presentation");
    inner.appendChild(img);
  }

  const a = document.createElement("a");
  a.href = safeUrl;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  a.textContent = text;

  inner.appendChild(a);
  div.appendChild(inner);
  container.appendChild(div);
}

function appendRow(label, value, id) {
  const container = document.getElementById("main-program");
  const div = document.createElement("div");
  div.id = id;

  const row = document.createElement("div");
  row.className = "leader-of-dots";

  const labelSpan = document.createElement("span");
  labelSpan.className = "label";
  labelSpan.textContent = label;

  const dotsSpan = document.createElement("span");
  dotsSpan.className = "dots";

  const valueSpan = document.createElement("span");
  valueSpan.className = "value-on-right";
  valueSpan.textContent = value;

  row.appendChild(labelSpan);
  row.appendChild(dotsSpan);
  row.appendChild(valueSpan);

  div.appendChild(row);
  container.appendChild(div);
}

function appendRowHymn(label, value, id) {
  const container = document.getElementById("main-program");
  const div = document.createElement("div");
  div.id = id;

  const { number, title } = splitHymn(value);

  const row = document.createElement("div");
  row.className = "leader-of-dots hymn-row";

  const labelSpan = document.createElement("span");
  labelSpan.className = "label";
  labelSpan.textContent = label;

  const dotsSpan = document.createElement("span");
  dotsSpan.className = "dots";

  const valueSpan = document.createElement("span");
  valueSpan.className = "value-on-right";
  valueSpan.textContent = number;

  row.appendChild(labelSpan);
  row.appendChild(dotsSpan);
  row.appendChild(valueSpan);

  const titleDiv = document.createElement("div");
  titleDiv.className = "hymn-title";
  titleDiv.textContent = title;

  div.appendChild(row);
  div.appendChild(titleDiv);

  container.appendChild(div);
}

function splitHymn(value) {
  const match = value.match(/^(#?\d+)\s*(.*)$/);
  if (!match) return { number: "", title: value };
  return { number: match[1], title: match[2] };
}

function splitLeadership(value) {
  const parts = value.split("|").map(p => p.trim());
  return {
    name: parts[0] || "",
    phone: parts[1] || "",
    position: parts[2] || "",
  };
}

function renderUnitName(name) {
  document.getElementById("unitname").textContent = name;
}

function renderUnitAddress(name) {
  document.getElementById("unitaddress").textContent = name;
}

function renderDate(name) {
  document.getElementById("date").textContent = name;
}

function renderLineBreak(value) {
  const container = document.getElementById("main-program");
  const hr = document.createElement("hr");
  hr.className = "hr-text";
  if (value) {
    hr.setAttribute("data-content", value);
  }
  container.appendChild(hr);
}

// ------------------------------------------------------------
// 4. Map keys → renderer functions
// ------------------------------------------------------------
const renderers = {
  unitName: renderUnitName,
  unitAddress: renderUnitAddress,
  date: renderDate,
  presiding: renderPresiding,
  conducting: renderConducting,
  hymn: renderHymn,
  openingHymn: renderOpeningHymn,
  openingPrayer: renderOpeningPrayer,
  sacramentHymn: renderSacramentHymn,
  speaker: renderSpeaker,
  intermediateHymn: renderIntermediateHymn,
  closingHymn: renderClosingHymn,
  closingPrayer: renderClosingPrayer,
  musicDirector: renderMusicDirector,
  musicOrganist: renderOrganist,
  horizontalLine: renderLineBreak,
  leader: renderLeader,
  generalStatementWithLink: renderGeneralStatementWithLink,
  generalStatement: renderGeneralStatement,
  link: renderLink,
  linkWithSpace: renderLinkWithSpace,
};

// ------------------------------------------------------------
// 5. Main render loop
// ------------------------------------------------------------
function renderProgram(rows) {
  rows.forEach(({ key, value }) => {
    const isHorizontalLine = key.toLowerCase() === "horizontalline";
    const isEmpty = !value || value.trim() === "";

    if (isEmpty && !isHorizontalLine) return;

    const renderer = renderers[key];
    if (renderer) renderer(value || "");
  });

  const alternateVersion = document.getElementById("the-version");
  if (alternateVersion) {
    alternateVersion.classList.remove("hidden");
  }
}

// ------------------------------------------------------------
// 6. Theme Logic
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
  banner.innerHTML = 'Showing last available program (offline mode) &nbsp; <a href="#" id="retry-offline" style="color: #fff; text-decoration: underline;">Try Now</a>';
  banner.classList.add("visible");

  const retryBtn = document.getElementById("retry-offline");
  if (retryBtn) {
    retryBtn.onclick = (e) => {
      e.preventDefault();
      init();
    };
  }
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

  el.textContent = `Last updated ${datePart} at ${hh}:${mm}`;
  el.classList.remove("hidden");

  // Save specific date for Sunday logic
  const todayKey = now.toISOString().split("T")[0]; // YYYY-MM-DD
  localStorage.setItem("programLastUpdatedDate", todayKey);
}

function handleVersionVisibility() {
  const appVersion = document.getElementById('app-version');
  if (!appVersion) return;

  const THRESHOLD = 120;
  let ticking = false; // prevents redundant work

  function update() {
    ticking = false;

    const scrollBottom = window.innerHeight + window.scrollY;
    const docHeight = document.documentElement.scrollHeight;

    const nearBottom = docHeight - scrollBottom <= THRESHOLD;
    appVersion.classList.toggle('visible', nearBottom);
  }

  function onScroll() {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
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
    // 1. Setup UI for Profiles
    initProfileUI();

    // 2. Determine URL to load
    const params = new URLSearchParams(window.location.search);
    let sheetUrl = params.get("url");
    let currentProfile = Profiles.getCurrentProfile();

    // Migration: If no profiles but legacy localStorage exists
    if (!currentProfile && !sheetUrl) {
      const legacyUrl = localStorage.getItem("sheetUrl");
      if (legacyUrl) {
        // Create a temporary profile for migration
        // We don't have the name yet, so we'll fetch it, then save.
        // For now, just use the URL.
        sheetUrl = legacyUrl;
      }
    } else if (currentProfile && !sheetUrl) {
      sheetUrl = currentProfile.url;
    }

    // 3. Setup Buttons & Header state
    const actionBtn = document.getElementById("qr-action-btn");
    const header = document.getElementById("program-header");
    const reloadBtn = document.getElementById("reload-btn");

    if (!sheetUrl) {
      // No program at all - Zero State
      actionBtn.textContent = "Scan Program QR Code";
      actionBtn.onclick = () => showScanner();
      header.classList.add("hidden");
      reloadBtn.classList.add("hidden");

      // Hide main program area and clean up loading state
      main.classList.add("hidden");
      main.classList.remove("loading");
      if (pageContainer) pageContainer.classList.remove("loading");
      return;
    }

    // We have a URL
    actionBtn.textContent = "Use New QR Code";
    actionBtn.onclick = () => showScanner();
    header.classList.remove("hidden");
    reloadBtn.classList.remove("hidden");
    reloadBtn.onclick = () => location.reload();

    // Ensure main program area is visible
    main.classList.remove("hidden");

    // 4. Update Selector State
    if (currentProfile) {
      const selector = document.getElementById("profile-selector");
      if (selector) selector.value = currentProfile.id;
    }

    // 5. Fetch & Render
    try {
      // Sunday Auto-Update Logic (simplified)
      // We always fetch for now.

      const csv = await fetchWithTimeout(sheetUrl, 8000);
      const rows = parseCSV(csv);

      // Identify Unit/Stake from fresh data
      const unitName = rows.find(r => r.key === "unitName")?.value || "Unknown Unit";
      const stakeName = rows.find(r => r.key === "stakeName")?.value || "";

      // UPDATE METADATA for current profile
      if (currentProfile) {
        // This updates the existing profile object in storage
        Profiles.addProfile(currentProfile.url, unitName, stakeName);
        // Re-render selector to show new names immediately
        initProfileUI();
      }

      // If we are migrating (legacy URL exists but no profile), assume this is the one
      if (!currentProfile && !params.get("url")) {
        // Migrate!
        Profiles.addProfile(sheetUrl, unitName, stakeName);
        localStorage.removeItem("sheetUrl"); // Clear legacy
        initProfileUI(); // Re-render selector
      }

      localStorage.setItem("programCache", JSON.stringify(rows));
      main.innerHTML = "";
      renderProgram(rows);
      updateTimestamp();
    } catch (err) {
      console.warn("Failed to fetch sheet:", err);
      console.warn("Sheet URL was:", sheetUrl);

      // If this was a migration attempt that failed, clear the bad legacy data
      if (localStorage.getItem("sheetUrl") === sheetUrl) {
        console.warn("Clearing invalid legacy sheet URL.");
        localStorage.removeItem("sheetUrl");
      }

      const cached = localStorage.getItem("programCache");
      // Check if the cached version matches our current URL? 
      // Ideally we'd store cache per profile, but for now global cache acts as "last viewed"

      if (cached) {
        main.innerHTML = "";
        renderProgram(JSON.parse(cached));
        updateTimestamp();
        showOfflineBanner();
      } else {
        main.innerHTML = `<div style="text-align:center; padding: 20px;">
           <p>Unable to load program.</p>
           <button onclick="location.reload()" class="qr-action-btn">Retry</button>
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

  if (!container || !selector) return;

  const profiles = Profiles.getProfiles();

  // Hide if 0 or 1 profile? Or always show if 1? 
  // Requirement: "way to select between codes"
  if (profiles.length === 0) {
    container.classList.add("hidden");
  } else {
    container.classList.remove("hidden");

    // Populate
    selector.innerHTML = "";
    profiles.forEach(p => {
      const opt = document.createElement("option");
      opt.value = p.id;
      opt.textContent = `${p.unitName} ${p.stakeName ? `(${p.stakeName})` : ""}`;
      selector.appendChild(opt);
    });

    selector.value = Profiles.getSelectedProfileId();

    // Event listeners
    selector.onchange = (e) => {
      const newId = e.target.value;
      Profiles.selectProfile(newId);
      location.reload();
    };
  }

  // Manage Button
  if (manageBtn) {
    manageBtn.onclick = openManageModal;
  }
}

function openManageModal() {
  const modal = document.getElementById("manage-profiles-modal");
  const list = document.getElementById("profiles-list");
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
  if (!list) return;

  const profiles = Profiles.getProfiles();
  list.innerHTML = "";

  if (profiles.length === 0) {
    list.innerHTML = `<li style="justify-content:center; opacity:0.6;">No saved programs</li>`;
    return;
  }

  profiles.forEach(p => {
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

    const delBtn = document.createElement("button");
    delBtn.className = "delete-btn";
    delBtn.textContent = "Delete";
    delBtn.onclick = () => {
      if (confirm(`Remove ${p.unitName}?`)) {
        const currentProfile = Profiles.getCurrentProfile();
        const wasActive = currentProfile && currentProfile.id === p.id;

        Profiles.removeProfile(p.id);

        if (wasActive) {
          // If we deleted the active program, we must reload to reset state
          // or switch to the new active one.
          location.reload();
        } else {
          renderManageList(); // Just re-render list if background program is untouched
        }
      }
    };

    li.appendChild(info);
    li.appendChild(delBtn);
    list.appendChild(li);
  });
}

// Global listener for QR Scanned
window.addEventListener("qr-scanned", async (e) => {
  const url = e.detail.url;
  if (!url) return;

  // 1. Fetch metadata
  const main = document.getElementById("main-program");
  // main.innerHTML = ... (loading)

  try {
    const csv = await fetchWithTimeout(url, 5000);
    const rows = parseCSV(csv);

    const unitName = rows.find(r => r.key === "unitName")?.value || "Unknown Unit";
    const stakeName = rows.find(r => r.key === "stakeName")?.value || "";

    // 2. Show Confirm Modal
    const modal = document.getElementById("confirm-program-modal");
    const nameEl = document.getElementById("new-program-name");
    const addBtn = document.getElementById("confirm-add-btn");
    const cancelBtn = document.getElementById("cancel-add-btn");

    if (modal) {
      console.log('[MAIN] Modal found, showing...');
      nameEl.textContent = `${unitName} ${stakeName ? `(${stakeName})` : ""}`;
      // ... setup buttons
      addBtn.onclick = () => {
        Profiles.addProfile(url, unitName, stakeName);
        modal.close();
        location.reload();
      };
      cancelBtn.onclick = () => {
        modal.close();
        location.reload();
      };

      modal.showModal();
      console.log('[MAIN] modal.showModal() called');
    } else {
      // Fallback ...
      if (confirm(`Add Program: ${unitName}?`)) {
        Profiles.addProfile(url, unitName, stakeName);
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

if (typeof window !== "undefined" && !window.__VITEST__) {
  const debouncedHandleVisibility = debounce(handleVersionVisibility, 100);
  window.addEventListener("scroll", debouncedHandleVisibility);
  window.addEventListener("resize", debouncedHandleVisibility);

  window.addEventListener("online", () => {
    const banner = document.getElementById("offline-banner");
    if (banner) {
      banner.classList.remove("visible");
    }
  });

  document.getElementById("main-program").classList.add("loading");

  // after renderProgram(...)
  document.getElementById("main-program").classList.remove("loading");

  // Run once on load
  handleVersionVisibility();

  initTheme();
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
