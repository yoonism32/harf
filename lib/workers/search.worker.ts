import {getSearchIndex} from '../content/client';
import {search,type QueryMode} from '../search/match';
import type {SearchMode,SearchIndex} from '../content/schema';
const indexes=new Map<SearchMode,Promise<SearchIndex>>();
async function load(mode:SearchMode){
 if(!indexes.has(mode))indexes.set(mode,getSearchIndex(mode).catch(error=>{indexes.delete(mode);throw error;}));
 return indexes.get(mode)!;
}
self.onmessage=async(e:MessageEvent<{id:number;mode:QueryMode;query:string}>)=>{
 const {id,mode,query}=e.data;
 try{
  const modes:SearchMode[]=mode==='all'?(/[\u0600-\u06ff]/.test(query)?['arabic']:['english','transliteration']):[mode];
  const groups=await Promise.all(modes.map(async m=>search(await load(m),m,query)));
  const merged=groups.flat().sort((a,b)=>b.score-a.score||a.order-b.order);
  const seen=new Set<string>();
  self.postMessage({id,results:merged.filter(r=>{if(seen.has(r.ref))return false;seen.add(r.ref);return true;}).slice(0,30)});
 }catch(error){self.postMessage({id,error:error instanceof Error?error.message:'Search could not load. Try again.'});}
};
