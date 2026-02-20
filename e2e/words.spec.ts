import { test, expect } from '@playwright/test';

test.describe('Word Browser', () => {
  test('shows word cards', async ({ page }) => {
    await page.goto('/words');

    // Page should show words
    await page.waitForLoadState('networkidle');

    // At least one word card link should exist
    const wordLinks = page.locator('a[href^="/word/"]');
    await expect(wordLinks.first()).toBeVisible();
  });

  test('word cards contain Arabic text', async ({ page }) => {
    await page.goto('/words');
    await page.waitForLoadState('networkidle');

    // Arabic text attribute
    const arabicText = page.locator('[lang="ar"]').first();
    await expect(arabicText).toBeVisible();
  });

  test('clicking a word card navigates to word detail', async ({ page }) => {
    await page.goto('/words');
    await page.waitForLoadState('networkidle');

    // Click the first word card
    await page.locator('a[href^="/word/"]').first().click();

    // Should navigate to word detail page
    await expect(page).toHaveURL(/\/word\/.+/);
  });

  test('word detail page loads', async ({ page }) => {
    await page.goto('/words');
    await page.waitForLoadState('networkidle');

    const firstLink = page.locator('a[href^="/word/"]').first();
    const href = await firstLink.getAttribute('href');
    expect(href).toBeTruthy();

    await page.goto(href!);
    await page.waitForLoadState('networkidle');

    // Should not be an error page
    await expect(page.locator('main')).toBeVisible();
  });
});
