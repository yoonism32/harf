'use client';
import {useState,type FormEvent} from 'react';
import Link from 'next/link';
import {accountClient,accountConfigured} from '@/lib/account/client';
export default function Login(){
 const [email,setEmail]=useState(''),[busy,setBusy]=useState(false),[sent,setSent]=useState(false),[error,setError]=useState('');
 async function submit(event:FormEvent){
  event.preventDefault();setBusy(true);setError('');
  try{
   const {error}=await accountClient().auth.signInWithOtp({email:email.trim(),options:{emailRedirectTo:`${location.origin}/auth/callback`}});
   if(error)throw error;
   setSent(true);
  }catch(e){setError(e instanceof Error?e.message:'Could not send the link. Try again.');}finally{setBusy(false);}
 }
 return <div className="stack"><header className="page-header"><h1>Sign in to Harf</h1><p>Save your progress across devices with an email sign-in link.</p></header><p>Your first sign-in starts a fresh account. Guest progress stays separate in this browser.</p>{!accountConfigured?<p role="alert">Account connection is not configured on this installation.</p>:<form className="stack" onSubmit={submit}><label className="field">Email address<input type="email" autoComplete="email" required maxLength={254} value={email} onChange={e=>setEmail(e.target.value)} disabled={busy}/></label><button className="button button-primary" disabled={busy||sent}>{busy?'Sending…':sent?'Link sent':'Send sign-in link'}</button>{sent&&<p role="status">Check your email. Open the link in this same browser and device. If it expires, reload this page to request another.</p>}</form>}{error&&<p role="alert" className="error-text">{error}</p>}<Link href="/today">Continue without an account</Link></div>;
}
