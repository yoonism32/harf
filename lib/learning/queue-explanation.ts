import type {DataSnapshot, ReviewEvent, StudySession} from '@/lib/data/schema';
import {buildQueue, type CourseItem} from './queue';

export type QueueReason =
  | 'due'
  | 'queued'
  | 'course'
  | 'session-new'
  | 'scheduled';

export type QueueHistoryItem = {
  id: string;
  timestamp: string;
  localDate: string;
  timeZone: string;
  grade: 1 | 2 | 3 | 4;
};

export type QueueExplanationItem = {
  entryId: string;
  cardId: string;
  isNew: boolean;
  /** 1-based position in the order the next attempt will be shown. */
  position: number;
  reason: QueueReason;
  /** Stored schedule time; absent for a new word that has no card yet. */
  dueAt?: string;
  /** Present in meta.priorityEntries, even when a due attempt outranks it. */
  queued: boolean;
  /** Most recent five non-undone vocabulary reviews, newest first. */
  history: QueueHistoryItem[];
  /** Total non-undone vocabulary reviews for this entry. */
  historyTotal: number;
  lastReview?: QueueHistoryItem;
};

export type QueueExplanation = {
  source: 'active-session' | 'next-session';
  items: QueueExplanationItem[];
};

export const queueReasonLabels: Record<QueueReason, string> = {
  due: 'Due for review',
  queued: 'Queued from saved study',
  course: 'Next in course order',
  'session-new': 'New word in your active session',
  scheduled: 'Scheduled later in this session',
};

const HISTORY_LIMIT = 5;

function priorityEntries(data: DataSnapshot): Set<string> {
  return Array.isArray(data.meta.priorityEntries)
    ? new Set(data.meta.priorityEntries.filter((value): value is string => typeof value === 'string'))
    : new Set<string>();
}

function reviewHistory(data: DataSnapshot): Map<string, QueueHistoryItem[]> {
  const raw = new Map<string, QueueHistoryItem[]>();
  for (const review of data.reviews) {
    if (review.undone || review.after.collection !== 'vocabulary') continue;
    const list = raw.get(review.after.entryId) ?? [];
    list.push({
      id: review.id,
      timestamp: review.timestamp,
      localDate: review.localDate,
      timeZone: review.timeZone,
      grade: review.grade,
    });
    raw.set(review.after.entryId, list);
  }
  const sorted = new Map<string, QueueHistoryItem[]>();
  for (const [entryId, list] of raw) {
    sorted.set(entryId, list.sort((left, right) =>
      Date.parse(right.timestamp) - Date.parse(left.timestamp) || right.id.localeCompare(left.id),
    ));
  }
  return sorted;
}

/**
 * Explain the queue the learner will actually see.
 *
 * When a vocabulary session is already active, its stored remaining attempts
 * are the queue; otherwise this calls `buildQueue` directly, so the order and
 * membership cannot drift from the session starter. No state is written.
 */
export function buildQueueExplanation(
  data: DataSnapshot,
  entries: CourseItem[],
  activeSession: StudySession | null,
  now: Date,
): QueueExplanation {
  const active = activeSession
    && (activeSession.status === 'active' || activeSession.status === 'paused')
    && activeSession.collection === 'vocabulary'
    ? activeSession
    : null;
  const source: QueueExplanation['source'] = active ? 'active-session' : 'next-session';
  const queue = active
    ? active.queue.slice(active.cursor).map((attempt) => ({
        entryId: attempt.entryId,
        cardId: attempt.cardId,
        isNew: attempt.isNew,
        dueAt: attempt.due,
      }))
    : buildQueue(data, 'vocabulary', entries, now).map((attempt) => ({
        entryId: attempt.entryId,
        cardId: attempt.cardId,
        isNew: attempt.isNew,
        dueAt: data.cards.find(card => card.id === attempt.cardId)?.card.due,
      }));
  const priority = priorityEntries(data);
  const histories = reviewHistory(data);

  const items = queue.map((attempt, index): QueueExplanationItem => {
    const dueAt = attempt.isNew ? undefined : attempt.dueAt;
    const due = !!dueAt && Date.parse(dueAt) <= now.getTime();
    const reason: QueueReason = source === 'active-session'
      ? attempt.isNew
        ? 'session-new'
        : due
          ? 'due'
          : 'scheduled'
      : !attempt.isNew
        ? 'due'
        : priority.has(attempt.entryId)
          ? 'queued'
          : 'course';
    const history = histories.get(attempt.entryId) ?? [];
    return {
      entryId: attempt.entryId,
      cardId: attempt.cardId,
      isNew: attempt.isNew,
      position: index + 1,
      reason,
      dueAt,
      queued: priority.has(attempt.entryId),
      history: history.slice(0, HISTORY_LIMIT),
      historyTotal: history.length,
      lastReview: history[0],
    };
  });

  return {source, items};
}
