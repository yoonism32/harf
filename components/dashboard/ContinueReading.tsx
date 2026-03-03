'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getLastVerse } from '@/lib/storage';
import surahMetaRaw from '@/data/quran-surah-meta.json';

interface SurahMeta { id: number; name: string; arabic: string; verses: number; }
const surahMeta = surahMetaRaw as SurahMeta[];

export function ContinueReading() {
  const [last, setLast] = useState<{ surah: number; ayah: number } | null>(null);

  useEffect(() => {
    setLast(getLastVerse());
  }, []);

  if (!last) return null;

  const meta = surahMeta[last.surah - 1];

  return (
    <Link
      href={`/verse/${last.surah}/${last.ayah}`}
      className="card card-interactive p-4 flex flex-col gap-3 group animate-fade-in"
    >
      <span className="text-muted group-hover:text-gold transition-colors duration-200">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l-6-6m0 0l6-6m-6 6h12" />
        </svg>
      </span>
      <div className="flex flex-col gap-0.5">
        <div className="text-harf-text text-sm font-medium group-hover:text-gold transition-colors duration-200">
          Continue Reading
        </div>
        <div className="text-muted text-xs tabular-nums">
          {last.surah}:{last.ayah}
          {meta && <span className="ml-1">· {meta.name}</span>}
        </div>
      </div>
    </Link>
  );
}
