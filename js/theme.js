/**
 * theme.js
 * Theme management functions
 */

export function initTheme() {
  const savedTheme = localStorage.getItem("theme");
  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

  const applyTheme = (theme) => {
    document.documentElement.setAttribute("data-theme", theme);
  };

  // Determine initial theme
  let theme = savedTheme;
  if (!theme) {
    theme = mediaQuery.matches ? "dark" : "light";
  }
  applyTheme(theme);

  // Setup Toggle Button
  const toggleBtn = document.getElementById("theme-toggle");
  if (toggleBtn) {
    toggleBtn.onclick = () => {
      const currentTheme = document.documentElement.getAttribute("data-theme");
      const newTheme = currentTheme === "dark" ? "light" : "dark";
      applyTheme(newTheme);
      localStorage.setItem("theme", newTheme);
    };
  }

  // Listen for system changes
  mediaQuery.addEventListener("change", (e) => {
    if (!localStorage.getItem("theme")) {
      applyTheme(e.matches ? "dark" : "light");
    }
  });
}

export function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute("data-theme");
  const newTheme = currentTheme === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", newTheme);
  localStorage.setItem("theme", newTheme);
}

export function getTheme() {
  return document.documentElement.getAttribute("data-theme") || "light";
}

export function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
}
