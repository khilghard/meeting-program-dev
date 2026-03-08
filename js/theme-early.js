/**
 * theme-early.js
 * Apply theme IMMEDIATELY before page render to prevent flash of light theme
 * Load this script as early as possible in <head>
 */
(function applyThemeImmediately() {
  try {
    // Determine theme (localStorage first, then system preference)
    const storedTheme = localStorage.getItem("userPreference_theme");
    const systemIsDark =
      window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    const theme = storedTheme || (systemIsDark ? "dark" : "light");

    // Apply theme attribute BEFORE page renders
    document.documentElement.dataset.theme = theme;

    // Inject critical theme CSS inline (so it's available before styles.css loads)
    const criticalCSS = `
      :root {
        --bg-color: #ffffff;
        --text-color: #333333;
        --card-bg: #fafafa;
        --header-bg: #0d659e;
        --header-text: #ffffff;
        --accent-color: #0d659e;
        --accent-hover: #004a9c;
        --dots-color: #444444;
        --offline-bg: #f8d7da;
        --offline-text: #7a1f24;
        --hr-line: #555555;
        --link-color: #004a9c;
        --accent-text: #ffffff;
        --transition-speed: 0.3s;
        --max-width: 600px;
      }
      
      [data-theme="dark"] {
        --bg-color: #121212;
        --text-color: #e0e0e0;
        --card-bg: #1e1e1e;
        --header-bg: #0d47a1;
        --header-text: #ffffff;
        --accent-color: #90caf9;
        --accent-hover: #64b5f6;
        --dots-color: #bbbbbb;
        --offline-bg: #442222;
        --offline-text: #ffb7b7;
        --hr-line: #666666;
        --link-color: #90caf9;
      }
      
      /* Prevent flash during load */
      body {
        background-color: var(--bg-color);
        color: var(--text-color);
        transition: background-color 0.2s, color 0.2s;
      }
    `;

    const style = document.createElement("style");
    style.textContent = criticalCSS;
    document.head.appendChild(style);
  } catch (e) {
    // Silent failure - let normal theme.js handle it
  }
})();
