import type {Assessment} from './passage-learning';
import type {StudyThread} from './study-thread';

export const savedStudyFilters = ['all', 'reflections', 'revisit', 'bookmarks'] as const;
export type SavedStudyFilter = (typeof savedStudyFilters)[number];

export function normalizeSearch(value: string): string {
  return value.trim().normalize('NFKD').replace(/\p{M}/gu, '').replace(/\s+/g, ' ').toLowerCase();
}

export function latestAssessment(assessments: readonly Assessment[]): Assessment | null {
  let latest: Assessment | null = null;
  for (const assessment of assessments) {
    if (!latest || assessment.updatedAt > latest.updatedAt) latest = assessment;
  }
  return latest;
}

export function studyThreadMatches(thread: StudyThread, filter: SavedStudyFilter, search: string): boolean {
  if (filter === 'reflections' && !thread.signals.reflected) return false;
  if (filter === 'revisit' && !thread.signals.needsRevisit) return false;
  if (filter === 'bookmarks' && !thread.signals.bookmarked) return false;
  const query = normalizeSearch(search);
  if (!query) return true;
  // Personal text only; Quran text and reference search stay in the reader.
  return normalizeSearch(thread.reflection?.text ?? '').includes(query);
}

/** Threads matching a filter and optional personal-text query, preserving selector order. */
export function filterStudyThreads(threads: readonly StudyThread[], filter: SavedStudyFilter, search: string): StudyThread[] {
  return threads.filter(thread => studyThreadMatches(thread, filter, search));
}
