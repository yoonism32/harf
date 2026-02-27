'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { MasteryButtons } from './MasteryButtons';
import { MASTERY_LABELS, MASTERY_COLORS, type ResponseKey } from '@/lib/srs';
import type { WordProgress } from '@/lib/storage';
import { verseAudioUrl } from '@/lib/audio';
import { tokenContainsRoot } from '@/lib/arabic';

interface WordData {
  id: string;
  root: string;
  arabic: string;
  transliteration: string;
  meanings: string[];
  derivatives: Array<{ form: string; meaning: string }>;
}

interface Verse {
  arabic: string;
  english: string;
  ref: string;
}

interface FlashCardProps {
  word: WordData;
  progress: WordProgress | null;
  onResponse: (key: ResponseKey) => void;
  verse?: Verse;
  wordKey?: string;
  wordGloss?: string;
  /** Exact 1-based word positions in the verse that belong to this root (from WBW morphology data) */
  verseMatchIndices?: number[];
  /** WBW English glosses keyed by word position — used to highlight the English translation */
  verseMatchGlosses?: Record<number, string>;
}

const ENGLISH_STOP = new Set([
  // Pronouns & determiners
  'i','he','she','they','we','you','it','his','her','their','our','its','my','your',
  'a','an','the','of','to','in','from','for','with','at','by','on','as',
  'into','upon','and','or','but','not','no','so','that','which','who','this','these','those',
  'all','every','each','both','one','two','what','then','when','there','here',
  // Copula & auxiliaries — too common to be meaningful keywords
  'is','are','was','were','be','been','being','am',
  'have','has','had','do','does','did',
  'will','shall','may','might','must','can','could','would','should',
]);

/**
 * Strip common English suffixes to get a stem for prefix matching.
 * Returns the original word if stripping would leave fewer than 4 chars.
 */
function extractStem(word: string): string {
  const suffixes = ['ation','tion','ness','ment','ing','est','ed','er','ly','s'];
  for (const sfx of suffixes) {
    if (word.endsWith(sfx) && word.length - sfx.length >= 4) {
      return word.slice(0, word.length - sfx.length);
    }
  }
  return word;
}

/**
 * Highlight words from WBW match glosses inside the full English translation.
 * Uses exact glosses of each matched Arabic word position — far more reliable
 * than the word being studied's general meaning.
 * Stem-prefix matching handles morphological variation (nearer ↔ nearest, etc.)
 */
/**
 * totalArabicMatches = number of highlighted Arabic positions in the verse.
 * Used as the per-stem highlight quota so that partial WBW gloss coverage
 * (some positions lack an English gloss) doesn't under-count the quota.
 */
function highlightEnglish(
  english: string,
  matchGlosses: Record<number, string>,
  totalArabicMatches: number,
): React.ReactNode {
  const stems = new Set<string>();
  for (const gloss of Object.values(matchGlosses)) {
    gloss.replace(/\([^)]*\)/g, '')
      .toLowerCase()
      .split(/[\s/,;()+\-]+/)
      .map(w => w.replace(/[^a-z']/g, ''))
      .filter(w => w.length > 2 && !ENGLISH_STOP.has(w))
      .map(extractStem)
      .filter(s => s.length >= 4)
      .forEach(s => stems.add(s));
  }
  if (stems.size === 0) return english;

  // Sort longer stems first to avoid prefix ambiguity in alternation
  const sortedStems = [...stems].sort((a, b) => b.length - a.length);
  const escaped = sortedStems.map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const pattern = new RegExp(`\\b(${escaped.join('|')})[a-z]*\\b`, 'gi');

  // Quota = total Arabic positions (not gloss count), so partial WBW coverage doesn't under-cap
  const used = new Map<string, number>();
  const parts: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = pattern.exec(english)) !== null) {
    const stem = m[1]!.toLowerCase();
    const usedCount = used.get(stem) ?? 0;
    if (usedCount >= totalArabicMatches) continue; // quota exhausted — leave this occurrence un-highlighted
    used.set(stem, usedCount + 1);
    if (m.index > last) parts.push(english.slice(last, m.index));
    parts.push(
      <span key={m.index} className="text-gold/90 font-medium not-italic">{m[0]}</span>
    );
    last = m.index + m[0].length;
  }
  if (last < english.length) parts.push(english.slice(last));
  return parts.length ? parts : english;
}

function VersePlayButton({ verseRef }: { verseRef: string }) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Stop audio whenever this button unmounts — any mastery response hides the card back
  useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  const play = (e: React.MouseEvent) => {
    e.stopPropagation(); // don't flip the card
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; }
    const [ch, vs] = verseRef.split(':');
    if (!ch || !vs) return; // guard against malformed verseRef
    const url = verseAudioUrl(ch, vs);
    const audio = new Audio(url);
    audioRef.current = audio;
    audio.onplay = () => setPlaying(true);
    audio.onended = () => setPlaying(false);
    audio.onerror = () => setPlaying(false);
    audio.play().catch(() => setPlaying(false));
  };

  return (
    <button
      onClick={play}
      aria-label={playing ? 'Playing' : 'Play verse'}
      className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs transition-colors
        ${playing ? 'text-gold' : 'text-muted hover:text-gold'}`}
    >
      {playing ? (
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
  );
}

export function FlashCard({
  word,
  progress,
  onResponse,
  verse,
  verseMatchIndices,
  verseMatchGlosses,
}: FlashCardProps) {
  const [flipped, setFlipped] = useState(false);
  const mastery = progress?.mastery ?? 0;

  // Highlight matched root words in the English translation using WBW glosses
  const highlightedEnglish = useMemo(
    () => (verse?.english && verseMatchGlosses)
      ? highlightEnglish(
          verse.english,
          verseMatchGlosses,
          verseMatchIndices?.length ?? Object.keys(verseMatchGlosses).length,
        )
      : verse?.english,
    [verse?.english, verseMatchGlosses, verseMatchIndices]
  );

  // Prefer exact morphological positions; fall back to fuzzy root matching only when unavailable
  const tokenMatches = useMemo(() => {
    const words = verse?.arabic.split(' ') ?? [];
    if (verseMatchIndices && verseMatchIndices.length > 0) {
      return words.map((_, i) => verseMatchIndices.includes(i + 1));
    }
    return words.map(t => tokenContainsRoot(t, word.root));
  }, [verse?.arabic, word.root, verseMatchIndices]);

  const handleResponse = (key: ResponseKey) => {
    onResponse(key);
    setFlipped(false);
  };

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-6">
      {/* Screen reader live region — announces card state changes */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {flipped
          ? `Card revealed: ${word.meanings.join(', ')}`
          : `Studying: ${word.transliteration}`}
      </div>
      {/* Card */}
      <div
        role="button"
        tabIndex={0}
        className="card min-h-64 w-full flex flex-col items-center justify-center gap-4 p-8 cursor-pointer select-none relative overflow-hidden text-left focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none"
        onClick={() => !flipped && setFlipped(true)}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault(); // prevent page scroll on Space
            if (!flipped) setFlipped(true);
          }
        }}
        aria-label={flipped ? 'Card revealed' : 'Tap to reveal meaning'}
        style={{ borderColor: flipped ? 'var(--gold)' : 'var(--border)' }}
      >
        {/* Gold shimmer on flip */}
        {flipped && (
          <div className="absolute inset-0 bg-gradient-to-br from-gold/5 to-transparent pointer-events-none" />
        )}

        {/* Arabic word */}
        <div className="text-center" dir="rtl">
          <div
            className="font-amiri text-6xl leading-tight text-harf-text"
            lang="ar"
          >
            {word.arabic}
          </div>
          <div className="text-muted text-lg mt-2 font-rubik" dir="ltr">
            <span lang="ar">{word.root}</span> • {word.transliteration}
          </div>
        </div>

        {!flipped && (
          <div className="text-muted text-sm mt-4 animate-pulse">
            Tap to reveal meaning
          </div>
        )}

        {/* Back of card — slide-up reveal (Disney slow-out principle) */}
        {flipped && (
          <div className="w-full mt-2 flex flex-col gap-5 border-t border-border pt-5 animate-card-reveal">
            {/* Meanings */}
            <div className="text-center">
              <div className="text-harf-text text-xl font-medium">
                {word.meanings.join(' • ')}
              </div>
            </div>

            {/* Derivatives */}
            {word.derivatives.length > 0 && (
              <div className="flex flex-col gap-2">
                <div className="text-muted text-xs uppercase tracking-wider">Derivatives</div>
                <div className="flex flex-wrap gap-2 justify-center" dir="rtl">
                  {word.derivatives.map((d, i) => (
                    <div key={i} className="bg-surface-plus rounded-lg px-3 py-1.5 text-center">
                      <div className="font-amiri text-lg text-gold" lang="ar">
                        {d.form}
                      </div>
                      <div className="text-muted text-xs mt-0.5" dir="ltr">
                        {d.meaning}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Verse example */}
            {verse?.arabic && (
              <div className="bg-surface-plus rounded-xl p-4 border border-border">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-muted text-xs uppercase tracking-wider">
                    Example — {verse.ref}
                  </div>
                  <VersePlayButton verseRef={verse.ref} />
                </div>
                <div
                  className="font-amiri-quran text-2xl mb-2 text-right"
                  dir="rtl"
                  lang="ar"
                  style={{ lineHeight: '2.2' }}
                >
                  {verse.arabic.split(' ').map((token, i) => {
                    const isMatch = tokenMatches[i] ?? false;
                    return (
                      <span key={i} className={isMatch ? 'text-gold' : 'text-harf-text'}>
                        {token}{' '}
                      </span>
                    );
                  })}
                </div>
                {verse.english && (
                  <div className="text-muted text-sm italic">{highlightedEnglish}</div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mastery indicator */}
      <div className="flex items-center justify-center gap-2">
        <span className="text-muted text-sm" aria-hidden="true">Current mastery:</span>
        <div
          className="flex gap-1"
          role="img"
          aria-label={`Mastery level ${mastery} of 5: ${MASTERY_LABELS[mastery]}`}
        >
          {[1, 2, 3, 4, 5].map(level => (
            <div
              key={level}
              className={`mastery-dot ${level <= mastery ? MASTERY_COLORS[mastery] : 'bg-border'}`}
            />
          ))}
        </div>
        <span className="text-muted text-sm" aria-hidden="true">{MASTERY_LABELS[mastery]}</span>
      </div>

      {/* Response buttons — only show after flip */}
      {flipped ? (
        <div className="flex flex-col gap-3 items-center">
          <div className="text-muted text-sm">How well did you know it?</div>
          <MasteryButtons onResponse={handleResponse} />
        </div>
      ) : (
        <div className="h-24" /> /* spacer */
      )}
    </div>
  );
}
