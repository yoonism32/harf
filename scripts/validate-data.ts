import {morphologySchema,rootFamilySchema} from '../lib/content/morphology-schema';
import {comparableArabic} from '../lib/content/alignment';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { z } from 'zod';
import { ayahSchema, catalogSchema, entryPayloadSchema, nameEntrySchema, overlapSchema, searchIndexSchema } from '../lib/content/schema';
const read=(path:string)=>readFileSync(join(process.cwd(),path),'utf8');
const json=(path:string)=>JSON.parse(read(path));
const assert=(condition:unknown,message:string)=>{if(!condition)throw new Error(message);};
const pointer=z.object({contentVersion:z.string().regex(/^[a-f0-9]{16}$/),releaseReady:z.boolean()}).parse(json('public/content/manifest.json'));
const base=`public/content/${pointer.contentVersion}`;
const manifest=z.object({contentVersion:z.string(),files:z.record(z.string(),z.string())}).parse(json(`${base}/manifest.json`));
for(const [path,hash] of Object.entries(manifest.files)){assert(!path.includes('..')&&!path.startsWith('/'),'Unsafe generated manifest path');assert(createHash('sha256').update(read(`${base}/${path}`)).digest('hex')===hash,`Output checksum mismatch: ${path}`);}
const catalog=catalogSchema.parse(json(`${base}/catalog.json`));
assert(manifest.contentVersion===pointer.contentVersion&&catalog.contentVersion===pointer.contentVersion,'Content version mismatch');
assert(pointer.releaseReady===catalog.releaseReady,'Release status mismatch');
assert(catalog.releaseReady===(catalog.blockers.length===0),'Release blockers disagree with release status');
const requiredFiles=['sources.json','catalog.json','names.json','overlap.json','alignment-report.json',...catalog.surahs.map(s=>`surahs/${s.number}.json`),...catalog.surahs.map(s=>`morphology/${s.number}.json`),'source-notices.txt',...catalog.entries.map(e=>`entries/${e.id}.json`),...['arabic','english','transliteration'].map(m=>`search/${m}.json`)];
for(const path of requiredFiles)assert(Object.hasOwn(manifest.files,path),`Missing output checksum: ${path}`);
assert(catalog.surahs.every((s,i)=>s.number===i+1),'Surah catalog order mismatch');
assert(catalog.entries.length===300,'Course must contain 300 entries');
assert(new Set(catalog.entries.map(e=>e.id)).size===300,'Duplicate course IDs');
const tokens=new Map<string,z.infer<typeof ayahSchema>['tokens'][number]>();
let verseCount=0,wordCount=0;const counts:Record<string,number>={};
for(const surah of catalog.surahs){const ayahs=z.array(ayahSchema).parse(json(`${base}/surahs/${surah.number}.json`));assert(ayahs.length===surah.ayahCount,`Missing ayahs ${surah.number}`);counts[surah.number]=0;ayahs.forEach((a,i)=>{assert(a.ref===`${surah.number}:${i+1}`,'Ayah order mismatch');verseCount++;a.tokens.forEach((t,j)=>{assert(t.key===`${a.ref}:${j+1}`&&t.position===j+1,'Token position mismatch');assert(!tokens.has(t.key),'Duplicate token');tokens.set(t.key,t);if(t.kind==='word'){wordCount++;counts[surah.number]=(counts[surah.number]??0)+1;}});});}
assert(verseCount===6236,'Incomplete verse corpus');
const overlap=overlapSchema.parse(json(`${base}/overlap.json`));assert(overlap.totalWords===wordCount,'Incorrect total word denominator');
for(const [s,n]of Object.entries(counts))assert(overlap.surahs[s]===n,`Incorrect surah denominator ${s}`);
for(const entry of catalog.entries){const payload=entryPayloadSchema.parse(json(`${base}/entries/${entry.id}.json`));assert(JSON.stringify(payload.entry)===JSON.stringify(entry),'Entry/catalog disagreement');assert(payload.examples.length===entry.exampleKeys.length,'Example count mismatch');assert(entry.representativeKey===entry.exampleKeys[0],'Representative mismatch');assert(new Set(entry.exampleKeys.map(k=>k.split(':').slice(0,2).join(':'))).size===entry.exampleKeys.length,'Repeated example verse');const occurrences=overlap.entries[entry.id]!;assert(Array.isArray(occurrences),'Missing entry occurrences');assert(new Set(occurrences).size===entry.occurrenceCount,'Duplicate or missing entry occurrences');for(const key of occurrences){const t=tokens.get(key);assert(t&&t.kind==='word'&&t.entryId===entry.id&&t.lemma===entry.lemma&&t.root===entry.root,'Misgrouped occurrence');}for(const [exampleIndex,example] of payload.examples.entries()){assert(example.targetKey===entry.exampleKeys[exampleIndex],'Example selection mismatch');assert(example.ref===example.targetKey.split(':').slice(0,2).join(':'),'Example verse mismatch');for(const token of example.tokens)assert(JSON.stringify(token)===JSON.stringify(tokens.get(token.key)),'Example differs from canonical text');const t=tokens.get(example.targetKey);assert(t&&t.entryId===entry.id&&t.gloss===example.targetGloss&&t.transliteration===example.targetTransliteration,'Unaligned answer');assert(example.tokens.some(token=>token.key===t!.key),'Missing target token');}}
for(const token of tokens.values())if(token.entryId)assert(overlap.entries[token.entryId]?.includes(token.key),'Assigned token missing from overlap');
assert(z.array(nameEntrySchema).parse(json(`${base}/names.json`)).length===99,'Missing Names');
for(const mode of ['arabic','english','transliteration'])assert(searchIndexSchema.parse(json(`${base}/search/${mode}.json`)).length===6236,`Incomplete ${mode} search`);
const expectedRoots=new Map<string,string[]>();
for(const token of tokens.values())if(token.kind==='word'&&token.root){const id=`r-${createHash('sha256').update(token.root.normalize('NFC')).digest('hex').slice(0,16)}`;expectedRoots.set(id,[...(expectedRoots.get(id)??[]),token.key]);}
let detailedWords=0;
for(const surah of catalog.surahs){
 const details=morphologySchema.parse(json(`${base}/morphology/${surah.number}.json`));
 for(const [key,detail] of Object.entries(details)){
  const token=tokens.get(key);assert(token?.kind==='word'&&key===detail.key&&key.startsWith(`${surah.number}:`),'Invalid morphology target');
  assert(detail.canonicalKeys.includes(key)&&new Set(detail.canonicalKeys).size===detail.canonicalKeys.length,'Invalid morphology span');
  const ref=key.split(':').slice(0,2).join(':');assert(detail.sourceKey.startsWith(`${ref}:`),'Morphology crosses ayah');
  for(const target of detail.canonicalKeys)assert(target.startsWith(`${ref}:`)&&tokens.get(target)?.kind==='word','Invalid span target');
  assert(detail.canonicalKeys.map(k=>tokens.get(k)!.arabic.replace(/\s/g,'')).join('')===detail.sourceArabic.replace(/\s/g,''),'Misaligned source surface');
  assert(comparableArabic(detail.segments.map(s=>s.arabic).join(''))===comparableArabic(detail.sourceArabic),'Misaligned grammar');
  if(detail.audioPath){const parts=detail.audioPath.slice(4,-4).split('_').map(Number);assert(`${parts[0]}:${parts[1]}`===ref,'Audio crosses ayah');}
  assert(detail.rootId===(token!.root?`r-${createHash('sha256').update(token!.root.normalize('NFC')).digest('hex').slice(0,16)}`:null),'Mismatched word/root link');
  if(detail.canonicalKeys.length>1)assert(JSON.stringify(token!.meaningScope?.keys)===JSON.stringify(detail.canonicalKeys),'Shared phrase meaning is not labeled');
  detailedWords++;
 }
}
assert(detailedWords===wordCount,'Missing word analyses');
for(const [id,keys] of expectedRoots){
 const path=`roots/${id}.json`;assert(Object.hasOwn(manifest.files,path),'Missing root checksum');
 const family=rootFamilySchema.parse(json(`${base}/${path}`));assert(family.id===id,'Root identity mismatch');
 assert(JSON.stringify(family.occurrences.map(o=>o.key))===JSON.stringify(keys),'Incomplete or unordered root family');
 for(const word of family.occurrences){const token=tokens.get(word.key)!;assert(token.root===family.root&&word.arabic===token.arabic&&word.gloss===token.gloss&&word.entryId===token.entryId&&word.lemma===token.lemma,'Misaligned root occurrence');}
 for(const note of family.notes)for(const key of note.summaryKeys)assert(tokens.get(key)?.kind==='word','Invalid original summary link');
}
console.log(`Validated ${verseCount} ayahs, ${wordCount} canonical words, 300 lemma entries, output hashes and answer alignment.`);
if(process.argv.includes('--release')&&!catalog.releaseReady){console.error(catalog.blockers.join('\n'));process.exitCode=1;}
