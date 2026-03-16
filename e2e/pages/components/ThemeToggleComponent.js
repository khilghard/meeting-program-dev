/**
 * ThemeToggleComponent - Encapsulates theme toggle functionality
 * Handles: theme selection, current theme retrieval, theme application
 */

export class ThemeToggleComponent {
  constructor(page) {
    this.page = page;

    this.toggleBtn = page.locator("#theme-toggle, .theme-toggle, button[aria-label*='theme' i]");
    this.themeIndicator = page.locator("[data-theme], .theme-indicator");
  }

  // Theme operations
  async toggle() {
    await this.toggleBtn.click();
    await this.page.waitForTimeout(300);
  }

  async getCurrentTheme() {
    return this.page.locator("html").getAttribute("data-theme");
  }

  async setTheme(themeName) {
    const currentTheme = await this.getCurrentTheme();
    if (currentTheme !== themeName) {
      // Toggle until we reach desired theme (assumes binary light/dark)
      await this.toggle();
      await this.page.waitForTimeout(300);
    }
  }

  async isLight() {
    const theme = await this.getCurrentTheme();
    return theme === "light" || theme === "light-mode";
  }

  async isDark() {
    const theme = await this.getCurrentTheme();
    return theme === "dark" || theme === "dark-mode";
  }

  async verifyThemeApplied(themeName) {
    const currentTheme = await this.getCurrentTheme();
    return currentTheme === themeName || currentTheme.includes(themeName.toLowerCase());
  }

  // Style verification
  async getBackgroundColor() {
    return this.page
      .locator("body, html")
      .first()
      .evaluate((el) => window.getComputedStyle(el).backgroundColor);
  }

  async getTextColor() {
    return this.page
      .locator("body, html")
      .first()
      .evaluate((el) => window.getComputedStyle(el).color);
  }

  async isToggleVisible() {
    return this.toggleBtn.isVisible();
  }
}
