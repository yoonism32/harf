'use client';

// A4: Morphology Quiz
// Show an Arabic word → 4 choices → identify the correct root (mode A) or meaning (mode B).
// Word pool: words the user has seen in study (mastery > 0) + randomly sampled unknowns.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { getAllWordProgress } from '@/lib/storage';
import wordsRaw from '@/data/words.json';

interface Word {
  id:              string;
  arabic:          string;
  root:            string;
  meanings:        string[];
  transliteration: string;
}

const allWords = wordsRaw as Word[];

type QuizMode    = 'root' | 'meaning';
type QuizResult  = 'correct' | 'wrong' | null;

interface Question {
  word:     Word;
  correct:  string;   // the right answer text
  choices:  string[]; // 4 shuffled choices
  mode:     QuizMode;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

function pickRandom<T>(arr: T[], n: number): T[] {
  return shuffle(arr).slice(0, n);
}

function buildQuestion(word: Word, pool: Word[], mode: QuizMode): Question {
  const correct   = mode === 'root' ? word.root : word.meanings[0] ?? '';
  const distractors = pool
    .filter(w => w.id !== word.id)
    .map(w => mode === 'root' ? w.root : w.meanings[0] ?? '')
    .filter(v => v && v !== correct);

  const choices = shuffle([correct, ...pickRandom(distractors, 3)]);
  return { word, correct, choices, mode };
}

function buildWordPool(): Word[] {
  const progress  = getAllWordProgress();
  const studiedIds = new Set(Object.keys(progress));

  // Studied words first, then fill with random unknowns up to ~60 total
  const studied  = allWords.filter(w => studiedIds.has(w.id));
  const unseen   = shuffle(allWords.filter(w => !studiedIds.has(w.id))).slice(0, 40);
  return shuffle([...studied, ...unseen]).slice(0, 60);
}

// ── Scoring ───────────────────────────────────────────────────────────────────

interface SessionStats {
  total:   number;
  correct: number;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function MorphologyQuiz() {
  const [mode,      setMode]      = useState<QuizMode>('root');
  const [pool,      setPool]      = useState<Word[]>([]);
  const [question,  setQuestion]  = useState<Question | null>(null);
  const [selected,  setSelected]  = useState<string | null>(null);
  const [result,    setResult]    = useState<QuizResult>(null);
  const [stats,     setStats]     = useState<SessionStats>({ total: 0, correct: 0 });
  const [streak,    setStreak]    = useState(0);

  const initPool = useCallback(() => {
    const p = buildWordPool();
    setPool(p);
    return p;
  }, []);

  const nextQuestion = useCallback((currentPool: Word[], currentMode: QuizMode) => {
    const p = currentPool.length > 0 ? currentPool : buildWordPool();
    if (p.length === 0) return;
    const word = pickRandom(p, 1)[0]!;
    setQuestion(buildQuestion(word, allWords, currentMode));
    setSelected(null);
    setResult(null);
  }, []);

  useEffect(() => {
    const p = initPool();
    nextQuestion(p, mode);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleModeChange = (m: QuizMode) => {
    setMode(m);
    nextQuestion(pool, m);
    setStats({ total: 0, correct: 0 });
    setStreak(0);
  };

  const handleAnswer = (choice: string) => {
    if (result) return;    // already answered
    setSelected(choice);
    const isCorrect = choice === question?.correct;
    setResult(isCorrect ? 'correct' : 'wrong');
    setStats(s => ({ total: s.total + 1, correct: s.correct + (isCorrect ? 1 : 0) }));
    setStreak(s => isCorrect ? s + 1 : 0);
  };

  const handleNext = () => {
    nextQuestion(pool, mode);
  };

  const accuracy = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : null;

  return (
    <div className="w-full max-w-xl mx-auto px-4 py-8 animate-fade-in">
      {/* Title */}
      <div className="text-center mb-8">
        <h1 className="text-4xl text-gold mb-2" style={{ fontFamily: 'Amiri, serif' }}>
          تصريف · Quiz
        </h1>
        <p className="text-muted text-sm">Identify the root or meaning of each word</p>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-2 p-1 bg-surface-plus rounded-xl mb-6 w-fit mx-auto">
        {(['root', 'meaning'] as QuizMode[]).map(m => (
          <button
            key={m}
            onClick={() => handleModeChange(m)}
            className={`px-5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              mode === m
                ? 'bg-gold text-bg'
                : 'text-muted hover:text-harf-text'
            }`}
          >
            {m === 'root' ? 'Root' : 'Meaning'}
          </button>
        ))}
      </div>

      {/* Stats bar */}
      {stats.total > 0 && (
        <div className="flex items-center justify-center gap-5 mb-6 text-sm animate-fade-in">
          <span className="text-muted">
            <span className="text-harf-text font-semibold tabular-nums">{stats.correct}</span>
            /{stats.total} correct
          </span>
          {accuracy !== null && (
            <span className="text-muted">
              <span className="text-gold font-semibold">{accuracy}%</span> accuracy
            </span>
          )}
          {streak >= 3 && (
            <span className="text-gold font-semibold">
              🔥 {streak} streak
            </span>
          )}
        </div>
      )}

      {question && (
        <div className="card p-6 flex flex-col items-center gap-5">
          {/* The word */}
          <div className="w-full flex flex-col items-center gap-2 bg-surface rounded-2xl py-7 px-6">
            <span
              lang="ar"
              dir="rtl"
              className="text-harf-text text-center"
              style={{ fontFamily: 'Amiri Quran, Amiri, serif', fontSize: '3rem', lineHeight: '2.2' }}
            >
              {question.word.arabic}
            </span>
            <span className="text-muted text-xs font-mono tracking-widest">
              {question.word.transliteration}
            </span>
          </div>

          {/* Prompt */}
          <p className="text-muted text-sm text-center">
            {mode === 'root'
              ? 'What is the triliteral root of this word?'
              : 'Which meaning matches this word?'
            }
          </p>

          {/* Choices grid */}
          <div className="grid grid-cols-2 gap-3 w-full">
            {question.choices.map(choice => {
              const isSelected = selected === choice;
              const isCorrect  = choice === question.correct;
              let cls = 'border-border text-muted hover:border-gold/50 hover:text-harf-text';
              if (result && isCorrect)  cls = 'border-green/60 bg-green/5 text-green';
              else if (result && isSelected && !isCorrect)
                                         cls = 'border-red-500/60 bg-red-500/5 text-red-400';
              return (
                <button
                  key={choice}
                  onClick={() => handleAnswer(choice)}
                  disabled={!!result}
                  className={`
                    px-4 py-4 rounded-xl border text-base font-medium text-center
                    transition-all duration-150
                    disabled:cursor-not-allowed
                    ${cls}
                  `}
                  dir={mode === 'root' ? 'rtl' : 'ltr'}
                  lang={mode === 'root' ? 'ar' : undefined}
                  style={mode === 'root' ? { fontFamily: 'Amiri, serif', fontSize: '1.15rem', letterSpacing: '0.1em' } : undefined}
                >
                  {choice}
                </button>
              );
            })}
          </div>

          {/* Feedback + next */}
          {result && (
            <div className="flex flex-col items-center gap-3 w-full animate-fade-in">
              <div className={`w-full text-sm font-semibold px-4 py-2.5 rounded-xl text-center ${
                result === 'correct'
                  ? 'bg-green/10 text-green border border-green/30'
                  : 'bg-red-500/10 text-red-400 border border-red-500/30'
              }`}>
                {result === 'correct'
                  ? '✓ Correct!'
                  : `✗ The answer was: ${question.correct}`
                }
              </div>

              <Link
                href={`/word/${question.word.id}`}
                className="text-xs text-muted hover:text-gold transition-colors"
              >
                View full entry for{' '}
                <span lang="ar" style={{ fontFamily: 'Amiri, serif' }}>{question.word.arabic}</span> ↗
              </Link>

              <button
                onClick={handleNext}
                className="w-full px-6 py-3 bg-gold text-bg rounded-xl text-sm font-semibold
                  hover:bg-gold/90 transition-colors"
              >
                Next word →
              </button>
            </div>
          )}
        </div>
      )}

      <p className="text-center text-muted/50 text-xs mt-6">
        Pool: words you&rsquo;ve studied + random samples from the 300-root library.
      </p>
    </div>
  );
}
