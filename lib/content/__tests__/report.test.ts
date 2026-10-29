import {describe, expect, it} from 'vitest';
import {emptyData, type CardRecord, type DataSnapshot, type ReviewEvent} from '@/lib/data/schema';
import type {Catalog, Overlap, VocabularyEntry} from '../schema';
import {buildContentReport} from '../report';

const version = '2bb58c86b4683669';

function entry(id: string, overrides: Partial<VocabularyEntry> = {}): VocabularyEntry {
  return {
    id,
    lemma: 'lemma',
    root: 'ر',
    arabic: 'عَرَبِيَّة',
    gloss: 'gloss',
    transliteration: 'translit',
    representativeKey: '1:1:1',
    exampleKeys: ['1:1:1', '1:2:1', '1:3:1'],
    occurrenceCount: 2,
    courseOrder: 1,
    sourceIds: ['source-a'],
    rootId: 'r-0000000000000001',
    approval: {status: 'approved', reviewer: 'Owner', reviewedAt: '2026-10-28', evidence: 'Reviewed'},
    ...overrides,
  };
}

function catalogOf(entries: VocabularyEntry[], overrides: Partial<Catalog> = {}): Catalog {
  return {
    contentVersion: version,
    entries,
    surahs: [] as Catalog['surahs'],
    releaseReady: true,
    blockers: [],
    ...overrides,
  };
}

function overlapOf(entries: VocabularyEntry[], totalWords = 100): Overlap {
  return {
    totalWords,
    surahs: {'1': totalWords},
    entries: Object.fromEntries(
      entries.map(item => [
        item.id,
        Array.from({length: item.occurrenceCount}, (_, index) => `1:${item.courseOrder}:${index + 1}`),
      ]),
    ),
  };
}

function card(entryId: string, collection: 'vocabulary' | 'names' = 'vocabulary'): CardRecord {
  return {
    id: collection === 'vocabulary' ? `vocabulary:${entryId}` : `names:${entryId}`,
    entryId,
    collection,
    card: {
      due: '2026-10-29T00:00:00.000Z',
      stability: 4,
      difficulty: 5,
      elapsed_days: 1,
      scheduled_days: 2,
      learning_steps: 0,
      reps: 3,
      lapses: 0,
      state: 2,
      last_review: '2026-10-28T10:00:00.000Z',
    },
    paused: false,
    contentVersion: version,
    revision: 1,
  };
}

function review(after: CardRecord, undone = false): ReviewEvent {
  return {
    id: `review-${after.id}-${undone ? 'undone' : 'active'}`,
    attemptId: `attempt-${after.id}`,
    cardId: after.id,
    sessionId: 'seed',
    timestamp: '2026-10-28T10:00:00.000Z',
    localDate: '2026-10-28',
    timeZone: 'UTC',
    grade: 3,
    before: null,
    after,
    undone,
  };
}

function reportFor(entries: VocabularyEntry[], snapshot: DataSnapshot = emptyData(), overlap = overlapOf(entries)) {
  return buildContentReport({catalog: catalogOf(entries), overlap, snapshot});
}

describe('content report', () => {
  it('reports stored semantic counts and groups without inferring approval', () => {
    const entries = [
      entry('l-0000000000000001', {courseOrder: 1, occurrenceCount: 2, exampleKeys: ['1:1:1', '1:2:1'], sourceIds: ['a', 'b']}),
      entry('l-0000000000000002', {
        courseOrder: 2,
        occurrenceCount: 1,
        root: null,
        exampleKeys: ['1:1:1'],
        sourceIds: ['a'],
        approval: {status: 'pending'},
      }),
      entry('l-0000000000000003', {
        courseOrder: 3,
        occurrenceCount: 3,
        exampleKeys: ['1:1:1', '1:2:1', '1:3:1'],
        sourceIds: ['a', 'b'],
        approval: {status: 'approved', reviewer: 'Owner', reviewedAt: '2026-10-28'},
      }),
    ];

    const report = reportFor(entries);

    expect(report.entryCount).toBe(3);
    expect(report.approvedCount).toBe(2);
    expect(report.pendingCount).toBe(1);
    expect(report.missingApprovalEvidenceCount).toBe(1);
    expect(report.missingSourceCount).toBe(0);
    expect(report.rootedCount).toBe(2);
    expect(report.rootlessCount).toBe(1);
    expect(report.distinctRootCount).toBe(1);
    expect(report.sharedRootCount).toBe(1);
    expect(report.exampleGroups).toEqual([
      {examples: 1, entries: 1},
      {examples: 2, entries: 1},
      {examples: 3, entries: 1},
    ]);
    expect(report.occurrenceCount).toBe(6);
    expect(report.overlapCount).toBe(6);
    expect(report.totalWordPositions).toBe(100);
    expect(report.sourceGroups).toEqual([
      {sourceIds: ['a', 'b'], label: 'a, b', entries: 2, positions: 5},
      {sourceIds: ['a'], label: 'a', entries: 1, positions: 1},
    ]);
    expect(report.approvalGroups).toEqual([
      {status: 'approved', entries: 2, reviewers: ['Owner'], reviewedAt: ['2026-10-28']},
      {status: 'pending', entries: 1, reviewers: [], reviewedAt: []},
    ]);
    expect(report.findings.map(finding => finding.kind)).toEqual([
      'pending-approval',
      'missing-approval-evidence',
    ]);
  });

  it('leaves a clean baseline with no findings', () => {
    const entries = [
      entry('l-0000000000000001', {courseOrder: 1, occurrenceCount: 1, root: null, exampleKeys: ['1:1:1']}),
      entry('l-0000000000000002', {
        courseOrder: 2,
        occurrenceCount: 2,
        root: 'ر',
        exampleKeys: ['1:1:1', '1:2:1'],
      }),
    ];
    const report = reportFor(entries);

    expect(report.findings).toEqual([]);
    expect(report.invalidCourseOrderCount).toBe(0);
    expect(report.occurrenceMismatchCount).toBe(0);
    expect(report.exampleMismatchCount).toBe(0);
    expect(report.representativeMismatchCount).toBe(0);
    expect(report.storedCards).toBe(0);
    expect(report.storedReviews).toBe(0);
  });

  it('flags blockers, order, occurrence, source and example drift at the catalog location', () => {
    const entries = [
      entry('l-0000000000000001', {courseOrder: 2, occurrenceCount: 2, sourceIds: ['a'], exampleKeys: ['1:1:1']}),
      entry('l-0000000000000002', {courseOrder: 2, occurrenceCount: 1, sourceIds: [], exampleKeys: ['1:1:1']}),
      entry('l-0000000000000003', {
        courseOrder: 3,
        occurrenceCount: 1,
        sourceIds: ['a'],
        exampleKeys: ['1:1:1', '1:2:1'],
        representativeKey: '1:4:1',
      }),
    ];
    const overlap: Overlap = {
      totalWords: 10,
      surahs: {'1': 10},
      entries: {
        'l-0000000000000001': ['1:2:1'],
        'l-0000000000000002': ['1:2:1'],
        'l-0000000000000003': ['1:3:1'],
      },
    };
    const report = buildContentReport({
      catalog: catalogOf(entries, {releaseReady: false, blockers: ['One blocker']}),
      overlap,
      snapshot: emptyData(),
    });

    expect(report.invalidCourseOrderCount).toBe(2);
    expect(report.occurrenceMismatchCount).toBe(1);
    expect(report.missingSourceCount).toBe(1);
    expect(report.representativeMismatchCount).toBe(1);
    expect(report.findings.map(finding => finding.kind)).toEqual([
      'release-blocker',
      'missing-source',
      'invalid-course-order',
      'occurrence-mismatch',
      'example-mismatch',
    ]);
    expect(report.findings[0]).toMatchObject({severity: 'blocker', count: 1});
  });

  it('reports orphaned stored cards and active reviews without remapping them', () => {
    const entries = [entry('l-0000000000000001', {courseOrder: 1, occurrenceCount: 1, exampleKeys: ['1:1:1']})];
    const current = card('l-0000000000000001');
    const missing = card('missing-entry');
    const names = card('1', 'names');
    const snapshot = emptyData();
    snapshot.cards = [current, missing, names];
    snapshot.reviews = [review(current), review(missing), review(missing, true), review(names)];

    const report = reportFor(entries, snapshot);

    expect(report.storedCards).toBe(2);
    expect(report.storedReviews).toBe(2);
    expect(report.orphanedCards).toBe(1);
    expect(report.orphanedReviews).toBe(1);
    expect(report.orphanedEntryIds).toEqual(['missing-entry']);
    expect(report.findings).toEqual([
      expect.objectContaining({kind: 'orphaned-progress', count: 2}),
    ]);
    expect(report.findings[0]!.detail).toContain('missing-entry');
  });

  it('does not treat a reordered entries array as a semantic change', () => {
    const entries = [
      entry('l-0000000000000001', {courseOrder: 1, occurrenceCount: 1, exampleKeys: ['1:1:1']}),
      entry('l-0000000000000002', {
        courseOrder: 2,
        occurrenceCount: 1,
        exampleKeys: ['1:2:1'],
        representativeKey: '1:2:1',
      }),
      entry('l-0000000000000003', {
        courseOrder: 3,
        occurrenceCount: 1,
        exampleKeys: ['1:3:1'],
        representativeKey: '1:3:1',
      }),
    ];
    const reordered = [entries[2]!, entries[0]!, entries[1]!];
    const report = buildContentReport({
      catalog: catalogOf(reordered),
      overlap: overlapOf(entries),
      snapshot: emptyData(),
    });

    expect(report.entryCount).toBe(3);
    expect(report.invalidCourseOrderCount).toBe(0);
    expect(report.findings).toEqual([]);
  });

  it('does not mutate the catalog, overlap or snapshot', () => {
    const entries = [entry('l-0000000000000001', {courseOrder: 1, occurrenceCount: 1, exampleKeys: ['1:1:1']})];
    const catalog = catalogOf(entries);
    const overlap = overlapOf(entries);
    const snapshot = emptyData();
    snapshot.cards = [card('l-0000000000000001')];
    snapshot.reviews = [review(card('l-0000000000000001'))];
    const before = JSON.stringify({catalog, overlap, snapshot});

    buildContentReport({catalog, overlap, snapshot});

    expect(JSON.stringify({catalog, overlap, snapshot})).toBe(before);
  });
});
