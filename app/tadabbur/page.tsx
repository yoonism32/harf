'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import surahMetaRaw from '@/data/quran-surah-meta.json';
import surahNameMetaRaw from '@/data/quran-metadata-surah-name.json';
import surahInfoRaw from '@/data/surah-info.json';

interface SurahMeta {
  id: number;
  name: string;
  arabic: string;
  verses: number;
}

interface SurahNameMeta {
  id: number;
  name: string;
  name_simple: string;
  name_arabic: string;
  revelation_place: string;
  revelation_order: number;
  verses_count: number;
  bismillah_pre: boolean;
}

interface SurahInfo {
  id: number;
  name: string;
  summary: string;
}

const surahs = surahMetaRaw as SurahMeta[];
const surahNameMeta = surahNameMetaRaw as Record<string, SurahNameMeta>;
const surahInfo = surahInfoRaw as Record<string, SurahInfo>;

export default function TadabburIndexPage() {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return surahs;
    return surahs.filter(
      s =>
        s.name.toLowerCase().includes(q) ||
        s.arabic.includes(q) ||
        String(s.id).includes(q),
    );
  }, [query]);

  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-harf-text">تدبّر</h1>
        <p className="text-muted text-sm">
          Deep reflection — themes, topics, and connections across the Quran.
        </p>
      </div>

      {/* Search */}
      <input
        type="search"
        placeholder="Search surahs…"
        value={query}
        onChange={e => setQuery(e.target.value)}
        className="w-full bg-surface border border-border rounded-lg px-4 py-2.5 text-sm text-harf-text placeholder:text-muted outline-none focus:border-gold/60 transition-colors"
        aria-label="Filter surahs"
      />

      {/* Surah grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map(surah => {
          const meta = surahNameMeta[String(surah.id)];
          const info = surahInfo[String(surah.id)];
          const place = meta?.revelation_place === 'makkah' ? 'Makkī' : 'Madanī';

          return (
            <Link
              key={surah.id}
              href={`/tadabbur/${surah.id}`}
              className="card card-interactive p-4 flex flex-col gap-2 group"
            >
              <div className="flex items-center justify-between">
                <span className="shrink-0 w-8 h-8 rounded-full bg-surface-plus flex items-center justify-center text-xs font-mono text-muted group-hover:text-gold transition-colors">
                  {surah.id}
                </span>
                <span className="text-xs text-muted/70 border border-border/60 rounded-full px-2 py-0.5">
                  {place}
                </span>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="font-medium text-harf-text group-hover:text-gold transition-colors">
                  {surah.name}
                </span>
                <span className="font-amiri text-lg text-muted" dir="rtl">
                  {surah.arabic}
                </span>
              </div>

              <span className="text-xs text-muted">{surah.verses} verses</span>

              {info?.summary && (
                <p className="text-xs text-muted line-clamp-2">{info.summary}</p>
              )}
            </Link>
          );
        })}

        {filtered.length === 0 && (
          <p className="col-span-full text-center text-muted py-8 text-sm">No surahs match &ldquo;{query}&rdquo;</p>
        )}
      </div>
    </div>
  );
}
