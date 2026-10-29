import {describe, expect, it} from 'vitest';
import surahs from '@/data/quran-surah-meta.json';
import type {Ayah} from '@/lib/content/schema';
import {emptyData, type DataSnapshot, type ReviewEvent} from '@/lib/data/schema';
import {buildStudyThreadDetail, buildStudyThreads, passageRefs} from '../study-thread';

const vocabularyNoteId = 'l-0123456789abcdef';

function withData(mutate: (data: DataSnapshot) => void): DataSnapshot {
  const data = emptyData();
  mutate(data);
  return data;
}

function review(entryId: string, timestamp: string, undone = false): ReviewEvent {
  return {timestamp, undone, after: {collection: 'vocabulary', entryId}} as unknown as ReviewEvent;
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

describe('buildStudyThreads', () => {
  it('merges one ayah into one row and keeps note kinds separate', () => {
    const data = withData(snapshot => {
      snapshot.bookmarks.push(
        {id: '1:5', createdAt: '2026-10-28T10:00:00.000Z'},
        {id: '1:1', createdAt: '2026-10-28T09:00:00.000Z'},
      );
      snapshot.notes.push(
        {id: 'ayah-1-5', text: '  A construction worth revisiting.  ', updatedAt: '2026-10-28T11:00:00.000Z'},
        {id: vocabularyNoteId, text: 'Vocabulary mnemonic', updatedAt: '2026-10-28T12:00:00.000Z'},
        {id: 'ayah-1-5-extra', text: 'Invalid reflection id', updatedAt: '2026-10-28T12:00:00.000Z'},
        {id: 'ayah-1-1', text: '   ', updatedAt: '2026-10-28T12:00:00.000Z'},
      );
      snapshot.meta.passageLearning = {
        assessments: [{
          reference: '1:5',
          assessment: 'Need another look',
          obstacle: 'construction',
          updatedAt: '2026-10-28T13:00:00.000Z',
        }],
      };
    });

    const threads = buildStudyThreads(data);
    expect(threads.map(thread => thread.ref)).toEqual(['1:5', '1:1']);
    const thread = threads[0]!;
    expect(thread.kind).toBe('ayah');
    expect(thread.signals).toEqual({
      bookmarked: true,
      reflected: true,
      needsRevisit: true,
      needsRevisitCount: 1,
    });
    expect(thread.assessments).toHaveLength(1);
    expect(thread.reflection?.id).toBe('ayah-1-5');
    expect(thread.reflectionExcerpt).toBe('A construction worth revisiting.');
    expect(thread.lastActivityAt).toBe('2026-10-28T13:00:00.000Z');
    expect(threads.some(item => item.reflection?.id === vocabularyNoteId)).toBe(false);
    expect(threads.some(item => item.ref === '1:5-extra')).toBe(false);
    expect(threads[1]!.signals.reflected).toBe(false);
  });

  it('keeps an orphaned saved reference visible and deterministic when dates tie', () => {
    const data = withData(snapshot => {
      snapshot.bookmarks.push(
        {id: '999:1', createdAt: '2026-10-28T10:00:00.000Z'},
        {id: '1:2', createdAt: '2026-10-28T10:00:00.000Z'},
        {id: '1:1', createdAt: '2026-10-28T10:00:00.000Z'},
      );
    });

    const threads = buildStudyThreads(data);
    expect(threads.map(thread => thread.ref)).toEqual(['1:1', '1:2', '999:1']);
    expect(threads[2]).toMatchObject({available: false, signals: {bookmarked: true}});
  });

  it('excludes Understood from revisit while keeping the saved assessment', () => {
    const data = withData(snapshot => {
      snapshot.meta.passageLearning = {
        assessments: [{
          reference: '2:255',
          assessment: 'Understood',
          obstacle: 'none',
          updatedAt: '2026-10-28T10:00:00.000Z',
        }],
      };
    });

    const [thread] = buildStudyThreads(data);
    expect(thread).toMatchObject({
      ref: '2:255',
      signals: {needsRevisit: false, needsRevisitCount: 0},
    });
    expect(thread!.assessments[0]!.assessment).toBe('Understood');
  });

  it('derives one passage row plus separately saved ayah rows inside it', () => {
    const data = withData(snapshot => {
      snapshot.bookmarks.push({id: '1:2', createdAt: '2026-10-28T09:00:00.000Z'});
      snapshot.meta.passageLearning = {
        range: {reference: '1:1', current: 2, end: 3},
        assessments: [
          {reference: '1:2', assessment: 'Need another look', obstacle: 'word', updatedAt: '2026-10-28T10:00:00.000Z'},
          {reference: '1:3', assessment: 'Understood', obstacle: 'none', updatedAt: '2026-10-28T11:00:00.000Z'},
        ],
      };
    });

    const threads = buildStudyThreads(data);
    const passage = threads.find(thread => thread.kind === 'passage')!;
    expect(passage.ref).toBe('1:1');
    expect(passage.range).toEqual({reference: '1:1', current: 2, end: 3});
    expect(passage.assessments).toHaveLength(2);
    expect(passage.signals.needsRevisitCount).toBe(1);
    expect(passage.lastActivityAt).toBe('2026-10-28T11:00:00.000Z');
    expect(passage.available).toBe(true);
    expect(passageRefs(passage.range!)).toEqual(['1:1', '1:2', '1:3']);

    const ayahRows = threads.filter(thread => thread.kind === 'ayah');
    expect(ayahRows.map(thread => thread.ref)).toEqual(['1:2']);
    expect(ayahRows[0]!.inSavedPassage).toBe(true);
    expect(ayahRows[0]!.signals.bookmarked).toBe(true);
    expect(ayahRows[0]!.assessments).toHaveLength(1);
    // An assessment inside the range is not its own row; it belongs to the passage.
    expect(threads.some(thread => thread.ref === '1:3')).toBe(false);
  });

  it('does not mutate the snapshot', () => {
    const data = withData(snapshot => {
      snapshot.bookmarks.push({id: '1:1', createdAt: '2026-10-28T10:00:00.000Z'});
      snapshot.notes.push({id: 'ayah-1:1', text: 'invalid id', updatedAt: '2026-10-28T10:00:00.000Z'});
    });
    const before = structuredClone(data);
    buildStudyThreads(data);
    expect(data).toEqual(before);
  });

  it('builds 10,000 notes without duplicating threads', () => {
    const refs: string[] = [];
    for (let surah = 1; surah <= surahs.length && refs.length < 6000; surah++) {
      for (let ayah = 1; ayah <= surahs[surah - 1]!.verses && refs.length < 6000; ayah++) refs.push(`${surah}:${ayah}`);
    }
    const data = withData(snapshot => {
      snapshot.notes = Array.from({length: 10000}, (_, index) => {
        const reference = refs[index % refs.length]!;
        return {
          id: `ayah-${reference.replace(':', '-')}`,
          text: `Reflection ${index}`,
          updatedAt: new Date(Date.UTC(2026, 9, 1, 0, 0, index % 60)).toISOString(),
        };
      });
    });

    const started = performance.now();
    const threads = buildStudyThreads(data);
    const elapsed = performance.now() - started;
    expect(threads).toHaveLength(refs.length);
    expect(new Set(threads.map(thread => thread.ref)).size).toBe(threads.length);
    expect(elapsed).toBeLessThan(1000);
  });
});

describe('buildStudyThreadDetail', () => {
  it('deduplicates content entry ids and only counts non-undone review events', () => {
    const data = withData(snapshot => {
      snapshot.bookmarks.push({id: '1:1', createdAt: '2026-10-28T10:00:00.000Z'});
      snapshot.meta.priorityEntries = [vocabularyNoteId];
      snapshot.reviews.push(
        review(vocabularyNoteId, '2026-10-28T10:00:00.000Z'),
        review(vocabularyNoteId, '2026-10-28T11:00:00.000Z'),
        review(vocabularyNoteId, '2026-10-28T12:00:00.000Z', true),
        review('l-fedcba9876543210', '2026-10-28T13:00:00.000Z'),
      );
    });
    const thread = buildStudyThreads(data)[0]!;
    const detail = buildStudyThreadDetail(
      thread,
      [ayah('1:1', [vocabularyNoteId, null, vocabularyNoteId]), ayah('1:2', [vocabularyNoteId])],
      data,
    );

    expect(detail.entryIds).toEqual([vocabularyNoteId]);
    expect(detail.prepared).toBe(true);
    expect(detail.practisedAt).toBe('2026-10-28T11:00:00.000Z');
  });

  it('returns no content-derived signals when the thread is unavailable', () => {
    const data = withData(snapshot => {
      snapshot.bookmarks.push({id: '999:1', createdAt: '2026-10-28T10:00:00.000Z'});
    });
    const thread = buildStudyThreads(data)[0]!;
    const detail = buildStudyThreadDetail(thread, [], data);
    expect(detail.entryIds).toEqual([]);
    expect(detail.prepared).toBe(false);
    expect(detail.practisedAt).toBeNull();
  });
});
