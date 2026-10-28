import {databaseIdentity} from '../account/client';
import {passageSyncAvailable} from '../account/sync';
import {createEmptyCard,type Grade} from 'ts-fsrs';
import {getDB} from '../data/db';
import {notifyChange} from '../data/store';
import {localDate} from '../learning/calendar';
import {schedule,serializeCard} from '../learning/scheduler';
import {passageId,passageCardSchema,passageReviewSchema,type PassageCard,type PassageReview} from './passage-model';
async function changed(){await notifyChange();}
export async function rememberPassage(a:string,b:string,contentVersion:string){
 if(await databaseIdentity()&&!passageSyncAvailable)throw Error('Saved passage practice needs the account database update. You can still browse comparisons.');
 const id=passageId(a,b),db=await getDB(),tx=db.transaction(['passageCards','meta'],'readwrite');
 const existing=await tx.objectStore('passageCards').get(id) as PassageCard|undefined;
 if(!existing){const [verseA,verseB]=id.split('|');const card=passageCardSchema.parse({id,verseA,verseB,contentVersion,card:serializeCard(createEmptyCard()),revision:0,paused:false});await tx.objectStore('passageCards').add(card,id);await tx.objectStore('meta').put(Number(await tx.objectStore('meta').get('revision')??0)+1,'revision');}
 await tx.done;await changed();return id;
}
export async function reviewPassage(input:{id:string;attemptId:string;expectedRevision:number;grade:Grade},now=new Date()){
 const db=await getDB(),tx=db.transaction(['passageCards','passageReviews','meta'],'readwrite');void tx.done.catch(()=>undefined);
 try{
 const previous=await tx.objectStore('passageReviews').index('attemptId').get(input.attemptId) as PassageReview|undefined;
 if(previous){if(previous.pairId!==input.id||previous.undone)throw Error('This attempt is no longer available');await tx.done;return previous;}
 const before=passageCardSchema.parse(await tx.objectStore('passageCards').get(input.id));
 if(before.revision!==input.expectedRevision)throw Error('This pair changed in another tab. Reload before grading.');
 if(before.paused||Date.parse(before.card.due)>now.getTime())throw Error('This pair is not due yet');
 const after=passageCardSchema.parse({...before,revision:before.revision+1,card:schedule(before.card,input.grade,now)});
 const timeZone=Intl.DateTimeFormat().resolvedOptions().timeZone;
 const event=passageReviewSchema.parse({id:input.attemptId,attemptId:input.attemptId,pairId:input.id,before,after,grade:input.grade,timestamp:now.toISOString(),localDate:localDate(now,timeZone),timeZone,undone:false});
 await tx.objectStore('passageCards').put(after,after.id);await tx.objectStore('passageReviews').add(event,event.id);await tx.objectStore('meta').put(Number(await tx.objectStore('meta').get('revision')??0)+1,'revision');await tx.done;await changed();return event;
 }catch(e){try{tx.abort();}catch{}throw e;}
}
export async function undoPassageReview(id:string){
 const db=await getDB(),tx=db.transaction(['passageCards','passageReviews','meta'],'readwrite');void tx.done.catch(()=>undefined);
 try{const event=passageReviewSchema.parse(await tx.objectStore('passageReviews').get(id));const current=passageCardSchema.parse(await tx.objectStore('passageCards').get(event.pairId));if(event.undone||current.revision!==event.after.revision)throw Error('This review can no longer be undone');const restored={...event.before,revision:current.revision+1};await tx.objectStore('passageCards').put(restored,current.id);await tx.objectStore('passageReviews').put({...event,undone:true},event.id);await tx.objectStore('meta').put(Number(await tx.objectStore('meta').get('revision')??0)+1,'revision');await tx.done;await changed();return restored;}catch(e){try{tx.abort();}catch{}throw e;}
}
