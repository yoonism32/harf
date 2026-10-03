'use client';
import {useSyncExternalStore} from 'react';
import {accountClient,currentOwner,databaseIdentity} from './client';
import {applyRecords,dataFromRecords,delta,recordMap,responseSchema,type RecordMap} from './records';
import {getDB,readData,writeData} from '../data/db';
import {validateBackup} from '../data/backup';
import {notifyChange} from '../data/store';

type State={version:number;base:RecordMap};
type Status={kind:'idle'|'syncing'|'saved'|'error'|'conflict';message:string};
const initial:Status={kind:'idle',message:'Progress saves on this device.'};
let status=initial;
const listeners=new Set<()=>void>();
const emit=(next:Status)=>{status=next;listeners.forEach(fn=>fn());};
export function useSyncStatus(){return useSyncExternalStore(fn=>{listeners.add(fn);return()=>{listeners.delete(fn);};},()=>status,()=>initial);}
let timer:ReturnType<typeof setTimeout>|undefined;
let running:Promise<boolean>|undefined;
let conflict:State|undefined;
export function scheduleSync(){
 if(!currentOwner())return;
 clearTimeout(timer);
 if(status.kind!=='conflict')emit({kind:'idle',message:'Saved on this device. Waiting to sync.'});
 timer=setTimeout(()=>{void syncAccount();},1200);
}
async function rpc(since:number,expected:number|null=null,changes=delta({},{})){
 const {data,error}=await accountClient().rpc('harf_sync',{since_version:since,expected_version:expected,changes});
 if(error)throw Error(error.message);
 return responseSchema.parse(data);
}
function validated(records:RecordMap,local:Awaited<ReturnType<typeof readData>>){
 return validateBackup({app:'harf',schemaVersion:2,contentVersion:'account',exportedAt:new Date().toISOString(),data:dataFromRecords(records,local)}).data;
}
async function synchronize(choice?:'cloud'|'device'){
 const owner=await databaseIdentity();
 if(!owner)return true;
 if(!navigator.locks)throw Error('Account sync needs a browser with Web Locks support. Your local progress is kept.');
 return navigator.locks.request(`harf-sync-${owner.id}`,async()=>{
  const db=await getDB();
  const state=await db.get('sync','state') as State|undefined;
  const local=await readData(),localMap=recordMap(local);
  const remote=await rpc(state?.version??0);
  const cloud=applyRecords(state?.base??{},remote.changes);
  const dirty=state?delta(state.base,localMap).length>0:false;
  if(choice&&(!conflict||conflict.version!==remote.version)){
   conflict={version:remote.version,base:cloud};
   emit({kind:'conflict',message:'Cloud progress changed again. Review your choice and try again.'});return false;
  }
  if(!choice&&dirty&&remote.version!==state!.version&&delta(cloud,localMap).length){
   conflict={version:remote.version,base:cloud};
   emit({kind:'conflict',message:'This device and another device have different changes. Choose which progress to keep in Profile.'});return false;
  }
  const upload=choice==='device'||(!choice&&(dirty||(!state&&remote.version===0)));
  if(upload){
   const changes=delta(cloud,localMap);
   // ponytail: atomic batches cap at 1,000 records / 2 MiB; staged server commits are needed for larger offline histories.
   if(changes.length>1000||new TextEncoder().encode(JSON.stringify(changes)).length>1900000)throw Error('Too much unsynced progress for one safe upload. Export a backup in Settings; your local data is kept.');
   validated(localMap,local);
   if(choice==='device')await db.put('sync',{data:validated(cloud,local),createdAt:new Date().toISOString()},'discardedCloud');
   const pushed=await rpc(remote.version,remote.version,changes);
   if(pushed.conflict){conflict=undefined;emit({kind:'conflict',message:'Cloud progress changed during upload. Sync again before choosing.'});return false;}
   await databaseIdentity();
   await db.put('sync',{version:pushed.version,base:localMap} satisfies State,'state');
  }else{
   const next={version:remote.version,base:cloud};
   if(delta(localMap,cloud).length){
    await writeData(validated(cloud,local),'cloud sync',true,{expectedRevision:Number(local.meta.revision??0),state:next});
   }else await db.put('sync',next,'state');
  }
  conflict=undefined;
  await notifyChange(false);
  emit({kind:'saved',message:'Progress synced.'});
  // A review saved during the request still belongs to the next upload.
  const latest=await readData(),baseline=await db.get('sync','state') as State;
  if(delta(baseline.base,recordMap(latest)).length){scheduleSync();return false;}
  return true;
 });
}
export function syncAccount(choice?:'cloud'|'device'):Promise<boolean>{
 if(running)return running;
 clearTimeout(timer);
 emit({kind:'syncing',message:'Syncing progress…'});
 running=synchronize(choice).catch(error=>{emit({kind:'error',message:error instanceof Error?error.message:'Sync failed. Local progress is kept.'});return false;}).finally(()=>{running=undefined;});
 return running;
}
