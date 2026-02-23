import { expect } from '@playwright/test';
import { test } from '../fixtures/base.js';
import { mockGoogleSheets, mockGoogleSheetsError } from '../helpers/mock-sheets.js';

test.describe('Offline Mode', () => {
    test.beforeEach(async ({ page }) => {
        await page.evaluate(() => localStorage.clear());
    });

    test('should show cached program when offline', async ({ page, context }) => {
        await mockGoogleSheets(page, 'minimal-program');
        const sheetUrl = 'https://docs.google.com/spreadsheets/d/test123/gviz/tq?tqx=out:csv';

        await page.goto(`?url=${encodeURIComponent(sheetUrl)}`);
        await page.waitForSelector('#unitname');
        await expect(page.locator('#unitname')).toHaveText('Test Ward');

        await context.setOffline(true);
        await page.context().route(/\/gviz\/tq/, route => route.abort('internetdisconnected'));
        await page.reload();

        await expect(page.locator('#unitname')).toHaveText('Test Ward');
        await expect(page.locator('#offline-banner')).toBeVisible();
        await expect(page.locator('#offline-banner')).toContainText('offline mode');
    });

    test('should hide offline banner when back online', async ({ page, context }) => {
        await mockGoogleSheets(page, 'minimal-program');
        const sheetUrl = 'https://docs.google.com/spreadsheets/d/test123/gviz/tq?tqx=out:csv';

        await page.goto(`?url=${encodeURIComponent(sheetUrl)}`);
        await page.waitForSelector('#unitname');

        await context.setOffline(true);
        await page.context().route(/\/gviz\/tq/, route => route.abort('internetdisconnected'));
        await page.reload();
        await expect(page.locator('#offline-banner')).toBeVisible();

        await context.setOffline(false);
        await page.evaluate(() => window.dispatchEvent(new Event('online')));
        await expect(page.locator('#offline-banner')).toBeHidden();
    });

    test('should show error when offline with no cache', async ({ page, context }) => {
        const sheetUrl = 'https://docs.google.com/spreadsheets/d/test123/gviz/tq?tqx=out:csv';
        await page.goto('');
        await page.evaluate(() => localStorage.clear());

        await context.setOffline(true);
        await page.goto(`?url=${encodeURIComponent(sheetUrl)}`);

        await expect(page.locator('#main-program')).toContainText('Unable to load program');
    });

    test('should handle network errors gracefully', async ({ page }) => {
        await mockGoogleSheetsError(page, 404, 'Not Found');
        const sheetUrl = 'https://docs.google.com/spreadsheets/d/test123/gviz/tq?tqx=out:csv';
        await page.goto(`?url=${encodeURIComponent(sheetUrl)}`);
        await expect(page.locator('#main-program')).toBeVisible();
    });
});
