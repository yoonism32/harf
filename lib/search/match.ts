import type {SearchIndex, SearchMode} from '../content/schema';
export type QueryMode = SearchMode | 'all';
export type SearchResult = SearchIndex[number] & {order:number;score:number;confidence:number;mode:SearchMode;matchType:string;ranges:[number,number][]};
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
// Human transliteration drifts on long vowels, th/dh, and doubled letters; the skeleton
// folds those so "al-ladheena ithaa aSaabathum" and "alladhīna idhā aṣābathum" align.
function skeleton(word:string){return word.toLowerCase().replace(/[^a-z]/g,'').replace(/a{2,}|e{2,}|i{2,}|o{2,}|u{2,}|dh|th|(.)\1+/g,m=>m==='dh'||m==='th'?'d':m[0]==='e'||m[0]==='i'?'i':m[0]==='o'||m[0]==='u'?'u':m[0]!);}
function closeEnough(a:string,b:string){return a===b||(Math.min(a.length,b.length)>=4&&oneEdit(a,b));}
// Vowels drift between human spellings of one word (shakireen / shakirina), so folding every vowel
// together compares the consonants people do remember.
function foldVowels(word:string){return word.toLowerCase().replace(/[^a-z]/g,'').replace(/[aeiou]+/g,'a');}
function oneEdit(a:string,b:string){
 if(Math.min(a.length,b.length)<5||Math.abs(a.length-b.length)>1)return false;
 let i=0,j=0,edits=0;while(i<a.length&&j<b.length){if(a[i]===b[j]){i++;j++;continue;}if(++edits>1)return false;if(a.length>=b.length)i++;if(b.length>=a.length)j++;}return edits+(a.length-i)+(b.length-j)<=1;
}
function stem(s:string){return s.length>4?s.replace(/(?:ing|ed|es|s)$/,''):s;}
// Function words carry no retrieval signal, so a lone one must not trigger 30 matches.
const STOP=new Set(['the','and','of','to','in','that','for','with','verily','indeed','surely','then','those','who','what','when','not','but','is','are','was','were','be','he','she','they','it','you','we','all','on','at','by','from','so','as','if','or','no','his','her','their','our','my','your','this','these','there','verily!']);
/** Why a query will not search, or '' when it will. One distinctive word, or at least two words. */
export function searchNotice(mode:SearchMode,query:string):string{
 if(mode!=='english')return '';
 const tokens=query.toLowerCase().replace(/[^a-z0-9\s]/g,' ').split(/\s+/).filter(Boolean);
 if(!tokens.length)return '';
 if(tokens.length===1){const [word]=tokens;
  if(word!.length<4)return 'Type a whole word, or add a second word.';
  return STOP.has(word!)?'That word is too common on its own. Add a second word.':'';
 }
 if(tokens.length===2&&!tokens.some(t=>t.length>=4&&!STOP.has(t)))return 'Those words are too common on their own. Add a distinctive word.';
 return '';
}
type Prepared={item:SearchIndex[number];order:number;normal:Form;compact:Form;words:string[];starts:number[];skel:string[]|null;loose:{text:string;owner:number[]}|null};
const prepared=new WeakMap<SearchIndex,Map<SearchMode,Prepared[]>>();
function prepare(index:SearchIndex,mode:SearchMode){
 let modes=prepared.get(index);if(!modes){modes=new Map();prepared.set(index,modes);}
 let rows=modes.get(mode);if(!rows){rows=index.map((item,order)=>{
  const normal=form(item.text,mode),compact=form(item.text,mode,true);
  const all=[...normal.text.matchAll(/\S+/g)],words=all.map(w=>w[0]),starts=all.map(w=>w.index!);
  let skel:string[]|null=null,loose:{text:string;owner:number[]}|null=null;
  if(mode==='transliteration'){
   // Space-free skeleton with a word owner per character, so concatenated or hyphen-split input still lines up.
   skel=words.map(skeleton);const owner:number[]=[];let text='';
   skel.forEach((s,i)=>{text+=s;for(let k=0;k<s.length;k++)owner.push(i);});
   loose={text,owner};
  }
  return {item,order,normal,compact,words,starts,skel,loose};});modes.set(mode,rows);}return rows;
}
function range(f:Form,start:number,length:number):[number,number]{return [f.offsets[start]!,f.offsets[start+length-1]!+1];}
export function search(index:SearchIndex,mode:SearchMode,query:string):SearchResult[]{
 if(query.length>400)return [];
 const q=form(query,mode).text,cq=form(query,mode,true).text;
 if(q.length<(mode==='arabic'?2:3)||!cq)return [];
 const tokens=q.split(' '),results:SearchResult[]=[];
 const qc=mode==='transliteration'?tokens.map(skeleton).join(''):'';
 for(const row of prepare(index,mode)){
  const {normal,compact}=row;let score=0,confidence=0,matchType='',ranges:[number,number][]=[];
  const t=normal.text,isBoundary=(p:number)=>mode!=='english'||((p===0||t[p-1]===' ')&&(p+q.length===t.length||t[p+q.length]===' '));
  let at=t.indexOf(q);while(at>=0&&!isBoundary(at))at=t.indexOf(q,at+1);
  if(at>=0){score=400;confidence=100;matchType='Phrase';ranges=[range(normal,at,q.length)];}
  else if((mode==='transliteration'||mode==='arabic')&&cq.length>=4){
   const pos=compact.text.indexOf(cq);
   if(pos>=0){score=300;confidence=95;matchType='Spelling variant';ranges=[range(compact,pos,cq.length)];}
  }
  if(!score&&mode==='transliteration'&&row.loose&&qc.length>=8){
   // Match short digraph variants anywhere in an ayah, including joined particles (wa radhiya / waraḍiya).
   const pos=row.loose.text.indexOf(qc);
   if(pos>=0){
    const first=row.loose.owner[pos]!,last=row.loose.owner[pos+qc.length-1]!;
    score=280;confidence=90;matchType='Spelling variant';
    ranges=[range(normal,row.starts[first]!,row.starts[last]!+row.words[last]!.length-row.starts[first]!)];
   }
  }
  if(!score&&tokens.length<=12){
   const words=row.words;const used=new Set<number>();let previous=-1,ordered=true,partial=false;
   for(const token of tokens){
    // English tolerates one slip per long word so "harship" still reaches "hardship".
    const found=words.findIndex((w,i)=>!used.has(i)&&(w===token||(mode==='english'&&(stem(w)===stem(token)||(token.length>=5&&w[0]===token[0]&&oneEdit(token,w))))));
    if(found<0){used.clear();break;}
    used.add(found);if(found<=previous)ordered=false;previous=found;
   }
   if(used.size===tokens.length){
    const indices=[...used];const gaps=Math.max(...indices)-Math.min(...indices)+1-tokens.length;
    score=(ordered?200:100)-Math.min(gaps,50);confidence=ordered?70:55;matchType=ordered?'Related wording':'Words in a different order';
    ranges=indices.sort((a,b)=>a-b).map(i=>range(normal,row.starts[i]!,words[i]!.length));
   } else if(mode==='transliteration'){
    // A half-remembered word often stops mid-word ("shak" for shakirina), so a prefix of three
    // or more letters also counts. The reading scores below an exact match, above the loose drift paths.
    const words=row.words,used=new Set<number>();let previous=-1,ordered=true;
    for(const token of tokens){
     const found=words.findIndex((w,i)=>!used.has(i)&&(w===token||(token.length>=3&&w.length>token.length&&w.startsWith(token))||(token.length>=4&&foldVowels(w).startsWith(foldVowels(token)))));
     if(found<0){used.clear();break;}
     if(words[found]!==token)partial=true;
     used.add(found);if(found<=previous)ordered=false;previous=found;
    }
    if(partial&&used.size===tokens.length){
     const indices=[...used];const gaps=Math.max(...indices)-Math.min(...indices)+1-tokens.length;
     score=(ordered?160:80)-Math.min(gaps,50);confidence=ordered?60:45;matchType=ordered?'Partial wording':'Partial words in a different order';
     ranges=indices.sort((a,b)=>a-b).map(i=>range(normal,row.starts[i]!,words[i]!.length));
    }
   }
  }
  if(!score&&mode==='transliteration'&&tokens.length<=12){
   const words=row.words,allowed=Math.max(1,Math.floor(tokens.length/3));
   const near=(token:string,word:string)=>word===token||oneEdit(token,word);
   // Try every start word, then look at most 40 words ahead per token, so late phrases are found with bounded work.
   for(let start=0;start<words.length&&!score;start++){
    if(!near(tokens[0]!,words[start]!))continue;
    const hits=[start];let approximate=words[start]===tokens[0]?0:1;
    for(const token of tokens.slice(1)){const cursor=hits.at(-1)!+1;let found=-1;for(let i=cursor;i<Math.min(words.length,cursor+40);i++)if(near(token,words[i]!)){found=i;if(words[i]!==token)approximate++;break;}if(found<0)break;hits.push(found);}
    if(hits.length===tokens.length&&approximate>0&&approximate<=allowed){score=50;confidence=45;matchType='Approximate wording';ranges=hits.map(i=>range(normal,row.starts[i]!,words[i]!.length));}
   }
  }
  if(!score&&mode==='transliteration'){
   // Ordered alignment on skeletons, so a long human-typed phrase survives spelling drift.
   const qWords=tokens.slice(0,20).map(skeleton).filter(Boolean);
   if(tokens.length<=12&&qWords.length>=2&&qWords.join('').length>=8){
    const iWords=row.skel!,words=row.words;
    const maxMisses=Math.max(1,Math.floor(qWords.length/3));
    let qi=0,ii=0,matched=0,misses=0,first=-1,last=-1;const hits:number[]=[];
    while(qi<qWords.length&&ii<iWords.length){
     let found=-1;for(let j=ii;j<Math.min(iWords.length,ii+3);j++)if(iWords[j]&&closeEnough(qWords[qi]!,iWords[j]!)){found=j;break;}
     if(found<0){if(++misses>maxMisses)break;qi++;continue;}
     matched++;hits.push(found);if(first<0)first=found;last=found;ii=found+1;qi++;
    }
    const need=Math.max(2,Math.ceil(qWords.length*0.6));
    if(matched>=need&&matched>=Math.min(3,qWords.length)){
     const gaps=last-first+1-hits.length;
     score=150+Math.round(120*matched/qWords.length)-Math.min(gaps,20);confidence=55+Math.round(35*matched/qWords.length);matchType='Wording drift';
     ranges=hits.map(i=>range(normal,row.starts[i]!,words[i]!.length));
    }
   }
  }
  if(!score&&mode==='transliteration'&&row.loose){
   // Long human input loses word breaks, and one short slip shifts a whole chunk frame.
   // Containment of the query's character n-grams survives that where fixed chunks cannot.
   if(qc.length>=24){
    const {text:compact,owner}=row.loose;
    const probe=Math.min(10,qc.length),edges=6;
    const starts=[...new Set(Array.from({length:edges},(_,i)=>Math.round(i*(qc.length-probe)/(edges-1))))];
    const probes=starts.filter(s=>compact.includes(qc.slice(s,s+probe))).length;
    if(probes>=3){
     const n=6;let total=0,hit=0,first=-1,last=-1;
     for(let i=0;i+n<=qc.length;i+=2){total++;const pos=compact.indexOf(qc.slice(i,i+n));if(pos>=0){hit++;if(first<0)first=pos;last=pos+n;}}
     const containment=total?hit/total:0,span=first<0?0:last-first;
     if(containment>=0.65&&span<=qc.length*2.5+12){
      const words=row.words,a=owner[first]!,b=owner[last-1]!;
      score=110+Math.round(150*containment);confidence=55+Math.round(40*containment);matchType='Wording drift';
      ranges=[range(normal,row.starts[a]!,row.starts[b]!+words[b]!.length-row.starts[a]!)];
     }
    }
   }
  }
  if(score)results.push({...row.item,order:row.order,score,confidence,mode,matchType,ranges});
 }
 return results.sort((a,b)=>b.score-a.score||a.order-b.order).slice(0,30);
}
