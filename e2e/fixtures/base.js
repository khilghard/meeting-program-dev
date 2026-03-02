// fixtures.js
import { test as base } from "@playwright/test";

export const test = base.extend({
  page: async ({ page }, use) => {
    await page.goto("http://localhost:8000/meeting-program/");
    await page.waitForLoadState("load");
    await use(page);
  }
});
