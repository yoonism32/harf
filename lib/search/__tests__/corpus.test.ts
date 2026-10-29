import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {search} from '../match';
import type {SearchIndex,SearchMode} from '../../content/schema';
import version from '../../content/version.json';
const cache=new Map<SearchMode,SearchIndex>();
const load=(m:SearchMode)=>{if(!cache.has(m))cache.set(m,JSON.parse(readFileSync(`public/content/${version.contentVersion}/search/${m}.json`,'utf8')));return cache.get(m)!;};
// Owner fixtures plus spelling, diacritic and boundary variants, checked against the real generated indexes.
describe('Search acceptance corpus',()=>{
 it.each<[SearchMode,string,string,number]>([
  ['transliteration',"fa inna ma'al 'usri yusran",'94:5',1],
  ['transliteration',"inna lil-laahi wa inna ilayhi raji'un ()",'2:156',1],
  ['transliteration','fainna maal usri yusra','94:5',1],
  ['transliteration','inna maal usri yusran','94:6',2],
  ['transliteration','innalillahi wainna ilayhi rajiun','2:156',1],
  ['transliteration','allahu la ilaha illa huwa al hayyul qayyum','2:255',1],
  ['transliteration','qul huwa allahu ahad','112:1',1],
  ['transliteration','wa radiya lahu qawla','20:109',1],
  ['transliteration','wa radhiya lahu qawla','20:109',1],
  ['transliteration','waradhiyalahuqawla','20:109',1],
  ['arabic','فَإِنَّ مَعَ الْعُسْرِ يُسْرًا','94:5',1],
  ['arabic','فان مع العسر يسرا','94:5',1],
  ['arabic','انا لله وانا اليه راجعون','2:156',1],
  ['arabic','قل هو الله احد','112:1',1],
  ['english','Indeed, with hardship','94:5',1],
  ['english','to Him we will return','2:156',1],
 ])('%s "%s" ranks %s within top %i',(mode,query,ref,top)=>{
  const rank=search(load(mode),mode,query).findIndex(r=>r.ref===ref)+1;
  expect(rank).toBeGreaterThan(0);expect(rank).toBeLessThanOrEqual(top);
 });
 it.each<[SearchMode,string]>([['english','zxqv blorp'],['transliteration','zzzz qqqq'],['arabic','ثثثث ظظظظ']])('%s nonsense "%s" finds nothing',(mode,query)=>{
  expect(search(load(mode),mode,query)).toEqual([]);
 });
});
