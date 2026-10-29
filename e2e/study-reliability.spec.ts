import {test, expect, type Page} from '@playwright/test';

test.use({serviceWorkers: 'block'});
test.beforeEach(async ({page}) => {
 await page.goto('/start');
 await page.getByRole('radio', {name: '3', exact: true}).check();
 await page.getByRole('button', {name: 'Start my first session'}).click();
 await expect(page.getByRole('heading', {name: 'Meet this word'})).toBeVisible();
});

async function records(page: Page) {
 return page.evaluate(async () => {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
   const request = indexedDB.open('harf');
   request.onsuccess = () => resolve(request.result);
   request.onerror = () => reject(request.error);
  });
  try {
   const tx = db.transaction(['cards', 'reviews', 'sessions']);
   const read = (name: string) => new Promise<any[]>((resolve, reject) => {
    const request = tx.objectStore(name).getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
   });
   const [cards, reviews, sessions] = await Promise.all([read('cards'), read('reviews'), read('sessions')]);
   return {cards, reviews, sessions};
  } finally {db.close();}
 });
}

test('loaded text study saves and undoes offline, then survives reconnect and reload', async ({page, context}) => {
 const sessionUrl = page.url();
 await context.setOffline(true);
 try {
  await page.getByRole('button', {name: 'Try recalling it'}).click();
  await page.getByRole('button', {name: 'Reveal answer'}).click();
  await page.getByRole('button', {name: /^Good/}).click();
  await expect(page.getByRole('button', {name: 'Undo last answer'})).toBeVisible();
  expect((await records(page)).reviews.filter(review => !review.undone)).toHaveLength(1);
  await page.getByRole('button', {name: 'Undo last answer'}).click();
  await expect(page.getByRole('button', {name: /^Good/})).toBeVisible();
  expect((await records(page)).reviews.filter(review => !review.undone)).toHaveLength(0);
  await page.getByRole('button', {name: /^Good/}).click();
  await expect(page.getByRole('button', {name: 'Undo last answer'})).toBeVisible();
 } finally {await context.setOffline(false);}
 await page.reload();
 await expect(page).toHaveURL(sessionUrl);
 await expect(page.getByRole('button', {name: 'Undo last answer'})).toBeVisible();
 const saved = await records(page);
 expect(saved.reviews.filter(review => !review.undone)).toHaveLength(1);
 expect(saved.cards).toHaveLength(1);
 expect(saved.sessions[0].actions).toBe(1);
});

test('a transaction abort rolls back the card and retries the same answer once', async ({page}) => {
 await page.getByRole('button', {name: 'Try recalling it'}).click();
 await page.getByRole('button', {name: 'Reveal answer'}).click();
 const before = await records(page);
 await page.evaluate(() => {
  const original = IDBObjectStore.prototype.put;
  IDBObjectStore.prototype.put = function (...args: Parameters<IDBObjectStore['put']>) {
   if (this.name === 'reviews') {
    IDBObjectStore.prototype.put = original;
    this.transaction.abort();
    throw Error('Test transaction interrupted after card write');
   }
   return original.apply(this, args);
  };
 });
 await page.getByRole('button', {name: /^Good/}).click();
 await expect(page.getByRole('main').getByRole('alert')).toContainText("Your answer wasn't saved.");
 expect(await records(page)).toEqual(before);
 await page.getByRole('button', {name: 'Retry saving Good', exact: true}).click();
 await expect(page.getByRole('button', {name: 'Undo last answer'})).toBeVisible();
 const after = await records(page);
 expect(after.cards).toHaveLength(1);
 expect(after.reviews).toHaveLength(1);
 expect(after.reviews[0].attemptId).toBe(before.sessions[0].queue[0].id);
 expect(after.sessions[0].actions).toBe(1);
});
