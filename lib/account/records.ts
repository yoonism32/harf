import {z} from 'zod';
import {emptyData,cardSchema,reviewSchema,sessionSchema,noteSchema,bookmarkSchema,settingsSchema,type DataSnapshot} from '@/lib/data/schema';
export const cloudStores=['meta','cards','reviews','sessions','notes','bookmarks'] as const;
export const cloudMeta=['settings','activeSessionId','priorityEntries','lastVerse'] as const;
const recordSchema=z.object({collection:z.enum(cloudStores),key:z.string().min(1).max(120).refine(k=>!['__proto__','constructor','prototype'].includes(k)),value:z.unknown()});
export type CloudRecord=z.infer<typeof recordSchema>;
export const responseSchema=z.object({version:z.number().int().nonnegative().safe(),conflict:z.boolean(),changes:z.array(recordSchema)});
export type RecordMap=Record<string,CloudRecord>;
export function recordMap(data:DataSnapshot):RecordMap{
 const result:RecordMap={};
 for(const collection of cloudStores){
  if(collection==='meta')for(const key of cloudMeta){if(data.meta[key]!==undefined)result[`meta/${key}`]={collection,key,value:data.meta[key]};}
  else for(const value of data[collection])result[`${collection}/${value.id}`]={collection,key:value.id,value};
 }
 return JSON.parse(JSON.stringify(result)) as RecordMap;
}
function stable(value:unknown):string {
 if(value===undefined)return "undefined";
 if(Array.isArray(value))return `[${value.map(stable).join(",")}]`;
 if(value&&typeof value==="object")return `{${Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>`${JSON.stringify(k)}:${stable(v)}`).join(",")}}`;
 return JSON.stringify(value);
}
export function delta(base:RecordMap,next:RecordMap):CloudRecord[]{
 return [...new Set([...Object.keys(base),...Object.keys(next)])].filter(k=>stable(base[k])!==stable(next[k])).map(k=>next[k]??{...base[k]!,value:null});
}
export function applyRecords(base:RecordMap,changes:CloudRecord[]):RecordMap{
 const next={...base};
 for(const raw of changes){
  const record=recordSchema.parse(raw),{collection,key,value}=record;
  if(collection==='meta'&&!(cloudMeta as readonly string[]).includes(key))throw Error('Unknown cloud preference');
  if(value===null){delete next[`${collection}/${key}`];continue;}
  if(collection==='meta'){
   if(key==='settings')settingsSchema.parse(value);
   else if(key==='priorityEntries')z.array(z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/)).max(300).parse(value);
   else if(key==='lastVerse')z.string().regex(/^\d{1,3}:\d{1,3}$/).parse(value);
   else z.string().min(1).max(100).parse(value);
  }else{
   const parsed={cards:cardSchema,reviews:reviewSchema,sessions:sessionSchema,notes:noteSchema,bookmarks:bookmarkSchema}[collection].parse(value);
   if(parsed.id!==key)throw Error('Cloud record ID does not match');
  }
  next[`${collection}/${key}`]=record;
 }
 return next;
}
export function dataFromRecords(records:RecordMap,local:DataSnapshot=emptyData()):DataSnapshot{
 const data=emptyData();data.meta={...local.meta};data.legacy=local.legacy;
 for(const key of cloudMeta)delete data.meta[key];
 for(const record of Object.values(records)){
  if(record.collection==='meta')data.meta[record.key]=record.value;
  else (data[record.collection] as unknown[]).push(record.value);
 }
 return data;
}
