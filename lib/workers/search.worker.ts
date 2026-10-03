import {getSearchIndex} from '../content/client';
import {search} from '../search/match';
import type {SearchMode,SearchIndex} from '../content/schema';
const indexes=new Map<SearchMode,Promise<SearchIndex>>();
self.onmessage=async(e:MessageEvent<{id:number;mode:SearchMode;query:string}>)=>{const {id,mode,query}=e.data;try{if(!indexes.has(mode))indexes.set(mode,getSearchIndex(mode).catch(error=>{indexes.delete(mode);throw error;}));const index=await indexes.get(mode)!;self.postMessage({id,results:search(index,mode,query)});}catch(error){self.postMessage({id,error:error instanceof Error?error.message:'Search could not load. Try again.'});}};
