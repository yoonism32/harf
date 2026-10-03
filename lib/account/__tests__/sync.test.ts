import 'fake-indexeddb/auto';
import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import {deleteDB} from 'idb';
const mock=vi.hoisted(()=>({owner:{id:'a',email:'a@example.test'} as {id:string;email:string}|null,rpc:vi.fn()}));
vi.mock('../client',()=>({databaseIdentity:async()=>mock.owner,currentOwner:()=>mock.owner,accountClient:()=>({rpc:mock.rpc})}));
vi.mock('../../data/store',()=>({notifyChange:vi.fn()}));
import {getDB,closeDB,readData,writeData} from '../../data/db';
import {emptyData} from '../../data/schema';
import {syncAccount} from '../sync';
import {recordMap,delta,applyRecords} from '../records';
let cloud:ReturnType<typeof recordMap>,version:number;
beforeEach(async()=>{
 vi.useFakeTimers({toFake:['setTimeout','clearTimeout']});
 vi.stubGlobal('navigator',{locks:{request:async(_name:string,fn:()=>unknown)=>fn()}});
 await closeDB();await deleteDB('harf-account-a');await deleteDB('harf-account-b');await deleteDB('harf');
 mock.owner={id:'a',email:'a@example.test'};cloud={};version=0;
 mock.rpc.mockReset().mockImplementation(async(_name,args)=>{
  if(args.expected_version!==null&&args.expected_version!==version)return {data:{conflict:true,version,changes:[]},error:null};
  if(args.changes.length){cloud=applyRecords(cloud,args.changes);version++;}
  return {data:{conflict:false,version,changes:args.since_version===version?[]:Object.values(cloud)},error:null};
 });
 await writeData(emptyData(),'test',false);
});
afterEach(async()=>{vi.clearAllTimers();vi.useRealTimers();vi.unstubAllGlobals();await closeDB();});
it('isolates guest and account databases',async()=>{
 await (await getDB()).put('meta','private','marker');await closeDB();
 mock.owner=null;expect(await (await getDB()).get('meta','marker')).toBeUndefined();await closeDB();
 mock.owner={id:'b',email:'b@example.test'};expect(await (await getDB()).get('meta','marker')).toBeUndefined();
});
it('uploads only differences, survives offline failures, and retries an acknowledged-lost write',async()=>{
 expect(await syncAccount()).toBe(true);
 const data=await readData();data.notes=[{id:'n',text:'offline note',updatedAt:'2026-10-02T14:00:00Z'}];await writeData(data,'test');
 mock.rpc.mockRejectedValueOnce(Error('offline'));
 expect(await syncAccount()).toBe(false);expect((await readData()).notes[0]!.text).toBe('offline note');
 expect(await syncAccount()).toBe(true);
 expect(mock.rpc.mock.calls.at(-1)![1].changes).toHaveLength(1);
 // Simulate losing the saved acknowledgement after the server committed.
 await (await getDB()).put('sync',{version:0,base:{}},'state');
 expect(await syncAccount()).toBe(true);expect((await readData()).notes).toHaveLength(1);
});
it('downloads an existing account instead of uploading fresh defaults',async()=>{
 const other=emptyData();other.notes=[{id:'remote',text:'saved elsewhere',updatedAt:'2026-10-02T14:00:00Z'}];cloud=recordMap(other);version=4;
 expect(await syncAccount()).toBe(true);expect((await readData()).notes[0]!.id).toBe('remote');
 expect(mock.rpc).toHaveBeenCalledTimes(1);
});
it('requires explicit conflict resolution and keeps a recovery snapshot',async()=>{
 await syncAccount();
 const data=await readData();data.notes=[{id:'n',text:'local',updatedAt:'2026-10-02T14:00:00Z'}];await writeData(data,'test');
 cloud['notes/n']={collection:'notes',key:'n',value:{...data.notes[0],text:'remote'}};version++;
 expect(await syncAccount()).toBe(false);expect((await readData()).notes[0]!.text).toBe('local');
 expect(await syncAccount('cloud')).toBe(true);expect((await readData()).notes[0]!.text).toBe('remote');
 expect((await (await getDB()).get('recovery','previous')).data.notes[0].text).toBe('local');
});
it('rejects a stale local revision without replacing a newer answer',async()=>{
 const stale=await readData();await (await getDB()).put('meta',99,'revision');
 await expect(writeData(stale,'cloud',true,{expectedRevision:1,state:{}})).rejects.toThrow('Progress changed');
 expect((await readData()).meta.revision).toBe(99);
});
it('compares JSON independent of Postgres key order and validates records',()=>{
 const a=recordMap(emptyData()),b=JSON.parse(JSON.stringify(a));
 b['meta/settings'].value=Object.fromEntries(Object.entries(b['meta/settings'].value).reverse());
 expect(delta(a,b)).toEqual([]);
 expect(()=>applyRecords({},[{collection:'notes',key:'one',value:{id:'two',text:'x',updatedAt:'2026-10-02T14:00:00Z'}}])).toThrow('ID');
});

it('does not report fully synced while an answer changes during a request',async()=>{
 await syncAccount();
 const normal=mock.rpc.getMockImplementation()!;
 mock.rpc.mockImplementationOnce(async(...args)=>{
  const data=await readData();data.notes=[{id:'late',text:'saved during sync',updatedAt:'2026-10-02T14:00:00Z'}];await writeData(data,'concurrent save');
  return normal(...args);
 });
 expect(await syncAccount()).toBe(false);
 expect((await readData()).notes[0]!.id).toBe('late');
 expect(await syncAccount()).toBe(true);
 expect(cloud['notes/late']).toBeDefined();
});
