# Archive Process Requirements

## Overview

The archive system allows users to view historical meeting programs without affecting their current program. Archives are stored per-profile and isolated between profiles.

---

## Architecture

### Two-Page Model

| Page           | Purpose                                                             |
| -------------- | ------------------------------------------------------------------- |
| `index.html`   | Main program view - shows current/live program                      |
| `archive.html` | Archive view - shows list of archived programs for selected profile |

**IMPORTANT**: Archive viewing MUST NOT be done in a modal on index.html. All archive interactions happen via archive.html.

---

## Data Model

### Profile Structure

```javascript
{
  id: string,           // Unique profile ID
  url: string,          // Current program Google Sheets URL
  unitName: string,     // Unit name
  stakeName: string,    // Stake name
  lastUsed: number,    // Timestamp of last use
  archived: boolean,   // Is this profile viewing an archive?
  currentDate: string,  // Current program date (YYYY-MM-DD)
}
```

### Archive Structure

```javascript
{
  id: string,           // Generated: {profileId}-{programDate}
  profileId: string,    // Foreign key to profile
  programDate: string,  // Date of archived program (YYYY-MM-DD)
  csvData: Array,       // Raw program data
  unitName: string,    // Unit name at time of archive
  unitAddress: string,  // Unit address at time of archive
  cachedAt: number,    // Timestamp when archived
}
```

---

## Archive Storage Rules

### Rule 1: Archive by Date

- Programs are archived BY DATE within a profile
- Each profile can have ONE archive entry per unique date
- Current program date = archive for that same date

### Rule 2: Current Overwrites Archive (Same Date)

- When loading a program with date X, it overwrites any existing archive for date X
- This ensures the archive always matches what's currently live for that date

### Rule 3: Archives Don't Change After Date Passes

- Once a date has passed, the archive for that date is FINAL
- Loading a program with a NEW date does NOT affect archives from previous dates

### Rule 4: Profile Isolation

- Each profile has its own set of archives
- Profile A CANNOT view Profile B's archives
- Archives are filtered by profileId in all queries

---

## User Flows

### Flow 1: View Archives from Main Page

```
1. User on index.html (current program)
2. User clicks "View Archives" button
3. Navigate to archive.html
4. archive.html loads with profile's archive list
5. User selects an archive to view
6. User clicks "Return to Home" to go back to index.html
```

### Flow 2: Archive is Auto-Created

```
1. User loads a program (via URL or QR)
2. App extracts program date from data
3. App auto-archives the program data with:
   - profileId
   - programDate (extracted from CSV)
   - csvData (full program)
   - unitName
   - unitAddress
   - cachedAt (timestamp)
4. If archive for that date exists, it is OVERWRITTEN with new data
```

### Flow 3: View Specific Archive

```
1. User navigates to archive.html
2. App loads current profile's archives
3. User sees list sorted by date (newest first)
4. User clicks on archive entry
5. Archive data is rendered in the page
6. Page shows "Return to Home" button
```

---

## UI Requirements

### index.html

| Element                 | Behavior                                              |
| ----------------------- | ----------------------------------------------------- |
| "View Archives" button  | Navigates to archive.html                             |
| Current program display | Shows live/current program only                       |
| Archive indicator       | NONE - no indicator on index.html that archives exist |

### archive.html

| Element                 | Behavior                                                |
| ----------------------- | ------------------------------------------------------- |
| Archive list            | Shows all archives for current profile                  |
| Archive entry           | Click to view that archive's program                    |
| "Return to Home" button | Navigates back to index.html                            |
| No archives message     | Shown when profile has no archives                      |
| Profile selector        | Dropdown to switch between profiles (if multiple exist) |

---

## Technical Requirements

### IndexedDB Storage

- Database name: `MeetingProgramDB`
- Object stores:
  - `profiles` - Profile records
  - `archives` - Archive records (indexed by profileId + programDate)

### Archive Queries

```javascript
// Get all archives for a profile (sorted by date desc)
getProfileArchives(profileId);

// Get specific archive by date
getArchive(profileId, programDate);

// Save/update archive
saveArchive(archive); // Overwrites if exists for same profile+date

// Delete archive
deleteArchive(profileId, programDate);
```

### Auto-Archive Trigger

- Auto-archive happens on EVERY program load
- Triggered in main.js after successful program parse
- Uses `ArchiveManager.autoArchive()`

---

## Edge Cases

| Case                     | Behavior                            |
| ------------------------ | ----------------------------------- |
| No archives for profile  | Show "No archived programs" message |
| Profile deleted          | All associated archives are deleted |
| Same date re-loaded      | Archive is updated with new data    |
| Network fails, use cache | Cache data is archived              |
| Invalid program date     | Program is NOT archived             |

---

## Non-Requirements (Out of Scope)

- Manual archive creation (auto-archive only)
- Archive editing
- Archive sharing
- Cross-profile archive viewing
- archive.html modal for preview (use full page)

---

## Implementation Checklist

- [ ] Remove modal-based archive viewing from index.html
- [ ] Implement archive.html page
- [ ] Add "View Archives" navigation button on index.html
- [ ] Add "Return to Home" button on archive.html
- [ ] Implement auto-archive on program load
- [ ] Implement archive list display on archive.html
- [ ] Implement archive viewing on archive.html
- [ ] Ensure profile isolation in archive queries
- [ ] Ensure date-based archive overwrite logic
- [ ] Update tests to match new archive flow
