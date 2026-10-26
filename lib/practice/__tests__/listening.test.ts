import {describe,it,expect} from 'vitest';
import {checkListeningAnswer,listeningPool,listeningScore,listeningTarget,nextLocationHint} from '../listening';
const entries=[{ref:'2:140',juz:1},{ref:'2:141',juz:1},{ref:'2:142',juz:2},{ref:'2:143',juz:2},{ref:'3:1',juz:3}];
describe('typed listening',()=>{
 it('intersects verse boundaries, surah and juz',()=>{
  expect(listeningPool(entries,{surah:2,juz:2,from:'2:141',to:'2:142'})).toEqual([entries[2]]);
  expect(()=>listeningPool(entries,{from:'2:143',to:'2:140'})).toThrow();
  expect(()=>listeningPool(entries,{from:'115:1'})).toThrow();
  expect(listeningPool(entries,{surah:114})).toEqual([]);
 });
 it('selects deterministically without repetition through each cycle',()=>{
  const cycle=entries.map((_,i)=>listeningTarget(entries,42,i).ref);
  expect(new Set(cycle).size).toBe(entries.length);
  expect(entries.map((_,i)=>listeningTarget(entries,42,i).ref)).toEqual(cycle);
  expect(new Set(entries.map((_,i)=>listeningTarget(entries,42,i+entries.length).ref)).size).toBe(entries.length);
  expect(()=>listeningTarget([],42,0)).toThrow();
 });
 it('accepts whitespace and scores exact recall before retry',()=>{
  expect(checkListeningAnswer(' 112 : 1 ','112:1',false)).toEqual({kind:'revealed',base:3});
  expect(checkListeningAnswer('112:2','112:1',false)).toEqual({kind:'retry'});
  expect(checkListeningAnswer('1','112:1',true)).toEqual({kind:'revealed',base:2});
  expect(checkListeningAnswer('2','112:1',true)).toEqual({kind:'revealed',base:1});
  expect(checkListeningAnswer('111:1','112:1',false)).toEqual({kind:'revealed',base:0});
 });
 it('accepts ayah alone in known surah and grants retry for a missing ayah',()=>{
  expect(checkListeningAnswer('1','112:1',false,112)).toEqual({kind:'revealed',base:3});
  expect(checkListeningAnswer('112:','112:1',false)).toEqual({kind:'retry'});
  expect(checkListeningAnswer('112:99','112:1',false).kind).toBe('invalid');
  expect(checkListeningAnswer('nonsense','112:1',false).kind).toBe('invalid');
 });
 it('charges only applied assistance and never goes negative',()=>{
  expect(listeningScore(3,1,true)).toBe(1);
  expect(listeningScore(1,3,true)).toBe(0);
  expect(listeningScore(0,0,false)).toBe(0);
 });
 it('narrows with useful clues and does not reveal a singleton',()=>{
  const first=nextLocationHint(entries,entries[2]!);
  expect(first?.label).toBe('Juz 2');
  expect(first?.remaining).toEqual(entries.slice(2,4));
  expect(nextLocationHint(first!.remaining,entries[2]!)).toBeNull();
  expect(nextLocationHint([entries[2]!],entries[2]!)).toBeNull();
  const oneSurah=Array.from({length:10},(_,i)=>({ref:`2:${i+1}`,juz:30}));
  const hint=nextLocationHint(oneSurah,oneSurah[3]!);
  expect(hint?.remaining).toHaveLength(5);
  expect(hint?.remaining).toContain(oneSurah[3]);
  expect(hint?.label).toMatch(/^Between/);
 });
});
