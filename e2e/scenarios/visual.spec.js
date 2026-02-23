import { test, expect } from '@playwright/test';
import { mockGoogleSheets } from '../helpers/mock-sheets.js';
import AxeBuilder from '@axe-core/playwright';

test.describe('Visual Verification', () => {
    test.beforeEach(async ({ page }) => {
        await mockGoogleSheets(page);
        await page.addInitScript(() => {
            const style = document.createElement('style');
            style.innerHTML = `
                * {
                    transition: none !important;
                    animation: none !important;
                }
            `;
            document.head.appendChild(style);
        });
    });

    test('Theme and Mobile Layout Check', async ({ page }) => {
        await page.goto('.');
        await page.evaluate(() => {
            localStorage.setItem('sheetUrl', 'https://docs.google.com/spreadsheets/d/test123/gviz/tq?tqx=out:csv');
        });
        await page.reload();
        await page.waitForSelector('.leader-of-dots');

        // Light Mode
        await page.screenshot({ path: `e2e/screenshots/${test.info().project.name}-light.png`, fullPage: true });

        // Dark Mode
        await page.click('#theme-toggle');
        await page.waitForTimeout(500);
        await page.screenshot({ path: `e2e/screenshots/${test.info().project.name}-dark.png`, fullPage: true });

        // Ensure dots visible
        const dots = page.locator('.dots').first();
        const box = await dots.boundingBox();
        expect(box.width).toBeGreaterThan(10);
    });
});
