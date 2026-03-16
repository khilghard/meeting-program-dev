/**
 * MainPage - Composed page object for main program view
 * Composes: HeaderComponent, ProgramListComponent, ProgramCardComponent, ModalComponent, ThemeToggleComponent
 */

import { BasePage } from "../base.js";
import { HeaderComponent } from "../components/HeaderComponent.js";
import { ModalComponent } from "../components/ModalComponent.js";
import { ProgramListComponent } from "../components/ProgramListComponent.js";
import { ProgramCardComponent } from "../components/ProgramCardComponent.js";
import { ThemeToggleComponent } from "../components/ThemeToggleComponent.js";

export class MainPage extends BasePage {
  constructor(page) {
    super(page);
    this.page = page;

    // Compose sub-components
    this.header = new HeaderComponent(page);
    this.modal = new ModalComponent(page);
    this.programList = new ProgramListComponent(page);
    this.theme = new ThemeToggleComponent(page);

    // Main content area
    this.mainProgram = page.locator("#main-program, #program-container, [role='main']");
    this.programContent = page.locator(".program-content, .program-details");
  }

  // Navigation
  async goto() {
    await super.goto("index.html");
    await this.waitForInit();
  }

  async loadProgram(title) {
    const program = await this.programList.selectProgramByTitle(title);
    await program.clickLoad();
    await this.page.waitForTimeout(1000);
  }

  async loadFirstProgram() {
    const program = await this.programList.getFirstProgram();
    await program.clickLoad();
    await this.page.waitForTimeout(1000);
  }

  // Program interaction
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

  async goToArchives() {
    await this.header.openArchives();
    await this.page.waitForURL("**/archive.html", { timeout: 5000 });
  }

  // Header info
  async getUnitName() {
    return this.header.getUnitName();
  }

  async getDate() {
    return this.header.getDate();
  }

  async getUnitAddress() {
    return this.header.getUnitAddress();
  }

  // Program list verification
  async hasProgramsLoaded() {
    return this.programList.hasPrograms();
  }

  async getProgramCount() {
    return this.programList.getProgramCount();
  }

  async verifyProgramsLoaded() {
    await this.programList.waitForProgramsToLoad();
    return this.hasProgramsLoaded();
  }

  // Verify main page is ready
  async isReady() {
    return (await this.mainProgram.isVisible()) && (await this.header.isQrButtonVisible());
  }

  async waitForPageReady(timeout = 10000) {
    await this.page.waitForFunction(() => {
      const mainEl = document.querySelector("#main-program, #program-container");
      const headerBtn = document.querySelector("#qr-action-btn");
      return mainEl && headerBtn;
    }, { timeout });
  }

  // Console error checking
  async verifyNoConsoleErrors(ignorePatterns = []) {
    await this.expectNoConsoleErrors(ignorePatterns);
  }
}
