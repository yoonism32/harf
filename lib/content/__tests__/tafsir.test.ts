import {describe,expect,it} from 'vitest';
import {getTafsir,structureTafsir} from '../tafsir';

describe('structured tafsir',()=>{
 it('keeps readable blocks and drops active content',()=>{
  expect(structureTafsir('<h2>Title</h2><p>Hello <b>world</b>.</p><p lang="ar">نص</p><script>alert(1)</script>')).toEqual([
   {kind:'heading',text:'Title'},
   {kind:'paragraph',text:'Hello world .'},
   {kind:'arabic',text:'نص'},
  ]);
 });
 it('rejects syntactically valid references outside the Quran',async()=>{
  await expect(getTafsir('114:7')).rejects.toThrow('Invalid ayah reference');
 });
});
