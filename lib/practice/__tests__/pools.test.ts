import {describe, expect, it} from 'vitest';
import type {Ayah} from '@/lib/content/schema';
import {emptyData, type DataSnapshot} from '@/lib/data/schema';
import {buildStudyThreads} from '@/lib/learning/study-thread';
import {buildFocusedPracticePool, focusedPracticeReason} from '../pools';

const first = 'l-1111111111111111';
const second = 'l-2222222222222222';
const third = 'l-3333333333333333';
const fourth = 'l-4444444444444444';

function withData(mutate: (data: DataSnapshot) => void): DataSnapshot {
  const data = emptyData();
  mutate(data);
  return data;
}

function ayah(ref: string, entryIds: Array<string | null>): Ayah {
  return {
    ref,
    tokens: entryIds.map((entryId, index) => ({
      key: `${ref}:${index + 1}`,
      position: index + 1,
      arabic: 'كلمة',
      kind: 'word',
      gloss: `gloss ${index + 1}`,
      transliteration: 'kalima',
      lemma: null,
      root: null,
      entryId,
    })),
    translation: `Translation of ${ref}`,
    translationSource: 'test',
    notes: [],
  } as Ayah;
}

function bookmarkOnly(data: DataSnapshot, reference = '1:5') {
  data.bookmarks.push({id: reference, createdAt: '2026-10-28T10:00:00.000Z'});
  return buildStudyThreads(data)[0]!;
}

describe('buildFocusedPracticePool', () => {
  it('uses all course words and a bookmark reason when nothing else is saved', () => {
    const data = withData(snapshot => {
      bookmarkOnly(snapshot);
    });
    const thread = buildStudyThreads(data)[0]!;
    const pool = buildFocusedPracticePool(thread, [ayah('1:5', [first, second])], data);

    expect(pool).toEqual({entryIds: [first, second], reason: 'bookmark'});
    expect(focusedPracticeReason(pool!, thread)).toBe('Because you bookmarked this ayah.');
  });

  it('narrows to the assessed ayah and explains why only when an assessment asks for another look', () => {
    const data = withData(snapshot => {
      snapshot.meta.passageLearning = {
        assessments: [
          {
            reference: '1:5',
            assessment: 'Need another look',
            obstacle: 'word',
            updatedAt: '2026-10-28T10:00:00.000Z',
          },
          {
            reference: '1:6',
            assessment: 'Understood',
            obstacle: 'none',
            updatedAt: '2026-10-28T11:00:00.000Z',
          },
        ],
      };
    });
    const thread = buildStudyThreads(data).find(item => item.ref === '1:5')!;
    const pool = buildFocusedPracticePool(
      thread,
      [ayah('1:5', [first, second]), ayah('1:6', [third])],
      data,
    );

    expect(pool).toEqual({entryIds: [first, second], reason: 'needs-revisit'});
    expect(focusedPracticeReason(pool!, thread)).toBe(
      'Because you marked this ayah as needing another look.',
    );
  });

  it('uses only entries already queued when the saved thread intersects priority entries', () => {
    const data = withData(snapshot => {
      bookmarkOnly(snapshot);
      snapshot.meta.priorityEntries = [second, fourth];
    });
    const thread = buildStudyThreads(data)[0]!;
    const pool = buildFocusedPracticePool(thread, [ayah('1:5', [first, second, third])], data);

    expect(pool).toEqual({entryIds: [second], reason: 'queued'});
    expect(focusedPracticeReason(pool!, thread)).toBe(
      'Because these words are already queued from this saved ayah.',
    );
  });

  it('uses all course words for a reflection-only thread', () => {
    const data = withData(snapshot => {
      snapshot.notes.push({
        id: 'ayah-1-5',
        text: 'A construction worth revisiting.',
        updatedAt: '2026-10-28T10:00:00.000Z',
      });
    });
    const thread = buildStudyThreads(data)[0]!;
    const pool = buildFocusedPracticePool(thread, [ayah('1:5', [first, second])], data);

    expect(pool).toEqual({entryIds: [first, second], reason: 'reflection'});
    expect(focusedPracticeReason(pool!, thread)).toBe(
      'Because you saved a reflection on this ayah.',
    );
  });

  it('targets assessed ayahs inside a saved passage and deduplicates their entries', () => {
    const data = withData(snapshot => {
      snapshot.meta.passageLearning = {
        range: {reference: '1:5', current: 6, end: 7},
        assessments: [
          {
            reference: '1:6',
            assessment: 'Need another look',
            obstacle: 'word',
            updatedAt: '2026-10-28T10:00:00.000Z',
          },
          {
            reference: '1:7',
            assessment: 'Understood',
            obstacle: 'none',
            updatedAt: '2026-10-28T11:00:00.000Z',
          },
        ],
      };
    });
    const thread = buildStudyThreads(data).find(item => item.kind === 'passage')!;
    const pool = buildFocusedPracticePool(
      thread,
      [
        ayah('1:5', [first]),
        ayah('1:6', [second, third]),
        ayah('1:7', [third, fourth]),
      ],
      data,
    );

    expect(pool).toEqual({entryIds: [second, third], reason: 'needs-revisit'});
    expect(focusedPracticeReason(pool!, thread)).toBe(
      'Because this saved passage includes an ayah you marked as needing another look.',
    );
  });

  it('lets an explicit preparation choose queued words over an assessment', () => {
    const data = withData(snapshot => {
      snapshot.meta.priorityEntries = [second];
      snapshot.meta.passageLearning = {
        assessments: [{
          reference: '1:5',
          assessment: 'Need another look',
          obstacle: 'word',
          updatedAt: '2026-10-28T10:00:00.000Z',
        }],
      };
    });
    const thread = buildStudyThreads(data).find(item => item.ref === '1:5')!;
    const pool = buildFocusedPracticePool(
      thread,
      [ayah('1:5', [first, second, third])],
      data,
      {preferQueued: true},
    );

    expect(pool).toEqual({entryIds: [second], reason: 'queued'});
  });

  it('falls back to the assessment when an explicit preparation has no queued words', () => {
    const data = withData(snapshot => {
      snapshot.meta.passageLearning = {
        assessments: [{
          reference: '1:5',
          assessment: 'Need another look',
          obstacle: 'word',
          updatedAt: '2026-10-28T10:00:00.000Z',
        }],
      };
    });
    const thread = buildStudyThreads(data).find(item => item.ref === '1:5')!;
    const pool = buildFocusedPracticePool(
      thread,
      [ayah('1:5', [first, second, third])],
      data,
      {preferQueued: true},
    );

    expect(pool).toEqual({entryIds: [first, second, third], reason: 'needs-revisit'});
  });

  it('does not invent a revisit reason for an Understood-only assessment', () => {
    const data = withData(snapshot => {
      snapshot.meta.passageLearning = {
        assessments: [{
          reference: '1:5',
          assessment: 'Understood',
          obstacle: 'none',
          updatedAt: '2026-10-28T10:00:00.000Z',
        }],
      };
    });
    const thread = buildStudyThreads(data)[0]!;
    const pool = buildFocusedPracticePool(thread, [ayah('1:5', [first])], data);

    expect(pool).toEqual({entryIds: [first], reason: 'saved'});
    expect(focusedPracticeReason(pool!, thread)).toBe('Because this ayah is in your saved study.');
  });

  it('returns null when the saved content has no course words', () => {
    const data = withData(snapshot => {
      bookmarkOnly(snapshot);
    });
    const thread = buildStudyThreads(data)[0]!;

    expect(buildFocusedPracticePool(thread, [ayah('1:5', [null])], data)).toBeNull();
  });

  it('does not mutate the snapshot or content', () => {
    const data = withData(snapshot => {
      bookmarkOnly(snapshot);
      snapshot.meta.priorityEntries = [first];
    });
    const thread = buildStudyThreads(data)[0]!;
    const ayahs = [ayah('1:5', [first, second])];
    const before = structuredClone({data, ayahs});

    buildFocusedPracticePool(thread, ayahs, data);

    expect({data, ayahs}).toEqual(before);
  });
});
