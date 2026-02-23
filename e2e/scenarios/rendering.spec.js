import { expect } from '@playwright/test';
import { test } from '../fixtures/base.js';
import { mockGoogleSheets } from '../helpers/mock-sheets.js';

test.describe('Program Rendering & State', () => {

    test('should load program from URL parameter', async ({ page }) => {
        await mockGoogleSheets(page, 'full-program');
        const sheetUrl = 'https://docs.google.com/spreadsheets/d/test123/gviz/tq?tqx=out:csv';
        await page.goto(`?url=${encodeURIComponent(sheetUrl)}`);

        await page.waitForSelector('#unitname', { timeout: 5000 });
        await expect(page.locator('#unitname')).toHaveText('Unit Name');
        await expect(page.locator('#unitaddress')).toHaveText('123 Actual Ave, City US 123245');
    });

    test('should load program from localStorage (Legacy Support)', async ({ page }) => {
        await mockGoogleSheets(page, 'full-program');
        const sheetUrl = 'https://docs.google.com/spreadsheets/d/test123/gviz/tq?tqx=out:csv';

        await page.goto('.');
        await page.evaluate((url) => localStorage.setItem('sheetUrl', url), sheetUrl);
        await page.reload();

        await expect(page.locator('#unitname')).toHaveText('Unit Name');
    });

    test('should replace tildes with commas in addresses', async ({ page }) => {
        await mockGoogleSheets(page, 'full-program');
        const sheetUrl = 'https://docs.google.com/spreadsheets/d/test123/gviz/tq?tqx=out:csv';
        await page.goto(`?url=${encodeURIComponent(sheetUrl)}`);

        await expect(page.locator('#unitaddress')).toHaveText('123 Actual Ave, City US 123245');
    });

    test('should verify Theme Persistence across reloads', async ({ page }) => {
        await mockGoogleSheets(page, 'full-program');
        const sheetUrl = 'https://docs.google.com/spreadsheets/d/test123/gviz/tq?tqx=out:csv';
        await page.goto(`?url=${encodeURIComponent(sheetUrl)}`);
        await page.waitForSelector('#unitname');

        // Initial State (System preferred or light default)
        // Let's force toggle to DARK

        // Ensure we are in light mode initially (or check current state)
        const html = page.locator('html');
        // await expect(html).not.toHaveAttribute('data-theme', 'dark'); // Depends on system preference

        // Click Toggle
        await page.click('#theme-toggle');
        await expect(html).toHaveAttribute('data-theme', 'dark');

        // Verify LocalStorage
        const theme = await page.evaluate(() => localStorage.getItem('theme'));
        expect(theme).toBe('dark');

        // Reload
        await page.reload();
        await page.waitForSelector('#unitname');

        // Verify still Dark
        await expect(html).toHaveAttribute('data-theme', 'dark');

        // Toggle back to Light
        await page.click('#theme-toggle');
        await expect(html).toHaveAttribute('data-theme', 'light');

        // Reload
        await page.reload();
        await expect(html).toHaveAttribute('data-theme', 'light');
    });

    test('should render all program elements', async ({ page }) => {
        await mockGoogleSheets(page, 'full-program');
        const sheetUrl = 'https://docs.google.com/spreadsheets/d/test123/gviz/tq?tqx=out:csv';
        await page.goto(`?url=${encodeURIComponent(sheetUrl)}`);

        await page.waitForSelector('#unitname');

        // Verify presiding/conducting
        await expect(page.locator('#presiding .value-on-right')).toHaveText('Leader1');
        await expect(page.locator('#conducting .value-on-right')).toHaveText('Leader2');

        // Verify hymns
        await expect(page.locator('#openingHymn .value-on-right')).toHaveText('#62');
        await expect(page.locator('#openingHymn .hymn-title')).toHaveText('All Creatures of Our God and King');

        // Verify speakers
        const speakers = await page.locator('[id^="speaker"]').all();
        expect(speakers.length).toBeGreaterThan(0);
    });

    test('should render leaders with phone numbers', async ({ page }) => {
        await mockGoogleSheets(page, 'full-program');
        const sheetUrl = 'https://docs.google.com/spreadsheets/d/test123/gviz/tq?tqx=out:csv';
        await page.goto(`?url=${encodeURIComponent(sheetUrl)}`);

        await page.waitForSelector('#unitname');

        const leaderRows = await page.locator('#main-program > div:not([id]) .leader-of-dots.hymn-row').all();
        expect(leaderRows.length).toBeGreaterThan(0);

        const firstLeader = leaderRows[0];
        await expect(firstLeader.locator('.label')).toHaveText('John Doe');
        await expect(firstLeader.locator('.value-on-right')).toHaveText('(000) 000-0000');
    });

    test('should render links with images', async ({ page }) => {
        await mockGoogleSheets(page, 'full-program');
        const sheetUrl = 'https://docs.google.com/spreadsheets/d/test123/gviz/tq?tqx=out:csv';
        await page.goto(`?url=${encodeURIComponent(sheetUrl)}`);

        await page.waitForSelector('#unitname');

        const linkWithImage = page.locator('.link-with-space').first();
        await expect(linkWithImage).toBeVisible();

        const img = linkWithImage.locator('img.link-icon');
        await expect(img).toBeVisible();

        const link = linkWithImage.locator('a');
        await expect(link).toBeVisible();
        await expect(link).toHaveAttribute('target', '_blank');
    });
});
