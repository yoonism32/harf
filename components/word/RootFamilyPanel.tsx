'use client';

import { useState } from 'react';

export interface MorphologyEntry {
  wordId: string;
  rootArabic: string;
  summary: string | null;
  rootFamily: string[];
  rootFamilyCount: number;
  rootFamilyWords?: Array<{ key: string; uthmani: string }>;
  verbForms: Record<string, string> | null;
}

interface Props {
  entry: MorphologyEntry | undefined;
}

/** Format a word key "2:255:3" → "2:255 · word 3" */
function formatKey(key: string): { ref: string; word: string } {
  const [ch, vs, w] = key.split(':');
  return { ref: `${ch}:${vs}`, word: w ?? '1' };
}

/** Strip HTML tags for plain-text summary rendering */
function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

export function RootFamilyPanel({ entry }: Props) {
  const [showAll, setShowAll] = useState(false);

  if (!entry || entry.rootFamilyCount === 0) {
    return (
      <div className="text-muted text-sm text-center py-4">
        Run{' '}
        <code className="font-mono text-xs bg-surface-plus px-1.5 py-0.5 rounded">
          npx tsx scripts/fetch-morphology.ts
        </code>{' '}
        to populate root-family data.
      </div>
    );
  }

  const allItems = entry.rootFamilyWords ?? entry.rootFamily.map(key => ({ key, uthmani: '' }));
  const displayedItems = showAll ? allItems : allItems.slice(0, 20);

  return (
    <div className="flex flex-col gap-6">
      {/* Root header */}
      <div className="flex items-center gap-4">
        <div
          className="font-amiri text-4xl text-gold leading-none"
          dir="rtl"
          style={{ fontFamily: 'var(--font-amiri-quran), Amiri, serif' }}
        >
          {entry.rootArabic}
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-harf-text text-sm font-medium">Root</span>
          <span className="text-muted text-xs">{entry.wordId}</span>
        </div>
      </div>

      {/* Lexical summary */}
      {entry.summary && (
        <div className="bg-surface-plus border border-border rounded-xl p-4">
          <div className="text-muted text-xs uppercase tracking-wider mb-2">Lexical Summary</div>
          <p className="text-harf-text text-sm leading-relaxed">
            {stripHtml(entry.summary)}
          </p>
          <div className="text-muted text-xs mt-2">
            Source:{' '}
            <a
              href="https://quranwbw.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-gold"
            >
              QuranWBW
            </a>
          </div>
        </div>
      )}

      {/* Verb forms */}
      {entry.verbForms && (
        <div>
          <div className="text-muted text-xs uppercase tracking-wider mb-3">Verb Forms</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Object.entries(entry.verbForms).map(([formKey, arabic]) => (
              <div
                key={formKey}
                className="bg-surface-plus border border-border rounded-xl p-3 flex flex-col gap-1 items-center text-center"
              >
                <span
                  className="font-amiri text-xl text-harf-text"
                  dir="rtl"
                  style={{ fontFamily: 'var(--font-amiri-quran), Amiri, serif' }}
                >
                  {arabic}
                </span>
                <span className="text-muted text-xs capitalize">
                  {formKey.replace(/_/g, ' ')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Root family */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="text-muted text-xs uppercase tracking-wider">Root Family</div>
          <span className="text-gold text-sm font-medium">
            {entry.rootFamilyCount.toLocaleString()} occurrences
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {displayedItems.map(({ key, uthmani }) => {
            const { ref } = formatKey(key);
            return (
              <div
                key={key}
                className="flex flex-col items-center gap-1 bg-surface-plus border border-border rounded-xl px-3 py-2 hover:border-gold/40 transition-colors"
              >
                <span
                  className="font-amiri text-xl text-harf-text leading-none"
                  dir="rtl"
                  style={{ fontFamily: 'var(--font-amiri-quran), Amiri, serif' }}
                >
                  {uthmani || '—'}
                </span>
                <span className="text-muted text-[10px] font-mono">{ref}</span>
              </div>
            );
          })}
        </div>

        {!showAll && entry.rootFamilyCount > 20 && (
          <button
            onClick={() => setShowAll(true)}
            className="mt-2 text-sm text-gold hover:text-gold-muted transition-colors self-center"
          >
            Show all {entry.rootFamilyCount.toLocaleString()} occurrences
          </button>
        )}
      </div>
    </div>
  );
}
