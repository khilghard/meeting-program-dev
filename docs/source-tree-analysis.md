# Source Tree Analysis

**Generated:** 2026-05-16  
**Scan Level:** Exhaustive

---

## Repository Overview

```
meeting-program-dev/          # Project root (GitHub Pages → /meeting-program-dev/)
│
│── index.html                # [ENTRY] Main program viewer page
│── cms/index.html          # [ENTRY] CMS editor page (Google Sheets write-back)
│── archive.html              # [ENTRY] Historical archives viewer
│── offline.html              # [ENTRY] Service worker offline fallback page
│── service-worker.js         # [ENTRY] PWA service worker (caching, update lifecycle)
│── server.cjs                # [DEV] Express dev server (localhost:8000/meeting-program)
│── package.json              # npm manifest + scripts
│── vitest.config.mjs         # Unit test configuration (Vitest + jsdom)
│── playwright.config.js      # E2E test configuration (Chrome, Safari, Mobile)
│── eslint.config.mjs         # ESLint 9 flat config
│── manifest.webmanifest      # PWA web app manifest (symlink / default)
│── manifest.dev.webmanifest  # PWA manifest for dev deployment
│── manifest.prod.webmanifest # PWA manifest for prod deployment
│── version.json              # Remote version feed (fetched by version-checker)
│── generate-qr.js            # Standalone QR code generator script
│── sync-to-prod.sh           # Sync dev → prod deployment script
│── sync-version.cjs          # Version sync utility
│── update-version.js         # Version bump utility
│
├── js/                       # [SOURCE] All application JavaScript (ES6 modules)
│   ├── main.js               # App orchestrator (index.html entry point)
│   ├── cms.js                # CMS editor orchestrator (cms/index.html)
│   ├── archive.js            # Archive viewer orchestrator (archive.html)
│   ├── version.js            # VERSION constant ("2.3.2")
│   ├── version-parser.js     # Semantic version comparison
│   ├── version-checker.js    # Remote version fetch + update trigger
│   ├── service-worker-manager.js  # SW registration and update management
│   ├── install-manager.js    # PWA install prompt handling
│   ├── sanitize.js           # Input validation: ALLOWED_KEYS, isSafeUrl, stripTags
│   ├── qr.js                 # QR scanner (jsQR + MediaDevices API)
│   ├── share.js              # Share/help modals, PWA install prompt trigger
│   ├── profiles.js           # High-level profile wrapper (with memory cache)
│   ├── history.js            # Program history (IDB + localStorage migration)
│   ├── theme.js              # Theme management (dark/light, IDB + localStorage)
│   ├── theme-early.js        # Synchronous theme apply (prevents FOUC)
│   ├── generate-qr.js        # (see root level)
│   │
│   ├── agenda/               # Leadership agenda feature
│   │   ├── AgendaRenderer.js # Accordion panel renderer + markdown parser
│   │   ├── AgendaSettings.js # Modal UI for per-profile agenda URL config
│   │   └── constants.js      # Key categorization: isAgendaKey, isBusinessKey, LESSON_ICONS
│   │
│   ├── auth/                 # Google Authentication
│   │   └── googleAuth.js     # OAuth 2.0 PKCE (no backend, GIS library)
│   │
│   ├── components/           # Reusable UI components
│   │   ├── SheetEditor.mjs   # Form-based CMS editor (key list, language pills, change tracking)
│   │   └── diagnostic-button.js  # Debug diagnostics button overlay
│   │
│   ├── config/               # App configuration
│   │   ├── baseUrl.js        # Dynamic base URL detection (dev vs GitHub Pages)
│   │   └── defaultUrl.js     # DEFAULT_URL constant
│   │
│   ├── data/                 # Data layer
│   │   ├── db.js             # Dexie schema definition (MeetingProgramDB, v1-v5)
│   │   ├── IndexedDBManager.js  # Full CRUD: profiles, archives, metadata, history, migrations
│   │   ├── ProfileManager.js    # Profile business logic + legacy localStorage migration
│   │   ├── ArchiveManager.js    # Archive management + storage integrity
│   │   ├── EditorStateManager.js  # Editor session/change/snapshot (separate Dexie DB)
│   │   ├── MigrationSystem.js   # Cross-ward migration detection (obsolete + migrationUrl keys)
│   │   ├── MigrationBanner.js   # UI banner for migration prompt
│   │   └── hymnsLookup.js       # Static LDS Hymnal + Children's Songbook lookup tables
│   │
│   ├── i18n/                 # Internationalization
│   │   ├── index.js          # t(), initI18n, setLanguage, getLanguage (en/es/fr/swa)
│   │   └── honorifics.js     # Gender/language-aware honorific translation
│   │
│   ├── services/             # External service integrations
│   │   └── sheetsApiService.js  # Google Sheets API v4 (read metadata, upload CSV)
│   │
│   ├── utils/                # Shared utility functions
│   │   ├── csv.js            # CSV parser (RFC 4180, multi-language aware) + fetchSheet
│   │   ├── renderers.js      # DOM renderers: speakers, hymns, prayers, leaders, links
│   │   ├── dom-utils.js      # clearElement, setText, createTextElement
│   │   ├── error-handler.js  # Global error handling + user-facing messages
│   │   ├── timer-manager.js  # Named timer registry: createTimer, clearTimer, clearAllTimers
│   │   ├── promise-utils.js  # Promise helper utilities
│   │   ├── console-capture.js  # Captures console.log/warn/error for diagnostics
│   │   └── diagnostic-data-collector.js  # Full diagnostic snapshot collector
│   │
│   └── workers/              # Web Workers (off-main-thread processing)
│       ├── data.worker.js    # Worker: parseCSV, calculateChecksum, compareData, cleanupArchives
│       └── workerInterface.js  # Promise wrapper for data.worker.js
│
├── css/
│   └── styles.css            # Single global stylesheet (no framework)
│
├── img/                      # Static images
│   └── favicon.png           # App icon / Apple touch icon
│
├── docs/                     # [PROJECT KNOWLEDGE] Documentation
│   ├── index.md              # Master documentation index (this AI context hub)
│   ├── architecture.md       # Comprehensive architecture document
│   ├── data-models.md        # IndexedDB schema documentation
│   ├── component-inventory.md  # Module/component catalog
│   ├── source-tree-analysis.md  # This file
│   ├── development-guide.md  # Developer setup + commands
│   ├── project-overview.md   # Executive summary
│   ├── ARCH.md               # Original architecture doc (maintained manually)
│   ├── SPEC.md               # Technical specification
│   ├── AGENT_INSTRUCTIONS.md # AI agent context and conventions
│   ├── GRADE.md              # Quality grade assessment
│   ├── HYMN_IMPLEMENTATION.md  # Hymn feature implementation notes
│   ├── FEATURE_CMS_EDIT.md   # CMS edit feature spec
│   ├── REQUIREMENTS_*.md     # 8× feature requirements docs
│   └── plans/
│       └── AGENDA_INTEGRATED.md  # Agenda integration plan
│
├── test/                     # Unit tests (Vitest + jsdom)
│   ├── setup.js              # Global test setup + mocks
│   ├── jest-mocks.js         # Browser API mocks (IndexedDB, etc.)
│   ├── *.test.mjs            # Unit test files (one per module)
│   ├── auth/                 # Auth module tests
│   ├── components/           # Component tests
│   ├── data/                 # Data layer tests
│   ├── integration/          # Integration tests
│   ├── services/             # Service tests
│   └── utils/                # Utility tests
│
├── e2e/                      # E2E tests (Playwright)
│   ├── scenarios/            # Test scenario files
│   │   ├── 01-migration-login.spec.js
│   │   ├── 02-navigation.spec.js
│   │   ├── 03-language-switching.spec.js
│   │   ├── 04-theme-toggle.spec.js
│   │   ├── 05-help-modal.spec.js
│   │   ├── 06-qr-scanner-access.spec.js
│   │   ├── 07-manage-profiles.spec.js
│   │   ├── 08-force-update.spec.js
│   │   └── 09-lesson-panels.spec.js
│   ├── helpers/              # Test utility helpers
│   │   ├── mock-data.js      # Test data factories
│   │   ├── mock-qr.js        # QR scanner mock
│   │   ├── mock-sheets.js    # Google Sheets API mock
│   │   ├── program-verifier.js  # DOM assertion helpers
│   │   ├── sw-test-utilities.js  # Service worker test utilities
│   │   └── console-tracker.js   # Console log tracker
│   ├── pages/                # Page Object Model
│   │   ├── base.js           # Base page object
│   │   ├── IndexPage.js      # Main page POM
│   │   ├── ArchivePage.js    # Archive page POM
│   │   ├── components/       # Component POMs
│   │   └── pages/            # Additional page POMs
│   └── fixtures/             # Test fixtures
│
├── src/                      # Component source (secondary — React?)
│   └── components/           # (Unused/experimental)
│
├── coverage/                 # Test coverage reports (generated)
├── playwright-report/        # Playwright HTML report (generated)
├── test-results/             # Playwright test results (generated)
├── logs/                     # Application logs (generated)
│
├── _bmad/                    # BMad AI workflow configuration
├── _bmad-output/             # BMad output artifacts
│   ├── planning-artifacts/
│   └── implementation-artifacts/
│
└── .github/
    └── instructions/         # GitHub Copilot instructions
```

---

## Critical Directories

| Directory      | Purpose                             | Importance           |
| -------------- | ----------------------------------- | -------------------- |
| `js/`          | All application source code         | ⭐⭐⭐ Core          |
| `js/data/`     | Data layer (IDB, schemas, managers) | ⭐⭐⭐ Core          |
| `js/utils/`    | Shared utilities                    | ⭐⭐⭐ Core          |
| `js/agenda/`   | Leadership agenda feature           | ⭐⭐ Feature         |
| `js/auth/`     | Google OAuth                        | ⭐⭐ Feature         |
| `js/services/` | External API integrations           | ⭐⭐ Feature         |
| `js/workers/`  | Off-thread processing               | ⭐⭐ Performance     |
| `docs/`        | Project knowledge base              | ⭐⭐⭐ Documentation |
| `test/`        | Unit + integration tests            | ⭐⭐⭐ Quality       |
| `e2e/`         | End-to-end tests                    | ⭐⭐ Quality         |

---

## Entry Points

| File                        | Triggered By                                       | Description               |
| --------------------------- | -------------------------------------------------- | ------------------------- |
| `index.html`                | Browser navigation                                 | Primary app page          |
| `js/main.js`                | `<script type="module" src="...">` in `index.html` | Main app bootstrap        |
| `cms/index.html`            | `/cms/` route                                      | CMS editor                |
| `js/cms.js`                 | `<script>` in `cms/index.html`                     | CMS bootstrap             |
| `archive.html`              | `/archive.html` route                              | Archive viewer            |
| `js/archive.js`             | `<script>` in `archive.html`                       | Archive bootstrap         |
| `service-worker.js`         | SW registration in `js/service-worker-manager.js`  | PWA offline support       |
| `js/workers/data.worker.js` | `new Worker(...)` in `workerInterface.js`          | Background CSV processing |

---

## Module Dependency Map (Key Relations)

```
main.js
  ├── profiles.js → data/ProfileManager.js → data/IndexedDBManager.js → data/db.js
  ├── data/ArchiveManager.js → data/IndexedDBManager.js
  ├── history.js → data/db.js
  ├── utils/csv.js → sanitize.js, i18n/index.js
  ├── utils/renderers.js → i18n/index.js, i18n/honorifics.js, sanitize.js, data/hymnsLookup.js
  ├── workers/workerInterface.js → [data.worker.js via Worker()]
  ├── auth/googleAuth.js (loaded lazily by cms.js)
  ├── services/ProgramSheetService.mjs (loaded by cms.js)
  ├── data/MigrationSystem.js → data/IndexedDBManager.js
  ├── data/MigrationBanner.js → i18n/index.js, data/ProfileManager.js
  ├── agenda/AgendaSettings.js → profiles.js, data/IndexedDBManager.js, qr.js
  ├── agenda/AgendaRenderer.js → i18n/index.js
  └── theme.js → data/IndexedDBManager.js (lazy import)

cms.js
  ├── data/ProfileManager.js
  ├── data/ProgramSheetService.mjs → SheetsApiClient.mjs
  ├── components/CmsEditor.mjs → data/ProgramSheetService.mjs
  ├── auth/googleAuth.js → Google Identity Services (CDN)
  └── services/AgendaSheetService.mjs → SheetsApiClient.mjs

service-worker.js
  └── (standalone — no imports, uses Cache API + fetch events)
```
