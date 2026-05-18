# Desktop CMS UI Polish Plan

## Current Issues

### 1. Hardcoded Colors Throughout
**Problem**: `CmsEditor.mjs` injects ~50 lines of inline CSS with hardcoded colors:
- `#d0d7de` (borders), `#fff` (backgrounds), `#0969da` (accent), `#eef6ff` (active bg), `#eaeef2` (dividers), `#eef2ff` (badge bg)
- **Result**: Completely ignores the app's theme system. Dark mode users see white backgrounds with dark text on a dark page.

### 2. Inline Styles in `cms/index.html`
**Problem**: The page shell has inline `<style>` block with hardcoded colors (`#b42318` for errors, `#027a48` for success)
**Fix**: Move to `styles.css` using CSS custom properties

### 3. Sidebar Navigation
**Problem**: 
- 220px fixed width sidebar with basic bordered buttons
- Active state uses light blue background (`#eef6ff`) — invisible in dark mode
- No hover states, no visual feedback
- On narrower desktop windows (<900px), the 220px sidebar + 1rem gap + content squeezes the form

### 4. Form Sections
**Problem**:
- Basic bordered boxes (`border: 1px solid #d0d7de`) with no depth
- Section titles have no visual hierarchy (just `<h2>`)
- Fields separated by thin top borders — looks like a wireframe
- No card-like styling, no background differentiation

### 5. Inputs & Textareas
**Problem**:
- Basic bordered inputs with no focus states
- No theme-aware backgrounds
- Labels are small, no visual weight
- No placeholder styling
- Textareas have fixed `min-height: 5rem` — too small for general statements

### 6. Buttons (Add/Remove/Insert Token)
**Problem**:
- Pill-shaped (`border-radius: 999px`) with light blue backgrounds (`#eef6ff`)
- No hover effects, no visual hierarchy between add/remove/token buttons
- Remove button looks identical to add button
- "Insert Link Placeholder" button blends in with everything

### 7. Badges (Required/Optional)
**Problem**:
- Light purple background (`#eef2ff`) — themed for neither light nor dark
- No visual distinction between Required and Optional (same background)

### 8. Status Indicator
**Problem**:
- Just `font-weight: 600` text — no color, no icon, no visual feedback
- "Unsaved changes" and "All changes saved" look identical except for text

### 9. Setup Modal
**Problem**:
- Default `<dialog>` styling — no theming, no card styling
- Same issues as agenda CMS modal

### 10. Toolbar Buttons (Save/Discard)
**Problem**:
- No styling at all — default browser buttons
- Save should be prominent (primary action), Discard should be secondary/danger

---

## Implementation Plan

### Phase 1: Move All Inline Styles to `styles.css`

**Sources to migrate:**
1. `cms/index.html` inline `<style>` block (~30 lines)
2. `CmsEditor.mjs` `injectStyles()` method (~50 lines of hardcoded CSS)

**Approach:**
- Remove `injectStyles()` from `CmsEditor.mjs` entirely
- Add comprehensive CMS editor styles to `styles.css`
- Use CSS custom properties for all colors

### Phase 2: Theme-Aware Color System

| Element | Light Mode | Dark Mode |
|---------|-----------|-----------|
| Sidebar bg | `--card-bg` | `--card-bg` |
| Sidebar button bg | `--bg-color` | `--bg-color` |
| Sidebar button active | `--accent-color` bg, `--accent-text` text | Same |
| Section bg | `--card-bg` | `--card-bg` |
| Section border | `--border-color` | `--border-color` |
| Input bg | `--input-bg` | `--input-bg` |
| Input border | `--border-color` | `--border-color` |
| Input focus | `--accent-color` border | `--accent-color` border |
| Badge required | `--offline-bg` bg, `--offline-text` text | Same |
| Badge optional | `--card-bg` bg, muted text | Same |
| Add button | `--accent-color` bg, `--accent-text` text | Same |
| Remove button | `--offline-bg` bg, `--offline-text` text | Same |
| Token button | Transparent, `--accent-color` text, dashed border | Same |

### Phase 3: Layout Improvements

**Sidebar (desktop ≥1024px):**
- Width: 240px (slightly wider for readability)
- Sticky positioning
- Active state: solid accent color background
- Hover state: subtle background change
- Smooth transitions

**Content area:**
- Sections: card-style with subtle shadow, rounded corners
- Section titles: accent-colored left border or underline
- Fields: proper spacing, clear visual separation
- Two-column input layout for simple fields on wide screens (≥1200px)

**Narrower desktop (768px-1023px):**
- Sidebar collapses to icons or top tabs
- Content takes full width

### Phase 4: Input & Form Polish

- Labels: `font-weight: 600`, proper sizing, consistent spacing
- Inputs: `--input-bg` background, `--border-color` border, `8px` radius
- Focus: `--accent-color` border + subtle box-shadow
- Textareas: `min-height: 120px`, resizable
- Placeholders: muted opacity
- Help text: smaller, italic, muted color

### Phase 5: Button Hierarchy

| Button | Style |
|--------|-------|
| Save (toolbar) | Primary: `--accent-color` bg, bold, prominent |
| Discard (toolbar) | Danger: `--offline-bg` bg, `--offline-text` text |
| Add item | Secondary: transparent bg, `--accent-color` text, dashed border |
| Remove item | Danger: `--offline-bg` bg, `--offline-text` text |
| Insert token | Ghost: transparent, `--accent-color` text, dotted border |

### Phase 6: Status Indicator

- Add color: green for saved, amber/orange for unsaved
- Add icon: ✅ / ⚠️ via CSS pseudo-elements or Unicode
- Subtle background highlight

### Phase 7: Badge Styling

- Required: `--offline-bg` background, `--offline-text` text (red tones)
- Optional: transparent background, muted text, subtle border

### Phase 8: Setup Modal

- Card-style: `--card-bg` background, rounded corners, shadow
- Themed backdrop
- Proper button styling inside modal

---

## Files to Modify

| File | Changes |
|------|---------|
| `css/styles.css` | Add ~300 lines of CMS editor styles (sidebar, sections, inputs, buttons, badges, status, modal, responsive) |
| `cms/index.html` | Remove inline `<style>` block, add button tier classes to toolbar buttons |
| `js/components/CmsEditor.mjs` | Remove `injectStyles()` method, the `_stylesInjected` flag, and the `injectStyles()` call in `render()` |

---

## Visual Design Reference

The desktop CMS should feel like a professional admin tool:
- **Sidebar**: Clean navigation with clear active state
- **Sections**: Card-like with subtle depth, clear hierarchy
- **Inputs**: Consistent with the main app's styling
- **Buttons**: Clear primary/secondary/danger hierarchy
- **Overall**: Professional, not playful — this is a tool for ward clerks editing meeting programs
