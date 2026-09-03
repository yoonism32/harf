'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { fetchAyah, type AyahResponse } from '@/lib/quran-api';
import type { TranslitSearchResult } from '@/lib/transliteration-search';
import type { SearchWorkerRequest, SearchWorkerResponse } from '@/lib/workers/search.worker';

type State = 'idle' | 'searching' | 'results' | 'empty';

interface ResultWithAyah extends TranslitSearchResult {
  ayahData: AyahResponse | null;
}

export function QuranSearch() {
  const [query,   setQuery]   = useState('');
  const [state,   setState]   = useState<State>('idle');
  const [results, setResults] = useState<ResultWithAyah[]>([]);

  const debounceRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const workerRef    = useRef<Worker | null>(null);
  const requestIdRef = useRef(0);          // incremented per search; stale responses ignored
  const router       = useRouter();

  // Spin up the worker once
  useEffect(() => {
    workerRef.current = new Worker(
      new URL('../../lib/workers/search.worker', import.meta.url),
    );

    workerRef.current.onmessage = (e: MessageEvent<SearchWorkerResponse>) => {
      const { id, type, results: raw } = e.data;

      // Discard results from a superseded request
      if (id !== requestIdRef.current) return;

      if (type === 'done') {
        setState(prev => prev === 'searching' ? (raw.length === 0 ? 'empty' : 'results') : prev);
        return;
      }

      // partial — show whatever we have immediately
      if (raw.length === 0) return;

      setState('results');
      const withNulls: ResultWithAyah[] = raw.map(r => ({ ...r, ayahData: null }));
      setResults(withNulls);

      // Fetch ayah text for any results that don't have it yet
      void Promise.allSettled(raw.map(r => fetchAyah(r.verseRef))).then(settled => {
        // Only apply if still the same request
        if (id !== requestIdRef.current) return;
        setResults(raw.map((r, i) => ({
          ...r,
          ayahData: settled[i]?.status === 'fulfilled' ? settled[i].value : null,
        })));
      });
    };

    return () => workerRef.current?.terminate();
  }, []);

  const runSearch = useCallback((q: string) => {
    const trimmed = q.trim();
    if (trimmed.length < 3) {
      setState('idle');
      setResults([]);
      return;
    }

    setState('searching');
    setResults([]);

    const id = ++requestIdRef.current;
    workerRef.current?.postMessage({
      id,
      query: trimmed,
      maxResults: 15,
    } satisfies SearchWorkerRequest);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(query), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, runSearch]);

  const navigate = (r: ResultWithAyah) => {
    router.push(`/verse/${r.surah}/${r.ayah}`);
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-8 animate-fade-in">
      {/* Title */}
      <div className="text-center mb-8">
        <h1 className="font-amiri text-2xl font-semibold text-harf-text mb-2">
          قرآن · Search
        </h1>
        <p className="text-muted text-sm">
          Type a verse as you remember it — any romanization style
        </p>
      </div>

      {/* Input */}
      <div className="relative mb-6">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="type a verse as you remember it..."
          aria-label="Search Quran verses by transliteration"
          className={`
            w-full px-5 py-4 rounded-2xl text-base bg-surface border
            text-harf-text placeholder:text-muted/50
            focus:outline-none caret-gold
            transition-all duration-300
            ${state === 'searching'
              ? 'border-gold/60 shadow-[0_0_20px_rgba(201,168,76,0.15)] animate-[pulse-border_1.5s_ease-in-out_infinite]'
              : 'border-border focus:border-gold/60 focus:shadow-[0_0_16px_rgba(201,168,76,0.10)]'
            }
          `}
          autoFocus
          autoComplete="off"
          spellCheck={false}
        />
        {state === 'searching' && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 rounded-full border-2 border-gold/40 border-t-gold animate-spin" />
          </div>
        )}
      </div>

      {/* Idle hint */}
      {state === 'idle' && query.length === 0 && (
        <p className="text-center text-muted text-sm animate-fade-in">
          e.g. &ldquo;allahu la ilaha illa huwal hayul qayum&rdquo;
        </p>
      )}

      {/* Too short hint */}
      {state === 'idle' && query.length > 0 && query.length < 3 && (
        <p className="text-center text-muted text-sm animate-fade-in">
          Keep typing…
        </p>
      )}

      {/* Empty state */}
      {state === 'empty' && (
        <div className="text-center py-12 animate-fade-in">
          <p className="text-muted text-base">No verse found — try more words</p>
          <p className="text-muted/50 text-sm mt-2">Tip: spell out more of the verse for better results</p>
        </div>
      )}

      {/* Results — shown during streaming too */}
      {(state === 'results' || (state === 'searching' && results.length > 0)) && results.length > 0 && (
        <div className="space-y-3 animate-slide-up">
          {results.map((r, idx) => (
            <ResultCard
              key={r.verseRef}
              result={r}
              index={idx}
              onNavigate={navigate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ResultCard({
  result,
  index,
  onNavigate,
}: {
  result: ResultWithAyah;
  index: number;
  onNavigate: (r: ResultWithAyah) => void;
}) {
  const { ayahData, surah, ayah } = result;

  return (
    <button
      onClick={() => onNavigate(result)}
      className="w-full text-left card card-interactive p-5 rounded-2xl group cursor-pointer animate-rise"
      style={{ animationDelay: `${index * 40}ms` }}
      aria-label={`Navigate to ${surah}:${ayah}`}
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-gold font-mono font-semibold text-sm tabular-nums">
            {surah}:{ayah}
          </span>
          {ayahData && (
            <span className="text-muted text-xs">
              {ayahData.surahName}
            </span>
          )}
        </div>
        <span className="text-muted/40 group-hover:text-gold/60 transition-colors duration-150 text-lg leading-none">
          ↗
        </span>
      </div>

      {/* Arabic verse */}
      {ayahData ? (
        <p
          className="font-amiri-quran text-harf-text leading-loose mb-3"
          dir="rtl"
          lang="ar"
          style={{ fontSize: '1.4rem' }}
        >
          {ayahData.arabic}
        </p>
      ) : (
        <div className="h-8 bg-surface-plus rounded animate-pulse mb-3" />
      )}

      {/* English translation */}
      {ayahData ? (
        <p className="text-muted text-sm leading-relaxed line-clamp-2">
          {ayahData.english}
        </p>
      ) : (
        <div className="h-4 bg-surface-plus rounded animate-pulse w-3/4" />
      )}
    </button>
  );
}
