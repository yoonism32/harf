'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import surahMetaRaw from '@/data/quran-surah-meta.json';
import { fetchAyah, type AyahResponse } from '@/lib/quran-api';
import {
  getAyahTheme,
  getVerseTopics,
  getRelatedAyahs,
  getMutashabihatForVerse,
  type ThemeEntry,
  type TopicIndex,
  type MatchEntry,
  type PhraseEntry,
} from '@/lib/tadabbur';

interface SurahMeta { id: number; name: string; arabic: string; verses: number }

const SURAHS = surahMetaRaw as SurahMeta[];

interface PageProps { params: Promise<{ surah: string; ayah: string }> }

export default function TadabburVersePage({ params }: PageProps) {
  const { surah: surahParam, ayah: ayahParam } = use(params);
  const surahNum = Number(surahParam);
  const ayahNum = Number(ayahParam);

  const surahMeta = SURAHS.find(s => s.id === surahNum);
  if (
    !surahMeta ||
    isNaN(surahNum) || isNaN(ayahNum) ||
    surahNum < 1 || surahNum > 114 ||
    ayahNum < 1 || ayahNum > surahMeta.verses
  ) notFound();

  const verseKey = `${surahNum}:${ayahNum}`;

  const [verse, setVerse] = useState<AyahResponse | null>(null);
  const [theme, setTheme] = useState<ThemeEntry | null>(null);
  const [topics, setTopics] = useState<TopicIndex[]>([]);
  const [related, setRelated] = useState<MatchEntry[]>([]);
  const [relatedVerses, setRelatedVerses] = useState<Record<string, AyahResponse | null>>({});
  const [phrases, setPhrases] = useState<PhraseEntry[]>([]);
  const [expandedPhrases, setExpandedPhrases] = useState<Set<string>>(new Set());
  const [phraseVerses, setPhraseVerses] = useState<Record<string, Record<string, AyahResponse | null>>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setVerse(null);
    setTheme(null);
    setTopics([]);
    setRelated([]);
    setRelatedVerses({});
    setPhrases([]);
    setExpandedPhrases(new Set());

    Promise.all([
      fetchAyah(verseKey),
      getAyahTheme(surahNum, ayahNum),
      getVerseTopics(verseKey),
      getRelatedAyahs(verseKey, 5),
      getMutashabihatForVerse(verseKey),
    ]).then(async ([v, t, tp, rel, ph]) => {
      setVerse(v);
      setTheme(t);
      setTopics(tp);
      setPhrases(ph);

      // Fetch related verse texts
      const relKeys = rel.map(r => r.matched_ayah_key);
      setRelated(rel);
      const relResults = await Promise.allSettled(relKeys.map(k => fetchAyah(k)));
      const relMap: Record<string, AyahResponse | null> = {};
      relKeys.forEach((k, i) => {
        relMap[k] = relResults[i]?.status === 'fulfilled' ? relResults[i].value : null;
      });
      setRelatedVerses(relMap);
      setLoading(false);
    });
  }, [verseKey, surahNum, ayahNum]);

  const togglePhrase = async (phrase: PhraseEntry) => {
    setExpandedPhrases(prev => {
      const next = new Set(prev);
      if (next.has(phrase.id)) {
        next.delete(phrase.id);
        return next;
      }
      next.add(phrase.id);
      return next;
    });

    // Lazily fetch occurrence verse texts
    if (!phraseVerses[phrase.id]) {
      const keys = Object.keys(phrase.ayah);
      const results = await Promise.allSettled(keys.map(k => fetchAyah(k)));
      const map: Record<string, AyahResponse | null> = {};
      keys.forEach((k, i) => {
        map[k] = results[i]?.status === 'fulfilled' ? results[i].value : null;
      });
      setPhraseVerses(prev => ({ ...prev, [phrase.id]: map }));
    }
  };

  const hasPrev = ayahNum > 1;
  const hasNext = ayahNum < surahMeta.verses;

  return (
    <div className="flex flex-col gap-5 max-w-2xl mx-auto">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted">
        <Link href="/tadabbur" className="hover:text-gold transition-colors">Tadabbur</Link>
        <span>/</span>
        <Link href={`/tadabbur/${surahNum}`} className="hover:text-gold transition-colors">
          {surahMeta.name}
        </Link>
        <span>/</span>
        <span className="text-harf-text">{ayahNum}</span>
      </nav>

      {/* 1. The Verse */}
      <section className="card p-6 flex flex-col gap-4">
        {loading ? (
          <>
            <div className="h-12 bg-surface-plus/50 rounded animate-pulse" />
            <div className="h-5 bg-surface-plus/30 rounded animate-pulse w-3/4" />
          </>
        ) : (
          <>
            <p
              className="font-amiri text-3xl leading-loose text-harf-text text-right"
              style={{ fontFamily: 'var(--font-amiri-quran), Amiri Quran, serif' }}
              dir="rtl"
            >
              {verse?.arabic}
            </p>
            <p className="text-sm text-muted leading-relaxed">{verse?.english}</p>
            <p className="text-xs text-muted/50 font-mono">
              {surahMeta.name} {surahNum}:{ayahNum}
            </p>
          </>
        )}
      </section>

      {/* 2. Theme */}
      {theme && (
        <section className="card p-4 flex flex-col gap-2">
          <p className="text-xs text-gold/70 uppercase tracking-widest">Theme</p>
          <p className="text-harf-text font-medium">{theme.theme}</p>
          <p className="text-xs text-muted">
            Verses {theme.from}–{theme.to} · {theme.count} ayahs
          </p>
          <Link
            href={`/tadabbur/${surahNum}#theme-${theme.from}`}
            className="text-xs text-gold hover:text-gold/80 transition-colors self-start"
          >
            View in {surahMeta.name} →
          </Link>
        </section>
      )}

      {/* 3. Topics */}
      {topics.length > 0 && (
        <section className="flex flex-col gap-3">
          <p className="text-xs text-muted/60 uppercase tracking-widest">Topics</p>
          <div className="flex gap-2 flex-wrap">
            {topics.map(t => (
              <span
                key={t.id}
                className="text-sm text-harf-text bg-surface border border-border/60 rounded-full px-3 py-1"
              >
                {t.name}
                {t.ar && (
                  <span
                    className="ml-2 text-muted font-amiri"
                    style={{ fontFamily: 'Amiri, serif' }}
                    dir="rtl"
                  >
                    {t.ar}
                  </span>
                )}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* 4. Related Ayahs */}
      {related.length > 0 && (
        <section className="flex flex-col gap-3">
          <p className="text-xs text-muted/60 uppercase tracking-widest">Related Verses</p>
          <div className="flex flex-col gap-2">
            {related.map(r => {
              const rv = relatedVerses[r.matched_ayah_key];
              const [rSurah] = r.matched_ayah_key.split(':');
              const rMeta = SURAHS.find(s => s.id === Number(rSurah));
              return (
                <Link
                  key={r.matched_ayah_key}
                  href={`/tadabbur/${r.matched_ayah_key.replace(':', '/')}`}
                  className="card card-interactive p-4 flex flex-col gap-2 group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-muted group-hover:text-gold transition-colors">
                      {r.matched_ayah_key}
                      {rMeta && ` · ${rMeta.name}`}
                    </span>
                    <span className="text-xs text-muted/50">score {r.score}</span>
                  </div>
                  {rv ? (
                    <p
                      className="font-amiri text-lg text-harf-text leading-relaxed text-right line-clamp-2"
                      style={{ fontFamily: 'var(--font-amiri-quran), Amiri Quran, serif' }}
                      dir="rtl"
                    >
                      {rv.arabic}
                    </p>
                  ) : (
                    <div className="h-6 bg-surface-plus/30 rounded animate-pulse" />
                  )}
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* 5. Mutashabihat */}
      {phrases.length > 0 && (
        <section className="flex flex-col gap-3">
          <p className="text-xs text-muted/60 uppercase tracking-widest">Repeated Phrases</p>
          <div className="flex flex-col gap-3">
            {phrases.map(phrase => {
              const expanded = expandedPhrases.has(phrase.id);
              const pv = phraseVerses[phrase.id] ?? {};
              const occurrenceKeys = Object.keys(phrase.ayah);
              const uniqueSurahs = new Set(occurrenceKeys.map(k => k.split(':')[0])).size;

              return (
                <div key={phrase.id} className="card p-4 flex flex-col gap-3">
                  {/* Phrase header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-col gap-1">
                      <p className="text-xs text-muted">
                        Source: {phrase.source.key} (words {phrase.source.from}–{phrase.source.to})
                      </p>
                      <span className="inline-flex items-center gap-2 bg-gold/10 border border-gold/30 rounded-full px-3 py-1 self-start">
                        <span className="text-xs text-gold">
                          Appears {phrase.count}× across {uniqueSurahs} surah{uniqueSurahs !== 1 ? 's' : ''}
                        </span>
                      </span>
                    </div>
                    <button
                      onClick={() => togglePhrase(phrase)}
                      className="text-xs text-gold hover:text-gold/80 transition-colors shrink-0"
                    >
                      {expanded ? 'Collapse ↑' : `Show all ↓`}
                    </button>
                  </div>

                  {/* Occurrences */}
                  {expanded && (
                    <div className="flex flex-col gap-2 border-t border-border/40 pt-3">
                      {occurrenceKeys.map(key => {
                        const ov = pv[key];
                        const [oSurah] = key.split(':');
                        const oMeta = SURAHS.find(s => s.id === Number(oSurah));
                        return (
                          <Link
                            key={key}
                            href={`/tadabbur/${key.replace(':', '/')}`}
                            className="flex flex-col gap-1 p-2 rounded hover:bg-surface-plus/50 transition-colors"
                          >
                            <span className="text-xs font-mono text-muted">
                              {key}{oMeta ? ` · ${oMeta.name}` : ''}
                            </span>
                            {ov ? (
                              <p
                                className="font-amiri text-base text-harf-text leading-relaxed text-right line-clamp-2"
                                style={{ fontFamily: 'var(--font-amiri-quran), Amiri Quran, serif' }}
                                dir="rtl"
                              >
                                {ov.arabic}
                              </p>
                            ) : (
                              <div className="h-5 bg-surface-plus/30 rounded animate-pulse" />
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 6. Prev / Next navigation */}
      <div className="flex items-center justify-between pt-2 pb-6">
        {hasPrev ? (
          <Link
            href={`/tadabbur/${surahNum}/${ayahNum - 1}`}
            className="text-sm text-muted hover:text-gold transition-colors flex items-center gap-1"
          >
            ← {surahNum}:{ayahNum - 1}
          </Link>
        ) : (
          <span />
        )}
        <Link
          href={`/tadabbur/${surahNum}`}
          className="text-sm text-muted hover:text-gold transition-colors"
        >
          {surahMeta.name}
        </Link>
        {hasNext ? (
          <Link
            href={`/tadabbur/${surahNum}/${ayahNum + 1}`}
            className="text-sm text-muted hover:text-gold transition-colors flex items-center gap-1"
          >
            {surahNum}:{ayahNum + 1} →
          </Link>
        ) : (
          <span />
        )}
      </div>
    </div>
  );
}
