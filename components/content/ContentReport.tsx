import {useEffect, useMemo, useState} from 'react';
import type {Catalog, Overlap} from '@/lib/content/schema';
import type {DataSnapshot} from '@/lib/data/schema';
import {buildContentReport} from '@/lib/content/report';
import {getSemanticDiff} from '@/lib/content/client';
import {semanticReportState} from '@/lib/content/semantic-report-state';
import type {SemanticDiffDocument} from '@/lib/content/semantic-report-schema';

const kindLabels: Record<string, string> = {
  added: 'Added',
  removed: 'Removed',
  rekeyed: 'Re-keyed',
  changed: 'Changed',
};

const fieldLabels: Record<string, string> = {
  arabic: 'Arabic surface',
  lemma: 'Lemma',
  root: 'Root',
  representativeExample: 'Representative example',
  examples: 'Example selection',
  gloss: 'Gloss',
  sourceIds: 'Source IDs',
  occurrences: 'Occurrences',
  approval: 'Approval record',
  translation: 'Translation',
  footnote: 'Footnote',
};

function excerpt(value?: string) {
  if (!value) return 'None';
  return value.length > 240 ? `${value.slice(0, 240)}…` : value;
}

function SemanticChangeSet({diff, currentVersion}: {diff: SemanticDiffDocument; currentVersion: string}) {
  const state = semanticReportState(diff, currentVersion);
  if (state === 'missing-baseline' || state === 'invalid-baseline') {
    return (
      <div className="stack" role="alert">
        <p className="status-message">{diff.message}</p>
        <p className="muted">
          This is not a clean diff. No before/after change set is claimed until an approved baseline
          manifest can be read.
        </p>
      </div>
    );
  }
  if (state === 'stale') {
    return (
      <div className="stack" role="alert">
        <p className="status-message">
          This semantic report was generated for content version {diff.current.contentVersion}, but
          this catalog is {currentVersion}. The change set is stale and is not shown as current.
        </p>
      </div>
    );
  }

  const baseline = diff.baseline;
  return (
    <div className="stack">
      <p className="muted">
        Baseline {baseline?.contentVersion} · {baseline?.approvedEntries.toLocaleString()} entries
        with a stored approved record, {baseline?.pendingEntries.toLocaleString()} pending · current
        catalog {diff.current.contentVersion} · {diff.current.approvedEntries.toLocaleString()}{' '}
        approved, {diff.current.pendingEntries.toLocaleString()} pending. Approval is the catalog’s
        recorded status; this report does not grant it.
      </p>
      {state === 'clean' ? (
        <p className="status-message">
          No semantic changes against the approved baseline. Rebuilding unchanged inputs produces
          this empty change set.
        </p>
      ) : (
        <>
          <p>
            <strong>{diff.counts.total.toLocaleString()}</strong>{' '}
            {diff.counts.total === 1 ? 'change' : 'changes'} ·{' '}
            {diff.counts.added.toLocaleString()} added · {diff.counts.removed.toLocaleString()} removed ·{' '}
            {diff.counts.rekeyed.toLocaleString()} re-keyed · {diff.counts.changed.toLocaleString()}{' '}
            changed field{diff.counts.changed === 1 ? '' : 's'}.
          </p>
          <div className="table-scroll" tabIndex={0} role="region" aria-label="Semantic changes">
            <table>
              <caption className="sr-only">Semantic changes against the approved baseline</caption>
              <thead>
                <tr>
                  <th scope="col">Kind</th>
                  <th scope="col">Location</th>
                  <th scope="col">Field</th>
                  <th scope="col">Before</th>
                  <th scope="col">After</th>
                </tr>
              </thead>
              <tbody>
                {diff.changes.map((change, index) => (
                  <tr key={`${change.kind}-${change.entryId ?? change.ref}-${change.field ?? index}-${index}`}>
                    <th scope="row" className="content-report-kind">
                      {kindLabels[change.kind] ?? change.kind}
                    </th>
                    <td>{change.citation}</td>
                    <td>{change.field ? fieldLabels[change.field] ?? change.field : 'Entry'}</td>
                    <td className="content-report-value" title={change.before ?? ''}>
                      {excerpt(change.before)}
                    </td>
                    <td className="content-report-value" title={change.after ?? ''}>
                      {excerpt(change.after)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

export function ContentReport({
  catalog,
  overlap,
  snapshot,
}: {
  catalog: Catalog;
  overlap: Overlap;
  snapshot: DataSnapshot;
}) {
  const report = useMemo(
    () => buildContentReport({catalog, overlap, snapshot}),
    [catalog, overlap, snapshot],
  );
  const [expanded, setExpanded] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [semantic, setSemantic] = useState<{
    data?: SemanticDiffDocument;
    error?: string;
  }>({});

  useEffect(() => {
    if (!expanded) return;
    let active = true;
    setSemantic({});
    getSemanticDiff().then(
      data => {
        if (active) setSemantic({data: data as SemanticDiffDocument});
      },
      error => {
        if (active) {
          setSemantic({
            error: error instanceof Error ? error.message : 'The semantic change report could not be loaded.',
          });
        }
      },
    );
    return () => {
      active = false;
    };
  }, [expanded, attempt]);
  const examples = report.exampleGroups
    .map(group => `${group.examples} — ${group.entries.toLocaleString()}`)
    .join(' · ');

  return (
    <details
      className="content-report sheet"
      onToggle={event => setExpanded(event.currentTarget.open)}
    >
      <summary>Content report</summary>
      <div className="stack content-report-body">
        <header>
          <h2>Semantic content baseline report</h2>
          <p className="muted">
            Content version {report.contentVersion}. These figures describe stored content and study
            records, not learning.
          </p>
        </header>

        <section className="stack" aria-labelledby="content-report-change-set">
          <h2 id="content-report-change-set">Semantic change set</h2>
          {!expanded ? (
            <p className="muted">
              Open this report to compare the compiled catalog against the checked-in approved
              baseline.
            </p>
          ) : semantic.data ? (
            <SemanticChangeSet diff={semantic.data} currentVersion={report.contentVersion} />
          ) : semantic.error ? (
            <div className="stack" role="alert">
              <p className="status-message">{semantic.error} This is not a clean diff.</p>
              <button className="button button-secondary" onClick={() => setAttempt(n => n + 1)}>
                Try again
              </button>
            </div>
          ) : (
            <p role="status">Loading the semantic change report…</p>
          )}
        </section>

        <section className="stack" aria-labelledby="content-report-baseline">
          <h2 id="content-report-baseline">Baseline counts</h2>
          <div className="stats-grid" aria-label="Content baseline statistics">
            <div>
              <strong>{report.entryCount.toLocaleString()}</strong>
              <span>Course entries</span>
            </div>
            <div>
              <strong>
                {report.approvedCount.toLocaleString()} / {report.entryCount.toLocaleString()}
              </strong>
              <span>Approved entries</span>
            </div>
            <div>
              <strong>{report.overlapCount.toLocaleString()}</strong>
              <span>Course word positions</span>
              <small>of {report.totalWordPositions.toLocaleString()} compiled</small>
            </div>
            <div>
              <strong>{report.releaseReady ? 'Yes' : 'No'}</strong>
              <span>Release ready</span>
            </div>
          </div>
        </section>

        <section className="stack" aria-labelledby="content-report-approval">
          <h2 id="content-report-approval">Approval</h2>
          <div className="table-scroll" tabIndex={0} role="region" aria-label="Approval records">
            <table>
              <caption className="sr-only">Approval records by status</caption>
              <thead>
                <tr>
                  <th scope="col">Status</th>
                  <th scope="col">Entries</th>
                  <th scope="col">Reviewer</th>
                  <th scope="col">Reviewed</th>
                </tr>
              </thead>
              <tbody>
                {report.approvalGroups.map(group => (
                  <tr key={group.status}>
                    <th scope="row">{group.status === 'approved' ? 'Approved' : 'Pending'}</th>
                    <td>{group.entries.toLocaleString()}</td>
                    <td>{group.reviewers.join(', ') || 'Not recorded'}</td>
                    <td>{group.reviewedAt.join(', ') || 'Not recorded'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="muted">
            Approval is recorded per entry. This report does not infer approval from a bundle, a
            hash or an unchanged field.
          </p>
        </section>

        <section className="stack" aria-labelledby="content-report-sources">
          <h2 id="content-report-sources">Sources, roots and examples</h2>
          <div className="table-scroll" tabIndex={0} role="region" aria-label="Source bundles">
            <table>
              <caption className="sr-only">Source bundles</caption>
              <thead>
                <tr>
                  <th scope="col">Source IDs</th>
                  <th scope="col">Entries</th>
                  <th scope="col">Stored occurrences</th>
                </tr>
              </thead>
              <tbody>
                {report.sourceGroups.map(group => (
                  <tr key={group.label}>
                    <th scope="row">{group.label}</th>
                    <td>{group.entries.toLocaleString()}</td>
                    <td>{group.positions.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            <strong>{report.rootedCount.toLocaleString()}</strong> rooted ·{' '}
            <strong>{report.rootlessCount.toLocaleString()}</strong> rootless ·{' '}
            <strong>{report.distinctRootCount.toLocaleString()}</strong> distinct roots ·{' '}
            <strong>{report.sharedRootCount.toLocaleString()}</strong> shared by two or more entries.
          </p>
          <p className="muted">
            Examples per entry: {examples}. An entry without a valid example selection is listed
            under findings.
          </p>
        </section>

        <section className="stack" aria-labelledby="content-report-mapping">
          <h2 id="content-report-mapping">Stored study mapping</h2>
          <p>
            <strong>{report.storedCards.toLocaleString()}</strong>{' '}
            {report.storedCards === 1 ? 'vocabulary card' : 'vocabulary cards'} ·{' '}
            <strong>{report.storedReviews.toLocaleString()}</strong> active vocabulary{' '}
            {report.storedReviews === 1 ? 'review event' : 'review events'}. Undone reviews are
            excluded.
          </p>
          {report.orphanedEntryIds.length > 0 ? (
            <p className="status-message">
              {report.orphanedCards.toLocaleString()}{' '}
              {report.orphanedCards === 1 ? 'card' : 'cards'} and{' '}
              {report.orphanedReviews.toLocaleString()} active{' '}
              {report.orphanedReviews === 1 ? 'review' : 'reviews'} refer to{' '}
              {report.orphanedEntryIds.length.toLocaleString()}{' '}
              {report.orphanedEntryIds.length === 1 ? 'entry' : 'entries'} missing from this content
              version. They were not remapped.
            </p>
          ) : (
            <p className="muted">
              No stored vocabulary card or active review refers to a missing catalog entry.
            </p>
          )}
        </section>

        <section className="stack" aria-labelledby="content-report-findings">
          <h2 id="content-report-findings">Findings</h2>
          {report.findings.length > 0 ? (
            <ul className="content-report-findings">
              {report.findings.map(finding => (
                <li
                  key={`${finding.kind}-${finding.title}`}
                  className="content-report-finding"
                  data-severity={finding.severity}
                >
                  <div className="row between">
                    <strong>{finding.title}</strong>
                    <span className="badge">{finding.count.toLocaleString()}</span>
                  </div>
                  <p>{finding.detail}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="status-message">
              No findings in this baseline. The catalog matches its stored approval, source,
              ordering, example and study-record checks.
            </p>
          )}
        </section>
      </div>
    </details>
  );
}
