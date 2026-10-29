import {test, expect, type Page} from '@playwright/test';
import overrides from '../data/course-overrides.json';

test.use({serviceWorkers: 'block'});
test.beforeEach(async ({page}) => {
 await page.goto('/offline.html');
 await page.evaluate(() => {
  localStorage.clear();
  return new Promise<void>((resolve, reject) => {
   const request = indexedDB.deleteDatabase('harf');
   request.onsuccess = () => resolve();
   request.onerror = () => reject(request.error);
   request.onblocked = () => reject(Error('Database deletion blocked'));
  });
 });
});

async function migrated(page: Page) {
 return page.evaluate(async () => {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
   const request = indexedDB.open('harf');
   request.onsuccess = () => resolve(request.result);
   request.onerror = () => reject(request.error);
  });
  try {
   const tx = db.transaction(['cards', 'notes', 'meta', 'legacy']);
   const read = (store: string) => new Promise<any[]>((resolve, reject) => {
    const request = tx.objectStore(store).getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
   });
   const [cards, notes, meta, legacy] = await Promise.all([read('cards'), read('notes'), read('meta'), read('legacy')]);
   return {cards, notes, meta, legacy};
  } finally {db.close();}
 });
}

test('legacy migration preserves originals, archives ambiguity and runs only once', async ({page}) => {
 const entryId = overrides.legacyMappings['a-l-h'];
 const progress = JSON.stringify({
  'a-l-h': {interval: 8, repetition: 3, lastReviewed: '2026-10-01T12:00:00Z', nextReview: '2026-10-09T12:00:00Z', mnemonic: 'Legacy reminder'},
  'unknown-root': {interval: 8, repetition: 3, nextReview: '2026-10-09T12:00:00Z'},
 });
 await page.evaluate(value => {
  localStorage.setItem('harf:v1:word_progress', value);
  localStorage.setItem('harf:v1:last_verse', JSON.stringify({surah: 2, ayah: 255}));
 }, progress);
 await page.goto('/today');
 await expect(page.getByRole('link', {name: 'Open ayah 2:255 →'})).toBeVisible();
 const first = await migrated(page);
 expect(first.cards).toHaveLength(1);
 expect(first.cards[0]).toMatchObject({entryId, collection: 'vocabulary', card: {reps: 3, stability: 8}});
 expect(first.notes).toEqual([expect.objectContaining({id: entryId, text: 'Legacy reminder'})]);
 expect(first.legacy).toContainEqual(expect.objectContaining({archived: 1, migrated: 1}));
 expect(first.legacy).toContainEqual(expect.objectContaining({'harf:v1:word_progress': progress}));
 expect(await page.evaluate(() => localStorage.getItem('harf:v1:word_progress'))).toBe(progress);
 await page.evaluate(() => localStorage.setItem('harf:v1:word_progress', '{}'));
 await page.reload();
 await expect(page.getByRole('link', {name: 'Open ayah 2:255 →'})).toBeVisible();
 expect(await migrated(page)).toEqual(first);
 await page.goto('/settings');
 await page.getByText('Legacy migration details', {exact: true}).click();
 await expect(page.locator('details').filter({hasText: 'Legacy migration details'})).toContainText('"archived": 1');
});

test('malformed legacy records stay recoverable without blocking study', async ({page}) => {
 await page.evaluate(() => {
  localStorage.setItem('harf:v1:word_progress', '{invalid json');
  localStorage.setItem('harf:v1:name_progress', JSON.stringify({100: {id: 100, nextReview: '2026-10-09T12:00:00Z'}}));
  localStorage.setItem('harf:v1:last_verse', JSON.stringify('999:1'));
 });
 await page.goto('/today');
 await expect(page.getByRole('region', {name: 'Vocabulary progress'})).toBeVisible();
 const data = await migrated(page);
 expect(data.cards).toEqual([]);
 expect(data.legacy).toContainEqual(expect.objectContaining({'harf:v1:word_progress': '{invalid json'}));
 expect(data.legacy).toContainEqual(expect.objectContaining({archived: 1, migrated: 0, warnings: expect.arrayContaining([expect.stringContaining('original preserved')])}));
 await page.goto('/start');
 await expect(page.getByRole('button', {name: 'Start my first session'})).toBeEnabled();
});
