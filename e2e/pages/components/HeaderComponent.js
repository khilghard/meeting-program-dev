/**
 * HeaderComponent - Encapsulates header UI interactions
 * Handles: language selection, profile dropdown, theme toggle, QR/archive/share buttons
 */

export class HeaderComponent {
  constructor(page) {
    this.page = page;

    // Header display elements
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

    // Language selector
    this.languageSelectorBtn = page.locator("#language-selector-btn");
    this.currentLanguageText = page.locator("#current-language-text");

    // Profile selector
    this.profileSelector = page.locator("#profile-selector");
    this.profileSelectorContainer = page.locator("#profile-selector-container");
  }

  // Language operations
  async openLanguageSelector() {
    await this.languageSelectorBtn.click();
    // Modal will be handled by ModalComponent
  }

  async getLanguageButtonText() {
    return this.languageSelectorBtn.textContent();
  }

  async getCurrentLanguageDisplay() {
    return this.currentLanguageText.textContent();
  }

  // Theme operations
  async toggleTheme() {
    await this.themeToggle.click();
    await this.page.waitForTimeout(300);
  }

  async getCurrentTheme() {
    return this.page.locator("html").getAttribute("data-theme");
  }

  // Profile operations
  async selectProfile(profileLabel) {
    await this.profileSelector.selectOption({ label: profileLabel });
    await this.page.waitForTimeout(300);
  }

  async getSelectedProfile() {
    return this.profileSelector.evaluate((el) => el.value);
  }

  async getProfileOptions() {
    const options = await this.profileSelector.locator("option").all();
    const labels = [];
    for (const opt of options) {
      labels.push(await opt.textContent());
    }
    return labels;
  }

  // Navigation buttons
  async openQrScanner() {
    await this.qrActionBtn.click();
  }

  async openArchives() {
    await this.viewArchivesBtn.click();
  }

  async openShare() {
    await this.shareBtn.click();
  }

  async print() {
    await this.printBtn.click();
  }

  async openManageProfiles() {
    await this.manageProfilesBtn.click();
  }

  // Header info retrieval
  async getUnitName() {
    return this.unitName.textContent();
  }

  async getDate() {
    return this.date.textContent();
  }

  async getUnitAddress() {
    return this.unitAddress.textContent();
  }

  // Visibility checks
  async isQrButtonVisible() {
    return this.qrActionBtn.isVisible();
  }

  async isArchivesButtonVisible() {
    return this.viewArchivesBtn.isVisible();
  }

  async isProfileSelectorVisible() {
    return this.profileSelectorContainer.isVisible();
  }
}
