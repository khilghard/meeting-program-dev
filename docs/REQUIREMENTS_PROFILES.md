# Profile Management Requirements

## Overview

Profiles store Google Sheets URLs and unit information. Users can have multiple profiles (e.g., home ward, visiting) and switch between them.

---

## Architecture

### Storage

- **Primary**: IndexedDB (`MeetingProgramDB` - `profiles` object store)
- **Legacy**: localStorage (migration only)

### Profile Structure

```javascript
{
  id: string,           // Unique ID (timestamp + random)
  url: string,          // Google Sheets URL
  unitName: string,     // Unit name (e.g., "Oakland 1st Ward")
  stakeName: string,   // Stake name (e.g., "Oakland California Stake")
  lastUsed: number,    // Unix timestamp
  inactive: boolean,    // Soft-deleted flag
  inactiveAt: number,  // When marked inactive
}
```

---

## Profile Operations

### Add Profile

- Validate URL is Google Sheets format
- Check for existing profile with same URL → update instead of create
- Set as active profile after creation
- Store in IndexedDB

### Select Profile

- Mark profile as "lastUsed" timestamp
- Store selected ID in IndexedDB metadata

### Remove Profile (Soft Delete)

- Mark as `inactive = true`
- Set `inactiveAt` timestamp
- Cannot delete the last remaining active profile
- If deleting active profile, switch to another active profile

### Reactivate Profile

- Set `inactive = false`
- Remove `inactiveAt`
- Auto-select after reactivation

---

## Data Flow

### First Launch (New User)

```
1. User scans QR or enters URL
2. App creates profile from URL
3. Profile saved to IndexedDB
4. Profile auto-selected
5. Program loads from Google Sheets
```

### Returning User

```
1. App initializes IndexedDB
2. App migrates legacy localStorage profiles (one-time)
3. App loads profiles from IndexedDB
4. App loads last-selected profile
5. Program loads from profile URL
```

### URL Parameter Override

```
1. User visits site with ?url= parameter
2. App checks for existing profile with that URL
3. If found → select that profile
4. If not found → create new profile
5. URL parameter takes priority over saved profile
```

---

## Legacy Migration

- One-time migration from localStorage to IndexedDB
- Migration runs on first launch
- Deletes legacy localStorage after successful migration

---

## Edge Cases

| Case                      | Behavior                                  |
| ------------------------- | ----------------------------------------- |
| Invalid Google Sheets URL | Reject with error message                 |
| Duplicate URL             | Update existing profile, don't create new |
| No profiles exist         | Show "add profile" flow                   |
| All profiles inactive     | Show "add profile" flow                   |
| Delete active profile     | Switch to next available profile          |
| Network fails             | Load from localStorage cache if available |

---

## Non-Requirements

- Profile editing (re-create required)
- Profile export/import
- Profile sorting/renaming
