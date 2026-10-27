import {describe,expect,it} from 'vitest';
import {hitsFor} from '../jump';

describe('numeric reference hits',()=>{
 it('lists a whole surah for a bare number and one ayah for a full reference',()=>{
  expect(hitsFor('94')).toHaveLength(8);
  expect(hitsFor('94')[0]).toEqual({surah:94,ayah:1,name:'Ash-Sharh'});
  expect(hitsFor('2:255')).toEqual([{surah:2,ayah:255,name:'Al-Baqarah'}]);
 });
 it('resolves in-range ayahs and rejects out-of-range values',()=>{
  expect(hitsFor('94:1')).toEqual([{surah:94,ayah:1,name:'Ash-Sharh'}]);
  expect(hitsFor('94:20')).toEqual([]);
  expect(hitsFor('2:999')).toEqual([]);
  expect(hitsFor('999')).toEqual([]);
  expect(hitsFor('')).toEqual([]);
 });
});

describe('surah name hits',()=>{
 it('matches English names with or without the article and by word',()=>{
  expect(hitsFor('Yasin')).toEqual([{surah:36,ayah:1,name:'Ya-Sin'}]);
  expect(hitsFor('fatihah')).toEqual([{surah:1,ayah:1,name:'Al-Fatihah'}]);
  expect(hitsFor('baqara')).toEqual([{surah:2,ayah:1,name:'Al-Baqarah'}]);
  expect(hitsFor('imran')).toEqual([{surah:3,ayah:1,name:"Ali 'Imran"}]);
  expect(hitsFor("ma'idah")).toEqual([{surah:5,ayah:1,name:"Al-Ma'idah"}]);
 });
 it('folds common alternate spellings and accepts a surah prefix',()=>{
  expect(hitsFor('yaseen')).toEqual([{surah:36,ayah:1,name:'Ya-Sin'}]);
  expect(hitsFor('quraish')).toEqual([{surah:106,ayah:1,name:'Quraysh'}]);
  expect(hitsFor('Surah Nuh')).toEqual([{surah:71,ayah:1,name:'Nuh'}]);
  expect(hitsFor('surat al-baqarah')).toEqual([{surah:2,ayah:1,name:'Al-Baqarah'}]);
 });
 it('ranks exact matches first, caps the list, and returns no hits for unknown text',()=>{
  expect(hitsFor('nas')[0]).toEqual({surah:114,ayah:1,name:'An-Nas'});
  expect(hitsFor('nas').map(h=>h.surah)).toContain(110);
  expect(hitsFor('al').length).toBeLessThanOrEqual(20);
  expect(hitsFor('zzz')).toEqual([]);
 });
 it('matches Arabic surah names with or without ال',()=>{
  expect(hitsFor('يس')).toEqual([{surah:36,ayah:1,name:'Ya-Sin'}]);
  expect(hitsFor('الفاتحة')).toEqual([{surah:1,ayah:1,name:'Al-Fatihah'}]);
  expect(hitsFor('بقرة')).toEqual([{surah:2,ayah:1,name:'Al-Baqarah'}]);
  expect(hitsFor('عمران')).toEqual([{surah:3,ayah:1,name:"Ali 'Imran"}]);
 });
});
