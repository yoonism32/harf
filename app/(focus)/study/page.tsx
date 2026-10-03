'use client';

import Link from 'next/link';
import {useCallback,useEffect,useRef,useState} from 'react';
import {useRouter,useSearchParams} from 'next/navigation';
import type {Grade} from 'ts-fsrs';
import {z} from 'zod';
import {AudioControl} from '@/components/reader/AudioControl';
import {startCourse} from '@/components/learning/start';
import {getCatalog,getEntry} from '@/lib/content/client';
import {nameEntrySchema,studyExampleSchema,vocabularyEntrySchema} from '@/lib/content/schema';
import {stopAudio,verseAudioUrl} from '@/lib/audio';
import {useHarfStore} from '@/lib/data/store';
import type {StudySession} from '@/lib/data/schema';
import {beginRecall,commitReview,endSession,pauseSession,resumeSession,revealSession,undoReview} from '@/lib/learning/commands';
import {buildQueue} from '@/lib/learning/queue';
import {previews} from '@/lib/learning/scheduler';

const ratings=['Again','Hard','Good','Easy'] as const;
const hints=['Forgot','Correct, with difficulty','Correct','Effortless'] as const;
const vocabularyPayload=z.object({entry:vocabularyEntrySchema,example:studyExampleSchema});
const namePayload=z.object({name:nameEntrySchema});

export default function StudyPage(){
 const store=useHarfStore(),router=useRouter(),params=useSearchParams();
 const requestedId=params.get('session');
 const requested=requestedId?store.sessions.find(item=>item.id===requestedId):store.activeSession;
 const session=requested?.status==='active'||requested?.status==='paused'?requested:null;
 const result=requested&&['completed','ended'].includes(requested.status)?requested:null;
 const [error,setError]=useState(''),[busy,setBusy]=useState(false),[pendingGrade,setPendingGrade]=useState<Grade|null>(null);
 const lock=useRef(false),heading=useRef<HTMLHeadingElement>(null),answerHeading=useRef<HTMLHeadingElement>(null);
 const attempt=session?.queue[session.cursor];
 const parsed=attempt?(session?.collection==='vocabulary'?vocabularyPayload:namePayload).safeParse(attempt.payload):null;
 const entry=parsed?.success&&'entry' in parsed.data?parsed.data.entry:undefined;
 const example=parsed?.success&&'example' in parsed.data?parsed.data.example:undefined;
 const name=parsed?.success&&'name' in parsed.data?parsed.data.name:undefined;
 const run=useCallback(async(action:()=>Promise<unknown>)=>{if(lock.current)return;lock.current=true;setBusy(true);setError('');try{await action();setPendingGrade(null);}catch(cause){setError(cause instanceof Error?cause.message:"Your answer wasn't saved. Try again.");}finally{lock.current=false;setBusy(false);}},[]);
 const grade=useCallback((value:Grade)=>{if(!session||!attempt)return;setPendingGrade(value);void run(()=>commitReview({sessionId:session.id,expectedRevision:session.revision,attemptId:attempt.id,grade:value}));},[session,attempt,run]);
 useEffect(()=>{stopAudio();(session?.phase==='answer'?answerHeading:heading).current?.focus();},[attempt?.id,session?.phase]);
 useEffect(()=>()=>stopAudio(),[]);
 useEffect(()=>{if(!requestedId&&store.activeSession)router.replace(`/study?session=${encodeURIComponent(store.activeSession.id)}`);},[requestedId,store.activeSession,router]);
 function shortcut(event:React.KeyboardEvent<HTMLDivElement>){
  if(event.repeat||event.nativeEvent.isComposing||event.altKey||event.ctrlKey||event.metaKey||!session||busy)return;
  const target=event.target as HTMLElement;if(target.closest('input,textarea,select,button,a,[contenteditable="true"],[role="dialog"]'))return;
  if((event.code==='Space'||event.key==='Enter')&&session.phase!=='answer'){event.preventDefault();void run(()=>session.phase==='introduction'?beginRecall(session.id,session.revision):revealSession(session.id,session.revision));}
  else if(session.phase==='answer'&&/^[1-4]$/.test(event.key)){event.preventDefault();grade(Number(event.key) as Grade);}
  else if(event.key.toLowerCase()==='u'&&session.lastUndoEvent){event.preventDefault();void run(()=>undoReview(session.id));}
 }
 if(store.status==='loading')return <div className="study-sheet stack" aria-busy="true"><p role="status">Opening your study session…</p></div>;
 if(store.status==='unavailable')return <div role="alert"><h1>Progress cannot be saved</h1><p>{store.error}</p><Link href="/settings">Open backup and recovery</Link></div>;
 if(result)return <SessionResult session={result}/>;
 if(!requested)return <div className="study-sheet stack"><p className="eyebrow">Study</p><h1>This session is not available.</h1><p>It may have been replaced, ended, or opened from an old link.</p>{store.activeSession?<Link className="button button-primary" href={`/study?session=${encodeURIComponent(store.activeSession.id)}`}>Open the saved session</Link>:<Link className="button button-primary" href="/today">Choose today’s next step</Link>}</div>;
 if(session&&store.activeSession?.id!==session.id)return <div className="study-sheet stack"><p className="eyebrow">Study</p><h1>This is no longer the active session.</h1><p>Your current saved session is available instead.</p>{store.activeSession&&<Link className="button button-primary" href={`/study?session=${encodeURIComponent(store.activeSession.id)}`}>Open current session</Link>}<Link href="/today">Back to Today</Link></div>;
 if(!session)return <SessionResult session={requested}/>;
 if(session.status==='paused')return <div className="study-sheet stack"><p className="eyebrow">{session.collection==='names'?'Names of Allah':'Vocabulary'}</p><h1>Continue where you left off</h1><p>{session.practiced.length} unique entries practiced · {new Set(session.queue.slice(session.cursor).map(item=>item.entryId)).size} remaining</p><button className="button button-primary" onClick={()=>void run(()=>resumeSession(session.id))} disabled={busy}>Resume session</button><button className="button button-secondary" disabled={busy} onClick={()=>void run(()=>endSession(session.id))}>End session and keep saved answers</button>{error&&<p role="alert">{error}</p>}<Link href="/today">Back to Today</Link></div>;
 if(!attempt||(!entry&&!name))return <div role="alert"><h1>This saved session has missing content</h1><p>Export your progress before ending or resetting this session.</p><Link href="/settings">Open Settings</Link></div>;
 const show=session.phase!=='question',remaining=new Set(session.queue.slice(session.cursor).map(item=>item.entryId)).size;let intervals:Record<number,string>={};
 try{if(session.phase==='answer'){const now=new Date(session.previewAt!);const options=previews(store.cards.find(card=>card.id===attempt.cardId)?.card??null,now);intervals=Object.fromEntries(Object.entries(options).map(([value,card])=>{const minutes=Math.max(1,Math.round((Date.parse(card.due)-now.getTime())/60000));return [value,minutes<60?`${minutes} min`:minutes<1440?`${Math.round(minutes/60)} hr`:`${Math.round(minutes/1440)} days`];}));}}catch(cause){intervals={};if(!error)queueMicrotask(()=>setError(cause instanceof Error?cause.message:'Check your device clock.'));}
 return <div className="study-sheet stack" onKeyDown={shortcut}>
  <header className="study-session-header"><button className="button button-text" disabled={busy} onClick={()=>void run(async()=>{await pauseSession(session.id);stopAudio();router.push('/today');})}>Exit</button><div><strong>{session.collection==='names'?'Names of Allah':'Vocabulary'}</strong><span className="muted">{session.actions} reviews completed · {remaining} entries remaining</span></div></header>
  <h1 ref={heading} tabIndex={-1} className="section-heading">{session.phase==='introduction'?'Meet this word':session.phase==='question'?'What does this mean here?':'How well did you recall it?'}</h1>
  <div className="sheet study-card"><p className="study-word" lang="ar" dir="rtl">{name?.arabic??example?.tokens.find(token=>token.key===example.targetKey)?.arabic??entry?.arabic}</p>{show&&<div className="answer"><h2 ref={answerHeading} tabIndex={-1}>{name?.meaning??example?.targetGloss}</h2>{store.settings.introTransliteration&&<p>{name?.transliteration??example?.targetTransliteration}</p>}</div>}{example&&<><p className="quran-text" lang="ar" dir="rtl">{example.tokens.map(token=><span key={token.key} className={token.key===example.targetKey?'selected-token':''}>{token.arabic}{' '}</span>)}</p><p className="eyebrow">Ayah {example.ref}</p>{show&&<p className="translation">{example.translation}</p>}<AudioControl url={verseAudioUrl(...example.ref.split(':') as [string,string],store.settings.reciter)}/></>}{name&&show&&name.explanation&&<p>{name.explanation}</p>}</div>
  {error&&<div role="alert" className="status-message stack"><strong>{pendingGrade?"Your answer wasn't saved.":'Study action failed.'}</strong><p>{error}</p>{pendingGrade&&<button className="button button-secondary" disabled={busy} onClick={()=>grade(pendingGrade)}>Retry saving {ratings[pendingGrade-1]}</button>}</div>}
  {session.phase==='introduction'?<button className="button button-primary" disabled={busy} onClick={()=>void run(()=>beginRecall(session.id,session.revision))}>Try recalling it</button>:session.phase==='question'?<button className="button button-primary" disabled={busy} onClick={()=>void run(()=>revealSession(session.id,session.revision))}>Reveal answer</button>:<div className="ratings">{ratings.map((label,index)=><button className="button button-secondary" key={label} disabled={busy||!intervals[index+1]} onClick={()=>grade((index+1) as Grade)}><strong>{label}</strong><span>{hints[index]}</span><small>{intervals[index+1]}</small></button>)}</div>}
  <div className="row between"><details><summary>Keyboard help</summary><p className="muted">Space or Enter reveals · 1–4 rates · U undoes the previous answer.</p></details><div className="row">{session.lastUndoEvent&&<button className="button button-secondary" disabled={busy} onClick={()=>void run(()=>undoReview(session.id))}>Undo last answer</button>}<button className="button button-text" disabled={busy} onClick={()=>void run(()=>endSession(session.id))}>End session</button></div></div>
 </div>;
}

function SessionResult({session}:{session:StudySession}){
 const store=useHarfStore(),router=useRouter();const [busy,setBusy]=useState(false),[error,setError]=useState(''),[contextHref,setContextHref]=useState<string|null>(null),[availability,setAvailability]=useState({due:0,newCount:0});const vocabulary=session.collection==='vocabulary';
 useEffect(()=>{let live=true;if(!vocabulary||!session.practiced.length)return;void Promise.allSettled(session.practiced.map(id=>getEntry(id))).then(results=>{const best=results.flatMap(result=>result.status==='fulfilled'?result.value.examples:[]).sort((a,b)=>a.tokens.length-b.tokens.length)[0];if(live&&best)setContextHref(`/read/${best.ref.replace(':','/')}`);});return()=>{live=false;};},[session.practiced,vocabulary]);
 useEffect(()=>{if(store.status!=='ready')return;let live=true;void getCatalog().then(catalog=>{const queue=buildQueue(store,'vocabulary',catalog.entries.map(entry=>({id:entry.id,order:entry.courseOrder})),new Date());if(live)setAvailability({due:queue.filter(item=>!item.isNew).length,newCount:queue.filter(item=>item.isNew).length});}).catch(()=>{});return()=>{live=false;};},[store]);
 async function begin(){setBusy(true);setError('');try{const created=await startCourse('vocabulary');router.push(`/study?session=${encodeURIComponent(created.id)}`);}catch(cause){setError(cause instanceof Error?cause.message:'Could not start another session.');}finally{setBusy(false);}}
 const dueAt=session.nextDue?Date.parse(session.nextDue):null,nextDue=dueAt&&dueAt>Date.now()?Math.max(1,Math.round((dueAt-Date.now())/60000)):null;
 return <div className="study-sheet stack"><p className="eyebrow">Session complete</p><h1>A little more familiar.</h1><p>{session.practiced.length} unique entries practiced · {session.introduced.length} introduced · {session.again} answers marked Again</p>{nextDue&&<p>Your next scheduled review is in about {nextDue<60?`${nextDue} minutes`:`${Math.round(nextDue/60)} hours`}.</p>}{error&&<p role="alert">{error}</p>}{vocabulary&&contextHref?<Link className="button button-primary" href={contextHref}>Read these words in context</Link>:!vocabulary?<Link className="button button-primary" href="/collections/names">Back to Names</Link>:null}<Link className="button button-secondary" href="/today">Back to Today</Link>{store.activeSession?<Link className="button button-secondary" href={`/study?session=${encodeURIComponent(store.activeSession.id)}`}>Open current {store.activeSession.collection==='names'?'Names':'vocabulary'} session</Link>:<>{vocabulary&&availability.due>0&&<button className="button button-secondary" disabled={busy} onClick={()=>void begin()}>Continue reviews</button>}{vocabulary&&availability.due===0&&availability.newCount>0&&<button className="button button-secondary" disabled={busy} onClick={()=>void begin()}>Learn remaining new words</button>}</>}</div>;
}
