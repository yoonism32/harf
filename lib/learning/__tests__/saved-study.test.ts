import {describe, expect, it} from 'vitest';
import {safeReturn} from '@/lib/navigation/return';
import {savedStudyHref, savedThreadHref} from '@/lib/navigation/saved-study';
import {filterStudyThreads, latestAssessment, normalizeSearch, studyThreadMatches} from '../saved-study';
import type {StudyThread} from '../study-thread';

function thread(ref: string, overrides: Partial<StudyThread> = {}): StudyThread {
  return {
    kind: 'ayah',
    ref,
    assessments: [],
    signals: {bookmarked: false, reflected: false, needsRevisit: false, needsRevisitCount: 0},
    available: true,
    inSavedPassage: false,
    ...overrides,
  };
}

const bookmarked = thread('1:1', {signals: {bookmarked: true, reflected: false, needsRevisit: false, needsRevisitCount: 0}});
const reflected = thread('1:2', {
  reflection: {id: 'ayah-1-2', text: 'Mercy at the throne', updatedAt: '2026-10-28T10:00:00.000Z'},
  signals: {bookmarked: false, reflected: true, needsRevisit: false, needsRevisitCount: 0},
});
const revisit = thread('1:3', {
  assessments: [{
    reference: '1:3',
    assessment: 'Need another look',
    obstacle: 'word',
    updatedAt: '2026-10-28T11:00:00.000Z',
  }],
  signals: {bookmarked: false, reflected: false, needsRevisit: true, needsRevisitCount: 1},
});

describe('saved-study filters and search', () => {
  it('filters by membership rather than raw record counts', () => {
    const threads = [bookmarked, reflected, revisit];
    expect(filterStudyThreads(threads, 'all', '')).toEqual(threads);
    expect(filterStudyThreads(threads, 'bookmarks', '').map(item => item.ref)).toEqual(['1:1']);
    expect(filterStudyThreads(threads, 'reflections', '').map(item => item.ref)).toEqual(['1:2']);
    expect(filterStudyThreads(threads, 'revisit', '').map(item => item.ref)).toEqual(['1:3']);
  });

  it('normalizes case, accents and Arabic marks for personal text search', () => {
    expect(normalizeSearch('  MERCY  ')).toBe('mercy');
    expect(normalizeSearch('مُحَمَّد')).toBe('محمد');
    expect(studyThreadMatches(reflected, 'all', 'mercy')).toBe(true);
    expect(studyThreadMatches(reflected, 'all', 'THRONE')).toBe(true);
    expect(studyThreadMatches(reflected, 'all', '1:2')).toBe(false);
    expect(studyThreadMatches(reflected, 'all', 'not there')).toBe(false);
    expect(studyThreadMatches(bookmarked, 'all', 'mercy')).toBe(false);
  });

  it('chooses the newest assessment without changing the thread', () => {
    const assessments = [
      {reference: '1:3', assessment: 'Understood' as const, obstacle: 'none' as const, updatedAt: '2026-10-28T09:00:00.000Z'},
      {reference: '1:3', assessment: 'Need another look' as const, obstacle: 'word' as const, updatedAt: '2026-10-28T10:00:00.000Z'},
    ];
    expect(latestAssessment(assessments)?.assessment).toBe('Need another look');
    expect(latestAssessment([])).toBeNull();
  });
});

describe('saved-study URL builders', () => {
  it('keeps only meaningful view params and preserves filter/search', () => {
    expect(savedStudyHref({filter: 'all', find: ''})).toBe('/read?view=saved');
    const href = savedStudyHref({filter: 'revisit', find: ' mercy '});
    const url = new URL(href, 'https://harf.local');
    expect(url.pathname).toBe('/read');
    expect(url.searchParams.get('view')).toBe('saved');
    expect(url.searchParams.get('saved')).toBe('revisit');
    expect(url.searchParams.get('find')).toBe(' mercy ');
  });

  it('builds a detail link that closes back to the same view context', () => {
    const thread = {...reflected, kind: 'passage' as const, ref: '1:2', range: {reference: '1:2', current: 3, end: 4}};
    const href = savedThreadHref(thread, {filter: 'reflections', find: 'mercy'});
    const url = new URL(href, 'https://harf.local');
    expect(url.searchParams.get('thread')).toBe('passage:1:2:4');
    expect(url.searchParams.get('saved')).toBe('reflections');
    expect(url.searchParams.get('find')).toBe('mercy');
    expect(safeReturn(href)).toBe(href);
  });
});
