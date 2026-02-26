'use client';

import { useState, useEffect, useCallback } from 'react';
import { FlashCard } from '@/components/study/FlashCard';
import { SessionComplete } from '@/components/study/SessionComplete';
import { reviewWord, RESPONSE_TO_GRADE, type ResponseKey } from '@/lib/srs';
import { getAllWordProgress, getDueWordIds } from '@/lib/storage';
import { calculateCoverage, type WordWithWeight } from '@/lib/coverage';
import { fetchAyah } from '@/lib/quran-api';
import wordsData from '@/data/words.json';
import wbwMorphologyData from '@/data/wbw-morphology.json';

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

const MAX_NEW_PER_SESSION = 10;

/** Pre-compute one random word key + its WBW gloss per queue slot */
function pickWordKeysAndGlosses(q: string[]): {
  keys: (string | undefined)[];
  glosses: (string | undefined)[];
} {
  const keys: (string | undefined)[] = [];
  const glosses: (string | undefined)[] = [];
  for (const wordId of q) {
    const morphEntry = (wbwMorphologyData as Record<string, {
      rootFamilyWords?: Array<{ key: string; uthmani: string; english: string }>;
      rootFamily: string[];
    }>)[wordId];
    const words40 = morphEntry?.rootFamilyWords ?? [];
    if (words40.length > 0) {
      const picked = words40[Math.floor(Math.random() * words40.length)]!;
      keys.push(picked.key);
      glosses.push(picked.english || undefined);
    } else {
      // Fallback to raw rootFamily (no gloss available)
      const family = morphEntry?.rootFamily ?? [];
      keys.push(family.length > 0 ? family[Math.floor(Math.random() * family.length)] : undefined);
      glosses.push(undefined);
    }
  }
  return { keys, glosses };
}

export default function StudyPage() {
  const [queue, setQueue] = useState<string[]>([]);
  // One randomly-chosen word key per queue slot, fixed at session start
  const [sessionKeys, setSessionKeys] = useState<(string | undefined)[]>([]);
  const [sessionGlosses, setSessionGlosses] = useState<(string | undefined)[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [done, setDone] = useState(false);
  const [wordsReviewed, setWordsReviewed] = useState(0);
  const [coverageBefore, setCoverageBefore] = useState(0);
  const [coverageAfter, setCoverageAfter] = useState(0);
  // verse cache: verseRef → resolved data
  const verseCache = useState<Map<string, { arabic: string; english: string; ref: string }>>(
    () => new Map()
  )[0];
  const [verse, setVerse] = useState<{ arabic: string; english: string; ref: string } | null>(null);
  const [currentWordKey, setCurrentWordKey] = useState<string | undefined>(undefined);
  const [currentWordGloss, setCurrentWordGloss] = useState<string | undefined>(undefined);
  const [loadingVerse, setLoadingVerse] = useState(false);
  const [rank, setRank] = useState('');

  // Build queue on mount, then pre-compute keys + pre-fetch all verses in parallel
  useEffect(() => {
    const progress = getAllWordProgress();
    const allIds = words.map(w => w.id);

    // Due reviews
    const today = new Date().toISOString().slice(0, 10);
    const dueIds = Object.values(progress)
      .filter(p => p.nextReview <= today)
      .map(p => p.id);

    // New words not yet started
    const newIds = allIds
      .filter(id => !progress[id])
      .slice(0, MAX_NEW_PER_SESSION);

    // Interleave: 2 due, 1 new
    const q: string[] = [];
    let di = 0, ni = 0;
    while (di < dueIds.length || ni < newIds.length) {
      const d1 = dueIds[di]; if (d1 !== undefined) { q.push(d1); di++; }
      const d2 = dueIds[di]; if (d2 !== undefined) { q.push(d2); di++; }
      const n1 = newIds[ni]; if (n1 !== undefined) { q.push(n1); ni++; }
    }

    const finalQueue = q.length > 0 ? q : newIds.slice(0, MAX_NEW_PER_SESSION);
    setQueue(finalQueue);

    // Pre-compute a stable random key + gloss for every word in this session
    const { keys, glosses } = pickWordKeysAndGlosses(finalQueue);
    setSessionKeys(keys);
    setSessionGlosses(glosses);

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
  }, []);

  // Serve verse for current card from cache (usually instant after pre-fetch)
  useEffect(() => {
    if (queue.length === 0 || currentIndex >= queue.length) return;
    const wordId = queue[currentIndex] ?? '';
    const word = wordsMap[wordId];
    if (!word?.example_verse) return;

    const selectedKey = sessionKeys[currentIndex];
    setCurrentWordKey(selectedKey);
    setCurrentWordGloss(sessionGlosses[currentIndex]);

    const verseRef = selectedKey
      ? selectedKey.split(':').slice(0, 2).join(':')
      : word.example_verse;

    // Check local render-state cache first (avoids even the Map lookup flicker)
    if (verseCache.has(verseRef)) {
      setVerse(verseCache.get(verseRef)!);
      setLoadingVerse(false);
      return;
    }

    let cancelled = false;
    setVerse(null);
    setLoadingVerse(true);

    fetchAyah(verseRef).then(data => {
      if (!cancelled) {
        if (data) {
          const v = { arabic: data.arabic, english: data.english, ref: data.reference };
          verseCache.set(verseRef, v);
          setVerse(v);
        }
        setLoadingVerse(false);
      }
    });

    return () => { cancelled = true; };
  }, [queue, sessionKeys, sessionGlosses, currentIndex]);

  const handleResponse = useCallback((key: ResponseKey) => {
    if (currentIndex >= queue.length) return;
    const wordId = queue[currentIndex] ?? '';
    const grade = RESPONSE_TO_GRADE[key] ?? 0;
    reviewWord(wordId, grade);
    setWordsReviewed(prev => prev + 1);

    const next = currentIndex + 1;
    if (next >= queue.length) {
      // Session complete
      const progress = getAllWordProgress();
      const result = calculateCoverage(wordsForCoverage, progress);
      setCoverageAfter(result.percentage);
      setRank(result.rank.arabic + ' — ' + result.rank.transliteration);
      setDone(true);
    } else {
      setCurrentIndex(next);
    }
  }, [currentIndex, queue]);

  if (queue.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 py-24 text-center">
        <div className="font-amiri text-4xl text-gold" dir="rtl" style={{ fontFamily: 'Amiri, serif' }}>
          ما شاء الله
        </div>
        <div className="text-harf-text text-xl font-medium">No words due for review today!</div>
        <div className="text-muted">Come back tomorrow or add more words to your queue.</div>
        <a href="/words" className="px-6 py-3 bg-gold text-bg rounded-xl font-semibold hover:bg-gold-muted transition-colors">
          Browse Words
        </a>
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
      />
    );
  }

  const currentWordId = queue[currentIndex] ?? '';
  const currentWord = wordsMap[currentWordId];
  if (!currentWord) return null;

  const progress = currentWordId ? (getAllWordProgress()[currentWordId] ?? null) : null;

  return (
    <div className="flex flex-col gap-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <h1 className="text-xl font-semibold text-harf-text">Study Session</h1>
          <div className="text-muted text-sm">
            {currentIndex + 1} / {queue.length}
          </div>
        </div>
        {/* Progress bar */}
        <div className="flex-1 mx-6 h-1.5 bg-surface-plus rounded-full overflow-hidden">
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
        wordKey={currentWordKey}
        wordGloss={currentWordGloss}
      />
    </div>
  );
}
