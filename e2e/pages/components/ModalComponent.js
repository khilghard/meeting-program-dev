/**
 * ModalComponent - Encapsulates modal interactions
 * Handles: help, share, language, manage profiles, and confirm modals
 */

export class ModalComponent {
  constructor(page) {
    this.page = page;

    // Help modal
    this.helpModal = page.locator("#help-modal");
    this.helpModalTitle = page.locator("#help-modal-title");
    this.closeHelpModalBtn = page.locator("#close-help-modal-btn");

    // Share modal
    this.shareModal = page.locator("#share-modal");
    this.closeShareModalBtn = page.locator("#close-share-modal-btn");
    this.shareUrlDisplay = page.locator("#share-url-display");
    this.shareCopyBtn = page.locator("#share-copy-btn");

    // Language modal
    this.languageModal = page.locator("#language-modal");
    this.languageItems = page.locator(".language-item");
    this.closeLanguageModalBtn = page.locator("#close-language-modal-btn");

    // Manage profiles modal
    this.manageProfilesModal = page.locator("#manage-profiles-modal");
    this.profilesList = page.locator("#profiles-list");
    this.closeModalBtn = page.locator("#close-modal-btn");
    this.addProfileBtn = page.locator("#add-profile-btn");

    // Confirm modal
    this.confirmModal = page.locator("#confirm-modal");
    this.confirmMessage = page.locator("#confirm-message");
    this.confirmBtn = page.locator("#confirm-btn");
    this.cancelBtn = page.locator("#cancel-btn");
  }

  // Help modal
  async closeHelp() {
    if (await this.helpModal.isVisible({ timeout: 2000 }).catch(() => false)) {
      await this.closeHelpModalBtn.click();
      await this.page.waitForTimeout(300);
    }
  }

  async isHelpModalOpen() {
    return this.helpModal.isVisible({ timeout: 1000 }).catch(() => false);
  }

  async getHelpTitle() {
    return this.helpModalTitle.textContent();
  }

  // Share modal
  async closeShare() {
    if (await this.shareModal.isVisible({ timeout: 2000 }).catch(() => false)) {
      await this.closeShareModalBtn.click();
      await this.page.waitForTimeout(300);
    }
  }

  async isShareModalOpen() {
    return this.shareModal.isVisible({ timeout: 1000 }).catch(() => false);
  }

  async getShareUrl() {
    return this.shareUrlDisplay.inputValue();
  }

  async copyShareUrl() {
    await this.shareCopyBtn.click();
    await this.page.waitForTimeout(300);
  }

  // Language modal
  async isLanguageModalOpen() {
    return this.languageModal.isVisible({ timeout: 1000 }).catch(() => false);
  }

  async selectLanguage(languageName) {
    const langItem = this.page.locator(`.language-item:has-text("${languageName}")`);
    await langItem.click();
    await this.page.waitForTimeout(500);
  }

  async getAvailableLanguages() {
    const items = await this.languageItems.all();
    const languages = [];
    for (const item of items) {
      languages.push(await item.textContent());
    }
    return languages;
  }

  async closeLanguageModal() {
    if (await this.languageModal.isVisible({ timeout: 2000 }).catch(() => false)) {
      await this.closeLanguageModalBtn.click();
      await this.page.waitForTimeout(300);
    }
  }

  // Manage profiles modal
  async isManageProfilesModalOpen() {
    return this.manageProfilesModal.isVisible({ timeout: 1000 }).catch(() => false);
  }

  async closeManageProfiles() {
    if (await this.manageProfilesModal.isVisible({ timeout: 2000 }).catch(() => false)) {
      await this.closeModalBtn.click();
      await this.page.waitForTimeout(300);
    }
  }

  async getProfilesList() {
    const items = await this.profilesList.locator("li").all();
    const profiles = [];
    for (const item of items) {
      profiles.push(await item.textContent());
    }
    return profiles;
  }

  async clickAddProfile() {
    await this.addProfileBtn.click();
  }

  // Confirm modal
  async isConfirmModalOpen() {
    return this.confirmModal.isVisible({ timeout: 1000 }).catch(() => false);
  }

  async getConfirmMessage() {
    return this.confirmMessage.textContent();
  }

  async confirm() {
    await this.confirmBtn.click();
    await this.page.waitForTimeout(300);
  }

  async cancel() {
    await this.cancelBtn.click();
    await this.page.waitForTimeout(300);
  }

  // Generic modal closing
  async closeAnyOpenModal() {
    if (await this.helpModal.isVisible({ timeout: 500 }).catch(() => false)) {
      await this.closeHelp();
    }
    if (await this.shareModal.isVisible({ timeout: 500 }).catch(() => false)) {
      await this.closeShare();
    }
    if (await this.languageModal.isVisible({ timeout: 500 }).catch(() => false)) {
      await this.closeLanguageModal();
    }
    if (await this.manageProfilesModal.isVisible({ timeout: 500 }).catch(() => false)) {
      await this.closeManageProfiles();
    }
    if (await this.confirmModal.isVisible({ timeout: 500 }).catch(() => false)) {
      await this.cancel();
    }
  }
}
