# Feature Plan: CMS Sheet Editor (Google Sheets OAuth + Form UI)

**Version**: 2.3  
**Last Updated**: May 16, 2026  
**Status**: Phases 1-9 complete. All Phase 9 hardening items closed, including oilLamp row removal fix.  
**Estimated Duration**: 9 phases total

---

## 📋 Table of Contents

1. [Current Implementation Status](#current-implementation-status)
2. [v2 Desktop CMS Redesign](#v2-desktop-cms-redesign)
3. [Mobile Agenda CMS (`/cms_agenda/`)](#mobile-agenda-cms-cms_agenda)
4. [Overview & Architecture](#overview--architecture)
5. [Design Decisions](#design-decisions)
6. [Technical Architecture](#technical-architecture)
7. [Phase 1: OAuth Module](#phase-1-oauth-module-complete) ✅ COMPLETE
8. [Current Roadmap](#current-roadmap)
9. [Architectural Review Synthesis](#architectural-review-synthesis)
10. [Test Strategy Summary](#test-strategy-summary)
11. [Current File Map](#current-file-map)
12. [Next Steps](#next-steps)
13. [Field Definitions & CMS Form Spec](#field-definitions--cms-form-spec)
14. [Key Files Reference](#key-files-reference)
15. [Summary](#summary)

---

## Current Implementation Status

This document now subsumes the previous standalone rollout plan from `docs/plans/cms.md` and is the single source of truth for CMS architecture, implementation status, and remaining work.

### Progress Summary

| Phase                         | Status      | Files                                                                                                                                                                                                    | Tests                                                                                 |
| ----------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Pre-gate                      | ✅ Complete | `test/db-path.test.mjs`, `js/utils/sheetsUrl.js`, `docs/ADR-001-program-sheet-write-strategy.md`                                                                                                         | 23 passing                                                                            |
| Phase 1 — OAuth               | ✅ Complete | `js/auth/googleAuth.js`                                                                                                                                                                                  | 33 passing                                                                            |
| Phase 2 — Sheets API          | ✅ Complete | `SheetsApiClient.mjs`, `ProgramSheetService.mjs`, `AgendaSheetService.mjs`                                                                                                                               | 40 passing                                                                            |
| Phase 3 — Dexie v6 drafts     | ✅ Complete | `js/data/db.js`, `IndexedDBManager.js`, `test/db-v6-migration.test.mjs`                                                                                                                                  | Focused migration + profile cleanup tests passing                                     |
| Phase 4 — Tab Management      | ✅ Complete | `SheetTabService.mjs`, `sheetRanges.js`, service tests                                                                                                                                                   | Focused service tests passing                                                         |
| Phase 5 — `CmsEditor.mjs`     | ✅ Complete | `js/components/CmsEditor.mjs`, `test/components/CmsEditor.test.mjs`                                                                                                                                      | 16 focused tests passing                                                              |
| Phase 6 — CMS page            | ✅ Complete | `cms/index.html`, `js/cms.js`, `test/cms.test.mjs`                                                                                                                                                       | 10 focused tests passing; setup/auth restore/conflict recovery + SW precache in place |
| Phase 7 — Agenda CMS page     | ✅ Complete | `cms_agenda/index.html`, `js/cms-agenda.js`, `AgendaKeyEditor.mjs`, `test/cms-agenda.test.mjs`                                                                                                           | 10 focused tests passing; publish/draft/auth + SW route coverage in place             |
| Phase 8 — Tests + SW + i18n   | ✅ Complete | `e2e/scenarios/cms.spec.js`, `e2e/scenarios/cms-agenda.spec.js`, `e2e/helpers/sheetsApiMock.js`, `e2e/fixtures/cmsAuth.js`, `test/cms-i18n.test.mjs`                                                     | Focused E2E scenarios passing on desktop/mobile targets + CMS i18n coverage verified  |
| Phase 9 — Hardening Follow-up | ✅ Complete | Service worker auth boundaries, CMS save semantics, agenda bulk-publish truthfulness, draft restore, shell i18n, Agenda Settings alignment, XSS fix, oilLamp integration tests, SheetEditor test rewrite | 53 test files, 1052 tests passing, 0 failures                                         |

---

## Architecture Decisions (Quick Reference)

The 13 ADs that govern all implementation choices are detailed in the [Architectural Review Synthesis](#architectural-review-synthesis) section below.

| AD    | Topic                                                          | Status |
| ----- | -------------------------------------------------------------- | ------ |
| AD-01 | `googleClientId` in `metadata` store, not Profile schema       | ✅     |
| AD-02 | DB deployment path works from sub-paths (test written)         | ✅     |
| AD-03 | Three-service architecture (client + two domain services)      | ✅     |
| AD-04 | `drafts` object store in Dexie v6                              | ✅     |
| AD-05 | Column-safe read-modify-write for program sheet (ADR-001)      | ✅     |
| AD-06 | Pipe character sanitisation in all form inputs                 | ✅     |
| AD-07 | `ALLOWED_KEYS` from `js/sanitize.js` as single source of truth | ✅     |
| AD-08 | Shared sessionStorage key namespace from `googleAuth.js`       | ✅     |
| AD-09 | "Publish All Pending" action in mobile Agenda CMS              | ✅     |
| AD-10 | Service worker precache new pages + version bump               | ✅     |
| AD-11 | All CMS strings via `t()` from day one                         | ✅     |
| AD-12 | OAuth redirect preserves draft state                           | ✅     |
| AD-13 | Last-write-wins with `modifiedTime` concurrency warning        | ✅     |

## v2 Desktop CMS Redesign

> **Design version 2.0 — supersedes the original Phase 4/5 UI design.**

### Context

The original CMS design was modelled on the existing single-column mobile-first `editor.html`, which has since been replaced by the redesigned CMS at `cms/index.html`. Since then:

- Many new key types have been added (agenda, lessons, media, links, leadership)
- The intended audience is **non-technical ward/branch clerks or secretaries** editing on a laptop or desktop on Friday or Saturday night
- The app is explicitly **not intended for mobile/phone use** in CMS mode
- More horizontal screen space is available — the UI should take advantage of it

### URL

The CMS is accessed at:

```
https://khilghard.github.io/meeting-program/cms/
```

Implemented as `cms/index.html` (served at `/meeting-program/cms/`). The old `editor.html` has been removed.

### Who Uses This

| User                    | Description                                                                    |
| ----------------------- | ------------------------------------------------------------------------------ |
| Ward/Branch Secretary   | Sets up and updates the weekly sacrament program on Friday or Saturday evening |
| Bishopric Member        | May occasionally update speakers or assignments                                |
| Technical administrator | Sets up Google OAuth credentials once in the settings modal                    |

### Goals

- A **non-technical person** should be able to edit any field in the program without knowing CSV syntax
- The `|` pipe separator and `<IMG>` token are **never typed by hand** — the CMS adds them automatically on save
- Required fields are clearly marked; optional fields are labelled as optional
- Auto-fill suggestions help with common entries (hymn numbers, common names formats)
- The form is grouped logically so the user works top-to-bottom matching the actual program order

---

### Google Login / Credentials Modal

On first visit, or when not signed in, a **setup/sign-in modal** is shown. It collects:

| Field                                 | Purpose                                     | Where Stored                                  |
| ------------------------------------- | ------------------------------------------- | --------------------------------------------- |
| Google Client ID                      | OAuth 2.0 app client ID for this deployment | IndexedDB `metadata` store (`googleClientId`) |
| Spreadsheet URL / active sheet source | The Google Sheets spreadsheet to write to   | Existing active profile (`profile.url`)       |

**Flow:**

1. User arrives at `/meeting-program/cms/`
2. If `metadata.googleClientId` exists and the active profile has `profile.url` → show "Sign in with Google" button
3. If not → show "Configure Google Settings" button → opens setup modal
4. Setup modal allows entering/editing client ID and spreadsheet URL/ID
5. Google Client ID is saved to IndexedDB metadata; the active profile continues to provide the spreadsheet URL
6. After setup → user clicks "Sign in with Google" → OAuth PKCE popup
7. On success → CMS editor form loads

**Storage note:** `googleClientId` is not added to the Profile schema. The setup modal writes it to `IndexedDBManager.setMetadata("googleClientId", value)` and `js/cms.js` extracts the spreadsheet ID from `profile.url` at runtime.

---

### CMS Page Layout (Desktop)

```
┌─────────────────────────────────────────────────────────────────────┐
│  HEADER: "Meeting Program CMS"    [Profile: Millcreek 5th ▼]        │
│          [🔐 Signed in as user@gmail.com]  [💾 Save to Sheets]      │
├──────────────────┬──────────────────────────────────────────────────┤
│ SECTION NAV      │  FORM AREA                                       │
│                  │                                                  │
│ ● Unit Info      │  ┌─ Unit Information ─────────────────────────┐  │
│ ○ Conducting     │  │  [REQUIRED] Ward/Unit Name                 │  │
│ ○ Hymns          │  │  ┌────────────────────────────────────────┐│  │
│ ○ Prayers        │  │  │ Millcreek 5th Ward                     ││  │
│ ○ Speakers       │  │  └────────────────────────────────────────┘│  │
│ ○ Structural     │  │                                             │  │
│ ○ Leaders        │  │  [OPTIONAL] Ward Address                   │  │
│ ○ Media & Links  │  │  ┌────────────────────────────────────────┐│  │
│ ○ Statements     │  │  │ 123 Main St, Salt Lake City, UT        ││  │
│ ○ Lessons        │  │  └────────────────────────────────────────┘│  │
│ ○ Agenda         │  │  ...                                        │  │
│                  │  └────────────────────────────────────────────┘  │
│ [+ Add Row]      │                                                  │
└──────────────────┴──────────────────────────────────────────────────┘
```

- **Left sidebar**: Category navigation (clicking jumps to that section)
- **Main area**: Scrollable form grouped by category
- **Header**: Profile selector, sign-in status, global save button

---

### Field Design Principles

Each field in the CMS form follows this pattern:

```
┌──────────────────────────────────────────────────────────────────┐
│ Label           [REQUIRED / OPTIONAL]   ⓘ (tooltip: description) │
│ Sub-inputs (one per pipe-separated part)                          │
│ Example: "John Smith | (801) 555-1234 | Bishop"                  │
└──────────────────────────────────────────────────────────────────┘
```

- Each pipe-separated part gets **its own input box** with a placeholder
- `<IMG>` toggle is a **checkbox** ("Include image icon"), not typed text
- Hymn fields have a **number input** + optional **title override** text input
- Links have separate fields for **display text** and **URL**
- Name fields that support honorifics show: "Honorifics will be auto-translated"

**On Save serialisation:**

```
speaker: name | caption     →  joined with " | "
leader: name | phone | pos  →  joined with " | "
linkWithSpace: <IMG> text | url | imgUrl  →  prepends "<IMG> " if checkbox checked
generalStatementWithLink: text<LINK> | url  →  inserts <LINK> at cursor position
```

---

### Field Definitions & CMS Form Spec

See [§ Field Definitions & CMS Form Spec](#field-definitions--cms-form-spec) below for the complete per-key field definitions.

---

## Mobile Agenda CMS (`/cms_agenda/`)

> **Separate page from the desktop CMS.** Designed for phones. Used Sunday morning or Saturday night for last-minute agenda changes.

### Why Separate

|                 | Desktop CMS `/cms/`                            | Mobile Agenda CMS `/cms_agenda/`                |
| --------------- | ---------------------------------------------- | ----------------------------------------------- |
| **Device**      | Laptop / desktop                               | Phone                                           |
| **When**        | Friday/Saturday night                          | Day-of, last-minute                             |
| **Who**         | Secretary / clerk                              | Bishop, counselor, exec. secretary              |
| **What**        | Full program (speakers, hymns, leaders, links) | Agenda only (business, announcements, callings) |
| **Network**     | Reliable                                       | Spotty church WiFi / cellular                   |
| **Input style** | Sidebar + multi-section form                   | Single key at a time, large tap targets         |

### URL

```
https://khilghard.github.io/meeting-program/cms_agenda/
```

Implemented as `cms_agenda/index.html`. Deep-linked from the agenda settings modal ("Edit Agenda" button) in the main app.

### Data Source

Reads and writes the **agenda sheet** (`profile.agendaUrl`), not the program sheet (`profile.url`). The spreadsheet ID is extracted from `profile.agendaUrl` at runtime — no extra setup needed once the agenda URL is in the profile.

---

### Interaction Model: Key Picker + Dynamic Form

```
┌──────────────────────────────────────────────────────┐
│  📋 Agenda Editor          [👤 user@gmail.com] [✔]   │
├──────────────────────────────────────────────────────┤
│                                                      │
│  What are you editing?                               │
│  ┌──────────────────────────────────────────────┐   │
│  │ 📢 Announcements                           ▼ │   │
│  └──────────────────────────────────────────────┘   │
│                                                      │
│  ── Announcements ──────────────────────────────    │
│                                                      │
│  Item 1                                              │
│  ┌──────────────────────────────────────────────┐   │
│  │ Youth activity Wednesday 7pm                 │   │
│  └──────────────────────────────────────────────┘   │
│                                                      │
│  Item 2                                              │
│  ┌──────────────────────────────────────────────┐   │
│  │ Temple trip sign-up closes Sunday            │   │
│  └──────────────────────────────────────────────┘   │
│                                                      │
│  Item 3                                              │
│  ┌──────────────────────────────────────────────┐   │
│  │                                              │   │
│  └──────────────────────────────────────────────┘   │
│                                                      │
│  [+ Add item]                                        │
│                                                      │
│  ┌──────────────────────────────────────────────┐   │
│  │              💾 Publish                      │   │
│  └──────────────────────────────────────────────┘   │
│                                                      │
└──────────────────────────────────────────────────────┘
```

**Key picker dropdown** at the top lists all agenda keys with human-readable labels:

| Dropdown option        | Key                         |
| ---------------------- | --------------------------- |
| 📝 General Notes       | `agendaGeneral`             |
| 📢 Announcements       | `agendaAnnouncements`       |
| 🤝 Visiting Leaders    | `agendaAckVisitingLeaders`  |
| 🏛️ Stake Business      | `agendaBusinessStake`       |
| 📤 Releases            | `agendaBusinessReleases`    |
| 📥 Callings            | `agendaBusinessCallings`    |
| 🙋 Priesthood Business | `agendaBusinessPriesthood`  |
| 🏠 New Move-ins        | `agendaBusinessNewMoveIns`  |
| ✨ New Converts        | `agendaBusinessNewConverts` |
| 📋 General Business    | `agendaBusinessGeneral`     |

When the user picks a key from the dropdown, the form area below **immediately re-renders** to show the correct field type for that key.

---

### Per-Key Form Views

Each key has exactly one view type. Selecting the key from the dropdown swaps the form:

#### `agendaGeneral` — Free-text notes

```
┌────────────────────────────────────────────────┐
│ General notes (each paragraph is separate)     │
│                                                │
│ ┌──────────────────────────────────────────┐   │
│ │                                          │   │
│ │  (large textarea, min 5 rows)            │   │
│ │                                          │   │
│ └──────────────────────────────────────────┘   │
└────────────────────────────────────────────────┘
```

#### `agendaAnnouncements`, `agendaAckVisitingLeaders`, `agendaBusinessNewMoveIns`, `agendaBusinessNewConverts` — Repeatable single-line items

```
Item 1  [text input]
Item 2  [text input]
Item 3  [text input  ← blank = not written to sheet]
[+ Add item]
```

#### `agendaBusinessReleases`, `agendaBusinessCallings` — Repeatable Name + Calling pairs

```
  Name             Calling
[ text input ]  [ text input ]
[ text input ]  [ text input ]
[ text input ]  [ text input ]  ← blank row = not written
[+ Add]
```

Serialised as `Name | Calling` per column in the agenda sheet row.

#### `agendaBusinessStake`, `agendaBusinessPriesthood`, `agendaBusinessGeneral` — Textarea

```
┌────────────────────────────────────────────────┐
│  (large textarea, min 4 rows)                  │
└────────────────────────────────────────────────┘
```

---

### Publish Button

A prominent **Publish** button (not auto-save) at the bottom of each key view:

- Writes only the **currently visible key's data** to the agenda sheet
- Shows a loading spinner while writing
- Shows ✅ confirmation or ❌ error toast
- Reason for Publish-not-auto-save: church WiFi is unreliable; batch on intent

A secondary **"Save draft"** (local only, to IndexedDB) lets the leader switch keys without losing unsaved data for the current key.

---

### Authentication

Same OAuth flow as the main CMS:

- Uses `profile.googleClientId` for the OAuth client ID
- If not set, shows a "Configure" prompt (same setup modal component)
- Token stored in `sessionStorage` (cleared on browser close)
- No collaborator check required for the agenda sheet (trust the signed-in user)

---

### Entry Points

**From the main app:**
The agenda settings modal (`AgendaSettings.js`) now includes an "Edit Agenda" button that navigates to `/meeting-program/cms_agenda/?profileId=<id>`, allowing the mobile editor to open the selected profile's agenda sheet directly.

**Direct bookmark:**
Leaders can bookmark `https://khilghard.github.io/meeting-program/cms_agenda/` and use it directly. On open it reads the active profile from IndexedDB when no `profileId` query parameter is present.

**No profile / no agenda URL:**
If the active profile has no `agendaUrl`, the page shows a short prompt: "No agenda sheet configured. Open the main app → Agenda Settings to add one."

---

### Phase 5b Implementation Plan

**Files:**

```
cms_agenda/
  index.html        ← Mobile page shell
js/
  cms-agenda.js     ← Entry point: auth check, profile load, render
  components/
    AgendaKeyEditor.mjs   ← Key picker + dynamic form renderer
```

**`AgendaKeyEditor.mjs` responsibilities:**

1. Render the key picker `<select>` from `AGENDA_KEYS` in `js/agenda/constants.js`
2. On key change → call `renderFormForKey(key, currentData)` → clears form area and builds correct inputs
3. Track dirty state per key in memory (object map `{ [key]: values[] }`)
4. "Save draft" → write dirty state to IndexedDB `editor._state`
5. "Publish" → call `sheetsApiService.writeAgendaRow(key, values, agendaId)` → toast result
6. On page load → restore any saved draft from IndexedDB

**`js/cms-agenda.js` responsibilities:**

1. Load active profile from IndexedDB
2. Check for `agendaUrl` → show error if missing
3. Check `googleAuth.isAuthenticated()` → show sign-in button if not
4. Extract `spreadsheetId` from `profile.agendaUrl`
5. Fetch current agenda sheet data (to pre-populate form)
6. Instantiate `AgendaKeyEditor` with current data

---

### What We're Building

A **Google Sheets CMS interface** that allows authorized editors to modify meeting program data directly in the app. Features:

- **Google OAuth 2.0 authentication** (PKCE flow, client-side only)
- **Collaborator verification** against the currently-loaded Google Sheet
- **Form-based UI** with scrollable key/value pairs, language selectors, validation
- **Local state management** with IndexedDB persistence for in-progress edits
- **Batch CSV upload** back to Google Sheets (not row-by-row)
- **Graceful "Viewer Only" fallback** for non-editors
- **No backend required** (GitHub Pages compatible)

### Why This Approach?

| Requirement           | Solution                          | Why Not Others                            |
| --------------------- | --------------------------------- | ----------------------------------------- |
| **Free hosting**      | GitHub Pages (static)             | Avoiding backend costs ✅                 |
| **No tech accounts**  | Google OAuth (user's own account) | Users already have Google accounts        |
| **Edit protection**   | OAuth + Collaborators check       | Verified against actual Sheet permissions |
| **Offline-ready**     | IndexedDB state storage           | Can edit offline, upload when online      |
| **Easy CSV export**   | CSV validation + upload           | Reversible, debuggable, portable          |
| **Non-tech friendly** | Form UI with pills/dropdowns      | Visual, clear, no CSV syntax needed       |

---

## Design Decisions

### 1. Authentication: Google OAuth 2.0 with PKCE

**Decision**: Use Google Identity Services (gis) library for browser-based OAuth authentication.

**Why**:

- No backend needed (PKCE flow works entirely client-side)
- Users sign in with account they already have
- Provides access token to call Google Sheets API
- Can verify user is a Sheet collaborator
- Token stored in `sessionStorage` (cleared on browser close) for security

**Implementation**:

- User navigates to `/cms/`
- Click "Sign in with Google" button
- Google login popup appears
- After auth, token stored in `sessionStorage`
- CMS entry point loads the active profile, current sheet/tab, and editor UI once API access succeeds

### 2. Data Flow: Form UI + Batch Upload

**Decision**: Build form UI with field-by-field editing; upload all changes in one batch.

**Why**:

- Better UX than downloading/editing CSV locally
- Batch upload is safer than row-by-row API calls
- Can validate entire dataset before upload
- Less error-prone than incremental saves
- Users can edit multiple fields, review, then upload

### 3. Permission Model: Collaborators Check

**Decision**: Check if authenticated user is a collaborator on the current Sheet.

**Why**:

- Tied to actual Sheet permissions (most secure)
- No manual allow-lists to maintain
- User only edits sheets they have permission for
- Leverages existing Google Sheet sharing

### 4. UI Pattern: Scrollable Form with Language Pills

**Decision**: Single scrollable list of all keys, with key selector, language buttons, single input field.

**Why**:

- One key at a time prevents overwhelming users
- Language pills (Bootstrap 5) are clear and visual
- Single input field reduces UI complexity
- Scrollable list shows all available fields

### 5. State Persistence: IndexedDB + Session

**Decision**: Keep edited data in IndexedDB during session; clear on sign-out.

**Why**:

- Survives page reload/accidental close
- User can ask "Resume editing?" on reload
- Keeps edits local until upload
- Session-based (not long-term storage)

---

## Technical Architecture

### High-Level Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                 cms/index.html + cms_agenda/index.html      │
│          (Desktop CMS and Mobile Agenda CMS shells)         │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                 js/cms.js + js/cms-agenda.js                │
│   (Orchestrators: profiles, auth, tabs, drafts, rendering)  │
└─────────────────────────────────────────────────────────────┘
                            │
      ┌───────────┼─────────────┬─────────────┐
      ▼           ▼             ▼             ▼
    ┌──────────┐ ┌───────────────┐ ┌───────────┐ ┌──────────┐
    │googleAuth│ │SheetsApiClient│ │Program /  │ │IndexedDB │
    │   .js    │ │     .mjs      │ │Agenda /   │ │Manager.js│
    └──────────┘ └───────────────┘ │Tab Svcs   │ └──────────┘
               └───────────┘
                            │
                            ▼
    ┌───────────────────────────────────────────────────┐
    │  CmsEditor.mjs / AgendaKeyEditor.mjs             │
    │               (UI Components)                    │
    └───────────────────────────────────────────────────┘
                            │
                            ▼
         ┌──────────────────────────────────┐
         │      IndexedDB (Dexie)           │
    │ profiles, metadata, drafts, etc. │
         └──────────────────────────────────┘
```

### File Organization

```
js/
├── auth/
│   └── googleAuth.js               [COMPLETE ✅] OAuth 2.0 module
├── services/
│   ├── SheetsApiClient.mjs         [COMPLETE ✅] Low-level Sheets REST client
│   ├── ProgramSheetService.mjs     [COMPLETE ✅] Program sheet domain logic
│   ├── AgendaSheetService.mjs      [COMPLETE ✅] Agenda sheet domain logic
│   └── SheetTabService.mjs         [COMPLETE ✅] Tab management
├── data/
│   ├── db.js                       [COMPLETE ✅] Dexie schema v6 + drafts store
│   └── IndexedDBManager.js         [COMPLETE ✅] Draft + metadata CRUD
├── components/
│   ├── CmsEditor.mjs               [COMPLETE ✅] Desktop CMS component
│   └── AgendaKeyEditor.mjs         [TODO] Mobile agenda component
├── cms.js                          [COMPLETE ✅] Desktop CMS entry point
├── cms-agenda.js                   [TODO] Mobile agenda entry point
└── [existing modules unchanged]

cms/
└── index.html                       [COMPLETE ✅] Desktop CMS page

cms_agenda/
└── index.html                       [TODO] Mobile agenda page

test/
├── auth/
│   └── googleAuth.test.mjs         [COMPLETE ✅] Auth tests (33 passing)
├── services/
│   ├── SheetsApiClient.test.mjs    [COMPLETE ✅]
│   ├── ProgramSheetService.test.mjs [COMPLETE ✅]
│   ├── AgendaSheetService.test.mjs  [COMPLETE ✅]
│   └── SheetTabService.test.mjs    [COMPLETE ✅]
├── components/
│   ├── CmsEditor.test.mjs          [COMPLETE ✅]
│   └── AgendaKeyEditor.test.mjs    [TODO]
├── db-v6-migration.test.mjs        [COMPLETE ✅]
└── cms.test.mjs                    [COMPLETE ✅]

e2e/
├── scenarios/
│   ├── cms.spec.js                 [TODO]
│   └── cms-agenda.spec.js          [TODO]

docs/
├── FEATURE_CMS_EDIT.md             [THIS FILE] ✅
└── [existing docs unchanged]
```

---

## Phase 1: OAuth Module ✅ COMPLETE

**Status**: ✅ COMPLETE  
**Files Created**:

- `js/auth/googleAuth.js` — OAuth 2.0 module (240+ lines)
- `test/auth/googleAuth.test.mjs` — 33 unit tests (all passing ✅)

**Deliverables**:

- ✅ Google OAuth 2.0 with PKCE flow
- ✅ Token management (storage, expiry, refresh)
- ✅ Session persistence via sessionStorage
- ✅ Automatic token refresh before expiry
- ✅ Comprehensive error handling
- ✅ 33 unit tests with 100% coverage

**Methods Implemented**:

```javascript
GoogleAuth.initialize(clientId, redirectUri);
GoogleAuth.signIn();
GoogleAuth.signOut();
GoogleAuth.getAccessToken();
GoogleAuth.getUser();
GoogleAuth.isAuthenticated();
GoogleAuth.isTokenExpired();
GoogleAuth.refreshToken();
GoogleAuth.onTokenExpire(callback);
```

---

## Phase 2: Google Sheets API Service

**Objective**: Wrapper for Google Sheets API operations (check collaborators, upload data).

**Duration**: ~10-12 hours  
**Context Required**: Medium (Google Sheets API, HTTP requests)  
**Files to Create**: `js/services/sheetsApiService.js`, `test/services/sheetsApiService.test.mjs`

See full Phase 2 details in the original plan below.

---

## [Additional phases 3-6 follow same structure as original comprehensive plan]

---

## Testing Specifications

### Unit Tests (Vitest)

**Framework**: Vitest 4.0.18  
**Current Status**: Phase 1 tests: 33/33 passing ✅

**Phase 1 Test Results**:

```
✓ test/auth/googleAuth.test.mjs (33 tests)
  ✓ initialize() (6 tests)
  ✓ signIn() (3 tests)
  ✓ getAccessToken() (3 tests)
  ✓ getUser() (2 tests)
  ✓ isAuthenticated() (3 tests)
  ✓ isTokenExpired() (4 tests)
  ✓ signOut() (2 tests)
  ✓ refreshToken() (2 tests)
  ✓ onTokenExpire() (3 tests)
  ✓ Session Persistence (2 tests)
  ✓ Error Handling (2 tests)
  ✓ Token Extraction from JWT (1 test)

Test Files: 1 passed
Tests: 33 passed
Duration: 273ms
```

### Run Tests

```bash
# All CMS-related unit tests
npx vitest run test/db-path.test.mjs test/sheetsUrl.test.mjs \
  test/services/SheetsApiClient.test.mjs \
  test/services/ProgramSheetService.test.mjs \
  test/services/AgendaSheetService.test.mjs

# Full test suite
npm test                          # Watch mode
npm run test:coverage             # With coverage
```

Most recent focused validation: **14 tests passed** (`test/components/CmsEditor.test.mjs` + `test/cms.test.mjs`).

---

## Integration Checklist: Phase 1

- [x] OAuth module created (`js/auth/googleAuth.js`)
- [x] All methods implemented (9 public methods)
- [x] Error handling with console logging
- [x] Token storage in sessionStorage
- [x] Token refresh logic
- [x] Unit tests created (33 tests)
- [x] All tests passing ✅
- [x] Documentation in JSDoc comments
- [ ] Next: Phase 2 can begin (independent of Phase 1)

---

## Phase 2-6 Planning

### Phase 4: CMS UI Component (Desktop Redesign)

> **Updated from original Phase 4 per v2 redesign.** The new component replaces `SheetEditor.mjs` with `CmsEditor.mjs`, a desktop-first multi-section form.

**Objective**: Build the desktop CMS form component with per-key-type field inputs, section navigation, required/optional badges, and pipe-serialisation on save.

**File**: `js/components/CmsEditor.mjs`

**Key behaviours**:

- Renders an accordion/section layout, one section per category
- Each key type renders the correct sub-fields (see [Field Definitions](#field-definitions--cms-form-spec))
- REQUIRED keys are highlighted; OPTIONAL keys are muted
- On "Save to Sheets": serialises all fields → calls `sheetsApiService.uploadCsv()`
- Pipe characters and `<IMG>` token are added by serialiser, never by user
- Unsaved changes indicator in header
- "Discard changes" button reloads from last saved state

### Phase 5: CMS Page & Navigation

> **Updated from original Phase 5.** The CMS lives at `cms/index.html`, not `editor.html` (which has been removed).

**File**: `cms/index.html`, `js/cms.js`

**Responsibilities of `js/cms.js`**:

1. Load active/default profile from IndexedDB
2. Check profile for `googleClientId` → show setup modal if missing
3. **Spreadsheet ID extracted from `profile.url` at runtime** (no separate field needed)
4. Check `googleAuth.isAuthenticated()` → show sign-in button if not
5. On authenticated: fetch current sheet data (using `profile.url`), instantiate `CmsEditor`
6. Handle "Save to Sheets" → call API → show success/error toast
7. Handle profile switching (reloads sheet data)

## Current Roadmap

### Phase 2 — Sheets API Modules

**Objective:** Replace the original single-service plan with the current split service architecture.

- `js/services/SheetsApiClient.mjs` — low-level REST client for values, spreadsheet structure, metadata, auth errors, rate limits, and timeouts
- `js/services/ProgramSheetService.mjs` — program-sheet read/write using column-safe read-modify-write
- `js/services/AgendaSheetService.mjs` — agenda-sheet per-key read/write helpers

### Phase 3 — Dexie v6 Draft Persistence

**Objective:** Add a `drafts` IndexedDB object store. Both CMS pages use it for auto-save and OAuth redirect state preservation.

#### Changes to `js/data/db.js`

Bump schema to version 6. Add one new store:

```js
db.version(6).stores({
  drafts: "id, profileId, updatedAt"
  // id pattern: 'cms_draft_${profileId}' | 'agenda_draft_${profileId}'
});
```

No changes to existing stores or migrations.

#### Changes to `js/data/IndexedDBManager.js`

Add functions and export them:

```js
getDraft(key); // returns draft object or null
saveDraft(key, data); // upserts { id: key, profileId, data, updatedAt: Date.now() }
clearDraft(key); // deletes the draft record
clearProfileDrafts(profileId); // clears all drafts for a given profile
```

#### Test: `test/db-v6-migration.test.mjs`

- DB opens at v6 on a fresh database
- `drafts` store exists and is queryable
- `getDraft` returns null for unknown key
- `saveDraft` persists and `getDraft` retrieves it
- `clearDraft` removes the record
- Existing v5 data (profiles, archives) is untouched after v6 upgrade

Implemented through `IndexedDBManager.js` helpers:

```js
getDraft(key);
saveDraft(key, data);
clearDraft(key);
clearProfileDrafts(profileId);
```

### Phase 4 — Tab Management

**Objective:** Let CMS and Agenda CMS users see, select, duplicate, and reorder (promote) Google Sheet tabs from within the app. This removes the need to open the spreadsheet in a browser tab to prepare the next week's tab.

#### Background

Google Sheets users routinely rename and reorder tabs to manage weekly programs:

- The **leftmost tab is the active/default** — it is what the CSV GET endpoint returns
- Other tabs are copies of past weeks, templates, or working copies for upcoming Sundays
- To "activate" a tab for the week you move (shift) it to the leftmost position in the spreadsheet
- Current workflow requires opening Google Sheets in a browser; users forget or find it confusing

#### Tab Selector UI (Desktop CMS header)

```
┌──────────────────────────────────────────────────────────────────┐
│  Ward Program CMS   [Profile: 5th Ward ▼]                        │
│  Sheet tab: [ May 18, 2026 (active) ▼ ]  [+ Duplicate] [⬅ Make Active] │
│  [🔐 user@gmail.com]                     [💾 Save to Sheets]     │
└──────────────────────────────────────────────────────────────────┘
```

#### Tab Selector UI (Mobile Agenda CMS)

```
┌────────────────────────────────────────────┐
│  Agenda CMS  [👤]  [✔ Publish All]         │
│  Tab: [ May 18, 2026 (active) ▼ ]  [⬅]    │
├────────────────────────────────────────────┤
│  What are you editing?                     │
│  [ Announcements ▼ ]                       │
│  ...                                       │
```

When a tab is selected from the dropdown, the form data refreshes from that tab. Any pending edits are offered to be saved as a draft first.

#### Tab Actions

| Action          | Description                                                                    |
| --------------- | ------------------------------------------------------------------------------ |
| **Select tab**  | Switch active tab for editing; reload form data from that tab                  |
| **Duplicate**   | Create a copy of the selected tab with a new name (prompted)                   |
| **Make Active** | Move the selected tab to the leftmost position — this makes it the CSV default |

#### `SheetTabService.mjs`

New service in `js/services/SheetTabService.mjs`. Uses `SheetsApiClient` for auth + HTTP.

Note: Tab operations (list, duplicate, reorder) require the **Sheets API `batchUpdate` (spreadsheets-level)** with `SheetProperties` requests — not the `values` endpoint. The `spreadsheets.batchUpdate` method is at `https://sheets.googleapis.com/v4/spreadsheets/{id}:batchUpdate`, distinct from `values:batchUpdate`.

`SheetsApiClient` already has a `batchUpdate` method for `values:batchUpdate`. A new `spreadsheetBatchUpdate` method is needed for structural requests.

##### Methods

```js
// List all tabs (sheets) in the spreadsheet
listTabs(spreadsheetId);
// → Promise<Array<{ sheetId: number, title: string, index: number }>>

// Duplicate a tab by its sheetId; returns the new tab's metadata
duplicateTab(spreadsheetId, sourceSheetId, newTitle);
// → Promise<{ sheetId: number, title: string, index: number }>

// Move a tab to index 0 (leftmost = active/default for CSV endpoint)
makeActiveTab(spreadsheetId, sheetId);
// → Promise<void>
```

##### Sheets API calls used

| Method          | Sheets API call                                                                              |
| --------------- | -------------------------------------------------------------------------------------------- |
| `listTabs`      | `GET /v4/spreadsheets/{id}?fields=sheets.properties`                                         |
| `duplicateTab`  | `POST /v4/spreadsheets/{id}:batchUpdate` — `duplicateSheet` request                          |
| `makeActiveTab` | `POST /v4/spreadsheets/{id}:batchUpdate` — `updateSheetProperties` request (sets `index: 0`) |

##### OAuth scope

Tab operations require:

```
https://www.googleapis.com/auth/spreadsheets
```

This scope is already required for write operations — no new scope needed.

#### `SheetsApiClient.mjs` addition

Add one method to the existing client:

```js
/**
 * Spreadsheet-level structural update (not values).
 * Used for tab duplication, reordering, renaming.
 * POST https://sheets.googleapis.com/v4/spreadsheets/{id}:batchUpdate
 *
 * @param {string} spreadsheetId
 * @param {object[]} requests  — array of Sheets API Request objects
 * @returns {Promise<object>}  — BatchUpdateSpreadsheetResponse
 */
async spreadsheetBatchUpdate(spreadsheetId, requests) { ... }
```

#### UI Integration Points

**Desktop CMS (`js/cms.js`):**

- On auth success, call `SheetTabService.listTabs()` and render the tab selector
- Tab selector `<select>` in the CMS header
- "Duplicate" opens a prompt for the new tab name, then calls `duplicateTab()`
- "Make Active" calls `makeActiveTab()`, then reloads the tab list and refreshes the form
- When user switches tab: if dirty, offer "Save draft?" → then reload form data from new tab

**Mobile Agenda CMS (`js/cms-agenda.js`):**

- Compact tab selector (`<select>` + ⬅ button) in the sticky header
- "⬅" (make active) available without a separate duplicate action (phone UI priority: activate for Sunday)
- Duplicate available via a ⋮ menu or secondary button

#### Tab Name Convention

The app does not enforce a naming convention but will display tab names as-is. Users typically name tabs with dates (`May 18`, `2026-05-18`, `Week 2`) — the UI should show the full name from the Sheet.

The `(active)` label in the dropdown always marks the tab at `index === 0`.

#### Test: `test/services/SheetTabService.test.mjs`

- `listTabs` returns array sorted by index; marks index-0 tab
- `duplicateTab` sends correct `duplicateSheet` Sheets API request structure
- `makeActiveTab` sends `updateSheetProperties` with `index: 0`
- `spreadsheetBatchUpdate` (on client) sends POST to `spreadsheets/{id}:batchUpdate`, not `values:batchUpdate`
- 403 and 429 error propagation
- Tab name is preserved on duplicate (new name applied)

### Phase 5 — `CmsEditor.mjs`

**Objective:** Desktop multi-section form. Left sidebar navigation, per-key-type sub-fields, pipe serialisation, required/optional badges. See `§ v2 Desktop CMS Redesign` for field spec and layout wireframe.

**Key constraints:**

- Imports `ALLOWED_KEYS` from `js/sanitize.js` (AD-07)
- `sanitisePart(str)` strips `|` from all free-text inputs (AD-06)
- All labels via `t()` (AD-11)
- Pure `getFieldsForKeyType(keyType) → FieldDef[]` function (separately testable)
- Tab name passed in so the form always targets the selected tab (Phase 4 integration)

**Current state:** Complete. `CmsEditor.mjs` now covers numbered repeatable speaker/intermediate hymn/leader rows, safe textarea rendering, `linkWithSpace` image-token serialisation, and a UI action to insert the `<LINK>` placeholder without typing the token by hand. `oilLamp` remains bound to the underlying sheet row model: the editor can toggle the key, but actual add/remove behaviour still depends on whether the sheet template already contains an `oilLamp` row.

### Phase 6 — `cms/index.html` + `js/cms.js`

**Objective:** Desktop CMS page at `/meeting-program/cms/`.

**Key behaviours:**

- Auto-save draft to `drafts` store before OAuth redirect (AD-12)
- Restore draft on return (`cms_auth_pending` sessionStorage flag)
- Setup modal writes `googleClientId` to `metadata` store (AD-01)
- `lastModifiedTime` shown in header; concurrency warning before save (AD-13)
- Tab selector rendered in header (Phase 4)
- `spreadsheetId` extracted from `profile.url` via `js/utils/sheetsUrl.js`

**Current state:** Complete and focused-tested. Current behaviour includes:

- active profile load via IndexedDB
- Google sign-in gate
- locale selector
- sheet-tab selector
- draft persistence per profile/tab/locale
- setup modal flow that stores `googleClientId` in IndexedDB metadata
- save back through `ProgramSheetService`
- session restore messaging when an auth return resumes a saved draft
- auth-expiry recovery that returns the page to the sign-in gate without discarding drafts
- concurrency conflict acknowledgement with a "Save anyway?" confirmation path
- service worker precache coverage for `cms/index.html` with a cache version bump

**Service worker:** `cms/index.html` is now in the `URLS` precache list and the cache `VERSION` has been bumped.

### Phase 7 — `cms_agenda/index.html` + `js/cms-agenda.js` + `AgendaKeyEditor.mjs`

**Objective:** Mobile-optimised agenda editor at `/meeting-program/cms_agenda/`.

**Key behaviours:**

- Key picker `<select>` from `AGENDA_KEYS` with friendly labels
- Compact tab selector in header (Phase 4 integration — ⬅ Make Active is primary action)
- Dynamic form (3 types: textarea / repeatable-single / repeatable-name-calling)
- Dirty map `{ [key]: values[] }` in memory, persisted to `agenda_draft_${profileId}`
- "Publish All Pending" iterates dirty map per key, shows ✅/❌ per key (AD-09)
- Non-blocking "Tap to sign in again" on re-auth (AD-08)
- Deep-link from `AgendaSettings.js` "Edit Agenda" button

**Current state:** Complete and focused-tested. Current behaviour includes:

- mobile shell at `cms_agenda/index.html`
- `AgendaKeyEditor` support for textarea, repeatable-single, and repeatable pair forms
- dirty draft persistence via `agenda_draft_${profileId}`
- per-key publish and sequential "Publish All Pending"
- non-blocking re-auth prompt with setup modal fallback for `googleClientId`
- sheet-tab selection plus "Make Active" support
- agenda settings deep-link support via `profileId`

**Service worker:** `cms_agenda/index.html` is now in the `URLS` precache list and the cache `VERSION` has been bumped.

### Phase 8 — Tests, Service Worker, i18n

**Current state:** Complete. Phase 8 added:

- `e2e/scenarios/cms.spec.js` for desktop CMS browser flows
- `e2e/scenarios/cms-agenda.spec.js` for mobile agenda flows on mobile Playwright projects
- `e2e/helpers/sheetsApiMock.js` for deterministic Sheets + Drive API routing
- `e2e/fixtures/cmsAuth.js` for IndexedDB/bootstrap seeding and fake OAuth session setup
- service worker coverage for both CMS shells with versioned precache entries
- `test/cms-i18n.test.mjs` for CMS translation-key coverage across supported languages

**Validation summary:**

- `npx vitest run test/cms-i18n.test.mjs`
- `npx playwright test e2e/scenarios/cms.spec.js e2e/scenarios/cms-agenda.spec.js --project=chromium --project="Mobile iPhone" --project="Mobile Android"`

  **Rationale:** The two CMS pages have fundamentally different write semantics (full-CSV batch vs single-key column write). A "shared" service that covers both would need two incompatible interfaces; splitting into domain services keeps each boundary clean and individually testable.

### Phase 9 — Hardening Follow-up

**Objective:** Close the review findings raised after the Phase 8 rollout so the final CMS feature state is production-hardened, not just functionally complete under mocked validation.

**Why this phase exists:** Winston, Murat, and the adversarial review all agreed that the current rollout is close, but still has boundary risks, a few misleading completion claims, and a small set of production-critical gaps.

**Current Phase 9 status:** Complete. The following slices are implemented and validated:

- newly added CMS rows append correctly instead of being dropped on save
- CMS and agenda tab selectors render titles as text, not raw HTML
- agenda bulk publish reports partial failure truthfully
- authenticated Google API traffic bypasses shared runtime caching and service-worker tests execute the real fetch routing path
- draft restoration now reapplies saved locale/tab/key context before first load
- Agenda Settings now reflects editor configuration separately from legacy main-app agenda availability
- CMS shell labels and setup chrome are localized and covered by translation tests
- desktop browser coverage now includes auth-expiry save handling and conflict acknowledgement
- oilLamp checkbox correctly deletes its row from the sheet when unchecked after being enabled (via `getRemovedKeys()` and `writeSheetWithDeletes()`)
- XSS vulnerability in `renderPendingList` (`cms-agenda.js`) fixed — replaced `innerHTML` with safe `document.createElement` and `textContent` for all dynamic content from `dirtyMap` keys
- AgendaSheetService oilLamp integration tests added (write existing row, append new key, header-aware reading)
- AgendaSheetService conflict detection tests added (optimistic write, sequential multi-key writes)
- SheetEditor test suite completely rewritten to match actual component API (`selectRow`, `rows[rowIndex]`, language pills) — 66 tests all passing
- Full test suite: 53 test files, 1052 tests passing, 0 failures

**Phase 9 action plan:**

1. ~~Fix desktop CMS save semantics so newly added repeatable rows are appended instead of being silently dropped.~~ — Complete (via `_writeSheetInternal` append logic + `ProgramSheetService.writeSheet` tests)
2. ~~Replace raw `innerHTML` tab-option rendering in both CMS pages with safe DOM construction or escaped values.~~ — Complete (`replaceSelectOptions` uses `createElement` + `textContent`)
3. ~~Change agenda bulk publish so partial failures produce a partial-failure result, not a blanket success message.~~ — Complete
4. ~~Tighten the service worker boundary so authenticated Google API traffic is never cached in the shared dynamic cache.~~ — Complete
5. ~~Reconcile `AgendaSettings.js` with the OAuth-backed agenda CMS flow so "Connected" reflects the actual integration path.~~ — Complete
6. ~~Restore saved draft context by reselecting the saved locale/tab before matching, rather than only restoring when the current default view already matches.~~ — Complete
7. ~~Finish shell-level CMS i18n for `cms/index.html` and `cms_agenda/index.html`, then narrow any remaining completion language until that work is fully shipped.~~ — Complete
8. ~~Replace simulated service-worker decision tests with execution against the real worker logic or a closer harness.~~ — Complete
9. ~~Strengthen auth and browser verification around real-world failure paths: OAuth popup/return, auth expiry, conflict acknowledgement, and setup recovery.~~ — Complete

**Post-Phase 9 hardening (additional findings):**

- ~~XSS in `renderPendingList` (`cms-agenda.js` line 329-342).~~ — Complete: replaced `innerHTML` with `document.createElement` + `textContent` + `dataset.key`
- ~~AgendaSheetService oilLamp integration test gap.~~ — Complete: 5 new tests covering write existing row, append new key, header-aware reading, sequential writes
- ~~Conflict-retry + deletion integration test gap.~~ — Complete: 2 new tests for optimistic write behavior
- ~~SheetEditor test suite mismatch (30 failures).~~ — Complete: rewrote all 66 tests to match actual component API

**Final test status:** 53 files, 1052 tests, 0 failures.

**Acceptance evidence for Phase 9:**

- New or updated focused tests prove newly added CMS rows persist correctly.
- Browser automation or an equivalent high-fidelity harness covers at least one auth-expiry/recovery path and one conflict-recovery path.
- Service-worker tests execute the real routing/cache logic for the relevant CMS request classes.
- CMS shell strings are verified through i18n coverage, not only component-level translation keys.
- The Agenda Settings to mobile CMS handoff is validated against the real OAuth-backed editor flow, not only legacy URL/cache checks.
- Feature status language is updated to match the actual evidence after the above fixes land.

---

### AD-04 — `drafts` Object Store in Dexie v6, Not a New Abstraction Class

**Decision:** Add a `drafts` object store to `db.js` in a new version bump (v6), accessed through `IndexedDBManager.js`. No new `EditorStateManager` class.

```js
// db.js v6 addition
db.version(6).stores({
  drafts: "id, profileId, updatedAt"
  // id = 'cms_draft_${profileId}' or 'agenda_draft_${profileId}'
});
```

**Rationale:** The project already has Dexie-managed schema versioning and `IndexedDBManager` CRUD. Adding another IndexedDB abstraction class risks a parallel DB connection or wraps `metadata` redundantly. Using the existing patterns keeps the codebase coherent.

**Draft auto-save rule (Desktop CMS):** Every field `change` event persists to `drafts` key `cms_draft_${profileId}`. On open, restore if present and show "Resume editing?" prompt. This brings the desktop CMS in line with the PWA offline-first contract.

---

### AD-05 — Program Sheet Write Strategy: Column-Safe Read-Modify-Write

**Decision:** Before writing, `ProgramSheetService` must:

1. Read the current sheet via `getValues()` to detect existing columns (key, en, es, fr, swa, etc.)
2. Only overwrite columns it manages; preserve columns it does not recognise
3. Target the language column matching the user's current locale, not a hardcoded `B` column

**Rationale:** Multi-language sheets have `key, en, es, fr, swa` columns. A blind `A:B` overwrite destroys all but one language. This is a data-corruption risk for every multi-language congregation.

**ADR required:** Before Phase 4 begins, write a 1-page Architecture Decision Record documenting the exact Sheets API range, write strategy, and rollback behaviour. This must be reviewed before implementation.

---

### AD-06 — Pipe Character Input Sanitisation

**Decision:** Free-text inputs in both CMS forms must **strip or reject pipe characters** (`|`) entered by the user. The serialiser inserts pipes between parts; user-typed pipes corrupt the format.

**Implementation:** `CmsEditor.mjs` and `AgendaKeyEditor.mjs` must both apply a `sanitisePart(str)` function that either strips `|` with a visible warning, or shows an inline validation error. This applies to every text input that feeds a pipe-separated field.

---

### AD-07 — `ALLOWED_KEYS` as Single Source of Truth for CMS Key List

**Decision:** `CmsEditor.mjs` must import `ALLOWED_KEYS` from `js/sanitize.js` (and `AGENDA_KEYS` from `js/agenda/constants.js`) as its definitive key list. The CMS must not maintain a parallel category-to-key mapping that can drift from the reader's allowed set.

**Rationale:** A key name typo in the CMS saves a row the main app silently ignores, creating invisible data loss for the user.

---

### AD-08 — OAuth Token: Shared sessionStorage Key Namespace

**Decision:** Define explicit `sessionStorage` key constants in `googleAuth.js` (already done). Both CMS pages must import and use these constants — not hardcode their own key strings — to avoid namespace collisions when both pages are open in the same browser session.

**Additional decision:** The Mobile Agenda CMS must handle re-authentication gracefully on mobile OS app-switch (iOS PWA can clear or preserve sessionStorage unpredictably). On load, if `isAuthenticated()` returns false, show a non-blocking "Tap to sign in again" prompt rather than a blocking modal.

---

### AD-09 — "Publish All Pending" Action for Mobile Agenda CMS

**Decision:** In addition to per-key Publish, the Mobile Agenda CMS must expose a **"Publish All Pending"** button in the header that:

1. Iterates the dirty keys map
2. Calls `AgendaSheetService.writeAgendaKey()` for each dirty key sequentially
3. Marks each key done (✅) or failed (❌) individually in the UI
4. Failed keys remain in the dirty map with a retry affordance
5. Success clears both in-memory dirty state and IndexedDB draft for that key atomically

**Rationale:** Leaders editing the agenda on Sunday morning edit multiple keys (announcements + callings + releases). Per-key publish is acceptable for single edits; publishing all pending with individual status is required for multi-key editing sessions.

---

### AD-10 — Service Worker: Precache New Pages + Version Bump

**Decision:** Adding `cms/index.html` and `cms_agenda/index.html` requires:

1. Adding both paths to the `URLS` precache array in `service-worker.js`
2. Bumping the `VERSION` constant (triggers full cache refresh for all users)
3. Verifying `sheets.googleapis.com` API calls are **not** intercepted by the service worker fetch handler (currently only `docs.google.com` is intercepted — keep it that way)

This must be the **first commit** when CMS page files are created.

---

### AD-11 — i18n: CMS UI Strings Must Use `t()` from Day One

**Decision:** All CMS user-visible strings (labels, placeholders, button text, error messages, toasts) must be added to `js/i18n/index.js` and accessed via `t()`. Do not hardcode English strings in component templates.

**Scope:** Desktop CMS and Mobile Agenda CMS both. The app has Spanish, French, and Swahili-speaking users; CMS labels in English-only is not acceptable.

---

### AD-12 — OAuth Redirect State Preservation (Desktop CMS)

**Decision:** Before initiating a Google OAuth PKCE redirect from the Desktop CMS, the entry point (`js/cms.js`) must:

1. Auto-save the current form state to `drafts` store (draft key `cms_draft_${profileId}`)
2. Set a `sessionStorage` flag `cms_auth_pending = true` with a short TTL
3. On page load after redirect return, check flag → restore draft → clear flag → show "Session restored" toast

**Rationale:** Non-technical users who start filling in the CMS before authenticating, or whose token expires mid-session, must not lose their edits to an OAuth redirect. For this audience, unexplained data loss is a trust-destroying event.

---

### AD-13 — Concurrent Write Acknowledgement

**Decision:** The plan explicitly adopts **last-write-wins** semantics (consistent with Google Sheets API default behaviour) with the following mitigations:

1. The Desktop CMS header displays the sheet's `lastModifiedTime` (from `getSpreadsheetMeta()`) on load
2. Before "Save to Sheets", re-fetch `lastModifiedTime`; if it changed since page load, show a warning: "This sheet was modified by another user since you opened it. Save anyway?"
3. The Mobile Agenda CMS, writing per-key, is less susceptible; no additional guard needed beyond the per-key publish toast

This is acknowledged as a limitation of a no-backend static PWA architecture.

---

## Test Strategy Summary

Focused validation already in place for the implemented phases, with broader E2E and service-worker coverage still pending.

### Completed / Passing

- [x] `test/db-path.test.mjs` — DB suffix isolation for CMS sub-paths (AD-02)
- [x] `test/services/SheetsApiClient.test.mjs` — values + spreadsheet-level client coverage
- [x] `test/services/ProgramSheetService.test.mjs` — column-safe read-modify-write (AD-05)
- [x] `test/services/AgendaSheetService.test.mjs` — `writeAgendaKey` serialisation, per-key publish
- [x] `test/db-v6-migration.test.mjs` — `drafts` store Dexie v6 migration on existing DB

### Focused component/page coverage now in place

- [x] `test/components/CmsEditor.test.mjs` — current focused component coverage (11 passing)
- [x] `test/cms.test.mjs` — current focused desktop CMS page coverage (3 passing)

### Still planned

- [x] `test/components/AgendaKeyEditor.test.mjs` — dynamic form dispatch and repeatable row coverage
- [x] `test/cms-agenda.test.mjs` — focused agenda page coverage for publish, draft, auth, and tab actions
- [x] `e2e/scenarios/cms.spec.js` — desktop CMS browser flows
- [x] `e2e/scenarios/cms-agenda.spec.js` — mobile agenda browser flows on `Mobile iPhone` and `Mobile Android`
- [x] `e2e/helpers/sheetsApiMock.js` — shared `page.route()` handler for Sheets + Drive APIs
- [x] `e2e/fixtures/cmsAuth.js` — CMS bootstrap + `injectFakeToken(page)` support for E2E
- [x] `test/cms-i18n.test.mjs` — CMS translation coverage across supported languages

---

## Current File Map

```
js/
  auth/
    googleAuth.js               ✅ Phase 1 — OAuth 2.0 PKCE module
  services/
    SheetsApiClient.mjs         ✅ Phase 2 — low-level Sheets REST client
    ProgramSheetService.mjs     ✅ Phase 2 — program sheet domain service
    AgendaSheetService.mjs      ✅ Phase 2 — agenda sheet domain service
    SheetTabService.mjs         ✅ Phase 4 — tab list, duplicate, make active
  data/
    db.js                       ✅ Phase 3 — v6 drafts store
    IndexedDBManager.js         ✅ Phase 3 — draft + metadata CRUD
  utils/
    sheetsUrl.js                ✅ Pre-gate — shared spreadsheet URL helpers
  components/
    CmsEditor.mjs               ✅ Phase 5 — desktop CMS component complete
    AgendaKeyEditor.mjs         ✅ Phase 7 — mobile agenda form component
  cms.js                        ✅ Phase 6 — desktop CMS flow complete
  cms-agenda.js                 ✅ Phase 7 — mobile agenda entry point

cms/
  index.html                    ✅ Phase 6 — desktop CMS shell + SW precache

cms_agenda/
  index.html                    ✅ Phase 7

test/
  db-path.test.mjs              ✅ Pre-gate
  sheetsUrl.test.mjs            ✅ Pre-gate
  db-v6-migration.test.mjs      ✅ Phase 3
  cms.test.mjs                  ✅ Phase 6 — 10 focused tests
  cms-agenda.test.mjs           ✅ Phase 7 — 5 focused tests
  cms-i18n.test.mjs             ✅ Phase 8 — CMS translation coverage
  services/
    SheetsApiClient.test.mjs    ✅ Phase 2
    ProgramSheetService.test.mjs ✅ Phase 2
    AgendaSheetService.test.mjs  ✅ Phase 2
    SheetTabService.test.mjs    ✅ Phase 4
  components/
    CmsEditor.test.mjs          ✅ Phase 5
    AgendaKeyEditor.test.mjs    ✅ Phase 7 — 5 focused tests

docs/
  ADR-001-program-sheet-write-strategy.md  ✅ Pre-gate
  FEATURE_CMS_EDIT.md                      ✅ Single source of truth

e2e/
  scenarios/
    cms.spec.js                 ✅ Phase 8 — desktop CMS browser flows
    cms-agenda.spec.js          ✅ Phase 8 — mobile agenda browser flows
  helpers/
    sheetsApiMock.js            ✅ Phase 8 — shared Sheets/Drive route mock
  fixtures/
    cmsAuth.js                  ✅ Phase 8 — CMS auth/storage bootstrap helpers
```

---

## Next Steps

1. Feature rollout is complete; next work can shift to refinement, broader regression depth, or release packaging as needed.

---

## Field Definitions & CMS Form Spec

This section defines the CMS form field(s) for every supported key. For each key:

- **Required** = must have a value for a valid program
- **Optional** = may be omitted; row not created if blank
- **Sub-fields** = each pipe-separated part gets its own input
- **Auto-insert** = characters added by serialiser (user never types them)

---

### Category: Unit Information

| Key           | Required     | Sub-fields                  | Notes                                  |
| ------------- | ------------ | --------------------------- | -------------------------------------- |
| `unitName`    | **REQUIRED** | Text: "Ward/Branch name"    | e.g. "Millcreek 5th Ward"              |
| `unitAddress` | Optional     | Text: "Meeting address"     | e.g. "123 Main St, Salt Lake City, UT" |
| `stakeName`   | Optional     | Text: "Stake/District name" |                                        |
| `date`        | **REQUIRED** | Text: "Meeting date"        | e.g. "January 5, 2026"                 |

---

### Category: Conducting

| Key             | Required | Sub-fields        | Notes                      |
| --------------- | -------- | ----------------- | -------------------------- |
| `presiding`     | Optional | Text: "Full name" | Honorifics auto-translated |
| `conducting`    | Optional | Text: "Full name" | Honorifics auto-translated |
| `musicDirector` | Optional | Text: "Full name" |                            |
| `musicOrganist` | Optional | Text: "Full name" |                            |

---

### Category: Hymns

All hymn keys share the same two-field pattern:

| Sub-field      | Placeholder               | Notes                             |
| -------------- | ------------------------- | --------------------------------- |
| Hymn number    | "e.g. 62"                 | Looked up in hymn data on save    |
| Title override | "(optional) Custom title" | Leave blank to use official title |

| Key                | Required                                                            |
| ------------------ | ------------------------------------------------------------------- |
| `openingHymn`      | **REQUIRED**                                                        |
| `sacramentHymn`    | Optional                                                            |
| `intermediateHymn` | Optional (repeatable — `intermediateHymn1`, `intermediateHymn2`, …) |
| `closingHymn`      | Optional                                                            |
| `hymn`             | Optional (generic)                                                  |

---

### Category: Prayers

| Key             | Required | Sub-fields                                     |
| --------------- | -------- | ---------------------------------------------- |
| `openingPrayer` | Optional | Text: "Full name" (honorifics auto-translated) |
| `closingPrayer` | Optional | Text: "Full name" (honorifics auto-translated) |

---

### Category: Speakers

| Key       | Required              | Sub-fields                                       | Auto-insert         |
| --------- | --------------------- | ------------------------------------------------ | ------------------- |
| `speaker` | Optional (repeatable) | Text: "Name" \| Text: "(Optional) Caption/topic" | `\|` between fields |

Repeatable: user can click "+ Add Speaker" to insert additional speaker rows.  
Speaker rows are numbered `speaker1`, `speaker2`, etc. in the CSV but displayed as a simple list.

---

### Category: Structural

| Key              | Required | Sub-fields                                  | Notes                                               |
| ---------------- | -------- | ------------------------------------------- | --------------------------------------------------- |
| `horizontalLine` | Optional | Text: "(Optional) Section label"            | Blank = plain `<hr>`; add text for labelled divider |
| `sacramentLine`  | Optional | Text: "(Optional) Custom sacrament heading" | Blank = default translated text                     |
| `oilLamp`        | Optional | Toggle (no text input)                      | Displays the oil lamp image                         |

---

### Category: Leaders

| Key      | Required              | Sub-fields                                                                      | Auto-insert         |
| -------- | --------------------- | ------------------------------------------------------------------------------- | ------------------- |
| `leader` | Optional (repeatable) | Text: "Name" \| Text: "Phone (optional)" \| Text: "Calling/Position (optional)" | `\|` between fields |

Repeatable: "+ Add Leader" button.

---

### Category: Statements & Links

| Key                        | Required | Sub-fields                                                                                                                   | Auto-insert                                           |
| -------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `generalStatement`         | Optional | Textarea: "Text"                                                                                                             | None                                                  |
| `generalStatementWithLink` | Optional | Textarea: "Text (click to insert link placeholder)" \| Text: "URL"                                                           | `<LINK>` at cursor position in text; `\|` before URL  |
| `link`                     | Optional | Text: "Display text" \| Text: "URL (https://…)"                                                                              | `\|` between fields                                   |
| `linkWithSpace`            | Optional | Checkbox: "Include image icon" \| Text: "Display text" \| Text: "URL (https://…)" \| Text: "Image URL (optional, https://…)" | Prepends `<IMG> ` if checkbox on; `\|` between fields |

---

### Category: Media

| Key     | Required | Sub-fields                                                  | Notes             |
| ------- | -------- | ----------------------------------------------------------- | ----------------- |
| `photo` | Optional | Text: "Image URL (https://…)" \| Text: "(Optional) Caption" | URL must be https |

---

### Category: Lessons

| Key                  | Required | Sub-fields                    | Notes                          |
| -------------------- | -------- | ----------------------------- | ------------------------------ |
| `lessonEQRS`         | Optional | Text: "Lesson title or topic" | Elders Quorum / Relief Society |
| `lessonSundaySchool` | Optional | Text: "Lesson title or topic" |                                |
| `lessonYouth`        | Optional | Text: "Lesson title or topic" |                                |
| `lessonPrimary`      | Optional | Text: "Lesson title or topic" |                                |

---

### Category: Leadership Agenda

> These fields are only visible in the CMS if the active profile has an agenda URL configured.

| Key                         | Required | Sub-fields                                       | Notes                          |
| --------------------------- | -------- | ------------------------------------------------ | ------------------------------ |
| `agendaGeneral`             | Optional | Textarea: "General notes"                        | Rendered as paragraphs         |
| `agendaAnnouncements`       | Optional | Repeatable text inputs: "Announcement 1", "2", … | Each becomes a column in sheet |
| `agendaAckVisitingLeaders`  | Optional | Repeatable text: "Leader name"                   |                                |
| `agendaBusinessStake`       | Optional | Textarea                                         |                                |
| `agendaBusinessReleases`    | Optional | Repeatable: "Name \| Calling"                    |                                |
| `agendaBusinessCallings`    | Optional | Repeatable: "Name \| Calling"                    |                                |
| `agendaBusinessPriesthood`  | Optional | Textarea                                         |                                |
| `agendaBusinessNewMoveIns`  | Optional | Repeatable: "Name"                               |                                |
| `agendaBusinessNewConverts` | Optional | Repeatable: "Name"                               |                                |
| `agendaBusinessGeneral`     | Optional | Textarea                                         |                                |

---

## Key Files Reference

**Already Created**:

- [js/auth/googleAuth.js](../js/auth/googleAuth.js) — OAuth module ✅
- [test/auth/googleAuth.test.mjs](../test/auth/googleAuth.test.mjs) — OAuth tests ✅

**Current / Remaining (v2)**:

- `cms/index.html` — desktop CMS page at `/meeting-program/cms/`
- `js/cms.js` — desktop CMS entry point
- `cms_agenda/index.html` — mobile agenda CMS at `/meeting-program/cms_agenda/`
- `js/cms-agenda.js` — mobile agenda CMS entry point
- `js/components/CmsEditor.mjs` — Desktop full-program UI component
- `js/components/AgendaKeyEditor.mjs` — Mobile agenda key picker + dynamic form
- `js/services/SheetsApiClient.mjs` / `ProgramSheetService.mjs` / `AgendaSheetService.mjs` / `SheetTabService.mjs` — current service stack
- `js/data/db.js` / `IndexedDBManager.js` — current draft + metadata persistence stack
- Update `js/agenda/AgendaSettings.js` — Add "Edit Agenda" deep-link button to `/cms_agenda/`

---

## Summary

**Current Status**: Phases 1-5 complete; Phase 6 is implemented and under hardening.

**Recently validated**:

- `test/components/CmsEditor.test.mjs`: 16 focused tests passing
- `test/cms.test.mjs`: 8 focused tests passing

**Primary remaining work**:

- finish the remaining Phase 6 setup/auth-return polish
- implement the mobile agenda CMS flow
- expand broader CMS test coverage
