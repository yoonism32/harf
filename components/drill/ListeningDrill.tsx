'use client';

// B2: Listening Drill
// Play a verse audio clip → guess the surah:ayah reference.
// Pool: Juz Amma (surahs 78-114) + example verses from studied words.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { RECITERS, RECITER_STORAGE_KEY, DEFAULT_RECITER_ID } from '@/lib/audio';
import { fetchAyah, type AyahResponse } from '@/lib/quran-api';
import { getAllWordProgress } from '@/lib/storage';
import { reciterQuality } from '@/components/ReciterSelect';
import surahMetaRaw  from '@/data/quran-surah-meta.json';
import surahInfoRaw  from '@/data/surah-info.json';
import wordsRaw      from '@/data/words.json';
import juzDataRaw    from '@/data/quran-metadata-juz.json';

interface SurahMeta { id: number; name: string; arabic: string; verses: number; }
interface SurahInfo {
  id: number; name: string; nameArabic: string; translation: string;
  verses: number; revelationPlace: string; chronologicalOrder: number;
  juz: number[]; summary: string;
  themes?: string; context?: string; names?: string; virtue?: string;
  overview?: string[];
}

interface InfoHint { type: string; text: string; }

function buildHintPool(info: SurahInfo): InfoHint[] {
  const place = info.revelationPlace === 'makkah' ? 'Makkah'
    : info.revelationPlace === 'madinah' ? 'Madinah'
    : info.revelationPlace;
  const pool: InfoHint[] = [];
  if (place)        pool.push({ type: 'Revelation', text: `Revealed in ${place}` });
  if (info.themes)  pool.push({ type: 'Themes',     text: info.themes });
  if (info.context) pool.push({ type: 'Context',    text: info.context });
  if (info.names)   pool.push({ type: 'Names',      text: info.names });
  if (info.virtue)  pool.push({ type: 'Virtue',     text: info.virtue });
  for (const item of info.overview ?? []) pool.push({ type: 'Overview', text: item });
  return pool;
}
interface WordEntry  { id: string; example_verse: string; }
interface JuzEntry   { first_verse_key: string; last_verse_key: string; }

const surahMeta = surahMetaRaw as SurahMeta[];
const surahInfo = surahInfoRaw as Record<string, SurahInfo>;
const wordsData = wordsRaw as WordEntry[];
const juzData   = juzDataRaw as Record<string, JuzEntry>;

// ── Build verse pool ──────────────────────────────────────────────────────────

function buildJuzAmmaPool(): Array<{ surah: number; ayah: number }> {
  const pool: Array<{ surah: number; ayah: number }> = [];
  for (const s of surahMeta) {
    if (s.id < 78) continue;
    for (let a = 1; a <= s.verses; a++) pool.push({ surah: s.id, ayah: a });
  }
  return pool;
}
const JUZ_AMMA_POOL = buildJuzAmmaPool();

function buildVersePool(): Array<{ surah: number; ayah: number }> {
  const progress  = getAllWordProgress();
  const studiedIds = new Set(Object.keys(progress));
  const studiedVerses: Array<{ surah: number; ayah: number }> = [];
  for (const w of wordsData) {
    if (!studiedIds.has(w.id)) continue;
    const [s, a] = w.example_verse.split(':').map(Number);
    if (s && a) studiedVerses.push({ surah: s, ayah: a });
  }
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

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseAyatRange(s: string) {
  const m = s.trim().match(/^(\d+):(\d+)\s*[-–]\s*(\d+):(\d+)$/);
  if (!m) return null;
  const [, ss, sa, es, ea] = m.map(Number);
  if (!ss || !sa || !es || !ea || ss > 114 || es > 114) return null;
  return { start: { surah: ss, ayah: sa }, end: { surah: es, ayah: ea } };
}

function parseGuess(raw: string): { surah: number | null; ayah: number | null } {
  const trimmed = raw.trim().replace(/\s+/g, '');
  if (!trimmed) return { surah: null, ayah: null };
  if (trimmed.includes(':')) {
    const [sPart, aPart] = trimmed.split(':');
    const surah = parseInt(sPart ?? '', 10);
    const ayah  = aPart ? parseInt(aPart, 10) : null;
    return {
      surah: Number.isFinite(surah) && surah > 0 ? surah : null,
      ayah:  aPart && Number.isFinite(ayah!) && (ayah as number) > 0 ? (ayah as number) : null,
    };
  }
  const surah = parseInt(trimmed, 10);
  return { surah: Number.isFinite(surah) && surah > 0 ? surah : null, ayah: null };
}

// ── State machine ─────────────────────────────────────────────────────────────

type DrillState = 'ready' | 'playing' | 'answering' | 'ayah-retry' | 'revealed';

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5] as const;
type Speed = typeof SPEEDS[number];

// ── Pool label ────────────────────────────────────────────────────────────────

function buildPoolLabel(
  juzFilter: Set<number>,
  surahFilter: Set<number>,
  parsedAyatRange: ReturnType<typeof parseAyatRange>,
): string {
  const parts: string[] = [];
  if (juzFilter.size > 0) {
    const sorted = Array.from(juzFilter).sort((a, b) => a - b);
    parts.push(sorted.length === 1 ? `Juz ${sorted[0]}` : `Juz ${sorted.join(', ')}`);
  }
  if (surahFilter.size > 0) {
    const sorted = Array.from(surahFilter).sort((a, b) => a - b);
    if (sorted.length === 1) {
      const sm = surahMeta.find(s => s.id === sorted[0]);
      parts.push(`Surah ${sm?.name ?? sorted[0]}`);
    } else {
      parts.push(`${sorted.length} surahs`);
    }
  }
  if (parsedAyatRange) {
    const { start: s, end: e } = parsedAyatRange;
    parts.push(`${s.surah}:${s.ayah}–${e.surah}:${e.ayah}`);
  }
  return parts.length > 0 ? parts.join(' · ') : 'Juz Amma + studied words';
}

// ── HintPanel ─────────────────────────────────────────────────────────────────

function HintPanel({
  target,
  ayahData,
  hintsRevealed,
  onRevealHint,
  englishRevealed,
  onRevealEnglish,
  disabled,
  selectedHint,
}: {
  target: { surah: number; ayah: number };
  ayahData: AyahResponse | null;
  hintsRevealed: number;   // 0 = none, 1 = juz, 2 = range, 3 = info
  onRevealHint: (n: 1 | 2 | 3) => void;
  englishRevealed: boolean;
  onRevealEnglish: () => void;
  disabled: boolean;
  selectedHint: InfoHint | null;
}) {
  const info = surahInfo[String(target.surah)];
  const juzList  = info?.juz ?? [];
  const juzLabel = juzList.length === 1 ? `Juz ${juzList[0]}` : `Juz ${juzList.join(' & ')}`;

  const lo = Math.max(1,   target.surah - 5);
  const hi = Math.min(114, target.surah + 5);
  const rangeLabel = `Surah ${lo}–${hi}`;

  const btnBase = 'flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border';
  const btnActive = 'bg-gold/10 border-gold/30 text-gold';
  const btnIdle   = 'border-border text-muted hover:border-gold/40 hover:text-harf-text disabled:opacity-40 disabled:cursor-not-allowed';

  return (
    <div className="w-full flex flex-col gap-3 animate-fade-in">
      {/* Numbered hint buttons */}
      <div className="flex gap-2">
        {/* Hint 1 – Juz (free) */}
        <button
          disabled={disabled}
          onClick={() => hintsRevealed < 1 && onRevealHint(1)}
          className={`${btnBase} ${hintsRevealed >= 1 ? btnActive : btnIdle}`}
        >
          {hintsRevealed >= 1 ? juzLabel : 'Juz clue'}
        </button>

        {/* Hint 2 – Range (free) */}
        <button
          disabled={disabled || hintsRevealed < 1}
          onClick={() => hintsRevealed < 2 && onRevealHint(2)}
          className={`${btnBase} ${hintsRevealed >= 2 ? btnActive : btnIdle}`}
        >
          {hintsRevealed >= 2 ? rangeLabel : 'Range clue'}
        </button>

        {/* Hint 3 – Surah info (−1 pt) */}
        <button
          disabled={disabled || hintsRevealed < 2}
          onClick={() => hintsRevealed < 3 && onRevealHint(3)}
          className={`${btnBase} ${hintsRevealed >= 3 ? btnActive : btnIdle}`}
          title="Reveals surah info — costs 1 point"
        >
          {hintsRevealed >= 3 ? 'Info ✓' : 'Info −1pt'}
        </button>
      </div>

      {/* Surah info card — shown when hint 3 revealed */}
      {hintsRevealed >= 3 && selectedHint && (
        <div className="bg-surface-plus border border-gold/20 rounded-xl p-4 flex flex-col gap-2 text-xs animate-fade-in">
          <span className="text-[10px] font-mono uppercase tracking-wider text-gold/60">{selectedHint.type}</span>
          <p className="text-muted leading-relaxed">{selectedHint.text}</p>
        </div>
      )}

      {/* English translation hint (−1 pt) */}
      <button
        disabled={disabled}
        onClick={() => !englishRevealed && onRevealEnglish()}
        className={`w-full text-left px-3 py-2 rounded-lg text-xs border transition-colors
          ${englishRevealed
            ? 'border-gold/20 bg-surface-plus cursor-default'
            : 'border-border text-muted hover:border-gold/40 hover:text-harf-text disabled:opacity-40 disabled:cursor-not-allowed'
          }`}
        title="Shows English translation — costs 1 point"
      >
        {englishRevealed ? (
          <span className="text-muted leading-relaxed">
            {ayahData ? `"${ayahData.english}"` : 'Loading…'}
          </span>
        ) : (
          <span className="text-muted/60">Show English translation −1pt</span>
        )}
      </button>
    </div>
  );
}

// ── FilterPanel ───────────────────────────────────────────────────────────────

type FilterTab = 'juz' | 'surah' | 'range';

function FilterPanel({
  juzFilter, setJuzFilter,
  surahFilter, setSurahFilter,
  ayatRange, setAyatRange,
  parsedAyatRange,
}: {
  juzFilter: Set<number>;   setJuzFilter: React.Dispatch<React.SetStateAction<Set<number>>>;
  surahFilter: Set<number>; setSurahFilter: React.Dispatch<React.SetStateAction<Set<number>>>;
  ayatRange: string;        setAyatRange: React.Dispatch<React.SetStateAction<string>>;
  parsedAyatRange: ReturnType<typeof parseAyatRange>;
}) {
  const [activeTab, setActiveTab] = useState<FilterTab>('juz');
  const activeCount = juzFilter.size + surahFilter.size + (parsedAyatRange ? 1 : 0);

  const toggleJuz   = (n: number) => setJuzFilter(prev => { const s = new Set(prev); s.has(n) ? s.delete(n) : s.add(n); return s; });
  const toggleSurah = (n: number) => setSurahFilter(prev => { const s = new Set(prev); s.has(n) ? s.delete(n) : s.add(n); return s; });
  const clearAll = () => { setJuzFilter(new Set()); setSurahFilter(new Set()); setAyatRange(''); };

  const tabs: { id: FilterTab; label: string; hasActive: boolean }[] = [
    { id: 'juz',   label: 'JUZ',   hasActive: juzFilter.size > 0 },
    { id: 'surah', label: 'SURAH', hasActive: surahFilter.size > 0 },
    { id: 'range', label: 'RANGE', hasActive: !!parsedAyatRange },
  ];

  return (
    <div className="card overflow-hidden text-sm min-h-[360px] flex flex-col">
      <div className="flex border-b border-border bg-surface-plus/40">
        {tabs.map((tab, i) => {
          const isActive = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`relative flex-1 py-3 text-xs font-semibold tracking-widest uppercase transition-all
                ${i > 0 ? 'border-l border-border' : ''}
                ${isActive ? 'text-gold bg-gold/5' : tab.hasActive ? 'text-gold/50 hover:text-gold/70 hover:bg-surface' : 'text-muted hover:text-harf-text hover:bg-surface'}`}
              style={isActive ? { textShadow: '0 0 10px var(--color-gold)' } : undefined}
            >
              {tab.label}
              {isActive && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gold" style={{ boxShadow: '0 0 6px var(--color-gold)' }} />}
              {!isActive && tab.hasActive && <span className="absolute top-1.5 right-1.5 w-1 h-1 rounded-full bg-gold/60" />}
            </button>
          );
        })}
      </div>

      <div className="p-4 flex-1 flex flex-col">
        {activeTab === 'juz' && (
          <div className="flex-1 flex items-center">
            <div className="grid grid-cols-5 gap-2 py-2 w-full">
              {Array.from({ length: 30 }, (_, i) => i + 1).map(n => (
                <button key={n} onClick={() => toggleJuz(n)}
                  className={`rounded py-2 text-sm tabular-nums transition-all
                    ${juzFilter.has(n) ? 'bg-gold text-bg font-semibold' : 'border border-border text-muted hover:border-gold/50 hover:text-gold'}`}
                  style={juzFilter.has(n) ? { boxShadow: '0 0 8px var(--color-gold)' } : undefined}>
                  {n}
                </button>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'surah' && (
          <div className="max-h-80 overflow-y-auto flex flex-col gap-1 -mx-1 px-1">
            {surahMeta.map(s => (
              <button key={s.id} onClick={() => toggleSurah(s.id)}
                className={`w-full text-left px-2 py-2 rounded-lg flex items-center gap-2 transition-colors
                  ${surahFilter.has(s.id) ? 'bg-gold/10 text-gold' : 'text-muted hover:bg-surface hover:text-harf-text'}`}>
                <span className="font-mono text-xs w-5 text-right flex-shrink-0">{s.id}</span>
                <span className="truncate flex-1">{s.name}</span>
                <span className="text-xs opacity-40 flex-shrink-0">{s.verses}</span>
              </button>
            ))}
          </div>
        )}

        {activeTab === 'range' && (
          <div className="space-y-3">
            <input type="text" value={ayatRange} onChange={e => setAyatRange(e.target.value)}
              placeholder="1:1 – 2:141"
              className={`w-full px-3 py-2 rounded-lg bg-surface border text-harf-text text-xs
                placeholder:text-muted/40 focus:outline-none transition-colors
                ${ayatRange && !parsedAyatRange ? 'border-red-500/50' : ayatRange && parsedAyatRange ? 'border-green/50' : 'border-border focus:border-gold/50'}`}
              autoComplete="off" spellCheck={false} />
            {ayatRange && !parsedAyatRange && <p className="text-xs text-red-400 mt-1.5">Format: surah:ayah – surah:ayah</p>}
            {ayatRange && parsedAyatRange  && <p className="text-xs text-green/70 mt-1.5">Valid range</p>}
            {!ayatRange && <p className="text-[11px] text-muted/70">Tip: use an en dash like "1:1 – 2:141"</p>}
          </div>
        )}
      </div>

      {activeCount > 0 && (
        <div className="px-4 pb-3 border-t border-border pt-3">
          <button onClick={clearAll} className="text-xs text-muted hover:text-gold transition-colors">
            Reset ({activeCount})
          </button>
        </div>
      )}
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ListeningDrill() {
  const [target,     setTarget]     = useState<{ surah: number; ayah: number } | null>(null);
  const [drillState, setDrillState] = useState<DrillState>('ready');
  const [guess,      setGuess]      = useState('');
  const [ayahRetry,  setAyahRetry]  = useState('');
  const [surahOk,    setSurahOk]    = useState<boolean | null>(null);
  const [ayahOk,     setAyahOk]     = useState<boolean | null>(null);
  const [ayahData,   setAyahData]   = useState<AyahResponse | null>(null);
  const [playCount,  setPlayCount]  = useState(0);

  // Session score
  const [score,     setScore]     = useState(0);
  const [roundPts,  setRoundPts]  = useState<number | null>(null);

  // Hints
  const [hintsRevealed,   setHintsRevealed]   = useState(0);   // 0–3
  const [englishRevealed, setEnglishRevealed] = useState(false);
  const [hintPenalty,     setHintPenalty]     = useState(0);
  const [showHints,       setShowHints]       = useState(false);
  const [selectedHint,    setSelectedHint]    = useState<InfoHint | null>(null);

  // Settings
  const [speed,        setSpeed]        = useState<Speed>(1);
  const [reciterId,    setReciterId]    = useState(DEFAULT_RECITER_ID);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsView, setSettingsView] = useState<'root' | 'speed' | 'reciter'>('root');

  // Filters
  const [juzFilter,   setJuzFilter]   = useState<Set<number>>(new Set());
  const [surahFilter, setSurahFilter] = useState<Set<number>>(new Set());
  const [ayatRange,   setAyatRange]   = useState('');

  const audioRef     = useRef<HTMLAudioElement | null>(null);
  const inputRef     = useRef<HTMLInputElement>(null);
  const ayahInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem(RECITER_STORAGE_KEY);
    if (stored && RECITERS.some(r => r.id === stored)) setReciterId(stored);
  }, []);

  const parsedAyatRange = useMemo(() => parseAyatRange(ayatRange), [ayatRange]);

  const pool = useMemo(() => {
    const hasJuz   = juzFilter.size > 0;
    const hasSurah = surahFilter.size > 0;
    const hasAyat  = parsedAyatRange !== null;
    if (!hasJuz && !hasSurah && !hasAyat) return buildVersePool();

    const seen = new Set<string>();
    const result: Array<{ surah: number; ayah: number }> = [];
    const add = (s: number, a: number) => { const k = `${s}:${a}`; if (!seen.has(k)) { seen.add(k); result.push({ surah: s, ayah: a }); } };
    const vk  = (s: number, a: number) => s * 1000 + a;

    if (hasJuz) {
      for (const j of juzFilter) {
        const entry = juzData[String(j)];
        if (!entry) continue;
        const [fs, fa] = entry.first_verse_key.split(':').map(Number) as [number, number];
        const [ls, la] = entry.last_verse_key.split(':').map(Number) as [number, number];
        const lo = vk(fs, fa), hi = vk(ls, la);
        for (const sm of surahMeta) for (let a = 1; a <= sm.verses; a++) if (vk(sm.id, a) >= lo && vk(sm.id, a) <= hi) add(sm.id, a);
      }
    }
    if (hasSurah) {
      for (const sId of surahFilter) {
        const sm = surahMeta.find(s => s.id === sId);
        if (sm) for (let a = 1; a <= sm.verses; a++) add(sId, a);
      }
    }
    if (hasAyat) {
      const lo = vk(parsedAyatRange!.start.surah, parsedAyatRange!.start.ayah);
      const hi = vk(parsedAyatRange!.end.surah,   parsedAyatRange!.end.ayah);
      for (const sm of surahMeta) for (let a = 1; a <= sm.verses; a++) if (vk(sm.id, a) >= lo && vk(sm.id, a) <= hi) add(sm.id, a);
    }
    return result.length > 0 ? result : buildVersePool();
  }, [juzFilter, surahFilter, parsedAyatRange]);

  const poolRef = useRef(pool);
  useEffect(() => { poolRef.current = pool; }, [pool]);

  const loadNext = useCallback(() => {
    const v = pickRandom(poolRef.current);
    setTarget(v);
    setDrillState('ready');
    setGuess('');
    setAyahRetry('');
    setSurahOk(null);
    setAyahOk(null);
    setAyahData(null);
    setPlayCount(0);
    setRoundPts(null);
    setHintsRevealed(0);
    setEnglishRevealed(false);
    setHintPenalty(0);
    setShowHints(false);
    setSelectedHint(null);
    audioRef.current?.pause();
  }, []);

  useEffect(() => { audioRef.current?.pause(); loadNext(); }, [pool, loadNext]);

  const playAudio = useCallback(() => {
    if (!target) return;
    audioRef.current?.pause();
    const reciter = RECITERS.find(r => r.id === reciterId);
    const base = reciter?.url ?? `https://everyayah.com/data/${reciterId}`;
    const file = `${String(target.surah).padStart(3, '0')}${String(target.ayah).padStart(3, '0')}.mp3`;
    const audio = new Audio(`${base}/${file}`);
    audio.playbackRate = speed;
    audioRef.current  = audio;
    setDrillState('playing');
    setPlayCount(c => c + 1);
    audio.onended = () => setDrillState('answering');
    audio.onerror = () => setDrillState('answering');
    audio.play().catch(() => setDrillState('answering'));
  }, [target, speed, reciterId]);

  // Prefetch ayah data once answering starts (needed for English hint)
  useEffect(() => {
    if (drillState === 'answering' && target && !ayahData) {
      fetchAyah(`${target.surah}:${target.ayah}`).then(d => { if (d) setAyahData(d); });
    }
  }, [drillState, target, ayahData]);

  // ── Hint handlers ──────────────────────────────────────────────────────────
  const handleRevealHint = (n: 1 | 2 | 3) => {
    if (n > hintsRevealed + 1) return;          // must be sequential
    setHintsRevealed(n);
    if (n === 3) {
      const info = target ? surahInfo[String(target.surah)] : undefined;
      if (info) {
        const hintPool = buildHintPool(info);
        setSelectedHint(hintPool.length > 0 ? pickRandom(hintPool) : null);
      }
      setHintPenalty(p => p + 1);               // info clue costs 1 pt
    }
  };

  const handleRevealEnglish = () => {
    setEnglishRevealed(true);
    setHintPenalty(p => p + 1);
  };

  // ── First check ────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(() => {
    if (!target || drillState !== 'answering') return;
    const { surah: gs, ayah: ga } = parseGuess(guess);
    const surahMatch = gs === target.surah;
    const ayahMatch  = ga === target.ayah;
    setSurahOk(surahMatch);

    if (!surahMatch) {
      setAyahOk(false);
      const pts = Math.max(0, 0 - hintPenalty);
      setRoundPts(pts);
      // no score added — wrong surah
      setDrillState('revealed');
      // ayahData may already be loaded from prefetch; fetch if not
      if (!ayahData) fetchAyah(`${target.surah}:${target.ayah}`).then(d => setAyahData(d));
      return;
    }

    if (ayahMatch) {
      // Perfect first try: 3 pts minus penalty
      const pts = Math.max(0, 3 - hintPenalty);
      setAyahOk(true);
      setRoundPts(pts);
      setScore(s => s + pts);
      setDrillState('revealed');
      if (!ayahData) fetchAyah(`${target.surah}:${target.ayah}`).then(d => setAyahData(d));
      return;
    }

    // Surah correct, ayah wrong/missing → second chance
    setDrillState('ayah-retry');
  }, [target, drillState, guess, hintPenalty, ayahData]);

  // ── Ayah retry ─────────────────────────────────────────────────────────────
  const handleAyahRetry = useCallback(() => {
    if (!target || drillState !== 'ayah-retry') return;
    const ayahNum = parseInt(ayahRetry.trim(), 10);
    const matched = Number.isFinite(ayahNum) && ayahNum === target.ayah;
    setAyahOk(matched);
    // Surah correct (+2), ayah retry correct (+1) → 3 pts; ayah wrong → 2 pts; minus penalty
    const base = matched ? 3 : 2;
    const pts  = Math.max(0, base - hintPenalty);
    setRoundPts(pts);
    setScore(s => s + pts);
    setDrillState('revealed');
    if (!ayahData) fetchAyah(`${target.surah}:${target.ayah}`).then(d => setAyahData(d));
  }, [target, drillState, ayahRetry, hintPenalty, ayahData]);

  useEffect(() => {
    if (drillState === 'answering') requestAnimationFrame(() => inputRef.current?.focus());
  }, [drillState]);

  useEffect(() => {
    if (drillState === 'ayah-retry') requestAnimationFrame(() => ayahInputRef.current?.focus());
  }, [drillState]);

  const handleSelectReciter = (id: string) => { setReciterId(id); localStorage.setItem(RECITER_STORAGE_KEY, id); setSettingsView('root'); };
  const handleSelectSpeed   = (s: Speed)   => { if (audioRef.current) audioRef.current.playbackRate = s; setSpeed(s); setSettingsView('root'); };

  const currentReciterLabel = RECITERS.find(r => r.id === reciterId)?.label ?? reciterId;
  const surahName = target ? surahMeta[target.surah - 1]?.name : '';

  const resultLabel = (() => {
    if (drillState !== 'revealed') return null;
    if (surahOk && ayahOk)  return { text: `Perfect! +${roundPts} pts`, color: 'text-green border-green/30 bg-green/10' };
    if (surahOk && !ayahOk) return { text: `Surah ✓, wrong verse — ${target?.surah}:${target?.ayah}${roundPts ? `  +${roundPts} pts` : ''}`, color: 'text-amber-400 border-amber-400/30 bg-amber-400/10' };
    return { text: `✗ It was ${target?.surah}:${target?.ayah} — ${surahName}`, color: 'text-red-400 border-red-500/30 bg-red-500/10' };
  })();

  const isAnswering = drillState === 'answering' || drillState === 'ayah-retry';

  return (
    <div className="w-full px-4 py-8 animate-fade-in">
      <div className="grid items-start gap-12 2xl:grid-cols-[minmax(0,1fr)_minmax(0,42rem)_minmax(0,1fr)]">

        {/* ── Main drill column ── */}
        <div className="w-full max-w-2xl min-w-0 2xl:col-start-2 2xl:justify-self-center">

          {/* Title + score */}
          <div className="text-center mb-10 relative">
            <h1 className="text-4xl text-gold mb-2" style={{ fontFamily: 'Amiri, serif' }}>
              سماع · Drill
            </h1>
            <p className="text-muted text-sm">Listen to the recitation — name the verse</p>
            <div className="absolute right-0 top-0 flex flex-col items-end">
              <span className="text-gold text-2xl font-bold tabular-nums leading-none">{score}</span>
              <span className="text-muted text-xs">pts</span>
            </div>
          </div>

          <div className="card p-8 flex flex-col items-center gap-8">

            {/* ── Play area ── */}
            <div className="flex flex-col items-center gap-4 w-full">
              <div className="relative flex items-center justify-center w-full">
                {/* Play button */}
                <button
                  onClick={playAudio}
                  disabled={!target}
                  aria-label={playCount === 0 ? 'Play verse' : 'Replay verse'}
                  className={`w-20 h-20 rounded-full flex items-center justify-center border-2 transition-all duration-200
                    ${drillState === 'playing'
                      ? 'border-gold bg-gold/10 text-gold hover:bg-gold/15 cursor-pointer'
                      : 'border-border hover:border-gold hover:bg-gold/5 text-muted hover:text-gold cursor-pointer'
                    }`}
                >
                  {drillState === 'playing' ? (
                    <span className="flex gap-1 items-end h-6">
                      {[0, 150, 300].map(delay => (
                        <span key={delay} className="w-1.5 bg-gold rounded animate-bounce"
                          style={{ height: '60%', animationDelay: `${delay}ms` }} />
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
                  className={`absolute right-0 p-2 rounded-lg transition-colors
                    ${settingsOpen ? 'text-gold bg-gold/10' : 'text-muted hover:text-harf-text hover:bg-surface-plus'}`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.43l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                  </svg>
                </button>
              </div>

              {/* Replay */}
              {playCount > 0 && drillState !== 'playing' && drillState !== 'ready' && (
                <button onClick={playAudio} className="text-xs text-muted hover:text-gold transition-colors flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Replay
                </button>
              )}

              {/* Settings panel */}
              {settingsOpen && (
                <div className="w-full rounded-xl border border-border bg-surface-plus text-sm animate-fade-in overflow-hidden">
                  {settingsView === 'root' && (
                    <div className="flex divide-x divide-border">
                      <button onClick={() => setSettingsView('speed')} className="flex-1 flex flex-col items-center gap-1 py-3 px-4 hover:bg-surface transition-colors">
                        <span className="text-gold font-semibold tabular-nums">{speed}×</span>
                        <span className="text-muted text-xs">Speed</span>
                      </button>
                      <button onClick={() => setSettingsView('reciter')} className="flex-1 flex flex-col items-center gap-1 py-3 px-4 hover:bg-surface transition-colors">
                        <span className="text-harf-text font-medium truncate max-w-[140px] text-xs text-center leading-tight">{currentReciterLabel}</span>
                        <span className="text-muted text-xs">Reciter</span>
                      </button>
                    </div>
                  )}
                  {settingsView === 'speed' && (
                    <div className="p-3">
                      <div className="flex items-center gap-2 mb-3">
                        <button onClick={() => setSettingsView('root')} className="text-muted hover:text-harf-text transition-colors" aria-label="Back">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>
                        </button>
                        <span className="text-harf-text font-medium">Playback Speed</span>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {SPEEDS.map(s => (
                          <button key={s} onClick={() => handleSelectSpeed(s)}
                            className={`px-3 py-1.5 rounded-lg font-mono text-sm transition-colors
                              ${speed === s ? 'bg-gold text-bg font-semibold' : 'border border-border text-muted hover:border-gold/50 hover:text-gold'}`}>
                            {s}×
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {settingsView === 'reciter' && (
                    <div className="p-3">
                      <div className="flex items-center gap-2 mb-3">
                        <button onClick={() => setSettingsView('root')} className="text-muted hover:text-harf-text transition-colors" aria-label="Back">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>
                        </button>
                        <span className="text-harf-text font-medium">Reciter</span>
                      </div>
                      <div className="max-h-52 overflow-y-auto flex flex-col gap-0.5">
                        {RECITERS.map(r => {
                          const quality = reciterQuality(r.id);
                          return (
                            <button key={r.id} onClick={() => handleSelectReciter(r.id)}
                              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between gap-2
                                ${reciterId === r.id ? 'bg-gold/10 text-gold' : 'text-muted hover:bg-surface hover:text-harf-text'}`}>
                              <span className="truncate">{r.label}</span>
                              {quality && <span className={`text-[10px] font-mono shrink-0 ${reciterId === r.id ? 'text-gold/60' : 'text-muted/50'}`}>{quality}</span>}
                            </button>
                          );
                        })}
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

            {/* ── Answer inputs ── */}
            {(drillState === 'answering' || drillState === 'ayah-retry' || drillState === 'revealed' || (drillState === 'playing' && playCount > 1)) && (
              <div className="w-full flex flex-col items-center gap-4 animate-fade-in">

                {/* Main guess row */}
                <div className="flex gap-3 w-full max-w-xs items-center">
                  {surahOk !== null && (
                    <span className={`text-lg font-bold shrink-0 ${surahOk ? 'text-green' : 'text-red-400'}`}>
                      {surahOk ? '✓' : '✗'}
                    </span>
                  )}
                  <input
                    ref={inputRef}
                    value={guess}
                    onChange={e => setGuess(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
                    placeholder="surah:ayah  e.g. 112:1"
                    disabled={drillState !== 'answering'}
                    className={`flex-1 px-4 py-2.5 rounded-xl text-sm bg-surface-plus border text-harf-text placeholder:text-muted/50 focus:outline-none transition-colors
                      ${drillState !== 'answering'
                        ? surahOk ? 'border-green/40 opacity-60' : 'border-red-500/40 opacity-60'
                        : 'border-border focus:border-gold/60'}`}
                    autoComplete="off" spellCheck={false}
                  />
                  {drillState === 'answering' && (
                    <button onClick={handleSubmit} disabled={!guess.trim()}
                      className="px-4 py-2.5 bg-gold text-bg rounded-xl text-sm font-semibold hover:bg-gold/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                      Check
                    </button>
                  )}
                </div>

                {/* Ayah retry row */}
                {(drillState === 'ayah-retry' || (drillState === 'revealed' && surahOk && ayahOk === false)) && (
                  <div className="flex gap-3 w-full max-w-xs items-center animate-fade-in">
                    {/* spacer to align under tick */}
                    <span className="text-lg shrink-0 opacity-0" aria-hidden="true">✓</span>
                    {ayahOk !== null
                      ? <span className={`text-lg font-bold shrink-0 ${ayahOk ? 'text-green' : 'text-red-400'}`}>{ayahOk ? '✓' : '✗'}</span>
                      : <span className="text-lg shrink-0 text-muted/30">·</span>
                    }
                    <input
                      ref={ayahInputRef}
                      value={ayahRetry}
                      onChange={e => setAyahRetry(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleAyahRetry(); }}
                      placeholder="Verse number  e.g. 255"
                      disabled={drillState === 'revealed'}
                      className={`flex-1 px-4 py-2.5 rounded-xl text-sm bg-surface-plus border text-harf-text placeholder:text-muted/50 focus:outline-none transition-colors
                        ${drillState === 'revealed'
                          ? ayahOk ? 'border-green/40 opacity-60' : 'border-red-500/40 opacity-60'
                          : 'border-gold/40 focus:border-gold/70'}`}
                      autoComplete="off" spellCheck={false}
                    />
                    {drillState === 'ayah-retry' && (
                      <button onClick={handleAyahRetry} disabled={!ayahRetry.trim()}
                        className="px-4 py-2.5 bg-gold text-bg rounded-xl text-sm font-semibold hover:bg-gold/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                        Check
                      </button>
                    )}
                  </div>
                )}

                {/* ── Hints toggle ── */}
                {target && (isAnswering || drillState === 'playing') && (
                  <div className="w-full max-w-xs">
                    <button
                      onClick={() => setShowHints(h => !h)}
                      className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs transition-colors border
                        ${showHints ? 'border-gold/20 text-gold/70 bg-gold/5' : 'border-border text-muted/60 hover:text-muted hover:border-border/80'}`}
                    >
                      <span>Hints {hintsRevealed > 0 || englishRevealed ? `· ${hintsRevealed}/3${englishRevealed ? ' + english' : ''}` : ''}</span>
                      <span className="text-[10px]">{showHints ? '▲' : '▼'}</span>
                    </button>

                    {showHints && (
                      <div className="mt-2">
                        <HintPanel
                          target={target}
                          ayahData={ayahData}
                          hintsRevealed={hintsRevealed}
                          onRevealHint={handleRevealHint}
                          englishRevealed={englishRevealed}
                          onRevealEnglish={handleRevealEnglish}
                          disabled={!isAnswering}
                          selectedHint={selectedHint}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── Result ── */}
            {drillState === 'revealed' && resultLabel && (
              <div className="w-full flex flex-col items-center gap-5 animate-fade-in">
                <div className={`text-sm font-semibold px-4 py-2 rounded-lg border ${resultLabel.color}`}>
                  {resultLabel.text}
                </div>

                <div className="w-full card p-5 flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-gold font-mono text-sm tabular-nums">{target?.surah}:{target?.ayah}</span>
                    <span className="text-muted text-xs">{surahName}</span>
                    <Link href={`/verse/${target?.surah}/${target?.ayah}`}
                      className="ml-auto text-muted hover:text-gold text-xs flex items-center gap-1 transition-colors">
                      View full ↗
                    </Link>
                  </div>

                  {ayahData ? (
                    <>
                      <p className="font-amiri-quran text-harf-text leading-loose text-right"
                        dir="rtl" lang="ar" style={{ fontSize: '1.4rem' }}>
                        {ayahData.arabic}
                      </p>
                      <p className="text-muted text-sm leading-relaxed">{ayahData.english}</p>
                    </>
                  ) : (
                    <div className="space-y-2">
                      <div className="h-8 bg-surface-plus rounded animate-pulse" />
                      <div className="h-4 bg-surface-plus rounded w-3/4 animate-pulse" />
                    </div>
                  )}
                </div>

                <button onClick={loadNext}
                  className="px-6 py-2.5 bg-gold text-bg rounded-xl text-sm font-semibold hover:bg-gold/90 transition-colors">
                  Next verse →
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Filter panel — right on 2xl */}
        <div className="hidden 2xl:block w-80 flex-shrink-0 2xl:col-start-3 2xl:justify-self-start">
          <FilterPanel juzFilter={juzFilter} setJuzFilter={setJuzFilter}
            surahFilter={surahFilter} setSurahFilter={setSurahFilter}
            ayatRange={ayatRange} setAyatRange={setAyatRange}
            parsedAyatRange={parsedAyatRange} />
        </div>
      </div>

      {/* Filter panel stacked below on smaller screens */}
      <div className="2xl:hidden mt-6 max-w-2xl mx-auto">
        <FilterPanel juzFilter={juzFilter} setJuzFilter={setJuzFilter}
          surahFilter={surahFilter} setSurahFilter={setSurahFilter}
          ayatRange={ayatRange} setAyatRange={setAyatRange}
          parsedAyatRange={parsedAyatRange} />
      </div>

      <p className="text-center text-muted/50 text-xs mt-6">
        Pool: {pool.length} verse{pool.length !== 1 ? 's' : ''} · {buildPoolLabel(juzFilter, surahFilter, parsedAyatRange)}
      </p>
    </div>
  );
}
