# CMS Editor Redesign - Final Plan

## Overview
Redesign the CMS editor to present a **single-page, three-section layout** where rows appear in the exact order they will be rendered (top-to-bottom). The editor must enforce strict section partitioning, required keys, and ordering constraints while providing a smooth editing experience.

## Final Requirements

### 1. Layout & Navigation
- Three vertical sections displayed sequentially:
  1. **Unit Information** (locked)
  2. **Sacrament Meeting Program** (editable with constraints)
  3. **General Information** (editable)
- All sections visible at once; each scrollable independently if content overflows.
- No tabbed navigation.

### 2. Data Model
- **Row**: `{ key: string, en: string, es: string, fr: string, swa: string }`
  - Many rows only require an english string
  - Some rows have many multi-lingual strings
- Rows stored in an array; display order = array order.
- Each key defines one or more **fields** (parts) that combine into the `value` string using `|` as separator (special tokens: `<LINK>`, `<IMG>`).
- Keys are from a fixed set (`ALLOWED_KEYS`). Unknown keys should be filtered out on load.

### 3. Section Partitioning & Canonical Order
Rows are partitioned based on key type and **canonical order** derived from the provided Google Sheet example.

**Unit Information** (exactly these keys in this order):
1. `unitName`
2. `stakeName`
3. `obsolete`
4. `migrationUrl`
5. `unitAddress`
6. `link`
7. `date`

**Sacrament Meeting Program** (order matters; keys below can appear in this sequence):
- `presiding` (must be first, any agenda item is allowed to precede presiding)
- `conducting`
- `musicDirector`
- `musicOrganist`
- `agendaAckVisitingLeaders`
- `horizontalLine` (universal; can appear anywhere)
- `agendaAnnouncements`
- `agendaGeneral`
- `openingHymn`
- `openingPrayer`
- `horizontalLine`
- `agendaBusinessReleases`
- `agendaBusinessCallings`
- `agendaBusinessPriesthood`
- `agendaBusinessNewMoveIns`
- `agendaBusinessNewConverts`
- `agendaBusinessGeneral`
- `agendaBusinessStake`
- `agendaGeneral`
- `sacramentHymn`
- `sacramentLine`
- `agendaGeneral`
- `speaker` (repeatable)
- `intermediateHymn` (repeatable)
- `speaker` (more, repeatable)
- `agendaGeneral`
- `closingHymn`
- `closingPrayer` (must be last)

**General Information** (remaining keys; any order allowed):
- `horizontalLine`
- `oilLamp`
- `horizontalLine`
- `lessonEQRS` (repeatable)
- `lessonSundaySchool`
- `lessonYouth`
- `lessonPrimary`
- `photo`
- `horizontalLine`
- `leader` (repeatable)
- `horizontalLine`
- `leader` (repeatable)
- `horizontalLine`
- `linkWithSpace` (repeatable)
- `horizontalLine`
- `generalStatement`
- `horizontalLine`
- `generalStatement`
- `horizontalLine`
- `generalStatementWithLink` (repeatable)
- `horizontalLine`
- `generalStatementWithLink` (repeatable)
- `generalStatement` (repeatable)

**Universal Keys** (may appear in any section):
- `horizontalLine`
- `photo`
- `oilLamp`

### 4. Constraints
- **Unit Information**:
  - Only the 7 keys allowed, and must appear in that order.
  - Rows are **locked**: cannot delete, cannot change key type, cannot reorder.
  - Values are editable.
  - The `date` field uses a date picker; the display format is "MMMM D, YYYY" (e.g., "March 29, 2026"). Internally convert to YYYY-MM-DD for the picker input; store as the display string.
- **Program Section**:
  - Must contain `presiding` and `closingPrayer`.
  - agenda* keys are sacrament meeting program only.
  - `presiding` must be the first row of the program section, except any agenda key is allowed before presiding.
  - `closingPrayer` must be the last row of the program section.
  - `presiding` cannot be moved from the program section into Unit Info or General.
  - No unit information keys allowed in this section
- **General Section**:
  - No specific constraints beyond allowed keys.
  - No unit information keys allowed in this section

### 5. Auto‑Correction & Validation
On data load, run **validation and auto‑correction**:
- If `presiding` missing in Program → insert after unit information keys with empty value and flash warning.
- If `closingPrayer` missing in Program → append after all sacrament meeting keys with empty value and flash warning.
- If `presiding` appears outside Program → move to start of Program and warn (NOTE: agenda keys allowed before presiding)
- If `closingPrayer` appears before `presiding` or not at end → move to end of Program (after all sacrament meeting program keys) and warn.
- If Unit Info contains extra keys or wrong order → reorder to canonical order; remove unauthorized keys (move to Program/General based on key type) and warn.
- Show non‑intrusive warnings (toast or banner) describing corrections made. Each correction should be undoable for a short time (store previous row array).

### 6. Multi‑Field Handling & Tokens

#### Sheet column structure

The Google Sheet has **5 columns**: `key`, `en`, `es`, `fr`, `swa`.

```csv
key,en,es,fr,swa
unitName,1st Ward
openingHymn,1001
speaker1,John Smith,Juan Garcia,Jean Dupont,Yohana Mto
generalStatement,Activity Night Wed 7pm,Noche de Actividades Miér 7pm,Soirée d'activités mer 19h,Usiku wa Shughuli Jua. Saa 1
leader,John Doe|Bishop|(000) 000-0000
```

- **`key` column** — the key type identifier (e.g., `unitName`, `speaker`, `openingHymn`).
- **`en`, `es`, `fr`, `swa` columns** — the serialized value for each locale. Fallback: if a locale cell is empty, the `en` value is used instead.
- Multi-field values (e.g., `leader`) use `|` as a field separator within each locale cell.

#### Which keys need per-language values (user-translated) vs. auto-translated

All locale columns (`es`, `fr`, `swa`) are **optional** — if empty, the app falls back to the `en` value for that locale.

| Category | Keys | Editor behaviour |
|----------|------|------------------|
| **User-translated** (show all 4 locale fields) | `generalStatement`, `generalStatementWithLink`, `horizontalLine`, `linkWithSpace` (text field only), `photo` (caption only), `lessonEQRS`, `lessonSundaySchool`, `lessonYouth`, `lessonPrimary` | Show `en`, `es`, `fr`, `swa` inputs; all optional beyond `en` |
| **Auto-translated by i18n** (`en` only) | `presiding`, `conducting`, `musicDirector`, `musicOrganist`, `openingPrayer`, `closingPrayer`, `speaker` (name + caption), `agendaGeneral`, `agendaAckVisitingLeaders`, `agendaAnnouncements`, `agendaBusinessReleases`, `agendaBusinessCallings`, `agendaBusinessPriesthood`, `agendaBusinessNewMoveIns`, `agendaBusinessNewConverts`, `agendaBusinessGeneral`, `agendaBusinessStake` | Show `en` only; i18n layer translates labels and honorifics automatically |
| **Language-independent** (`en` only) | `unitName`, `stakeName`, `unitAddress`, `date`, `link`, `leader`, `photo` (url field), hymn keys (`openingHymn`, `sacramentHymn`, `intermediateHymn`, `closingHymn`, `hymn`), `linkWithSpace` (url + imageUrl fields) | Show `en` only; same value written to all locale columns |
| **Fully optional value** (any or all cells may be empty) | `sacramentLine`, `migrationUrl`, `oilLamp` | Show `en` only; row may be left blank or omitted entirely |

**Editor implication**: User-translated keys show four locale input fields (en, es, fr, swa); es/fr/swa are optional but recommended. All other keys show only the `en` field.

#### Serialization format by key type

Each locale cell serializes multi-field values with `|`. Examples:

| Key | `key` col | `en` col (serialized) | Notes |
|-----|-----------|----------------------|-------|
| `unitName` | `unitName` | `1st Ward` | single field; language-independent |
| `date` | `date` | `March 29, 2026` | display string "MMMM D, YYYY"; language-independent |
| `presiding` | `presiding` | `Bishop Smith` | name only; honorifics auto-translated |
| `openingHymn` | `openingHymn` | `62` or `62\|Sung by the Primary Children` | `hymnNumber\|titleOverride`; language-independent |
| `speaker` | `speaker` | `Sister Johnson` or `Sister Johnson\|Youth Speaker` | `name\|caption`; entered in `en`, with i18n honorific handling |
| `leader` | `leader` | `John Doe\|Bishop\|(000) 000-0000` | `name\|calling\|phone`; language-independent (same in all locales) |
| `generalStatement` | `generalStatement` | `Activity Night Wed 7pm` | single field; user provides all 4 locale values |
| `generalStatementWithLink` | `generalStatementWithLink` | `Read more <LINK>\|https://example.org` | `text\|url`; user translates `text` per locale; `url` same across locales |
| `linkWithSpace` | `linkWithSpace` | `<IMG> Gospel Library\|https://example.org\|https://img-url` | `text\|url\|imageUrl`; user translates `text` per locale |
| `photo` | `photo` | `https://example.com/photo.jpg\|Ward Family Photo` | `url\|caption`; user translates caption per locale |
| `horizontalLine` | `horizontalLine` | `Announcements` | single field; user provides all 4 locale values |

#### Editor UI requirements per key type

- **User-translated keys** (`generalStatement`, `generalStatementWithLink`, `horizontalLine`, `linkWithSpace` text field, `photo` caption, lesson keys): Show **four inputs** labeled `en`, `es`, `fr`, `swa` (es/fr/swa optional). Each locale cell serializes independently per the field structure below.
- **All other keys** (auto-translated by i18n or language-independent): Show **only the `en` field**. No es/fr/swa inputs. The same value is written to all locale columns on save.

Per-key field inputs:
- **`leader`**: Three text inputs (`name`, `calling`, `phone`). Serialize as `name|calling|phone`. Language-independent — one set of inputs.
- **`linkWithSpace`**: `text` input + `url` input + `imageUrl` input. The `text` field is user-translated (show en/es/fr/swa). `url` and `imageUrl` are language-independent. Provide **"Insert \<IMG\>"** button that inserts `<IMG> ` at cursor in the active `text` field. **No** `includeImageIcon` checkbox. Serialize per locale as `text|url|imageUrl`; trailing empty fields are dropped by `joinParts`.
- **`generalStatementWithLink`**: `text` textarea (user-translated, show en/es/fr/swa) + `url` input (language-independent). Provide **"Insert \<LINK\>"** button that inserts `<LINK>` at cursor in the `text` field. Serialize per locale as `text|url`.
- **`photo`**: `url` input (language-independent, must be `https://`) + optional `caption` input (user-translated, show en/es/fr/swa). Serialize per locale as `url|caption`; if caption is empty, omit trailing `|`.
- **Hymn keys** (`openingHymn`, `sacramentHymn`, `intermediateHymn`, `closingHymn`, `hymn`): `hymnNumber` text input (supports integers `62` and Children's Songbook `CS 2`) + optional `titleOverride` text input. Language-independent. Serialize as `hymnNumber` alone, or `hymnNumber|titleOverride` if override is present.
- **`speaker`**: `name` text input (en only; app auto-translates honorific) + optional `caption` text input. Serialize as `name` alone, or `name|caption`.
- **All other single-field keys**: One `text` or `textarea` input per locale (en/es/fr/swa for translated keys; en only for language-independent keys).

#### Serialization rules

- `sanitisePart(value)`: `String(value ?? "").replace(/\|/g, "").trim()` — strips any `|` from individual field values and trims whitespace.
- `joinParts(parts)`: `parts.filter(p => p !== "").join("|")` — omits empty trailing fields so no spurious `|` appears in the sheet.
- Round-trip example: editing `leader` with name=`John Doe`, calling=`Bishop`, phone=`(000) 000-0000` → `en` cell = `John Doe|Bishop|(000) 000-0000`; re-loading splits on `|` back to the three fields.

### 7. Save & Status
- **Save button**: Prominent button (e.g., footer). Click triggers `onSaveCallback` with `{ rows, removedKeys }`.
- **Status message**: Initially hidden. On change, show "Unsaved changes" (persistent). After save, show "All changes saved" for 10 seconds, then fade out.
- `onChangeCallback` fires on every edit to inform parent of state changes.

### 8. Styling
- Use the app's existing design system. The CSS file `css/styles.css` already contains some `.cms-` rules; extend them.
- Ensure responsive layout; sections should have clear headings and border separation.
- Unit Info section may have a subtle background (e.g., light gray) and a lock icon.

## Architecture & Implementation

### Core Class: CmsEditor
- **State**:
  ```js
  this.unitRows = []
  this.programRows = []
  this.generalRows = []
  this.baselineUnitRows = clone(this.unitRows)
  this.baselineProgramRows = clone(this.programRows)
  this.baselineGeneralRows = clone(this.generalRows)
  this.isDirty = false
  this.statusTimeout = null
  this.undoStack = [] // for auto‑correction undo
  ```
- **Remove**: All group‑based rendering and helpers (`buildFieldGroups`, `flattenGroups`, `cloneGroups`) and any imports of them.
- **Keep**: `parseRowsIntoSections`, `getFieldDefinition`, `getFieldLabel`, `createEmptyValue`, `parseFieldValue`, `serializeFieldValue`, `splitParts`, `joinParts`, `sanitisePart`, `sortConcreteRows`, `getTrailingNumber`, `getConcreteKeyForNewItem`, `isValueEmpty`, `isRepeatableKeyType`, `isNumberedRepeatableKeyType`, `normalizeCmsKeyType`, `translateStaticText`.

### Rendering
- `renderHtml()` returns full editor HTML with three sections.
- Structure:
  ```html
  <div class="cms-editor">
    <div class="cms-section" data-section="unitInfo">
      <h2>Unit Information</h2>
      ${this.renderRows(this.unitRows, { locked: true, allowedKeys: UNIT_INFO_KEYS })}
    </div>
    <div class="cms-section" data-section="program">
      <h2>Sacrament Meeting Program</h2>
      ${this.renderRows(this.programRows, { locked: false, allowedKeys: PROGRAM_ALLOWED_KEYS })}
      <button data-action="add-row">Add Row</button>
    </div>
    <div class="cms-section" data-section="general">
      <h2>General Information</h2>
      ${this.renderRows(this.generalRows, { locked: false, allowedKeys: GENERAL_ALLOWED_KEYS })}
      <button data-action="add-row">Add Row</button>
    </div>
    <div class="cms-editor__status"></div>
    <button class="cms-editor__save-btn">Save</button>
  </div>
  ```
- `renderRows(rows, options)` loops and calls `renderRow`. Each row is placed in a container with `data-row-id` (unique per row) for targeted updates.
- `renderRow(row, index, section, options)`:
  - Returns HTML string or DOM element? For incremental updates, we may build DOM elements directly. Simpler: keep full re‑render for now, but later optimize.
  - **Key selector**: locked → readonly display; else → dropdown with `allowedKeys`. The dropdown should be disabled for non‑repeatable keys that already exist elsewhere in the same section.
  - **Value fields**: Based on `FIELD_DEFINITIONS[key]`. Render appropriate inputs:
    - `text` → `<input type="text" maxlength="1000">`
    - `textarea` → `<textarea maxlength="5000"></textarea>`
    - `date` → `<input type="date">` with conversion between display and ISO.
    - `checkbox` → `<input type="checkbox">`
    - `number` (hymnNumber) → `<input type="number" min="1" max="3000">`; if hymn dropdown implemented, replace with `<select>`.
  - For `linkWithSpace` and `generalStatementWithLink`, include a button adjacent to the text field/textarea that inserts the appropriate token at the cursor position.
  - **Actions**: Move Up/Down, Delete (subject to constraints). Buttons disabled when not allowed.
- Incremental rendering: Instead of re-rendering entire section on each change, update only the affected row element. Keep a map of row IDs to DOM elements.

### Event Handling
- **Add row**: Show modal/dropdown with allowed keys (filtered by repeatability limits). After selection, insert new row at appropriate position:
  - In Unit Info: not allowed (locked).
  - In Program/General: If `PROGRAM_KEY_ORDER` includes the key, insert after the last occurrence of the preceding key in that order; else append at end.
- **Delete**: Remove row, track `removedKeys`. Prevent deletion of required keys (`presiding`, `closingPrayer`) and any row in Unit Info.
- **Key change**: Validate key is allowed in section. If key is non‑repeatable and already exists elsewhere in the same section, prevent change and show warning. If the new key is not allowed in the current section, prevent the change and show warning.
- **Value change**: Update row value, mark dirty. Perform basic validation (e.g., URL format, hymn number format) and show inline errors. Block save while validation errors exist.
- **Move**: Swap with neighbor and mark dirty. Prevent invalid moves in UI (disable Up/Down where move would violate constraints), including disabling Up for `presiding` and Down for `closingPrayer`.
- **Save**: Run `validate()`. If errors, show summary and block save. If valid, call `onSaveCallback(this.getAllRows(), this.getRemovedKeys())`. Then set dirty false, show saved status (10 s timeout). Save should also update baseline rows.

### Validation & Auto‑Correction
- `validate()` returns an array of error objects `{ message: string, rowIndex?: number, severity: "error"|"warning" }`.
- `autoCorrect()` mutates rows to meet constraints and returns an array of corrections applied. It should be **idempotent**.
  - Ensure `presiding` at index 0 of program, `closingPrayer` at last index.
  - Ensure Unit Info contains exactly 7 keys in canonical order (`unitName`, `stakeName`, `obsolete`, `migrationUrl`, `unitAddress`, `link`, `date`); any extra keys move to Program or General based on their type (if key in PROGRAM_KEY_ORDER → Program; else → General). Maintain relative order among moved keys if possible.
  - Remove duplicate non‑repeatable keys: keep the first occurrence, remove subsequent ones (move to General? Actually better: reject key change that would create duplicate). Auto‑correction can also merge duplicates but warn.
- Call `autoCorrect()` during `initialize()` after partitioning.
- Show a toast with corrections; each correction has an "Undo" button that reverts the entire auto‑correction batch.

### Serialization
- `serializeFieldValue(key, valueObj)`:
  - Simple (single field): return `sanitisePart(valueObj[fieldName])`.
  - Multi‑field: `joinParts(fields.map(f => sanitisePart(valueObj[f.name])))`.
- `sanitisePart(value)`: `String(value ?? "").replace(/\|/g, "").trim()`.
- `joinParts(parts)`: `parts.filter(p => p !== "").join("|")`.
- `parseFieldValue(key, raw)`: split by `|` and map to fields, filling missing with empty string.
- The `value` string stored in a row is the serialized form.

### Date Handling
- In `FIELD_DEFINITIONS`, `date` uses `type: "date"`.
- In render, `<input type="date">` value should be ISO `YYYY-MM-DD`. Convert from display string when initializing row:
  - `parseDisplayDate(str)` → `YYYY-MM-DD` using `date-fns/parse` with format "MMMM d, yyyy" (enforce English? Actually format is locale‑independent; months in English).
- On change from picker, convert ISO to display string using `formatDisplayDate(dateISO)` → `Intl.DateTimeFormat('en-US', { dateStyle: 'long' }).format(new Date(dateISO))`. This yields "March 29, 2026".
- Store `date` as the display string in row data. In `parseFieldValue`, return `{ text: raw }`; in `serializeFieldValue`, return `valueObj.text`.
- Convert display to ISO only for rendering the picker using `displayToISO(display)` with `date-fns/parse(display, 'MMMM d, yyyy', new Date())`.
- On picker change, convert ISO back to display with `formatDisplayDate(iso)` and save that display string.

Add these utilities.

### Constants
Define:
- `UNIT_INFO_KEYS` = ["unitName", "stakeName", "obsolete", "migrationUrl", "unitAddress", "link", "date"]
- `PROGRAM_KEY_ORDER` = [see section 3]
- `GENERAL_KEY_ORDER` = [see section 3]
- `UNIVERSAL_KEYS` = new Set(["horizontalLine", "photo", "oilLamp"])
- `ALLOWED_PER_SECTION`: Derived from orders + universal.
- `MAX_REPEATABLE_ITEMS` = { speaker: 10, intermediateHymn: 5, leader: 20, agendaAnnouncements: 20, agendaBusinessReleases: 20, agendaBusinessCallings: 20, linkWithSpace: 100, generalStatement: 100, generalStatementWithLink: 100 }
- `REQUIRED_PROGRAM_KEYS` = ["presiding", "closingPrayer"]

### Removal of Group‑Based Code
- Delete: `buildFieldGroups`, `flattenGroups`, `cloneGroups`.
- Remove any references to `this.groups`, `this.baselineGroups`.
- Replace `getRows()`:
  - Combine `this.unitRows`, `this.programRows`, `this.generalRows` in order.
  - For each row, compute `serializeFieldValue(key, row.value)`.
- Replace `getBaselineRows()` similarly.

### Performance Optimizations
- Incremental rendering:
  - `renderRow(row, index, section)` returns a DOM node (or HTML string that we convert to node).
  - Keep a reference to each row container: `data-row-id="${row.id}"`.
  - When a row changes, update only that row element's inner content.
  - When moving rows, use DOM `insertBefore` to reposition without full re-render.
- Debounce `onChangeCallback` if called too frequently? Not needed if we use incremental.
- Use `DocumentFragment` when rebuilding a section to minimize reflow.

### Security
- Escape all user‑provided strings before `innerHTML`. Centralize via `escapeHtml`.
- For attribute values, also escape or use `setAttribute`.
- Consider using `textContent` for pure text nodes to avoid HTML injection.
- Validate URLs: use a simple regex `/^https?:\/\/.+/` or try `new URL(value)`. Show warning but maybe allow if invalid (server may reject).
- Limit field lengths: `maxLength` attributes; also truncate on save if necessary.
- Token safety: `<LINK>` and `<IMG>` should be displayed as plain text. Ensure they are not placed into HTML without escaping.

### Testing Strategy (Vitest)
- **Unit tests**:
  - `parseRowsIntoSections` with various inputs (correct, missing closingPrayer, presiding in unit, etc.)
  - `autoCorrect` idempotence and correctness.
  - `serializeFieldValue` for each multi‑field key (hymn, speaker, leader, photo, link, linkWithSpace, generalStatementWithLink). Include round‑trip.
  - `sanitisePart`, `joinParts`.
  - `validate` (including duplicate non‑repeatable, required keys, order).
  - Date utilities: `parseDisplayDate`, `formatDisplayDate`.
- **Integration tests** (using @testing-library/dom or similar):
  - Render editor with sample data; verify section counts and row order.
  - Simulate adding row, changing key, editing value, deleting, moving.
  - Test constraint enforcement: delete required key (should not delete), move closingPrayer above presiding (should auto‑correct back), change unitInfo key (should not allow or auto‑correct).
  - Test auto‑correction undo: apply correction, click undo, verify state restored.
  - Test save: make valid edits, click save, assert callback called with correct payload; verify dirty flag cleared and status message.
  - Test status: after change, show "Unsaved changes"; after save, show "All changes saved" then hide after 10 s.
  - Test token insertion: click "Insert Link" button, verify token inserted at cursor (might need user-event library).
  - Test date picker: pick a date, verify display format; manually type a date, ensure it parses.
- **Fuzzing**:
  - Generate random rows with random keys (including unknown), random values (including `|`, `<`, `>`, very long strings).
  - Ensure no crashes, values are sanitized, unknown keys are filtered or handled gracefully.
- **Performance**:
  - Render with 60 rows, measure time for editing a field (should be <50ms).
  - If using full re‑render, measure and consider optimizing.

### Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Performance with 50+ rows | Implement incremental row rendering; only update changed row's DOM. |
| Serialization mismatch with server | Define exact format spec in code comments; test round‑trip with real sheet data. |
| Auto‑correction surprises | Show clear toast with "Undo" for each batch; limit auto‑correction to initial load only; do not delete user data—only insert missing rows or reorder, keeping all user content. |
| Token injection/XSS | Escape all dynamic content before `innerHTML`. Use `textContent` where possible. Sanitize tokens as plain text. |
| Date parsing errors | Use robust library (date-fns). Validate input; show error if date invalid. |
| Duplicate non‑repeatable keys | Disable selection in dropdown for keys already present; also catch in validation. |
| Legacy unknown keys | Filter out from display; log warning; preserve on load but do not show? Better: show as is but with warning badge. |
| Hymn dropdown availability | If hymnbook service not ready, fall back to number input with placeholder "1-3000". |
| Undo complexity | Keep a simple stack of previous row arrays (deep clone) for a limited depth (e.g., 20). Pop on undo. |

### Resolved Questions

1. **linkWithSpace fields** ✅ **Remove `includeImageIcon`.**
  The existing `CmsEditor.mjs` serializer prepends `<IMG>` to `text` when the checkbox is checked, but the token itself already encodes that intent. The README sample data shows `<IMG>` already embedded directly in the text field (`<IMG> Gospel Library | https://... | https://img-url`). The checkbox is never written to the sheet — it is redundant. Keep only three fields: `text`, `url`, `imageUrl`.

2. **Maximum repeatable counts** ✅ **Counts confirmed; define as named constants.**
  No hardcoded limits exist in the current code — `MAX_REPEATABLE_ITEMS` is referenced but not yet defined. The plan's values are the canonical source; implement them as a constant:
  ```js
  MAX_REPEATABLE_ITEMS = {
    speaker: 10, intermediateHymn: 5, leader: 20,
    agendaAnnouncements: 20, agendaBusinessReleases: 20,
    agendaBusinessCallings: 20, linkWithSpace: 100,
    generalStatement: 100, generalStatementWithLink: 100
  }
  ```

3. **Hymn dropdown** ✅ **Use `js/data/hymnsLookup.js` — data is already available.**
  `hymnsLookup.js` exports `childrenSongLookup` and a standard hymn lookup covering all known hymns. Children's songs use the `"CS N"` key format (e.g., `"CS 2"`). Implement a `<select>` dropdown populated from this file for the `hymnNumber` field. No external service needed.

4. **Agenda toggle** ✅ **Preserve `includeAgenda`; default remains `false`.**
  `includeAgenda` is fully implemented in the current `CmsEditor` — when `false`, all `agenda*` keys are filtered out of the section entirely. Preserve this option in the new `initialize()` signature unchanged.

5. **Multi‑language display** ✅ **Show all 4 locale fields simultaneously for user-translated keys.**
  The current editor uses a single locale toggle dropdown (one language at a time). The redesign intentionally changes this: user-translated keys show four inline inputs (en, es, fr, swa) in one row. All other keys show `en` only. This is a deliberate UX improvement — keep the plan as written.

6. **Auto‑correction scope** ✅ **Hybrid: prevent via UI + auto‑correct on load only.**
  Decision: **disable move/delete buttons** that would violate constraints (prevents surprises), and run `autoCorrect()` only during `initialize()` to fix missing required keys (`presiding`, `closingPrayer`) in loaded data. Do not run auto-correction on every keystroke or key-change. This is the simplest, most predictable approach.

---

## Implementation Phases (Suggested)

1. **Core row editor**: Implement the three‑section layout, row rendering with dropdowns and field inputs, basic move/delete, save/status. No auto‑correction yet.
2. **Constraints**: Add validation and enforce via UI disabling (prevent moves/deletes that violate). Add basic auto‑correction on load for missing required keys.
3. **Field polish**: Date picker, hymn number input (with optional dropdown later), token insertion buttons, field length limits, URL validation warnings.
4. **Undo & performance**: Add undo for auto‑corrections, implement incremental rendering.
5. **Testing & hardening**: Full test suite, fuzzing, accessibility.

---

**Winston notes**: Keep code clean, remove dead group‑based code, use small functions, and centralize constants.

**Murat notes**: Ensure comprehensive test coverage for all constraints and edge cases; run in CI. Include golden dataset tests.

**Adversarial notes**: Add fuzzing tests for robustness; ensure all user inputs are sanitized; escape HTML on render; validate URLs.
