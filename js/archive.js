import * as Profiles from "./profiles.js";
import { getProfileArchives, getStorageInfo } from "./auto-archive.js";
import { parseCSV } from "./utils/csv.js";
import { renderProgram } from "./utils/renderers.js";

let currentProfile = null;
let archives = [];

function init() {
  const backToHomeBtn = document.getElementById("back-to-home-btn");
  const backToListBtn = document.getElementById("back-to-list-btn");

  // Back to Home button - goes back to index.html
  backToHomeBtn.onclick = () => {
    window.location.href = "./index.html";
  };

  // Back to List button - shows the archive list
  backToListBtn.onclick = showArchiveList;

  // Get current profile
  currentProfile = Profiles.getCurrentProfile();

  if (!currentProfile) {
    document.getElementById("archive-title").textContent = "No Profile Selected";
    document.getElementById("no-archives").classList.remove("hidden");
    document.getElementById("no-archives").innerHTML = `
      <p>No profile selected.</p>
      <button onclick="window.location.href='./index.html'" class="qr-action-btn">Go to Home</button>
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

function showStorageInfo() {
  const storageInfo = document.getElementById("storage-info");
  const warningEl = document.getElementById("storage-warning");
  const summaryEl = document.getElementById("storage-summary");

  const info = getStorageInfo();

  summaryEl.textContent = `Storage: ${info.totalSizeMB}MB / ${info.maxSizeMB}MB (${info.totalEntries} archives)`;

  if (info.warning) {
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

  if (archives.length === 0) {
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
    loadBtn.textContent = "View";
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

  // Render the program
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
