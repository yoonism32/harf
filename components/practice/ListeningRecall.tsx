'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { getAyah, getListeningManifest } from '@/lib/content/client';
import { ResourceMessage, useResource } from '@/components/learning/useResource';
import { AudioControl } from '@/components/reader/AudioControl';
import { stopAudio, verseAudioUrl } from '@/lib/audio';
import { checkListeningAnswer, listeningPool, listeningScore, listeningTarget, nextLocationHint, type ListeningEntry, type ListeningFilters } from '@/lib/practice/listening';
import type { Surah } from '@/lib/content/schema';

function RecallRound({target,pool,reciter,speed,next}:{target:ListeningEntry;pool:ListeningEntry[];reciter:string;speed:number;next:()=>void}) {
 const load=useCallback(()=>getAyah(target.ref),[target.ref]);const ayah=useResource(load);
 const [answer,setAnswer]=useState('');const [retry,setRetry]=useState(false);const [base,setBase]=useState<number|null>(null);const [error,setError]=useState('');
 const [english,setEnglish]=useState(false);const [hints,setHints]=useState<string[]>([]);const [remaining,setRemaining]=useState(pool);
 const single=pool.length===1;const knownSurah=pool.every(e=>e.ref.split(':')[0]===target.ref.split(':')[0])?Number(target.ref.split(':')[0]):undefined;
 const hint=nextLocationHint(remaining,target);const [s,a]=target.ref.split(':') as [string,string];
 useEffect(()=>()=>stopAudio(),[target.ref]);
 if(!ayah.data)return <ResourceMessage error={ayah.error} retry={ayah.retry}/>;
 return <section className="sheet stack">
  <h2>{single?'Listen to the selected ayah':'Which surah and ayah is this?'}</h2>
  <p>{single?`Only ${target.ref} is selected, so this round is unscored.`:knownSurah?`Surah ${knownSurah} is selected. Enter the ayah number or surah:ayah.`:'Type surah:ayah, for example 112:1. Replay is free.'}</p>
  <AudioControl url={verseAudioUrl(s,a,reciter)} label="Play ayah" playbackRate={speed}/>
  {!single&&base===null&&<>
   {hints.length>0&&<ul>{hints.map(h=><li key={h}>{h}</li>)}</ul>}
   <div className="actions"><button className="button button-secondary" disabled={!hint} onClick={()=>{if(hint){setHints([...hints,hint.label]);setRemaining(hint.remaining);}}}>Narrow location (−1 point)</button><button className="button button-secondary" disabled={english} onClick={()=>setEnglish(true)}>Show English (−1 point)</button></div>
   {!hint&&<p className="muted">No further location clue without revealing the answer.</p>}
   {retry&&<p role="status">The surah is right. Try the ayah number once more.</p>}
   <form className="stack" onSubmit={e=>{e.preventDefault();const result=checkListeningAnswer(answer,target.ref,retry,knownSurah);if(result.kind==='invalid'){setError(result.message);return;}setError('');if(result.kind==='retry'){setRetry(true);setAnswer('');setRemaining(remaining.filter(x=>x.ref.split(':')[0]===s));}else setBase(result.base);}}>
    <label className="field">{retry?'Ayah number':'Your answer'}<input value={answer} onChange={e=>setAnswer(e.target.value)} autoComplete="off" spellCheck={false} placeholder={retry||knownSurah?'Ayah number':'surah:ayah'} aria-describedby={error?'listening-error':undefined}/></label>
    {error&&<p id="listening-error" role="alert">{error}</p>}
    <button className="button button-primary" type="submit">Check answer</button>
   </form>
   <button className="button button-secondary" onClick={()=>setBase(0)}>Reveal answer (0 points)</button>
  </>}
  {(english||single||base!==null)&&<p className="translation">{ayah.data.translation}</p>}
  {(single||base!==null)&&<div className="stack" aria-live="polite">
   <h3>Ayah {target.ref}</h3>
   {!single&&<p>{listeningScore(base!,hints.length,english)} / 3 points · Answer: {base}; location clues: −{hints.length}; early English: −{Number(english)}. Minimum 0.</p>}
   <p className="quran-text" dir="rtl" lang="ar">{ayah.data.tokens.map(t=>`${t.arabic} `)}</p>
   <div className="actions"><Link href={`/read/${s}/${a}`}>Open in Read</Link><button className="button button-primary" onClick={next}>Next round</button></div>
  </div>}
 </section>;
}

export function ListeningRecall({seed,initialRound,reciter,surahs}:{seed:number;initialRound:number;reciter:string;surahs:Surah[]}) {
 const manifest=useResource(getListeningManifest);const [round,setRound]=useState(initialRound);const [filters,setFilters]=useState<ListeningFilters>({});const [draft,setDraft]=useState<ListeningFilters>({});const [speed,setSpeed]=useState(1);
 const selected=useMemo(()=>{try{const pool=listeningPool(manifest.data??[],filters);return {pool,target:pool.length?listeningTarget(pool,seed,round):null,error:''};}catch(e){return {pool:[],target:null,error:e instanceof Error?e.message:'Invalid range'};}},[manifest.data,filters,seed,round]);
 useEffect(()=>()=>stopAudio(),[]);
 return <div className="stack"><header className="page-header"><p className="eyebrow">Listening recall · practice without changing your review schedule</p><h1>Round {round+1}</h1><Link href="/practice">End practice</Link></header>
  <details className="sheet"><summary>Range and playback options</summary><form className="stack" onSubmit={e=>{e.preventDefault();stopAudio();setFilters(draft);setRound(0);}}>
   <label className="field">Surah<select value={draft.surah??''} onChange={e=>setDraft({...draft,surah:Number(e.target.value)||undefined})}><option value="">All surahs</option>{surahs.map(s=><option key={s.number} value={s.number}>{s.number}. {s.englishName}</option>)}</select></label>
   <label className="field">Juz<select value={draft.juz??''} onChange={e=>setDraft({...draft,juz:Number(e.target.value)||undefined})}><option value="">All juz</option>{Array.from({length:30},(_,i)=><option key={i+1} value={i+1}>{i+1}</option>)}</select></label>
   <label className="field">From (optional)<input placeholder="2:1" value={draft.from??''} onChange={e=>setDraft({...draft,from:e.target.value.trim()})}/></label>
   <label className="field">To (optional)<input placeholder="2:20" value={draft.to??''} onChange={e=>setDraft({...draft,to:e.target.value.trim()})}/></label>
   <button className="button button-secondary">Apply range and restart</button>
  </form><label className="field">Playback speed<select value={speed} onChange={e=>{stopAudio();setSpeed(Number(e.target.value));}}>{[0.5,0.75,1,1.25,1.5].map(n=><option key={n} value={n}>{n}×</option>)}</select></label></details>
  {!manifest.data?<ResourceMessage error={manifest.error} retry={manifest.retry}/>:!selected.target?<p role="alert">{selected.error||'No ayahs match these filters. Adjust the range.'}</p>:<><p className="muted">{selected.pool.length} ayahs in this range. No repeats until the range is exhausted. Range settings last for this visit.</p><RecallRound key={`${round}:${JSON.stringify(filters)}`} target={selected.target} pool={selected.pool} reciter={reciter} speed={speed} next={()=>{stopAudio();setRound(n=>n+1);}}/></>}
 </div>;
}
