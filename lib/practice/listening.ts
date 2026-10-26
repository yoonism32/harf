import { parseRef } from '@/lib/content/refs';
export type ListeningEntry = { ref: string; juz: number };
export type ListeningFilters = { surah?: number; juz?: number; from?: string; to?: string };
const order = (ref: string) => { const [s,a]=ref.split(':').map(Number); return s!*1000+a!; };
export function listeningPool(entries: readonly ListeningEntry[], filters: ListeningFilters) {
 for (const ref of [filters.from,filters.to]) if(ref&&!parseRef(ref)) throw Error('Use a valid surah:ayah reference for the range.');
 if(filters.from&&filters.to&&order(filters.from)>order(filters.to)) throw Error('The start of the range must come before its end.');
 return entries.filter(e=>(!filters.surah||Number(e.ref.split(':')[0])===filters.surah)&&(!filters.juz||e.juz===filters.juz)&&(!filters.from||order(e.ref)>=order(filters.from))&&(!filters.to||order(e.ref)<=order(filters.to)));
}
export function listeningTarget(pool: readonly ListeningEntry[], seed: number, round: number) {
 if(!pool.length) throw Error('No ayahs match these filters.');
 const shuffled=[...pool]; let state=(seed^Math.imul(Math.floor(round/pool.length)+1,0x9e3779b1))>>>0;
 for(let i=shuffled.length-1;i>0;i--){state=(Math.imul(state,1664525)+1013904223)>>>0;const j=state%(i+1);[shuffled[i],shuffled[j]]=[shuffled[j]!,shuffled[i]!];}
 return shuffled[round%pool.length]!;
}
export type AnswerResult = { kind: 'invalid'; message: string } | { kind: 'retry' } | { kind: 'revealed'; base: number };
export function checkListeningAnswer(input: string, target: string, retry: boolean, knownSurah?: number): AnswerResult {
 const correct=parseRef(target)!;const text=input.trim().replace(/\s*:\s*/g,':');
 let parsed=parseRef(text);
 if(!parsed&&/^\d{1,3}$/.test(text)&&(retry||knownSurah)) parsed=parseRef(`${retry?correct.surah:knownSurah}:${Number(text)}`);
 // An explicitly supplied surah without an ayah can earn the ayah retry.
 if(!parsed&&!retry&&!knownSurah&&/^\d{1,3}:?$/.test(text)) {
  const s=Number(text.replace(':',''));if(s>=1&&s<=114)return s===correct.surah?{kind:'retry'}:{kind:'revealed',base:0};
 }
 if(!parsed)return {kind:'invalid',message:retry||knownSurah?'Enter a valid ayah number or surah:ayah.':'Enter a valid surah:ayah, for example 112:1.'};
 if(parsed.surah!==correct.surah)return {kind:'revealed',base:0};
 if(parsed.ayah===correct.ayah)return {kind:'revealed',base:retry?2:3};
 return retry?{kind:'revealed',base:1}:{kind:'retry'};
}
export function listeningScore(base: number, hints: number, english: boolean) {return Math.max(0,base-hints-Number(english));}
export type LocationHint = { label: string; remaining: ListeningEntry[] };
export function nextLocationHint(pool: readonly ListeningEntry[], target: ListeningEntry): LocationHint|null {
 for(const [label,remaining] of [
  [`Juz ${target.juz}`,pool.filter(e=>e.juz===target.juz)],
  [`Surah ${target.ref.split(':')[0]}`,pool.filter(e=>e.ref.split(':')[0]===target.ref.split(':')[0])],
 ] as Array<[string,ListeningEntry[]]>)if(remaining.length>=2&&remaining.length<pool.length)return {label,remaining};
 if(pool.length<=2)return null;
 const sorted=[...pool].sort((a,b)=>order(a.ref)-order(b.ref));const index=sorted.findIndex(e=>e.ref===target.ref);
 const size=Math.max(2,Math.ceil(pool.length/2));const start=Math.max(0,Math.min(index-Math.floor(size/2),pool.length-size));const remaining=sorted.slice(start,start+size);
 return {label:`Between ${remaining[0]!.ref} and ${remaining.at(-1)!.ref}`,remaining};
}
