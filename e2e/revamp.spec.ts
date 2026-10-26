import {test,expect} from '@playwright/test';
import {listeningTarget} from '../lib/practice/listening';

for(const [query,ref] of [["fa inna ma'al 'usri yusran",'94:5'],["inna lil-laahi wa inna ilayhi raji'un ()",'2:156'],['allahu la ilaha illa huwa al hayyul qayyum','2:255'],['انا لله وانا اليه راجعون','2:156']]){
 test(`natural search "${query}" finds ${ref} first`,async({page})=>{
  await page.goto(`/read?mode=all&q=${encodeURIComponent(query!)}`);
  const results=page.locator('.search-result');
  await expect(results.first()).toHaveAttribute('href',`/read/${ref!.replace(':','/')}`);
  await expect(results.first().locator('mark').first()).toBeVisible();
 });
}

test('two-letter Arabic searches in All mode',async({page})=>{
 await page.goto(`/read?mode=all&q=${encodeURIComponent('رب')}`);
 await expect(page.locator('.search-result').first()).toBeVisible();
 await expect(page.getByText('Enter more characters to search.')).toHaveCount(0);
});

test('single-surah listening accepts typed ayah retry and adapts hints',async({page})=>{
 await page.goto('/practice?mode=listening&seed=42&round=0');
 await page.getByText('Range and playback options',{exact:true}).click();
 await page.getByLabel('Surah',{exact:true}).selectOption('112');
 await page.getByRole('button',{name:'Apply range and restart'}).click();
 await expect(page.getByText('4 ayahs in this range.',{exact:false})).toBeVisible();
 await expect(page.getByText('Surah 112 is selected.',{exact:false})).toBeVisible();
 const target=listeningTarget(Array.from({length:4},(_,i)=>({ref:`112:${i+1}`,juz:30})),42,0).ref;
 const ayah=Number(target.split(':')[1]);
 await page.getByRole('button',{name:'Narrow location (−1 point)'}).click();
 await expect(page.getByText(/^Between 112:/)).toBeVisible();
 await expect(page.getByRole('button',{name:'Narrow location (−1 point)'})).toBeDisabled();
 await page.getByLabel('Your answer',{exact:true}).fill(String(ayah===1?2:1));
 await page.getByRole('button',{name:'Check answer'}).click();
 await expect(page.getByText('The surah is right. Try the ayah number once more.')).toBeVisible();
 await page.getByLabel('Ayah number',{exact:true}).fill(String(ayah));
 await page.getByRole('button',{name:'Check answer'}).click();
 await expect(page.getByRole('heading',{name:`Ayah ${target}`,exact:true})).toBeVisible();
 await expect(page.getByText('1 / 3 points',{exact:false})).toBeVisible();
});

test('one-ayah listening range is explicitly unscored',async({page})=>{
 await page.goto('/practice?mode=listening&seed=42&round=0');
 await page.getByText('Range and playback options',{exact:true}).click();
 await page.getByLabel('From (optional)').fill('112:1');
 await page.getByLabel('To (optional)').fill('112:1');
 await page.getByRole('button',{name:'Apply range and restart'}).click();
 await expect(page.getByText('Only 112:1 is selected, so this round is unscored.')).toBeVisible();
 await expect(page.getByRole('button',{name:'Check answer'})).toHaveCount(0);
});

test('translation reference preview closes with focus and reader position preserved',async({page})=>{
 await page.goto('/read/2/21');
 const trigger=page.getByRole('button',{name:'Preview ayah 2:2',exact:true});
 await trigger.scrollIntoViewIfNeeded();
 await trigger.focus();
 const before=await page.evaluate(()=>scrollY);
 await trigger.click();
 const dialog=page.getByRole('dialog',{name:'Ayah 2:2',exact:true});
 await expect(dialog).toBeVisible();
 await expect(dialog.getByRole('link',{name:'Open full ayah 2:2 →'})).toBeVisible();
 await page.keyboard.press('Escape');
 await expect(dialog).not.toBeVisible();
 await expect(trigger).toBeFocused();
 await expect(page).toHaveURL(/\/read\/2\/21$/);
 expect(Math.abs(await page.evaluate(()=>scrollY)-before)).toBeLessThan(5);
});

test('inline footnote opens and follows a verse reference within one preview',async({page})=>{
 await page.goto('/read/7/8');
 await page.getByRole('button',{name:/Open footnote/}).first().click();
 const dialog=page.getByRole('dialog');
 await expect(dialog.getByRole('heading',{name:'Footnotes for 7:8'})).toBeVisible();
 await dialog.getByRole('button',{name:'Preview ayah 21:47'}).click();
 await expect(dialog.getByRole('heading',{name:'Ayah 21:47'})).toBeVisible();
 await dialog.getByRole('button',{name:'← Back in preview'}).click();
 await expect(dialog.getByRole('heading',{name:'Footnotes for 7:8'})).toBeVisible();
 await dialog.getByRole('button',{name:'Close',exact:true}).click();
 await expect(dialog).not.toBeVisible();
 await expect(page).toHaveURL(/\/read\/7\/8$/);
});

test('desktop reference preview preserves selected word',async({page})=>{
 await page.setViewportSize({width:1440,height:900});
 await page.goto('/read/2/21?word=1');
 await expect(page.getByRole('heading',{name:'Word meaning',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Preview ayah 2:2',exact:true}).click();
 await expect(page.getByRole('dialog',{name:'Ayah 2:2',exact:true})).toBeVisible();
 await page.keyboard.press('Escape');
 await expect(page.locator('.selected-token')).toHaveCount(1);
 await expect(page).toHaveURL(/word=1/);
});
