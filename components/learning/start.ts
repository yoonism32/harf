import {getCatalog,getEntry,getNames} from '@/lib/content/client';
import {startSession} from '@/lib/learning/commands';
import type {Collection} from '@/lib/data/schema';
export async function startCourse(collection:Collection='vocabulary'){
 const catalog=await getCatalog();
 if(collection==='names'){
 const names=await getNames();return startSession({collection,contentVersion:catalog.contentVersion,entries:names.map(n=>({id:String(n.id),order:n.id})),loadPayload:async id=>({name:names.find(n=>String(n.id)===id)!})});
 }
 return startSession({collection,contentVersion:catalog.contentVersion,entries:catalog.entries.map(e=>({id:e.id,order:e.courseOrder})),loadPayload:async(id,reps)=>{const data=await getEntry(id);return {entry:data.entry,example:data.examples[reps%data.examples.length]!};}});
}
