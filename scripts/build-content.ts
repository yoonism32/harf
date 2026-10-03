import {buildMorphology,rootId} from './content-morphology';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { parseFragment, type DefaultTreeAdapterMap } from 'parse5';
import { z } from 'zod';
import { ayahSchema, catalogSchema, entryPayloadSchema, nameEntrySchema, type Ayah, type Token, type VocabularyEntry, type TranslationNote } from '../lib/content/schema';
const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');
const json = (path: string) => JSON.parse(read(path));
const hash = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
const write = (path: string, value: unknown) => { mkdirSync(join(root, path, '..'), { recursive: true }); writeFileSync(join(root, path), JSON.stringify(value)); };
const sourceSchema = z.object({ mode: z.enum(['preview', 'qul']), files: z.array(z.object({ path: z.string(), sha256: z.string().regex(/^[a-f0-9]{64}$/), url: z.string().url().nullable(), retrievedAt: z.string().min(1), sourceVersion: z.string().min(1), termsEvidence: z.string().min(1), tokenization: z.string().min(1), attribution: z.string().min(1), permission: z.enum(['pending', 'verified']) })), blockers: z.array(z.string()) });
const sources = sourceSchema.parse(json('data/sources.json'));
const pinnedPaths = new Set(sources.files.map(source => source.path));
if (pinnedPaths.size !== sources.files.length) throw new Error('Duplicate pinned source path');
const contentSources = ['data/tafsir-ibn-kathir.json','data/99names.json','data/source/preview/qac-morphology-0.4.txt','data/source/preview/manifest.json','data/wbw-morphology.json'];
const requiredPaths = [...contentSources, ...(sources.mode === 'preview'
 ? ['data/source/preview/qac-morphology-0.4.txt', ...Array.from({length:114}, (_,i) => `data/source/preview/surah-${i+1}.json`)]
 : ['data/source/qul/raw/uthmani.json','data/source/qul/raw/word-glosses.json','data/source/qul/raw/word-transliteration.json','data/source/qul/raw/translation-301.json','data/source/qul/raw/word-lemma.db','data/source/qul/raw/word-root.db'])];
for (const path of requiredPaths) if (!pinnedPaths.has(path)) throw new Error(`Unpinned source input: ${path}`);
for (const source of sources.files) if (hash(readFileSync(join(root, source.path))) !== source.sha256) throw new Error(`Pinned hash mismatch: ${source.path}`);
const previewManifest=z.record(z.string().regex(/^surah-(?:[1-9]|[1-9][0-9]|10[0-9]|11[0-4])\.json$/),z.string().regex(/^[a-f0-9]{64}$/)).parse(json('data/source/preview/manifest.json'));
for(let n=1;n<=114;n++){const path=`surah-${n}.json`;if(previewManifest[path]!==hash(readFileSync(join(root,'data/source/preview',path))))throw Error(`Preview source checksum mismatch ${path}`);}
const approval = z.object({ status: z.enum(['pending','approved']), reviewer:z.string().optional(), reviewedAt:z.string().optional(), evidence:z.string().optional() });
const overrides = z.object({ entries: z.record(z.string(), z.object({ exampleKeys: z.array(z.string()).min(1).max(3).optional(), approval: approval.optional() })), legacyMappings: z.record(z.string().regex(/^[a-z0-9-]+$/),z.string().regex(/^l-[a-f0-9]{16}$/)), namesApproved:z.boolean() }).parse(json('data/course-overrides.json'));
const alignment = z.object({ exceptions:z.record(z.string(),z.object({ sourceKeys:z.array(z.string()).min(1), evidence:z.string().min(10) })) }).parse(json('data/token-alignment.json'));
const contentVersion = hash(JSON.stringify({files:sources.files.map(s=>s.sha256),sources,overrides,alignment,compiler:hash(read('scripts/build-content.ts')+read('scripts/content-morphology.ts')+read('lib/content/alignment.ts')+read('lib/content/morphology-schema.ts')),schema:hash(read('lib/content/schema.ts')),metadata:hash(read('data/quran-surah-meta.json'))})).slice(0,16);
const contentRoot=join(root,'public/content');
const previousPointer=existsSync(join(contentRoot,'manifest.json'))?z.object({contentVersion:z.string().regex(/^[a-f0-9]{16}$/),releaseReady:z.boolean()}).parse(json('public/content/manifest.json')):null;
const existingVersions=existsSync(contentRoot)?readdirSync(contentRoot,{withFileTypes:true}).filter(entry=>entry.isDirectory()&&/^[a-f0-9]{16}$/.test(entry.name)).map(entry=>entry.name):[];
const previousContentVersion=previousPointer?.releaseReady?(previousPointer.contentVersion===contentVersion?existingVersions.find(version=>version!==contentVersion)??null:previousPointer.contentVersion):null;
const out = `public/content/${contentVersion}`;
const bwLatin = "'|>&<}AbptvjHxd*rzs$SDTZEgfqklmnhwYyFNKaui~o`{^#:";
const bwArabic = 'ءآأؤإئابةتثجحخدذرزسشصضطظعغفقكلمنهوىيًٌٍَُِّْٰٱۣٓٔۜ';
const bw = (text:string) => [...text].map(c=> { const i=bwLatin.indexOf(c); return i<0?c:[...bwArabic][i]??c; }).join('');
const alignText = (text:string) => text.normalize('NFC').replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g,'').replace(/ٱ/g,'ا');
function plain(html:string):string {
 const walk=(node:DefaultTreeAdapterMap['node']):string=> {
  if ('tagName' in node && ['script','style','sup'].includes(node.tagName)) return '';
  if ('value' in node) return node.value;
  if (!('childNodes' in node)) return '';
  const text = node.childNodes.map(walk).join('');
  return 'tagName' in node && ['p','div','br','li'].includes(node.tagName) ? ` ${text} ` : text;
 };
 return walk(parseFragment(html)).replace(/\s+/g,' ').trim();
}
function splitFootnotes(raw:string):{translation:string,notes:TranslationNote[]} {
 const notes:TranslationNote[]=[];
 const withoutNotes=raw.replace(/\[\[([\s\S]*?)\]\]/g,(_,inner:string)=>{
  const text=plain(inner);
  if(!text) return '';
  const refMatch=/see\s+(?:the\s+)?footnote\s+of\s*\(?\s*v\.?\s*(\d+)\s*:\s*(\d+)\s*\)?/i.exec(text);
  notes.push({text,ref:refMatch?{surah:Number(refMatch[1]),ayah:Number(refMatch[2])}:null});
  return '';
 });
 return {translation:plain(withoutNotes),notes};
}
let qulWords!:Record<string,{text:string}>,qulGlosses:Record<string,string>,qulTranslit:Record<string,string>,qulTranslation:Record<string,{t:string}>;
const qulLemma=new Map<string,string>(),qulRoot=new Map<string,string>();
if(sources.mode==='qul') {
 qulWords=z.record(z.string(),z.object({text:z.string().min(1)})).parse(json('data/source/qul/raw/uthmani.json'));
 qulGlosses=z.record(z.string(),z.string()).parse(json('data/source/qul/raw/word-glosses.json'));
 qulTranslit=z.record(z.string(),z.string()).parse(json('data/source/qul/raw/word-transliteration.json'));
 qulTranslation=z.record(z.string(),z.object({t:z.string().min(1)})).parse(json('data/source/qul/raw/translation-301.json'));
 const lemmaDb=new DatabaseSync(join(root,'data/source/qul/raw/word-lemma.db'));
 const lemmaText=new Map((lemmaDb.prepare('SELECT id, text FROM lemmas').all() as {id:number,text:string}[]).map(r=>[r.id,String(r.text).normalize('NFC')]));
 for(const row of lemmaDb.prepare('SELECT lemma_id, word_location FROM lemma_words').all() as {lemma_id:number,word_location:string}[]) qulLemma.set(row.word_location,lemmaText.get(row.lemma_id)!);
 lemmaDb.close();
 const rootDb=new DatabaseSync(join(root,'data/source/qul/raw/word-root.db'));
 const rootText=new Map((rootDb.prepare('SELECT id, arabic_trilateral FROM roots').all() as {id:number,arabic_trilateral:string}[]).map(r=>[r.id,String(r.arabic_trilateral).replace(/\s+/g,'').normalize('NFC')]));
 for(const row of rootDb.prepare('SELECT root_id, word_location FROM root_words').all() as {root_id:number,word_location:string}[]) qulRoot.set(row.word_location,rootText.get(row.root_id)!);
 rootDb.close();
}
const morph = new Map<string,{forms:string[],lemma:string|null,root:string|null,ambiguous?:boolean}>();
if (sources.mode==='preview') for(const line of read('data/source/preview/qac-morphology-0.4.txt').split(/\r?\n/)) {
 const match=/^\((\d+:\d+:\d+):\d+\)\t([^\t]+)\t[^\t]+\t(.+)$/.exec(line); if(!match) continue;
 const key=match[1]!,form=match[2]!,features=match[3]!;
 const current=morph.get(key)??{forms:[],lemma:null,root:null}; current.forms.push(bw(form));
 const lemma=/(?:^|\|)LEM:([^|]+)/.exec(features)?.[1];
 const sourceRoot=/(?:^|\|)ROOT:([^|]+)/.exec(features)?.[1];
 if(lemma) { if(current.lemma || current.ambiguous) { current.lemma=null; current.root=null; current.ambiguous=true; } else { current.lemma=bw(lemma).normalize('NFC'); current.root=sourceRoot?bw(sourceRoot).normalize('NFC'):null; } }
 morph.set(key,current);
}
const qulWordsByRef=new Map<string,string[]>();
if(sources.mode==='qul')for(const key of Object.keys(qulWords)){const ref=key.split(':').slice(0,2).join(':');const keys=qulWordsByRef.get(ref)??[];keys.push(key);qulWordsByRef.set(ref,keys);}
const metadata=z.array(z.object({id:z.number(),arabic:z.string(),name:z.string(),verses:z.number()})).parse(json('data/quran-surah-meta.json'));
const surahs=metadata.map(s=>({number:s.id,arabicName:s.arabic,englishName:s.name,ayahCount:s.verses}));
const ayahs:Ayah[]=[]; const unaligned:string[]=[]; const groups=new Map<string,Token[]>();
const apiWord=z.object({position:z.number().int().positive(),text_uthmani:z.string(),char_type_name:z.enum(['word','end']),translation:z.object({text:z.string().nullable()}),transliteration:z.object({text:z.string().nullable()})});
const apiChapter=z.object({verses:z.array(z.object({verse_key:z.string(),words:z.array(apiWord),translations:z.array(z.object({resource_id:z.number(),text:z.string()}))})),pagination:z.object({next_page:z.number().nullable()})});
for(const surah of surahs) {
 let rows:Ayah[];
 if(sources.mode==='qul') {
  rows=Array.from({length:surah.ayahCount},(_,i)=>{
   const ref=`${surah.number}:${i+1}`;
   const wordKeys=(qulWordsByRef.get(ref)??[]).sort((a,b)=>Number(a.split(':')[2])-Number(b.split(':')[2]));
   if(!wordKeys.length) throw new Error(`Missing words for ayah ${ref}`);
   const lastPosition=Number(wordKeys[wordKeys.length-1]!.split(':')[2]);
   const rawTranslation=qulTranslation[ref]?.t; if(!rawTranslation) throw new Error(`Missing translation for ayah ${ref}`);
   const {translation,notes}=splitFootnotes(rawTranslation);
   return {ref,translation,translationSource:'qul-301-hilali-khan',notes,tokens:wordKeys.map(key=>{
    const position=Number(key.split(':')[2]); const marker=position===lastPosition;
    return {key,position,arabic:qulWords[key]!.text,kind:marker?'end-marker' as const:'word' as const,gloss:marker?'':plain(qulGlosses[key]??''),transliteration:marker?'':plain(qulTranslit[key]??''),lemma:marker?null:qulLemma.get(key)??null,root:marker?null:qulRoot.get(key)??null,entryId:null};
   })};
  });
 } else {
  const source=apiChapter.parse(json(`data/source/preview/surah-${surah.number}.json`)); if(source.pagination.next_page!==null) throw new Error('Incomplete chapter pagination');
  rows=source.verses.map(v=>({ref:v.verse_key,translation:plain(v.translations.find(t=>t.resource_id===203)?.text??''),translationSource:'quran-com-203-hilali-khan',notes:[],tokens:v.words.map(w=>{
   const key=`${v.verse_key}:${w.position}`; const record=morph.get(key); const exception=alignment.exceptions[key];
   const mapped=exception?exception.sourceKeys.map(k=>morph.get(k)):record?[record]:[];
   const matches=mapped.length>0&&mapped.every(Boolean)&&alignText(mapped.flatMap(m=>m!.forms).join(''))===alignText(w.text_uthmani);
   if(record&&!matches)unaligned.push(key);
   const lemma=matches&&mapped.length===1?mapped[0]!.lemma:null; const sourceRoot=matches&&mapped.length===1?mapped[0]!.root:null;
   return {key,position:w.position,arabic:w.text_uthmani,kind:w.char_type_name==='end'?'end-marker' as const:'word' as const,gloss:plain(w.translation.text??''),transliteration:plain(w.transliteration.text??''),lemma,root:sourceRoot,entryId:null};
  })}));
 }
 if(rows.length!==surah.ayahCount)throw new Error(`Missing verses in surah ${surah.number}`);
 rows.forEach((a,i)=>{ayahSchema.parse(a);if(a.ref!==`${surah.number}:${i+1}`)throw new Error(`Verse order ${a.ref}`);a.tokens.forEach((t,index)=>{if(t.position!==index+1||t.key!==`${a.ref}:${index+1}`)throw new Error(`Token order ${t.key}`);if(t.kind==='word'&&t.lemma){const id=`l-${hash(t.lemma.normalize('NFC')+'\0'+(t.root??'').normalize('NFC')).slice(0,16)}`;const group=groups.get(id)??[];if(group[0]&&(group[0].lemma!==t.lemma||group[0].root!==t.root))throw new Error('ID collision');group.push(t);groups.set(id,group);}});});ayahs.push(...rows);
}
const morphology=buildMorphology(ayahs,plain);
const byRef=new Map(ayahs.map(a=>[a.ref,a]));
const reference=(key:string)=>key.split(':').slice(0,2).join(':');
const count=(key:string)=>byRef.get(reference(key))!.tokens.filter(t=>t.kind==='word').length;
const numeric=(a:string,b:string)=>{const aa=a.split(':').map(Number),bb=b.split(':').map(Number);return aa[0]!-bb[0]!||aa[1]!-bb[1]!||(aa[2]??0)-(bb[2]??0);};
const codepoints=(a:string,b:string)=>{const aa=[...a].map(c=>c.codePointAt(0)!),bb=[...b].map(c=>c.codePointAt(0)!);for(let i=0;i<Math.min(aa.length,bb.length);i++)if(aa[i]!==bb[i])return aa[i]!-bb[i]!;return aa.length-bb.length;};
const excluded:string[]=[];
const eligible=[...groups].filter(([id,tokens])=>{if(tokens.some(t=>t.gloss&&t.transliteration))return true;excluded.push(id);return false;}).sort((a,b)=>b[1].length-a[1].length||codepoints(a[1][0]!.lemma!,b[1][0]!.lemma!)||codepoints(a[1][0]!.root??'',b[1][0]!.root??'')).slice(0,300);
if(eligible.length!==300)throw new Error(`Expected 300 eligible lemmas, found ${eligible.length}`);
const entries:VocabularyEntry[]=eligible.map(([id,tokens],i)=>{
 const candidates=tokens.filter(t=>t.gloss&&t.transliteration).sort((a,b)=>{const ac=count(a.key),bc=count(b.key);return Number(!(ac>=3&&ac<=25))-Number(!(bc>=3&&bc<=25))||ac-bc||numeric(a.key,b.key);});
 const chosen:Token[]=[]; for(const t of candidates)if(!chosen.some(c=>reference(c.key)===reference(t.key))&&chosen.length<3)chosen.push(t);
 const override=overrides.entries[id]; const keys=override?.exampleKeys??chosen.map(t=>t.key);
 const selected=keys.map(key=>{const t=tokens.find(t=>t.key===key);if(!t||!t.gloss||!t.transliteration)throw new Error(`Unaligned study answer ${key}`);return t;});
 const representative=selected[0]!;for(const t of tokens)t.entryId=id;
 return {id,lemma:representative.lemma!,root:representative.root,arabic:representative.arabic,gloss:representative.gloss,transliteration:representative.transliteration,representativeKey:representative.key,exampleKeys:keys,occurrenceCount:tokens.length,courseOrder:i+1,sourceIds:sources.mode==='preview'?['quran-com-v4','qac-0.4']:['qul-56','qul-92','qul-71','qul-75','qul-76','qul-301'],rootId:representative.root?rootId(representative.root):null,approval:override?.approval??{status:'pending'}};
});
const entryIds=new Set(entries.map(entry=>entry.id));
for(const [legacyId,entryId] of Object.entries(overrides.legacyMappings))if(!entryIds.has(entryId))throw new Error(`Legacy route ${legacyId} points to missing entry ${entryId}`);
const blockers=[...sources.blockers];
if(sources.files.some(s=>s.permission!=='verified')&&!blockers.some(blocker=>/permission|redistribution/i.test(blocker)))blockers.push('Source-specific redistribution permission evidence remains unverified.');
const pending=entries.filter(e=>e.approval.status!=='approved'||!e.approval.reviewer||!e.approval.reviewedAt||!e.approval.evidence);
if(pending.length)blockers.push(`${pending.length} course entries require Arabic-competent editorial approval.`);
// The owner selected the original collection for personal use; selection is not editorial certification.
const names = z.array(nameEntrySchema).length(99).parse(
 json('data/99names.json').map((name:unknown) => nameEntrySchema.parse({
  ...z.object({id:z.number(),arabic:z.string(),transliteration:z.string(),meaning:z.string(),root:z.string(),explanation:z.string()}).parse(name),
  sourceIds:['harf-original-names'],verified:false,
 }))
);
names.forEach((name,index)=>{if(name.id!==index+1)throw new Error('Names source must contain IDs 1–99 in order');});
blockers.push('The 99 original Names are selected for personal use; independent editorial review is not recorded.');
const catalog=catalogSchema.parse({contentVersion,entries,surahs,releaseReady:blockers.length===0,blockers});
write(`${out}/catalog.json`,catalog);
writeFileSync(join(root,out,'source-notices.txt'),read('data/source/preview/qac-morphology-0.4.txt').split('LOCATION')[0]!);
write(`${out}/sources.json`,json('data/sources.json'));
for(const s of surahs)write(`${out}/surahs/${s.number}.json`,ayahs.filter(a=>a.ref.startsWith(`${s.number}:`)));
for(const entry of entries){const examples=entry.exampleKeys.map(key=>{const a=byRef.get(reference(key))!,t=a.tokens.find(t=>t.key===key)!;return {...a,targetKey:key,targetGloss:t.gloss,targetTransliteration:t.transliteration,sourceIds:entry.sourceIds};});write(`${out}/entries/${entry.id}.json`,entryPayloadSchema.parse({entry,examples}));}
write(`${out}/names.json`,names);
for(const s of surahs)write(`${out}/morphology/${s.number}.json`,Object.fromEntries(Object.entries(morphology.details).filter(([key])=>key.startsWith(`${s.number}:`))));
const tokenByKey=new Map(ayahs.flatMap(a=>a.tokens).map(t=>[t.key,t]));
for(const family of morphology.roots.values()){
 for(const occurrence of family.occurrences)occurrence.entryId=tokenByKey.get(occurrence.key)!.entryId;
 write(`${out}/roots/${family.id}.json`,family);
}

const words=ayahs.flatMap(a=>a.tokens).filter(t=>t.kind==='word');
write(`${out}/overlap.json`,{totalWords:words.length,surahs:Object.fromEntries(surahs.map(s=>[s.number,words.filter(t=>t.key.startsWith(`${s.number}:`)).length])),entries:Object.fromEntries(entries.map(e=>[e.id,groups.get(e.id)!.map(t=>t.key)]))});
for(const mode of ['arabic','english','transliteration'] as const)write(`${out}/search/${mode}.json`,ayahs.map(a=>({ref:a.ref,text:mode==='arabic'?a.tokens.map(t=>t.arabic).join(' '):mode==='english'?a.translation+' '+a.tokens.filter(t=>t.kind==='word').map(t=>t.gloss).join(' '):a.tokens.filter(t=>t.kind==='word').map(t=>t.transliteration).join(' ')})));
const report={mode:sources.mode,contentVersion,verseCount:ayahs.length,wordCount:words.length,entryCount:entries.length,unalignedMorphology:unaligned,restoredMorphology:morphology.report,morphologyCounts:{withLemma:words.filter(t=>t.lemma!==null).length,withoutLemma:words.filter(t=>t.lemma===null).length,inCourse:words.filter(t=>t.entryId!==null).length},excludedGroups:excluded.map(id=>({id,reason:'No aligned gloss and transliteration example'})),blockers};write(`${out}/alignment-report.json`,report);
write('data/legacy-entry-map.json',overrides.legacyMappings);
const paths=['source-notices.txt','sources.json','catalog.json','names.json','overlap.json','alignment-report.json',...surahs.map(s=>`surahs/${s.number}.json`),...surahs.map(s=>`morphology/${s.number}.json`),...[...morphology.roots.keys()].map(id=>`roots/${id}.json`),...entries.map(e=>`entries/${e.id}.json`),...['arabic','english','transliteration'].map(m=>`search/${m}.json`)];
write(`${out}/manifest.json`,{contentVersion,files:Object.fromEntries(paths.map(p=>[p,hash(read(`${out}/${p}`))]))});write('public/content/manifest.json',{contentVersion,releaseReady:catalog.releaseReady});
write('lib/content/version.json',{contentVersion});
for(const entry of readdirSync(contentRoot,{withFileTypes:true}))if(entry.isDirectory()&&/^[a-f0-9]{16}$/.test(entry.name)&&entry.name!==contentVersion&&entry.name!==previousContentVersion)rmSync(join(contentRoot,entry.name),{recursive:true,force:true});
console.log(JSON.stringify({contentVersion,verses:ayahs.length,words:words.length,entries:entries.length,unaligned:unaligned.length,releaseReady:catalog.releaseReady,blockers},null,2));
if(process.argv.includes('--release')&&!catalog.releaseReady)process.exitCode=1;
