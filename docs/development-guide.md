# Development Guide

**Generated:** 2026-05-16  
**Project:** meeting-program (PWA)

---

## Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| **Node.js** | 20+ | (README states 16+; vitest.config uses modern features) |
| **npm** | 10+ | Included with Node 20 |
| **Git** | Any | For version control |
| **Browser** | Chrome/Edge recommended | For dev + manual testing |

---

## Initial Setup

```bash
# 1. Clone the repository
git clone https://github.com/khilghard/meeting-program-dev.git
cd meeting-program-dev

# 2. Install all dependencies
npm install

# 3. Start the local dev server
npm run dev
# → Server running at http://localhost:8000/meeting-program
```

---

## Development Commands

| Command | Description |
|---------|------------|
| `npm run dev` | Start Express dev server (http://localhost:8000/meeting-program) |
| `npm test` | Run unit tests in watch mode (Vitest) |
| `npm run test:run` | Run unit tests once (CI mode) |
| `npm run test:coverage` | Unit tests + coverage report (lcov + JSON + text) |
| `npm run test:e2e` | Run all Playwright E2E tests (headless) |
| `npm run test:e2e:ui` | Open Playwright interactive test runner |
| `npm run test:e2e:headed` | Run E2E tests in visible browser |
| `npm run test:e2e:debug` | Run E2E tests in debug mode |
| `npm run lint` | Check ESLint violations |
| `npm run lint:fix` | Auto-fix ESLint violations |
| `npm run format` | Auto-format with Prettier |
| `npm run format:check` | Check Prettier formatting (CI mode) |

---

## Project Structure Summary

```
meeting-program-dev/
├── index.html           # Main app page
├── editor.html          # CMS editor page
├── archive.html         # Archive viewer page
├── service-worker.js    # PWA service worker
├── server.cjs           # Local dev server (Express)
├── js/                  # All application source (ES6 modules)
│   ├── main.js          # App entry point
│   ├── data/            # Data layer (Dexie/IndexedDB)
│   ├── utils/           # Shared utilities
│   ├── agenda/          # Leadership agenda feature
│   ├── auth/            # Google OAuth
│   ├── services/        # Google Sheets API
│   └── workers/         # Web Worker (CSV processing)
├── css/styles.css       # Global styles
├── test/                # Unit tests (Vitest)
└── e2e/                 # E2E tests (Playwright)
```

See [source-tree-analysis.md](./source-tree-analysis.md) for the full annotated tree.

---

## Local Development

### Running the App

```bash
npm run dev
```

Opens: http://localhost:8000/meeting-program/

The server is a minimal Express.js static file server (`server.cjs`). There is **no build step** — the browser loads ES6 modules directly.

### Loading a Test Program

1. Open http://localhost:8000/meeting-program/
2. Either:
   - Scan a QR code pointing to a Google Sheets CSV URL
   - Enter a Google Sheets CSV URL manually via the "Enter URL" option

### Testing the Editor

1. Open http://localhost:8000/meeting-program/editor.html
2. Sign in with Google OAuth (requires valid `CLIENT_ID` configuration)
3. Load a profile and edit sheet content

---

## Testing

### Unit Tests (Vitest)

Unit tests live in `test/`. They run in a jsdom environment.

```bash
# Interactive watch mode
npm test

# Run once
npm run test:run

# With coverage (output to ./coverage/)
npm run test:coverage
```

**Configuration:** `vitest.config.mjs`
- Environment: `jsdom`
- Globals enabled
- Setup file: `test/setup.js`
- Coverage: `v8` provider, includes all `js/**/*.js`
- Timeout: 60 seconds per test

**Mock infrastructure:**
- `test/jest-mocks.js` — browser API mocks (IndexedDB via fake-indexeddb, localStorage, navigator)
- `test/setup.js` — global test setup

### E2E Tests (Playwright)

E2E tests live in `e2e/scenarios/`.

```bash
# Run all E2E tests
npm run test:e2e

# Open interactive UI runner
npm run test:e2e:ui
```

**Configuration:** `playwright.config.js`
- Base URL: `http://localhost:8000/meeting-program/`
- Browsers: Chromium (Desktop), Chromium (no camera), Mobile iPhone, Mobile Android
- Timeout: 30 seconds per test
- Screenshots on failure, trace on first retry

**Page Object Model:** `e2e/pages/` (IndexPage, ArchivePage, etc.)

**Helpers:** `e2e/helpers/` (mock-data, mock-qr, mock-sheets, program-verifier, sw-test-utilities)

> **Note:** E2E tests require the dev server to be running (`npm run dev`).

---

## Code Style & Standards

### JavaScript Conventions

- **ES6 modules** — `import`/`export` everywhere
- **`const`/`let`** — never `var`
- **Arrow functions** for callbacks
- **`async`/`await`** over raw promises
- **No semicolons** (Prettier enforced)
- **2-space indentation**

### Security Rules

- Always sanitize user input via `js/sanitize.js`
- Validate URLs with `isSafeUrl()` before use
- Never use `innerHTML` with unsanitized data
- Use `textContent` or DOM methods for user-supplied content

### Linting & Formatting

```bash
# Lint (ESLint 9 flat config)
npm run lint

# Auto-fix
npm run lint:fix

# Prettier format
npm run format

# Check formatting (for CI)
npm run format:check
```

**Pre-commit hook** (Husky + lint-staged): automatically runs `eslint --fix` on staged `.js` files.

---

## Branching Strategy

| Branch | Purpose |
|--------|---------|
| `master` | Production (deployed to GitHub Pages automatically) |
| `develop` | Integration branch (all features merge here first) |
| `feature/*` | New features (branch from `develop`) |
| `bugfix/*` | Bug fixes (branch from `develop`) |

### Feature Development Flow

```bash
git checkout develop
git pull origin develop
git checkout -b feature/my-feature

# ... make changes ...

npm run lint
npm run test:run

git add .
git commit -m "feat: describe the change"
git push origin feature/my-feature
# Open PR to develop
```

---

## Deployment

### Production (GitHub Pages)

The `master` branch auto-deploys to:
- **Production:** `https://khilghard.github.io/meeting-program`
- **Dev build:** `https://khilghard.github.io/meeting-program-dev`

**To sync dev → prod:**

```bash
./sync-to-prod.sh
```

### Version Management

The app version is managed in `js/version.js` (`VERSION = "2.3.2"`) and `version.json` (remote version feed).

```bash
# Update version
node update-version.js

# Sync version files
node sync-version.cjs
```

The service worker cache name includes the version string so that old caches are automatically invalidated on deploy.

### Service Worker Cache

Cached assets are versioned by `VERSION`. On deploy:
1. New service worker installs with new cache name
2. Old cache is deleted automatically
3. Users see update banner (via `version-checker.js`) and can trigger the update

---

## Environment Configuration

There is **no `.env` file** — configuration is determined at runtime:

| Setting | How Configured |
|---------|---------------|
| Base URL | Auto-detected from `window.location` or stored in IndexedDB (`siteUrl`) |
| Google Sheets URL | Entered by user via QR scan or manual input; stored in profile |
| Google OAuth Client ID | Hardcoded in `googleAuth.js` (or HTML — check `editor.html`) |
| Dev vs Prod path | Detected via `window.location.pathname` (e.g., `/meeting-program-dev/`) |

---

## Dependency Reference

| Package | Version | Purpose |
|---------|---------|---------|
| `dexie` | ^4.3.0 | IndexedDB wrapper |
| `qrcode` | ^1.5.4 | QR code generation |
| `uuid` | ^13.0.0 | UUID generation for profile/session IDs |
| `express` | ^5.2.1 | Local dev server only |
| `vitest` | ^4.0.18 | Unit test runner |
| `@playwright/test` | ^1.58.2 | E2E test runner |
| `jsdom` | ^28.1.0 | jsdom environment for unit tests |
| `fake-indexeddb` | ^6.2.5 | IndexedDB mock for unit tests |
| `eslint` | ^9.0.0 | Linting (flat config) |
| `prettier` | ^3.8.1 | Code formatting |
| `husky` | ^9.1.7 | Git hooks |
| `lint-staged` | ^16.3.0 | Pre-commit linting |

---

## Common Development Tasks

### Add a new program key

1. Add key to `ALLOWED_KEYS` set in `js/sanitize.js`
2. Add renderer function in `js/utils/renderers.js`
3. Register it in the `renderers` map in `renderers.js`
4. Add i18n string in `js/i18n/index.js` for each language
5. Add Vitest test in `test/`

### Add a new language

1. Add language code to `SUPPORTED_LANGUAGES` in `js/i18n/index.js`
2. Add translations object for the new language in the same file
3. Add honorifics support in `js/i18n/honorifics.js`
4. Update CSV multi-language header processing in `js/utils/csv.js`
5. Update the language selector UI in `index.html`

### Update the database schema

1. Increment `DB_SCHEMA_VERSION` in `js/data/db.js`
2. Add `.version(N).stores({...})` with schema changes
3. Add `.upgrade(tx => {...})` if data migration is needed
4. Update `js/data/IndexedDBManager.js` if new CRUD operations are needed
5. Add migration test in `test/migration-*.test.mjs`
