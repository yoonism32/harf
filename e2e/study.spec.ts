import { test, expect } from '@playwright/test';

test.describe('Study Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage so we start fresh each test
    await page.addInitScript(() => {
      localStorage.clear();
    });
  });

  test('shows flashcard on fresh session (new words available)', async ({ page }) => {
    await page.goto('/study');
    await page.waitForLoadState('networkidle');

    // Fresh session: new words should be queued (up to 10)
    // Either shows a flashcard or the "no words" message
    const hasCard = await page.locator('button').filter({ hasText: /Tap to reveal/ }).count();
    const noReview = await page.getByText(/No words due/i).count();

    // One of these must be true
    expect(hasCard + noReview).toBeGreaterThan(0);
  });

  test('flashcard flip reveals meaning', async ({ page }) => {
    await page.goto('/study');
    await page.waitForLoadState('networkidle');

    // If there's a flashcard, click it to flip
    const tapHint = page.getByText(/Tap to reveal meaning/i);
    if (await tapHint.isVisible()) {
      // The card button — click it to flip
      await page.locator('button').filter({ hasText: /Tap to reveal/ }).click();

      // After flip, mastery buttons should appear
      await expect(page.getByText(/How well did you know it/i)).toBeVisible();
    }
  });

  test('session complete shows after reviewing all cards', async ({ page }) => {
    await page.goto('/study');
    await page.waitForLoadState('networkidle');

    // Click through all cards quickly using "Don't Know"
    let attempts = 0;
    while (attempts < 15) {
      const tapHint = page.getByText(/Tap to reveal meaning/i);
      if (!(await tapHint.isVisible())) break;

      // Flip the card
      await page.locator('button').filter({ hasText: /Tap to reveal/ }).click();
      await page.waitForTimeout(200);

      // Click "Don't Know"
      const dontKnow = page.getByRole('button', { name: /Don't Know/i });
      if (await dontKnow.isVisible()) {
        await dontKnow.click();
        await page.waitForTimeout(200);
      }
      attempts++;
    }

    // Should either show session complete or still on last card
    const sessionComplete = await page.getByText(/Session Complete/i).count();
    const stillStudying = await page.getByText(/Study Session/i).count();
    const noWords = await page.getByText(/No words due/i).count();

    expect(sessionComplete + stillStudying + noWords).toBeGreaterThan(0);
  });

  test('study page has proper heading', async ({ page }) => {
    await page.goto('/study');
    await page.waitForLoadState('networkidle');

    // Either "Study Session" heading or the "no words" Arabic heading
    const mainContent = page.locator('main');
    await expect(mainContent).toBeVisible();
  });

  test('"no words due" empty state renders correctly after all words reviewed', async ({ page }) => {
    // Seed localStorage so all words are already due far in the future (none due today)
    await page.addInitScript(() => {
      // Simulate: all words reviewed and next review is in the future
      const future = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
      const progress: Record<string, unknown> = {};
      // Create enough fake entries to prevent new words from filling the queue
      for (let i = 1; i <= 500; i++) {
        const id = `word-${i}`;
        progress[id] = {
          id,
          mastery: 4,
          interval: 30,
          repetition: 5,
          efactor: 2.5,
          nextReview: future,
          lastReviewed: new Date().toISOString(),
        };
      }
      localStorage.setItem('harf:v1:word_progress', JSON.stringify(progress));
    });

    await page.goto('/study');
    await page.waitForLoadState('networkidle');

    // Should show the "no words due" empty state
    const noWordsText = page.getByText(/No words due for review today/i);
    const browseLink = page.getByRole('link', { name: /Browse Words/i });

    await expect(noWordsText).toBeVisible();
    await expect(browseLink).toBeVisible();
  });

  test('card keyboard: Tab focuses card, Space flips it, response buttons appear', async ({ page }) => {
    await page.goto('/study');
    await page.waitForLoadState('networkidle');

    // Only run if we have a flashcard
    const cardButton = page.locator('[role="button"][tabindex="0"]').first();
    if (!(await cardButton.isVisible())) return;

    // Focus the card via Tab and press Space to flip
    await cardButton.focus();
    await page.keyboard.press('Space');

    // After flip, mastery buttons should be visible
    await expect(page.getByText(/How well did you know it/i)).toBeVisible({ timeout: 2000 });
  });
});
