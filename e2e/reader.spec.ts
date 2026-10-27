import {test,expect} from '@playwright/test';
test('reader modes preserve the requested page and return its top ayah',async({page},testInfo)=>{
 await page.goto('/read/11/102');
 await expect(page.getByRole('heading',{level:1})).toContainText('Hud');
 await page.getByRole('link',{name:'Reading mode',exact:true}).click();
 await expect(page.getByRole('article',{name:'Mushaf page 233'})).toBeVisible();
 await expect(page.getByText('Surah 11 · First visible ayah 98 of 123')).toBeVisible();
 const article=page.getByRole('article',{name:'Mushaf page 233'});
 await article.screenshot({path:testInfo.outputPath('mushaf-page.png'),style:'.reader-audio { position: static !important; }'});
 await page.getByRole('combobox',{name:'Ayah',exact:true}).selectOption('102');
 await expect(page.getByRole('link',{name:'Ayah mode',exact:true})).toHaveAttribute('href','/read/11/98');
 await article.getByRole('button').first().click();
 const wide=(page.viewportSize()?.width??0)>=1200;
 const wordPanel=wide?page.getByRole('complementary',{name:'Selected word'}):page.getByRole('dialog',{name:'Word meaning'});
 await expect(wordPanel).toBeVisible();
 if(wide){const paper=await article.boundingBox(),box=await wordPanel.boundingBox();expect(box!.x).toBeGreaterThanOrEqual(paper!.x+paper!.width);await expect(page.getByRole('dialog',{name:'Word meaning'})).not.toBeVisible();const translation=page.getByRole('complementary',{name:'Ayah translation'});await expect(translation.getByRole('combobox',{name:'Translation ayah'})).toHaveValue('11:98');const left=await translation.boundingBox();expect(left!.x+left!.width).toBeLessThanOrEqual(paper!.x);await article.getByRole('button',{name:/11:102:1$/}).click();await expect(translation.getByRole('combobox',{name:'Translation ayah'})).toHaveValue('11:102');}
 else{const box=await wordPanel.boundingBox(),viewport=page.viewportSize()!;expect(Math.abs(box!.x+box!.width/2-viewport.width/2)).toBeLessThan(2);expect(Math.abs(box!.y+box!.height/2-viewport.height/2)).toBeLessThan(2);}
 await wordPanel.getByRole('button',{name:'Close',exact:true}).click();
 await page.getByRole('link',{name:'Ayah mode',exact:true}).click();
 await expect(page).toHaveURL(/\/read\/11\/98$/);
 await page.getByRole('link',{name:'Reading mode',exact:true}).click();
 await expect(page.getByRole('article',{name:'Mushaf page 233'})).toBeVisible();
 await page.getByRole('button',{name:'Next page',exact:true}).click();
 await expect(page.getByRole('article',{name:'Mushaf page 234'})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.getByRole('link',{name:'Ayah mode',exact:true}).click();
 await expect(page).toHaveURL(/\/read\/11\/109$/);
});
test('audio ranges pause, resume, change speed, stop and survive a mode toggle',async({page})=>{
 await page.addInitScript(`
  window.Audio=class {
   constructor(){window.testAudio=this;this.src='';this.playbackRate=1;this.defaultPlaybackRate=1;}
   async play(){this.onplaying?.();}
   pause(){}
   load(){}
   removeAttribute(){this.src='';}
  };
 `);
 await page.goto('/read/11/102');
 const audio=page.getByRole('region',{name:'Reader audio'});
 await audio.getByText('Audio options',{exact:true}).click();
 await audio.getByLabel('To ayah',{exact:true}).fill('103');
 await audio.getByRole('button',{name:'Play range',exact:true}).click();
 await expect(audio.getByRole('button',{name:'Pause',exact:true})).toBeVisible();
 await page.getByRole('link',{name:'Reading mode',exact:true}).click();
 await expect(page.getByRole('article',{name:'Mushaf page 233'})).toBeVisible();
 await expect(audio.getByRole('button',{name:'Pause',exact:true})).toBeVisible();
 await audio.getByRole('button',{name:'Pause',exact:true}).click();
 const speed=audio.getByRole('slider',{name:'Speed',exact:true});
 await speed.focus();
 for(let i=0;i<5;i++)await page.keyboard.press('ArrowLeft');
 await expect(speed).toHaveValue('0.75');
 await audio.getByRole('button',{name:'Resume',exact:true}).click();
 expect(await page.evaluate('window.testAudio.playbackRate')).toBe(0.75);
 await page.evaluate('window.testAudio.onended()');
 await expect(audio.getByRole('status')).toHaveText('Ayah 11:103');
 await page.evaluate('window.staleEnd=window.testAudio.onended');
 await audio.getByRole('button',{name:'Stop',exact:true}).click();
 await page.evaluate('window.staleEnd()');
 await expect(audio.getByRole('button',{name:'Play range',exact:true})).toBeVisible();
 await audio.getByRole('button',{name:'Play range',exact:true}).click();
 await page.evaluate('window.testAudio.onended()');
 await page.evaluate('window.testAudio.onended()');
 await expect(audio.getByRole('button',{name:'Play range',exact:true})).toBeVisible();
 await audio.getByRole('button',{name:/Reciter:/}).click();
 await expect(audio.getByRole('listbox',{name:'Reciters'})).toBeVisible();
 await page.keyboard.press('Escape');
});
test('settings reciter choices separate names from bitrates and persist selection',async({page})=>{
 await page.goto('/settings');
 const picker=page.getByRole('button',{name:/Reciter:/});
 await expect(picker).toBeEnabled();await picker.click();
 const list=page.getByRole('listbox',{name:'Reciters'});
 await expect(list).toBeVisible();
 const triggerBox=await picker.boundingBox(),menu=await page.locator('.reciter-menu').boundingBox();
 expect(Math.abs(menu!.x-triggerBox!.x)).toBeLessThan(2);expect(menu!.y).toBeGreaterThanOrEqual(triggerBox!.y+triggerBox!.height);
 await page.getByRole('combobox',{name:'Find a reciter'}).fill('Alafasy');
 await list.getByRole('option',{name:'Alafasy 64 kbps',exact:true}).click();
 await expect(picker).toHaveAccessibleName('Reciter: Alafasy · 64 kbps');
 await page.reload();await expect(picker).toHaveAccessibleName('Reciter: Alafasy · 64 kbps');
 await picker.focus();await page.keyboard.press('ArrowDown');await expect(list).toBeVisible();await page.keyboard.press('Escape');await expect(list).not.toBeVisible();await expect(picker).toBeFocused();
});
