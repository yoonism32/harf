import {test, expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.beforeEach(async ({page}) => {
 await page.goto('/offline.html');
 await page.evaluate(async () => {
  localStorage.clear(); sessionStorage.clear();
  await new Promise<void>((resolve, reject) => {
   const request = indexedDB.deleteDatabase('harf');
   request.onsuccess = () => resolve(); request.onerror = () => reject(request.error);
  });
 });
 await page.goto('/today');
 await expect(page.getByRole('region', {name: 'Vocabulary progress'})).toBeVisible();
});

test('saved ranges and difficult ayahs survive reload and resume from Today', async ({page}) => {
 await page.goto('/read/1/5/study');
 await page.getByLabel('Last ayah in this practice').selectOption('7');
 await page.getByRole('button', {name: 'Next practice ayah'}).click();
 await page.getByRole('button', {name: 'Save passage for Today'}).click();
 await expect(page.getByRole('status')).toContainText('Passage and current ayah saved');
 await page.getByRole('button', {name: 'Reveal meaning', exact: true}).click();
 await page.getByRole('button', {name: 'Need another look', exact: true}).click();
 await page.getByLabel('What made this difficult?').selectOption('construction');
 await page.getByRole('button', {name: 'Save assessment', exact: true}).click();
 await expect(page.getByText('Assessment saved for another visit.')).toBeVisible();
 await page.goto('/today'); await page.reload();
 const section = page.getByRole('region', {name: 'Personal passage practice'});
 await section.getByText('Ayahs to look at again (1)').click();
 await expect(section.getByRole('link', {name: 'Ayah 1:6'})).toBeVisible();
 await section.getByRole('link', {name: 'Resume saved passage 1:5–7 →'}).click();
 await expect(page.getByRole('heading', {name: 'Listen and understand · 1:6'})).toBeVisible();
 await expect(page.getByLabel('Last ayah in this practice')).toHaveValue('7');
 await page.getByRole('link', {name: 'Return to Today', exact: true}).click();
 await page.getByRole('button', {name: 'Remove saved passage'}).click();
 await expect(page.getByRole('link', {name: /Resume saved passage/})).toHaveCount(0);
 await page.goto('/read/1/5/study');
 await page.getByLabel('Last ayah in this practice').selectOption('5');
 await page.getByRole('button', {name: 'Reveal meaning', exact: true}).click();
 await expect(page.getByRole('heading', {name: 'Recognising “we” in a verb'})).toBeVisible();
 await page.getByText('Inspect the source analysis · 1:5:2').click();
 await expect(page.getByRole('article').filter({has:page.getByRole('heading',{name:'Recognising “we” in a verb'})}).getByText('Quranic Arabic Corpus v0.4, aligned', {exact:false})).toBeVisible();
 expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);
});

test('reflection save failures retain the draft and can be retried after reload', async ({page}) => {
 await page.goto('/read/1/5/study');
 await page.getByRole('button', {name: 'Reveal meaning', exact: true}).click();
 const reflection = page.getByRole('region', {name: 'Reflection on 1:5'});
 await reflection.getByRole('textbox').fill('What does this construction connect?');
 await page.evaluate(() => {
  const original = IDBDatabase.prototype.transaction;
  IDBDatabase.prototype.transaction = function (...args: Parameters<typeof original>) {
   if (Array.isArray(args[0]) && args[0].includes('notes') && args[1] === 'readwrite') throw Error('Test save unavailable');
   return original.apply(this, args);
  };
 });
 await reflection.getByRole('button', {name: 'Save reflection', exact:true}).click();
 await expect(reflection.getByRole('alert')).toContainText('Test save unavailable');
 await page.reload();
 await expect(reflection.getByRole('textbox')).toHaveValue('What does this construction connect?');
 await reflection.getByRole('button', {name: 'Save reflection', exact:true}).click();
 await expect(reflection.getByRole('status')).toHaveText('Reflection saved.');
 await page.goto('/read/1/6');
 await expect(page.getByRole('region', {name:'Reflection on 1:6'}).getByRole('textbox')).toHaveValue('');
 await page.goto('/read/1/5');
 await expect(reflection.getByRole('textbox')).toHaveValue('What does this construction connect?');
});
