'use client';

// B2: Listening Drill
// Play a verse audio clip → guess the surah:ayah reference.
// Pool: Juz Amma (surahs 78-114) + example verses from studied words.

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { RECITERS, RECITER_STORAGE_KEY, DEFAULT_RECITER_ID } from '@/lib/audio';
import { fetchAyah, type AyahResponse } from '@/lib/quran-api';
import { getAllWordProgress } from '@/lib/storage';
import surahMetaRaw from '@/data/quran-surah-meta.json';
import wordsRaw from '@/data/words.json';

interface SurahMeta { id: number; name: string; arabic: string; verses: number; }
interface WordEntry  { id: string; example_verse: string; }

const surahMeta = surahMetaRaw as SurahMeta[];
const wordsData = wordsRaw as WordEntry[];

// ── Build verse pool ──────────────────────────────────────────────────────────

/** All Juz Amma verses: surahs 78–114 */
function buildJuzAmmaPool(): Array<{ surah: number; ayah: number }> {
  const pool: Array<{ surah: number; ayah: number }> = [];
  for (const s of surahMeta) {
    if (s.id < 78) continue;
    for (let a = 1; a <= s.verses; a++) {
      pool.push({ surah: s.id, ayah: a });
    }
  }
  return pool;
}

const JUZ_AMMA_POOL = buildJuzAmmaPool();

function buildVersePool(): Array<{ surah: number; ayah: number }> {
  // Studied word example verses
  const progress = getAllWordProgress();
  const studiedIds = new Set(Object.keys(progress));
  const studiedVerses: Array<{ surah: number; ayah: number }> = [];

  for (const w of wordsData) {
    if (!studiedIds.has(w.id)) continue;
    const [s, a] = w.example_verse.split(':').map(Number);
    if (s && a) studiedVerses.push({ surah: s, ayah: a });
  }

  // Combine: Juz Amma always in pool; studied verses boosted (appear twice)
  const seen = new Set<string>();
  const pool: Array<{ surah: number; ayah: number }> = [];

  for (const v of [...studiedVerses, ...studiedVerses, ...JUZ_AMMA_POOL]) {
    const key = `${v.surah}:${v.ayah}`;
    if (!seen.has(key)) { seen.add(key); pool.push(v); }
  }

  return pool.length > 0 ? pool : JUZ_AMMA_POOL;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

// ── State machine ─────────────────────────────────────────────────────────────

type DrillState = 'ready' | 'playing' | 'answering' | 'revealed';

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5] as const;
type Speed = typeof SPEEDS[number];

// ── Component ─────────────────────────────────────────────────────────────────

export function ListeningDrill() {
  const [target,     setTarget]     = useState<{ surah: number; ayah: number } | null>(null);
  const [drillState, setDrillState] = useState<DrillState>('ready');
  const [guess,      setGuess]      = useState('');
  const [correct,    setCorrect]    = useState<boolean | null>(null);
  const [ayahData,   setAyahData]   = useState<AyahResponse | null>(null);
  const [playCount,  setPlayCount]  = useState(0);

  // Settings
  const [speed,        setSpeed]        = useState<Speed>(1);
  const [reciterId,    setReciterId]    = useState(DEFAULT_RECITER_ID);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsView, setSettingsView] = useState<'root' | 'speed' | 'reciter'>('root');

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [pool]   = useState(() => buildVersePool());

  // Read reciter from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(RECITER_STORAGE_KEY);
    if (stored && RECITERS.some(r => r.id === stored)) setReciterId(stored);
  }, []);

  const loadNext = useCallback(() => {
    const v = pickRandom(pool);
    setTarget(v);
    setDrillState('ready');
    setGuess('');
    setCorrect(null);
    setAyahData(null);
    setPlayCount(0);
    audioRef.current?.pause();
  }, [pool]);

  useEffect(() => { loadNext(); }, [loadNext]);

  const playAudio = useCallback(() => {
    if (!target) return;
    audioRef.current?.pause();
    const reciter = RECITERS.find(r => r.id === reciterId);
    const base = reciter?.url ?? `https://everyayah.com/data/${reciterId}`;
    const file = `${String(target.surah).padStart(3, '0')}${String(target.ayah).padStart(3, '0')}.mp3`;
    const audio = new Audio(`${base}/${file}`);
    audio.playbackRate = speed;
    audioRef.current = audio;
    setDrillState('playing');
    setPlayCount(c => c + 1);
    audio.onended = () => setDrillState('answering');
    audio.onerror = () => setDrillState('answering');
    audio.play().catch(() => setDrillState('answering'));
  }, [target, speed, reciterId]);

  const handleSubmit = useCallback(() => {
    if (!target || drillState !== 'answering') return;
    const raw = guess.trim().replace(/\s+/g, '');
    const [gs, ga] = raw.split(':').map(Number);
    const isCorrect = gs === target.surah && ga === target.ayah;
    setCorrect(isCorrect);
    setDrillState('revealed');
    fetchAyah(`${target.surah}:${target.ayah}`).then(d => setAyahData(d));
  }, [target, drillState, guess]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit();
  };

  useEffect(() => {
    if (drillState === 'answering') {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [drillState]);

  const handleSelectReciter = (id: string) => {
    setReciterId(id);
    localStorage.setItem(RECITER_STORAGE_KEY, id);
    setSettingsView('root');
  };

  const handleSelectSpeed = (s: Speed) => {
    if (audioRef.current) audioRef.current.playbackRate = s;
    setSpeed(s);
    setSettingsView('root');
  };

  const currentReciterLabel = RECITERS.find(r => r.id === reciterId)?.label ?? reciterId;
  const surahName = target ? surahMeta[target.surah - 1]?.name : '';

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-8 animate-fade-in">
      {/* Title */}
      <div className="text-center mb-10">
        <h1 className="text-4xl text-gold mb-2" style={{ fontFamily: 'Amiri, serif' }}>
          سماع · Drill
        </h1>
        <p className="text-muted text-sm">Listen to the recitation — name the verse</p>
      </div>

      <div className="card p-8 flex flex-col items-center gap-8">

        {/* Play area */}
        <div className="flex flex-col items-center gap-4 w-full">

          {/* Play button row with settings gear */}
          <div className="relative flex items-center justify-center w-full">
            <button
              onClick={playAudio}
              disabled={!target || drillState === 'playing'}
              aria-label={drillState === 'playing' ? 'Playing…' : playCount === 0 ? 'Play verse' : 'Replay verse'}
              className={`
                w-20 h-20 rounded-full flex items-center justify-center
                border-2 transition-all duration-200
                ${drillState === 'playing'
                  ? 'border-gold bg-gold/10 text-gold cursor-not-allowed'
                  : 'border-border hover:border-gold hover:bg-gold/5 text-muted hover:text-gold cursor-pointer'
                }
              `}
            >
              {drillState === 'playing' ? (
                <span className="flex gap-1 items-end h-6">
                  {[0, 150, 300].map(delay => (
                    <span
                      key={delay}
                      className="w-1.5 bg-gold rounded animate-bounce"
                      style={{ height: '60%', animationDelay: `${delay}ms` }}
                    />
                  ))}
                </span>
              ) : (
                <svg className="w-8 h-8 ml-1" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            {/* Settings gear */}
            <button
              onClick={() => { setSettingsOpen(o => !o); setSettingsView('root'); }}
              aria-label="Playback settings"
              aria-expanded={settingsOpen}
              className={`absolute right-0 p-2 rounded-lg transition-colors ${
                settingsOpen
                  ? 'text-gold bg-gold/10'
                  : 'text-muted hover:text-harf-text hover:bg-surface-plus'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              </svg>
            </button>
          </div>

          {/* Replay */}
          {playCount > 0 && drillState !== 'playing' && drillState !== 'ready' && (
            <button
              onClick={playAudio}
              className="text-xs text-muted hover:text-gold transition-colors flex items-center gap-1"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Replay
            </button>
          )}

          {/* Settings panel */}
          {settingsOpen && (
            <div className="w-full rounded-xl border border-border bg-surface-plus text-sm animate-fade-in overflow-hidden">

              {/* Root view: Speed + Reciter tiles */}
              {settingsView === 'root' && (
                <div className="flex divide-x divide-border">
                  <button
                    onClick={() => setSettingsView('speed')}
                    className="flex-1 flex flex-col items-center gap-1 py-3 px-4 hover:bg-surface transition-colors"
                  >
                    <span className="text-gold font-semibold tabular-nums">{speed}×</span>
                    <span className="text-muted text-xs">Speed</span>
                  </button>
                  <button
                    onClick={() => setSettingsView('reciter')}
                    className="flex-1 flex flex-col items-center gap-1 py-3 px-4 hover:bg-surface transition-colors"
                  >
                    <span className="text-harf-text font-medium truncate max-w-[140px] text-xs text-center leading-tight">
                      {currentReciterLabel}
                    </span>
                    <span className="text-muted text-xs">Reciter</span>
                  </button>
                </div>
              )}

              {/* Speed sub-panel */}
              {settingsView === 'speed' && (
                <div className="p-3">
                  <div className="flex items-center gap-2 mb-3">
                    <button
                      onClick={() => setSettingsView('root')}
                      className="text-muted hover:text-harf-text transition-colors"
                      aria-label="Back"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                      </svg>
                    </button>
                    <span className="text-harf-text font-medium">Playback Speed</span>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {SPEEDS.map(s => (
                      <button
                        key={s}
                        onClick={() => handleSelectSpeed(s)}
                        className={`px-3 py-1.5 rounded-lg font-mono text-sm transition-colors ${
                          speed === s
                            ? 'bg-gold text-bg font-semibold'
                            : 'border border-border text-muted hover:border-gold/50 hover:text-gold'
                        }`}
                      >
                        {s}×
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Reciter sub-panel */}
              {settingsView === 'reciter' && (
                <div className="p-3">
                  <div className="flex items-center gap-2 mb-3">
                    <button
                      onClick={() => setSettingsView('root')}
                      className="text-muted hover:text-harf-text transition-colors"
                      aria-label="Back"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                      </svg>
                    </button>
                    <span className="text-harf-text font-medium">Reciter</span>
                  </div>
                  <div className="max-h-52 overflow-y-auto flex flex-col gap-0.5">
                    {RECITERS.map(r => (
                      <button
                        key={r.id}
                        onClick={() => handleSelectReciter(r.id)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                          reciterId === r.id
                            ? 'bg-gold/10 text-gold'
                            : 'text-muted hover:bg-surface hover:text-harf-text'
                        }`}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}
        </div>

        {/* Hint: play to begin */}
        {drillState === 'ready' && (
          <p className="text-muted text-sm animate-fade-in">Press play to hear the verse</p>
        )}

        {/* Answer input */}
        {(drillState === 'answering' || drillState === 'revealed') && (
          <div className="w-full flex flex-col items-center gap-4 animate-fade-in">
            <div className="flex gap-3 w-full max-w-xs">
              <input
                ref={inputRef}
                value={guess}
                onChange={e => setGuess(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="surah:ayah  e.g. 112:1"
                disabled={drillState === 'revealed'}
                className={`
                  flex-1 px-4 py-2.5 rounded-xl text-sm bg-surface-plus border
                  text-harf-text placeholder:text-muted/50
                  focus:outline-none transition-colors
                  ${drillState === 'revealed'
                    ? correct ? 'border-green/50' : 'border-red-500/40'
                    : 'border-border focus:border-gold/60'
                  }
                `}
                autoComplete="off"
                spellCheck={false}
              />
              {drillState === 'answering' && (
                <button
                  onClick={handleSubmit}
                  disabled={!guess.trim()}
                  className="px-4 py-2.5 bg-gold text-bg rounded-xl text-sm font-semibold
                    hover:bg-gold/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Check
                </button>
              )}
            </div>
          </div>
        )}

        {/* Result */}
        {drillState === 'revealed' && (
          <div className="w-full flex flex-col items-center gap-5 animate-fade-in">
            {/* Correct / wrong banner */}
            <div className={`text-sm font-semibold px-4 py-2 rounded-lg ${
              correct
                ? 'bg-green/10 text-green border border-green/30'
                : 'bg-red-500/10 text-red-400 border border-red-500/30'
            }`}>
              {correct ? '✓ Correct!' : `✗ It was ${target?.surah}:${target?.ayah} — ${surahName}`}
            </div>

            {/* Revealed verse */}
            <div className="w-full card p-5 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span className="text-gold font-mono text-sm tabular-nums">
                  {target?.surah}:{target?.ayah}
                </span>
                <span className="text-muted text-xs">{surahName}</span>
                <Link
                  href={`/verse/${target?.surah}/${target?.ayah}`}
                  className="ml-auto text-muted hover:text-gold text-xs flex items-center gap-1 transition-colors"
                >
                  View full ↗
                </Link>
              </div>

              {ayahData ? (
                <>
                  <p
                    className="font-amiri-quran text-harf-text leading-loose text-right"
                    dir="rtl" lang="ar"
                    style={{ fontSize: '1.4rem' }}
                  >
                    {ayahData.arabic}
                  </p>
                  <p className="text-muted text-sm leading-relaxed">
                    {ayahData.english}
                  </p>
                </>
              ) : (
                <div className="space-y-2">
                  <div className="h-8 bg-surface-plus rounded animate-pulse" />
                  <div className="h-4 bg-surface-plus rounded w-3/4 animate-pulse" />
                </div>
              )}
            </div>

            <button
              onClick={loadNext}
              className="px-6 py-2.5 bg-gold text-bg rounded-xl text-sm font-semibold
                hover:bg-gold/90 transition-colors"
            >
              Next verse →
            </button>
          </div>
        )}
      </div>

      <p className="text-center text-muted/50 text-xs mt-6">
        Pool: Juz Amma (surahs 78–114) + your studied words&rsquo; example verses
      </p>
    </div>
  );
}
