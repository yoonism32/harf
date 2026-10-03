import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.beforeEach(async ({ page }) => {
  await page.goto('/offline.html');
  await page.evaluate(() => {
    localStorage.clear();
    return new Promise<void>((resolve,reject)=>{
      const request=indexedDB.deleteDatabase('harf');
      request.onsuccess=()=>resolve();
      request.onerror=()=>reject(request.error);
      request.onblocked=()=>reject(new Error('Test database deletion was blocked'));
    });
  });
});

test('landing, onboarding, and first study card work', async ({ page }) => {
  const response=await page.goto('/');
  const scripts=response?.headers()['content-security-policy']?.match(/script-src[^;]+/)?.[0];
  expect(scripts).toContain("'nonce-");
  expect(scripts).not.toContain("'unsafe-inline'");
  await expect(page.getByRole('heading', { name: 'Meet familiar words in every ayah.' })).toBeVisible();
  await page.getByRole('link', { name: 'Begin learning' }).click();
  await expect(page.getByRole('heading', { name: 'Make room for a few words.' })).toBeVisible();
  await page.getByRole('radio', { name: '3' }).check();
  await page.getByRole('button', { name: 'Start my first session' }).click();
  await expect(page).toHaveURL(/\/study/);
  await expect(page.getByRole('heading', { name: 'Meet this word' })).toBeVisible();
  await page.getByRole('button', { name: 'Try recalling it' }).click();
  await page.getByRole('button', { name: 'Reveal answer' }).click();
  await expect(page.getByRole('button', { name: /Good/ })).toBeEnabled();
  await page.getByRole('button', { name: /Good/ }).click();
  await expect(page.getByRole('button', { name: 'Undo last answer' })).toBeVisible();
});

test('reader validates navigation, word inspection, and bookmarks', async ({ page }) => {
  await page.goto('/read/1/1');
  await expect(page.getByRole('heading', { name: 'Ayah 1:1' })).toBeVisible();
  await page.locator('.token-button').first().click();
  await expect(page.getByRole('heading', { name: 'Word meaning' })).toBeVisible();
  await page.getByRole('button', { name: 'Close' }).click();
  await page.getByRole('button', { name: 'Bookmark ayah' }).click();
  await expect(page.getByRole('button', { name: 'Remove bookmark' })).toBeVisible();
  await page.getByRole('link', { name: '1:2 →' }).click();
  await expect(page.getByRole('heading', { name: 'Ayah 1:2' })).toBeVisible();
});

test('search, vocabulary filters, and legacy redirects work', async ({ page }) => {
  await page.goto('/read?mode=reference&q=2%3A255');
  await page.getByRole('link', { name: /Open ayah 2:255/ }).click();
  await expect(page.getByRole('heading', { name: 'Ayah 2:255' })).toBeVisible();
  await page.goto('/learn?q=mercy');
  await expect(page.getByRole('status')).toContainText(/entries/);
  await page.goto('/words');
  await expect(page).toHaveURL(/\/learn/);
  await page.goto('/learn/not-an-id');
  await expect(page.getByRole('heading',{name:'Page not found'})).toBeVisible();
});

test('unsaved memory notes survive browser history navigation',async({page})=>{
  await page.goto('/learn');
  await page.locator('.entry-link').first().click();
  const note=page.getByLabel('A personal reminder');
  await note.fill('Remember this contextual meaning');
  await page.goBack();
  await page.goForward();
  await expect(page.getByLabel('A personal reminder')).toHaveValue('Remember this contextual meaning');
});

test('restored practice, insights, commentary, and legacy routes work',async({page,request})=>{
  await page.goto('/quiz');
  await expect(page).toHaveURL(/\/practice\?mode=meaning/);
  await expect(page.getByRole('radio',{name:/Word meaning/})).toBeChecked();
  await page.getByRole('button',{name:'Start word meaning'}).click();
  await expect(page).toHaveURL(/mode=meaning&seed=\d+&round=0/);
  await page.locator('fieldset button').first().click();
  await expect(page).toHaveURL(/answer=/);
  await expect(page.getByRole('link',{name:'Next round'})).toBeVisible();

  await page.goto('/tadabbur/1/1');
  await expect(page).toHaveURL(/\/insights\/1\/1$/);
  await expect(page.getByRole('heading',{name:'Connections around this ayah'})).toBeVisible();
  await page.goto('/mutashabihat');
  await expect(page).toHaveURL(/\/insights\/practice$/);
  await expect(page.getByRole('heading',{name:'Compare the wording'})).toBeVisible();
  await page.goto('/word/a-l-h');
  await expect(page).toHaveURL(/\/learn\/l-[a-f0-9]{16}$/);

  const commentary=await request.get('/api/tafsir?ref=1:1&page=1');
  expect(commentary.ok()).toBeTruthy();
  expect((await commentary.json()).blocks.length).toBeGreaterThan(0);
});

test('optional prayer location persists without precise geolocation',async({page})=>{
  await page.goto('/settings#prayer-location');
  await page.getByLabel('City').fill('London');
  await page.getByLabel('Country').fill('United Kingdom');
  await page.getByRole('button',{name:'Save prayer location'}).click();
  await expect(page.getByRole('status')).toContainText('saved');
  await page.reload();
  await expect(page.getByLabel('City')).toHaveValue('London');
  await expect(page.getByLabel('Country')).toHaveValue('United Kingdom');
  await page.goto('/today');
  await expect(page.getByRole('heading',{name:'Daily ayah'})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Prayer times'})).toBeVisible();
});

test('core pages meet automated accessibility checks', async ({ page }, testInfo) => {
  test.setTimeout(60_000); // Fifteen full-page axe scans, including slower WebKit.
  for (const path of ['/', '/start', '/today', '/learn', '/read', '/practice', '/insights', '/insights/1/1', '/insights/practice', '/collections/names', '/progress', '/settings', '/sources', '/profile', '/login']) {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    const result = await new AxeBuilder({ page }).analyze();
    expect(result.violations, `${path} on ${testInfo.project.name}`).toEqual([]);
  }
});

test('restored grammar, split phrases, and full root families stay aligned', async ({ page }) => {
  for (const [surah, ayah, word] of [[2,181,4],[8,6,5],[13,37,9]]) {
    await page.goto(`/read/${surah}/${ayah}?word=${word}`);
    await expect(page.getByText('Meaning and analysis cover the phrase')).toBeVisible();
    await expect(page.getByRole('button', {name:'Listen to phrase', exact:true})).toBeVisible();
  }
  await page.goto('/read/2/181?word=5');
  await page.route('https://audio.qurancdn.com/**', route=>route.abort());
  const audioRequest=page.waitForRequest('https://audio.qurancdn.com/wbw/002_181_004.mp3');
  await page.getByRole('button',{name:'Listen to word',exact:true}).click();
  await audioRequest;
  await page.goto('/read/1/1?word=1');
  await page.getByText('Grammar and word parts',{exact:true}).click();
  await expect(page.getByText('Prefix · Preposition',{exact:true})).toBeVisible();
  await expect(page.getByText('Genitive',{exact:true})).toBeVisible();
  await page.goto('/read/1/1?word=3');
  await page.getByRole('button',{name:'Explore full root family'}).click();
  await expect(page.getByText(/word positions across the Quran/)).toBeVisible();
  await page.getByRole('button',{name:'Next examples'}).click();
  await expect(page.getByRole('status').filter({hasText:'Page 2 of'})).toBeVisible();
  await page.getByText('Original QuranWBW notes and verb forms',{exact:true}).click();
  await expect(page.getByRole('link',{name:/Read the original example/}).first()).toBeVisible();
  expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);
});
