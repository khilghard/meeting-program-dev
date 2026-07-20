# Browser Compatibility Analysis

**Date:** 2026-05-16
**Trigger:** User on iOS Safari 15.6 sees rendered text content but no interactive buttons (QR scanner, share, etc.)

**Policy Status (Updated 2026-07-19):**
- Absolute minimum supported Safari version is **15.6**.
- Older iPhone/iPad cohorts are **supported with limitations**.
- Operational support policy is maintained in `AGENTS.md` and mirrored in `docs/SPEC.md`.

---

## Root Cause: Import Maps

> Historical context: this section describes the original issue observed at the time of analysis. The runtime has since moved away from import-map dependency for Dexie module resolution.

**The app uses `<script type="importmap">` to resolve bare `"dexie"` imports. Safari on iOS did not support import maps until Safari 16.4.**

The user's device reports Safari 15.6. This means:

1. The `importmap` block in `index.html` is **silently ignored**
2. `js/data/db.js` does `import Dexie from "dexie"` — this bare import has no URL resolution and **fails silently**
3. Everything that depends on `db.js` (IndexedDBManager, ProfileManager, main.js) breaks in the module chain
4. The page renders HTML/CSS (non-JS content shows), but all module-dependent functionality is dead

The user's email dump confirms the page renders text (HTML is fine) but buttons don't appear (all JS modules failed to load).

---

## Feature Compatibility Matrix

| Feature                              | Used In                                                | iOS Safari Support     | Breaking?                        |
| ------------------------------------ | ------------------------------------------------------ | ---------------------- | -------------------------------- |
| **Import maps**                      | `index.html` line 172                                  | **16.4+**              | **YES — blocks entire app**      |
| ES modules (`type="module"`)         | All `.js` files                                        | 11+                    | No (15.6 supports)               |
| Optional chaining (`?.`)             | `main.js`, `service-worker-manager.js`                 | 14+                    | No (15.6 supports)               |
| Dynamic `import()`                   | `theme.js`, `qr.js`, `archive.js`, `config/baseUrl.js` | 11.1+                  | No (15.6 supports)               |
| `globalThis`                         | Throughout                                             | 12.2+                  | No (15.6 supports)               |
| `Promise.allSettled`                 | `utils/promise-utils.js`                               | 12.2+                  | No (15.6 supports)               |
| Service Workers                      | `service-worker-manager.js`                            | 11.3+                  | No (15.6 supports)               |
| IndexedDB                            | `IndexedDBManager.js`                                  | 8+                     | No (15.6 supports)               |
| `indexedDB.databases()`              | `ProfileManager.js`                                    | 15.4+                  | No (15.6 supports)               |
| `navigator.share`                    | `share.js`                                             | **NOT supported**      | Soft — graceful fallback exists  |
| Camera (`getUserMedia` + QR scanner) | `qr.js`                                                | 11+ (with permissions) | **YES on old iPads** — see below |

---

## Two Distinct Problems

### Problem 1: Import Maps (iOS Safari < 16.4)

**Devices affected:** iPadOS/iOS 15.x, 16.0–16.3. The user's Safari 15.6 is in this range.

**Devices that can't update:** iPad Air 2 (max iPadOS 15.8), iPad 5th gen (max iPadOS 15.8), iPad mini 4 (max iPadOS 15.8), iPhone 6s/SE 1st gen (max iOS 15.8).

**Impact:** App is completely non-functional. No IndexedDB, no profiles, no program loading, no buttons.

### Problem 2: Camera / QR Scanner

**Devices affected:** Older iPads that lack front/rear camera or have insufficient camera API support for the QR scanner (`qr.js` uses `getUserMedia` + Canvas + jsQR library).

**Devices affected:** iPad 1–4, iPad Mini 1–3 (can't run iOS 15+ at all — these are beyond help since they can't even support ES modules properly).

**iPad Air 2 / iPad 5th gen / iPad mini 4** CAN run iOS 15.x and DO have cameras, but Problem 1 (import maps) blocks everything anyway.

---

## Solutions

### Option A: Browser Compatibility Gate (Recommended)

Add a **blocking compatibility check** that runs BEFORE any module scripts. If the browser doesn't support import maps, show a friendly "upgrade your device/browser" message instead of a broken page.

**Placement:** A small `<script>` (non-module, runs immediately) in `<head>` that checks for import map support and renders a fallback div if unsupported.

### Option B: Remove Import Map Dependency

Replace the `importmap` + bare `import Dexie from "dexie"` with a direct CDN URL import, or bundle Dexie so it doesn't need import maps.

**Approach 1 — Direct URL import:**
Change `db.js` from `import Dexie from "dexie"` to `import Dexie from "https://cdn.jsdelivr.net/npm/dexie@4.3.0/dist/dexie.mjs"` and remove the import map entirely.

**Approach 2 — Bundling:** Use a bundler (esbuild, Vite) to bundle everything into a single script that doesn't need bare imports or import maps.

### Option C: Both A and B

Ideal: remove import map dependency (fixes the problem), AND add a compatibility gate (graceful degradation for any future incompatible features).

---

## Recommended Implementation

### Compatibility Gate Script

A non-module script in `<head>` that checks:

```js
// Check import map support
const supportsImportMaps =
  "importMap" in document.createElement("script") ||
  !!document.querySelector('script[type="importmap"]')?.textContent;

// More reliable: feature-detect via try/catch
// (detailed implementation below)
```

### Immediate Fix: Remove Import Map

The fastest fix is to replace the import map with a direct CDN URL in the two files that import Dexie:

- `js/data/db.js` — change `import Dexie from "dexie"` to `import Dexie from "https://cdn.jsdelivr.net/npm/dexie@4.3.0/dist/dexie.mjs"`
- `js/data/EditorStateManager.js` — same change

Then remove the `<script type="importmap">` block from `index.html`.

This alone would make the app work on iOS Safari 11+.

---

## iOS Safari Version → Device Mapping

| iOS / iPadOS | Safari Version | Import Maps | Devices (max version)                                      |
| ------------ | -------------- | ----------- | ---------------------------------------------------------- |
| 15.x         | 15.6           | ❌ No       | iPhone 6s/SE1, iPad Air 2, iPad 5th/6th gen, iPad mini 4/5 |
| 16.0–16.3    | 16.0–16.3      | ❌ No       | iPhone 7/8 (can update to 16.x but not 16.4)               |
| 16.4+        | 16.4+          | ✅ Yes      | iPhone X+, iPad 7th gen+, iPad Air 3+, all modern devices  |

**Bottom line:** Any device stuck at iOS 15.x (Apple stopped updating them) cannot run the current app. The QR button issue is a symptom of the broader import map problem — if modules can't load, nothing works.
