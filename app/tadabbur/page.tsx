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
  surah_number: number;
  surah_name: string;
  text: string;
  short_text?: string;
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

      {/* Surah list */}
      <div className="flex flex-col gap-2">
        {filtered.map(surah => {
          const meta = surahNameMeta[String(surah.id)];
          const info = surahInfo[String(surah.id)];
          const place = meta?.revelation_place === 'makkah' ? 'Makkī' : 'Madanī';

          return (
            <Link
              key={surah.id}
              href={`/tadabbur/${surah.id}`}
              className="card card-interactive p-4 flex items-start gap-4 group"
            >
              {/* Number */}
              <span className="shrink-0 w-9 h-9 rounded-full bg-surface-plus flex items-center justify-center text-xs font-mono text-muted group-hover:text-gold transition-colors">
                {surah.id}
              </span>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-3">
                  <div className="flex items-baseline gap-2">
                    <span className="font-medium text-harf-text group-hover:text-gold transition-colors">
                      {surah.name}
                    </span>
                    <span
                      className="font-amiri text-lg text-muted"
                      style={{ fontFamily: 'Amiri, serif' }}
                      dir="rtl"
                    >
                      {surah.arabic}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-muted/70 border border-border/60 rounded-full px-2 py-0.5">
                      {place}
                    </span>
                    <span className="text-xs text-muted">{surah.verses} verses</span>
                  </div>
                </div>
                {info?.short_text && (
                  <p className="text-xs text-muted mt-1 line-clamp-2">{info.short_text}</p>
                )}
              </div>
            </Link>
          );
        })}

        {filtered.length === 0 && (
          <p className="text-center text-muted py-8 text-sm">No surahs match &ldquo;{query}&rdquo;</p>
        )}
      </div>
    </div>
  );
}
