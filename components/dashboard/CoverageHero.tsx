'use client';

import { useEffect, useState } from 'react';
import { calculateCoverage, getRank, rankProgress, formatPct, type WordWithWeight } from '@/lib/coverage';
import { getAllWordProgress } from '@/lib/storage';
import wordsData from '@/data/words.json';

const wordsForCoverage: WordWithWeight[] = (wordsData as Array<{ id: string; coverage_weight: number }>).map(w => ({
  id: w.id,
  coverage_weight: w.coverage_weight,
}));

export function CoverageHero() {
  const [coverage, setCoverage] = useState(0);
  const [masteredCount, setMasteredCount] = useState(0);
  const [totalWords, setTotalWords] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const progress = getAllWordProgress();
    const result = calculateCoverage(wordsForCoverage, progress);
    setCoverage(result.percentage);
    setMasteredCount(result.masteredCount);
    setTotalWords(result.totalWords);
  }, []);

  const rank = getRank(coverage);
  const progress = rankProgress(coverage);

  if (!mounted) {
    return <div className="card p-8 h-48 animate-pulse" />;
  }

  return (
    <div className="card p-8 relative overflow-hidden" aria-label="Quran comprehension progress">
      <h2 className="sr-only">Quran Comprehension</h2>
      {/* Background decoration */}
      <div aria-hidden="true" className="absolute top-0 right-0 w-48 h-48 bg-gold/5 rounded-full -translate-y-1/2 translate-x-1/2" />
      <div aria-hidden="true" className="absolute bottom-0 left-0 w-32 h-32 bg-green/10 rounded-full translate-y-1/2 -translate-x-1/2" />

      <div className="relative flex flex-col md:flex-row md:items-center gap-6">
        {/* Left: big percentage */}
        <div className="flex flex-col gap-1">
          <div className="text-muted text-sm uppercase tracking-widest">Quran comprehension</div>
          <div className="text-gold text-7xl font-bold leading-none">
            {formatPct(coverage)}
          </div>
          <div className="text-harf-text text-lg">
            of the Quran you understand
          </div>
          <div className="text-muted text-xs">
            Metric capped at 80% based on available dataset coverage.
          </div>
        </div>

        {/* Divider */}
        <div className="hidden md:block w-px h-24 bg-border" />

        {/* Right: rank + progress */}
        <div className="flex flex-col gap-4 flex-1">
          {/* Rank badge */}
          <div className="flex items-center gap-3">
            <div className="flex flex-col" dir="rtl">
              <div
                className="font-amiri text-3xl text-gold"
                lang="ar"
                style={{ fontFamily: 'Amiri, serif' }}
              >
                {rank.arabic}
              </div>
            </div>
            <div className="flex flex-col" dir="ltr">
              <div className="text-harf-text font-semibold">{rank.transliteration}</div>
              <div className="text-muted text-sm">{rank.label}</div>
            </div>
          </div>

          {/* Rank progress bar */}
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-xs text-muted">
              <span>{rank.minPct}%</span>
              <span>Next rank at {rank.maxPct}%</span>
            </div>
            <div className="h-2 bg-surface-plus rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-gold-muted to-gold rounded-full transition-all duration-1000"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
          </div>

          {/* Word count */}
          <div className="text-muted text-sm">
            <span className="text-harf-text font-medium">{masteredCount}</span> of {totalWords} words mastered
          </div>
        </div>
      </div>
    </div>
  );
}
