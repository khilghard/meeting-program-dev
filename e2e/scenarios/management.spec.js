import { expect } from '@playwright/test';
import { test } from '../fixtures/base.js';
import { mockGoogleSheets } from '../helpers/mock-sheets.js';

test.describe('Program Management', () => {

    test.beforeEach(async ({ page }) => {
        await page.evaluate(() => localStorage.clear());
    });

    test('should allow switching between programs', async ({ page }) => {
        await page.evaluate(() => {
            const profiles = [
                { id: 'p1', url: 'https://sheet1', unitName: 'Ward A', stakeName: 'Stake A', lastUsed: 1000 },
                { id: 'p2', url: 'https://sheet2', unitName: 'Ward B', stakeName: 'Stake B', lastUsed: 2000 }
            ];
            localStorage.setItem('meeting_program_profiles', JSON.stringify(profiles));
            localStorage.setItem('meeting_program_selected_id', 'p2');
        });

        // Mock fetch for active program (p2)
        await mockGoogleSheets(page, 'minimal-program');
        await page.reload();

        const selector = page.locator('#profile-selector');
        await expect(selector).toBeVisible();
        await expect(selector).toHaveValue('p2');

        // Switch to p1
        await selector.selectOption('p1');
        await expect(selector).toHaveValue('p1');

        // Verify local storage update
        const selected = await page.evaluate(() => localStorage.getItem('meeting_program_selected_id'));
        expect(selected).toBe('p1');
    });

    test('should allow deleting an inactive program', async ({ page }) => {
        await page.evaluate(() => {
            localStorage.setItem('meeting_program_profiles', JSON.stringify([
                { id: 'p1', url: 'https://sheet1', unitName: 'Ward A', stakeName: 'Stake A' },
                { id: 'p2', url: 'https://sheet2', unitName: 'Ward B', stakeName: 'Stake B' }
            ]));
            localStorage.setItem('meeting_program_selected_id', 'p2');
        });

        await mockGoogleSheets(page, 'minimal-program');
        await page.reload();

        await page.click('#manage-profiles-btn');
        const item = page.locator('.profiles-list li').filter({ hasText: 'Ward A' });
        await expect(item).toBeVisible();

        page.on('dialog', dialog => dialog.accept());
        await item.locator('.delete-btn').click();

        await expect(item).toBeHidden();
        await page.click('#close-modal-btn');
    });

    test('should return to zero state when last program is deleted', async ({ page }) => {
        await page.evaluate(() => {
            localStorage.setItem('meeting_program_profiles', JSON.stringify([{
                id: 'p1', url: 'https://sheet1', unitName: 'Ward A', stakeName: 'Stake A'
            }]));
            localStorage.setItem('meeting_program_selected_id', 'p1');
        });

        await mockGoogleSheets(page, 'minimal-program');
        await page.reload();

        await page.click('#manage-profiles-btn');
        page.on('dialog', dialog => dialog.accept());

        // Deleting active/last program triggers reload
        await Promise.all([
            page.waitForNavigation(),
            page.locator('.delete-btn').click()
        ]);

        // Verify Zero State
        await expect(page.locator('#qr-action-btn')).toBeVisible();
        await expect(page.locator('#unitname')).toBeHidden();

        const profiles = await page.evaluate(() => localStorage.getItem('meeting_program_profiles'));
        expect(JSON.parse(profiles)).toHaveLength(0);
    });

    test('should show scan button when no programs exist (Zero State)', async ({ page }) => {
        await page.goto('.');
        await expect(page.locator('#qr-action-btn')).toBeVisible();
        await expect(page.locator('#main-program')).toBeHidden();
        await expect(page.locator('#profile-selector')).toBeHidden();
    });
});
