# Code Citations

## License: unknown
https://github.com/wayou/wayou.github.io/blob/5d2190ff8b5d0b67b64f70ccbb23eab30b8d56b2/_posts/2019-06-03-JavaScript%20%E5%AE%9E%E7%8E%B0%E9%A1%B5%E9%9D%A2%E4%B8%AD%E5%BD%95%E9%9F%B3%E5%8A%9F%E8%83%BD.md

```
I'll provide you with the comprehensive plan as a detailed document that you can save. Since I don't have file writing tools available, I'll present the complete plan in a code block that you can save directly to `./docs/FEATURE_CMS_EDIT.md`:

```markdown
# Feature Plan: CMS Sheet Editor (Google Sheets OAuth + Form UI)

**Version**: 1.0  
**Last Updated**: March 10, 2026  
**Status**: Ready for Implementation  
**Estimated Duration**: 6 phases, ~100-120 hours total (can parallelize some tasks)

---

## 📋 Table of Contents

1. [Overview & Architecture](#overview--architecture)
2. [Design Decisions](#design-decisions)
3. [Technical Architecture](#technical-architecture)
4. [Phase 1: OAuth Module](#phase-1-oauth-module)
5. [Phase 2: Google Sheets API Service](#phase-2-google-sheets-api-service)
6. [Phase 3: Editor State Manager](#phase-3-editor-state-manager)
7. [Phase 4: Editor UI Component](#phase-4-editor-ui-component)
8. [Phase 5: Editor Page & Navigation](#phase-5-editor-page--navigation)
9. [Phase 6: Tests & Deployment](#phase-6-tests--deployment)
10. [Data Structures & Interfaces](#data-structures--interfaces)
11. [Testing Specifications](#testing-specifications)
12. [Integration Checklist](#integration-checklist)
13. [Risk Mitigation](#risk-mitigation)

---

## Overview & Architecture

### What We're Building

A **Google Sheets CMS interface** that allows authorized editors to modify meeting program data directly in the app. Features:

- **Google OAuth 2.0 authentication** (PKCE flow, client-side only)
- **Collaborator verification** against the currently-loaded Google Sheet
- **Form-based UI** with scrollable key/value pairs, language selectors, validation
- **Local state management** with IndexedDB persistence for in-progress edits
- **Batch CSV upload** back to Google Sheets (not row-by-row)
- **Graceful "Viewer Only" fallback** for non-editors
- **No backend required** (GitHub Pages compatible)

### Why This Approach?

| Requirement | Solution | Why Not Others |
|---|---|---|
| **Free hosting** | GitHub Pages (static) | Avoiding backend costs ✅ |
| **No tech accounts** | Google OAuth (user's own account) | Users already have Google accounts |
| **Edit protection** | OAuth + Collaborators check | Verified against actual Sheet permissions |
| **Offline-ready** | IndexedDB state storage | Can edit offline, upload when online |
| **Easy CSV export** | CSV validation + upload | Reversible, debuggable, portable |
| **Non-tech friendly** | Form UI with pills/dropdowns | Visual, clear, no CSV syntax needed |

---

## Design Decisions

### 1. Authentication: Google OAuth 2.0 with PKCE

**Decision**: Use Google Identity Services (gis) library for browser-based OAuth authentication.

**Why**:
- No backend needed (PKCE flow works entirely client-side)
- Users sign in with account they already have
- Provides access token to call Google Sheets API
- Can verify user is a Sheet collaborator
- Token stored in `sessionStorage` (cleared on browser close) for security

**Implementation**:
- User navigates to `/editor.html`
- Click "Sign in with Google" button
- Google login popup appears
- After auth, token stored in `sessionStorage`
- App checks if user is collaborator on current sheet
- If yes: show editor; if no: show "Viewer Only"

### 2. Data Flow: Form UI + Batch Upload

**Decision**: Build form UI with field-by-field editing; upload all changes in one batch.

**Why**:
- Better UX than downloading/editing CSV locally
- Batch upload is safer than row-by-row API calls
- Can validate entire dataset before upload
- Less error-prone than incremental saves
- Users can edit multiple fields, review, then upload

**Data Lifecycle**:
1. Load current CSV from Sheet (via public export URL)
2. Parse into in-memory object: `{ key: { en, es, fr, swa } }`
3. Store in IndexedDB (survives page reload)
4. Editor modifies fields via form UI
5. On "Save": validate CSV, call Sheets API to append/update rows
6. After success: reload data, clear unsaved indicator

### 3. Permission Model: Collaborators Check

**Decision**: Check if authenticated user is a collaborator on the current Sheet.

**Why**:
- Tied to actual Sheet permissions (most secure)
- No manual allow-lists to maintain
- User only edits sheets they have permission for
- Leverages existing Google Sheet sharing

**Flow**:
1. Get sheet ID from current profile's CSV URL
2. After OAuth sign-in, call `spreadsheets.get()` to fetch collaborators
3. Compare user's email to collaborators list
4. Show/hide editor UI accordingly

### 4. UI Pattern: Scrollable Form with Language Pills

**Decision**: Single scrollable list of all keys, with key selector, language buttons, single input field.

**Why**:
- One key at a time prevents overwhelming users
- Language pills (Bootstrap 5) are clear and visual
- Single input field reduces UI complexity
- Scrollable list shows all available fields
- Matches your original spec exactly

**Form Structure**:
```
[Sign in / Logged in as: user@gmail.com] [Sign out]

Key Dropdown: [speaker1 ▼]
Language Pills: [EN] [ES] [FR] [SWA]
Input Field: [textarea with current value]
Add Row ➕ | Save Changes ✓

Unsaved: 3 changes pending
```

### 5. State Persistence: IndexedDB + Session

**Decision**: Keep edited data in IndexedDB during session; clear on sign-out.

**Why**:
- Survives page reload/accidental close
- User can ask "Resume editing?" on reload
- Keeps edits local until upload
- Session-based (not long-term storage)
- Encrypted in browser's secure storage

---

## Technical Architecture

### High-Level Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    editor.html                              │
│         (New page, mirrors index.html structure)             │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    js/editor.js                              │
│  (Orchestrator: loads profiles, checks auth, renders UI)    │
└─────────────────────────────────────────────────────────────┘
                            │
                ┌───────────┼───────────┐
                ▼           ▼           ▼
         ┌──────────┐ ┌──────────┐ ┌──────────┐
         │googleAuth│ │sheetsApi │ │editorState│
         │   .js    │ │Service.js│ │Manager.js │
         └──────────┘ └──────────┘ └──────────┘
                │           │           │
                └───────────┼───────────┘
                            │
                            ▼
         ┌──────────────────────────────────┐
         │  js/components/SheetEditor.mjs   │
         │        (UI Component)            │
         └──────────────────────────────────┘
                            │
                            ▼
         ┌──────────────────────────────────┐
         │      IndexedDB (Dexie)           │
         │   (editor._state store)          │
         └──────────────────────────────────┘
```

### File Organization

```
js/
├── auth/
│   └── googleAuth.js               [NEW] OAuth 2.0 module
├── services/
│   └── sheetsApiService.js         [NEW] Google Sheets API calls
├── data/
│   └── EditorStateManager.js       [NEW] In-memory state + persistence
├── components/
│   └── SheetEditor.mjs             [NEW] Form UI component
├── editor.js                        [NEW] Editor page entry point
└── [existing modules unchanged]

editor.html                          [NEW] Editor page

test/
├── auth/
│   └── googleAuth.test.mjs         [NEW] Auth tests
├── services/
│   └── sheetsApiService.test.mjs   [NEW] API service tests
├── data/
│   └── EditorStateManager.test.mjs [NEW] State manager tests
├── components/
│   └── SheetEditor.test.mjs        [NEW] UI component tests
└── editor.test.mjs                 [NEW] Integration tests

e2e/
├── scenarios/
│   └── editor.spec.js              [NEW] E2E scenarios

docs/
├── FEATURE_CMS_EDIT.md             [THIS FILE]
└── [existing docs unchanged]
```

### Dependencies

**External Libraries** (already in package.json):
- `dexie` v4.3.0 — IndexedDB abstraction (already used)
- Google Identity Services — Added via CDN script tag in editor.html

**No new npm dependencies**

---

## Phase 1: OAuth Module

**Objective**: Implement Google OAuth 2.0 authentication with PKCE flow.

**Duration**: ~8-10 hours  
**Context Required**: Medium (auth patterns, Google API basics)  
**Files Created**: `js/auth/googleAuth.js`, `test/auth/googleAuth.test.mjs`

### Task 1.1: Create googleAuth Module Structure

**File**: `js/auth/googleAuth.js`

Create a module that:
- Exports an object: `GoogleAuth` with methods listed below
- Initializes Google Identity Services (gis) on load
- NO external dependencies except gis library (loaded via CDN in editor.html)

**Methods to implement**:

```javascript
GoogleAuth.initialize(clientId, redirectUri)
GoogleAuth.signIn()                    // Opens Google login popup
GoogleAuth.signOut()                   // Clears token, closes session
GoogleAuth.getAccessToken()            // Returns token from sessionStorage
GoogleAuth.isAuthenticated()           // Returns boolean
GoogleAuth.getUser()                   // Returns { email, name }
GoogleAuth.onTokenExpire(callback)     // Handles token refresh
```

**Session Storage Keys**:
- `gm_access_token` — OAuth access token
- `gm_user_email` — User's email
- `gm_token_expires` — Token expiry timestamp (ms)

**Error Handling**:
- If user cancels login: resolve to `null` (don't throw)
- If token expires: auto-refresh or trigger re-auth
- Log all errors to `[AUTH]` prefix

**Notes**:
- Use `sessionStorage` only (cleared on browser close)
- Never use `localStorage` for tokens
- Implement token expiry check before API calls
- Google sign-out should clear all stored data

### Task 1.2: Handle PKCE Flow (Authorization Code)

**Context**: PKCE (Proof Key for Code Exchange) is how OAuth 2.0 works in browsers without backend.

**Implementation Details**:

1. Generate `code_verifier` (43-128 char random string)
2. Hash it to `code_challenge` (SHA-256)
3. Send user to Google auth endpoint with `code_challenge`
4. User grants permission
5. Google redirects back with authorization `code`
6. Exchange `code` + `code_verifier` for access token
7. Store token in `sessionStorage`

**Library**: Use `google-gsi` (Google Identity Services)
- Already available via CDN: `https://accounts.google.com/gsi/client`
- Handles PKCE automatically
- Simpler to use than raw OAuth

**Code Flow**:
```javascript
// In googleAuth.js
function generatePKCEPair() {
  // Generate random code_verifier
  // SHA-256 hash to code_challenge
  // Return { verifier, challenge }
}

async function exchangeCodeForToken(code, codeVerifier) {
  // POST to Google token endpoint
  // Return access token
}
```

**Testing**:
- Mock `sessionStorage`
- Mock Google gsi library
- Test token generation/storage
- Test error cases (network, user cancel)

### Task 1.3: Implement Token Refresh & Expiry

**Requirement**: Access tokens expire in ~1 hour. Handle gracefully.

**Implementation**:
1. Store token `expires_at` timestamp when token received
2. Before API calls: check if `Date.now() > expires_at`
3. If expired: trigger refresh flow
4. If refresh fails: sign out and require re-auth

**Methods**:
```javascript
GoogleAuth.isTokenExpired()
GoogleAuth.refreshToken()
GoogleAuth.onTokenExpire(callback)  // Register handler
```

**Edge Case**: If user's Google session has ended, refresh will fail. Show "Please sign in again" message.

### Task 1.4: Create Unit Tests for Auth

**File**: `test/auth/googleAuth.test.mjs`

**Test Cases**:

```
✓ signIn() opens Google popup
✓ On successful auth, token stored in sessionStorage
✓ isAuthenticated() returns true after sign-in
✓ isAuthenticated() returns false before sign-in
✓ getAccessToken() returns token string
✓ getUser() returns { email, name }
✓ Token expiry is calculated correctly
✓ signOut() clears sessionStorage
✓ isTokenExpired() returns true for expired token
✓ refreshToken() updates token before expiry
✓ On network error, gracefully handle (don't crash)
✓ On user cancel, resolve to null (not throw)
✓ Multiple sign-in calls don't create duplicate popups
```

**Mocking**:
- Mock global `google` object (from gis library)
- Mock `sessionStorage`
- Mock `fetch` for token endpoint

---

## Phase 2: Google Sheets API Service

**Objective**: Wrapper for Google Sheets API operations (check collaborators, upload data).

**Duration**: ~10-12 hours  
**Context Required**: Medium (Google Sheets API, HTTP requests)  
**Files Created**: `js/services/sheetsApiService.js`, `test/services/sheetsApiService.test.mjs`

### Task 2.1: Create Sheets API Service Structure

**File**: `js/services/sheetsApiService.js`

**Methods to export**:

```javascript
SheetsAPI.initialize(accessToken)              // Set auth token
SheetsAPI.getSpreadsheetMetadata(sheetId)      // Get sheet info + collaborators
SheetsAPI.checkIfCollaborator(sheetId, email)  // Boolean
SheetsAPI.getSheetValues(sheetId, range)       // Fetch cell values
SheetsAPI.appendRows(sheetId, values)          // Add rows to sheet
SheetsAPI.updateRows(sheetId, values)          // Update existing rows
SheetsAPI.uploadCSV(sheetId, csvData)          // Replace entire sheet data
```

**Dependencies**:
- `GoogleAuth` module (to get access token)
- Standard `fetch` API (no external library)

**Base Endpoint**: `https://sheets.googleapis.com/v4/spreadsheets`

**Required OAuth Scope**: `https://www.googleapis.com/auth/spreadsheets`

**Error Handling**:
- Log all HTTP errors with request details
- Return `{ success: false, error: "message" }` for failures
- Throw on authentication errors (token expired, unauthorized)
- Network timeouts: implement 30-second timeout

### Task 2.2: Extract Sheet ID from CSV URL

**Context**: Current profiles store CSV export URLs. Need to extract sheet ID.

**Sheet URL Patterns**:
```
CSV export URL: https://docs.google.com/spreadsheets/d/ABC123XYZ/gviz/tq?tqx=out:csv
Sheet ID:       ABC123XYZ (extract from /d/.../)

Normal sheet URL: https://docs.google.com/spreadsheets/d/ABC123XYZ/edit#gid=0
Sheet ID:        ABC123XYZ (same extraction)
```

**Function**:
```javascript
function extractSheetIdFromUrl(csvUrl) {
  // return sheet ID string, or null if invalid
}
```

**Validation**:
- Ensure URL contains `docs.google.com/spreadsheets/d/`
- Ensure ID is alphanumeric (no special chars)
- Return `null` for invalid URLs

### Task 2.3: Implement `getSpreadsheetMetadata()`

**API Call**: `GET /v4/spreadsheets/{sheetId}`

**Returns**:
```json
{
  "spreadsheetId": "ABC123XYZ",
  "properties": {
    "title": "Sacrament Program",
    "locale": "en_US",
    ...
  }
}
```

**Additional**: Fetch collaborators via Drive API (optional advanced feature; for now, assume we can determine from spreadsheet.properties)

**Note**: Google Sheets API's `spreadsheets.get()` requires the user to have at least Viewer access. Request with `fields=spreadsheetId,properties` to minimize response size.

### Task 2.4: Implement `checkIfCollaborator()`

**Logic**:
1. Call `getSpreadsheetMetadata(sheetId)`
2. Check `spreadsheetProperties` for owner/editors
3. Compare `GoogleAuth.getUser().email` to collaborators list
4. Return `true` if match, `false` otherwise

**Edge Cases**:
- User email might have different case (do case-insensitive compare)
- If metadata doesn't contain collaborators, conservative approach: `return false` (deny access)
- If API call fails: `throw` error (don't silently deny)

**Alternative** (if Google Sheets API doesn't provide collaborators easily):
- Could use Drive API's `permissions` endpoint
- For now, assume metadata provides this info; adjust if not available

### Task 2.5: Implement CSV Upload/Append

**Historical Context**: App currently uses public CSV export URLs (read-only).

**New Requirement**: Upload modified CSV back to Sheet.

**Two Approaches**:

**Option A: Append Rows** (Simpler)
- API: `POST /v4/spreadsheets/{sheetId}/values:append`
- Each edited row sent as new row
- Pro: Simple, no row-by-row tracking
- Con: Duplicates sheet data if not careful

**Option B: Clear & Replace** (Safer)
- API: `POST /v4/spreadsheets/{sheetId}/values:batchUpdate`
- Clear all data, write new CSV
- Pro: Guaranteed consistent state
- Con: All-or-nothing (can't recover if network fails mid-upload)

**Decision**: Use **Option B** (Clear & Replace) with validation

**Implementation**:

```javascript
async function uploadCSV(sheetId, csvData) {
  // 1. Validate csvData format (check headers, etc.)
  // 2. Parse CSV into 2D array (rows + columns)
  // 3. Call Sheets API:
  //    - DELETE all rows from Sheet1
  //    - APPEND new CSV data
  // 4. Return { success, sheetId, rowsWritten }
}
```

**API Call**:
```
POST /v4/spreadsheets/{sheetId}/values/Sheet1:clear
POST /v4/spreadsheets/{sheetId}/values/Sheet1:append
  Body: { values: [ ["key", "en", "es", "fr", "swa"], [...], [...] ] }
```

**Error Recovery**:
- If clear succeeds but append fails: sheet is empty (bad)
- Mitigation: Check sheet before upload, warn user
- Alternative: Use local backup copy for recovery

### Task 2.6: Create Unit Tests for Sheets API Service

**File**: `test/services/sheetsApiService.test.mjs`

**Test Cases**:

```
✓ extractSheetIdFromUrl() extracts ID correctly
✓ extractSheetIdFromUrl() rejects invalid URLs
✓ getSpreadsheetMetadata() makes correct API call
✓ getSpreadsheetMetadata() parses response
✓ checkIfCollaborator() returns true for collaborators
✓ checkIfCollaborator() returns false for non-collaborators
✓ checkIfCollaborator() is case-insensitive for email
✓ uploadCSV() calls clear then append
✓ uploadCSV() throws on validation error
✓ uploadCSV() returns row count
✓ On 401 Unauthorized: throw auth error
✓ On 403 Forbidden: throw permission error
✓ On network timeout: throw with timeout message
✓ On invalid CSV: return validation error
```

**Mocking**:
- Mock `fetch` for all API calls
- Mock `GoogleAuth.getAccessToken()`
- Mock `GoogleAuth.getUser()`

---

## Phase 3: Editor State Manager

**Objective**: In-memory state management for edited CSV data with IndexedDB persistence.

**Duration**: ~10-12 hours  
**Context Required**: Medium (IndexedDB, CSV parsing, state management)  
**Files Created**: `js/data/EditorStateManager.js`, `test/data/EditorStateManager.test.mjs`

### Task 3.1: Create EditorStateManager Structure

**File**: `js/data/EditorStateManager.js`

**Purpose**: Hold edited CSV data in memory, track changes, persist to IndexedDB.

**Internal Data Structure**:

```javascript
// Parsed CSV stored as:
{
  headers: ["key", "en", "es", "fr", "swa"],
  rows: {
    "unitName": {
      en: "Your Ward Name",
      es: "Nombre de Su Rama",
      fr: "Nom de Votre Branche",
      swa: "Jina la Kimanda Yako"
    },
    "speaker1": {
      en: "John Smith",
      es: "", // Empty = fallback to English
      fr: "",
      swa: ""
    },
    // ... more rows
  },
  // Track which fields have unsaved changes
  unsavedChanges: {
    "unitName": { en: true, es: false, fr: false, swa: false },
    "speaker1": { en: false, es: true, fr: false, swa: false },
  },
  // Metadata
  sheetId: "ABC123XYZ",
  createdAt: Date.now(),
  lastModified: Date.now()
}
```

**Class Methods**:

```javascript
class EditorStateManager {
  constructor(sheetId) {
    this.sheetId = sheetId;
    this.state = { /* as above */ };
  }

  async loadFromSheet(csvUrl) {
    // Fetch current CSV from sheet
    // Parse it into state.rows
    // Save to IndexedDB
  }

  getValue(key, language = "en") {
    // Return value for key + language
    // Fallback to English if empty
  }

  setValue(key, language, value) {
    // Update value, mark as changed
    // Don't save to DB yet (only on explicit save)
  }

  addRow(key, values = {}) {
    // Add new key with optional values
    // Mark as new/unsaved
  }

  deleteRow(key) {
    // Mark row for deletion
  }

  getUnsavedCount() {
    // Return number of changed fields
  }

  getChangedRows() {
    // Return only rows with unsaved changes
  }

  async validate() {
    // Check CSV structure, keys, hymn format
    // Return { valid: boolean, errors: [] }
  }

  toCSV() {
    // Generate CSV string ready for upload
    // Includes validation
  }

  async saveChanges(csvData) {
    // Save edited state to IndexedDB for session persistence
  }

  async discardChanges() {
    // Clear unsaved state, reload from sheet
  }

  async clear() {
    // Delete all editor data from IndexedDB
  }

  static async resume(sheetId) {
    // Check if previous session exists
    // Return EditorStateManager instance or null
  }
}
```

### Task 3.2: Implement CSV Parsing & Validation

**Requirement**: Parse Google Sheet CSV into structured data.

**CSV Format**:
```
key,en,es,fr,swa
unitName,Your Ward,Su Rama,Votre Branche,Kimanda Yako
speaker1,John Smith,Juan Garcia,Jean Dupont,Yohana Mto
openingHymn,62
CS 2,Accompaniment by Sister Smith
```

**Parsing Logic**:
1. Use existing `parseCSV()` from `js/utils/csv.js` as reference
2. Detect CSV format: simple (key, value) vs. multi-lang (key, en, es, fr, swa)
3. Extract headers row
4. Parse data rows into dictionary structure
5. Normalize language values (trim whitespace, handle quotes)

**Validation Rules** (Task 3.3):
1. **Required headers**: Must have "key" column
2. **Language columns**: "en", "es", "fr", "swa" (if multi-lang format)
3. **No duplicate keys**: Each key appears only once
4. **Hymn format**: If key ends with "Hymn":
   - Value must be number (e.g., `62`, `1001`)
   - OR `CS` + space + number + optional letter (e.g., `CS 2`, `CS 73a`)
5. **Required fields**: "key" must be non-empty, "en" must be non-empty (unless fallback)
6. **No XSS payload**: Sanitize values (reuse `sanitizeEntry()` from `js/sanitize.js`)

**Error Messages**:
```javascript
{
  errors: [
    { row: 2, column: "opening Hymn", message: "Invalid hymn format: must be number or CS{space}number" },
    { row: 5, column: "key", message: "Duplicate key: 'speaker1' already defined at row 3" },
    { row: "header", column: "es", message: "Missing required language column" }
  ]
}
```

### Task 3.3: Implement Hymn Format Validation

**Context**: Hymn fields can have special format:
- Regular: `62` (hymn number)
- Children's: `CS 2` (with space, can have letter like `CS 73a`)
- With note: `62|Sung by Primary` (pipe-separated annotation)

**Validation Function**:

```javascript
function validateHymnValue(value) {
  if (!value) return { valid: false, error: "Hymn value cannot be empty" };
  
  // Split on pipe to get hymn part
  const [hymnPart] = value.split("|");
  const hymn = hymnPart.trim();
  
  // Pattern: number OR "CS {number}{optional letter}"
  const hymnRegex = /^(\d{1,4}|CS [0-9]{1,4}[a-z]?)$/i;
  
  if (!hymnRegex.test(hymn)) {
    return {
      valid: false,
      error: `Invalid hymn: ${hymn}. Use format: "62" or "CS 2" or "CS 73a", optionally with "|Note"`
    };
  }
  
  return { valid: true };
}
```

**Hymn Lookup** (Optional Enhancement):
- Reference `js/data/hymnsLookup.js` to validate hymn numbers exist
- For now: just validate format (not whether hymn exists)
- Can add lookup validation in Phase 4

### Task 3.4: Implement IndexedDB Persistence

**Context**: Store editor state so user can reload page and resume editing.

**IndexedDB Store**: `editor._state`

**Schema**:
```javascript
// In js/data/db.js (existing Dexie setup)
// Add new store:
editor_state: "sheetId, createdAt" // Compound key
```

**Stored Data**:
```javascript
{
  id: "auto-generated",
  sheetId: "ABC123XYZ",
  createdAt: Date.now(),
  lastModified: Date.now(),
  expiresAt: createdAt + (24 * 60 * 60 * 1000), // 24h session
  state: { /* EditorStateManager.state */ },
  csvUrl: "https://docs.google.com/..."
}
```

**Methods**:

```javascript
async function saveSessionState(sheetId, state, csvUrl) {
  // Store to IndexedDB
  // Return saved object with ID
}

async function getSessionState(sheetId) {
  // Fetch from IndexedDB
  // Check if expired (24h)
  // Return state or null
}

async function deleteSessionState(sheetId) {
  // Remove from IndexedDB
}

async function resumeSession(sheetId) {
  // Check if session exists
  // Ask user: "Resume editing? X changes pending"
  // Return EditorStateManager with restored state or null
}
```

**Expiry Policy**: Sessions expire after 24 hours (paranoid safety).

### Task 3.5: Implement toCSV() & String Generation

**Requirement**: Convert in-memory state back to CSV string format suitable for upload.

**Function**:

```javascript
toCSV() {
  // 1. Build header: "key,en,es,fr,swa"
  // 2. For each row, quote fields with commas/newlines
  // 3. Handle fallback: if language cell empty, use English value
  // 4. Return as string ready for Sheets API
}

// Example output:
// key,en,es,fr,swa
// unitName,Your Ward,Su Rama,Votre Branche,Kimanda Yako
// speaker1,"Smith, John","García, Juan","Dupont, Jean","Mtu, Yohana"
// openingHymn,62
//
```

**CSV Quoting Rules**:
- Quote fields containing: comma, newline, quotes
- Escape quotes: `"` → `""`
- Leave other fields unquoted

**Reference**: Use logic from `js/utils/csv.js` as template.

### Task 3.6: Create Unit Tests

**File**: `test/data/EditorStateManager.test.mjs`

**Test Cases**:

```
✓ loadFromSheet() fetches and parses CSV correctly
✓ loadFromSheet() handles multi-language format
✓ loadFromSheet() handles simple key-value format
✓ getValue() returns correct value
✓ getValue() falls back to English if language empty
✓ setValue() updates value and marks unsaved
✓ addRow() adds new key with empty values
✓ deleteRow() marks row for deletion
✓ getUnsavedCount() returns correct count
✓ getChangedRows() returns only unsaved rows
✓ validate() rejects duplicate keys
✓ validate() rejects invalid hymn format
✓ validate() rejects duplicate hymn with "CS" prefix
✓ validate() catches empty key
✓ toCSV() generates valid CSV string
✓ toCSV() quotes fields with commas
✓ toCSV() includes all languages
✓ saveChanges() stores to IndexedDB
✓ resumeSession() restores previous state
✓ discardChanges() clears unsaved state
✓ Session expires after 24 hours
```

**Mocking**:
- Mock `fetch` for CSV download
- Mock IndexedDB via `fake-indexeddb`
- Mock `sanitizeEntry()`

---

## Phase 4: Editor UI Component

**Objective**: React-like component for editor form (scrollable list, key selector, language pills, input field).

**Duration**: ~12-14 hours  
**Context Required**: Medium-High (DOM manipulation, event handling, Bootstrap 5)  
**Files Created**: `js/components/SheetEditor.mjs`, `test/components/SheetEditor.test.mjs`

### Task 4.1: Design UI Structure & Components

**HTML Structure** (will be rendered by JavaScript):

```html
<div id="editor-main">
  <!-- Authentication Section -->
  <div id="auth-section">
    <button id="signin-btn" class="btn btn-primary">Sign in with Google</button>
  </div>

  <!-- Editor Section (hidden until auth) -->
  <div id="editor-section" style="display: none;">
    <!-- User Info -->
    <div class="editor-header">
      <span class="user-email">Logged in as: user@gmail.com</span>
      <button id="signout-btn" class="btn btn-sm btn-secondary">Sign out</button>
    </div>

    <!-- Key Selector & Language -->
    <div class="editor-controls">
      <div class="form-group">
        <label for="key-select">Key:</label>
        <select id="key-select" class="form-control">
          <option value="">-- Select a key --</option>
          <option value="unitName">unitName</option>
          <option value="speaker1">speaker1</option>
          <!-- ... all keys ... -->
        </select>
      </div>

      <!-- Language Pills (Bootstrap 5 buttons) -->
      <div class="language-buttons mt-3">
        <label>Language:</label>
        <div class="btn-group" role="group">
          <input type="radio" class="btn-check" name="language" id="lang-en" value="en" checked>
          <label class="btn btn-outline-primary" for="lang-en">English</label>
          
          <input type="radio" class="btn-check" name="language" id="lang-es" value="es">
          <label class="btn btn-outline-primary" for="lang-es">Español</label>
          
          <input type="radio" class="btn-check" name="language" id="lang-fr" value="fr">
          <label class="btn btn-outline-primary" for="lang-fr">Français</label>
          
          <input type="radio" class="btn-check" name="language" id="lang-swa" value="swa">
          <label class="btn btn-outline-primary" for="lang-swa">Kiswahili</label>
        </div>
      </div>
    </div>

    <!-- Value Input -->
    <div class="form-group mt-4">
      <label for="value-input">Value:</label>
      <textarea id="value-input" class="form-control" rows="4" placeholder="Enter value..."></textarea>
      
      <!-- Hymn Checkbox (shown for *Hymn keys) -->
      <div id="hymn-options" class="mt-2" style="display: none;">
        <div class="form-check">
          <input type="checkbox" class="form-check-input" id="hymn-children" value="children">
          <label class="form-check-label" for="hymn-children">
            Children's Song (prepends "CS ")
          </label>
        </div>
      </div>
    </div>

    <!-- Unsaved Indicator -->
    <div id="unsaved-indicator" class="alert alert-warning mt-3" style="display: none;">
      <strong>⚠ Unsaved Changes:</strong> <span id="unsaved-count">0</span> fields modified
    </div>

    <!-- Action Buttons -->
    <div class="editor-actions mt-4">
      <button id="add-row-btn" class="btn btn-success">➕ Add New Field</button>
      <button id="save-btn" class="btn btn-primary">✓ Save Changes</button>
      <button id="discard-btn" class="btn btn-secondary">Clear Changes</button>
    </div>
  </div>

  <!-- Viewer-Only Section -->
  <div id="viewer-only-section" style="display: none;">
    <div class="alert alert-info">
      <h4>Viewer</h4>
      <p>You don't have permission to edit this sheet. Only collaborators can edit.</p>
    </div>
  </div>
</div>
```

### Task 4.2: Create SheetEditor Component Class

**File**: `js/components/SheetEditor.mjs`

**Class Structure**:

```javascript
export class SheetEditor {
  constructor(containerSelector, editorStateManager, options = {}) {
    this.container = document.querySelector(containerSelector);
    this.stateManager = editorStateManager;
    this.currentKey = null;
    this.currentLanguage = "en";
    this.isEditing = false;
    
    this.options = {
      onSave: null,    // Callback when Save clicked
      onAddRow: null,  // Callback when Add Row clicked
      ...options
    };
    
    this.eventHandlers = {};
  }

  async render() {
    // Build HTML structure above
    // Attach event listeners
    // Load keys into dropdown
  }

  on(eventName, callback) {
    // event.addListener pattern
    // Supported events: 'value-changed', 'key-selected', 'language-changed', 'save', 'add-row'
  }

  setValue(key, language, value) {
    // Update input field to show value
    // Update unsaved indicator
  }

  setKey(key) {
    // Change which key is being edited
    // Update select dropdown
    // Load value for new key
    // Show/hide hymn checkbox
  }

  setLanguage(language) {
    // Change selected language
    // Load value for new language
  }

  updateKeyList(keys) {
    // Refresh dropdown with new keys (after adding row)
  }

  showUnsavedIndicator(count) {
    // Show/hide and update count
  }

  setLoading(isLoading) {
    // Disable buttons while saving
    // Show spinner
  }

  showError(message) {
    // Toast/alert with error message
  }

  showSuccess(message) {
    // Toast/alert with success message
  }

  destroy() {
    // Clean up event listeners
  }
}
```

### Task 4.3: Implement Event Handlers & DOM Updates

**Event Handlers to Attach**:

1. **Key Selection** (`#key-select` change)
   - Emit `key-selected` event with new key
   - Load value from EditorStateManager
   - Show/hide hymn options
   - Update language pills

2. **Language Selection** (radio buttons)
   - Emit `language-changed` event
   - Load value for selected language from EditorStateManager
   - Update input field

3. **Value Input Change** (`#value-input` input)
   - Emit `value-changed` { key, language, value } event
   - Update EditorStateManager
   - Mark as unsaved
   - Show unsaved indicator

4. **Hymn Children's Checkbox** (`#hymn-children` change)
   - If checked: prepend "CS " to value
   - If unchecked: remove "CS " prefix
   - Emit `value-changed` event

5. **Add Row Button** (`#add-row-btn` click)
   - Emit `add-row` event
   - Prompt user for new key name
   - Validate key doesn't exist
   - Add to EditorStateManager
   - Refresh key dropdown
   - Select new key

6. **Save Button** (`#save-btn` click)
   - Emit `save` event with all changes
   - Disable buttons, show loading
   - Wait for parent to validate & upload
   - On success: clear unsaved indicator

7. **Discard Button** (`#discard-btn` click)
   - Ask for confirmation
   - Clear all unsaved changes
   - Reload values from EditorStateManager
   - Hide unsaved indicator

### Task 4.4: Implement Hymn Field Logic

**Hymn Detection**: If key ends with "Hymn" (case-insensitive):
- Show checkbox: "Children's Song (prepends 'CS ')"
- When checkbox checked: ensure value starts with "CS "
- When checkbox unchecked: remove "CS " prefix

**Examples**:
- User enters "2" + checks "Children's Song" → value becomes "CS 2"
- User enters "CS 2" + unchecks box → value becomes "2"
- User enters "CS 73a" + can check/uncheck
- If user manually types "CS 2": checkbox auto-checks

**Special Case**: Hymn value might include note (pipe-separated):
- "62|Sung by choir" → can edit "62" part, keep "|Sung by choir"
- Children's logic applies to hymn number part only

### Task 4.5: Implement Unsaved Indicator

**Requirements**:
- Show alert box when any field modified
- Display count of unsaved fields
- Update in real-time
- Update on Add Row
- Clear on Save or Discard

**HTML**:
```html
<div id="unsaved-indicator" class="alert alert-warning" style="display: none;">
  <strong>⚠ Unsaved Changes:</strong> <span id="unsaved-count">0</span> fields modified
</div>
```

**Logic**:
1. EditorStateManager tracks unsavedChanges
2. SheetEditor calls `stateManager.getUnsavedCount()`
3. Update DOM to show/hide indicator
4. Listen for `value-changed` events to update count

### Task 4.6: Style with Bootstrap 5

**CSS Considerations**:
- Use Bootstrap 5 CDN in `editor.html`
- Language pills: use Bootstrap btn-group + btn-check pattern
- Form layout: use form-control, form-group classes
- Validation messages: use alert classes
- Loading state: disable buttons, show spinner

**Custom CSS** (minimal):
```css
#editor-main {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid #ccc;
}

.language-buttons .btn-group {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

#value-input {
  min-height: 100px;
}

.editor-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
```

### Task 4.7: Create Unit Tests

**File**: `test/components/SheetEditor.test.mjs`

**Test Approach**: Test DOM updates and event emissions (mock DOM elements)

**Test Cases**:

```
✓ render() creates HTML structure
✓ render() populates key dropdown
✓ Key selection updates shown value
✓ Language selection changes input field
✓ Value input emits 'value-changed' event
✓ Unsaved indicator shows on value change
✓ Unsaved count increases/decreases
✓ Add Row button opens dialog for key name
✓ Add Row validates key doesn't exist
✓ Hymn-related keys show children's checkbox
✓ Hymn checkbox checked: prepends "CS "
✓ Hymn checkbox unchecked: removes "CS "
✓ Save button emits 'save' event
✓ Save button disables during save
✓ Discard button asks for confirmation
✓ Discard button clears unsaved state
✓ Error message displays toast
✓ Success message displays toast
✓ destroy() cleans up event listeners
✓ Multiple language changes tracked
✓ Pipe-separated notes preserved in hymn values
```

**Mocking**:
- Mock DOM elements using jsdom
- Mock EditorStateManager methods
- Mock window.alert/confirm
- Test event emissions via custom event listeners

---

## Phase 5: Editor Page & Navigation

**Objective**: Create `editor.html` page and integrate OAuth + Editor UI. Add navigation from main app.

**Duration**: ~10-12 hours  
**Context Required**: Medium (HTML structure, OAuth flow, navigation)  
**Files Created**: `editor.html`, `js/editor.js`, `test/editor.test.mjs`

### Task 5.1: Create editor.html Page

**File**: `editor.html`

**Structure**: Mirror `index.html` but with editor-specific content

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description
```


## License: unknown
https://github.com/wayou/wayou.github.io/blob/5d2190ff8b5d0b67b64f70ccbb23eab30b8d56b2/_posts/2019-06-03-JavaScript%20%E5%AE%9E%E7%8E%B0%E9%A1%B5%E9%9D%A2%E4%B8%AD%E5%BD%95%E9%9F%B3%E5%8A%9F%E8%83%BD.md

```
I'll provide you with the comprehensive plan as a detailed document that you can save. Since I don't have file writing tools available, I'll present the complete plan in a code block that you can save directly to `./docs/FEATURE_CMS_EDIT.md`:

```markdown
# Feature Plan: CMS Sheet Editor (Google Sheets OAuth + Form UI)

**Version**: 1.0  
**Last Updated**: March 10, 2026  
**Status**: Ready for Implementation  
**Estimated Duration**: 6 phases, ~100-120 hours total (can parallelize some tasks)

---

## 📋 Table of Contents

1. [Overview & Architecture](#overview--architecture)
2. [Design Decisions](#design-decisions)
3. [Technical Architecture](#technical-architecture)
4. [Phase 1: OAuth Module](#phase-1-oauth-module)
5. [Phase 2: Google Sheets API Service](#phase-2-google-sheets-api-service)
6. [Phase 3: Editor State Manager](#phase-3-editor-state-manager)
7. [Phase 4: Editor UI Component](#phase-4-editor-ui-component)
8. [Phase 5: Editor Page & Navigation](#phase-5-editor-page--navigation)
9. [Phase 6: Tests & Deployment](#phase-6-tests--deployment)
10. [Data Structures & Interfaces](#data-structures--interfaces)
11. [Testing Specifications](#testing-specifications)
12. [Integration Checklist](#integration-checklist)
13. [Risk Mitigation](#risk-mitigation)

---

## Overview & Architecture

### What We're Building

A **Google Sheets CMS interface** that allows authorized editors to modify meeting program data directly in the app. Features:

- **Google OAuth 2.0 authentication** (PKCE flow, client-side only)
- **Collaborator verification** against the currently-loaded Google Sheet
- **Form-based UI** with scrollable key/value pairs, language selectors, validation
- **Local state management** with IndexedDB persistence for in-progress edits
- **Batch CSV upload** back to Google Sheets (not row-by-row)
- **Graceful "Viewer Only" fallback** for non-editors
- **No backend required** (GitHub Pages compatible)

### Why This Approach?

| Requirement | Solution | Why Not Others |
|---|---|---|
| **Free hosting** | GitHub Pages (static) | Avoiding backend costs ✅ |
| **No tech accounts** | Google OAuth (user's own account) | Users already have Google accounts |
| **Edit protection** | OAuth + Collaborators check | Verified against actual Sheet permissions |
| **Offline-ready** | IndexedDB state storage | Can edit offline, upload when online |
| **Easy CSV export** | CSV validation + upload | Reversible, debuggable, portable |
| **Non-tech friendly** | Form UI with pills/dropdowns | Visual, clear, no CSV syntax needed |

---

## Design Decisions

### 1. Authentication: Google OAuth 2.0 with PKCE

**Decision**: Use Google Identity Services (gis) library for browser-based OAuth authentication.

**Why**:
- No backend needed (PKCE flow works entirely client-side)
- Users sign in with account they already have
- Provides access token to call Google Sheets API
- Can verify user is a Sheet collaborator
- Token stored in `sessionStorage` (cleared on browser close) for security

**Implementation**:
- User navigates to `/editor.html`
- Click "Sign in with Google" button
- Google login popup appears
- After auth, token stored in `sessionStorage`
- App checks if user is collaborator on current sheet
- If yes: show editor; if no: show "Viewer Only"

### 2. Data Flow: Form UI + Batch Upload

**Decision**: Build form UI with field-by-field editing; upload all changes in one batch.

**Why**:
- Better UX than downloading/editing CSV locally
- Batch upload is safer than row-by-row API calls
- Can validate entire dataset before upload
- Less error-prone than incremental saves
- Users can edit multiple fields, review, then upload

**Data Lifecycle**:
1. Load current CSV from Sheet (via public export URL)
2. Parse into in-memory object: `{ key: { en, es, fr, swa } }`
3. Store in IndexedDB (survives page reload)
4. Editor modifies fields via form UI
5. On "Save": validate CSV, call Sheets API to append/update rows
6. After success: reload data, clear unsaved indicator

### 3. Permission Model: Collaborators Check

**Decision**: Check if authenticated user is a collaborator on the current Sheet.

**Why**:
- Tied to actual Sheet permissions (most secure)
- No manual allow-lists to maintain
- User only edits sheets they have permission for
- Leverages existing Google Sheet sharing

**Flow**:
1. Get sheet ID from current profile's CSV URL
2. After OAuth sign-in, call `spreadsheets.get()` to fetch collaborators
3. Compare user's email to collaborators list
4. Show/hide editor UI accordingly

### 4. UI Pattern: Scrollable Form with Language Pills

**Decision**: Single scrollable list of all keys, with key selector, language buttons, single input field.

**Why**:
- One key at a time prevents overwhelming users
- Language pills (Bootstrap 5) are clear and visual
- Single input field reduces UI complexity
- Scrollable list shows all available fields
- Matches your original spec exactly

**Form Structure**:
```
[Sign in / Logged in as: user@gmail.com] [Sign out]

Key Dropdown: [speaker1 ▼]
Language Pills: [EN] [ES] [FR] [SWA]
Input Field: [textarea with current value]
Add Row ➕ | Save Changes ✓

Unsaved: 3 changes pending
```

### 5. State Persistence: IndexedDB + Session

**Decision**: Keep edited data in IndexedDB during session; clear on sign-out.

**Why**:
- Survives page reload/accidental close
- User can ask "Resume editing?" on reload
- Keeps edits local until upload
- Session-based (not long-term storage)
- Encrypted in browser's secure storage

---

## Technical Architecture

### High-Level Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    editor.html                              │
│         (New page, mirrors index.html structure)             │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    js/editor.js                              │
│  (Orchestrator: loads profiles, checks auth, renders UI)    │
└─────────────────────────────────────────────────────────────┘
                            │
                ┌───────────┼───────────┐
                ▼           ▼           ▼
         ┌──────────┐ ┌──────────┐ ┌──────────┐
         │googleAuth│ │sheetsApi │ │editorState│
         │   .js    │ │Service.js│ │Manager.js │
         └──────────┘ └──────────┘ └──────────┘
                │           │           │
                └───────────┼───────────┘
                            │
                            ▼
         ┌──────────────────────────────────┐
         │  js/components/SheetEditor.mjs   │
         │        (UI Component)            │
         └──────────────────────────────────┘
                            │
                            ▼
         ┌──────────────────────────────────┐
         │      IndexedDB (Dexie)           │
         │   (editor._state store)          │
         └──────────────────────────────────┘
```

### File Organization

```
js/
├── auth/
│   └── googleAuth.js               [NEW] OAuth 2.0 module
├── services/
│   └── sheetsApiService.js         [NEW] Google Sheets API calls
├── data/
│   └── EditorStateManager.js       [NEW] In-memory state + persistence
├── components/
│   └── SheetEditor.mjs             [NEW] Form UI component
├── editor.js                        [NEW] Editor page entry point
└── [existing modules unchanged]

editor.html                          [NEW] Editor page

test/
├── auth/
│   └── googleAuth.test.mjs         [NEW] Auth tests
├── services/
│   └── sheetsApiService.test.mjs   [NEW] API service tests
├── data/
│   └── EditorStateManager.test.mjs [NEW] State manager tests
├── components/
│   └── SheetEditor.test.mjs        [NEW] UI component tests
└── editor.test.mjs                 [NEW] Integration tests

e2e/
├── scenarios/
│   └── editor.spec.js              [NEW] E2E scenarios

docs/
├── FEATURE_CMS_EDIT.md             [THIS FILE]
└── [existing docs unchanged]
```

### Dependencies

**External Libraries** (already in package.json):
- `dexie` v4.3.0 — IndexedDB abstraction (already used)
- Google Identity Services — Added via CDN script tag in editor.html

**No new npm dependencies**

---

## Phase 1: OAuth Module

**Objective**: Implement Google OAuth 2.0 authentication with PKCE flow.

**Duration**: ~8-10 hours  
**Context Required**: Medium (auth patterns, Google API basics)  
**Files Created**: `js/auth/googleAuth.js`, `test/auth/googleAuth.test.mjs`

### Task 1.1: Create googleAuth Module Structure

**File**: `js/auth/googleAuth.js`

Create a module that:
- Exports an object: `GoogleAuth` with methods listed below
- Initializes Google Identity Services (gis) on load
- NO external dependencies except gis library (loaded via CDN in editor.html)

**Methods to implement**:

```javascript
GoogleAuth.initialize(clientId, redirectUri)
GoogleAuth.signIn()                    // Opens Google login popup
GoogleAuth.signOut()                   // Clears token, closes session
GoogleAuth.getAccessToken()            // Returns token from sessionStorage
GoogleAuth.isAuthenticated()           // Returns boolean
GoogleAuth.getUser()                   // Returns { email, name }
GoogleAuth.onTokenExpire(callback)     // Handles token refresh
```

**Session Storage Keys**:
- `gm_access_token` — OAuth access token
- `gm_user_email` — User's email
- `gm_token_expires` — Token expiry timestamp (ms)

**Error Handling**:
- If user cancels login: resolve to `null` (don't throw)
- If token expires: auto-refresh or trigger re-auth
- Log all errors to `[AUTH]` prefix

**Notes**:
- Use `sessionStorage` only (cleared on browser close)
- Never use `localStorage` for tokens
- Implement token expiry check before API calls
- Google sign-out should clear all stored data

### Task 1.2: Handle PKCE Flow (Authorization Code)

**Context**: PKCE (Proof Key for Code Exchange) is how OAuth 2.0 works in browsers without backend.

**Implementation Details**:

1. Generate `code_verifier` (43-128 char random string)
2. Hash it to `code_challenge` (SHA-256)
3. Send user to Google auth endpoint with `code_challenge`
4. User grants permission
5. Google redirects back with authorization `code`
6. Exchange `code` + `code_verifier` for access token
7. Store token in `sessionStorage`

**Library**: Use `google-gsi` (Google Identity Services)
- Already available via CDN: `https://accounts.google.com/gsi/client`
- Handles PKCE automatically
- Simpler to use than raw OAuth

**Code Flow**:
```javascript
// In googleAuth.js
function generatePKCEPair() {
  // Generate random code_verifier
  // SHA-256 hash to code_challenge
  // Return { verifier, challenge }
}

async function exchangeCodeForToken(code, codeVerifier) {
  // POST to Google token endpoint
  // Return access token
}
```

**Testing**:
- Mock `sessionStorage`
- Mock Google gsi library
- Test token generation/storage
- Test error cases (network, user cancel)

### Task 1.3: Implement Token Refresh & Expiry

**Requirement**: Access tokens expire in ~1 hour. Handle gracefully.

**Implementation**:
1. Store token `expires_at` timestamp when token received
2. Before API calls: check if `Date.now() > expires_at`
3. If expired: trigger refresh flow
4. If refresh fails: sign out and require re-auth

**Methods**:
```javascript
GoogleAuth.isTokenExpired()
GoogleAuth.refreshToken()
GoogleAuth.onTokenExpire(callback)  // Register handler
```

**Edge Case**: If user's Google session has ended, refresh will fail. Show "Please sign in again" message.

### Task 1.4: Create Unit Tests for Auth

**File**: `test/auth/googleAuth.test.mjs`

**Test Cases**:

```
✓ signIn() opens Google popup
✓ On successful auth, token stored in sessionStorage
✓ isAuthenticated() returns true after sign-in
✓ isAuthenticated() returns false before sign-in
✓ getAccessToken() returns token string
✓ getUser() returns { email, name }
✓ Token expiry is calculated correctly
✓ signOut() clears sessionStorage
✓ isTokenExpired() returns true for expired token
✓ refreshToken() updates token before expiry
✓ On network error, gracefully handle (don't crash)
✓ On user cancel, resolve to null (not throw)
✓ Multiple sign-in calls don't create duplicate popups
```

**Mocking**:
- Mock global `google` object (from gis library)
- Mock `sessionStorage`
- Mock `fetch` for token endpoint

---

## Phase 2: Google Sheets API Service

**Objective**: Wrapper for Google Sheets API operations (check collaborators, upload data).

**Duration**: ~10-12 hours  
**Context Required**: Medium (Google Sheets API, HTTP requests)  
**Files Created**: `js/services/sheetsApiService.js`, `test/services/sheetsApiService.test.mjs`

### Task 2.1: Create Sheets API Service Structure

**File**: `js/services/sheetsApiService.js`

**Methods to export**:

```javascript
SheetsAPI.initialize(accessToken)              // Set auth token
SheetsAPI.getSpreadsheetMetadata(sheetId)      // Get sheet info + collaborators
SheetsAPI.checkIfCollaborator(sheetId, email)  // Boolean
SheetsAPI.getSheetValues(sheetId, range)       // Fetch cell values
SheetsAPI.appendRows(sheetId, values)          // Add rows to sheet
SheetsAPI.updateRows(sheetId, values)          // Update existing rows
SheetsAPI.uploadCSV(sheetId, csvData)          // Replace entire sheet data
```

**Dependencies**:
- `GoogleAuth` module (to get access token)
- Standard `fetch` API (no external library)

**Base Endpoint**: `https://sheets.googleapis.com/v4/spreadsheets`

**Required OAuth Scope**: `https://www.googleapis.com/auth/spreadsheets`

**Error Handling**:
- Log all HTTP errors with request details
- Return `{ success: false, error: "message" }` for failures
- Throw on authentication errors (token expired, unauthorized)
- Network timeouts: implement 30-second timeout

### Task 2.2: Extract Sheet ID from CSV URL

**Context**: Current profiles store CSV export URLs. Need to extract sheet ID.

**Sheet URL Patterns**:
```
CSV export URL: https://docs.google.com/spreadsheets/d/ABC123XYZ/gviz/tq?tqx=out:csv
Sheet ID:       ABC123XYZ (extract from /d/.../)

Normal sheet URL: https://docs.google.com/spreadsheets/d/ABC123XYZ/edit#gid=0
Sheet ID:        ABC123XYZ (same extraction)
```

**Function**:
```javascript
function extractSheetIdFromUrl(csvUrl) {
  // return sheet ID string, or null if invalid
}
```

**Validation**:
- Ensure URL contains `docs.google.com/spreadsheets/d/`
- Ensure ID is alphanumeric (no special chars)
- Return `null` for invalid URLs

### Task 2.3: Implement `getSpreadsheetMetadata()`

**API Call**: `GET /v4/spreadsheets/{sheetId}`

**Returns**:
```json
{
  "spreadsheetId": "ABC123XYZ",
  "properties": {
    "title": "Sacrament Program",
    "locale": "en_US",
    ...
  }
}
```

**Additional**: Fetch collaborators via Drive API (optional advanced feature; for now, assume we can determine from spreadsheet.properties)

**Note**: Google Sheets API's `spreadsheets.get()` requires the user to have at least Viewer access. Request with `fields=spreadsheetId,properties` to minimize response size.

### Task 2.4: Implement `checkIfCollaborator()`

**Logic**:
1. Call `getSpreadsheetMetadata(sheetId)`
2. Check `spreadsheetProperties` for owner/editors
3. Compare `GoogleAuth.getUser().email` to collaborators list
4. Return `true` if match, `false` otherwise

**Edge Cases**:
- User email might have different case (do case-insensitive compare)
- If metadata doesn't contain collaborators, conservative approach: `return false` (deny access)
- If API call fails: `throw` error (don't silently deny)

**Alternative** (if Google Sheets API doesn't provide collaborators easily):
- Could use Drive API's `permissions` endpoint
- For now, assume metadata provides this info; adjust if not available

### Task 2.5: Implement CSV Upload/Append

**Historical Context**: App currently uses public CSV export URLs (read-only).

**New Requirement**: Upload modified CSV back to Sheet.

**Two Approaches**:

**Option A: Append Rows** (Simpler)
- API: `POST /v4/spreadsheets/{sheetId}/values:append`
- Each edited row sent as new row
- Pro: Simple, no row-by-row tracking
- Con: Duplicates sheet data if not careful

**Option B: Clear & Replace** (Safer)
- API: `POST /v4/spreadsheets/{sheetId}/values:batchUpdate`
- Clear all data, write new CSV
- Pro: Guaranteed consistent state
- Con: All-or-nothing (can't recover if network fails mid-upload)

**Decision**: Use **Option B** (Clear & Replace) with validation

**Implementation**:

```javascript
async function uploadCSV(sheetId, csvData) {
  // 1. Validate csvData format (check headers, etc.)
  // 2. Parse CSV into 2D array (rows + columns)
  // 3. Call Sheets API:
  //    - DELETE all rows from Sheet1
  //    - APPEND new CSV data
  // 4. Return { success, sheetId, rowsWritten }
}
```

**API Call**:
```
POST /v4/spreadsheets/{sheetId}/values/Sheet1:clear
POST /v4/spreadsheets/{sheetId}/values/Sheet1:append
  Body: { values: [ ["key", "en", "es", "fr", "swa"], [...], [...] ] }
```

**Error Recovery**:
- If clear succeeds but append fails: sheet is empty (bad)
- Mitigation: Check sheet before upload, warn user
- Alternative: Use local backup copy for recovery

### Task 2.6: Create Unit Tests for Sheets API Service

**File**: `test/services/sheetsApiService.test.mjs`

**Test Cases**:

```
✓ extractSheetIdFromUrl() extracts ID correctly
✓ extractSheetIdFromUrl() rejects invalid URLs
✓ getSpreadsheetMetadata() makes correct API call
✓ getSpreadsheetMetadata() parses response
✓ checkIfCollaborator() returns true for collaborators
✓ checkIfCollaborator() returns false for non-collaborators
✓ checkIfCollaborator() is case-insensitive for email
✓ uploadCSV() calls clear then append
✓ uploadCSV() throws on validation error
✓ uploadCSV() returns row count
✓ On 401 Unauthorized: throw auth error
✓ On 403 Forbidden: throw permission error
✓ On network timeout: throw with timeout message
✓ On invalid CSV: return validation error
```

**Mocking**:
- Mock `fetch` for all API calls
- Mock `GoogleAuth.getAccessToken()`
- Mock `GoogleAuth.getUser()`

---

## Phase 3: Editor State Manager

**Objective**: In-memory state management for edited CSV data with IndexedDB persistence.

**Duration**: ~10-12 hours  
**Context Required**: Medium (IndexedDB, CSV parsing, state management)  
**Files Created**: `js/data/EditorStateManager.js`, `test/data/EditorStateManager.test.mjs`

### Task 3.1: Create EditorStateManager Structure

**File**: `js/data/EditorStateManager.js`

**Purpose**: Hold edited CSV data in memory, track changes, persist to IndexedDB.

**Internal Data Structure**:

```javascript
// Parsed CSV stored as:
{
  headers: ["key", "en", "es", "fr", "swa"],
  rows: {
    "unitName": {
      en: "Your Ward Name",
      es: "Nombre de Su Rama",
      fr: "Nom de Votre Branche",
      swa: "Jina la Kimanda Yako"
    },
    "speaker1": {
      en: "John Smith",
      es: "", // Empty = fallback to English
      fr: "",
      swa: ""
    },
    // ... more rows
  },
  // Track which fields have unsaved changes
  unsavedChanges: {
    "unitName": { en: true, es: false, fr: false, swa: false },
    "speaker1": { en: false, es: true, fr: false, swa: false },
  },
  // Metadata
  sheetId: "ABC123XYZ",
  createdAt: Date.now(),
  lastModified: Date.now()
}
```

**Class Methods**:

```javascript
class EditorStateManager {
  constructor(sheetId) {
    this.sheetId = sheetId;
    this.state = { /* as above */ };
  }

  async loadFromSheet(csvUrl) {
    // Fetch current CSV from sheet
    // Parse it into state.rows
    // Save to IndexedDB
  }

  getValue(key, language = "en") {
    // Return value for key + language
    // Fallback to English if empty
  }

  setValue(key, language, value) {
    // Update value, mark as changed
    // Don't save to DB yet (only on explicit save)
  }

  addRow(key, values = {}) {
    // Add new key with optional values
    // Mark as new/unsaved
  }

  deleteRow(key) {
    // Mark row for deletion
  }

  getUnsavedCount() {
    // Return number of changed fields
  }

  getChangedRows() {
    // Return only rows with unsaved changes
  }

  async validate() {
    // Check CSV structure, keys, hymn format
    // Return { valid: boolean, errors: [] }
  }

  toCSV() {
    // Generate CSV string ready for upload
    // Includes validation
  }

  async saveChanges(csvData) {
    // Save edited state to IndexedDB for session persistence
  }

  async discardChanges() {
    // Clear unsaved state, reload from sheet
  }

  async clear() {
    // Delete all editor data from IndexedDB
  }

  static async resume(sheetId) {
    // Check if previous session exists
    // Return EditorStateManager instance or null
  }
}
```

### Task 3.2: Implement CSV Parsing & Validation

**Requirement**: Parse Google Sheet CSV into structured data.

**CSV Format**:
```
key,en,es,fr,swa
unitName,Your Ward,Su Rama,Votre Branche,Kimanda Yako
speaker1,John Smith,Juan Garcia,Jean Dupont,Yohana Mto
openingHymn,62
CS 2,Accompaniment by Sister Smith
```

**Parsing Logic**:
1. Use existing `parseCSV()` from `js/utils/csv.js` as reference
2. Detect CSV format: simple (key, value) vs. multi-lang (key, en, es, fr, swa)
3. Extract headers row
4. Parse data rows into dictionary structure
5. Normalize language values (trim whitespace, handle quotes)

**Validation Rules** (Task 3.3):
1. **Required headers**: Must have "key" column
2. **Language columns**: "en", "es", "fr", "swa" (if multi-lang format)
3. **No duplicate keys**: Each key appears only once
4. **Hymn format**: If key ends with "Hymn":
   - Value must be number (e.g., `62`, `1001`)
   - OR `CS` + space + number + optional letter (e.g., `CS 2`, `CS 73a`)
5. **Required fields**: "key" must be non-empty, "en" must be non-empty (unless fallback)
6. **No XSS payload**: Sanitize values (reuse `sanitizeEntry()` from `js/sanitize.js`)

**Error Messages**:
```javascript
{
  errors: [
    { row: 2, column: "opening Hymn", message: "Invalid hymn format: must be number or CS{space}number" },
    { row: 5, column: "key", message: "Duplicate key: 'speaker1' already defined at row 3" },
    { row: "header", column: "es", message: "Missing required language column" }
  ]
}
```

### Task 3.3: Implement Hymn Format Validation

**Context**: Hymn fields can have special format:
- Regular: `62` (hymn number)
- Children's: `CS 2` (with space, can have letter like `CS 73a`)
- With note: `62|Sung by Primary` (pipe-separated annotation)

**Validation Function**:

```javascript
function validateHymnValue(value) {
  if (!value) return { valid: false, error: "Hymn value cannot be empty" };
  
  // Split on pipe to get hymn part
  const [hymnPart] = value.split("|");
  const hymn = hymnPart.trim();
  
  // Pattern: number OR "CS {number}{optional letter}"
  const hymnRegex = /^(\d{1,4}|CS [0-9]{1,4}[a-z]?)$/i;
  
  if (!hymnRegex.test(hymn)) {
    return {
      valid: false,
      error: `Invalid hymn: ${hymn}. Use format: "62" or "CS 2" or "CS 73a", optionally with "|Note"`
    };
  }
  
  return { valid: true };
}
```

**Hymn Lookup** (Optional Enhancement):
- Reference `js/data/hymnsLookup.js` to validate hymn numbers exist
- For now: just validate format (not whether hymn exists)
- Can add lookup validation in Phase 4

### Task 3.4: Implement IndexedDB Persistence

**Context**: Store editor state so user can reload page and resume editing.

**IndexedDB Store**: `editor._state`

**Schema**:
```javascript
// In js/data/db.js (existing Dexie setup)
// Add new store:
editor_state: "sheetId, createdAt" // Compound key
```

**Stored Data**:
```javascript
{
  id: "auto-generated",
  sheetId: "ABC123XYZ",
  createdAt: Date.now(),
  lastModified: Date.now(),
  expiresAt: createdAt + (24 * 60 * 60 * 1000), // 24h session
  state: { /* EditorStateManager.state */ },
  csvUrl: "https://docs.google.com/..."
}
```

**Methods**:

```javascript
async function saveSessionState(sheetId, state, csvUrl) {
  // Store to IndexedDB
  // Return saved object with ID
}

async function getSessionState(sheetId) {
  // Fetch from IndexedDB
  // Check if expired (24h)
  // Return state or null
}

async function deleteSessionState(sheetId) {
  // Remove from IndexedDB
}

async function resumeSession(sheetId) {
  // Check if session exists
  // Ask user: "Resume editing? X changes pending"
  // Return EditorStateManager with restored state or null
}
```

**Expiry Policy**: Sessions expire after 24 hours (paranoid safety).

### Task 3.5: Implement toCSV() & String Generation

**Requirement**: Convert in-memory state back to CSV string format suitable for upload.

**Function**:

```javascript
toCSV() {
  // 1. Build header: "key,en,es,fr,swa"
  // 2. For each row, quote fields with commas/newlines
  // 3. Handle fallback: if language cell empty, use English value
  // 4. Return as string ready for Sheets API
}

// Example output:
// key,en,es,fr,swa
// unitName,Your Ward,Su Rama,Votre Branche,Kimanda Yako
// speaker1,"Smith, John","García, Juan","Dupont, Jean","Mtu, Yohana"
// openingHymn,62
//
```

**CSV Quoting Rules**:
- Quote fields containing: comma, newline, quotes
- Escape quotes: `"` → `""`
- Leave other fields unquoted

**Reference**: Use logic from `js/utils/csv.js` as template.

### Task 3.6: Create Unit Tests

**File**: `test/data/EditorStateManager.test.mjs`

**Test Cases**:

```
✓ loadFromSheet() fetches and parses CSV correctly
✓ loadFromSheet() handles multi-language format
✓ loadFromSheet() handles simple key-value format
✓ getValue() returns correct value
✓ getValue() falls back to English if language empty
✓ setValue() updates value and marks unsaved
✓ addRow() adds new key with empty values
✓ deleteRow() marks row for deletion
✓ getUnsavedCount() returns correct count
✓ getChangedRows() returns only unsaved rows
✓ validate() rejects duplicate keys
✓ validate() rejects invalid hymn format
✓ validate() rejects duplicate hymn with "CS" prefix
✓ validate() catches empty key
✓ toCSV() generates valid CSV string
✓ toCSV() quotes fields with commas
✓ toCSV() includes all languages
✓ saveChanges() stores to IndexedDB
✓ resumeSession() restores previous state
✓ discardChanges() clears unsaved state
✓ Session expires after 24 hours
```

**Mocking**:
- Mock `fetch` for CSV download
- Mock IndexedDB via `fake-indexeddb`
- Mock `sanitizeEntry()`

---

## Phase 4: Editor UI Component

**Objective**: React-like component for editor form (scrollable list, key selector, language pills, input field).

**Duration**: ~12-14 hours  
**Context Required**: Medium-High (DOM manipulation, event handling, Bootstrap 5)  
**Files Created**: `js/components/SheetEditor.mjs`, `test/components/SheetEditor.test.mjs`

### Task 4.1: Design UI Structure & Components

**HTML Structure** (will be rendered by JavaScript):

```html
<div id="editor-main">
  <!-- Authentication Section -->
  <div id="auth-section">
    <button id="signin-btn" class="btn btn-primary">Sign in with Google</button>
  </div>

  <!-- Editor Section (hidden until auth) -->
  <div id="editor-section" style="display: none;">
    <!-- User Info -->
    <div class="editor-header">
      <span class="user-email">Logged in as: user@gmail.com</span>
      <button id="signout-btn" class="btn btn-sm btn-secondary">Sign out</button>
    </div>

    <!-- Key Selector & Language -->
    <div class="editor-controls">
      <div class="form-group">
        <label for="key-select">Key:</label>
        <select id="key-select" class="form-control">
          <option value="">-- Select a key --</option>
          <option value="unitName">unitName</option>
          <option value="speaker1">speaker1</option>
          <!-- ... all keys ... -->
        </select>
      </div>

      <!-- Language Pills (Bootstrap 5 buttons) -->
      <div class="language-buttons mt-3">
        <label>Language:</label>
        <div class="btn-group" role="group">
          <input type="radio" class="btn-check" name="language" id="lang-en" value="en" checked>
          <label class="btn btn-outline-primary" for="lang-en">English</label>
          
          <input type="radio" class="btn-check" name="language" id="lang-es" value="es">
          <label class="btn btn-outline-primary" for="lang-es">Español</label>
          
          <input type="radio" class="btn-check" name="language" id="lang-fr" value="fr">
          <label class="btn btn-outline-primary" for="lang-fr">Français</label>
          
          <input type="radio" class="btn-check" name="language" id="lang-swa" value="swa">
          <label class="btn btn-outline-primary" for="lang-swa">Kiswahili</label>
        </div>
      </div>
    </div>

    <!-- Value Input -->
    <div class="form-group mt-4">
      <label for="value-input">Value:</label>
      <textarea id="value-input" class="form-control" rows="4" placeholder="Enter value..."></textarea>
      
      <!-- Hymn Checkbox (shown for *Hymn keys) -->
      <div id="hymn-options" class="mt-2" style="display: none;">
        <div class="form-check">
          <input type="checkbox" class="form-check-input" id="hymn-children" value="children">
          <label class="form-check-label" for="hymn-children">
            Children's Song (prepends "CS ")
          </label>
        </div>
      </div>
    </div>

    <!-- Unsaved Indicator -->
    <div id="unsaved-indicator" class="alert alert-warning mt-3" style="display: none;">
      <strong>⚠ Unsaved Changes:</strong> <span id="unsaved-count">0</span> fields modified
    </div>

    <!-- Action Buttons -->
    <div class="editor-actions mt-4">
      <button id="add-row-btn" class="btn btn-success">➕ Add New Field</button>
      <button id="save-btn" class="btn btn-primary">✓ Save Changes</button>
      <button id="discard-btn" class="btn btn-secondary">Clear Changes</button>
    </div>
  </div>

  <!-- Viewer-Only Section -->
  <div id="viewer-only-section" style="display: none;">
    <div class="alert alert-info">
      <h4>Viewer</h4>
      <p>You don't have permission to edit this sheet. Only collaborators can edit.</p>
    </div>
  </div>
</div>
```

### Task 4.2: Create SheetEditor Component Class

**File**: `js/components/SheetEditor.mjs`

**Class Structure**:

```javascript
export class SheetEditor {
  constructor(containerSelector, editorStateManager, options = {}) {
    this.container = document.querySelector(containerSelector);
    this.stateManager = editorStateManager;
    this.currentKey = null;
    this.currentLanguage = "en";
    this.isEditing = false;
    
    this.options = {
      onSave: null,    // Callback when Save clicked
      onAddRow: null,  // Callback when Add Row clicked
      ...options
    };
    
    this.eventHandlers = {};
  }

  async render() {
    // Build HTML structure above
    // Attach event listeners
    // Load keys into dropdown
  }

  on(eventName, callback) {
    // event.addListener pattern
    // Supported events: 'value-changed', 'key-selected', 'language-changed', 'save', 'add-row'
  }

  setValue(key, language, value) {
    // Update input field to show value
    // Update unsaved indicator
  }

  setKey(key) {
    // Change which key is being edited
    // Update select dropdown
    // Load value for new key
    // Show/hide hymn checkbox
  }

  setLanguage(language) {
    // Change selected language
    // Load value for new language
  }

  updateKeyList(keys) {
    // Refresh dropdown with new keys (after adding row)
  }

  showUnsavedIndicator(count) {
    // Show/hide and update count
  }

  setLoading(isLoading) {
    // Disable buttons while saving
    // Show spinner
  }

  showError(message) {
    // Toast/alert with error message
  }

  showSuccess(message) {
    // Toast/alert with success message
  }

  destroy() {
    // Clean up event listeners
  }
}
```

### Task 4.3: Implement Event Handlers & DOM Updates

**Event Handlers to Attach**:

1. **Key Selection** (`#key-select` change)
   - Emit `key-selected` event with new key
   - Load value from EditorStateManager
   - Show/hide hymn options
   - Update language pills

2. **Language Selection** (radio buttons)
   - Emit `language-changed` event
   - Load value for selected language from EditorStateManager
   - Update input field

3. **Value Input Change** (`#value-input` input)
   - Emit `value-changed` { key, language, value } event
   - Update EditorStateManager
   - Mark as unsaved
   - Show unsaved indicator

4. **Hymn Children's Checkbox** (`#hymn-children` change)
   - If checked: prepend "CS " to value
   - If unchecked: remove "CS " prefix
   - Emit `value-changed` event

5. **Add Row Button** (`#add-row-btn` click)
   - Emit `add-row` event
   - Prompt user for new key name
   - Validate key doesn't exist
   - Add to EditorStateManager
   - Refresh key dropdown
   - Select new key

6. **Save Button** (`#save-btn` click)
   - Emit `save` event with all changes
   - Disable buttons, show loading
   - Wait for parent to validate & upload
   - On success: clear unsaved indicator

7. **Discard Button** (`#discard-btn` click)
   - Ask for confirmation
   - Clear all unsaved changes
   - Reload values from EditorStateManager
   - Hide unsaved indicator

### Task 4.4: Implement Hymn Field Logic

**Hymn Detection**: If key ends with "Hymn" (case-insensitive):
- Show checkbox: "Children's Song (prepends 'CS ')"
- When checkbox checked: ensure value starts with "CS "
- When checkbox unchecked: remove "CS " prefix

**Examples**:
- User enters "2" + checks "Children's Song" → value becomes "CS 2"
- User enters "CS 2" + unchecks box → value becomes "2"
- User enters "CS 73a" + can check/uncheck
- If user manually types "CS 2": checkbox auto-checks

**Special Case**: Hymn value might include note (pipe-separated):
- "62|Sung by choir" → can edit "62" part, keep "|Sung by choir"
- Children's logic applies to hymn number part only

### Task 4.5: Implement Unsaved Indicator

**Requirements**:
- Show alert box when any field modified
- Display count of unsaved fields
- Update in real-time
- Update on Add Row
- Clear on Save or Discard

**HTML**:
```html
<div id="unsaved-indicator" class="alert alert-warning" style="display: none;">
  <strong>⚠ Unsaved Changes:</strong> <span id="unsaved-count">0</span> fields modified
</div>
```

**Logic**:
1. EditorStateManager tracks unsavedChanges
2. SheetEditor calls `stateManager.getUnsavedCount()`
3. Update DOM to show/hide indicator
4. Listen for `value-changed` events to update count

### Task 4.6: Style with Bootstrap 5

**CSS Considerations**:
- Use Bootstrap 5 CDN in `editor.html`
- Language pills: use Bootstrap btn-group + btn-check pattern
- Form layout: use form-control, form-group classes
- Validation messages: use alert classes
- Loading state: disable buttons, show spinner

**Custom CSS** (minimal):
```css
#editor-main {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid #ccc;
}

.language-buttons .btn-group {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

#value-input {
  min-height: 100px;
}

.editor-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
```

### Task 4.7: Create Unit Tests

**File**: `test/components/SheetEditor.test.mjs`

**Test Approach**: Test DOM updates and event emissions (mock DOM elements)

**Test Cases**:

```
✓ render() creates HTML structure
✓ render() populates key dropdown
✓ Key selection updates shown value
✓ Language selection changes input field
✓ Value input emits 'value-changed' event
✓ Unsaved indicator shows on value change
✓ Unsaved count increases/decreases
✓ Add Row button opens dialog for key name
✓ Add Row validates key doesn't exist
✓ Hymn-related keys show children's checkbox
✓ Hymn checkbox checked: prepends "CS "
✓ Hymn checkbox unchecked: removes "CS "
✓ Save button emits 'save' event
✓ Save button disables during save
✓ Discard button asks for confirmation
✓ Discard button clears unsaved state
✓ Error message displays toast
✓ Success message displays toast
✓ destroy() cleans up event listeners
✓ Multiple language changes tracked
✓ Pipe-separated notes preserved in hymn values
```

**Mocking**:
- Mock DOM elements using jsdom
- Mock EditorStateManager methods
- Mock window.alert/confirm
- Test event emissions via custom event listeners

---

## Phase 5: Editor Page & Navigation

**Objective**: Create `editor.html` page and integrate OAuth + Editor UI. Add navigation from main app.

**Duration**: ~10-12 hours  
**Context Required**: Medium (HTML structure, OAuth flow, navigation)  
**Files Created**: `editor.html`, `js/editor.js`, `test/editor.test.mjs`

### Task 5.1: Create editor.html Page

**File**: `editor.html`

**Structure**: Mirror `index.html` but with editor-specific content

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description
```


## License: unknown
https://github.com/wayou/wayou.github.io/blob/5d2190ff8b5d0b67b64f70ccbb23eab30b8d56b2/_posts/2019-06-03-JavaScript%20%E5%AE%9E%E7%8E%B0%E9%A1%B5%E9%9D%A2%E4%B8%AD%E5%BD%95%E9%9F%B3%E5%8A%9F%E8%83%BD.md

```
I'll provide you with the comprehensive plan as a detailed document that you can save. Since I don't have file writing tools available, I'll present the complete plan in a code block that you can save directly to `./docs/FEATURE_CMS_EDIT.md`:

```markdown
# Feature Plan: CMS Sheet Editor (Google Sheets OAuth + Form UI)

**Version**: 1.0  
**Last Updated**: March 10, 2026  
**Status**: Ready for Implementation  
**Estimated Duration**: 6 phases, ~100-120 hours total (can parallelize some tasks)

---

## 📋 Table of Contents

1. [Overview & Architecture](#overview--architecture)
2. [Design Decisions](#design-decisions)
3. [Technical Architecture](#technical-architecture)
4. [Phase 1: OAuth Module](#phase-1-oauth-module)
5. [Phase 2: Google Sheets API Service](#phase-2-google-sheets-api-service)
6. [Phase 3: Editor State Manager](#phase-3-editor-state-manager)
7. [Phase 4: Editor UI Component](#phase-4-editor-ui-component)
8. [Phase 5: Editor Page & Navigation](#phase-5-editor-page--navigation)
9. [Phase 6: Tests & Deployment](#phase-6-tests--deployment)
10. [Data Structures & Interfaces](#data-structures--interfaces)
11. [Testing Specifications](#testing-specifications)
12. [Integration Checklist](#integration-checklist)
13. [Risk Mitigation](#risk-mitigation)

---

## Overview & Architecture

### What We're Building

A **Google Sheets CMS interface** that allows authorized editors to modify meeting program data directly in the app. Features:

- **Google OAuth 2.0 authentication** (PKCE flow, client-side only)
- **Collaborator verification** against the currently-loaded Google Sheet
- **Form-based UI** with scrollable key/value pairs, language selectors, validation
- **Local state management** with IndexedDB persistence for in-progress edits
- **Batch CSV upload** back to Google Sheets (not row-by-row)
- **Graceful "Viewer Only" fallback** for non-editors
- **No backend required** (GitHub Pages compatible)

### Why This Approach?

| Requirement | Solution | Why Not Others |
|---|---|---|
| **Free hosting** | GitHub Pages (static) | Avoiding backend costs ✅ |
| **No tech accounts** | Google OAuth (user's own account) | Users already have Google accounts |
| **Edit protection** | OAuth + Collaborators check | Verified against actual Sheet permissions |
| **Offline-ready** | IndexedDB state storage | Can edit offline, upload when online |
| **Easy CSV export** | CSV validation + upload | Reversible, debuggable, portable |
| **Non-tech friendly** | Form UI with pills/dropdowns | Visual, clear, no CSV syntax needed |

---

## Design Decisions

### 1. Authentication: Google OAuth 2.0 with PKCE

**Decision**: Use Google Identity Services (gis) library for browser-based OAuth authentication.

**Why**:
- No backend needed (PKCE flow works entirely client-side)
- Users sign in with account they already have
- Provides access token to call Google Sheets API
- Can verify user is a Sheet collaborator
- Token stored in `sessionStorage` (cleared on browser close) for security

**Implementation**:
- User navigates to `/editor.html`
- Click "Sign in with Google" button
- Google login popup appears
- After auth, token stored in `sessionStorage`
- App checks if user is collaborator on current sheet
- If yes: show editor; if no: show "Viewer Only"

### 2. Data Flow: Form UI + Batch Upload

**Decision**: Build form UI with field-by-field editing; upload all changes in one batch.

**Why**:
- Better UX than downloading/editing CSV locally
- Batch upload is safer than row-by-row API calls
- Can validate entire dataset before upload
- Less error-prone than incremental saves
- Users can edit multiple fields, review, then upload

**Data Lifecycle**:
1. Load current CSV from Sheet (via public export URL)
2. Parse into in-memory object: `{ key: { en, es, fr, swa } }`
3. Store in IndexedDB (survives page reload)
4. Editor modifies fields via form UI
5. On "Save": validate CSV, call Sheets API to append/update rows
6. After success: reload data, clear unsaved indicator

### 3. Permission Model: Collaborators Check

**Decision**: Check if authenticated user is a collaborator on the current Sheet.

**Why**:
- Tied to actual Sheet permissions (most secure)
- No manual allow-lists to maintain
- User only edits sheets they have permission for
- Leverages existing Google Sheet sharing

**Flow**:
1. Get sheet ID from current profile's CSV URL
2. After OAuth sign-in, call `spreadsheets.get()` to fetch collaborators
3. Compare user's email to collaborators list
4. Show/hide editor UI accordingly

### 4. UI Pattern: Scrollable Form with Language Pills

**Decision**: Single scrollable list of all keys, with key selector, language buttons, single input field.

**Why**:
- One key at a time prevents overwhelming users
- Language pills (Bootstrap 5) are clear and visual
- Single input field reduces UI complexity
- Scrollable list shows all available fields
- Matches your original spec exactly

**Form Structure**:
```
[Sign in / Logged in as: user@gmail.com] [Sign out]

Key Dropdown: [speaker1 ▼]
Language Pills: [EN] [ES] [FR] [SWA]
Input Field: [textarea with current value]
Add Row ➕ | Save Changes ✓

Unsaved: 3 changes pending
```

### 5. State Persistence: IndexedDB + Session

**Decision**: Keep edited data in IndexedDB during session; clear on sign-out.

**Why**:
- Survives page reload/accidental close
- User can ask "Resume editing?" on reload
- Keeps edits local until upload
- Session-based (not long-term storage)
- Encrypted in browser's secure storage

---

## Technical Architecture

### High-Level Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    editor.html                              │
│         (New page, mirrors index.html structure)             │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    js/editor.js                              │
│  (Orchestrator: loads profiles, checks auth, renders UI)    │
└─────────────────────────────────────────────────────────────┘
                            │
                ┌───────────┼───────────┐
                ▼           ▼           ▼
         ┌──────────┐ ┌──────────┐ ┌──────────┐
         │googleAuth│ │sheetsApi │ │editorState│
         │   .js    │ │Service.js│ │Manager.js │
         └──────────┘ └──────────┘ └──────────┘
                │           │           │
                └───────────┼───────────┘
                            │
                            ▼
         ┌──────────────────────────────────┐
         │  js/components/SheetEditor.mjs   │
         │        (UI Component)            │
         └──────────────────────────────────┘
                            │
                            ▼
         ┌──────────────────────────────────┐
         │      IndexedDB (Dexie)           │
         │   (editor._state store)          │
         └──────────────────────────────────┘
```

### File Organization

```
js/
├── auth/
│   └── googleAuth.js               [NEW] OAuth 2.0 module
├── services/
│   └── sheetsApiService.js         [NEW] Google Sheets API calls
├── data/
│   └── EditorStateManager.js       [NEW] In-memory state + persistence
├── components/
│   └── SheetEditor.mjs             [NEW] Form UI component
├── editor.js                        [NEW] Editor page entry point
└── [existing modules unchanged]

editor.html                          [NEW] Editor page

test/
├── auth/
│   └── googleAuth.test.mjs         [NEW] Auth tests
├── services/
│   └── sheetsApiService.test.mjs   [NEW] API service tests
├── data/
│   └── EditorStateManager.test.mjs [NEW] State manager tests
├── components/
│   └── SheetEditor.test.mjs        [NEW] UI component tests
└── editor.test.mjs                 [NEW] Integration tests

e2e/
├── scenarios/
│   └── editor.spec.js              [NEW] E2E scenarios

docs/
├── FEATURE_CMS_EDIT.md             [THIS FILE]
└── [existing docs unchanged]
```

### Dependencies

**External Libraries** (already in package.json):
- `dexie` v4.3.0 — IndexedDB abstraction (already used)
- Google Identity Services — Added via CDN script tag in editor.html

**No new npm dependencies**

---

## Phase 1: OAuth Module

**Objective**: Implement Google OAuth 2.0 authentication with PKCE flow.

**Duration**: ~8-10 hours  
**Context Required**: Medium (auth patterns, Google API basics)  
**Files Created**: `js/auth/googleAuth.js`, `test/auth/googleAuth.test.mjs`

### Task 1.1: Create googleAuth Module Structure

**File**: `js/auth/googleAuth.js`

Create a module that:
- Exports an object: `GoogleAuth` with methods listed below
- Initializes Google Identity Services (gis) on load
- NO external dependencies except gis library (loaded via CDN in editor.html)

**Methods to implement**:

```javascript
GoogleAuth.initialize(clientId, redirectUri)
GoogleAuth.signIn()                    // Opens Google login popup
GoogleAuth.signOut()                   // Clears token, closes session
GoogleAuth.getAccessToken()            // Returns token from sessionStorage
GoogleAuth.isAuthenticated()           // Returns boolean
GoogleAuth.getUser()                   // Returns { email, name }
GoogleAuth.onTokenExpire(callback)     // Handles token refresh
```

**Session Storage Keys**:
- `gm_access_token` — OAuth access token
- `gm_user_email` — User's email
- `gm_token_expires` — Token expiry timestamp (ms)

**Error Handling**:
- If user cancels login: resolve to `null` (don't throw)
- If token expires: auto-refresh or trigger re-auth
- Log all errors to `[AUTH]` prefix

**Notes**:
- Use `sessionStorage` only (cleared on browser close)
- Never use `localStorage` for tokens
- Implement token expiry check before API calls
- Google sign-out should clear all stored data

### Task 1.2: Handle PKCE Flow (Authorization Code)

**Context**: PKCE (Proof Key for Code Exchange) is how OAuth 2.0 works in browsers without backend.

**Implementation Details**:

1. Generate `code_verifier` (43-128 char random string)
2. Hash it to `code_challenge` (SHA-256)
3. Send user to Google auth endpoint with `code_challenge`
4. User grants permission
5. Google redirects back with authorization `code`
6. Exchange `code` + `code_verifier` for access token
7. Store token in `sessionStorage`

**Library**: Use `google-gsi` (Google Identity Services)
- Already available via CDN: `https://accounts.google.com/gsi/client`
- Handles PKCE automatically
- Simpler to use than raw OAuth

**Code Flow**:
```javascript
// In googleAuth.js
function generatePKCEPair() {
  // Generate random code_verifier
  // SHA-256 hash to code_challenge
  // Return { verifier, challenge }
}

async function exchangeCodeForToken(code, codeVerifier) {
  // POST to Google token endpoint
  // Return access token
}
```

**Testing**:
- Mock `sessionStorage`
- Mock Google gsi library
- Test token generation/storage
- Test error cases (network, user cancel)

### Task 1.3: Implement Token Refresh & Expiry

**Requirement**: Access tokens expire in ~1 hour. Handle gracefully.

**Implementation**:
1. Store token `expires_at` timestamp when token received
2. Before API calls: check if `Date.now() > expires_at`
3. If expired: trigger refresh flow
4. If refresh fails: sign out and require re-auth

**Methods**:
```javascript
GoogleAuth.isTokenExpired()
GoogleAuth.refreshToken()
GoogleAuth.onTokenExpire(callback)  // Register handler
```

**Edge Case**: If user's Google session has ended, refresh will fail. Show "Please sign in again" message.

### Task 1.4: Create Unit Tests for Auth

**File**: `test/auth/googleAuth.test.mjs`

**Test Cases**:

```
✓ signIn() opens Google popup
✓ On successful auth, token stored in sessionStorage
✓ isAuthenticated() returns true after sign-in
✓ isAuthenticated() returns false before sign-in
✓ getAccessToken() returns token string
✓ getUser() returns { email, name }
✓ Token expiry is calculated correctly
✓ signOut() clears sessionStorage
✓ isTokenExpired() returns true for expired token
✓ refreshToken() updates token before expiry
✓ On network error, gracefully handle (don't crash)
✓ On user cancel, resolve to null (not throw)
✓ Multiple sign-in calls don't create duplicate popups
```

**Mocking**:
- Mock global `google` object (from gis library)
- Mock `sessionStorage`
- Mock `fetch` for token endpoint

---

## Phase 2: Google Sheets API Service

**Objective**: Wrapper for Google Sheets API operations (check collaborators, upload data).

**Duration**: ~10-12 hours  
**Context Required**: Medium (Google Sheets API, HTTP requests)  
**Files Created**: `js/services/sheetsApiService.js`, `test/services/sheetsApiService.test.mjs`

### Task 2.1: Create Sheets API Service Structure

**File**: `js/services/sheetsApiService.js`

**Methods to export**:

```javascript
SheetsAPI.initialize(accessToken)              // Set auth token
SheetsAPI.getSpreadsheetMetadata(sheetId)      // Get sheet info + collaborators
SheetsAPI.checkIfCollaborator(sheetId, email)  // Boolean
SheetsAPI.getSheetValues(sheetId, range)       // Fetch cell values
SheetsAPI.appendRows(sheetId, values)          // Add rows to sheet
SheetsAPI.updateRows(sheetId, values)          // Update existing rows
SheetsAPI.uploadCSV(sheetId, csvData)          // Replace entire sheet data
```

**Dependencies**:
- `GoogleAuth` module (to get access token)
- Standard `fetch` API (no external library)

**Base Endpoint**: `https://sheets.googleapis.com/v4/spreadsheets`

**Required OAuth Scope**: `https://www.googleapis.com/auth/spreadsheets`

**Error Handling**:
- Log all HTTP errors with request details
- Return `{ success: false, error: "message" }` for failures
- Throw on authentication errors (token expired, unauthorized)
- Network timeouts: implement 30-second timeout

### Task 2.2: Extract Sheet ID from CSV URL

**Context**: Current profiles store CSV export URLs. Need to extract sheet ID.

**Sheet URL Patterns**:
```
CSV export URL: https://docs.google.com/spreadsheets/d/ABC123XYZ/gviz/tq?tqx=out:csv
Sheet ID:       ABC123XYZ (extract from /d/.../)

Normal sheet URL: https://docs.google.com/spreadsheets/d/ABC123XYZ/edit#gid=0
Sheet ID:        ABC123XYZ (same extraction)
```

**Function**:
```javascript
function extractSheetIdFromUrl(csvUrl) {
  // return sheet ID string, or null if invalid
}
```

**Validation**:
- Ensure URL contains `docs.google.com/spreadsheets/d/`
- Ensure ID is alphanumeric (no special chars)
- Return `null` for invalid URLs

### Task 2.3: Implement `getSpreadsheetMetadata()`

**API Call**: `GET /v4/spreadsheets/{sheetId}`

**Returns**:
```json
{
  "spreadsheetId": "ABC123XYZ",
  "properties": {
    "title": "Sacrament Program",
    "locale": "en_US",
    ...
  }
}
```

**Additional**: Fetch collaborators via Drive API (optional advanced feature; for now, assume we can determine from spreadsheet.properties)

**Note**: Google Sheets API's `spreadsheets.get()` requires the user to have at least Viewer access. Request with `fields=spreadsheetId,properties` to minimize response size.

### Task 2.4: Implement `checkIfCollaborator()`

**Logic**:
1. Call `getSpreadsheetMetadata(sheetId)`
2. Check `spreadsheetProperties` for owner/editors
3. Compare `GoogleAuth.getUser().email` to collaborators list
4. Return `true` if match, `false` otherwise

**Edge Cases**:
- User email might have different case (do case-insensitive compare)
- If metadata doesn't contain collaborators, conservative approach: `return false` (deny access)
- If API call fails: `throw` error (don't silently deny)

**Alternative** (if Google Sheets API doesn't provide collaborators easily):
- Could use Drive API's `permissions` endpoint
- For now, assume metadata provides this info; adjust if not available

### Task 2.5: Implement CSV Upload/Append

**Historical Context**: App currently uses public CSV export URLs (read-only).

**New Requirement**: Upload modified CSV back to Sheet.

**Two Approaches**:

**Option A: Append Rows** (Simpler)
- API: `POST /v4/spreadsheets/{sheetId}/values:append`
- Each edited row sent as new row
- Pro: Simple, no row-by-row tracking
- Con: Duplicates sheet data if not careful

**Option B: Clear & Replace** (Safer)
- API: `POST /v4/spreadsheets/{sheetId}/values:batchUpdate`
- Clear all data, write new CSV
- Pro: Guaranteed consistent state
- Con: All-or-nothing (can't recover if network fails mid-upload)

**Decision**: Use **Option B** (Clear & Replace) with validation

**Implementation**:

```javascript
async function uploadCSV(sheetId, csvData) {
  // 1. Validate csvData format (check headers, etc.)
  // 2. Parse CSV into 2D array (rows + columns)
  // 3. Call Sheets API:
  //    - DELETE all rows from Sheet1
  //    - APPEND new CSV data
  // 4. Return { success, sheetId, rowsWritten }
}
```

**API Call**:
```
POST /v4/spreadsheets/{sheetId}/values/Sheet1:clear
POST /v4/spreadsheets/{sheetId}/values/Sheet1:append
  Body: { values: [ ["key", "en", "es", "fr", "swa"], [...], [...] ] }
```

**Error Recovery**:
- If clear succeeds but append fails: sheet is empty (bad)
- Mitigation: Check sheet before upload, warn user
- Alternative: Use local backup copy for recovery

### Task 2.6: Create Unit Tests for Sheets API Service

**File**: `test/services/sheetsApiService.test.mjs`

**Test Cases**:

```
✓ extractSheetIdFromUrl() extracts ID correctly
✓ extractSheetIdFromUrl() rejects invalid URLs
✓ getSpreadsheetMetadata() makes correct API call
✓ getSpreadsheetMetadata() parses response
✓ checkIfCollaborator() returns true for collaborators
✓ checkIfCollaborator() returns false for non-collaborators
✓ checkIfCollaborator() is case-insensitive for email
✓ uploadCSV() calls clear then append
✓ uploadCSV() throws on validation error
✓ uploadCSV() returns row count
✓ On 401 Unauthorized: throw auth error
✓ On 403 Forbidden: throw permission error
✓ On network timeout: throw with timeout message
✓ On invalid CSV: return validation error
```

**Mocking**:
- Mock `fetch` for all API calls
- Mock `GoogleAuth.getAccessToken()`
- Mock `GoogleAuth.getUser()`

---

## Phase 3: Editor State Manager

**Objective**: In-memory state management for edited CSV data with IndexedDB persistence.

**Duration**: ~10-12 hours  
**Context Required**: Medium (IndexedDB, CSV parsing, state management)  
**Files Created**: `js/data/EditorStateManager.js`, `test/data/EditorStateManager.test.mjs`

### Task 3.1: Create EditorStateManager Structure

**File**: `js/data/EditorStateManager.js`

**Purpose**: Hold edited CSV data in memory, track changes, persist to IndexedDB.

**Internal Data Structure**:

```javascript
// Parsed CSV stored as:
{
  headers: ["key", "en", "es", "fr", "swa"],
  rows: {
    "unitName": {
      en: "Your Ward Name",
      es: "Nombre de Su Rama",
      fr: "Nom de Votre Branche",
      swa: "Jina la Kimanda Yako"
    },
    "speaker1": {
      en: "John Smith",
      es: "", // Empty = fallback to English
      fr: "",
      swa: ""
    },
    // ... more rows
  },
  // Track which fields have unsaved changes
  unsavedChanges: {
    "unitName": { en: true, es: false, fr: false, swa: false },
    "speaker1": { en: false, es: true, fr: false, swa: false },
  },
  // Metadata
  sheetId: "ABC123XYZ",
  createdAt: Date.now(),
  lastModified: Date.now()
}
```

**Class Methods**:

```javascript
class EditorStateManager {
  constructor(sheetId) {
    this.sheetId = sheetId;
    this.state = { /* as above */ };
  }

  async loadFromSheet(csvUrl) {
    // Fetch current CSV from sheet
    // Parse it into state.rows
    // Save to IndexedDB
  }

  getValue(key, language = "en") {
    // Return value for key + language
    // Fallback to English if empty
  }

  setValue(key, language, value) {
    // Update value, mark as changed
    // Don't save to DB yet (only on explicit save)
  }

  addRow(key, values = {}) {
    // Add new key with optional values
    // Mark as new/unsaved
  }

  deleteRow(key) {
    // Mark row for deletion
  }

  getUnsavedCount() {
    // Return number of changed fields
  }

  getChangedRows() {
    // Return only rows with unsaved changes
  }

  async validate() {
    // Check CSV structure, keys, hymn format
    // Return { valid: boolean, errors: [] }
  }

  toCSV() {
    // Generate CSV string ready for upload
    // Includes validation
  }

  async saveChanges(csvData) {
    // Save edited state to IndexedDB for session persistence
  }

  async discardChanges() {
    // Clear unsaved state, reload from sheet
  }

  async clear() {
    // Delete all editor data from IndexedDB
  }

  static async resume(sheetId) {
    // Check if previous session exists
    // Return EditorStateManager instance or null
  }
}
```

### Task 3.2: Implement CSV Parsing & Validation

**Requirement**: Parse Google Sheet CSV into structured data.

**CSV Format**:
```
key,en,es,fr,swa
unitName,Your Ward,Su Rama,Votre Branche,Kimanda Yako
speaker1,John Smith,Juan Garcia,Jean Dupont,Yohana Mto
openingHymn,62
CS 2,Accompaniment by Sister Smith
```

**Parsing Logic**:
1. Use existing `parseCSV()` from `js/utils/csv.js` as reference
2. Detect CSV format: simple (key, value) vs. multi-lang (key, en, es, fr, swa)
3. Extract headers row
4. Parse data rows into dictionary structure
5. Normalize language values (trim whitespace, handle quotes)

**Validation Rules** (Task 3.3):
1. **Required headers**: Must have "key" column
2. **Language columns**: "en", "es", "fr", "swa" (if multi-lang format)
3. **No duplicate keys**: Each key appears only once
4. **Hymn format**: If key ends with "Hymn":
   - Value must be number (e.g., `62`, `1001`)
   - OR `CS` + space + number + optional letter (e.g., `CS 2`, `CS 73a`)
5. **Required fields**: "key" must be non-empty, "en" must be non-empty (unless fallback)
6. **No XSS payload**: Sanitize values (reuse `sanitizeEntry()` from `js/sanitize.js`)

**Error Messages**:
```javascript
{
  errors: [
    { row: 2, column: "opening Hymn", message: "Invalid hymn format: must be number or CS{space}number" },
    { row: 5, column: "key", message: "Duplicate key: 'speaker1' already defined at row 3" },
    { row: "header", column: "es", message: "Missing required language column" }
  ]
}
```

### Task 3.3: Implement Hymn Format Validation

**Context**: Hymn fields can have special format:
- Regular: `62` (hymn number)
- Children's: `CS 2` (with space, can have letter like `CS 73a`)
- With note: `62|Sung by Primary` (pipe-separated annotation)

**Validation Function**:

```javascript
function validateHymnValue(value) {
  if (!value) return { valid: false, error: "Hymn value cannot be empty" };
  
  // Split on pipe to get hymn part
  const [hymnPart] = value.split("|");
  const hymn = hymnPart.trim();
  
  // Pattern: number OR "CS {number}{optional letter}"
  const hymnRegex = /^(\d{1,4}|CS [0-9]{1,4}[a-z]?)$/i;
  
  if (!hymnRegex.test(hymn)) {
    return {
      valid: false,
      error: `Invalid hymn: ${hymn}. Use format: "62" or "CS 2" or "CS 73a", optionally with "|Note"`
    };
  }
  
  return { valid: true };
}
```

**Hymn Lookup** (Optional Enhancement):
- Reference `js/data/hymnsLookup.js` to validate hymn numbers exist
- For now: just validate format (not whether hymn exists)
- Can add lookup validation in Phase 4

### Task 3.4: Implement IndexedDB Persistence

**Context**: Store editor state so user can reload page and resume editing.

**IndexedDB Store**: `editor._state`

**Schema**:
```javascript
// In js/data/db.js (existing Dexie setup)
// Add new store:
editor_state: "sheetId, createdAt" // Compound key
```

**Stored Data**:
```javascript
{
  id: "auto-generated",
  sheetId: "ABC123XYZ",
  createdAt: Date.now(),
  lastModified: Date.now(),
  expiresAt: createdAt + (24 * 60 * 60 * 1000), // 24h session
  state: { /* EditorStateManager.state */ },
  csvUrl: "https://docs.google.com/..."
}
```

**Methods**:

```javascript
async function saveSessionState(sheetId, state, csvUrl) {
  // Store to IndexedDB
  // Return saved object with ID
}

async function getSessionState(sheetId) {
  // Fetch from IndexedDB
  // Check if expired (24h)
  // Return state or null
}

async function deleteSessionState(sheetId) {
  // Remove from IndexedDB
}

async function resumeSession(sheetId) {
  // Check if session exists
  // Ask user: "Resume editing? X changes pending"
  // Return EditorStateManager with restored state or null
}
```

**Expiry Policy**: Sessions expire after 24 hours (paranoid safety).

### Task 3.5: Implement toCSV() & String Generation

**Requirement**: Convert in-memory state back to CSV string format suitable for upload.

**Function**:

```javascript
toCSV() {
  // 1. Build header: "key,en,es,fr,swa"
  // 2. For each row, quote fields with commas/newlines
  // 3. Handle fallback: if language cell empty, use English value
  // 4. Return as string ready for Sheets API
}

// Example output:
// key,en,es,fr,swa
// unitName,Your Ward,Su Rama,Votre Branche,Kimanda Yako
// speaker1,"Smith, John","García, Juan","Dupont, Jean","Mtu, Yohana"
// openingHymn,62
//
```

**CSV Quoting Rules**:
- Quote fields containing: comma, newline, quotes
- Escape quotes: `"` → `""`
- Leave other fields unquoted

**Reference**: Use logic from `js/utils/csv.js` as template.

### Task 3.6: Create Unit Tests

**File**: `test/data/EditorStateManager.test.mjs`

**Test Cases**:

```
✓ loadFromSheet() fetches and parses CSV correctly
✓ loadFromSheet() handles multi-language format
✓ loadFromSheet() handles simple key-value format
✓ getValue() returns correct value
✓ getValue() falls back to English if language empty
✓ setValue() updates value and marks unsaved
✓ addRow() adds new key with empty values
✓ deleteRow() marks row for deletion
✓ getUnsavedCount() returns correct count
✓ getChangedRows() returns only unsaved rows
✓ validate() rejects duplicate keys
✓ validate() rejects invalid hymn format
✓ validate() rejects duplicate hymn with "CS" prefix
✓ validate() catches empty key
✓ toCSV() generates valid CSV string
✓ toCSV() quotes fields with commas
✓ toCSV() includes all languages
✓ saveChanges() stores to IndexedDB
✓ resumeSession() restores previous state
✓ discardChanges() clears unsaved state
✓ Session expires after 24 hours
```

**Mocking**:
- Mock `fetch` for CSV download
- Mock IndexedDB via `fake-indexeddb`
- Mock `sanitizeEntry()`

---

## Phase 4: Editor UI Component

**Objective**: React-like component for editor form (scrollable list, key selector, language pills, input field).

**Duration**: ~12-14 hours  
**Context Required**: Medium-High (DOM manipulation, event handling, Bootstrap 5)  
**Files Created**: `js/components/SheetEditor.mjs`, `test/components/SheetEditor.test.mjs`

### Task 4.1: Design UI Structure & Components

**HTML Structure** (will be rendered by JavaScript):

```html
<div id="editor-main">
  <!-- Authentication Section -->
  <div id="auth-section">
    <button id="signin-btn" class="btn btn-primary">Sign in with Google</button>
  </div>

  <!-- Editor Section (hidden until auth) -->
  <div id="editor-section" style="display: none;">
    <!-- User Info -->
    <div class="editor-header">
      <span class="user-email">Logged in as: user@gmail.com</span>
      <button id="signout-btn" class="btn btn-sm btn-secondary">Sign out</button>
    </div>

    <!-- Key Selector & Language -->
    <div class="editor-controls">
      <div class="form-group">
        <label for="key-select">Key:</label>
        <select id="key-select" class="form-control">
          <option value="">-- Select a key --</option>
          <option value="unitName">unitName</option>
          <option value="speaker1">speaker1</option>
          <!-- ... all keys ... -->
        </select>
      </div>

      <!-- Language Pills (Bootstrap 5 buttons) -->
      <div class="language-buttons mt-3">
        <label>Language:</label>
        <div class="btn-group" role="group">
          <input type="radio" class="btn-check" name="language" id="lang-en" value="en" checked>
          <label class="btn btn-outline-primary" for="lang-en">English</label>
          
          <input type="radio" class="btn-check" name="language" id="lang-es" value="es">
          <label class="btn btn-outline-primary" for="lang-es">Español</label>
          
          <input type="radio" class="btn-check" name="language" id="lang-fr" value="fr">
          <label class="btn btn-outline-primary" for="lang-fr">Français</label>
          
          <input type="radio" class="btn-check" name="language" id="lang-swa" value="swa">
          <label class="btn btn-outline-primary" for="lang-swa">Kiswahili</label>
        </div>
      </div>
    </div>

    <!-- Value Input -->
    <div class="form-group mt-4">
      <label for="value-input">Value:</label>
      <textarea id="value-input" class="form-control" rows="4" placeholder="Enter value..."></textarea>
      
      <!-- Hymn Checkbox (shown for *Hymn keys) -->
      <div id="hymn-options" class="mt-2" style="display: none;">
        <div class="form-check">
          <input type="checkbox" class="form-check-input" id="hymn-children" value="children">
          <label class="form-check-label" for="hymn-children">
            Children's Song (prepends "CS ")
          </label>
        </div>
      </div>
    </div>

    <!-- Unsaved Indicator -->
    <div id="unsaved-indicator" class="alert alert-warning mt-3" style="display: none;">
      <strong>⚠ Unsaved Changes:</strong> <span id="unsaved-count">0</span> fields modified
    </div>

    <!-- Action Buttons -->
    <div class="editor-actions mt-4">
      <button id="add-row-btn" class="btn btn-success">➕ Add New Field</button>
      <button id="save-btn" class="btn btn-primary">✓ Save Changes</button>
      <button id="discard-btn" class="btn btn-secondary">Clear Changes</button>
    </div>
  </div>

  <!-- Viewer-Only Section -->
  <div id="viewer-only-section" style="display: none;">
    <div class="alert alert-info">
      <h4>Viewer</h4>
      <p>You don't have permission to edit this sheet. Only collaborators can edit.</p>
    </div>
  </div>
</div>
```

### Task 4.2: Create SheetEditor Component Class

**File**: `js/components/SheetEditor.mjs`

**Class Structure**:

```javascript
export class SheetEditor {
  constructor(containerSelector, editorStateManager, options = {}) {
    this.container = document.querySelector(containerSelector);
    this.stateManager = editorStateManager;
    this.currentKey = null;
    this.currentLanguage = "en";
    this.isEditing = false;
    
    this.options = {
      onSave: null,    // Callback when Save clicked
      onAddRow: null,  // Callback when Add Row clicked
      ...options
    };
    
    this.eventHandlers = {};
  }

  async render() {
    // Build HTML structure above
    // Attach event listeners
    // Load keys into dropdown
  }

  on(eventName, callback) {
    // event.addListener pattern
    // Supported events: 'value-changed', 'key-selected', 'language-changed', 'save', 'add-row'
  }

  setValue(key, language, value) {
    // Update input field to show value
    // Update unsaved indicator
  }

  setKey(key) {
    // Change which key is being edited
    // Update select dropdown
    // Load value for new key
    // Show/hide hymn checkbox
  }

  setLanguage(language) {
    // Change selected language
    // Load value for new language
  }

  updateKeyList(keys) {
    // Refresh dropdown with new keys (after adding row)
  }

  showUnsavedIndicator(count) {
    // Show/hide and update count
  }

  setLoading(isLoading) {
    // Disable buttons while saving
    // Show spinner
  }

  showError(message) {
    // Toast/alert with error message
  }

  showSuccess(message) {
    // Toast/alert with success message
  }

  destroy() {
    // Clean up event listeners
  }
}
```

### Task 4.3: Implement Event Handlers & DOM Updates

**Event Handlers to Attach**:

1. **Key Selection** (`#key-select` change)
   - Emit `key-selected` event with new key
   - Load value from EditorStateManager
   - Show/hide hymn options
   - Update language pills

2. **Language Selection** (radio buttons)
   - Emit `language-changed` event
   - Load value for selected language from EditorStateManager
   - Update input field

3. **Value Input Change** (`#value-input` input)
   - Emit `value-changed` { key, language, value } event
   - Update EditorStateManager
   - Mark as unsaved
   - Show unsaved indicator

4. **Hymn Children's Checkbox** (`#hymn-children` change)
   - If checked: prepend "CS " to value
   - If unchecked: remove "CS " prefix
   - Emit `value-changed` event

5. **Add Row Button** (`#add-row-btn` click)
   - Emit `add-row` event
   - Prompt user for new key name
   - Validate key doesn't exist
   - Add to EditorStateManager
   - Refresh key dropdown
   - Select new key

6. **Save Button** (`#save-btn` click)
   - Emit `save` event with all changes
   - Disable buttons, show loading
   - Wait for parent to validate & upload
   - On success: clear unsaved indicator

7. **Discard Button** (`#discard-btn` click)
   - Ask for confirmation
   - Clear all unsaved changes
   - Reload values from EditorStateManager
   - Hide unsaved indicator

### Task 4.4: Implement Hymn Field Logic

**Hymn Detection**: If key ends with "Hymn" (case-insensitive):
- Show checkbox: "Children's Song (prepends 'CS ')"
- When checkbox checked: ensure value starts with "CS "
- When checkbox unchecked: remove "CS " prefix

**Examples**:
- User enters "2" + checks "Children's Song" → value becomes "CS 2"
- User enters "CS 2" + unchecks box → value becomes "2"
- User enters "CS 73a" + can check/uncheck
- If user manually types "CS 2": checkbox auto-checks

**Special Case**: Hymn value might include note (pipe-separated):
- "62|Sung by choir" → can edit "62" part, keep "|Sung by choir"
- Children's logic applies to hymn number part only

### Task 4.5: Implement Unsaved Indicator

**Requirements**:
- Show alert box when any field modified
- Display count of unsaved fields
- Update in real-time
- Update on Add Row
- Clear on Save or Discard

**HTML**:
```html
<div id="unsaved-indicator" class="alert alert-warning" style="display: none;">
  <strong>⚠ Unsaved Changes:</strong> <span id="unsaved-count">0</span> fields modified
</div>
```

**Logic**:
1. EditorStateManager tracks unsavedChanges
2. SheetEditor calls `stateManager.getUnsavedCount()`
3. Update DOM to show/hide indicator
4. Listen for `value-changed` events to update count

### Task 4.6: Style with Bootstrap 5

**CSS Considerations**:
- Use Bootstrap 5 CDN in `editor.html`
- Language pills: use Bootstrap btn-group + btn-check pattern
- Form layout: use form-control, form-group classes
- Validation messages: use alert classes
- Loading state: disable buttons, show spinner

**Custom CSS** (minimal):
```css
#editor-main {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid #ccc;
}

.language-buttons .btn-group {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

#value-input {
  min-height: 100px;
}

.editor-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
```

### Task 4.7: Create Unit Tests

**File**: `test/components/SheetEditor.test.mjs`

**Test Approach**: Test DOM updates and event emissions (mock DOM elements)

**Test Cases**:

```
✓ render() creates HTML structure
✓ render() populates key dropdown
✓ Key selection updates shown value
✓ Language selection changes input field
✓ Value input emits 'value-changed' event
✓ Unsaved indicator shows on value change
✓ Unsaved count increases/decreases
✓ Add Row button opens dialog for key name
✓ Add Row validates key doesn't exist
✓ Hymn-related keys show children's checkbox
✓ Hymn checkbox checked: prepends "CS "
✓ Hymn checkbox unchecked: removes "CS "
✓ Save button emits 'save' event
✓ Save button disables during save
✓ Discard button asks for confirmation
✓ Discard button clears unsaved state
✓ Error message displays toast
✓ Success message displays toast
✓ destroy() cleans up event listeners
✓ Multiple language changes tracked
✓ Pipe-separated notes preserved in hymn values
```

**Mocking**:
- Mock DOM elements using jsdom
- Mock EditorStateManager methods
- Mock window.alert/confirm
- Test event emissions via custom event listeners

---

## Phase 5: Editor Page & Navigation

**Objective**: Create `editor.html` page and integrate OAuth + Editor UI. Add navigation from main app.

**Duration**: ~10-12 hours  
**Context Required**: Medium (HTML structure, OAuth flow, navigation)  
**Files Created**: `editor.html`, `js/editor.js`, `test/editor.test.mjs`

### Task 5.1: Create editor.html Page

**File**: `editor.html`

**Structure**: Mirror `index.html` but with editor-specific content

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description
```


## License: unknown
https://github.com/wayou/wayou.github.io/blob/5d2190ff8b5d0b67b64f70ccbb23eab30b8d56b2/_posts/2019-06-03-JavaScript%20%E5%AE%9E%E7%8E%B0%E9%A1%B5%E9%9D%A2%E4%B8%AD%E5%BD%95%E9%9F%B3%E5%8A%9F%E8%83%BD.md

```
I'll provide you with the comprehensive plan as a detailed document that you can save. Since I don't have file writing tools available, I'll present the complete plan in a code block that you can save directly to `./docs/FEATURE_CMS_EDIT.md`:

```markdown
# Feature Plan: CMS Sheet Editor (Google Sheets OAuth + Form UI)

**Version**: 1.0  
**Last Updated**: March 10, 2026  
**Status**: Ready for Implementation  
**Estimated Duration**: 6 phases, ~100-120 hours total (can parallelize some tasks)

---

## 📋 Table of Contents

1. [Overview & Architecture](#overview--architecture)
2. [Design Decisions](#design-decisions)
3. [Technical Architecture](#technical-architecture)
4. [Phase 1: OAuth Module](#phase-1-oauth-module)
5. [Phase 2: Google Sheets API Service](#phase-2-google-sheets-api-service)
6. [Phase 3: Editor State Manager](#phase-3-editor-state-manager)
7. [Phase 4: Editor UI Component](#phase-4-editor-ui-component)
8. [Phase 5: Editor Page & Navigation](#phase-5-editor-page--navigation)
9. [Phase 6: Tests & Deployment](#phase-6-tests--deployment)
10. [Data Structures & Interfaces](#data-structures--interfaces)
11. [Testing Specifications](#testing-specifications)
12. [Integration Checklist](#integration-checklist)
13. [Risk Mitigation](#risk-mitigation)

---

## Overview & Architecture

### What We're Building

A **Google Sheets CMS interface** that allows authorized editors to modify meeting program data directly in the app. Features:

- **Google OAuth 2.0 authentication** (PKCE flow, client-side only)
- **Collaborator verification** against the currently-loaded Google Sheet
- **Form-based UI** with scrollable key/value pairs, language selectors, validation
- **Local state management** with IndexedDB persistence for in-progress edits
- **Batch CSV upload** back to Google Sheets (not row-by-row)
- **Graceful "Viewer Only" fallback** for non-editors
- **No backend required** (GitHub Pages compatible)

### Why This Approach?

| Requirement | Solution | Why Not Others |
|---|---|---|
| **Free hosting** | GitHub Pages (static) | Avoiding backend costs ✅ |
| **No tech accounts** | Google OAuth (user's own account) | Users already have Google accounts |
| **Edit protection** | OAuth + Collaborators check | Verified against actual Sheet permissions |
| **Offline-ready** | IndexedDB state storage | Can edit offline, upload when online |
| **Easy CSV export** | CSV validation + upload | Reversible, debuggable, portable |
| **Non-tech friendly** | Form UI with pills/dropdowns | Visual, clear, no CSV syntax needed |

---

## Design Decisions

### 1. Authentication: Google OAuth 2.0 with PKCE

**Decision**: Use Google Identity Services (gis) library for browser-based OAuth authentication.

**Why**:
- No backend needed (PKCE flow works entirely client-side)
- Users sign in with account they already have
- Provides access token to call Google Sheets API
- Can verify user is a Sheet collaborator
- Token stored in `sessionStorage` (cleared on browser close) for security

**Implementation**:
- User navigates to `/editor.html`
- Click "Sign in with Google" button
- Google login popup appears
- After auth, token stored in `sessionStorage`
- App checks if user is collaborator on current sheet
- If yes: show editor; if no: show "Viewer Only"

### 2. Data Flow: Form UI + Batch Upload

**Decision**: Build form UI with field-by-field editing; upload all changes in one batch.

**Why**:
- Better UX than downloading/editing CSV locally
- Batch upload is safer than row-by-row API calls
- Can validate entire dataset before upload
- Less error-prone than incremental saves
- Users can edit multiple fields, review, then upload

**Data Lifecycle**:
1. Load current CSV from Sheet (via public export URL)
2. Parse into in-memory object: `{ key: { en, es, fr, swa } }`
3. Store in IndexedDB (survives page reload)
4. Editor modifies fields via form UI
5. On "Save": validate CSV, call Sheets API to append/update rows
6. After success: reload data, clear unsaved indicator

### 3. Permission Model: Collaborators Check

**Decision**: Check if authenticated user is a collaborator on the current Sheet.

**Why**:
- Tied to actual Sheet permissions (most secure)
- No manual allow-lists to maintain
- User only edits sheets they have permission for
- Leverages existing Google Sheet sharing

**Flow**:
1. Get sheet ID from current profile's CSV URL
2. After OAuth sign-in, call `spreadsheets.get()` to fetch collaborators
3. Compare user's email to collaborators list
4. Show/hide editor UI accordingly

### 4. UI Pattern: Scrollable Form with Language Pills

**Decision**: Single scrollable list of all keys, with key selector, language buttons, single input field.

**Why**:
- One key at a time prevents overwhelming users
- Language pills (Bootstrap 5) are clear and visual
- Single input field reduces UI complexity
- Scrollable list shows all available fields
- Matches your original spec exactly

**Form Structure**:
```
[Sign in / Logged in as: user@gmail.com] [Sign out]

Key Dropdown: [speaker1 ▼]
Language Pills: [EN] [ES] [FR] [SWA]
Input Field: [textarea with current value]
Add Row ➕ | Save Changes ✓

Unsaved: 3 changes pending
```

### 5. State Persistence: IndexedDB + Session

**Decision**: Keep edited data in IndexedDB during session; clear on sign-out.

**Why**:
- Survives page reload/accidental close
- User can ask "Resume editing?" on reload
- Keeps edits local until upload
- Session-based (not long-term storage)
- Encrypted in browser's secure storage

---

## Technical Architecture

### High-Level Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    editor.html                              │
│         (New page, mirrors index.html structure)             │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    js/editor.js                              │
│  (Orchestrator: loads profiles, checks auth, renders UI)    │
└─────────────────────────────────────────────────────────────┘
                            │
                ┌───────────┼───────────┐
                ▼           ▼           ▼
         ┌──────────┐ ┌──────────┐ ┌──────────┐
         │googleAuth│ │sheetsApi │ │editorState│
         │   .js    │ │Service.js│ │Manager.js │
         └──────────┘ └──────────┘ └──────────┘
                │           │           │
                └───────────┼───────────┘
                            │
                            ▼
         ┌──────────────────────────────────┐
         │  js/components/SheetEditor.mjs   │
         │        (UI Component)            │
         └──────────────────────────────────┘
                            │
                            ▼
         ┌──────────────────────────────────┐
         │      IndexedDB (Dexie)           │
         │   (editor._state store)          │
         └──────────────────────────────────┘
```

### File Organization

```
js/
├── auth/
│   └── googleAuth.js               [NEW] OAuth 2.0 module
├── services/
│   └── sheetsApiService.js         [NEW] Google Sheets API calls
├── data/
│   └── EditorStateManager.js       [NEW] In-memory state + persistence
├── components/
│   └── SheetEditor.mjs             [NEW] Form UI component
├── editor.js                        [NEW] Editor page entry point
└── [existing modules unchanged]

editor.html                          [NEW] Editor page

test/
├── auth/
│   └── googleAuth.test.mjs         [NEW] Auth tests
├── services/
│   └── sheetsApiService.test.mjs   [NEW] API service tests
├── data/
│   └── EditorStateManager.test.mjs [NEW] State manager tests
├── components/
│   └── SheetEditor.test.mjs        [NEW] UI component tests
└── editor.test.mjs                 [NEW] Integration tests

e2e/
├── scenarios/
│   └── editor.spec.js              [NEW] E2E scenarios

docs/
├── FEATURE_CMS_EDIT.md             [THIS FILE]
└── [existing docs unchanged]
```

### Dependencies

**External Libraries** (already in package.json):
- `dexie` v4.3.0 — IndexedDB abstraction (already used)
- Google Identity Services — Added via CDN script tag in editor.html

**No new npm dependencies**

---

## Phase 1: OAuth Module

**Objective**: Implement Google OAuth 2.0 authentication with PKCE flow.

**Duration**: ~8-10 hours  
**Context Required**: Medium (auth patterns, Google API basics)  
**Files Created**: `js/auth/googleAuth.js`, `test/auth/googleAuth.test.mjs`

### Task 1.1: Create googleAuth Module Structure

**File**: `js/auth/googleAuth.js`

Create a module that:
- Exports an object: `GoogleAuth` with methods listed below
- Initializes Google Identity Services (gis) on load
- NO external dependencies except gis library (loaded via CDN in editor.html)

**Methods to implement**:

```javascript
GoogleAuth.initialize(clientId, redirectUri)
GoogleAuth.signIn()                    // Opens Google login popup
GoogleAuth.signOut()                   // Clears token, closes session
GoogleAuth.getAccessToken()            // Returns token from sessionStorage
GoogleAuth.isAuthenticated()           // Returns boolean
GoogleAuth.getUser()                   // Returns { email, name }
GoogleAuth.onTokenExpire(callback)     // Handles token refresh
```

**Session Storage Keys**:
- `gm_access_token` — OAuth access token
- `gm_user_email` — User's email
- `gm_token_expires` — Token expiry timestamp (ms)

**Error Handling**:
- If user cancels login: resolve to `null` (don't throw)
- If token expires: auto-refresh or trigger re-auth
- Log all errors to `[AUTH]` prefix

**Notes**:
- Use `sessionStorage` only (cleared on browser close)
- Never use `localStorage` for tokens
- Implement token expiry check before API calls
- Google sign-out should clear all stored data

### Task 1.2: Handle PKCE Flow (Authorization Code)

**Context**: PKCE (Proof Key for Code Exchange) is how OAuth 2.0 works in browsers without backend.

**Implementation Details**:

1. Generate `code_verifier` (43-128 char random string)
2. Hash it to `code_challenge` (SHA-256)
3. Send user to Google auth endpoint with `code_challenge`
4. User grants permission
5. Google redirects back with authorization `code`
6. Exchange `code` + `code_verifier` for access token
7. Store token in `sessionStorage`

**Library**: Use `google-gsi` (Google Identity Services)
- Already available via CDN: `https://accounts.google.com/gsi/client`
- Handles PKCE automatically
- Simpler to use than raw OAuth

**Code Flow**:
```javascript
// In googleAuth.js
function generatePKCEPair() {
  // Generate random code_verifier
  // SHA-256 hash to code_challenge
  // Return { verifier, challenge }
}

async function exchangeCodeForToken(code, codeVerifier) {
  // POST to Google token endpoint
  // Return access token
}
```

**Testing**:
- Mock `sessionStorage`
- Mock Google gsi library
- Test token generation/storage
- Test error cases (network, user cancel)

### Task 1.3: Implement Token Refresh & Expiry

**Requirement**: Access tokens expire in ~1 hour. Handle gracefully.

**Implementation**:
1. Store token `expires_at` timestamp when token received
2. Before API calls: check if `Date.now() > expires_at`
3. If expired: trigger refresh flow
4. If refresh fails: sign out and require re-auth

**Methods**:
```javascript
GoogleAuth.isTokenExpired()
GoogleAuth.refreshToken()
GoogleAuth.onTokenExpire(callback)  // Register handler
```

**Edge Case**: If user's Google session has ended, refresh will fail. Show "Please sign in again" message.

### Task 1.4: Create Unit Tests for Auth

**File**: `test/auth/googleAuth.test.mjs`

**Test Cases**:

```
✓ signIn() opens Google popup
✓ On successful auth, token stored in sessionStorage
✓ isAuthenticated() returns true after sign-in
✓ isAuthenticated() returns false before sign-in
✓ getAccessToken() returns token string
✓ getUser() returns { email, name }
✓ Token expiry is calculated correctly
✓ signOut() clears sessionStorage
✓ isTokenExpired() returns true for expired token
✓ refreshToken() updates token before expiry
✓ On network error, gracefully handle (don't crash)
✓ On user cancel, resolve to null (not throw)
✓ Multiple sign-in calls don't create duplicate popups
```

**Mocking**:
- Mock global `google` object (from gis library)
- Mock `sessionStorage`
- Mock `fetch` for token endpoint

---

## Phase 2: Google Sheets API Service

**Objective**: Wrapper for Google Sheets API operations (check collaborators, upload data).

**Duration**: ~10-12 hours  
**Context Required**: Medium (Google Sheets API, HTTP requests)  
**Files Created**: `js/services/sheetsApiService.js`, `test/services/sheetsApiService.test.mjs`

### Task 2.1: Create Sheets API Service Structure

**File**: `js/services/sheetsApiService.js`

**Methods to export**:

```javascript
SheetsAPI.initialize(accessToken)              // Set auth token
SheetsAPI.getSpreadsheetMetadata(sheetId)      // Get sheet info + collaborators
SheetsAPI.checkIfCollaborator(sheetId, email)  // Boolean
SheetsAPI.getSheetValues(sheetId, range)       // Fetch cell values
SheetsAPI.appendRows(sheetId, values)          // Add rows to sheet
SheetsAPI.updateRows(sheetId, values)          // Update existing rows
SheetsAPI.uploadCSV(sheetId, csvData)          // Replace entire sheet data
```

**Dependencies**:
- `GoogleAuth` module (to get access token)
- Standard `fetch` API (no external library)

**Base Endpoint**: `https://sheets.googleapis.com/v4/spreadsheets`

**Required OAuth Scope**: `https://www.googleapis.com/auth/spreadsheets`

**Error Handling**:
- Log all HTTP errors with request details
- Return `{ success: false, error: "message" }` for failures
- Throw on authentication errors (token expired, unauthorized)
- Network timeouts: implement 30-second timeout

### Task 2.2: Extract Sheet ID from CSV URL

**Context**: Current profiles store CSV export URLs. Need to extract sheet ID.

**Sheet URL Patterns**:
```
CSV export URL: https://docs.google.com/spreadsheets/d/ABC123XYZ/gviz/tq?tqx=out:csv
Sheet ID:       ABC123XYZ (extract from /d/.../)

Normal sheet URL: https://docs.google.com/spreadsheets/d/ABC123XYZ/edit#gid=0
Sheet ID:        ABC123XYZ (same extraction)
```

**Function**:
```javascript
function extractSheetIdFromUrl(csvUrl) {
  // return sheet ID string, or null if invalid
}
```

**Validation**:
- Ensure URL contains `docs.google.com/spreadsheets/d/`
- Ensure ID is alphanumeric (no special chars)
- Return `null` for invalid URLs

### Task 2.3: Implement `getSpreadsheetMetadata()`

**API Call**: `GET /v4/spreadsheets/{sheetId}`

**Returns**:
```json
{
  "spreadsheetId": "ABC123XYZ",
  "properties": {
    "title": "Sacrament Program",
    "locale": "en_US",
    ...
  }
}
```

**Additional**: Fetch collaborators via Drive API (optional advanced feature; for now, assume we can determine from spreadsheet.properties)

**Note**: Google Sheets API's `spreadsheets.get()` requires the user to have at least Viewer access. Request with `fields=spreadsheetId,properties` to minimize response size.

### Task 2.4: Implement `checkIfCollaborator()`

**Logic**:
1. Call `getSpreadsheetMetadata(sheetId)`
2. Check `spreadsheetProperties` for owner/editors
3. Compare `GoogleAuth.getUser().email` to collaborators list
4. Return `true` if match, `false` otherwise

**Edge Cases**:
- User email might have different case (do case-insensitive compare)
- If metadata doesn't contain collaborators, conservative approach: `return false` (deny access)
- If API call fails: `throw` error (don't silently deny)

**Alternative** (if Google Sheets API doesn't provide collaborators easily):
- Could use Drive API's `permissions` endpoint
- For now, assume metadata provides this info; adjust if not available

### Task 2.5: Implement CSV Upload/Append

**Historical Context**: App currently uses public CSV export URLs (read-only).

**New Requirement**: Upload modified CSV back to Sheet.

**Two Approaches**:

**Option A: Append Rows** (Simpler)
- API: `POST /v4/spreadsheets/{sheetId}/values:append`
- Each edited row sent as new row
- Pro: Simple, no row-by-row tracking
- Con: Duplicates sheet data if not careful

**Option B: Clear & Replace** (Safer)
- API: `POST /v4/spreadsheets/{sheetId}/values:batchUpdate`
- Clear all data, write new CSV
- Pro: Guaranteed consistent state
- Con: All-or-nothing (can't recover if network fails mid-upload)

**Decision**: Use **Option B** (Clear & Replace) with validation

**Implementation**:

```javascript
async function uploadCSV(sheetId, csvData) {
  // 1. Validate csvData format (check headers, etc.)
  // 2. Parse CSV into 2D array (rows + columns)
  // 3. Call Sheets API:
  //    - DELETE all rows from Sheet1
  //    - APPEND new CSV data
  // 4. Return { success, sheetId, rowsWritten }
}
```

**API Call**:
```
POST /v4/spreadsheets/{sheetId}/values/Sheet1:clear
POST /v4/spreadsheets/{sheetId}/values/Sheet1:append
  Body: { values: [ ["key", "en", "es", "fr", "swa"], [...], [...] ] }
```

**Error Recovery**:
- If clear succeeds but append fails: sheet is empty (bad)
- Mitigation: Check sheet before upload, warn user
- Alternative: Use local backup copy for recovery

### Task 2.6: Create Unit Tests for Sheets API Service

**File**: `test/services/sheetsApiService.test.mjs`

**Test Cases**:

```
✓ extractSheetIdFromUrl() extracts ID correctly
✓ extractSheetIdFromUrl() rejects invalid URLs
✓ getSpreadsheetMetadata() makes correct API call
✓ getSpreadsheetMetadata() parses response
✓ checkIfCollaborator() returns true for collaborators
✓ checkIfCollaborator() returns false for non-collaborators
✓ checkIfCollaborator() is case-insensitive for email
✓ uploadCSV() calls clear then append
✓ uploadCSV() throws on validation error
✓ uploadCSV() returns row count
✓ On 401 Unauthorized: throw auth error
✓ On 403 Forbidden: throw permission error
✓ On network timeout: throw with timeout message
✓ On invalid CSV: return validation error
```

**Mocking**:
- Mock `fetch` for all API calls
- Mock `GoogleAuth.getAccessToken()`
- Mock `GoogleAuth.getUser()`

---

## Phase 3: Editor State Manager

**Objective**: In-memory state management for edited CSV data with IndexedDB persistence.

**Duration**: ~10-12 hours  
**Context Required**: Medium (IndexedDB, CSV parsing, state management)  
**Files Created**: `js/data/EditorStateManager.js`, `test/data/EditorStateManager.test.mjs`

### Task 3.1: Create EditorStateManager Structure

**File**: `js/data/EditorStateManager.js`

**Purpose**: Hold edited CSV data in memory, track changes, persist to IndexedDB.

**Internal Data Structure**:

```javascript
// Parsed CSV stored as:
{
  headers: ["key", "en", "es", "fr", "swa"],
  rows: {
    "unitName": {
      en: "Your Ward Name",
      es: "Nombre de Su Rama",
      fr: "Nom de Votre Branche",
      swa: "Jina la Kimanda Yako"
    },
    "speaker1": {
      en: "John Smith",
      es: "", // Empty = fallback to English
      fr: "",
      swa: ""
    },
    // ... more rows
  },
  // Track which fields have unsaved changes
  unsavedChanges: {
    "unitName": { en: true, es: false, fr: false, swa: false },
    "speaker1": { en: false, es: true, fr: false, swa: false },
  },
  // Metadata
  sheetId: "ABC123XYZ",
  createdAt: Date.now(),
  lastModified: Date.now()
}
```

**Class Methods**:

```javascript
class EditorStateManager {
  constructor(sheetId) {
    this.sheetId = sheetId;
    this.state = { /* as above */ };
  }

  async loadFromSheet(csvUrl) {
    // Fetch current CSV from sheet
    // Parse it into state.rows
    // Save to IndexedDB
  }

  getValue(key, language = "en") {
    // Return value for key + language
    // Fallback to English if empty
  }

  setValue(key, language, value) {
    // Update value, mark as changed
    // Don't save to DB yet (only on explicit save)
  }

  addRow(key, values = {}) {
    // Add new key with optional values
    // Mark as new/unsaved
  }

  deleteRow(key) {
    // Mark row for deletion
  }

  getUnsavedCount() {
    // Return number of changed fields
  }

  getChangedRows() {
    // Return only rows with unsaved changes
  }

  async validate() {
    // Check CSV structure, keys, hymn format
    // Return { valid: boolean, errors: [] }
  }

  toCSV() {
    // Generate CSV string ready for upload
    // Includes validation
  }

  async saveChanges(csvData) {
    // Save edited state to IndexedDB for session persistence
  }

  async discardChanges() {
    // Clear unsaved state, reload from sheet
  }

  async clear() {
    // Delete all editor data from IndexedDB
  }

  static async resume(sheetId) {
    // Check if previous session exists
    // Return EditorStateManager instance or null
  }
}
```

### Task 3.2: Implement CSV Parsing & Validation

**Requirement**: Parse Google Sheet CSV into structured data.

**CSV Format**:
```
key,en,es,fr,swa
unitName,Your Ward,Su Rama,Votre Branche,Kimanda Yako
speaker1,John Smith,Juan Garcia,Jean Dupont,Yohana Mto
openingHymn,62
CS 2,Accompaniment by Sister Smith
```

**Parsing Logic**:
1. Use existing `parseCSV()` from `js/utils/csv.js` as reference
2. Detect CSV format: simple (key, value) vs. multi-lang (key, en, es, fr, swa)
3. Extract headers row
4. Parse data rows into dictionary structure
5. Normalize language values (trim whitespace, handle quotes)

**Validation Rules** (Task 3.3):
1. **Required headers**: Must have "key" column
2. **Language columns**: "en", "es", "fr", "swa" (if multi-lang format)
3. **No duplicate keys**: Each key appears only once
4. **Hymn format**: If key ends with "Hymn":
   - Value must be number (e.g., `62`, `1001`)
   - OR `CS` + space + number + optional letter (e.g., `CS 2`, `CS 73a`)
5. **Required fields**: "key" must be non-empty, "en" must be non-empty (unless fallback)
6. **No XSS payload**: Sanitize values (reuse `sanitizeEntry()` from `js/sanitize.js`)

**Error Messages**:
```javascript
{
  errors: [
    { row: 2, column: "opening Hymn", message: "Invalid hymn format: must be number or CS{space}number" },
    { row: 5, column: "key", message: "Duplicate key: 'speaker1' already defined at row 3" },
    { row: "header", column: "es", message: "Missing required language column" }
  ]
}
```

### Task 3.3: Implement Hymn Format Validation

**Context**: Hymn fields can have special format:
- Regular: `62` (hymn number)
- Children's: `CS 2` (with space, can have letter like `CS 73a`)
- With note: `62|Sung by Primary` (pipe-separated annotation)

**Validation Function**:

```javascript
function validateHymnValue(value) {
  if (!value) return { valid: false, error: "Hymn value cannot be empty" };
  
  // Split on pipe to get hymn part
  const [hymnPart] = value.split("|");
  const hymn = hymnPart.trim();
  
  // Pattern: number OR "CS {number}{optional letter}"
  const hymnRegex = /^(\d{1,4}|CS [0-9]{1,4}[a-z]?)$/i;
  
  if (!hymnRegex.test(hymn)) {
    return {
      valid: false,
      error: `Invalid hymn: ${hymn}. Use format: "62" or "CS 2" or "CS 73a", optionally with "|Note"`
    };
  }
  
  return { valid: true };
}
```

**Hymn Lookup** (Optional Enhancement):
- Reference `js/data/hymnsLookup.js` to validate hymn numbers exist
- For now: just validate format (not whether hymn exists)
- Can add lookup validation in Phase 4

### Task 3.4: Implement IndexedDB Persistence

**Context**: Store editor state so user can reload page and resume editing.

**IndexedDB Store**: `editor._state`

**Schema**:
```javascript
// In js/data/db.js (existing Dexie setup)
// Add new store:
editor_state: "sheetId, createdAt" // Compound key
```

**Stored Data**:
```javascript
{
  id: "auto-generated",
  sheetId: "ABC123XYZ",
  createdAt: Date.now(),
  lastModified: Date.now(),
  expiresAt: createdAt + (24 * 60 * 60 * 1000), // 24h session
  state: { /* EditorStateManager.state */ },
  csvUrl: "https://docs.google.com/..."
}
```

**Methods**:

```javascript
async function saveSessionState(sheetId, state, csvUrl) {
  // Store to IndexedDB
  // Return saved object with ID
}

async function getSessionState(sheetId) {
  // Fetch from IndexedDB
  // Check if expired (24h)
  // Return state or null
}

async function deleteSessionState(sheetId) {
  // Remove from IndexedDB
}

async function resumeSession(sheetId) {
  // Check if session exists
  // Ask user: "Resume editing? X changes pending"
  // Return EditorStateManager with restored state or null
}
```

**Expiry Policy**: Sessions expire after 24 hours (paranoid safety).

### Task 3.5: Implement toCSV() & String Generation

**Requirement**: Convert in-memory state back to CSV string format suitable for upload.

**Function**:

```javascript
toCSV() {
  // 1. Build header: "key,en,es,fr,swa"
  // 2. For each row, quote fields with commas/newlines
  // 3. Handle fallback: if language cell empty, use English value
  // 4. Return as string ready for Sheets API
}

// Example output:
// key,en,es,fr,swa
// unitName,Your Ward,Su Rama,Votre Branche,Kimanda Yako
// speaker1,"Smith, John","García, Juan","Dupont, Jean","Mtu, Yohana"
// openingHymn,62
//
```

**CSV Quoting Rules**:
- Quote fields containing: comma, newline, quotes
- Escape quotes: `"` → `""`
- Leave other fields unquoted

**Reference**: Use logic from `js/utils/csv.js` as template.

### Task 3.6: Create Unit Tests

**File**: `test/data/EditorStateManager.test.mjs`

**Test Cases**:

```
✓ loadFromSheet() fetches and parses CSV correctly
✓ loadFromSheet() handles multi-language format
✓ loadFromSheet() handles simple key-value format
✓ getValue() returns correct value
✓ getValue() falls back to English if language empty
✓ setValue() updates value and marks unsaved
✓ addRow() adds new key with empty values
✓ deleteRow() marks row for deletion
✓ getUnsavedCount() returns correct count
✓ getChangedRows() returns only unsaved rows
✓ validate() rejects duplicate keys
✓ validate() rejects invalid hymn format
✓ validate() rejects duplicate hymn with "CS" prefix
✓ validate() catches empty key
✓ toCSV() generates valid CSV string
✓ toCSV() quotes fields with commas
✓ toCSV() includes all languages
✓ saveChanges() stores to IndexedDB
✓ resumeSession() restores previous state
✓ discardChanges() clears unsaved state
✓ Session expires after 24 hours
```

**Mocking**:
- Mock `fetch` for CSV download
- Mock IndexedDB via `fake-indexeddb`
- Mock `sanitizeEntry()`

---

## Phase 4: Editor UI Component

**Objective**: React-like component for editor form (scrollable list, key selector, language pills, input field).

**Duration**: ~12-14 hours  
**Context Required**: Medium-High (DOM manipulation, event handling, Bootstrap 5)  
**Files Created**: `js/components/SheetEditor.mjs`, `test/components/SheetEditor.test.mjs`

### Task 4.1: Design UI Structure & Components

**HTML Structure** (will be rendered by JavaScript):

```html
<div id="editor-main">
  <!-- Authentication Section -->
  <div id="auth-section">
    <button id="signin-btn" class="btn btn-primary">Sign in with Google</button>
  </div>

  <!-- Editor Section (hidden until auth) -->
  <div id="editor-section" style="display: none;">
    <!-- User Info -->
    <div class="editor-header">
      <span class="user-email">Logged in as: user@gmail.com</span>
      <button id="signout-btn" class="btn btn-sm btn-secondary">Sign out</button>
    </div>

    <!-- Key Selector & Language -->
    <div class="editor-controls">
      <div class="form-group">
        <label for="key-select">Key:</label>
        <select id="key-select" class="form-control">
          <option value="">-- Select a key --</option>
          <option value="unitName">unitName</option>
          <option value="speaker1">speaker1</option>
          <!-- ... all keys ... -->
        </select>
      </div>

      <!-- Language Pills (Bootstrap 5 buttons) -->
      <div class="language-buttons mt-3">
        <label>Language:</label>
        <div class="btn-group" role="group">
          <input type="radio" class="btn-check" name="language" id="lang-en" value="en" checked>
          <label class="btn btn-outline-primary" for="lang-en">English</label>
          
          <input type="radio" class="btn-check" name="language" id="lang-es" value="es">
          <label class="btn btn-outline-primary" for="lang-es">Español</label>
          
          <input type="radio" class="btn-check" name="language" id="lang-fr" value="fr">
          <label class="btn btn-outline-primary" for="lang-fr">Français</label>
          
          <input type="radio" class="btn-check" name="language" id="lang-swa" value="swa">
          <label class="btn btn-outline-primary" for="lang-swa">Kiswahili</label>
        </div>
      </div>
    </div>

    <!-- Value Input -->
    <div class="form-group mt-4">
      <label for="value-input">Value:</label>
      <textarea id="value-input" class="form-control" rows="4" placeholder="Enter value..."></textarea>
      
      <!-- Hymn Checkbox (shown for *Hymn keys) -->
      <div id="hymn-options" class="mt-2" style="display: none;">
        <div class="form-check">
          <input type="checkbox" class="form-check-input" id="hymn-children" value="children">
          <label class="form-check-label" for="hymn-children">
            Children's Song (prepends "CS ")
          </label>
        </div>
      </div>
    </div>

    <!-- Unsaved Indicator -->
    <div id="unsaved-indicator" class="alert alert-warning mt-3" style="display: none;">
      <strong>⚠ Unsaved Changes:</strong> <span id="unsaved-count">0</span> fields modified
    </div>

    <!-- Action Buttons -->
    <div class="editor-actions mt-4">
      <button id="add-row-btn" class="btn btn-success">➕ Add New Field</button>
      <button id="save-btn" class="btn btn-primary">✓ Save Changes</button>
      <button id="discard-btn" class="btn btn-secondary">Clear Changes</button>
    </div>
  </div>

  <!-- Viewer-Only Section -->
  <div id="viewer-only-section" style="display: none;">
    <div class="alert alert-info">
      <h4>Viewer</h4>
      <p>You don't have permission to edit this sheet. Only collaborators can edit.</p>
    </div>
  </div>
</div>
```

### Task 4.2: Create SheetEditor Component Class

**File**: `js/components/SheetEditor.mjs`

**Class Structure**:

```javascript
export class SheetEditor {
  constructor(containerSelector, editorStateManager, options = {}) {
    this.container = document.querySelector(containerSelector);
    this.stateManager = editorStateManager;
    this.currentKey = null;
    this.currentLanguage = "en";
    this.isEditing = false;
    
    this.options = {
      onSave: null,    // Callback when Save clicked
      onAddRow: null,  // Callback when Add Row clicked
      ...options
    };
    
    this.eventHandlers = {};
  }

  async render() {
    // Build HTML structure above
    // Attach event listeners
    // Load keys into dropdown
  }

  on(eventName, callback) {
    // event.addListener pattern
    // Supported events: 'value-changed', 'key-selected', 'language-changed', 'save', 'add-row'
  }

  setValue(key, language, value) {
    // Update input field to show value
    // Update unsaved indicator
  }

  setKey(key) {
    // Change which key is being edited
    // Update select dropdown
    // Load value for new key
    // Show/hide hymn checkbox
  }

  setLanguage(language) {
    // Change selected language
    // Load value for new language
  }

  updateKeyList(keys) {
    // Refresh dropdown with new keys (after adding row)
  }

  showUnsavedIndicator(count) {
    // Show/hide and update count
  }

  setLoading(isLoading) {
    // Disable buttons while saving
    // Show spinner
  }

  showError(message) {
    // Toast/alert with error message
  }

  showSuccess(message) {
    // Toast/alert with success message
  }

  destroy() {
    // Clean up event listeners
  }
}
```

### Task 4.3: Implement Event Handlers & DOM Updates

**Event Handlers to Attach**:

1. **Key Selection** (`#key-select` change)
   - Emit `key-selected` event with new key
   - Load value from EditorStateManager
   - Show/hide hymn options
   - Update language pills

2. **Language Selection** (radio buttons)
   - Emit `language-changed` event
   - Load value for selected language from EditorStateManager
   - Update input field

3. **Value Input Change** (`#value-input` input)
   - Emit `value-changed` { key, language, value } event
   - Update EditorStateManager
   - Mark as unsaved
   - Show unsaved indicator

4. **Hymn Children's Checkbox** (`#hymn-children` change)
   - If checked: prepend "CS " to value
   - If unchecked: remove "CS " prefix
   - Emit `value-changed` event

5. **Add Row Button** (`#add-row-btn` click)
   - Emit `add-row` event
   - Prompt user for new key name
   - Validate key doesn't exist
   - Add to EditorStateManager
   - Refresh key dropdown
   - Select new key

6. **Save Button** (`#save-btn` click)
   - Emit `save` event with all changes
   - Disable buttons, show loading
   - Wait for parent to validate & upload
   - On success: clear unsaved indicator

7. **Discard Button** (`#discard-btn` click)
   - Ask for confirmation
   - Clear all unsaved changes
   - Reload values from EditorStateManager
   - Hide unsaved indicator

### Task 4.4: Implement Hymn Field Logic

**Hymn Detection**: If key ends with "Hymn" (case-insensitive):
- Show checkbox: "Children's Song (prepends 'CS ')"
- When checkbox checked: ensure value starts with "CS "
- When checkbox unchecked: remove "CS " prefix

**Examples**:
- User enters "2" + checks "Children's Song" → value becomes "CS 2"
- User enters "CS 2" + unchecks box → value becomes "2"
- User enters "CS 73a" + can check/uncheck
- If user manually types "CS 2": checkbox auto-checks

**Special Case**: Hymn value might include note (pipe-separated):
- "62|Sung by choir" → can edit "62" part, keep "|Sung by choir"
- Children's logic applies to hymn number part only

### Task 4.5: Implement Unsaved Indicator

**Requirements**:
- Show alert box when any field modified
- Display count of unsaved fields
- Update in real-time
- Update on Add Row
- Clear on Save or Discard

**HTML**:
```html
<div id="unsaved-indicator" class="alert alert-warning" style="display: none;">
  <strong>⚠ Unsaved Changes:</strong> <span id="unsaved-count">0</span> fields modified
</div>
```

**Logic**:
1. EditorStateManager tracks unsavedChanges
2. SheetEditor calls `stateManager.getUnsavedCount()`
3. Update DOM to show/hide indicator
4. Listen for `value-changed` events to update count

### Task 4.6: Style with Bootstrap 5

**CSS Considerations**:
- Use Bootstrap 5 CDN in `editor.html`
- Language pills: use Bootstrap btn-group + btn-check pattern
- Form layout: use form-control, form-group classes
- Validation messages: use alert classes
- Loading state: disable buttons, show spinner

**Custom CSS** (minimal):
```css
#editor-main {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid #ccc;
}

.language-buttons .btn-group {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

#value-input {
  min-height: 100px;
}

.editor-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
```

### Task 4.7: Create Unit Tests

**File**: `test/components/SheetEditor.test.mjs`

**Test Approach**: Test DOM updates and event emissions (mock DOM elements)

**Test Cases**:

```
✓ render() creates HTML structure
✓ render() populates key dropdown
✓ Key selection updates shown value
✓ Language selection changes input field
✓ Value input emits 'value-changed' event
✓ Unsaved indicator shows on value change
✓ Unsaved count increases/decreases
✓ Add Row button opens dialog for key name
✓ Add Row validates key doesn't exist
✓ Hymn-related keys show children's checkbox
✓ Hymn checkbox checked: prepends "CS "
✓ Hymn checkbox unchecked: removes "CS "
✓ Save button emits 'save' event
✓ Save button disables during save
✓ Discard button asks for confirmation
✓ Discard button clears unsaved state
✓ Error message displays toast
✓ Success message displays toast
✓ destroy() cleans up event listeners
✓ Multiple language changes tracked
✓ Pipe-separated notes preserved in hymn values
```

**Mocking**:
- Mock DOM elements using jsdom
- Mock EditorStateManager methods
- Mock window.alert/confirm
- Test event emissions via custom event listeners

---

## Phase 5: Editor Page & Navigation

**Objective**: Create `editor.html` page and integrate OAuth + Editor UI. Add navigation from main app.

**Duration**: ~10-12 hours  
**Context Required**: Medium (HTML structure, OAuth flow, navigation)  
**Files Created**: `editor.html`, `js/editor.js`, `test/editor.test.mjs`

### Task 5.1: Create editor.html Page

**File**: `editor.html`

**Structure**: Mirror `index.html` but with editor-specific content

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description
```


## License: unknown
https://github.com/wayou/wayou.github.io/blob/5d2190ff8b5d0b67b64f70ccbb23eab30b8d56b2/_posts/2019-06-03-JavaScript%20%E5%AE%9E%E7%8E%B0%E9%A1%B5%E9%9D%A2%E4%B8%AD%E5%BD%95%E9%9F%B3%E5%8A%9F%E8%83%BD.md

```
I'll provide you with the comprehensive plan as a detailed document that you can save. Since I don't have file writing tools available, I'll present the complete plan in a code block that you can save directly to `./docs/FEATURE_CMS_EDIT.md`:

```markdown
# Feature Plan: CMS Sheet Editor (Google Sheets OAuth + Form UI)

**Version**: 1.0  
**Last Updated**: March 10, 2026  
**Status**: Ready for Implementation  
**Estimated Duration**: 6 phases, ~100-120 hours total (can parallelize some tasks)

---

## 📋 Table of Contents

1. [Overview & Architecture](#overview--architecture)
2. [Design Decisions](#design-decisions)
3. [Technical Architecture](#technical-architecture)
4. [Phase 1: OAuth Module](#phase-1-oauth-module)
5. [Phase 2: Google Sheets API Service](#phase-2-google-sheets-api-service)
6. [Phase 3: Editor State Manager](#phase-3-editor-state-manager)
7. [Phase 4: Editor UI Component](#phase-4-editor-ui-component)
8. [Phase 5: Editor Page & Navigation](#phase-5-editor-page--navigation)
9. [Phase 6: Tests & Deployment](#phase-6-tests--deployment)
10. [Data Structures & Interfaces](#data-structures--interfaces)
11. [Testing Specifications](#testing-specifications)
12. [Integration Checklist](#integration-checklist)
13. [Risk Mitigation](#risk-mitigation)

---

## Overview & Architecture

### What We're Building

A **Google Sheets CMS interface** that allows authorized editors to modify meeting program data directly in the app. Features:

- **Google OAuth 2.0 authentication** (PKCE flow, client-side only)
- **Collaborator verification** against the currently-loaded Google Sheet
- **Form-based UI** with scrollable key/value pairs, language selectors, validation
- **Local state management** with IndexedDB persistence for in-progress edits
- **Batch CSV upload** back to Google Sheets (not row-by-row)
- **Graceful "Viewer Only" fallback** for non-editors
- **No backend required** (GitHub Pages compatible)

### Why This Approach?

| Requirement | Solution | Why Not Others |
|---|---|---|
| **Free hosting** | GitHub Pages (static) | Avoiding backend costs ✅ |
| **No tech accounts** | Google OAuth (user's own account) | Users already have Google accounts |
| **Edit protection** | OAuth + Collaborators check | Verified against actual Sheet permissions |
| **Offline-ready** | IndexedDB state storage | Can edit offline, upload when online |
| **Easy CSV export** | CSV validation + upload | Reversible, debuggable, portable |
| **Non-tech friendly** | Form UI with pills/dropdowns | Visual, clear, no CSV syntax needed |

---

## Design Decisions

### 1. Authentication: Google OAuth 2.0 with PKCE

**Decision**: Use Google Identity Services (gis) library for browser-based OAuth authentication.

**Why**:
- No backend needed (PKCE flow works entirely client-side)
- Users sign in with account they already have
- Provides access token to call Google Sheets API
- Can verify user is a Sheet collaborator
- Token stored in `sessionStorage` (cleared on browser close) for security

**Implementation**:
- User navigates to `/editor.html`
- Click "Sign in with Google" button
- Google login popup appears
- After auth, token stored in `sessionStorage`
- App checks if user is collaborator on current sheet
- If yes: show editor; if no: show "Viewer Only"

### 2. Data Flow: Form UI + Batch Upload

**Decision**: Build form UI with field-by-field editing; upload all changes in one batch.

**Why**:
- Better UX than downloading/editing CSV locally
- Batch upload is safer than row-by-row API calls
- Can validate entire dataset before upload
- Less error-prone than incremental saves
- Users can edit multiple fields, review, then upload

**Data Lifecycle**:
1. Load current CSV from Sheet (via public export URL)
2. Parse into in-memory object: `{ key: { en, es, fr, swa } }`
3. Store in IndexedDB (survives page reload)
4. Editor modifies fields via form UI
5. On "Save": validate CSV, call Sheets API to append/update rows
6. After success: reload data, clear unsaved indicator

### 3. Permission Model: Collaborators Check

**Decision**: Check if authenticated user is a collaborator on the current Sheet.

**Why**:
- Tied to actual Sheet permissions (most secure)
- No manual allow-lists to maintain
- User only edits sheets they have permission for
- Leverages existing Google Sheet sharing

**Flow**:
1. Get sheet ID from current profile's CSV URL
2. After OAuth sign-in, call `spreadsheets.get()` to fetch collaborators
3. Compare user's email to collaborators list
4. Show/hide editor UI accordingly

### 4. UI Pattern: Scrollable Form with Language Pills

**Decision**: Single scrollable list of all keys, with key selector, language buttons, single input field.

**Why**:
- One key at a time prevents overwhelming users
- Language pills (Bootstrap 5) are clear and visual
- Single input field reduces UI complexity
- Scrollable list shows all available fields
- Matches your original spec exactly

**Form Structure**:
```
[Sign in / Logged in as: user@gmail.com] [Sign out]

Key Dropdown: [speaker1 ▼]
Language Pills: [EN] [ES] [FR] [SWA]
Input Field: [textarea with current value]
Add Row ➕ | Save Changes ✓

Unsaved: 3 changes pending
```

### 5. State Persistence: IndexedDB + Session

**Decision**: Keep edited data in IndexedDB during session; clear on sign-out.

**Why**:
- Survives page reload/accidental close
- User can ask "Resume editing?" on reload
- Keeps edits local until upload
- Session-based (not long-term storage)
- Encrypted in browser's secure storage

---

## Technical Architecture

### High-Level Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    editor.html                              │
│         (New page, mirrors index.html structure)             │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    js/editor.js                              │
│  (Orchestrator: loads profiles, checks auth, renders UI)    │
└─────────────────────────────────────────────────────────────┘
                            │
                ┌───────────┼───────────┐
                ▼           ▼           ▼
         ┌──────────┐ ┌──────────┐ ┌──────────┐
         │googleAuth│ │sheetsApi │ │editorState│
         │   .js    │ │Service.js│ │Manager.js │
         └──────────┘ └──────────┘ └──────────┘
                │           │           │
                └───────────┼───────────┘
                            │
                            ▼
         ┌──────────────────────────────────┐
         │  js/components/SheetEditor.mjs   │
         │        (UI Component)            │
         └──────────────────────────────────┘
                            │
                            ▼
         ┌──────────────────────────────────┐
         │      IndexedDB (Dexie)           │
         │   (editor._state store)          │
         └──────────────────────────────────┘
```

### File Organization

```
js/
├── auth/
│   └── googleAuth.js               [NEW] OAuth 2.0 module
├── services/
│   └── sheetsApiService.js         [NEW] Google Sheets API calls
├── data/
│   └── EditorStateManager.js       [NEW] In-memory state + persistence
├── components/
│   └── SheetEditor.mjs             [NEW] Form UI component
├── editor.js                        [NEW] Editor page entry point
└── [existing modules unchanged]

editor.html                          [NEW] Editor page

test/
├── auth/
│   └── googleAuth.test.mjs         [NEW] Auth tests
├── services/
│   └── sheetsApiService.test.mjs   [NEW] API service tests
├── data/
│   └── EditorStateManager.test.mjs [NEW] State manager tests
├── components/
│   └── SheetEditor.test.mjs        [NEW] UI component tests
└── editor.test.mjs                 [NEW] Integration tests

e2e/
├── scenarios/
│   └── editor.spec.js              [NEW] E2E scenarios

docs/
├── FEATURE_CMS_EDIT.md             [THIS FILE]
└── [existing docs unchanged]
```

### Dependencies

**External Libraries** (already in package.json):
- `dexie` v4.3.0 — IndexedDB abstraction (already used)
- Google Identity Services — Added via CDN script tag in editor.html

**No new npm dependencies**

---

## Phase 1: OAuth Module

**Objective**: Implement Google OAuth 2.0 authentication with PKCE flow.

**Duration**: ~8-10 hours  
**Context Required**: Medium (auth patterns, Google API basics)  
**Files Created**: `js/auth/googleAuth.js`, `test/auth/googleAuth.test.mjs`

### Task 1.1: Create googleAuth Module Structure

**File**: `js/auth/googleAuth.js`

Create a module that:
- Exports an object: `GoogleAuth` with methods listed below
- Initializes Google Identity Services (gis) on load
- NO external dependencies except gis library (loaded via CDN in editor.html)

**Methods to implement**:

```javascript
GoogleAuth.initialize(clientId, redirectUri)
GoogleAuth.signIn()                    // Opens Google login popup
GoogleAuth.signOut()                   // Clears token, closes session
GoogleAuth.getAccessToken()            // Returns token from sessionStorage
GoogleAuth.isAuthenticated()           // Returns boolean
GoogleAuth.getUser()                   // Returns { email, name }
GoogleAuth.onTokenExpire(callback)     // Handles token refresh
```

**Session Storage Keys**:
- `gm_access_token` — OAuth access token
- `gm_user_email` — User's email
- `gm_token_expires` — Token expiry timestamp (ms)

**Error Handling**:
- If user cancels login: resolve to `null` (don't throw)
- If token expires: auto-refresh or trigger re-auth
- Log all errors to `[AUTH]` prefix

**Notes**:
- Use `sessionStorage` only (cleared on browser close)
- Never use `localStorage` for tokens
- Implement token expiry check before API calls
- Google sign-out should clear all stored data

### Task 1.2: Handle PKCE Flow (Authorization Code)

**Context**: PKCE (Proof Key for Code Exchange) is how OAuth 2.0 works in browsers without backend.

**Implementation Details**:

1. Generate `code_verifier` (43-128 char random string)
2. Hash it to `code_challenge` (SHA-256)
3. Send user to Google auth endpoint with `code_challenge`
4. User grants permission
5. Google redirects back with authorization `code`
6. Exchange `code` + `code_verifier` for access token
7. Store token in `sessionStorage`

**Library**: Use `google-gsi` (Google Identity Services)
- Already available via CDN: `https://accounts.google.com/gsi/client`
- Handles PKCE automatically
- Simpler to use than raw OAuth

**Code Flow**:
```javascript
// In googleAuth.js
function generatePKCEPair() {
  // Generate random code_verifier
  // SHA-256 hash to code_challenge
  // Return { verifier, challenge }
}

async function exchangeCodeForToken(code, codeVerifier) {
  // POST to Google token endpoint
  // Return access token
}
```

**Testing**:
- Mock `sessionStorage`
- Mock Google gsi library
- Test token generation/storage
- Test error cases (network, user cancel)

### Task 1.3: Implement Token Refresh & Expiry

**Requirement**: Access tokens expire in ~1 hour. Handle gracefully.

**Implementation**:
1. Store token `expires_at` timestamp when token received
2. Before API calls: check if `Date.now() > expires_at`
3. If expired: trigger refresh flow
4. If refresh fails: sign out and require re-auth

**Methods**:
```javascript
GoogleAuth.isTokenExpired()
GoogleAuth.refreshToken()
GoogleAuth.onTokenExpire(callback)  // Register handler
```

**Edge Case**: If user's Google session has ended, refresh will fail. Show "Please sign in again" message.

### Task 1.4: Create Unit Tests for Auth

**File**: `test/auth/googleAuth.test.mjs`

**Test Cases**:

```
✓ signIn() opens Google popup
✓ On successful auth, token stored in sessionStorage
✓ isAuthenticated() returns true after sign-in
✓ isAuthenticated() returns false before sign-in
✓ getAccessToken() returns token string
✓ getUser() returns { email, name }
✓ Token expiry is calculated correctly
✓ signOut() clears sessionStorage
✓ isTokenExpired() returns true for expired token
✓ refreshToken() updates token before expiry
✓ On network error, gracefully handle (don't crash)
✓ On user cancel, resolve to null (not throw)
✓ Multiple sign-in calls don't create duplicate popups
```

**Mocking**:
- Mock global `google` object (from gis library)
- Mock `sessionStorage`
- Mock `fetch` for token endpoint

---

## Phase 2: Google Sheets API Service

**Objective**: Wrapper for Google Sheets API operations (check collaborators, upload data).

**Duration**: ~10-12 hours  
**Context Required**: Medium (Google Sheets API, HTTP requests)  
**Files Created**: `js/services/sheetsApiService.js`, `test/services/sheetsApiService.test.mjs`

### Task 2.1: Create Sheets API Service Structure

**File**: `js/services/sheetsApiService.js`

**Methods to export**:

```javascript
SheetsAPI.initialize(accessToken)              // Set auth token
SheetsAPI.getSpreadsheetMetadata(sheetId)      // Get sheet info + collaborators
SheetsAPI.checkIfCollaborator(sheetId, email)  // Boolean
SheetsAPI.getSheetValues(sheetId, range)       // Fetch cell values
SheetsAPI.appendRows(sheetId, values)          // Add rows to sheet
SheetsAPI.updateRows(sheetId, values)          // Update existing rows
SheetsAPI.uploadCSV(sheetId, csvData)          // Replace entire sheet data
```

**Dependencies**:
- `GoogleAuth` module (to get access token)
- Standard `fetch` API (no external library)

**Base Endpoint**: `https://sheets.googleapis.com/v4/spreadsheets`

**Required OAuth Scope**: `https://www.googleapis.com/auth/spreadsheets`

**Error Handling**:
- Log all HTTP errors with request details
- Return `{ success: false, error: "message" }` for failures
- Throw on authentication errors (token expired, unauthorized)
- Network timeouts: implement 30-second timeout

### Task 2.2: Extract Sheet ID from CSV URL

**Context**: Current profiles store CSV export URLs. Need to extract sheet ID.

**Sheet URL Patterns**:
```
CSV export URL: https://docs.google.com/spreadsheets/d/ABC123XYZ/gviz/tq?tqx=out:csv
Sheet ID:       ABC123XYZ (extract from /d/.../)

Normal sheet URL: https://docs.google.com/spreadsheets/d/ABC123XYZ/edit#gid=0
Sheet ID:        ABC123XYZ (same extraction)
```

**Function**:
```javascript
function extractSheetIdFromUrl(csvUrl) {
  // return sheet ID string, or null if invalid
}
```

**Validation**:
- Ensure URL contains `docs.google.com/spreadsheets/d/`
- Ensure ID is alphanumeric (no special chars)
- Return `null` for invalid URLs

### Task 2.3: Implement `getSpreadsheetMetadata()`

**API Call**: `GET /v4/spreadsheets/{sheetId}`

**Returns**:
```json
{
  "spreadsheetId": "ABC123XYZ",
  "properties": {
    "title": "Sacrament Program",
    "locale": "en_US",
    ...
  }
}
```

**Additional**: Fetch collaborators via Drive API (optional advanced feature; for now, assume we can determine from spreadsheet.properties)

**Note**: Google Sheets API's `spreadsheets.get()` requires the user to have at least Viewer access. Request with `fields=spreadsheetId,properties` to minimize response size.

### Task 2.4: Implement `checkIfCollaborator()`

**Logic**:
1. Call `getSpreadsheetMetadata(sheetId)`
2. Check `spreadsheetProperties` for owner/editors
3. Compare `GoogleAuth.getUser().email` to collaborators list
4. Return `true` if match, `false` otherwise

**Edge Cases**:
- User email might have different case (do case-insensitive compare)
- If metadata doesn't contain collaborators, conservative approach: `return false` (deny access)
- If API call fails: `throw` error (don't silently deny)

**Alternative** (if Google Sheets API doesn't provide collaborators easily):
- Could use Drive API's `permissions` endpoint
- For now, assume metadata provides this info; adjust if not available

### Task 2.5: Implement CSV Upload/Append

**Historical Context**: App currently uses public CSV export URLs (read-only).

**New Requirement**: Upload modified CSV back to Sheet.

**Two Approaches**:

**Option A: Append Rows** (Simpler)
- API: `POST /v4/spreadsheets/{sheetId}/values:append`
- Each edited row sent as new row
- Pro: Simple, no row-by-row tracking
- Con: Duplicates sheet data if not careful

**Option B: Clear & Replace** (Safer)
- API: `POST /v4/spreadsheets/{sheetId}/values:batchUpdate`
- Clear all data, write new CSV
- Pro: Guaranteed consistent state
- Con: All-or-nothing (can't recover if network fails mid-upload)

**Decision**: Use **Option B** (Clear & Replace) with validation

**Implementation**:

```javascript
async function uploadCSV(sheetId, csvData) {
  // 1. Validate csvData format (check headers, etc.)
  // 2. Parse CSV into 2D array (rows + columns)
  // 3. Call Sheets API:
  //    - DELETE all rows from Sheet1
  //    - APPEND new CSV data
  // 4. Return { success, sheetId, rowsWritten }
}
```

**API Call**:
```
POST /v4/spreadsheets/{sheetId}/values/Sheet1:clear
POST /v4/spreadsheets/{sheetId}/values/Sheet1:append
  Body: { values: [ ["key", "en", "es", "fr", "swa"], [...], [...] ] }
```

**Error Recovery**:
- If clear succeeds but append fails: sheet is empty (bad)
- Mitigation: Check sheet before upload, warn user
- Alternative: Use local backup copy for recovery

### Task 2.6: Create Unit Tests for Sheets API Service

**File**: `test/services/sheetsApiService.test.mjs`

**Test Cases**:

```
✓ extractSheetIdFromUrl() extracts ID correctly
✓ extractSheetIdFromUrl() rejects invalid URLs
✓ getSpreadsheetMetadata() makes correct API call
✓ getSpreadsheetMetadata() parses response
✓ checkIfCollaborator() returns true for collaborators
✓ checkIfCollaborator() returns false for non-collaborators
✓ checkIfCollaborator() is case-insensitive for email
✓ uploadCSV() calls clear then append
✓ uploadCSV() throws on validation error
✓ uploadCSV() returns row count
✓ On 401 Unauthorized: throw auth error
✓ On 403 Forbidden: throw permission error
✓ On network timeout: throw with timeout message
✓ On invalid CSV: return validation error
```

**Mocking**:
- Mock `fetch` for all API calls
- Mock `GoogleAuth.getAccessToken()`
- Mock `GoogleAuth.getUser()`

---

## Phase 3: Editor State Manager

**Objective**: In-memory state management for edited CSV data with IndexedDB persistence.

**Duration**: ~10-12 hours  
**Context Required**: Medium (IndexedDB, CSV parsing, state management)  
**Files Created**: `js/data/EditorStateManager.js`, `test/data/EditorStateManager.test.mjs`

### Task 3.1: Create EditorStateManager Structure

**File**: `js/data/EditorStateManager.js`

**Purpose**: Hold edited CSV data in memory, track changes, persist to IndexedDB.

**Internal Data Structure**:

```javascript
// Parsed CSV stored as:
{
  headers: ["key", "en", "es", "fr", "swa"],
  rows: {
    "unitName": {
      en: "Your Ward Name",
      es: "Nombre de Su Rama",
      fr: "Nom de Votre Branche",
      swa: "Jina la Kimanda Yako"
    },
    "speaker1": {
      en: "John Smith",
      es: "", // Empty = fallback to English
      fr: "",
      swa: ""
    },
    // ... more rows
  },
  // Track which fields have unsaved changes
  unsavedChanges: {
    "unitName": { en: true, es: false, fr: false, swa: false },
    "speaker1": { en: false, es: true, fr: false, swa: false },
  },
  // Metadata
  sheetId: "ABC123XYZ",
  createdAt: Date.now(),
  lastModified: Date.now()
}
```

**Class Methods**:

```javascript
class EditorStateManager {
  constructor(sheetId) {
    this.sheetId = sheetId;
    this.state = { /* as above */ };
  }

  async loadFromSheet(csvUrl) {
    // Fetch current CSV from sheet
    // Parse it into state.rows
    // Save to IndexedDB
  }

  getValue(key, language = "en") {
    // Return value for key + language
    // Fallback to English if empty
  }

  setValue(key, language, value) {
    // Update value, mark as changed
    // Don't save to DB yet (only on explicit save)
  }

  addRow(key, values = {}) {
    // Add new key with optional values
    // Mark as new/unsaved
  }

  deleteRow(key) {
    // Mark row for deletion
  }

  getUnsavedCount() {
    // Return number of changed fields
  }

  getChangedRows() {
    // Return only rows with unsaved changes
  }

  async validate() {
    // Check CSV structure, keys, hymn format
    // Return { valid: boolean, errors: [] }
  }

  toCSV() {
    // Generate CSV string ready for upload
    // Includes validation
  }

  async saveChanges(csvData) {
    // Save edited state to IndexedDB for session persistence
  }

  async discardChanges() {
    // Clear unsaved state, reload from sheet
  }

  async clear() {
    // Delete all editor data from IndexedDB
  }

  static async resume(sheetId) {
    // Check if previous session exists
    // Return EditorStateManager instance or null
  }
}
```

### Task 3.2: Implement CSV Parsing & Validation

**Requirement**: Parse Google Sheet CSV into structured data.

**CSV Format**:
```
key,en,es,fr,swa
unitName,Your Ward,Su Rama,Votre Branche,Kimanda Yako
speaker1,John Smith,Juan Garcia,Jean Dupont,Yohana Mto
openingHymn,62
CS 2,Accompaniment by Sister Smith
```

**Parsing Logic**:
1. Use existing `parseCSV()` from `js/utils/csv.js` as reference
2. Detect CSV format: simple (key, value) vs. multi-lang (key, en, es, fr, swa)
3. Extract headers row
4. Parse data rows into dictionary structure
5. Normalize language values (trim whitespace, handle quotes)

**Validation Rules** (Task 3.3):
1. **Required headers**: Must have "key" column
2. **Language columns**: "en", "es", "fr", "swa" (if multi-lang format)
3. **No duplicate keys**: Each key appears only once
4. **Hymn format**: If key ends with "Hymn":
   - Value must be number (e.g., `62`, `1001`)
   - OR `CS` + space + number + optional letter (e.g., `CS 2`, `CS 73a`)
5. **Required fields**: "key" must be non-empty, "en" must be non-empty (unless fallback)
6. **No XSS payload**: Sanitize values (reuse `sanitizeEntry()` from `js/sanitize.js`)

**Error Messages**:
```javascript
{
  errors: [
    { row: 2, column: "opening Hymn", message: "Invalid hymn format: must be number or CS{space}number" },
    { row: 5, column: "key", message: "Duplicate key: 'speaker1' already defined at row 3" },
    { row: "header", column: "es", message: "Missing required language column" }
  ]
}
```

### Task 3.3: Implement Hymn Format Validation

**Context**: Hymn fields can have special format:
- Regular: `62` (hymn number)
- Children's: `CS 2` (with space, can have letter like `CS 73a`)
- With note: `62|Sung by Primary` (pipe-separated annotation)

**Validation Function**:

```javascript
function validateHymnValue(value) {
  if (!value) return { valid: false, error: "Hymn value cannot be empty" };
  
  // Split on pipe to get hymn part
  const [hymnPart] = value.split("|");
  const hymn = hymnPart.trim();
  
  // Pattern: number OR "CS {number}{optional letter}"
  const hymnRegex = /^(\d{1,4}|CS [0-9]{1,4}[a-z]?)$/i;
  
  if (!hymnRegex.test(hymn)) {
    return {
      valid: false,
      error: `Invalid hymn: ${hymn}. Use format: "62" or "CS 2" or "CS 73a", optionally with "|Note"`
    };
  }
  
  return { valid: true };
}
```

**Hymn Lookup** (Optional Enhancement):
- Reference `js/data/hymnsLookup.js` to validate hymn numbers exist
- For now: just validate format (not whether hymn exists)
- Can add lookup validation in Phase 4

### Task 3.4: Implement IndexedDB Persistence

**Context**: Store editor state so user can reload page and resume editing.

**IndexedDB Store**: `editor._state`

**Schema**:
```javascript
// In js/data/db.js (existing Dexie setup)
// Add new store:
editor_state: "sheetId, createdAt" // Compound key
```

**Stored Data**:
```javascript
{
  id: "auto-generated",
  sheetId: "ABC123XYZ",
  createdAt: Date.now(),
  lastModified: Date.now(),
  expiresAt: createdAt + (24 * 60 * 60 * 1000), // 24h session
  state: { /* EditorStateManager.state */ },
  csvUrl: "https://docs.google.com/..."
}
```

**Methods**:

```javascript
async function saveSessionState(sheetId, state, csvUrl) {
  // Store to IndexedDB
  // Return saved object with ID
}

async function getSessionState(sheetId) {
  // Fetch from IndexedDB
  // Check if expired (24h)
  // Return state or null
}

async function deleteSessionState(sheetId) {
  // Remove from IndexedDB
}

async function resumeSession(sheetId) {
  // Check if session exists
  // Ask user: "Resume editing? X changes pending"
  // Return EditorStateManager with restored state or null
}
```

**Expiry Policy**: Sessions expire after 24 hours (paranoid safety).

### Task 3.5: Implement toCSV() & String Generation

**Requirement**: Convert in-memory state back to CSV string format suitable for upload.

**Function**:

```javascript
toCSV() {
  // 1. Build header: "key,en,es,fr,swa"
  // 2. For each row, quote fields with commas/newlines
  // 3. Handle fallback: if language cell empty, use English value
  // 4. Return as string ready for Sheets API
}

// Example output:
// key,en,es,fr,swa
// unitName,Your Ward,Su Rama,Votre Branche,Kimanda Yako
// speaker1,"Smith, John","García, Juan","Dupont, Jean","Mtu, Yohana"
// openingHymn,62
//
```

**CSV Quoting Rules**:
- Quote fields containing: comma, newline, quotes
- Escape quotes: `"` → `""`
- Leave other fields unquoted

**Reference**: Use logic from `js/utils/csv.js` as template.

### Task 3.6: Create Unit Tests

**File**: `test/data/EditorStateManager.test.mjs`

**Test Cases**:

```
✓ loadFromSheet() fetches and parses CSV correctly
✓ loadFromSheet() handles multi-language format
✓ loadFromSheet() handles simple key-value format
✓ getValue() returns correct value
✓ getValue() falls back to English if language empty
✓ setValue() updates value and marks unsaved
✓ addRow() adds new key with empty values
✓ deleteRow() marks row for deletion
✓ getUnsavedCount() returns correct count
✓ getChangedRows() returns only unsaved rows
✓ validate() rejects duplicate keys
✓ validate() rejects invalid hymn format
✓ validate() rejects duplicate hymn with "CS" prefix
✓ validate() catches empty key
✓ toCSV() generates valid CSV string
✓ toCSV() quotes fields with commas
✓ toCSV() includes all languages
✓ saveChanges() stores to IndexedDB
✓ resumeSession() restores previous state
✓ discardChanges() clears unsaved state
✓ Session expires after 24 hours
```

**Mocking**:
- Mock `fetch` for CSV download
- Mock IndexedDB via `fake-indexeddb`
- Mock `sanitizeEntry()`

---

## Phase 4: Editor UI Component

**Objective**: React-like component for editor form (scrollable list, key selector, language pills, input field).

**Duration**: ~12-14 hours  
**Context Required**: Medium-High (DOM manipulation, event handling, Bootstrap 5)  
**Files Created**: `js/components/SheetEditor.mjs`, `test/components/SheetEditor.test.mjs`

### Task 4.1: Design UI Structure & Components

**HTML Structure** (will be rendered by JavaScript):

```html
<div id="editor-main">
  <!-- Authentication Section -->
  <div id="auth-section">
    <button id="signin-btn" class="btn btn-primary">Sign in with Google</button>
  </div>

  <!-- Editor Section (hidden until auth) -->
  <div id="editor-section" style="display: none;">
    <!-- User Info -->
    <div class="editor-header">
      <span class="user-email">Logged in as: user@gmail.com</span>
      <button id="signout-btn" class="btn btn-sm btn-secondary">Sign out</button>
    </div>

    <!-- Key Selector & Language -->
    <div class="editor-controls">
      <div class="form-group">
        <label for="key-select">Key:</label>
        <select id="key-select" class="form-control">
          <option value="">-- Select a key --</option>
          <option value="unitName">unitName</option>
          <option value="speaker1">speaker1</option>
          <!-- ... all keys ... -->
        </select>
      </div>

      <!-- Language Pills (Bootstrap 5 buttons) -->
      <div class="language-buttons mt-3">
        <label>Language:</label>
        <div class="btn-group" role="group">
          <input type="radio" class="btn-check" name="language" id="lang-en" value="en" checked>
          <label class="btn btn-outline-primary" for="lang-en">English</label>
          
          <input type="radio" class="btn-check" name="language" id="lang-es" value="es">
          <label class="btn btn-outline-primary" for="lang-es">Español</label>
          
          <input type="radio" class="btn-check" name="language" id="lang-fr" value="fr">
          <label class="btn btn-outline-primary" for="lang-fr">Français</label>
          
          <input type="radio" class="btn-check" name="language" id="lang-swa" value="swa">
          <label class="btn btn-outline-primary" for="lang-swa">Kiswahili</label>
        </div>
      </div>
    </div>

    <!-- Value Input -->
    <div class="form-group mt-4">
      <label for="value-input">Value:</label>
      <textarea id="value-input" class="form-control" rows="4" placeholder="Enter value..."></textarea>
      
      <!-- Hymn Checkbox (shown for *Hymn keys) -->
      <div id="hymn-options" class="mt-2" style="display: none;">
        <div class="form-check">
          <input type="checkbox" class="form-check-input" id="hymn-children" value="children">
          <label class="form-check-label" for="hymn-children">
            Children's Song (prepends "CS ")
          </label>
        </div>
      </div>
    </div>

    <!-- Unsaved Indicator -->
    <div id="unsaved-indicator" class="alert alert-warning mt-3" style="display: none;">
      <strong>⚠ Unsaved Changes:</strong> <span id="unsaved-count">0</span> fields modified
    </div>

    <!-- Action Buttons -->
    <div class="editor-actions mt-4">
      <button id="add-row-btn" class="btn btn-success">➕ Add New Field</button>
      <button id="save-btn" class="btn btn-primary">✓ Save Changes</button>
      <button id="discard-btn" class="btn btn-secondary">Clear Changes</button>
    </div>
  </div>

  <!-- Viewer-Only Section -->
  <div id="viewer-only-section" style="display: none;">
    <div class="alert alert-info">
      <h4>Viewer</h4>
      <p>You don't have permission to edit this sheet. Only collaborators can edit.</p>
    </div>
  </div>
</div>
```

### Task 4.2: Create SheetEditor Component Class

**File**: `js/components/SheetEditor.mjs`

**Class Structure**:

```javascript
export class SheetEditor {
  constructor(containerSelector, editorStateManager, options = {}) {
    this.container = document.querySelector(containerSelector);
    this.stateManager = editorStateManager;
    this.currentKey = null;
    this.currentLanguage = "en";
    this.isEditing = false;
    
    this.options = {
      onSave: null,    // Callback when Save clicked
      onAddRow: null,  // Callback when Add Row clicked
      ...options
    };
    
    this.eventHandlers = {};
  }

  async render() {
    // Build HTML structure above
    // Attach event listeners
    // Load keys into dropdown
  }

  on(eventName, callback) {
    // event.addListener pattern
    // Supported events: 'value-changed', 'key-selected', 'language-changed', 'save', 'add-row'
  }

  setValue(key, language, value) {
    // Update input field to show value
    // Update unsaved indicator
  }

  setKey(key) {
    // Change which key is being edited
    // Update select dropdown
    // Load value for new key
    // Show/hide hymn checkbox
  }

  setLanguage(language) {
    // Change selected language
    // Load value for new language
  }

  updateKeyList(keys) {
    // Refresh dropdown with new keys (after adding row)
  }

  showUnsavedIndicator(count) {
    // Show/hide and update count
  }

  setLoading(isLoading) {
    // Disable buttons while saving
    // Show spinner
  }

  showError(message) {
    // Toast/alert with error message
  }

  showSuccess(message) {
    // Toast/alert with success message
  }

  destroy() {
    // Clean up event listeners
  }
}
```

### Task 4.3: Implement Event Handlers & DOM Updates

**Event Handlers to Attach**:

1. **Key Selection** (`#key-select` change)
   - Emit `key-selected` event with new key
   - Load value from EditorStateManager
   - Show/hide hymn options
   - Update language pills

2. **Language Selection** (radio buttons)
   - Emit `language-changed` event
   - Load value for selected language from EditorStateManager
   - Update input field

3. **Value Input Change** (`#value-input` input)
   - Emit `value-changed` { key, language, value } event
   - Update EditorStateManager
   - Mark as unsaved
   - Show unsaved indicator

4. **Hymn Children's Checkbox** (`#hymn-children` change)
   - If checked: prepend "CS " to value
   - If unchecked: remove "CS " prefix
   - Emit `value-changed` event

5. **Add Row Button** (`#add-row-btn` click)
   - Emit `add-row` event
   - Prompt user for new key name
   - Validate key doesn't exist
   - Add to EditorStateManager
   - Refresh key dropdown
   - Select new key

6. **Save Button** (`#save-btn` click)
   - Emit `save` event with all changes
   - Disable buttons, show loading
   - Wait for parent to validate & upload
   - On success: clear unsaved indicator

7. **Discard Button** (`#discard-btn` click)
   - Ask for confirmation
   - Clear all unsaved changes
   - Reload values from EditorStateManager
   - Hide unsaved indicator

### Task 4.4: Implement Hymn Field Logic

**Hymn Detection**: If key ends with "Hymn" (case-insensitive):
- Show checkbox: "Children's Song (prepends 'CS ')"
- When checkbox checked: ensure value starts with "CS "
- When checkbox unchecked: remove "CS " prefix

**Examples**:
- User enters "2" + checks "Children's Song" → value becomes "CS 2"
- User enters "CS 2" + unchecks box → value becomes "2"
- User enters "CS 73a" + can check/uncheck
- If user manually types "CS 2": checkbox auto-checks

**Special Case**: Hymn value might include note (pipe-separated):
- "62|Sung by choir" → can edit "62" part, keep "|Sung by choir"
- Children's logic applies to hymn number part only

### Task 4.5: Implement Unsaved Indicator

**Requirements**:
- Show alert box when any field modified
- Display count of unsaved fields
- Update in real-time
- Update on Add Row
- Clear on Save or Discard

**HTML**:
```html
<div id="unsaved-indicator" class="alert alert-warning" style="display: none;">
  <strong>⚠ Unsaved Changes:</strong> <span id="unsaved-count">0</span> fields modified
</div>
```

**Logic**:
1. EditorStateManager tracks unsavedChanges
2. SheetEditor calls `stateManager.getUnsavedCount()`
3. Update DOM to show/hide indicator
4. Listen for `value-changed` events to update count

### Task 4.6: Style with Bootstrap 5

**CSS Considerations**:
- Use Bootstrap 5 CDN in `editor.html`
- Language pills: use Bootstrap btn-group + btn-check pattern
- Form layout: use form-control, form-group classes
- Validation messages: use alert classes
- Loading state: disable buttons, show spinner

**Custom CSS** (minimal):
```css
#editor-main {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid #ccc;
}

.language-buttons .btn-group {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

#value-input {
  min-height: 100px;
}

.editor-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
```

### Task 4.7: Create Unit Tests

**File**: `test/components/SheetEditor.test.mjs`

**Test Approach**: Test DOM updates and event emissions (mock DOM elements)

**Test Cases**:

```
✓ render() creates HTML structure
✓ render() populates key dropdown
✓ Key selection updates shown value
✓ Language selection changes input field
✓ Value input emits 'value-changed' event
✓ Unsaved indicator shows on value change
✓ Unsaved count increases/decreases
✓ Add Row button opens dialog for key name
✓ Add Row validates key doesn't exist
✓ Hymn-related keys show children's checkbox
✓ Hymn checkbox checked: prepends "CS "
✓ Hymn checkbox unchecked: removes "CS "
✓ Save button emits 'save' event
✓ Save button disables during save
✓ Discard button asks for confirmation
✓ Discard button clears unsaved state
✓ Error message displays toast
✓ Success message displays toast
✓ destroy() cleans up event listeners
✓ Multiple language changes tracked
✓ Pipe-separated notes preserved in hymn values
```

**Mocking**:
- Mock DOM elements using jsdom
- Mock EditorStateManager methods
- Mock window.alert/confirm
- Test event emissions via custom event listeners

---

## Phase 5: Editor Page & Navigation

**Objective**: Create `editor.html` page and integrate OAuth + Editor UI. Add navigation from main app.

**Duration**: ~10-12 hours  
**Context Required**: Medium (HTML structure, OAuth flow, navigation)  
**Files Created**: `editor.html`, `js/editor.js`, `test/editor.test.mjs`

### Task 5.1: Create editor.html Page

**File**: `editor.html`

**Structure**: Mirror `index.html` but with editor-specific content

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description
```


## License: unknown
https://github.com/wayou/wayou.github.io/blob/5d2190ff8b5d0b67b64f70ccbb23eab30b8d56b2/_posts/2019-06-03-JavaScript%20%E5%AE%9E%E7%8E%B0%E9%A1%B5%E9%9D%A2%E4%B8%AD%E5%BD%95%E9%9F%B3%E5%8A%9F%E8%83%BD.md

```
I'll provide you with the comprehensive plan as a detailed document that you can save. Since I don't have file writing tools available, I'll present the complete plan in a code block that you can save directly to `./docs/FEATURE_CMS_EDIT.md`:

```markdown
# Feature Plan: CMS Sheet Editor (Google Sheets OAuth + Form UI)

**Version**: 1.0  
**Last Updated**: March 10, 2026  
**Status**: Ready for Implementation  
**Estimated Duration**: 6 phases, ~100-120 hours total (can parallelize some tasks)

---

## 📋 Table of Contents

1. [Overview & Architecture](#overview--architecture)
2. [Design Decisions](#design-decisions)
3. [Technical Architecture](#technical-architecture)
4. [Phase 1: OAuth Module](#phase-1-oauth-module)
5. [Phase 2: Google Sheets API Service](#phase-2-google-sheets-api-service)
6. [Phase 3: Editor State Manager](#phase-3-editor-state-manager)
7. [Phase 4: Editor UI Component](#phase-4-editor-ui-component)
8. [Phase 5: Editor Page & Navigation](#phase-5-editor-page--navigation)
9. [Phase 6: Tests & Deployment](#phase-6-tests--deployment)
10. [Data Structures & Interfaces](#data-structures--interfaces)
11. [Testing Specifications](#testing-specifications)
12. [Integration Checklist](#integration-checklist)
13. [Risk Mitigation](#risk-mitigation)

---

## Overview & Architecture

### What We're Building

A **Google Sheets CMS interface** that allows authorized editors to modify meeting program data directly in the app. Features:

- **Google OAuth 2.0 authentication** (PKCE flow, client-side only)
- **Collaborator verification** against the currently-loaded Google Sheet
- **Form-based UI** with scrollable key/value pairs, language selectors, validation
- **Local state management** with IndexedDB persistence for in-progress edits
- **Batch CSV upload** back to Google Sheets (not row-by-row)
- **Graceful "Viewer Only" fallback** for non-editors
- **No backend required** (GitHub Pages compatible)

### Why This Approach?

| Requirement | Solution | Why Not Others |
|---|---|---|
| **Free hosting** | GitHub Pages (static) | Avoiding backend costs ✅ |
| **No tech accounts** | Google OAuth (user's own account) | Users already have Google accounts |
| **Edit protection** | OAuth + Collaborators check | Verified against actual Sheet permissions |
| **Offline-ready** | IndexedDB state storage | Can edit offline, upload when online |
| **Easy CSV export** | CSV validation + upload | Reversible, debuggable, portable |
| **Non-tech friendly** | Form UI with pills/dropdowns | Visual, clear, no CSV syntax needed |

---

## Design Decisions

### 1. Authentication: Google OAuth 2.0 with PKCE

**Decision**: Use Google Identity Services (gis) library for browser-based OAuth authentication.

**Why**:
- No backend needed (PKCE flow works entirely client-side)
- Users sign in with account they already have
- Provides access token to call Google Sheets API
- Can verify user is a Sheet collaborator
- Token stored in `sessionStorage` (cleared on browser close) for security

**Implementation**:
- User navigates to `/editor.html`
- Click "Sign in with Google" button
- Google login popup appears
- After auth, token stored in `sessionStorage`
- App checks if user is collaborator on current sheet
- If yes: show editor; if no: show "Viewer Only"

### 2. Data Flow: Form UI + Batch Upload

**Decision**: Build form UI with field-by-field editing; upload all changes in one batch.

**Why**:
- Better UX than downloading/editing CSV locally
- Batch upload is safer than row-by-row API calls
- Can validate entire dataset before upload
- Less error-prone than incremental saves
- Users can edit multiple fields, review, then upload

**Data Lifecycle**:
1. Load current CSV from Sheet (via public export URL)
2. Parse into in-memory object: `{ key: { en, es, fr, swa } }`
3. Store in IndexedDB (survives page reload)
4. Editor modifies fields via form UI
5. On "Save": validate CSV, call Sheets API to append/update rows
6. After success: reload data, clear unsaved indicator

### 3. Permission Model: Collaborators Check

**Decision**: Check if authenticated user is a collaborator on the current Sheet.

**Why**:
- Tied to actual Sheet permissions (most secure)
- No manual allow-lists to maintain
- User only edits sheets they have permission for
- Leverages existing Google Sheet sharing

**Flow**:
1. Get sheet ID from current profile's CSV URL
2. After OAuth sign-in, call `spreadsheets.get()` to fetch collaborators
3. Compare user's email to collaborators list
4. Show/hide editor UI accordingly

### 4. UI Pattern: Scrollable Form with Language Pills

**Decision**: Single scrollable list of all keys, with key selector, language buttons, single input field.

**Why**:
- One key at a time prevents overwhelming users
- Language pills (Bootstrap 5) are clear and visual
- Single input field reduces UI complexity
- Scrollable list shows all available fields
- Matches your original spec exactly

**Form Structure**:
```
[Sign in / Logged in as: user@gmail.com] [Sign out]

Key Dropdown: [speaker1 ▼]
Language Pills: [EN] [ES] [FR] [SWA]
Input Field: [textarea with current value]
Add Row ➕ | Save Changes ✓

Unsaved: 3 changes pending
```

### 5. State Persistence: IndexedDB + Session

**Decision**: Keep edited data in IndexedDB during session; clear on sign-out.

**Why**:
- Survives page reload/accidental close
- User can ask "Resume editing?" on reload
- Keeps edits local until upload
- Session-based (not long-term storage)
- Encrypted in browser's secure storage

---

## Technical Architecture

### High-Level Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    editor.html                              │
│         (New page, mirrors index.html structure)             │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    js/editor.js                              │
│  (Orchestrator: loads profiles, checks auth, renders UI)    │
└─────────────────────────────────────────────────────────────┘
                            │
                ┌───────────┼───────────┐
                ▼           ▼           ▼
         ┌──────────┐ ┌──────────┐ ┌──────────┐
         │googleAuth│ │sheetsApi │ │editorState│
         │   .js    │ │Service.js│ │Manager.js │
         └──────────┘ └──────────┘ └──────────┘
                │           │           │
                └───────────┼───────────┘
                            │
                            ▼
         ┌──────────────────────────────────┐
         │  js/components/SheetEditor.mjs   │
         │        (UI Component)            │
         └──────────────────────────────────┘
                            │
                            ▼
         ┌──────────────────────────────────┐
         │      IndexedDB (Dexie)           │
         │   (editor._state store)          │
         └──────────────────────────────────┘
```

### File Organization

```
js/
├── auth/
│   └── googleAuth.js               [NEW] OAuth 2.0 module
├── services/
│   └── sheetsApiService.js         [NEW] Google Sheets API calls
├── data/
│   └── EditorStateManager.js       [NEW] In-memory state + persistence
├── components/
│   └── SheetEditor.mjs             [NEW] Form UI component
├── editor.js                        [NEW] Editor page entry point
└── [existing modules unchanged]

editor.html                          [NEW] Editor page

test/
├── auth/
│   └── googleAuth.test.mjs         [NEW] Auth tests
├── services/
│   └── sheetsApiService.test.mjs   [NEW] API service tests
├── data/
│   └── EditorStateManager.test.mjs [NEW] State manager tests
├── components/
│   └── SheetEditor.test.mjs        [NEW] UI component tests
└── editor.test.mjs                 [NEW] Integration tests

e2e/
├── scenarios/
│   └── editor.spec.js              [NEW] E2E scenarios

docs/
├── FEATURE_CMS_EDIT.md             [THIS FILE]
└── [existing docs unchanged]
```

### Dependencies

**External Libraries** (already in package.json):
- `dexie` v4.3.0 — IndexedDB abstraction (already used)
- Google Identity Services — Added via CDN script tag in editor.html

**No new npm dependencies**

---

## Phase 1: OAuth Module

**Objective**: Implement Google OAuth 2.0 authentication with PKCE flow.

**Duration**: ~8-10 hours  
**Context Required**: Medium (auth patterns, Google API basics)  
**Files Created**: `js/auth/googleAuth.js`, `test/auth/googleAuth.test.mjs`

### Task 1.1: Create googleAuth Module Structure

**File**: `js/auth/googleAuth.js`

Create a module that:
- Exports an object: `GoogleAuth` with methods listed below
- Initializes Google Identity Services (gis) on load
- NO external dependencies except gis library (loaded via CDN in editor.html)

**Methods to implement**:

```javascript
GoogleAuth.initialize(clientId, redirectUri)
GoogleAuth.signIn()                    // Opens Google login popup
GoogleAuth.signOut()                   // Clears token, closes session
GoogleAuth.getAccessToken()            // Returns token from sessionStorage
GoogleAuth.isAuthenticated()           // Returns boolean
GoogleAuth.getUser()                   // Returns { email, name }
GoogleAuth.onTokenExpire(callback)     // Handles token refresh
```

**Session Storage Keys**:
- `gm_access_token` — OAuth access token
- `gm_user_email` — User's email
- `gm_token_expires` — Token expiry timestamp (ms)

**Error Handling**:
- If user cancels login: resolve to `null` (don't throw)
- If token expires: auto-refresh or trigger re-auth
- Log all errors to `[AUTH]` prefix

**Notes**:
- Use `sessionStorage` only (cleared on browser close)
- Never use `localStorage` for tokens
- Implement token expiry check before API calls
- Google sign-out should clear all stored data

### Task 1.2: Handle PKCE Flow (Authorization Code)

**Context**: PKCE (Proof Key for Code Exchange) is how OAuth 2.0 works in browsers without backend.

**Implementation Details**:

1. Generate `code_verifier` (43-128 char random string)
2. Hash it to `code_challenge` (SHA-256)
3. Send user to Google auth endpoint with `code_challenge`
4. User grants permission
5. Google redirects back with authorization `code`
6. Exchange `code` + `code_verifier` for access token
7. Store token in `sessionStorage`

**Library**: Use `google-gsi` (Google Identity Services)
- Already available via CDN: `https://accounts.google.com/gsi/client`
- Handles PKCE automatically
- Simpler to use than raw OAuth

**Code Flow**:
```javascript
// In googleAuth.js
function generatePKCEPair() {
  // Generate random code_verifier
  // SHA-256 hash to code_challenge
  // Return { verifier, challenge }
}

async function exchangeCodeForToken(code, codeVerifier) {
  // POST to Google token endpoint
  // Return access token
}
```

**Testing**:
- Mock `sessionStorage`
- Mock Google gsi library
- Test token generation/storage
- Test error cases (network, user cancel)

### Task 1.3: Implement Token Refresh & Expiry

**Requirement**: Access tokens expire in ~1 hour. Handle gracefully.

**Implementation**:
1. Store token `expires_at` timestamp when token received
2. Before API calls: check if `Date.now() > expires_at`
3. If expired: trigger refresh flow
4. If refresh fails: sign out and require re-auth

**Methods**:
```javascript
GoogleAuth.isTokenExpired()
GoogleAuth.refreshToken()
GoogleAuth.onTokenExpire(callback)  // Register handler
```

**Edge Case**: If user's Google session has ended, refresh will fail. Show "Please sign in again" message.

### Task 1.4: Create Unit Tests for Auth

**File**: `test/auth/googleAuth.test.mjs`

**Test Cases**:

```
✓ signIn() opens Google popup
✓ On successful auth, token stored in sessionStorage
✓ isAuthenticated() returns true after sign-in
✓ isAuthenticated() returns false before sign-in
✓ getAccessToken() returns token string
✓ getUser() returns { email, name }
✓ Token expiry is calculated correctly
✓ signOut() clears sessionStorage
✓ isTokenExpired() returns true for expired token
✓ refreshToken() updates token before expiry
✓ On network error, gracefully handle (don't crash)
✓ On user cancel, resolve to null (not throw)
✓ Multiple sign-in calls don't create duplicate popups
```

**Mocking**:
- Mock global `google` object (from gis library)
- Mock `sessionStorage`
- Mock `fetch` for token endpoint

---

## Phase 2: Google Sheets API Service

**Objective**: Wrapper for Google Sheets API operations (check collaborators, upload data).

**Duration**: ~10-12 hours  
**Context Required**: Medium (Google Sheets API, HTTP requests)  
**Files Created**: `js/services/sheetsApiService.js`, `test/services/sheetsApiService.test.mjs`

### Task 2.1: Create Sheets API Service Structure

**File**: `js/services/sheetsApiService.js`

**Methods to export**:

```javascript
SheetsAPI.initialize(accessToken)              // Set auth token
SheetsAPI.getSpreadsheetMetadata(sheetId)      // Get sheet info + collaborators
SheetsAPI.checkIfCollaborator(sheetId, email)  // Boolean
SheetsAPI.getSheetValues(sheetId, range)       // Fetch cell values
SheetsAPI.appendRows(sheetId, values)          // Add rows to sheet
SheetsAPI.updateRows(sheetId, values)          // Update existing rows
SheetsAPI.uploadCSV(sheetId, csvData)          // Replace entire sheet data
```

**Dependencies**:
- `GoogleAuth` module (to get access token)
- Standard `fetch` API (no external library)

**Base Endpoint**: `https://sheets.googleapis.com/v4/spreadsheets`

**Required OAuth Scope**: `https://www.googleapis.com/auth/spreadsheets`

**Error Handling**:
- Log all HTTP errors with request details
- Return `{ success: false, error: "message" }` for failures
- Throw on authentication errors (token expired, unauthorized)
- Network timeouts: implement 30-second timeout

### Task 2.2: Extract Sheet ID from CSV URL

**Context**: Current profiles store CSV export URLs. Need to extract sheet ID.

**Sheet URL Patterns**:
```
CSV export URL: https://docs.google.com/spreadsheets/d/ABC123XYZ/gviz/tq?tqx=out:csv
Sheet ID:       ABC123XYZ (extract from /d/.../)

Normal sheet URL: https://docs.google.com/spreadsheets/d/ABC123XYZ/edit#gid=0
Sheet ID:        ABC123XYZ (same extraction)
```

**Function**:
```javascript
function extractSheetIdFromUrl(csvUrl) {
  // return sheet ID string, or null if invalid
}
```

**Validation**:
- Ensure URL contains `docs.google.com/spreadsheets/d/`
- Ensure ID is alphanumeric (no special chars)
- Return `null` for invalid URLs

### Task 2.3: Implement `getSpreadsheetMetadata()`

**API Call**: `GET /v4/spreadsheets/{sheetId}`

**Returns**:
```json
{
  "spreadsheetId": "ABC123XYZ",
  "properties": {
    "title": "Sacrament Program",
    "locale": "en_US",
    ...
  }
}
```

**Additional**: Fetch collaborators via Drive API (optional advanced feature; for now, assume we can determine from spreadsheet.properties)

**Note**: Google Sheets API's `spreadsheets.get()` requires the user to have at least Viewer access. Request with `fields=spreadsheetId,properties` to minimize response size.

### Task 2.4: Implement `checkIfCollaborator()`

**Logic**:
1. Call `getSpreadsheetMetadata(sheetId)`
2. Check `spreadsheetProperties` for owner/editors
3. Compare `GoogleAuth.getUser().email` to collaborators list
4. Return `true` if match, `false` otherwise

**Edge Cases**:
- User email might have different case (do case-insensitive compare)
- If metadata doesn't contain collaborators, conservative approach: `return false` (deny access)
- If API call fails: `throw` error (don't silently deny)

**Alternative** (if Google Sheets API doesn't provide collaborators easily):
- Could use Drive API's `permissions` endpoint
- For now, assume metadata provides this info; adjust if not available

### Task 2.5: Implement CSV Upload/Append

**Historical Context**: App currently uses public CSV export URLs (read-only).

**New Requirement**: Upload modified CSV back to Sheet.

**Two Approaches**:

**Option A: Append Rows** (Simpler)
- API: `POST /v4/spreadsheets/{sheetId}/values:append`
- Each edited row sent as new row
- Pro: Simple, no row-by-row tracking
- Con: Duplicates sheet data if not careful

**Option B: Clear & Replace** (Safer)
- API: `POST /v4/spreadsheets/{sheetId}/values:batchUpdate`
- Clear all data, write new CSV
- Pro: Guaranteed consistent state
- Con: All-or-nothing (can't recover if network fails mid-upload)

**Decision**: Use **Option B** (Clear & Replace) with validation

**Implementation**:

```javascript
async function uploadCSV(sheetId, csvData) {
  // 1. Validate csvData format (check headers, etc.)
  // 2. Parse CSV into 2D array (rows + columns)
  // 3. Call Sheets API:
  //    - DELETE all rows from Sheet1
  //    - APPEND new CSV data
  // 4. Return { success, sheetId, rowsWritten }
}
```

**API Call**:
```
POST /v4/spreadsheets/{sheetId}/values/Sheet1:clear
POST /v4/spreadsheets/{sheetId}/values/Sheet1:append
  Body: { values: [ ["key", "en", "es", "fr", "swa"], [...], [...] ] }
```

**Error Recovery**:
- If clear succeeds but append fails: sheet is empty (bad)
- Mitigation: Check sheet before upload, warn user
- Alternative: Use local backup copy for recovery

### Task 2.6: Create Unit Tests for Sheets API Service

**File**: `test/services/sheetsApiService.test.mjs`

**Test Cases**:

```
✓ extractSheetIdFromUrl() extracts ID correctly
✓ extractSheetIdFromUrl() rejects invalid URLs
✓ getSpreadsheetMetadata() makes correct API call
✓ getSpreadsheetMetadata() parses response
✓ checkIfCollaborator() returns true for collaborators
✓ checkIfCollaborator() returns false for non-collaborators
✓ checkIfCollaborator() is case-insensitive for email
✓ uploadCSV() calls clear then append
✓ uploadCSV() throws on validation error
✓ uploadCSV() returns row count
✓ On 401 Unauthorized: throw auth error
✓ On 403 Forbidden: throw permission error
✓ On network timeout: throw with timeout message
✓ On invalid CSV: return validation error
```

**Mocking**:
- Mock `fetch` for all API calls
- Mock `GoogleAuth.getAccessToken()`
- Mock `GoogleAuth.getUser()`

---

## Phase 3: Editor State Manager

**Objective**: In-memory state management for edited CSV data with IndexedDB persistence.

**Duration**: ~10-12 hours  
**Context Required**: Medium (IndexedDB, CSV parsing, state management)  
**Files Created**: `js/data/EditorStateManager.js`, `test/data/EditorStateManager.test.mjs`

### Task 3.1: Create EditorStateManager Structure

**File**: `js/data/EditorStateManager.js`

**Purpose**: Hold edited CSV data in memory, track changes, persist to IndexedDB.

**Internal Data Structure**:

```javascript
// Parsed CSV stored as:
{
  headers: ["key", "en", "es", "fr", "swa"],
  rows: {
    "unitName": {
      en: "Your Ward Name",
      es: "Nombre de Su Rama",
      fr: "Nom de Votre Branche",
      swa: "Jina la Kimanda Yako"
    },
    "speaker1": {
      en: "John Smith",
      es: "", // Empty = fallback to English
      fr: "",
      swa: ""
    },
    // ... more rows
  },
  // Track which fields have unsaved changes
  unsavedChanges: {
    "unitName": { en: true, es: false, fr: false, swa: false },
    "speaker1": { en: false, es: true, fr: false, swa: false },
  },
  // Metadata
  sheetId: "ABC123XYZ",
  createdAt: Date.now(),
  lastModified: Date.now()
}
```

**Class Methods**:

```javascript
class EditorStateManager {
  constructor(sheetId) {
    this.sheetId = sheetId;
    this.state = { /* as above */ };
  }

  async loadFromSheet(csvUrl) {
    // Fetch current CSV from sheet
    // Parse it into state.rows
    // Save to IndexedDB
  }

  getValue(key, language = "en") {
    // Return value for key + language
    // Fallback to English if empty
  }

  setValue(key, language, value) {
    // Update value, mark as changed
    // Don't save to DB yet (only on explicit save)
  }

  addRow(key, values = {}) {
    // Add new key with optional values
    // Mark as new/unsaved
  }

  deleteRow(key) {
    // Mark row for deletion
  }

  getUnsavedCount() {
    // Return number of changed fields
  }

  getChangedRows() {
    // Return only rows with unsaved changes
  }

  async validate() {
    // Check CSV structure, keys, hymn format
    // Return { valid: boolean, errors: [] }
  }

  toCSV() {
    // Generate CSV string ready for upload
    // Includes validation
  }

  async saveChanges(csvData) {
    // Save edited state to IndexedDB for session persistence
  }

  async discardChanges() {
    // Clear unsaved state, reload from sheet
  }

  async clear() {
    // Delete all editor data from IndexedDB
  }

  static async resume(sheetId) {
    // Check if previous session exists
    // Return EditorStateManager instance or null
  }
}
```

### Task 3.2: Implement CSV Parsing & Validation

**Requirement**: Parse Google Sheet CSV into structured data.

**CSV Format**:
```
key,en,es,fr,swa
unitName,Your Ward,Su Rama,Votre Branche,Kimanda Yako
speaker1,John Smith,Juan Garcia,Jean Dupont,Yohana Mto
openingHymn,62
CS 2,Accompaniment by Sister Smith
```

**Parsing Logic**:
1. Use existing `parseCSV()` from `js/utils/csv.js` as reference
2. Detect CSV format: simple (key, value) vs. multi-lang (key, en, es, fr, swa)
3. Extract headers row
4. Parse data rows into dictionary structure
5. Normalize language values (trim whitespace, handle quotes)

**Validation Rules** (Task 3.3):
1. **Required headers**: Must have "key" column
2. **Language columns**: "en", "es", "fr", "swa" (if multi-lang format)
3. **No duplicate keys**: Each key appears only once
4. **Hymn format**: If key ends with "Hymn":
   - Value must be number (e.g., `62`, `1001`)
   - OR `CS` + space + number + optional letter (e.g., `CS 2`, `CS 73a`)
5. **Required fields**: "key" must be non-empty, "en" must be non-empty (unless fallback)
6. **No XSS payload**: Sanitize values (reuse `sanitizeEntry()` from `js/sanitize.js`)

**Error Messages**:
```javascript
{
  errors: [
    { row: 2, column: "opening Hymn", message: "Invalid hymn format: must be number or CS{space}number" },
    { row: 5, column: "key", message: "Duplicate key: 'speaker1' already defined at row 3" },
    { row: "header", column: "es", message: "Missing required language column" }
  ]
}
```

### Task 3.3: Implement Hymn Format Validation

**Context**: Hymn fields can have special format:
- Regular: `62` (hymn number)
- Children's: `CS 2` (with space, can have letter like `CS 73a`)
- With note: `62|Sung by Primary` (pipe-separated annotation)

**Validation Function**:

```javascript
function validateHymnValue(value) {
  if (!value) return { valid: false, error: "Hymn value cannot be empty" };
  
  // Split on pipe to get hymn part
  const [hymnPart] = value.split("|");
  const hymn = hymnPart.trim();
  
  // Pattern: number OR "CS {number}{optional letter}"
  const hymnRegex = /^(\d{1,4}|CS [0-9]{1,4}[a-z]?)$/i;
  
  if (!hymnRegex.test(hymn)) {
    return {
      valid: false,
      error: `Invalid hymn: ${hymn}. Use format: "62" or "CS 2" or "CS 73a", optionally with "|Note"`
    };
  }
  
  return { valid: true };
}
```

**Hymn Lookup** (Optional Enhancement):
- Reference `js/data/hymnsLookup.js` to validate hymn numbers exist
- For now: just validate format (not whether hymn exists)
- Can add lookup validation in Phase 4

### Task 3.4: Implement IndexedDB Persistence

**Context**: Store editor state so user can reload page and resume editing.

**IndexedDB Store**: `editor._state`

**Schema**:
```javascript
// In js/data/db.js (existing Dexie setup)
// Add new store:
editor_state: "sheetId, createdAt" // Compound key
```

**Stored Data**:
```javascript
{
  id: "auto-generated",
  sheetId: "ABC123XYZ",
  createdAt: Date.now(),
  lastModified: Date.now(),
  expiresAt: createdAt + (24 * 60 * 60 * 1000), // 24h session
  state: { /* EditorStateManager.state */ },
  csvUrl: "https://docs.google.com/..."
}
```

**Methods**:

```javascript
async function saveSessionState(sheetId, state, csvUrl) {
  // Store to IndexedDB
  // Return saved object with ID
}

async function getSessionState(sheetId) {
  // Fetch from IndexedDB
  // Check if expired (24h)
  // Return state or null
}

async function deleteSessionState(sheetId) {
  // Remove from IndexedDB
}

async function resumeSession(sheetId) {
  // Check if session exists
  // Ask user: "Resume editing? X changes pending"
  // Return EditorStateManager with restored state or null
}
```

**Expiry Policy**: Sessions expire after 24 hours (paranoid safety).

### Task 3.5: Implement toCSV() & String Generation

**Requirement**: Convert in-memory state back to CSV string format suitable for upload.

**Function**:

```javascript
toCSV() {
  // 1. Build header: "key,en,es,fr,swa"
  // 2. For each row, quote fields with commas/newlines
  // 3. Handle fallback: if language cell empty, use English value
  // 4. Return as string ready for Sheets API
}

// Example output:
// key,en,es,fr,swa
// unitName,Your Ward,Su Rama,Votre Branche,Kimanda Yako
// speaker1,"Smith, John","García, Juan","Dupont, Jean","Mtu, Yohana"
// openingHymn,62
//
```

**CSV Quoting Rules**:
- Quote fields containing: comma, newline, quotes
- Escape quotes: `"` → `""`
- Leave other fields unquoted

**Reference**: Use logic from `js/utils/csv.js` as template.

### Task 3.6: Create Unit Tests

**File**: `test/data/EditorStateManager.test.mjs`

**Test Cases**:

```
✓ loadFromSheet() fetches and parses CSV correctly
✓ loadFromSheet() handles multi-language format
✓ loadFromSheet() handles simple key-value format
✓ getValue() returns correct value
✓ getValue() falls back to English if language empty
✓ setValue() updates value and marks unsaved
✓ addRow() adds new key with empty values
✓ deleteRow() marks row for deletion
✓ getUnsavedCount() returns correct count
✓ getChangedRows() returns only unsaved rows
✓ validate() rejects duplicate keys
✓ validate() rejects invalid hymn format
✓ validate() rejects duplicate hymn with "CS" prefix
✓ validate() catches empty key
✓ toCSV() generates valid CSV string
✓ toCSV() quotes fields with commas
✓ toCSV() includes all languages
✓ saveChanges() stores to IndexedDB
✓ resumeSession() restores previous state
✓ discardChanges() clears unsaved state
✓ Session expires after 24 hours
```

**Mocking**:
- Mock `fetch` for CSV download
- Mock IndexedDB via `fake-indexeddb`
- Mock `sanitizeEntry()`

---

## Phase 4: Editor UI Component

**Objective**: React-like component for editor form (scrollable list, key selector, language pills, input field).

**Duration**: ~12-14 hours  
**Context Required**: Medium-High (DOM manipulation, event handling, Bootstrap 5)  
**Files Created**: `js/components/SheetEditor.mjs`, `test/components/SheetEditor.test.mjs`

### Task 4.1: Design UI Structure & Components

**HTML Structure** (will be rendered by JavaScript):

```html
<div id="editor-main">
  <!-- Authentication Section -->
  <div id="auth-section">
    <button id="signin-btn" class="btn btn-primary">Sign in with Google</button>
  </div>

  <!-- Editor Section (hidden until auth) -->
  <div id="editor-section" style="display: none;">
    <!-- User Info -->
    <div class="editor-header">
      <span class="user-email">Logged in as: user@gmail.com</span>
      <button id="signout-btn" class="btn btn-sm btn-secondary">Sign out</button>
    </div>

    <!-- Key Selector & Language -->
    <div class="editor-controls">
      <div class="form-group">
        <label for="key-select">Key:</label>
        <select id="key-select" class="form-control">
          <option value="">-- Select a key --</option>
          <option value="unitName">unitName</option>
          <option value="speaker1">speaker1</option>
          <!-- ... all keys ... -->
        </select>
      </div>

      <!-- Language Pills (Bootstrap 5 buttons) -->
      <div class="language-buttons mt-3">
        <label>Language:</label>
        <div class="btn-group" role="group">
          <input type="radio" class="btn-check" name="language" id="lang-en" value="en" checked>
          <label class="btn btn-outline-primary" for="lang-en">English</label>
          
          <input type="radio" class="btn-check" name="language" id="lang-es" value="es">
          <label class="btn btn-outline-primary" for="lang-es">Español</label>
          
          <input type="radio" class="btn-check" name="language" id="lang-fr" value="fr">
          <label class="btn btn-outline-primary" for="lang-fr">Français</label>
          
          <input type="radio" class="btn-check" name="language" id="lang-swa" value="swa">
          <label class="btn btn-outline-primary" for="lang-swa">Kiswahili</label>
        </div>
      </div>
    </div>

    <!-- Value Input -->
    <div class="form-group mt-4">
      <label for="value-input">Value:</label>
      <textarea id="value-input" class="form-control" rows="4" placeholder="Enter value..."></textarea>
      
      <!-- Hymn Checkbox (shown for *Hymn keys) -->
      <div id="hymn-options" class="mt-2" style="display: none;">
        <div class="form-check">
          <input type="checkbox" class="form-check-input" id="hymn-children" value="children">
          <label class="form-check-label" for="hymn-children">
            Children's Song (prepends "CS ")
          </label>
        </div>
      </div>
    </div>

    <!-- Unsaved Indicator -->
    <div id="unsaved-indicator" class="alert alert-warning mt-3" style="display: none;">
      <strong>⚠ Unsaved Changes:</strong> <span id="unsaved-count">0</span> fields modified
    </div>

    <!-- Action Buttons -->
    <div class="editor-actions mt-4">
      <button id="add-row-btn" class="btn btn-success">➕ Add New Field</button>
      <button id="save-btn" class="btn btn-primary">✓ Save Changes</button>
      <button id="discard-btn" class="btn btn-secondary">Clear Changes</button>
    </div>
  </div>

  <!-- Viewer-Only Section -->
  <div id="viewer-only-section" style="display: none;">
    <div class="alert alert-info">
      <h4>Viewer</h4>
      <p>You don't have permission to edit this sheet. Only collaborators can edit.</p>
    </div>
  </div>
</div>
```

### Task 4.2: Create SheetEditor Component Class

**File**: `js/components/SheetEditor.mjs`

**Class Structure**:

```javascript
export class SheetEditor {
  constructor(containerSelector, editorStateManager, options = {}) {
    this.container = document.querySelector(containerSelector);
    this.stateManager = editorStateManager;
    this.currentKey = null;
    this.currentLanguage = "en";
    this.isEditing = false;
    
    this.options = {
      onSave: null,    // Callback when Save clicked
      onAddRow: null,  // Callback when Add Row clicked
      ...options
    };
    
    this.eventHandlers = {};
  }

  async render() {
    // Build HTML structure above
    // Attach event listeners
    // Load keys into dropdown
  }

  on(eventName, callback) {
    // event.addListener pattern
    // Supported events: 'value-changed', 'key-selected', 'language-changed', 'save', 'add-row'
  }

  setValue(key, language, value) {
    // Update input field to show value
    // Update unsaved indicator
  }

  setKey(key) {
    // Change which key is being edited
    // Update select dropdown
    // Load value for new key
    // Show/hide hymn checkbox
  }

  setLanguage(language) {
    // Change selected language
    // Load value for new language
  }

  updateKeyList(keys) {
    // Refresh dropdown with new keys (after adding row)
  }

  showUnsavedIndicator(count) {
    // Show/hide and update count
  }

  setLoading(isLoading) {
    // Disable buttons while saving
    // Show spinner
  }

  showError(message) {
    // Toast/alert with error message
  }

  showSuccess(message) {
    // Toast/alert with success message
  }

  destroy() {
    // Clean up event listeners
  }
}
```

### Task 4.3: Implement Event Handlers & DOM Updates

**Event Handlers to Attach**:

1. **Key Selection** (`#key-select` change)
   - Emit `key-selected` event with new key
   - Load value from EditorStateManager
   - Show/hide hymn options
   - Update language pills

2. **Language Selection** (radio buttons)
   - Emit `language-changed` event
   - Load value for selected language from EditorStateManager
   - Update input field

3. **Value Input Change** (`#value-input` input)
   - Emit `value-changed` { key, language, value } event
   - Update EditorStateManager
   - Mark as unsaved
   - Show unsaved indicator

4. **Hymn Children's Checkbox** (`#hymn-children` change)
   - If checked: prepend "CS " to value
   - If unchecked: remove "CS " prefix
   - Emit `value-changed` event

5. **Add Row Button** (`#add-row-btn` click)
   - Emit `add-row` event
   - Prompt user for new key name
   - Validate key doesn't exist
   - Add to EditorStateManager
   - Refresh key dropdown
   - Select new key

6. **Save Button** (`#save-btn` click)
   - Emit `save` event with all changes
   - Disable buttons, show loading
   - Wait for parent to validate & upload
   - On success: clear unsaved indicator

7. **Discard Button** (`#discard-btn` click)
   - Ask for confirmation
   - Clear all unsaved changes
   - Reload values from EditorStateManager
   - Hide unsaved indicator

### Task 4.4: Implement Hymn Field Logic

**Hymn Detection**: If key ends with "Hymn" (case-insensitive):
- Show checkbox: "Children's Song (prepends 'CS ')"
- When checkbox checked: ensure value starts with "CS "
- When checkbox unchecked: remove "CS " prefix

**Examples**:
- User enters "2" + checks "Children's Song" → value becomes "CS 2"
- User enters "CS 2" + unchecks box → value becomes "2"
- User enters "CS 73a" + can check/uncheck
- If user manually types "CS 2": checkbox auto-checks

**Special Case**: Hymn value might include note (pipe-separated):
- "62|Sung by choir" → can edit "62" part, keep "|Sung by choir"
- Children's logic applies to hymn number part only

### Task 4.5: Implement Unsaved Indicator

**Requirements**:
- Show alert box when any field modified
- Display count of unsaved fields
- Update in real-time
- Update on Add Row
- Clear on Save or Discard

**HTML**:
```html
<div id="unsaved-indicator" class="alert alert-warning" style="display: none;">
  <strong>⚠ Unsaved Changes:</strong> <span id="unsaved-count">0</span> fields modified
</div>
```

**Logic**:
1. EditorStateManager tracks unsavedChanges
2. SheetEditor calls `stateManager.getUnsavedCount()`
3. Update DOM to show/hide indicator
4. Listen for `value-changed` events to update count

### Task 4.6: Style with Bootstrap 5

**CSS Considerations**:
- Use Bootstrap 5 CDN in `editor.html`
- Language pills: use Bootstrap btn-group + btn-check pattern
- Form layout: use form-control, form-group classes
- Validation messages: use alert classes
- Loading state: disable buttons, show spinner

**Custom CSS** (minimal):
```css
#editor-main {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid #ccc;
}

.language-buttons .btn-group {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

#value-input {
  min-height: 100px;
}

.editor-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
```

### Task 4.7: Create Unit Tests

**File**: `test/components/SheetEditor.test.mjs`

**Test Approach**: Test DOM updates and event emissions (mock DOM elements)

**Test Cases**:

```
✓ render() creates HTML structure
✓ render() populates key dropdown
✓ Key selection updates shown value
✓ Language selection changes input field
✓ Value input emits 'value-changed' event
✓ Unsaved indicator shows on value change
✓ Unsaved count increases/decreases
✓ Add Row button opens dialog for key name
✓ Add Row validates key doesn't exist
✓ Hymn-related keys show children's checkbox
✓ Hymn checkbox checked: prepends "CS "
✓ Hymn checkbox unchecked: removes "CS "
✓ Save button emits 'save' event
✓ Save button disables during save
✓ Discard button asks for confirmation
✓ Discard button clears unsaved state
✓ Error message displays toast
✓ Success message displays toast
✓ destroy() cleans up event listeners
✓ Multiple language changes tracked
✓ Pipe-separated notes preserved in hymn values
```

**Mocking**:
- Mock DOM elements using jsdom
- Mock EditorStateManager methods
- Mock window.alert/confirm
- Test event emissions via custom event listeners

---

## Phase 5: Editor Page & Navigation

**Objective**: Create `editor.html` page and integrate OAuth + Editor UI. Add navigation from main app.

**Duration**: ~10-12 hours  
**Context Required**: Medium (HTML structure, OAuth flow, navigation)  
**Files Created**: `editor.html`, `js/editor.js`, `test/editor.test.mjs`

### Task 5.1: Create editor.html Page

**File**: `editor.html`

**Structure**: Mirror `index.html` but with editor-specific content

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description
```


## License: unknown
https://github.com/wayou/wayou.github.io/blob/5d2190ff8b5d0b67b64f70ccbb23eab30b8d56b2/_posts/2019-06-03-JavaScript%20%E5%AE%9E%E7%8E%B0%E9%A1%B5%E9%9D%A2%E4%B8%AD%E5%BD%95%E9%9F%B3%E5%8A%9F%E8%83%BD.md

```
I'll provide you with the comprehensive plan as a detailed document that you can save. Since I don't have file writing tools available, I'll present the complete plan in a code block that you can save directly to `./docs/FEATURE_CMS_EDIT.md`:

```markdown
# Feature Plan: CMS Sheet Editor (Google Sheets OAuth + Form UI)

**Version**: 1.0  
**Last Updated**: March 10, 2026  
**Status**: Ready for Implementation  
**Estimated Duration**: 6 phases, ~100-120 hours total (can parallelize some tasks)

---

## 📋 Table of Contents

1. [Overview & Architecture](#overview--architecture)
2. [Design Decisions](#design-decisions)
3. [Technical Architecture](#technical-architecture)
4. [Phase 1: OAuth Module](#phase-1-oauth-module)
5. [Phase 2: Google Sheets API Service](#phase-2-google-sheets-api-service)
6. [Phase 3: Editor State Manager](#phase-3-editor-state-manager)
7. [Phase 4: Editor UI Component](#phase-4-editor-ui-component)
8. [Phase 5: Editor Page & Navigation](#phase-5-editor-page--navigation)
9. [Phase 6: Tests & Deployment](#phase-6-tests--deployment)
10. [Data Structures & Interfaces](#data-structures--interfaces)
11. [Testing Specifications](#testing-specifications)
12. [Integration Checklist](#integration-checklist)
13. [Risk Mitigation](#risk-mitigation)

---

## Overview & Architecture

### What We're Building

A **Google Sheets CMS interface** that allows authorized editors to modify meeting program data directly in the app. Features:

- **Google OAuth 2.0 authentication** (PKCE flow, client-side only)
- **Collaborator verification** against the currently-loaded Google Sheet
- **Form-based UI** with scrollable key/value pairs, language selectors, validation
- **Local state management** with IndexedDB persistence for in-progress edits
- **Batch CSV upload** back to Google Sheets (not row-by-row)
- **Graceful "Viewer Only" fallback** for non-editors
- **No backend required** (GitHub Pages compatible)

### Why This Approach?

| Requirement | Solution | Why Not Others |
|---|---|---|
| **Free hosting** | GitHub Pages (static) | Avoiding backend costs ✅ |
| **No tech accounts** | Google OAuth (user's own account) | Users already have Google accounts |
| **Edit protection** | OAuth + Collaborators check | Verified against actual Sheet permissions |
| **Offline-ready** | IndexedDB state storage | Can edit offline, upload when online |
| **Easy CSV export** | CSV validation + upload | Reversible, debuggable, portable |
| **Non-tech friendly** | Form UI with pills/dropdowns | Visual, clear, no CSV syntax needed |

---

## Design Decisions

### 1. Authentication: Google OAuth 2.0 with PKCE

**Decision**: Use Google Identity Services (gis) library for browser-based OAuth authentication.

**Why**:
- No backend needed (PKCE flow works entirely client-side)
- Users sign in with account they already have
- Provides access token to call Google Sheets API
- Can verify user is a Sheet collaborator
- Token stored in `sessionStorage` (cleared on browser close) for security

**Implementation**:
- User navigates to `/editor.html`
- Click "Sign in with Google" button
- Google login popup appears
- After auth, token stored in `sessionStorage`
- App checks if user is collaborator on current sheet
- If yes: show editor; if no: show "Viewer Only"

### 2. Data Flow: Form UI + Batch Upload

**Decision**: Build form UI with field-by-field editing; upload all changes in one batch.

**Why**:
- Better UX than downloading/editing CSV locally
- Batch upload is safer than row-by-row API calls
- Can validate entire dataset before upload
- Less error-prone than incremental saves
- Users can edit multiple fields, review, then upload

**Data Lifecycle**:
1. Load current CSV from Sheet (via public export URL)
2. Parse into in-memory object: `{ key: { en, es, fr, swa } }`
3. Store in IndexedDB (survives page reload)
4. Editor modifies fields via form UI
5. On "Save": validate CSV, call Sheets API to append/update rows
6. After success: reload data, clear unsaved indicator

### 3. Permission Model: Collaborators Check

**Decision**: Check if authenticated user is a collaborator on the current Sheet.

**Why**:
- Tied to actual Sheet permissions (most secure)
- No manual allow-lists to maintain
- User only edits sheets they have permission for
- Leverages existing Google Sheet sharing

**Flow**:
1. Get sheet ID from current profile's CSV URL
2. After OAuth sign-in, call `spreadsheets.get()` to fetch collaborators
3. Compare user's email to collaborators list
4. Show/hide editor UI accordingly

### 4. UI Pattern: Scrollable Form with Language Pills

**Decision**: Single scrollable list of all keys, with key selector, language buttons, single input field.

**Why**:
- One key at a time prevents overwhelming users
- Language pills (Bootstrap 5) are clear and visual
- Single input field reduces UI complexity
- Scrollable list shows all available fields
- Matches your original spec exactly

**Form Structure**:
```
[Sign in / Logged in as: user@gmail.com] [Sign out]

Key Dropdown: [speaker1 ▼]
Language Pills: [EN] [ES] [FR] [SWA]
Input Field: [textarea with current value]
Add Row ➕ | Save Changes ✓

Unsaved: 3 changes pending
```

### 5. State Persistence: IndexedDB + Session

**Decision**: Keep edited data in IndexedDB during session; clear on sign-out.

**Why**:
- Survives page reload/accidental close
- User can ask "Resume editing?" on reload
- Keeps edits local until upload
- Session-based (not long-term storage)
- Encrypted in browser's secure storage

---

## Technical Architecture

### High-Level Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    editor.html                              │
│         (New page, mirrors index.html structure)             │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    js/editor.js                              │
│  (Orchestrator: loads profiles, checks auth, renders UI)    │
└─────────────────────────────────────────────────────────────┘
                            │
                ┌───────────┼───────────┐
                ▼           ▼           ▼
         ┌──────────┐ ┌──────────┐ ┌──────────┐
         │googleAuth│ │sheetsApi │ │editorState│
         │   .js    │ │Service.js│ │Manager.js │
         └──────────┘ └──────────┘ └──────────┘
                │           │           │
                └───────────┼───────────┘
                            │
                            ▼
         ┌──────────────────────────────────┐
         │  js/components/SheetEditor.mjs   │
         │        (UI Component)            │
         └──────────────────────────────────┘
                            │
                            ▼
         ┌──────────────────────────────────┐
         │      IndexedDB (Dexie)           │
         │   (editor._state store)          │
         └──────────────────────────────────┘
```

### File Organization

```
js/
├── auth/
│   └── googleAuth.js               [NEW] OAuth 2.0 module
├── services/
│   └── sheetsApiService.js         [NEW] Google Sheets API calls
├── data/
│   └── EditorStateManager.js       [NEW] In-memory state + persistence
├── components/
│   └── SheetEditor.mjs             [NEW] Form UI component
├── editor.js                        [NEW] Editor page entry point
└── [existing modules unchanged]

editor.html                          [NEW] Editor page

test/
├── auth/
│   └── googleAuth.test.mjs         [NEW] Auth tests
├── services/
│   └── sheetsApiService.test.mjs   [NEW] API service tests
├── data/
│   └── EditorStateManager.test.mjs [NEW] State manager tests
├── components/
│   └── SheetEditor.test.mjs        [NEW] UI component tests
└── editor.test.mjs                 [NEW] Integration tests

e2e/
├── scenarios/
│   └── editor.spec.js              [NEW] E2E scenarios

docs/
├── FEATURE_CMS_EDIT.md             [THIS FILE]
└── [existing docs unchanged]
```

### Dependencies

**External Libraries** (already in package.json):
- `dexie` v4.3.0 — IndexedDB abstraction (already used)
- Google Identity Services — Added via CDN script tag in editor.html

**No new npm dependencies**

---

## Phase 1: OAuth Module

**Objective**: Implement Google OAuth 2.0 authentication with PKCE flow.

**Duration**: ~8-10 hours  
**Context Required**: Medium (auth patterns, Google API basics)  
**Files Created**: `js/auth/googleAuth.js`, `test/auth/googleAuth.test.mjs`

### Task 1.1: Create googleAuth Module Structure

**File**: `js/auth/googleAuth.js`

Create a module that:
- Exports an object: `GoogleAuth` with methods listed below
- Initializes Google Identity Services (gis) on load
- NO external dependencies except gis library (loaded via CDN in editor.html)

**Methods to implement**:

```javascript
GoogleAuth.initialize(clientId, redirectUri)
GoogleAuth.signIn()                    // Opens Google login popup
GoogleAuth.signOut()                   // Clears token, closes session
GoogleAuth.getAccessToken()            // Returns token from sessionStorage
GoogleAuth.isAuthenticated()           // Returns boolean
GoogleAuth.getUser()                   // Returns { email, name }
GoogleAuth.onTokenExpire(callback)     // Handles token refresh
```

**Session Storage Keys**:
- `gm_access_token` — OAuth access token
- `gm_user_email` — User's email
- `gm_token_expires` — Token expiry timestamp (ms)

**Error Handling**:
- If user cancels login: resolve to `null` (don't throw)
- If token expires: auto-refresh or trigger re-auth
- Log all errors to `[AUTH]` prefix

**Notes**:
- Use `sessionStorage` only (cleared on browser close)
- Never use `localStorage` for tokens
- Implement token expiry check before API calls
- Google sign-out should clear all stored data

### Task 1.2: Handle PKCE Flow (Authorization Code)

**Context**: PKCE (Proof Key for Code Exchange) is how OAuth 2.0 works in browsers without backend.

**Implementation Details**:

1. Generate `code_verifier` (43-128 char random string)
2. Hash it to `code_challenge` (SHA-256)
3. Send user to Google auth endpoint with `code_challenge`
4. User grants permission
5. Google redirects back with authorization `code`
6. Exchange `code` + `code_verifier` for access token
7. Store token in `sessionStorage`

**Library**: Use `google-gsi` (Google Identity Services)
- Already available via CDN: `https://accounts.google.com/gsi/client`
- Handles PKCE automatically
- Simpler to use than raw OAuth

**Code Flow**:
```javascript
// In googleAuth.js
function generatePKCEPair() {
  // Generate random code_verifier
  // SHA-256 hash to code_challenge
  // Return { verifier, challenge }
}

async function exchangeCodeForToken(code, codeVerifier) {
  // POST to Google token endpoint
  // Return access token
}
```

**Testing**:
- Mock `sessionStorage`
- Mock Google gsi library
- Test token generation/storage
- Test error cases (network, user cancel)

### Task 1.3: Implement Token Refresh & Expiry

**Requirement**: Access tokens expire in ~1 hour. Handle gracefully.

**Implementation**:
1. Store token `expires_at` timestamp when token received
2. Before API calls: check if `Date.now() > expires_at`
3. If expired: trigger refresh flow
4. If refresh fails: sign out and require re-auth

**Methods**:
```javascript
GoogleAuth.isTokenExpired()
GoogleAuth.refreshToken()
GoogleAuth.onTokenExpire(callback)  // Register handler
```

**Edge Case**: If user's Google session has ended, refresh will fail. Show "Please sign in again" message.

### Task 1.4: Create Unit Tests for Auth

**File**: `test/auth/googleAuth.test.mjs`

**Test Cases**:

```
✓ signIn() opens Google popup
✓ On successful auth, token stored in sessionStorage
✓ isAuthenticated() returns true after sign-in
✓ isAuthenticated() returns false before sign-in
✓ getAccessToken() returns token string
✓ getUser() returns { email, name }
✓ Token expiry is calculated correctly
✓ signOut() clears sessionStorage
✓ isTokenExpired() returns true for expired token
✓ refreshToken() updates token before expiry
✓ On network error, gracefully handle (don't crash)
✓ On user cancel, resolve to null (not throw)
✓ Multiple sign-in calls don't create duplicate popups
```

**Mocking**:
- Mock global `google` object (from gis library)
- Mock `sessionStorage`
- Mock `fetch` for token endpoint

---

## Phase 2: Google Sheets API Service

**Objective**: Wrapper for Google Sheets API operations (check collaborators, upload data).

**Duration**: ~10-12 hours  
**Context Required**: Medium (Google Sheets API, HTTP requests)  
**Files Created**: `js/services/sheetsApiService.js`, `test/services/sheetsApiService.test.mjs`

### Task 2.1: Create Sheets API Service Structure

**File**: `js/services/sheetsApiService.js`

**Methods to export**:

```javascript
SheetsAPI.initialize(accessToken)              // Set auth token
SheetsAPI.getSpreadsheetMetadata(sheetId)      // Get sheet info + collaborators
SheetsAPI.checkIfCollaborator(sheetId, email)  // Boolean
SheetsAPI.getSheetValues(sheetId, range)       // Fetch cell values
SheetsAPI.appendRows(sheetId, values)          // Add rows to sheet
SheetsAPI.updateRows(sheetId, values)          // Update existing rows
SheetsAPI.uploadCSV(sheetId, csvData)          // Replace entire sheet data
```

**Dependencies**:
- `GoogleAuth` module (to get access token)
- Standard `fetch` API (no external library)

**Base Endpoint**: `https://sheets.googleapis.com/v4/spreadsheets`

**Required OAuth Scope**: `https://www.googleapis.com/auth/spreadsheets`

**Error Handling**:
- Log all HTTP errors with request details
- Return `{ success: false, error: "message" }` for failures
- Throw on authentication errors (token expired, unauthorized)
- Network timeouts: implement 30-second timeout

### Task 2.2: Extract Sheet ID from CSV URL

**Context**: Current profiles store CSV export URLs. Need to extract sheet ID.

**Sheet URL Patterns**:
```
CSV export URL: https://docs.google.com/spreadsheets/d/ABC123XYZ/gviz/tq?tqx=out:csv
Sheet ID:       ABC123XYZ (extract from /d/.../)

Normal sheet URL: https://docs.google.com/spreadsheets/d/ABC123XYZ/edit#gid=0
Sheet ID:        ABC123XYZ (same extraction)
```

**Function**:
```javascript
function extractSheetIdFromUrl(csvUrl) {
  // return sheet ID string, or null if invalid
}
```

**Validation**:
- Ensure URL contains `docs.google.com/spreadsheets/d/`
- Ensure ID is alphanumeric (no special chars)
- Return `null` for invalid URLs

### Task 2.3: Implement `getSpreadsheetMetadata()`

**API Call**: `GET /v4/spreadsheets/{sheetId}`

**Returns**:
```json
{
  "spreadsheetId": "ABC123XYZ",
  "properties": {
    "title": "Sacrament Program",
    "locale": "en_US",
    ...
  }
}
```

**Additional**: Fetch collaborators via Drive API (optional advanced feature; for now, assume we can determine from spreadsheet.properties)

**Note**: Google Sheets API's `spreadsheets.get()` requires the user to have at least Viewer access. Request with `fields=spreadsheetId,properties` to minimize response size.

### Task 2.4: Implement `checkIfCollaborator()`

**Logic**:
1. Call `getSpreadsheetMetadata(sheetId)`
2. Check `spreadsheetProperties` for owner/editors
3. Compare `GoogleAuth.getUser().email` to collaborators list
4. Return `true` if match, `false` otherwise

**Edge Cases**:
- User email might have different case (do case-insensitive compare)
- If metadata doesn't contain collaborators, conservative approach: `return false` (deny access)
- If API call fails: `throw` error (don't silently deny)

**Alternative** (if Google Sheets API doesn't provide collaborators easily):
- Could use Drive API's `permissions` endpoint
- For now, assume metadata provides this info; adjust if not available

### Task 2.5: Implement CSV Upload/Append

**Historical Context**: App currently uses public CSV export URLs (read-only).

**New Requirement**: Upload modified CSV back to Sheet.

**Two Approaches**:

**Option A: Append Rows** (Simpler)
- API: `POST /v4/spreadsheets/{sheetId}/values:append`
- Each edited row sent as new row
- Pro: Simple, no row-by-row tracking
- Con: Duplicates sheet data if not careful

**Option B: Clear & Replace** (Safer)
- API: `POST /v4/spreadsheets/{sheetId}/values:batchUpdate`
- Clear all data, write new CSV
- Pro: Guaranteed consistent state
- Con: All-or-nothing (can't recover if network fails mid-upload)

**Decision**: Use **Option B** (Clear & Replace) with validation

**Implementation**:

```javascript
async function uploadCSV(sheetId, csvData) {
  // 1. Validate csvData format (check headers, etc.)
  // 2. Parse CSV into 2D array (rows + columns)
  // 3. Call Sheets API:
  //    - DELETE all rows from Sheet1
  //    - APPEND new CSV data
  // 4. Return { success, sheetId, rowsWritten }
}
```

**API Call**:
```
POST /v4/spreadsheets/{sheetId}/values/Sheet1:clear
POST /v4/spreadsheets/{sheetId}/values/Sheet1:append
  Body: { values: [ ["key", "en", "es", "fr", "swa"], [...], [...] ] }
```

**Error Recovery**:
- If clear succeeds but append fails: sheet is empty (bad)
- Mitigation: Check sheet before upload, warn user
- Alternative: Use local backup copy for recovery

### Task 2.6: Create Unit Tests for Sheets API Service

**File**: `test/services/sheetsApiService.test.mjs`

**Test Cases**:

```
✓ extractSheetIdFromUrl() extracts ID correctly
✓ extractSheetIdFromUrl() rejects invalid URLs
✓ getSpreadsheetMetadata() makes correct API call
✓ getSpreadsheetMetadata() parses response
✓ checkIfCollaborator() returns true for collaborators
✓ checkIfCollaborator() returns false for non-collaborators
✓ checkIfCollaborator() is case-insensitive for email
✓ uploadCSV() calls clear then append
✓ uploadCSV() throws on validation error
✓ uploadCSV() returns row count
✓ On 401 Unauthorized: throw auth error
✓ On 403 Forbidden: throw permission error
✓ On network timeout: throw with timeout message
✓ On invalid CSV: return validation error
```

**Mocking**:
- Mock `fetch` for all API calls
- Mock `GoogleAuth.getAccessToken()`
- Mock `GoogleAuth.getUser()`

---

## Phase 3: Editor State Manager

**Objective**: In-memory state management for edited CSV data with IndexedDB persistence.

**Duration**: ~10-12 hours  
**Context Required**: Medium (IndexedDB, CSV parsing, state management)  
**Files Created**: `js/data/EditorStateManager.js`, `test/data/EditorStateManager.test.mjs`

### Task 3.1: Create EditorStateManager Structure

**File**: `js/data/EditorStateManager.js`

**Purpose**: Hold edited CSV data in memory, track changes, persist to IndexedDB.

**Internal Data Structure**:

```javascript
// Parsed CSV stored as:
{
  headers: ["key", "en", "es", "fr", "swa"],
  rows: {
    "unitName": {
      en: "Your Ward Name",
      es: "Nombre de Su Rama",
      fr: "Nom de Votre Branche",
      swa: "Jina la Kimanda Yako"
    },
    "speaker1": {
      en: "John Smith",
      es: "", // Empty = fallback to English
      fr: "",
      swa: ""
    },
    // ... more rows
  },
  // Track which fields have unsaved changes
  unsavedChanges: {
    "unitName": { en: true, es: false, fr: false, swa: false },
    "speaker1": { en: false, es: true, fr: false, swa: false },
  },
  // Metadata
  sheetId: "ABC123XYZ",
  createdAt: Date.now(),
  lastModified: Date.now()
}
```

**Class Methods**:

```javascript
class EditorStateManager {
  constructor(sheetId) {
    this.sheetId = sheetId;
    this.state = { /* as above */ };
  }

  async loadFromSheet(csvUrl) {
    // Fetch current CSV from sheet
    // Parse it into state.rows
    // Save to IndexedDB
  }

  getValue(key, language = "en") {
    // Return value for key + language
    // Fallback to English if empty
  }

  setValue(key, language, value) {
    // Update value, mark as changed
    // Don't save to DB yet (only on explicit save)
  }

  addRow(key, values = {}) {
    // Add new key with optional values
    // Mark as new/unsaved
  }

  deleteRow(key) {
    // Mark row for deletion
  }

  getUnsavedCount() {
    // Return number of changed fields
  }

  getChangedRows() {
    // Return only rows with unsaved changes
  }

  async validate() {
    // Check CSV structure, keys, hymn format
    // Return { valid: boolean, errors: [] }
  }

  toCSV() {
    // Generate CSV string ready for upload
    // Includes validation
  }

  async saveChanges(csvData) {
    // Save edited state to IndexedDB for session persistence
  }

  async discardChanges() {
    // Clear unsaved state, reload from sheet
  }

  async clear() {
    // Delete all editor data from IndexedDB
  }

  static async resume(sheetId) {
    // Check if previous session exists
    // Return EditorStateManager instance or null
  }
}
```

### Task 3.2: Implement CSV Parsing & Validation

**Requirement**: Parse Google Sheet CSV into structured data.

**CSV Format**:
```
key,en,es,fr,swa
unitName,Your Ward,Su Rama,Votre Branche,Kimanda Yako
speaker1,John Smith,Juan Garcia,Jean Dupont,Yohana Mto
openingHymn,62
CS 2,Accompaniment by Sister Smith
```

**Parsing Logic**:
1. Use existing `parseCSV()` from `js/utils/csv.js` as reference
2. Detect CSV format: simple (key, value) vs. multi-lang (key, en, es, fr, swa)
3. Extract headers row
4. Parse data rows into dictionary structure
5. Normalize language values (trim whitespace, handle quotes)

**Validation Rules** (Task 3.3):
1. **Required headers**: Must have "key" column
2. **Language columns**: "en", "es", "fr", "swa" (if multi-lang format)
3. **No duplicate keys**: Each key appears only once
4. **Hymn format**: If key ends with "Hymn":
   - Value must be number (e.g., `62`, `1001`)
   - OR `CS` + space + number + optional letter (e.g., `CS 2`, `CS 73a`)
5. **Required fields**: "key" must be non-empty, "en" must be non-empty (unless fallback)
6. **No XSS payload**: Sanitize values (reuse `sanitizeEntry()` from `js/sanitize.js`)

**Error Messages**:
```javascript
{
  errors: [
    { row: 2, column: "opening Hymn", message: "Invalid hymn format: must be number or CS{space}number" },
    { row: 5, column: "key", message: "Duplicate key: 'speaker1' already defined at row 3" },
    { row: "header", column: "es", message: "Missing required language column" }
  ]
}
```

### Task 3.3: Implement Hymn Format Validation

**Context**: Hymn fields can have special format:
- Regular: `62` (hymn number)
- Children's: `CS 2` (with space, can have letter like `CS 73a`)
- With note: `62|Sung by Primary` (pipe-separated annotation)

**Validation Function**:

```javascript
function validateHymnValue(value) {
  if (!value) return { valid: false, error: "Hymn value cannot be empty" };
  
  // Split on pipe to get hymn part
  const [hymnPart] = value.split("|");
  const hymn = hymnPart.trim();
  
  // Pattern: number OR "CS {number}{optional letter}"
  const hymnRegex = /^(\d{1,4}|CS [0-9]{1,4}[a-z]?)$/i;
  
  if (!hymnRegex.test(hymn)) {
    return {
      valid: false,
      error: `Invalid hymn: ${hymn}. Use format: "62" or "CS 2" or "CS 73a", optionally with "|Note"`
    };
  }
  
  return { valid: true };
}
```

**Hymn Lookup** (Optional Enhancement):
- Reference `js/data/hymnsLookup.js` to validate hymn numbers exist
- For now: just validate format (not whether hymn exists)
- Can add lookup validation in Phase 4

### Task 3.4: Implement IndexedDB Persistence

**Context**: Store editor state so user can reload page and resume editing.

**IndexedDB Store**: `editor._state`

**Schema**:
```javascript
// In js/data/db.js (existing Dexie setup)
// Add new store:
editor_state: "sheetId, createdAt" // Compound key
```

**Stored Data**:
```javascript
{
  id: "auto-generated",
  sheetId: "ABC123XYZ",
  createdAt: Date.now(),
  lastModified: Date.now(),
  expiresAt: createdAt + (24 * 60 * 60 * 1000), // 24h session
  state: { /* EditorStateManager.state */ },
  csvUrl: "https://docs.google.com/..."
}
```

**Methods**:

```javascript
async function saveSessionState(sheetId, state, csvUrl) {
  // Store to IndexedDB
  // Return saved object with ID
}

async function getSessionState(sheetId) {
  // Fetch from IndexedDB
  // Check if expired (24h)
  // Return state or null
}

async function deleteSessionState(sheetId) {
  // Remove from IndexedDB
}

async function resumeSession(sheetId) {
  // Check if session exists
  // Ask user: "Resume editing? X changes pending"
  // Return EditorStateManager with restored state or null
}
```

**Expiry Policy**: Sessions expire after 24 hours (paranoid safety).

### Task 3.5: Implement toCSV() & String Generation

**Requirement**: Convert in-memory state back to CSV string format suitable for upload.

**Function**:

```javascript
toCSV() {
  // 1. Build header: "key,en,es,fr,swa"
  // 2. For each row, quote fields with commas/newlines
  // 3. Handle fallback: if language cell empty, use English value
  // 4. Return as string ready for Sheets API
}

// Example output:
// key,en,es,fr,swa
// unitName,Your Ward,Su Rama,Votre Branche,Kimanda Yako
// speaker1,"Smith, John","García, Juan","Dupont, Jean","Mtu, Yohana"
// openingHymn,62
//
```

**CSV Quoting Rules**:
- Quote fields containing: comma, newline, quotes
- Escape quotes: `"` → `""`
- Leave other fields unquoted

**Reference**: Use logic from `js/utils/csv.js` as template.

### Task 3.6: Create Unit Tests

**File**: `test/data/EditorStateManager.test.mjs`

**Test Cases**:

```
✓ loadFromSheet() fetches and parses CSV correctly
✓ loadFromSheet() handles multi-language format
✓ loadFromSheet() handles simple key-value format
✓ getValue() returns correct value
✓ getValue() falls back to English if language empty
✓ setValue() updates value and marks unsaved
✓ addRow() adds new key with empty values
✓ deleteRow() marks row for deletion
✓ getUnsavedCount() returns correct count
✓ getChangedRows() returns only unsaved rows
✓ validate() rejects duplicate keys
✓ validate() rejects invalid hymn format
✓ validate() rejects duplicate hymn with "CS" prefix
✓ validate() catches empty key
✓ toCSV() generates valid CSV string
✓ toCSV() quotes fields with commas
✓ toCSV() includes all languages
✓ saveChanges() stores to IndexedDB
✓ resumeSession() restores previous state
✓ discardChanges() clears unsaved state
✓ Session expires after 24 hours
```

**Mocking**:
- Mock `fetch` for CSV download
- Mock IndexedDB via `fake-indexeddb`
- Mock `sanitizeEntry()`

---

## Phase 4: Editor UI Component

**Objective**: React-like component for editor form (scrollable list, key selector, language pills, input field).

**Duration**: ~12-14 hours  
**Context Required**: Medium-High (DOM manipulation, event handling, Bootstrap 5)  
**Files Created**: `js/components/SheetEditor.mjs`, `test/components/SheetEditor.test.mjs`

### Task 4.1: Design UI Structure & Components

**HTML Structure** (will be rendered by JavaScript):

```html
<div id="editor-main">
  <!-- Authentication Section -->
  <div id="auth-section">
    <button id="signin-btn" class="btn btn-primary">Sign in with Google</button>
  </div>

  <!-- Editor Section (hidden until auth) -->
  <div id="editor-section" style="display: none;">
    <!-- User Info -->
    <div class="editor-header">
      <span class="user-email">Logged in as: user@gmail.com</span>
      <button id="signout-btn" class="btn btn-sm btn-secondary">Sign out</button>
    </div>

    <!-- Key Selector & Language -->
    <div class="editor-controls">
      <div class="form-group">
        <label for="key-select">Key:</label>
        <select id="key-select" class="form-control">
          <option value="">-- Select a key --</option>
          <option value="unitName">unitName</option>
          <option value="speaker1">speaker1</option>
          <!-- ... all keys ... -->
        </select>
      </div>

      <!-- Language Pills (Bootstrap 5 buttons) -->
      <div class="language-buttons mt-3">
        <label>Language:</label>
        <div class="btn-group" role="group">
          <input type="radio" class="btn-check" name="language" id="lang-en" value="en" checked>
          <label class="btn btn-outline-primary" for="lang-en">English</label>
          
          <input type="radio" class="btn-check" name="language" id="lang-es" value="es">
          <label class="btn btn-outline-primary" for="lang-es">Español</label>
          
          <input type="radio" class="btn-check" name="language" id="lang-fr" value="fr">
          <label class="btn btn-outline-primary" for="lang-fr">Français</label>
          
          <input type="radio" class="btn-check" name="language" id="lang-swa" value="swa">
          <label class="btn btn-outline-primary" for="lang-swa">Kiswahili</label>
        </div>
      </div>
    </div>

    <!-- Value Input -->
    <div class="form-group mt-4">
      <label for="value-input">Value:</label>
      <textarea id="value-input" class="form-control" rows="4" placeholder="Enter value..."></textarea>
      
      <!-- Hymn Checkbox (shown for *Hymn keys) -->
      <div id="hymn-options" class="mt-2" style="display: none;">
        <div class="form-check">
          <input type="checkbox" class="form-check-input" id="hymn-children" value="children">
          <label class="form-check-label" for="hymn-children">
            Children's Song (prepends "CS ")
          </label>
        </div>
      </div>
    </div>

    <!-- Unsaved Indicator -->
    <div id="unsaved-indicator" class="alert alert-warning mt-3" style="display: none;">
      <strong>⚠ Unsaved Changes:</strong> <span id="unsaved-count">0</span> fields modified
    </div>

    <!-- Action Buttons -->
    <div class="editor-actions mt-4">
      <button id="add-row-btn" class="btn btn-success">➕ Add New Field</button>
      <button id="save-btn" class="btn btn-primary">✓ Save Changes</button>
      <button id="discard-btn" class="btn btn-secondary">Clear Changes</button>
    </div>
  </div>

  <!-- Viewer-Only Section -->
  <div id="viewer-only-section" style="display: none;">
    <div class="alert alert-info">
      <h4>Viewer</h4>
      <p>You don't have permission to edit this sheet. Only collaborators can edit.</p>
    </div>
  </div>
</div>
```

### Task 4.2: Create SheetEditor Component Class

**File**: `js/components/SheetEditor.mjs`

**Class Structure**:

```javascript
export class SheetEditor {
  constructor(containerSelector, editorStateManager, options = {}) {
    this.container = document.querySelector(containerSelector);
    this.stateManager = editorStateManager;
    this.currentKey = null;
    this.currentLanguage = "en";
    this.isEditing = false;
    
    this.options = {
      onSave: null,    // Callback when Save clicked
      onAddRow: null,  // Callback when Add Row clicked
      ...options
    };
    
    this.eventHandlers = {};
  }

  async render() {
    // Build HTML structure above
    // Attach event listeners
    // Load keys into dropdown
  }

  on(eventName, callback) {
    // event.addListener pattern
    // Supported events: 'value-changed', 'key-selected', 'language-changed', 'save', 'add-row'
  }

  setValue(key, language, value) {
    // Update input field to show value
    // Update unsaved indicator
  }

  setKey(key) {
    // Change which key is being edited
    // Update select dropdown
    // Load value for new key
    // Show/hide hymn checkbox
  }

  setLanguage(language) {
    // Change selected language
    // Load value for new language
  }

  updateKeyList(keys) {
    // Refresh dropdown with new keys (after adding row)
  }

  showUnsavedIndicator(count) {
    // Show/hide and update count
  }

  setLoading(isLoading) {
    // Disable buttons while saving
    // Show spinner
  }

  showError(message) {
    // Toast/alert with error message
  }

  showSuccess(message) {
    // Toast/alert with success message
  }

  destroy() {
    // Clean up event listeners
  }
}
```

### Task 4.3: Implement Event Handlers & DOM Updates

**Event Handlers to Attach**:

1. **Key Selection** (`#key-select` change)
   - Emit `key-selected` event with new key
   - Load value from EditorStateManager
   - Show/hide hymn options
   - Update language pills

2. **Language Selection** (radio buttons)
   - Emit `language-changed` event
   - Load value for selected language from EditorStateManager
   - Update input field

3. **Value Input Change** (`#value-input` input)
   - Emit `value-changed` { key, language, value } event
   - Update EditorStateManager
   - Mark as unsaved
   - Show unsaved indicator

4. **Hymn Children's Checkbox** (`#hymn-children` change)
   - If checked: prepend "CS " to value
   - If unchecked: remove "CS " prefix
   - Emit `value-changed` event

5. **Add Row Button** (`#add-row-btn` click)
   - Emit `add-row` event
   - Prompt user for new key name
   - Validate key doesn't exist
   - Add to EditorStateManager
   - Refresh key dropdown
   - Select new key

6. **Save Button** (`#save-btn` click)
   - Emit `save` event with all changes
   - Disable buttons, show loading
   - Wait for parent to validate & upload
   - On success: clear unsaved indicator

7. **Discard Button** (`#discard-btn` click)
   - Ask for confirmation
   - Clear all unsaved changes
   - Reload values from EditorStateManager
   - Hide unsaved indicator

### Task 4.4: Implement Hymn Field Logic

**Hymn Detection**: If key ends with "Hymn" (case-insensitive):
- Show checkbox: "Children's Song (prepends 'CS ')"
- When checkbox checked: ensure value starts with "CS "
- When checkbox unchecked: remove "CS " prefix

**Examples**:
- User enters "2" + checks "Children's Song" → value becomes "CS 2"
- User enters "CS 2" + unchecks box → value becomes "2"
- User enters "CS 73a" + can check/uncheck
- If user manually types "CS 2": checkbox auto-checks

**Special Case**: Hymn value might include note (pipe-separated):
- "62|Sung by choir" → can edit "62" part, keep "|Sung by choir"
- Children's logic applies to hymn number part only

### Task 4.5: Implement Unsaved Indicator

**Requirements**:
- Show alert box when any field modified
- Display count of unsaved fields
- Update in real-time
- Update on Add Row
- Clear on Save or Discard

**HTML**:
```html
<div id="unsaved-indicator" class="alert alert-warning" style="display: none;">
  <strong>⚠ Unsaved Changes:</strong> <span id="unsaved-count">0</span> fields modified
</div>
```

**Logic**:
1. EditorStateManager tracks unsavedChanges
2. SheetEditor calls `stateManager.getUnsavedCount()`
3. Update DOM to show/hide indicator
4. Listen for `value-changed` events to update count

### Task 4.6: Style with Bootstrap 5

**CSS Considerations**:
- Use Bootstrap 5 CDN in `editor.html`
- Language pills: use Bootstrap btn-group + btn-check pattern
- Form layout: use form-control, form-group classes
- Validation messages: use alert classes
- Loading state: disable buttons, show spinner

**Custom CSS** (minimal):
```css
#editor-main {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid #ccc;
}

.language-buttons .btn-group {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

#value-input {
  min-height: 100px;
}

.editor-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
```

### Task 4.7: Create Unit Tests

**File**: `test/components/SheetEditor.test.mjs`

**Test Approach**: Test DOM updates and event emissions (mock DOM elements)

**Test Cases**:

```
✓ render() creates HTML structure
✓ render() populates key dropdown
✓ Key selection updates shown value
✓ Language selection changes input field
✓ Value input emits 'value-changed' event
✓ Unsaved indicator shows on value change
✓ Unsaved count increases/decreases
✓ Add Row button opens dialog for key name
✓ Add Row validates key doesn't exist
✓ Hymn-related keys show children's checkbox
✓ Hymn checkbox checked: prepends "CS "
✓ Hymn checkbox unchecked: removes "CS "
✓ Save button emits 'save' event
✓ Save button disables during save
✓ Discard button asks for confirmation
✓ Discard button clears unsaved state
✓ Error message displays toast
✓ Success message displays toast
✓ destroy() cleans up event listeners
✓ Multiple language changes tracked
✓ Pipe-separated notes preserved in hymn values
```

**Mocking**:
- Mock DOM elements using jsdom
- Mock EditorStateManager methods
- Mock window.alert/confirm
- Test event emissions via custom event listeners

---

## Phase 5: Editor Page & Navigation

**Objective**: Create `editor.html` page and integrate OAuth + Editor UI. Add navigation from main app.

**Duration**: ~10-12 hours  
**Context Required**: Medium (HTML structure, OAuth flow, navigation)  
**Files Created**: `editor.html`, `js/editor.js`, `test/editor.test.mjs`

### Task 5.1: Create editor.html Page

**File**: `editor.html`

**Structure**: Mirror `index.html` but with editor-specific content

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description
```


## License: unknown
https://github.com/MDMahabulAlam/Influncer-Website/blob/63d92e4f35c901770d7303051dd532a9d326cb87/Card.html

```
I'll provide you with the comprehensive plan as a detailed document that you can save. Since I don't have file writing tools available, I'll present the complete plan in a code block that you can save directly to `./docs/FEATURE_CMS_EDIT.md`:

```markdown
# Feature Plan: CMS Sheet Editor (Google Sheets OAuth + Form UI)

**Version**: 1.0  
**Last Updated**: March 10, 2026  
**Status**: Ready for Implementation  
**Estimated Duration**: 6 phases, ~100-120 hours total (can parallelize some tasks)

---

## 📋 Table of Contents

1. [Overview & Architecture](#overview--architecture)
2. [Design Decisions](#design-decisions)
3. [Technical Architecture](#technical-architecture)
4. [Phase 1: OAuth Module](#phase-1-oauth-module)
5. [Phase 2: Google Sheets API Service](#phase-2-google-sheets-api-service)
6. [Phase 3: Editor State Manager](#phase-3-editor-state-manager)
7. [Phase 4: Editor UI Component](#phase-4-editor-ui-component)
8. [Phase 5: Editor Page & Navigation](#phase-5-editor-page--navigation)
9. [Phase 6: Tests & Deployment](#phase-6-tests--deployment)
10. [Data Structures & Interfaces](#data-structures--interfaces)
11. [Testing Specifications](#testing-specifications)
12. [Integration Checklist](#integration-checklist)
13. [Risk Mitigation](#risk-mitigation)

---

## Overview & Architecture

### What We're Building

A **Google Sheets CMS interface** that allows authorized editors to modify meeting program data directly in the app. Features:

- **Google OAuth 2.0 authentication** (PKCE flow, client-side only)
- **Collaborator verification** against the currently-loaded Google Sheet
- **Form-based UI** with scrollable key/value pairs, language selectors, validation
- **Local state management** with IndexedDB persistence for in-progress edits
- **Batch CSV upload** back to Google Sheets (not row-by-row)
- **Graceful "Viewer Only" fallback** for non-editors
- **No backend required** (GitHub Pages compatible)

### Why This Approach?

| Requirement | Solution | Why Not Others |
|---|---|---|
| **Free hosting** | GitHub Pages (static) | Avoiding backend costs ✅ |
| **No tech accounts** | Google OAuth (user's own account) | Users already have Google accounts |
| **Edit protection** | OAuth + Collaborators check | Verified against actual Sheet permissions |
| **Offline-ready** | IndexedDB state storage | Can edit offline, upload when online |
| **Easy CSV export** | CSV validation + upload | Reversible, debuggable, portable |
| **Non-tech friendly** | Form UI with pills/dropdowns | Visual, clear, no CSV syntax needed |

---

## Design Decisions

### 1. Authentication: Google OAuth 2.0 with PKCE

**Decision**: Use Google Identity Services (gis) library for browser-based OAuth authentication.

**Why**:
- No backend needed (PKCE flow works entirely client-side)
- Users sign in with account they already have
- Provides access token to call Google Sheets API
- Can verify user is a Sheet collaborator
- Token stored in `sessionStorage` (cleared on browser close) for security

**Implementation**:
- User navigates to `/editor.html`
- Click "Sign in with Google" button
- Google login popup appears
- After auth, token stored in `sessionStorage`
- App checks if user is collaborator on current sheet
- If yes: show editor; if no: show "Viewer Only"

### 2. Data Flow: Form UI + Batch Upload

**Decision**: Build form UI with field-by-field editing; upload all changes in one batch.

**Why**:
- Better UX than downloading/editing CSV locally
- Batch upload is safer than row-by-row API calls
- Can validate entire dataset before upload
- Less error-prone than incremental saves
- Users can edit multiple fields, review, then upload

**Data Lifecycle**:
1. Load current CSV from Sheet (via public export URL)
2. Parse into in-memory object: `{ key: { en, es, fr, swa } }`
3. Store in IndexedDB (survives page reload)
4. Editor modifies fields via form UI
5. On "Save": validate CSV, call Sheets API to append/update rows
6. After success: reload data, clear unsaved indicator

### 3. Permission Model: Collaborators Check

**Decision**: Check if authenticated user is a collaborator on the current Sheet.

**Why**:
- Tied to actual Sheet permissions (most secure)
- No manual allow-lists to maintain
- User only edits sheets they have permission for
- Leverages existing Google Sheet sharing

**Flow**:
1. Get sheet ID from current profile's CSV URL
2. After OAuth sign-in, call `spreadsheets.get()` to fetch collaborators
3. Compare user's email to collaborators list
4. Show/hide editor UI accordingly

### 4. UI Pattern: Scrollable Form with Language Pills

**Decision**: Single scrollable list of all keys, with key selector, language buttons, single input field.

**Why**:
- One key at a time prevents overwhelming users
- Language pills (Bootstrap 5) are clear and visual
- Single input field reduces UI complexity
- Scrollable list shows all available fields
- Matches your original spec exactly

**Form Structure**:
```
[Sign in / Logged in as: user@gmail.com] [Sign out]

Key Dropdown: [speaker1 ▼]
Language Pills: [EN] [ES] [FR] [SWA]
Input Field: [textarea with current value]
Add Row ➕ | Save Changes ✓

Unsaved: 3 changes pending
```

### 5. State Persistence: IndexedDB + Session

**Decision**: Keep edited data in IndexedDB during session; clear on sign-out.

**Why**:
- Survives page reload/accidental close
- User can ask "Resume editing?" on reload
- Keeps edits local until upload
- Session-based (not long-term storage)
- Encrypted in browser's secure storage

---

## Technical Architecture

### High-Level Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    editor.html                              │
│         (New page, mirrors index.html structure)             │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    js/editor.js                              │
│  (Orchestrator: loads profiles, checks auth, renders UI)    │
└─────────────────────────────────────────────────────────────┘
                            │
                ┌───────────┼───────────┐
                ▼           ▼           ▼
         ┌──────────┐ ┌──────────┐ ┌──────────┐
         │googleAuth│ │sheetsApi │ │editorState│
         │   .js    │ │Service.js│ │Manager.js │
         └──────────┘ └──────────┘ └──────────┘
                │           │           │
                └───────────┼───────────┘
                            │
                            ▼
         ┌──────────────────────────────────┐
         │  js/components/SheetEditor.mjs   │
         │        (UI Component)            │
         └──────────────────────────────────┘
                            │
                            ▼
         ┌──────────────────────────────────┐
         │      IndexedDB (Dexie)           │
         │   (editor._state store)          │
         └──────────────────────────────────┘
```

### File Organization

```
js/
├── auth/
│   └── googleAuth.js               [NEW] OAuth 2.0 module
├── services/
│   └── sheetsApiService.js         [NEW] Google Sheets API calls
├── data/
│   └── EditorStateManager.js       [NEW] In-memory state + persistence
├── components/
│   └── SheetEditor.mjs             [NEW] Form UI component
├── editor.js                        [NEW] Editor page entry point
└── [existing modules unchanged]

editor.html                          [NEW] Editor page

test/
├── auth/
│   └── googleAuth.test.mjs         [NEW] Auth tests
├── services/
│   └── sheetsApiService.test.mjs   [NEW] API service tests
├── data/
│   └── EditorStateManager.test.mjs [NEW] State manager tests
├── components/
│   └── SheetEditor.test.mjs        [NEW] UI component tests
└── editor.test.mjs                 [NEW] Integration tests

e2e/
├── scenarios/
│   └── editor.spec.js              [NEW] E2E scenarios

docs/
├── FEATURE_CMS_EDIT.md             [THIS FILE]
└── [existing docs unchanged]
```

### Dependencies

**External Libraries** (already in package.json):
- `dexie` v4.3.0 — IndexedDB abstraction (already used)
- Google Identity Services — Added via CDN script tag in editor.html

**No new npm dependencies**

---

## Phase 1: OAuth Module

**Objective**: Implement Google OAuth 2.0 authentication with PKCE flow.

**Duration**: ~8-10 hours  
**Context Required**: Medium (auth patterns, Google API basics)  
**Files Created**: `js/auth/googleAuth.js`, `test/auth/googleAuth.test.mjs`

### Task 1.1: Create googleAuth Module Structure

**File**: `js/auth/googleAuth.js`

Create a module that:
- Exports an object: `GoogleAuth` with methods listed below
- Initializes Google Identity Services (gis) on load
- NO external dependencies except gis library (loaded via CDN in editor.html)

**Methods to implement**:

```javascript
GoogleAuth.initialize(clientId, redirectUri)
GoogleAuth.signIn()                    // Opens Google login popup
GoogleAuth.signOut()                   // Clears token, closes session
GoogleAuth.getAccessToken()            // Returns token from sessionStorage
GoogleAuth.isAuthenticated()           // Returns boolean
GoogleAuth.getUser()                   // Returns { email, name }
GoogleAuth.onTokenExpire(callback)     // Handles token refresh
```

**Session Storage Keys**:
- `gm_access_token` — OAuth access token
- `gm_user_email` — User's email
- `gm_token_expires` — Token expiry timestamp (ms)

**Error Handling**:
- If user cancels login: resolve to `null` (don't throw)
- If token expires: auto-refresh or trigger re-auth
- Log all errors to `[AUTH]` prefix

**Notes**:
- Use `sessionStorage` only (cleared on browser close)
- Never use `localStorage` for tokens
- Implement token expiry check before API calls
- Google sign-out should clear all stored data

### Task 1.2: Handle PKCE Flow (Authorization Code)

**Context**: PKCE (Proof Key for Code Exchange) is how OAuth 2.0 works in browsers without backend.

**Implementation Details**:

1. Generate `code_verifier` (43-128 char random string)
2. Hash it to `code_challenge` (SHA-256)
3. Send user to Google auth endpoint with `code_challenge`
4. User grants permission
5. Google redirects back with authorization `code`
6. Exchange `code` + `code_verifier` for access token
7. Store token in `sessionStorage`

**Library**: Use `google-gsi` (Google Identity Services)
- Already available via CDN: `https://accounts.google.com/gsi/client`
- Handles PKCE automatically
- Simpler to use than raw OAuth

**Code Flow**:
```javascript
// In googleAuth.js
function generatePKCEPair() {
  // Generate random code_verifier
  // SHA-256 hash to code_challenge
  // Return { verifier, challenge }
}

async function exchangeCodeForToken(code, codeVerifier) {
  // POST to Google token endpoint
  // Return access token
}
```

**Testing**:
- Mock `sessionStorage`
- Mock Google gsi library
- Test token generation/storage
- Test error cases (network, user cancel)

### Task 1.3: Implement Token Refresh & Expiry

**Requirement**: Access tokens expire in ~1 hour. Handle gracefully.

**Implementation**:
1. Store token `expires_at` timestamp when token received
2. Before API calls: check if `Date.now() > expires_at`
3. If expired: trigger refresh flow
4. If refresh fails: sign out and require re-auth

**Methods**:
```javascript
GoogleAuth.isTokenExpired()
GoogleAuth.refreshToken()
GoogleAuth.onTokenExpire(callback)  // Register handler
```

**Edge Case**: If user's Google session has ended, refresh will fail. Show "Please sign in again" message.

### Task 1.4: Create Unit Tests for Auth

**File**: `test/auth/googleAuth.test.mjs`

**Test Cases**:

```
✓ signIn() opens Google popup
✓ On successful auth, token stored in sessionStorage
✓ isAuthenticated() returns true after sign-in
✓ isAuthenticated() returns false before sign-in
✓ getAccessToken() returns token string
✓ getUser() returns { email, name }
✓ Token expiry is calculated correctly
✓ signOut() clears sessionStorage
✓ isTokenExpired() returns true for expired token
✓ refreshToken() updates token before expiry
✓ On network error, gracefully handle (don't crash)
✓ On user cancel, resolve to null (not throw)
✓ Multiple sign-in calls don't create duplicate popups
```

**Mocking**:
- Mock global `google` object (from gis library)
- Mock `sessionStorage`
- Mock `fetch` for token endpoint

---

## Phase 2: Google Sheets API Service

**Objective**: Wrapper for Google Sheets API operations (check collaborators, upload data).

**Duration**: ~10-12 hours  
**Context Required**: Medium (Google Sheets API, HTTP requests)  
**Files Created**: `js/services/sheetsApiService.js`, `test/services/sheetsApiService.test.mjs`

### Task 2.1: Create Sheets API Service Structure

**File**: `js/services/sheetsApiService.js`

**Methods to export**:

```javascript
SheetsAPI.initialize(accessToken)              // Set auth token
SheetsAPI.getSpreadsheetMetadata(sheetId)      // Get sheet info + collaborators
SheetsAPI.checkIfCollaborator(sheetId, email)  // Boolean
SheetsAPI.getSheetValues(sheetId, range)       // Fetch cell values
SheetsAPI.appendRows(sheetId, values)          // Add rows to sheet
SheetsAPI.updateRows(sheetId, values)          // Update existing rows
SheetsAPI.uploadCSV(sheetId, csvData)          // Replace entire sheet data
```

**Dependencies**:
- `GoogleAuth` module (to get access token)
- Standard `fetch` API (no external library)

**Base Endpoint**: `https://sheets.googleapis.com/v4/spreadsheets`

**Required OAuth Scope**: `https://www.googleapis.com/auth/spreadsheets`

**Error Handling**:
- Log all HTTP errors with request details
- Return `{ success: false, error: "message" }` for failures
- Throw on authentication errors (token expired, unauthorized)
- Network timeouts: implement 30-second timeout

### Task 2.2: Extract Sheet ID from CSV URL

**Context**: Current profiles store CSV export URLs. Need to extract sheet ID.

**Sheet URL Patterns**:
```
CSV export URL: https://docs.google.com/spreadsheets/d/ABC123XYZ/gviz/tq?tqx=out:csv
Sheet ID:       ABC123XYZ (extract from /d/.../)

Normal sheet URL: https://docs.google.com/spreadsheets/d/ABC123XYZ/edit#gid=0
Sheet ID:        ABC123XYZ (same extraction)
```

**Function**:
```javascript
function extractSheetIdFromUrl(csvUrl) {
  // return sheet ID string, or null if invalid
}
```

**Validation**:
- Ensure URL contains `docs.google.com/spreadsheets/d/`
- Ensure ID is alphanumeric (no special chars)
- Return `null` for invalid URLs

### Task 2.3: Implement `getSpreadsheetMetadata()`

**API Call**: `GET /v4/spreadsheets/{sheetId}`

**Returns**:
```json
{
  "spreadsheetId": "ABC123XYZ",
  "properties": {
    "title": "Sacrament Program",
    "locale": "en_US",
    ...
  }
}
```

**Additional**: Fetch collaborators via Drive API (optional advanced feature; for now, assume we can determine from spreadsheet.properties)

**Note**: Google Sheets API's `spreadsheets.get()` requires the user to have at least Viewer access. Request with `fields=spreadsheetId,properties` to minimize response size.

### Task 2.4: Implement `checkIfCollaborator()`

**Logic**:
1. Call `getSpreadsheetMetadata(sheetId)`
2. Check `spreadsheetProperties` for owner/editors
3. Compare `GoogleAuth.getUser().email` to collaborators list
4. Return `true` if match, `false` otherwise

**Edge Cases**:
- User email might have different case (do case-insensitive compare)
- If metadata doesn't contain collaborators, conservative approach: `return false` (deny access)
- If API call fails: `throw` error (don't silently deny)

**Alternative** (if Google Sheets API doesn't provide collaborators easily):
- Could use Drive API's `permissions` endpoint
- For now, assume metadata provides this info; adjust if not available

### Task 2.5: Implement CSV Upload/Append

**Historical Context**: App currently uses public CSV export URLs (read-only).

**New Requirement**: Upload modified CSV back to Sheet.

**Two Approaches**:

**Option A: Append Rows** (Simpler)
- API: `POST /v4/spreadsheets/{sheetId}/values:append`
- Each edited row sent as new row
- Pro: Simple, no row-by-row tracking
- Con: Duplicates sheet data if not careful

**Option B: Clear & Replace** (Safer)
- API: `POST /v4/spreadsheets/{sheetId}/values:batchUpdate`
- Clear all data, write new CSV
- Pro: Guaranteed consistent state
- Con: All-or-nothing (can't recover if network fails mid-upload)

**Decision**: Use **Option B** (Clear & Replace) with validation

**Implementation**:

```javascript
async function uploadCSV(sheetId, csvData) {
  // 1. Validate csvData format (check headers, etc.)
  // 2. Parse CSV into 2D array (rows + columns)
  // 3. Call Sheets API:
  //    - DELETE all rows from Sheet1
  //    - APPEND new CSV data
  // 4. Return { success, sheetId, rowsWritten }
}
```

**API Call**:
```
POST /v4/spreadsheets/{sheetId}/values/Sheet1:clear
POST /v4/spreadsheets/{sheetId}/values/Sheet1:append
  Body: { values: [ ["key", "en", "es", "fr", "swa"], [...], [...] ] }
```

**Error Recovery**:
- If clear succeeds but append fails: sheet is empty (bad)
- Mitigation: Check sheet before upload, warn user
- Alternative: Use local backup copy for recovery

### Task 2.6: Create Unit Tests for Sheets API Service

**File**: `test/services/sheetsApiService.test.mjs`

**Test Cases**:

```
✓ extractSheetIdFromUrl() extracts ID correctly
✓ extractSheetIdFromUrl() rejects invalid URLs
✓ getSpreadsheetMetadata() makes correct API call
✓ getSpreadsheetMetadata() parses response
✓ checkIfCollaborator() returns true for collaborators
✓ checkIfCollaborator() returns false for non-collaborators
✓ checkIfCollaborator() is case-insensitive for email
✓ uploadCSV() calls clear then append
✓ uploadCSV() throws on validation error
✓ uploadCSV() returns row count
✓ On 401 Unauthorized: throw auth error
✓ On 403 Forbidden: throw permission error
✓ On network timeout: throw with timeout message
✓ On invalid CSV: return validation error
```

**Mocking**:
- Mock `fetch` for all API calls
- Mock `GoogleAuth.getAccessToken()`
- Mock `GoogleAuth.getUser()`

---

## Phase 3: Editor State Manager

**Objective**: In-memory state management for edited CSV data with IndexedDB persistence.

**Duration**: ~10-12 hours  
**Context Required**: Medium (IndexedDB, CSV parsing, state management)  
**Files Created**: `js/data/EditorStateManager.js`, `test/data/EditorStateManager.test.mjs`

### Task 3.1: Create EditorStateManager Structure

**File**: `js/data/EditorStateManager.js`

**Purpose**: Hold edited CSV data in memory, track changes, persist to IndexedDB.

**Internal Data Structure**:

```javascript
// Parsed CSV stored as:
{
  headers: ["key", "en", "es", "fr", "swa"],
  rows: {
    "unitName": {
      en: "Your Ward Name",
      es: "Nombre de Su Rama",
      fr: "Nom de Votre Branche",
      swa: "Jina la Kimanda Yako"
    },
    "speaker1": {
      en: "John Smith",
      es: "", // Empty = fallback to English
      fr: "",
      swa: ""
    },
    // ... more rows
  },
  // Track which fields have unsaved changes
  unsavedChanges: {
    "unitName": { en: true, es: false, fr: false, swa: false },
    "speaker1": { en: false, es: true, fr: false, swa: false },
  },
  // Metadata
  sheetId: "ABC123XYZ",
  createdAt: Date.now(),
  lastModified: Date.now()
}
```

**Class Methods**:

```javascript
class EditorStateManager {
  constructor(sheetId) {
    this.sheetId = sheetId;
    this.state = { /* as above */ };
  }

  async loadFromSheet(csvUrl) {
    // Fetch current CSV from sheet
    // Parse it into state.rows
    // Save to IndexedDB
  }

  getValue(key, language = "en") {
    // Return value for key + language
    // Fallback to English if empty
  }

  setValue(key, language, value) {
    // Update value, mark as changed
    // Don't save to DB yet (only on explicit save)
  }

  addRow(key, values = {}) {
    // Add new key with optional values
    // Mark as new/unsaved
  }

  deleteRow(key) {
    // Mark row for deletion
  }

  getUnsavedCount() {
    // Return number of changed fields
  }

  getChangedRows() {
    // Return only rows with unsaved changes
  }

  async validate() {
    // Check CSV structure, keys, hymn format
    // Return { valid: boolean, errors: [] }
  }

  toCSV() {
    // Generate CSV string ready for upload
    // Includes validation
  }

  async saveChanges(csvData) {
    // Save edited state to IndexedDB for session persistence
  }

  async discardChanges() {
    // Clear unsaved state, reload from sheet
  }

  async clear() {
    // Delete all editor data from IndexedDB
  }

  static async resume(sheetId) {
    // Check if previous session exists
    // Return EditorStateManager instance or null
  }
}
```

### Task 3.2: Implement CSV Parsing & Validation

**Requirement**: Parse Google Sheet CSV into structured data.

**CSV Format**:
```
key,en,es,fr,swa
unitName,Your Ward,Su Rama,Votre Branche,Kimanda Yako
speaker1,John Smith,Juan Garcia,Jean Dupont,Yohana Mto
openingHymn,62
CS 2,Accompaniment by Sister Smith
```

**Parsing Logic**:
1. Use existing `parseCSV()` from `js/utils/csv.js` as reference
2. Detect CSV format: simple (key, value) vs. multi-lang (key, en, es, fr, swa)
3. Extract headers row
4. Parse data rows into dictionary structure
5. Normalize language values (trim whitespace, handle quotes)

**Validation Rules** (Task 3.3):
1. **Required headers**: Must have "key" column
2. **Language columns**: "en", "es", "fr", "swa" (if multi-lang format)
3. **No duplicate keys**: Each key appears only once
4. **Hymn format**: If key ends with "Hymn":
   - Value must be number (e.g., `62`, `1001`)
   - OR `CS` + space + number + optional letter (e.g., `CS 2`, `CS 73a`)
5. **Required fields**: "key" must be non-empty, "en" must be non-empty (unless fallback)
6. **No XSS payload**: Sanitize values (reuse `sanitizeEntry()` from `js/sanitize.js`)

**Error Messages**:
```javascript
{
  errors: [
    { row: 2, column: "opening Hymn", message: "Invalid hymn format: must be number or CS{space}number" },
    { row: 5, column: "key", message: "Duplicate key: 'speaker1' already defined at row 3" },
    { row: "header", column: "es", message: "Missing required language column" }
  ]
}
```

### Task 3.3: Implement Hymn Format Validation

**Context**: Hymn fields can have special format:
- Regular: `62` (hymn number)
- Children's: `CS 2` (with space, can have letter like `CS 73a`)
- With note: `62|Sung by Primary` (pipe-separated annotation)

**Validation Function**:

```javascript
function validateHymnValue(value) {
  if (!value) return { valid: false, error: "Hymn value cannot be empty" };
  
  // Split on pipe to get hymn part
  const [hymnPart] = value.split("|");
  const hymn = hymnPart.trim();
  
  // Pattern: number OR "CS {number}{optional letter}"
  const hymnRegex = /^(\d{1,4}|CS [0-9]{1,4}[a-z]?)$/i;
  
  if (!hymnRegex.test(hymn)) {
    return {
      valid: false,
      error: `Invalid hymn: ${hymn}. Use format: "62" or "CS 2" or "CS 73a", optionally with "|Note"`
    };
  }
  
  return { valid: true };
}
```

**Hymn Lookup** (Optional Enhancement):
- Reference `js/data/hymnsLookup.js` to validate hymn numbers exist
- For now: just validate format (not whether hymn exists)
- Can add lookup validation in Phase 4

### Task 3.4: Implement IndexedDB Persistence

**Context**: Store editor state so user can reload page and resume editing.

**IndexedDB Store**: `editor._state`

**Schema**:
```javascript
// In js/data/db.js (existing Dexie setup)
// Add new store:
editor_state: "sheetId, createdAt" // Compound key
```

**Stored Data**:
```javascript
{
  id: "auto-generated",
  sheetId: "ABC123XYZ",
  createdAt: Date.now(),
  lastModified: Date.now(),
  expiresAt: createdAt + (24 * 60 * 60 * 1000), // 24h session
  state: { /* EditorStateManager.state */ },
  csvUrl: "https://docs.google.com/..."
}
```

**Methods**:

```javascript
async function saveSessionState(sheetId, state, csvUrl) {
  // Store to IndexedDB
  // Return saved object with ID
}

async function getSessionState(sheetId) {
  // Fetch from IndexedDB
  // Check if expired (24h)
  // Return state or null
}

async function deleteSessionState(sheetId) {
  // Remove from IndexedDB
}

async function resumeSession(sheetId) {
  // Check if session exists
  // Ask user: "Resume editing? X changes pending"
  // Return EditorStateManager with restored state or null
}
```

**Expiry Policy**: Sessions expire after 24 hours (paranoid safety).

### Task 3.5: Implement toCSV() & String Generation

**Requirement**: Convert in-memory state back to CSV string format suitable for upload.

**Function**:

```javascript
toCSV() {
  // 1. Build header: "key,en,es,fr,swa"
  // 2. For each row, quote fields with commas/newlines
  // 3. Handle fallback: if language cell empty, use English value
  // 4. Return as string ready for Sheets API
}

// Example output:
// key,en,es,fr,swa
// unitName,Your Ward,Su Rama,Votre Branche,Kimanda Yako
// speaker1,"Smith, John","García, Juan","Dupont, Jean","Mtu, Yohana"
// openingHymn,62
//
```

**CSV Quoting Rules**:
- Quote fields containing: comma, newline, quotes
- Escape quotes: `"` → `""`
- Leave other fields unquoted

**Reference**: Use logic from `js/utils/csv.js` as template.

### Task 3.6: Create Unit Tests

**File**: `test/data/EditorStateManager.test.mjs`

**Test Cases**:

```
✓ loadFromSheet() fetches and parses CSV correctly
✓ loadFromSheet() handles multi-language format
✓ loadFromSheet() handles simple key-value format
✓ getValue() returns correct value
✓ getValue() falls back to English if language empty
✓ setValue() updates value and marks unsaved
✓ addRow() adds new key with empty values
✓ deleteRow() marks row for deletion
✓ getUnsavedCount() returns correct count
✓ getChangedRows() returns only unsaved rows
✓ validate() rejects duplicate keys
✓ validate() rejects invalid hymn format
✓ validate() rejects duplicate hymn with "CS" prefix
✓ validate() catches empty key
✓ toCSV() generates valid CSV string
✓ toCSV() quotes fields with commas
✓ toCSV() includes all languages
✓ saveChanges() stores to IndexedDB
✓ resumeSession() restores previous state
✓ discardChanges() clears unsaved state
✓ Session expires after 24 hours
```

**Mocking**:
- Mock `fetch` for CSV download
- Mock IndexedDB via `fake-indexeddb`
- Mock `sanitizeEntry()`

---

## Phase 4: Editor UI Component

**Objective**: React-like component for editor form (scrollable list, key selector, language pills, input field).

**Duration**: ~12-14 hours  
**Context Required**: Medium-High (DOM manipulation, event handling, Bootstrap 5)  
**Files Created**: `js/components/SheetEditor.mjs`, `test/components/SheetEditor.test.mjs`

### Task 4.1: Design UI Structure & Components

**HTML Structure** (will be rendered by JavaScript):

```html
<div id="editor-main">
  <!-- Authentication Section -->
  <div id="auth-section">
    <button id="signin-btn" class="btn btn-primary">Sign in with Google</button>
  </div>

  <!-- Editor Section (hidden until auth) -->
  <div id="editor-section" style="display: none;">
    <!-- User Info -->
    <div class="editor-header">
      <span class="user-email">Logged in as: user@gmail.com</span>
      <button id="signout-btn" class="btn btn-sm btn-secondary">Sign out</button>
    </div>

    <!-- Key Selector & Language -->
    <div class="editor-controls">
      <div class="form-group">
        <label for="key-select">Key:</label>
        <select id="key-select" class="form-control">
          <option value="">-- Select a key --</option>
          <option value="unitName">unitName</option>
          <option value="speaker1">speaker1</option>
          <!-- ... all keys ... -->
        </select>
      </div>

      <!-- Language Pills (Bootstrap 5 buttons) -->
      <div class="language-buttons mt-3">
        <label>Language:</label>
        <div class="btn-group" role="group">
          <input type="radio" class="btn-check" name="language" id="lang-en" value="en" checked>
          <label class="btn btn-outline-primary" for="lang-en">English</label>
          
          <input type="radio" class="btn-check" name="language" id="lang-es" value="es">
          <label class="btn btn-outline-primary" for="lang-es">Español</label>
          
          <input type="radio" class="btn-check" name="language" id="lang-fr" value="fr">
          <label class="btn btn-outline-primary" for="lang-fr">Français</label>
          
          <input type="radio" class="btn-check" name="language" id="lang-swa" value="swa">
          <label class="btn btn-outline-primary" for="lang-swa">Kiswahili</label>
        </div>
      </div>
    </div>

    <!-- Value Input -->
    <div class="form-group mt-4">
      <label for="value-input">Value:</label>
      <textarea id="value-input" class="form-control" rows="4" placeholder="Enter value..."></textarea>
      
      <!-- Hymn Checkbox (shown for *Hymn keys) -->
      <div id="hymn-options" class="mt-2" style="display: none;">
        <div class="form-check">
          <input type="checkbox" class="form-check-input" id="hymn-children" value="children">
          <label class="form-check-label" for="hymn-children">
            Children's Song (prepends "CS ")
          </label>
        </div>
      </div>
    </div>

    <!-- Unsaved Indicator -->
    <div id="unsaved-indicator" class="alert alert-warning mt-3" style="display: none;">
      <strong>⚠ Unsaved Changes:</strong> <span id="unsaved-count">0</span> fields modified
    </div>

    <!-- Action Buttons -->
    <div class="editor-actions mt-4">
      <button id="add-row-btn" class="btn btn-success">➕ Add New Field</button>
      <button id="save-btn" class="btn btn-primary">✓ Save Changes</button>
      <button id="discard-btn" class="btn btn-secondary">Clear Changes</button>
    </div>
  </div>

  <!-- Viewer-Only Section -->
  <div id="viewer-only-section" style="display: none;">
    <div class="alert alert-info">
      <h4>Viewer</h4>
      <p>You don't have permission to edit this sheet. Only collaborators can edit.</p>
    </div>
  </div>
</div>
```

### Task 4.2: Create SheetEditor Component Class

**File**: `js/components/SheetEditor.mjs`

**Class Structure**:

```javascript
export class SheetEditor {
  constructor(containerSelector, editorStateManager, options = {}) {
    this.container = document.querySelector(containerSelector);
    this.stateManager = editorStateManager;
    this.currentKey = null;
    this.currentLanguage = "en";
    this.isEditing = false;
    
    this.options = {
      onSave: null,    // Callback when Save clicked
      onAddRow: null,  // Callback when Add Row clicked
      ...options
    };
    
    this.eventHandlers = {};
  }

  async render() {
    // Build HTML structure above
    // Attach event listeners
    // Load keys into dropdown
  }

  on(eventName, callback) {
    // event.addListener pattern
    // Supported events: 'value-changed', 'key-selected', 'language-changed', 'save', 'add-row'
  }

  setValue(key, language, value) {
    // Update input field to show value
    // Update unsaved indicator
  }

  setKey(key) {
    // Change which key is being edited
    // Update select dropdown
    // Load value for new key
    // Show/hide hymn checkbox
  }

  setLanguage(language) {
    // Change selected language
    // Load value for new language
  }

  updateKeyList(keys) {
    // Refresh dropdown with new keys (after adding row)
  }

  showUnsavedIndicator(count) {
    // Show/hide and update count
  }

  setLoading(isLoading) {
    // Disable buttons while saving
    // Show spinner
  }

  showError(message) {
    // Toast/alert with error message
  }

  showSuccess(message) {
    // Toast/alert with success message
  }

  destroy() {
    // Clean up event listeners
  }
}
```

### Task 4.3: Implement Event Handlers & DOM Updates

**Event Handlers to Attach**:

1. **Key Selection** (`#key-select` change)
   - Emit `key-selected` event with new key
   - Load value from EditorStateManager
   - Show/hide hymn options
   - Update language pills

2. **Language Selection** (radio buttons)
   - Emit `language-changed` event
   - Load value for selected language from EditorStateManager
   - Update input field

3. **Value Input Change** (`#value-input` input)
   - Emit `value-changed` { key, language, value } event
   - Update EditorStateManager
   - Mark as unsaved
   - Show unsaved indicator

4. **Hymn Children's Checkbox** (`#hymn-children` change)
   - If checked: prepend "CS " to value
   - If unchecked: remove "CS " prefix
   - Emit `value-changed` event

5. **Add Row Button** (`#add-row-btn` click)
   - Emit `add-row` event
   - Prompt user for new key name
   - Validate key doesn't exist
   - Add to EditorStateManager
   - Refresh key dropdown
   - Select new key

6. **Save Button** (`#save-btn` click)
   - Emit `save` event with all changes
   - Disable buttons, show loading
   - Wait for parent to validate & upload
   - On success: clear unsaved indicator

7. **Discard Button** (`#discard-btn` click)
   - Ask for confirmation
   - Clear all unsaved changes
   - Reload values from EditorStateManager
   - Hide unsaved indicator

### Task 4.4: Implement Hymn Field Logic

**Hymn Detection**: If key ends with "Hymn" (case-insensitive):
- Show checkbox: "Children's Song (prepends 'CS ')"
- When checkbox checked: ensure value starts with "CS "
- When checkbox unchecked: remove "CS " prefix

**Examples**:
- User enters "2" + checks "Children's Song" → value becomes "CS 2"
- User enters "CS 2" + unchecks box → value becomes "2"
- User enters "CS 73a" + can check/uncheck
- If user manually types "CS 2": checkbox auto-checks

**Special Case**: Hymn value might include note (pipe-separated):
- "62|Sung by choir" → can edit "62" part, keep "|Sung by choir"
- Children's logic applies to hymn number part only

### Task 4.5: Implement Unsaved Indicator

**Requirements**:
- Show alert box when any field modified
- Display count of unsaved fields
- Update in real-time
- Update on Add Row
- Clear on Save or Discard

**HTML**:
```html
<div id="unsaved-indicator" class="alert alert-warning" style="display: none;">
  <strong>⚠ Unsaved Changes:</strong> <span id="unsaved-count">0</span> fields modified
</div>
```

**Logic**:
1. EditorStateManager tracks unsavedChanges
2. SheetEditor calls `stateManager.getUnsavedCount()`
3. Update DOM to show/hide indicator
4. Listen for `value-changed` events to update count

### Task 4.6: Style with Bootstrap 5

**CSS Considerations**:
- Use Bootstrap 5 CDN in `editor.html`
- Language pills: use Bootstrap btn-group + btn-check pattern
- Form layout: use form-control, form-group classes
- Validation messages: use alert classes
- Loading state: disable buttons, show spinner

**Custom CSS** (minimal):
```css
#editor-main {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid #ccc;
}

.language-buttons .btn-group {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

#value-input {
  min-height: 100px;
}

.editor-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
```

### Task 4.7: Create Unit Tests

**File**: `test/components/SheetEditor.test.mjs`

**Test Approach**: Test DOM updates and event emissions (mock DOM elements)

**Test Cases**:

```
✓ render() creates HTML structure
✓ render() populates key dropdown
✓ Key selection updates shown value
✓ Language selection changes input field
✓ Value input emits 'value-changed' event
✓ Unsaved indicator shows on value change
✓ Unsaved count increases/decreases
✓ Add Row button opens dialog for key name
✓ Add Row validates key doesn't exist
✓ Hymn-related keys show children's checkbox
✓ Hymn checkbox checked: prepends "CS "
✓ Hymn checkbox unchecked: removes "CS "
✓ Save button emits 'save' event
✓ Save button disables during save
✓ Discard button asks for confirmation
✓ Discard button clears unsaved state
✓ Error message displays toast
✓ Success message displays toast
✓ destroy() cleans up event listeners
✓ Multiple language changes tracked
✓ Pipe-separated notes preserved in hymn values
```

**Mocking**:
- Mock DOM elements using jsdom
- Mock EditorStateManager methods
- Mock window.alert/confirm
- Test event emissions via custom event listeners

---

## Phase 5: Editor Page & Navigation

**Objective**: Create `editor.html` page and integrate OAuth + Editor UI. Add navigation from main app.

**Duration**: ~10-12 hours  
**Context Required**: Medium (HTML structure, OAuth flow, navigation)  
**Files Created**: `editor.html`, `js/editor.js`, `test/editor.test.mjs`

### Task 5.1: Create editor.html Page

**File**: `editor.html`

**Structure**: Mirror `index.html` but with editor-specific content

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="Meeting Program CMS - Edit Sheet Data">
  <title>Edit Meeting Program</title>
  
  <!-- Bootstrap 5 CSS -->
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
  
  <!-- App CSS -->
  <link rel="stylesheet" href="css/styles.css">
  
  <!-- Service
```


## License: unknown
https://github.com/MDMahabulAlam/Influncer-Website/blob/63d92e4f35c901770d7303051dd532a9d326cb87/Card.html

```
I'll provide you with the comprehensive plan as a detailed document that you can save. Since I don't have file writing tools available, I'll present the complete plan in a code block that you can save directly to `./docs/FEATURE_CMS_EDIT.md`:

```markdown
# Feature Plan: CMS Sheet Editor (Google Sheets OAuth + Form UI)

**Version**: 1.0  
**Last Updated**: March 10, 2026  
**Status**: Ready for Implementation  
**Estimated Duration**: 6 phases, ~100-120 hours total (can parallelize some tasks)

---

## 📋 Table of Contents

1. [Overview & Architecture](#overview--architecture)
2. [Design Decisions](#design-decisions)
3. [Technical Architecture](#technical-architecture)
4. [Phase 1: OAuth Module](#phase-1-oauth-module)
5. [Phase 2: Google Sheets API Service](#phase-2-google-sheets-api-service)
6. [Phase 3: Editor State Manager](#phase-3-editor-state-manager)
7. [Phase 4: Editor UI Component](#phase-4-editor-ui-component)
8. [Phase 5: Editor Page & Navigation](#phase-5-editor-page--navigation)
9. [Phase 6: Tests & Deployment](#phase-6-tests--deployment)
10. [Data Structures & Interfaces](#data-structures--interfaces)
11. [Testing Specifications](#testing-specifications)
12. [Integration Checklist](#integration-checklist)
13. [Risk Mitigation](#risk-mitigation)

---

## Overview & Architecture

### What We're Building

A **Google Sheets CMS interface** that allows authorized editors to modify meeting program data directly in the app. Features:

- **Google OAuth 2.0 authentication** (PKCE flow, client-side only)
- **Collaborator verification** against the currently-loaded Google Sheet
- **Form-based UI** with scrollable key/value pairs, language selectors, validation
- **Local state management** with IndexedDB persistence for in-progress edits
- **Batch CSV upload** back to Google Sheets (not row-by-row)
- **Graceful "Viewer Only" fallback** for non-editors
- **No backend required** (GitHub Pages compatible)

### Why This Approach?

| Requirement | Solution | Why Not Others |
|---|---|---|
| **Free hosting** | GitHub Pages (static) | Avoiding backend costs ✅ |
| **No tech accounts** | Google OAuth (user's own account) | Users already have Google accounts |
| **Edit protection** | OAuth + Collaborators check | Verified against actual Sheet permissions |
| **Offline-ready** | IndexedDB state storage | Can edit offline, upload when online |
| **Easy CSV export** | CSV validation + upload | Reversible, debuggable, portable |
| **Non-tech friendly** | Form UI with pills/dropdowns | Visual, clear, no CSV syntax needed |

---

## Design Decisions

### 1. Authentication: Google OAuth 2.0 with PKCE

**Decision**: Use Google Identity Services (gis) library for browser-based OAuth authentication.

**Why**:
- No backend needed (PKCE flow works entirely client-side)
- Users sign in with account they already have
- Provides access token to call Google Sheets API
- Can verify user is a Sheet collaborator
- Token stored in `sessionStorage` (cleared on browser close) for security

**Implementation**:
- User navigates to `/editor.html`
- Click "Sign in with Google" button
- Google login popup appears
- After auth, token stored in `sessionStorage`
- App checks if user is collaborator on current sheet
- If yes: show editor; if no: show "Viewer Only"

### 2. Data Flow: Form UI + Batch Upload

**Decision**: Build form UI with field-by-field editing; upload all changes in one batch.

**Why**:
- Better UX than downloading/editing CSV locally
- Batch upload is safer than row-by-row API calls
- Can validate entire dataset before upload
- Less error-prone than incremental saves
- Users can edit multiple fields, review, then upload

**Data Lifecycle**:
1. Load current CSV from Sheet (via public export URL)
2. Parse into in-memory object: `{ key: { en, es, fr, swa } }`
3. Store in IndexedDB (survives page reload)
4. Editor modifies fields via form UI
5. On "Save": validate CSV, call Sheets API to append/update rows
6. After success: reload data, clear unsaved indicator

### 3. Permission Model: Collaborators Check

**Decision**: Check if authenticated user is a collaborator on the current Sheet.

**Why**:
- Tied to actual Sheet permissions (most secure)
- No manual allow-lists to maintain
- User only edits sheets they have permission for
- Leverages existing Google Sheet sharing

**Flow**:
1. Get sheet ID from current profile's CSV URL
2. After OAuth sign-in, call `spreadsheets.get()` to fetch collaborators
3. Compare user's email to collaborators list
4. Show/hide editor UI accordingly

### 4. UI Pattern: Scrollable Form with Language Pills

**Decision**: Single scrollable list of all keys, with key selector, language buttons, single input field.

**Why**:
- One key at a time prevents overwhelming users
- Language pills (Bootstrap 5) are clear and visual
- Single input field reduces UI complexity
- Scrollable list shows all available fields
- Matches your original spec exactly

**Form Structure**:
```
[Sign in / Logged in as: user@gmail.com] [Sign out]

Key Dropdown: [speaker1 ▼]
Language Pills: [EN] [ES] [FR] [SWA]
Input Field: [textarea with current value]
Add Row ➕ | Save Changes ✓

Unsaved: 3 changes pending
```

### 5. State Persistence: IndexedDB + Session

**Decision**: Keep edited data in IndexedDB during session; clear on sign-out.

**Why**:
- Survives page reload/accidental close
- User can ask "Resume editing?" on reload
- Keeps edits local until upload
- Session-based (not long-term storage)
- Encrypted in browser's secure storage

---

## Technical Architecture

### High-Level Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    editor.html                              │
│         (New page, mirrors index.html structure)             │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    js/editor.js                              │
│  (Orchestrator: loads profiles, checks auth, renders UI)    │
└─────────────────────────────────────────────────────────────┘
                            │
                ┌───────────┼───────────┐
                ▼           ▼           ▼
         ┌──────────┐ ┌──────────┐ ┌──────────┐
         │googleAuth│ │sheetsApi │ │editorState│
         │   .js    │ │Service.js│ │Manager.js │
         └──────────┘ └──────────┘ └──────────┘
                │           │           │
                └───────────┼───────────┘
                            │
                            ▼
         ┌──────────────────────────────────┐
         │  js/components/SheetEditor.mjs   │
         │        (UI Component)            │
         └──────────────────────────────────┘
                            │
                            ▼
         ┌──────────────────────────────────┐
         │      IndexedDB (Dexie)           │
         │   (editor._state store)          │
         └──────────────────────────────────┘
```

### File Organization

```
js/
├── auth/
│   └── googleAuth.js               [NEW] OAuth 2.0 module
├── services/
│   └── sheetsApiService.js         [NEW] Google Sheets API calls
├── data/
│   └── EditorStateManager.js       [NEW] In-memory state + persistence
├── components/
│   └── SheetEditor.mjs             [NEW] Form UI component
├── editor.js                        [NEW] Editor page entry point
└── [existing modules unchanged]

editor.html                          [NEW] Editor page

test/
├── auth/
│   └── googleAuth.test.mjs         [NEW] Auth tests
├── services/
│   └── sheetsApiService.test.mjs   [NEW] API service tests
├── data/
│   └── EditorStateManager.test.mjs [NEW] State manager tests
├── components/
│   └── SheetEditor.test.mjs        [NEW] UI component tests
└── editor.test.mjs                 [NEW] Integration tests

e2e/
├── scenarios/
│   └── editor.spec.js              [NEW] E2E scenarios

docs/
├── FEATURE_CMS_EDIT.md             [THIS FILE]
└── [existing docs unchanged]
```

### Dependencies

**External Libraries** (already in package.json):
- `dexie` v4.3.0 — IndexedDB abstraction (already used)
- Google Identity Services — Added via CDN script tag in editor.html

**No new npm dependencies**

---

## Phase 1: OAuth Module

**Objective**: Implement Google OAuth 2.0 authentication with PKCE flow.

**Duration**: ~8-10 hours  
**Context Required**: Medium (auth patterns, Google API basics)  
**Files Created**: `js/auth/googleAuth.js`, `test/auth/googleAuth.test.mjs`

### Task 1.1: Create googleAuth Module Structure

**File**: `js/auth/googleAuth.js`

Create a module that:
- Exports an object: `GoogleAuth` with methods listed below
- Initializes Google Identity Services (gis) on load
- NO external dependencies except gis library (loaded via CDN in editor.html)

**Methods to implement**:

```javascript
GoogleAuth.initialize(clientId, redirectUri)
GoogleAuth.signIn()                    // Opens Google login popup
GoogleAuth.signOut()                   // Clears token, closes session
GoogleAuth.getAccessToken()            // Returns token from sessionStorage
GoogleAuth.isAuthenticated()           // Returns boolean
GoogleAuth.getUser()                   // Returns { email, name }
GoogleAuth.onTokenExpire(callback)     // Handles token refresh
```

**Session Storage Keys**:
- `gm_access_token` — OAuth access token
- `gm_user_email` — User's email
- `gm_token_expires` — Token expiry timestamp (ms)

**Error Handling**:
- If user cancels login: resolve to `null` (don't throw)
- If token expires: auto-refresh or trigger re-auth
- Log all errors to `[AUTH]` prefix

**Notes**:
- Use `sessionStorage` only (cleared on browser close)
- Never use `localStorage` for tokens
- Implement token expiry check before API calls
- Google sign-out should clear all stored data

### Task 1.2: Handle PKCE Flow (Authorization Code)

**Context**: PKCE (Proof Key for Code Exchange) is how OAuth 2.0 works in browsers without backend.

**Implementation Details**:

1. Generate `code_verifier` (43-128 char random string)
2. Hash it to `code_challenge` (SHA-256)
3. Send user to Google auth endpoint with `code_challenge`
4. User grants permission
5. Google redirects back with authorization `code`
6. Exchange `code` + `code_verifier` for access token
7. Store token in `sessionStorage`

**Library**: Use `google-gsi` (Google Identity Services)
- Already available via CDN: `https://accounts.google.com/gsi/client`
- Handles PKCE automatically
- Simpler to use than raw OAuth

**Code Flow**:
```javascript
// In googleAuth.js
function generatePKCEPair() {
  // Generate random code_verifier
  // SHA-256 hash to code_challenge
  // Return { verifier, challenge }
}

async function exchangeCodeForToken(code, codeVerifier) {
  // POST to Google token endpoint
  // Return access token
}
```

**Testing**:
- Mock `sessionStorage`
- Mock Google gsi library
- Test token generation/storage
- Test error cases (network, user cancel)

### Task 1.3: Implement Token Refresh & Expiry

**Requirement**: Access tokens expire in ~1 hour. Handle gracefully.

**Implementation**:
1. Store token `expires_at` timestamp when token received
2. Before API calls: check if `Date.now() > expires_at`
3. If expired: trigger refresh flow
4. If refresh fails: sign out and require re-auth

**Methods**:
```javascript
GoogleAuth.isTokenExpired()
GoogleAuth.refreshToken()
GoogleAuth.onTokenExpire(callback)  // Register handler
```

**Edge Case**: If user's Google session has ended, refresh will fail. Show "Please sign in again" message.

### Task 1.4: Create Unit Tests for Auth

**File**: `test/auth/googleAuth.test.mjs`

**Test Cases**:

```
✓ signIn() opens Google popup
✓ On successful auth, token stored in sessionStorage
✓ isAuthenticated() returns true after sign-in
✓ isAuthenticated() returns false before sign-in
✓ getAccessToken() returns token string
✓ getUser() returns { email, name }
✓ Token expiry is calculated correctly
✓ signOut() clears sessionStorage
✓ isTokenExpired() returns true for expired token
✓ refreshToken() updates token before expiry
✓ On network error, gracefully handle (don't crash)
✓ On user cancel, resolve to null (not throw)
✓ Multiple sign-in calls don't create duplicate popups
```

**Mocking**:
- Mock global `google` object (from gis library)
- Mock `sessionStorage`
- Mock `fetch` for token endpoint

---

## Phase 2: Google Sheets API Service

**Objective**: Wrapper for Google Sheets API operations (check collaborators, upload data).

**Duration**: ~10-12 hours  
**Context Required**: Medium (Google Sheets API, HTTP requests)  
**Files Created**: `js/services/sheetsApiService.js`, `test/services/sheetsApiService.test.mjs`

### Task 2.1: Create Sheets API Service Structure

**File**: `js/services/sheetsApiService.js`

**Methods to export**:

```javascript
SheetsAPI.initialize(accessToken)              // Set auth token
SheetsAPI.getSpreadsheetMetadata(sheetId)      // Get sheet info + collaborators
SheetsAPI.checkIfCollaborator(sheetId, email)  // Boolean
SheetsAPI.getSheetValues(sheetId, range)       // Fetch cell values
SheetsAPI.appendRows(sheetId, values)          // Add rows to sheet
SheetsAPI.updateRows(sheetId, values)          // Update existing rows
SheetsAPI.uploadCSV(sheetId, csvData)          // Replace entire sheet data
```

**Dependencies**:
- `GoogleAuth` module (to get access token)
- Standard `fetch` API (no external library)

**Base Endpoint**: `https://sheets.googleapis.com/v4/spreadsheets`

**Required OAuth Scope**: `https://www.googleapis.com/auth/spreadsheets`

**Error Handling**:
- Log all HTTP errors with request details
- Return `{ success: false, error: "message" }` for failures
- Throw on authentication errors (token expired, unauthorized)
- Network timeouts: implement 30-second timeout

### Task 2.2: Extract Sheet ID from CSV URL

**Context**: Current profiles store CSV export URLs. Need to extract sheet ID.

**Sheet URL Patterns**:
```
CSV export URL: https://docs.google.com/spreadsheets/d/ABC123XYZ/gviz/tq?tqx=out:csv
Sheet ID:       ABC123XYZ (extract from /d/.../)

Normal sheet URL: https://docs.google.com/spreadsheets/d/ABC123XYZ/edit#gid=0
Sheet ID:        ABC123XYZ (same extraction)
```

**Function**:
```javascript
function extractSheetIdFromUrl(csvUrl) {
  // return sheet ID string, or null if invalid
}
```

**Validation**:
- Ensure URL contains `docs.google.com/spreadsheets/d/`
- Ensure ID is alphanumeric (no special chars)
- Return `null` for invalid URLs

### Task 2.3: Implement `getSpreadsheetMetadata()`

**API Call**: `GET /v4/spreadsheets/{sheetId}`

**Returns**:
```json
{
  "spreadsheetId": "ABC123XYZ",
  "properties": {
    "title": "Sacrament Program",
    "locale": "en_US",
    ...
  }
}
```

**Additional**: Fetch collaborators via Drive API (optional advanced feature; for now, assume we can determine from spreadsheet.properties)

**Note**: Google Sheets API's `spreadsheets.get()` requires the user to have at least Viewer access. Request with `fields=spreadsheetId,properties` to minimize response size.

### Task 2.4: Implement `checkIfCollaborator()`

**Logic**:
1. Call `getSpreadsheetMetadata(sheetId)`
2. Check `spreadsheetProperties` for owner/editors
3. Compare `GoogleAuth.getUser().email` to collaborators list
4. Return `true` if match, `false` otherwise

**Edge Cases**:
- User email might have different case (do case-insensitive compare)
- If metadata doesn't contain collaborators, conservative approach: `return false` (deny access)
- If API call fails: `throw` error (don't silently deny)

**Alternative** (if Google Sheets API doesn't provide collaborators easily):
- Could use Drive API's `permissions` endpoint
- For now, assume metadata provides this info; adjust if not available

### Task 2.5: Implement CSV Upload/Append

**Historical Context**: App currently uses public CSV export URLs (read-only).

**New Requirement**: Upload modified CSV back to Sheet.

**Two Approaches**:

**Option A: Append Rows** (Simpler)
- API: `POST /v4/spreadsheets/{sheetId}/values:append`
- Each edited row sent as new row
- Pro: Simple, no row-by-row tracking
- Con: Duplicates sheet data if not careful

**Option B: Clear & Replace** (Safer)
- API: `POST /v4/spreadsheets/{sheetId}/values:batchUpdate`
- Clear all data, write new CSV
- Pro: Guaranteed consistent state
- Con: All-or-nothing (can't recover if network fails mid-upload)

**Decision**: Use **Option B** (Clear & Replace) with validation

**Implementation**:

```javascript
async function uploadCSV(sheetId, csvData) {
  // 1. Validate csvData format (check headers, etc.)
  // 2. Parse CSV into 2D array (rows + columns)
  // 3. Call Sheets API:
  //    - DELETE all rows from Sheet1
  //    - APPEND new CSV data
  // 4. Return { success, sheetId, rowsWritten }
}
```

**API Call**:
```
POST /v4/spreadsheets/{sheetId}/values/Sheet1:clear
POST /v4/spreadsheets/{sheetId}/values/Sheet1:append
  Body: { values: [ ["key", "en", "es", "fr", "swa"], [...], [...] ] }
```

**Error Recovery**:
- If clear succeeds but append fails: sheet is empty (bad)
- Mitigation: Check sheet before upload, warn user
- Alternative: Use local backup copy for recovery

### Task 2.6: Create Unit Tests for Sheets API Service

**File**: `test/services/sheetsApiService.test.mjs`

**Test Cases**:

```
✓ extractSheetIdFromUrl() extracts ID correctly
✓ extractSheetIdFromUrl() rejects invalid URLs
✓ getSpreadsheetMetadata() makes correct API call
✓ getSpreadsheetMetadata() parses response
✓ checkIfCollaborator() returns true for collaborators
✓ checkIfCollaborator() returns false for non-collaborators
✓ checkIfCollaborator() is case-insensitive for email
✓ uploadCSV() calls clear then append
✓ uploadCSV() throws on validation error
✓ uploadCSV() returns row count
✓ On 401 Unauthorized: throw auth error
✓ On 403 Forbidden: throw permission error
✓ On network timeout: throw with timeout message
✓ On invalid CSV: return validation error
```

**Mocking**:
- Mock `fetch` for all API calls
- Mock `GoogleAuth.getAccessToken()`
- Mock `GoogleAuth.getUser()`

---

## Phase 3: Editor State Manager

**Objective**: In-memory state management for edited CSV data with IndexedDB persistence.

**Duration**: ~10-12 hours  
**Context Required**: Medium (IndexedDB, CSV parsing, state management)  
**Files Created**: `js/data/EditorStateManager.js`, `test/data/EditorStateManager.test.mjs`

### Task 3.1: Create EditorStateManager Structure

**File**: `js/data/EditorStateManager.js`

**Purpose**: Hold edited CSV data in memory, track changes, persist to IndexedDB.

**Internal Data Structure**:

```javascript
// Parsed CSV stored as:
{
  headers: ["key", "en", "es", "fr", "swa"],
  rows: {
    "unitName": {
      en: "Your Ward Name",
      es: "Nombre de Su Rama",
      fr: "Nom de Votre Branche",
      swa: "Jina la Kimanda Yako"
    },
    "speaker1": {
      en: "John Smith",
      es: "", // Empty = fallback to English
      fr: "",
      swa: ""
    },
    // ... more rows
  },
  // Track which fields have unsaved changes
  unsavedChanges: {
    "unitName": { en: true, es: false, fr: false, swa: false },
    "speaker1": { en: false, es: true, fr: false, swa: false },
  },
  // Metadata
  sheetId: "ABC123XYZ",
  createdAt: Date.now(),
  lastModified: Date.now()
}
```

**Class Methods**:

```javascript
class EditorStateManager {
  constructor(sheetId) {
    this.sheetId = sheetId;
    this.state = { /* as above */ };
  }

  async loadFromSheet(csvUrl) {
    // Fetch current CSV from sheet
    // Parse it into state.rows
    // Save to IndexedDB
  }

  getValue(key, language = "en") {
    // Return value for key + language
    // Fallback to English if empty
  }

  setValue(key, language, value) {
    // Update value, mark as changed
    // Don't save to DB yet (only on explicit save)
  }

  addRow(key, values = {}) {
    // Add new key with optional values
    // Mark as new/unsaved
  }

  deleteRow(key) {
    // Mark row for deletion
  }

  getUnsavedCount() {
    // Return number of changed fields
  }

  getChangedRows() {
    // Return only rows with unsaved changes
  }

  async validate() {
    // Check CSV structure, keys, hymn format
    // Return { valid: boolean, errors: [] }
  }

  toCSV() {
    // Generate CSV string ready for upload
    // Includes validation
  }

  async saveChanges(csvData) {
    // Save edited state to IndexedDB for session persistence
  }

  async discardChanges() {
    // Clear unsaved state, reload from sheet
  }

  async clear() {
    // Delete all editor data from IndexedDB
  }

  static async resume(sheetId) {
    // Check if previous session exists
    // Return EditorStateManager instance or null
  }
}
```

### Task 3.2: Implement CSV Parsing & Validation

**Requirement**: Parse Google Sheet CSV into structured data.

**CSV Format**:
```
key,en,es,fr,swa
unitName,Your Ward,Su Rama,Votre Branche,Kimanda Yako
speaker1,John Smith,Juan Garcia,Jean Dupont,Yohana Mto
openingHymn,62
CS 2,Accompaniment by Sister Smith
```

**Parsing Logic**:
1. Use existing `parseCSV()` from `js/utils/csv.js` as reference
2. Detect CSV format: simple (key, value) vs. multi-lang (key, en, es, fr, swa)
3. Extract headers row
4. Parse data rows into dictionary structure
5. Normalize language values (trim whitespace, handle quotes)

**Validation Rules** (Task 3.3):
1. **Required headers**: Must have "key" column
2. **Language columns**: "en", "es", "fr", "swa" (if multi-lang format)
3. **No duplicate keys**: Each key appears only once
4. **Hymn format**: If key ends with "Hymn":
   - Value must be number (e.g., `62`, `1001`)
   - OR `CS` + space + number + optional letter (e.g., `CS 2`, `CS 73a`)
5. **Required fields**: "key" must be non-empty, "en" must be non-empty (unless fallback)
6. **No XSS payload**: Sanitize values (reuse `sanitizeEntry()` from `js/sanitize.js`)

**Error Messages**:
```javascript
{
  errors: [
    { row: 2, column: "opening Hymn", message: "Invalid hymn format: must be number or CS{space}number" },
    { row: 5, column: "key", message: "Duplicate key: 'speaker1' already defined at row 3" },
    { row: "header", column: "es", message: "Missing required language column" }
  ]
}
```

### Task 3.3: Implement Hymn Format Validation

**Context**: Hymn fields can have special format:
- Regular: `62` (hymn number)
- Children's: `CS 2` (with space, can have letter like `CS 73a`)
- With note: `62|Sung by Primary` (pipe-separated annotation)

**Validation Function**:

```javascript
function validateHymnValue(value) {
  if (!value) return { valid: false, error: "Hymn value cannot be empty" };
  
  // Split on pipe to get hymn part
  const [hymnPart] = value.split("|");
  const hymn = hymnPart.trim();
  
  // Pattern: number OR "CS {number}{optional letter}"
  const hymnRegex = /^(\d{1,4}|CS [0-9]{1,4}[a-z]?)$/i;
  
  if (!hymnRegex.test(hymn)) {
    return {
      valid: false,
      error: `Invalid hymn: ${hymn}. Use format: "62" or "CS 2" or "CS 73a", optionally with "|Note"`
    };
  }
  
  return { valid: true };
}
```

**Hymn Lookup** (Optional Enhancement):
- Reference `js/data/hymnsLookup.js` to validate hymn numbers exist
- For now: just validate format (not whether hymn exists)
- Can add lookup validation in Phase 4

### Task 3.4: Implement IndexedDB Persistence

**Context**: Store editor state so user can reload page and resume editing.

**IndexedDB Store**: `editor._state`

**Schema**:
```javascript
// In js/data/db.js (existing Dexie setup)
// Add new store:
editor_state: "sheetId, createdAt" // Compound key
```

**Stored Data**:
```javascript
{
  id: "auto-generated",
  sheetId: "ABC123XYZ",
  createdAt: Date.now(),
  lastModified: Date.now(),
  expiresAt: createdAt + (24 * 60 * 60 * 1000), // 24h session
  state: { /* EditorStateManager.state */ },
  csvUrl: "https://docs.google.com/..."
}
```

**Methods**:

```javascript
async function saveSessionState(sheetId, state, csvUrl) {
  // Store to IndexedDB
  // Return saved object with ID
}

async function getSessionState(sheetId) {
  // Fetch from IndexedDB
  // Check if expired (24h)
  // Return state or null
}

async function deleteSessionState(sheetId) {
  // Remove from IndexedDB
}

async function resumeSession(sheetId) {
  // Check if session exists
  // Ask user: "Resume editing? X changes pending"
  // Return EditorStateManager with restored state or null
}
```

**Expiry Policy**: Sessions expire after 24 hours (paranoid safety).

### Task 3.5: Implement toCSV() & String Generation

**Requirement**: Convert in-memory state back to CSV string format suitable for upload.

**Function**:

```javascript
toCSV() {
  // 1. Build header: "key,en,es,fr,swa"
  // 2. For each row, quote fields with commas/newlines
  // 3. Handle fallback: if language cell empty, use English value
  // 4. Return as string ready for Sheets API
}

// Example output:
// key,en,es,fr,swa
// unitName,Your Ward,Su Rama,Votre Branche,Kimanda Yako
// speaker1,"Smith, John","García, Juan","Dupont, Jean","Mtu, Yohana"
// openingHymn,62
//
```

**CSV Quoting Rules**:
- Quote fields containing: comma, newline, quotes
- Escape quotes: `"` → `""`
- Leave other fields unquoted

**Reference**: Use logic from `js/utils/csv.js` as template.

### Task 3.6: Create Unit Tests

**File**: `test/data/EditorStateManager.test.mjs`

**Test Cases**:

```
✓ loadFromSheet() fetches and parses CSV correctly
✓ loadFromSheet() handles multi-language format
✓ loadFromSheet() handles simple key-value format
✓ getValue() returns correct value
✓ getValue() falls back to English if language empty
✓ setValue() updates value and marks unsaved
✓ addRow() adds new key with empty values
✓ deleteRow() marks row for deletion
✓ getUnsavedCount() returns correct count
✓ getChangedRows() returns only unsaved rows
✓ validate() rejects duplicate keys
✓ validate() rejects invalid hymn format
✓ validate() rejects duplicate hymn with "CS" prefix
✓ validate() catches empty key
✓ toCSV() generates valid CSV string
✓ toCSV() quotes fields with commas
✓ toCSV() includes all languages
✓ saveChanges() stores to IndexedDB
✓ resumeSession() restores previous state
✓ discardChanges() clears unsaved state
✓ Session expires after 24 hours
```

**Mocking**:
- Mock `fetch` for CSV download
- Mock IndexedDB via `fake-indexeddb`
- Mock `sanitizeEntry()`

---

## Phase 4: Editor UI Component

**Objective**: React-like component for editor form (scrollable list, key selector, language pills, input field).

**Duration**: ~12-14 hours  
**Context Required**: Medium-High (DOM manipulation, event handling, Bootstrap 5)  
**Files Created**: `js/components/SheetEditor.mjs`, `test/components/SheetEditor.test.mjs`

### Task 4.1: Design UI Structure & Components

**HTML Structure** (will be rendered by JavaScript):

```html
<div id="editor-main">
  <!-- Authentication Section -->
  <div id="auth-section">
    <button id="signin-btn" class="btn btn-primary">Sign in with Google</button>
  </div>

  <!-- Editor Section (hidden until auth) -->
  <div id="editor-section" style="display: none;">
    <!-- User Info -->
    <div class="editor-header">
      <span class="user-email">Logged in as: user@gmail.com</span>
      <button id="signout-btn" class="btn btn-sm btn-secondary">Sign out</button>
    </div>

    <!-- Key Selector & Language -->
    <div class="editor-controls">
      <div class="form-group">
        <label for="key-select">Key:</label>
        <select id="key-select" class="form-control">
          <option value="">-- Select a key --</option>
          <option value="unitName">unitName</option>
          <option value="speaker1">speaker1</option>
          <!-- ... all keys ... -->
        </select>
      </div>

      <!-- Language Pills (Bootstrap 5 buttons) -->
      <div class="language-buttons mt-3">
        <label>Language:</label>
        <div class="btn-group" role="group">
          <input type="radio" class="btn-check" name="language" id="lang-en" value="en" checked>
          <label class="btn btn-outline-primary" for="lang-en">English</label>
          
          <input type="radio" class="btn-check" name="language" id="lang-es" value="es">
          <label class="btn btn-outline-primary" for="lang-es">Español</label>
          
          <input type="radio" class="btn-check" name="language" id="lang-fr" value="fr">
          <label class="btn btn-outline-primary" for="lang-fr">Français</label>
          
          <input type="radio" class="btn-check" name="language" id="lang-swa" value="swa">
          <label class="btn btn-outline-primary" for="lang-swa">Kiswahili</label>
        </div>
      </div>
    </div>

    <!-- Value Input -->
    <div class="form-group mt-4">
      <label for="value-input">Value:</label>
      <textarea id="value-input" class="form-control" rows="4" placeholder="Enter value..."></textarea>
      
      <!-- Hymn Checkbox (shown for *Hymn keys) -->
      <div id="hymn-options" class="mt-2" style="display: none;">
        <div class="form-check">
          <input type="checkbox" class="form-check-input" id="hymn-children" value="children">
          <label class="form-check-label" for="hymn-children">
            Children's Song (prepends "CS ")
          </label>
        </div>
      </div>
    </div>

    <!-- Unsaved Indicator -->
    <div id="unsaved-indicator" class="alert alert-warning mt-3" style="display: none;">
      <strong>⚠ Unsaved Changes:</strong> <span id="unsaved-count">0</span> fields modified
    </div>

    <!-- Action Buttons -->
    <div class="editor-actions mt-4">
      <button id="add-row-btn" class="btn btn-success">➕ Add New Field</button>
      <button id="save-btn" class="btn btn-primary">✓ Save Changes</button>
      <button id="discard-btn" class="btn btn-secondary">Clear Changes</button>
    </div>
  </div>

  <!-- Viewer-Only Section -->
  <div id="viewer-only-section" style="display: none;">
    <div class="alert alert-info">
      <h4>Viewer</h4>
      <p>You don't have permission to edit this sheet. Only collaborators can edit.</p>
    </div>
  </div>
</div>
```

### Task 4.2: Create SheetEditor Component Class

**File**: `js/components/SheetEditor.mjs`

**Class Structure**:

```javascript
export class SheetEditor {
  constructor(containerSelector, editorStateManager, options = {}) {
    this.container = document.querySelector(containerSelector);
    this.stateManager = editorStateManager;
    this.currentKey = null;
    this.currentLanguage = "en";
    this.isEditing = false;
    
    this.options = {
      onSave: null,    // Callback when Save clicked
      onAddRow: null,  // Callback when Add Row clicked
      ...options
    };
    
    this.eventHandlers = {};
  }

  async render() {
    // Build HTML structure above
    // Attach event listeners
    // Load keys into dropdown
  }

  on(eventName, callback) {
    // event.addListener pattern
    // Supported events: 'value-changed', 'key-selected', 'language-changed', 'save', 'add-row'
  }

  setValue(key, language, value) {
    // Update input field to show value
    // Update unsaved indicator
  }

  setKey(key) {
    // Change which key is being edited
    // Update select dropdown
    // Load value for new key
    // Show/hide hymn checkbox
  }

  setLanguage(language) {
    // Change selected language
    // Load value for new language
  }

  updateKeyList(keys) {
    // Refresh dropdown with new keys (after adding row)
  }

  showUnsavedIndicator(count) {
    // Show/hide and update count
  }

  setLoading(isLoading) {
    // Disable buttons while saving
    // Show spinner
  }

  showError(message) {
    // Toast/alert with error message
  }

  showSuccess(message) {
    // Toast/alert with success message
  }

  destroy() {
    // Clean up event listeners
  }
}
```

### Task 4.3: Implement Event Handlers & DOM Updates

**Event Handlers to Attach**:

1. **Key Selection** (`#key-select` change)
   - Emit `key-selected` event with new key
   - Load value from EditorStateManager
   - Show/hide hymn options
   - Update language pills

2. **Language Selection** (radio buttons)
   - Emit `language-changed` event
   - Load value for selected language from EditorStateManager
   - Update input field

3. **Value Input Change** (`#value-input` input)
   - Emit `value-changed` { key, language, value } event
   - Update EditorStateManager
   - Mark as unsaved
   - Show unsaved indicator

4. **Hymn Children's Checkbox** (`#hymn-children` change)
   - If checked: prepend "CS " to value
   - If unchecked: remove "CS " prefix
   - Emit `value-changed` event

5. **Add Row Button** (`#add-row-btn` click)
   - Emit `add-row` event
   - Prompt user for new key name
   - Validate key doesn't exist
   - Add to EditorStateManager
   - Refresh key dropdown
   - Select new key

6. **Save Button** (`#save-btn` click)
   - Emit `save` event with all changes
   - Disable buttons, show loading
   - Wait for parent to validate & upload
   - On success: clear unsaved indicator

7. **Discard Button** (`#discard-btn` click)
   - Ask for confirmation
   - Clear all unsaved changes
   - Reload values from EditorStateManager
   - Hide unsaved indicator

### Task 4.4: Implement Hymn Field Logic

**Hymn Detection**: If key ends with "Hymn" (case-insensitive):
- Show checkbox: "Children's Song (prepends 'CS ')"
- When checkbox checked: ensure value starts with "CS "
- When checkbox unchecked: remove "CS " prefix

**Examples**:
- User enters "2" + checks "Children's Song" → value becomes "CS 2"
- User enters "CS 2" + unchecks box → value becomes "2"
- User enters "CS 73a" + can check/uncheck
- If user manually types "CS 2": checkbox auto-checks

**Special Case**: Hymn value might include note (pipe-separated):
- "62|Sung by choir" → can edit "62" part, keep "|Sung by choir"
- Children's logic applies to hymn number part only

### Task 4.5: Implement Unsaved Indicator

**Requirements**:
- Show alert box when any field modified
- Display count of unsaved fields
- Update in real-time
- Update on Add Row
- Clear on Save or Discard

**HTML**:
```html
<div id="unsaved-indicator" class="alert alert-warning" style="display: none;">
  <strong>⚠ Unsaved Changes:</strong> <span id="unsaved-count">0</span> fields modified
</div>
```

**Logic**:
1. EditorStateManager tracks unsavedChanges
2. SheetEditor calls `stateManager.getUnsavedCount()`
3. Update DOM to show/hide indicator
4. Listen for `value-changed` events to update count

### Task 4.6: Style with Bootstrap 5

**CSS Considerations**:
- Use Bootstrap 5 CDN in `editor.html`
- Language pills: use Bootstrap btn-group + btn-check pattern
- Form layout: use form-control, form-group classes
- Validation messages: use alert classes
- Loading state: disable buttons, show spinner

**Custom CSS** (minimal):
```css
#editor-main {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid #ccc;
}

.language-buttons .btn-group {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

#value-input {
  min-height: 100px;
}

.editor-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
```

### Task 4.7: Create Unit Tests

**File**: `test/components/SheetEditor.test.mjs`

**Test Approach**: Test DOM updates and event emissions (mock DOM elements)

**Test Cases**:

```
✓ render() creates HTML structure
✓ render() populates key dropdown
✓ Key selection updates shown value
✓ Language selection changes input field
✓ Value input emits 'value-changed' event
✓ Unsaved indicator shows on value change
✓ Unsaved count increases/decreases
✓ Add Row button opens dialog for key name
✓ Add Row validates key doesn't exist
✓ Hymn-related keys show children's checkbox
✓ Hymn checkbox checked: prepends "CS "
✓ Hymn checkbox unchecked: removes "CS "
✓ Save button emits 'save' event
✓ Save button disables during save
✓ Discard button asks for confirmation
✓ Discard button clears unsaved state
✓ Error message displays toast
✓ Success message displays toast
✓ destroy() cleans up event listeners
✓ Multiple language changes tracked
✓ Pipe-separated notes preserved in hymn values
```

**Mocking**:
- Mock DOM elements using jsdom
- Mock EditorStateManager methods
- Mock window.alert/confirm
- Test event emissions via custom event listeners

---

## Phase 5: Editor Page & Navigation

**Objective**: Create `editor.html` page and integrate OAuth + Editor UI. Add navigation from main app.

**Duration**: ~10-12 hours  
**Context Required**: Medium (HTML structure, OAuth flow, navigation)  
**Files Created**: `editor.html`, `js/editor.js`, `test/editor.test.mjs`

### Task 5.1: Create editor.html Page

**File**: `editor.html`

**Structure**: Mirror `index.html` but with editor-specific content

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="Meeting Program CMS - Edit Sheet Data">
  <title>Edit Meeting Program</title>
  
  <!-- Bootstrap 5 CSS -->
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
  
  <!-- App CSS -->
  <link rel="stylesheet" href="css/styles.css">
  
  <!-- Service
```


## License: unknown
https://github.com/MDMahabulAlam/Influncer-Website/blob/63d92e4f35c901770d7303051dd532a9d326cb87/Card.html

```
I'll provide you with the comprehensive plan as a detailed document that you can save. Since I don't have file writing tools available, I'll present the complete plan in a code block that you can save directly to `./docs/FEATURE_CMS_EDIT.md`:

```markdown
# Feature Plan: CMS Sheet Editor (Google Sheets OAuth + Form UI)

**Version**: 1.0  
**Last Updated**: March 10, 2026  
**Status**: Ready for Implementation  
**Estimated Duration**: 6 phases, ~100-120 hours total (can parallelize some tasks)

---

## 📋 Table of Contents

1. [Overview & Architecture](#overview--architecture)
2. [Design Decisions](#design-decisions)
3. [Technical Architecture](#technical-architecture)
4. [Phase 1: OAuth Module](#phase-1-oauth-module)
5. [Phase 2: Google Sheets API Service](#phase-2-google-sheets-api-service)
6. [Phase 3: Editor State Manager](#phase-3-editor-state-manager)
7. [Phase 4: Editor UI Component](#phase-4-editor-ui-component)
8. [Phase 5: Editor Page & Navigation](#phase-5-editor-page--navigation)
9. [Phase 6: Tests & Deployment](#phase-6-tests--deployment)
10. [Data Structures & Interfaces](#data-structures--interfaces)
11. [Testing Specifications](#testing-specifications)
12. [Integration Checklist](#integration-checklist)
13. [Risk Mitigation](#risk-mitigation)

---

## Overview & Architecture

### What We're Building

A **Google Sheets CMS interface** that allows authorized editors to modify meeting program data directly in the app. Features:

- **Google OAuth 2.0 authentication** (PKCE flow, client-side only)
- **Collaborator verification** against the currently-loaded Google Sheet
- **Form-based UI** with scrollable key/value pairs, language selectors, validation
- **Local state management** with IndexedDB persistence for in-progress edits
- **Batch CSV upload** back to Google Sheets (not row-by-row)
- **Graceful "Viewer Only" fallback** for non-editors
- **No backend required** (GitHub Pages compatible)

### Why This Approach?

| Requirement | Solution | Why Not Others |
|---|---|---|
| **Free hosting** | GitHub Pages (static) | Avoiding backend costs ✅ |
| **No tech accounts** | Google OAuth (user's own account) | Users already have Google accounts |
| **Edit protection** | OAuth + Collaborators check | Verified against actual Sheet permissions |
| **Offline-ready** | IndexedDB state storage | Can edit offline, upload when online |
| **Easy CSV export** | CSV validation + upload | Reversible, debuggable, portable |
| **Non-tech friendly** | Form UI with pills/dropdowns | Visual, clear, no CSV syntax needed |

---

## Design Decisions

### 1. Authentication: Google OAuth 2.0 with PKCE

**Decision**: Use Google Identity Services (gis) library for browser-based OAuth authentication.

**Why**:
- No backend needed (PKCE flow works entirely client-side)
- Users sign in with account they already have
- Provides access token to call Google Sheets API
- Can verify user is a Sheet collaborator
- Token stored in `sessionStorage` (cleared on browser close) for security

**Implementation**:
- User navigates to `/editor.html`
- Click "Sign in with Google" button
- Google login popup appears
- After auth, token stored in `sessionStorage`
- App checks if user is collaborator on current sheet
- If yes: show editor; if no: show "Viewer Only"

### 2. Data Flow: Form UI + Batch Upload

**Decision**: Build form UI with field-by-field editing; upload all changes in one batch.

**Why**:
- Better UX than downloading/editing CSV locally
- Batch upload is safer than row-by-row API calls
- Can validate entire dataset before upload
- Less error-prone than incremental saves
- Users can edit multiple fields, review, then upload

**Data Lifecycle**:
1. Load current CSV from Sheet (via public export URL)
2. Parse into in-memory object: `{ key: { en, es, fr, swa } }`
3. Store in IndexedDB (survives page reload)
4. Editor modifies fields via form UI
5. On "Save": validate CSV, call Sheets API to append/update rows
6. After success: reload data, clear unsaved indicator

### 3. Permission Model: Collaborators Check

**Decision**: Check if authenticated user is a collaborator on the current Sheet.

**Why**:
- Tied to actual Sheet permissions (most secure)
- No manual allow-lists to maintain
- User only edits sheets they have permission for
- Leverages existing Google Sheet sharing

**Flow**:
1. Get sheet ID from current profile's CSV URL
2. After OAuth sign-in, call `spreadsheets.get()` to fetch collaborators
3. Compare user's email to collaborators list
4. Show/hide editor UI accordingly

### 4. UI Pattern: Scrollable Form with Language Pills

**Decision**: Single scrollable list of all keys, with key selector, language buttons, single input field.

**Why**:
- One key at a time prevents overwhelming users
- Language pills (Bootstrap 5) are clear and visual
- Single input field reduces UI complexity
- Scrollable list shows all available fields
- Matches your original spec exactly

**Form Structure**:
```
[Sign in / Logged in as: user@gmail.com] [Sign out]

Key Dropdown: [speaker1 ▼]
Language Pills: [EN] [ES] [FR] [SWA]
Input Field: [textarea with current value]
Add Row ➕ | Save Changes ✓

Unsaved: 3 changes pending
```

### 5. State Persistence: IndexedDB + Session

**Decision**: Keep edited data in IndexedDB during session; clear on sign-out.

**Why**:
- Survives page reload/accidental close
- User can ask "Resume editing?" on reload
- Keeps edits local until upload
- Session-based (not long-term storage)
- Encrypted in browser's secure storage

---

## Technical Architecture

### High-Level Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    editor.html                              │
│         (New page, mirrors index.html structure)             │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    js/editor.js                              │
│  (Orchestrator: loads profiles, checks auth, renders UI)    │
└─────────────────────────────────────────────────────────────┘
                            │
                ┌───────────┼───────────┐
                ▼           ▼           ▼
         ┌──────────┐ ┌──────────┐ ┌──────────┐
         │googleAuth│ │sheetsApi │ │editorState│
         │   .js    │ │Service.js│ │Manager.js │
         └──────────┘ └──────────┘ └──────────┘
                │           │           │
                └───────────┼───────────┘
                            │
                            ▼
         ┌──────────────────────────────────┐
         │  js/components/SheetEditor.mjs   │
         │        (UI Component)            │
         └──────────────────────────────────┘
                            │
                            ▼
         ┌──────────────────────────────────┐
         │      IndexedDB (Dexie)           │
         │   (editor._state store)          │
         └──────────────────────────────────┘
```

### File Organization

```
js/
├── auth/
│   └── googleAuth.js               [NEW] OAuth 2.0 module
├── services/
│   └── sheetsApiService.js         [NEW] Google Sheets API calls
├── data/
│   └── EditorStateManager.js       [NEW] In-memory state + persistence
├── components/
│   └── SheetEditor.mjs             [NEW] Form UI component
├── editor.js                        [NEW] Editor page entry point
└── [existing modules unchanged]

editor.html                          [NEW] Editor page

test/
├── auth/
│   └── googleAuth.test.mjs         [NEW] Auth tests
├── services/
│   └── sheetsApiService.test.mjs   [NEW] API service tests
├── data/
│   └── EditorStateManager.test.mjs [NEW] State manager tests
├── components/
│   └── SheetEditor.test.mjs        [NEW] UI component tests
└── editor.test.mjs                 [NEW] Integration tests

e2e/
├── scenarios/
│   └── editor.spec.js              [NEW] E2E scenarios

docs/
├── FEATURE_CMS_EDIT.md             [THIS FILE]
└── [existing docs unchanged]
```

### Dependencies

**External Libraries** (already in package.json):
- `dexie` v4.3.0 — IndexedDB abstraction (already used)
- Google Identity Services — Added via CDN script tag in editor.html

**No new npm dependencies**

---

## Phase 1: OAuth Module

**Objective**: Implement Google OAuth 2.0 authentication with PKCE flow.

**Duration**: ~8-10 hours  
**Context Required**: Medium (auth patterns, Google API basics)  
**Files Created**: `js/auth/googleAuth.js`, `test/auth/googleAuth.test.mjs`

### Task 1.1: Create googleAuth Module Structure

**File**: `js/auth/googleAuth.js`

Create a module that:
- Exports an object: `GoogleAuth` with methods listed below
- Initializes Google Identity Services (gis) on load
- NO external dependencies except gis library (loaded via CDN in editor.html)

**Methods to implement**:

```javascript
GoogleAuth.initialize(clientId, redirectUri)
GoogleAuth.signIn()                    // Opens Google login popup
GoogleAuth.signOut()                   // Clears token, closes session
GoogleAuth.getAccessToken()            // Returns token from sessionStorage
GoogleAuth.isAuthenticated()           // Returns boolean
GoogleAuth.getUser()                   // Returns { email, name }
GoogleAuth.onTokenExpire(callback)     // Handles token refresh
```

**Session Storage Keys**:
- `gm_access_token` — OAuth access token
- `gm_user_email` — User's email
- `gm_token_expires` — Token expiry timestamp (ms)

**Error Handling**:
- If user cancels login: resolve to `null` (don't throw)
- If token expires: auto-refresh or trigger re-auth
- Log all errors to `[AUTH]` prefix

**Notes**:
- Use `sessionStorage` only (cleared on browser close)
- Never use `localStorage` for tokens
- Implement token expiry check before API calls
- Google sign-out should clear all stored data

### Task 1.2: Handle PKCE Flow (Authorization Code)

**Context**: PKCE (Proof Key for Code Exchange) is how OAuth 2.0 works in browsers without backend.

**Implementation Details**:

1. Generate `code_verifier` (43-128 char random string)
2. Hash it to `code_challenge` (SHA-256)
3. Send user to Google auth endpoint with `code_challenge`
4. User grants permission
5. Google redirects back with authorization `code`
6. Exchange `code` + `code_verifier` for access token
7. Store token in `sessionStorage`

**Library**: Use `google-gsi` (Google Identity Services)
- Already available via CDN: `https://accounts.google.com/gsi/client`
- Handles PKCE automatically
- Simpler to use than raw OAuth

**Code Flow**:
```javascript
// In googleAuth.js
function generatePKCEPair() {
  // Generate random code_verifier
  // SHA-256 hash to code_challenge
  // Return { verifier, challenge }
}

async function exchangeCodeForToken(code, codeVerifier) {
  // POST to Google token endpoint
  // Return access token
}
```

**Testing**:
- Mock `sessionStorage`
- Mock Google gsi library
- Test token generation/storage
- Test error cases (network, user cancel)

### Task 1.3: Implement Token Refresh & Expiry

**Requirement**: Access tokens expire in ~1 hour. Handle gracefully.

**Implementation**:
1. Store token `expires_at` timestamp when token received
2. Before API calls: check if `Date.now() > expires_at`
3. If expired: trigger refresh flow
4. If refresh fails: sign out and require re-auth

**Methods**:
```javascript
GoogleAuth.isTokenExpired()
GoogleAuth.refreshToken()
GoogleAuth.onTokenExpire(callback)  // Register handler
```

**Edge Case**: If user's Google session has ended, refresh will fail. Show "Please sign in again" message.

### Task 1.4: Create Unit Tests for Auth

**File**: `test/auth/googleAuth.test.mjs`

**Test Cases**:

```
✓ signIn() opens Google popup
✓ On successful auth, token stored in sessionStorage
✓ isAuthenticated() returns true after sign-in
✓ isAuthenticated() returns false before sign-in
✓ getAccessToken() returns token string
✓ getUser() returns { email, name }
✓ Token expiry is calculated correctly
✓ signOut() clears sessionStorage
✓ isTokenExpired() returns true for expired token
✓ refreshToken() updates token before expiry
✓ On network error, gracefully handle (don't crash)
✓ On user cancel, resolve to null (not throw)
✓ Multiple sign-in calls don't create duplicate popups
```

**Mocking**:
- Mock global `google` object (from gis library)
- Mock `sessionStorage`
- Mock `fetch` for token endpoint

---

## Phase 2: Google Sheets API Service

**Objective**: Wrapper for Google Sheets API operations (check collaborators, upload data).

**Duration**: ~10-12 hours  
**Context Required**: Medium (Google Sheets API, HTTP requests)  
**Files Created**: `js/services/sheetsApiService.js`, `test/services/sheetsApiService.test.mjs`

### Task 2.1: Create Sheets API Service Structure

**File**: `js/services/sheetsApiService.js`

**Methods to export**:

```javascript
SheetsAPI.initialize(accessToken)              // Set auth token
SheetsAPI.getSpreadsheetMetadata(sheetId)      // Get sheet info + collaborators
SheetsAPI.checkIfCollaborator(sheetId, email)  // Boolean
SheetsAPI.getSheetValues(sheetId, range)       // Fetch cell values
SheetsAPI.appendRows(sheetId, values)          // Add rows to sheet
SheetsAPI.updateRows(sheetId, values)          // Update existing rows
SheetsAPI.uploadCSV(sheetId, csvData)          // Replace entire sheet data
```

**Dependencies**:
- `GoogleAuth` module (to get access token)
- Standard `fetch` API (no external library)

**Base Endpoint**: `https://sheets.googleapis.com/v4/spreadsheets`

**Required OAuth Scope**: `https://www.googleapis.com/auth/spreadsheets`

**Error Handling**:
- Log all HTTP errors with request details
- Return `{ success: false, error: "message" }` for failures
- Throw on authentication errors (token expired, unauthorized)
- Network timeouts: implement 30-second timeout

### Task 2.2: Extract Sheet ID from CSV URL

**Context**: Current profiles store CSV export URLs. Need to extract sheet ID.

**Sheet URL Patterns**:
```
CSV export URL: https://docs.google.com/spreadsheets/d/ABC123XYZ/gviz/tq?tqx=out:csv
Sheet ID:       ABC123XYZ (extract from /d/.../)

Normal sheet URL: https://docs.google.com/spreadsheets/d/ABC123XYZ/edit#gid=0
Sheet ID:        ABC123XYZ (same extraction)
```

**Function**:
```javascript
function extractSheetIdFromUrl(csvUrl) {
  // return sheet ID string, or null if invalid
}
```

**Validation**:
- Ensure URL contains `docs.google.com/spreadsheets/d/`
- Ensure ID is alphanumeric (no special chars)
- Return `null` for invalid URLs

### Task 2.3: Implement `getSpreadsheetMetadata()`

**API Call**: `GET /v4/spreadsheets/{sheetId}`

**Returns**:
```json
{
  "spreadsheetId": "ABC123XYZ",
  "properties": {
    "title": "Sacrament Program",
    "locale": "en_US",
    ...
  }
}
```

**Additional**: Fetch collaborators via Drive API (optional advanced feature; for now, assume we can determine from spreadsheet.properties)

**Note**: Google Sheets API's `spreadsheets.get()` requires the user to have at least Viewer access. Request with `fields=spreadsheetId,properties` to minimize response size.

### Task 2.4: Implement `checkIfCollaborator()`

**Logic**:
1. Call `getSpreadsheetMetadata(sheetId)`
2. Check `spreadsheetProperties` for owner/editors
3. Compare `GoogleAuth.getUser().email` to collaborators list
4. Return `true` if match, `false` otherwise

**Edge Cases**:
- User email might have different case (do case-insensitive compare)
- If metadata doesn't contain collaborators, conservative approach: `return false` (deny access)
- If API call fails: `throw` error (don't silently deny)

**Alternative** (if Google Sheets API doesn't provide collaborators easily):
- Could use Drive API's `permissions` endpoint
- For now, assume metadata provides this info; adjust if not available

### Task 2.5: Implement CSV Upload/Append

**Historical Context**: App currently uses public CSV export URLs (read-only).

**New Requirement**: Upload modified CSV back to Sheet.

**Two Approaches**:

**Option A: Append Rows** (Simpler)
- API: `POST /v4/spreadsheets/{sheetId}/values:append`
- Each edited row sent as new row
- Pro: Simple, no row-by-row tracking
- Con: Duplicates sheet data if not careful

**Option B: Clear & Replace** (Safer)
- API: `POST /v4/spreadsheets/{sheetId}/values:batchUpdate`
- Clear all data, write new CSV
- Pro: Guaranteed consistent state
- Con: All-or-nothing (can't recover if network fails mid-upload)

**Decision**: Use **Option B** (Clear & Replace) with validation

**Implementation**:

```javascript
async function uploadCSV(sheetId, csvData) {
  // 1. Validate csvData format (check headers, etc.)
  // 2. Parse CSV into 2D array (rows + columns)
  // 3. Call Sheets API:
  //    - DELETE all rows from Sheet1
  //    - APPEND new CSV data
  // 4. Return { success, sheetId, rowsWritten }
}
```

**API Call**:
```
POST /v4/spreadsheets/{sheetId}/values/Sheet1:clear
POST /v4/spreadsheets/{sheetId}/values/Sheet1:append
  Body: { values: [ ["key", "en", "es", "fr", "swa"], [...], [...] ] }
```

**Error Recovery**:
- If clear succeeds but append fails: sheet is empty (bad)
- Mitigation: Check sheet before upload, warn user
- Alternative: Use local backup copy for recovery

### Task 2.6: Create Unit Tests for Sheets API Service

**File**: `test/services/sheetsApiService.test.mjs`

**Test Cases**:

```
✓ extractSheetIdFromUrl() extracts ID correctly
✓ extractSheetIdFromUrl() rejects invalid URLs
✓ getSpreadsheetMetadata() makes correct API call
✓ getSpreadsheetMetadata() parses response
✓ checkIfCollaborator() returns true for collaborators
✓ checkIfCollaborator() returns false for non-collaborators
✓ checkIfCollaborator() is case-insensitive for email
✓ uploadCSV() calls clear then append
✓ uploadCSV() throws on validation error
✓ uploadCSV() returns row count
✓ On 401 Unauthorized: throw auth error
✓ On 403 Forbidden: throw permission error
✓ On network timeout: throw with timeout message
✓ On invalid CSV: return validation error
```

**Mocking**:
- Mock `fetch` for all API calls
- Mock `GoogleAuth.getAccessToken()`
- Mock `GoogleAuth.getUser()`

---

## Phase 3: Editor State Manager

**Objective**: In-memory state management for edited CSV data with IndexedDB persistence.

**Duration**: ~10-12 hours  
**Context Required**: Medium (IndexedDB, CSV parsing, state management)  
**Files Created**: `js/data/EditorStateManager.js`, `test/data/EditorStateManager.test.mjs`

### Task 3.1: Create EditorStateManager Structure

**File**: `js/data/EditorStateManager.js`

**Purpose**: Hold edited CSV data in memory, track changes, persist to IndexedDB.

**Internal Data Structure**:

```javascript
// Parsed CSV stored as:
{
  headers: ["key", "en", "es", "fr", "swa"],
  rows: {
    "unitName": {
      en: "Your Ward Name",
      es: "Nombre de Su Rama",
      fr: "Nom de Votre Branche",
      swa: "Jina la Kimanda Yako"
    },
    "speaker1": {
      en: "John Smith",
      es: "", // Empty = fallback to English
      fr: "",
      swa: ""
    },
    // ... more rows
  },
  // Track which fields have unsaved changes
  unsavedChanges: {
    "unitName": { en: true, es: false, fr: false, swa: false },
    "speaker1": { en: false, es: true, fr: false, swa: false },
  },
  // Metadata
  sheetId: "ABC123XYZ",
  createdAt: Date.now(),
  lastModified: Date.now()
}
```

**Class Methods**:

```javascript
class EditorStateManager {
  constructor(sheetId) {
    this.sheetId = sheetId;
    this.state = { /* as above */ };
  }

  async loadFromSheet(csvUrl) {
    // Fetch current CSV from sheet
    // Parse it into state.rows
    // Save to IndexedDB
  }

  getValue(key, language = "en") {
    // Return value for key + language
    // Fallback to English if empty
  }

  setValue(key, language, value) {
    // Update value, mark as changed
    // Don't save to DB yet (only on explicit save)
  }

  addRow(key, values = {}) {
    // Add new key with optional values
    // Mark as new/unsaved
  }

  deleteRow(key) {
    // Mark row for deletion
  }

  getUnsavedCount() {
    // Return number of changed fields
  }

  getChangedRows() {
    // Return only rows with unsaved changes
  }

  async validate() {
    // Check CSV structure, keys, hymn format
    // Return { valid: boolean, errors: [] }
  }

  toCSV() {
    // Generate CSV string ready for upload
    // Includes validation
  }

  async saveChanges(csvData) {
    // Save edited state to IndexedDB for session persistence
  }

  async discardChanges() {
    // Clear unsaved state, reload from sheet
  }

  async clear() {
    // Delete all editor data from IndexedDB
  }

  static async resume(sheetId) {
    // Check if previous session exists
    // Return EditorStateManager instance or null
  }
}
```

### Task 3.2: Implement CSV Parsing & Validation

**Requirement**: Parse Google Sheet CSV into structured data.

**CSV Format**:
```
key,en,es,fr,swa
unitName,Your Ward,Su Rama,Votre Branche,Kimanda Yako
speaker1,John Smith,Juan Garcia,Jean Dupont,Yohana Mto
openingHymn,62
CS 2,Accompaniment by Sister Smith
```

**Parsing Logic**:
1. Use existing `parseCSV()` from `js/utils/csv.js` as reference
2. Detect CSV format: simple (key, value) vs. multi-lang (key, en, es, fr, swa)
3. Extract headers row
4. Parse data rows into dictionary structure
5. Normalize language values (trim whitespace, handle quotes)

**Validation Rules** (Task 3.3):
1. **Required headers**: Must have "key" column
2. **Language columns**: "en", "es", "fr", "swa" (if multi-lang format)
3. **No duplicate keys**: Each key appears only once
4. **Hymn format**: If key ends with "Hymn":
   - Value must be number (e.g., `62`, `1001`)
   - OR `CS` + space + number + optional letter (e.g., `CS 2`, `CS 73a`)
5. **Required fields**: "key" must be non-empty, "en" must be non-empty (unless fallback)
6. **No XSS payload**: Sanitize values (reuse `sanitizeEntry()` from `js/sanitize.js`)

**Error Messages**:
```javascript
{
  errors: [
    { row: 2, column: "opening Hymn", message: "Invalid hymn format: must be number or CS{space}number" },
    { row: 5, column: "key", message: "Duplicate key: 'speaker1' already defined at row 3" },
    { row: "header", column: "es", message: "Missing required language column" }
  ]
}
```

### Task 3.3: Implement Hymn Format Validation

**Context**: Hymn fields can have special format:
- Regular: `62` (hymn number)
- Children's: `CS 2` (with space, can have letter like `CS 73a`)
- With note: `62|Sung by Primary` (pipe-separated annotation)

**Validation Function**:

```javascript
function validateHymnValue(value) {
  if (!value) return { valid: false, error: "Hymn value cannot be empty" };
  
  // Split on pipe to get hymn part
  const [hymnPart] = value.split("|");
  const hymn = hymnPart.trim();
  
  // Pattern: number OR "CS {number}{optional letter}"
  const hymnRegex = /^(\d{1,4}|CS [0-9]{1,4}[a-z]?)$/i;
  
  if (!hymnRegex.test(hymn)) {
    return {
      valid: false,
      error: `Invalid hymn: ${hymn}. Use format: "62" or "CS 2" or "CS 73a", optionally with "|Note"`
    };
  }
  
  return { valid: true };
}
```

**Hymn Lookup** (Optional Enhancement):
- Reference `js/data/hymnsLookup.js` to validate hymn numbers exist
- For now: just validate format (not whether hymn exists)
- Can add lookup validation in Phase 4

### Task 3.4: Implement IndexedDB Persistence

**Context**: Store editor state so user can reload page and resume editing.

**IndexedDB Store**: `editor._state`

**Schema**:
```javascript
// In js/data/db.js (existing Dexie setup)
// Add new store:
editor_state: "sheetId, createdAt" // Compound key
```

**Stored Data**:
```javascript
{
  id: "auto-generated",
  sheetId: "ABC123XYZ",
  createdAt: Date.now(),
  lastModified: Date.now(),
  expiresAt: createdAt + (24 * 60 * 60 * 1000), // 24h session
  state: { /* EditorStateManager.state */ },
  csvUrl: "https://docs.google.com/..."
}
```

**Methods**:

```javascript
async function saveSessionState(sheetId, state, csvUrl) {
  // Store to IndexedDB
  // Return saved object with ID
}

async function getSessionState(sheetId) {
  // Fetch from IndexedDB
  // Check if expired (24h)
  // Return state or null
}

async function deleteSessionState(sheetId) {
  // Remove from IndexedDB
}

async function resumeSession(sheetId) {
  // Check if session exists
  // Ask user: "Resume editing? X changes pending"
  // Return EditorStateManager with restored state or null
}
```

**Expiry Policy**: Sessions expire after 24 hours (paranoid safety).

### Task 3.5: Implement toCSV() & String Generation

**Requirement**: Convert in-memory state back to CSV string format suitable for upload.

**Function**:

```javascript
toCSV() {
  // 1. Build header: "key,en,es,fr,swa"
  // 2. For each row, quote fields with commas/newlines
  // 3. Handle fallback: if language cell empty, use English value
  // 4. Return as string ready for Sheets API
}

// Example output:
// key,en,es,fr,swa
// unitName,Your Ward,Su Rama,Votre Branche,Kimanda Yako
// speaker1,"Smith, John","García, Juan","Dupont, Jean","Mtu, Yohana"
// openingHymn,62
//
```

**CSV Quoting Rules**:
- Quote fields containing: comma, newline, quotes
- Escape quotes: `"` → `""`
- Leave other fields unquoted

**Reference**: Use logic from `js/utils/csv.js` as template.

### Task 3.6: Create Unit Tests

**File**: `test/data/EditorStateManager.test.mjs`

**Test Cases**:

```
✓ loadFromSheet() fetches and parses CSV correctly
✓ loadFromSheet() handles multi-language format
✓ loadFromSheet() handles simple key-value format
✓ getValue() returns correct value
✓ getValue() falls back to English if language empty
✓ setValue() updates value and marks unsaved
✓ addRow() adds new key with empty values
✓ deleteRow() marks row for deletion
✓ getUnsavedCount() returns correct count
✓ getChangedRows() returns only unsaved rows
✓ validate() rejects duplicate keys
✓ validate() rejects invalid hymn format
✓ validate() rejects duplicate hymn with "CS" prefix
✓ validate() catches empty key
✓ toCSV() generates valid CSV string
✓ toCSV() quotes fields with commas
✓ toCSV() includes all languages
✓ saveChanges() stores to IndexedDB
✓ resumeSession() restores previous state
✓ discardChanges() clears unsaved state
✓ Session expires after 24 hours
```

**Mocking**:
- Mock `fetch` for CSV download
- Mock IndexedDB via `fake-indexeddb`
- Mock `sanitizeEntry()`

---

## Phase 4: Editor UI Component

**Objective**: React-like component for editor form (scrollable list, key selector, language pills, input field).

**Duration**: ~12-14 hours  
**Context Required**: Medium-High (DOM manipulation, event handling, Bootstrap 5)  
**Files Created**: `js/components/SheetEditor.mjs`, `test/components/SheetEditor.test.mjs`

### Task 4.1: Design UI Structure & Components

**HTML Structure** (will be rendered by JavaScript):

```html
<div id="editor-main">
  <!-- Authentication Section -->
  <div id="auth-section">
    <button id="signin-btn" class="btn btn-primary">Sign in with Google</button>
  </div>

  <!-- Editor Section (hidden until auth) -->
  <div id="editor-section" style="display: none;">
    <!-- User Info -->
    <div class="editor-header">
      <span class="user-email">Logged in as: user@gmail.com</span>
      <button id="signout-btn" class="btn btn-sm btn-secondary">Sign out</button>
    </div>

    <!-- Key Selector & Language -->
    <div class="editor-controls">
      <div class="form-group">
        <label for="key-select">Key:</label>
        <select id="key-select" class="form-control">
          <option value="">-- Select a key --</option>
          <option value="unitName">unitName</option>
          <option value="speaker1">speaker1</option>
          <!-- ... all keys ... -->
        </select>
      </div>

      <!-- Language Pills (Bootstrap 5 buttons) -->
      <div class="language-buttons mt-3">
        <label>Language:</label>
        <div class="btn-group" role="group">
          <input type="radio" class="btn-check" name="language" id="lang-en" value="en" checked>
          <label class="btn btn-outline-primary" for="lang-en">English</label>
          
          <input type="radio" class="btn-check" name="language" id="lang-es" value="es">
          <label class="btn btn-outline-primary" for="lang-es">Español</label>
          
          <input type="radio" class="btn-check" name="language" id="lang-fr" value="fr">
          <label class="btn btn-outline-primary" for="lang-fr">Français</label>
          
          <input type="radio" class="btn-check" name="language" id="lang-swa" value="swa">
          <label class="btn btn-outline-primary" for="lang-swa">Kiswahili</label>
        </div>
      </div>
    </div>

    <!-- Value Input -->
    <div class="form-group mt-4">
      <label for="value-input">Value:</label>
      <textarea id="value-input" class="form-control" rows="4" placeholder="Enter value..."></textarea>
      
      <!-- Hymn Checkbox (shown for *Hymn keys) -->
      <div id="hymn-options" class="mt-2" style="display: none;">
        <div class="form-check">
          <input type="checkbox" class="form-check-input" id="hymn-children" value="children">
          <label class="form-check-label" for="hymn-children">
            Children's Song (prepends "CS ")
          </label>
        </div>
      </div>
    </div>

    <!-- Unsaved Indicator -->
    <div id="unsaved-indicator" class="alert alert-warning mt-3" style="display: none;">
      <strong>⚠ Unsaved Changes:</strong> <span id="unsaved-count">0</span> fields modified
    </div>

    <!-- Action Buttons -->
    <div class="editor-actions mt-4">
      <button id="add-row-btn" class="btn btn-success">➕ Add New Field</button>
      <button id="save-btn" class="btn btn-primary">✓ Save Changes</button>
      <button id="discard-btn" class="btn btn-secondary">Clear Changes</button>
    </div>
  </div>

  <!-- Viewer-Only Section -->
  <div id="viewer-only-section" style="display: none;">
    <div class="alert alert-info">
      <h4>Viewer</h4>
      <p>You don't have permission to edit this sheet. Only collaborators can edit.</p>
    </div>
  </div>
</div>
```

### Task 4.2: Create SheetEditor Component Class

**File**: `js/components/SheetEditor.mjs`

**Class Structure**:

```javascript
export class SheetEditor {
  constructor(containerSelector, editorStateManager, options = {}) {
    this.container = document.querySelector(containerSelector);
    this.stateManager = editorStateManager;
    this.currentKey = null;
    this.currentLanguage = "en";
    this.isEditing = false;
    
    this.options = {
      onSave: null,    // Callback when Save clicked
      onAddRow: null,  // Callback when Add Row clicked
      ...options
    };
    
    this.eventHandlers = {};
  }

  async render() {
    // Build HTML structure above
    // Attach event listeners
    // Load keys into dropdown
  }

  on(eventName, callback) {
    // event.addListener pattern
    // Supported events: 'value-changed', 'key-selected', 'language-changed', 'save', 'add-row'
  }

  setValue(key, language, value) {
    // Update input field to show value
    // Update unsaved indicator
  }

  setKey(key) {
    // Change which key is being edited
    // Update select dropdown
    // Load value for new key
    // Show/hide hymn checkbox
  }

  setLanguage(language) {
    // Change selected language
    // Load value for new language
  }

  updateKeyList(keys) {
    // Refresh dropdown with new keys (after adding row)
  }

  showUnsavedIndicator(count) {
    // Show/hide and update count
  }

  setLoading(isLoading) {
    // Disable buttons while saving
    // Show spinner
  }

  showError(message) {
    // Toast/alert with error message
  }

  showSuccess(message) {
    // Toast/alert with success message
  }

  destroy() {
    // Clean up event listeners
  }
}
```

### Task 4.3: Implement Event Handlers & DOM Updates

**Event Handlers to Attach**:

1. **Key Selection** (`#key-select` change)
   - Emit `key-selected` event with new key
   - Load value from EditorStateManager
   - Show/hide hymn options
   - Update language pills

2. **Language Selection** (radio buttons)
   - Emit `language-changed` event
   - Load value for selected language from EditorStateManager
   - Update input field

3. **Value Input Change** (`#value-input` input)
   - Emit `value-changed` { key, language, value } event
   - Update EditorStateManager
   - Mark as unsaved
   - Show unsaved indicator

4. **Hymn Children's Checkbox** (`#hymn-children` change)
   - If checked: prepend "CS " to value
   - If unchecked: remove "CS " prefix
   - Emit `value-changed` event

5. **Add Row Button** (`#add-row-btn` click)
   - Emit `add-row` event
   - Prompt user for new key name
   - Validate key doesn't exist
   - Add to EditorStateManager
   - Refresh key dropdown
   - Select new key

6. **Save Button** (`#save-btn` click)
   - Emit `save` event with all changes
   - Disable buttons, show loading
   - Wait for parent to validate & upload
   - On success: clear unsaved indicator

7. **Discard Button** (`#discard-btn` click)
   - Ask for confirmation
   - Clear all unsaved changes
   - Reload values from EditorStateManager
   - Hide unsaved indicator

### Task 4.4: Implement Hymn Field Logic

**Hymn Detection**: If key ends with "Hymn" (case-insensitive):
- Show checkbox: "Children's Song (prepends 'CS ')"
- When checkbox checked: ensure value starts with "CS "
- When checkbox unchecked: remove "CS " prefix

**Examples**:
- User enters "2" + checks "Children's Song" → value becomes "CS 2"
- User enters "CS 2" + unchecks box → value becomes "2"
- User enters "CS 73a" + can check/uncheck
- If user manually types "CS 2": checkbox auto-checks

**Special Case**: Hymn value might include note (pipe-separated):
- "62|Sung by choir" → can edit "62" part, keep "|Sung by choir"
- Children's logic applies to hymn number part only

### Task 4.5: Implement Unsaved Indicator

**Requirements**:
- Show alert box when any field modified
- Display count of unsaved fields
- Update in real-time
- Update on Add Row
- Clear on Save or Discard

**HTML**:
```html
<div id="unsaved-indicator" class="alert alert-warning" style="display: none;">
  <strong>⚠ Unsaved Changes:</strong> <span id="unsaved-count">0</span> fields modified
</div>
```

**Logic**:
1. EditorStateManager tracks unsavedChanges
2. SheetEditor calls `stateManager.getUnsavedCount()`
3. Update DOM to show/hide indicator
4. Listen for `value-changed` events to update count

### Task 4.6: Style with Bootstrap 5

**CSS Considerations**:
- Use Bootstrap 5 CDN in `editor.html`
- Language pills: use Bootstrap btn-group + btn-check pattern
- Form layout: use form-control, form-group classes
- Validation messages: use alert classes
- Loading state: disable buttons, show spinner

**Custom CSS** (minimal):
```css
#editor-main {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid #ccc;
}

.language-buttons .btn-group {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

#value-input {
  min-height: 100px;
}

.editor-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
```

### Task 4.7: Create Unit Tests

**File**: `test/components/SheetEditor.test.mjs`

**Test Approach**: Test DOM updates and event emissions (mock DOM elements)

**Test Cases**:

```
✓ render() creates HTML structure
✓ render() populates key dropdown
✓ Key selection updates shown value
✓ Language selection changes input field
✓ Value input emits 'value-changed' event
✓ Unsaved indicator shows on value change
✓ Unsaved count increases/decreases
✓ Add Row button opens dialog for key name
✓ Add Row validates key doesn't exist
✓ Hymn-related keys show children's checkbox
✓ Hymn checkbox checked: prepends "CS "
✓ Hymn checkbox unchecked: removes "CS "
✓ Save button emits 'save' event
✓ Save button disables during save
✓ Discard button asks for confirmation
✓ Discard button clears unsaved state
✓ Error message displays toast
✓ Success message displays toast
✓ destroy() cleans up event listeners
✓ Multiple language changes tracked
✓ Pipe-separated notes preserved in hymn values
```

**Mocking**:
- Mock DOM elements using jsdom
- Mock EditorStateManager methods
- Mock window.alert/confirm
- Test event emissions via custom event listeners

---

## Phase 5: Editor Page & Navigation

**Objective**: Create `editor.html` page and integrate OAuth + Editor UI. Add navigation from main app.

**Duration**: ~10-12 hours  
**Context Required**: Medium (HTML structure, OAuth flow, navigation)  
**Files Created**: `editor.html`, `js/editor.js`, `test/editor.test.mjs`

### Task 5.1: Create editor.html Page

**File**: `editor.html`

**Structure**: Mirror `index.html` but with editor-specific content

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="Meeting Program CMS - Edit Sheet Data">
  <title>Edit Meeting Program</title>
  
  <!-- Bootstrap 5 CSS -->
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
  
  <!-- App CSS -->
  <link rel="stylesheet" href="css/styles.css">
  
  <!-- Service
```


## License: unknown
https://github.com/MDMahabulAlam/Influncer-Website/blob/63d92e4f35c901770d7303051dd532a9d326cb87/Card.html

```
I'll provide you with the comprehensive plan as a detailed document that you can save. Since I don't have file writing tools available, I'll present the complete plan in a code block that you can save directly to `./docs/FEATURE_CMS_EDIT.md`:

```markdown
# Feature Plan: CMS Sheet Editor (Google Sheets OAuth + Form UI)

**Version**: 1.0  
**Last Updated**: March 10, 2026  
**Status**: Ready for Implementation  
**Estimated Duration**: 6 phases, ~100-120 hours total (can parallelize some tasks)

---

## 📋 Table of Contents

1. [Overview & Architecture](#overview--architecture)
2. [Design Decisions](#design-decisions)
3. [Technical Architecture](#technical-architecture)
4. [Phase 1: OAuth Module](#phase-1-oauth-module)
5. [Phase 2: Google Sheets API Service](#phase-2-google-sheets-api-service)
6. [Phase 3: Editor State Manager](#phase-3-editor-state-manager)
7. [Phase 4: Editor UI Component](#phase-4-editor-ui-component)
8. [Phase 5: Editor Page & Navigation](#phase-5-editor-page--navigation)
9. [Phase 6: Tests & Deployment](#phase-6-tests--deployment)
10. [Data Structures & Interfaces](#data-structures--interfaces)
11. [Testing Specifications](#testing-specifications)
12. [Integration Checklist](#integration-checklist)
13. [Risk Mitigation](#risk-mitigation)

---

## Overview & Architecture

### What We're Building

A **Google Sheets CMS interface** that allows authorized editors to modify meeting program data directly in the app. Features:

- **Google OAuth 2.0 authentication** (PKCE flow, client-side only)
- **Collaborator verification** against the currently-loaded Google Sheet
- **Form-based UI** with scrollable key/value pairs, language selectors, validation
- **Local state management** with IndexedDB persistence for in-progress edits
- **Batch CSV upload** back to Google Sheets (not row-by-row)
- **Graceful "Viewer Only" fallback** for non-editors
- **No backend required** (GitHub Pages compatible)

### Why This Approach?

| Requirement | Solution | Why Not Others |
|---|---|---|
| **Free hosting** | GitHub Pages (static) | Avoiding backend costs ✅ |
| **No tech accounts** | Google OAuth (user's own account) | Users already have Google accounts |
| **Edit protection** | OAuth + Collaborators check | Verified against actual Sheet permissions |
| **Offline-ready** | IndexedDB state storage | Can edit offline, upload when online |
| **Easy CSV export** | CSV validation + upload | Reversible, debuggable, portable |
| **Non-tech friendly** | Form UI with pills/dropdowns | Visual, clear, no CSV syntax needed |

---

## Design Decisions

### 1. Authentication: Google OAuth 2.0 with PKCE

**Decision**: Use Google Identity Services (gis) library for browser-based OAuth authentication.

**Why**:
- No backend needed (PKCE flow works entirely client-side)
- Users sign in with account they already have
- Provides access token to call Google Sheets API
- Can verify user is a Sheet collaborator
- Token stored in `sessionStorage` (cleared on browser close) for security

**Implementation**:
- User navigates to `/editor.html`
- Click "Sign in with Google" button
- Google login popup appears
- After auth, token stored in `sessionStorage`
- App checks if user is collaborator on current sheet
- If yes: show editor; if no: show "Viewer Only"

### 2. Data Flow: Form UI + Batch Upload

**Decision**: Build form UI with field-by-field editing; upload all changes in one batch.

**Why**:
- Better UX than downloading/editing CSV locally
- Batch upload is safer than row-by-row API calls
- Can validate entire dataset before upload
- Less error-prone than incremental saves
- Users can edit multiple fields, review, then upload

**Data Lifecycle**:
1. Load current CSV from Sheet (via public export URL)
2. Parse into in-memory object: `{ key: { en, es, fr, swa } }`
3. Store in IndexedDB (survives page reload)
4. Editor modifies fields via form UI
5. On "Save": validate CSV, call Sheets API to append/update rows
6. After success: reload data, clear unsaved indicator

### 3. Permission Model: Collaborators Check

**Decision**: Check if authenticated user is a collaborator on the current Sheet.

**Why**:
- Tied to actual Sheet permissions (most secure)
- No manual allow-lists to maintain
- User only edits sheets they have permission for
- Leverages existing Google Sheet sharing

**Flow**:
1. Get sheet ID from current profile's CSV URL
2. After OAuth sign-in, call `spreadsheets.get()` to fetch collaborators
3. Compare user's email to collaborators list
4. Show/hide editor UI accordingly

### 4. UI Pattern: Scrollable Form with Language Pills

**Decision**: Single scrollable list of all keys, with key selector, language buttons, single input field.

**Why**:
- One key at a time prevents overwhelming users
- Language pills (Bootstrap 5) are clear and visual
- Single input field reduces UI complexity
- Scrollable list shows all available fields
- Matches your original spec exactly

**Form Structure**:
```
[Sign in / Logged in as: user@gmail.com] [Sign out]

Key Dropdown: [speaker1 ▼]
Language Pills: [EN] [ES] [FR] [SWA]
Input Field: [textarea with current value]
Add Row ➕ | Save Changes ✓

Unsaved: 3 changes pending
```

### 5. State Persistence: IndexedDB + Session

**Decision**: Keep edited data in IndexedDB during session; clear on sign-out.

**Why**:
- Survives page reload/accidental close
- User can ask "Resume editing?" on reload
- Keeps edits local until upload
- Session-based (not long-term storage)
- Encrypted in browser's secure storage

---

## Technical Architecture

### High-Level Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    editor.html                              │
│         (New page, mirrors index.html structure)             │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    js/editor.js                              │
│  (Orchestrator: loads profiles, checks auth, renders UI)    │
└─────────────────────────────────────────────────────────────┘
                            │
                ┌───────────┼───────────┐
                ▼           ▼           ▼
         ┌──────────┐ ┌──────────┐ ┌──────────┐
         │googleAuth│ │sheetsApi │ │editorState│
         │   .js    │ │Service.js│ │Manager.js │
         └──────────┘ └──────────┘ └──────────┘
                │           │           │
                └───────────┼───────────┘
                            │
                            ▼
         ┌──────────────────────────────────┐
         │  js/components/SheetEditor.mjs   │
         │        (UI Component)            │
         └──────────────────────────────────┘
                            │
                            ▼
         ┌──────────────────────────────────┐
         │      IndexedDB (Dexie)           │
         │   (editor._state store)          │
         └──────────────────────────────────┘
```

### File Organization

```
js/
├── auth/
│   └── googleAuth.js               [NEW] OAuth 2.0 module
├── services/
│   └── sheetsApiService.js         [NEW] Google Sheets API calls
├── data/
│   └── EditorStateManager.js       [NEW] In-memory state + persistence
├── components/
│   └── SheetEditor.mjs             [NEW] Form UI component
├── editor.js                        [NEW] Editor page entry point
└── [existing modules unchanged]

editor.html                          [NEW] Editor page

test/
├── auth/
│   └── googleAuth.test.mjs         [NEW] Auth tests
├── services/
│   └── sheetsApiService.test.mjs   [NEW] API service tests
├── data/
│   └── EditorStateManager.test.mjs [NEW] State manager tests
├── components/
│   └── SheetEditor.test.mjs        [NEW] UI component tests
└── editor.test.mjs                 [NEW] Integration tests

e2e/
├── scenarios/
│   └── editor.spec.js              [NEW] E2E scenarios

docs/
├── FEATURE_CMS_EDIT.md             [THIS FILE]
└── [existing docs unchanged]
```

### Dependencies

**External Libraries** (already in package.json):
- `dexie` v4.3.0 — IndexedDB abstraction (already used)
- Google Identity Services — Added via CDN script tag in editor.html

**No new npm dependencies**

---

## Phase 1: OAuth Module

**Objective**: Implement Google OAuth 2.0 authentication with PKCE flow.

**Duration**: ~8-10 hours  
**Context Required**: Medium (auth patterns, Google API basics)  
**Files Created**: `js/auth/googleAuth.js`, `test/auth/googleAuth.test.mjs`

### Task 1.1: Create googleAuth Module Structure

**File**: `js/auth/googleAuth.js`

Create a module that:
- Exports an object: `GoogleAuth` with methods listed below
- Initializes Google Identity Services (gis) on load
- NO external dependencies except gis library (loaded via CDN in editor.html)

**Methods to implement**:

```javascript
GoogleAuth.initialize(clientId, redirectUri)
GoogleAuth.signIn()                    // Opens Google login popup
GoogleAuth.signOut()                   // Clears token, closes session
GoogleAuth.getAccessToken()            // Returns token from sessionStorage
GoogleAuth.isAuthenticated()           // Returns boolean
GoogleAuth.getUser()                   // Returns { email, name }
GoogleAuth.onTokenExpire(callback)     // Handles token refresh
```

**Session Storage Keys**:
- `gm_access_token` — OAuth access token
- `gm_user_email` — User's email
- `gm_token_expires` — Token expiry timestamp (ms)

**Error Handling**:
- If user cancels login: resolve to `null` (don't throw)
- If token expires: auto-refresh or trigger re-auth
- Log all errors to `[AUTH]` prefix

**Notes**:
- Use `sessionStorage` only (cleared on browser close)
- Never use `localStorage` for tokens
- Implement token expiry check before API calls
- Google sign-out should clear all stored data

### Task 1.2: Handle PKCE Flow (Authorization Code)

**Context**: PKCE (Proof Key for Code Exchange) is how OAuth 2.0 works in browsers without backend.

**Implementation Details**:

1. Generate `code_verifier` (43-128 char random string)
2. Hash it to `code_challenge` (SHA-256)
3. Send user to Google auth endpoint with `code_challenge`
4. User grants permission
5. Google redirects back with authorization `code`
6. Exchange `code` + `code_verifier` for access token
7. Store token in `sessionStorage`

**Library**: Use `google-gsi` (Google Identity Services)
- Already available via CDN: `https://accounts.google.com/gsi/client`
- Handles PKCE automatically
- Simpler to use than raw OAuth

**Code Flow**:
```javascript
// In googleAuth.js
function generatePKCEPair() {
  // Generate random code_verifier
  // SHA-256 hash to code_challenge
  // Return { verifier, challenge }
}

async function exchangeCodeForToken(code, codeVerifier) {
  // POST to Google token endpoint
  // Return access token
}
```

**Testing**:
- Mock `sessionStorage`
- Mock Google gsi library
- Test token generation/storage
- Test error cases (network, user cancel)

### Task 1.3: Implement Token Refresh & Expiry

**Requirement**: Access tokens expire in ~1 hour. Handle gracefully.

**Implementation**:
1. Store token `expires_at` timestamp when token received
2. Before API calls: check if `Date.now() > expires_at`
3. If expired: trigger refresh flow
4. If refresh fails: sign out and require re-auth

**Methods**:
```javascript
GoogleAuth.isTokenExpired()
GoogleAuth.refreshToken()
GoogleAuth.onTokenExpire(callback)  // Register handler
```

**Edge Case**: If user's Google session has ended, refresh will fail. Show "Please sign in again" message.

### Task 1.4: Create Unit Tests for Auth

**File**: `test/auth/googleAuth.test.mjs`

**Test Cases**:

```
✓ signIn() opens Google popup
✓ On successful auth, token stored in sessionStorage
✓ isAuthenticated() returns true after sign-in
✓ isAuthenticated() returns false before sign-in
✓ getAccessToken() returns token string
✓ getUser() returns { email, name }
✓ Token expiry is calculated correctly
✓ signOut() clears sessionStorage
✓ isTokenExpired() returns true for expired token
✓ refreshToken() updates token before expiry
✓ On network error, gracefully handle (don't crash)
✓ On user cancel, resolve to null (not throw)
✓ Multiple sign-in calls don't create duplicate popups
```

**Mocking**:
- Mock global `google` object (from gis library)
- Mock `sessionStorage`
- Mock `fetch` for token endpoint

---

## Phase 2: Google Sheets API Service

**Objective**: Wrapper for Google Sheets API operations (check collaborators, upload data).

**Duration**: ~10-12 hours  
**Context Required**: Medium (Google Sheets API, HTTP requests)  
**Files Created**: `js/services/sheetsApiService.js`, `test/services/sheetsApiService.test.mjs`

### Task 2.1: Create Sheets API Service Structure

**File**: `js/services/sheetsApiService.js`

**Methods to export**:

```javascript
SheetsAPI.initialize(accessToken)              // Set auth token
SheetsAPI.getSpreadsheetMetadata(sheetId)      // Get sheet info + collaborators
SheetsAPI.checkIfCollaborator(sheetId, email)  // Boolean
SheetsAPI.getSheetValues(sheetId, range)       // Fetch cell values
SheetsAPI.appendRows(sheetId, values)          // Add rows to sheet
SheetsAPI.updateRows(sheetId, values)          // Update existing rows
SheetsAPI.uploadCSV(sheetId, csvData)          // Replace entire sheet data
```

**Dependencies**:
- `GoogleAuth` module (to get access token)
- Standard `fetch` API (no external library)

**Base Endpoint**: `https://sheets.googleapis.com/v4/spreadsheets`

**Required OAuth Scope**: `https://www.googleapis.com/auth/spreadsheets`

**Error Handling**:
- Log all HTTP errors with request details
- Return `{ success: false, error: "message" }` for failures
- Throw on authentication errors (token expired, unauthorized)
- Network timeouts: implement 30-second timeout

### Task 2.2: Extract Sheet ID from CSV URL

**Context**: Current profiles store CSV export URLs. Need to extract sheet ID.

**Sheet URL Patterns**:
```
CSV export URL: https://docs.google.com/spreadsheets/d/ABC123XYZ/gviz/tq?tqx=out:csv
Sheet ID:       ABC123XYZ (extract from /d/.../)

Normal sheet URL: https://docs.google.com/spreadsheets/d/ABC123XYZ/edit#gid=0
Sheet ID:        ABC123XYZ (same extraction)
```

**Function**:
```javascript
function extractSheetIdFromUrl(csvUrl) {
  // return sheet ID string, or null if invalid
}
```

**Validation**:
- Ensure URL contains `docs.google.com/spreadsheets/d/`
- Ensure ID is alphanumeric (no special chars)
- Return `null` for invalid URLs

### Task 2.3: Implement `getSpreadsheetMetadata()`

**API Call**: `GET /v4/spreadsheets/{sheetId}`

**Returns**:
```json
{
  "spreadsheetId": "ABC123XYZ",
  "properties": {
    "title": "Sacrament Program",
    "locale": "en_US",
    ...
  }
}
```

**Additional**: Fetch collaborators via Drive API (optional advanced feature; for now, assume we can determine from spreadsheet.properties)

**Note**: Google Sheets API's `spreadsheets.get()` requires the user to have at least Viewer access. Request with `fields=spreadsheetId,properties` to minimize response size.

### Task 2.4: Implement `checkIfCollaborator()`

**Logic**:
1. Call `getSpreadsheetMetadata(sheetId)`
2. Check `spreadsheetProperties` for owner/editors
3. Compare `GoogleAuth.getUser().email` to collaborators list
4. Return `true` if match, `false` otherwise

**Edge Cases**:
- User email might have different case (do case-insensitive compare)
- If metadata doesn't contain collaborators, conservative approach: `return false` (deny access)
- If API call fails: `throw` error (don't silently deny)

**Alternative** (if Google Sheets API doesn't provide collaborators easily):
- Could use Drive API's `permissions` endpoint
- For now, assume metadata provides this info; adjust if not available

### Task 2.5: Implement CSV Upload/Append

**Historical Context**: App currently uses public CSV export URLs (read-only).

**New Requirement**: Upload modified CSV back to Sheet.

**Two Approaches**:

**Option A: Append Rows** (Simpler)
- API: `POST /v4/spreadsheets/{sheetId}/values:append`
- Each edited row sent as new row
- Pro: Simple, no row-by-row tracking
- Con: Duplicates sheet data if not careful

**Option B: Clear & Replace** (Safer)
- API: `POST /v4/spreadsheets/{sheetId}/values:batchUpdate`
- Clear all data, write new CSV
- Pro: Guaranteed consistent state
- Con: All-or-nothing (can't recover if network fails mid-upload)

**Decision**: Use **Option B** (Clear & Replace) with validation

**Implementation**:

```javascript
async function uploadCSV(sheetId, csvData) {
  // 1. Validate csvData format (check headers, etc.)
  // 2. Parse CSV into 2D array (rows + columns)
  // 3. Call Sheets API:
  //    - DELETE all rows from Sheet1
  //    - APPEND new CSV data
  // 4. Return { success, sheetId, rowsWritten }
}
```

**API Call**:
```
POST /v4/spreadsheets/{sheetId}/values/Sheet1:clear
POST /v4/spreadsheets/{sheetId}/values/Sheet1:append
  Body: { values: [ ["key", "en", "es", "fr", "swa"], [...], [...] ] }
```

**Error Recovery**:
- If clear succeeds but append fails: sheet is empty (bad)
- Mitigation: Check sheet before upload, warn user
- Alternative: Use local backup copy for recovery

### Task 2.6: Create Unit Tests for Sheets API Service

**File**: `test/services/sheetsApiService.test.mjs`

**Test Cases**:

```
✓ extractSheetIdFromUrl() extracts ID correctly
✓ extractSheetIdFromUrl() rejects invalid URLs
✓ getSpreadsheetMetadata() makes correct API call
✓ getSpreadsheetMetadata() parses response
✓ checkIfCollaborator() returns true for collaborators
✓ checkIfCollaborator() returns false for non-collaborators
✓ checkIfCollaborator() is case-insensitive for email
✓ uploadCSV() calls clear then append
✓ uploadCSV() throws on validation error
✓ uploadCSV() returns row count
✓ On 401 Unauthorized: throw auth error
✓ On 403 Forbidden: throw permission error
✓ On network timeout: throw with timeout message
✓ On invalid CSV: return validation error
```

**Mocking**:
- Mock `fetch` for all API calls
- Mock `GoogleAuth.getAccessToken()`
- Mock `GoogleAuth.getUser()`

---

## Phase 3: Editor State Manager

**Objective**: In-memory state management for edited CSV data with IndexedDB persistence.

**Duration**: ~10-12 hours  
**Context Required**: Medium (IndexedDB, CSV parsing, state management)  
**Files Created**: `js/data/EditorStateManager.js`, `test/data/EditorStateManager.test.mjs`

### Task 3.1: Create EditorStateManager Structure

**File**: `js/data/EditorStateManager.js`

**Purpose**: Hold edited CSV data in memory, track changes, persist to IndexedDB.

**Internal Data Structure**:

```javascript
// Parsed CSV stored as:
{
  headers: ["key", "en", "es", "fr", "swa"],
  rows: {
    "unitName": {
      en: "Your Ward Name",
      es: "Nombre de Su Rama",
      fr: "Nom de Votre Branche",
      swa: "Jina la Kimanda Yako"
    },
    "speaker1": {
      en: "John Smith",
      es: "", // Empty = fallback to English
      fr: "",
      swa: ""
    },
    // ... more rows
  },
  // Track which fields have unsaved changes
  unsavedChanges: {
    "unitName": { en: true, es: false, fr: false, swa: false },
    "speaker1": { en: false, es: true, fr: false, swa: false },
  },
  // Metadata
  sheetId: "ABC123XYZ",
  createdAt: Date.now(),
  lastModified: Date.now()
}
```

**Class Methods**:

```javascript
class EditorStateManager {
  constructor(sheetId) {
    this.sheetId = sheetId;
    this.state = { /* as above */ };
  }

  async loadFromSheet(csvUrl) {
    // Fetch current CSV from sheet
    // Parse it into state.rows
    // Save to IndexedDB
  }

  getValue(key, language = "en") {
    // Return value for key + language
    // Fallback to English if empty
  }

  setValue(key, language, value) {
    // Update value, mark as changed
    // Don't save to DB yet (only on explicit save)
  }

  addRow(key, values = {}) {
    // Add new key with optional values
    // Mark as new/unsaved
  }

  deleteRow(key) {
    // Mark row for deletion
  }

  getUnsavedCount() {
    // Return number of changed fields
  }

  getChangedRows() {
    // Return only rows with unsaved changes
  }

  async validate() {
    // Check CSV structure, keys, hymn format
    // Return { valid: boolean, errors: [] }
  }

  toCSV() {
    // Generate CSV string ready for upload
    // Includes validation
  }

  async saveChanges(csvData) {
    // Save edited state to IndexedDB for session persistence
  }

  async discardChanges() {
    // Clear unsaved state, reload from sheet
  }

  async clear() {
    // Delete all editor data from IndexedDB
  }

  static async resume(sheetId) {
    // Check if previous session exists
    // Return EditorStateManager instance or null
  }
}
```

### Task 3.2: Implement CSV Parsing & Validation

**Requirement**: Parse Google Sheet CSV into structured data.

**CSV Format**:
```
key,en,es,fr,swa
unitName,Your Ward,Su Rama,Votre Branche,Kimanda Yako
speaker1,John Smith,Juan Garcia,Jean Dupont,Yohana Mto
openingHymn,62
CS 2,Accompaniment by Sister Smith
```

**Parsing Logic**:
1. Use existing `parseCSV()` from `js/utils/csv.js` as reference
2. Detect CSV format: simple (key, value) vs. multi-lang (key, en, es, fr, swa)
3. Extract headers row
4. Parse data rows into dictionary structure
5. Normalize language values (trim whitespace, handle quotes)

**Validation Rules** (Task 3.3):
1. **Required headers**: Must have "key" column
2. **Language columns**: "en", "es", "fr", "swa" (if multi-lang format)
3. **No duplicate keys**: Each key appears only once
4. **Hymn format**: If key ends with "Hymn":
   - Value must be number (e.g., `62`, `1001`)
   - OR `CS` + space + number + optional letter (e.g., `CS 2`, `CS 73a`)
5. **Required fields**: "key" must be non-empty, "en" must be non-empty (unless fallback)
6. **No XSS payload**: Sanitize values (reuse `sanitizeEntry()` from `js/sanitize.js`)

**Error Messages**:
```javascript
{
  errors: [
    { row: 2, column: "opening Hymn", message: "Invalid hymn format: must be number or CS{space}number" },
    { row: 5, column: "key", message: "Duplicate key: 'speaker1' already defined at row 3" },
    { row: "header", column: "es", message: "Missing required language column" }
  ]
}
```

### Task 3.3: Implement Hymn Format Validation

**Context**: Hymn fields can have special format:
- Regular: `62` (hymn number)
- Children's: `CS 2` (with space, can have letter like `CS 73a`)
- With note: `62|Sung by Primary` (pipe-separated annotation)

**Validation Function**:

```javascript
function validateHymnValue(value) {
  if (!value) return { valid: false, error: "Hymn value cannot be empty" };
  
  // Split on pipe to get hymn part
  const [hymnPart] = value.split("|");
  const hymn = hymnPart.trim();
  
  // Pattern: number OR "CS {number}{optional letter}"
  const hymnRegex = /^(\d{1,4}|CS [0-9]{1,4}[a-z]?)$/i;
  
  if (!hymnRegex.test(hymn)) {
    return {
      valid: false,
      error: `Invalid hymn: ${hymn}. Use format: "62" or "CS 2" or "CS 73a", optionally with "|Note"`
    };
  }
  
  return { valid: true };
}
```

**Hymn Lookup** (Optional Enhancement):
- Reference `js/data/hymnsLookup.js` to validate hymn numbers exist
- For now: just validate format (not whether hymn exists)
- Can add lookup validation in Phase 4

### Task 3.4: Implement IndexedDB Persistence

**Context**: Store editor state so user can reload page and resume editing.

**IndexedDB Store**: `editor._state`

**Schema**:
```javascript
// In js/data/db.js (existing Dexie setup)
// Add new store:
editor_state: "sheetId, createdAt" // Compound key
```

**Stored Data**:
```javascript
{
  id: "auto-generated",
  sheetId: "ABC123XYZ",
  createdAt: Date.now(),
  lastModified: Date.now(),
  expiresAt: createdAt + (24 * 60 * 60 * 1000), // 24h session
  state: { /* EditorStateManager.state */ },
  csvUrl: "https://docs.google.com/..."
}
```

**Methods**:

```javascript
async function saveSessionState(sheetId, state, csvUrl) {
  // Store to IndexedDB
  // Return saved object with ID
}

async function getSessionState(sheetId) {
  // Fetch from IndexedDB
  // Check if expired (24h)
  // Return state or null
}

async function deleteSessionState(sheetId) {
  // Remove from IndexedDB
}

async function resumeSession(sheetId) {
  // Check if session exists
  // Ask user: "Resume editing? X changes pending"
  // Return EditorStateManager with restored state or null
}
```

**Expiry Policy**: Sessions expire after 24 hours (paranoid safety).

### Task 3.5: Implement toCSV() & String Generation

**Requirement**: Convert in-memory state back to CSV string format suitable for upload.

**Function**:

```javascript
toCSV() {
  // 1. Build header: "key,en,es,fr,swa"
  // 2. For each row, quote fields with commas/newlines
  // 3. Handle fallback: if language cell empty, use English value
  // 4. Return as string ready for Sheets API
}

// Example output:
// key,en,es,fr,swa
// unitName,Your Ward,Su Rama,Votre Branche,Kimanda Yako
// speaker1,"Smith, John","García, Juan","Dupont, Jean","Mtu, Yohana"
// openingHymn,62
//
```

**CSV Quoting Rules**:
- Quote fields containing: comma, newline, quotes
- Escape quotes: `"` → `""`
- Leave other fields unquoted

**Reference**: Use logic from `js/utils/csv.js` as template.

### Task 3.6: Create Unit Tests

**File**: `test/data/EditorStateManager.test.mjs`

**Test Cases**:

```
✓ loadFromSheet() fetches and parses CSV correctly
✓ loadFromSheet() handles multi-language format
✓ loadFromSheet() handles simple key-value format
✓ getValue() returns correct value
✓ getValue() falls back to English if language empty
✓ setValue() updates value and marks unsaved
✓ addRow() adds new key with empty values
✓ deleteRow() marks row for deletion
✓ getUnsavedCount() returns correct count
✓ getChangedRows() returns only unsaved rows
✓ validate() rejects duplicate keys
✓ validate() rejects invalid hymn format
✓ validate() rejects duplicate hymn with "CS" prefix
✓ validate() catches empty key
✓ toCSV() generates valid CSV string
✓ toCSV() quotes fields with commas
✓ toCSV() includes all languages
✓ saveChanges() stores to IndexedDB
✓ resumeSession() restores previous state
✓ discardChanges() clears unsaved state
✓ Session expires after 24 hours
```

**Mocking**:
- Mock `fetch` for CSV download
- Mock IndexedDB via `fake-indexeddb`
- Mock `sanitizeEntry()`

---

## Phase 4: Editor UI Component

**Objective**: React-like component for editor form (scrollable list, key selector, language pills, input field).

**Duration**: ~12-14 hours  
**Context Required**: Medium-High (DOM manipulation, event handling, Bootstrap 5)  
**Files Created**: `js/components/SheetEditor.mjs`, `test/components/SheetEditor.test.mjs`

### Task 4.1: Design UI Structure & Components

**HTML Structure** (will be rendered by JavaScript):

```html
<div id="editor-main">
  <!-- Authentication Section -->
  <div id="auth-section">
    <button id="signin-btn" class="btn btn-primary">Sign in with Google</button>
  </div>

  <!-- Editor Section (hidden until auth) -->
  <div id="editor-section" style="display: none;">
    <!-- User Info -->
    <div class="editor-header">
      <span class="user-email">Logged in as: user@gmail.com</span>
      <button id="signout-btn" class="btn btn-sm btn-secondary">Sign out</button>
    </div>

    <!-- Key Selector & Language -->
    <div class="editor-controls">
      <div class="form-group">
        <label for="key-select">Key:</label>
        <select id="key-select" class="form-control">
          <option value="">-- Select a key --</option>
          <option value="unitName">unitName</option>
          <option value="speaker1">speaker1</option>
          <!-- ... all keys ... -->
        </select>
      </div>

      <!-- Language Pills (Bootstrap 5 buttons) -->
      <div class="language-buttons mt-3">
        <label>Language:</label>
        <div class="btn-group" role="group">
          <input type="radio" class="btn-check" name="language" id="lang-en" value="en" checked>
          <label class="btn btn-outline-primary" for="lang-en">English</label>
          
          <input type="radio" class="btn-check" name="language" id="lang-es" value="es">
          <label class="btn btn-outline-primary" for="lang-es">Español</label>
          
          <input type="radio" class="btn-check" name="language" id="lang-fr" value="fr">
          <label class="btn btn-outline-primary" for="lang-fr">Français</label>
          
          <input type="radio" class="btn-check" name="language" id="lang-swa" value="swa">
          <label class="btn btn-outline-primary" for="lang-swa">Kiswahili</label>
        </div>
      </div>
    </div>

    <!-- Value Input -->
    <div class="form-group mt-4">
      <label for="value-input">Value:</label>
      <textarea id="value-input" class="form-control" rows="4" placeholder="Enter value..."></textarea>
      
      <!-- Hymn Checkbox (shown for *Hymn keys) -->
      <div id="hymn-options" class="mt-2" style="display: none;">
        <div class="form-check">
          <input type="checkbox" class="form-check-input" id="hymn-children" value="children">
          <label class="form-check-label" for="hymn-children">
            Children's Song (prepends "CS ")
          </label>
        </div>
      </div>
    </div>

    <!-- Unsaved Indicator -->
    <div id="unsaved-indicator" class="alert alert-warning mt-3" style="display: none;">
      <strong>⚠ Unsaved Changes:</strong> <span id="unsaved-count">0</span> fields modified
    </div>

    <!-- Action Buttons -->
    <div class="editor-actions mt-4">
      <button id="add-row-btn" class="btn btn-success">➕ Add New Field</button>
      <button id="save-btn" class="btn btn-primary">✓ Save Changes</button>
      <button id="discard-btn" class="btn btn-secondary">Clear Changes</button>
    </div>
  </div>

  <!-- Viewer-Only Section -->
  <div id="viewer-only-section" style="display: none;">
    <div class="alert alert-info">
      <h4>Viewer</h4>
      <p>You don't have permission to edit this sheet. Only collaborators can edit.</p>
    </div>
  </div>
</div>
```

### Task 4.2: Create SheetEditor Component Class

**File**: `js/components/SheetEditor.mjs`

**Class Structure**:

```javascript
export class SheetEditor {
  constructor(containerSelector, editorStateManager, options = {}) {
    this.container = document.querySelector(containerSelector);
    this.stateManager = editorStateManager;
    this.currentKey = null;
    this.currentLanguage = "en";
    this.isEditing = false;
    
    this.options = {
      onSave: null,    // Callback when Save clicked
      onAddRow: null,  // Callback when Add Row clicked
      ...options
    };
    
    this.eventHandlers = {};
  }

  async render() {
    // Build HTML structure above
    // Attach event listeners
    // Load keys into dropdown
  }

  on(eventName, callback) {
    // event.addListener pattern
    // Supported events: 'value-changed', 'key-selected', 'language-changed', 'save', 'add-row'
  }

  setValue(key, language, value) {
    // Update input field to show value
    // Update unsaved indicator
  }

  setKey(key) {
    // Change which key is being edited
    // Update select dropdown
    // Load value for new key
    // Show/hide hymn checkbox
  }

  setLanguage(language) {
    // Change selected language
    // Load value for new language
  }

  updateKeyList(keys) {
    // Refresh dropdown with new keys (after adding row)
  }

  showUnsavedIndicator(count) {
    // Show/hide and update count
  }

  setLoading(isLoading) {
    // Disable buttons while saving
    // Show spinner
  }

  showError(message) {
    // Toast/alert with error message
  }

  showSuccess(message) {
    // Toast/alert with success message
  }

  destroy() {
    // Clean up event listeners
  }
}
```

### Task 4.3: Implement Event Handlers & DOM Updates

**Event Handlers to Attach**:

1. **Key Selection** (`#key-select` change)
   - Emit `key-selected` event with new key
   - Load value from EditorStateManager
   - Show/hide hymn options
   - Update language pills

2. **Language Selection** (radio buttons)
   - Emit `language-changed` event
   - Load value for selected language from EditorStateManager
   - Update input field

3. **Value Input Change** (`#value-input` input)
   - Emit `value-changed` { key, language, value } event
   - Update EditorStateManager
   - Mark as unsaved
   - Show unsaved indicator

4. **Hymn Children's Checkbox** (`#hymn-children` change)
   - If checked: prepend "CS " to value
   - If unchecked: remove "CS " prefix
   - Emit `value-changed` event

5. **Add Row Button** (`#add-row-btn` click)
   - Emit `add-row` event
   - Prompt user for new key name
   - Validate key doesn't exist
   - Add to EditorStateManager
   - Refresh key dropdown
   - Select new key

6. **Save Button** (`#save-btn` click)
   - Emit `save` event with all changes
   - Disable buttons, show loading
   - Wait for parent to validate & upload
   - On success: clear unsaved indicator

7. **Discard Button** (`#discard-btn` click)
   - Ask for confirmation
   - Clear all unsaved changes
   - Reload values from EditorStateManager
   - Hide unsaved indicator

### Task 4.4: Implement Hymn Field Logic

**Hymn Detection**: If key ends with "Hymn" (case-insensitive):
- Show checkbox: "Children's Song (prepends 'CS ')"
- When checkbox checked: ensure value starts with "CS "
- When checkbox unchecked: remove "CS " prefix

**Examples**:
- User enters "2" + checks "Children's Song" → value becomes "CS 2"
- User enters "CS 2" + unchecks box → value becomes "2"
- User enters "CS 73a" + can check/uncheck
- If user manually types "CS 2": checkbox auto-checks

**Special Case**: Hymn value might include note (pipe-separated):
- "62|Sung by choir" → can edit "62" part, keep "|Sung by choir"
- Children's logic applies to hymn number part only

### Task 4.5: Implement Unsaved Indicator

**Requirements**:
- Show alert box when any field modified
- Display count of unsaved fields
- Update in real-time
- Update on Add Row
- Clear on Save or Discard

**HTML**:
```html
<div id="unsaved-indicator" class="alert alert-warning" style="display: none;">
  <strong>⚠ Unsaved Changes:</strong> <span id="unsaved-count">0</span> fields modified
</div>
```

**Logic**:
1. EditorStateManager tracks unsavedChanges
2. SheetEditor calls `stateManager.getUnsavedCount()`
3. Update DOM to show/hide indicator
4. Listen for `value-changed` events to update count

### Task 4.6: Style with Bootstrap 5

**CSS Considerations**:
- Use Bootstrap 5 CDN in `editor.html`
- Language pills: use Bootstrap btn-group + btn-check pattern
- Form layout: use form-control, form-group classes
- Validation messages: use alert classes
- Loading state: disable buttons, show spinner

**Custom CSS** (minimal):
```css
#editor-main {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid #ccc;
}

.language-buttons .btn-group {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

#value-input {
  min-height: 100px;
}

.editor-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
```

### Task 4.7: Create Unit Tests

**File**: `test/components/SheetEditor.test.mjs`

**Test Approach**: Test DOM updates and event emissions (mock DOM elements)

**Test Cases**:

```
✓ render() creates HTML structure
✓ render() populates key dropdown
✓ Key selection updates shown value
✓ Language selection changes input field
✓ Value input emits 'value-changed' event
✓ Unsaved indicator shows on value change
✓ Unsaved count increases/decreases
✓ Add Row button opens dialog for key name
✓ Add Row validates key doesn't exist
✓ Hymn-related keys show children's checkbox
✓ Hymn checkbox checked: prepends "CS "
✓ Hymn checkbox unchecked: removes "CS "
✓ Save button emits 'save' event
✓ Save button disables during save
✓ Discard button asks for confirmation
✓ Discard button clears unsaved state
✓ Error message displays toast
✓ Success message displays toast
✓ destroy() cleans up event listeners
✓ Multiple language changes tracked
✓ Pipe-separated notes preserved in hymn values
```

**Mocking**:
- Mock DOM elements using jsdom
- Mock EditorStateManager methods
- Mock window.alert/confirm
- Test event emissions via custom event listeners

---

## Phase 5: Editor Page & Navigation

**Objective**: Create `editor.html` page and integrate OAuth + Editor UI. Add navigation from main app.

**Duration**: ~10-12 hours  
**Context Required**: Medium (HTML structure, OAuth flow, navigation)  
**Files Created**: `editor.html`, `js/editor.js`, `test/editor.test.mjs`

### Task 5.1: Create editor.html Page

**File**: `editor.html`

**Structure**: Mirror `index.html` but with editor-specific content

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="Meeting Program CMS - Edit Sheet Data">
  <title>Edit Meeting Program</title>
  
  <!-- Bootstrap 5 CSS -->
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
  
  <!-- App CSS -->
  <link rel="stylesheet" href="css/styles.css">
  
  <!-- Service
```


## License: unknown
https://github.com/MDMahabulAlam/Influncer-Website/blob/63d92e4f35c901770d7303051dd532a9d326cb87/Card.html

```
I'll provide you with the comprehensive plan as a detailed document that you can save. Since I don't have file writing tools available, I'll present the complete plan in a code block that you can save directly to `./docs/FEATURE_CMS_EDIT.md`:

```markdown
# Feature Plan: CMS Sheet Editor (Google Sheets OAuth + Form UI)

**Version**: 1.0  
**Last Updated**: March 10, 2026  
**Status**: Ready for Implementation  
**Estimated Duration**: 6 phases, ~100-120 hours total (can parallelize some tasks)

---

## 📋 Table of Contents

1. [Overview & Architecture](#overview--architecture)
2. [Design Decisions](#design-decisions)
3. [Technical Architecture](#technical-architecture)
4. [Phase 1: OAuth Module](#phase-1-oauth-module)
5. [Phase 2: Google Sheets API Service](#phase-2-google-sheets-api-service)
6. [Phase 3: Editor State Manager](#phase-3-editor-state-manager)
7. [Phase 4: Editor UI Component](#phase-4-editor-ui-component)
8. [Phase 5: Editor Page & Navigation](#phase-5-editor-page--navigation)
9. [Phase 6: Tests & Deployment](#phase-6-tests--deployment)
10. [Data Structures & Interfaces](#data-structures--interfaces)
11. [Testing Specifications](#testing-specifications)
12. [Integration Checklist](#integration-checklist)
13. [Risk Mitigation](#risk-mitigation)

---

## Overview & Architecture

### What We're Building

A **Google Sheets CMS interface** that allows authorized editors to modify meeting program data directly in the app. Features:

- **Google OAuth 2.0 authentication** (PKCE flow, client-side only)
- **Collaborator verification** against the currently-loaded Google Sheet
- **Form-based UI** with scrollable key/value pairs, language selectors, validation
- **Local state management** with IndexedDB persistence for in-progress edits
- **Batch CSV upload** back to Google Sheets (not row-by-row)
- **Graceful "Viewer Only" fallback** for non-editors
- **No backend required** (GitHub Pages compatible)

### Why This Approach?

| Requirement | Solution | Why Not Others |
|---|---|---|
| **Free hosting** | GitHub Pages (static) | Avoiding backend costs ✅ |
| **No tech accounts** | Google OAuth (user's own account) | Users already have Google accounts |
| **Edit protection** | OAuth + Collaborators check | Verified against actual Sheet permissions |
| **Offline-ready** | IndexedDB state storage | Can edit offline, upload when online |
| **Easy CSV export** | CSV validation + upload | Reversible, debuggable, portable |
| **Non-tech friendly** | Form UI with pills/dropdowns | Visual, clear, no CSV syntax needed |

---

## Design Decisions

### 1. Authentication: Google OAuth 2.0 with PKCE

**Decision**: Use Google Identity Services (gis) library for browser-based OAuth authentication.

**Why**:
- No backend needed (PKCE flow works entirely client-side)
- Users sign in with account they already have
- Provides access token to call Google Sheets API
- Can verify user is a Sheet collaborator
- Token stored in `sessionStorage` (cleared on browser close) for security

**Implementation**:
- User navigates to `/editor.html`
- Click "Sign in with Google" button
- Google login popup appears
- After auth, token stored in `sessionStorage`
- App checks if user is collaborator on current sheet
- If yes: show editor; if no: show "Viewer Only"

### 2. Data Flow: Form UI + Batch Upload

**Decision**: Build form UI with field-by-field editing; upload all changes in one batch.

**Why**:
- Better UX than downloading/editing CSV locally
- Batch upload is safer than row-by-row API calls
- Can validate entire dataset before upload
- Less error-prone than incremental saves
- Users can edit multiple fields, review, then upload

**Data Lifecycle**:
1. Load current CSV from Sheet (via public export URL)
2. Parse into in-memory object: `{ key: { en, es, fr, swa } }`
3. Store in IndexedDB (survives page reload)
4. Editor modifies fields via form UI
5. On "Save": validate CSV, call Sheets API to append/update rows
6. After success: reload data, clear unsaved indicator

### 3. Permission Model: Collaborators Check

**Decision**: Check if authenticated user is a collaborator on the current Sheet.

**Why**:
- Tied to actual Sheet permissions (most secure)
- No manual allow-lists to maintain
- User only edits sheets they have permission for
- Leverages existing Google Sheet sharing

**Flow**:
1. Get sheet ID from current profile's CSV URL
2. After OAuth sign-in, call `spreadsheets.get()` to fetch collaborators
3. Compare user's email to collaborators list
4. Show/hide editor UI accordingly

### 4. UI Pattern: Scrollable Form with Language Pills

**Decision**: Single scrollable list of all keys, with key selector, language buttons, single input field.

**Why**:
- One key at a time prevents overwhelming users
- Language pills (Bootstrap 5) are clear and visual
- Single input field reduces UI complexity
- Scrollable list shows all available fields
- Matches your original spec exactly

**Form Structure**:
```
[Sign in / Logged in as: user@gmail.com] [Sign out]

Key Dropdown: [speaker1 ▼]
Language Pills: [EN] [ES] [FR] [SWA]
Input Field: [textarea with current value]
Add Row ➕ | Save Changes ✓

Unsaved: 3 changes pending
```

### 5. State Persistence: IndexedDB + Session

**Decision**: Keep edited data in IndexedDB during session; clear on sign-out.

**Why**:
- Survives page reload/accidental close
- User can ask "Resume editing?" on reload
- Keeps edits local until upload
- Session-based (not long-term storage)
- Encrypted in browser's secure storage

---

## Technical Architecture

### High-Level Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    editor.html                              │
│         (New page, mirrors index.html structure)             │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    js/editor.js                              │
│  (Orchestrator: loads profiles, checks auth, renders UI)    │
└─────────────────────────────────────────────────────────────┘
                            │
                ┌───────────┼───────────┐
                ▼           ▼           ▼
         ┌──────────┐ ┌──────────┐ ┌──────────┐
         │googleAuth│ │sheetsApi │ │editorState│
         │   .js    │ │Service.js│ │Manager.js │
         └──────────┘ └──────────┘ └──────────┘
                │           │           │
                └───────────┼───────────┘
                            │
                            ▼
         ┌──────────────────────────────────┐
         │  js/components/SheetEditor.mjs   │
         │        (UI Component)            │
         └──────────────────────────────────┘
                            │
                            ▼
         ┌──────────────────────────────────┐
         │      IndexedDB (Dexie)           │
         │   (editor._state store)          │
         └──────────────────────────────────┘
```

### File Organization

```
js/
├── auth/
│   └── googleAuth.js               [NEW] OAuth 2.0 module
├── services/
│   └── sheetsApiService.js         [NEW] Google Sheets API calls
├── data/
│   └── EditorStateManager.js       [NEW] In-memory state + persistence
├── components/
│   └── SheetEditor.mjs             [NEW] Form UI component
├── editor.js                        [NEW] Editor page entry point
└── [existing modules unchanged]

editor.html                          [NEW] Editor page

test/
├── auth/
│   └── googleAuth.test.mjs         [NEW] Auth tests
├── services/
│   └── sheetsApiService.test.mjs   [NEW] API service tests
├── data/
│   └── EditorStateManager.test.mjs [NEW] State manager tests
├── components/
│   └── SheetEditor.test.mjs        [NEW] UI component tests
└── editor.test.mjs                 [NEW] Integration tests

e2e/
├── scenarios/
│   └── editor.spec.js              [NEW] E2E scenarios

docs/
├── FEATURE_CMS_EDIT.md             [THIS FILE]
└── [existing docs unchanged]
```

### Dependencies

**External Libraries** (already in package.json):
- `dexie` v4.3.0 — IndexedDB abstraction (already used)
- Google Identity Services — Added via CDN script tag in editor.html

**No new npm dependencies**

---

## Phase 1: OAuth Module

**Objective**: Implement Google OAuth 2.0 authentication with PKCE flow.

**Duration**: ~8-10 hours  
**Context Required**: Medium (auth patterns, Google API basics)  
**Files Created**: `js/auth/googleAuth.js`, `test/auth/googleAuth.test.mjs`

### Task 1.1: Create googleAuth Module Structure

**File**: `js/auth/googleAuth.js`

Create a module that:
- Exports an object: `GoogleAuth` with methods listed below
- Initializes Google Identity Services (gis) on load
- NO external dependencies except gis library (loaded via CDN in editor.html)

**Methods to implement**:

```javascript
GoogleAuth.initialize(clientId, redirectUri)
GoogleAuth.signIn()                    // Opens Google login popup
GoogleAuth.signOut()                   // Clears token, closes session
GoogleAuth.getAccessToken()            // Returns token from sessionStorage
GoogleAuth.isAuthenticated()           // Returns boolean
GoogleAuth.getUser()                   // Returns { email, name }
GoogleAuth.onTokenExpire(callback)     // Handles token refresh
```

**Session Storage Keys**:
- `gm_access_token` — OAuth access token
- `gm_user_email` — User's email
- `gm_token_expires` — Token expiry timestamp (ms)

**Error Handling**:
- If user cancels login: resolve to `null` (don't throw)
- If token expires: auto-refresh or trigger re-auth
- Log all errors to `[AUTH]` prefix

**Notes**:
- Use `sessionStorage` only (cleared on browser close)
- Never use `localStorage` for tokens
- Implement token expiry check before API calls
- Google sign-out should clear all stored data

### Task 1.2: Handle PKCE Flow (Authorization Code)

**Context**: PKCE (Proof Key for Code Exchange) is how OAuth 2.0 works in browsers without backend.

**Implementation Details**:

1. Generate `code_verifier` (43-128 char random string)
2. Hash it to `code_challenge` (SHA-256)
3. Send user to Google auth endpoint with `code_challenge`
4. User grants permission
5. Google redirects back with authorization `code`
6. Exchange `code` + `code_verifier` for access token
7. Store token in `sessionStorage`

**Library**: Use `google-gsi` (Google Identity Services)
- Already available via CDN: `https://accounts.google.com/gsi/client`
- Handles PKCE automatically
- Simpler to use than raw OAuth

**Code Flow**:
```javascript
// In googleAuth.js
function generatePKCEPair() {
  // Generate random code_verifier
  // SHA-256 hash to code_challenge
  // Return { verifier, challenge }
}

async function exchangeCodeForToken(code, codeVerifier) {
  // POST to Google token endpoint
  // Return access token
}
```

**Testing**:
- Mock `sessionStorage`
- Mock Google gsi library
- Test token generation/storage
- Test error cases (network, user cancel)

### Task 1.3: Implement Token Refresh & Expiry

**Requirement**: Access tokens expire in ~1 hour. Handle gracefully.

**Implementation**:
1. Store token `expires_at` timestamp when token received
2. Before API calls: check if `Date.now() > expires_at`
3. If expired: trigger refresh flow
4. If refresh fails: sign out and require re-auth

**Methods**:
```javascript
GoogleAuth.isTokenExpired()
GoogleAuth.refreshToken()
GoogleAuth.onTokenExpire(callback)  // Register handler
```

**Edge Case**: If user's Google session has ended, refresh will fail. Show "Please sign in again" message.

### Task 1.4: Create Unit Tests for Auth

**File**: `test/auth/googleAuth.test.mjs`

**Test Cases**:

```
✓ signIn() opens Google popup
✓ On successful auth, token stored in sessionStorage
✓ isAuthenticated() returns true after sign-in
✓ isAuthenticated() returns false before sign-in
✓ getAccessToken() returns token string
✓ getUser() returns { email, name }
✓ Token expiry is calculated correctly
✓ signOut() clears sessionStorage
✓ isTokenExpired() returns true for expired token
✓ refreshToken() updates token before expiry
✓ On network error, gracefully handle (don't crash)
✓ On user cancel, resolve to null (not throw)
✓ Multiple sign-in calls don't create duplicate popups
```

**Mocking**:
- Mock global `google` object (from gis library)
- Mock `sessionStorage`
- Mock `fetch` for token endpoint

---

## Phase 2: Google Sheets API Service

**Objective**: Wrapper for Google Sheets API operations (check collaborators, upload data).

**Duration**: ~10-12 hours  
**Context Required**: Medium (Google Sheets API, HTTP requests)  
**Files Created**: `js/services/sheetsApiService.js`, `test/services/sheetsApiService.test.mjs`

### Task 2.1: Create Sheets API Service Structure

**File**: `js/services/sheetsApiService.js`

**Methods to export**:

```javascript
SheetsAPI.initialize(accessToken)              // Set auth token
SheetsAPI.getSpreadsheetMetadata(sheetId)      // Get sheet info + collaborators
SheetsAPI.checkIfCollaborator(sheetId, email)  // Boolean
SheetsAPI.getSheetValues(sheetId, range)       // Fetch cell values
SheetsAPI.appendRows(sheetId, values)          // Add rows to sheet
SheetsAPI.updateRows(sheetId, values)          // Update existing rows
SheetsAPI.uploadCSV(sheetId, csvData)          // Replace entire sheet data
```

**Dependencies**:
- `GoogleAuth` module (to get access token)
- Standard `fetch` API (no external library)

**Base Endpoint**: `https://sheets.googleapis.com/v4/spreadsheets`

**Required OAuth Scope**: `https://www.googleapis.com/auth/spreadsheets`

**Error Handling**:
- Log all HTTP errors with request details
- Return `{ success: false, error: "message" }` for failures
- Throw on authentication errors (token expired, unauthorized)
- Network timeouts: implement 30-second timeout

### Task 2.2: Extract Sheet ID from CSV URL

**Context**: Current profiles store CSV export URLs. Need to extract sheet ID.

**Sheet URL Patterns**:
```
CSV export URL: https://docs.google.com/spreadsheets/d/ABC123XYZ/gviz/tq?tqx=out:csv
Sheet ID:       ABC123XYZ (extract from /d/.../)

Normal sheet URL: https://docs.google.com/spreadsheets/d/ABC123XYZ/edit#gid=0
Sheet ID:        ABC123XYZ (same extraction)
```

**Function**:
```javascript
function extractSheetIdFromUrl(csvUrl) {
  // return sheet ID string, or null if invalid
}
```

**Validation**:
- Ensure URL contains `docs.google.com/spreadsheets/d/`
- Ensure ID is alphanumeric (no special chars)
- Return `null` for invalid URLs

### Task 2.3: Implement `getSpreadsheetMetadata()`

**API Call**: `GET /v4/spreadsheets/{sheetId}`

**Returns**:
```json
{
  "spreadsheetId": "ABC123XYZ",
  "properties": {
    "title": "Sacrament Program",
    "locale": "en_US",
    ...
  }
}
```

**Additional**: Fetch collaborators via Drive API (optional advanced feature; for now, assume we can determine from spreadsheet.properties)

**Note**: Google Sheets API's `spreadsheets.get()` requires the user to have at least Viewer access. Request with `fields=spreadsheetId,properties` to minimize response size.

### Task 2.4: Implement `checkIfCollaborator()`

**Logic**:
1. Call `getSpreadsheetMetadata(sheetId)`
2. Check `spreadsheetProperties` for owner/editors
3. Compare `GoogleAuth.getUser().email` to collaborators list
4. Return `true` if match, `false` otherwise

**Edge Cases**:
- User email might have different case (do case-insensitive compare)
- If metadata doesn't contain collaborators, conservative approach: `return false` (deny access)
- If API call fails: `throw` error (don't silently deny)

**Alternative** (if Google Sheets API doesn't provide collaborators easily):
- Could use Drive API's `permissions` endpoint
- For now, assume metadata provides this info; adjust if not available

### Task 2.5: Implement CSV Upload/Append

**Historical Context**: App currently uses public CSV export URLs (read-only).

**New Requirement**: Upload modified CSV back to Sheet.

**Two Approaches**:

**Option A: Append Rows** (Simpler)
- API: `POST /v4/spreadsheets/{sheetId}/values:append`
- Each edited row sent as new row
- Pro: Simple, no row-by-row tracking
- Con: Duplicates sheet data if not careful

**Option B: Clear & Replace** (Safer)
- API: `POST /v4/spreadsheets/{sheetId}/values:batchUpdate`
- Clear all data, write new CSV
- Pro: Guaranteed consistent state
- Con: All-or-nothing (can't recover if network fails mid-upload)

**Decision**: Use **Option B** (Clear & Replace) with validation

**Implementation**:

```javascript
async function uploadCSV(sheetId, csvData) {
  // 1. Validate csvData format (check headers, etc.)
  // 2. Parse CSV into 2D array (rows + columns)
  // 3. Call Sheets API:
  //    - DELETE all rows from Sheet1
  //    - APPEND new CSV data
  // 4. Return { success, sheetId, rowsWritten }
}
```

**API Call**:
```
POST /v4/spreadsheets/{sheetId}/values/Sheet1:clear
POST /v4/spreadsheets/{sheetId}/values/Sheet1:append
  Body: { values: [ ["key", "en", "es", "fr", "swa"], [...], [...] ] }
```

**Error Recovery**:
- If clear succeeds but append fails: sheet is empty (bad)
- Mitigation: Check sheet before upload, warn user
- Alternative: Use local backup copy for recovery

### Task 2.6: Create Unit Tests for Sheets API Service

**File**: `test/services/sheetsApiService.test.mjs`

**Test Cases**:

```
✓ extractSheetIdFromUrl() extracts ID correctly
✓ extractSheetIdFromUrl() rejects invalid URLs
✓ getSpreadsheetMetadata() makes correct API call
✓ getSpreadsheetMetadata() parses response
✓ checkIfCollaborator() returns true for collaborators
✓ checkIfCollaborator() returns false for non-collaborators
✓ checkIfCollaborator() is case-insensitive for email
✓ uploadCSV() calls clear then append
✓ uploadCSV() throws on validation error
✓ uploadCSV() returns row count
✓ On 401 Unauthorized: throw auth error
✓ On 403 Forbidden: throw permission error
✓ On network timeout: throw with timeout message
✓ On invalid CSV: return validation error
```

**Mocking**:
- Mock `fetch` for all API calls
- Mock `GoogleAuth.getAccessToken()`
- Mock `GoogleAuth.getUser()`

---

## Phase 3: Editor State Manager

**Objective**: In-memory state management for edited CSV data with IndexedDB persistence.

**Duration**: ~10-12 hours  
**Context Required**: Medium (IndexedDB, CSV parsing, state management)  
**Files Created**: `js/data/EditorStateManager.js`, `test/data/EditorStateManager.test.mjs`

### Task 3.1: Create EditorStateManager Structure

**File**: `js/data/EditorStateManager.js`

**Purpose**: Hold edited CSV data in memory, track changes, persist to IndexedDB.

**Internal Data Structure**:

```javascript
// Parsed CSV stored as:
{
  headers: ["key", "en", "es", "fr", "swa"],
  rows: {
    "unitName": {
      en: "Your Ward Name",
      es: "Nombre de Su Rama",
      fr: "Nom de Votre Branche",
      swa: "Jina la Kimanda Yako"
    },
    "speaker1": {
      en: "John Smith",
      es: "", // Empty = fallback to English
      fr: "",
      swa: ""
    },
    // ... more rows
  },
  // Track which fields have unsaved changes
  unsavedChanges: {
    "unitName": { en: true, es: false, fr: false, swa: false },
    "speaker1": { en: false, es: true, fr: false, swa: false },
  },
  // Metadata
  sheetId: "ABC123XYZ",
  createdAt: Date.now(),
  lastModified: Date.now()
}
```

**Class Methods**:

```javascript
class EditorStateManager {
  constructor(sheetId) {
    this.sheetId = sheetId;
    this.state = { /* as above */ };
  }

  async loadFromSheet(csvUrl) {
    // Fetch current CSV from sheet
    // Parse it into state.rows
    // Save to IndexedDB
  }

  getValue(key, language = "en") {
    // Return value for key + language
    // Fallback to English if empty
  }

  setValue(key, language, value) {
    // Update value, mark as changed
    // Don't save to DB yet (only on explicit save)
  }

  addRow(key, values = {}) {
    // Add new key with optional values
    // Mark as new/unsaved
  }

  deleteRow(key) {
    // Mark row for deletion
  }

  getUnsavedCount() {
    // Return number of changed fields
  }

  getChangedRows() {
    // Return only rows with unsaved changes
  }

  async validate() {
    // Check CSV structure, keys, hymn format
    // Return { valid: boolean, errors: [] }
  }

  toCSV() {
    // Generate CSV string ready for upload
    // Includes validation
  }

  async saveChanges(csvData) {
    // Save edited state to IndexedDB for session persistence
  }

  async discardChanges() {
    // Clear unsaved state, reload from sheet
  }

  async clear() {
    // Delete all editor data from IndexedDB
  }

  static async resume(sheetId) {
    // Check if previous session exists
    // Return EditorStateManager instance or null
  }
}
```

### Task 3.2: Implement CSV Parsing & Validation

**Requirement**: Parse Google Sheet CSV into structured data.

**CSV Format**:
```
key,en,es,fr,swa
unitName,Your Ward,Su Rama,Votre Branche,Kimanda Yako
speaker1,John Smith,Juan Garcia,Jean Dupont,Yohana Mto
openingHymn,62
CS 2,Accompaniment by Sister Smith
```

**Parsing Logic**:
1. Use existing `parseCSV()` from `js/utils/csv.js` as reference
2. Detect CSV format: simple (key, value) vs. multi-lang (key, en, es, fr, swa)
3. Extract headers row
4. Parse data rows into dictionary structure
5. Normalize language values (trim whitespace, handle quotes)

**Validation Rules** (Task 3.3):
1. **Required headers**: Must have "key" column
2. **Language columns**: "en", "es", "fr", "swa" (if multi-lang format)
3. **No duplicate keys**: Each key appears only once
4. **Hymn format**: If key ends with "Hymn":
   - Value must be number (e.g., `62`, `1001`)
   - OR `CS` + space + number + optional letter (e.g., `CS 2`, `CS 73a`)
5. **Required fields**: "key" must be non-empty, "en" must be non-empty (unless fallback)
6. **No XSS payload**: Sanitize values (reuse `sanitizeEntry()` from `js/sanitize.js`)

**Error Messages**:
```javascript
{
  errors: [
    { row: 2, column: "opening Hymn", message: "Invalid hymn format: must be number or CS{space}number" },
    { row: 5, column: "key", message: "Duplicate key: 'speaker1' already defined at row 3" },
    { row: "header", column: "es", message: "Missing required language column" }
  ]
}
```

### Task 3.3: Implement Hymn Format Validation

**Context**: Hymn fields can have special format:
- Regular: `62` (hymn number)
- Children's: `CS 2` (with space, can have letter like `CS 73a`)
- With note: `62|Sung by Primary` (pipe-separated annotation)

**Validation Function**:

```javascript
function validateHymnValue(value) {
  if (!value) return { valid: false, error: "Hymn value cannot be empty" };
  
  // Split on pipe to get hymn part
  const [hymnPart] = value.split("|");
  const hymn = hymnPart.trim();
  
  // Pattern: number OR "CS {number}{optional letter}"
  const hymnRegex = /^(\d{1,4}|CS [0-9]{1,4}[a-z]?)$/i;
  
  if (!hymnRegex.test(hymn)) {
    return {
      valid: false,
      error: `Invalid hymn: ${hymn}. Use format: "62" or "CS 2" or "CS 73a", optionally with "|Note"`
    };
  }
  
  return { valid: true };
}
```

**Hymn Lookup** (Optional Enhancement):
- Reference `js/data/hymnsLookup.js` to validate hymn numbers exist
- For now: just validate format (not whether hymn exists)
- Can add lookup validation in Phase 4

### Task 3.4: Implement IndexedDB Persistence

**Context**: Store editor state so user can reload page and resume editing.

**IndexedDB Store**: `editor._state`

**Schema**:
```javascript
// In js/data/db.js (existing Dexie setup)
// Add new store:
editor_state: "sheetId, createdAt" // Compound key
```

**Stored Data**:
```javascript
{
  id: "auto-generated",
  sheetId: "ABC123XYZ",
  createdAt: Date.now(),
  lastModified: Date.now(),
  expiresAt: createdAt + (24 * 60 * 60 * 1000), // 24h session
  state: { /* EditorStateManager.state */ },
  csvUrl: "https://docs.google.com/..."
}
```

**Methods**:

```javascript
async function saveSessionState(sheetId, state, csvUrl) {
  // Store to IndexedDB
  // Return saved object with ID
}

async function getSessionState(sheetId) {
  // Fetch from IndexedDB
  // Check if expired (24h)
  // Return state or null
}

async function deleteSessionState(sheetId) {
  // Remove from IndexedDB
}

async function resumeSession(sheetId) {
  // Check if session exists
  // Ask user: "Resume editing? X changes pending"
  // Return EditorStateManager with restored state or null
}
```

**Expiry Policy**: Sessions expire after 24 hours (paranoid safety).

### Task 3.5: Implement toCSV() & String Generation

**Requirement**: Convert in-memory state back to CSV string format suitable for upload.

**Function**:

```javascript
toCSV() {
  // 1. Build header: "key,en,es,fr,swa"
  // 2. For each row, quote fields with commas/newlines
  // 3. Handle fallback: if language cell empty, use English value
  // 4. Return as string ready for Sheets API
}

// Example output:
// key,en,es,fr,swa
// unitName,Your Ward,Su Rama,Votre Branche,Kimanda Yako
// speaker1,"Smith, John","García, Juan","Dupont, Jean","Mtu, Yohana"
// openingHymn,62
//
```

**CSV Quoting Rules**:
- Quote fields containing: comma, newline, quotes
- Escape quotes: `"` → `""`
- Leave other fields unquoted

**Reference**: Use logic from `js/utils/csv.js` as template.

### Task 3.6: Create Unit Tests

**File**: `test/data/EditorStateManager.test.mjs`

**Test Cases**:

```
✓ loadFromSheet() fetches and parses CSV correctly
✓ loadFromSheet() handles multi-language format
✓ loadFromSheet() handles simple key-value format
✓ getValue() returns correct value
✓ getValue() falls back to English if language empty
✓ setValue() updates value and marks unsaved
✓ addRow() adds new key with empty values
✓ deleteRow() marks row for deletion
✓ getUnsavedCount() returns correct count
✓ getChangedRows() returns only unsaved rows
✓ validate() rejects duplicate keys
✓ validate() rejects invalid hymn format
✓ validate() rejects duplicate hymn with "CS" prefix
✓ validate() catches empty key
✓ toCSV() generates valid CSV string
✓ toCSV() quotes fields with commas
✓ toCSV() includes all languages
✓ saveChanges() stores to IndexedDB
✓ resumeSession() restores previous state
✓ discardChanges() clears unsaved state
✓ Session expires after 24 hours
```

**Mocking**:
- Mock `fetch` for CSV download
- Mock IndexedDB via `fake-indexeddb`
- Mock `sanitizeEntry()`

---

## Phase 4: Editor UI Component

**Objective**: React-like component for editor form (scrollable list, key selector, language pills, input field).

**Duration**: ~12-14 hours  
**Context Required**: Medium-High (DOM manipulation, event handling, Bootstrap 5)  
**Files Created**: `js/components/SheetEditor.mjs`, `test/components/SheetEditor.test.mjs`

### Task 4.1: Design UI Structure & Components

**HTML Structure** (will be rendered by JavaScript):

```html
<div id="editor-main">
  <!-- Authentication Section -->
  <div id="auth-section">
    <button id="signin-btn" class="btn btn-primary">Sign in with Google</button>
  </div>

  <!-- Editor Section (hidden until auth) -->
  <div id="editor-section" style="display: none;">
    <!-- User Info -->
    <div class="editor-header">
      <span class="user-email">Logged in as: user@gmail.com</span>
      <button id="signout-btn" class="btn btn-sm btn-secondary">Sign out</button>
    </div>

    <!-- Key Selector & Language -->
    <div class="editor-controls">
      <div class="form-group">
        <label for="key-select">Key:</label>
        <select id="key-select" class="form-control">
          <option value="">-- Select a key --</option>
          <option value="unitName">unitName</option>
          <option value="speaker1">speaker1</option>
          <!-- ... all keys ... -->
        </select>
      </div>

      <!-- Language Pills (Bootstrap 5 buttons) -->
      <div class="language-buttons mt-3">
        <label>Language:</label>
        <div class="btn-group" role="group">
          <input type="radio" class="btn-check" name="language" id="lang-en" value="en" checked>
          <label class="btn btn-outline-primary" for="lang-en">English</label>
          
          <input type="radio" class="btn-check" name="language" id="lang-es" value="es">
          <label class="btn btn-outline-primary" for="lang-es">Español</label>
          
          <input type="radio" class="btn-check" name="language" id="lang-fr" value="fr">
          <label class="btn btn-outline-primary" for="lang-fr">Français</label>
          
          <input type="radio" class="btn-check" name="language" id="lang-swa" value="swa">
          <label class="btn btn-outline-primary" for="lang-swa">Kiswahili</label>
        </div>
      </div>
    </div>

    <!-- Value Input -->
    <div class="form-group mt-4">
      <label for="value-input">Value:</label>
      <textarea id="value-input" class="form-control" rows="4" placeholder="Enter value..."></textarea>
      
      <!-- Hymn Checkbox (shown for *Hymn keys) -->
      <div id="hymn-options" class="mt-2" style="display: none;">
        <div class="form-check">
          <input type="checkbox" class="form-check-input" id="hymn-children" value="children">
          <label class="form-check-label" for="hymn-children">
            Children's Song (prepends "CS ")
          </label>
        </div>
      </div>
    </div>

    <!-- Unsaved Indicator -->
    <div id="unsaved-indicator" class="alert alert-warning mt-3" style="display: none;">
      <strong>⚠ Unsaved Changes:</strong> <span id="unsaved-count">0</span> fields modified
    </div>

    <!-- Action Buttons -->
    <div class="editor-actions mt-4">
      <button id="add-row-btn" class="btn btn-success">➕ Add New Field</button>
      <button id="save-btn" class="btn btn-primary">✓ Save Changes</button>
      <button id="discard-btn" class="btn btn-secondary">Clear Changes</button>
    </div>
  </div>

  <!-- Viewer-Only Section -->
  <div id="viewer-only-section" style="display: none;">
    <div class="alert alert-info">
      <h4>Viewer</h4>
      <p>You don't have permission to edit this sheet. Only collaborators can edit.</p>
    </div>
  </div>
</div>
```

### Task 4.2: Create SheetEditor Component Class

**File**: `js/components/SheetEditor.mjs`

**Class Structure**:

```javascript
export class SheetEditor {
  constructor(containerSelector, editorStateManager, options = {}) {
    this.container = document.querySelector(containerSelector);
    this.stateManager = editorStateManager;
    this.currentKey = null;
    this.currentLanguage = "en";
    this.isEditing = false;
    
    this.options = {
      onSave: null,    // Callback when Save clicked
      onAddRow: null,  // Callback when Add Row clicked
      ...options
    };
    
    this.eventHandlers = {};
  }

  async render() {
    // Build HTML structure above
    // Attach event listeners
    // Load keys into dropdown
  }

  on(eventName, callback) {
    // event.addListener pattern
    // Supported events: 'value-changed', 'key-selected', 'language-changed', 'save', 'add-row'
  }

  setValue(key, language, value) {
    // Update input field to show value
    // Update unsaved indicator
  }

  setKey(key) {
    // Change which key is being edited
    // Update select dropdown
    // Load value for new key
    // Show/hide hymn checkbox
  }

  setLanguage(language) {
    // Change selected language
    // Load value for new language
  }

  updateKeyList(keys) {
    // Refresh dropdown with new keys (after adding row)
  }

  showUnsavedIndicator(count) {
    // Show/hide and update count
  }

  setLoading(isLoading) {
    // Disable buttons while saving
    // Show spinner
  }

  showError(message) {
    // Toast/alert with error message
  }

  showSuccess(message) {
    // Toast/alert with success message
  }

  destroy() {
    // Clean up event listeners
  }
}
```

### Task 4.3: Implement Event Handlers & DOM Updates

**Event Handlers to Attach**:

1. **Key Selection** (`#key-select` change)
   - Emit `key-selected` event with new key
   - Load value from EditorStateManager
   - Show/hide hymn options
   - Update language pills

2. **Language Selection** (radio buttons)
   - Emit `language-changed` event
   - Load value for selected language from EditorStateManager
   - Update input field

3. **Value Input Change** (`#value-input` input)
   - Emit `value-changed` { key, language, value } event
   - Update EditorStateManager
   - Mark as unsaved
   - Show unsaved indicator

4. **Hymn Children's Checkbox** (`#hymn-children` change)
   - If checked: prepend "CS " to value
   - If unchecked: remove "CS " prefix
   - Emit `value-changed` event

5. **Add Row Button** (`#add-row-btn` click)
   - Emit `add-row` event
   - Prompt user for new key name
   - Validate key doesn't exist
   - Add to EditorStateManager
   - Refresh key dropdown
   - Select new key

6. **Save Button** (`#save-btn` click)
   - Emit `save` event with all changes
   - Disable buttons, show loading
   - Wait for parent to validate & upload
   - On success: clear unsaved indicator

7. **Discard Button** (`#discard-btn` click)
   - Ask for confirmation
   - Clear all unsaved changes
   - Reload values from EditorStateManager
   - Hide unsaved indicator

### Task 4.4: Implement Hymn Field Logic

**Hymn Detection**: If key ends with "Hymn" (case-insensitive):
- Show checkbox: "Children's Song (prepends 'CS ')"
- When checkbox checked: ensure value starts with "CS "
- When checkbox unchecked: remove "CS " prefix

**Examples**:
- User enters "2" + checks "Children's Song" → value becomes "CS 2"
- User enters "CS 2" + unchecks box → value becomes "2"
- User enters "CS 73a" + can check/uncheck
- If user manually types "CS 2": checkbox auto-checks

**Special Case**: Hymn value might include note (pipe-separated):
- "62|Sung by choir" → can edit "62" part, keep "|Sung by choir"
- Children's logic applies to hymn number part only

### Task 4.5: Implement Unsaved Indicator

**Requirements**:
- Show alert box when any field modified
- Display count of unsaved fields
- Update in real-time
- Update on Add Row
- Clear on Save or Discard

**HTML**:
```html
<div id="unsaved-indicator" class="alert alert-warning" style="display: none;">
  <strong>⚠ Unsaved Changes:</strong> <span id="unsaved-count">0</span> fields modified
</div>
```

**Logic**:
1. EditorStateManager tracks unsavedChanges
2. SheetEditor calls `stateManager.getUnsavedCount()`
3. Update DOM to show/hide indicator
4. Listen for `value-changed` events to update count

### Task 4.6: Style with Bootstrap 5

**CSS Considerations**:
- Use Bootstrap 5 CDN in `editor.html`
- Language pills: use Bootstrap btn-group + btn-check pattern
- Form layout: use form-control, form-group classes
- Validation messages: use alert classes
- Loading state: disable buttons, show spinner

**Custom CSS** (minimal):
```css
#editor-main {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid #ccc;
}

.language-buttons .btn-group {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

#value-input {
  min-height: 100px;
}

.editor-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
```

### Task 4.7: Create Unit Tests

**File**: `test/components/SheetEditor.test.mjs`

**Test Approach**: Test DOM updates and event emissions (mock DOM elements)

**Test Cases**:

```
✓ render() creates HTML structure
✓ render() populates key dropdown
✓ Key selection updates shown value
✓ Language selection changes input field
✓ Value input emits 'value-changed' event
✓ Unsaved indicator shows on value change
✓ Unsaved count increases/decreases
✓ Add Row button opens dialog for key name
✓ Add Row validates key doesn't exist
✓ Hymn-related keys show children's checkbox
✓ Hymn checkbox checked: prepends "CS "
✓ Hymn checkbox unchecked: removes "CS "
✓ Save button emits 'save' event
✓ Save button disables during save
✓ Discard button asks for confirmation
✓ Discard button clears unsaved state
✓ Error message displays toast
✓ Success message displays toast
✓ destroy() cleans up event listeners
✓ Multiple language changes tracked
✓ Pipe-separated notes preserved in hymn values
```

**Mocking**:
- Mock DOM elements using jsdom
- Mock EditorStateManager methods
- Mock window.alert/confirm
- Test event emissions via custom event listeners

---

## Phase 5: Editor Page & Navigation

**Objective**: Create `editor.html` page and integrate OAuth + Editor UI. Add navigation from main app.

**Duration**: ~10-12 hours  
**Context Required**: Medium (HTML structure, OAuth flow, navigation)  
**Files Created**: `editor.html`, `js/editor.js`, `test/editor.test.mjs`

### Task 5.1: Create editor.html Page

**File**: `editor.html`

**Structure**: Mirror `index.html` but with editor-specific content

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="Meeting Program CMS - Edit Sheet Data">
  <title>Edit Meeting Program</title>
  
  <!-- Bootstrap 5 CSS -->
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
  
  <!-- App CSS -->
  <link rel="stylesheet" href="css/styles.css">
  
  <!-- Service
```


## License: unknown
https://github.com/MDMahabulAlam/Influncer-Website/blob/63d92e4f35c901770d7303051dd532a9d326cb87/Card.html

```
I'll provide you with the comprehensive plan as a detailed document that you can save. Since I don't have file writing tools available, I'll present the complete plan in a code block that you can save directly to `./docs/FEATURE_CMS_EDIT.md`:

```markdown
# Feature Plan: CMS Sheet Editor (Google Sheets OAuth + Form UI)

**Version**: 1.0  
**Last Updated**: March 10, 2026  
**Status**: Ready for Implementation  
**Estimated Duration**: 6 phases, ~100-120 hours total (can parallelize some tasks)

---

## 📋 Table of Contents

1. [Overview & Architecture](#overview--architecture)
2. [Design Decisions](#design-decisions)
3. [Technical Architecture](#technical-architecture)
4. [Phase 1: OAuth Module](#phase-1-oauth-module)
5. [Phase 2: Google Sheets API Service](#phase-2-google-sheets-api-service)
6. [Phase 3: Editor State Manager](#phase-3-editor-state-manager)
7. [Phase 4: Editor UI Component](#phase-4-editor-ui-component)
8. [Phase 5: Editor Page & Navigation](#phase-5-editor-page--navigation)
9. [Phase 6: Tests & Deployment](#phase-6-tests--deployment)
10. [Data Structures & Interfaces](#data-structures--interfaces)
11. [Testing Specifications](#testing-specifications)
12. [Integration Checklist](#integration-checklist)
13. [Risk Mitigation](#risk-mitigation)

---

## Overview & Architecture

### What We're Building

A **Google Sheets CMS interface** that allows authorized editors to modify meeting program data directly in the app. Features:

- **Google OAuth 2.0 authentication** (PKCE flow, client-side only)
- **Collaborator verification** against the currently-loaded Google Sheet
- **Form-based UI** with scrollable key/value pairs, language selectors, validation
- **Local state management** with IndexedDB persistence for in-progress edits
- **Batch CSV upload** back to Google Sheets (not row-by-row)
- **Graceful "Viewer Only" fallback** for non-editors
- **No backend required** (GitHub Pages compatible)

### Why This Approach?

| Requirement | Solution | Why Not Others |
|---|---|---|
| **Free hosting** | GitHub Pages (static) | Avoiding backend costs ✅ |
| **No tech accounts** | Google OAuth (user's own account) | Users already have Google accounts |
| **Edit protection** | OAuth + Collaborators check | Verified against actual Sheet permissions |
| **Offline-ready** | IndexedDB state storage | Can edit offline, upload when online |
| **Easy CSV export** | CSV validation + upload | Reversible, debuggable, portable |
| **Non-tech friendly** | Form UI with pills/dropdowns | Visual, clear, no CSV syntax needed |

---

## Design Decisions

### 1. Authentication: Google OAuth 2.0 with PKCE

**Decision**: Use Google Identity Services (gis) library for browser-based OAuth authentication.

**Why**:
- No backend needed (PKCE flow works entirely client-side)
- Users sign in with account they already have
- Provides access token to call Google Sheets API
- Can verify user is a Sheet collaborator
- Token stored in `sessionStorage` (cleared on browser close) for security

**Implementation**:
- User navigates to `/editor.html`
- Click "Sign in with Google" button
- Google login popup appears
- After auth, token stored in `sessionStorage`
- App checks if user is collaborator on current sheet
- If yes: show editor; if no: show "Viewer Only"

### 2. Data Flow: Form UI + Batch Upload

**Decision**: Build form UI with field-by-field editing; upload all changes in one batch.

**Why**:
- Better UX than downloading/editing CSV locally
- Batch upload is safer than row-by-row API calls
- Can validate entire dataset before upload
- Less error-prone than incremental saves
- Users can edit multiple fields, review, then upload

**Data Lifecycle**:
1. Load current CSV from Sheet (via public export URL)
2. Parse into in-memory object: `{ key: { en, es, fr, swa } }`
3. Store in IndexedDB (survives page reload)
4. Editor modifies fields via form UI
5. On "Save": validate CSV, call Sheets API to append/update rows
6. After success: reload data, clear unsaved indicator

### 3. Permission Model: Collaborators Check

**Decision**: Check if authenticated user is a collaborator on the current Sheet.

**Why**:
- Tied to actual Sheet permissions (most secure)
- No manual allow-lists to maintain
- User only edits sheets they have permission for
- Leverages existing Google Sheet sharing

**Flow**:
1. Get sheet ID from current profile's CSV URL
2. After OAuth sign-in, call `spreadsheets.get()` to fetch collaborators
3. Compare user's email to collaborators list
4. Show/hide editor UI accordingly

### 4. UI Pattern: Scrollable Form with Language Pills

**Decision**: Single scrollable list of all keys, with key selector, language buttons, single input field.

**Why**:
- One key at a time prevents overwhelming users
- Language pills (Bootstrap 5) are clear and visual
- Single input field reduces UI complexity
- Scrollable list shows all available fields
- Matches your original spec exactly

**Form Structure**:
```
[Sign in / Logged in as: user@gmail.com] [Sign out]

Key Dropdown: [speaker1 ▼]
Language Pills: [EN] [ES] [FR] [SWA]
Input Field: [textarea with current value]
Add Row ➕ | Save Changes ✓

Unsaved: 3 changes pending
```

### 5. State Persistence: IndexedDB + Session

**Decision**: Keep edited data in IndexedDB during session; clear on sign-out.

**Why**:
- Survives page reload/accidental close
- User can ask "Resume editing?" on reload
- Keeps edits local until upload
- Session-based (not long-term storage)
- Encrypted in browser's secure storage

---

## Technical Architecture

### High-Level Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    editor.html                              │
│         (New page, mirrors index.html structure)             │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    js/editor.js                              │
│  (Orchestrator: loads profiles, checks auth, renders UI)    │
└─────────────────────────────────────────────────────────────┘
                            │
                ┌───────────┼───────────┐
                ▼           ▼           ▼
         ┌──────────┐ ┌──────────┐ ┌──────────┐
         │googleAuth│ │sheetsApi │ │editorState│
         │   .js    │ │Service.js│ │Manager.js │
         └──────────┘ └──────────┘ └──────────┘
                │           │           │
                └───────────┼───────────┘
                            │
                            ▼
         ┌──────────────────────────────────┐
         │  js/components/SheetEditor.mjs   │
         │        (UI Component)            │
         └──────────────────────────────────┘
                            │
                            ▼
         ┌──────────────────────────────────┐
         │      IndexedDB (Dexie)           │
         │   (editor._state store)          │
         └──────────────────────────────────┘
```

### File Organization

```
js/
├── auth/
│   └── googleAuth.js               [NEW] OAuth 2.0 module
├── services/
│   └── sheetsApiService.js         [NEW] Google Sheets API calls
├── data/
│   └── EditorStateManager.js       [NEW] In-memory state + persistence
├── components/
│   └── SheetEditor.mjs             [NEW] Form UI component
├── editor.js                        [NEW] Editor page entry point
└── [existing modules unchanged]

editor.html                          [NEW] Editor page

test/
├── auth/
│   └── googleAuth.test.mjs         [NEW] Auth tests
├── services/
│   └── sheetsApiService.test.mjs   [NEW] API service tests
├── data/
│   └── EditorStateManager.test.mjs [NEW] State manager tests
├── components/
│   └── SheetEditor.test.mjs        [NEW] UI component tests
└── editor.test.mjs                 [NEW] Integration tests

e2e/
├── scenarios/
│   └── editor.spec.js              [NEW] E2E scenarios

docs/
├── FEATURE_CMS_EDIT.md             [THIS FILE]
└── [existing docs unchanged]
```

### Dependencies

**External Libraries** (already in package.json):
- `dexie` v4.3.0 — IndexedDB abstraction (already used)
- Google Identity Services — Added via CDN script tag in editor.html

**No new npm dependencies**

---

## Phase 1: OAuth Module

**Objective**: Implement Google OAuth 2.0 authentication with PKCE flow.

**Duration**: ~8-10 hours  
**Context Required**: Medium (auth patterns, Google API basics)  
**Files Created**: `js/auth/googleAuth.js`, `test/auth/googleAuth.test.mjs`

### Task 1.1: Create googleAuth Module Structure

**File**: `js/auth/googleAuth.js`

Create a module that:
- Exports an object: `GoogleAuth` with methods listed below
- Initializes Google Identity Services (gis) on load
- NO external dependencies except gis library (loaded via CDN in editor.html)

**Methods to implement**:

```javascript
GoogleAuth.initialize(clientId, redirectUri)
GoogleAuth.signIn()                    // Opens Google login popup
GoogleAuth.signOut()                   // Clears token, closes session
GoogleAuth.getAccessToken()            // Returns token from sessionStorage
GoogleAuth.isAuthenticated()           // Returns boolean
GoogleAuth.getUser()                   // Returns { email, name }
GoogleAuth.onTokenExpire(callback)     // Handles token refresh
```

**Session Storage Keys**:
- `gm_access_token` — OAuth access token
- `gm_user_email` — User's email
- `gm_token_expires` — Token expiry timestamp (ms)

**Error Handling**:
- If user cancels login: resolve to `null` (don't throw)
- If token expires: auto-refresh or trigger re-auth
- Log all errors to `[AUTH]` prefix

**Notes**:
- Use `sessionStorage` only (cleared on browser close)
- Never use `localStorage` for tokens
- Implement token expiry check before API calls
- Google sign-out should clear all stored data

### Task 1.2: Handle PKCE Flow (Authorization Code)

**Context**: PKCE (Proof Key for Code Exchange) is how OAuth 2.0 works in browsers without backend.

**Implementation Details**:

1. Generate `code_verifier` (43-128 char random string)
2. Hash it to `code_challenge` (SHA-256)
3. Send user to Google auth endpoint with `code_challenge`
4. User grants permission
5. Google redirects back with authorization `code`
6. Exchange `code` + `code_verifier` for access token
7. Store token in `sessionStorage`

**Library**: Use `google-gsi` (Google Identity Services)
- Already available via CDN: `https://accounts.google.com/gsi/client`
- Handles PKCE automatically
- Simpler to use than raw OAuth

**Code Flow**:
```javascript
// In googleAuth.js
function generatePKCEPair() {
  // Generate random code_verifier
  // SHA-256 hash to code_challenge
  // Return { verifier, challenge }
}

async function exchangeCodeForToken(code, codeVerifier) {
  // POST to Google token endpoint
  // Return access token
}
```

**Testing**:
- Mock `sessionStorage`
- Mock Google gsi library
- Test token generation/storage
- Test error cases (network, user cancel)

### Task 1.3: Implement Token Refresh & Expiry

**Requirement**: Access tokens expire in ~1 hour. Handle gracefully.

**Implementation**:
1. Store token `expires_at` timestamp when token received
2. Before API calls: check if `Date.now() > expires_at`
3. If expired: trigger refresh flow
4. If refresh fails: sign out and require re-auth

**Methods**:
```javascript
GoogleAuth.isTokenExpired()
GoogleAuth.refreshToken()
GoogleAuth.onTokenExpire(callback)  // Register handler
```

**Edge Case**: If user's Google session has ended, refresh will fail. Show "Please sign in again" message.

### Task 1.4: Create Unit Tests for Auth

**File**: `test/auth/googleAuth.test.mjs`

**Test Cases**:

```
✓ signIn() opens Google popup
✓ On successful auth, token stored in sessionStorage
✓ isAuthenticated() returns true after sign-in
✓ isAuthenticated() returns false before sign-in
✓ getAccessToken() returns token string
✓ getUser() returns { email, name }
✓ Token expiry is calculated correctly
✓ signOut() clears sessionStorage
✓ isTokenExpired() returns true for expired token
✓ refreshToken() updates token before expiry
✓ On network error, gracefully handle (don't crash)
✓ On user cancel, resolve to null (not throw)
✓ Multiple sign-in calls don't create duplicate popups
```

**Mocking**:
- Mock global `google` object (from gis library)
- Mock `sessionStorage`
- Mock `fetch` for token endpoint

---

## Phase 2: Google Sheets API Service

**Objective**: Wrapper for Google Sheets API operations (check collaborators, upload data).

**Duration**: ~10-12 hours  
**Context Required**: Medium (Google Sheets API, HTTP requests)  
**Files Created**: `js/services/sheetsApiService.js`, `test/services/sheetsApiService.test.mjs`

### Task 2.1: Create Sheets API Service Structure

**File**: `js/services/sheetsApiService.js`

**Methods to export**:

```javascript
SheetsAPI.initialize(accessToken)              // Set auth token
SheetsAPI.getSpreadsheetMetadata(sheetId)      // Get sheet info + collaborators
SheetsAPI.checkIfCollaborator(sheetId, email)  // Boolean
SheetsAPI.getSheetValues(sheetId, range)       // Fetch cell values
SheetsAPI.appendRows(sheetId, values)          // Add rows to sheet
SheetsAPI.updateRows(sheetId, values)          // Update existing rows
SheetsAPI.uploadCSV(sheetId, csvData)          // Replace entire sheet data
```

**Dependencies**:
- `GoogleAuth` module (to get access token)
- Standard `fetch` API (no external library)

**Base Endpoint**: `https://sheets.googleapis.com/v4/spreadsheets`

**Required OAuth Scope**: `https://www.googleapis.com/auth/spreadsheets`

**Error Handling**:
- Log all HTTP errors with request details
- Return `{ success: false, error: "message" }` for failures
- Throw on authentication errors (token expired, unauthorized)
- Network timeouts: implement 30-second timeout

### Task 2.2: Extract Sheet ID from CSV URL

**Context**: Current profiles store CSV export URLs. Need to extract sheet ID.

**Sheet URL Patterns**:
```
CSV export URL: https://docs.google.com/spreadsheets/d/ABC123XYZ/gviz/tq?tqx=out:csv
Sheet ID:       ABC123XYZ (extract from /d/.../)

Normal sheet URL: https://docs.google.com/spreadsheets/d/ABC123XYZ/edit#gid=0
Sheet ID:        ABC123XYZ (same extraction)
```

**Function**:
```javascript
function extractSheetIdFromUrl(csvUrl) {
  // return sheet ID string, or null if invalid
}
```

**Validation**:
- Ensure URL contains `docs.google.com/spreadsheets/d/`
- Ensure ID is alphanumeric (no special chars)
- Return `null` for invalid URLs

### Task 2.3: Implement `getSpreadsheetMetadata()`

**API Call**: `GET /v4/spreadsheets/{sheetId}`

**Returns**:
```json
{
  "spreadsheetId": "ABC123XYZ",
  "properties": {
    "title": "Sacrament Program",
    "locale": "en_US",
    ...
  }
}
```

**Additional**: Fetch collaborators via Drive API (optional advanced feature; for now, assume we can determine from spreadsheet.properties)

**Note**: Google Sheets API's `spreadsheets.get()` requires the user to have at least Viewer access. Request with `fields=spreadsheetId,properties` to minimize response size.

### Task 2.4: Implement `checkIfCollaborator()`

**Logic**:
1. Call `getSpreadsheetMetadata(sheetId)`
2. Check `spreadsheetProperties` for owner/editors
3. Compare `GoogleAuth.getUser().email` to collaborators list
4. Return `true` if match, `false` otherwise

**Edge Cases**:
- User email might have different case (do case-insensitive compare)
- If metadata doesn't contain collaborators, conservative approach: `return false` (deny access)
- If API call fails: `throw` error (don't silently deny)

**Alternative** (if Google Sheets API doesn't provide collaborators easily):
- Could use Drive API's `permissions` endpoint
- For now, assume metadata provides this info; adjust if not available

### Task 2.5: Implement CSV Upload/Append

**Historical Context**: App currently uses public CSV export URLs (read-only).

**New Requirement**: Upload modified CSV back to Sheet.

**Two Approaches**:

**Option A: Append Rows** (Simpler)
- API: `POST /v4/spreadsheets/{sheetId}/values:append`
- Each edited row sent as new row
- Pro: Simple, no row-by-row tracking
- Con: Duplicates sheet data if not careful

**Option B: Clear & Replace** (Safer)
- API: `POST /v4/spreadsheets/{sheetId}/values:batchUpdate`
- Clear all data, write new CSV
- Pro: Guaranteed consistent state
- Con: All-or-nothing (can't recover if network fails mid-upload)

**Decision**: Use **Option B** (Clear & Replace) with validation

**Implementation**:

```javascript
async function uploadCSV(sheetId, csvData) {
  // 1. Validate csvData format (check headers, etc.)
  // 2. Parse CSV into 2D array (rows + columns)
  // 3. Call Sheets API:
  //    - DELETE all rows from Sheet1
  //    - APPEND new CSV data
  // 4. Return { success, sheetId, rowsWritten }
}
```

**API Call**:
```
POST /v4/spreadsheets/{sheetId}/values/Sheet1:clear
POST /v4/spreadsheets/{sheetId}/values/Sheet1:append
  Body: { values: [ ["key", "en", "es", "fr", "swa"], [...], [...] ] }
```

**Error Recovery**:
- If clear succeeds but append fails: sheet is empty (bad)
- Mitigation: Check sheet before upload, warn user
- Alternative: Use local backup copy for recovery

### Task 2.6: Create Unit Tests for Sheets API Service

**File**: `test/services/sheetsApiService.test.mjs`

**Test Cases**:

```
✓ extractSheetIdFromUrl() extracts ID correctly
✓ extractSheetIdFromUrl() rejects invalid URLs
✓ getSpreadsheetMetadata() makes correct API call
✓ getSpreadsheetMetadata() parses response
✓ checkIfCollaborator() returns true for collaborators
✓ checkIfCollaborator() returns false for non-collaborators
✓ checkIfCollaborator() is case-insensitive for email
✓ uploadCSV() calls clear then append
✓ uploadCSV() throws on validation error
✓ uploadCSV() returns row count
✓ On 401 Unauthorized: throw auth error
✓ On 403 Forbidden: throw permission error
✓ On network timeout: throw with timeout message
✓ On invalid CSV: return validation error
```

**Mocking**:
- Mock `fetch` for all API calls
- Mock `GoogleAuth.getAccessToken()`
- Mock `GoogleAuth.getUser()`

---

## Phase 3: Editor State Manager

**Objective**: In-memory state management for edited CSV data with IndexedDB persistence.

**Duration**: ~10-12 hours  
**Context Required**: Medium (IndexedDB, CSV parsing, state management)  
**Files Created**: `js/data/EditorStateManager.js`, `test/data/EditorStateManager.test.mjs`

### Task 3.1: Create EditorStateManager Structure

**File**: `js/data/EditorStateManager.js`

**Purpose**: Hold edited CSV data in memory, track changes, persist to IndexedDB.

**Internal Data Structure**:

```javascript
// Parsed CSV stored as:
{
  headers: ["key", "en", "es", "fr", "swa"],
  rows: {
    "unitName": {
      en: "Your Ward Name",
      es: "Nombre de Su Rama",
      fr: "Nom de Votre Branche",
      swa: "Jina la Kimanda Yako"
    },
    "speaker1": {
      en: "John Smith",
      es: "", // Empty = fallback to English
      fr: "",
      swa: ""
    },
    // ... more rows
  },
  // Track which fields have unsaved changes
  unsavedChanges: {
    "unitName": { en: true, es: false, fr: false, swa: false },
    "speaker1": { en: false, es: true, fr: false, swa: false },
  },
  // Metadata
  sheetId: "ABC123XYZ",
  createdAt: Date.now(),
  lastModified: Date.now()
}
```

**Class Methods**:

```javascript
class EditorStateManager {
  constructor(sheetId) {
    this.sheetId = sheetId;
    this.state = { /* as above */ };
  }

  async loadFromSheet(csvUrl) {
    // Fetch current CSV from sheet
    // Parse it into state.rows
    // Save to IndexedDB
  }

  getValue(key, language = "en") {
    // Return value for key + language
    // Fallback to English if empty
  }

  setValue(key, language, value) {
    // Update value, mark as changed
    // Don't save to DB yet (only on explicit save)
  }

  addRow(key, values = {}) {
    // Add new key with optional values
    // Mark as new/unsaved
  }

  deleteRow(key) {
    // Mark row for deletion
  }

  getUnsavedCount() {
    // Return number of changed fields
  }

  getChangedRows() {
    // Return only rows with unsaved changes
  }

  async validate() {
    // Check CSV structure, keys, hymn format
    // Return { valid: boolean, errors: [] }
  }

  toCSV() {
    // Generate CSV string ready for upload
    // Includes validation
  }

  async saveChanges(csvData) {
    // Save edited state to IndexedDB for session persistence
  }

  async discardChanges() {
    // Clear unsaved state, reload from sheet
  }

  async clear() {
    // Delete all editor data from IndexedDB
  }

  static async resume(sheetId) {
    // Check if previous session exists
    // Return EditorStateManager instance or null
  }
}
```

### Task 3.2: Implement CSV Parsing & Validation

**Requirement**: Parse Google Sheet CSV into structured data.

**CSV Format**:
```
key,en,es,fr,swa
unitName,Your Ward,Su Rama,Votre Branche,Kimanda Yako
speaker1,John Smith,Juan Garcia,Jean Dupont,Yohana Mto
openingHymn,62
CS 2,Accompaniment by Sister Smith
```

**Parsing Logic**:
1. Use existing `parseCSV()` from `js/utils/csv.js` as reference
2. Detect CSV format: simple (key, value) vs. multi-lang (key, en, es, fr, swa)
3. Extract headers row
4. Parse data rows into dictionary structure
5. Normalize language values (trim whitespace, handle quotes)

**Validation Rules** (Task 3.3):
1. **Required headers**: Must have "key" column
2. **Language columns**: "en", "es", "fr", "swa" (if multi-lang format)
3. **No duplicate keys**: Each key appears only once
4. **Hymn format**: If key ends with "Hymn":
   - Value must be number (e.g., `62`, `1001`)
   - OR `CS` + space + number + optional letter (e.g., `CS 2`, `CS 73a`)
5. **Required fields**: "key" must be non-empty, "en" must be non-empty (unless fallback)
6. **No XSS payload**: Sanitize values (reuse `sanitizeEntry()` from `js/sanitize.js`)

**Error Messages**:
```javascript
{
  errors: [
    { row: 2, column: "opening Hymn", message: "Invalid hymn format: must be number or CS{space}number" },
    { row: 5, column: "key", message: "Duplicate key: 'speaker1' already defined at row 3" },
    { row: "header", column: "es", message: "Missing required language column" }
  ]
}
```

### Task 3.3: Implement Hymn Format Validation

**Context**: Hymn fields can have special format:
- Regular: `62` (hymn number)
- Children's: `CS 2` (with space, can have letter like `CS 73a`)
- With note: `62|Sung by Primary` (pipe-separated annotation)

**Validation Function**:

```javascript
function validateHymnValue(value) {
  if (!value) return { valid: false, error: "Hymn value cannot be empty" };
  
  // Split on pipe to get hymn part
  const [hymnPart] = value.split("|");
  const hymn = hymnPart.trim();
  
  // Pattern: number OR "CS {number}{optional letter}"
  const hymnRegex = /^(\d{1,4}|CS [0-9]{1,4}[a-z]?)$/i;
  
  if (!hymnRegex.test(hymn)) {
    return {
      valid: false,
      error: `Invalid hymn: ${hymn}. Use format: "62" or "CS 2" or "CS 73a", optionally with "|Note"`
    };
  }
  
  return { valid: true };
}
```

**Hymn Lookup** (Optional Enhancement):
- Reference `js/data/hymnsLookup.js` to validate hymn numbers exist
- For now: just validate format (not whether hymn exists)
- Can add lookup validation in Phase 4

### Task 3.4: Implement IndexedDB Persistence

**Context**: Store editor state so user can reload page and resume editing.

**IndexedDB Store**: `editor._state`

**Schema**:
```javascript
// In js/data/db.js (existing Dexie setup)
// Add new store:
editor_state: "sheetId, createdAt" // Compound key
```

**Stored Data**:
```javascript
{
  id: "auto-generated",
  sheetId: "ABC123XYZ",
  createdAt: Date.now(),
  lastModified: Date.now(),
  expiresAt: createdAt + (24 * 60 * 60 * 1000), // 24h session
  state: { /* EditorStateManager.state */ },
  csvUrl: "https://docs.google.com/..."
}
```

**Methods**:

```javascript
async function saveSessionState(sheetId, state, csvUrl) {
  // Store to IndexedDB
  // Return saved object with ID
}

async function getSessionState(sheetId) {
  // Fetch from IndexedDB
  // Check if expired (24h)
  // Return state or null
}

async function deleteSessionState(sheetId) {
  // Remove from IndexedDB
}

async function resumeSession(sheetId) {
  // Check if session exists
  // Ask user: "Resume editing? X changes pending"
  // Return EditorStateManager with restored state or null
}
```

**Expiry Policy**: Sessions expire after 24 hours (paranoid safety).

### Task 3.5: Implement toCSV() & String Generation

**Requirement**: Convert in-memory state back to CSV string format suitable for upload.

**Function**:

```javascript
toCSV() {
  // 1. Build header: "key,en,es,fr,swa"
  // 2. For each row, quote fields with commas/newlines
  // 3. Handle fallback: if language cell empty, use English value
  // 4. Return as string ready for Sheets API
}

// Example output:
// key,en,es,fr,swa
// unitName,Your Ward,Su Rama,Votre Branche,Kimanda Yako
// speaker1,"Smith, John","García, Juan","Dupont, Jean","Mtu, Yohana"
// openingHymn,62
//
```

**CSV Quoting Rules**:
- Quote fields containing: comma, newline, quotes
- Escape quotes: `"` → `""`
- Leave other fields unquoted

**Reference**: Use logic from `js/utils/csv.js` as template.

### Task 3.6: Create Unit Tests

**File**: `test/data/EditorStateManager.test.mjs`

**Test Cases**:

```
✓ loadFromSheet() fetches and parses CSV correctly
✓ loadFromSheet() handles multi-language format
✓ loadFromSheet() handles simple key-value format
✓ getValue() returns correct value
✓ getValue() falls back to English if language empty
✓ setValue() updates value and marks unsaved
✓ addRow() adds new key with empty values
✓ deleteRow() marks row for deletion
✓ getUnsavedCount() returns correct count
✓ getChangedRows() returns only unsaved rows
✓ validate() rejects duplicate keys
✓ validate() rejects invalid hymn format
✓ validate() rejects duplicate hymn with "CS" prefix
✓ validate() catches empty key
✓ toCSV() generates valid CSV string
✓ toCSV() quotes fields with commas
✓ toCSV() includes all languages
✓ saveChanges() stores to IndexedDB
✓ resumeSession() restores previous state
✓ discardChanges() clears unsaved state
✓ Session expires after 24 hours
```

**Mocking**:
- Mock `fetch` for CSV download
- Mock IndexedDB via `fake-indexeddb`
- Mock `sanitizeEntry()`

---

## Phase 4: Editor UI Component

**Objective**: React-like component for editor form (scrollable list, key selector, language pills, input field).

**Duration**: ~12-14 hours  
**Context Required**: Medium-High (DOM manipulation, event handling, Bootstrap 5)  
**Files Created**: `js/components/SheetEditor.mjs`, `test/components/SheetEditor.test.mjs`

### Task 4.1: Design UI Structure & Components

**HTML Structure** (will be rendered by JavaScript):

```html
<div id="editor-main">
  <!-- Authentication Section -->
  <div id="auth-section">
    <button id="signin-btn" class="btn btn-primary">Sign in with Google</button>
  </div>

  <!-- Editor Section (hidden until auth) -->
  <div id="editor-section" style="display: none;">
    <!-- User Info -->
    <div class="editor-header">
      <span class="user-email">Logged in as: user@gmail.com</span>
      <button id="signout-btn" class="btn btn-sm btn-secondary">Sign out</button>
    </div>

    <!-- Key Selector & Language -->
    <div class="editor-controls">
      <div class="form-group">
        <label for="key-select">Key:</label>
        <select id="key-select" class="form-control">
          <option value="">-- Select a key --</option>
          <option value="unitName">unitName</option>
          <option value="speaker1">speaker1</option>
          <!-- ... all keys ... -->
        </select>
      </div>

      <!-- Language Pills (Bootstrap 5 buttons) -->
      <div class="language-buttons mt-3">
        <label>Language:</label>
        <div class="btn-group" role="group">
          <input type="radio" class="btn-check" name="language" id="lang-en" value="en" checked>
          <label class="btn btn-outline-primary" for="lang-en">English</label>
          
          <input type="radio" class="btn-check" name="language" id="lang-es" value="es">
          <label class="btn btn-outline-primary" for="lang-es">Español</label>
          
          <input type="radio" class="btn-check" name="language" id="lang-fr" value="fr">
          <label class="btn btn-outline-primary" for="lang-fr">Français</label>
          
          <input type="radio" class="btn-check" name="language" id="lang-swa" value="swa">
          <label class="btn btn-outline-primary" for="lang-swa">Kiswahili</label>
        </div>
      </div>
    </div>

    <!-- Value Input -->
    <div class="form-group mt-4">
      <label for="value-input">Value:</label>
      <textarea id="value-input" class="form-control" rows="4" placeholder="Enter value..."></textarea>
      
      <!-- Hymn Checkbox (shown for *Hymn keys) -->
      <div id="hymn-options" class="mt-2" style="display: none;">
        <div class="form-check">
          <input type="checkbox" class="form-check-input" id="hymn-children" value="children">
          <label class="form-check-label" for="hymn-children">
            Children's Song (prepends "CS ")
          </label>
        </div>
      </div>
    </div>

    <!-- Unsaved Indicator -->
    <div id="unsaved-indicator" class="alert alert-warning mt-3" style="display: none;">
      <strong>⚠ Unsaved Changes:</strong> <span id="unsaved-count">0</span> fields modified
    </div>

    <!-- Action Buttons -->
    <div class="editor-actions mt-4">
      <button id="add-row-btn" class="btn btn-success">➕ Add New Field</button>
      <button id="save-btn" class="btn btn-primary">✓ Save Changes</button>
      <button id="discard-btn" class="btn btn-secondary">Clear Changes</button>
    </div>
  </div>

  <!-- Viewer-Only Section -->
  <div id="viewer-only-section" style="display: none;">
    <div class="alert alert-info">
      <h4>Viewer</h4>
      <p>You don't have permission to edit this sheet. Only collaborators can edit.</p>
    </div>
  </div>
</div>
```

### Task 4.2: Create SheetEditor Component Class

**File**: `js/components/SheetEditor.mjs`

**Class Structure**:

```javascript
export class SheetEditor {
  constructor(containerSelector, editorStateManager, options = {}) {
    this.container = document.querySelector(containerSelector);
    this.stateManager = editorStateManager;
    this.currentKey = null;
    this.currentLanguage = "en";
    this.isEditing = false;
    
    this.options = {
      onSave: null,    // Callback when Save clicked
      onAddRow: null,  // Callback when Add Row clicked
      ...options
    };
    
    this.eventHandlers = {};
  }

  async render() {
    // Build HTML structure above
    // Attach event listeners
    // Load keys into dropdown
  }

  on(eventName, callback) {
    // event.addListener pattern
    // Supported events: 'value-changed', 'key-selected', 'language-changed', 'save', 'add-row'
  }

  setValue(key, language, value) {
    // Update input field to show value
    // Update unsaved indicator
  }

  setKey(key) {
    // Change which key is being edited
    // Update select dropdown
    // Load value for new key
    // Show/hide hymn checkbox
  }

  setLanguage(language) {
    // Change selected language
    // Load value for new language
  }

  updateKeyList(keys) {
    // Refresh dropdown with new keys (after adding row)
  }

  showUnsavedIndicator(count) {
    // Show/hide and update count
  }

  setLoading(isLoading) {
    // Disable buttons while saving
    // Show spinner
  }

  showError(message) {
    // Toast/alert with error message
  }

  showSuccess(message) {
    // Toast/alert with success message
  }

  destroy() {
    // Clean up event listeners
  }
}
```

### Task 4.3: Implement Event Handlers & DOM Updates

**Event Handlers to Attach**:

1. **Key Selection** (`#key-select` change)
   - Emit `key-selected` event with new key
   - Load value from EditorStateManager
   - Show/hide hymn options
   - Update language pills

2. **Language Selection** (radio buttons)
   - Emit `language-changed` event
   - Load value for selected language from EditorStateManager
   - Update input field

3. **Value Input Change** (`#value-input` input)
   - Emit `value-changed` { key, language, value } event
   - Update EditorStateManager
   - Mark as unsaved
   - Show unsaved indicator

4. **Hymn Children's Checkbox** (`#hymn-children` change)
   - If checked: prepend "CS " to value
   - If unchecked: remove "CS " prefix
   - Emit `value-changed` event

5. **Add Row Button** (`#add-row-btn` click)
   - Emit `add-row` event
   - Prompt user for new key name
   - Validate key doesn't exist
   - Add to EditorStateManager
   - Refresh key dropdown
   - Select new key

6. **Save Button** (`#save-btn` click)
   - Emit `save` event with all changes
   - Disable buttons, show loading
   - Wait for parent to validate & upload
   - On success: clear unsaved indicator

7. **Discard Button** (`#discard-btn` click)
   - Ask for confirmation
   - Clear all unsaved changes
   - Reload values from EditorStateManager
   - Hide unsaved indicator

### Task 4.4: Implement Hymn Field Logic

**Hymn Detection**: If key ends with "Hymn" (case-insensitive):
- Show checkbox: "Children's Song (prepends 'CS ')"
- When checkbox checked: ensure value starts with "CS "
- When checkbox unchecked: remove "CS " prefix

**Examples**:
- User enters "2" + checks "Children's Song" → value becomes "CS 2"
- User enters "CS 2" + unchecks box → value becomes "2"
- User enters "CS 73a" + can check/uncheck
- If user manually types "CS 2": checkbox auto-checks

**Special Case**: Hymn value might include note (pipe-separated):
- "62|Sung by choir" → can edit "62" part, keep "|Sung by choir"
- Children's logic applies to hymn number part only

### Task 4.5: Implement Unsaved Indicator

**Requirements**:
- Show alert box when any field modified
- Display count of unsaved fields
- Update in real-time
- Update on Add Row
- Clear on Save or Discard

**HTML**:
```html
<div id="unsaved-indicator" class="alert alert-warning" style="display: none;">
  <strong>⚠ Unsaved Changes:</strong> <span id="unsaved-count">0</span> fields modified
</div>
```

**Logic**:
1. EditorStateManager tracks unsavedChanges
2. SheetEditor calls `stateManager.getUnsavedCount()`
3. Update DOM to show/hide indicator
4. Listen for `value-changed` events to update count

### Task 4.6: Style with Bootstrap 5

**CSS Considerations**:
- Use Bootstrap 5 CDN in `editor.html`
- Language pills: use Bootstrap btn-group + btn-check pattern
- Form layout: use form-control, form-group classes
- Validation messages: use alert classes
- Loading state: disable buttons, show spinner

**Custom CSS** (minimal):
```css
#editor-main {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid #ccc;
}

.language-buttons .btn-group {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

#value-input {
  min-height: 100px;
}

.editor-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
```

### Task 4.7: Create Unit Tests

**File**: `test/components/SheetEditor.test.mjs`

**Test Approach**: Test DOM updates and event emissions (mock DOM elements)

**Test Cases**:

```
✓ render() creates HTML structure
✓ render() populates key dropdown
✓ Key selection updates shown value
✓ Language selection changes input field
✓ Value input emits 'value-changed' event
✓ Unsaved indicator shows on value change
✓ Unsaved count increases/decreases
✓ Add Row button opens dialog for key name
✓ Add Row validates key doesn't exist
✓ Hymn-related keys show children's checkbox
✓ Hymn checkbox checked: prepends "CS "
✓ Hymn checkbox unchecked: removes "CS "
✓ Save button emits 'save' event
✓ Save button disables during save
✓ Discard button asks for confirmation
✓ Discard button clears unsaved state
✓ Error message displays toast
✓ Success message displays toast
✓ destroy() cleans up event listeners
✓ Multiple language changes tracked
✓ Pipe-separated notes preserved in hymn values
```

**Mocking**:
- Mock DOM elements using jsdom
- Mock EditorStateManager methods
- Mock window.alert/confirm
- Test event emissions via custom event listeners

---

## Phase 5: Editor Page & Navigation

**Objective**: Create `editor.html` page and integrate OAuth + Editor UI. Add navigation from main app.

**Duration**: ~10-12 hours  
**Context Required**: Medium (HTML structure, OAuth flow, navigation)  
**Files Created**: `editor.html`, `js/editor.js`, `test/editor.test.mjs`

### Task 5.1: Create editor.html Page

**File**: `editor.html`

**Structure**: Mirror `index.html` but with editor-specific content

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="Meeting Program CMS - Edit Sheet Data">
  <title>Edit Meeting Program</title>
  
  <!-- Bootstrap 5 CSS -->
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
  
  <!-- App CSS -->
  <link rel="stylesheet" href="css/styles.css">
  
  <!-- Service
```


## License: unknown
https://github.com/MDMahabulAlam/Influncer-Website/blob/63d92e4f35c901770d7303051dd532a9d326cb87/Card.html

```
I'll provide you with the comprehensive plan as a detailed document that you can save. Since I don't have file writing tools available, I'll present the complete plan in a code block that you can save directly to `./docs/FEATURE_CMS_EDIT.md`:

```markdown
# Feature Plan: CMS Sheet Editor (Google Sheets OAuth + Form UI)

**Version**: 1.0  
**Last Updated**: March 10, 2026  
**Status**: Ready for Implementation  
**Estimated Duration**: 6 phases, ~100-120 hours total (can parallelize some tasks)

---

## 📋 Table of Contents

1. [Overview & Architecture](#overview--architecture)
2. [Design Decisions](#design-decisions)
3. [Technical Architecture](#technical-architecture)
4. [Phase 1: OAuth Module](#phase-1-oauth-module)
5. [Phase 2: Google Sheets API Service](#phase-2-google-sheets-api-service)
6. [Phase 3: Editor State Manager](#phase-3-editor-state-manager)
7. [Phase 4: Editor UI Component](#phase-4-editor-ui-component)
8. [Phase 5: Editor Page & Navigation](#phase-5-editor-page--navigation)
9. [Phase 6: Tests & Deployment](#phase-6-tests--deployment)
10. [Data Structures & Interfaces](#data-structures--interfaces)
11. [Testing Specifications](#testing-specifications)
12. [Integration Checklist](#integration-checklist)
13. [Risk Mitigation](#risk-mitigation)

---

## Overview & Architecture

### What We're Building

A **Google Sheets CMS interface** that allows authorized editors to modify meeting program data directly in the app. Features:

- **Google OAuth 2.0 authentication** (PKCE flow, client-side only)
- **Collaborator verification** against the currently-loaded Google Sheet
- **Form-based UI** with scrollable key/value pairs, language selectors, validation
- **Local state management** with IndexedDB persistence for in-progress edits
- **Batch CSV upload** back to Google Sheets (not row-by-row)
- **Graceful "Viewer Only" fallback** for non-editors
- **No backend required** (GitHub Pages compatible)

### Why This Approach?

| Requirement | Solution | Why Not Others |
|---|---|---|
| **Free hosting** | GitHub Pages (static) | Avoiding backend costs ✅ |
| **No tech accounts** | Google OAuth (user's own account) | Users already have Google accounts |
| **Edit protection** | OAuth + Collaborators check | Verified against actual Sheet permissions |
| **Offline-ready** | IndexedDB state storage | Can edit offline, upload when online |
| **Easy CSV export** | CSV validation + upload | Reversible, debuggable, portable |
| **Non-tech friendly** | Form UI with pills/dropdowns | Visual, clear, no CSV syntax needed |

---

## Design Decisions

### 1. Authentication: Google OAuth 2.0 with PKCE

**Decision**: Use Google Identity Services (gis) library for browser-based OAuth authentication.

**Why**:
- No backend needed (PKCE flow works entirely client-side)
- Users sign in with account they already have
- Provides access token to call Google Sheets API
- Can verify user is a Sheet collaborator
- Token stored in `sessionStorage` (cleared on browser close) for security

**Implementation**:
- User navigates to `/editor.html`
- Click "Sign in with Google" button
- Google login popup appears
- After auth, token stored in `sessionStorage`
- App checks if user is collaborator on current sheet
- If yes: show editor; if no: show "Viewer Only"

### 2. Data Flow: Form UI + Batch Upload

**Decision**: Build form UI with field-by-field editing; upload all changes in one batch.

**Why**:
- Better UX than downloading/editing CSV locally
- Batch upload is safer than row-by-row API calls
- Can validate entire dataset before upload
- Less error-prone than incremental saves
- Users can edit multiple fields, review, then upload

**Data Lifecycle**:
1. Load current CSV from Sheet (via public export URL)
2. Parse into in-memory object: `{ key: { en, es, fr, swa } }`
3. Store in IndexedDB (survives page reload)
4. Editor modifies fields via form UI
5. On "Save": validate CSV, call Sheets API to append/update rows
6. After success: reload data, clear unsaved indicator

### 3. Permission Model: Collaborators Check

**Decision**: Check if authenticated user is a collaborator on the current Sheet.

**Why**:
- Tied to actual Sheet permissions (most secure)
- No manual allow-lists to maintain
- User only edits sheets they have permission for
- Leverages existing Google Sheet sharing

**Flow**:
1. Get sheet ID from current profile's CSV URL
2. After OAuth sign-in, call `spreadsheets.get()` to fetch collaborators
3. Compare user's email to collaborators list
4. Show/hide editor UI accordingly

### 4. UI Pattern: Scrollable Form with Language Pills

**Decision**: Single scrollable list of all keys, with key selector, language buttons, single input field.

**Why**:
- One key at a time prevents overwhelming users
- Language pills (Bootstrap 5) are clear and visual
- Single input field reduces UI complexity
- Scrollable list shows all available fields
- Matches your original spec exactly

**Form Structure**:
```
[Sign in / Logged in as: user@gmail.com] [Sign out]

Key Dropdown: [speaker1 ▼]
Language Pills: [EN] [ES] [FR] [SWA]
Input Field: [textarea with current value]
Add Row ➕ | Save Changes ✓

Unsaved: 3 changes pending
```

### 5. State Persistence: IndexedDB + Session

**Decision**: Keep edited data in IndexedDB during session; clear on sign-out.

**Why**:
- Survives page reload/accidental close
- User can ask "Resume editing?" on reload
- Keeps edits local until upload
- Session-based (not long-term storage)
- Encrypted in browser's secure storage

---

## Technical Architecture

### High-Level Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    editor.html                              │
│         (New page, mirrors index.html structure)             │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    js/editor.js                              │
│  (Orchestrator: loads profiles, checks auth, renders UI)    │
└─────────────────────────────────────────────────────────────┘
                            │
                ┌───────────┼───────────┐
                ▼           ▼           ▼
         ┌──────────┐ ┌──────────┐ ┌──────────┐
         │googleAuth│ │sheetsApi │ │editorState│
         │   .js    │ │Service.js│ │Manager.js │
         └──────────┘ └──────────┘ └──────────┘
                │           │           │
                └───────────┼───────────┘
                            │
                            ▼
         ┌──────────────────────────────────┐
         │  js/components/SheetEditor.mjs   │
         │        (UI Component)            │
         └──────────────────────────────────┘
                            │
                            ▼
         ┌──────────────────────────────────┐
         │      IndexedDB (Dexie)           │
         │   (editor._state store)          │
         └──────────────────────────────────┘
```

### File Organization

```
js/
├── auth/
│   └── googleAuth.js               [NEW] OAuth 2.0 module
├── services/
│   └── sheetsApiService.js         [NEW] Google Sheets API calls
├── data/
│   └── EditorStateManager.js       [NEW] In-memory state + persistence
├── components/
│   └── SheetEditor.mjs             [NEW] Form UI component
├── editor.js                        [NEW] Editor page entry point
└── [existing modules unchanged]

editor.html                          [NEW] Editor page

test/
├── auth/
│   └── googleAuth.test.mjs         [NEW] Auth tests
├── services/
│   └── sheetsApiService.test.mjs   [NEW] API service tests
├── data/
│   └── EditorStateManager.test.mjs [NEW] State manager tests
├── components/
│   └── SheetEditor.test.mjs        [NEW] UI component tests
└── editor.test.mjs                 [NEW] Integration tests

e2e/
├── scenarios/
│   └── editor.spec.js              [NEW] E2E scenarios

docs/
├── FEATURE_CMS_EDIT.md             [THIS FILE]
└── [existing docs unchanged]
```

### Dependencies

**External Libraries** (already in package.json):
- `dexie` v4.3.0 — IndexedDB abstraction (already used)
- Google Identity Services — Added via CDN script tag in editor.html

**No new npm dependencies**

---

## Phase 1: OAuth Module

**Objective**: Implement Google OAuth 2.0 authentication with PKCE flow.

**Duration**: ~8-10 hours  
**Context Required**: Medium (auth patterns, Google API basics)  
**Files Created**: `js/auth/googleAuth.js`, `test/auth/googleAuth.test.mjs`

### Task 1.1: Create googleAuth Module Structure

**File**: `js/auth/googleAuth.js`

Create a module that:
- Exports an object: `GoogleAuth` with methods listed below
- Initializes Google Identity Services (gis) on load
- NO external dependencies except gis library (loaded via CDN in editor.html)

**Methods to implement**:

```javascript
GoogleAuth.initialize(clientId, redirectUri)
GoogleAuth.signIn()                    // Opens Google login popup
GoogleAuth.signOut()                   // Clears token, closes session
GoogleAuth.getAccessToken()            // Returns token from sessionStorage
GoogleAuth.isAuthenticated()           // Returns boolean
GoogleAuth.getUser()                   // Returns { email, name }
GoogleAuth.onTokenExpire(callback)     // Handles token refresh
```

**Session Storage Keys**:
- `gm_access_token` — OAuth access token
- `gm_user_email` — User's email
- `gm_token_expires` — Token expiry timestamp (ms)

**Error Handling**:
- If user cancels login: resolve to `null` (don't throw)
- If token expires: auto-refresh or trigger re-auth
- Log all errors to `[AUTH]` prefix

**Notes**:
- Use `sessionStorage` only (cleared on browser close)
- Never use `localStorage` for tokens
- Implement token expiry check before API calls
- Google sign-out should clear all stored data

### Task 1.2: Handle PKCE Flow (Authorization Code)

**Context**: PKCE (Proof Key for Code Exchange) is how OAuth 2.0 works in browsers without backend.

**Implementation Details**:

1. Generate `code_verifier` (43-128 char random string)
2. Hash it to `code_challenge` (SHA-256)
3. Send user to Google auth endpoint with `code_challenge`
4. User grants permission
5. Google redirects back with authorization `code`
6. Exchange `code` + `code_verifier` for access token
7. Store token in `sessionStorage`

**Library**: Use `google-gsi` (Google Identity Services)
- Already available via CDN: `https://accounts.google.com/gsi/client`
- Handles PKCE automatically
- Simpler to use than raw OAuth

**Code Flow**:
```javascript
// In googleAuth.js
function generatePKCEPair() {
  // Generate random code_verifier
  // SHA-256 hash to code_challenge
  // Return { verifier, challenge }
}

async function exchangeCodeForToken(code, codeVerifier) {
  // POST to Google token endpoint
  // Return access token
}
```

**Testing**:
- Mock `sessionStorage`
- Mock Google gsi library
- Test token generation/storage
- Test error cases (network, user cancel)

### Task 1.3: Implement Token Refresh & Expiry

**Requirement**: Access tokens expire in ~1 hour. Handle gracefully.

**Implementation**:
1. Store token `expires_at` timestamp when token received
2. Before API calls: check if `Date.now() > expires_at`
3. If expired: trigger refresh flow
4. If refresh fails: sign out and require re-auth

**Methods**:
```javascript
GoogleAuth.isTokenExpired()
GoogleAuth.refreshToken()
GoogleAuth.onTokenExpire(callback)  // Register handler
```

**Edge Case**: If user's Google session has ended, refresh will fail. Show "Please sign in again" message.

### Task 1.4: Create Unit Tests for Auth

**File**: `test/auth/googleAuth.test.mjs`

**Test Cases**:

```
✓ signIn() opens Google popup
✓ On successful auth, token stored in sessionStorage
✓ isAuthenticated() returns true after sign-in
✓ isAuthenticated() returns false before sign-in
✓ getAccessToken() returns token string
✓ getUser() returns { email, name }
✓ Token expiry is calculated correctly
✓ signOut() clears sessionStorage
✓ isTokenExpired() returns true for expired token
✓ refreshToken() updates token before expiry
✓ On network error, gracefully handle (don't crash)
✓ On user cancel, resolve to null (not throw)
✓ Multiple sign-in calls don't create duplicate popups
```

**Mocking**:
- Mock global `google` object (from gis library)
- Mock `sessionStorage`
- Mock `fetch` for token endpoint

---

## Phase 2: Google Sheets API Service

**Objective**: Wrapper for Google Sheets API operations (check collaborators, upload data).

**Duration**: ~10-12 hours  
**Context Required**: Medium (Google Sheets API, HTTP requests)  
**Files Created**: `js/services/sheetsApiService.js`, `test/services/sheetsApiService.test.mjs`

### Task 2.1: Create Sheets API Service Structure

**File**: `js/services/sheetsApiService.js`

**Methods to export**:

```javascript
SheetsAPI.initialize(accessToken)              // Set auth token
SheetsAPI.getSpreadsheetMetadata(sheetId)      // Get sheet info + collaborators
SheetsAPI.checkIfCollaborator(sheetId, email)  // Boolean
SheetsAPI.getSheetValues(sheetId, range)       // Fetch cell values
SheetsAPI.appendRows(sheetId, values)          // Add rows to sheet
SheetsAPI.updateRows(sheetId, values)          // Update existing rows
SheetsAPI.uploadCSV(sheetId, csvData)          // Replace entire sheet data
```

**Dependencies**:
- `GoogleAuth` module (to get access token)
- Standard `fetch` API (no external library)

**Base Endpoint**: `https://sheets.googleapis.com/v4/spreadsheets`

**Required OAuth Scope**: `https://www.googleapis.com/auth/spreadsheets`

**Error Handling**:
- Log all HTTP errors with request details
- Return `{ success: false, error: "message" }` for failures
- Throw on authentication errors (token expired, unauthorized)
- Network timeouts: implement 30-second timeout

### Task 2.2: Extract Sheet ID from CSV URL

**Context**: Current profiles store CSV export URLs. Need to extract sheet ID.

**Sheet URL Patterns**:
```
CSV export URL: https://docs.google.com/spreadsheets/d/ABC123XYZ/gviz/tq?tqx=out:csv
Sheet ID:       ABC123XYZ (extract from /d/.../)

Normal sheet URL: https://docs.google.com/spreadsheets/d/ABC123XYZ/edit#gid=0
Sheet ID:        ABC123XYZ (same extraction)
```

**Function**:
```javascript
function extractSheetIdFromUrl(csvUrl) {
  // return sheet ID string, or null if invalid
}
```

**Validation**:
- Ensure URL contains `docs.google.com/spreadsheets/d/`
- Ensure ID is alphanumeric (no special chars)
- Return `null` for invalid URLs

### Task 2.3: Implement `getSpreadsheetMetadata()`

**API Call**: `GET /v4/spreadsheets/{sheetId}`

**Returns**:
```json
{
  "spreadsheetId": "ABC123XYZ",
  "properties": {
    "title": "Sacrament Program",
    "locale": "en_US",
    ...
  }
}
```

**Additional**: Fetch collaborators via Drive API (optional advanced feature; for now, assume we can determine from spreadsheet.properties)

**Note**: Google Sheets API's `spreadsheets.get()` requires the user to have at least Viewer access. Request with `fields=spreadsheetId,properties` to minimize response size.

### Task 2.4: Implement `checkIfCollaborator()`

**Logic**:
1. Call `getSpreadsheetMetadata(sheetId)`
2. Check `spreadsheetProperties` for owner/editors
3. Compare `GoogleAuth.getUser().email` to collaborators list
4. Return `true` if match, `false` otherwise

**Edge Cases**:
- User email might have different case (do case-insensitive compare)
- If metadata doesn't contain collaborators, conservative approach: `return false` (deny access)
- If API call fails: `throw` error (don't silently deny)

**Alternative** (if Google Sheets API doesn't provide collaborators easily):
- Could use Drive API's `permissions` endpoint
- For now, assume metadata provides this info; adjust if not available

### Task 2.5: Implement CSV Upload/Append

**Historical Context**: App currently uses public CSV export URLs (read-only).

**New Requirement**: Upload modified CSV back to Sheet.

**Two Approaches**:

**Option A: Append Rows** (Simpler)
- API: `POST /v4/spreadsheets/{sheetId}/values:append`
- Each edited row sent as new row
- Pro: Simple, no row-by-row tracking
- Con: Duplicates sheet data if not careful

**Option B: Clear & Replace** (Safer)
- API: `POST /v4/spreadsheets/{sheetId}/values:batchUpdate`
- Clear all data, write new CSV
- Pro: Guaranteed consistent state
- Con: All-or-nothing (can't recover if network fails mid-upload)

**Decision**: Use **Option B** (Clear & Replace) with validation

**Implementation**:

```javascript
async function uploadCSV(sheetId, csvData) {
  // 1. Validate csvData format (check headers, etc.)
  // 2. Parse CSV into 2D array (rows + columns)
  // 3. Call Sheets API:
  //    - DELETE all rows from Sheet1
  //    - APPEND new CSV data
  // 4. Return { success, sheetId, rowsWritten }
}
```

**API Call**:
```
POST /v4/spreadsheets/{sheetId}/values/Sheet1:clear
POST /v4/spreadsheets/{sheetId}/values/Sheet1:append
  Body: { values: [ ["key", "en", "es", "fr", "swa"], [...], [...] ] }
```

**Error Recovery**:
- If clear succeeds but append fails: sheet is empty (bad)
- Mitigation: Check sheet before upload, warn user
- Alternative: Use local backup copy for recovery

### Task 2.6: Create Unit Tests for Sheets API Service

**File**: `test/services/sheetsApiService.test.mjs`

**Test Cases**:

```
✓ extractSheetIdFromUrl() extracts ID correctly
✓ extractSheetIdFromUrl() rejects invalid URLs
✓ getSpreadsheetMetadata() makes correct API call
✓ getSpreadsheetMetadata() parses response
✓ checkIfCollaborator() returns true for collaborators
✓ checkIfCollaborator() returns false for non-collaborators
✓ checkIfCollaborator() is case-insensitive for email
✓ uploadCSV() calls clear then append
✓ uploadCSV() throws on validation error
✓ uploadCSV() returns row count
✓ On 401 Unauthorized: throw auth error
✓ On 403 Forbidden: throw permission error
✓ On network timeout: throw with timeout message
✓ On invalid CSV: return validation error
```

**Mocking**:
- Mock `fetch` for all API calls
- Mock `GoogleAuth.getAccessToken()`
- Mock `GoogleAuth.getUser()`

---

## Phase 3: Editor State Manager

**Objective**: In-memory state management for edited CSV data with IndexedDB persistence.

**Duration**: ~10-12 hours  
**Context Required**: Medium (IndexedDB, CSV parsing, state management)  
**Files Created**: `js/data/EditorStateManager.js`, `test/data/EditorStateManager.test.mjs`

### Task 3.1: Create EditorStateManager Structure

**File**: `js/data/EditorStateManager.js`

**Purpose**: Hold edited CSV data in memory, track changes, persist to IndexedDB.

**Internal Data Structure**:

```javascript
// Parsed CSV stored as:
{
  headers: ["key", "en", "es", "fr", "swa"],
  rows: {
    "unitName": {
      en: "Your Ward Name",
      es: "Nombre de Su Rama",
      fr: "Nom de Votre Branche",
      swa: "Jina la Kimanda Yako"
    },
    "speaker1": {
      en: "John Smith",
      es: "", // Empty = fallback to English
      fr: "",
      swa: ""
    },
    // ... more rows
  },
  // Track which fields have unsaved changes
  unsavedChanges: {
    "unitName": { en: true, es: false, fr: false, swa: false },
    "speaker1": { en: false, es: true, fr: false, swa: false },
  },
  // Metadata
  sheetId: "ABC123XYZ",
  createdAt: Date.now(),
  lastModified: Date.now()
}
```

**Class Methods**:

```javascript
class EditorStateManager {
  constructor(sheetId) {
    this.sheetId = sheetId;
    this.state = { /* as above */ };
  }

  async loadFromSheet(csvUrl) {
    // Fetch current CSV from sheet
    // Parse it into state.rows
    // Save to IndexedDB
  }

  getValue(key, language = "en") {
    // Return value for key + language
    // Fallback to English if empty
  }

  setValue(key, language, value) {
    // Update value, mark as changed
    // Don't save to DB yet (only on explicit save)
  }

  addRow(key, values = {}) {
    // Add new key with optional values
    // Mark as new/unsaved
  }

  deleteRow(key) {
    // Mark row for deletion
  }

  getUnsavedCount() {
    // Return number of changed fields
  }

  getChangedRows() {
    // Return only rows with unsaved changes
  }

  async validate() {
    // Check CSV structure, keys, hymn format
    // Return { valid: boolean, errors: [] }
  }

  toCSV() {
    // Generate CSV string ready for upload
    // Includes validation
  }

  async saveChanges(csvData) {
    // Save edited state to IndexedDB for session persistence
  }

  async discardChanges() {
    // Clear unsaved state, reload from sheet
  }

  async clear() {
    // Delete all editor data from IndexedDB
  }

  static async resume(sheetId) {
    // Check if previous session exists
    // Return EditorStateManager instance or null
  }
}
```

### Task 3.2: Implement CSV Parsing & Validation

**Requirement**: Parse Google Sheet CSV into structured data.

**CSV Format**:
```
key,en,es,fr,swa
unitName,Your Ward,Su Rama,Votre Branche,Kimanda Yako
speaker1,John Smith,Juan Garcia,Jean Dupont,Yohana Mto
openingHymn,62
CS 2,Accompaniment by Sister Smith
```

**Parsing Logic**:
1. Use existing `parseCSV()` from `js/utils/csv.js` as reference
2. Detect CSV format: simple (key, value) vs. multi-lang (key, en, es, fr, swa)
3. Extract headers row
4. Parse data rows into dictionary structure
5. Normalize language values (trim whitespace, handle quotes)

**Validation Rules** (Task 3.3):
1. **Required headers**: Must have "key" column
2. **Language columns**: "en", "es", "fr", "swa" (if multi-lang format)
3. **No duplicate keys**: Each key appears only once
4. **Hymn format**: If key ends with "Hymn":
   - Value must be number (e.g., `62`, `1001`)
   - OR `CS` + space + number + optional letter (e.g., `CS 2`, `CS 73a`)
5. **Required fields**: "key" must be non-empty, "en" must be non-empty (unless fallback)
6. **No XSS payload**: Sanitize values (reuse `sanitizeEntry()` from `js/sanitize.js`)

**Error Messages**:
```javascript
{
  errors: [
    { row: 2, column: "opening Hymn", message: "Invalid hymn format: must be number or CS{space}number" },
    { row: 5, column: "key", message: "Duplicate key: 'speaker1' already defined at row 3" },
    { row: "header", column: "es", message: "Missing required language column" }
  ]
}
```

### Task 3.3: Implement Hymn Format Validation

**Context**: Hymn fields can have special format:
- Regular: `62` (hymn number)
- Children's: `CS 2` (with space, can have letter like `CS 73a`)
- With note: `62|Sung by Primary` (pipe-separated annotation)

**Validation Function**:

```javascript
function validateHymnValue(value) {
  if (!value) return { valid: false, error: "Hymn value cannot be empty" };
  
  // Split on pipe to get hymn part
  const [hymnPart] = value.split("|");
  const hymn = hymnPart.trim();
  
  // Pattern: number OR "CS {number}{optional letter}"
  const hymnRegex = /^(\d{1,4}|CS [0-9]{1,4}[a-z]?)$/i;
  
  if (!hymnRegex.test(hymn)) {
    return {
      valid: false,
      error: `Invalid hymn: ${hymn}. Use format: "62" or "CS 2" or "CS 73a", optionally with "|Note"`
    };
  }
  
  return { valid: true };
}
```

**Hymn Lookup** (Optional Enhancement):
- Reference `js/data/hymnsLookup.js` to validate hymn numbers exist
- For now: just validate format (not whether hymn exists)
- Can add lookup validation in Phase 4

### Task 3.4: Implement IndexedDB Persistence

**Context**: Store editor state so user can reload page and resume editing.

**IndexedDB Store**: `editor._state`

**Schema**:
```javascript
// In js/data/db.js (existing Dexie setup)
// Add new store:
editor_state: "sheetId, createdAt" // Compound key
```

**Stored Data**:
```javascript
{
  id: "auto-generated",
  sheetId: "ABC123XYZ",
  createdAt: Date.now(),
  lastModified: Date.now(),
  expiresAt: createdAt + (24 * 60 * 60 * 1000), // 24h session
  state: { /* EditorStateManager.state */ },
  csvUrl: "https://docs.google.com/..."
}
```

**Methods**:

```javascript
async function saveSessionState(sheetId, state, csvUrl) {
  // Store to IndexedDB
  // Return saved object with ID
}

async function getSessionState(sheetId) {
  // Fetch from IndexedDB
  // Check if expired (24h)
  // Return state or null
}

async function deleteSessionState(sheetId) {
  // Remove from IndexedDB
}

async function resumeSession(sheetId) {
  // Check if session exists
  // Ask user: "Resume editing? X changes pending"
  // Return EditorStateManager with restored state or null
}
```

**Expiry Policy**: Sessions expire after 24 hours (paranoid safety).

### Task 3.5: Implement toCSV() & String Generation

**Requirement**: Convert in-memory state back to CSV string format suitable for upload.

**Function**:

```javascript
toCSV() {
  // 1. Build header: "key,en,es,fr,swa"
  // 2. For each row, quote fields with commas/newlines
  // 3. Handle fallback: if language cell empty, use English value
  // 4. Return as string ready for Sheets API
}

// Example output:
// key,en,es,fr,swa
// unitName,Your Ward,Su Rama,Votre Branche,Kimanda Yako
// speaker1,"Smith, John","García, Juan","Dupont, Jean","Mtu, Yohana"
// openingHymn,62
//
```

**CSV Quoting Rules**:
- Quote fields containing: comma, newline, quotes
- Escape quotes: `"` → `""`
- Leave other fields unquoted

**Reference**: Use logic from `js/utils/csv.js` as template.

### Task 3.6: Create Unit Tests

**File**: `test/data/EditorStateManager.test.mjs`

**Test Cases**:

```
✓ loadFromSheet() fetches and parses CSV correctly
✓ loadFromSheet() handles multi-language format
✓ loadFromSheet() handles simple key-value format
✓ getValue() returns correct value
✓ getValue() falls back to English if language empty
✓ setValue() updates value and marks unsaved
✓ addRow() adds new key with empty values
✓ deleteRow() marks row for deletion
✓ getUnsavedCount() returns correct count
✓ getChangedRows() returns only unsaved rows
✓ validate() rejects duplicate keys
✓ validate() rejects invalid hymn format
✓ validate() rejects duplicate hymn with "CS" prefix
✓ validate() catches empty key
✓ toCSV() generates valid CSV string
✓ toCSV() quotes fields with commas
✓ toCSV() includes all languages
✓ saveChanges() stores to IndexedDB
✓ resumeSession() restores previous state
✓ discardChanges() clears unsaved state
✓ Session expires after 24 hours
```

**Mocking**:
- Mock `fetch` for CSV download
- Mock IndexedDB via `fake-indexeddb`
- Mock `sanitizeEntry()`

---

## Phase 4: Editor UI Component

**Objective**: React-like component for editor form (scrollable list, key selector, language pills, input field).

**Duration**: ~12-14 hours  
**Context Required**: Medium-High (DOM manipulation, event handling, Bootstrap 5)  
**Files Created**: `js/components/SheetEditor.mjs`, `test/components/SheetEditor.test.mjs`

### Task 4.1: Design UI Structure & Components

**HTML Structure** (will be rendered by JavaScript):

```html
<div id="editor-main">
  <!-- Authentication Section -->
  <div id="auth-section">
    <button id="signin-btn" class="btn btn-primary">Sign in with Google</button>
  </div>

  <!-- Editor Section (hidden until auth) -->
  <div id="editor-section" style="display: none;">
    <!-- User Info -->
    <div class="editor-header">
      <span class="user-email">Logged in as: user@gmail.com</span>
      <button id="signout-btn" class="btn btn-sm btn-secondary">Sign out</button>
    </div>

    <!-- Key Selector & Language -->
    <div class="editor-controls">
      <div class="form-group">
        <label for="key-select">Key:</label>
        <select id="key-select" class="form-control">
          <option value="">-- Select a key --</option>
          <option value="unitName">unitName</option>
          <option value="speaker1">speaker1</option>
          <!-- ... all keys ... -->
        </select>
      </div>

      <!-- Language Pills (Bootstrap 5 buttons) -->
      <div class="language-buttons mt-3">
        <label>Language:</label>
        <div class="btn-group" role="group">
          <input type="radio" class="btn-check" name="language" id="lang-en" value="en" checked>
          <label class="btn btn-outline-primary" for="lang-en">English</label>
          
          <input type="radio" class="btn-check" name="language" id="lang-es" value="es">
          <label class="btn btn-outline-primary" for="lang-es">Español</label>
          
          <input type="radio" class="btn-check" name="language" id="lang-fr" value="fr">
          <label class="btn btn-outline-primary" for="lang-fr">Français</label>
          
          <input type="radio" class="btn-check" name="language" id="lang-swa" value="swa">
          <label class="btn btn-outline-primary" for="lang-swa">Kiswahili</label>
        </div>
      </div>
    </div>

    <!-- Value Input -->
    <div class="form-group mt-4">
      <label for="value-input">Value:</label>
      <textarea id="value-input" class="form-control" rows="4" placeholder="Enter value..."></textarea>
      
      <!-- Hymn Checkbox (shown for *Hymn keys) -->
      <div id="hymn-options" class="mt-2" style="display: none;">
        <div class="form-check">
          <input type="checkbox" class="form-check-input" id="hymn-children" value="children">
          <label class="form-check-label" for="hymn-children">
            Children's Song (prepends "CS ")
          </label>
        </div>
      </div>
    </div>

    <!-- Unsaved Indicator -->
    <div id="unsaved-indicator" class="alert alert-warning mt-3" style="display: none;">
      <strong>⚠ Unsaved Changes:</strong> <span id="unsaved-count">0</span> fields modified
    </div>

    <!-- Action Buttons -->
    <div class="editor-actions mt-4">
      <button id="add-row-btn" class="btn btn-success">➕ Add New Field</button>
      <button id="save-btn" class="btn btn-primary">✓ Save Changes</button>
      <button id="discard-btn" class="btn btn-secondary">Clear Changes</button>
    </div>
  </div>

  <!-- Viewer-Only Section -->
  <div id="viewer-only-section" style="display: none;">
    <div class="alert alert-info">
      <h4>Viewer</h4>
      <p>You don't have permission to edit this sheet. Only collaborators can edit.</p>
    </div>
  </div>
</div>
```

### Task 4.2: Create SheetEditor Component Class

**File**: `js/components/SheetEditor.mjs`

**Class Structure**:

```javascript
export class SheetEditor {
  constructor(containerSelector, editorStateManager, options = {}) {
    this.container = document.querySelector(containerSelector);
    this.stateManager = editorStateManager;
    this.currentKey = null;
    this.currentLanguage = "en";
    this.isEditing = false;
    
    this.options = {
      onSave: null,    // Callback when Save clicked
      onAddRow: null,  // Callback when Add Row clicked
      ...options
    };
    
    this.eventHandlers = {};
  }

  async render() {
    // Build HTML structure above
    // Attach event listeners
    // Load keys into dropdown
  }

  on(eventName, callback) {
    // event.addListener pattern
    // Supported events: 'value-changed', 'key-selected', 'language-changed', 'save', 'add-row'
  }

  setValue(key, language, value) {
    // Update input field to show value
    // Update unsaved indicator
  }

  setKey(key) {
    // Change which key is being edited
    // Update select dropdown
    // Load value for new key
    // Show/hide hymn checkbox
  }

  setLanguage(language) {
    // Change selected language
    // Load value for new language
  }

  updateKeyList(keys) {
    // Refresh dropdown with new keys (after adding row)
  }

  showUnsavedIndicator(count) {
    // Show/hide and update count
  }

  setLoading(isLoading) {
    // Disable buttons while saving
    // Show spinner
  }

  showError(message) {
    // Toast/alert with error message
  }

  showSuccess(message) {
    // Toast/alert with success message
  }

  destroy() {
    // Clean up event listeners
  }
}
```

### Task 4.3: Implement Event Handlers & DOM Updates

**Event Handlers to Attach**:

1. **Key Selection** (`#key-select` change)
   - Emit `key-selected` event with new key
   - Load value from EditorStateManager
   - Show/hide hymn options
   - Update language pills

2. **Language Selection** (radio buttons)
   - Emit `language-changed` event
   - Load value for selected language from EditorStateManager
   - Update input field

3. **Value Input Change** (`#value-input` input)
   - Emit `value-changed` { key, language, value } event
   - Update EditorStateManager
   - Mark as unsaved
   - Show unsaved indicator

4. **Hymn Children's Checkbox** (`#hymn-children` change)
   - If checked: prepend "CS " to value
   - If unchecked: remove "CS " prefix
   - Emit `value-changed` event

5. **Add Row Button** (`#add-row-btn` click)
   - Emit `add-row` event
   - Prompt user for new key name
   - Validate key doesn't exist
   - Add to EditorStateManager
   - Refresh key dropdown
   - Select new key

6. **Save Button** (`#save-btn` click)
   - Emit `save` event with all changes
   - Disable buttons, show loading
   - Wait for parent to validate & upload
   - On success: clear unsaved indicator

7. **Discard Button** (`#discard-btn` click)
   - Ask for confirmation
   - Clear all unsaved changes
   - Reload values from EditorStateManager
   - Hide unsaved indicator

### Task 4.4: Implement Hymn Field Logic

**Hymn Detection**: If key ends with "Hymn" (case-insensitive):
- Show checkbox: "Children's Song (prepends 'CS ')"
- When checkbox checked: ensure value starts with "CS "
- When checkbox unchecked: remove "CS " prefix

**Examples**:
- User enters "2" + checks "Children's Song" → value becomes "CS 2"
- User enters "CS 2" + unchecks box → value becomes "2"
- User enters "CS 73a" + can check/uncheck
- If user manually types "CS 2": checkbox auto-checks

**Special Case**: Hymn value might include note (pipe-separated):
- "62|Sung by choir" → can edit "62" part, keep "|Sung by choir"
- Children's logic applies to hymn number part only

### Task 4.5: Implement Unsaved Indicator

**Requirements**:
- Show alert box when any field modified
- Display count of unsaved fields
- Update in real-time
- Update on Add Row
- Clear on Save or Discard

**HTML**:
```html
<div id="unsaved-indicator" class="alert alert-warning" style="display: none;">
  <strong>⚠ Unsaved Changes:</strong> <span id="unsaved-count">0</span> fields modified
</div>
```

**Logic**:
1. EditorStateManager tracks unsavedChanges
2. SheetEditor calls `stateManager.getUnsavedCount()`
3. Update DOM to show/hide indicator
4. Listen for `value-changed` events to update count

### Task 4.6: Style with Bootstrap 5

**CSS Considerations**:
- Use Bootstrap 5 CDN in `editor.html`
- Language pills: use Bootstrap btn-group + btn-check pattern
- Form layout: use form-control, form-group classes
- Validation messages: use alert classes
- Loading state: disable buttons, show spinner

**Custom CSS** (minimal):
```css
#editor-main {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid #ccc;
}

.language-buttons .btn-group {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

#value-input {
  min-height: 100px;
}

.editor-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
```

### Task 4.7: Create Unit Tests

**File**: `test/components/SheetEditor.test.mjs`

**Test Approach**: Test DOM updates and event emissions (mock DOM elements)

**Test Cases**:

```
✓ render() creates HTML structure
✓ render() populates key dropdown
✓ Key selection updates shown value
✓ Language selection changes input field
✓ Value input emits 'value-changed' event
✓ Unsaved indicator shows on value change
✓ Unsaved count increases/decreases
✓ Add Row button opens dialog for key name
✓ Add Row validates key doesn't exist
✓ Hymn-related keys show children's checkbox
✓ Hymn checkbox checked: prepends "CS "
✓ Hymn checkbox unchecked: removes "CS "
✓ Save button emits 'save' event
✓ Save button disables during save
✓ Discard button asks for confirmation
✓ Discard button clears unsaved state
✓ Error message displays toast
✓ Success message displays toast
✓ destroy() cleans up event listeners
✓ Multiple language changes tracked
✓ Pipe-separated notes preserved in hymn values
```

**Mocking**:
- Mock DOM elements using jsdom
- Mock EditorStateManager methods
- Mock window.alert/confirm
- Test event emissions via custom event listeners

---

## Phase 5: Editor Page & Navigation

**Objective**: Create `editor.html` page and integrate OAuth + Editor UI. Add navigation from main app.

**Duration**: ~10-12 hours  
**Context Required**: Medium (HTML structure, OAuth flow, navigation)  
**Files Created**: `editor.html`, `js/editor.js`, `test/editor.test.mjs`

### Task 5.1: Create editor.html Page

**File**: `editor.html`

**Structure**: Mirror `index.html` but with editor-specific content

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="Meeting Program CMS - Edit Sheet Data">
  <title>Edit Meeting Program</title>
  
  <!-- Bootstrap 5 CSS -->
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
  
  <!-- App CSS -->
  <link rel="stylesheet" href="css/styles.css">
  
  <!-- Service
```

