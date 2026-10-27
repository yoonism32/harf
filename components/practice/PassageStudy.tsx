'use client';

import Link from 'next/link';
import {z} from 'zod';
import {tokenSchema} from '@/lib/content/schema';
import {useVisitState} from '@/lib/data/use-visit-state';
import {useCallback, useEffect, useRef, useState} from 'react';
import {getAyah} from '@/lib/content/client';
import type {Token, TranslationTarget} from '@/lib/content/schema';
import {useHarfStore} from '@/lib/data/store';
import {stopAudio, verseAudioUrl} from '@/lib/audio';
import {ResourceMessage, useResource} from '@/components/learning/useResource';
import {AudioControl} from '@/components/reader/AudioControl';
import {WordAnalysis} from '@/components/reader/WordAnalysis';
import {WordStudyAction} from '@/components/reader/WordStudyAction';
import {StructuredTranslation} from '@/components/reader/StructuredTranslation';
import {ReferencePreview} from '@/components/reader/ReferencePreview';
import surahs from '@/data/quran-surah-meta.json';

function StudyAyah({reference}: {reference: string}) {
 const load = useCallback(() => getAyah(reference), [reference]);
 const resource = useResource(load);
 const store = useHarfStore();
 const [hint, setHint, hintReady] = useVisitState(`understand:${reference}:hint`, false, z.boolean());
 const [revealed, setRevealed, revealReady] = useVisitState(`understand:${reference}:revealed`, false, z.boolean());
 const [selected, setSelected, wordReady] = useVisitState<Token | null>(`understand:${reference}:word`, null, tokenSchema.nullable());
 const [feedback, setFeedback, feedbackReady] = useVisitState(`understand:${reference}:feedback`, '', z.string().max(100));
 const [preview, setPreview] = useState<TranslationTarget[]>([]);
 const heading = useRef<HTMLHeadingElement>(null);
 const [surah, ayah] = reference.split(':') as [string, string];
 useEffect(() => () => stopAudio(), []);
 useEffect(() => {heading.current?.focus();}, [hintReady, revealReady, wordReady, feedbackReady]);

 function retry() {
  stopAudio(); setHint(false); setRevealed(false); setSelected(null); setPreview([]);
  heading.current?.focus();
 }

 if (!hintReady || !revealReady || !wordReady || !feedbackReady) return <p role="status">Restoring practice…</p>;
 return <section className="sheet stack" aria-label="Passage exercise">
  <h2 ref={heading} tabIndex={-1}>Listen and understand · {reference}</h2>
  <p>Listen, then try to explain the meaning to yourself before revealing it.</p>
  {!resource.data ? <ResourceMessage {...resource}/> : <>
   <AudioControl url={verseAudioUrl(surah, ayah, store.settings.reciter)} label="Listen to passage"/>
   <p className="muted">If audio is unavailable, use the Arabic hint and try from the text.</p>
   {!revealed && <div className="actions">
    <button className="button button-secondary" onClick={() => setHint(true)} disabled={hint}>Show Arabic hint</button>
    <button className="button button-primary" onClick={() => setRevealed(true)}>Reveal meaning</button>
   </div>}
   {(hint || revealed) && <p className="quran-text" lang="ar" dir="rtl">
    {resource.data.tokens.map(token => revealed && token.kind === 'word' ?
     <button key={token.key} className="token-button" aria-pressed={selected?.key === token.key} aria-label={`${token.arabic}, ${token.gloss}`} onClick={() => setSelected(token)}>{token.arabic}</button> :
     <span key={token.key}>{token.arabic} </span>)}
   </p>}
   {revealed && <>
    <StructuredTranslation paragraphs={resource.data.paragraphs} text={resource.data.translation} onReference={target => setPreview(h => [...h, target])}/>
    <p className="muted">Compare your understanding with the translation. Tap a word to explore it.</p>
    {selected && <aside className="sheet stack" aria-label="Study word">
     <h3><span lang="ar" dir="rtl">{selected.arabic}</span> · {selected.gloss || 'No word gloss available'}</h3>
     <WordStudyAction key={`study:${selected.key}`} token={selected}/>
     <WordAnalysis key={selected.key} wordKey={selected.key}/>
    </aside>}
    <div className="actions" role="group" aria-label="Your understanding">
     {['Understood', 'Partly understood', 'Need another look'].map(label => <button key={label} className="button button-secondary" aria-pressed={feedback === label} onClick={() => setFeedback(label)}>{label}</button>)}
    </div>
    <button className="button button-primary" onClick={retry}>Hide text and listen again</button>
   </>}
   {feedback && <p role="status">Your assessment: {feedback}. Kept in this browser tab; your review schedule is unchanged.</p>}
  </>}
  <ReferencePreview history={preview} onNavigate={target => setPreview(h => [...h, target])} onBack={() => setPreview(h => h.slice(0, -1))} onClose={() => setPreview([])}/>
 </section>;
}

export function PassageStudy({reference, returnHref}: {reference: string; returnHref: string}) {
 const [surah, start] = reference.split(':').map(Number) as [number, number];
 const last = Math.min(surahs[surah - 1]!.verses, start + 9);
 const [current, setCurrent, currentReady] = useVisitState(`passage:${reference}:current`, start, z.number().int().min(start).max(last));
 const [end, setEnd, endReady] = useVisitState(`passage:${reference}:end`, start, z.number().int().min(start).max(last));
 if (!currentReady || !endReady) return <p role="status">Restoring passage…</p>;
 return <div className="stack">
  <header className="page-header">
   <Link href={returnHref}>Return to reading</Link>
   <h1>Study this passage</h1>
   <p>{surahs[surah - 1]!.name} · Listen, recall, compare, revisit.</p>
  </header>
  <label className="field">Last ayah in this practice<select value={end} onChange={event => {stopAudio(); setEnd(Number(event.target.value)); setCurrent(start);}}>
   {Array.from({length: last - start + 1}, (_, index) => start + index).map(n => <option key={n} value={n}>{surah}:{n}</option>)}
  </select></label>
  <p className="muted">Practise one ayah at a time, up to ten. Your place and assessments stay in this browser tab; vocabulary choices and bookmarks are saved as usual.</p>
  <StudyAyah key={`${surah}:${current}:${end}`} reference={`${surah}:${current}`}/>
  <nav className="row between" aria-label="Practice ayahs">
   <button className="button button-secondary" disabled={current === start} onClick={() => setCurrent(n => n - 1)}>Previous practice ayah</button>
   <span>{current - start + 1} of {end - start + 1}</span>
   <button className="button button-secondary" disabled={current === end} onClick={() => setCurrent(n => n + 1)}>Next practice ayah</button>
  </nav>
 </div>;
}
