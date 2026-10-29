import {describe, expect, it} from 'vitest';
import type {Ayah, Catalog, Overlap, TranslationNote, VocabularyEntry} from '../schema';
import {
  buildSemanticDiff,
  buildSemanticSnapshot,
  invalidSemanticBaseline,
  missingSemanticBaseline,
  type SemanticBaseline,
} from '../semantic-diff';
import {semanticReportState} from '../semantic-report-state';

const version = '2bb58c86b4683669';
const otherVersion = 'aaaaaaaaaaaaaaaa';

function entry(id: string, overrides: Partial<VocabularyEntry> = {}): VocabularyEntry {
  return {
    id,
    lemma: 'مِن',
    root: 'ر',
    arabic: 'مِن',
    gloss: 'from',
    transliteration: 'min',
    representativeKey: '1:1:1',
    exampleKeys: ['1:1:1', '2:3:1', '3:4:1'],
    occurrenceCount: 2,
    courseOrder: 1,
    sourceIds: ['source-a', 'source-b'],
    rootId: 'r-0000000000000001',
    approval: {
      status: 'approved',
      reviewer: 'Owner',
      reviewedAt: '2026-10-28',
      evidence: 'Reviewed',
    },
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

function note(id: string, text: string): TranslationNote {
  return {id, text, ref: null};
}

function ayah(ref: string, translation = `Translation ${ref}`, notes: TranslationNote[] = []): Ayah {
  return {
    ref,
    tokens: [
      {
        key: `${ref}:1`,
        position: 1,
        arabic: 'كلمة',
        kind: 'word',
        gloss: 'word',
        transliteration: 'kalima',
        lemma: 'كلمة',
        root: null,
        entryId: null,
      },
    ],
    translation,
    translationSource: 'test-translation',
    notes,
  };
}

function snapshotOf(
  entries: VocabularyEntry[],
  ayahs: Ayah[] = [ayah('1:1'), ayah('1:2', 'Second', [note('1:2:n1', 'Footnote one')])],
  overlap = overlapOf(entries),
) {
  return buildSemanticSnapshot({
    catalog: catalogOf(entries),
    ayahs,
    overlap,
  });
}

function baselineOf(
  entries: VocabularyEntry[],
  ayahs?: Ayah[],
  overlap?: Overlap,
): SemanticBaseline {
  return {
    schemaVersion: 1,
    kind: 'harf-semantic-baseline',
    digest: '0'.repeat(64),
    ...snapshotOf(entries, ayahs, overlap),
  };
}

function diffOf(baseline: SemanticBaseline, current = snapshotOf([entry('l-0000000000000001')])) {
  return buildSemanticDiff({baseline, current});
}

describe('semantic baseline snapshot', () => {
  it('captures catalog approval records verbatim and counts them without approving anything itself', () => {
    const entries = [
      entry('l-0000000000000001'),
      entry('l-0000000000000002', {
        courseOrder: 2,
        approval: {status: 'pending'},
      }),
    ];
    const snapshot = snapshotOf(entries);

    expect(snapshot.entries.map(item => item.approval)).toEqual([
      {status: 'approved', reviewer: 'Owner', reviewedAt: '2026-10-28', evidence: 'Reviewed'},
      {status: 'pending'},
    ]);
    expect(snapshot.approvalCounts).toEqual({approved: 1, pending: 1});
    expect(snapshot.entries.map(item => item.occurrenceKeys)).toEqual([
      ['1:1:1', '1:1:2'],
      ['1:2:1', '1:2:2'],
    ]);
  });

  it('does not mutate the catalog, ayahs or overlap', () => {
    const entries = [entry('l-0000000000000001')];
    const catalog = catalogOf(entries);
    const overlap = overlapOf(entries);
    const ayahs = [ayah('1:1'), ayah('1:2', 'Second', [note('1:2:n1', 'Footnote one')])];
    const before = JSON.stringify({catalog, overlap, ayahs});

    buildSemanticSnapshot({catalog, ayahs, overlap});

    expect(JSON.stringify({catalog, overlap, ayahs})).toBe(before);
  });
});

describe('semantic diff', () => {
  it('produces an empty change set for unchanged inputs', () => {
    const entries = [entry('l-0000000000000001')];
    const current = snapshotOf(entries);
    const diff = buildSemanticDiff({baseline: baselineOf(entries), current});

    expect(diff.status).toBe('ok');
    expect(diff.changes).toEqual([]);
    expect(diff.counts).toEqual({added: 0, removed: 0, rekeyed: 0, changed: 0, total: 0});
    expect(semanticReportState(diff, version)).toBe('clean');
  });

  it('reports a changed representative example at its human-readable ayah location', () => {
    const before = entry('l-0000000000000001');
    const after = entry('l-0000000000000001', {
      representativeKey: '2:3:1',
      exampleKeys: ['2:3:1', '1:1:1', '3:4:1'],
    });
    const diff = diffOf(baselineOf([before]), snapshotOf([after]));

    expect(diff.changes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'changed',
          scope: 'entry',
          field: 'representativeExample',
          entryId: before.id,
          before: '1:1:1',
          after: '2:3:1',
          citation: expect.stringContaining('Al-Baqarah 2:3'),
        }),
        expect.objectContaining({
          kind: 'changed',
          field: 'examples',
          before: '1:1:1, 2:3:1, 3:4:1',
          after: '2:3:1, 1:1:1, 3:4:1',
        }),
      ]),
    );
    expect(diff.counts.changed).toBe(2);
    expect(semanticReportState(diff, version)).toBe('changed');
  });

  it('reports lemma, root, Arabic, gloss and source changes separately', () => {
    const before = entry('l-0000000000000001');
    const after = entry('l-0000000000000001', {
      lemma: 'إِلَىٰ',
      root: 'س',
      arabic: 'إِلَىٰ',
      gloss: 'towards',
      sourceIds: ['source-b', 'source-c'],
    });
    const diff = diffOf(baselineOf([before]), snapshotOf([after]));
    const fields = diff.changes.map(change => change.field);

    expect(fields).toEqual(
      expect.arrayContaining(['arabic', 'lemma', 'root', 'gloss', 'sourceIds']),
    );
    expect(diff.changes.find(change => change.field === 'sourceIds')).toMatchObject({
      before: 'source-a, source-b',
      after: 'source-b, source-c',
    });
    expect(diff.changes.find(change => change.field === 'root')).toMatchObject({
      before: 'ر',
      after: 'س',
    });
    expect(diff.counts.changed).toBe(5);
  });

  it('classifies a changed entry ID with the same lemma as re-keyed, not removed plus added', () => {
    const before = entry('l-0000000000000001');
    const after = entry('l-0000000000000002', {root: 'س', rootId: 'r-0000000000000002'});
    const diff = diffOf(baselineOf([before]), snapshotOf([after]));

    expect(diff.counts).toMatchObject({added: 0, removed: 0, rekeyed: 1, changed: 1});
    expect(diff.changes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'rekeyed',
          scope: 'entry',
          previousEntryId: 'l-0000000000000001',
          entryId: 'l-0000000000000002',
          citation: expect.stringContaining('Al-Fatihah 1:1'),
        }),
        expect.objectContaining({
          kind: 'changed',
          entryId: 'l-0000000000000002',
          field: 'root',
          before: 'ر',
          after: 'س',
        }),
      ]),
    );
  });

  it('classifies added and removed entries and leaves unrelated entries alone', () => {
    const kept = entry('l-0000000000000001');
    const removed = entry('l-0000000000000002', {courseOrder: 2, lemma: 'قَالَ', root: 'قول'});
    const added = entry('l-0000000000000003', {courseOrder: 3, lemma: 'كَانَ', root: 'كون'});
    const diff = diffOf(baselineOf([kept, removed]), snapshotOf([kept, added]));

    expect(diff.counts).toMatchObject({added: 1, removed: 1, rekeyed: 0, changed: 0});
    expect(diff.changes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'removed',
          entryId: removed.id,
          before: expect.stringContaining('قَالَ'),
        }),
        expect.objectContaining({
          kind: 'added',
          entryId: added.id,
          after: expect.stringContaining('كَانَ'),
        }),
      ]),
    );
  });

  it('reports translation and footnote changes with their ayah citation', () => {
    const entries = [entry('l-0000000000000001')];
    const before = [ayah('1:1'), ayah('1:2', 'Second', [note('1:2:n1', 'Footnote one')])];
    const after = [
      ayah('1:1', 'Changed translation'),
      ayah('1:2', 'Second', [note('1:2:n1', 'Footnote one changed')]),
    ];
    const diff = diffOf(baselineOf(entries, before), snapshotOf(entries, after));

    expect(diff.changes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'changed',
          scope: 'ayah',
          field: 'translation',
          ref: '1:1',
          before: 'Translation 1:1',
          after: 'Changed translation',
          citation: 'Al-Fatihah 1:1 translation',
        }),
        expect.objectContaining({
          kind: 'changed',
          scope: 'ayah',
          field: 'footnote',
          ref: '1:2',
          noteId: '1:2:n1',
          before: 'Footnote one',
          after: 'Footnote one changed',
          citation: 'Al-Fatihah 1:2 footnote 1:2:n1',
        }),
      ]),
    );
    expect(diff.counts.changed).toBe(2);
  });

  it('does not treat reordered entries, source IDs or notes as semantic changes', () => {
    const first = entry('l-0000000000000001', {courseOrder: 1});
    const second = entry('l-0000000000000002', {
      courseOrder: 2,
      lemma: 'قَالَ',
      root: 'قول',
      sourceIds: ['source-a', 'source-b'],
    });
    const beforeAyahs = [
      ayah('1:1'),
      ayah('1:2', 'Second', [note('1:2:n1', 'Footnote one'), note('1:2:n2', 'Footnote two')]),
    ];
    const afterAyahs = [
      ayah('1:1'),
      ayah('1:2', 'Second', [note('1:2:n2', 'Footnote two'), note('1:2:n1', 'Footnote one')]),
    ];
    const reordered = [second, first].map(item => ({
      ...item,
      sourceIds: [...item.sourceIds].reverse(),
    }));
    const diff = diffOf(
      baselineOf([first, second], beforeAyahs),
      snapshotOf(reordered, afterAyahs),
    );

    expect(diff.changes).toEqual([]);
    expect(diff.counts.total).toBe(0);
  });

  it('reports occurrence additions and removals at the word position', () => {
    const before = entry('l-0000000000000001', {occurrenceCount: 2});
    const after = entry('l-0000000000000001', {occurrenceCount: 2});
    const beforeOverlap: Overlap = {
      totalWords: 100,
      surahs: {'1': 100},
      entries: {[before.id]: ['1:1:1', '1:1:2']},
    };
    const afterOverlap: Overlap = {
      totalWords: 100,
      surahs: {'1': 100},
      entries: {[after.id]: ['1:1:1', '2:3:1']},
    };
    const diff = buildSemanticDiff({
      baseline: baselineOf([before], undefined, beforeOverlap),
      current: snapshotOf([after], undefined, afterOverlap),
    });

    expect(diff.changes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'changed',
          field: 'occurrences',
          citation: 'Al-Baqarah 2:3 word 1',
          after: '1:1:1, 2:3:1',
        }),
      ]),
    );
  });

  it('does not mutate the baseline or current snapshots', () => {
    const baseline = baselineOf([entry('l-0000000000000001')]);
    const current = snapshotOf([entry('l-0000000000000001')]);
    const before = JSON.stringify({baseline, current});

    buildSemanticDiff({baseline, current});

    expect(JSON.stringify({baseline, current})).toBe(before);
  });
});

describe('semantic report status', () => {
  const current = snapshotOf([entry('l-0000000000000001')]);

  it('says plainly when no baseline manifest exists', () => {
    const diff = missingSemanticBaseline(current);

    expect(diff.status).toBe('missing-baseline');
    expect(diff.changes).toEqual([]);
    expect(diff.message).toMatch(/no approved baseline manifest/i);
    expect(semanticReportState(diff, version)).toBe('missing-baseline');
  });

  it('says plainly when the baseline does not match its own digest or schema', () => {
    const diff = invalidSemanticBaseline(current, 'The baseline digest does not match its contents.');

    expect(diff.status).toBe('invalid-baseline');
    expect(diff.message).toBe('The baseline digest does not match its contents.');
    expect(semanticReportState(diff, version)).toBe('invalid-baseline');
  });

  it('marks a generated report stale when the loaded catalog is a different version', () => {
    const diff = buildSemanticDiff({
      baseline: baselineOf([entry('l-0000000000000001')]),
      current,
    });

    expect(semanticReportState(diff, otherVersion)).toBe('stale');
    expect(semanticReportState(diff, version)).toBe('clean');
  });

  it('does not present a missing baseline as a clean diff', () => {
    const diff = missingSemanticBaseline(current);

    expect(diff.status).not.toBe('ok');
    expect(diff.changes).toEqual([]);
    expect(semanticReportState(diff, version)).not.toBe('clean');
  });
});
