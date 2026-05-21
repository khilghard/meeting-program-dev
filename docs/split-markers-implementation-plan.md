# CMS Split Markers Implementation Plan

## Problem
The current CMS editor uses fragile inference logic (`parseRowsIntoSections`) to guess which rows belong to which section (Unit Info, Program, General). This breaks when users add new keys or reorder rows in the Google Sheet.

## Solution
Replace inference with **explicit split marker rows** (`split:program`, `split:general`) stored directly in the CSV. The CMS renders these as draggable colored boundaries. The main program ignores them as unrecognized keys.

## Architecture

### Data Flow
```
Google Sheet (CSV)
  ↓ readSheet()
CMS Editor (single list with colored sections)
  ↓ User drags split markers
CMS Editor (reordered array)
  ↓ getAllRows() → writeSheet()
Google Sheet (CSV with new marker positions)
```

### Key Decisions
| Decision | Rationale |
|----------|-----------|
| Split markers as CSV rows | Zero state sync complexity; sheet order IS UI state |
| `split:program` / `split:general` key names | `split:` prefix makes purpose clear; ignored by main program |
| Single scrollable list (not 3 divs) | Eliminates partitioning logic; simpler rendering |
| Colored grab handles | Visual clarity; intuitive drag interaction |
| HSL-based color system | Clean light/dark theme support |
| Auto-insert missing splits | Zero-config onboarding |
| Locked split markers (no delete) | Prevents broken layouts |
| Unit Info auto-ordering preserved | Backward compatibility |

## Implementation Steps

### Step 1: CSS Color System (`css/cms.css`)
**Status:** ✅ Complete

Add HSL-based section tinting variables:
```css
:root {
  --hue-unit: 210; --hue-program: 160; --hue-general: 35;
  --section-unit-bg: hsla(var(--hue-unit), 100%, 50%, 0.05);
  --section-program-bg: hsla(var(--hue-program), 80%, 40%, 0.05);
  --section-general-bg: hsla(var(--hue-general), 90%, 50%, 0.05);
  --handle-unit: hsl(var(--hue-unit), 100%, 50%);
  --handle-program: hsl(var(--hue-program), 80%, 40%);
  --handle-general: hsl(var(--hue-general), 90%, 50%);
}
[data-theme="dark"] {
  --section-*-bg: hsla(var(--hue-*), ..., 0.15);
}
```

Add styles for:
- `.cms-split-marker` (draggable boundary bar)
- `.cms-split-marker--program` / `--general` (color variants)
- `.cms-split-marker__handle` (grip icon)
- `.cms-split-marker__label` (section name text)
- `.cms-drop-preview` (drop target line)
- `.cms-insert-btn` (hover-to-add row button)
- `.cms-section-tint--*` (background tints)

### Step 2: Split Marker Utilities (`js/components/CmsEditor.mjs`)
**Status:** ✅ Complete

Add new functions:

```javascript
function findSplitIndices(rows) {
  // Returns { programSplitIdx, generalSplitIdx }
  // If missing, returns null for that index
}

function ensureSplitMarkers(rows) {
  // If split:program missing → insert above first presiding/conducting
  // If split:general missing → insert below last closingPrayer/closingHymn
  // Returns modified rows array
}

function isSplitKey(key) {
  return key === 'split:program' || key === 'split:general';
}
```

### Step 3: Render Single List with Split Markers
**Status:** ✅ Complete

Replace `renderHtml()` to render a single scrollable list with:
- `getCombinedRows()` method to merge all rows with split markers
- `.cms-section-tint` containers for section backgrounds
- `.cms-split-marker` bars between sections
- Section headers within tints
- Single footer with add button, status, and save

### Step 4: Drag-and-Drop Logic
**Status:** ✅ Complete

Use pointer events for unified mouse/touch support:

- `_splitPointerDown(event, handle)` - Starts drag immediately on desktop, 300ms long-press on mobile
- `_splitPointerMove(event)` - Updates drop preview position based on closest element
- `_splitPointerUp(event)` - Commits new row order, cleans up preview
- `_startDrag(marker, splitKey, event)` - Initializes drag state, creates preview element
- `_getSectionForDropPosition(previewIdx, splitKey)` - Determines target section
- `_moveSplitMarker(splitKey, newSection)` - Marks dirty and shows toast

Mobile: 300ms long-press → `navigator.vibrate(15)` → enter drag mode.

### Step 5: Save Logic
**Status:** ✅ Complete

Update `getAllRows()` to flatten in correct order:
- Unit info rows sorted to canonical order
- `split:program` marker inserted after unit info
- `split:general` marker inserted after program rows
- `getBaselineRows()` updated to match format

### Step 6: Prevent Split Deletion
**Status:** ✅ Complete

In `handleActionClick()`, added check:
```javascript
if (!REQUIRED_PROGRAM_KEYS.includes(rowKey) && !isSplitKey(rows[rowIdx].key)) {
  // allow deletion
}
```

### Step 7: Auto-Insert Missing Splits
**Status:** ✅ Complete

In `initialize()`:
```javascript
rows = ensureSplitMarkers(rows);
```

### Step 8: Update Draft Serialization
**Status:** ✅ Complete (already handled by `getAllRows()`)

## Testing Plan
1. ✅ Sheet with no split markers → auto-inserted correctly
2. ✅ Sheet with split markers → loaded at correct positions
3. ✅ Drag split marker up/down → sections update in real-time
4. ✅ Save → sheet updated with new marker positions (getAllRows includes splits)
5. ✅ Delete split marker → prevented
6. ✅ Mobile long-press → drag mode activates with haptic feedback
7. ✅ Hover between rows → insert button appears
8. ✅ Unit Info rows → always re-ordered to canonical sequence on save

## Files Modified
- `css/cms.css` — Color system, split marker styles, section tint styles, single-list layout, insert button styles, drop preview
- `js/components/CmsEditor.mjs` — Split utilities, combined rows, render logic, save logic, baseline, drag handlers, insert button handler
- `test/components/CmsEditor.test.mjs` — Updated test for `.cms-section-tint` selector
- `test/integration/e2e-scenarios.test.mjs` — Updated test for single add button

## Implementation Complete
All 8 steps of the split markers implementation are complete. The CMS editor now uses explicit split markers stored in the CSV instead of fragile inference logic.
