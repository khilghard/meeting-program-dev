# Pull Request: Release 2.4.17

## Summary

Release 2.4.17 refines the homepage action cluster so agenda and Program CMS entry points are easier to distinguish visually and behaviorally. It adds clearer separation between Leadership View and Program CMS, tunes responsive visibility rules for Program CMS access, and updates release metadata for the new version.

## Key Changes

### 🐛 Bug Fixes

- **Program CMS visibility was too tightly coupled to agenda setup**: Program CMS now appears on desktop when a valid Google Client ID is configured, while mobile still requires agenda setup so the smaller layout does not expose an incomplete flow. (`js/main.js`, `test/main.test.mjs`)
- **Homepage action grouping lacked clear separation**: Added a dedicated divider between Leadership View and Program CMS so users can better distinguish agenda controls from program editing actions. (`index.html`, `css/styles.css`, `js/main.js`)

### 🎨 UI / Styling

- **Distinct agenda vs Program CMS button palettes**: Agenda buttons now use a terracotta/clay palette while Program CMS keeps a deeper bronze treatment, creating clearer visual separation from both each other and the neutral homepage buttons. (`css/styles.css`, `index.html`)
- **Improved divider spacing rhythm**: Increased vertical spacing around the new agenda-to-program divider for cleaner breathing room in the action stack on desktop and mobile. (`css/styles.css`)

### ♻️ Refactors / Internal

- **Homepage action visibility helpers**: Extracted mobile-layout detection, Google Client ID validation, and divider visibility handling into shared helpers so action state stays consistent across zero-state and agenda-loading flows. (`js/main.js`)
- **Release metadata sync**: Updated app, manifest, service-worker, and version metadata for 2.4.17. (`js/version.js`, `manifest.dev.webmanifest`, `manifest.prod.webmanifest`, `manifest.webmanifest`, `service-worker.js`, `version.json`)

## What's Changed

- **`index.html`** — Added a dedicated divider between Leadership View and Program CMS and assigned distinct button classes for agenda and Program CMS actions.
- **`css/styles.css`** — Added agenda/program pill color tokens, divider styling for the intra-agenda action split, and spacing refinements for the new separator across breakpoints.
- **`js/main.js`** — Split agenda-edit and Program CMS visibility logic, added desktop/mobile gating helpers, and wired divider visibility updates into homepage and agenda-loading flows.
- **`test/main.test.mjs`** — Added regression coverage for desktop Program CMS visibility, mobile gating behavior, divider visibility, and strengthened mock cleanup for test isolation.
- **`js/version.js`** — Updated the exported app version to `2.4.17`.
- **`manifest.dev.webmanifest`** — Synced development manifest metadata to `2.4.17`.
- **`manifest.prod.webmanifest`** — Synced production manifest metadata to `2.4.17`.
- **`manifest.webmanifest`** — Synced shared manifest metadata to `2.4.17`.
- **`service-worker.js`** — Updated cache/version metadata for the 2.4.17 release.
- **`version.json`** — Updated release metadata to `2.4.17` with `previousVersion: 2.4.16`.

## Testing

✅ **111 tests passing** in focused homepage coverage.  
✅ All **1 targeted test file** pass with no regressions.

Executed:
- `npx vitest run test/main.test.mjs`

---

**From v2.4.16 → v2.4.17**
