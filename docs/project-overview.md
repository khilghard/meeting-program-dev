# Project Overview

**Generated:** 2026-05-16  
**Version:** 2.3.2

---

## Project Name

**meeting-program** (development repo: `meeting-program-dev`)

---

## Purpose

A free, offline-first Progressive Web App (PWA) for displaying sacrament meeting programs in congregations of The Church of Jesus Christ of Latter-day Saints.

**Problem solved:**

1. Small, cost-free hosting — GitHub Pages
2. Private program data — Google Sheets CSV (URL-based access control)
3. Real-time updates — Auto-fetches latest sheet on each load
4. Works offline — Service worker caches program for use without internet

---

## Live URLs

| Environment | URL |
|------------|-----|
| Production | https://khilghard.github.io/meeting-program |
| Development | https://khilghard.github.io/meeting-program-dev |
| Local dev | http://localhost:8000/meeting-program/ |

---

## Repository Type

**Monolith** — Single-part web application

---

## Tech Stack Summary

| Category | Technology |
|----------|-----------|
| Language | Vanilla JavaScript (ES6+, no transpilation) |
| Data storage | Dexie 4.x / IndexedDB |
| External data | Google Sheets CSV (URL-based) |
| External API | Google Sheets API v4 + Google Identity Services |
| Offline | Custom Service Worker |
| Testing | Vitest (unit) + Playwright (E2E) |
| Hosting | GitHub Pages |
| Build | None (native ES6 modules) |

---

## Architecture Type

**Offline-first SPA (Single-Page App)** with ES6 module architecture. No framework, no bundler, no backend server.

---

## Key Features

| Feature | Description |
|---------|------------|
| Multi-profile | Multiple ward/branch programs stored simultaneously |
| QR scan | Camera-based QR code scanning to load program URL |
| Offline support | Full PWA with service worker caching |
| Archive | Automatic program archive (IndexedDB, 2-year retention) |
| Multi-language | English, Spanish, French, Swahili |
| Dark mode | System-aware + user-toggleable theme |
| PWA install | Prompts to install as native-like app (iOS + Android) |
| Auto-update | Hourly version check, one-tap update |
| Leadership Agenda | Private per-profile agenda (separate sheet URL) |
| CMS Editor | Google Sheets write-back editor (editor.html) |
| Hymn lookup | LDS Hymnal + Children's Songbook auto-lookup |
| Migration | Cross-ward program migration (obsolete + migrationUrl CSV keys) |
| Sharing | QR code generation for sharing program URL |
| Diagnostics | Built-in diagnostic data collector for troubleshooting |

---

## Entry Points

| File | Purpose |
|------|---------|
| `index.html` | Main program viewer |
| `editor.html` | CMS editor (Google OAuth required) |
| `archive.html` | Historical archive viewer |
| `service-worker.js` | PWA service worker |

---

## Links to Detailed Documentation

- [Architecture](./architecture.md) — Full architecture design
- [Source Tree Analysis](./source-tree-analysis.md) — Annotated directory tree
- [Data Models](./data-models.md) — IndexedDB schema documentation
- [Component Inventory](./component-inventory.md) — Module and component catalog
- [Development Guide](./development-guide.md) — Setup, commands, conventions
- [Master Index](./index.md) — All documentation links

### Existing Docs

- [ARCH.md](./ARCH.md) — Original architecture doc
- [SPEC.md](./SPEC.md) — Technical specification
- [AGENT_INSTRUCTIONS.md](./AGENT_INSTRUCTIONS.md) — AI agent context
- [GRADE.md](./GRADE.md) — Quality grade assessment
- [HYMN_IMPLEMENTATION.md](./HYMN_IMPLEMENTATION.md) — Hymn feature notes
- [FEATURE_CMS_EDIT.md](./FEATURE_CMS_EDIT.md) — CMS edit feature spec
- [REQUIREMENTS_*.md](./REQUIREMENTS_UI.md) — Feature requirements

---

## Getting Started (Developer)

```bash
git clone https://github.com/khilghard/meeting-program-dev.git
cd meeting-program-dev
npm install
npm run dev
# → http://localhost:8000/meeting-program/
```

See [Development Guide](./development-guide.md) for full setup instructions.
