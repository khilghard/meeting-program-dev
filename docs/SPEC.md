# Meeting Program PWA - Technical Specification

**Version:** 2.2.9  
**Last Updated:** March 7, 2026

---

## Overview

The Meeting Program PWA is an offline-first web application for displaying sacrament meeting programs in LDS congregations. It loads programs from Google Sheets, supports multiple languages, and works completely offline after initial load.

---

## Architecture Overview

### Tech Stack

- **Frontend:** Vanilla ES6 JavaScript (no frameworks)
- **Database:** IndexedDB via Dexie.js
- **QR Code:** jsQR library
- **Styling:** Custom CSS (no frameworks)
- **Build:** None (direct ES6 modules)

### Key Design Patterns

- **Offline-First:** All data cached locally, syncs when online
- **ES6 Modules:** Clean separation of concerns
- **Web Workers:** Background data processing
- **Service Worker:** Precaching and offline support
- **Client-Side Rendering:** All UI rendered via JavaScript

---

## Core Features

### 1. Program Loading

- **Source:** Google Sheets (CSV export)
- **Format:** CSV with predefined column structure
- **Parsing:** Client-side CSV parser with error handling
- **Caching:** IndexedDB with metadata tracking

### 2. QR Code Scanning

- **Camera Access:** MediaDevices API
- **Decoding:** jsQR library
- **Fallback:** Manual URL entry
- **Format:** URL parameters with sheet embedding

### 3. Multi-Language Support

- **Languages:** English, Spanish, French, Swahili
- **Implementation:** JSON translation files
- **Switching:** Runtime language selection
- **Persistence:** IndexedDB user preference

### 4. Profile Management

- **Storage:** IndexedDB with profile objects
- **Features:** Create, delete, switch between units
- **Metadata:** Unit name, stake, URL, last updated
- **Migration:** Legacy profile migration system

### 5. Program History

- **Storage:** IndexedDB with auto-cleanup
- **Limit:** Configurable maximum entries
- **Features:** View, load, archive historical programs
- **Auto-archive:** Old programs moved to archive

### 6. Archiving

- **Trigger:** Manual or automatic on new program load
- **Storage:** Separate IndexedDB store
- **Format:** Original CSV data with metadata
- **Retrieval:** Full program reconstruction

### 7. Hymn Linking

- **Source:** Church website hymn database
- **Format:** URL generation with hymn numbers
- **Support:** Split hymns (e.g., "123-124")
- **Validation:** Hymn number format checking

### 8. Honorifics

- **Translation:** Custom honorific mapping
- **Languages:** Per-language honorific sets
- **Format:** `<HONORIFIC:name>` placeholders
- **Rendering:** Real-time translation on display

### 9. Theme Support

- **Themes:** Light, Dark, System preference
- **Implementation:** CSS custom properties
- **Persistence:** User preference in IndexedDB
- **Print:** Separate print stylesheet

### 10. Sharing

- **Method:** QR code generation
- **Content:** Full URL with embedded sheet parameter
- **Generation:** Canvas-based QR rendering
- **Fallback:** Copy URL to clipboard

### 11. PWA Features

- **Install:** iOS and Android prompts
- **Manifest:** Complete web app manifest
- **Icons:** 192x192, 512x512, 180x180
- **Offline:** Service worker with multiple cache strategies
- **Updates:** Automatic version checking

### 12. Data Backup

- **Export:** JSON download of all data
- **Import:** JSON upload with merge/replace options
- **Format:** Versioned schema
- **Migration:** Automatic schema upgrades

---

## Data Model

### Profile Object

```javascript
{
  id: string,           // Unique identifier
  unitName: string,     // Ward/Stake name
  stake: string,        // Stake name
  url: string,          // Google Sheets URL
  lastUpdated: number,  // Timestamp
  language: string,     // Preferred language
  theme: string         // Preferred theme
}
```

### Program Object

```javascript
{
  rows: Array,          // Parsed CSV rows
  metadata: Object,     // Extracted metadata
  loadedAt: number,     // Load timestamp
  archived: boolean     // Archive status
}
```

### Archive Object

```javascript
{
  id: string,           // Unique identifier
  programDate: string,  // Program date
  csvData: string,      // Original CSV
  metadata: Object,     // Program metadata
  archivedAt: number    // Archive timestamp
}
```

---

## API Reference

### DOM Utilities (`js/utils/dom-utils.js`)

```javascript
clearElement(element: Element): void
setText(element: Element, text: string): void
createTextElement(tagName: string, text: string, styles: Object): Element
```

### Internationalization (`js/i18n/index.js`)

```javascript
t(key: string): string
getLanguage(): string
setLanguage(lang: string): Promise<void>
initI18n(): Promise<void>
```

### Profiles (`js/profiles.js`)

```javascript
getCurrentProfile(): Profile
selectProfile(id: string): Promise<void>
addProfile(url: string, unitName: string, stake: string): Promise<Profile>
deleteProfile(id: string): Promise<void>
listProfiles(): Promise<Array<Profile>>
```

### Archive Manager (`js/data/ArchiveManager.js`)

```javascript
initArchiveManager(): Promise<void>
loadArchives(profileId: string): Promise<Array<Archive>>
archiveProgram(csvData: string, metadata: Object): Promise<void>
getProfileArchives(profileId: string): Promise<Array<Archive>>
```

### QR Scanner (`js/qr.js`)

```javascript
showScanner(): Promise<string>
extractSheetUrl(url: string): string | null
```

---

## File Structure

```
/
├── index.html              # Main entry point
├── service-worker.js       # Service worker implementation
├── manifest.webmanifest    # PWA manifest
├── css/
│   └── styles.css          # Complete stylesheet
├── js/
│   ├── main.js             # Core application logic
│   ├── sanitize.js         # Input sanitization
│   ├── theme.js            # Theme management
│   ├── qr.js               # QR code scanning
│   ├── profiles.js         # Profile management
│   ├── share.js            # Sharing functionality
│   ├── history.js          # Program history
│   ├── archive.js          # Archive viewing
│   ├── install-manager.js  # PWA install prompts
│   ├── version-checker.js  # Update detection
│   ├── service-worker-manager.js  # SW management
│   ├── config/             # Configuration files
│   ├── data/               # Data layer
│   │   ├── IndexedDBManager.js
│   │   ├── ArchiveManager.js
│   │   ├── ProfileManager.js
│   │   └── MigrationSystem.js
│   ├── i18n/               # Internationalization
│   │   └── index.js
│   ├── utils/              # Utility modules
│   │   ├── csv.js
│   │   ├── renderers.js
│   │   ├── timer-manager.js
│   │   ├── promise-utils.js
│   │   └── dom-utils.js
│   └── workers/            # Web workers
│       └── workerInterface.js
├── test/                   # Unit tests
└── e2e/                    # E2E tests
```

---

## Security Considerations

### Input Sanitization

- All user-supplied content passed through `sanitize.js`
- HTML tags stripped (except `<LINK>` and `<IMG>` placeholders)
- URL validation (HTTPS only, blocks javascript:/data:/file://)

### XSS Prevention

- `textContent` instead of `innerHTML` for user content
- DOMPurify-style sanitization for trusted HTML
- Key whitelisting on external data

### Service Worker Security

- Origin checking on service worker registration
- Cache versioning to prevent stale content
- HTTPS-only for external resources

---

## Performance Considerations

### Caching Strategy

- **Static assets:** Network-first with cache fallback
- **Google Sheets data:** Network-first with 24-hour expiry
- **Dynamic content:** Cache-first with staleness detection
- **Precaching:** Critical resources on install

### Optimization

- No framework overhead (vanilla JS)
- Web workers for data processing
- Throttled database saves (5-minute minimum)
- Lazy loading of non-critical resources

---

## Browser Support

### Required

- JavaScript (ES6+)
- Service Worker API
- IndexedDB
- Promise support
- ES6 modules
- Camera access (for QR scanning)

### Tested On

- Chrome/Edge (latest)
- Safari (latest)
- Firefox (latest)
- iOS Safari (latest)
- Android Chrome (latest)

---

## Version History

### 2.2.9 (Current)

- Fixed all promise safety issues
- Removed all innerHTML XSS vulnerabilities
- Standardized error handling patterns
- Created DOM utility functions

### Previous Versions

See CHANGELOG.md for detailed version history.

---

## Future Roadmap

### Planned Features

- Offline program editing
- Real-time collaboration
- Custom theme builder
- Advanced analytics
- Print program generation

### Technical Improvements

- Code splitting for reduced initial load
- CSS optimization and modularization
- E2E test refactoring
- Test coverage increase to 80%+

---

## Support

### Documentation

- User Guide: README.md
- Features: FEATURES.md
- Troubleshooting: FAQ.md
- Developer Guide: CONTRIBUTING.md

### Reporting Issues

- GitHub Issues: [Link to repo issues]
- Include browser version and error messages

---

**Last Updated:** March 7, 2026  
**Maintained By:** Meeting Program PWA Team
