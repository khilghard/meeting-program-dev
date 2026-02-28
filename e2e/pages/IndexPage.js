/**
 * IndexPage - Page Object Model for index.html
 * Main program view page
 */

import { BasePage } from "./base.js";

export class IndexPage extends BasePage {
  constructor(page) {
    super(page);
    this.page = page;

    // === LOCATORS ===

    // Header elements
    this.unitName = page.locator("#unitname");
    this.date = page.locator("#date");
    this.unitAddress = page.locator("#unitaddress");

    // Action buttons
    this.qrActionBtn = page.locator("#qr-action-btn");
    this.viewArchivesBtn = page.locator("#view-archives-btn");
    this.shareBtn = page.locator("#share-btn");
    this.printBtn = page.locator("#print-btn");
    this.themeToggle = page.locator("#theme-toggle");
    this.manageProfilesBtn = page.locator("#manage-profiles-btn");

    // Language
    this.languageSelectorBtn = page.locator("#language-selector-btn");
    this.languageModal = page.locator("#language-modal");
    this.currentLanguageText = page.locator("#current-language-text");

    // Profile
    this.profileSelector = page.locator("#profile-selector");
    this.profileSelectorContainer = page.locator("#profile-selector-container");

    // Modals
    this.helpModal = page.locator("#help-modal");
    this.helpModalTitle = page.locator("#help-modal-title");
    this.closeHelpModalBtn = page.locator("#close-help-modal-btn");

    this.shareModal = page.locator("#share-modal");
    this.closeShareModalBtn = page.locator("#close-share-modal-btn");
    this.shareUrlDisplay = page.locator("#share-url-display");

    this.manageProfilesModal = page.locator("#manage-profiles-modal");
    this.profilesList = page.locator("#profiles-list");
    this.closeModalBtn = page.locator("#close-modal-btn");

    // QR Scanner
    this.qrScanner = page.locator("#qr-scanner");
    this.qrVideo = page.locator("#qr-video");

    // Program content
    this.mainProgram = page.locator("#main-program");
    this.programContent = page.locator(".program-content");
  }

  // === ACTIONS ===

  // Help modal
  async closeHelpModal() {
    if (await this.helpModal.isVisible({ timeout: 2000 })) {
      await this.closeHelpModalBtn.click();
      await this.page.waitForTimeout(300);
    }
  }

  async isHelpModalVisible() {
    return this.helpModal.isVisible({ timeout: 2000 });
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

  // Share
  async openShareModal() {
    await this.shareBtn.click();
    await this.shareModal.waitFor({ state: "visible", timeout: 5000 });
  }

  async closeShareModal() {
    await this.closeShareModalBtn.click();
    await this.page.waitForTimeout(300);
  }

  // Manage profiles
  async openManageProfilesModal() {
    await this.manageProfilesBtn.click();
    await this.manageProfilesModal.waitFor({ state: "visible", timeout: 5000 });
  }

  async closeManageProfilesModal() {
    await this.closeModalBtn.click();
    await this.page.waitForTimeout(300);
  }

  // QR Scanner
  async openScanner() {
    await this.qrActionBtn.click();
    await this.qrScanner.waitFor({ state: "visible", timeout: 5000 });
  }

  async closeScanner() {
    // Click the action button again (it becomes "Cancel" when scanner is open)
    await this.qrActionBtn.click();
    await this.page.waitForTimeout(500);
  }

  // Navigation
  async navigateToArchive() {
    await this.viewArchivesBtn.click();
    // Should navigate to archive.html
    await this.page.waitForURL("**/archive.html", { timeout: 5000 });
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

  // === ASSERTS ===

  async expectUnitName(text) {
    await expect(this.unitName).toHaveText(text);
  }

  async expectDateContains(text) {
    await expect(this.date).toContainText(text);
  }

  async expectHelpModalVisible() {
    await expect(this.helpModal).toBeVisible();
  }

  async expectHelpModalHidden() {
    await expect(this.helpModal).toBeHidden();
  }

  async expectQrActionBtnVisible() {
    await expect(this.qrActionBtn).toBeVisible();
  }

  async expectLanguageModalVisible() {
    await expect(this.languageModal).toBeVisible();
  }

  async expectShareModalVisible() {
    await expect(this.shareModal).toBeVisible();
  }

  async expectManageProfilesModalVisible() {
    await expect(this.manageProfilesModal).toBeVisible();
  }

  async expectTheme(expected) {
    await expect(this.page.locator("html")).toHaveAttribute("data-theme", expected);
  }
}

// Re-export expect for convenience
import { expect } from "@playwright/test";
export { expect };
