import {test, expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {text} from 'node:stream/consumers';

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

test('competing reflection drafts cannot overwrite a newer save from another tab', async ({page, context}) => {
 await page.goto('/read/1/5');
 const reflection = page.getByRole('region', {name:'Reflection on 1:5'});
 await reflection.getByRole('textbox').fill('Draft in the first tab');
 const second = await context.newPage();
 await second.goto('/read/1/5');
 const other = second.getByRole('region', {name:'Reflection on 1:5'});
 await other.getByRole('textbox').fill('Saved in the second tab');
 await other.getByRole('button', {name:'Save reflection',exact:true}).click();
 await expect(other.getByRole('status')).toHaveText('Reflection saved.');
 await page.bringToFront();
 await reflection.getByRole('button', {name:'Save reflection',exact:true}).click();
 await expect(reflection.getByRole('alert')).toContainText('changed elsewhere');
 await expect(reflection.getByRole('textbox')).toHaveValue('Draft in the first tab');
 await expect(reflection.getByRole('alert')).toContainText('Saved in the second tab');
 await reflection.getByRole('button', {name:'Discard draft and use saved reflection'}).click();
 await expect(reflection.getByRole('textbox')).toHaveValue('Saved in the second tab');
 await second.close();
});

test('backup replacement is atomic on failure and its previous snapshot restores personal writing', async ({page}) => {
 await page.goto('/read/1/5');
 const reflection = page.getByRole('region', {name:'Reflection on 1:5'});
 await reflection.getByRole('textbox').fill('Original reflection in the backup');
 await reflection.getByRole('button', {name:'Save reflection',exact:true}).click();
 await expect(reflection.getByRole('status')).toHaveText('Reflection saved.');
 await page.goto('/settings');
 const downloaded = page.waitForEvent('download');
 await page.getByRole('button', {name:'Export progress',exact:true}).click();
 const download = await downloaded;
 const contents = await text((await download.createReadStream())!);
 const backup = {name:download.suggestedFilename(), mimeType:'application/json', buffer:Buffer.from(contents)};
 await page.goto('/read/1/5');
 await reflection.getByRole('textbox').fill('Newer reflection before replacement');
 await reflection.getByRole('button', {name:'Save reflection',exact:true}).click();
 await expect(reflection.getByRole('status')).toHaveText('Reflection saved.');
 await page.goto('/settings');
 await page.getByLabel('Import a Harf backup').setInputFiles({name:'invalid.json',mimeType:'application/json',buffer:Buffer.from('{}')});
 await expect(page.getByRole('alert')).toBeVisible();
 await expect(page.getByRole('dialog',{name:'Replace current progress?'})).toHaveCount(0);
 await page.getByLabel('Import a Harf backup').setInputFiles(backup);
 const confirmation = page.getByRole('dialog',{name:'Replace current progress?'});
 await expect(confirmation).toBeVisible();
 await page.evaluate(() => {
  const original = IDBDatabase.prototype.transaction;
  IDBDatabase.prototype.transaction = function (...args: Parameters<typeof original>) {
   if (Array.isArray(args[0]) && args[0].includes('notes') && args[0].includes('recovery') && args[1] === 'readwrite') throw Error('Test import unavailable');
   return original.apply(this,args);
  };
 });
 await confirmation.getByRole('button',{name:'Replace current progress',exact:true}).click();
 await expect(confirmation.getByRole('alert')).toContainText('Test import unavailable');
 await page.reload(); await page.goto('/read/1/5');
 await expect(reflection.getByRole('textbox')).toHaveValue('Newer reflection before replacement');
 await page.goto('/settings');
 await page.getByLabel('Import a Harf backup').setInputFiles(backup);
 await confirmation.getByRole('button',{name:'Replace current progress',exact:true}).click();
 await expect(page.getByRole('status')).toHaveText('Backup restored.');
 await page.goto('/read/1/5');
 await expect(reflection.getByRole('textbox')).toHaveValue('Original reflection in the backup');
 await page.goto('/settings');
 await page.getByRole('button',{name:'Restore previous snapshot',exact:true}).click();
 await page.getByRole('dialog').getByRole('button',{name:'Restore snapshot',exact:true}).click();
 await expect(page.getByRole('status')).toHaveText('Recovery action completed.');
 await page.getByRole('button',{name:'Reset learning progress',exact:true}).click();
 await page.getByRole('dialog').getByRole('button',{name:'Reset progress',exact:true}).click();
 await expect(page.getByRole('status')).toHaveText('Recovery action completed.');
 await page.goto('/read/1/5');
 await expect(reflection.getByRole('textbox')).toHaveValue('Newer reflection before replacement');
});
