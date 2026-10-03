import {describe,expect,it} from 'vitest';
import {highlightRanges,splitHighlighted} from '../highlight';
describe('Search result highlighting',()=>{
 it('finds English matches case-insensitively on the original text',()=>{
  const ranges=highlightRanges('The Believers come first','believe',(('english') as never));
  expect(ranges).toEqual([[4,11]]);
  expect('The Believers come first'.slice(4,11)).toBe('Believe');
 });
 it('finds Arabic matches through diacritics and alef/ya variants',()=>{
  const ranges=highlightRanges('رَحْمَة','رحمة',('arabic' as never));
  expect(ranges.length).toBe(1);
  const [start,end]=ranges[0]!;
  expect('رَحْمَة'.slice(start,end)).toBe('رَحْمَة');
 });
 it('splits text into highlighted and plain segments without dropping characters',()=>{
  const segments=splitHighlighted('hello world',[[0,5]]);
  expect(segments).toEqual([{text:'hello',match:true},{text:' world',match:false}]);
  expect(segments.map(s=>s.text).join('')).toBe('hello world');
 });
 it('returns no ranges for an empty query',()=>{
  expect(highlightRanges('some text','',('english' as never))).toEqual([]);
 });
});
