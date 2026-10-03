import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {catalogSchema} from '@/lib/content/schema';
import version from '@/lib/content/version.json';
import {dailyAyahReference} from '../daily';
import {parseRef} from '@/lib/content/refs';

const catalog=catalogSchema.parse(JSON.parse(readFileSync(`public/content/${version.contentVersion}/catalog.json`,'utf8')));
describe('daily ayah selection',()=>{
 it('is stable for a local date and always returns a canonical reference',()=>{
  const first=dailyAyahReference('2026-09-23',catalog.surahs);
  expect(dailyAyahReference('2026-09-23',catalog.surahs)).toBe(first);
  expect(parseRef(first)).not.toBeNull();
  expect(dailyAyahReference('2026-09-24',catalog.surahs)).not.toBe(first);
 });
});
