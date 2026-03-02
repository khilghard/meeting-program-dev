/**
 * ArchivePage - Page Object Model for archive.html
 * Archive viewing page
 */

import { BasePage } from "./base.js";

export class ArchivePage extends BasePage {
  constructor(page) {
    super(page);
    this.page = page;

    // === LOCATORS ===

    // Header
    this.archiveTitle = page.locator("#archive-title");
    this.returnToHomeBtn = page.locator("#return-to-home-btn");

    // Profile selector
    this.profileSelector = page.locator("#profile-selector");
    this.profileSelectorContainer = page.locator("#profile-selector-container");

    // Archive list
    this.archiveList = page.locator("#archive-list");
    this.archiveItems = page.locator(".archive-item");
    this.noArchivesMessage = page.locator(".no-archives, text=No archived programs");

    // Language
    this.languageSelectorBtn = page.locator("#language-selector-btn");
    this.languageModal = page.locator("#language-modal");
    this.currentLanguageText = page.locator("#current-language-text");

    // Theme
    this.themeToggle = page.locator("#theme-toggle");

    // Archive entry
    this.archiveDate = page.locator(".archive-date");
    this.archiveUnitName = page.locator(".archive-unit-name");
    this.viewArchiveBtn = page.locator(".archive-item button:has-text('View')");
    this.deleteArchiveBtn = page.locator(".archive-item button:has-text('Delete')");

    // Program display (when viewing an archive)
    this.programContainer = page.locator("#program-container");
    this.unitName = page.locator("#unitname");
    this.date = page.locator("#date");
  }

  // === ACTIONS ===

  // Navigation
  async returnToHome() {
    await this.returnToHomeBtn.click();
    await this.page.waitForURL("**/index.html", { timeout: 5000 });
  }

  async goto() {
    await super.goto("archive.html");
    await this.waitForInit();
  }

  // Language
  async openLanguageSelector() {
    await this.languageSelectorBtn.click();
    await this.languageModal.waitFor({ state: "visible", timeout: 5000 });
  }

  async selectLanguage(language) {
    await this.page.click(`.language-item:has-text("${language}")`);
    await this.page.waitForTimeout(500);
  }

  // Theme
  async toggleTheme() {
    await this.themeToggle.click();
    await this.page.waitForTimeout(500);
  }

  async getTheme() {
    return this.page.locator("html").getAttribute("data-theme");
  }

  // Profile
  async getProfileCount() {
    const options = await this.profileSelector.locator("option").all();
    return options.length;
  }

  async selectProfile(profileName) {
    await this.profileSelector.selectOption({ label: profileName });
    await this.page.waitForTimeout(500);
  }

  // Archive operations
  async getArchiveCount() {
    return this.archiveItems.count();
  }

  async viewArchive(index = 0) {
    const items = await this.archiveItems.all();
    if (items.length > index) {
      const viewBtn = items[index].locator("button:has-text('View')");
      await viewBtn.click();
      await this.page.waitForTimeout(500);
    }
  }

  async deleteArchive(index = 0) {
    this.acceptDialog();
    const items = await this.archiveItems.all();
    if (items.length > index) {
      const deleteBtn = items[index].locator("button:has-text('Delete')");
      await deleteBtn.click();
      await this.page.waitForTimeout(500);
    }
  }

  // === ASSERTS ===

  async expectArchiveTitleVisible() {
    await expect(this.archiveTitle).toBeVisible();
  }

  async expectReturnToHomeVisible() {
    await expect(this.returnToHomeBtn).toBeVisible();
  }

  async expectArchiveListVisible() {
    await expect(this.archiveList).toBeVisible();
  }

  async expectNoArchivesMessage() {
    await expect(this.noArchivesMessage).toBeVisible();
  }

  async expectArchiveCount(count) {
    await expect(this.archiveItems).toHaveCount(count);
  }

  async expectArchiveCountGreaterThan(count) {
    const actualCount = await this.archiveItems.count();
    expect(actualCount).toBeGreaterThan(count);
  }

  async expectProgramLoaded() {
    await expect(this.unitName).toBeVisible();
  }

  async expectTheme(expected) {
    await expect(this.page.locator("html")).toHaveAttribute("data-theme", expected);
  }
}

// Re-export expect for convenience
import { expect } from "@playwright/test";
export { expect };
