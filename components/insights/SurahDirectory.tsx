'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

export interface InsightSurah {
  id: number;
  name: string;
  nameArabic: string;
  translation: string;
  verses: number;
  themeCount: number;
}

export function SurahDirectory({ surahs }: { surahs: InsightSurah[] }) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const value = query.trim().toLocaleLowerCase();
    if (!value) return surahs;
    return surahs.filter(surah =>
      `${surah.id} ${surah.name} ${surah.nameArabic} ${surah.translation}`
        .toLocaleLowerCase()
        .includes(value),
    );
  }, [query, surahs]);

  return (
    <section className="stack" aria-labelledby="surah-insights-heading">
      <div>
        <h2 id="surah-insights-heading">Explore by surah</h2>
        <p className="muted">Open a thematic outline, then move into individual ayahs and textual connections.</p>
      </div>
      <label className="field">
        Search the 114 surahs
        <input
          type="search"
          value={query}
          onChange={event => setQuery(event.target.value)}
          placeholder="Name, Arabic name, or number"
        />
      </label>
      {filtered.length ? (
        <ol className="surah-grid">
          {filtered.map(surah => (
            <li key={surah.id}>
              <Link className="list-row" href={`/insights/${surah.id}`}>
                <span>
                  <strong>{surah.id}. {surah.name}</strong><br />
                  <small className="muted">{surah.translation} · {surah.themeCount} theme ranges</small>
                </span>
                <span className="entry-arabic" dir="rtl" lang="ar">{surah.nameArabic}</span>
              </Link>
            </li>
          ))}
        </ol>
      ) : (
        <p role="status">No surah matches “{query}”.</p>
      )}
    </section>
  );
}
