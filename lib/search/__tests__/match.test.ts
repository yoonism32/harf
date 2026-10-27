import {describe,expect,it} from 'vitest';
import {normalizeArabic,search,searchNotice} from '../match';
describe('Search gate',()=>{
 it('refuses a lone function word and a lone short fragment',()=>{
  expect(searchNotice('english','verily')).toMatch(/too common/);
  expect(searchNotice('english','her')).toMatch(/whole word/);
 });
 it('allows one distinctive word, or two words with one distinctive',()=>{
  expect(searchNotice('english','hardship')).toBe('');
  expect(searchNotice('english','verily hardship')).toBe('');
 });
 it('refuses two words that are both common, and never gates other modes',()=>{
  expect(searchNotice('english','the day')).toMatch(/distinctive/);
  expect(searchNotice('transliteration','verily')).toBe('');
  expect(searchNotice('arabic','رحمة')).toBe('');
 });
});
describe('Search boundaries',()=>{
 it('matches whole English words rather than substrings',()=>{
  const index=[{ref:'1:1',text:'the other believer'},{ref:'1:2',text:'her belief'}];
  expect(search(index,'english','her').map(row=>row.ref)).toEqual(['1:2']);
 });
 it('orders exact phrases before scattered words and stem matches',()=>{
  const index=[{ref:'1:1',text:'believers come to believe'},{ref:'1:2',text:'believe and come'},{ref:'1:3',text:'come believe'}];
  expect(search(index,'english','come believe').map(row=>row.ref)).toEqual(['1:3','1:1','1:2']);
 });
 it('bounds queries and results without changing source Arabic',()=>{
  const text='رَحْمَة';
  expect(normalizeArabic(text)).toBe('رحمة');
  expect(search([{ref:'1:1',text}],'arabic','رحمه')).toEqual([]);
  expect(search([{ref:'1:1',text:'the'}],'english','th')).toEqual([]);
  expect(search([{ref:'1:1',text:'a'.repeat(401)}],'english','a'.repeat(401))).toEqual([]);
  expect(search(Array.from({length:35},(_,i)=>({ref:`2:${i+1}`,text:'believe'})),'english','believe')).toHaveLength(30);
 });
 it('finds a later exact word after an earlier substring miss',()=>{
  const [row]=search([{ref:'1:1',text:'the other her'}],'english','her');
  expect(row?.matchType).toBe('Phrase');expect(row?.ranges).toEqual([[10,13]]);
 });
 it('finds an approximate phrase late in a long ayah',()=>{
  const text='opening '.repeat(45)+'inna yusran';
  const [row]=search([{ref:'1:1',text}],'transliteration','inna yusrab');
  expect(row?.matchType).toBe('Approximate wording');expect(row?.ranges[0]![0]).toBe(360);
 });
});
describe('Half-remembered transliteration',()=>{
 const ayah={ref:'6:53',text:'alaysa l-lahu bi-alama bil-shakirina'};
 it('finds an ayah when the last word is only half remembered',()=>{
  const [row]=search([ayah],'transliteration',"a'lama shak");
  expect(row?.ref).toBe('6:53');expect(row?.matchType).toBe('Partial wording');
 });
 it('accepts a differently spelled half-remembered word',()=>{
  expect(search([ayah],'transliteration',"a'lama shakireen").map(row=>row.ref)).toEqual(['6:53']);
 });
 it('ranks an exact phrase above a partial reading',()=>{
  const rows=[{ref:'1:1',text:'alama shak'},{ref:'1:2',text:'bi-alama bil-shakirina'}];
  expect(search(rows,'transliteration',"a'lama shak").map(row=>[row.ref,row.matchType])).toEqual([['1:1','Phrase'],['1:2','Partial wording']]);
 });
 it('still refuses a fragment of fewer than three letters',()=>{
  expect(search([ayah],'transliteration',"a'lama sh")).toEqual([]);
 });
 it('leaves whole-word English and Arabic matching strict',()=>{
  expect(search([{ref:'1:1',text:'believe'}],'english','belie')).toEqual([]);
 });
});
