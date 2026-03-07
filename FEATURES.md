# Meeting Program - Feature Documentation

## Overview

Meeting Program is a Progressive Web App (PWA) that displays sacrament meeting programs by pulling data dynamically from Google Sheets. It is designed for mobile and tablet use in church meetings, accessible via QR code.

**Live URL:** https://khilghard.github.io/meeting-program/

---

## Current Features (v2.2.0)

### 1. Dynamic Program Loading

- **Description:** Loads meeting program data from Google Sheets in real-time
- **Implementation:** `js/utils/csv.js`, `js/main.js`
- **Features:**
  - CSV parsing with support for simple (`key,value`) and multi-language (`key,en,es,fr,swa`) formats
  - Automatic fallback to English when selected language is unavailable
  - Handles special characters (replaces `~` with commas)
  - Supports dynamic keys (`speaker1`, `speaker2`, etc.)

### 2. QR Code Scanning

- **Description:** Scan QR codes to load program URLs
- **Implementation:** `js/qr.js`
- **Features:**
  - Camera-based QR code scanning using jsQR library
  - Manual URL entry fallback when camera is unavailable
  - URL validation before loading
  - Handles camera permission errors gracefully

### 3. Multi-Language Support (i18n)

- **Description:** Full UI translation for 4 languages
- **Implementation:** `js/i18n/index.js`
- **Supported Languages:**
  | Code | Language | Native Name |
  |------|----------|--------------|
  | en | English | English |
  | es | Spanish | Español |
  | fr | French | Français |
  | swa | Swahili | Kiswahili |
- **Features:**
  - Persistent language preference (saved to localStorage)
  - All UI labels translated
  - Church name displayed in correct language
  - Program content loaded from appropriate language column

### 4. Program Rendering

- **Description:** Displays meeting program in clean, mobile-friendly format
- **Implementation:** `js/utils/renderers.js`
- **Rendered Elements:**
  - Unit name and address header
  - Date display
  - Presiding authority
  - Conducting leader
  - Music director and organist
  - Opening/closing hymns with clickable links
  - Sacrament hymn
  - Intermediate hymns
  - Speakers (unlimited number)
  - Opening/closing prayers
  - Leadership list with phone numbers
  - Announcements and section dividers
  - Links with optional images

### 5. Theme Support (Light/Dark Mode)

- **Description:** User-selectable theme with system preference detection
- **Implementation:** `js/main.js`, CSS custom properties
- **Features:**
  - Dark mode toggle
  - Respects system `prefers-color-scheme` preference
  - Persists user choice in localStorage

### 6. Offline Support (PWA)

- **Description:** Works without internet connection
- **Implementation:** `service-worker.js`, `manifest.webmanifest`
- **Features:**
  - Service worker caches all app assets
  - Program cache stored in localStorage
  - Shows cached program when offline
  - Offline banner notification

### 7. Profile Management

- **Description:** Save and switch between multiple unit programs
- **Implementation:** `js/profiles.js`
- **Features:**
  - Add new programs via QR scan
  - Switch between saved programs
  - Delete programs (except active one)
  - Persists profiles in localStorage
  - Shows profile selector when multiple profiles exist

### 8. Program History (v2.1.0)

- **Description:** Archives previous meeting programs
- **Implementation:** `js/history.js`
- **Features:**
  - Automatically saves programs after network fetch
  - Separate history per profile (unit)
  - Smart save logic:
    - Throttles saves (5-minute minimum between saves)
    - Deduplicates identical content
    - Distinguishes network vs cached loads
  - Retention policy:
    - Default: 1 year
    - Extended: 2 years if data < 100KB
  - History modal UI to view/load past programs

### 9. Hymn Linking (v2.1.0)

- **Description:** Clickable links to hymns on Church website
- **Implementation:** `js/utils/renderers.js`
- **Features:**
  - Hymns link to: `https://www.churchofjesuschrist.org/music/library/hymns/{number}`
  - Children's songs (CS format) link to: `https://www.churchofjesuschrist.org/music/library/children/{slug}`
  - Links open in new tab with proper security attributes

### 10. Honorific Translation (v2.1.0)

- **Description:** Auto-translates English honorifics to local language
- **Implementation:** `js/i18n/honorifics.js`
- **Supported Terms:**
  | English | Spanish | French | Swahili |
  |---------|---------|--------|---------|
  | Brother | Hermano | Frère | Ndugu |
  | Sister | Hermana | Sœur | Sista |
  | Elder | Élder | Elder | Elder |
  | Bishop | Obispo | Évêque | Askofu |
  | President | Presidente | Président | Raisi |
- **Applied To:**
  - Presiding authority
  - Conducting leader
  - Music director
  - Organist
  - Opening/closing prayers
  - All speakers

### 11. Security & Sanitization

- **Description:** Protects against malicious input
- **Implementation:** `js/sanitize.js`
- **Features:**
  - HTML tag stripping
  - JavaScript injection prevention
  - URL validation (https only)
  - XSS prevention
  - Unknown key filtering

### 12. Program Sharing (v1.6.0)

- **Description:** Share program with neighbors via QR code
- **Implementation:** `js/share.js`
- **Features:**
  - Share button in header (next to theme toggle)
  - Generates QR code containing program URL
  - Modal displays QR code for others to scan
  - Includes direct URL display for manual entry
  - Translations for all 4 languages

### 13. Help & FAQ (v1.6.0)

- **Description:** In-app help system with PWA installation instructions
- **Implementation:** `js/share.js`
- **Features:**
  - Help button in header (❓)
  - PWA installation instructions for iOS and Android
  - Camera troubleshooting guide
  - Shows automatically on first visit
  - Manual help available anytime

---

## Implemented Requirements

All requirements listed in `docs/REQUIREMENTS_*.md` have been implemented and are included in the current feature set above. See the `docs/` folder for details on implemented items such as IndexedDB-backed profiles/archives, service worker update flows, offline caching strategies, sharing/QR flows, internationalization, and UI/theme behaviors.

No further major features are planned for this project; the app is at stable feature-complete version v2.2.0. Future updates will focus on maintenance, performance, and security improvements as needed.

---

## Notable Changes (v2.1.0 → v2.2.0)

The following highlights represent improvements made in v2.2.0 (released March 4, 2025):

- **Enhanced PWA Support**: Improved service worker registration and lifecycle management; better cache invalidation strategies
- **Installation Promotion**: Added prompts to encourage PWA installation on mobile devices; better support for both iOS and Android
- **Performance Optimizations**: Reduced bundle size; optimized CSS variables and theme switching; improved initial load times
- **Accessibility Improvements**: Better ARIA labels; improved keyboard navigation; enhanced screen reader support
- **Storage Migration**: Improved IndexedDB initialization and error handling; better fallback for legacy data
- **Miscellaneous**: Additional bug fixes, dependency updates, and test coverage improvements

## Notable Changes (v1.6.0 → v2.1.0)

The following highlights summarize the work completed between v1.6.0 and v2.1.0.

- Service worker & versioning: improved caching strategies, version-based cache names, more robust update checks and skipWaiting flow; added scripts and logic to keep `js/version.js` and the service worker in sync.
- Archive subsystem: implemented archive/index pages, archive object models, date-based archives per profile, checksum and data-integrity fixes, and consistent rendering for archived programs.
- Profile management: refactored profile handling, added IndexedDB-backed storage patterns (profiles/archives), safeguards around profile creation/deletion, and improved QR-based profile onboarding.
- QR & sharing: enhanced QR scanner and share flow to extract sheet URLs and site URLs reliably; added manual URL entry fallbacks and URL validation improvements.
- Internationalization: added i18n support to the archive UI and ensured UI translations persist across pages.
- Sanitization & rendering: improved sanitization logic, tightened URL validation (https-only), and consolidated rendering via `renderers.js` for consistent output between live and archived views.
- Tests: added comprehensive E2E and unit tests covering profiles, service worker behavior, QR scanning flows, and archive functionality.
- UX & theming: fixed theme initialization on archive pages, consistent styling across archive and main views, and multiple small UI/formatting fixes.
- Misc: various bug fixes, dependency updates, version bumps, and CI/test adjustments.

## Contributing

See [README.md](./README.md) for contribution guidelines.

1. Branch from `develop`
2. Implement feature/fix
3. Add tests
4. Push and open PR to `develop`
