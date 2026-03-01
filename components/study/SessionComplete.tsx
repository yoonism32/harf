'use client';

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

  return (
    <div className="flex flex-col items-center justify-center gap-8 py-16 text-center">
      {/* Arabic calligraphy-style header */}
      <div
        className="font-amiri text-5xl text-gold"
        dir="rtl"
        style={{ fontFamily: 'Amiri, serif' }}
      >
        أحسنت
      </div>
      <div className="text-muted text-sm -mt-4">Well done!</div>

      {/* Stats */}
      <div className="card p-8 flex flex-col gap-6 w-full max-w-sm">
        <div className="flex flex-col gap-1">
          <div className="text-muted text-sm uppercase tracking-wider">Words reviewed</div>
          <div className="text-4xl font-bold text-harf-text">{wordsReviewed}</div>
        </div>

        <div className="border-t border-border" />

        <div className="flex flex-col gap-2">
          <div className="text-muted text-sm uppercase tracking-wider">Quran coverage</div>
          <div className="flex items-baseline justify-center gap-2">
            <span className="text-muted text-xl">{formatPct(coverageBefore)}</span>
            <span className="text-muted">→</span>
            <span className="text-gold text-3xl font-bold">{formatPct(coverageAfter)}</span>
          </div>
          {gain > 0 && (
            <div className="text-green-400 text-sm">
              +{formatPct(gain)} this session
            </div>
          )}
        </div>

        {rankLabel && (
          <>
            <div className="border-t border-border" />
            <div className="flex flex-col gap-1">
              <div className="text-muted text-sm uppercase tracking-wider">Your rank</div>
              <div className="text-gold text-xl font-medium">{rankLabel}</div>
            </div>
          </>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        {onStudyMore ? (
          <button
            onClick={onStudyMore}
            className="px-6 py-3 bg-gold text-bg rounded-xl font-semibold hover:bg-gold-muted transition-colors"
          >
            Study More
          </button>
        ) : (
          <Link
            href="/study"
            className="px-6 py-3 bg-gold text-bg rounded-xl font-semibold hover:bg-gold-muted transition-colors"
          >
            Study More
          </Link>
        )}
        <Link
          href="/app"
          className="px-6 py-3 bg-surface-plus text-harf-text rounded-xl font-medium hover:bg-border transition-colors"
        >
          Dashboard
        </Link>
      </div>
    </div>
  );
}
