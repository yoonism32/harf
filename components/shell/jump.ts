import surahsRaw from '@/data/quran-surah-meta.json';

type SurahMeta={id:number;name:string;arabic:string;verses:number};
export type Hit={surah:number;ayah:number;name:string};
const surahs=surahsRaw as SurahMeta[];

/** Fold a typed fragment or surah name for matching: lowercase, alphanumerics only, and common English spellings collapsed (Yaseen, Nooh, Ma'arij, Quraish). */
const fold=(value:string)=>value.toLowerCase().replace(/[^a-z0-9]+/g,'').replace(/aa/g,'a').replace(/ee/g,'i').replace(/oo/g,'u').replace(/ai/g,'ay');

/** Leading article of a compacted name: "Al-Fatihah"→"fatihah", "Ash-Shu'ara"→"shuara", "Adh-Dhariyat"→"dhariyat". */
const ARTICLE=/^(ash|adh|al|an|as|ar|ad|at|az)(?=[a-z])/;

const entries=surahs.map(meta=>{
 const compact=fold(meta.name);
 const words=meta.name.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean).map(fold);
 return {meta,keys:[compact,compact.replace(ARTICLE,''),...words]};
});

/** Arabic candidates per surah: full name, name without ال, and each word (with and without ال). */
const arabicKeys=(meta:SurahMeta)=>[meta.arabic.replace(/\s+/g,''),...meta.arabic.split(/\s+/).flatMap(word=>[word,word.replace(/^ال/,'')])];

function nameHits(value:string):Hit[]{
 const rest=value.trim().replace(/^sur(?:ah|at|a)[\s-]+/i,'');
 // "surah 94" and "surah 94:5" are numeric references wearing a prefix.
 if(/^\d{1,3}(:\d{0,3})?$/.test(rest))return hitsFor(rest);
 if(/[\u0600-\u06FF]/.test(rest)){
  const query=rest.replace(/\s+/g,'');
  if(query.length<2)return [];
  return surahs.filter(meta=>arabicKeys(meta).some(key=>key.startsWith(query))).slice(0,20)
   .map(meta=>({surah:meta.id,ayah:1,name:meta.name}));
 }
 const query=fold(rest);
 if(query.length<1)return [];
 return entries.map((entry,index)=>({entry,index,tier:entry.keys.includes(query)?0:entry.keys.some(key=>key.startsWith(query))?1:-1}))
  .filter(match=>match.tier>=0)
  .sort((a,b)=>a.tier-b.tier||a.index-b.index)
  .slice(0,20)
  .map(({entry})=>({surah:entry.meta.id,ayah:1,name:entry.meta.name}));
}

/** Reference hits for what has been typed: 94 and 94: list the surah, 94:1 selects the ayah; names (English or Arabic) match surahs. */
export function hitsFor(value:string):Hit[]{
 const cleaned=value.trim().replace(/\s*:\s*/,':');
 const match=/^(\d{1,3})(?::(\d{0,3}))?$/.exec(cleaned);
 if(!match)return nameHits(value);
 const surah=Number(match[1]);
 if(surah<1||surah>114)return [];
 const meta=surahs[surah-1]!;
 const ayahPart=match[2];
 if(ayahPart===undefined||ayahPart==='')return Array.from({length:meta.verses},(_,i)=>({surah,ayah:i+1,name:meta.name}));
 const ayah=Number(ayahPart);
 if(ayah>=1&&ayah<=meta.verses)return [{surah,ayah,name:meta.name}];
 // A partial ayah number (94:1 while heading for 94:10) keeps matching by prefix.
 return Array.from({length:meta.verses},(_,i)=>i+1).filter(n=>String(n).startsWith(ayahPart)).slice(0,20).map(n=>({surah,ayah:n,name:meta.name}));
}
