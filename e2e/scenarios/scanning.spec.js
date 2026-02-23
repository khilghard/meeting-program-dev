import { expect } from '@playwright/test';
import { test } from '../fixtures/base.js';
import { mockQRCodeScan, enableQRMock, startQRScanner } from '../helpers/mock-qr.js';
import { mockGoogleSheets, mockGoogleSheetsError } from '../helpers/mock-sheets.js';

test.describe('QR Code Scanning & Import', () => {

    test.beforeEach(async ({ page }) => {
        await page.evaluate(() => localStorage.clear());
    });

    test('should show scan button on first visit', async ({ page }) => {
        const scanBtn = page.locator('#qr-action-btn');
        await expect(scanBtn).toBeVisible();
        await expect(scanBtn).toHaveText('Scan Program QR Code');
    });

    test('should open camera when scan button clicked', async ({ page }) => {
        await page.click('#qr-action-btn');
        await expect(page.locator('#qr-scanner')).toBeVisible();
        await expect(page.locator('#qr-video')).toBeVisible();
    });

    test('should scan valid QR code, prompt modal, and add program', async ({ page }) => {
        await mockGoogleSheets(page, 'minimal-program');
        const testSheetUrl = 'https://docs.google.com/spreadsheets/d/test123/gviz/tq?tqx=out:csv';
        await mockQRCodeScan(page, testSheetUrl);
        await enableQRMock(page);

        await startQRScanner(page);

        // Confirmation Modal
        const modal = page.locator('#confirm-program-modal');
        await expect(modal).toBeVisible({ timeout: 10000 });

        // Modal Content
        await expect(page.locator('#new-program-name')).toContainText('Test Ward');

        // Add
        await page.click('#confirm-add-btn');

        // Verify Loaded
        await page.waitForSelector('#unitname', { timeout: 10000 });
        await expect(page.locator('#unitname')).toHaveText('Test Ward');
    });

    test('should NOT add program when modal is cancelled', async ({ page }) => {
        await mockGoogleSheets(page, 'minimal-program');
        const sheetUrl = 'https://docs.google.com/spreadsheets/d/test-cancel/gviz/tq?tqx=out:csv';
        await mockQRCodeScan(page, sheetUrl);
        await enableQRMock(page);

        await startQRScanner(page);

        const modal = page.locator('#confirm-program-modal');
        await expect(modal).toBeVisible();

        await page.click('#cancel-add-btn');
        await expect(modal).toBeHidden();

        const profiles = await page.evaluate(() => JSON.parse(localStorage.getItem('meeting_program_profiles') || '[]'));
        expect(profiles).toHaveLength(0);
        await expect(page.locator('#qr-action-btn')).toHaveText('Scan Program QR Code');
    });

    test('should update existing program instead of creating duplicate', async ({ page, isMobile }) => {
        test.fixme(isMobile, 'Flaky on mobile emulation due to mock/reload interaction');
        const sheetUrl = 'https://docs.google.com/spreadsheets/d/test-duplicate/gviz/tq?tqx=out:csv';

        // Seed
        await page.evaluate((url) => {
            localStorage.setItem('meeting_program_profiles', JSON.stringify([{
                id: 'p1', url: url, unitName: 'Old Name', stakeName: 'Old Stake', lastUsed: 1000
            }]));
            localStorage.setItem('meeting_program_selected_id', 'p1');
        }, sheetUrl);

        // Use context-level routing (persists across reloads)
        await page.context().route(/\/gviz\/tq.*tqx=out:csv/, async route => {
            await route.fulfill({
                status: 200,
                contentType: 'text/csv',
                body: 'key,value\nunitName,Old Name\nstakeName,Old Stake'
            });
        });

        await page.reload();

        // Update the route to return new data for the QR scan
        await page.context().unroute(/\/gviz\/tq.*tqx=out:csv/);
        await page.context().route(/\/gviz\/tq.*tqx=out:csv/, async route => {
            await route.fulfill({
                status: 200,
                contentType: 'text/csv',
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': '*'
                },
                body: 'key,value\nunitName,New Name\nstakeName,New Stake'
            });
        });

        await mockQRCodeScan(page, sheetUrl);
        await enableQRMock(page);
        await startQRScanner(page);

        // Verify Update Prompt
        const modal = page.locator('#confirm-program-modal');
        await expect(modal).toBeVisible();
        await expect(page.locator('#new-program-name')).toContainText('New Name');

        await page.click('#confirm-add-btn');

        const profiles = await page.evaluate(() => JSON.parse(localStorage.getItem('meeting_program_profiles') || '[]'));
        expect(profiles).toHaveLength(1);
        expect(profiles[0].unitName).toBe('New Name');
    });

    test('should handle network failure during scan gracefully', async ({ page }) => {
        // Simulating network failure via route abort
        await page.route('**/*tqx=out:csv', route => route.abort('failed'));

        // Must use a valid URL structure to pass checks in qr.js
        await mockQRCodeScan(page, 'https://docs.google.com/spreadsheets/d/fail/gviz/tq?tqx=out:csv');
        await enableQRMock(page);

        let dialogBlocked = false;
        page.on('dialog', dialog => {
            dialogBlocked = true;
            dialog.accept();
        });

        await startQRScanner(page);

        const modal = page.locator('#confirm-program-modal');
        await expect(modal).toBeHidden();

        // Wait up to 5s for the alert to trigger (retry loop)
        await expect.poll(() => dialogBlocked, { timeout: 5000 }).toBe(true);
    });

    test('should cancel scanning state', async ({ page }) => {
        await page.click('#qr-action-btn');
        await expect(page.locator('#qr-scanner')).toBeVisible();
        await expect(page.locator('#qr-action-btn')).toHaveText('Cancel');

        await page.click('#qr-action-btn');
        await expect(page.locator('#qr-scanner')).toBeHidden();
        await expect(page.locator('#qr-action-btn')).toHaveText('Scan Program QR Code');
    });

    test('should reject invalid QR code', async ({ page }) => {
        await mockQRCodeScan(page, 'https://example.com/not-a-sheet');
        await startQRScanner(page);
        await enableQRMock(page);

        await expect(page.locator('#qr-output')).toContainText('Invalid QR code');
    });
});
