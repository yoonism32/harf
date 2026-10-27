import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { cache } from 'react';
import { z } from 'zod';
import { ayahSchema, catalogSchema, entryPayloadSchema, nameEntrySchema } from './schema';
import { parseRef } from './refs';
// The content hash belongs to whatever is on disk right now: a content rebuild retires the
// previous directory, so a version captured at module load points at files that no longer exist.
async function currentVersion(){const manifest=JSON.parse(await readFile(join(process.cwd(),'public/content/manifest.json'),'utf8')) as {contentVersion?:unknown};const value=manifest.contentVersion;if(typeof value!=='string'||!/^[a-f0-9]{16}$/.test(value))throw new Error('Content manifest is unreadable');return value;}
async function read<T>(path:string,schema:z.ZodType<T>):Promise<T> {const version=await currentVersion();return schema.parse(JSON.parse(await readFile(join(process.cwd(),'public/content',version,path),'utf8')));}
export const readCatalog=cache(()=>read('catalog.json',catalogSchema));
export const readSurah=cache((number:number)=>{if(!Number.isInteger(number)||number<1||number>114)throw new Error('Invalid surah');return read(`surahs/${number}.json`,z.array(ayahSchema));});
export const readAyah=cache(async(ref:string)=>{const parsed=parseRef(ref);if(!parsed)return null;return (await readSurah(parsed.surah)).find(a=>a.ref===ref)??null;});
export const readEntry=cache(async(id:string)=>{if(!/^l-[a-f0-9]{16}$/.test(id))return null;const catalog=await readCatalog();if(!catalog.entries.some(e=>e.id===id))return null;return read(`entries/${id}.json`,entryPayloadSchema);});
export const readNames=cache(()=>read('names.json',z.array(nameEntrySchema)));
