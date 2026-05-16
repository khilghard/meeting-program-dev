# Hybrid Leadership Agenda with Toggle – Final Implementation Plan

**Status**: Approved – Ready for Implementation  
**Created**: 2025-04-19 (revised 2025-04-20)  
**Feature**: Leadership‑only agenda that appears **in situ** within the main program via a toggle switch. Content is sourced from a separate Google Sheet and injected at placeholder positions marked by `agenda_*` keys in the main sheet.

---

## Table of Contents

1. [Overview](#overview)
2. [CSV Sheet Formats](#csv-sheet-formats)
3. [Data Flow & Rendering](#data-flow--rendering)
4. [User Interface](#user-interface)
5. [Database & State](#database--state)
6. [Archiving](#archiving)
7. [Internationalization](#internationalization)
8. [Styling](#styling)
9. [Implementation Checklist](#implementation-checklist)
10. [Testing Scenarios](#testing-scenarios)
11. [Documentation & Operations](#documentation--operations)
12. [Risks & Mitigations](#risks--mitigations)

---

## Overview

This feature allows leadership teams to view supplementary notes, announcements, and business details that are hidden from the general membership. The main sacrament program sheet contains placeholder rows with `agenda_*` keys. When a leadership agenda URL is configured, the app fetches a second Google Sheet that provides the actual content for those placeholders. A **briefcase (👔) toggle** in the header switches between:

- **Public View** – shows only standard rows; all `agenda_*` rows are completely hidden.
- **Leadership Agenda View** – replaces each placeholder with an accordion panel (lock icon 🔒) containing the leadership content, placed exactly where the placeholder was in the main sheet.

**Key Properties**:

- No mixing of public and leadership rows in either view.
- Toggle visible only when a valid `agendaUrl` is saved **and** at least one placeholder has matching content.
- Agenda panels are **collapsed by default** in leadership view; user can expand as the meeting progresses.
- A ✅ checkmark appears on any `agendaBusiness*` panel that has content, giving a quick indicator of stake business presence.
- All data remains client‑side; agenda URL is stored per profile in IndexedDB.
- Offline support: agenda CSV cached separately.

---

## CSV Sheet Formats

### Main Sheet (Public)

Two columns only:

| Column A | Column B |
| -------- | -------- |
| `key`    | `value`  |

- For regular program rows: `key` is a standard key (e.g., `openingHymn`, `speaker1`); `value` holds the displayed content.
- For leadership placeholders: `key` starts with `agenda_` (see list below); `value` holds an **agendaId** that links to the agenda sheet. The actual content lives in the agenda sheet, not here.

**Example**:

```csv
key,value
unitName,Mountain View
date,March 29, 2026
presiding,President Smith
agendaAnnouncements,ann1
agendaAckVisitingLeaders,vis1
agendaBusinessReleases,releases1
agendaBusinessCallings,callings1
```

You can have multiple placeholders of the same type at different positions; each must have a unique (or reused) `agendaId` that matches an entry in the agenda sheet.

### Agenda Sheet (Private)

Columns:

| key | agendaId | value1 | value2 | value3 | … (up to valueN) |
| --- | -------- | ------ | ------ | ------ | ---------------- |

- `key`: must be an `agenda_*` key (same set as in the main sheet).
- `agendaId`: must exactly match the `value` from the corresponding placeholder row in the main sheet.
- `value1`, `value2`, … : each non‑empty cell becomes a list item in the rendered agenda panel. Do **not** number them manually; the app will render them as list items. If you prefer numbers, you may include them in the cell text.

**Example**:

```csv
key,agendaId,value1,value2,value3
agendaAnnouncements,ann1,"Cleaning on Saturday.","Valentine's dance Friday.","Building maintenance next week."
agendaAckVisitingLeaders,vis1,"High Councilman Brother Schultz","Sister Johnson (Relief Society)"
agendaBusinessReleases,releases1,"Brother Smith – released as Elders Quorum president","Sister Jones – released as Relief Society president"
agendaBusinessCallings,callings1,"Brother Taylor – called as new Elders Quorum president","Sister Lee – called as new Relief Society president"
```

---

## Agenda Placeholder Keys (Fixed Set)

The app recognizes the following `agenda_*` keys. If you use a key not in this list, it will still render as a generic agenda panel, but for consistency use these:

| Key                         | Section Title (EN) | Notes                                                              |
| --------------------------- | ------------------ | ------------------------------------------------------------------ |
| `agendaGeneral`             | General Notes      | Rendered as paragraphs (each value cell = separate paragraph)      |
| `agendaAnnouncements`       | Announcements      | Rendered as a bulleted list (each value cell = list item)          |
| `agendaAckVisitingLeaders`  | Visiting Leaders   | Rendered as a bulleted list                                        |
| `agendaBusiness`            | Business           | Parent section; ✅ shown if any business sub‑sections have content |
| `agendaBusinessReleases`    | Releases           | Rendered as a bulleted list                                        |
| `agendaBusinessCallings`    | Callings           | Rendered as a bulleted list                                        |
| `agendaBusinessPriesthood`  | Priesthood         | Rendered as a bulleted list; ordinations, advancements             |
| `agendaBusinessNewMoveIns`  | New Move‑Ins       | Rendered as a bulleted list                                        |
| `agendaBusinessNewConverts` | New Converts       | Rendered as a bulleted list                                        |
| `agendaBusinessGeneral`     | Other Business     | Rendered as a bulleted list                                        |

---

## Data Flow & Rendering

### Global State

```javascript
let mainRows = []; // parsed from main CSV, in original order
let agendaMap = new Map(); // key = `${key}|${agendaId}`, value = { values: [value1, value2, …] }
let hasAgendaContent = false; // true if any agenda row with non‑empty values exists
let currentView = "program"; // 'program' or 'agenda'
```

### Fetch & Parse Sequence

1. Load main program CSV → `mainRows`.
2. If `profile.agendaUrl` is set and valid, fetch agenda CSV:
   - Parse each row, extract non‑empty `value*` columns into array.
   - Populate `agendaMap` using `${key}|${agendaId}` as composite key.
   - Set `hasAgendaContent` if any row has at least one non‑empty value.
   - Set `profile.agendaValid = true` and `agendaLastLoaded = Date.now()`.
3. If agenda fetch fails, fall back to cached agenda CSV (key `agendaCache_${profileId}`); if still missing, `agendaValid = false` and leadership view disabled.
4. After both main and agenda are ready, render according to `currentView`.

### Render Logic

```javascript
function renderMain() {
  const mainEl = document.getElementById("main-program");
  mainEl.innerHTML = "";

  if (currentView === "program") {
    // Public: filter out all agenda_* rows
    const publicRows = mainRows.filter((r) => !r.key.startsWith("agenda_"));
    renderProgram(publicRows); // existing bulk renderer
  } else {
    // Leadership: iterate mainRows in original order
    mainRows.forEach((row) => {
      if (row.key.startsWith("agenda_")) {
        const mapKey = `${row.key}|${row.value}`; // row.value is agendaId
        const entry = agendaMap.get(mapKey);
        if (entry && entry.values.length > 0) {
          const panel = createAgendaAccordionPanel(row.key, entry.values);
          mainEl.appendChild(panel);
        }
        // else skip – no matching agenda content
      } else {
        // Normal row – render single row (use existing per‑row renderer)
        renderSingleRow(row);
      }
    });
  }

  // Show/hide toggle button based on agenda validity and content presence
  const toggleBtn = document.getElementById("agenda-toggle-btn");
  if (toggleBtn) {
    toggleBtn.style.display = profile.agendaValid && hasAgendaContent ? "inline-block" : "none";
  }
}
```

**Note**: `renderSingleRow` can be extracted from the existing `renderers` dispatcher. Alternatively, call `renderProgram` on a filtered array and interleave agenda panels manually. The simplest is to loop and call the appropriate renderer from `renderers` for non‑agenda rows.

### Accordion Panel Creation

```javascript
export function createAgendaAccordionPanel(key, items) {
  const section = document.createElement("section");
  section.className = "agenda-panel collapsed"; // collapsed by default

  // Header
  const header = document.createElement("div");
  header.className = "panel-header";
  const lockIcon = document.createElement("span");
  lockIcon.className = "lock-icon";
  lockIcon.textContent = "🔒";
  const title = document.createElement("h3");
  title.className = "panel-title";
  const baseTitle = t(key) !== key ? t(key) : capitalizeKey(key);

  // Add ✅ if this is a business sub‑section with content
  title.textContent = isBusinessKey(key) ? `${baseTitle} ✅` : baseTitle;

  header.appendChild(lockIcon);
  header.appendChild(title);
  section.appendChild(header);

  const content = document.createElement("div");
  content.className = "panel-content";

  // Special case: agendaGeneral renders as paragraphs; all others as a bulleted list
  if (key === "agendaGeneral") {
    items.forEach((item) => {
      const p = document.createElement("p");
      p.textContent = item;
      content.appendChild(p);
    });
  } else {
    const ul = document.createElement("ul");
    items.forEach((item) => {
      const li = document.createElement("li");
      li.textContent = item; // plain text; preserve any "1." numbering
      ul.appendChild(li);
    });
    content.appendChild(ul);
  }

  section.appendChild(content);

  // Toggle on click
  header.addEventListener("click", () => {
    section.classList.toggle("collapsed");
  });

  return section;
}
```

---

## User Interface

### Toggle Button

- **Location**: In the header button row, after the existing fourth button.
- **HTML**: `<button id="agenda-toggle-btn" class="icon-btn" aria-label="Toggle Leadership Agenda">👔</button>`
- **Visibility**: Hidden until an agenda URL is configured **and** at least one `agenda_*` placeholder has corresponding content.
- **Behavior**: Click toggles between public and leadership views; persists preference in `sessionStorage` and URL (`?view=agenda`).

### Leadership View Banner (Optional)

If desired, a small banner at the top of the main content area can say `🔒 Leadership Agenda – Confidential`. This can be toggled via a CSS class on `<main>`.

---

## Database & State

No new database fields are needed beyond the existing `agendaUrl`, `agendaLastLoaded`, and `agendaValid` in the `profiles` store.

**State variables** (module‑level in `main.js`):

```javascript
let mainRows = [];
let agendaMap = new Map();
let hasAgendaContent = false;
let currentView = "program"; // default
```

Initialize on program load:

```javascript
// After parsing main CSV
mainRows = rows;

// If agendaUrl valid, fetch and fill agendaMap, then set currentView from sessionStorage
if (profile.agendaValid && agendaMap.size > 0) {
  currentView = sessionStorage.getItem("agendaView") || "program";
  renderMain();
}
```

---

## Archiving

The existing `ArchiveManager.autoArchive` receives the `rows` that were actually displayed. Since we call `renderMain()` after merging, the `rows` passed to `handleAutoArchiveAndHistory` should be the **displayed rows** (either public or leadership‑merged). In the current code, `processAndRenderProgram` calls `handleAutoArchiveAndHistory(rows)` before rendering. We need to ensure the archived rows reflect the view at the time of archiving.

**Adjustment**: Move the archive call **after** rendering so we can capture the displayed set, or construct a `displayedRows` variable and pass it to the archive function. Simpler: after `renderMain()`, compute `displayedRows` based on `currentView` and then call `handleAutoArchiveAndHistory(displayedRows)`.

---

## Internationalization

Add the following keys to `js/i18n/index.js` for each supported language:

```json
{
  "toggleLeadershipAgenda": "Toggle Leadership Agenda",
  "leadershipAgendaBanner": "Leadership Agenda – Confidential",
  "agendaGeneral": "General Notes",
  "agendaAnnouncements": "Announcements",
  "agendaAckVisitingLeaders": "Visiting Leaders",
  "agendaBusiness": "Business",
  "agendaBusinessReleases": "Releases",
  "agendaBusinessCallings": "Callings",
  "agendaBusinessPriesthood": "Priesthood",
  "agendaBusinessNewMoveIns": "New Move‑Ins",
  "agendaBusinessNewConverts": "New Converts",
  "agendaBusinessGeneral": "Other Business"
}
```

---

## Styling

Reuse the existing `.agenda-panel` CSS from the previous implementation. Ensure it defaults to `collapsed` (or `expanded` if you later change your mind). Suggested:

```css
.agenda-panel {
  border-radius: 12px;
  background: var(--card-bg);
  margin: 8px 0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}
.agenda-panel .panel-header {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  font-weight: 600;
  cursor: pointer;
}
.agenda-panel .lock-icon {
  margin-right: 8px;
}
.agenda-panel .panel-content {
  padding: 16px;
  border-top: 1px solid var(--hr-line);
  display: none;
}
.agenda-panel:not(.collapsed) .panel-content {
  display: block;
}
```

No major new styles required.

---

## Implementation Checklist

### Phase 1: Preparations

- [ ] Define `AGENDA_KEYS` constant (list of recognized `agenda_*` keys) in a new module or `main.js`.
- [ ] Confirm `renderSingleRow` function available; if not, extract from existing code.

### Phase 2: Agenda Fetch & Map

- [ ] After `loadAndRenderAgenda` (or similar), parse agenda CSV into `agendaMap`.
- [ ] Build `agendaMap` with composite key `${key}|${agendaId}` and store `values` array.
- [ ] Set `hasAgendaContent` if any `values` array non‑empty.
- [ ] Store raw agenda CSV in `agendaCache_${profileId}` on success.
- [ ] Update profile `agendaValid`, `agendaLastLoaded`.

### Phase 3: Toggle Button & Visibility

- [ ] Add fifth button to `index.html` after the fourth button.
- [ ] Add CSS for `.icon-btn` (already exists).
- [ ] In initialization after agenda load, set `toggleBtn.style.display` based on `agendaValid && hasAgendaContent`.
- [ ] Bind click handler to toggle `currentView`, save to `sessionStorage`, update URL param, and call `renderMain()`.

### Phase 4: Rendering Split

- [ ] Replace existing `processAndRenderProgram` final render step with `renderMain()`.
- [ ] Implement `renderMain()` as described.
- [ ] Ensure `renderSingleRow(row)` uses the existing renderer dispatch (e.g., `renderers[row.key](row)`).
- [ ] In leadership view, for `agenda_*` rows, look up `agendaMap` and create accordion panel; if no match, skip.
- [ ] Add ✅ to titles of `agendaBusiness*` panels that have content.

### Phase 5: Archiving Alignment

- [ ] Move `handleAutoArchiveAndHistory` call to after `renderMain()` so it receives the displayed rows.
- [ ] Pass the same `rows` array (which is either public or merged) to the archive manager.

### Phase 6: URL & Session Persistence

- [ ] On app start, read `sessionStorage.getItem('agendaView')` and set `currentView`.
- [ ] Also check URL param `?view=agenda` to override.
- [ ] When toggling, update URL via `history.pushState` or simply reload? Simpler: keep `sessionStorage` only; avoid reload to preserve scroll position. Just re‑render.

### Phase 7: i18n & CSS

- [ ] Add translation keys (above) to `js/i18n/index.js` for all languages.
- [ ] Verify `.agenda-panel` styling; adjust margins if needed.
- [ ] Ensure lock icon appears in panel header.

### Phase 8: Documentation

- [ ] Update `README.md` with:
  - Explanation of `agenda_*` placeholder rows in main sheet.
  - How to create the agenda sheet (columns, matching IDs).
  - How to set the agenda URL in the app.
  - How to use the toggle button.
  - Leadership rotation procedure: create new sheet, share, scan new URL, deprecate old sheet.
  - iOS PWA storage note (still relevant).
- [ ] Add a new section in `docs/plans/AGENDA_INTEGRATED.md` for operations (or update this plan).
- [ ] Optionally add a "Help" modal section about leadership agenda.

---

## Testing Scenarios

1. **Basic toggle**: Load main sheet with two `agenda_*` placeholders; set valid agenda URL; toggle appears; switch views – placeholders appear as accordion panels in leadership view and are hidden in public view.
2. **Matching IDs**: Change an `agendaId` in main sheet; corresponding placeholder no longer shows in leadership view.
3. **Empty agenda entries**: If an agenda row has no `value*` entries, skip rendering that panel.
4. **Business ✅**: Only `agendaBusiness*` panels with content get checkmark.
5. **Collapsed/Expanded**: All panels start collapsed; click header to expand/collapse.
6. **Offline**: Load agenda once, go offline, toggle still works from cached data.
7. **Archive**: While in leadership view, trigger auto‑archive; later view archive (if support exists) should show same merged rows.
8. **Public spacing**: In public view, `agenda_*` rows leave no gaps; page height adjusts.
9. **Invalid agenda URL**: Toggle hidden; modal shows warning.
10. **Session persistence**: Reload page with `?view=agenda` → leadership view retained; without → program view.

---

## Documentation & Operations

### README Additions

**Setting Up Leadership Agenda**

1. **Modify the main Google Sheet**  
   Add rows with keys that start with `agenda_`. In the value column, put an **agenda ID** (any string) that will match an entry in the agenda sheet. Place these rows exactly where you want the leadership notes to appear in the program.

2. **Create the private Agenda Sheet**  
   Create a separate Google Sheet (share only with leadership). Columns: `key`, `agendaId`, `value1`, `value2`, `value3`, …  
   For each `agenda_*` key and matching `agendaId` from the main sheet, fill the `value` columns with the bullet points or paragraphs for that section.

3. **Load the Agenda URL in the App**  
   In the app, tap the lock (🔒) button → paste or scan the agenda sheet’s CSV URL (`.../gviz/tq?tqx=out:csv`). Save.

4. **Use the Toggle**  
   A briefcase (👔) button appears in the header. Tap to switch between Public Program and Leadership Agenda. The toggle state is remembered per session.

5. **Leadership Transition**  
   When leadership changes:
   - Create a new agenda sheet with the new content.
   - Share the new CSV URL with the new leadership team.
   - They update their app by scanning/pasting the new URL (old agenda can be cleared or ignored).  
     The main sheet remains unchanged unless you need to add/remove `agenda_*` placeholders.

### Help Modal

Add a subsection:  
**Leadership Agenda**

> The briefcase button shows a private leadership agenda. Only available if your profile has an agenda URL configured. The agenda content comes from a separate sheet and is hidden from the public view. Agenda items appear as collapsible sections within the program at the positions marked by `agenda_*` rows in the main sheet.

---

## Risks & Mitigations

| Risk                                       | Impact                                                | Mitigation                                                                      |
| ------------------------------------------ | ----------------------------------------------------- | ------------------------------------------------------------------------------- |
| Main sheet shares `agenda_*` keys publicly | Reveals that leadership notes exist (but not content) | Acceptable – the content remains protected by the separate agenda sheet URL.    |
| Placeholder absent in main sheet           | Leadership section cannot appear                      | Provide a master template with all `agenda_*` rows pre‑filled (with dummy IDs). |
| Mismatched `agendaId` between sheets       | Content not displayed                                 | Log warnings to console; document naming conventions.                           |
| Leadership forgets to update agenda URL    | New leaders cannot see content                        | Include transition steps in README; short in‑app guidance in modal.             |
| Offline toggle without cached agenda       | Leadership view shows nothing                         | Cache agenda on first successful load; show warning if offline and no cache.    |
| Large agenda slows rendering               | UI lag                                                | Unlikely; agenda sections are small. If needed, lazy‑load accordion content.    |

---

## Appendix: Sample Main Sheet with Placeholders

```csv
key,value
unitName,Mountain View
date,March 29, 2026
presiding,President Smith
conducting,Brother Nelson
musicDirector,Sister Jane
organist,Sister Susie Nelson
agendaAnnouncements,ann1
agendaAckVisitingLeaders,vis1
agendaBusiness,parent1
agendaBusinessReleases,releases1
agendaBusinessCallings,callings1
agendaBusinessPriesthood,priesthood1
openingHymn,#6 Redeemer of Israel
invocation,Sister So and So
...
```

---

_Plan version: 2.0 – Approved and ready for implementation_
