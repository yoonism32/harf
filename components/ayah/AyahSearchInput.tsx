'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import surahMeta from '@/data/quran-surah-meta.json';

interface SurahMeta { id: number; name: string; arabic: string; verses: number; }
const surahs = surahMeta as SurahMeta[];

interface Result {
  surah: number;
  ayah: number;
  name: string;
  arabic: string;
}

const MAX_RESULTS = 12;

/**
 * Generate multiple normalized search variants for a surah name so users can
 * type with or without the Arabic definite article prefix.
 *
 * Surah names use many assimilated article forms: Ar-, An-, At-, Az-, As-,
 * Ash-, Ad-, Adh- …  plus un-prefixed names like "Ya-Sin" and "Ali 'Imran".
 * We produce three variants and check if the query prefix-matches any of them:
 *   1. Full name stripped of punctuation:  "Ar-Rum" → "arrum"
 *   2. Without leading dash-prefix:        "Ar-Rum" → "rum"
 *   3. Without leading space-word:         "Ali 'Imran" → "imran"
 */
function nameVariants(name: string): string[] {
  const clean = (s: string) => s.toLowerCase().replace(/[-\s']/g, '');
  const base = clean(name);
  const withoutDashPrefix = clean(name.replace(/^[A-Za-z]+-/, ''));
  const withoutSpaceWord  = clean(name.replace(/^\S+\s+/, ''));
  return [...new Set([base, withoutDashPrefix, withoutSpaceWord])].filter(v => v.length > 0);
}

/**
 * Find a surah by transliterated name prefix (min 2 chars).
 * "rum" → Ar-Rum, "baqara" → Al-Baqarah, "imran" → Ali 'Imran, "yasin" → Ya-Sin
 */
function findSurahByName(raw: string): SurahMeta | undefined {
  const q = raw.toLowerCase().replace(/[-\s']/g, '');
  if (q.length < 2) return undefined;
  return surahs.find(s => nameVariants(s.name).some(v => v.startsWith(q)));
}

function getResults(raw: string): Result[] {
  const q = raw.trim();
  if (!q) return [];

  // "surah:ayah" — surah part can be a number OR a transliterated name
  if (q.includes(':')) {
    const colonIdx = q.indexOf(':');
    const sPart = q.slice(0, colonIdx);
    const aPart = q.slice(colonIdx + 1);

    // Resolve surah — try number first, then name lookup
    const surahNum = parseInt(sPart, 10);
    let meta: SurahMeta | undefined;
    if (!isNaN(surahNum) && surahNum >= 1 && surahNum <= 114) {
      meta = surahs[surahNum - 1];
    } else if (sPart.trim()) {
      meta = findSurahByName(sPart.trim());
    }
    if (!meta) return [];

    if (!aPart) {
      // "4:" or "rum:" — show first N verses of that surah
      return Array.from({ length: Math.min(meta.verses, MAX_RESULTS) }, (_, i) => ({
        surah: meta!.id, ayah: i + 1, name: meta!.name, arabic: meta!.arabic,
      }));
    }
    // Prefix match: "2" → ayahs 2, 20, 21, 22 … ; "11" → 11, 110, 111 …
    const out: Result[] = [];
    for (let a = 1; a <= meta.verses; a++) {
      if (String(a).startsWith(aPart)) {
        out.push({ surah: meta.id, ayah: a, name: meta.name, arabic: meta.arabic });
        if (out.length >= MAX_RESULTS) break;
      }
    }
    return out;
  }

  // Pure number — match as ayah number across all surahs
  const ayahNum = parseInt(q, 10);
  if (isNaN(ayahNum) || ayahNum < 1 || q.length < 2) return [];

  const out: Result[] = [];
  for (const s of surahs) {
    if (s.verses >= ayahNum) {
      out.push({ surah: s.id, ayah: ayahNum, name: s.name, arabic: s.arabic });
      if (out.length >= MAX_RESULTS) break;
    }
  }
  return out;
}

export function AyahSearchInput() {
  const [open, setOpen]         = useState(false);
  const [query, setQuery]       = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef  = useRef<HTMLInputElement>(null);
  const router    = useRouter();

  const results = getResults(query);

  useEffect(() => { setActiveIdx(0); }, [query]);

  const close = useCallback(() => { setOpen(false); setQuery(''); }, []);

  const navigate = useCallback((r: Result) => {
    router.push(`/verse/${r.surah}/${r.ayah}`);
    close();
  }, [router, close]);

  const handleOpen = () => {
    setOpen(true);
    // Let the CSS transition start before we focus
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        close();
        break;
      case 'Enter': {
        e.preventDefault();
        const target = results[activeIdx];
        if (target) navigate(target);
        break;
      }
      case 'ArrowDown':
        e.preventDefault();
        setActiveIdx(i => Math.min(i + 1, results.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIdx(i => Math.max(i - 1, 0));
        break;
    }
  };

  return (
    <div className="relative flex items-center">
      {/* Toggle button — visible when closed */}
      <button
        onClick={handleOpen}
        aria-label="Search ayah"
        className={`
          px-3 py-1.5 rounded-lg text-sm font-medium text-muted hover:text-harf-text hover:bg-surface-plus
          transition-all duration-200 whitespace-nowrap overflow-hidden
          ${open ? 'w-0 px-0 opacity-0 pointer-events-none' : 'w-auto opacity-100'}
        `}
        tabIndex={open ? -1 : 0}
      >
        Ayah
      </button>

      {/* Search input — expands when open */}
      <div
        className={`
          transition-all duration-200 overflow-visible
          ${open ? 'w-40' : 'w-0'}
        `}
      >
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => setTimeout(close, 180)}
          placeholder="2:255 · rum:54 · 286"
          aria-label="Search ayah by reference"
          aria-autocomplete="list"
          aria-expanded={results.length > 0}
          suppressHydrationWarning
          className={`
            w-full px-3 py-1.5 rounded-lg text-sm bg-surface-plus border border-gold/40
            text-harf-text placeholder:text-muted/60
            focus:outline-none focus:border-gold
            transition-all duration-200
            ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}
          `}
          tabIndex={open ? 0 : -1}
        />
      </div>

      {/* Results dropdown */}
      {open && results.length > 0 && (
        <div
          role="listbox"
          className="absolute top-full right-0 mt-1.5 min-w-[260px] bg-surface border border-border rounded-xl shadow-2xl overflow-hidden z-50"
        >
          {results.map((r, i) => (
            <button
              key={`${r.surah}:${r.ayah}`}
              role="option"
              aria-selected={i === activeIdx}
              onMouseDown={e => { e.preventDefault(); navigate(r); }}
              onMouseEnter={() => setActiveIdx(i)}
              className={`
                w-full flex items-center justify-between gap-4 px-4 py-2.5 text-sm transition-colors text-left
                ${i === activeIdx
                  ? 'bg-gold/10 text-harf-text'
                  : 'text-muted hover:bg-surface-plus hover:text-harf-text'}
              `}
            >
              <span className="font-mono font-medium tabular-nums">
                {r.surah}:{r.ayah}
              </span>
              <span className="flex items-center gap-2 text-right">
                <span className="text-muted/80 truncate">{r.name}</span>
                <span
                  className="text-muted/50 font-amiri shrink-0"
                  dir="rtl"
                  style={{ fontFamily: 'Amiri, serif' }}
                >
                  {r.arabic}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
