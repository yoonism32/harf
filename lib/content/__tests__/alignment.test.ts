import {describe,expect,it} from 'vitest';
import {alignWordSpans,comparableArabic,fromBuckwalter} from '../alignment';
describe('source word alignment',()=>{
 it('maps split phrases and subsequent repeated words by spans, in both directions',()=>{
  const source=[{key:'2:181:3',arabic:'بَعْدَ مَا'},{key:'2:181:4',arabic:'مَا'}];
  const canonical=[{key:'2:181:3',arabic:'بَعْدَ'},{key:'2:181:4',arabic:'مَا'},{key:'2:181:5',arabic:'مَا'}];
  expect(alignWordSpans(source,canonical)).toEqual([
   {sourceKey:'2:181:3',canonicalKeys:['2:181:3','2:181:4']},
   {sourceKey:'2:181:4',canonicalKeys:['2:181:5']},
  ]);
  expect(alignWordSpans(canonical,source)[2]!.canonicalKeys).toEqual(['2:181:4']);
 });
 it('rejects changed scripture and cross-ayah links',()=>{
  expect(()=>alignWordSpans([{key:'1:1:1',arabic:'ب'}],[{key:'1:1:1',arabic:'ت'}])).toThrow('Scripture differs');
  expect(()=>alignWordSpans([{key:'1:1:1',arabic:'ب'}],[{key:'1:2:1',arabic:'ب'}])).toThrow('one ayah');
 });
 it('decodes Quranic marks and compares orthography without changing displayed text',()=>{
  expect(fromBuckwalter('bi')).toBe('بِ');
  expect(fromBuckwalter('somi')).toBe('سْمِ');
  expect(fromBuckwalter('Yy')).toBe('ىي');
  expect(comparableArabic(fromBuckwalter('ya`SaY`HibaYi'))).toBe(comparableArabic('يَـٰصَـٰحِبَىِ'));
  expect(comparableArabic('قَالُوا۟')).toBe(comparableArabic(fromBuckwalter('qaAluwA@')));
 });
});
