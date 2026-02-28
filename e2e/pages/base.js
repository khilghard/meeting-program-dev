/**
 * Base Page Object Model
 * Common methods and locators shared across all pages
 */

import { test as base } from "@playwright/test";

export class BasePage {
  constructor(page) {
    this.page = page;
  }

  // Navigation
  async goto(path = "") {
    const baseUrl = process.env.BASE_URL || "http://localhost:8000/meeting-program/";
    await this.page.goto(`${baseUrl}${path}`);
    await this.page.waitForLoadState("load");
  }

  async reload() {
    await this.page.reload();
    await this.page.waitForLoadState("load");
  }

  // Storage
  async clearAllStorage() {
    await this.page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
      indexedDB.deleteDatabase("MeetingProgramDB");
    });
    await this.page.evaluate(() => {
      localStorage.setItem("meeting_program_help_shown", "true");
    });
  }

  // Common waits
  async waitForInit() {
    await this.page.waitForTimeout(2000);
  }

  async waitForModal(element) {
    await element.waitFor({ state: "visible", timeout: 5000 });
  }

  // Dialog handling
  async acceptDialog() {
    this.page.on("dialog", (dialog) => dialog.accept());
  }

  // Offline mode
  async goOffline() {
    await this.page.context().setOffline(true);
    await this.page.waitForTimeout(1000);
  }

  async goOnline() {
    await this.page.context().setOffline(false);
    await this.page.waitForTimeout(1000);
  }
}

export { base };
