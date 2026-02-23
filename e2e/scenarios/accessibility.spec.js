import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mockGoogleSheets } from '../helpers/mock-sheets.js';

test.describe('Accessibility', () => {

    /** @todo: fix accessibility issues */
    test('should not have automatically detectable accessibility issues', async ({ page }) => {
        await mockGoogleSheets(page, 'full-program');
        const sheetUrl = 'https://docs.google.com/spreadsheets/d/test123/gviz/tq?tqx=out:csv';
        await page.goto(`?url=${encodeURIComponent(sheetUrl)}`);

        await page.waitForSelector('#unitname');
        await page.waitForSelector('.loading-container', { state: 'hidden' });
        await page.waitForSelector('#main-program');
        await page.waitForSelector('.leader-of-dots');

        const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
        expect(accessibilityScanResults.violations).toEqual([]);
    });

    test('external links should have target="_blank"', async ({ page }) => {
        await mockGoogleSheets(page, 'full-program');
        const sheetUrl = 'https://docs.google.com/spreadsheets/d/test123/gviz/tq?tqx=out:csv';
        await page.goto(`?url=${encodeURIComponent(sheetUrl)}`);
        await page.waitForSelector('#unitname');
        await page.waitForSelector('a[href^="http"]', { timeout: 5000 });

        const links = await page.locator('a[href^="http"]').all();
        for (const link of links) {
            expect(await link.getAttribute('target')).toBe('_blank');
        }
    });

    test('images should have role or alt attributes', async ({ page }) => {
        await mockGoogleSheets(page, 'full-program');
        const sheetUrl = 'https://docs.google.com/spreadsheets/d/test123/gviz/tq?tqx=out:csv';
        await page.goto(`?url=${encodeURIComponent(sheetUrl)}`);
        await page.waitForSelector('#unitname');

        const images = await page.locator('img').all();
        for (const img of images) {
            const role = await img.getAttribute('role');
            const alt = await img.getAttribute('alt');
            expect(role || alt).toBeTruthy();
        }
    });
});
