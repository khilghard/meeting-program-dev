/**
 * Base Page Object Model
 * Common methods and locators shared across all pages
 */

import { test as base, expect } from "@playwright/test";

export class BasePage {
  constructor(page) {
    this.page = page;
    this.consoleErrors = [];
    this.consoleWarnings = [];
    this._setupConsoleTracking();
  }

  // Console error tracking
  _setupConsoleTracking() {
    this.page.on("console", (msg) => {
      if (msg.type() === "error") {
        this.consoleErrors.push(msg.text());
      } else if (msg.type() === "warning") {
        this.consoleWarnings.push(msg.text());
      }
    });

    this.page.on("pageerror", (exception) => {
      this.consoleErrors.push(`Page Error: ${exception.message}`);
    });
  }

  getConsoleErrors() {
    return this.consoleErrors;
  }

  getConsoleWarnings() {
    return this.consoleWarnings;
  }

  clearConsoleErrors() {
    this.consoleErrors = [];
  }

  clearConsoleWarnings() {
    this.consoleWarnings = [];
  }

  async expectNoConsoleErrors(ignorePatterns = []) {
    const errors = this.consoleErrors.filter((err) => {
      return !ignorePatterns.some((pattern) => {
        if (typeof pattern === "string") {
          return err.includes(pattern);
        }
        return pattern.test(err);
      });
    });

    if (errors.length > 0) {
      throw new Error(`Unexpected console errors found:\n${errors.map((e) => `  - ${e}`).join("\n")}`);
    }
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

  // Storage injection helpers
  async injectLocalStorage(data) {
    await this.page.evaluate((storageData) => {
      Object.keys(storageData).forEach((key) => {
        localStorage.setItem(key, JSON.stringify(storageData[key]));
      });
    }, data);
  }

  async injectIndexedDB(dbName, stores) {
    // This is complex; typically handled by fixtures
    // For now, provides the interface for future enhancement
    throw new Error("injectIndexedDB requires fixture setup; use fixtures instead");
  }

  // Page verification helpers
  async verifyPageLoad() {
    await this.page.waitForLoadState("load");
    await this.page.waitForTimeout(1000);
  }

  async getPageTitle() {
    return this.page.title();
  }

  async getPageUrl() {
    return this.page.url();
  }

  async isPageReady() {
    return this.page.evaluate(() => {
      return document.readyState === "complete";
    });
  }
}

export { base };
