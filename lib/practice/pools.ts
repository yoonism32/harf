import type {Ayah} from '@/lib/content/schema';
import type {DataSnapshot} from '@/lib/data/schema';
import {buildStudyThreadDetail, type StudyThread} from '@/lib/learning/study-thread';

export type FocusedPracticeReason =
  | 'needs-revisit'
  | 'queued'
  | 'reflection'
  | 'bookmark'
  | 'saved';

export type FocusedPracticePool = {
  /** Distinct course entries, in ayah-content order. */
  entryIds: string[];
  /** The single supported explanation shown to the learner. */
  reason: FocusedPracticeReason;
};

export type FocusedPracticeOptions = {
  /** Explicit preparation: queued words outrank an assessment signal. */
  preferQueued?: boolean;
};

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}

function priorityEntries(snapshot: DataSnapshot): Set<string> {
  return Array.isArray(snapshot.meta.priorityEntries)
    ? new Set(snapshot.meta.priorityEntries.filter((value): value is string => typeof value === 'string'))
    : new Set<string>();
}

/**
 * Select a focused practice pool from an opened saved thread.
 *
 * Pure: it reads only the thread, its loaded ayahs and the snapshot. It never
 * writes, schedules a card or invents a reason. The strongest supported signal
 * wins, so only one explanation is shown:
 *
 * 1. an assessment asking for another look narrows practice to the assessed ayahs;
 * 2. words already in the existing priority queue narrow to their intersection;
 * 3. otherwise the saved thread's own course words are the pool.
 *
 * When the learner explicitly prepared a set, queued words move ahead of the
 * assessment signal so the round contains exactly the prepared subset. If the
 * queue is empty, the ordinary fallback still applies.
 */
export function buildFocusedPracticePool(
  thread: StudyThread,
  ayahs: readonly Ayah[],
  snapshot: DataSnapshot,
  options: FocusedPracticeOptions = {},
): FocusedPracticePool | null {
  const detail = buildStudyThreadDetail(thread, ayahs, snapshot);
  if (!detail.entryIds.length) return null;

  const priority = priorityEntries(snapshot);
  const queued = detail.entryIds.filter(id => priority.has(id));
  if (options.preferQueued && queued.length) return {entryIds: queued, reason: 'queued'};

  const entryIdsByRef = new Map<string, string[]>();
  for (const ayah of ayahs) {
    const ids = unique(ayah.tokens.flatMap(token => (
      token.kind === 'word' && token.entryId ? [token.entryId] : []
    )));
    entryIdsByRef.set(ayah.ref, ids);
  }

  const revisitRefs = new Set(
    thread.assessments
      .filter(assessment => assessment.assessment !== 'Understood')
      .map(assessment => assessment.reference),
  );
  if (revisitRefs.size) {
    const revisitable = unique(
      ayahs.flatMap(ayah => revisitRefs.has(ayah.ref) ? entryIdsByRef.get(ayah.ref) ?? [] : []),
    );
    if (revisitable.length) return {entryIds: revisitable, reason: 'needs-revisit'};
  }

  if (queued.length) return {entryIds: queued, reason: 'queued'};

  if (thread.signals.reflected) return {entryIds: detail.entryIds, reason: 'reflection'};
  if (thread.signals.bookmarked) return {entryIds: detail.entryIds, reason: 'bookmark'};
  return {entryIds: detail.entryIds, reason: 'saved'};
}

/** One explanation, emitted only for the reason the pool actually selected. */
export function focusedPracticeReason(pool: FocusedPracticePool, thread: StudyThread): string {
  switch (pool.reason) {
    case 'needs-revisit':
      return thread.kind === 'passage'
        ? 'Because this saved passage includes an ayah you marked as needing another look.'
        : 'Because you marked this ayah as needing another look.';
    case 'queued':
      return `Because these words are already queued from this saved ${thread.kind}.`;
    case 'reflection':
      return 'Because you saved a reflection on this ayah.';
    case 'bookmark':
      return 'Because you bookmarked this ayah.';
    case 'saved':
      return `Because this ${thread.kind} is in your saved study.`;
  }
}
