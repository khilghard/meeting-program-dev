import { expect } from '@playwright/test';
import { test } from '../fixtures/base.js';
import { mockGoogleSheets } from '../helpers/mock-sheets.js';

test.describe('Advanced Program Management', () => {

    test.beforeEach(async ({ page }) => {
        await page.evaluate(() => localStorage.clear());
    });

    test('should manage 3+ programs: load, switch, reload with updates, and delete only inactive', async ({ page }) => {
        // Setup: Create 3 programs with different data
        const programs = [
            {
                id: 'ward-a',
                url: 'https://docs.google.com/spreadsheets/d/ward-a-id/gviz/tq?tqx=out:csv',
                unitName: 'Ward A',
                unitAddress: 'Alpha Stake',
                csvData: 'key,value\nunitName,Ward A\nunitAddress,Alpha Stake\ndate,Feb 14~ 2026\nopeningHymn,#1 The Morning Breaks'
            },
            {
                id: 'ward-b',
                url: 'https://docs.google.com/spreadsheets/d/ward-b-id/gviz/tq?tqx=out:csv',
                unitName: 'Ward B',
                unitAddress: 'Beta Stake',
                csvData: 'key,value\nunitName,Ward B\nunitAddress,Beta Stake\ndate,Feb 14~ 2026\nopeningHymn,#2 The Spirit of God'
            },
            {
                id: 'ward-c',
                url: 'https://docs.google.com/spreadsheets/d/ward-c-id/gviz/tq?tqx=out:csv',
                unitName: 'Ward C',
                unitAddress: 'Gamma Stake',
                csvData: 'key,value\nunitName,Ward C\nunitAddress,Gamma Stake\ndate,Feb 14~ 2026\nopeningHymn,#3 Now Let Us Rejoice'
            }
        ];

        // Seed localStorage with 3 programs
        await page.evaluate((progs) => {
            const profiles = progs.map((p, idx) => ({
                id: p.id,
                url: p.url,
                unitName: p.unitName,
                unitAddress: p.unitAddress,
                lastUsed: 1000 + idx
            }));
            localStorage.setItem('meeting_program_profiles', JSON.stringify(profiles));
            localStorage.setItem('meeting_program_selected_id', 'ward-c'); // Start with Ward C
        }, programs);

        // Set up context-level routing for all 3 programs
        await page.context().route(/\/gviz\/tq.*tqx=out:csv/, async route => {
            const url = route.request().url();
            const program = programs.find(p => url.includes(p.id));
            if (program) {
                await route.fulfill({
                    status: 200,
                    contentType: 'text/csv',
                    headers: {
                        'Access-Control-Allow-Origin': '*',
                        'Cache-Control': 'no-cache'
                    },
                    body: program.csvData
                });
            } else {
                await route.abort();
            }
        });

        await page.reload();
        await page.waitForLoadState('networkidle');
        await page.waitForLoadState('domcontentloaded');

        // ===== STEP 1: Verify initial load (Ward C) =====
        await expect(page.locator('#unitname')).toHaveText('Ward C', { timeout: 10000 });
        await expect(page.locator('#date')).toHaveText('Feb 14, 2026');
        await expect(page.locator('#profile-selector-container')).toBeVisible();
        await expect(page.locator('#profile-selector')).toBeVisible();
        await expect(page.locator('#profile-selector')).toHaveValue('ward-c');

        // Verify all 3 programs in dropdown
        const options = await page.locator('#profile-selector option').allTextContents();
        expect(options).toHaveLength(3);
        expect(options.some(opt => opt.includes('Ward A'))).toBe(true);
        expect(options.some(opt => opt.includes('Ward B'))).toBe(true);
        expect(options.some(opt => opt.includes('Ward C'))).toBe(true);

        // ===== STEP 2: Switch to Ward A =====
        await page.locator('#profile-selector').selectOption('ward-a');
        await page.waitForLoadState('networkidle');

        await expect(page.locator('#unitname')).toHaveText('Ward A');
        await expect(page.locator('#profile-selector')).toHaveValue('ward-a');

        // Verify content from Ward A
        const wardAUnitName = await page.locator('#unitname').textContent();
        const wardAUnitAddress = await page.locator('#unitaddress').textContent();
        expect(wardAUnitName).toBe('Ward A');
        expect(wardAUnitAddress).toBe('Alpha Stake');
        expect(await page.locator('#main-program').textContent()).toContain('#1The Morning Breaks');

        // ===== STEP 3: Switch to Ward B =====
        await page.locator('#profile-selector').selectOption('ward-b');
        await page.waitForLoadState('networkidle');

        await expect(page.locator('#unitname')).toHaveText('Ward B');
        await expect(page.locator('#profile-selector')).toHaveValue('ward-b');

        // Verify content from Ward B
        const wardBUnitName = await page.locator('#unitname').textContent();
        const wardBUnitAddress = await page.locator('#unitaddress').textContent();
        expect(wardBUnitName).toBe('Ward B');
        expect(wardBUnitAddress).toBe('Beta Stake');
        expect(await page.locator('#main-program').textContent()).toContain('#2The Spirit of God');

        // ===== STEP 4: Update Ward B data and reload =====
        // Update the mock to return new data for Ward B
        await page.context().unroute(/\/gviz\/tq.*tqx=out:csv/);
        await page.context().route(/\/gviz\/tq.*tqx=out:csv/, async route => {
            const url = route.request().url();
            let program = programs.find(p => url.includes(p.id));

            if (program && program.id === 'ward-b') {
                // Return updated data for Ward B
                await route.fulfill({
                    status: 200,
                    contentType: 'text/csv',
                    headers: {
                        'Access-Control-Allow-Origin': '*',
                        'Cache-Control': 'no-cache'
                    },
                    body: 'key,value\nunitName,Ward B Updated\nunitAddress,Beta Stake\ndate,Feb 15~ 2026\nopeningHymn,#4 Truth Eternal'
                });
            } else if (program) {
                await route.fulfill({
                    status: 200,
                    contentType: 'text/csv',
                    headers: {
                        'Access-Control-Allow-Origin': '*',
                        'Cache-Control': 'no-cache'
                    },
                    body: program.csvData
                });
            } else {
                await route.abort();
            }
        });

        // Reload to get updated data
        await page.click('#reload-btn');
        await page.waitForLoadState('networkidle');

        // Verify updated content

        await expect(page.locator('#unitname')).toHaveText('Ward B Updated');
        await expect(page.locator('#date')).toHaveText('Feb 15, 2026');
        const updatedContent = await page.locator('#main-program').textContent();
        expect(updatedContent).toContain('#4Truth Eternal');

        // ===== STEP 5: Verify cannot delete active program (Ward B) =====
        await page.click('#manage-profiles-btn');

        const wardBItem = page.locator('.profiles-list li').filter({ hasText: 'Ward B Updated' });
        await expect(wardBItem).toBeVisible();

        // Ward B is active, so delete button should be disabled or not present
        const wardBDeleteBtn = wardBItem.locator('.delete-btn');
        await expect(wardBDeleteBtn).toBeDisabled();

        // ===== STEP 6: Delete inactive program (Ward A) =====
        const wardAItem = page.locator('.profiles-list li').filter({ hasText: 'Ward A' });
        await expect(wardAItem).toBeVisible();

        const wardADeleteBtn = wardAItem.locator('.delete-btn');
        await expect(wardADeleteBtn).toBeEnabled();

        // Accept confirmation dialog
        page.on('dialog', dialog => dialog.accept());
        await wardADeleteBtn.click();

        // Verify Ward A is removed
        await expect(wardAItem).toBeHidden();

        // Close modal
        await page.click('#close-modal-btn');

        // ===== STEP 7: Verify only 2 programs remain =====
        const remainingOptions = await page.locator('#profile-selector option').allTextContents();
        expect(remainingOptions).toHaveLength(2);
        expect(remainingOptions.some(opt => opt.includes('Ward A'))).toBe(false);
        expect(remainingOptions.some(opt => opt.includes('Ward B'))).toBe(true);
        expect(remainingOptions.some(opt => opt.includes('Ward C'))).toBe(true);

        // Verify localStorage
        const finalProfiles = await page.evaluate(() =>
            JSON.parse(localStorage.getItem('meeting_program_profiles') || '[]')
        );
        expect(finalProfiles).toHaveLength(2);
        expect(finalProfiles.find(p => p.id === 'ward-a')).toBeUndefined();
        expect(finalProfiles.find(p => p.id === 'ward-b')).toBeDefined();
        expect(finalProfiles.find(p => p.id === 'ward-c')).toBeDefined();

        // ===== STEP 8: Switch back to Ward C and verify it still works =====
        await page.locator('#profile-selector').selectOption('ward-c');
        await page.waitForLoadState('networkidle');

        await expect(page.locator('#unitname')).toHaveText('Ward C');
        expect(await page.locator('#unitaddress').textContent()).toBe('Gamma Stake');
        expect(await page.locator('#main-program').textContent()).toContain('#3Now Let Us Rejoice');
    });
});
