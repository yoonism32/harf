import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {z} from 'zod';
import {alignWordSpans,comparableArabic,fromBuckwalter} from '../lib/content/alignment';
import type {Ayah} from '../lib/content/schema';
import {morphologySchema,rootFamilySchema,type GrammarSegment,type WordDetail,type RootFamily} from '../lib/content/morphology-schema';
const json=(path:string):unknown=>JSON.parse(readFileSync(path,'utf8'));
export const rootId=(root:string)=>`r-${createHash('sha256').update(root.normalize('NFC')).digest('hex').slice(0,16)}`;
const previewSchema=z.object({pagination:z.object({next_page:z.null()}),verses:z.array(z.object({verse_key:z.string(),words:z.array(z.object({position:z.number().int().positive(),text_uthmani:z.string(),char_type_name:z.enum(['word','end']),translation:z.object({text:z.string().nullable()}),transliteration:z.object({text:z.string().nullable()}),audio_url:z.string().nullable().optional()}))}))});
const legacySchema=z.record(z.string(),z.object({rootArabic:z.string(),summary:z.string().nullable(),verbForms:z.record(z.string(),z.string()).nullable(),rootFamily:z.array(z.string()),rootFamilyWords:z.array(z.object({key:z.string(),uthmani:z.string(),english:z.string()}))}));
export function buildMorphology(ayahs:Ayah[],plain:(text:string)=>string){
 const corpus=new Map<string,GrammarSegment[]>();
 for(const line of readFileSync('data/source/preview/qac-morphology-0.4.txt','utf8').split(/\r?\n/)){
  const m=/^\((\d+:\d+:\d+):(\d+)\)\t([^\t]+)\t([^\t]+)\t(.+)$/.exec(line);if(!m)continue;
  const rows=corpus.get(m[1]!)??[];
  if(Number(m[2])!==rows.length+1)throw Error(`Unordered QAC segment ${m[1]}`);
  rows.push({arabic:fromBuckwalter(m[3]!),tag:m[4]!,features:m[5]!.split('|')});corpus.set(m[1]!,rows);
 }
 const canonical=new Map(ayahs.map(a=>[a.ref,a]));
 const details:Record<string,WordDetail>={};
 const sourceToCanonical=new Map<string,string[]>();
 const splitGroups:{sourceKey:string;canonicalKeys:string[]}[]=[];
 let transliterationFallbacks=0;
 for(let surah=1;surah<=114;surah++){
  const source=previewSchema.parse(json(`data/source/preview/surah-${surah}.json`));
  for(const verse of source.verses){
   const ayah=canonical.get(verse.verse_key);if(!ayah)throw Error(`Missing canonical ayah ${verse.verse_key}`);
   const words=verse.words.filter(w=>w.char_type_name==='word');
   const mappings=alignWordSpans(words.map(w=>({key:`${verse.verse_key}:${w.position}`,arabic:w.text_uthmani})),ayah.tokens.filter(t=>t.kind==='word'));
   for(const [index,mapping] of mappings.entries()){
    const word=words[index]!,segments=corpus.get(mapping.sourceKey);
    if(!segments||comparableArabic(segments.map(s=>s.arabic).join(''))!==comparableArabic(word.text_uthmani))throw Error(`QAC surface mismatch ${mapping.sourceKey}`);
    sourceToCanonical.set(mapping.sourceKey,mapping.canonicalKeys);
    const shared=mapping.canonicalKeys.length>1;if(shared)splitGroups.push(mapping);
    for(const key of mapping.canonicalKeys){
     if(details[key])throw Error(`Overlapping source annotations ${key}`);
     const token=ayah.tokens.find(t=>t.key===key)!;
     // A combined phrase gloss belongs to the span, not independently to each split token.
     if(shared){token.gloss=plain(word.translation.text??'');token.transliteration=plain(word.transliteration.text??'');token.meaningScope={keys:mapping.canonicalKeys,arabic:word.text_uthmani};}
     else if(!token.transliteration&&word.transliteration.text){token.transliteration=plain(word.transliteration.text);transliterationFallbacks++;}
     details[key]={key,sourceKey:mapping.sourceKey,canonicalKeys:mapping.canonicalKeys,sourceArabic:word.text_uthmani,segments,audioPath:word.audio_url||null,rootId:token.root?rootId(token.root):null};
    }
   }
  }
 }
 const tokens=ayahs.flatMap(a=>a.tokens).filter(t=>t.kind==='word');
 if(Object.keys(details).length!==tokens.length||sourceToCanonical.size!==corpus.size)throw Error('Incomplete morphology alignment');
 const roots=new Map<string,RootFamily>();
 for(const t of tokens){if(!t.root)continue;const id=rootId(t.root);const family=roots.get(id)??{id,root:t.root,occurrences:[],notes:[]};family.occurrences.push({key:t.key,arabic:t.arabic,gloss:t.gloss,lemma:t.lemma,entryId:t.entryId});roots.set(id,family);}
 const normalizedRoots=new Map<string,RootFamily[]>();
 for(const family of roots.values()){const key=comparableArabic(family.root);normalizedRoots.set(key,[...(normalizedRoots.get(key)??[]),family]);}
 const ordinals=new Map<string,number>();
 const small=['','first','second','third','fourth','fifth','sixth','seventh','eighth','ninth','tenth','eleventh','twelfth','thirteenth','fourteenth','fifteenth','sixteenth','seventeenth','eighteenth','nineteenth'];
 const tens=['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'];
 for(let i=1;i<100;i++)ordinals.set(i<20?small[i]!:i%10?`${tens[Math.floor(i/10)]}-${small[i%10]}`:`${tens[Math.floor(i/10)]!.replace(/y$/,'ie')}th`,i);
 const legacy=legacySchema.parse(json('data/wbw-morphology.json'));
 const unresolvedNotes:string[]=[];const rootAliases:Record<string,string>={};let legacyNotes=0;
 const tokenByKey=new Map(tokens.map(t=>[t.key,t]));
 for(const [legacyId,record] of Object.entries(legacy)){
  let matches=normalizedRoots.get(comparableArabic(record.rootArabic));
  if(matches?.length!==1){
   // An alias is accepted only when every aligned occurrence with a root agrees, never by a majority guess.
   const observed=new Set(record.rootFamily.flatMap(key=>sourceToCanonical.get(key)??[]).map(key=>tokenByKey.get(key)?.root).filter((r):r is string=>!!r));
   if(observed.size===1){const canonicalRoot=[...observed][0]!;matches=[roots.get(rootId(canonicalRoot))!];rootAliases[legacyId]=canonicalRoot;}
  }
  if(matches?.length!==1){unresolvedNotes.push(legacyId);continue;}
  const summary=record.summary?plain(record.summary):null;
  const match=summary?/^The (.+?) word of verse \((\d+:\d+)\)/i.exec(summary):null;
  const position=match?(/^\d+(?:st|nd|rd|th)$/.test(match[1]!)?Number.parseInt(match[1]!,10):ordinals.get(match[1]!.toLowerCase())):undefined;
  const sourceKey=match&&position?`${match[2]}:${position}`:null;
  // Summary is specific to its original word, never represented as a description of the selected lemma.
  const summaryKeys=sourceKey&&record.rootFamily.includes(sourceKey)?sourceToCanonical.get(sourceKey)??[]:[];
  matches[0]!.notes.push({legacyId,summary,summaryKeys,verbForms:Object.fromEntries(Object.entries(record.verbForms??{}).map(([key,value])=>[key,plain(value)]))});legacyNotes++;
 }
 for(const family of roots.values())rootFamilySchema.parse(family);
 morphologySchema.parse(details);
 return {details,roots,report:{alignedSourceWords:sourceToCanonical.size,canonicalWords:tokens.length,segments:[...corpus.values()].reduce((n,s)=>n+s.length,0),splitGroups,transliterationFallbacks,legacyNotes,rootAliases,unresolvedNotes}};
}
