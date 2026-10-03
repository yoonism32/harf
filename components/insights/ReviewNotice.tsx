import Link from 'next/link';
import { INSIGHTS_REVIEW_NOTICE } from '@/lib/insights/data';

export function ReviewNotice() {
  return (
    <aside className="status-message stack" aria-labelledby="insights-review-heading">
      <h2 id="insights-review-heading">Draft reference layer</h2>
      <p>{INSIGHTS_REVIEW_NOTICE}</p>
      <Link href="/sources">Review content sources and publication status →</Link>
    </aside>
  );
}
