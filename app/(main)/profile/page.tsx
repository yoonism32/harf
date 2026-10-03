'use client';
import {useState} from 'react';
import Link from 'next/link';
import {accountClient,currentOwner} from '@/lib/account/client';
import {syncAccount,useSyncStatus} from '@/lib/account/sync';
import {getDB} from '@/lib/data/db';
import {useHarfStore} from '@/lib/data/store';
export default function Profile(){
 const store=useHarfStore(),sync=useSyncStatus(),owner=currentOwner();
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[offlineLogout,setOfflineLogout]=useState(false);
 async function exportPreviousCloud(){
  try{
   const saved=await (await getDB()).get('sync','discardedCloud');
   if(!saved)throw Error('No replaced cloud copy is saved on this device.');
   const url=URL.createObjectURL(new Blob([JSON.stringify({app:'harf',schemaVersion:2,contentVersion:'account',exportedAt:saved.createdAt,data:saved.data})],{type:'application/json'}));
   const a=document.createElement('a');a.href=url;a.download='harf-previous-cloud.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);
  }catch(e){setError(e instanceof Error?e.message:'Could not export.');}
 }
 async function signOut(){
  setBusy(true);setError('');
  try{
   if(!offlineLogout&&!(await syncAccount()))throw Error('Sync has not finished. Retry, or choose to leave unsynced progress on this device.');
   const {error}=await accountClient().auth.signOut({scope:'local'});if(error)throw error;
   // The identity-change listener reloads Profile and releases the old cache.
  }catch(e){setError(e instanceof Error?e.message:'Could not sign out.');}finally{setBusy(false);}
 }
 return <div className="stack"><header className="page-header"><p className="eyebrow">Your study space</p><h1>Profile</h1></header>{store.status==='loading'?<p role="status">Loading your profile…</p>:!owner?<><p>You are studying as a guest. Progress stays in this browser.</p><Link className="button button-primary" href="/login">Sign in or create an account</Link><p>Your first sign-in starts fresh; guest progress is not imported.</p></>:<><section className="stack"><h2>Account</h2><p>{owner.email}</p><p>Study progress, notes, bookmarks and preferences sync to your account. Quran content and audio are not uploaded.</p><p role="status">{sync.message}</p>{store.status==='unavailable'&&<p role="alert">{store.error} <button className="button button-secondary" onClick={()=>location.reload()}>Reload</button></p>}<button className="button button-secondary" disabled={busy||sync.kind==='syncing'} onClick={()=>void syncAccount()}>Sync now</button>{sync.kind==='conflict'&&<div className="status-message stack"><h3>Choose the progress to keep</h3><p>These histories cannot be combined safely. Replacing this device keeps one recovery snapshot in Settings. Keeping this device replaces cloud progress; the previous cloud copy is retained on this device.</p><button className="button button-secondary" disabled={busy} onClick={()=>void syncAccount('cloud')}>Use cloud progress</button><button className="button button-secondary" disabled={busy} onClick={()=>void syncAccount('device')}>Keep this device’s progress</button></div>}</section><button className="button button-secondary" onClick={()=>void exportPreviousCloud()}>Export replaced cloud copy</button><Link className="button button-primary" href="/today">Continue studying</Link><section className="stack"><h2>Sign out</h2><p>This device keeps an account-specific offline cache. On shared devices, clear Harf site data after syncing and signing out.</p><label className="choice"><input type="checkbox" checked={offlineLogout} onChange={e=>setOfflineLogout(e.target.checked)}/>Leave unsynced progress on this device and sign out</label><button className="button button-secondary" disabled={busy} onClick={()=>void signOut()}>{busy?'Signing out…':'Sign out'}</button></section></>}{error&&<p role="alert" className="error-text">{error}</p>}<Link href="/settings">Backups and settings</Link></div>;
}
