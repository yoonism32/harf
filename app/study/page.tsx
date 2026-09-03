'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Link from 'next/link';
import { FlashCard } from '@/components/study/FlashCard';
import { SessionComplete } from '@/components/study/SessionComplete';
import { reviewWord, RESPONSE_TO_GRADE, buildSessionQueue, type ResponseKey } from '@/lib/srs';
import { getAllWordProgress, addStudySession } from '@/lib/storage';
import { calculateCoverage, type WordWithWeight } from '@/lib/coverage';
import { fetchAyah } from '@/lib/quran-api';
import wordsData from '@/data/words.json';
import type { WBWMorphologyData } from '@/types/wbw';

interface WordEntry {
  id: string;
  root: string;
  arabic: string;
  transliteration: string;
  meanings: string[];
  derivatives: Array<{ form: string; meaning: string }>;
  example_verse: string;
  coverage_weight: number;
}

const words = wordsData as WordEntry[];
const wordsMap = Object.fromEntries(words.map(w => [w.id, w]));
const wordsForCoverage: WordWithWeight[] = words.map(w => ({
  id: w.id,
  coverage_weight: w.coverage_weight,
}));

// Loaded lazily on first session start — keeps wbw-morphology.json (~928KB) out of the initial bundle
let wbwMorphologyData: WBWMorphologyData | null = null;
async function loadMorphology(): Promise<WBWMorphologyData> {
  if (wbwMorphologyData) return wbwMorphologyData;
  const mod = await import('@/data/wbw-morphology.json');
  wbwMorphologyData = mod.default as WBWMorphologyData;
  return wbwMorphologyData;
}

const MAX_NEW_PER_SESSION = 10;

/** Return matched word indices + their WBW English glosses for a given verse. */
function getRootMatchData(wordId: string, verseRef: string, data: WBWMorphologyData): {
  indices: number[];
  glosses: Record<number, string>;
} {
  const morphEntry = data[wordId];
  const indices: number[] = [];
  const glosses: Record<number, string> = {};

  // rootFamilyWords has both key and english gloss
  for (const w of morphEntry?.rootFamilyWords ?? []) {
    if (w.key.startsWith(verseRef + ':')) {
      const idx = parseInt(w.key.split(':')[2] ?? '0', 10);
      if (idx > 0) {
        indices.push(idx);
        if (w.english) glosses[idx] = w.english;
      }
    }
  }

  // rootFamily may contain keys not in rootFamilyWords (no english available)
  if (indices.length === 0) {
    for (const k of morphEntry?.rootFamily ?? []) {
      if (k.startsWith(verseRef + ':')) {
        const idx = parseInt(k.split(':')[2] ?? '0', 10);
        if (idx > 0) indices.push(idx);
      }
    }
  }

  return { indices, glosses };
}

/** Pre-compute one random word key + exact root match indices + match glosses per queue slot */
function pickWordKeysAndData(q: string[], data: WBWMorphologyData): {
  keys: (string | undefined)[];
  matchIndices: (number[] | undefined)[];
  matchGlosses: (Record<number, string> | undefined)[];
} {
  const keys: (string | undefined)[] = [];
  const matchIndices: (number[] | undefined)[] = [];
  const matchGlosses: (Record<number, string> | undefined)[] = [];
  for (const wordId of q) {
    const morphEntry = data[wordId];
    const words40 = morphEntry?.rootFamilyWords ?? [];
    let pickedKey: string | undefined;
    if (words40.length > 0) {
      pickedKey = words40[Math.floor(Math.random() * words40.length)]!.key;
    } else {
      // Fallback to raw rootFamily (no gloss available)
      const family = morphEntry?.rootFamily ?? [];
      pickedKey = family.length > 0 ? family[Math.floor(Math.random() * family.length)] : undefined;
    }
    keys.push(pickedKey);

    // Compute exact root positions + WBW English glosses for the chosen verse
    const verseRef = pickedKey
      ? pickedKey.split(':').slice(0, 2).join(':')
      : (wordsMap[wordId]?.example_verse ?? '');
    if (verseRef) {
      const { indices, glosses: mg } = getRootMatchData(wordId, verseRef, data);
      matchIndices.push(indices.length > 0 ? indices : undefined);
      matchGlosses.push(Object.keys(mg).length > 0 ? mg : undefined);
    } else {
      matchIndices.push(undefined);
      matchGlosses.push(undefined);
    }
  }
  return { keys, matchIndices, matchGlosses };
}

export default function StudyPage() {
  // Incrementing this triggers a new session (re-runs queue-build effect)
  const [sessionId, setSessionId] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [queue, setQueue] = useState<string[]>([]);
  // One randomly-chosen word key per queue slot, fixed at session start
  const [sessionKeys, setSessionKeys] = useState<(string | undefined)[]>([]);
  const [sessionMatchIndices, setSessionMatchIndices] = useState<(number[] | undefined)[]>([]);
  const [sessionMatchGlosses, setSessionMatchGlosses] = useState<(Record<number, string> | undefined)[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [done, setDone] = useState(false);
  const [wordsReviewed, setWordsReviewed] = useState(0);
  const [coverageBefore, setCoverageBefore] = useState(0);
  const [coverageAfter, setCoverageAfter] = useState(0);
  // verse cache: verseRef → resolved data (useRef keeps identity stable without triggering re-renders)
  const verseCache = useRef(new Map<string, { arabic: string; english: string; ref: string }>()).current;
  const [verse, setVerse] = useState<{ arabic: string; english: string; ref: string } | null>(null);
  const [rank, setRank] = useState('');

  // Build queue on mount, then pre-compute keys + pre-fetch all verses in parallel
  useEffect(() => {
    let cancelled = false;
    async function buildQueue() {
      const [progress, morphology] = await Promise.all([
        Promise.resolve(getAllWordProgress()),
        loadMorphology(),
      ]);
      if (cancelled) return;

      const allIds = words.map(w => w.id);

      const today = new Date().toISOString().slice(0, 10);
      const dueIds = Object.values(progress)
        .filter(p => p.nextReview <= today)
        .map(p => p.id);

      // Reuse shared SRS queue builder (tested in lib/srs.ts) to avoid drift
      const queueFromScheduler = buildSessionQueue(allIds, dueIds, MAX_NEW_PER_SESSION);
      const newIds = allIds.filter(id => !progress[id]).slice(0, MAX_NEW_PER_SESSION);
      const finalQueue = queueFromScheduler.length > 0
        ? queueFromScheduler
        : newIds.slice(0, MAX_NEW_PER_SESSION);
      setQueue(finalQueue);

      // Pre-compute a stable random key + root match data for every word in this session
      const { keys, matchIndices, matchGlosses } = pickWordKeysAndData(finalQueue, morphology);
      setSessionKeys(keys);
      setSessionMatchIndices(matchIndices);
      setSessionMatchGlosses(matchGlosses);

      // Pre-fetch all verse refs in parallel — results warm the ayahCache in quran-api.ts
      finalQueue.forEach((wordId, i) => {
        const word = wordsMap[wordId];
        const selectedKey = keys[i];
        const verseRef = selectedKey
          ? selectedKey.split(':').slice(0, 2).join(':')
          : word?.example_verse;
        if (verseRef) fetchAyah(verseRef);  // fire-and-forget; warms shared cache
      });

      // Record coverage before session
      const coverageResult = calculateCoverage(wordsForCoverage, progress);
      setCoverageBefore(coverageResult.percentage);
      setRank(coverageResult.rank.arabic + ' ' + coverageResult.rank.transliteration);
      setLoaded(true);
    }
    buildQueue();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]); // re-runs when sessionId increments (Study More)

  // Serve verse for current card from cache (usually instant after pre-fetch)
  useEffect(() => {
    if (queue.length === 0 || currentIndex >= queue.length) return;
    const wordId = queue[currentIndex] ?? '';
    const word = wordsMap[wordId];
    if (!word?.example_verse) return;

    const selectedKey = sessionKeys[currentIndex];

    const verseRef = selectedKey
      ? selectedKey.split(':').slice(0, 2).join(':')
      : word.example_verse;

    // Check local render-state cache first (avoids even the Map lookup flicker)
    if (verseCache.has(verseRef)) {
      setVerse(verseCache.get(verseRef)!);
      return;
    }

    let cancelled = false;
    setVerse(null);

    fetchAyah(verseRef).then(data => {
      if (!cancelled && data) {
        const v = { arabic: data.arabic, english: data.english, ref: data.reference };
        verseCache.set(verseRef, v);
        setVerse(v);
      }
    });

    return () => { cancelled = true; };
  }, [queue, sessionKeys, currentIndex]);

  const handleResponse = useCallback((key: ResponseKey) => {
    if (currentIndex >= queue.length) return;
    const wordId = queue[currentIndex] ?? '';
    const grade = RESPONSE_TO_GRADE[key] ?? 0;
    reviewWord(wordId, grade);

    const nextReviewed = wordsReviewed + 1;
    setWordsReviewed(nextReviewed);

    const next = currentIndex + 1;
    if (next >= queue.length) {
      // Session complete
      const progress = getAllWordProgress();
      const result = calculateCoverage(wordsForCoverage, progress);
      setCoverageAfter(result.percentage);
      setRank(result.rank.arabic + ' — ' + result.rank.transliteration);
      addStudySession({
        date: new Date().toISOString().slice(0, 10),
        wordsReviewed: nextReviewed,
        coverageBefore,
        coverageAfter: result.percentage,
      });
      setDone(true);
    } else {
      setCurrentIndex(next);
    }
  }, [currentIndex, queue, coverageBefore, wordsReviewed]);

  const handleStudyMore = useCallback(() => {
    // Reset all session state, then increment sessionId to re-run the queue-build effect
    setDone(false);
    setCurrentIndex(0);
    setWordsReviewed(0);
    setVerse(null);
    setLoaded(false);
    setSessionId(id => id + 1);
  }, []);

  const currentWordId = queue[currentIndex] ?? '';

  // Memoised so localStorage is re-parsed only when the current word changes,
  // not on every re-render (e.g. when the verse state updates).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const progress = useMemo(
    () => currentWordId ? (getAllWordProgress()[currentWordId] ?? null) : null,
    [currentWordId],
  );

  if (!loaded) {
    return (
      <div className="flex flex-col gap-6 py-8">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1.5">
            <div className="h-5 w-32 rounded bg-surface-plus animate-pulse" />
            <div className="h-4 w-16 rounded bg-surface-plus animate-pulse" />
          </div>
          <div className="flex-1 mx-6 h-1.5 bg-surface-plus rounded-full" />
        </div>
        <div className="card min-h-64 w-full max-w-2xl mx-auto animate-pulse bg-surface-plus" />
      </div>
    );
  }

  if (queue.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 py-24 text-center">
        <div className="font-amiri text-4xl text-gold" dir="rtl">
          ما شاء الله
        </div>
        <div className="text-harf-text text-xl font-medium">No words due for review today!</div>
        <div className="text-muted">Come back tomorrow or add more words to your queue.</div>
        <Link href="/words" className="px-6 py-3 bg-gold text-bg rounded-xl font-semibold hover:bg-gold-muted transition-colors">
          Browse Words
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <SessionComplete
        wordsReviewed={wordsReviewed}
        coverageBefore={coverageBefore}
        coverageAfter={coverageAfter}
        rankLabel={rank}
        onStudyMore={handleStudyMore}
      />
    );
  }

  const currentWord = wordsMap[currentWordId];
  if (!currentWord) return null;

  return (
    <div className="flex flex-col gap-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <h1 className="text-2xl font-semibold text-harf-text">Study Session</h1>
          <div className="text-muted text-sm">
            {currentIndex + 1} / {queue.length}
          </div>
        </div>
        {/* Progress bar */}
        <div
          className="flex-1 mx-6 h-1.5 bg-surface-plus rounded-full overflow-hidden"
          role="progressbar"
          aria-valuenow={currentIndex}
          aria-valuemin={0}
          aria-valuemax={queue.length}
          aria-label="Study session progress"
        >
          <div
            className="h-full bg-gold rounded-full transition-all duration-300"
            style={{ width: `${((currentIndex) / queue.length) * 100}%` }}
          />
        </div>
      </div>

      <FlashCard
        word={currentWord}
        progress={progress}
        onResponse={handleResponse}
        verse={verse ?? undefined}
        verseMatchIndices={sessionMatchIndices[currentIndex]}
        verseMatchGlosses={sessionMatchGlosses[currentIndex]}
      />
    </div>
  );
}
