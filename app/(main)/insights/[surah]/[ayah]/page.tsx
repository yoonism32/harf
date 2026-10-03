import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ReviewNotice } from '@/components/insights/ReviewNotice';
import { adjacentRef, parseRef } from '@/lib/content/refs';
import { readAyah } from '@/lib/content/server';
import { wordsInRanges } from '@/lib/insights/compare';
import {
  getRelatedAyahs,
  getRepeatedPhrases,
  getSurahOverview,
  getThemeForAyah,
  getTopicsForAyah,
} from '@/lib/insights/data';

export default async function AyahInsightsPage({ params }: { params: Promise<{ surah: string; ayah: string }> }) {
  const values = await params;
  const reference = `${values.surah}:${values.ayah}`;
  const parsed = parseRef(reference);
  if (!parsed) notFound();
  const ayah = await readAyah(reference);
  if (!ayah) notFound();
  const overview = getSurahOverview(parsed.surah);
  if (!overview) notFound();

  const theme = getThemeForAyah(parsed.surah, parsed.ayah);
  const topics = getTopicsForAyah(reference).slice(0, 12);
  const related = getRelatedAyahs(reference, 5);
  const phrases = getRepeatedPhrases(reference, 3);
  const connectedRefs = [...new Set([
    ...related.map(item => item.matched_ayah_key),
    ...phrases.flatMap(phrase => Object.keys(phrase.ayah).filter(key => key !== reference).slice(0, 6)),
  ])];
  const connected = new Map((await Promise.all(connectedRefs.map(async ref => [ref, await readAyah(ref)] as const))).filter((item): item is readonly [string, NonNullable<Awaited<ReturnType<typeof readAyah>>>] => Boolean(item[1])));
  const previous = adjacentRef(reference, -1);
  const next = adjacentRef(reference, 1);

  return (
    <div className="stack">
      <nav className="row" aria-label="Breadcrumb">
        <Link href="/insights">Quran insights</Link><span aria-hidden="true">/</span>
        <Link href={`/insights/${parsed.surah}`}>{overview.name}</Link><span aria-hidden="true">/</span>
        <span>Ayah {parsed.ayah}</span>
      </nav>
      <header className="page-header">
        <p className="eyebrow">{overview.name} · {reference}</p>
        <h1>Connections around this ayah</h1>
        <p>Read the ayah first, then use the draft indexes to examine its surrounding theme and repeated wording.</p>
      </header>
      <ReviewNotice />
      <article className="sheet stack">
        <p className="quran-text" dir="rtl" lang="ar">{ayah.tokens.map(token => token.arabic).join(' ')}</p>
        <p className="translation">{ayah.translation}</p>
        <p className="muted">{ayah.translationSource}</p>
        <Link className="button button-primary" href={`/read/${parsed.surah}/${parsed.ayah}`}>Open in the Quran reader</Link>
      </article>

      {theme && <section className="sheet stack" aria-labelledby="theme-heading">
        <div className="row between"><h2 id="theme-heading">Passage theme</h2><span className="badge">Ayahs {theme.from}–{theme.to}</span></div>
        <p>{theme.theme}</p>
        <Link href={`/insights/${parsed.surah}`}>View the {overview.name} outline →</Link>
      </section>}

      {topics.length > 0 && <section className="stack" aria-labelledby="topics-heading">
        <div><h2 id="topics-heading">Indexed topics</h2><p className="muted">Reference labels associated with this ayah; they are not an explanation of its meaning.</p></div>
        <ul className="row" aria-label="Topics">
          {topics.map(topic => <li className="badge" key={topic.id}>{topic.name}{topic.ar ? <> · <span dir="rtl" lang="ar">{topic.ar}</span></> : null}</li>)}
        </ul>
      </section>}

      {related.length > 0 && <section className="stack" aria-labelledby="related-heading">
        <div><h2 id="related-heading">Related wording</h2><p className="muted">Algorithmic text matches, ordered by similarity. A high score does not establish a shared interpretation.</p></div>
        <ol className="entry-list">
          {related.map(item => {
            const match = connected.get(item.matched_ayah_key);
            if (!match) return null;
            return <li key={item.matched_ayah_key}><Link className="list-row" href={`/insights/${item.matched_ayah_key.replace(':', '/')}`}><span><strong>Ayah {item.matched_ayah_key}</strong><br/><small className="muted">Text match score {item.score}</small><br/><span className="arabic-text" dir="rtl" lang="ar">{match.tokens.map(token => token.arabic).join(' ')}</span></span><span aria-hidden="true">→</span></Link></li>;
          })}
        </ol>
      </section>}

      {phrases.length > 0 && <section className="stack" aria-labelledby="repeated-heading">
        <div><h2 id="repeated-heading">Repeated passages</h2><p className="muted">Occurrences of the same Arabic span elsewhere in the Quran.</p></div>
        {phrases.map(phrase => {
          const ranges = phrase.ayah[reference] ?? [];
          const wording = wordsInRanges(ayah.tokens, ranges);
          const occurrences = Object.keys(phrase.ayah).filter(key => key !== reference).slice(0, 6);
          return <article className="sheet stack" key={phrase.id}>
            <div className="row between"><p className="arabic-text" dir="rtl" lang="ar">{wording || 'Repeated Arabic span'}</p><span className="badge">{phrase.count} occurrences</span></div>
            <ul className="entry-list">
              {occurrences.map(ref => {
                const occurrence = connected.get(ref);
                return <li key={ref}><Link className="list-row" href={`/insights/${ref.replace(':', '/')}`}><span><strong>Ayah {ref}</strong>{occurrence && <><br/><small className="muted">{occurrence.translation}</small></>}</span><span aria-hidden="true">→</span></Link></li>;
              })}
            </ul>
          </article>;
        })}
      </section>}

      {!theme && topics.length === 0 && related.length === 0 && phrases.length === 0 && <p className="status-message">No derived insight entries are available for this ayah yet. The canonical reader remains available above.</p>}
      <nav className="row between" aria-label="Ayah insight navigation">
        {previous ? <Link className="button button-secondary" href={`/insights/${previous.replace(':', '/')}`}>← {previous}</Link> : <span>First ayah</span>}
        {next ? <Link className="button button-secondary" href={`/insights/${next.replace(':', '/')}`}>{next} →</Link> : <span>Last ayah</span>}
      </nav>
    </div>
  );
}
