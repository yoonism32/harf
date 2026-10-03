import { describe,it,expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseRef,parseWordKey,adjacentRef } from '../refs';
import { catalogSchema,entryPayloadSchema,ayahSchema } from '../schema';
import version from '../version.json';
const read=(path:string)=>JSON.parse(readFileSync(`public/content/${version.contentVersion}/${path}`,'utf8'));
describe('Canonical content boundaries',()=>{
 it('validates references and crosses chapter boundaries without wrapping',()=>{
  expect(parseRef('2:286')).toEqual({surah:2,ayah:286});
  for(const value of ['2:287','0:1','115:1','01:1','1:0','2:1/../../'])expect(parseRef(value)).toBeNull();
  expect(parseWordKey('1:2:3')).toEqual({surah:1,ayah:2,position:3,ref:'1:2'});
  expect(adjacentRef('1:7',1)).toBe('2:1');expect(adjacentRef('2:1',-1)).toBe('1:7');
  expect(adjacentRef('1:1',-1)).toBeNull();expect(adjacentRef('114:6',1)).toBeNull();
 });
 it('preserves contextual word alignment and exact scripture text',()=>{
  const catalog=catalogSchema.parse(read('catalog.json'));
  const ayah=ayahSchema.parse(read('surahs/1.json')[1]);
  const lord=ayah.tokens.find(t=>t.key==='1:2:3')!;
  expect(lord.arabic).toBe('رَبِّ');expect(lord.gloss).toBe('the Lord');
  expect(lord.kind).toBe('word');expect(lord.entryId).not.toBeNull();
  const entry=entryPayloadSchema.parse(read(`entries/${lord.entryId}.json`));
  expect(entry.entry.lemma).toBe(lord.lemma);
  for(const example of entry.examples){const target=example.tokens.find(t=>t.key===example.targetKey)!;expect(target.entryId).toBe(entry.entry.id);expect(target.gloss).toBe(example.targetGloss);}
  expect(catalog.entries).toHaveLength(300);
 });
 it('does not claim automated compilation is editorial approval',()=>{
  const catalog=catalogSchema.parse(read('catalog.json'));
  if(catalog.releaseReady)expect(catalog.entries.every(e=>e.approval.status==='approved'&&e.approval.reviewer&&e.approval.evidence)).toBe(true);
  else expect(catalog.blockers.length).toBeGreaterThan(0);
 });
});

it('preserves the owner-selected original Names without claiming editorial verification',()=>{
 const original=JSON.parse(readFileSync('data/99names.json','utf8'));
 const names=read('names.json');
 expect(names).toHaveLength(99);
 for(const [index,name] of names.entries()){
  expect(name).toMatchObject(original[index]);
  expect(name.sourceIds).toEqual(['harf-original-names']);
  expect(name.verified).toBe(false);
 }
});

it('restores every word analysis and aligns split phrases, audio filenames and full root families',()=>{
 const morphology=read('morphology/2.json');
 expect(morphology['2:181:4'].sourceKey).toBe('2:181:3');
 expect(morphology['2:181:4'].canonicalKeys).toEqual(['2:181:3','2:181:4']);
 expect(morphology['2:181:5'].sourceKey).toBe('2:181:4');
 expect(morphology['2:181:5'].audioPath).toBe('wbw/002_181_004.mp3');
 expect(morphology['2:181:12'].audioPath).toBe('wbw/002_181_012.mp3');
 for(const [surah,key,sourceKey] of [[8,'8:6:5','8:6:4'],[13,'13:37:9','13:37:8']] as const){
  expect(read(`morphology/${surah}.json`)[key].sourceKey).toBe(sourceKey);
 }
 const split=read('surahs/2.json').find((a:{ref:string})=>a.ref==='2:181');
 expect(split.tokens[3].meaningScope.keys).toEqual(['2:181:3','2:181:4']);
 expect(split.tokens[3].gloss).toBe('after what');
 expect(split.tokens[5].transliteration).toBe('fa-innamā');
 const bism=read('morphology/1.json')['1:1:1'];
 expect(bism.segments.map((s:{features:string[]})=>s.features[0])).toEqual(['PREFIX','STEM']);
 expect(bism.segments[1].features).toContain('GEN');
 expect(read('morphology/36.json')['36:52:7'].audioPath).toBeNull();
 expect(read('surahs/36.json')[51].tokens[6].transliteration).toBe('hādhā');
 const family=read(`roots/${read('morphology/1.json')['1:1:3'].rootId}.json`);
 expect(family.occurrences.length).toBeGreaterThan(100);
 expect(family.occurrences.some((w:{entryId:string|null})=>w.entryId===null)).toBe(true);
 expect(family.notes.some((n:{verbForms:Record<string,string>})=>n.verbForms.perfect==='رَحِمَ')).toBe(true);
 const report=read('alignment-report.json').restoredMorphology;
 expect(report.alignedSourceWords).toBe(77429);
 expect(report.canonicalWords).toBe(77432);
 expect(report.segments).toBe(128011);
 expect(report.unresolvedNotes).toEqual([]);
});
