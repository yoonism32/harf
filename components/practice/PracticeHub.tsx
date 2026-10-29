'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {z} from 'zod';
import {useVisitState} from '@/lib/data/use-visit-state';
import {safeReturn} from '@/lib/navigation/return';
import Link from 'next/link';
import {ExploreLink} from '@/components/shell/QuickReturn';
import { useRouter, useSearchParams } from 'next/navigation';
import {EndPracticeLink} from './EndPracticeLink';
import { ListeningRecall } from './ListeningRecall';
import { ResourceMessage, useResource } from '@/components/learning/useResource';
import { ArabicText, Button, StatusMessage } from '@/components/ui';
import { getAyah, getCatalog, getEntry } from '@/lib/content/client';
import type {Ayah} from '@/lib/content/schema';
import { useHarfStore } from '@/lib/data/store';
import {
  buildWordQuestion,
  type PracticeMode,
  type WordQuestion,
} from '@/lib/practice/questions';
import {
  practiceAnswerHref,
  practiceNextRoundHref,
  practiceStartHref,
} from '@/lib/navigation/practice';
import {
  buildFocusedPracticePool,
  focusedPracticeReason,
  type FocusedPracticePool,
} from '@/lib/practice/pools';
import {buildStudyThreads, passageRefs, studyThreadKey, type StudyThread} from '@/lib/learning/study-thread';
import styles from './Practice.module.css';

const modes: Array<{ id: PracticeMode; title: string; description: string }> = [
  { id: 'listening', title: 'Listening', description: 'Hear an ayah and recall its exact surah and ayah number.' },
  { id: 'meaning', title: 'Word meaning', description: 'Match a Quranic word to its recorded word-level meaning.' },
  { id: 'root', title: 'Root family', description: 'Recognize the recorded Arabic root without treating related words as synonyms.' },
];

function validMode(value: string | null): value is PracticeMode {
  return value === 'listening' || value === 'meaning' || value === 'root';
}

function numberParam(value: string | null, maximum: number) {
  if (!value || !/^\d{1,10}$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 && parsed <= maximum ? parsed : null;
}

function StartPractice({initialMode,resumeHref,focus,prepared,returnTo}:{
  initialMode:PracticeMode;
  resumeHref:string|null;
  focus?:string|null;
  prepared?:boolean;
  returnTo?:string|null;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<PracticeMode>(initialMode);
  function start() {
    const values = new Uint32Array(1);
    crypto.getRandomValues(values);
    router.push(practiceStartHref({mode, seed: values[0]!, focus, prepared, returnTo}));
  }
  return <div className={styles.shell}>
    <header className="page-header">
      <p className="eyebrow">Practice without changing your review schedule</p>
      <h1>Practice</h1>
      <p>Train recognition in short, pressure-free rounds. Your answers here never move a spaced-repetition card.</p>
    </header>
    <section className="sheet stack">
      {resumeHref&&<Link className="button button-primary" href={resumeHref}>Resume previous practice</Link>}
      <fieldset>
        <legend>Choose an activity</legend>
        <div className={styles.modeGrid}>
          {modes.map((item) => <label className={styles.modeChoice} key={item.id}>
            <input type="radio" name="practice-mode" value={item.id} checked={mode === item.id} onChange={() => setMode(item.id)} />
            <strong>{item.title}</strong>
            <small>{item.description}</small>
          </label>)}
        </div>
      </fieldset>
      <Button onClick={start}>Start {modes.find((item) => item.id === mode)!.title.toLowerCase()}</Button>
    </section>
  </div>;
}

function RoundFrame({ mode, round, reason, returnTo, children }: {
  mode: PracticeMode;
  round: number;
  reason?: string | null;
  returnTo?: string | null;
  children: React.ReactNode;
}) {
  const title = modes.find((item) => item.id === mode)!.title;
  return <div className={`${styles.shell} stack`}>
    <header className={styles.roundHeader}>
      <div className={styles.roundHeading}>
        <p className="eyebrow">{reason ? `Focused practice · ${title}` : title}</p>
        <h1>Round {round + 1}</h1>
        {reason && <p className={styles.reason}>{reason}</p>}
      </div>
      <EndPracticeLink returnTo={returnTo}/>
    </header>
    {children}
  </div>;
}

function ChoiceButtons({ choices, correct, selected, label, onSelect, root = false }: {
  choices: string[];
  correct: string;
  selected: string | null;
  label: string;
  onSelect: (choice: string) => void;
  root?: boolean;
}) {
  return <fieldset>
    <legend className="sr-only">{label}</legend>
    <div className={styles.choices}>
      {choices.map((choice) => {
        const correctChoice = selected !== null && choice === correct;
        const wrongChoice = selected === choice && choice !== correct;
        return <button
          className={`${styles.choice} ${correctChoice ? styles.choiceCorrect : ''} ${wrongChoice ? styles.choiceWrong : ''}`}
          disabled={selected !== null}
          dir={root ? 'rtl' : undefined}
          lang={root ? 'ar' : undefined}
          key={choice}
          onClick={() => onSelect(choice)}
          type="button"
        >{choice}{correctChoice ? ' — Correct' : wrongChoice ? ' — Your answer' : ''}</button>;
      })}
    </div>
  </fieldset>;
}

function FocusedComplete({thread, pool, reason, returnTo, restartHref}:{
  thread: StudyThread;
  pool: FocusedPracticePool;
  reason: string;
  returnTo?: string | null;
  restartHref: string;
}) {
  const target = safeReturn(returnTo);
  return <div className={`${styles.shell} stack`}>
    <header className={styles.roundHeader}>
      <div className={styles.roundHeading}>
        <p className="eyebrow">Focused practice</p>
        <h1>Focused set complete</h1>
        <p className={styles.reason}>{reason}</p>
      </div>
    </header>
    <section className="sheet stack">
      <p>You reached the end of the {pool.entryIds.length} course {pool.entryIds.length === 1 ? 'word' : 'words'} selected from this saved {thread.kind}.</p>
      <p className="muted">Practice answers do not change your review schedule.</p>
      <div className="row">
        {target
          ? <Link className="button button-primary" href={target}>Return to saved study</Link>
          : <Link className="button button-primary" href="/practice">Choose another activity</Link>}
        <Link className="button button-secondary" href={restartHref}>Practise this set again</Link>
      </div>
    </section>
  </div>;
}

function WordRound({ question, mode, seed, round, answer, focus, prepared, reason, returnTo, targetCount }: {
  question: WordQuestion;
  mode: 'meaning' | 'root';
  seed: number;
  round: number;
  answer: string | null;
  focus?: string | null;
  prepared?: boolean;
  reason?: string | null;
  returnTo?: string | null;
  targetCount?: number;
}) {
  const router = useRouter();
  const load = useCallback(() => getEntry(question.entry.id), [question.entry.id]);
  const context = useResource(load);
  const selected = question.choices.includes(answer ?? '') ? answer : null;
  const correct = selected === question.correct;
  const finishedSet = targetCount !== undefined && round + 1 >= targetCount;
  return <RoundFrame mode={mode} round={round} reason={reason} returnTo={returnTo}>
    <section className="sheet stack">
      <div className={styles.prompt}>
        <p>{mode === 'meaning' ? 'Which word-level meaning is recorded for this word?' : 'Which root is recorded for this word?'}</p>
        <ArabicText className={`study-word ${styles.promptArabic}`}>{question.entry.arabic}</ArabicText>
        <p className="muted">{question.entry.transliteration}</p>
      </div>
      <ChoiceButtons
        choices={question.choices}
        correct={question.correct}
        selected={selected}
        label={mode === 'meaning' ? 'Choose a meaning' : 'Choose a root'}
        onSelect={(choice) => router.replace(practiceAnswerHref({mode, seed, round, answer: choice, focus, prepared, returnTo}), { scroll: false })}
        root={mode === 'root'}
      />
      {selected && <div className={`${styles.result} stack`} aria-live="polite">
        <StatusMessage error={!correct}>{correct ? 'Correct.' : mode === 'root' ? <>The recorded root is <ArabicText>{question.correct}</ArabicText>.</> : `The recorded meaning is ${question.correct}.`}</StatusMessage>
        {context.error && <ResourceMessage error={context.error} retry={context.retry} />}
        {!context.data && !context.error && <p role="status">Loading context…</p>}
        {context.data && <>
          <p>{mode === 'root' ? 'A shared root can connect words without making their meanings identical.' : `This gloss describes the word at ${context.data.examples[0]!.ref}.`}</p>
          <ExploreLink href={`/learn/${question.entry.id}`}>Explore the entry and its ayah examples</ExploreLink>
        </>}
        <Link className="button button-primary" href={practiceNextRoundHref({mode, seed, round, focus, prepared, returnTo})}>
          {finishedSet ? 'Finish focused practice' : 'Next round'}
        </Link>
      </div>}
    </section>
  </RoundFrame>;
}

export function PracticeHub() {
  const params = useSearchParams();
  const store=useHarfStore();
  const catalog = useResource(getCatalog);
  const mode = params.get('mode');
  const seed = numberParam(params.get('seed'), 0xffffffff);
  const round = numberParam(params.get('round'), 9999);
  const answer = params.get('answer');
  const focus = params.get('focus');
  const prepared = params.get('prepared') === '1';
  const returnTo = safeReturn(params.get('returnTo'));
  const active = validMode(mode) && seed !== null && round !== null;
  const [resume,setResume,resumeReady]=useVisitState('practice:last','',z.string().max(6000));
  const query=params.toString();
  useEffect(()=>{if(active&&resumeReady&&resume!==`/practice?${query}`)setResume(`/practice?${query}`);},[active,query,resumeReady]);

  const threads = useMemo(() => buildStudyThreads(store), [store]);
  const focusThread = useMemo(
    () => focus ? threads.find(thread => studyThreadKey(thread) === focus) : undefined,
    [focus, threads],
  );
  const loadFocus = useCallback(async (): Promise<Ayah[]> => {
    if (!focusThread?.available) return [];
    if (focusThread.kind === 'ayah') return [await getAyah(focusThread.ref)];
    if (!focusThread.range) return [];
    const refs = passageRefs(focusThread.range);
    if (!refs.length) return [];
    return Promise.all(refs.map(getAyah));
  }, [focusThread]);
  const focusResource = useResource(loadFocus);
  const pool = useMemo(
    () => focusThread && focusResource.data
      ? buildFocusedPracticePool(focusThread, focusResource.data, store, {preferQueued: prepared})
      : null,
    [focusThread, focusResource.data, prepared, store],
  );
  const reason = pool && focusThread ? focusedPracticeReason(pool, focusThread) : null;
  const focusPending = !!focus && store.status === 'loading';
  const focusLoading = !!focusThread && !focusResource.data && !focusResource.error;
  const targetCount = useMemo(() => {
    if (!pool || (mode !== 'meaning' && mode !== 'root')) return undefined;
    if (!catalog.data) return pool.entryIds.length;
    const entries = new Map(catalog.data.entries.map(entry => [entry.id, entry]));
    const count = pool.entryIds.filter(id => {
      const entry = entries.get(id);
      return mode === 'root' ? !!entry?.root?.trim() : !!entry?.gloss?.trim();
    }).length;
    return count || undefined;
  }, [catalog.data, mode, pool]);

  const question = useMemo(() => {
    if (!active || !catalog.data || mode === 'listening' || focusPending || focusLoading) return null;
    if (focusThread && targetCount !== undefined && round !== null && round >= targetCount) return null;
    try {
      return buildWordQuestion(catalog.data.entries, mode, seed, round, pool?.entryIds);
    } catch (cause) {
      return cause instanceof Error ? cause : new Error('Practice could not start.');
    }
  }, [active, catalog.data, mode, round, seed, focusPending, focusLoading, focusThread, targetCount, pool]);

  if (!active) return <StartPractice
    initialMode={validMode(mode)?mode:'listening'}
    resumeHref={safeReturn(resume)?.startsWith('/practice?')?resume:null}
    focus={focus}
    prepared={prepared}
    returnTo={returnTo}
  />;
  if (focusPending || focusLoading) return <div className={styles.shell}><p role="status">Preparing focused practice…</p></div>;
  if (!catalog.data) return <div className={styles.shell}><ResourceMessage error={catalog.error} retry={catalog.retry} /></div>;
  if (focusThread && focusResource.error) return <div className={`${styles.shell} stack`}>
    <StatusMessage error>
      <p>{focusResource.error}</p>
      <Button variant="secondary" onClick={focusResource.retry}>Try again</Button>
    </StatusMessage>
    <Link href="/practice">Practice without this saved study</Link>
  </div>;
  if (focusThread && pool && targetCount !== undefined && round >= targetCount) return <FocusedComplete
    thread={focusThread}
    pool={pool}
    reason={reason!}
    returnTo={returnTo}
    restartHref={practiceStartHref({mode, seed, focus, prepared, returnTo})}
  />;
  if (mode === 'listening') return <ListeningRecall key={seed} seed={seed} initialRound={round} reciter={store.settings.reciter} surahs={catalog.data.surahs} returnTo={returnTo}/>;
  if (question instanceof Error) return <div className={`${styles.shell} stack`}><StatusMessage error>{question.message}</StatusMessage><Link href="/practice">Choose another activity</Link></div>;
  if (!question) return null;
  return <WordRound
    question={question as WordQuestion}
    mode={mode}
    seed={seed}
    round={round}
    answer={answer}
    focus={focus}
    prepared={prepared}
    reason={reason}
    returnTo={returnTo}
    targetCount={focusThread ? targetCount : undefined}
  />;
}
