import {createHash} from 'node:crypto';
import {readFileSync,copyFileSync,mkdirSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {z} from 'zod';
import {mushafPageSchema,mushafIndexSchema} from '../lib/content/mushaf-schema';
import type {Ayah} from '../lib/content/schema';

export function buildMushaf(ayahs:Ayah[],out:string,write:(path:string,value:unknown)=>void){
 const source='data/source/qul/mushaf-v2';
 const glyphs=z.record(z.string(),z.object({id:z.number().int().positive(),location:z.string(),text:z.string().min(1)})).parse(JSON.parse(readFileSync(`${source}/glyphs.json`,'utf8')));
 const tokens=new Map(ayahs.flatMap(a=>a.tokens).map(t=>[t.key,t]));
 const byId=new Map<number,{key:string;glyph:string}>();
 for(const [key,g] of Object.entries(glyphs)){
  if(key!==g.location||!tokens.has(key)||byId.has(g.id))throw Error(`Invalid Mushaf word ${key}`);
  byId.set(g.id,{key,glyph:g.text});
 }
 if(byId.size!==tokens.size)throw Error('Mushaf words differ from canonical words');
 const fonts=z.record(z.string(),z.string().regex(/^[a-f0-9]{64}$/)).parse(JSON.parse(readFileSync(`${source}/fonts.json`,'utf8')));
 const db=new DatabaseSync(`${source}/layout.db`,{readOnly:true});
 const rows=z.array(z.object({page_number:z.number().int().min(1).max(604),line_number:z.number().int().min(1).max(15),line_type:z.enum(['ayah','surah_name','basmallah']),is_centered:z.union([z.literal(0),z.literal(1)]),first_word_id:z.union([z.number().int().positive(),z.literal('')]),last_word_id:z.union([z.number().int().positive(),z.literal('')]),surah_number:z.union([z.number().int().min(1).max(114),z.literal('')])})).parse(db.prepare('SELECT * FROM pages ORDER BY page_number,line_number').all());
 db.close();
 const seen=new Set<string>(),index:Record<string,number>={},paths:string[]=[];
 mkdirSync(`${out}/mushaf/fonts`,{recursive:true});
 for(let page=1;page<=604;page++){
  const lines=rows.filter(r=>r.page_number===page).map(r=>{
   const words=[];
   if(r.line_type==='ayah'){
    if(typeof r.first_word_id!=='number'||typeof r.last_word_id!=='number'||r.last_word_id<r.first_word_id)throw Error(`Invalid Mushaf range on page ${page}`);
    for(let id=r.first_word_id;id<=r.last_word_id;id++){
     const word=byId.get(id);if(!word||seen.has(word.key))throw Error(`Missing/duplicate Mushaf word ${id}`);
     seen.add(word.key);words.push(word);index[word.key.split(':').slice(0,2).join(':')]??=page;
    }
   }
   return {number:r.line_number,type:r.line_type,centered:!!r.is_centered,surah:r.surah_number||null,words};
  });
  if(lines.some((line,i)=>line.number!==i+1))throw Error(`Invalid line order on page ${page}`);
  write(`${out}/mushaf/${page}.json`,mushafPageSchema.parse({page,lines}));
  const font=`p${page}.woff`,bytes=readFileSync(`${source}/fonts/${font}`);
  if(createHash('sha256').update(bytes).digest('hex')!==fonts[font])throw Error(`Mushaf font checksum mismatch ${font}`);
  copyFileSync(`${source}/fonts/${font}`,`${out}/mushaf/fonts/${font}`);
  paths.push(`mushaf/${page}.json`,`mushaf/fonts/${font}`);
 }
 if(seen.size!==tokens.size)throw Error('Mushaf layout omits canonical words');
 write(`${out}/mushaf/index.json`,mushafIndexSchema.parse(index));
 return [...paths,'mushaf/index.json'];
}
