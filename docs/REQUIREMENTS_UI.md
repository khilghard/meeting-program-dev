# UI/Theme Requirements

## Overview

The app supports light/dark themes with system preference detection and manual toggle.

---

## Theme System

### Theme Values

- `light` - Light mode
- `dark` - Dark mode

### Theme Storage

- Key: `localStorage.theme`
- Values: `"light"`, `"dark"`, or unset

### Theme Detection Priority

```
1. localStorage.theme (if set)
2. System preference (prefers-color-scheme)
3. Default: light
```

---

## Theme Toggle

### Toggle Button

- Located in header area
- Icon or text: varies by current theme
- Click toggles between light/dark

### Implementation

```javascript
const newTheme = currentTheme === "dark" ? "light" : "dark";
document.documentElement.setAttribute("data-theme", newTheme);
localStorage.setItem("theme", newTheme);
```

---

## CSS Variables

### Light Theme

```css
:root {
  --bg-color: #ffffff;
  --text-color: #1a1a1a;
  --primary-color: #4a90d9;
  --secondary-color: #f5f5f5;
  --border-color: #e0e0e0;
}
```

### Dark Theme

```css
[data-theme="dark"] {
  --bg-color: #1a1a1a;
  --text-color: #ffffff;
  --primary-color: #6ba3e0;
  --secondary-color: #2d2d2d;
  --border-color: #404040;
}
```

---

## System Preference

### Listener

```javascript
window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
  if (!localStorage.getItem("theme")) {
    applyTheme(e.matches ? "dark" : "light");
  }
});
```

### Behavior

- Only applies if user hasn't set manual preference
- User preference (if set) always takes priority

---

## HTML Attributes

### Language

```html
<html lang="en"></html>
```

Updated dynamically based on selected language.

### Theme

```html
<html data-theme="dark"></html>
```

Applied to root element.

---

## Responsive Design

### Breakpoints

- Mobile: < 600px
- Tablet: 600px - 1024px
- Desktop: > 1024px

### Layout

- Single column on mobile
- Max content width: 800px centered
- Touch-friendly button sizes (min 44px)

---

## Accessibility

- ARIA labels on interactive elements
- Keyboard navigation support
- Sufficient color contrast
- Focus indicators

---

## Non-Requirements

- Custom themes (only light/dark)
- Theme by time of day
- High contrast mode
