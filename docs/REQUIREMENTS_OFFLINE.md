# Offline Support Requirements

## Overview

The app must work offline by caching program data and serving from local storage when network is unavailable.

---

## Caching Layers

### Layer 1: Service Worker Cache (Primary)

- **Storage**: Cache API (browser cache)
- **Content**: Google Sheets responses (CSV)
- **Expiration**: 24 hours
- **Fallback**: Serve stale cache when expired + offline

### Layer 2: localStorage Cache (Fallback)

- **Storage**: `programCache` key
- **Content**: Parsed program data (JSON)
- **Persistence**: Survives browser restart
- **Fallback**: Used when service worker fails

### Layer 3: IndexedDB Archives

- **Storage**: Archive records
- **Content**: Historical programs
- **Access**: Via archive.html

---

## Offline Detection

- Use `navigator.onLine` API
- Listen to `online` / `offline` events
- Update UI accordingly

---

## Offline UI

### Offline Banner

- Displayed at top of page
- Message: "Showing last available program (offline mode)"
- "Try Now" button to retry network request

### Reload Button

- Always visible when program is loaded
- When clicked online → fetches fresh data
- When clicked offline → shows offline banner again

---

## Cache Behavior Matrix

| State             | Cache Status | Action                           |
| ----------------- | ------------ | -------------------------------- |
| Online, fresh     | Valid        | Serve from network, update cache |
| Online, stale     | Expired      | Serve from network, update cache |
| Online, no cache  | N/A          | Fetch, store in cache            |
| Offline, fresh    | Valid        | Serve from cache                 |
| Offline, stale    | Expired      | Serve stale cache (with warning) |
| Offline, no cache | N/A          | Show "Unable to load" error      |

---

## Cache Invalidation

### Automatic

- 24-hour expiration on Google Sheets responses
- Next online request after expiry fetches fresh

### Manual

- Reload button adds `?t={timestamp}&force=true`
- Bypasses cache entirely
- Forces network fetch

---

## Data Storage Limits

### localStorage

- Limit: ~5MB (varies by browser)
- Used for: programCache, theme, language preference

### IndexedDB

- Limit: ~50MB+ (varies by browser)
- Used for: profiles, archives, metadata

---

## Edge Cases

| Case                   | Behavior                                     |
| ---------------------- | -------------------------------------------- |
| First visit, offline   | Show "Unable to load" error                  |
| Cache expired, offline | Serve stale cache                            |
| Cache expires mid-use  | Continue using current, refresh on next load |
| Storage full           | Show storage warning                         |

---

## Non-Requirements

- Offline QR scanning (requires camera)
- Background sync
- Offline notifications
