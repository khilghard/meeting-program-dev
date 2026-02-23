import { expect } from '@playwright/test';
import { test } from '../fixtures/base.js';

test.describe('Console Errors', () => {
    test('should not have any console errors or warnings on page load', async ({ page }) => {
        const errors = [];
        const warnings = [];

        page.on('console', msg => {
            if (msg.type() === 'error') {
                errors.push(msg.text());
            } else if (msg.type() === 'warning') {
                if (!msg.text().includes('willReadFrequently')) {
                    warnings.push(msg.text());
                }
            }
        });

        page.on('pageerror', err => {
            errors.push(`Uncaught exception: ${err.message}`);
        });

        await page.goto('/meeting-program/');
        await page.waitForTimeout(1000);

        expect(errors, `Found console errors: \n${errors.join('\n')}`).toHaveLength(0);
    });
});
