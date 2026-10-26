import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {parseTranslation,resolveTranslationNotes} from '../content-translation';
import type {Ayah} from '../../lib/content/schema';
const meta=JSON.parse(readFileSync('data/quran-surah-meta.json','utf8')) as {id:number;verses:number}[];
const counts=new Map(meta.map(s=>[s.id,s.verses]));
const input=JSON.parse(readFileSync('data/source/qul/raw/translation-301.json','utf8')) as Record<string,{t:string}>;
const parse=(ref:string)=>parseTranslation(input[ref]!.t,ref,counts);
describe('structured translation compilation',()=>{
 it('retains source note anchor and paragraph citation',()=>{
  const a=parse('7:8');expect(a.notes).toHaveLength(1);
  const runs=a.paragraphs.flat();const marker=runs.findIndex(r=>r.kind==='reference'&&r.target.noteId==='7:8:n1');
  expect(marker).toBeGreaterThan(0);expect(runs.slice(0,marker).map(r=>r.text).join('')).toContain('true (weighing)');
  expect(a.translation).not.toContain('[1]');
  expect(a.notes[0]!.paragraphs!.flat()).toContainEqual(expect.objectContaining({kind:'reference',target:{kind:'ayah',ref:'21:47'}}));
 });
 it.each([['2:21','2:2'],['2:28','40:11'],['2:82','2:257'],['2:104','4:46']])('links main text %s to %s',(ref,target)=>{
  expect(parse(ref).paragraphs.flat()).toContainEqual(expect.objectContaining({kind:'reference',target:{kind:'ayah',ref:target}}));
 });
 it('resolves unique cross-note targets without guessing ambiguous notes',()=>{
  const rows=['101:6','7:8'].map(ref=>({ref,...parse(ref)})) as Ayah[];resolveTranslationNotes(rows);
  expect(rows[0]!.notes.flatMap(n=>n.paragraphs!.flat())).toContainEqual(expect.objectContaining({kind:'reference',target:{kind:'note',ref:'7:8',noteId:'7:8:n1'}}));
  rows[1]!.notes.push({...rows[1]!.notes[0]!,id:'7:8:n2'});
  const source={ref:'101:6',...parse('101:6')} as Ayah;resolveTranslationNotes([source,rows[1]!]);
  expect(source.notes.flatMap(n=>n.paragraphs!.flat()).find(r=>r.kind==='reference')!).toMatchObject({target:{kind:'note',ref:'7:8'}});
 });
 it('preserves safe source emphasis, paragraphs and invalid citations as text',()=>{
  const a=parseTranslation('<p>Hello <em>italic</em> <b>bold</b></p><p>V.999:1<script>bad()</script><a href="javascript:bad()"> safe</a></p>','1:1',counts);
  expect(a.paragraphs).toHaveLength(2);expect(a.paragraphs.flat()).toContainEqual({kind:'text',text:'italic',emphasis:'italic'});
  expect(a.translation).toBe('Hello italic bold V.999:1 safe');expect(a.paragraphs.flat().some(r=>r.kind==='reference')).toBe(false);
 });
 it.each([['21:100','21:100'],['17:45','17:45'],['33:4','58:3'],['6:121','9:31']])('links footnote citation formats in %s to %s',(ref,target)=>{
  expect(parse(ref).notes.flatMap(n=>n.paragraphs!.flat())).toContainEqual(expect.objectContaining({kind:'reference',target:{kind:'ayah',ref:target}}));
 });
 it('keeps a closing bracket with a bracketed citation',()=>{
  const runs=parseTranslation('<p>See Verse (21:100).</p>','1:1',counts).paragraphs.flat();
  expect(runs).toContainEqual({kind:'reference',text:'Verse (21:100)',target:{kind:'ayah',ref:'21:100'}});
 });
});
