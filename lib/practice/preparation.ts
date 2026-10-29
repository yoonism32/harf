import type {Ayah} from '@/lib/content/schema';
import type {CardRecord, DataSnapshot, ReviewEvent} from '@/lib/data/schema';
import {familiarity} from '@/lib/learning/scheduler';

export type PreparationState =
  | 'queued'
  | 'recently-missed'
  | 'familiar'
  | 'learning'
  | 'untouched';

export type PreparationEntry = {
  entryId: string;
  state: PreparationState;
  queued: boolean;
};

export type PassagePreparation = {
  entries: PreparationEntry[];
  queuedCount: number;
};

export const preparationStateLabels: Record<PreparationState, string> = {
  queued: 'Already queued',
  'recently-missed': 'Last review was difficult',
  familiar: 'Familiar',
  learning: 'In progress',
  untouched: 'Not started',
};

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}

function latestReviews(snapshot: DataSnapshot): Map<string, ReviewEvent> {
  const latest = new Map<string, ReviewEvent>();
  for (const review of snapshot.reviews) {
    if (review.undone || review.after.collection !== 'vocabulary') continue;
    const entryId = review.after.entryId;
    const previous = latest.get(entryId);
    if (!previous || review.timestamp > previous.timestamp) latest.set(entryId, review);
  }
  return latest;
}

/**
 * Derive the preparation rows for a saved passage.
 *
 * Pure: it reads the already-loaded ayahs and the existing snapshot, and never
 * writes or invents a history. Each word gets one state:
 *
 * - queued: it is already in meta.priorityEntries;
 * - recently-missed: its latest non-undone review was Again or Hard;
 * - familiar: the current vocabulary card is familiar;
 * - learning: a card or a non-undone review exists, but none of the above;
 * - untouched: no card and no non-undone review.
 *
 * A review is "difficult" based on its recorded grade, not an inferred date
 * window; the label says exactly that.
 */
export function buildPassagePreparation(
  ayahs: readonly Ayah[],
  snapshot: DataSnapshot,
): PassagePreparation {
  const entryIds = unique(ayahs.flatMap(ayah => ayah.tokens.flatMap(token => (
    token.kind === 'word' && token.entryId ? [token.entryId] : []
  ))));
  if (!entryIds.length) return {entries: [], queuedCount: 0};

  const queued = new Set(
    Array.isArray(snapshot.meta.priorityEntries)
      ? snapshot.meta.priorityEntries.filter((value): value is string => typeof value === 'string')
      : [],
  );
  const cards = new Map<string, CardRecord>();
  for (const card of snapshot.cards) {
    if (card.collection === 'vocabulary') cards.set(card.entryId, card);
  }
  const reviews = latestReviews(snapshot);

  const entries = entryIds.map(entryId => {
    const queuedHere = queued.has(entryId);
    const review = reviews.get(entryId);
    const card = cards.get(entryId);
    let state: PreparationState;
    if (queuedHere) state = 'queued';
    else if (review && review.grade <= 2) state = 'recently-missed';
    else if (familiarity(card, true) === 'Familiar') state = 'familiar';
    else if (card || review) state = 'learning';
    else state = 'untouched';
    return {entryId, state, queued: queuedHere};
  });

  return {entries, queuedCount: entries.filter(entry => entry.queued).length};
}
