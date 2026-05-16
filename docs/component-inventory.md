# Component Inventory

**Generated:** 2026-05-16  
**Scan Level:** Exhaustive  
**Architecture:** Vanilla JS ES6 modules, no framework

---

## Overview

The application is structured as a collection of ES6 modules organized by concern. There are no framework components (no React/Vue/Angular). All UI is composed via DOM manipulation.

---

## Page Entry Points

| File | Page | Purpose |
|------|------|---------|
| `index.html` + `js/main.js` | Main program viewer | Core app: QR scan, profile management, program display |
| `editor.html` + `js/editor.js` | CMS Editor | Google Sheets-backed content editor with OAuth |
| `archive.html` + `js/archive.js` | Archive viewer | Browse and view archived historical programs |
| `offline.html` | Offline fallback | Service worker offline page |

---

## Application Modules (`js/`)

### Orchestration

| Module | Purpose | Key Exports |
|--------|---------|------------|
| `main.js` | App entry: initializes all modules, binds events, coordinates loading | (IIFE, no explicit exports) |
| `editor.js` | Editor page entry: Google Auth → profile load → SheetEditor init | (IIFE) |
| `archive.js` | Archive page entry: profile load → archive list render | (IIFE) |

---

### Feature Modules

#### Profile Management

| Module | Purpose | Key Exports |
|--------|---------|------------|
| `js/profiles.js` | High-level profile wrapper with in-memory cache | `addProfile`, `selectProfile`, `removeProfile`, `getProfiles`, `getCurrentProfile`, `refreshProfiles` |
| `js/data/ProfileManager.js` | IndexedDB-backed profile CRUD, legacy migration | `initProfileManager`, `addProfile`, `selectProfile`, `removeProfile`, `getProfiles` |

#### Archive Management

| Module | Purpose | Key Exports |
|--------|---------|------------|
| `js/data/ArchiveManager.js` | Auto-archive programs, storage management | `initArchiveManager`, `autoArchive`, `getProfileArchives`, `deleteArchive`, `getStorageInfo` |

#### History

| Module | Purpose | Key Exports |
|--------|---------|------------|
| `js/history.js` | Program history (IndexedDB), localStorage→IDB migration | `saveProgramHistory`, `getProgramHistory`, `cleanupHistory`, `clearHistory` |

#### Agenda (Leadership)

| Module | Purpose | Key Exports |
|--------|---------|------------|
| `js/agenda/AgendaSettings.js` | Modal for attaching agenda URL to a profile | `initAgendaSettings`, `openAgendaSettingsModal` |
| `js/agenda/AgendaRenderer.js` | Renders leadership agenda as accordion panels; markdown parser | `parseMarkdown`, `renderAgendaItem`, `renderAgendaPanel` |
| `js/agenda/constants.js` | Key categorization (agenda, business, lesson) | `isAgendaKey`, `isBusinessKey`, `isLessonKey`, `LESSON_ICONS` |

#### QR Code

| Module | Purpose | Key Exports |
|--------|---------|------------|
| `js/qr.js` | QR scanner (jsQR + camera API) and URL validator | `showScanner`, `extractSheetUrl`, `isValidSheetUrl`, `isSafari`, `initDOMElements` |
| `js/generate-qr.js` (root) | QR code generator utility | Standalone script |

#### Sharing

| Module | Purpose | Key Exports |
|--------|---------|------------|
| `js/share.js` | Share modal (QR display), help modal, first-time help logic | `initShareUI`, `openShareModal`, `promptPWAInstall`, `openHelpModal` |

#### Install / PWA

| Module | Purpose | Key Exports |
|--------|---------|------------|
| `js/install-manager.js` | PWA install prompt lifecycle management | `initInstallUI`, `init`, `showInstallButton`, `hideInstallButton` |
| `js/service-worker-manager.js` | Service worker registration, update triggering | `register`, `checkForUpdate`, `triggerUpdate`, `setRegistration` |

#### Versioning

| Module | Purpose | Key Exports |
|--------|---------|------------|
| `js/version.js` | Single source of truth for app version | `VERSION` (const: `"2.3.2"`) |
| `js/version-parser.js` | Semantic version comparison utilities | `isNewer`, `parseVersion` |
| `js/version-checker.js` | Fetches remote manifest, triggers update banner | `checkForUpdates`, `fetchRemoteManifest`, `addCacheBusting` |

#### Migration

| Module | Purpose | Key Exports |
|--------|---------|------------|
| `js/data/MigrationSystem.js` | Detects `obsolete` + `migrationUrl` keys in CSV | `checkMigrationRequired`, `initMigrationSystem` |
| `js/data/MigrationBanner.js` | UI banner for cross-ward migration prompt | `initMigrationBanner`, `showMigrationBanner`, `hideMigrationBanner` |

#### Theme

| Module | Purpose | Key Exports |
|--------|---------|------------|
| `js/theme-early.js` | Applies theme synchronously before DOM (prevents flicker) | Inline script |
| `js/theme.js` | Theme management: load, save, toggle (IDB + localStorage) | `initTheme`, `toggleTheme`, `getTheme`, `applyTheme`, `setMetadataDependencies` |

---

### Data Layer

| Module | Purpose | Key Exports |
|--------|---------|------------|
| `js/data/db.js` | Dexie database definition, schema versioning v1-v5 | `db` (default), `DB_NAME`, `DB_SCHEMA_VERSION` |
| `js/data/IndexedDBManager.js` | Full CRUD for all stores (profiles, archives, metadata, etc.) | `getProfile`, `saveProfile`, `getAllProfiles`, `getArchive`, `saveArchive`, `getMetadata`, `setMetadata`, `createDatabase`, `calculateChecksum`, `getStorageInfo` |
| `js/data/EditorStateManager.js` | Editor session + change + snapshot tracking (separate Dexie DB) | `EditorStateManager` (IIFE module with `startSession`, `recordChange`, `saveSnapshot`, `exportCSV`) |
| `js/data/hymnsLookup.js` | Static lookup tables: LDS Hymnal + Children's Songbook | `childrenSongLookup`, `hymnLookup` |

---

### UI Components

| Module | Purpose | Key Exports |
|--------|---------|------------|
| `js/components/SheetEditor.mjs` | Form-based CMS editor: key list, language pills, change tracking | `SheetEditor` class |
| `js/components/diagnostic-button.js` | Debug diagnostics button overlay | `initDiagnosticButton` |

---

### Services

| Module | Purpose | Key Exports |
|--------|---------|------------|
| `js/services/sheetsApiService.js` | Google Sheets API v4 wrapper: read metadata, verify collaborator, upload CSV | `SheetsAPI` (IIFE module with `initialize`, `getSheetMetadata`, `uploadCSV`, `extractSheetIdFromUrl`) |
| `js/auth/googleAuth.js` | Google OAuth 2.0 PKCE flow (no backend) | `GoogleAuth` (IIFE module with `initialize`, `signIn`, `signOut`, `getAccessToken`, `isAuthenticated`) |

---

### Workers

| Module | Purpose | Key Exports |
|--------|---------|------------|
| `js/workers/data.worker.js` | Web Worker: CSV parsing, checksum, compare, sort, archive cleanup | Handles messages: `parseCSV`, `calculateChecksum`, `compareData`, `sortData`, `cleanupArchives` |
| `js/workers/workerInterface.js` | Promise-based wrapper around the Web Worker | `createWorker`, `terminateWorker` |

---

### Utilities

| Module | Purpose | Key Exports |
|--------|---------|------------|
| `js/utils/csv.js` | CSV parser (multi-language aware), sheet URL fetcher | `parseCSV`, `fetchSheet`, `sanitizeSheetUrl` |
| `js/utils/renderers.js` | DOM renderers for all program row types (speakers, hymns, prayers, etc.) | `renderers`, `renderProgram`, `renderSpeaker`, `renderOpeningHymn`, `appendRow`, `appendRowHymn`, `splitHymn`, `normalizeRenderableKey` |
| `js/utils/dom-utils.js` | DOM helper utilities | `clearElement`, `setText`, `createTextElement` |
| `js/utils/error-handler.js` | Global error handling and user-facing error display | `handleError` |
| `js/utils/timer-manager.js` | Named timer lifecycle management | `createTimer`, `clearTimer`, `clearAllTimers` |
| `js/utils/promise-utils.js` | Promise helpers | (utility functions) |
| `js/utils/console-capture.js` | Captures console logs for diagnostics | `initConsoleCapture`, `getConsoleLogs` |
| `js/utils/diagnostic-data-collector.js` | Collects full diagnostic snapshot (profile, localStorage, logs, device) | `collectDiagnosticData` |
| `js/sanitize.js` | Input sanitization: allowed keys whitelist, HTML strip, safe-value regex | `ALLOWED_KEYS`, `sanitizeEntry`, `isSafeUrl`, `stripTags` |
| `js/i18n/index.js` | Internationalization: language loading, translation lookup | `t`, `getLanguage`, `initI18n`, `setLanguage` |
| `js/i18n/honorifics.js` | Honorific translation by language | `translateHonorifics` |

---

### Configuration

| Module | Purpose | Key Exports |
|--------|---------|------------|
| `js/version.js` | Current version constant | `VERSION` |
| `js/config/baseUrl.js` | Dynamic base URL detection (dev/GitHub Pages) | `getBaseUrl`, `detectFromLocation`, `getVersionFeedUrl` |
| `js/config/defaultUrl.js` | Default Google Sheets URL constant | `DEFAULT_URL` |

---

## Static Assets

| Path | Description |
|------|------------|
| `css/styles.css` | Single global stylesheet (no framework, custom CSS) |
| `img/` | Favicon and app icons |
| `manifest.webmanifest` | PWA manifest (production) |
| `manifest.dev.webmanifest` | PWA manifest (dev) |
| `manifest.prod.webmanifest` | PWA manifest (prod override) |
| `service-worker.js` | Service worker: static precache + dynamic (Sheets) cache |

---

## Design Patterns Used

| Pattern | Where |
|---------|-------|
| IIFE Module (Revealing Module) | `GoogleAuth`, `SheetsAPI`, `EditorStateManager` |
| ES6 Class | `SheetEditor` |
| Dependency Injection | `theme.js` (injectable metadata fns for testing) |
| Observer / Event | `window.addEventListener('qr-scanned', ...)`, `beforeinstallprompt` |
| Web Worker offload | CSV parsing, checksum, archive cleanup |
| Lazy import | `install-manager.js` (dynamically imported in `main.js`) |
| Repository pattern | `IndexedDBManager.js` (abstracts Dexie from callers) |
