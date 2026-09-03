'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { createEmptyCard, fsrs, generatorParameters, Rating, State } from 'ts-fsrs';
import {
  getDuePairIds,
  getAllPairProgress,
  setPairProgress,
  getPairProgress,
  type MutashabihatProgress,
} from '@/lib/storage';
import { getMutashabihatGroups, type MutashabihatGroup } from '@/lib/tadabbur';
import { fetchAyah, type AyahResponse } from '@/lib/quran-api';
import surahMetaRaw from '@/data/quran-surah-meta.json';

interface SurahMeta { id: number; name: string; arabic: string; verses: number }
const SURAHS = surahMetaRaw as SurahMeta[];

const f = fsrs(generatorParameters({ enable_fuzz: false }));

function toNextReview(due: Date): string {
  const today = new Date().toISOString().slice(0, 10);
  const dueStr = due.toISOString().slice(0, 10);
  return dueStr > today ? dueStr : new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
}

function reviewGroup(id: string, rating: Rating): MutashabihatProgress {
  const existing = getPairProgress(id);
  const now = new Date();
  const card = existing
    ? {
        due: new Date(existing.nextReview),
        stability: existing.stability,
        difficulty: existing.difficulty,
        elapsed_days: 0,
        scheduled_days: Math.max(1, Math.round(existing.stability)),
        reps: existing.reps,
        lapses: existing.lapses,
        learning_steps: 0,
        state: existing.state as State,
        last_review: existing.lastReviewed ? new Date(existing.lastReviewed) : undefined,
      }
    : createEmptyCard();

  const scheduling = f.repeat(card, now);
  const { card: next } = scheduling[rating as 1 | 2 | 3 | 4];

  const prevMastery = existing?.mastery ?? 0;
  const isFirst = !existing;
  let mastery: number;
  if (next.state === State.Learning) mastery = isFirst ? 1 : Math.max(1, prevMastery);
  else if (next.state === State.Relearning) mastery = Math.max(1, prevMastery - 1);
  else if (next.state === State.Review) {
    if (next.stability < 7) mastery = 2;
    else if (next.stability < 21) mastery = 3;
    else if (next.stability < 90) mastery = 4;
    else mastery = 5;
  } else mastery = isFirst ? 1 : 0;

  const updated: MutashabihatProgress = {
    id, mastery,
    stability: next.stability,
    difficulty: next.difficulty,
    state: next.state as 0 | 1 | 2 | 3,
    lapses: next.lapses,
    reps: next.reps,
    nextReview: toNextReview(next.due),
    lastReviewed: now.toISOString(),
  };
  setPairProgress(updated);
  return updated;
}

const GRADE_BUTTONS = [
  { rating: Rating.Again, label: 'Again',  shortcut: '1', color: 'text-red-400',    bg: 'bg-red-950/60'    },
  { rating: Rating.Hard,  label: 'Hard',   shortcut: '2', color: 'text-orange-400', bg: 'bg-orange-950/60' },
  { rating: Rating.Good,  label: 'Got It', shortcut: '3', color: 'text-blue-400',   bg: 'bg-blue-950/60'   },
  { rating: Rating.Easy,  label: 'Easy',   shortcut: '4', color: 'text-gold',       bg: 'bg-yellow-950/60' },
] as const;

type Phase = 'loading' | 'front' | 'back' | 'done';

/** Strip diacritics (harakat, shadda, etc.) but keep letters for comparison */
function normalizeWord(s: string): string {
  return s
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
    .replace(/[\u0622\u0623\u0625\u0671]/g, '\u0627'); // alef variants → bare alef
}

/**
 * Verse B rendered word by word against verse A:
 * - word matches A at same position (letter-level) → gold
 * - word differs → amber
 * Falls back to a "subtle difference" notice when all words match letters
 * (meaning the difference is diacritical only).
 */
function VerseBHighlighted({
  arabicA,
  arabicB,
}: {
  arabicA: string;
  arabicB: string;
}) {
  const wordsA = arabicA.split(' ');
  const wordsB = arabicB.split(' ');
  const matches = wordsB.map((w, i) => normalizeWord(w) === normalizeWord(wordsA[i] ?? ''));
  const allSame = matches.every(Boolean);

  return (
    <>
      {allSame && (
        <p className="text-xs text-amber-400/70 italic text-right" dir="rtl">
          الفرق في الشكل — compare diacritics carefully
        </p>
      )}
      <p
        className="font-amiri text-xl leading-loose text-right"
        style={{ fontFamily: 'var(--font-amiri-quran), Amiri Quran, serif' }}
        dir="rtl"
      >
        {wordsB.map((word, i) => (
          <span key={i} className={matches[i] ? 'text-gold' : 'text-amber-300'}>
            {word}{' '}
          </span>
        ))}
      </p>
    </>
  );
}

function VerseRef({ verseKey }: { verseKey: string }) {
  const surahId = Number(verseKey.split(':')[0]);
  const meta = SURAHS.find(s => s.id === surahId);
  return (
    <span className="text-xs font-mono text-muted">
      {verseKey}{meta ? ` · ${meta.name}` : ''}
    </span>
  );
}

export default function MutashabihatPage() {
  const [totalGroups, setTotalGroups] = useState(0);
  const [queue, setQueue] = useState<string[]>([]);  // group IDs = verseA keys
  const [currentIdx, setCurrentIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>('loading');
  const [verseA, setVerseA] = useState<AyahResponse | null>(null);
  const [twinVerses, setTwinVerses] = useState<(AyahResponse | null)[]>([]);
  const [sessionId, setSessionId] = useState(0);
  const [sessionDone, setSessionDone] = useState(0);

  const groupsMapRef = useRef<Record<string, MutashabihatGroup>>({});

  // Build queue
  useEffect(() => {
    setPhase('loading');
    setCurrentIdx(0);
    setSessionDone(0);

    getMutashabihatGroups().then(groups => {
      setTotalGroups(groups.length);

      const map: Record<string, MutashabihatGroup> = {};
      for (const g of groups) map[g.id] = g;
      groupsMapRef.current = map;

      const validIds = new Set(groups.map(g => g.id));
      const allIds = groups.map(g => g.id);
      const dueIds = getDuePairIds().filter(id => validIds.has(id));
      const progress = getAllPairProgress();
      const newIds = allIds.filter(id => !progress[id]).slice(0, 10);

      // 2:1 due:new
      const q: string[] = [];
      let di = 0, ni = 0;
      while (di < dueIds.length || ni < newIds.length) {
        const d1 = dueIds[di]; if (d1 !== undefined) { q.push(d1); di++; }
        const d2 = dueIds[di]; if (d2 !== undefined) { q.push(d2); di++; }
        const n1 = newIds[ni]; if (n1 !== undefined) { q.push(n1); ni++; }
      }

      setQueue(q);
      setPhase(q.length === 0 ? 'done' : 'front');
    });
  }, [sessionId]);

  // Fetch verseA when card changes
  useEffect(() => {
    if (phase === 'loading' || phase === 'done') return;
    const groupId = queue[currentIdx];
    if (!groupId) return;
    setVerseA(null);
    setTwinVerses([]);
    fetchAyah(groupId).then(v => setVerseA(v));
  }, [currentIdx, queue, phase]);

  // Fetch all twins when flipped
  useEffect(() => {
    if (phase !== 'back') return;
    const groupId = queue[currentIdx];
    const group = groupsMapRef.current[groupId ?? ''];
    if (!group) return;

    setTwinVerses(new Array(group.twins.length).fill(null));
    group.twins.forEach((twin, i) => {
      fetchAyah(twin.verseB).then(v => {
        setTwinVerses(prev => {
          const next = [...prev];
          next[i] = v;
          return next;
        });
      });
    });
  }, [phase, currentIdx, queue]);

  // Keyboard
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if ((e.key === ' ' || e.key === 'Enter') && phase === 'front') {
        e.preventDefault();
        setPhase('back');
      }
      if (phase === 'back') {
        const btn = GRADE_BUTTONS.find(b => b.shortcut === e.key);
        if (btn) handleGrade(btn.rating);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, currentIdx, queue]);

  const handleGrade = useCallback((rating: Rating) => {
    const groupId = queue[currentIdx];
    if (!groupId) return;
    reviewGroup(groupId, rating);
    const nextIdx = currentIdx + 1;
    setSessionDone(d => d + 1);
    if (nextIdx >= queue.length) {
      setPhase('done');
    } else {
      setTwinVerses([]);
      setCurrentIdx(nextIdx);
      setPhase('front');
    }
  }, [currentIdx, queue]);

  const groupId = queue[currentIdx];
  const group = groupId ? groupsMapRef.current[groupId] : null;
  const twinCount = group?.twins.length ?? 0;

  if (phase === 'loading') {
    return (
      <div className="flex flex-col items-center gap-6 max-w-2xl mx-auto pt-12">
        <div className="card p-8 w-full animate-pulse">
          <div className="h-8 bg-surface-plus/50 rounded mb-4 w-3/4 mx-auto" />
          <div className="h-5 bg-surface-plus/30 rounded w-1/2 mx-auto" />
        </div>
      </div>
    );
  }

  if (phase === 'done') {
    return (
      <div className="flex flex-col items-center gap-6 max-w-2xl mx-auto pt-12 text-center">
        <div className="card p-8 flex flex-col items-center gap-4">
          <p className="text-2xl font-semibold text-harf-text">Session Complete</p>
          <p className="text-muted text-sm">
            {sessionDone > 0
              ? `Reviewed ${sessionDone} verse${sessionDone !== 1 ? 's' : ''}.`
              : 'No verses due — all caught up!'}
          </p>
          <div className="flex gap-3 flex-wrap justify-center">
            <button
              onClick={() => setSessionId(s => s + 1)}
              className="px-5 py-2 bg-gold/20 border border-gold/40 text-gold rounded-lg text-sm hover:bg-gold/30 transition-colors"
            >
              Study More
            </button>
            <Link
              href="/app"
              className="px-5 py-2 bg-surface border border-border rounded-lg text-sm text-muted hover:text-harf-text transition-colors"
            >
              Dashboard
            </Link>
          </div>
        </div>
        <p className="text-xs text-muted">{totalGroups} verses · score ≥ 70</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-2xl font-semibold text-harf-text">Mutashabihat Drill</h1>
          <p className="text-xs text-muted">Near-identical verses — spot the difference</p>
        </div>
        <span className="text-xs text-muted font-mono">{currentIdx + 1} / {queue.length}</span>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-surface-plus rounded-full overflow-hidden">
        <div
          className="h-full bg-gold/60 transition-all duration-300"
          style={{ width: `${queue.length ? (currentIdx / queue.length) * 100 : 0}%` }}
        />
      </div>

      {/* Card */}
      <div className="card p-6 flex flex-col gap-5">

        {/* Verse A — always shown */}
        <div className="flex flex-col gap-2">
          <p className="text-xs text-muted/60 uppercase tracking-widest">
            {phase === 'front' ? 'Study this verse' : 'Verse A'}
          </p>
          {verseA ? (
            <>
              <p
                className="font-amiri text-xl leading-loose text-harf-text text-right"
                style={{ fontFamily: 'var(--font-amiri-quran), Amiri Quran, serif' }}
                dir="rtl"
              >
                {verseA.arabic}
              </p>
              <p className="text-sm text-muted/70 leading-relaxed">{verseA.english}</p>
            </>
          ) : (
            <>
              <div className="h-12 bg-surface-plus/40 rounded animate-pulse" />
              <div className="h-4 bg-surface-plus/30 rounded animate-pulse w-3/4" />
            </>
          )}
          {group && <VerseRef verseKey={group.verseA} />}
        </div>

        {/* Flip */}
        {phase === 'front' && (
          <button
            onClick={() => setPhase('back')}
            className="self-center px-6 py-2.5 bg-surface border border-border rounded-lg text-sm text-muted hover:text-harf-text hover:border-gold/40 transition-colors"
          >
            Reveal {twinCount === 1 ? 'twin verse' : `${twinCount} similar verses`}
            <span className="ml-2 text-xs text-muted/50">[Space]</span>
          </button>
        )}

        {/* Twins — revealed on flip */}
        {phase === 'back' && group && (
          <>
            {/* Legend */}
            <div className="flex items-center gap-3 text-xs text-muted/50">
              <span><span className="text-gold">■</span> shared with A</span>
              <span><span className="text-amber-300">■</span> differs</span>
            </div>

            <div className="flex flex-col gap-4">
              {group.twins.map((twin, i) => (
                <div key={twin.verseB} className="border-t border-border/40 pt-4 flex flex-col gap-2">
                  <p className="text-xs text-muted/60 uppercase tracking-widest">
                    {twinCount === 1 ? 'Twin verse — spot the difference' : `Similar verse ${i + 1} of ${twinCount}`}
                  </p>
                  {twinVerses[i] && verseA ? (
                    <>
                      <VerseBHighlighted arabicA={verseA.arabic} arabicB={twinVerses[i]!.arabic} />
                      <p className="text-sm text-muted/70 leading-relaxed">{twinVerses[i]!.english}</p>
                    </>
                  ) : (
                    <>
                      <div className="h-12 bg-surface-plus/40 rounded animate-pulse" />
                      <div className="h-4 bg-surface-plus/30 rounded animate-pulse w-3/4" />
                    </>
                  )}
                  <VerseRef verseKey={twin.verseB} />
                </div>
              ))}
            </div>

            {/* Grade */}
            <div className="grid grid-cols-4 gap-2">
              {GRADE_BUTTONS.map(btn => (
                <button
                  key={btn.rating}
                  onClick={() => handleGrade(btn.rating)}
                  className={`${btn.bg} ${btn.color} border border-border/40 rounded-lg py-2.5 text-sm font-medium hover:opacity-80 transition-opacity flex flex-col items-center gap-0.5`}
                >
                  <span>{btn.label}</span>
                  <span className="text-xs opacity-50">[{btn.shortcut}]</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-muted/60">
        <Link href="/tadabbur" className="hover:text-gold transition-colors">← Tadabbur</Link>
        <span>{totalGroups} verses · score ≥ 70</span>
      </div>
    </div>
  );
}
