import Link from 'next/link';
import { ReviewNotice } from '@/components/insights/ReviewNotice';
import { SimilarPassagesPractice } from '@/components/insights/SimilarPassagesPractice';
import { getPracticePairs } from '@/lib/insights/data';

export default function InsightPracticePage() {
  const pairs = getPracticePairs();
  return (
    <div className="stack">
      <Link href="/insights">← Quran insights</Link>
      <header className="page-header">
        <p className="eyebrow">Similar passages</p>
        <h1>Compare the wording</h1>
        <p>This practice trains visual recall. It does not alter your vocabulary review schedule.</p>
      </header>
      <ReviewNotice />
      <SimilarPassagesPractice pairs={pairs} />
    </div>
  );
}
