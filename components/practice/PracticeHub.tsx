'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AudioControl } from '@/components/reader/AudioControl';
import { ResourceMessage, useResource } from '@/components/learning/useResource';
import { ArabicText, Button, StatusMessage } from '@/components/ui';
import { getAyah, getCatalog, getEntry } from '@/lib/content/client';
import { stopAudio, verseAudioUrl } from '@/lib/audio';
import { useHarfStore } from '@/lib/data/store';
import {
  buildListeningQuestion,
  buildWordQuestion,
  nextRoundHref,
  type ListeningQuestion,
  type PracticeMode,
  type WordQuestion,
} from '@/lib/practice/questions';
import styles from './Practice.module.css';

const modes: Array<{ id: PracticeMode; title: string; description: string }> = [
  { id: 'listening', title: 'Listening', description: 'Hear an ayah, identify its surah, then read it in context.' },
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

function answerHref(mode: PracticeMode, seed: number, round: number, answer: string) {
  const query = new URLSearchParams({ mode, seed: String(seed), round: String(round), answer });
  return `/practice?${query.toString()}`;
}

function StartPractice({initialMode}:{initialMode:PracticeMode}) {
  const router = useRouter();
  const [mode, setMode] = useState<PracticeMode>(initialMode);
  function start() {
    const values = new Uint32Array(1);
    crypto.getRandomValues(values);
    router.push(`/practice?mode=${mode}&seed=${values[0]}&round=0`);
  }
  return <div className={styles.shell}>
    <header className="page-header">
      <p className="eyebrow">Practice without changing your review schedule</p>
      <h1>Practice</h1>
      <p>Train recognition in short, pressure-free rounds. Your answers here never move a spaced-repetition card.</p>
    </header>
    <section className="sheet stack">
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

function RoundFrame({ mode, round, children }: { mode: PracticeMode; round: number; children: React.ReactNode }) {
  const title = modes.find((item) => item.id === mode)!.title;
  return <div className={`${styles.shell} stack`}>
    <header className={styles.roundHeader}>
      <div><p className="eyebrow">{title}</p><h1>Round {round + 1}</h1></div>
      <Link href="/practice">End practice</Link>
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

function WordRound({ question, mode, seed, round, answer }: {
  question: WordQuestion;
  mode: 'meaning' | 'root';
  seed: number;
  round: number;
  answer: string | null;
}) {
  const router = useRouter();
  const load = useCallback(() => getEntry(question.entry.id), [question.entry.id]);
  const context = useResource(load);
  const selected = question.choices.includes(answer ?? '') ? answer : null;
  const correct = selected === question.correct;
  return <RoundFrame mode={mode} round={round}>
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
        onSelect={(choice) => router.replace(answerHref(mode, seed, round, choice), { scroll: false })}
        root={mode === 'root'}
      />
      {selected && <div className={`${styles.result} stack`} aria-live="polite">
        <StatusMessage error={!correct}>{correct ? 'Correct.' : mode === 'root' ? <>The recorded root is <ArabicText>{question.correct}</ArabicText>.</> : `The recorded meaning is ${question.correct}.`}</StatusMessage>
        {context.error && <ResourceMessage error={context.error} retry={context.retry} />}
        {!context.data && !context.error && <p role="status">Loading context…</p>}
        {context.data && <>
          <p>{mode === 'root' ? 'A shared root can connect words without making their meanings identical.' : `This gloss describes the word at ${context.data.examples[0]!.ref}.`}</p>
          <Link href={`/learn/${question.entry.id}`}>Explore the entry and its ayah examples</Link>
        </>}
        <Link className="button button-primary" href={nextRoundHref(mode, seed, round)}>Next round</Link>
      </div>}
    </section>
  </RoundFrame>;
}

function ListeningRound({ question, seed, round, answer,reciter }: {
  question: ListeningQuestion;
  seed: number;
  round: number;
  answer: string | null;
  reciter:string;
}) {
  const router = useRouter();
  const load = useCallback(() => getAyah(question.ref), [question.ref]);
  const ayah = useResource(load);
  useEffect(() => () => stopAudio(), [question.ref]);
  const selectedNumber = numberParam(answer, 114);
  const selected = question.choices.some((choice) => choice.number === selectedNumber) ? selectedNumber : null;
  const selectedSurah = question.choices.find((choice) => choice.number === selected);
  const selectedLabel = selectedSurah ? `${selectedSurah.number}. ${selectedSurah.englishName}` : null;
  const correct = selected === question.surah.number;
  const [surah, verse] = question.ref.split(':') as [string, string];
  return <RoundFrame mode="listening" round={round}>
    {!ayah.data ? <ResourceMessage error={ayah.error} retry={ayah.retry} /> : <section className="sheet stack">
      <div className={styles.prompt}>
        <h2>Which surah is this ayah from?</h2>
        <p className="muted">Listen as often as you need. The text appears after you answer.</p>
      </div>
      <AudioControl url={verseAudioUrl(surah, verse,reciter)} label="Play ayah" />
      <ChoiceButtons
        choices={question.choices.map((choice) => `${choice.number}. ${choice.englishName}`)}
        correct={`${question.surah.number}. ${question.surah.englishName}`}
        selected={selectedLabel}
        label="Choose a surah"
        onSelect={(choice) => router.replace(answerHref('listening', seed, round, choice.split('.')[0]!), { scroll: false })}
      />
      {selected !== null && <div className={`${styles.result} stack`} aria-live="polite">
        <StatusMessage error={!correct}>{correct ? 'Correct.' : `This is from ${question.surah.englishName}.`}</StatusMessage>
        <p><strong>{question.surah.number}. {question.surah.englishName}</strong> · Ayah {verse}</p>
        <p className={`quran-text ${styles.quran}`} dir="rtl" lang="ar">{ayah.data.tokens.map((token) => `${token.arabic} `)}</p>
        <p className="translation">{ayah.data.translation}</p>
        <div className="actions">
          <Link href={`/read/${surah}/${verse}`}>Open in Read</Link>
          <Link className="button button-primary" href={nextRoundHref('listening', seed, round)}>Next round</Link>
        </div>
      </div>}
    </section>}
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
  const active = validMode(mode) && seed !== null && round !== null;
  const question = useMemo(() => {
    if (!active || !catalog.data) return null;
    try {
      return mode === 'listening'
        ? buildListeningQuestion(catalog.data, seed, round)
        : buildWordQuestion(catalog.data.entries, mode, seed, round);
    } catch (cause) {
      return cause instanceof Error ? cause : new Error('Practice could not start.');
    }
  }, [active, catalog.data, mode, round, seed]);
  if (!active) return <StartPractice initialMode={validMode(mode)?mode:'listening'} />;
  if (!catalog.data) return <div className={styles.shell}><ResourceMessage error={catalog.error} retry={catalog.retry} /></div>;
  if (question instanceof Error) return <div className={`${styles.shell} stack`}><StatusMessage error>{question.message}</StatusMessage><Link href="/practice">Choose another activity</Link></div>;
  if (!question) return null;
  return mode === 'listening'
    ? <ListeningRound question={question as ListeningQuestion} seed={seed} round={round} answer={answer} reciter={store.settings.reciter} />
    : <WordRound question={question as WordQuestion} mode={mode} seed={seed} round={round} answer={answer} />;
}
