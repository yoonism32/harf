import type {DataSnapshot} from '@/lib/data/schema';
import type {Catalog, Overlap, VocabularyEntry} from './schema';

export type ContentReportFindingKind =
  | 'release-blocker'
  | 'pending-approval'
  | 'missing-approval-evidence'
  | 'missing-source'
  | 'invalid-course-order'
  | 'occurrence-mismatch'
  | 'example-mismatch'
  | 'orphaned-progress';

export type ContentReportFinding = {
  kind: ContentReportFindingKind;
  severity: 'blocker' | 'review';
  title: string;
  detail: string;
  count: number;
};

export type ContentReportSourceGroup = {
  sourceIds: string[];
  label: string;
  entries: number;
  positions: number;
};

export type ContentReportApprovalGroup = {
  status: 'approved' | 'pending';
  entries: number;
  reviewers: string[];
  reviewedAt: string[];
};

export type ContentReportExampleGroup = {
  examples: number;
  entries: number;
};

export type ContentReport = {
  contentVersion: string;
  releaseReady: boolean;
  entryCount: number;
  approvedCount: number;
  pendingCount: number;
  missingApprovalEvidenceCount: number;
  missingSourceCount: number;
  sourceGroups: ContentReportSourceGroup[];
  approvalGroups: ContentReportApprovalGroup[];
  rootedCount: number;
  rootlessCount: number;
  distinctRootCount: number;
  sharedRootCount: number;
  exampleGroups: ContentReportExampleGroup[];
  representativeMismatchCount: number;
  exampleMismatchCount: number;
  invalidCourseOrderCount: number;
  occurrenceMismatchCount: number;
  occurrenceCount: number;
  overlapCount: number;
  totalWordPositions: number;
  storedCards: number;
  storedReviews: number;
  orphanedCards: number;
  orphanedReviews: number;
  orphanedEntryIds: string[];
  findings: ContentReportFinding[];
};

export type ContentReportInput = {
  catalog: Catalog;
  overlap: Overlap;
  snapshot: DataSnapshot;
};

function approvalIsComplete(entry: VocabularyEntry) {
  return Boolean(entry.approval.reviewer && entry.approval.reviewedAt && entry.approval.evidence);
}

function hasExampleProblem(entry: VocabularyEntry) {
  const keys = entry.exampleKeys;
  if (keys.length === 0) return true;
  if (entry.representativeKey !== keys[0]) return true;
  if (new Set(keys).size !== keys.length) return true;
  const verses = keys.map(key => key.split(':').slice(0, 2).join(':'));
  return new Set(verses).size !== verses.length;
}

function previewIds(ids: string[], limit = 3) {
  if (ids.length <= limit) return ids.join(', ');
  return `${ids.slice(0, limit).join(', ')} and ${ids.length - limit} more`;
}

export function buildContentReport({catalog, overlap, snapshot}: ContentReportInput): ContentReport {
  const entries = catalog.entries;
  const catalogIds = new Set(entries.map(entry => entry.id));
  const approved = entries.filter(entry => entry.approval.status === 'approved');
  const pending = entries.filter(entry => entry.approval.status !== 'approved');
  const missingApprovalEvidence = approved.filter(entry => !approvalIsComplete(entry));
  const missingSource = entries.filter(entry => entry.sourceIds.length === 0);

  const sourceGroups = new Map<string, ContentReportSourceGroup>();
  const approvalGroups = new Map<'approved' | 'pending', ContentReportApprovalGroup>();
  const roots = new Map<string, number>();
  const examples = new Map<number, number>();
  let occurrenceCount = 0;
  let overlapCount = 0;
  let representativeMismatchCount = 0;
  let exampleMismatchCount = 0;
  let invalidCourseOrderCount = 0;
  let occurrenceMismatchCount = 0;

  const courseOrdered = [...entries].sort((a, b) => a.courseOrder - b.courseOrder);
  const seenCourseOrders = new Set<number>();
  courseOrdered.forEach((entry, index) => {
    if (entry.courseOrder !== index + 1 || seenCourseOrders.has(entry.courseOrder)) invalidCourseOrderCount++;
    seenCourseOrders.add(entry.courseOrder);
  });

  for (const entry of entries) {
    const sourceIds = [...new Set(entry.sourceIds)].sort((a, b) => a.localeCompare(b, undefined, {numeric: true}));
    const sourceKey = sourceIds.join('\u0000') || '__none__';
    const sourceGroup = sourceGroups.get(sourceKey) ?? {
      sourceIds,
      label: sourceIds.length ? sourceIds.join(', ') : 'No source IDs',
      entries: 0,
      positions: 0,
    };
    sourceGroup.entries++;
    sourceGroup.positions += entry.occurrenceCount;
    sourceGroups.set(sourceKey, sourceGroup);

    const status = entry.approval.status;
    const approvalGroup = approvalGroups.get(status) ?? {
      status,
      entries: 0,
      reviewers: [],
      reviewedAt: [],
    };
    approvalGroup.entries++;
    if (entry.approval.reviewer && !approvalGroup.reviewers.includes(entry.approval.reviewer)) {
      approvalGroup.reviewers.push(entry.approval.reviewer);
    }
    if (entry.approval.reviewedAt && !approvalGroup.reviewedAt.includes(entry.approval.reviewedAt)) {
      approvalGroup.reviewedAt.push(entry.approval.reviewedAt);
    }
    approvalGroups.set(status, approvalGroup);

    const root = entry.root?.trim() ?? '';
    if (root) roots.set(root, (roots.get(root) ?? 0) + 1);
    const exampleCount = entry.exampleKeys.length;
    examples.set(exampleCount, (examples.get(exampleCount) ?? 0) + 1);

    occurrenceCount += entry.occurrenceCount;
    const overlapLength = overlap.entries[entry.id]?.length ?? 0;
    overlapCount += overlapLength;
    if (overlapLength !== entry.occurrenceCount) occurrenceMismatchCount++;

    if (entry.representativeKey !== entry.exampleKeys[0]) representativeMismatchCount++;
    if (hasExampleProblem(entry)) exampleMismatchCount++;
  }

  const rootedCount = entries.filter(entry => Boolean(entry.root?.trim())).length;
  const rootlessCount = entries.length - rootedCount;
  const sharedRootCount = [...roots.values()].filter(count => count > 1).length;
  const vocabularyCards = snapshot.cards.filter(card => card.collection === 'vocabulary');
  const vocabularyReviews = snapshot.reviews.filter(
    review => !review.undone && review.after.collection === 'vocabulary',
  );
  const orphanedCardRecords = vocabularyCards.filter(card => !catalogIds.has(card.entryId));
  const orphanedReviewRecords = vocabularyReviews.filter(review => !catalogIds.has(review.after.entryId));
  const orphanedEntryIds = [
    ...new Set([
      ...orphanedCardRecords.map(card => card.entryId),
      ...orphanedReviewRecords.map(review => review.after.entryId),
    ]),
  ].sort();

  const findings: ContentReportFinding[] = [];
  if (catalog.blockers.length > 0) {
    findings.push({
      kind: 'release-blocker',
      severity: 'blocker',
      title: catalog.blockers.length === 1 ? 'Release blocker' : `${catalog.blockers.length} release blockers`,
      detail: catalog.blockers.join(' '),
      count: catalog.blockers.length,
    });
  } else if (!catalog.releaseReady) {
    findings.push({
      kind: 'release-blocker',
      severity: 'blocker',
      title: 'Catalog is not release-ready',
      detail: 'The catalog reports releaseReady: false without a stored blocker reason.',
      count: 1,
    });
  }

  if (pending.length > 0) {
    findings.push({
      kind: 'pending-approval',
      severity: 'review',
      title: `${pending.length} course ${pending.length === 1 ? 'entry is' : 'entries are'} not approved`,
      detail: `Not approved for release: ${previewIds(pending.map(entry => entry.id))}.`,
      count: pending.length,
    });
  }

  if (missingApprovalEvidence.length > 0) {
    findings.push({
      kind: 'missing-approval-evidence',
      severity: 'review',
      title: `${missingApprovalEvidence.length} approved ${missingApprovalEvidence.length === 1 ? 'entry lacks' : 'entries lack'} a complete approval record`,
      detail: `Reviewer, review date or evidence is missing for ${previewIds(missingApprovalEvidence.map(entry => entry.id))}.`,
      count: missingApprovalEvidence.length,
    });
  }

  if (missingSource.length > 0) {
    findings.push({
      kind: 'missing-source',
      severity: 'review',
      title: `${missingSource.length} ${missingSource.length === 1 ? 'entry has' : 'entries have'} no source ID`,
      detail: `No pinned source is recorded for ${previewIds(missingSource.map(entry => entry.id))}.`,
      count: missingSource.length,
    });
  }

  if (invalidCourseOrderCount > 0) {
    findings.push({
      kind: 'invalid-course-order',
      severity: 'review',
      title: `${invalidCourseOrderCount} ${invalidCourseOrderCount === 1 ? 'entry has' : 'entries have'} an invalid course position`,
      detail: 'Course positions are not unique and contiguous from 1 after sorting.',
      count: invalidCourseOrderCount,
    });
  }

  if (occurrenceMismatchCount > 0) {
    findings.push({
      kind: 'occurrence-mismatch',
      severity: 'review',
      title: `${occurrenceMismatchCount} ${occurrenceMismatchCount === 1 ? 'entry disagrees' : 'entries disagree'} with the compiled overlap`,
      detail: 'The stored occurrenceCount does not match the number of compiled word positions for the entry.',
      count: occurrenceMismatchCount,
    });
  }

  if (exampleMismatchCount > 0) {
    findings.push({
      kind: 'example-mismatch',
      severity: 'review',
      title: `${exampleMismatchCount} ${exampleMismatchCount === 1 ? 'entry has' : 'entries have'} an invalid example selection`,
      detail: 'The representative key is not first, an example repeats, two examples share a verse, or no example is stored.',
      count: exampleMismatchCount,
    });
  }

  if (orphanedEntryIds.length > 0) {
    findings.push({
      kind: 'orphaned-progress',
      severity: 'review',
      title: 'Stored study records are orphaned',
      detail: `${orphanedCardRecords.length} ${orphanedCardRecords.length === 1 ? 'card' : 'cards'} and ${orphanedReviewRecords.length} active ${orphanedReviewRecords.length === 1 ? 'review refer' : 'reviews refer'} to entries missing from this content version: ${previewIds(orphanedEntryIds)}. They were not remapped.`,
      count: orphanedCardRecords.length + orphanedReviewRecords.length,
    });
  }

  return {
    contentVersion: catalog.contentVersion,
    releaseReady: catalog.releaseReady,
    entryCount: entries.length,
    approvedCount: approved.length,
    pendingCount: pending.length,
    missingApprovalEvidenceCount: missingApprovalEvidence.length,
    missingSourceCount: missingSource.length,
    sourceGroups: [...sourceGroups.values()].sort(
      (a, b) => b.entries - a.entries || a.label.localeCompare(b.label),
    ),
    approvalGroups: [...approvalGroups.values()].sort(
      (a, b) => Number(b.status === 'approved') - Number(a.status === 'approved'),
    ),
    rootedCount,
    rootlessCount,
    distinctRootCount: roots.size,
    sharedRootCount,
    exampleGroups: [1, 2, 3].map(count => ({examples: count, entries: examples.get(count) ?? 0})),
    representativeMismatchCount,
    exampleMismatchCount,
    invalidCourseOrderCount,
    occurrenceMismatchCount,
    occurrenceCount,
    overlapCount,
    totalWordPositions: overlap.totalWords,
    storedCards: vocabularyCards.length,
    storedReviews: vocabularyReviews.length,
    orphanedCards: orphanedCardRecords.length,
    orphanedReviews: orphanedReviewRecords.length,
    orphanedEntryIds,
    findings,
  };
}
