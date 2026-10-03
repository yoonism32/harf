import Link from 'next/link';
import { ReviewNotice } from '@/components/insights/ReviewNotice';
import { SurahDirectory } from '@/components/insights/SurahDirectory';
import { getSurahOverview, getSurahThemes, insightCounts } from '@/lib/insights/data';

export default function InsightsPage() {
  const counts = insightCounts();
  const surahs = Array.from({ length: 114 }, (_, index) => {
    const id = index + 1;
    const overview = getSurahOverview(id)!;
    return { ...overview, themeCount: getSurahThemes(id).length };
  });

  return (
    <div className="stack">
      <header className="page-header">
        <p className="eyebrow">Notice patterns across the Quran</p>
        <h1>Quran insights</h1>
        <p>Move from a surah’s broad outline to the wording, topics, and parallel passages around a single ayah.</p>
      </header>
      <ReviewNotice />
      <section className="stats-grid" aria-label="Insight index coverage">
        <div><strong>114</strong><small>surah outlines</small></div>
        <div><strong>{counts.themeRanges.toLocaleString()}</strong><small>theme ranges</small></div>
        <div><strong>{counts.relatedReferences.toLocaleString()}</strong><small>ayahs with text matches</small></div>
        <div><strong>{counts.similarPairs.toLocaleString()}</strong><small>similar-passage pairs</small></div>
      </section>
      <section className="sheet stack">
        <p className="eyebrow">Active recall</p>
        <h2>Practice similar passages</h2>
        <p>Study two closely worded ayahs side by side. Shared spans are revealed only after you try to recall the parallel wording.</p>
        <Link className="button button-primary" href="/insights/practice">Start comparison practice</Link>
      </section>
      <SurahDirectory surahs={surahs} />
    </div>
  );
}
