import {morphologySchema,rootFamilySchema} from './morphology-schema';
import { z } from 'zod';
import { ayahSchema, catalogSchema, entryPayloadSchema, nameEntrySchema, overlapSchema, searchIndexSchema, type SearchMode } from './schema';
import { parseRef } from './refs';
import version from './version.json';
export const CONTENT_VERSION = version.contentVersion;
const pending = new Map<string, Promise<unknown>>();
const cache = new Map<string, unknown>();
let running = 0;
const waiting: Array<() => void> = [];
async function request<T>(path: string, schema: z.ZodType<T>): Promise<T> {
  if(cache.has(path)) { const value=cache.get(path)!; cache.delete(path); cache.set(path,value); return value as T; }
  const active=pending.get(path); if(active) return active as Promise<T>;
  const task=(async()=>{
    if(running>=4)await new Promise<void>(resolve=>waiting.push(resolve)); else running++;
    const controller=new AbortController(); const timer=setTimeout(()=>controller.abort(),8000);
    try {
      const response=await fetch(`/content/${CONTENT_VERSION}/${path}`,{signal:controller.signal});
      if(!response.ok)throw new Error(`Content could not be loaded (${response.status}). Please retry.`);
      const value=schema.parse(await response.json());
      if(!path.startsWith('search/')) { cache.set(path,value); for(const [prefix,limit] of [['surahs/',16],['morphology/',4],['roots/',8]] as const){const keys=[...cache.keys()].filter(k=>k.startsWith(prefix));if(keys.length>limit)cache.delete(keys[0]!);} }
      return value;
    } finally {clearTimeout(timer);const next=waiting.shift();if(next)next();else running--;}
  })();
  pending.set(path,task);
  try{return await task;}finally{pending.delete(path);}
}
export const getCatalog=()=>request('catalog.json',catalogSchema);
export function getSurah(number:number) { if(!Number.isInteger(number)||number<1||number>114)throw new Error('Invalid surah'); return request(`surahs/${number}.json`,z.array(ayahSchema)); }
export async function getAyah(ref:string) { const parsed=parseRef(ref);if(!parsed)throw new Error('Invalid ayah reference');const ayah=(await getSurah(parsed.surah)).find(a=>a.ref===ref);if(!ayah)throw new Error('Ayah unavailable');return ayah; }
export function getEntry(id:string) {if(!/^l-[a-f0-9]{16}$/.test(id))throw new Error('Invalid vocabulary entry');return request(`entries/${id}.json`,entryPayloadSchema);}
export const getNames=()=>request('names.json',z.array(nameEntrySchema));
export const getOverlap=()=>request('overlap.json',overlapSchema);
export function getSearchIndex(mode:SearchMode) {if(!['arabic','english','transliteration'].includes(mode))throw new Error('Invalid search mode');return request(`search/${mode}.json`,searchIndexSchema);}

export async function getWordDetail(key:string){
 const {parseWordKey}=await import('./refs');const ref=parseWordKey(key);if(!ref)throw Error('Invalid word reference');
 const data=await request(`morphology/${ref.surah}.json`,morphologySchema);
 const detail=data[key];if(!detail)throw Error('No word analysis for this position');return detail;
}
export function getRootFamily(id:string){if(!/^r-[a-f0-9]{16}$/.test(id))throw Error('Invalid root');return request(`roots/${id}.json`,rootFamilySchema);}
