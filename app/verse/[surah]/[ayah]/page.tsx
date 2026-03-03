'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { fetchAyah, type AyahResponse } from '@/lib/quran-api';
import { verseAudioUrl, wordAudioUrl, DEFAULT_RECITER_ID, RECITER_STORAGE_KEY } from '@/lib/audio';
import { ReciterSelect } from '@/components/ReciterSelect';
import { setLastVerse } from '@/lib/storage';
import surahMetaRaw from '@/data/quran-surah-meta.json';

interface SurahMeta { id: number; name: string; arabic: string; verses: number; }
const surahMeta = surahMetaRaw as SurahMeta[];

// ── Nav helpers ──────────────────────────────────────────────────────────────

function prevVerseHref(s: number, a: number): string | null {
  if (a > 1) return `/verse/${s}/${a - 1}`;
  if (s > 1) return `/verse/${s - 1}/${surahMeta[s - 2]!.verses}`;
  return null;
}

function nextVerseHref(s: number, a: number): string | null {
  if (a < surahMeta[s - 1]!.verses) return `/verse/${s}/${a + 1}`;
  if (s < 114) return `/verse/${s + 1}/1`;
  return null;
}

// ── Tafsir pagination ────────────────────────────────────────────────────────

const TAFSIR_CHARS_PER_PAGE = 1200;

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, '');
}

function splitTafsirPages(html: string): string[] {
  const paras = html.split(/(?<=<\/p>)/).filter(p => p.trim().length > 0);
  const pages: string[] = [];
  let current = '';
  let currentLen = 0;

  for (const para of paras) {
    const textLen = stripHtml(para).length;
    if (currentLen > 0 && currentLen + textLen > TAFSIR_CHARS_PER_PAGE) {
      pages.push(current);
      current = para;
      currentLen = textLen;
    } else {
      current += para;
      currentLen += textLen;
    }
  }
  if (current) pages.push(current);
  return pages.length > 0 ? pages : [html];
}

// ── Skeleton ─────────────────────────────────────────────────────────────────

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
        </div>
        <div className="card p-6 flex flex-col gap-3">
          <div className="h-5 w-36 rounded bg-surface-plus" />
          <div className="h-4 w-full rounded bg-surface-plus" />
          <div className="h-4 w-5/6 rounded bg-surface-plus" />
          <div className="h-4 w-4/5 rounded bg-surface-plus" />
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function VersePage() {
  const params = useParams();
  const router = useRouter();
  const surah  = params.surah as string;
  const ayah   = params.ayah  as string;

  const [verse,    setVerse]    = useState<AyahResponse | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [glosses,       setGlosses]       = useState<string[]>([]);
  const [tafsir,        setTafsir]        = useState<string | null | undefined>(undefined);
  const [tafsirLoading, setTafsirLoading] = useState(false);
  const [tafsirPage,    setTafsirPage]    = useState(0);

  const [playingWord,  setPlayingWord]  = useState<number | null>(null);
  const [playingVerse, setPlayingVerse] = useState(false);
  const [reciterId,    setReciterId]    = useState(DEFAULT_RECITER_ID);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const s = parseInt(surah, 10);
  const a = parseInt(ayah,  10);
  const meta  = surahMeta[s - 1];
  const prev  = meta ? prevVerseHref(s, a) : null;
  const next  = meta ? nextVerseHref(s, a) : null;

  const tafsirPages = useMemo(() => tafsir ? splitTafsirPages(tafsir) : [], [tafsir]);

  // Reciter from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(RECITER_STORAGE_KEY);
    if (stored) setReciterId(stored);
  }, []);

  // Track last visited verse for "Continue Reading"
  useEffect(() => {
    if (!isNaN(s) && !isNaN(a) && s >= 1 && s <= 114) {
      setLastVerse(s, a);
    }
  }, [s, a]);

  // Fetch verse
  useEffect(() => {
    setLoading(true);
    setVerse(null);
    fetchAyah(`${surah}:${ayah}`).then(data => {
      if (!data) { setNotFound(true); setLoading(false); return; }
      setVerse(data);
      setLoading(false);
    });
  }, [surah, ayah]);

  // Fetch tafsir
  useEffect(() => {
    setTafsir(undefined);
    setTafsirPage(0);
    setTafsirLoading(true);
    fetch(`/api/tafsir?ref=${surah}:${ayah}`)
      .then(res => res.ok ? res.json() as Promise<{ text: string | null }> : Promise.resolve({ text: null }))
      .then(data => setTafsir(data.text ?? null))
      .catch(() => setTafsir(null))
      .finally(() => setTafsirLoading(false));
  }, [surah, ayah]);

  // WBW glosses
  useEffect(() => {
    if (!verse) return;
    const wordCount = verse.arabic.split(' ').length;
    import('@/data/english-wbw.json').then(mod => {
      const data = mod.default as Record<string, string>;
      setGlosses(Array.from({ length: wordCount }, (_, i) => data[`${surah}:${ayah}:${i + 1}`] ?? ''));
    }).catch(() => {});
  }, [verse, surah, ayah]);

  // Keyboard: ← → to navigate verses
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowLeft'  && prev) router.push(prev);
      if (e.key === 'ArrowRight' && next) router.push(next);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [prev, next, router]);

  // Cleanup audio
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
    <div className="flex flex-col gap-5 py-8">

      {/* ── Top bar: back · surah info ── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Link href="/app" className="text-muted hover:text-harf-text text-sm flex items-center gap-1.5 transition-colors shrink-0">
          ← Back
        </Link>

        <div className="flex items-center gap-3 flex-1 min-w-0">
          <h1 className="text-harf-text font-semibold text-base truncate">{meta.name}</h1>
          <span className="text-muted shrink-0" style={{ fontFamily: 'Amiri, serif' }}>{meta.arabic}</span>
          <span className="font-mono text-muted text-sm shrink-0">{surah}:{ayah}</span>
        </div>
      </div>

      {/* ── Verse navigation ── */}
      <div className="flex items-center justify-between gap-2">
        {prev ? (
          <Link
            href={prev}
            className="flex items-center gap-1.5 text-sm text-muted hover:text-harf-text
              transition-colors px-3 py-1.5 rounded-lg hover:bg-surface-plus"
          >
            ← {prev.split('/').slice(2).join(':')}
          </Link>
        ) : <span />}

        <span className="text-muted/40 text-xs">
          {a} / {meta.verses}
        </span>

        {next ? (
          <Link
            href={next}
            className="flex items-center gap-1.5 text-sm text-muted hover:text-harf-text
              transition-colors px-3 py-1.5 rounded-lg hover:bg-surface-plus"
          >
            {next.split('/').slice(2).join(':')} →
          </Link>
        ) : <span />}
      </div>

      {/* ── Main content: Arabic + Tafsir ── */}
      <div className="grid grid-cols-1 md:grid-cols-[3fr_2fr] gap-5 items-start animate-fade-in">

        {/* Arabic card */}
        <div className="card p-6 flex flex-col gap-5">
          <div
            className="text-right"
            dir="rtl"
            lang="ar"
            style={{ fontFamily: 'var(--font-amiri-quran, Amiri, serif)', fontSize: '1.75rem', lineHeight: '3.2' }}
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

        {/* Tafsir card */}
        <div className="card flex flex-col">
          <div className="px-5 py-3 border-b border-border flex items-center justify-between">
            <h2 className="text-harf-text font-medium text-sm">Tafsir Ibn Kathir</h2>
            {tafsirPages.length > 1 && (
              <span className="text-xs text-muted tabular-nums">
                {tafsirPage + 1} / {tafsirPages.length}
              </span>
            )}
          </div>
          <div className="px-5 py-4 flex-1 overflow-y-auto max-h-[60vh]">
            {tafsirLoading ? (
              <div className="animate-pulse flex flex-col gap-3">
                {[1,2,3,4,5].map(i => <div key={i} className="h-4 bg-surface-plus rounded" style={{ width: `${[100,83,90,78,95][i-1]}%` }} />)}
              </div>
            ) : tafsirPages.length > 0 ? (
              <div
                className="text-sm text-muted leading-relaxed tafsir-content animate-fade-in"
                dangerouslySetInnerHTML={{ __html: tafsirPages[tafsirPage] ?? '' }}
              />
            ) : (
              <p className="text-sm text-muted italic">No tafsir available for this verse.</p>
            )}
          </div>
          {tafsirPages.length > 1 && (
            <div className="px-5 py-3 border-t border-border flex items-center justify-between">
              <button
                onClick={() => setTafsirPage(p => Math.max(0, p - 1))}
                disabled={tafsirPage === 0}
                className="text-xs px-3 py-1.5 rounded-lg bg-surface-plus text-muted
                  hover:text-harf-text transition-colors disabled:opacity-30 disabled:pointer-events-none"
              >
                ← Prev
              </button>
              <div className="flex-1 mx-3 h-1 bg-border rounded-full overflow-hidden">
                <div
                  className="h-full bg-gold/60 rounded-full transition-all duration-200"
                  style={{ width: `${((tafsirPage + 1) / tafsirPages.length) * 100}%` }}
                />
              </div>
              <button
                onClick={() => setTafsirPage(p => Math.min(tafsirPages.length - 1, p + 1))}
                disabled={tafsirPage === tafsirPages.length - 1}
                className="text-xs px-3 py-1.5 rounded-lg bg-surface-plus text-muted
                  hover:text-harf-text transition-colors disabled:opacity-30 disabled:pointer-events-none"
              >
                Next →
              </button>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
