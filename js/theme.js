/**
 * theme.js
 * Theme management functions
 * Uses IndexedDB for persistence (v2.2.0+)
 */

const THEME_KEY = "userPreference_theme";

// Dependency injection for testing
let getMetadataFn = null;
let setMetadataFn = null;

export function setMetadataDependencies(getMetadata, setMetadata) {
  getMetadataFn = getMetadata;
  setMetadataFn = setMetadata;
}

async function getThemeFromStorage() {
  try {
    // Try localStorage first (fast, synchronous)
    const localTheme = localStorage.getItem(THEME_KEY);
    if (localTheme) return localTheme;

    // Fallback to IndexedDB for persistence across sessions
    const getMetadata = getMetadataFn || (await import("./data/IndexedDBManager.js")).getMetadata;
    const idbTheme = await getMetadata(THEME_KEY);

    // Sync IndexedDB to localStorage for faster future access
    if (idbTheme) {
      localStorage.setItem(THEME_KEY, idbTheme);
    }

    return idbTheme;
  } catch {
    return null;
  }
}

async function setThemeInStorage(theme) {
  try {
    // Set in both localStorage (fast) and IndexedDB (persistent)
    localStorage.setItem(THEME_KEY, theme);

    const setMetadata = setMetadataFn || (await import("./data/IndexedDBManager.js")).setMetadata;
    await setMetadata(THEME_KEY, theme);
  } catch {
    console.warn("[theme] Failed to save theme to storage");
  }
}

export async function initTheme() {
  const savedTheme = await getThemeFromStorage();
  const mediaQuery =
    typeof globalThis.window !== "undefined" && typeof globalThis.window.matchMedia === "function"
      ? globalThis.window.matchMedia("(prefers-color-scheme: dark)")
      : null;

  const applyTheme = (theme) => {
    document.documentElement.dataset.theme = theme;
  };

  let theme = savedTheme;
  if (!theme) {
    theme = mediaQuery?.matches ? "dark" : "light";
  }
  applyTheme(theme);

  const toggleBtn = document.getElementById("theme-toggle");
  if (toggleBtn) {
    toggleBtn.onclick = async () => {
      const currentTheme = document.documentElement.dataset.theme;
      const newTheme = currentTheme === "dark" ? "light" : "dark";
      applyTheme(newTheme);
      await setThemeInStorage(newTheme);
    };
  }

  mediaQuery?.addEventListener("change", async (e) => {
    const currentStored = await getThemeFromStorage();
    if (!currentStored) {
      applyTheme(e.matches ? "dark" : "light");
    }
  });
}

export async function toggleTheme() {
  const currentTheme = document.documentElement.dataset.theme;
  const newTheme = currentTheme === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = newTheme;
  await setThemeInStorage(newTheme);
  return newTheme;
}

export function getTheme() {
  return document.documentElement.dataset.theme || "light";
}

export function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
}
