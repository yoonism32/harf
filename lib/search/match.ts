import type {SearchIndex, SearchMode} from '../content/schema';
export type QueryMode = SearchMode | 'all';
export type SearchResult = SearchIndex[number] & {order:number;score:number;mode:SearchMode;matchType:string;ranges:[number,number][]};
export function normalizeArabic(s:string){return s.normalize('NFC').replace(/[\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g,'').replace(/[أإآٱ]/g,'ا').replace(/ى/g,'ي').replace(/\s+/g,' ').trim();}
type Form={text:string; offsets:number[]};
function form(source:string, mode:SearchMode, compact=false):Form {
 let text='', offsets:number[]=[];
 for(let i=0;i<source.length;i++){
  let part=mode==='arabic'?( /\s/.test(source[i]!)?' ':normalizeArabic(source[i]!)):source[i]!.toLowerCase().normalize('NFD').replace(/\p{M}/gu,'');
  if(mode==='transliteration')part=part.replace(/[ʿʾ‘’'`]/g,'');
  if(compact&&mode==='arabic')part=part.replace(/[اء]/g,''); // alif/hamza spellings vary (رَٰجِعُون vs راجعون)
  part=part.replace(mode==='arabic'?/[^\p{L}\p{N}]/gu:/[^a-z0-9]/g,' ');
  for(const c of part){
   if(compact&&c===' ')continue;
   if(c===' '&&(!text||text.endsWith(' ')))continue;
   if(compact&&mode==='transliteration'&&/[a-df-np-z]/.test(c)&&text.endsWith(c))continue; // doubled letters (hayyul/ḥayu); oo/ee handled below
   text+=c;offsets.push(i);
  }
 }
 if(compact&&mode==='transliteration'){
  for(const vowel of ['oo','ee']){let at=text.indexOf(vowel);while(at>=0){text=text.slice(0,at)+(vowel==='oo'?'u':'i')+text.slice(at+2);offsets.splice(at,1);at=text.indexOf(vowel);}}
 }
 return {text:text.trimEnd(),offsets};
}
function oneEdit(a:string,b:string){
 if(Math.min(a.length,b.length)<5||Math.abs(a.length-b.length)>1)return false;
 let i=0,j=0,edits=0;while(i<a.length&&j<b.length){if(a[i]===b[j]){i++;j++;continue;}if(++edits>1)return false;if(a.length>=b.length)i++;if(b.length>=a.length)j++;}return edits+(a.length-i)+(b.length-j)<=1;
}
function stem(s:string){return s.length>4?s.replace(/(?:ing|ed|es|s)$/,''):s;}
type Prepared={item:SearchIndex[number];order:number;normal:Form;compact:Form};
const prepared=new WeakMap<SearchIndex,Map<SearchMode,Prepared[]>>();
function prepare(index:SearchIndex,mode:SearchMode){
 let modes=prepared.get(index);if(!modes){modes=new Map();prepared.set(index,modes);}
 let rows=modes.get(mode);if(!rows){rows=index.map((item,order)=>({item,order,normal:form(item.text,mode),compact:form(item.text,mode,true)}));modes.set(mode,rows);}return rows;
}
function range(f:Form,start:number,length:number):[number,number]{return [f.offsets[start]!,f.offsets[start+length-1]!+1];}
export function search(index:SearchIndex,mode:SearchMode,query:string):SearchResult[]{
 if(query.length>200)return [];
 const q=form(query,mode).text,cq=form(query,mode,true).text;
 if(q.length<(mode==='arabic'?2:3)||!cq)return [];
 const tokens=q.split(' '),results:SearchResult[]=[];
 for(const row of prepare(index,mode)){
  const {normal,compact}=row;let score=0,matchType='',ranges:[number,number][]=[];
  const t=normal.text,isBoundary=(p:number)=>mode!=='english'||((p===0||t[p-1]===' ')&&(p+q.length===t.length||t[p+q.length]===' '));
  let at=t.indexOf(q);while(at>=0&&!isBoundary(at))at=t.indexOf(q,at+1);
  if(at>=0){score=400;matchType='Phrase';ranges=[range(normal,at,q.length)];}
  else if((mode==='transliteration'||mode==='arabic')&&cq.length>=4){
   const pos=compact.text.indexOf(cq);
   if(pos>=0){score=300;matchType='Spelling variant';ranges=[range(compact,pos,cq.length)];}
  }
  if(!score){
   const words=[...normal.text.matchAll(/\S+/g)];const used=new Set<number>();let previous=-1,ordered=true;
   for(const token of tokens){
    const found=words.findIndex((w,i)=>!used.has(i)&&(w[0]===token||(mode==='english'&&stem(w[0])===stem(token))));
    if(found<0){used.clear();break;}
    used.add(found);if(found<=previous)ordered=false;previous=found;
   }
   if(used.size===tokens.length){
    const indices=[...used];const gaps=Math.max(...indices)-Math.min(...indices)+1-tokens.length;
    score=(ordered?200:100)-Math.min(gaps,50);matchType=ordered?'Related wording':'Words in a different order';
    ranges=indices.sort((a,b)=>a-b).map(i=>range(normal,words[i]!.index!,words[i]![0].length));
   }
  }
  if(!score&&mode==='transliteration'&&tokens.length<=12){
   const all=[...normal.text.matchAll(/\S+/g)],words=all.map(w=>w[0]),allowed=Math.max(1,Math.floor(tokens.length/3));
   const near=(token:string,word:string)=>word===token||oneEdit(token,word);
   // Try every start word, then look at most 40 words ahead per token, so late phrases are found with bounded work.
   for(let start=0;start<words.length&&!score;start++){
    if(!near(tokens[0]!,words[start]!))continue;
    const hits=[start];let approximate=words[start]===tokens[0]?0:1;
    for(const token of tokens.slice(1)){const cursor=hits.at(-1)!+1;let found=-1;for(let i=cursor;i<Math.min(words.length,cursor+40);i++)if(near(token,words[i]!)){found=i;if(words[i]!==token)approximate++;break;}if(found<0)break;hits.push(found);}
    if(hits.length===tokens.length&&approximate>0&&approximate<=allowed){score=50;matchType='Approximate wording';ranges=hits.map(i=>range(normal,all[i]!.index!,all[i]![0].length));}
   }
  }
  if(score)results.push({...row.item,order:row.order,score,mode,matchType,ranges});
 }
 return results.sort((a,b)=>b.score-a.score||a.order-b.order).slice(0,30);
}
