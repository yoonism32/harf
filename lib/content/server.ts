import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { cache } from 'react';
import { z } from 'zod';
import { ayahSchema, catalogSchema, entryPayloadSchema, nameEntrySchema } from './schema';
import { parseRef } from './refs';
import version from './version.json';
async function read<T>(path:string,schema:z.ZodType<T>):Promise<T> {return schema.parse(JSON.parse(await readFile(join(process.cwd(),'public/content',version.contentVersion,path),'utf8')));}
export const readCatalog=cache(()=>read('catalog.json',catalogSchema));
export const readSurah=cache((number:number)=>{if(!Number.isInteger(number)||number<1||number>114)throw new Error('Invalid surah');return read(`surahs/${number}.json`,z.array(ayahSchema));});
export const readAyah=cache(async(ref:string)=>{const parsed=parseRef(ref);if(!parsed)return null;return (await readSurah(parsed.surah)).find(a=>a.ref===ref)??null;});
export const readEntry=cache(async(id:string)=>{if(!/^l-[a-f0-9]{16}$/.test(id))return null;const catalog=await readCatalog();if(!catalog.entries.some(e=>e.id===id))return null;return read(`entries/${id}.json`,entryPayloadSchema);});
export const readNames=cache(()=>read('names.json',z.array(nameEntrySchema)));
