import {test, expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import type {Ayah} from '../lib/content/schema';

const version = JSON.parse(readFileSync('public/content/manifest.json', 'utf8')).contentVersion;
const ayahs: Ayah[] = JSON.parse(readFileSync(`public/content/${version}/surahs/1.json`, 'utf8'));
const target = ayahs.find(a => a.tokens.some(t => t.entryId))!;
const word = target.tokens.find(t => t.entryId)!;
const outside = ayahs.flatMap(a => a.tokens).find(t => t.kind === 'word' && !t.entryId)!;

test('passage practice hides answers, saves vocabulary priorities and returns to reading', async ({page}) => {
 await page.addInitScript(`window.Audio=class {
  constructor(){window.testAudio=this;this.src='';}
  async play(){this.onplaying?.();} pause(){} load(){} removeAttribute(){this.src='';}
 };`);
 await page.goto(`/read/${target.ref.replace(':', '/')}`);
 await page.getByRole('link', {name: 'Study this passage', exact: true}).click();
 const exercise = page.getByRole('region', {name: 'Passage exercise'});
 await expect(exercise.getByRole('button', {name: 'Reveal meaning'})).toBeVisible();
 expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);
 await expect(exercise.locator('[lang="ar"]')).toHaveCount(0);
 await expect(exercise.getByText(target.translation, {exact: true})).toHaveCount(0);
 await page.getByRole('button', {name: 'Listen to passage', exact: true}).click();
 await expect(page.getByRole('button', {name: 'Pause audio', exact: true})).toBeVisible();
 await page.getByRole('button', {name: 'Show Arabic hint'}).click();
 await expect(exercise.locator('.quran-text')).toBeVisible();
 await expect(exercise.locator('.token-button')).toHaveCount(0);
 await expect(exercise.getByText(target.translation, {exact: true})).toHaveCount(0);
 await page.getByRole('button', {name: 'Reveal meaning'}).click();
 await exercise.getByRole('button', {name: `${word.arabic}, ${word.gloss}`, exact: true}).first().click();
 await page.getByRole('button', {name: 'Study next', exact: true}).click();
 await expect(page.getByRole('button', {name: 'Queued for study'})).toBeDisabled();
 await page.getByRole('button', {name: 'Partly understood', exact: true}).click();
 await expect(page.getByRole('button', {name: 'Partly understood', exact: true})).toHaveAttribute('aria-pressed', 'true');
 await page.getByRole('button', {name: 'Hide text and listen again'}).click();
 await expect(exercise.locator('[lang="ar"]')).toHaveCount(0);
 expect(await page.evaluate('window.testAudio.src')).toBe('');
 await page.getByRole('link', {name: 'Return to reading'}).click();
 await expect(page).toHaveURL(new RegExp(`/read/${target.ref.replace(':', '/')}$`));
 await page.reload();
 await page.locator('.reader-verse').getByRole('button', {name: `${word.arabic}, ${word.gloss}`, exact: true}).first().click();
 await expect(page.getByRole('button', {name: 'Queued for study'})).toBeVisible();
});

test('failed vocabulary save can be retried and unavailable audio allows text practice', async ({page}) => {
 await page.addInitScript(`
  window.Audio=class {async play(){throw new Error('Offline');} pause(){} load(){} removeAttribute(){} };
  const original=IDBDatabase.prototype.transaction;
  IDBDatabase.prototype.transaction=function(stores,mode,...args){
   if(window.failStudySave && mode==='readwrite')throw new Error('Test save failed');
   return original.call(this,stores,mode,...args);
  };
 `);
 await page.goto(`/read/${target.ref.replace(':', '/')}/study?back=https://example.com`);
 await expect(page.getByRole('link', {name: 'Return to reading'})).toHaveAttribute('href', `/read/${target.ref.replace(':', '/')}`);
 await page.getByRole('button', {name: 'Listen to passage', exact: true}).click();
 await expect(page.getByText('Audio could not load. Try again.', {exact: true})).toBeVisible();
 await page.getByRole('button', {name: 'Reveal meaning'}).click();
 await page.getByRole('button', {name: `${word.arabic}, ${word.gloss}`, exact: true}).first().click();
 const save = page.getByRole('button', {name: 'Study next', exact: true});
 await expect(save).toBeEnabled();
 await page.evaluate('window.failStudySave=true');
 await save.click();
 await expect(page.getByRole('complementary', {name: 'Study word'}).getByRole('alert')).toHaveText('Test save failed');
 await expect(save).toBeEnabled();
 await page.evaluate('window.failStudySave=false');
 await save.click();
 await expect(page.getByRole('button', {name: 'Queued for study'})).toBeDisabled();
});

test('outside-course words bookmark an ayah without introducing a word bookmark', async ({page}) => {
 const ref = outside.key.split(':').slice(0, 2).join('/');
 await page.goto(`/read/${ref}/study`);
 await page.getByRole('button', {name: 'Reveal meaning'}).click();
 await page.getByRole('button', {name: `${outside.arabic}, ${outside.gloss}`, exact: true}).first().click();
 await page.getByRole('button', {name: 'Bookmark this ayah', exact: true}).click();
 await expect(page.getByRole('button', {name: 'Remove ayah bookmark'})).toHaveAttribute('aria-pressed', 'true');
 await page.getByRole('link', {name: 'Return to reading'}).click();
 await expect(page.getByRole('button', {name: 'Remove bookmark', exact: true})).toBeVisible();
});

test('short ranges reset reveal and reading mode returns to the same Mushaf page', async ({page}) => {
 await page.goto('/read/1/1?mode=reading&page=1');
 await expect(page.getByRole('article', {name: 'Mushaf page 1'})).toBeVisible();
 await page.getByRole('link', {name: 'Study this passage', exact: true}).click();
 await page.getByLabel('Last ayah in this practice').selectOption('2');
 await page.getByRole('button', {name: 'Reveal meaning'}).click();
 await page.getByRole('button', {name: 'Next practice ayah'}).click();
 await expect(page.getByRole('heading', {name: 'Listen and understand · 1:2'})).toBeFocused();
 await expect(page.getByRole('region', {name: 'Passage exercise'}).locator('[lang="ar"]')).toHaveCount(0);
 await page.getByRole('link', {name: 'Return to reading'}).click();
 await expect(page).toHaveURL('/read/1/1?mode=reading&page=1');
 await expect(page.getByRole('article', {name: 'Mushaf page 1'})).toBeVisible();
});
