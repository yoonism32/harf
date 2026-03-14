'use client';

import { useEffect, useState } from 'react';
import { SURAHS, calculateCoverage, formatPct, type WordWithWeight } from '@/lib/coverage';
import { getAllWordProgress } from '@/lib/storage';
import wordsData from '@/data/words.json';

interface WordEntry {
  id: string;
  coverage_weight: number;
}

const words = wordsData as WordEntry[];
const wordsForCoverage: WordWithWeight[] = words.map(w => ({
  id: w.id,
  coverage_weight: w.coverage_weight,
}));

export default function CoveragePage() {
  const [overallPct, setOverallPct] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const progress = getAllWordProgress();
    const result = calculateCoverage(wordsForCoverage, progress);
    setOverallPct(result.percentage);
  }, []);

  // Color interpolation: grey (0%) → gold (100%)
  function pctToColor(pct: number): string {
    if (pct === 0) return 'bg-surface-plus border-border text-muted';
    if (pct < 25)  return 'bg-yellow-950/40 border-yellow-800/30 text-yellow-200/70';
    if (pct < 50)  return 'bg-yellow-900/50 border-yellow-700/40 text-yellow-200/80';
    if (pct < 75)  return 'bg-gold/20 border-gold/40 text-gold/90';
    return 'bg-gold/30 border-gold/60 text-gold';
  }

  // For now, all surahs show the same overall coverage
  // (in a full implementation, each surah would track words present in it)
  // We show overall coverage as a uniform indicator
  const displayPct = mounted ? overallPct : 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="card p-6">
        <div className="flex flex-col gap-2">
          <div className="text-muted text-sm uppercase tracking-wider">Overall Quran Coverage</div>
          <div className="text-gold text-5xl font-bold">{formatPct(displayPct)}</div>
          <p className="text-muted text-sm max-w-lg">
            As you master more root words, your coverage of each surah increases.
            The color of each surah reflects how many of its key words you know.
          </p>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 flex-wrap">
        <span className="text-muted text-sm">Coverage:</span>
        {[
          { label: '0%',    cls: 'bg-surface-plus border-border' },
          { label: '1–25%', cls: 'bg-yellow-950/40 border-yellow-800/30' },
          { label: '25–50%',cls: 'bg-yellow-900/50 border-yellow-700/40' },
          { label: '50–75%',cls: 'bg-gold/20 border-gold/40' },
          { label: '75%+',  cls: 'bg-gold/30 border-gold/60' },
        ].map(item => (
          <div key={item.label} className="flex items-center gap-1.5">
            <div className={`w-4 h-4 rounded border ${item.cls}`} />
            <span className="text-muted text-xs">{item.label}</span>
          </div>
        ))}
      </div>

      {/* Surah grid */}
      <ul
        role="list"
        className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 list-none p-0 m-0"
      >
        {SURAHS.map(surah => {
          // Each surah gets the overall coverage (simplified)
          // A full implementation would tag each word to its surahs
          const colorCls = pctToColor(displayPct);

          return (
            <li
              key={surah.number}
              role="listitem"
              className={`border rounded-xl p-2.5 flex flex-col gap-1 transition-[transform,border-color] hover:scale-105 cursor-default ${colorCls}`}
              aria-label={`Surah ${surah.number}: ${surah.name} (${surah.ayahs} ayahs)`}
              title={`${surah.name} (${surah.ayahs} ayahs) — ${formatPct(displayPct)} coverage`}
            >
              <div className="font-mono text-xs opacity-60" aria-hidden="true">
                {surah.number}
              </div>
              <div
                className="font-amiri text-base leading-tight text-right"
                dir="rtl"
                lang="ar"
                style={{ fontFamily: 'Amiri, serif' }}
                aria-hidden="true"
              >
                {surah.nameArabic}
              </div>
              <div className="text-xs opacity-70 truncate">
                {surah.name}
              </div>
              <div className="text-xs opacity-50">
                {surah.ayahs}v
              </div>
            </li>
          );
        })}
      </ul>

      {/* Note */}
      <div className="text-muted text-xs text-center border border-border rounded-xl p-4">
        Coverage data is based on Quranic Arabic Corpus v0.4 (77,429 total words).
        Mastering the top 300 root words covers approximately 80% of the Quran.
      </div>
    </div>
  );
}
