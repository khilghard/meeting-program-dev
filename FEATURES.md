# Meeting Program - Feature Documentation

## Overview

Meeting Program is a Progressive Web App (PWA) that displays sacrament meeting programs by pulling data dynamically from Google Sheets. It is designed for mobile and tablet use in church meetings, accessible via QR code.

**Live URL:** https://khilghard.github.io/meeting-program/

---

## Current Features (v1.5.0)

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

### 8. Program History (v1.5.0)

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

### 9. Hymn Linking (v1.5.0)

- **Description:** Clickable links to hymns on Church website
- **Implementation:** `js/utils/renderers.js`
- **Features:**
  - Hymns link to: `https://www.churchofjesuschrist.org/music/library/hymns/{number}`
  - Children's songs (CS format) link to: `https://www.churchofjesuschrist.org/music/library/children/{slug}`
  - Links open in new tab with proper security attributes

### 10. Honorific Translation (v1.5.0)

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

## Future Features (Planned)

### 1. Program Sharing via QR Codes

**Description:** Allow users to share the current program with nearby users

**User Flow:**

1. Display first QR code: The meeting-program website URL
2. Show instructions: "Scan to open the app"
3. Handle camera permission failures with helpful guidance
4. Flip to second "page": QR code containing the current program URL
5. Show instructions: "How to install PWA on Android/iPhone"

**Implementation Notes:**

- Use existing QR generation library (qrcode.js or similar)
- Create multi-step onboarding flow
- Add PWA installation instructions for:
  - iOS: Safari → Share → Add to Home Screen
  - Android: Chrome → Menu → Install App

### 2. Improved User Onboarding

**Description:** Better guidance for first-time users, especially around camera permissions

**Features:**

- First-run tutorial explaining app purpose
- Camera permission request with explanation
- Fallback manual URL entry
- Clear error messages for common issues
- "How to use" help section

### 3. Additional Features (Proposed)

- **Program Templates:** Pre-built CSV templates for common use cases
- **Print Mode:** CSS print styles for paper programs
- **Notification Reminders:** Browser notifications for meeting time
- **Multi-Day Support:** Handle multiple meetings per day
- **Hymn Search:** Search hymns by number or title
- **Speaker Notes:** Add private notes visible only to clerks
- **Version Changelog:** In-app release notes
- **Analytics:** Anonymous usage tracking
- **Backup/Export:** Export program data as JSON

---

## v2.0 Features (Planned)

### 1. IndexedDB Storage

**Description:** Replace localStorage with IndexedDB for reliable data persistence

**Features:**

- All profile and archive data stored in IndexedDB
- Transaction support for data integrity
- Automatic storage management (10MB limit, 2-year retention)
- Checksum validation for data integrity
- Graceful degradation on storage errors

**Implementation:** `js/data/IndexedDBManager.js`, `js/data/ProfileManager.js`

### 2. Service Worker Enhancement

**Description:** Advanced caching strategies for offline-first experience

**Features:**

- Cache-first for static assets
- Network-first for Google Sheets URLs
- Stale-while-revalidate for archive data
- Custom offline page
- Background sync for migration checks

**Implementation:** `service-worker.js`

### 3. Migration System

**Description:** Notify users when programs need updating

**Features:**

- Detect `obsolete` and `migrationUrl` keys from Google Sheet
- Validate migration URL before prompting
- Non-intrusive banner notification
- "Remind Me Later" option
- Background sync when network available
- Works completely offline

**Implementation:** `js/data/ProfileManager.js`, `js/main.js`

### 4. Archive Timeline UI

**Description:** Visual timeline of past programs

**Features:**

- Timeline view with calendar dots
- Newest programs displayed first
- One-tap to load past programs
- Storage usage indicator
- Automatic cleanup warnings

**Implementation:** `js/archive.js`

### 5. Profile Cards

**Description:** Enhanced profile selection interface

**Features:**

- Visual profile cards with status indicators
- Green = active, Yellow = needs migration, Gray = archived
- Search/filter profiles
- Language flag icons
- Accessible keyboard navigation

**Implementation:** `js/main.js`, `css/styles.css`

### 6. Print-Friendly Mode

**Description:** Clean print output for physical programs

**Features:**

- One-click print button
- Hides all UI elements
- Optimized typography and spacing
- Black text on white background
- Works in all browsers

**Implementation:** `css/styles.css`

### 7. Offline Indicator

**Description:** Clear network status feedback

**Features:**

- Subtle icon: 🌐 (online) or 📱 (offline)
- "Working offline" message with last update time
- Auto-detects network recovery
- Non-intrusive placement

**Implementation:** `js/main.js`

### 8. Data Export/Import

**Description:** Backup and restore functionality

**Features:**

- Export all profiles and archives as JSON
- Import from JSON file
- Includes checksums for integrity
- Merge or replace options

**Implementation:** `js/data/ProfileManager.js`

---

## Contributing

See [README.md](./README.md) for contribution guidelines.

1. Branch from `develop`
2. Implement feature/fix
3. Add tests
4. Push and open PR to `develop`
