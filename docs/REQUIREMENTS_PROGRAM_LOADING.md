# Program Loading Requirements

## Overview

The program loading flow handles fetching, parsing, and displaying meeting programs from Google Sheets.

---

## Loading Triggers

### 1. URL Parameter

```
https://site.com/?url=https://docs.google.com/spreadsheets/d/...
```

Priority: Highest - takes precedence over saved profile

### 2. Saved Profile

If no URL parameter, load from currently selected profile's URL

### 3. Legacy localStorage

Check `localStorage.sheetUrl` as fallback for migration

---

## Data Flow

### Step 1: URL Detection

```
URL param (?url=) → Check for Google Sheets URL
    ↓
No param → Check selected profile
    ↓
No profile → Check legacy localStorage
    ↓
Nothing → Show "scan QR" zero state
```

### Step 2: Profile Creation/Selection

- If URL matches existing profile → select that profile
- If URL is new → create new profile → auto-select

### Step 3: Fetch from Google Sheets

- Append `/gviz/tq?tqx=out:csv` if not present
- Fetch with network request

### Step 4: Parse CSV

- Parse response as CSV
- Apply sanitization (XSS protection)
- Extract program date
- Extract unit name/stake from data

### Step 5: Render

- Clear existing program
- Render sanitized program data
- Update UI with unit name, date

### Step 6: Cache & Archive

- Store in localStorage cache
- Auto-archive if valid date exists

---

## Caching Strategy

### Service Worker Cache

- **Type**: Dynamic cache (in-memory + disk)
- **Expiration**: 24 hours for Google Sheets responses
- **Offline fallback**: Serve stale cache if expired but offline

### Reload Button

- Appends `?t={timestamp}&force=true` to bypass cache
- Forces fresh fetch from Google Sheets

### localStorage Cache

- Key: `programCache`
- Used for offline fallback
- Updated on every successful load

---

## Sanitization

All program data is sanitized before rendering:

### Allowed Keys

```
unitName, unitAddress, link, date, presiding, conducting,
musicDirector, musicOrganist, horizontalLine, openingHymn,
openingPrayer, sacramentHymn, intermediateHymn, closingHymn,
closingPrayer, hymn, speaker, leader, generalStatementWithLink,
generalStatement, linkWithSpace, stakeName
```

### Allowed Values

- Unicode letters, numbers, punctuation, spaces
- `<LINK>` and `<IMG>` placeholders
- `~` replaced with `,` in output

### Blocked

- `<script>` tags (any case)
- `<style>` tags
- Any other HTML tags
- Unknown keys

---

## Edge Cases

| Case           | Behavior                                    |
| -------------- | ------------------------------------------- |
| Invalid URL    | Show error, stay on current program         |
| Network fails  | Try localStorage cache, show offline banner |
| No cache       | Show "Unable to load" error                 |
| Empty response | Show "Unable to load" error                 |
| Parse error    | Show "Unable to load" error                 |
| Archive loaded | Add `archive-view` class to body            |

---

## UI States

### Loading State

- Show "Loading Program..." text
- Hide program content

### Loaded State

- Show program content
- Show unit name, date
- Show reload button

### Error State

- Show error message
- Show "Retry" button
- If cache available, show cached program

### Offline State

- Show offline banner
- Show cached program
- "Try Now" button to retry

---

## Non-Requirements

- Manual URL entry (only QR scan or share link)
- Program editing
- Program printing
