'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { verseAudioUrl, wordAudioUrl } from '@/lib/audio';
import { tokenContainsRoot } from '@/lib/arabic';
import type { AyahResponse } from '@/lib/quran-api';

interface InteractiveVerseProps {
  verse: AyahResponse;
  root: string;
}

export function InteractiveVerse({ verse, root }: InteractiveVerseProps) {
  const [playingWord, setPlayingWord] = useState<number | null>(null);
  const [playingVerse, setPlayingVerse] = useState(false);
  const [glosses, setGlosses] = useState<string[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [ch, vs] = verse.reference.split(':') as [string | undefined, string | undefined];
  const words = verse.arabic.split(' ');

  // Memoize token-root matching so it doesn't rerun on unrelated re-renders
  const tokenMatches = useMemo(
    () => words.map(t => tokenContainsRoot(t, root)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [verse.arabic, root]
  );

  // Stop audio on unmount (e.g. navigating away)
  useEffect(() => {
    return () => { audioRef.current?.pause(); };
  }, []);

  // Lazy-load WBW glosses once ref is known (keeps 1.9 MB JSON out of initial bundle)
  useEffect(() => {
    if (!ch || !vs) return;
    const wordCount = words.length;
    import('@/data/english-wbw.json').then(mod => {
      const data = mod.default as Record<string, string>;
      setGlosses(
        Array.from({ length: wordCount }, (_, i) => data[`${ch}:${vs}:${i + 1}`] ?? '')
      );
    }).catch(() => { /* glosses are enhancement only */ });
  // words.length changes with verse.arabic; use that as stable dep
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ch, vs, verse.arabic]);

  const stopAudio = () => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; }
    setPlayingWord(null);
    setPlayingVerse(false);
  };

  const playWord = (idx: number) => {
    if (!ch || !vs) return;
    stopAudio();
    const audio = new Audio(wordAudioUrl(ch, vs, idx));
    audioRef.current = audio;
    setPlayingWord(idx);
    audio.onended = () => setPlayingWord(null);
    audio.onerror = () => setPlayingWord(null);
    audio.play().catch(() => setPlayingWord(null));
  };

  const handleVerseAudio = () => {
    if (!ch || !vs) return;
    if (playingVerse) { stopAudio(); return; }
    stopAudio();
    const audio = new Audio(verseAudioUrl(ch, vs));
    audioRef.current = audio;
    setPlayingVerse(true);
    audio.onended = () => setPlayingVerse(false);
    audio.onerror = () => setPlayingVerse(false);
    audio.play().catch(() => setPlayingVerse(false));
  };

  return (
    <div className="border border-border rounded-xl p-5 flex flex-col gap-3">
      {/* Header: surah name, verse ref, full-verse audio button */}
      <div className="flex justify-between items-center">
        <div className="text-xs text-muted">
          Surah {verse.surahName}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted font-mono">{verse.reference}</span>
          {ch && vs && (
            <button
              onClick={handleVerseAudio}
              aria-label={playingVerse ? 'Stop' : 'Listen to full verse'}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs transition-colors
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
      </div>

      {/* Interactive Arabic — tap to hear each word, hover for English gloss, gold for root matches */}
      <div
        className="font-amiri-quran text-2xl text-right"
        dir="rtl"
        lang="ar"
        style={{ lineHeight: '3' }}
      >
        {words.map((word, i) => {
          const idx = i + 1;
          const isMatch = tokenMatches[i] ?? false;
          const active = playingWord === idx;
          const gloss = glosses[i] ?? '';
          return (
            <span key={i} className="relative inline-block group/word">
              <span
                role="button"
                tabIndex={0}
                onClick={() => playWord(idx)}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    playWord(idx);
                  }
                }}
                aria-label={gloss ? `${word} — ${gloss}` : `Word ${idx}`}
                className={`cursor-pointer transition-colors rounded-sm px-0.5
                  ${isMatch
                    ? (active ? 'text-gold' : 'text-gold/70 hover:text-gold')
                    : (active ? 'text-gold' : 'text-harf-text hover:text-gold/70')
                  }`}
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

      <div className="text-muted text-sm italic">{verse.english}</div>
    </div>
  );
}
