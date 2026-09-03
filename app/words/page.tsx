'use client';

import { useState, useEffect, useMemo } from 'react';
import { WordCard } from '@/components/words/WordCard';
import { getAllWordProgress, type WordProgress } from '@/lib/storage';
import wordsData from '@/data/words.json';

interface WordEntry {
  id: string;
  root: string;
  arabic: string;
  transliteration: string;
  meanings: string[];
  frequency: number;
  tier: number;
  coverage_weight: number;
  derivatives: Array<{ form: string; meaning: string }>;
}

const words = wordsData as WordEntry[];

type Filter = 'all' | 'mastered' | 'in-progress' | 'not-started';
type SortKey = 'frequency' | 'mastery' | 'alphabetical';

export default function WordsPage() {
  const [allProgress, setAllProgress] = useState<Record<string, WordProgress>>({});
  const [filter, setFilter] = useState<Filter>('all');
  const [sort, setSort] = useState<SortKey>('frequency');
  const [search, setSearch] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setAllProgress(getAllWordProgress());
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();

    // Combined search + mastery filter in a single pass (no intermediate spread/filter)
    const list = words.filter(w => {
      if (search) {
        const matched =
          w.arabic.includes(search) ||
          w.transliteration.toLowerCase().includes(q) ||
          w.root.includes(search) ||
          w.meanings.some(m => m.toLowerCase().includes(q));
        if (!matched) return false;
      }
      if (filter !== 'all') {
        const mastery = allProgress[w.id]?.mastery ?? 0;
        if (filter === 'mastered')    return mastery >= 4;
        if (filter === 'in-progress') return mastery >= 1 && mastery < 4;
        if (filter === 'not-started') return mastery === 0;
      }
      return true;
    });

    list.sort((a, b) => {
      if (sort === 'frequency')    return b.frequency - a.frequency;
      if (sort === 'alphabetical') return a.transliteration.localeCompare(b.transliteration);
      if (sort === 'mastery') {
        const ma = allProgress[a.id]?.mastery ?? 0;
        const mb = allProgress[b.id]?.mastery ?? 0;
        return mb - ma;
      }
      return 0;
    });

    return list;
  }, [filter, sort, search, allProgress]);

  // Pre-compute filter counts in one pass instead of 4 separate iterations
  const filterCounts = useMemo(() => {
    const counts = { mastered: 0, 'in-progress': 0, 'not-started': 0 };
    for (const w of words) {
      const m = allProgress[w.id]?.mastery ?? 0;
      if (m >= 4) counts.mastered++;
      else if (m >= 1) counts['in-progress']++;
      else counts['not-started']++;
    }
    return counts;
  }, [allProgress]);

  const filters: { key: Filter; label: string }[] = [
    { key: 'all',          label: 'All'         },
    { key: 'mastered',     label: 'Mastered'    },
    { key: 'in-progress',  label: 'In Progress' },
    { key: 'not-started',  label: 'Not Started' },
  ];

  const sorts: { key: SortKey; label: string }[] = [
    { key: 'frequency',    label: 'By Frequency'    },
    { key: 'mastery',      label: 'By Mastery'      },
    { key: 'alphabetical', label: 'Alphabetical'    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="card p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-harf-text">Word Library</h1>
          <p className="text-muted text-sm mt-1">
            {words.length} Quranic root words — sorted by frequency in the Quran
          </p>
        </div>
        {mounted && (
          <div className="flex gap-4 text-sm">
            <div className="flex flex-col gap-0.5">
              <span className="text-gold font-bold text-lg tabular-nums">{filterCounts.mastered}</span>
              <span className="text-muted text-xs">mastered</span>
            </div>
            <div className="w-px bg-border" />
            <div className="flex flex-col gap-0.5">
              <span className="text-gold font-bold text-lg tabular-nums">{filterCounts['in-progress']}</span>
              <span className="text-muted text-xs">in progress</span>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <label htmlFor="word-search" className="sr-only">Search words</label>
        <input
          id="word-search"
          type="text"
          placeholder="Search words…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 bg-surface border border-border rounded-xl px-4 py-2.5 text-harf-text placeholder:text-muted text-sm focus:outline-none focus:border-gold/50"
        />

        {/* Sort */}
        <label htmlFor="word-sort" className="sr-only">Sort words by</label>
        <select
          id="word-sort"
          value={sort}
          onChange={e => setSort(e.target.value as SortKey)}
          className="bg-surface border border-border rounded-xl px-3 py-2.5 text-harf-text text-sm focus:outline-none focus:border-gold/50"
        >
          {sorts.map(s => (
            <option key={s.key} value={s.key}>{s.label}</option>
          ))}
        </select>
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 flex-wrap">
        {filters.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            aria-pressed={filter === f.key}
            className={`px-4 py-1.5 rounded-full text-sm transition-colors border ${
              filter === f.key
                ? 'bg-gold/10 text-gold border-gold/30 font-semibold underline decoration-dotted decoration-gold'
                : 'font-medium text-muted border-border hover:text-harf-text hover:border-muted'
            }`}
          >
            {f.label}
            {mounted && f.key !== 'all' && (
              <span className="ml-1.5 text-xs opacity-70">
                ({filterCounts[f.key as keyof typeof filterCounts] ?? 0})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Word grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {filtered.map(word => (
          <WordCard
            key={word.id}
            {...word}
            progress={mounted ? (allProgress[word.id] ?? null) : null}
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-muted">
          No words match your filter.
        </div>
      )}
    </div>
  );
}
