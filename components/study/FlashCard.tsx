'use client';

import { useState } from 'react';
import { AudioButton } from './AudioButton';
import { MasteryButtons } from './MasteryButtons';
import { MASTERY_LABELS, MASTERY_COLORS, type ResponseKey } from '@/lib/srs';
import type { WordProgress } from '@/lib/storage';

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
}

export function FlashCard({
  word,
  progress,
  onResponse,
  verse,
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
      <button
        className="card min-h-64 w-full flex flex-col items-center justify-center gap-4 p-8 cursor-pointer select-none relative overflow-hidden text-left focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none"
        onClick={() => !flipped && setFlipped(true)}
        onKeyDown={e => e.key === 'Enter' || e.key === ' ' ? (!flipped && setFlipped(true)) : null}
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

        <AudioButton text={word.arabic} />

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
                <div className="text-muted text-xs uppercase tracking-wider mb-2">
                  Example — {verse.ref}
                </div>
                <div
                  className="font-amiri text-2xl text-harf-text leading-relaxed mb-2"
                  dir="rtl"
                  lang="ar"
                  style={{ fontFamily: 'Amiri, serif' }}
                >
                  {verse.arabic}
                </div>
                {verse.english && (
                  <div className="text-muted text-sm italic">{verse.english}</div>
                )}
              </div>
            )}
          </div>
        )}
      </button>

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
