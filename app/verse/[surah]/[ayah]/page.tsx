'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { fetchAyah, type AyahResponse } from '@/lib/quran-api';
import { verseAudioUrl, wordAudioUrl, DEFAULT_RECITER_ID, RECITER_STORAGE_KEY } from '@/lib/audio';
import { ReciterSelect } from '@/components/ReciterSelect';
import surahMetaRaw from '@/data/quran-surah-meta.json';

interface SurahMeta { id: number; name: string; arabic: string; verses: number; }
const surahMeta = surahMetaRaw as SurahMeta[];

// ── Skeleton ────────────────────────────────────────────────────────────────
function VersePageSkeleton() {
  return (
    <div className="flex flex-col gap-6 py-8 animate-pulse">
      <div className="h-5 w-12 rounded bg-surface-plus" />
      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-2">
          <div className="h-6 w-40 rounded bg-surface-plus" />
          <div className="h-4 w-24 rounded bg-surface-plus" />
        </div>
        <div className="h-6 w-16 rounded bg-surface-plus" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-5 items-start">
        <div className="card p-6 flex flex-col gap-5">
          <div className="h-20 w-full rounded bg-surface-plus" />
          <div className="h-4 w-5/6 rounded bg-surface-plus" />
          <div className="h-4 w-4/5 rounded bg-surface-plus" />
          <div className="flex gap-2">
            <div className="h-8 w-24 rounded-lg bg-surface-plus" />
            <div className="h-8 w-48 rounded-lg bg-surface-plus" />
          </div>
        </div>
        <div className="card p-6 flex flex-col gap-3">
          <div className="h-5 w-36 rounded bg-surface-plus" />
          <div className="h-4 w-full rounded bg-surface-plus" />
          <div className="h-4 w-5/6 rounded bg-surface-plus" />
          <div className="h-4 w-4/5 rounded bg-surface-plus" />
          <div className="h-4 w-full rounded bg-surface-plus" />
          <div className="h-4 w-3/4 rounded bg-surface-plus" />
        </div>
      </div>
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────
export default function VersePage() {
  const params = useParams();
  const surah = params.surah as string;
  const ayah  = params.ayah  as string;

  const [verse,    setVerse]    = useState<AyahResponse | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [glosses,       setGlosses]       = useState<string[]>([]);
  const [tafsir,        setTafsir]        = useState<string | null | undefined>(undefined);
  const [tafsirLoading, setTafsirLoading] = useState(false);

  const [playingWord,  setPlayingWord]  = useState<number | null>(null);
  const [playingVerse, setPlayingVerse] = useState(false);
  const [reciterId,    setReciterId]    = useState(DEFAULT_RECITER_ID);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const meta = surahMeta[parseInt(surah, 10) - 1];

  // Reciter from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(RECITER_STORAGE_KEY);
    if (stored) setReciterId(stored);
  }, []);

  // Fetch verse
  useEffect(() => {
    setLoading(true);
    fetchAyah(`${surah}:${ayah}`).then(data => {
      if (!data) { setNotFound(true); setLoading(false); return; }
      setVerse(data);
      setLoading(false);
    });
  }, [surah, ayah]);

  // Auto-fetch tafsir on mount
  useEffect(() => {
    setTafsirLoading(true);
    fetch(`/api/tafsir?ref=${surah}:${ayah}`)
      .then(res => res.ok ? res.json() as Promise<{ text: string | null }> : Promise.resolve({ text: null }))
      .then(data => setTafsir(data.text ?? null))
      .catch(() => setTafsir(null))
      .finally(() => setTafsirLoading(false));
  }, [surah, ayah]);

  // Lazy-load WBW glosses after verse arrives
  useEffect(() => {
    if (!verse) return;
    const wordCount = verse.arabic.split(' ').length;
    import('@/data/english-wbw.json').then(mod => {
      const data = mod.default as Record<string, string>;
      setGlosses(Array.from({ length: wordCount }, (_, i) => data[`${surah}:${ayah}:${i + 1}`] ?? ''));
    }).catch(() => {});
  }, [verse, surah, ayah]);

  // Cleanup audio on unmount
  useEffect(() => { return () => { audioRef.current?.pause(); }; }, []);

  const stopAudio = useCallback(() => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; }
    setPlayingWord(null);
    setPlayingVerse(false);
  }, []);

  const playWord = useCallback((idx: number) => {
    stopAudio();
    const audio = new Audio(wordAudioUrl(surah, ayah, idx));
    audioRef.current = audio;
    setPlayingWord(idx);
    audio.onended = () => setPlayingWord(null);
    audio.onerror = () => setPlayingWord(null);
    audio.play().catch(() => setPlayingWord(null));
  }, [stopAudio, surah, ayah]);

  const handleVerseAudio = useCallback(() => {
    if (playingVerse) { stopAudio(); return; }
    stopAudio();
    const audio = new Audio(verseAudioUrl(surah, ayah));
    audioRef.current = audio;
    setPlayingVerse(true);
    audio.onended = () => setPlayingVerse(false);
    audio.onerror = () => setPlayingVerse(false);
    audio.play().catch(() => setPlayingVerse(false));
  }, [playingVerse, stopAudio, surah, ayah]);

  const handleReciterChange = (id: string) => {
    setReciterId(id);
    localStorage.setItem(RECITER_STORAGE_KEY, id);
    if (playingVerse) stopAudio();
  };

  if (loading) return <VersePageSkeleton />;
  if (notFound || !verse || !meta) {
    return (
      <div className="py-16 text-center flex flex-col gap-4">
        <p className="text-muted">Verse not found.</p>
        <Link href="/app" className="text-gold hover:text-gold/80 text-sm">← Back to dashboard</Link>
      </div>
    );
  }

  const words = verse.arabic.split(' ');

  return (
    <div className="flex flex-col gap-6 py-8">

      {/* Back */}
      <Link href="/app" className="text-muted hover:text-harf-text text-sm flex items-center gap-1.5 transition-colors w-fit">
        ← Back
      </Link>

      {/* Header */}
      <div className="flex items-baseline justify-between gap-4">
        <div className="flex items-baseline gap-3">
          <h1 className="text-harf-text font-semibold text-xl">{meta.name}</h1>
          <span className="text-muted text-lg" style={{ fontFamily: 'Amiri, serif' }}>{meta.arabic}</span>
        </div>
        <span className="font-mono text-muted text-base shrink-0">{surah}:{ayah}</span>
      </div>

      {/* Two-column body */}
      <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-5 items-start">

        {/* Left: verse */}
        <div className="card p-6 flex flex-col gap-5">

          {/* Interactive Arabic */}
          <div
            className="text-right"
            dir="rtl"
            lang="ar"
            style={{ fontFamily: 'var(--font-amiri-quran, Amiri, serif)', fontSize: '1.75rem', lineHeight: '3' }}
          >
            {words.map((word, i) => {
              const idx    = i + 1;
              const active = playingWord === idx;
              const gloss  = glosses[i] ?? '';
              return (
                <span key={i} className="relative inline-block group/word">
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={() => playWord(idx)}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); playWord(idx); } }}
                    aria-label={gloss ? `${word} — ${gloss}` : `Word ${idx}`}
                    className={`cursor-pointer transition-colors rounded-sm px-0.5
                      ${active ? 'text-gold' : 'text-harf-text hover:text-gold/80'}`}
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

          {/* English translation */}
          <p className="text-muted text-sm italic leading-relaxed border-t border-border pt-4">
            {verse.english}
          </p>

          {/* Audio controls */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleVerseAudio}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors
                ${playingVerse
                  ? 'bg-gold/20 text-gold'
                  : 'bg-surface-plus hover:bg-border text-muted hover:text-harf-text'
                }`}
            >
              {playingVerse ? (
                <>
                  <span aria-hidden="true" className="flex gap-0.5 items-end h-4">
                    <span className="w-0.5 bg-gold rounded animate-bounce" style={{ height: '60%', animationDelay: '0ms' }} />
                    <span className="w-0.5 bg-gold rounded animate-bounce" style={{ height: '100%', animationDelay: '150ms' }} />
                    <span className="w-0.5 bg-gold rounded animate-bounce" style={{ height: '70%', animationDelay: '300ms' }} />
                    <span className="w-0.5 bg-gold rounded animate-bounce" style={{ height: '80%', animationDelay: '75ms' }} />
                  </span>
                  Stop
                </>
              ) : (
                <>
                  <svg aria-hidden="true" className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.784L4.39 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.39l3.993-3.784a1 1 0 011 .076zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
                  </svg>
                  Listen
                </>
              )}
            </button>

            <ReciterSelect value={reciterId} onChange={handleReciterChange} />
          </div>
        </div>

        {/* Right: tafsir */}
        <div className="card flex flex-col">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-harf-text font-medium text-sm">Tafsir Ibn Kathir</h2>
          </div>
          <div className="px-5 py-4 overflow-y-auto max-h-[70vh]">
            {tafsirLoading ? (
              <div className="animate-pulse flex flex-col gap-3">
                <div className="h-4 bg-surface-plus rounded w-full" />
                <div className="h-4 bg-surface-plus rounded w-5/6" />
                <div className="h-4 bg-surface-plus rounded w-4/5" />
                <div className="h-4 bg-surface-plus rounded w-full" />
                <div className="h-4 bg-surface-plus rounded w-3/4" />
              </div>
            ) : tafsir ? (
              <div
                className="text-sm text-muted leading-relaxed tafsir-content"
                dangerouslySetInnerHTML={{ __html: tafsir }}
              />
            ) : (
              <p className="text-sm text-muted italic">No tafsir available for this verse.</p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
