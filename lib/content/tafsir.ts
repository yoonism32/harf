import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {parseFragment} from 'parse5';
import {parseRef} from './refs';

export type TafsirBlock={kind:'heading'|'paragraph'|'arabic';text:string};
type Node={nodeName?:string;tagName?:string;value?:string;attrs?:{name:string;value:string}[];childNodes?:Node[]};
let source:Promise<Record<string,{text:string}|string>>|undefined;

function load(){
 return source??=readFile(join(process.cwd(),'data','tafsir-ibn-kathir.json'),'utf8').then(text=>JSON.parse(text) as Record<string,{text:string}|string>);
}
function text(node:Node):string{
 if(node.nodeName==='#text')return node.value??'';
 if(['script','style','template'].includes(node.tagName??''))return '';
 return (node.childNodes??[]).map(text).join(' ');
}
export function structureTafsir(html:string):TafsirBlock[]{
 const document=parseFragment(html) as unknown as Node;
 const blocks:TafsirBlock[]=[];
 const visit=(node:Node)=>{
  const tag=node.tagName;
  if(tag&&['h1','h2','h3','p','li','blockquote'].includes(tag)){
   const value=text(node).replace(/\s+/g,' ').trim();
   if(value){
    const lang=node.attrs?.find(attr=>attr.name==='lang')?.value;
    blocks.push({kind:tag.startsWith('h')?'heading':lang==='ar'?'arabic':'paragraph',text:value});
   }
   return;
  }
  for(const child of node.childNodes??[])visit(child);
 };
 visit(document);
 return blocks;
}
export async function getTafsir(ref:string){
 if(!parseRef(ref))throw Error('Invalid ayah reference');
 const data=await load();const entry=data[ref];const resolved=typeof entry==='string'?data[entry]:entry;
 return resolved&&typeof resolved==='object'?structureTafsir(resolved.text):[];
}
