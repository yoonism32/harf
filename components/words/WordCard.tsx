'use client';

import Link from 'next/link';
import { MASTERY_LABELS, MASTERY_COLORS } from '@/lib/srs';
import type { WordProgress } from '@/lib/storage';

interface WordCardProps {
  id: string;
  root: string;
  arabic: string;
  transliteration: string;
  meanings: string[];
  frequency: number;
  tier: number;
  progress: WordProgress | null;
}

export function WordCard({
  id,
  root,
  arabic,
  transliteration,
  meanings,
  frequency,
  tier,
  progress,
}: WordCardProps) {
  const mastery = progress?.mastery ?? 0;
  const tierColors: Record<number, string> = {
    1: 'text-gold border-gold/30 bg-gold/10',
    2: 'text-blue-400 border-blue-400/30 bg-blue-400/10',
    3: 'text-muted border-border bg-surface-plus',
  };

  return (
    <Link href={`/word/${id}`} className="block word-card-lazy">
      <div className="card px-4 pb-4 pt-5 flex flex-col gap-3 hover:border-gold/40 transition-[border-color,box-shadow,transform] duration-200 hover:shadow-lg hover:-translate-y-0.5 h-full">
        {/* Header row — pt-5 gives tashkeel ascenders room above the Arabic glyph */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-1" dir="rtl">
            <div
              className="font-amiri text-3xl text-harf-text leading-[1.55]"
              lang="ar"
            >
              {arabic}
            </div>
            <div className="text-muted text-xs" dir="ltr">
              <span lang="ar">{root}</span> • {transliteration}
            </div>
          </div>
          <div className={`text-xs px-2 py-0.5 rounded border font-mono shrink-0 ${tierColors[tier] ?? tierColors[3]}`}>
            ×{frequency}
          </div>
        </div>

        {/* Meaning */}
        <div className="text-harf-text text-sm">
          {meanings.slice(0, 2).join(', ')}
        </div>

        {/* Mastery dots */}
        <div className="flex items-center gap-2 mt-auto pt-2 border-t border-border">
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map(level => (
              <div
                key={level}
                className={`mastery-dot ${level <= mastery ? MASTERY_COLORS[mastery] : 'bg-border'}`}
              />
            ))}
          </div>
          <span className="text-muted text-xs">{MASTERY_LABELS[mastery]}</span>
        </div>
      </div>
    </Link>
  );
}
