/**
 * ProgramListComponent - Encapsulates program list view
 * Handles: listing programs, selecting, loading, counting
 */

import { ProgramCardComponent } from "./ProgramCardComponent.js";

export class ProgramListComponent {
  constructor(page) {
    this.page = page;

    this.listContainer = page.locator("#main-program, #program-container, .program-list, [role='main']");
    this.cardElements = page.locator(".program-card, .card, li[role='listitem']");
    this.noProgramsMessage = page.locator("text=No programs, text=No data loaded");
  }

  // Program listing
  async getPrograms() {
    const cards = await this.cardElements.all();
    const programs = [];
    for (const card of cards) {
      const titleEl = card.locator(".program-title, .card-title, h3");
      const title = await titleEl.textContent().catch(() => "Unknown");
      programs.push({
        element: card,
        title: title,
      });
    }
    return programs;
  }

  async getProgramCount() {
    return this.cardElements.count();
  }

  async selectProgramByTitle(title) {
    const card = this.page.locator(`.program-card:has-text("${title}"), .card:has-text("${title}")`).first();
    return new ProgramCardComponent(this.page, card);
  }

  async getFirstProgram() {
    const card = this.cardElements.first();
    return new ProgramCardComponent(this.page, card);
  }

  async getNthProgram(index) {
    const card = this.cardElements.nth(index);
    return new ProgramCardComponent(this.page, card);
  }

  async loadProgramByTitle(title) {
    const program = await this.selectProgramByTitle(title);
    await program.clickLoad();
  }

  async loadNthProgram(index) {
    const program = await this.getNthProgram(index);
    await program.clickLoad();
  }

  // Checks
  async hasPrograms() {
    return (await this.getProgramCount()) > 0;
  }

  async isEmpty() {
    const message = await this.noProgramsMessage.isVisible({ timeout: 1000 }).catch(() => false);
    const count = await this.getProgramCount();
    return message || count === 0;
  }

  async isVisible() {
    return this.listContainer.isVisible();
  }

  // Wait for list to populate
  async waitForProgramsToLoad(timeout = 5000) {
    await this.page.waitForFunction(
      () => document.querySelectorAll(".program-card, .card, li[role='listitem']").length > 0,
      { timeout }
    );
  }
}
