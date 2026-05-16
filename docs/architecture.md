# Architecture

**Generated:** 2026-05-16  
**Version:** 2.3.2  
**Source:** Exhaustive code scan

---

## Executive Summary

**meeting-program** is an **offline-first Progressive Web App (PWA)** for displaying sacrament meeting programs. It is built entirely with **Vanilla JavaScript ES6 modules** (no framework, no bundler) and deployed to **GitHub Pages** at no cost.

**Core design goals:**
- Works offline on any smartphone
- No server-side infrastructure needed
- Private program data via Google Sheets (URL-based access control)
- Real-time updates from sheet → phone
- Installable as a native-like app (PWA)

---

## High-Level Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                  Browser (User Device)                        │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │              Pages (HTML Entry Points)                  │  │
│  │  index.html  │  editor.html  │  archive.html            │  │
│  └─────────────────────────────────────────────────────── ┘  │
│                          │                                    │
│                          ▼                                    │
│  ┌────────────────────────────────────────────────────────┐  │
│  │         Application Layer (ES6 Modules)                 │  │
│  │  main.js │ editor.js │ archive.js │ profiles.js         │  │
│  │  qr.js   │ share.js  │ theme.js   │ version-checker.js  │  │
│  └────────────────────────────────────────────────────────┘  │
│                          │                                    │
│             ┌────────────┼─────────────┐                      │
│             ▼            ▼             ▼                      │
│  ┌──────────────┐ ┌──────────┐ ┌─────────────┐              │
│  │ Data Layer   │ │  i18n    │ │  Web Worker  │              │
│  │ IndexedDB    │ │  module  │ │ data.worker  │              │
│  │ (Dexie v4)   │ │ (4 langs)│ │ (CSV, hash) │              │
│  └──────────────┘ └──────────┘ └─────────────┘              │
│                          │                                    │
│  ┌────────────────────────────────────────────────────────┐  │
│  │               Service Worker Layer                      │  │
│  │  Static precache │ Dynamic (Sheets) cache │ Update mgmt │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
                           │                │
              ┌────────────┘                └────────────────┐
              ▼                                              ▼
 ┌────────────────────────┐                 ┌───────────────────────┐
 │  Google Sheets (CSV)   │                 │  GitHub Pages (CDN)   │
 │  Public/Private CSV    │                 │  Static file hosting  │
 │  export URL            │                 │  + version.json feed  │
 └────────────────────────┘                 └───────────────────────┘
              │
              ▼ (Editor only)
 ┌────────────────────────┐
 │ Google Sheets API v4   │
 │ + Google Identity GIS  │
 │ (OAuth 2.0 PKCE)       │
 └────────────────────────┘
```

---

## Architecture Principles

| Principle | Implementation |
|-----------|---------------|
| **Offline-First** | Service Worker precaches all static assets; Dexie stores program data locally |
| **No Build Step** | Browser loads ES6 modules directly — no webpack/vite required |
| **Minimal Dependencies** | Only Dexie, qrcode, uuid at runtime; everything else is stdlib/native |
| **Client-Side Rendering** | All DOM manipulation via JS; no SSR |
| **No Backend** | GitHub Pages (static), Google OAuth PKCE (no server needed) |
| **Performance** | Web Worker offloads CSV parsing; lazy module imports; localStorage for fast reads |
| **Security** | Input sanitization allowlist, URL validation, no innerHTML with user data |
| **Testability** | Dependency injection (theme.js), mocked IndexedDB (fake-indexeddb) |

---

## Module Architecture

### Application Layer

```
Application Layer
├── main.js              ← Orchestrator for index.html
│     Initializes all features, binds DOM events, manages loading state
├── editor.js            ← Orchestrator for editor.html
│     Manages auth flow, profile load, SheetEditor lifecycle
├── archive.js           ← Orchestrator for archive.html
│     Loads profiles, renders archive list, handles navigation
│
├── profiles.js          ← High-level profile API (in-memory cache + IDB)
├── history.js           ← Program history management (IDB + localStorage migration)
├── share.js             ← Share/Help modals, PWA install prompt
├── install-manager.js   ← beforeinstallprompt lifecycle
├── service-worker-manager.js  ← SW registration, update check, skip waiting
├── version-checker.js   ← Fetches version.json, triggers update banner
├── qr.js                ← Camera-based QR scanning (jsQR)
├── sanitize.js          ← Input validation: ALLOWED_KEYS, isSafeUrl, stripTags
│
├── agenda/
│   ├── AgendaSettings.js  ← Per-profile agenda URL configuration modal
│   ├── AgendaRenderer.js  ← Accordion + markdown renderer for leadership agenda
│   └── constants.js       ← Key type classification
│
├── auth/
│   └── googleAuth.js    ← Google Identity Services (GIS) OAuth 2.0 PKCE
│
├── services/
│   └── sheetsApiService.js  ← Google Sheets API v4 (metadata, collaborator check, CSV upload)
│
├── components/
│   ├── SheetEditor.mjs  ← Form-based key-by-key editor with change tracking
│   └── diagnostic-button.js  ← Dev diagnostic overlay
│
├── theme.js             ← Dark/light theme (IDB + localStorage)
└── i18n/
    ├── index.js         ← Translation lookup: en/es/fr/swa
    └── honorifics.js    ← Honorific translation by language/gender
```

### Data Layer

```
Data Layer
├── data/db.js              ← Dexie database definition (schema v1→v5)
│     DB: MeetingProgramDB (+ deployment suffix)
│     Stores: profiles, archives, metadata, migrations, history
│
├── data/IndexedDBManager.js ← Repository: full CRUD for all stores
│     getProfile/saveProfile/deleteProfile
│     getArchive/saveArchive/deleteArchive
│     getMetadata/setMetadata
│     calculateChecksum, getStorageInfo, getStorageIntegrity
│
├── data/ProfileManager.js  ← Profile business logic + localStorage migration
├── data/ArchiveManager.js  ← Archive management + auto-archive + storage bounds
├── data/EditorStateManager.js  ← Editor sessions/changes/snapshots (separate DB)
├── data/MigrationSystem.js ← Cross-ward migration detection (obsolete key)
├── data/MigrationBanner.js ← UI for migration prompt
└── data/hymnsLookup.js     ← Static hymnal lookup tables
```

### Processing Layer

```
Processing Layer
├── workers/data.worker.js      ← Web Worker: CSV parse, checksum, compare, sort, cleanup
└── workers/workerInterface.js  ← Promise-based message bus for data.worker
```

---

## Data Flow

### Program Loading (Happy Path)

```
User opens app
      │
      ▼
Load selected profile from IndexedDB
      │
      ▼
Fetch CSV from Google Sheets URL
      │   (network request, service worker may cache)
      ▼
Send CSV to Web Worker for parsing
      │   (parseCSV message)
      ▼
Sanitize keys against ALLOWED_KEYS
      │
      ▼
Store program in history (throttled, IDB)
      │
      ▼
Auto-archive program (if new/changed, IDB)
      │
      ▼
Check for migration (obsolete + migrationUrl keys)
      │
      ▼
Render program to DOM (renderers.js)
      │
      ▼
Apply i18n translations
```

### Offline Loading

```
User opens app (no network)
      │
      ▼
Service Worker intercepts fetch
      │
      ▼
Return cached CSV (if < 24h old)
      │
      ▼
Show "offline mode" banner
      │
      ▼
Render last known program from IndexedDB history
```

### PWA Update Flow

```
App loads
      │
      ▼
version-checker.js fetches version.json (hourly)
      │
      ▼
Compare local VERSION vs remote
      │
      ├── [no update] → do nothing
      │
      └── [new version] → Show update banner
               │
               ▼
         User taps "Update Now"
               │
               ▼
         service-worker-manager.triggerUpdate()
               │
               ▼
         SW: skipWaiting() → controllerchange
               │
               ▼
         Page reloads with new SW
```

### CMS Editor Flow (editor.html)

```
User opens editor.html
      │
      ▼
Load profile (requires selected profile)
      │
      ▼
GoogleAuth.initialize() → GIS token client
      │
      ▼
User taps "Sign In" → OAuth PKCE flow (popup)
      │
      ▼
SheetsAPI.initialize(accessToken)
      │
      ▼
SheetEditor loads: fetch CSV → parse → display key list
      │
      ▼
User edits field → EditorStateManager.recordChange()
      │
      ▼
User taps "Save" → SheetsAPI.uploadCSV()
      │
      ▼
Google Sheets updated → CSV re-fetched → main app refreshes
```

---

## Service Worker Strategy

The service worker (`service-worker.js`) uses a custom caching strategy:

| Resource Type | Strategy | Cache TTL |
|--------------|----------|-----------|
| Static assets (HTML, CSS, JS, img) | Network-first → cache fallback | Until new version |
| Google Sheets CSV | Network-first → cache fallback | 24 hours |
| Dynamic content | Cache-first, stale-while-revalidate | 30 days max |

**Cache names** (versioned by `VERSION`):
- `meeting-program-static-v2.3.2` — Precached HTML, CSS, JS
- `meeting-program-dynamic-v2.3.2` — Runtime fetched content

**Update mechanism:** Service worker version embedded in registration URL (`service-worker.js?v=2.3.2`), triggering re-install when version changes.

---

## Security Architecture

| Concern | Mitigation |
|---------|-----------|
| XSS from CSV data | `ALLOWED_KEYS` whitelist in `sanitize.js`; `SAFE_VALUE` regex; `stripTags()` |
| XSS from URLs | `isSafeUrl()` — validates scheme (http/https only) |
| XSS in agenda rendering | `escapeHtml()` in `AgendaRenderer.js` before markdown processing |
| OAuth token storage | `sessionStorage` only (cleared on browser close); no backend, no cookies |
| Google Sheets API | OAuth 2.0 PKCE flow — no client secret exposed |
| Data privacy | Sheets URL acts as secret; no centralized server stores user data |

---

## Technology Stack

| Category | Technology | Version | Notes |
|----------|-----------|---------|-------|
| **Language** | JavaScript (ES6+) | — | No transpilation, native modules |
| **Runtime** | Browser (Chrome, Safari, iOS, Android) | — | No Node.js at runtime |
| **Data Storage** | Dexie (IndexedDB) | ^4.3.0 | Schema v5, 2 databases |
| **Data Storage** | localStorage | native | Fast-access mirror, migration source |
| **External Data** | Google Sheets CSV | — | Public or authenticated |
| **External API** | Google Sheets API v4 | — | Editor write-back |
| **Auth** | Google Identity Services (GIS) | CDN | OAuth 2.0 PKCE |
| **QR** | jsQR | CDN | Camera-based QR scanning |
| **QR Gen** | qrcode | ^1.5.4 | QR code generation |
| **UUID** | uuid | ^13.0.0 | Profile/session IDs |
| **Dev Server** | Express.js | ^5.2.1 | Local only (`server.cjs`) |
| **Unit Tests** | Vitest | ^4.0.18 | jsdom environment |
| **E2E Tests** | Playwright | ^1.58.2 | Chrome + Mobile |
| **Linting** | ESLint | ^9.0.0 | Flat config |
| **Formatting** | Prettier | ^3.8.1 | |
| **Hosting** | GitHub Pages | — | Static, free |
| **CI/CD** | GitHub Actions (implied) | — | Auto-deploy on `master` push |

---

## Multi-Deployment Architecture

The app runs at two URLs with isolated data:

| Deployment | URL | DB Name |
|-----------|-----|---------|
| Production | `/meeting-program/` | `MeetingProgramDB__meeting-program` |
| Dev | `/meeting-program-dev/` | `MeetingProgramDB__meeting-program-dev` |
| Local | `/meeting-program/` | `MeetingProgramDB__meeting-program` |

The deployment path is detected from `window.location.pathname` at runtime and appended to the DB name, preventing data bleed between environments.

---

## Testing Architecture

| Layer | Tool | Location | Focus |
|-------|------|---------|-------|
| Unit | Vitest + jsdom | `test/` | Module logic, data layer, i18n |
| Integration | Vitest | `test/integration/` | Multi-module interactions |
| E2E | Playwright | `e2e/scenarios/` | User flows, PWA install, QR, language switch |
| Coverage | v8 | `coverage/` | `js/**/*.js` coverage tracking |

**Coverage target:** 80%+ (per CONTRIBUTING.md)

**Key test patterns:**
- `test/*.test.mjs` — one-to-one with source modules
- `test/migration-*.test.mjs` — database migration tests
- `e2e/scenarios/NN-*.spec.js` — numbered E2E scenarios
- `e2e/pages/` — Page Object Model for E2E
