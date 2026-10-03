import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ReviewNotice } from '@/components/insights/ReviewNotice';
import { readSurah } from '@/lib/content/server';
import { parseRef } from '@/lib/content/refs';
import { getSurahOverview, getSurahThemes } from '@/lib/insights/data';

export default async function SurahInsightsPage({ params }: { params: Promise<{ surah: string }> }) {
  const { surah: value } = await params;
  if (!/^\d+$/.test(value)) notFound();
  const surah = Number(value);
  if (!parseRef(`${surah}:1`)) notFound();
  const overview = getSurahOverview(surah);
  if (!overview) notFound();
  const [ayahs, themes] = await Promise.all([readSurah(surah), Promise.resolve(getSurahThemes(surah))]);

  return (
    <div className="stack">
      <nav className="row" aria-label="Breadcrumb">
        <Link href="/insights">Quran insights</Link><span aria-hidden="true">/</span><span>{overview.name}</span>
      </nav>
      <header className="page-header">
        <p className="eyebrow">Surah {surah} · {overview.verses} ayahs · {overview.revelationPlace}</p>
        <div className="row between">
          <div><h1>{overview.name}</h1><p>{overview.translation}</p></div>
          <span className="study-word arabic-text" dir="rtl" lang="ar">{overview.nameArabic}</span>
        </div>
      </header>
      <ReviewNotice />
      <section className="sheet stack" aria-labelledby="overview-heading">
        <div className="row between"><h2 id="overview-heading">Draft overview</h2><span className="badge">Awaiting review</span></div>
        <p>{overview.summary}</p>
      </section>
      <section className="stack" aria-labelledby="outline-heading">
        <div>
          <p className="eyebrow">Reading map</p>
          <h2 id="outline-heading">Theme outline</h2>
          <p className="muted">Each range opens at its first ayah. Use the reader link for uninterrupted Quran reading.</p>
        </div>
        {themes.length ? (
          <ol className="entry-list">
            {themes.map(theme => {
              const first = ayahs[theme.from - 1];
              return (
                <li key={`${theme.from}:${theme.to}:${theme.theme}`}>
                  <article className="list-row">
                    <div className="stack">
                      <div className="row">
                        <span className="badge">{surah}:{theme.from}{theme.to === theme.from ? '' : `–${theme.to}`}</span>
                        <strong>{theme.theme}</strong>
                      </div>
                      {first && <>
                        <p className="arabic-text" dir="rtl" lang="ar">{first.tokens.map(token => token.arabic).join(' ')}</p>
                        <p className="muted">{first.translation}</p>
                      </>}
                      <div className="row">
                        <Link href={`/insights/${surah}/${theme.from}`}>Explore this passage →</Link>
                        <Link href={`/read/${surah}/${theme.from}`}>Read from this ayah</Link>
                      </div>
                    </div>
                  </article>
                </li>
              );
            })}
          </ol>
        ) : <p>No theme outline is available for this surah yet.</p>}
      </section>
    </div>
  );
}
