import {describe, expect, it} from 'vitest';
import type {Ayah} from '@/lib/content/schema';
import type {CardRecord, DataSnapshot, ReviewEvent} from '@/lib/data/schema';
import {emptyData} from '@/lib/data/schema';
import {
  buildPassagePreparation,
  preparationStateLabels,
} from '../preparation';

const first = 'l-1111111111111111';
const second = 'l-2222222222222222';
const third = 'l-3333333333333333';
const fourth = 'l-4444444444444444';
const fifth = 'l-5555555555555555';

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

function card(entryId: string, familiar = false): CardRecord {
  return {
    id: `vocabulary:${entryId}`,
    entryId,
    collection: 'vocabulary',
    card: {
      due: '2026-11-01T00:00:00.000Z',
      stability: familiar ? 30 : 1,
      difficulty: 5,
      elapsed_days: 0,
      scheduled_days: familiar ? 30 : 1,
      learning_steps: 0,
      reps: 1,
      lapses: 0,
      state: familiar ? 2 : 1,
      last_review: '2026-10-28T00:00:00.000Z',
    },
    paused: false,
    contentVersion: 'test',
    revision: 1,
  };
}

function review(entryId: string, timestamp: string, grade: number, undone = false): ReviewEvent {
  return {
    timestamp,
    undone,
    grade,
    after: {collection: 'vocabulary', entryId},
  } as unknown as ReviewEvent;
}

describe('buildPassagePreparation', () => {
  it('deduplicates course words and reports only supported states', () => {
    const data = withData(snapshot => {
      snapshot.meta.priorityEntries = [second];
      snapshot.cards.push(card(third, true), card(fourth), card(fifth));
      snapshot.reviews.push(
        review(third, '2026-10-28T08:00:00.000Z', 4),
        review(fourth, '2026-10-28T09:00:00.000Z', 3),
        review(fifth, '2026-10-28T10:00:00.000Z', 1),
      );
    });

    const preparation = buildPassagePreparation(
      [ayah('1:5', [first, second, third, fourth, fifth, first, null])],
      data,
    );

    expect(preparation.entries.map(entry => [entry.entryId, entry.state])).toEqual([
      [first, 'untouched'],
      [second, 'queued'],
      [third, 'familiar'],
      [fourth, 'learning'],
      [fifth, 'recently-missed'],
    ]);
    expect(preparation.queuedCount).toBe(1);
    expect(preparation.entries.every(entry => entry.queued === (entry.state === 'queued'))).toBe(true);
  });

  it('uses the latest non-undone review and ignores undone events', () => {
    const data = withData(snapshot => {
      snapshot.cards.push(card(first), card(second));
      snapshot.reviews.push(
        review(first, '2026-10-28T08:00:00.000Z', 1),
        review(first, '2026-10-28T09:00:00.000Z', 4),
        review(second, '2026-10-28T10:00:00.000Z', 1, true),
      );
    });

    const preparation = buildPassagePreparation([ayah('1:5', [first, second])], data);

    expect(preparation.entries).toMatchObject([
      {entryId: first, state: 'learning'},
      {entryId: second, state: 'learning'},
    ]);
  });

  it('stays untouched when only an undone review exists', () => {
    const data = withData(snapshot => {
      snapshot.reviews.push(review(first, '2026-10-28T10:00:00.000Z', 1, true));
    });

    const preparation = buildPassagePreparation([ayah('1:5', [first])], data);

    expect(preparation.entries[0]).toMatchObject({entryId: first, state: 'untouched', queued: false});
  });

  it('returns an empty preparation when the passage has no course words', () => {
    const preparation = buildPassagePreparation([ayah('19:1', [null, null])], emptyData());

    expect(preparation).toEqual({entries: [], queuedCount: 0});
  });

  it('has one label for every supported state', () => {
    expect(preparationStateLabels).toEqual({
      queued: 'Already queued',
      'recently-missed': 'Last review was difficult',
      familiar: 'Familiar',
      learning: 'In progress',
      untouched: 'Not started',
    });
  });

  it('does not mutate the snapshot or content', () => {
    const data = withData(snapshot => {
      snapshot.meta.priorityEntries = [first];
      snapshot.cards.push(card(first));
    });
    const ayahs = [ayah('1:5', [first, second])];
    const before = structuredClone({data, ayahs});

    buildPassagePreparation(ayahs, data);

    expect({data, ayahs}).toEqual(before);
  });
});
