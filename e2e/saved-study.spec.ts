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

async function seedSavedStudy(page: Page) {
  await page.goto('/today');
  await expect(page.getByRole('region', {name: 'Vocabulary progress'})).toBeVisible();
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('harf', 3);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const transaction = db.transaction(['notes', 'bookmarks', 'meta'], 'readwrite');
    transaction.objectStore('notes').put({
      id: 'ayah-1-5',
      text: 'A construction worth revisiting.',
      updatedAt: '2026-10-28T10:00:00.000Z',
    }, 'ayah-1-5');
    transaction.objectStore('notes').put({
      id: 'l-0123456789abcdef',
      text: 'Vocabulary mnemonic that must never appear as a Quran reflection.',
      updatedAt: '2026-10-28T10:00:00.000Z',
    }, 'l-0123456789abcdef');
    transaction.objectStore('bookmarks').put({id: '1:5', createdAt: '2026-10-28T09:00:00.000Z'}, '1:5');
    transaction.objectStore('bookmarks').put({id: '999:1', createdAt: '2026-10-28T11:00:00.000Z'}, '999:1');
    transaction.objectStore('meta').put({
      range: {reference: '1:5', current: 6, end: 7},
      assessments: [{
        reference: '1:6',
        assessment: 'Need another look',
        obstacle: 'word',
        updatedAt: '2026-10-28T12:00:00.000Z',
      }],
    }, 'passageLearning');
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    db.close();
  });
}

async function seedPassageWithoutCourseWords(page: Page) {
  await page.goto('/today');
  await expect(page.getByRole('region', {name: 'Vocabulary progress'})).toBeVisible();
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('harf', 3);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const transaction = db.transaction('meta', 'readwrite');
    transaction.objectStore('meta').put({
      range: {reference: '19:1', current: 1, end: 1},
      assessments: [],
    }, 'passageLearning');
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    db.close();
  });
}

test('saved study explains an empty library and does not invent navigation', async ({page}) => {
  await page.goto('/read?view=saved');
  await expect(page.getByRole('heading', {name: 'Saved study'})).toBeVisible();
  await expect(page.getByRole('heading', {name: 'Nothing saved yet'})).toBeVisible();
  await expect(page.getByRole('link', {name: 'Browse surahs'})).toBeVisible();
  await expect(page.getByRole('navigation', {name: 'Reader sections'}).getByRole('link', {name: 'Saved study'})).toHaveAttribute('aria-current', 'page');
});

test('saved study deduplicates sources, filters, searches and returns to the ayah', async ({page}) => {
  let ayahRequests = 0;
  page.on('request', request => {
    if (/\/content\/[^/]+\/surahs\/\d+\.json$/.test(request.url())) ayahRequests++;
  });
  await seedSavedStudy(page);
  ayahRequests = 0;
  await page.goto('/read?view=saved');

  await expect(page.getByRole('heading', {name: 'Saved study'})).toBeVisible();
  expect(ayahRequests).toBe(0);
  await expect(page.getByRole('heading', {name: 'Ayah 1:5'})).toBeVisible();
  await expect(page.getByRole('heading', {name: 'Ayah 999:1'})).toBeVisible();
  await expect(page.getByRole('heading', {name: 'Ayahs 1:5–1:7'})).toBeVisible();
  await expect(page.getByText('A construction worth revisiting.', {exact: true})).toBeVisible();
  await expect(page.getByText('Vocabulary mnemonic that must never appear as a Quran reflection.')).toHaveCount(0);
  await expect(page.getByText('Unavailable', {exact: true})).toBeVisible();
  expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);

  await page.getByLabel('Find in your reflections').fill('construction');
  await expect(page).toHaveURL(/find=construction/);
  await expect(page.getByRole('heading', {name: 'Ayah 1:5'})).toBeVisible();
  await expect(page.getByRole('heading', {name: 'Ayah 999:1'})).toHaveCount(0);
  await expect(page.getByRole('heading', {name: 'Ayahs 1:5–1:7'})).toHaveCount(0);

  await page.getByLabel('Find in your reflections').fill('');
  await expect(page).not.toHaveURL(/find=/);
  await page.getByRole('link', {name: 'Reflections', exact: true}).click();
  await expect(page).toHaveURL(/saved=reflections/);
  await expect(page.getByRole('heading', {name: 'Ayah 1:5'})).toBeVisible();
  await expect(page.getByRole('heading', {name: 'Ayah 999:1'})).toHaveCount(0);
  await expect(page.getByRole('heading', {name: 'Ayahs 1:5–1:7'})).toHaveCount(0);

  await page.getByRole('link', {name: 'Details for Ayah 1:5'}).click();
  const detail = page.getByRole('region', {name: 'Ayah 1:5'});
  await expect(detail).toBeVisible();
  await expect.poll(() => ayahRequests).toBeGreaterThan(0);
  await expect(page).toHaveURL(/thread=ayah%3A1%3A5/);
  await expect(detail.getByText('A construction worth revisiting.', {exact: true})).toBeVisible();
  await expect(detail.getByRole('link', {name: 'Open ayah 1:5'})).toBeVisible();

  await detail.getByRole('link', {name: 'Open ayah 1:5'}).click();
  await expect(page).toHaveURL(/\/read\/1\/5\?returnTo=/);
  await expect(page.getByRole('link', {name: /Return to reading/})).toBeVisible();
  await page.getByRole('link', {name: /Return to reading/}).click();
  await expect(page).toHaveURL(/thread=ayah%3A1%3A5/);
  await expect(page).toHaveURL(/saved=reflections/);
  await expect(page.getByRole('region', {name: 'Ayah 1:5'})).toBeVisible();
  await page.getByRole('link', {name: 'Back to saved study'}).click();
  await expect(page).not.toHaveURL(/thread=/);

  await page.getByRole('link', {name: 'Bookmarks', exact: true}).click();
  await expect(page.getByRole('heading', {name: 'Ayah 1:5'})).toBeVisible();
  await expect(page.getByRole('heading', {name: 'Ayah 999:1'})).toBeVisible();
  await expect(page.getByRole('heading', {name: 'Ayahs 1:5–1:7'})).toHaveCount(0);

  await page.getByRole('link', {name: 'Needs another look', exact: true}).click();
  await expect(page.getByRole('heading', {name: 'Ayahs 1:5–1:7'})).toBeVisible();
  await expect(page.getByRole('heading', {name: 'Ayah 1:6'})).toHaveCount(0);
  await expect(page.getByRole('heading', {name: 'Ayah 1:5'})).toHaveCount(0);

  await page.getByRole('link', {name: 'All', exact: true}).click();
  await page.getByRole('link', {name: 'Details for Ayahs 1:5–1:7'}).click();
  const passage = page.getByRole('region', {name: 'Ayahs 1:5–1:7'});
  await expect(passage).toBeVisible();
  await expect(passage.getByRole('link', {name: 'Open at ayah 1:6'})).toBeVisible();
  await passage.getByRole('link', {name: 'Open at ayah 1:6'}).click();
  await expect(page).toHaveURL(/\/read\/1\/6\?returnTo=/);

  await page.goto('/read?view=saved');
  await page.getByRole('link', {name: 'Details for Ayah 999:1'}).click();
  const orphan = page.getByRole('region', {name: 'Ayah 999:1'});
  await expect(orphan.getByText(/not in the current Quran content/)).toBeVisible();
  await expect(orphan.getByRole('link', {name: 'Open ayah 999:1'})).toHaveCount(0);
});

test('focused practice keeps its saved passage through answers, rounds and completion', async ({page}) => {
  await seedSavedStudy(page);
  await page.goto('/read?view=saved');
  await page.getByRole('link', {name: 'Details for Ayahs 1:5–1:7'}).click();
  const detail = page.getByRole('region', {name: 'Ayahs 1:5–1:7'});
  await expect(detail).toBeVisible();
  await expect(detail.getByText('Because this saved passage includes an ayah you marked as needing another look.'))
    .toHaveCount(1);

  await detail.getByRole('link', {name: 'Practise these words'}).click();
  await expect(page).toHaveURL(/\/practice\?.*focus=passage%3A1%3A5%3A7/);
  await expect(page).toHaveURL(/returnTo=/);
  await expect(page.getByText('Because this saved passage includes an ayah you marked as needing another look.'))
    .toHaveCount(1);
  await expect(page.getByText(/ٱهْدِنَا|ٱلصِّرَٰطَ|ٱلْمُسْتَقِيمَ/).first()).toBeVisible();

  for (let round = 0; round < 3; round++) {
    await expect(page.getByRole('heading', {name: `Round ${round + 1}`})).toBeVisible();
    await page.locator('fieldset button').first().click();
    await expect(page).toHaveURL(/answer=/);
    await expect(page).toHaveURL(/focus=passage%3A1%3A5%3A7/);
    await expect(page).toHaveURL(/returnTo=/);
    await page.getByRole('link', {name: round === 2 ? 'Finish focused practice' : 'Next round'}).click();
  }

  await expect(page.getByRole('heading', {name: 'Focused set complete'})).toBeVisible();
  await expect(page).toHaveURL(/focus=passage%3A1%3A5%3A7/);
  await expect(page).toHaveURL(/returnTo=/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  await page.getByRole('link', {name: 'Return to saved study'}).click();
  await expect(page).toHaveURL(/thread=passage%3A1%3A5%3A7/);
  await expect(page.getByRole('region', {name: 'Ayahs 1:5–1:7'})).toBeVisible();
});

test('preparation queues a subset and practises exactly those words', async ({page}) => {
  await seedSavedStudy(page);
  await page.goto('/read?view=saved');
  await page.getByRole('link', {name: 'Details for Ayahs 1:5–1:7'}).click();
  const detail = page.getByRole('region', {name: 'Ayahs 1:5–1:7'});
  await detail.getByRole('button', {name: 'Prepare words'}).click();

  await expect(detail.getByRole('checkbox')).toHaveCount(8);
  await expect(detail.getByText('Not started', {exact: true})).toHaveCount(8);
  const guided = detail.getByRole('checkbox', {name: /Guide us/});
  const path = detail.getByRole('checkbox', {name: /the path/});
  await guided.check();
  await path.check();
  await expect(guided).toBeChecked();
  await expect(path).toBeChecked();
  await expect(detail.getByText('Already queued', {exact: true})).toHaveCount(2);
  await expect(detail.getByText('Not started', {exact: true})).toHaveCount(6);

  await path.uncheck();
  await expect(path).not.toBeChecked();
  await expect(detail.getByText('Already queued', {exact: true})).toHaveCount(1);
  await path.check();
  await expect(path).toBeChecked();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);

  await detail.getByRole('link', {name: 'Practise 2 queued words'}).click();
  await expect(page).toHaveURL(/prepared=1/);
  await expect(page).toHaveURL(/focus=passage%3A1%3A5%3A7/);
  await expect(page).toHaveURL(/returnTo=/);
  await expect(page.getByText('Because these words are already queued from this saved passage.'))
    .toHaveCount(1);

  for (let round = 0; round < 2; round++) {
    await expect(page.getByRole('heading', {name: `Round ${round + 1}`})).toBeVisible();
    await expect(page.getByText(/ih'dinā|l-ṣirāṭa/).first()).toBeVisible();
    await expect(page.getByText("l-mus'taqīma", {exact: true})).toHaveCount(0);
    await page.locator('fieldset button').first().click();
    await expect(page).toHaveURL(/answer=/);
    await expect(page).toHaveURL(/prepared=1/);
    await page.getByRole('link', {name: round === 1 ? 'Finish focused practice' : 'Next round'}).click();
  }

  await expect(page.getByRole('heading', {name: 'Focused set complete'})).toBeVisible();
  await expect(page.getByText(/You reached the end of the 2 course words/)).toBeVisible();
  await page.getByRole('link', {name: 'Return to saved study'}).click();
  await expect(page).toHaveURL(/thread=passage%3A1%3A5%3A7/);
  const returned = page.getByRole('region', {name: 'Ayahs 1:5–1:7'});
  await returned.getByRole('button', {name: 'Prepare words'}).click();
  await expect(returned.getByRole('checkbox', {name: /Guide us/})).toBeChecked();
  await expect(returned.getByRole('checkbox', {name: /the path/})).toBeChecked();

  await returned.getByRole('link', {name: 'Practise 2 queued words'}).click();
  await expect(page).toHaveURL(/prepared=1/);
  await page.getByRole('link', {name: 'End practice'}).click();
  await expect(page).toHaveURL(/thread=passage%3A1%3A5%3A7/);
  await expect(page.getByRole('region', {name: 'Ayahs 1:5–1:7'})).toBeVisible();
});

test('preparation explains a saved passage with no course words', async ({page}) => {
  await seedPassageWithoutCourseWords(page);
  await page.goto('/read?view=saved');
  await page.getByRole('link', {name: 'Details for Ayahs 19:1–19:1'}).click();
  const detail = page.getByRole('region', {name: 'Ayahs 19:1–19:1'});
  await detail.getByRole('button', {name: 'Prepare words'}).click();

  await expect(detail.getByText('No vocabulary-course words occur in this passage.')).toBeVisible();
  await expect(detail.getByRole('checkbox')).toHaveCount(0);
  await expect(detail.getByRole('link', {name: /Practise .*queued/})).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});

test('a bookmark-only thread still starts practice and End practice returns to it', async ({page}) => {
  await seedSavedStudy(page);
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('harf', 3);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const transaction = db.transaction('bookmarks', 'readwrite');
    transaction.objectStore('bookmarks').put({id: '1:2', createdAt: '2026-10-28T08:00:00.000Z'}, '1:2');
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    db.close();
  });
  await page.goto('/read?view=saved');
  await page.getByRole('link', {name: 'Details for Ayah 1:2'}).click();
  const detail = page.getByRole('region', {name: 'Ayah 1:2'});
  await expect(detail.getByText('Because you bookmarked this ayah.')).toHaveCount(1);
  await expect(detail.getByText(/needing another look/)).toHaveCount(0);

  await detail.getByRole('link', {name: 'Practise these words'}).click();
  await expect(page).toHaveURL(/focus=ayah%3A1%3A2/);
  await expect(page).toHaveURL(/returnTo=/);
  await expect(page.getByText('Because you bookmarked this ayah.')).toHaveCount(1);
  await expect(page.getByText(/ٱلْحَمْدُ|ٱللَّهَ|رَبِّ|ٱلْعَـٰلَمِينَ/).first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);

  await page.locator('fieldset button').first().click();
  await expect(page).toHaveURL(/answer=/);
  await expect(page).toHaveURL(/focus=ayah%3A1%3A2/);
  await page.getByRole('link', {name: 'End practice'}).click();
  await expect(page).toHaveURL(/thread=ayah%3A1%3A2/);
  await expect(page.getByRole('region', {name: 'Ayah 1:2'})).toBeVisible();
});

test('starting from the chooser keeps the origin through answer and End practice', async ({page}) => {
  await page.goto('/practice?returnTo=%2Fread%3Fview%3Dsaved');
  await page.getByRole('radio', {name: /Word meaning/}).check();
  await page.getByRole('button', {name: 'Start word meaning'}).click();
  await expect(page).toHaveURL(/\/practice\?.*returnTo=/);

  await page.locator('fieldset button').first().click();
  await expect(page).toHaveURL(/answer=/);
  await expect(page).toHaveURL(/returnTo=/);
  await page.getByRole('link', {name: 'End practice'}).click();
  await expect(page).toHaveURL(/\/read\?view=saved$/);
});
