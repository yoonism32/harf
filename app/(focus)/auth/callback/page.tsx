'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {accountClient} from '@/lib/account/client';
export default function Callback(){
 const started=useRef(false),[error,setError]=useState('');
 useEffect(()=>{
  if(started.current)return;started.current=true;
  const params=new URLSearchParams(location.search),code=params.get('code');
  // Remove the one-use code from browser history immediately.
  history.replaceState(null,'','/auth/callback');
  if(!code){setError('This sign-in link is missing or expired. Request a new link.');return;}
  void accountClient().auth.exchangeCodeForSession(code).then(({error})=>{
   if(error)setError('Could not sign in. Open a new link in the browser where you requested it.');
   else location.replace('/profile');
  }).catch(()=>setError('Could not connect. Request a new sign-in link when you are online.'));
 },[]);
 return <div className="stack"><h1>{error?'Sign-in needs another try':'Signing you in…'}</h1>{error&&<><p role="alert">{error}</p><Link href="/login">Request a new link</Link></>}</div>;
}
