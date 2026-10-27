import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {search} from '../match';
import version from '../../content/version.json';
const CONTENT_VERSION=version.contentVersion;
const index=JSON.parse(readFileSync(`public/content/${CONTENT_VERSION}/search/transliteration.json`,'utf8'));
describe('Natural transliteration retrieval',()=>{
 it.each([
  ["fa inna ma'al 'usri yusran",'94:5'],
  ["inna lil-laahi wa inna ilayhi raji'un ()",'2:156'],
  ['fa-inna ma’a l-usri yusran','94:5'],
  ['inna lillaahi wa-inna ilayhi raaji’un','2:156'],
 ])('ranks %s at %s',(query,ref)=>{
  const result=search(index,'transliteration',query)[0]!;
  expect(result.ref).toBe(ref);
  expect(result.ranges.length).toBeGreaterThan(0);
  expect(result.ranges.every(([a,b])=>a>=0&&b>a&&b<=result.text.length)).toBe(true);
 });
 it.each([
  ["al-ladheena ithaa aSaabathum museebatun qaloo inaa lil-laahi wa inaa ilaayhi raji'oon",'2:156'],
  ["waman y'amal minas Saalihaati min dhakarin aw unthaa wahuwa mu'min faUlaaika yadkhuloona aljanata wala yudhlamoon naqeeran",'4:124'],
  ["innaladheena aamanoo wa'amilu as-Saalihaati wa a aqqamuSalaati wa atuz zakaata lahum ajruhum 'inda rabihim wala khawfun alayhim walaa hum yahzanoon",'2:277'],
  ["wabashiriladheena amaanoo wa'amilushalaahit annal lahum janaathin tajree min taHtihal anhaaru kullamaa ruziqoo minhaa min thamaratin rizqan",'2:25'],
 ])('finds a hand-typed phrase with dropped diacritics and no word breaks: %s',(query,ref)=>{
  const result=search(index,'transliteration',query).find(r=>r.ref===ref);
  expect(result).toBeDefined();
  expect(result!.ranges.every(([a,b])=>a>=0&&b>a&&b<=result!.text.length)).toBe(true);
  // Drifted wording must report less confidence than an exact or spelling-variant hit.
  expect(result!.confidence).toBeGreaterThanOrEqual(55);
  expect(result!.confidence).toBeLessThan(95);
 });
 it('does not reuse a single occurrence for repeated query words',()=>{
  expect(search([{ref:'1:1',text:'inna lillahi'}],'transliteration','inna inna')).toEqual([]);
 });
 it('ranks ordered words above reversed words and marks approximation',()=>{
  const rows=[{ref:'1:1',text:'yusran inna'},{ref:'1:2',text:'inna yusran'}];
  expect(search(rows,'transliteration','inna yusran')[0]?.ref).toBe('1:2');
  expect(search(rows,'transliteration','inna yusrab')[0]?.matchType).toBe('Approximate wording');
  expect(search(rows,'transliteration','zxqvxx zzzzz')).toEqual([]);
 });
 it('preserves original display text and locates a phrase after a long introduction',()=>{
  const text='introduction '.repeat(30)+'innā lillahi wa-innā ilayhi rājiʿūna';
  const result=search([{ref:'2:156',text}],'transliteration',"inna lil-laahi wa inna ilayhi raji'un")[0]!;
  expect(result.text).toBe(text);expect(result.ranges[0]![0]).toBeGreaterThan(240);
 });
});
