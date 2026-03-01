# App Update Requirements

## Overview

The app must support automatic updates via service worker to deliver new versions without user intervention.

---

## Update Mechanism

### Service Worker

- Register service worker on app load
- Check for updates on each page load
- Use cache-first for static assets
- Version-based cache naming

### Version Strategy

- Version stored in: `js/version.js` and `service-worker.js`
- Must be kept in sync
- Cache named: `smpwa-{version}`

---

## Update Flow

### 1. Check for Update

```
App loads → Service worker registers
    ↓
Fetch manifest.json from server
    ↓
Compare local version vs remote version
    ↓
If newer → show update banner
```

### 2. Show Update Banner

- Displayed at top of app
- Message: "A new version is available."
- Buttons: "Update Now", "Remind Me Later"
- Auto-hides after 10 seconds if no action

### 3. User Action

| Action                  | Behavior                                 |
| ----------------------- | ---------------------------------------- |
| Click "Update Now"      | Skip waiting, reload page                |
| Click "Remind Me Later" | Dismiss banner, check again next session |
| No action               | Auto-dismiss after 10 seconds            |

### 4. Apply Update

- Call `skipWaiting()` on waiting service worker
- Page reloads automatically
- New service worker takes over

---

## Version Manifest

### Remote Manifest Format

```json
{
  "version": "2.0.3",
  "minAppVersion": "2.0.0",
  "releaseNotes": "Bug fixes and improvements"
}
```

### Version Check Endpoint

- Fetch from: `/{path}/manifest.json`
- Retry: 3 attempts with exponential backoff
- Timeout: 5 seconds per attempt

---

## Update Banner UI

| Element          | Behavior                        |
| ---------------- | ------------------------------- |
| Banner container | Fixed at top, above app content |
| Icon             | Warning emoji                   |
| Message          | "A new version is available."   |
| Update button    | Calls skipWaiting()             |
| Dismiss button   | Hides banner                    |
| Close button     | X button to dismiss             |

---

## Edge Cases

| Case               | Behavior                   |
| ------------------ | -------------------------- |
| Network fails      | Silently skip update check |
| Invalid manifest   | Silently skip update check |
| Same version       | No banner shown            |
| User clicks update | Page reloads               |
| User dismisses     | Check again on next visit  |

---

## Non-Requirements

- Force update (blocking users on old version)
- Changelog display
- Update rollback
- Background update installation
