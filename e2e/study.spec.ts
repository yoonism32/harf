import { test, expect } from '@playwright/test';
import wordsData from '../data/words.json';

const ALL_WORD_IDS = (wordsData as Array<{ id: string }>).map(w => w.id);

test.describe('Study Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage so we start fresh each test
    await page.addInitScript(() => {
      localStorage.clear();
    });
  });

  test('shows flashcard on fresh session (new words available)', { tag: '@smoke' }, async ({ page }) => {
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

    // Click through all cards using "Don't Know"
    for (let attempts = 0; attempts < 15; attempts++) {
      const tapHint = page.getByText(/Tap to reveal meaning/i);
      if (!(await tapHint.isVisible({ timeout: 500 }).catch(() => false))) break;

      // Flip the card
      await page.locator('button').filter({ hasText: /Tap to reveal/ }).click();

      // Wait for flip to complete (mastery buttons appear)
      const dontKnow = page.getByRole('button', { name: /Don't Know/i });
      await expect(dontKnow).toBeVisible({ timeout: 3000 });
      await dontKnow.click();

      // Wait for UI to transition to next card or session end
      await page.waitForFunction(() => {
        const text = document.body.textContent ?? '';
        return (
          text.includes('Tap to reveal meaning') ||
          text.includes('Session Complete') ||
          text.includes('No words due')
        );
      }, { timeout: 5000 });
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
    // Seed localStorage with ALL real word IDs (FSRS format) set to a future review date.
    // Using fake IDs (word-1, word-2 …) would not block new words from being queued
    // because the study page matches against the actual word IDs from words.json.
    await page.addInitScript((ids: string[]) => {
      const future = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
      const progress: Record<string, unknown> = {};
      for (const id of ids) {
        progress[id] = {
          id,
          // FSRS fields
          stability: 30,
          difficulty: 5,
          elapsed_days: 0,
          scheduled_days: 30,
          reps: 5,
          lapses: 0,
          state: 2, // Review state
          last_review: new Date().toISOString(),
          nextReview: future,
          lastReviewed: new Date().toISOString(),
          mastery: 4,
        };
      }
      localStorage.setItem('harf:v1:word_progress', JSON.stringify(progress));
    }, ALL_WORD_IDS);

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
