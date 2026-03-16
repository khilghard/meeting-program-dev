/**
 * ArchivePage - Composed page object for archive view
 * Composes: HeaderComponent, ArchiveListComponent, ProgramListComponent, ModalComponent, ThemeToggleComponent
 */

import { BasePage } from "../base.js";
import { HeaderComponent } from "../components/HeaderComponent.js";
import { ModalComponent } from "../components/ModalComponent.js";
import { ArchiveListComponent } from "../components/ArchiveListComponent.js";
import { ProgramListComponent } from "../components/ProgramListComponent.js";
import { ThemeToggleComponent } from "../components/ThemeToggleComponent.js";

export class ArchivePage extends BasePage {
  constructor(page) {
    super(page);
    this.page = page;

    // Compose sub-components
    this.header = new HeaderComponent(page);
    this.modal = new ModalComponent(page);
    this.archiveList = new ArchiveListComponent(page);
    this.programList = new ProgramListComponent(page);
    this.theme = new ThemeToggleComponent(page);

    // Archive view elements
    this.archiveTitle = page.locator("#archive-title, .archive-title");
    this.returnToHomeBtn = page.locator("#return-to-home-btn, .return-home-btn");
    this.archiveContainer = page.locator("#archive-container, .archive-view");
  }

  // Navigation
  async goto() {
    await super.goto("archive.html");
    await this.waitForInit();
  }

  async returnHome() {
    await this.returnToHomeBtn.click();
    await this.page.waitForURL("**/index.html", { timeout: 5000 });
  }

  // Archive operations
  async switchToThisWeek() {
    await this.archiveList.switchToThisWeek();
  }

  async switchToLastWeek() {
    await this.archiveList.switchToLastWeek();
  }

  async viewArchiveByDate(dateText) {
    await this.archiveList.viewArchiveByDate(dateText);
    await this.page.waitForTimeout(1000);
  }

  async loadArchivedProgram(title) {
    const program = await this.programList.selectProgramByTitle(title);
    await program.clickLoad();
    await this.page.waitForTimeout(1000);
  }

  async getAvailableArchives() {
    return this.archiveList.getArchives();
  }

  async getArchiveCount() {
    return this.archiveList.getArchiveCount();
  }

  async hasArchives() {
    return this.archiveList.hasArchives();
  }

  // Theme & Language in archive
  async selectLanguage(language) {
    await this.header.openLanguageSelector();
    await this.modal.selectLanguage(language);
    await this.page.waitForTimeout(1000);
  }

  async toggleTheme() {
    await this.theme.toggle();
  }

  async getCurrentTheme() {
    return this.theme.getCurrentTheme();
  }

  async verifyThemePersists(expectedTheme) {
    const currentTheme = await this.getCurrentTheme();
    return currentTheme === expectedTheme;
  }

  // Profile switching
  async selectProfile(profileLabel) {
    await this.header.selectProfile(profileLabel);
  }

  // Archive verification
  async isArchiveViewVisible() {
    return this.archiveContainer.isVisible();
  }

  async isReady() {
    return (await this.archiveContainer.isVisible()) && (await this.header.isArchivesButtonVisible());
  }

  // Console error checking
  async verifyNoConsoleErrors(ignorePatterns = []) {
    await this.expectNoConsoleErrors(ignorePatterns);
  }
}
