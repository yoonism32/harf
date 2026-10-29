import type {SavedStudyFilter} from '@/lib/learning/saved-study';
import {studyThreadKey, type StudyThread} from '@/lib/learning/study-thread';

export type SavedStudyView = {filter: SavedStudyFilter; find?: string};

function base({filter, find}: SavedStudyView): URLSearchParams {
  const params = new URLSearchParams({view: 'saved'});
  if (filter !== 'all') params.set('saved', filter);
  if (find?.trim()) params.set('find', find);
  return params;
}

/** `/read?view=saved`, with only meaningful filter/search params. */
export function savedStudyHref(view: SavedStudyView): string {
  return `/read?${base(view).toString()}`;
}

/** A detail deep link; it carries the filter/search so closing detail cannot lose context. */
export function savedThreadHref(thread: StudyThread, view: SavedStudyView): string {
  const params = base(view);
  params.set('thread', studyThreadKey(thread));
  return `/read?${params.toString()}`;
}
