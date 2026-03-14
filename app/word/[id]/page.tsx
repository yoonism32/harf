'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { MASTERY_LABELS, MASTERY_COLORS } from '@/lib/srs';
import { getAllWordProgress } from '@/lib/storage';
import { fetchWordVerses, type AyahResponse } from '@/lib/quran-api';
import { MorphologyTable } from '@/components/word/MorphologyTable';
import { RootFamilyPanel, type MorphologyEntry } from '@/components/word/RootFamilyPanel';
import { InteractiveVerse } from '@/components/word/InteractiveVerse';
import { SURAHS } from '@/lib/coverage';
import wordsData from '@/data/words.json';

interface Derivative { form: string; meaning: string; }
interface WordEntry {
  id: string;
  root: string;
  arabic: string;
  transliteration: string;
  meanings: string[];
  frequency: number;
  tier: number;
  example_verse: string;
  derivatives: Derivative[];
  coverage_weight: number;
}

const words = wordsData as WordEntry[];
const wordsMap = Object.fromEntries(words.map(w => [w.id, w]));

async function loadMorphology(): Promise<Record<string, MorphologyEntry>> {
  const mod = await import('@/data/wbw-morphology.json');
  return mod.default as Record<string, MorphologyEntry>;
}

function buildExampleRefs(example: string): string[] {
  const [sStr, aStr] = example.split(':');
  const surah = Number(sStr);
  const ayah = Number(aStr);
  if (!Number.isFinite(surah) || !Number.isFinite(ayah)) return [example];
  const maxAyah = SURAHS.find(s => s.number === surah)?.ayahs ?? ayah;
  const refs = [];
  if (ayah > 1) refs.push(`${surah}:${ayah - 1}`);
  refs.push(`${surah}:${ayah}`);
  if (ayah < maxAyah) refs.push(`${surah}:${ayah + 1}`);
  return refs;
}

export default function WordDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const word = wordsMap[id];

  const [verses, setVerses] = useState<AyahResponse[]>([]);
  const [loadingVerses, setLoadingVerses] = useState(true);
  const [mastery, setMastery] = useState(0);
  const [morphEntry, setMorphEntry] = useState<MorphologyEntry | null>(null);
  const [loadingMorph, setLoadingMorph] = useState(true);

  useEffect(() => {
    if (!word) return;
    const progress = getAllWordProgress();
    setMastery(progress[id]?.mastery ?? 0);

    const refs = buildExampleRefs(word.example_verse);
    setLoadingVerses(true);
    fetchWordVerses(refs).then(data => {
      setVerses(data);
      setLoadingVerses(false);
    });
  }, [id, word]);

  useEffect(() => {
    let cancelled = false;
    setLoadingMorph(true);
    loadMorphology()
      .then(data => {
        if (cancelled) return;
        setMorphEntry(data[id] ?? null);
        setLoadingMorph(false);
      })
      .catch(() => {
        if (cancelled) return;
        setMorphEntry(null);
        setLoadingMorph(false);
      });
    return () => { cancelled = true; };
  }, [id]);

  if (!word) return (
    <div className="py-24 text-center text-muted">
      Word not found. <Link href="/words" className="text-gold hover:underline">Back to library</Link>
    </div>
  );

  return (
    <div className="flex flex-col gap-8 py-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-muted text-sm">
        <Link href="/words" className="hover:text-gold transition-colors">Words</Link>
        <span>/</span>
        <span className="text-harf-text">{word.transliteration}</span>
      </div>

      {/* Hero */}
      <div className="card p-8 flex flex-col md:flex-row gap-8 items-start">
        {/* Arabic */}
        <div className="flex flex-col gap-3 items-center md:items-start">
          {/* Inner arabic box: padding creates tashkeel/ascender clearance */}
          <div className="overflow-visible pt-8 pb-3 px-2">
            <div
              className="font-amiri text-8xl text-harf-text leading-[1.1]"
              dir="rtl"
            >
              {word.arabic}
            </div>
          </div>
          <div className="text-muted font-mono text-lg">{word.root}</div>
        </div>

        {/* Divider */}
        <div className="hidden md:block w-px self-stretch bg-border" />

        {/* Info */}
        <div className="flex flex-col gap-4 flex-1">
          <div>
            <div className="text-muted text-xs uppercase tracking-wider mb-1">Transliteration</div>
            <h1 className="text-harf-text text-xl font-medium">{word.transliteration}</h1>
          </div>

          <div>
            <div className="text-muted text-xs uppercase tracking-wider mb-1">Meanings</div>
            <div className="flex flex-wrap gap-2">
              {word.meanings.map((m, i) => (
                <span key={i} className="bg-surface-plus border border-border px-3 py-1 rounded-full text-harf-text text-sm">
                  {m}
                </span>
              ))}
            </div>
          </div>

          <div className="flex gap-6">
            <div>
              <div className="text-muted text-xs uppercase tracking-wider mb-1">Frequency</div>
              <div className="text-gold font-bold text-2xl">{word.frequency}×</div>
              <div className="text-muted text-xs">in the Quran</div>
            </div>
            <div>
              <div className="text-muted text-xs uppercase tracking-wider mb-1">Coverage</div>
              <div className="text-gold font-bold text-2xl">{(word.coverage_weight * 100).toFixed(2)}%</div>
              <div className="text-muted text-xs">of Quran</div>
            </div>
          </div>

          {/* Mastery */}
          <div>
            <div className="text-muted text-xs uppercase tracking-wider mb-2">Your mastery</div>
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5">
                {[1,2,3,4,5].map(l => (
                  <div key={l} className={`w-3 h-3 rounded-full ${l <= mastery ? MASTERY_COLORS[mastery] : 'bg-border'}`} />
                ))}
              </div>
              <span className="text-harf-text text-sm">{MASTERY_LABELS[mastery]}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Derivatives */}
      {word.derivatives.length > 0 && (
        <div className="card p-6 flex flex-col gap-4">
          <h2 className="text-harf-text font-semibold">Derived Forms</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {word.derivatives.map((d, i) => (
              <div key={i} className="bg-surface-plus rounded-xl p-4 flex flex-col gap-2" dir="rtl">
                <div className="font-amiri text-2xl text-gold">
                  {d.form}
                </div>
                <div className="text-muted text-sm" dir="ltr">{d.meaning}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quranic verses */}
      <div className="card p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-harf-text font-semibold">Quranic Examples</h2>
          <span className="text-muted text-xs">via CDN Quran API</span>
        </div>

        {loadingVerses ? (
          <div className="flex flex-col gap-3">
            {[1,2].map(i => (
              <div key={i} className="h-20 bg-surface-plus rounded-xl animate-pulse" />
            ))}
          </div>
        ) : verses.length > 0 ? (
          <div className="flex flex-col gap-4">
            {verses.map((v, i) => (
              <InteractiveVerse key={i} verse={v} root={word.root} />
            ))}
          </div>
        ) : (
          <div className="text-muted text-sm">Could not load verses. Check your connection.</div>
        )}
      </div>

      {/* Morphological analysis */}
      <div className="card p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-harf-text font-semibold">Morphological Analysis</h2>
          <span className="text-muted text-xs">verse {word.example_verse}</span>
        </div>
        <MorphologyTable verseRef={word.example_verse} />
      </div>

      {/* Root family & lexicon */}
      <div className="card p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-harf-text font-semibold">Root Family</h2>
          <span className="text-muted text-xs">via QuranWBW</span>
        </div>
        {loadingMorph ? (
          <div className="h-20 bg-surface-plus rounded animate-pulse" />
        ) : morphEntry ? (
          <RootFamilyPanel entry={morphEntry} />
        ) : (
          <div className="text-muted text-sm">No morphology data available for this root.</div>
        )}
      </div>

      {/* Study action */}
      <div className="flex gap-3">
        <Link
          href="/study"
          className="px-6 py-3 bg-gold text-bg rounded-xl font-semibold hover:bg-gold-muted transition-colors"
        >
          Study This Word
        </Link>
        <Link
          href="/words"
          className="px-6 py-3 bg-surface-plus text-harf-text rounded-xl font-medium hover:bg-border transition-colors"
        >
          ← Back to Library
        </Link>
      </div>
    </div>
  );
}
