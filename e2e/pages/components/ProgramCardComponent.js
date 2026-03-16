/**
 * ProgramCardComponent - Encapsulates single program card interactions
 * Handles: loading, navigation, title retrieval
 */

export class ProgramCardComponent {
  constructor(page, cardLocator) {
    this.page = page;
    this.cardLocator = cardLocator; // The actual card element

    // Card internals
    this.title = cardLocator.locator(".program-title, .card-title, h3");
    this.loadBtn = cardLocator.locator("button:has-text('Load'), button:has-text('View'), button:has-text('Open')");
    this.topBtn = cardLocator.locator(".go-to-top, .scroll-top, button:has-text('Back to Top')");
  }

  // Card data retrieval
  async getTitle() {
    return this.title.textContent();
  }

  async getCardText() {
    return this.cardLocator.textContent();
  }

  // Card interactions
  async clickLoad() {
    await this.loadBtn.click();
    await this.page.waitForTimeout(500);
  }

  async clickGoToTop() {
    await this.topBtn.click();
    await this.page.waitForTimeout(300);
  }

  // Visibility checks
  async isVisible() {
    return this.cardLocator.isVisible();
  }

  async isLoadButtonVisible() {
    return this.loadBtn.isVisible();
  }

  async isTopButtonVisible() {
    return this.topBtn.isVisible();
  }
}
