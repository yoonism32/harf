'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {accountClient} from '@/lib/account/client';
import {accountDestination,callbackError} from '@/lib/account/auth';
export default function Callback(){
 const started=useRef(false),[error,setError]=useState('');
 useEffect(()=>{
  if(started.current)return;started.current=true;
  const params=new URLSearchParams(location.search),code=params.get('code'),flowId=params.get('sb_flow_id');
  const failure=callbackError(location.search,location.hash);
  // Remove the one-use code from browser history immediately.
  history.replaceState(null,'','/auth/callback');
  if(failure){setError(failure);return;}
  if(!code){setError('This email link is missing or expired. Sign in, or request a new password recovery email.');return;}
  const auth=accountClient().auth;
  let recovery=false;
  const {data:{subscription}}=auth.onAuthStateChange(event=>{if(event==='PASSWORD_RECOVERY')recovery=true;});
  void auth.exchangeCodeForSession(code,flowId?{flowId}:undefined).then(({error})=>{
   if(error)setError('Could not finish verification. Open the newest link in the browser where you requested it. If your email is already confirmed, you can sign in with your password.');
   else location.replace(accountDestination(recovery?'recovery':null));
  }).catch(()=>setError('Could not connect. Try signing in or requesting a new password recovery email when you are online.')).finally(()=>subscription.unsubscribe());
 },[]);
 return <div className="stack"><h1>{error?'Verification needs another try':'Verifying your email…'}</h1>{error&&<><p role="alert">{error}</p><Link href="/login">Back to sign in</Link><Link href="/forgot-password">Request a password recovery email</Link></>}</div>;
}
