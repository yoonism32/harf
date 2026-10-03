import {describe,expect,it} from 'vitest';
import {normalizeArabic,search} from '../match';
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
  expect(search([{ref:'1:1',text:'a'.repeat(201)}],'english','a'.repeat(201))).toEqual([]);
  expect(search(Array.from({length:35},(_,i)=>({ref:`2:${i+1}`,text:'believe'})),'english','believe')).toHaveLength(30);
 });
});
