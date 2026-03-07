/**
 * ArchiveListComponent - Encapsulates archive list view
 * Handles: archive picker, switching weeks, viewing archives
 */

export class ArchiveListComponent {
  constructor(page) {
    this.page = page;

    // Archive view containers
    this.archiveList = page.locator("#archive-list, .archive-list");
    this.archiveItems = page.locator(".archive-item, li[data-archive]");
    this.noArchivesMessage = page.locator("text=No archived programs, .no-archives");

    // Archive entry elements
    this.archiveDate = page.locator(".archive-date, .archive-week");
    this.archiveUnitName = page.locator(".archive-unit-name, .archive-title");
    this.viewArchiveBtn = page.locator("button:has-text('View'), .view-archive-btn");
    this.deleteArchiveBtn = page.locator("button:has-text('Delete'), .delete-archive-btn");

    // Week/date navigation
    this.thisWeekBtn = page.locator("button:has-text('This Week'), .this-week-btn");
    this.lastWeekBtn = page.locator("button:has-text('Last Week'), .last-week-btn");
    this.datePickerBtn = page.locator(".date-picker-btn, #date-picker");
  }

  // Archive listing
  async getArchives() {
    const items = await this.archiveItems.all();
    const archives = [];
    for (const item of items) {
      const dateEl = item.locator(".archive-date, .archive-week");
      const nameEl = item.locator(".archive-unit-name, .archive-title");
      const date = await dateEl.textContent().catch(() => "Unknown");
      const name = await nameEl.textContent().catch(() => "Unknown");
      archives.push({
        element: item,
        date,
        name,
      });
    }
    return archives;
  }

  async getArchiveCount() {
    return this.archiveItems.count();
  }

  async selectArchiveByDate(dateText) {
    const archive = this.page
      .locator(`.archive-item:has(.archive-date:has-text("${dateText}"))`)
      .or(this.page.locator(`.archive-item:has-text("${dateText}")`))
      .first();
    return archive;
  }

  // Archive operations
  async switchToThisWeek() {
    await this.thisWeekBtn.click({ timeout: 5000 });
    await this.page.waitForTimeout(300);
  }

  async switchToLastWeek() {
    await this.lastWeekBtn.click({ timeout: 5000 });
    await this.page.waitForTimeout(300);
  }

  async viewArchiveByDate(dateText) {
    const archive = await this.selectArchiveByDate(dateText);
    const viewBtn = archive.locator("button:has-text('View'), .view-archive-btn");
    await viewBtn.click();
    await this.page.waitForTimeout(500);
  }

  async deleteArchiveByDate(dateText) {
    const archive = await this.selectArchiveByDate(dateText);
    const deleteBtn = archive.locator("button:has-text('Delete'), .delete-archive-btn");
    await deleteBtn.click();
    await this.page.waitForTimeout(500);
  }

  async getFirstArchive() {
    return this.archiveItems.first();
  }

  async viewFirstArchive() {
    const firstArchive = this.archiveItems.first();
    const viewBtn = firstArchive.locator("button:has-text('View'), .view-archive-btn");
    await viewBtn.click();
    await this.page.waitForTimeout(500);
  }

  // Checks
  async hasArchives() {
    return (await this.getArchiveCount()) > 0;
  }

  async isEmpty() {
    const message = await this.noArchivesMessage.isVisible({ timeout: 1000 }).catch(() => false);
    const count = await this.getArchiveCount();
    return message || count === 0;
  }

  async isVisible() {
    return this.archiveList.isVisible();
  }

  // Wait for archives to load
  async waitForArchivesToLoad(timeout = 5000) {
    await this.page.waitForFunction(
      () => document.querySelectorAll(".archive-item, li[data-archive]").length > 0,
      { timeout }
    );
  }
}
