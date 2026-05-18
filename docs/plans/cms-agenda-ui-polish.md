# Mobile Agenda CMS UI Polish Plan

## Current Issues

### 1. Repeatable Pair Layout (Name + Calling)
- **Problem**: Two inputs placed side-by-side with `display: flex; gap: 0.75rem` in `.agenda-key-editor__row`
- **On narrow screens (320-430px)**: Inputs overflow off-screen or become too narrow to read
- **Fix**: Stack vertically on screens below a breakpoint (e.g., 480px), side-by-side only on wider screens

### 2. Input Padding & Margins
- **Problem**: Inline styles in `cms_agenda/index.html` use `padding: 0.7rem 0.85rem` on inputs but rows use `gap: 0.75rem` with no padding around the row container
- **Fix**: Consistent spacing system — rows get padding, inputs get consistent padding/margins

### 3. Buttons Don't Match App Style
- **Problem**: Buttons in the agenda CMS use default browser styling (plain gray) — no `var(--accent-color)`, no `border-radius`, no hover effects
- **Main app buttons**: Use `--accent-color` background, `--accent-text` color, `8px` border-radius, box-shadow, hover transitions
- **Fix**: Style buttons to match the app's `qr-action-btn` / `secondary-btn` patterns

### 4. Dark Theme Washed Out
- **Problem**: No dark theme CSS variables used in agenda CMS inline styles. Colors are hardcoded (e.g., `color: #b42318` for errors, `color: #027a48` for success)
- **Fix**: Use CSS custom properties (`--text-color`, `--card-bg`, `--accent-color`, etc.) from the shared `styles.css` theme

### 5. Light Theme Too Light
- **Problem**: Inputs have no visible borders or background distinction from the page background
- **Fix**: Add `--input-bg`, `--border-color` backgrounds and borders to inputs and cards

### 6. Header & Title Styling
- **Problem**: Header text uses default browser styling — no visual hierarchy, no theming
- **Fix**: Style header with `--header-bg` or at minimum consistent with app's card styling

### 7. Pending Changes Panel
- **Problem**: No visual styling — just a bare `<h2>` and `<div>` with no card styling, borders, or background
- **Fix**: Card-style panel matching app's `.card` pattern

### 8. Setup Modal
- **Problem**: Default `<dialog>` styling — no theming, no card styling
- **Fix**: Style to match app's modal patterns

---

## Implementation Plan

### Phase 1: Move Styles to `styles.css` (Primary)

Move all inline styles from `cms_agenda/index.html` into `css/styles.css` as a dedicated section. This enables:
- Use of CSS custom properties for theme consistency
- Media queries for responsive layout
- Single source of truth for styling

**New CSS section in `styles.css`:**
```css
/* =========================================================
   CMS Agenda Page (Mobile)
   ========================================================= */
```

### Phase 2: Responsive Layout

**Breakpoint**: `max-width: 480px`

| Element | Wide (≥480px) | Narrow (<480px) |
|---------|---------------|-----------------|
| Repeatable pair row | Side-by-side (flex row) | Stacked (flex column) |
| Action buttons | Single row | Wrapped (flex-wrap) |
| Controls (selects) | Side-by-side | Stacked |

### Phase 3: Button Styling

Three button tiers:

| Tier | Style | Usage |
|------|-------|-------|
| Primary | `--accent-color` bg, `--accent-text` text, bold, full-width on mobile | Publish, Publish All |
| Secondary | Transparent bg, `--accent-color` border, `--accent-color` text | Save Draft, Make Active |
| Danger/Remove | `--offline-bg` bg, `--offline-text` text | Remove item |

### Phase 4: Input & Form Styling

- Inputs: `--input-bg` background, `--border-color` border, `8px` border-radius, focus state with `--accent-color` border
- Textareas: Same as inputs, `min-height: 120px`
- Labels: `font-weight: 500`, `font-size: 0.9rem`, `--text-color`
- Row containers: `--card-bg` background, `8px` border-radius, `12px` padding, `8px` margin-bottom

### Phase 5: Dark Theme Fixes

- All hardcoded colors → CSS custom properties
- Status messages: use theme-aware error/success colors
- Card backgrounds: `--card-bg` instead of transparent
- Text: `--text-color` instead of browser default
- Borders: `rgba()` variants for dark theme visibility

### Phase 6: Header & Card Styling

- Header: card-style with `--card-bg`, `--header-bg` accent bar, or at minimum consistent padding
- Title: `font-size: 1.25rem`, `font-weight: 600`
- Profile name: `font-size: 1.1rem`, `font-weight: 500`, `--accent-color`
- Pending panel: card-style with header border

---

## Files to Modify

| File | Changes |
|------|---------|
| `css/styles.css` | Add ~150 lines of CMS agenda styles (responsive, themed, consistent) |
| `cms_agenda/index.html` | Remove inline `<style>` block (move to styles.css), add semantic class names if needed |
| `js/components/AgendaKeyEditor.mjs` | Update class names if needed for new styling (minimal changes) |

---

## Visual Design Reference

The styling should match the main app's patterns:
- **Accent color**: `#0d659e` (light) / `#90caf9` (dark)
- **Card background**: `#fafafa` (light) / `#1e1e1e` (dark)
- **Text**: `#333` (light) / `#e0e0e0` (dark)
- **Border radius**: `8px` (consistent with app)
- **Button shadow**: `0 4px 10px rgba(0, 0, 0, 0.2)`
- **Input focus**: `border-color: var(--accent-color)`
