'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { formatPct } from '@/lib/coverage';

interface SessionCompleteProps {
  wordsReviewed: number;
  coverageBefore: number;
  coverageAfter: number;
  rankLabel?: string;
  onStudyMore?: () => void;
}

export function SessionComplete({
  wordsReviewed,
  coverageBefore,
  coverageAfter,
  rankLabel,
  onStudyMore,
}: SessionCompleteProps) {
  const gain = Math.round((coverageAfter - coverageBefore) * 10) / 10;

  useEffect(() => {
    const el = document.getElementById('aria-announcer');
    if (el) el.textContent = `Study session complete. You reviewed ${wordsReviewed} words.`;
  }, [wordsReviewed]);

  return (
    <div className="flex flex-col items-center justify-center gap-8 py-16 text-center animate-fade-in">
      {/* Arabic calligraphy-style header */}
      <div
        className="font-amiri text-5xl text-gold animate-slide-up"
        lang="ar"
        dir="rtl"
        aria-label="Ahsanta — Well done!"
        style={{ fontFamily: 'Amiri, serif' }}
      >
        أحسنت
      </div>
      <div className="text-muted text-sm -mt-4">Well done!</div>

      {/* Stats */}
      <dl className="card p-8 flex flex-col gap-6 w-full max-w-sm animate-slide-up [animation-delay:100ms]">
        <div className="flex flex-col gap-1">
          <dt className="text-muted text-sm uppercase tracking-wider">Words reviewed</dt>
          <dd className="text-4xl font-bold text-harf-text">{wordsReviewed}</dd>
        </div>

        <div className="border-t border-border" />

        <div className="flex flex-col gap-2">
          <dt className="text-muted text-sm uppercase tracking-wider">Quran coverage</dt>
          <dd className="flex items-baseline justify-center gap-2">
            <span className="text-muted text-xl">{formatPct(coverageBefore)}</span>
            <span className="text-muted" aria-hidden="true">→</span>
            <span className="text-gold text-3xl font-bold">{formatPct(coverageAfter)}</span>
          </dd>
          {gain > 0 && (
            <dd className="text-green-400 text-sm">
              +{formatPct(gain)} this session
            </dd>
          )}
        </div>

        {rankLabel && (
          <>
            <div className="border-t border-border" />
            <div className="flex flex-col gap-1">
              <dt className="text-muted text-sm uppercase tracking-wider">Your rank</dt>
              <dd className="text-gold text-xl font-medium">{rankLabel}</dd>
            </div>
          </>
        )}
      </dl>

      {/* Actions */}
      <div className="flex gap-3 animate-rise [animation-delay:200ms]">
        {onStudyMore ? (
          <button
            onClick={onStudyMore}
            className="px-6 py-3 bg-gold text-bg rounded-xl font-semibold hover:bg-gold-muted transition-colors active:scale-[0.97] motion-reduce:transition-none"
          >
            Study More
          </button>
        ) : (
          <Link
            href="/study"
            className="px-6 py-3 bg-gold text-bg rounded-xl font-semibold hover:bg-gold-muted transition-colors active:scale-[0.97] motion-reduce:transition-none"
          >
            Study More
          </Link>
        )}
        <Link
          href="/app"
          className="px-6 py-3 bg-surface-plus text-harf-text rounded-xl font-medium hover:bg-border transition-colors active:scale-[0.97] motion-reduce:transition-none"
        >
          Dashboard
        </Link>
      </div>
    </div>
  );
}
