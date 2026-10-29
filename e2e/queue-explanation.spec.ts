import {test, expect, type Page} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.use({serviceWorkers: 'block'});

test.beforeEach(async ({page}) => {
  await page.goto('/offline.html');
  await page.evaluate(async () => {
    localStorage.clear();
    sessionStorage.clear();
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase('harf');
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
      request.onblocked = () => resolve();
    });
  });
});

const dueEntry = 'l-9235e02e84a628b3';
const priorityEntry = 'l-4b28e3627200a6c3';

async function seedQueue(page: Page, empty = false) {
  await page.goto('/today');
  await expect(page.getByRole('region', {name: 'Vocabulary progress'})).toBeVisible();
  await page.evaluate(async ({empty, dueEntry, priorityEntry}) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('harf', 3);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const transaction = db.transaction(['cards', 'reviews', 'meta'], 'readwrite');
    const settings = {
      dailyNew: empty ? 0 : 3,
      namesDailyNew: 3,
      introTransliteration: true,
      arabicSize: 36,
      reciter: 'Alafasy_128kbps',
      prayerLocation: null,
      onboardingComplete: true,
    };
    transaction.objectStore('meta').put(settings, 'settings');
    if (empty) {
      await new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error);
      });
      db.close();
      return;
    }

    const dueCard = {
      id: `vocabulary:${dueEntry}`,
      entryId: dueEntry,
      collection: 'vocabulary',
      card: {
        due: '2026-10-29T00:00:00.000Z',
        stability: 4,
        difficulty: 5,
        elapsed_days: 1,
        scheduled_days: 2,
        learning_steps: 0,
        reps: 3,
        lapses: 0,
        state: 2,
        last_review: '2026-10-28T10:00:00.000Z',
      },
      paused: false,
      contentVersion: 'test',
      revision: 1,
    };
    transaction.objectStore('cards').put(dueCard, dueCard.id);
    transaction.objectStore('meta').put([priorityEntry], 'priorityEntries');
    const reviews = [
      {
        id: 'review-again',
        attemptId: 'attempt-again',
        cardId: dueCard.id,
        sessionId: 'seed',
        timestamp: '2026-10-28T10:00:00.000Z',
        localDate: '2026-10-28',
        timeZone: 'UTC',
        grade: 1,
        before: dueCard,
        after: dueCard,
        undone: false,
      },
      {
        id: 'review-good',
        attemptId: 'attempt-good',
        cardId: dueCard.id,
        sessionId: 'seed',
        timestamp: '2026-10-26T10:00:00.000Z',
        localDate: '2026-10-26',
        timeZone: 'UTC',
        grade: 3,
        before: dueCard,
        after: dueCard,
        undone: false,
      },
      {
        id: 'review-undone',
        attemptId: 'attempt-undone',
        cardId: dueCard.id,
        sessionId: 'seed',
        timestamp: '2026-10-25T10:00:00.000Z',
        localDate: '2026-10-25',
        timeZone: 'UTC',
        grade: 2,
        before: dueCard,
        after: dueCard,
        undone: true,
      },
    ];
    for (const review of reviews) transaction.objectStore('reviews').put(review, review.id);
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
    db.close();
  }, {empty, dueEntry, priorityEntry});
  await page.reload();
  await expect(page.getByRole('region', {name: 'Vocabulary progress'})).toBeVisible();
}

test('explains the exact queue order with reasons and real history', async ({page}) => {
  await seedQueue(page);
  await page.getByText('Why these words?', {exact: true}).click();
  const explanation = page.locator('.queue-explanation');
  const rows = explanation.locator('.queue-explanation-row');

  await expect(rows).toHaveCount(4);
  await expect(rows.nth(0)).toContainText('Due for review');
  await expect(rows.nth(1)).toContainText('Queued from saved study');
  await expect(rows.nth(2)).toContainText('Next in course order');
  await expect(rows.nth(0)).toContainText('Last answer: Again');
  await expect(rows.nth(1)).toContainText('No review history yet.');

  await rows.nth(0).getByText('2 reviews recorded').click();
  const history = rows.nth(0).locator('.queue-history-list li');
  await expect(history).toHaveCount(2);
  await expect(history.nth(0)).toContainText('Again');
  await expect(history.nth(0)).toContainText('2026-10-28');
  await expect(history.nth(1)).toContainText('Good');
  await expect(rows.nth(0)).not.toContainText('Hard');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  expect((await new AxeBuilder({page}).include('.queue-explanation').analyze()).violations).toEqual([]);
});

test('the practice session starts with the same first word the explanation names', async ({page}) => {
  await seedQueue(page);
  await page.getByText('Why these words?', {exact: true}).click();
  const first = page.locator('.queue-explanation-row').nth(0);
  await expect(first).toContainText('لَمِنَ');
  await expect(page.locator('.queue-explanation-row').nth(1)).toContainText('ٱللَّهَ');

  await page.getByRole('button', {name: 'Review now'}).click();
  await expect(page).toHaveURL(/\/study\?session=/);
  await expect(page.locator('.study-word')).toHaveText('لَمِنَ');
  await page.getByRole('button', {name: 'Reveal answer'}).click();
  await page.getByRole('button', {name: /Good/}).click();
  await expect(page.locator('.study-word')).toHaveText('ٱللَّهَ');
});

test('explains an empty queue without inventing work', async ({page}) => {
  await seedQueue(page, true);
  await expect(page.getByRole('heading', {name: 'Make room for a little reading'})).toBeVisible();
  await page.getByText('Why these words?', {exact: true}).click();
  const explanation = page.locator('.queue-explanation');
  await expect(explanation.getByText('No words are queued right now. Your next review will appear when it is due, and new words are added within your daily allowance.')).toBeVisible();
  await expect(explanation.locator('.queue-explanation-row')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});
