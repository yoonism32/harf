'use client';

import { useEffect, useRef, useState } from 'react';
import { MasteryButtons } from './MasteryButtons';
import { MASTERY_LABELS, MASTERY_COLORS, type ResponseKey } from '@/lib/srs';
import type { WordProgress } from '@/lib/storage';
import { verseAudioUrl } from '@/lib/audio';

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
}

/** Strip diacritics + normalise all hamza/alef/ya variants for root matching */
function normAr(s: string): string {
  return s
    .replace(/([\u0621-\u06FF])[\u064B-\u0650\u0653-\u0655]*\u0651/g, '$1$1') // expand shadda: قَّ → قق
    .replace(/[\u064B-\u065F\u0670\u0640\u06D6-\u06EF]/g, '')
    .replace(/[أإآؤئءٱ\u0671]/g, 'ا')   // all alef/hamza variants + alef wasla
    .replace(/[ى\u06CC]/g, 'ي')          // alef maqsura + Farsi ya (U+06CC) → ya
    .replace(/ة/g, 'ه');
}

/**
 * Check whether the root letters appear as a subsequence inside the token.
 * Handles long vowels between root letters (e.g. كَافِر from root كفر).
 */
function tokenContainsRoot(token: string, rootLetters: string): boolean {
  const t = normAr(token);
  const r = normAr(rootLetters.replace(/\s+/g, ''));
  let ri = 0;
  for (let ti = 0; ti < t.length && ri < r.length; ti++) {
    const rl = r[ri]!;
    const tl = t[ti]!;
    // Exact match, or: final root letter is weak (و/ي) and surface shows ا or ي
    // e.g. root سمو → سماء (و→ا), root دعو → دعا (و→ا)
    //      root علو → العليّ (و→ي waw/ya interchange in defective roots)
    const isWeakFinal = ri === r.length - 1 && (
      ((rl === 'و' || rl === 'ي') && tl === 'ا') ||  // defective: surface alef (دعا، رمى)
      (rl === 'و' && tl === 'ي') ||                    // waw↔ya: علو→عليّ
      (rl === 'ي' && tl === 'و')                        // ya-defective plural: لقي→ألقوه، رمي→يرموه
    );
    // Hamzat al-wasl: root-initial ا is elided when the token has no ا at all
    // e.g. root اسم → بسم (ب + إسم, alef wasl dropped after prefix)
    const isWaslSkip = ri === 0 && rl === 'ا' && !t.includes('ا');
    if (tl === rl || isWeakFinal) ri++;
    else if (isWaslSkip) ri++; // skip the ا in root, stay on current token char (ti advances by loop)
  }
  return ri === r.length;
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
    const url = verseAudioUrl(ch!, vs!);
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
  wordKey,
}: FlashCardProps) {
  const [flipped, setFlipped] = useState(false);
  const mastery = progress?.mastery ?? 0;

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
        onKeyDown={e => e.key === 'Enter' || e.key === ' ' ? (!flipped && setFlipped(true)) : undefined}
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
            style={{ fontFamily: 'Amiri, serif' }}
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
                      <div className="font-amiri text-lg text-gold" lang="ar" style={{ fontFamily: 'Amiri, serif' }}>
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
                  className="font-amiri text-2xl mb-2"
                  dir="rtl"
                  lang="ar"
                  style={{ fontFamily: 'var(--font-amiri-quran), Amiri, serif', lineHeight: '2.2' }}
                >
                  {verse.arabic.split(' ').map((token, i) => (
                    <span key={i} className={tokenContainsRoot(token, word.root) ? 'text-gold' : 'text-harf-text'}>
                      {token}{' '}
                    </span>
                  ))}
                </div>
                {verse.english && (
                  <div className="text-muted text-sm italic">{verse.english}</div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mastery indicator */}
      <div className="flex items-center justify-center gap-2">
        <span className="text-muted text-sm">Current mastery:</span>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map(level => (
            <div
              key={level}
              className={`mastery-dot ${level <= mastery ? MASTERY_COLORS[mastery] : 'bg-border'}`}
            />
          ))}
        </div>
        <span className="text-muted text-sm">{MASTERY_LABELS[mastery]}</span>
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
