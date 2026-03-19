import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
  test('shows حرف wordmark', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Harf/);
    // The large red حرف hero text is present
    const hero = page.locator('[lang="ar"][aria-label*="harf"]');
    await expect(hero).toBeAttached();
  });

  test('has skip-to-content link for accessibility', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: /Skip to content/i })).toBeAttached();
  });

  test('Begin button links to /study', async ({ page }) => {
    await page.goto('/');
    // Wait for typewriter to finish and CTA to appear (generous timeout for CI)
    const beginBtn = page.getByRole('link', { name: /Begin/i });
    await expect(beginBtn).toBeVisible({ timeout: 30_000 });
    await expect(beginBtn).toHaveAttribute('href', '/study');
  });

  test('no console errors on load', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    expect(errors).toHaveLength(0);
  });
});

test.describe('Dashboard', () => {
  test('loads at /app and shows main sections', { tag: '@smoke' }, async ({ page }) => {
    await page.goto('/app');
    await page.waitForLoadState('networkidle');

    // Quick links are present
    await expect(page.getByRole('link', { name: /Word Library/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Study Now/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Quran Coverage/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /99 Names/i })).toBeVisible();
  });

  test('quick links navigate to correct pages', async ({ page }) => {
    await page.goto('/app');
    await page.getByRole('link', { name: /Word Library/i }).click();
    await expect(page).toHaveURL('/words');
  });

  test('active nav link has aria-current="page"', async ({ page }) => {
    await page.goto('/words');
    await page.waitForLoadState('networkidle');

    // The "Words" nav link should be marked as the current page
    const wordsNavLink = page.getByRole('navigation', { name: 'Main navigation' })
      .getByRole('link', { name: 'Words', exact: true });
    await expect(wordsNavLink).toHaveAttribute('aria-current', 'page');
  });
});
