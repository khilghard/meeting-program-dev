# Project Documentation Index

**Generated:** 2026-05-16  
**Scan level:** Exhaustive  
**Workflow:** initial_scan

---

## Project Overview

- **Type:** Monolith (single-part web application)
- **Primary Language:** JavaScript (ES6+ modules, no transpilation)
- **Architecture:** Offline-first PWA, Vanilla JS, no framework, no bundler
- **Version:** 2.3.2
- **Deployment:** GitHub Pages

---

## Quick Reference

| Attribute | Value |
|-----------|-------|
| **Tech Stack** | Vanilla JS, Dexie/IndexedDB, Google Sheets CSV, Service Worker |
| **Entry Points** | `index.html`, `editor.html`, `archive.html` |
| **Test Frameworks** | Vitest (unit), Playwright (E2E) |
| **Architecture Pattern** | Offline-first SPA with ES6 module separation of concerns |
| **External Services** | Google Sheets (CSV), Google Sheets API v4, Google Identity Services (OAuth) |
| **Hosting** | GitHub Pages (`/meeting-program/`, `/meeting-program-dev/`) |

---

## Generated Documentation

- [Project Overview](./project-overview.md) — Executive summary, features, quick start
- [Architecture](./architecture.md) — Full system design, data flows, security, tech stack
- [Source Tree Analysis](./source-tree-analysis.md) — Annotated directory tree with dependency map
- [Data Models](./data-models.md) — IndexedDB schema (MeetingProgramDB v5 + EditorDB v1), CSV format
- [Component Inventory](./component-inventory.md) — All modules, classes, utilities, workers catalogued
- [Development Guide](./development-guide.md) — Setup, commands, testing, deployment, conventions

---

## Existing Documentation

- [ARCH.md](./ARCH.md) — Original architecture documentation (manually maintained)
- [SPEC.md](./SPEC.md) — Technical specification
- [AGENT_INSTRUCTIONS.md](./AGENT_INSTRUCTIONS.md) — AI agent context and project conventions
- [GRADE.md](./GRADE.md) — Quality grade assessment
- [HYMN_IMPLEMENTATION.md](./HYMN_IMPLEMENTATION.md) — Hymn feature implementation notes
- [FEATURE_CMS_EDIT.md](./FEATURE_CMS_EDIT.md) — CMS editor feature specification
- [REQUIREMENTS_UI.md](./REQUIREMENTS_UI.md) — UI requirements
- [REQUIREMENTS_OFFLINE.md](./REQUIREMENTS_OFFLINE.md) — Offline/PWA requirements
- [REQUIREMENTS_PROFILES.md](./REQUIREMENTS_PROFILES.md) — Profile management requirements
- [REQUIREMENTS_ARCHIVE.md](./REQUIREMENTS_ARCHIVE.md) — Archive feature requirements
- [REQUIREMENTS_I18N.md](./REQUIREMENTS_I18N.md) — Internationalization requirements
- [REQUIREMENTS_SHARING.md](./REQUIREMENTS_SHARING.md) — Sharing/QR requirements
- [REQUIREMENTS_UPDATES.md](./REQUIREMENTS_UPDATES.md) — Auto-update requirements
- [REQUIREMENTS_PROGRAM_LOADING.md](./REQUIREMENTS_PROGRAM_LOADING.md) — Program loading requirements
- [plans/AGENDA_INTEGRATED.md](./plans/AGENDA_INTEGRATED.md) — Leadership agenda integration plan

### Root-level docs

- [README.md](../README.md) — Project readme with user guide
- [CONTRIBUTING.md](../CONTRIBUTING.md) — Contribution guidelines
- [FEATURES.md](../FEATURES.md) — Feature list
- [FAQ.md](../FAQ.md) — Frequently asked questions
- [AGENDA_TEMPLATE.md](../AGENDA_TEMPLATE.md) — Agenda CSV template

---

## Getting Started

### For Developers

```bash
git clone https://github.com/khilghard/meeting-program-dev.git
cd meeting-program-dev
npm install
npm run dev
# Open: http://localhost:8000/meeting-program/
```

See [Development Guide](./development-guide.md) for full details.

### For AI Agents

This project uses:
- **ES6 modules** — all `import`/`export`, no CommonJS in source
- **Dexie** for IndexedDB — see [Data Models](./data-models.md) for schema
- **`js/sanitize.js` ALLOWED_KEYS** — must be updated when adding new CSV keys
- **`js/i18n/index.js`** — must be updated when adding user-facing strings
- **No build step** — changes to JS files take effect immediately in dev server
- **Vitest** for unit tests — `test/` dir, `.test.mjs` suffix
- **Playwright** for E2E — `e2e/scenarios/` dir, `.spec.js` suffix

See [AGENT_INSTRUCTIONS.md](./AGENT_INSTRUCTIONS.md) for full AI agent context.

---

## Key Source Files

| File | Why It Matters |
|------|---------------|
| `js/main.js` | App orchestrator — all features initialized here |
| `js/data/db.js` | IndexedDB schema — change here for schema migrations |
| `js/data/IndexedDBManager.js` | Data access layer — all IDB reads/writes |
| `js/sanitize.js` | Security gatekeeper — ALLOWED_KEYS, isSafeUrl |
| `js/utils/renderers.js` | Program rendering — add new row types here |
| `js/i18n/index.js` | All user-facing strings for all 4 languages |
| `js/utils/csv.js` | CSV parsing + Google Sheets fetching |
| `service-worker.js` | Offline caching, update lifecycle |
| `js/version.js` | Single source of VERSION constant |
