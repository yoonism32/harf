import {parseFragment,type DefaultTreeAdapterMap} from 'parse5';
import type {Ayah,TranslationNote,TranslationParagraphs,TranslationRun} from '../lib/content/schema';
type Node=DefaultTreeAdapterMap['node'];
export function parseTranslation(raw:string,ref:string,counts:ReadonlyMap<number,number>){
 const notes:TranslationNote[]=[];
 const valid=(s:number,a:number)=>a>0&&a<=(counts.get(s)??0);
 function paragraphs(html:string):TranslationParagraphs{
  const result:TranslationParagraphs=[];let runs:TranslationRun[]=[];
  const flush=()=>{if(runs.some(r=>r.text.trim()))result.push(runs);runs=[];};
  function text(value:string,emphasis?:'italic'|'bold'|'both'){
   const normalized=value.replace(/\s+/g,' ');
   const pattern=/see\s+(?:the\s+)?footnote\s+of\s*\(?\s*v\.?\s*\d+\s*:\s*\d+\s*\)?|\b(?:V\.?|Verses?)\s*(?:\(\s*\d+\s*:\s*\d+\s*\)|\d+\s*:\s*\d+)/gi;
   let start=0;
   for(const match of normalized.matchAll(pattern)){
    if(match.index>start)runs.push({kind:'text',text:normalized.slice(start,match.index),...(emphasis?{emphasis}:{})});
    const nums=/(\d+)\s*:\s*(\d+)/.exec(match[0])!;const s=Number(nums[1]),a=Number(nums[2]);
    runs.push(valid(s,a)?{kind:'reference',text:match[0],target:{kind:/footnote/i.test(match[0])?'note':'ayah',ref:`${s}:${a}`}}:{kind:'text',text:match[0]});start=match.index+match[0].length;
   }
   if(start<normalized.length)runs.push({kind:'text',text:normalized.slice(start),...(emphasis?{emphasis}:{})});
  }
  function walk(node:Node,emphasis?:'italic'|'bold'|'both'){
   if('value'in node){text(node.value,emphasis);return;}
   if(!('childNodes'in node))return;
   const tag='tagName'in node?node.tagName:'';
   if(['script','style','iframe','object','sup'].includes(tag))return;
   if(tag==='harf-note'&&'attrs'in node){const id=node.attrs.find(a=>a.name==='id')?.value;const note=notes.find(n=>n.id===id);if(note)runs.push({kind:'reference',text:`[${notes.indexOf(note)+1}]`,target:{kind:'note',ref,noteId:id}});return;}
   const block=['p','div','li','br'].includes(tag);if(block)flush();
   const mark=['em','i'].includes(tag)?'italic':['strong','b'].includes(tag)?'bold':undefined;
   const next=mark&&emphasis&&mark!==emphasis?'both':mark??emphasis;
   node.childNodes.forEach(n=>walk(n,next));if(block)flush();
  }
  walk(parseFragment(html));flush();return result;
 }
 const body=raw.replace(/\[\[([\s\S]*?)\]\]/g,(_,inner:string)=>{
  const content=paragraphs(inner);const text=content.map(p=>p.map(r=>r.text).join('')).join(' ').trim();if(!text)return '';
  const id=`${ref}:n${notes.length+1}`;
  const target=content.flat().find(r=>r.kind==='reference'&&r.target.kind==='note');
  const legacy=target?.kind==='reference'?target.target.ref.split(':').map(Number):null;
  notes.push({id,text,paragraphs:content,ref:legacy?{surah:legacy[0]!,ayah:legacy[1]!}:null});
  return `<harf-note id="${id}"></harf-note>`;
 });
 const content=paragraphs(body);
 const translation=content.map(p=>p.filter(r=>!(r.kind==='reference'&&r.target.noteId)).map(r=>r.text).join('')).join(' ').replace(/\s+/g,' ').trim();
 return {translation,notes,paragraphs:content};
}
export function resolveTranslationNotes(ayahs:Ayah[]){
 const map=new Map(ayahs.map(a=>[a.ref,a]));
 for(const ayah of ayahs)for(const run of [...(ayah.paragraphs??[]).flat(),...ayah.notes.flatMap(n=>(n.paragraphs??[]).flat())]){
  if(run.kind!=='reference'||run.target.kind!=='note'||run.target.noteId)continue;
  const target=map.get(run.target.ref);if(target?.notes.length===1&&target.notes[0]?.id)run.target.noteId=target.notes[0].id;
 }
}
