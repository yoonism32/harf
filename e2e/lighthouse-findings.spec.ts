import {test, expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
declare global {interface Window {cspFailures: string[]}}

test('audited pages preserve visible labels and validate content without CSP eval violations', async ({page}) => {
 test.setTimeout(60_000);
 await page.addInitScript(() => {
  window.cspFailures = [];
  document.addEventListener('securitypolicyviolation', event => {
   window.cspFailures.push(`${event.violatedDirective}: ${event.blockedURI}`);
  });
 });
 for (const path of ['/', '/today', '/read/2/255']) {
  await page.goto(path);
  await page.waitForLoadState('networkidle');
  await expect(page.locator('.wordmark').filter({visible: true}).first()).toHaveAccessibleName('حرف Harf home');
  if (path === '/today') await expect(page.getByRole('region', {name: 'Vocabulary progress'})).toBeVisible();
  if (path === '/read/2/255') await expect(page.locator('.reader-verse .quran-text')).toBeVisible();
  const result = await new AxeBuilder({page}).withRules(['label-content-name-mismatch']).analyze();
  expect(result.violations, path).toEqual([]);
  expect(await page.evaluate(() => window.cspFailures), path).toEqual([]);
 }
});
