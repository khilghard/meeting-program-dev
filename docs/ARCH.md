# Meeting Program PWA - Architecture Documentation

**Version:** 2.2.9  
**Last Updated:** March 7, 2026

---

## Executive Summary

The Meeting Program PWA follows an **offline-first**, **ES6 module** architecture with clean separation of concerns. The application is built without frameworks to minimize bundle size and maximize performance on low-end devices commonly used in congregations.

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     User Interface                       │
│                    (index.html + CSS)                    │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                  Application Layer                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │
│  │  main.js │  │ profiles │  │ archive  │  │  i18n   │ │
│  └──────────┘  └──────────┘  └──────────┘  └─────────┘ │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                    Data Layer                            │
│  ┌─────────────────┐  ┌────────────────────┐            │
│  │ IndexedDB (Dexie)│  │  Cache Storage     │            │
│  └─────────────────┘  └────────────────────┘            │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                  Service Worker Layer                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Precaching   │  │ Runtime Caching│  │ Background   │  │
│  │ Strategy     │  │ Strategy       │  │ Sync         │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## Design Principles

### 1. Offline-First

- All critical data cached locally before use
- Network requests are optional enhancements
- Graceful degradation when offline
- Background sync when connection restored

### 2. Client-Side Rendering

- **All UI rendered via JavaScript**
- **No server-side rendering**
- **Single Page Application (SPA)**
- **Dynamic DOM manipulation**

### 3. Separation of Concerns

- Each feature has dedicated module
- Data layer isolated from UI
- Utilities reusable across modules

### 4. Minimal Dependencies

- Vanilla ES6 JavaScript
- Only essential external libraries (jsQR, Dexie)
- No framework overhead

### 5. Performance First

- No build step (direct ES6 modules)
- Web workers for heavy processing
- Lazy loading where appropriate

---

## Module Architecture

### Core Modules

#### `main.js` (Application Orchestrator)

**Responsibility:** Initialize and coordinate all modules

**Dependencies:**

- All feature modules
- Data layer modules
- Utility modules

**Key Functions:**

- Application initialization
- Event binding
- Module coordination
- Error boundary handling

#### `profiles.js` (Profile Management)

**Responsibility:** Manage user profiles and unit settings

**Data Store:** IndexedDB (profiles store)

**Key Functions:**

- Profile CRUD operations
- Current profile tracking
- Profile switching
- Legacy migration

#### `archive.js` (Archive Viewer)

**Responsibility:** Display and manage archived programs

**Data Store:** IndexedDB (archives store)

**Key Functions:**

- Archive listing
- Archive reconstruction
- Program metadata extraction
- Archive cleanup

#### `i18n/index.js` (Internationalization)

**Responsibility:** Multi-language support

**Data Store:** Translation JSON files + IndexedDB preference

**Key Functions:**

- Translation lookup
- Language switching
- Runtime language loading
- Honorific translation

### Data Layer

#### `IndexedDBManager.js`

**Responsibility:** Abstract IndexedDB operations

**Pattern:** Repository pattern

**Stores:**

- `profiles` - User profiles
- `archives` - Archived programs
- `metadata` - App metadata
- `history` - Program history

**Key Features:**

- Versioned schema
- Migration support
- Transaction management

#### `ArchiveManager.js`

**Responsibility:** Archive-specific operations

**Dependencies:** IndexedDBManager

**Key Functions:**

- Program archiving
- Archive retrieval
- Auto-archive on new load
- Archive cleanup

### Utility Modules

#### `dom-utils.js` (NEW in 2.2.9)

**Responsibility:** Safe DOM manipulation

**Functions:**

- `clearElement()` - Safe element clearing
- `setText()` - Safe text setting
- `createTextElement()` - Safe element creation

**Pattern:** Centralized safety checks

#### `promise-utils.js`

**Responsibility:** Promise utilities

**Functions:**

- `promiseAllSafe()` - Error-tolerant Promise.all
- `retryWithBackoff()` - Exponential backoff retry
- `withTimeout()` - Promise timeout wrapper

**Pattern:** Async/await with try-catch

#### `timer-manager.js`

**Responsibility:** Centralized timer management

**Functions:**

- `createTimer()` - Register timer
- `clearTimer()` - Clear by ID
- `clearAllTimers()` - Bulk cleanup

**Pattern:** Timer registry with automatic cleanup

### External Dependencies

#### `jsQR` (QR Code Decoding)

- **Purpose:** Camera-based QR scanning
- **Load:** CDN (jsdelivr)
- **Fallback:** Manual URL entry

#### `Dexie.js` (IndexedDB Wrapper)

- **Purpose:** Simplified IndexedDB API
- **Load:** CDN (jsdelivr)
- **Usage:** All database operations

---

## Service Worker Architecture

### Cache Strategies

#### Static Assets (Network-First)

```javascript
// Strategy: Network first, fallback to cache
1. Try network fetch
2. If successful, update cache
3. If network fails, serve from cache
```

#### Google Sheets Data (Network-First with Expiry)

```javascript
// Strategy: Network first, 24-hour cache expiry
1. Try network fetch
2. If successful, update cache
3. If network fails AND cache < 24h, serve cache
4. If cache > 24h, show offline message
```

#### Dynamic Content (Cache-First)

```javascript
// Strategy: Cache first, stale-while-revalidate
1. Serve from cache immediately
2. Fetch fresh data in background
3. Update cache when fresh data arrives
```

### Cache Versions

- `static-cache-v1` - Static assets
- `data-cache-v1` - Google Sheets data
- `dynamic-cache-v1` - Dynamic content

### Update Flow

```
1. Service worker installs
2. Precaches critical assets
3. On update detection:
   a. Fetch new version
   b. Update cache versions
   c. Skip waiting
   d. Notify clients
   e. Clients reload
```

---

## Data Flow

### Program Loading Flow

```
1. User opens app
2. Check for current profile
3. If no profile, show setup
4. Fetch CSV from Google Sheets
5. Parse CSV with worker
6. Store in IndexedDB
7. Render program
8. Update metadata (last updated)
9. Cache for offline use
```

### QR Code Scan Flow

```
1. User clicks "Scan QR"
2. Request camera permission
3. Initialize video stream
4. Decode frames with jsQR
5. Extract sheet URL
6. Validate URL format
7. Load program from URL
8. Close scanner
```

### Offline Mode Flow

```
1. Detect network status change
2. Check IndexedDB for cached data
3. If cached data exists:
   a. Serve from cache
   b. Show "offline" indicator
   c. Queue sync for when online
4. If no cached data:
   a. Show offline error
   b. Offer retry button
```

---

## Error Handling Strategy

### Standard Pattern (v2.2.9+)

```javascript
async function operation() {
  try {
    // Async operation
    const result = await someAsyncFunction();
    return result;
  } catch (error) {
    console.error("[MODULE] Operation failed:", error);
    throw error; // Re-throw for caller to handle
  }
}
```

### Error Boundaries

- **Initialization errors:** Show error UI in `main-program` container (requires JS)
- **Network errors:** Show offline message with retry
- **Parse errors:** Show error with line number
- **Database errors:** Show critical error, suggest clear cache

**Note:** The app requires JavaScript to render any UI. Without JavaScript, users will see a blank page or the static HTML skeleton only.

### Logging Strategy

- All errors logged to console with module prefix
- No error reporting service (privacy-first)
- User-facing errors are user-friendly

---

## Security Architecture

### Input Sanitization

```javascript
// All user input passes through sanitize.js
function sanitize(input) {
  // 1. Strip HTML tags (except placeholders)
  // 2. Validate URLs (HTTPS only)
  // 3. Block javascript:/data:/file://
  // 4. Return sanitized string
}
```

### XSS Prevention

- **textContent over innerHTML** for user content
- **DOMPurify-style** sanitization for trusted HTML
- **Key whitelisting** on external data
- **CSP headers** (planned)

### Service Worker Security

- **Origin checking** on SW registration
- **HTTPS-only** for external resources
- **Cache versioning** to prevent stale content
- **Message validation** between SW and clients

---

## Performance Architecture

### Caching Layers

1. **Service Worker Cache** - Static assets, API responses
2. **IndexedDB** - Program data, profiles, archives
3. **Memory Cache** - Currently loaded program
4. **DOM Cache** - Rendered program (until navigation)

### Web Workers

- **CSV Parsing:** Large CSV files parsed in worker
- **QR Decoding:** Frame decoding off main thread
- **Data Processing:** Heavy computations in worker

### Lazy Loading

- **Language files:** Load on demand
- **Archive data:** Load when viewed
- **History entries:** Load on scroll

### Optimization Techniques

- **Debounce** expensive operations (search, filter)
- **Throttle** frequent updates (status indicators)
- **RequestAnimationFrame** for smooth animations
- **DocumentFragment** for batch DOM updates

---

## Testing Architecture

### Unit Tests (Vitest)

- **Location:** `test/*.test.js`
- **Coverage:** 50% (target: 80%)
- **Focus:** Core utilities, data layer
- **Mocking:** IndexedDB, fetch, camera

### E2E Tests (Playwright)

- **Location:** `e2e/scenarios/*.spec.js`
- **Browsers:** Chromium, Firefox, Safari
- **Devices:** Desktop, mobile, tablet
- **Features:** Camera simulation, offline mode

### Test Helpers

- **Page Objects:** `e2e/pages/`
- **Fixtures:** `e2e/fixtures/`
- **Utilities:** `e2e/helpers/`

---

## Migration Strategy

### Version Upgrades

```javascript
// Migration system in data/MigrationSystem.js
1. Check current version
2. If version < latest:
   a. Run migration functions
   b. Update schema version
   c. Migrate data
   d. Show migration banner
```

### Data Migration

- **Schema versioning** in IndexedDB
- **Automatic migration** on version mismatch
- **Rollback support** for failed migrations
- **User notification** for breaking changes

---

## Future Architecture Considerations

### Planned Improvements

1. **Code Splitting** - Reduce initial load size
2. **CSS Modules** - Smaller, scoped stylesheets
3. **Build Pipeline** - Minification, tree-shaking
4. **Error Tracking** - Sentry or similar (privacy-conscious)
5. **Performance Monitoring** - Web Vitals tracking

### Technical Debt

- **CSS Monolith:** 1,529-line stylesheets needs splitting
- **main.js God Object:** 1,503 lines needs refactoring
- **E2E Page Objects:** Large classes need splitting
- **Test Coverage:** 50% needs increase to 80%+

---

## Deployment Architecture

### Static Hosting

- **Platform:** Any static host (Netlify, Vercel, GitHub Pages)
- **Requirements:** HTTPS, Service Worker support
- **Assets:** Versioned for cache busting

### Update Mechanism

1. **New version deployed**
2. **Service worker detects update**
3. **New SW installs in background**
4. **Users notified on next visit**
5. **SW activates, old cache cleaned**

---

## Glossary

- **PWA:** Progressive Web App
- **SW:** Service Worker
- **IDB:** IndexedDB
- **CSV:** Comma-Separated Values
- **i18n:** Internationalization
- **E2E:** End-to-End
- **DOM:** Document Object Model
- **XSS:** Cross-Site Scripting
- **CSP:** Content Security Policy

---

**Last Updated:** March 7, 2026  
**Maintained By:** Meeting Program PWA Team
