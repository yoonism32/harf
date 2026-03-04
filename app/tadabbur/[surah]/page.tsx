'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import surahMetaRaw from '@/data/quran-surah-meta.json';
import surahNameMetaRaw from '@/data/quran-metadata-surah-name.json';
import { fetchAyah, type AyahResponse } from '@/lib/quran-api';
import {
  getSurahInfo,
  getSurahThemes,
  getVerseTopics,
  getMutashabihatForVerse,
  type ThemeEntry,
  type TopicIndex,
  type SurahInfo,
} from '@/lib/tadabbur';

interface SurahMeta { id: number; name: string; arabic: string; verses: number }
interface SurahNameMeta {
  id: number; revelation_place: string; revelation_order: number;
  bismillah_pre: boolean; name_arabic: string;
}

const SURAHS = surahMetaRaw as SurahMeta[];
const SURAH_NAME_META = surahNameMetaRaw as Record<string, SurahNameMeta>;

interface PageProps { params: Promise<{ surah: string }> }

export default function TadabburSurahPage({ params }: PageProps) {
  const { surah: surahParam } = use(params);
  const surahNum = Number(surahParam);

  const surahMeta = SURAHS.find(s => s.id === surahNum);
  if (!surahMeta || isNaN(surahNum) || surahNum < 1 || surahNum > 114) notFound();

  const nameMeta = SURAH_NAME_META[String(surahNum)];
  const place = nameMeta?.revelation_place === 'makkah' ? 'Makkī' : 'Madanī';

  const [surahInfo, setSurahInfo] = useState<SurahInfo | null>(null);
  const [themes, setThemes] = useState<ThemeEntry[]>([]);
  const [verses, setVerses] = useState<(AyahResponse | null)[]>([]);
  const [verseTopics, setVerseTopics] = useState<Record<string, TopicIndex[]>>({});
  const [hasRepeat, setHasRepeat] = useState<Record<string, boolean>>({});
  const [infoExpanded, setInfoExpanded] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setVerses([]);
    setSurahInfo(null);
    setThemes([]);
    setVerseTopics({});
    setHasRepeat({});

    const totalVerses = surahMeta.verses;
    const refs = Array.from({ length: totalVerses }, (_, i) => `${surahNum}:${i + 1}`);

    // Load all data in parallel
    Promise.all([
      getSurahInfo(surahNum),
      getSurahThemes(surahNum),
      // Fetch verses in batches of 20 to avoid too many parallel requests
      (async () => {
        const all: (AyahResponse | null)[] = [];
        const batchSize = 20;
        for (let i = 0; i < refs.length; i += batchSize) {
          if (cancelled) return all;
          const batch = refs.slice(i, i + batchSize);
          const settled = await Promise.allSettled(batch.map(r => fetchAyah(r)));
          const batchResults = settled.map(r => r.status === 'fulfilled' ? r.value : null);
          all.push(...batchResults);
          if (!cancelled) setVerses([...all]);
        }
        return all;
      })(),
    ]).then(async ([info, surahThemes]) => {
      if (cancelled) return;
      setSurahInfo(info);
      setThemes(surahThemes);

      // Load topics + mutashabihat for each verse (lightweight lookups)
      const topicsMap: Record<string, TopicIndex[]> = {};
      const repeatMap: Record<string, boolean> = {};

      await Promise.all(
        refs.map(async ref => {
          if (cancelled) return;
          const [topics, phrases] = await Promise.all([
            getVerseTopics(ref),
            getMutashabihatForVerse(ref),
          ]);
          if (topics.length) topicsMap[ref] = topics;
          if (phrases.length) repeatMap[ref] = true;
        }),
      );

      if (cancelled) return;
      setVerseTopics(topicsMap);
      setHasRepeat(repeatMap);
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [surahNum]);

  // Group verses by theme for the side nav
  const themeGroups = themes.map(t => ({
    theme: t,
    id: `theme-${t.from}`,
  }));

  return (
    <div className="flex gap-6 max-w-5xl mx-auto">
      {/* Side nav — theme jump list */}
      {themeGroups.length > 0 && (
        <aside className="hidden lg:flex flex-col gap-1 w-52 shrink-0 sticky top-20 self-start max-h-[80vh] overflow-y-auto pr-2">
          <p className="text-xs text-muted/60 uppercase tracking-widest mb-2 px-2">Themes</p>
          {themeGroups.map(({ theme, id }) => (
            <a
              key={id}
              href={`#${id}`}
              className="text-xs text-muted hover:text-gold transition-colors px-2 py-1 rounded hover:bg-surface-plus/50 line-clamp-2"
            >
              {theme.from === theme.to
                ? `${theme.from}`
                : `${theme.from}–${theme.to}`}{' '}
              · {theme.theme}
            </a>
          ))}
        </aside>
      )}

      {/* Main content */}
      <div className="flex-1 min-w-0 flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col gap-3">
          <div className="flex items-baseline gap-3">
            <h1
              className="font-amiri text-4xl text-gold"
              style={{ fontFamily: 'Amiri, serif' }}
              dir="rtl"
            >
              {surahMeta.arabic}
            </h1>
            <h2 className="text-xl font-semibold text-harf-text">{surahMeta.name}</h2>
          </div>

          {/* Metadata chips */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs border border-border/60 rounded-full px-3 py-1 text-muted">
              {surahMeta.verses} verses
            </span>
            <span className="text-xs border border-border/60 rounded-full px-3 py-1 text-muted">
              {place}
            </span>
            <span className="text-xs border border-border/60 rounded-full px-3 py-1 text-muted">
              Surah {surahNum}
            </span>
            {nameMeta?.bismillah_pre && (
              <span
                className="text-xs font-amiri text-gold/70"
                style={{ fontFamily: 'Amiri, serif' }}
                dir="rtl"
              >
                بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ
              </span>
            )}
          </div>

          {/* Surah info accordion */}
          {surahInfo && (
            <div className="card p-4 flex flex-col gap-2">
              <p className="text-sm text-harf-text">{surahInfo.short_text}</p>
              {!infoExpanded && (
                <button
                  onClick={() => setInfoExpanded(true)}
                  className="text-xs text-gold hover:text-gold/80 transition-colors self-start"
                >
                  Read more ↓
                </button>
              )}
              {infoExpanded && (
                <>
                  <div
                    className="text-sm text-muted prose prose-invert prose-sm max-w-none [&_h2]:text-harf-text [&_h2]:font-semibold [&_h2]:mt-4 [&_p]:text-muted [&_a]:text-gold"
                    dangerouslySetInnerHTML={{ __html: surahInfo.text }}
                  />
                  <button
                    onClick={() => setInfoExpanded(false)}
                    className="text-xs text-gold hover:text-gold/80 transition-colors self-start"
                  >
                    Show less ↑
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Ayah list with theme banners */}
        <div className="flex flex-col gap-1">
          {loading && verses.length === 0 && (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="card p-4 animate-pulse">
                  <div className="h-6 bg-surface-plus/60 rounded w-3/4 mb-2" />
                  <div className="h-4 bg-surface-plus/40 rounded w-1/2" />
                </div>
              ))}
            </div>
          )}

          {verses.map((verse, idx) => {
            const ayahNum = idx + 1;
            const verseKey = `${surahNum}:${ayahNum}`;
            const theme = themes.find(t => t.from <= ayahNum && t.to >= ayahNum);
            const isThemeStart = theme && theme.from === ayahNum;
            const topics = verseTopics[verseKey] ?? [];
            const hasRepeated = hasRepeat[verseKey] ?? false;

            return (
              <div key={ayahNum}>
                {/* Theme banner at start of theme range */}
                {isThemeStart && (
                  <div
                    id={`theme-${theme.from}`}
                    className="flex items-center gap-3 py-2 px-3 mb-1 mt-3 first:mt-0"
                  >
                    <div className="flex-1 h-px bg-gold/20" />
                    <span className="text-xs text-gold/70 font-medium uppercase tracking-wider whitespace-nowrap">
                      {theme.theme}
                    </span>
                    <div className="flex-1 h-px bg-gold/20" />
                  </div>
                )}

                <Link
                  href={`/tadabbur/${surahNum}/${ayahNum}`}
                  className="card card-interactive p-4 flex gap-3 group block"
                >
                  {/* Verse number */}
                  <span className="shrink-0 w-7 h-7 rounded-full bg-surface-plus flex items-center justify-center text-xs font-mono text-muted group-hover:text-gold transition-colors mt-1">
                    {ayahNum}
                  </span>

                  <div className="flex-1 min-w-0 flex flex-col gap-2">
                    {/* Arabic */}
                    {verse ? (
                      <p
                        className="font-amiri text-xl text-harf-text leading-relaxed"
                        style={{ fontFamily: 'var(--font-amiri-quran), Amiri Quran, serif' }}
                        dir="rtl"
                      >
                        {verse.arabic}
                      </p>
                    ) : (
                      <div className="h-7 bg-surface-plus/40 rounded animate-pulse w-full" />
                    )}

                    {/* Bottom row: topics + mutashabihat indicator */}
                    {(topics.length > 0 || hasRepeated) && (
                      <div className="flex items-center gap-2 flex-wrap">
                        {topics.slice(0, 3).map(t => (
                          <span
                            key={t.id}
                            className="text-xs text-muted/80 bg-surface-plus/50 rounded-full px-2 py-0.5 border border-border/40"
                          >
                            {t.name}
                          </span>
                        ))}
                        {topics.length > 3 && (
                          <span className="text-xs text-muted/50">+{topics.length - 3} more</span>
                        )}
                        {hasRepeated && (
                          <span
                            className="w-1.5 h-1.5 rounded-full bg-gold/60 shrink-0"
                            title="Contains repeated phrases (mutashabihat)"
                          />
                        )}
                      </div>
                    )}
                  </div>
                </Link>
              </div>
            );
          })}
        </div>

        {/* Back link */}
        <Link
          href="/tadabbur"
          className="text-sm text-muted hover:text-gold transition-colors self-start"
        >
          ← All surahs
        </Link>
      </div>
    </div>
  );
}
