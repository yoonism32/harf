'use client';

import Link from 'next/link';
import {ExploreLink} from '@/components/shell/QuickReturn';
import { useCallback, useRef, useState } from 'react';
import {z} from 'zod';
import {useVisitState} from '@/lib/data/use-visit-state';
import {useRouter,useSearchParams} from 'next/navigation';
import {CONTENT_VERSION} from '@/lib/content/client';
import {useHarfStore} from '@/lib/data/store';
import {duePassageCards,passageId} from '@/lib/practice/passage-model';
import {rememberPassage,reviewPassage,undoPassageReview} from '@/lib/practice/passage-commands';
import { getAyah } from '@/lib/content/client';
import { positionsInRanges } from '@/lib/insights/compare';
import type { SimilarPair } from '@/lib/insights/types';
import { ResourceMessage, useResource } from '@/components/learning/useResource';

export function SimilarPassagesPractice({ pairs }: { pairs: SimilarPair[] }) {
  const params=useSearchParams(),router=useRouter();
  const store=useHarfStore(),mode=params.get('mode')==='due'?'due':'browse';
  const pairFor=(verseA:string,verseB:string)=>pairs.find(pair=>(pair.verseA===verseA&&pair.verseB===verseB)||(pair.verseA===verseB&&pair.verseB===verseA));
  const dueCards=duePassageCards(store.passageCards),duePairs=dueCards.flatMap(card=>{const pair=pairFor(card.verseA,card.verseB);return pair?[pair]:[];}),unavailable=store.passageCards.filter(card=>!pairFor(card.verseA,card.verseB));
  const activePairs=mode==='due'?duePairs:pairs;
  const raw=params.get('pair'),parsed=raw&&/^\d{1,3}$/.test(raw)?Number(raw):0;
  const index=parsed>=0&&parsed<activePairs.length?parsed:0;
  const complete=parsed===activePairs.length;
  const next=()=>router.push(`/insights/practice?${new URLSearchParams({mode,...(index+1?{pair:String(index+1)}:{})})}`);
  const unavailableNotice=unavailable.length>0&&<aside className="status-message stack"><h2>Saved pair unavailable</h2><p>These saved pairs are not available in the current comparison source. Their review history is retained.</p><ul>{unavailable.map(card=><li key={card.id}>{card.verseA} and {card.verseB}</li>)}</ul></aside>;
  if(mode==='due'&&store.status==='loading')return <p role="status">Opening saved pairs…</p>;
  if(mode==='due'&&!activePairs.length)return <div className="stack"><section className="study-sheet stack"><p className="eyebrow">Saved passages</p><h2>Your saved pairs are up to date.</h2><p>Return when a pair is ready for another comparison.</p><Link className="button button-primary" href="/insights/practice">Browse comparisons</Link></section>{unavailableNotice}</div>;
  if(complete)return <div className="stack"><section className="study-sheet stack"><p className="eyebrow">Practice complete</p><h2>You compared all {activePairs.length} passages.</h2><p>Return whenever you want to look for the shared wording again.</p><div className="row"><Link className="button button-primary" href={mode==='due'?'/insights/practice':'/insights/practice?pair=0'}>{mode==='due'?'Browse comparisons':'Practice again'}</Link><Link className="button button-secondary" href="/insights">Back to Quran insights</Link></div></section>{unavailableNotice}</div>;
  return <div className="stack">{mode==='browse'&&duePairs.length>0&&<Link className="button button-secondary" href="/insights/practice?mode=due">Review {duePairs.length} saved {duePairs.length===1?'pair':'pairs'} →</Link>}{mode==='due'&&<Link href="/insights/practice">← Browse comparisons</Link>}<Comparison key={`${mode}:${index}`} pairs={activePairs} index={index} onNext={next}/>{unavailableNotice}</div>;
}

function Comparison({pairs,index,onNext}:{pairs:SimilarPair[];index:number;onNext:()=>void}){
  const pair = pairs[index]!;
  const store=useHarfStore(),id=passageId(pair.verseA,pair.verseB),saved=store.passageCards.find(c=>c.id===id);
  const [revealed,setRevealed,revealedReady]=useVisitState(`comparison:${id}:revealed`,false,z.boolean());
  const [attempt,setAttempt,attemptReady]=useVisitState(`comparison:${id}:attempt`,crypto.randomUUID() as string,z.string().uuid());
  const [last,setLast,lastReady]=useVisitState<string|null>(`comparison:${id}:last`,null,z.string().uuid().nullable());
  const [revision,setRevision,revisionReady]=useVisitState(`comparison:${id}:revision`,saved?.revision??0,z.number().int().nonnegative());
  const [error,setError]=useState(''),[busy,setBusy]=useState(false);
  const saving=useRef(false);
  function startAttempt(){setAttempt(crypto.randomUUID());setRevision(saved?.revision??0);setLast(null);}
  async function action(fn:()=>Promise<unknown>){if(saving.current)return;saving.current=true;setBusy(true);setError('');try{await fn();}catch(e){setError(e instanceof Error?e.message:'Could not save. Try again.');}finally{saving.current=false;setBusy(false);}}

  const loadA = useCallback(() => getAyah(pair.verseA), [pair.verseA]);
  const loadB = useCallback(() => getAyah(pair.verseB), [pair.verseB]);
  const ayahA = useResource(loadA);
  const ayahB = useResource(loadB);
  const sharedPositions = positionsInRanges(pair.matchWordsInB);

  if(!revealedReady||!attemptReady||!lastReady||!revisionReady)return <p role="status">Restoring comparison…</p>;

  if (!ayahA.data) return <ResourceMessage error={ayahA.error} retry={ayahA.retry} />;

  return (
    <section className="study-sheet stack" aria-labelledby="practice-heading">
      <div className="row between">
        <div>
          <p className="eyebrow">Comparison {index + 1} of {pairs.length}</p>
          <h2 id="practice-heading">Recall the parallel wording</h2>
        </div>
        <ExploreLink href={`/insights/${pair.verseA.replace(':', '/')}`}>Context for {pair.verseA}</ExploreLink>
      </div>
      {error&&<div role="alert"><p>{error}</p><button className="button button-secondary" disabled={busy} onClick={()=>{setRevealed(false);startAttempt();setError('');}}>Start a new recall attempt</button></div>}
      {!saved?<button className="button button-secondary" disabled={busy||store.status!=='ready'} onClick={()=>void action(()=>rememberPassage(pair.verseA,pair.verseB,CONTENT_VERSION))}>Remember this pair</button>:<p className="muted">Saved for practice · {Date.parse(saved.card.due)<=Date.now()?'Due now':`Next review ${new Date(saved.card.due).toLocaleString()}`}</p>}
      <progress value={index + 1} max={pairs.length}>Comparison {index + 1} of {pairs.length}</progress>
      <article className="sheet stack">
        <p className="muted">Read {pair.verseA}. Before revealing, recall where a similar passage appears and which words change.</p>
        <p className="quran-text" dir="rtl" lang="ar">
          {ayahA.data.tokens.map(token => token.arabic).join(' ')}
        </p>
        <p className="translation">{ayahA.data.translation}</p>
      </article>
      {!revealed ? (
        <button className="button button-primary" onClick={() => {startAttempt();setRevealed(true);}}>Reveal the similar passage</button>
      ) : !ayahB.data ? (
        <ResourceMessage error={ayahB.error} retry={ayahB.retry} />
      ) : (
        <article className="sheet stack" aria-live="polite">
          <div className="row between">
            <h3>Compare with {pair.verseB}</h3>
            <span className="badge">Text match score {pair.score}</span>
          </div>
          <p className="muted">Highlighted words are identified as shared. Bold words differ in this comparison.</p>
          <p className="quran-text" dir="rtl" lang="ar">
            {ayahB.data.tokens.map(token => {
              if (token.kind !== 'word') return <span key={token.key}>{token.arabic} </span>;
              return sharedPositions.has(token.position)
                ? <mark key={token.key} className="selected-token">{token.arabic} </mark>
                : <strong key={token.key}>{token.arabic} </strong>;
            })}
          </p>
          <p className="translation">{ayahB.data.translation}</p>
          {saved&&Date.parse(saved.card.due)<=Date.now()&&!last&&<div className="row" aria-label="Rate passage recall">{(['Again','Hard','Good','Easy'] as const).map((label,i)=><button className="button button-secondary" key={label} disabled={busy} onClick={()=>void action(async()=>{const event=await reviewPassage({id,attemptId:attempt,expectedRevision:revision,grade:(i+1) as 1|2|3|4});setLast(event.id);setRevision(event.after.revision);})}>{label}</button>)}</div>}
          {last&&<button className="button button-secondary" disabled={busy} onClick={()=>void action(async()=>{const restored=await undoPassageReview(last);setLast(null);setAttempt(crypto.randomUUID());setRevision(restored.revision);})}>Undo review</button>}
          <div className="row between">
            <ExploreLink href={`/insights/${pair.verseB.replace(':', '/')}`}>Explore {pair.verseB} in context</ExploreLink>
            <button className="button button-primary" disabled={busy} onClick={()=>{if(!saving.current)onNext();}}>{index===pairs.length-1?'Finish practice':'Next comparison'}</button>
          </div>
        </article>
      )}
    </section>
  );
}
