'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchAyah, getDailyAyahRef } from '@/lib/quran-api';
import { getDailyAyahCache, setDailyAyahCache } from '@/lib/storage';
import { verseAudioUrl, wordAudioUrl } from '@/lib/audio';
import Link from 'next/link';
import { searchEnglish, isStopword, stemWord } from '@/lib/english-search';
import type { SearchResult } from '@/lib/english-search';

export function DailyAyah() {
  const [arabic, setArabic] = useState('');
  const [english, setEnglish] = useState('');
  const [ref, setRef] = useState('');
  const [surahName, setSurahName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playingWord, setPlayingWord] = useState<number | null>(null);
  const [playingVerse, setPlayingVerse] = useState(false);
  const [glosses, setGlosses] = useState<string[]>([]);
  const [reloads, setReloads] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const wbwDataRef = useRef<Record<string, string> | null>(null);
  const [selectedWord,  setSelectedWord]  = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(null);

  // Stop audio if the user navigates away from the dashboard
  useEffect(() => {
    return () => { audioRef.current?.pause(); };
  }, []);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setPlayingWord(null);
    setPlayingVerse(false);
  }, []);

  const playWord = useCallback((ch: string, vs: string, idx: number) => {
    stopAudio();
    const audio = new Audio(wordAudioUrl(ch, vs, idx));
    audioRef.current = audio;
    setPlayingWord(idx);
    audio.onended = () => setPlayingWord(null);
    audio.onerror = () => setPlayingWord(null);
    audio.play().catch(() => setPlayingWord(null));
  }, [stopAudio]);

  const handleVerseClick = useCallback((ch: string, vs: string) => {
    if (playingVerse) { stopAudio(); return; }
    stopAudio();
    const audio = new Audio(verseAudioUrl(ch, vs));
    audioRef.current = audio;
    setPlayingVerse(true);
    audio.onended = () => setPlayingVerse(false);
    audio.onerror = () => setPlayingVerse(false);
    audio.play().catch(() => setPlayingVerse(false));
  }, [playingVerse, stopAudio]);

  const handleWordSearch = useCallback((word: string) => {
    if (!wbwDataRef.current) return;
    if (selectedWord === word) {
      setSelectedWord(null);
      setSearchResults(null);
      return;
    }
    setSelectedWord(word);
    setSearchResults(searchEnglish(word, wbwDataRef.current, 30));
  }, [selectedWord]);

  useEffect(() => {
    if (!selectedWord) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setSelectedWord(null); setSearchResults(null); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedWord]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setError(null);
      setLoading(true);
      const cached = getDailyAyahCache();
      if (cached) {
        if (!cancelled) {
          setArabic(cached.arabic);
          setEnglish(cached.english);
          setRef(`${cached.surah}:${cached.ayah}`);
          setSurahName(cached.surahName);
          setLoading(false);
        }
        return;
      }

      const dayRef = getDailyAyahRef();
      const data = await fetchAyah(dayRef);

      if (!cancelled) {
        if (data) {
          setArabic(data.arabic);
          setEnglish(data.english);
          setRef(data.reference);
          setSurahName(data.surahName);

          setDailyAyahCache({
            date: new Date().toISOString().slice(0, 10),
            surah: data.surahNumber,
            ayah: data.ayahNumber,
            arabic: data.arabic,
            english: data.english,
            surahName: data.surahName,
          });
        } else {
          setError('Could not load today’s ayah. Check your connection and retry.');
        }
        setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [reloads]);

  // Load WBW glosses lazily once the verse ref is known.
  // Dynamic import keeps the 1.9 MB JSON out of the initial bundle.
  useEffect(() => {
    if (!ref || !arabic) return;
    const [ch, vs] = ref.split(':');
    if (!ch || !vs) return;
    const wordCount = arabic.split(' ').length;

    import('@/data/english-wbw.json').then(mod => {
      const data = mod.default as Record<string, string>;
      wbwDataRef.current = data;   // keep full dataset for search
      setGlosses(
        Array.from({ length: wordCount }, (_, i) => data[`${ch}:${vs}:${i + 1}`] ?? '')
      );
    }).catch(() => { /* silently ignore — glosses are enhancement only */ });
  }, [ref, arabic]);

  const [ch, vs] = ref.split(':') as [string | undefined, string | undefined];
  const words = arabic ? arabic.split(' ') : [];

  return (
    <div className="card p-6 flex flex-col gap-4 col-span-full md:col-span-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-gold" />
          <h2 className="text-harf-text font-semibold" lang="ar">آية اليوم</h2>
          <span className="text-muted text-sm">Daily Ayah</span>
        </div>

        {!loading && arabic && ch && vs && (
          <button
            onClick={() => handleVerseClick(ch, vs)}
            aria-label={playingVerse ? 'Stop' : 'Listen to full verse'}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-colors
              ${playingVerse ? 'text-gold bg-gold/10' : 'text-muted hover:text-gold'}`}
          >
            {playingVerse ? (
              <span className="flex gap-0.5 items-end h-3">
                <span className="w-0.5 bg-gold rounded animate-bounce" style={{ height: '60%', animationDelay: '0ms' }} />
                <span className="w-0.5 bg-gold rounded animate-bounce" style={{ height: '100%', animationDelay: '150ms' }} />
                <span className="w-0.5 bg-gold rounded animate-bounce" style={{ height: '70%', animationDelay: '300ms' }} />
              </span>
            ) : (
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.784L4.39 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.39l3.993-3.784a1 1 0 011 .076zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
              </svg>
            )}
            Listen
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          <div className="h-12 bg-surface-plus rounded animate-pulse" />
          <div className="h-4 bg-surface-plus rounded w-3/4 animate-pulse" />
        </div>
      ) : error ? (
        <div className="flex flex-col gap-2">
          <div className="text-red-400 text-sm">{error}</div>
          <button
            onClick={() => setReloads(r => r + 1)}
            className="self-start px-3 py-1.5 rounded-lg bg-surface-plus border border-border text-sm hover:border-gold/60 hover:text-gold transition-colors"
          >
            Retry
          </button>
        </div>
      ) : arabic ? (
        <>
          {/* WBW interactive Arabic — tap to hear, hover for English gloss */}
          <div
            className="font-amiri-quran text-3xl text-harf-text leading-[3] text-right animate-fade-in"
            dir="rtl"
            lang="ar"
          >
            {words.map((word, i) => {
              const idx = i + 1;
              const active = playingWord === idx;
              const gloss = glosses[i] ?? '';
              return (
                <span key={i} className="relative inline-block group/word">
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={() => ch && vs && playWord(ch, vs, idx)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        ch && vs && playWord(ch, vs, idx);
                      }
                    }}
                    aria-label={gloss ? `${word} — ${gloss}` : `Word ${idx}`}
                    className={`cursor-pointer transition-colors rounded-sm px-0.5
                      ${active ? 'text-gold' : 'hover:text-gold/70'}`}
                  >
                    {word}
                  </span>
                  {gloss && (
                    <span
                      className={`absolute top-full left-1/2 -translate-x-1/2 mt-1
                        bg-surface-plus border border-border rounded-md px-2 py-0.5
                        text-xs text-muted max-w-36 text-center leading-tight
                        pointer-events-none z-20 font-rubik transition-opacity duration-150
                        ${active ? 'opacity-100' : 'opacity-0 group-hover/word:opacity-100'}`}
                      dir="ltr"
                    >
                      {gloss}
                    </span>
                  )}
                  {' '}
                </span>
              );
            })}
          </div>

          <div className="text-muted text-sm leading-relaxed select-none" dir="ltr">
            &ldquo;
            {english.split(/(\s+)/).map((token, i) =>
              /^\s+$/.test(token)
                ? token
                : isStopword(token)
                  ? <span key={i} className="text-muted/50 italic">{token}</span>
                  : (
                    <button
                      key={i}
                      onClick={() => handleWordSearch(token)}
                      className={`rounded px-0.5 -mx-0.5 transition-colors italic
                        hover:text-harf-text hover:bg-surface-plus hover:not-italic
                        ${selectedWord === token
                          ? 'text-gold bg-gold/10 not-italic'
                          : 'text-muted'}`}
                      title={`Search for "${stemWord(token)}"`}
                    >
                      {token}
                    </button>
                  )
            )}
            &rdquo;
          </div>

          {/* Screen-reader announcement for search results */}
          <div aria-live="polite" aria-atomic="true" className="sr-only">
            {searchResults !== null && (
              searchResults.length === 0
                ? `No verses found for "${selectedWord}"`
                : `${searchResults.length} verse${searchResults.length > 1 ? 's' : ''} found for "${selectedWord}"`
            )}
          </div>

          {searchResults !== null && (
            <div className="flex flex-col gap-2 border-t border-border/50 pt-3 animate-fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted font-rubik">
                  {searchResults.length === 0
                    ? `No matches for "${selectedWord}"`
                    : `${searchResults.length} verse${searchResults.length !== 1 ? 's' : ''} mentioning "${selectedWord}"`}
                </span>
                <button
                  onClick={() => { setSelectedWord(null); setSearchResults(null); }}
                  className="text-xs text-muted hover:text-harf-text transition-colors px-1"
                  aria-label="Close search results"
                >
                  ✕
                </button>
              </div>
              {searchResults.length > 0 && (
                <div className="flex flex-col gap-0.5 max-h-44 overflow-y-auto">
                  {searchResults.map(r => (
                    <Link
                      key={r.verseRef}
                      href={`/verse/${r.surah}/${r.ayah}`}
                      className="flex items-baseline justify-between gap-3 rounded-md px-2 py-1
                        hover:bg-surface-plus transition-colors group/result"
                    >
                      <span className="text-xs text-gold/80 font-mono shrink-0">{r.verseRef}</span>
                      <span className="text-xs text-muted/70 truncate group-hover/result:text-harf-text
                        transition-colors flex-1">{r.gloss}</span>
                      <span className="text-muted/30 text-xs shrink-0">↗</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="text-muted text-xs">
            Surah {surahName} • {ref}
          </div>
        </>
      ) : (
        <div className="text-muted text-sm">Could not load verse. Check your connection.</div>
      )}
    </div>
  );
}
