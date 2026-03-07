# PWA Architecture Issues & Fixes

## Current Issues

### 1. Version Synchronization (CRITICAL)

`VERSION` is duplicated in 3 places that must be manually kept in sync:

- `js/version.js` - `export const VERSION = "2.1.1";`
- `service-worker.js:7` - `const VERSION = "2.1.1";`
- `manifest.webmanifest:4` - `"version": "2.1.1"`

**Fix:** Use `version.json` as single source, or inject at deploy time.

---

### 2. Hardcoded Deployment Path

```js
// service-worker.js:5
const MPPATH = "/meeting-program";
```

This must be changed for dev vs prod deployment.

**Fix:** Inject via deploy script or auto-detect from URL.

---

### 3. Cache Naming Inconsistency

```js
// service-worker.js
const CACHE_NAME = `${APP_PREFIX}-${VERSION}`; // Has version
const STATIC_CACHE = "meeting-program-static-v1"; // NO version!
const DYNAMIC_CACHE = "meeting-program-dynamic-v1"; // NO version!
```

**Fix:** Use `VERSION` in all cache names:

```js
const STATIC_CACHE = `meeting-program-static-v${VERSION}`;
const DYNAMIC_CACHE = `meeting-program-dynamic-v${VERSION}`;
```

---

### 4. Multiple Conflicting Update Mechanisms

The app has 5 different ways to trigger updates:

1. URL param `?forceUpdate=true`
2. URL param `?nocache=true`
3. Service worker update banner
4. Manual "Check for Updates" button
5. SW `skipWaiting` message

**Fix:** Remove URL param-based updates, keep only SW update flow.

---

## Deployment Setup

### Two Repos

| Repo                  | URL                                        | Purpose     |
| --------------------- | ------------------------------------------ | ----------- |
| `meeting-program`     | `khilghard.github.io/meeting-program/`     | Production  |
| `meeting-program-dev` | `khilghard.github.io/meeting-program-dev/` | Development |

### Config Per Repo

These files need different values per repo:

| File                   | Line | Prod                | Dev                     |
| ---------------------- | ---- | ------------------- | ----------------------- |
| `service-worker.js`    | 5    | `/meeting-program`  | `/meeting-program-dev`  |
| `manifest.webmanifest` | 6    | `/meeting-program/` | `/meeting-program-dev/` |
| `manifest.webmanifest` | 7    | `/meeting-program/` | `/meeting-program-dev/` |

---

## Workflow

### Deploy to Dev

1. Make changes in `meeting-program` (working copy)
2. Update 3 lines above for dev
3. Copy/sync to `meeting-program-dev`
4. Push `meeting-program-dev`
5. Test at `https://khilghard.github.io/meeting-program-dev/`

### Deploy to Prod

1. Verify changes work in dev
2. Update 3 lines above for prod
3. Copy/sync to `meeting-program` (prod repo)
4. Push `meeting-program`
5. Test at `https://khilghard.github.io/meeting-program/`

### Sync Dev → Prod (using sync script)

```bash
./sync-to-prod.sh
```

---

## Scripts Needed

1. **Deploy config** - Sets MPPATH for prod vs dev
2. **Sync script** - Copies dev changes back to prod repo

---

## Priority Order

1. **High:** Fix cache naming (bug fix)
2. **High:** Remove URL param update mechanisms (simplification)
3. **Medium:** Add deploy config script (prevent manual errors)
4. **Low:** Version single source (nice to have)
