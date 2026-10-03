'use client';
import { useSyncExternalStore } from 'react';
import { subscribeAudio, getAudioState, getServerAudioState, playAudio } from '@/lib/audio';
export function AudioControl({url,label='Listen to ayah'}:{url:string;label?:string}) {
  const state=useSyncExternalStore(subscribeAudio,getAudioState,getServerAudioState);
  const active=state.url===url;
  return <span className="audio-control"><button className="button button-secondary" type="button" aria-pressed={active&&state.status==='playing'} disabled={active&&state.status==='loading'} onClick={()=>void playAudio(url)}>{active&&state.status==='loading'?'Loading audio…':active&&state.status==='playing'?'Pause audio':active&&state.status==='paused'?'Resume audio':label}</button>{active&&state.error&&<span role="status">{state.error}</span>}</span>;
}
