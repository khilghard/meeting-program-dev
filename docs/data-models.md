# Data Models

**Generated:** 2026-05-16  
**Scan Level:** Exhaustive  
**Source:** `js/data/db.js`, `js/data/IndexedDBManager.js`, `js/data/EditorStateManager.js`

---

## Overview

The application uses two separate **Dexie** (IndexedDB) databases:

| Database                                 | Purpose             | Schema Version |
| ---------------------------------------- | ------------------- | -------------- |
| `MeetingProgramDB` (+ deployment suffix) | Main app data       | v5             |
| `meeting_program_editor`                 | CMS editor sessions | v1             |

Storage is scoped per deployment path so that the dev and prod environments do not share data (e.g. `MeetingProgramDB__meeting-program-dev`).

---

## Main Database: `MeetingProgramDB`

### Store: `profiles`

Represents a saved ward/branch program source (Google Sheets URL).

| Field              | Type               | Index      | Description                   |
| ------------------ | ------------------ | ---------- | ----------------------------- |
| `id`               | string (UUID)      | Primary    | Unique profile identifier     |
| `url`              | string             | —          | Google Sheets CSV export URL  |
| `unitName`         | string             | —          | Ward/Branch display name      |
| `stakeName`        | string             | —          | Stake name                    |
| `lastUsed`         | number (timestamp) | —          | Last access timestamp         |
| `inactive`         | boolean            | `inactive` | Soft-delete flag              |
| `agendaUrl`        | string \| null     | —          | Private leadership agenda URL |
| `agendaLastLoaded` | number \| null     | —          | Timestamp last agenda fetch   |
| `agendaValid`      | boolean            | —          | Whether agenda CSV is valid   |

**Schema:** `id, inactive`

---

### Store: `archives`

Stores snapshots of historical meeting programs per profile.

| Field           | Type               | Index                     | Description                          |
| --------------- | ------------------ | ------------------------- | ------------------------------------ | --- | -------------- |
| `id`            | string             | Primary                   | `{profileId}                         |     | {programDate}` |
| `profileId`     | string             | `profileId`               | Foreign key to profiles              |
| `programDate`   | number (timestamp) | `[profileId+programDate]` | Meeting date                         |
| `csvData`       | string             | —                         | Raw CSV text of the program          |
| `checksum`      | string             | —                         | SHA-like hash for integrity checking |
| `agendaCsvData` | string \| null     | —                         | Raw agenda CSV (added v5)            |
| `agendaRows`    | array \| null      | —                         | Parsed agenda rows (added v5)        |

**Schema:** `id, profileId, [profileId+programDate]`  
**Constraints:** Max 10 MB total, max 730 days age, auto-cleanup.

---

### Store: `metadata`

Key-value store for persistent user preferences and app state.

| Key                              | Value                                 | Description                                     |
| -------------------------------- | ------------------------------------- | ----------------------------------------------- |
| `userPreference_theme`           | `"light"` \| `"dark"`                 | UI theme preference                             |
| `userPreference_language`        | `"en"` \| `"es"` \| `"fr"` \| `"swa"` | Language preference                             |
| `siteUrl`                        | string                                | User-configured base URL override               |
| `userPreference_helpShown`       | boolean                               | Whether help modal has been shown               |
| `userPreference_installPrompted` | boolean                               | Whether PWA install was prompted                |
| `app_version`                    | string                                | Last seen app version (for migration detection) |
| `meeting_program_selected_id`    | string                                | Currently selected profile ID                   |

**Schema:** `key` (primary)

---

### Store: `migrations`

Tracks completed data migration operations.

| Field       | Type   | Description          |
| ----------- | ------ | -------------------- |
| `id`        | string | Migration identifier |
| `status`    | string | Completion status    |
| `timestamp` | number | When migration ran   |

**Schema:** `id` (primary)

---

### Store: `history`

Program content snapshots for data loss prevention (added v2).

| Field       | Type               | Index       | Description             |
| ----------- | ------------------ | ----------- | ----------------------- | --- | ------- |
| `id`        | string             | Primary     | `{profileId}            |     | {date}` |
| `profileId` | string             | `profileId` | Foreign key to profiles |
| `date`      | string             | `date`      | Program date string     |
| `data`      | string             | —           | Cached CSV/program data |
| `cachedAt`  | number (timestamp) | —           | Cache creation time     |

**Schema:** `id, profileId, date`  
**Retention:** ~2 years, throttled save (5 min), throttled cleanup (1 hr).

---

## Database Schema Version History

| Version | Changes                                                                                                            |
| ------- | ------------------------------------------------------------------------------------------------------------------ |
| v1      | Initial schema: profiles, archives, metadata, migrations                                                           |
| v2      | Added `history` store for v2.1.1 data-loss prevention                                                              |
| v3      | Added `date` index to history, `inactive` index to profiles                                                        |
| v4      | Migrated all localStorage data to IndexedDB (v2.2.0)                                                               |
| v5      | Added agenda fields to profiles and archives (agendaUrl, agendaLastLoaded, agendaValid, agendaCsvData, agendaRows) |

---

## Editor Database: `meeting_program_editor`

Used exclusively by the legacy CMS editor page (`editor.html`, now removed). The current CMS at `cms/index.html` uses `MeetingProgramDB` with the `drafts` store for auto-save.

### Store: `editor_sessions`

| Field           | Type                                     | Index   | Description                                        |
| --------------- | ---------------------------------------- | ------- | -------------------------------------------------- |
| `sessionId`     | string (UUID)                            | Primary | Unique session ID                                  |
| `sheetId_email` | string                                   | Unique  | Compound key `{sheetId}_{email}` for deduplication |
| `status`        | `"active"` \| `"saved"` \| `"abandoned"` | —       | Session lifecycle                                  |
| `sheetId`       | string                                   | —       | Google Sheet ID                                    |
| `userEmail`     | string                                   | —       | Authenticated user email                           |
| `createdAt`     | number                                   | —       | Session start timestamp                            |

---

### Store: `editor_changes`

| Field       | Type          | Index     | Description                  |
| ----------- | ------------- | --------- | ---------------------------- |
| `changeId`  | string (UUID) | Primary   | Unique change ID             |
| `sessionId` | string        | Secondary | Parent session               |
| `key`       | string        | Secondary | CSV field key                |
| `language`  | string        | —         | Language code (en/es/fr/swa) |
| `oldValue`  | string        | —         | Value before change          |
| `newValue`  | string        | —         | Value after change           |
| `changedAt` | number        | —         | Timestamp                    |

---

### Store: `editor_snapshots`

| Field        | Type          | Index     | Description             |
| ------------ | ------------- | --------- | ----------------------- |
| `snapshotId` | string (UUID) | Primary   | Unique snapshot ID      |
| `sessionId`  | string        | Secondary | Parent session          |
| `data`       | object        | —         | Full CSV state snapshot |
| `savedAt`    | number        | —         | Timestamp               |

---

## External Data: Google Sheets CSV

The app reads program data as CSV from Google Sheets (public or authenticated).

### Standard CSV Format

```
key,value
unitName,Valley View Ward
date,2026-05-17
presiding,Bishop John Smith
conducting,Brother James Brown
openingHymn,77
openingPrayer,Sister Mary Jones
sacramentHymn,169
speaker,Brother Tom White|First Speaker
closingHymn,3
closingPrayer,Sister Ann Davis
```

### Multi-language CSV Format

```
key,en,es,fr,swa
unitName,Valley View Ward,...
speaker,Brother Smith,...
```

### Allowed CSV Keys

Defined in `js/sanitize.js` — `ALLOWED_KEYS` set:

**Program keys:** `unitName`, `unitAddress`, `link`, `date`, `presiding`, `conducting`, `musicDirector`, `musicOrganist`, `horizontalLine`, `sacramentLine`, `openingHymn`, `openingPrayer`, `sacramentHymn`, `oilLamp`, `intermediateHymn`, `closingHymn`, `closingPrayer`, `hymn`, `speaker`, `leader`, `generalStatementWithLink`, `generalStatement`, `linkWithSpace`, `photo`, `stakeName`, `obsolete`, `migrationUrl`

**Agenda keys:** `agendaGeneral`, `agendaAnnouncements`, `agendaAckVisitingLeaders`, `agendaBusinessStake`, `agendaBusinessReleases`, `agendaBusinessCallings`, `agendaBusinessPriesthood`, `agendaBusinessNewMoveIns`, `agendaBusinessNewConverts`, `agendaBusinessGeneral`

**Lesson keys:** `lessonEQRS`, `lessonSundaySchool`, `lessonYouth`, `lessonPrimary`

---

## localStorage Keys (Legacy / Fast-Access)

| Key                           | Purpose                                      |
| ----------------------------- | -------------------------------------------- |
| `userPreference_theme`        | Mirrored from IndexedDB for fast sync access |
| `userPreference_language`     | Language preference (fast access)            |
| `meeting_program_history`     | Legacy history (migrated to IDB in v2.2.0)   |
| `meeting_program_profiles`    | Legacy profiles (migrated to IDB)            |
| `meeting_program_selected_id` | Selected profile ID                          |
