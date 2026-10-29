import {describe, expect, it} from 'vitest';
import {defaultSettings, emptyData, type CardRecord, type DataSnapshot, type ReviewEvent, type StudySession} from '@/lib/data/schema';
import {buildQueue, type CourseItem} from '../queue';
import {
  buildQueueExplanation,
  queueReasonLabels,
  type QueueExplanation,
} from '../queue-explanation';

const now = new Date('2026-10-29T12:00:00.000Z');
const entries: CourseItem[] = [
  {id: 'due', order: 1},
  {id: 'priority', order: 2},
  {id: 'course', order: 3},
  {id: 'later', order: 4},
];

function withData(mutate: (data: DataSnapshot) => void): DataSnapshot {
  const data = emptyData();
  mutate(data);
  return data;
}

function card(entryId: string, due: string, overrides: Partial<CardRecord> = {}): CardRecord {
  return {
    id: `vocabulary:${entryId}`,
    entryId,
    collection: 'vocabulary',
    card: {
      due,
      stability: 4,
      difficulty: 5,
      elapsed_days: 1,
      scheduled_days: 2,
      learning_steps: 0,
      reps: 3,
      lapses: 0,
      state: 2,
      last_review: '2026-10-26T12:00:00.000Z',
    },
    paused: false,
    contentVersion: 'test',
    revision: 1,
    ...overrides,
  };
}

function review(
  entryId: string,
  timestamp: string,
  grade: 1 | 2 | 3 | 4,
  undone = false,
  collection: 'vocabulary' | 'names' = 'vocabulary',
): ReviewEvent {
  const after = card(entryId, '2026-10-30T12:00:00.000Z');
  after.collection = collection;
  return {
    id: `review-${entryId}-${timestamp}`,
    attemptId: `attempt-${entryId}-${timestamp}`,
    cardId: after.id,
    sessionId: 'session',
    timestamp,
    localDate: timestamp.slice(0, 10),
    timeZone: 'UTC',
    grade,
    before: null,
    after,
    undone,
  };
}

function session(attempts: Array<{entryId: string; isNew: boolean; due: string}>, cursor = 0): StudySession {
  return {
    id: 'active',
    collection: 'vocabulary',
    contentVersion: 'test',
    queue: attempts.map((attempt, index) => ({
      id: `attempt-${index}`,
      entryId: attempt.entryId,
      cardId: `vocabulary:${attempt.entryId}`,
      isNew: attempt.isNew,
      due: attempt.due,
      cardRevision: 1,
    })),
    cursor,
    phase: 'question',
    status: 'active',
    createdAt: '2026-10-29T10:00:00.000Z',
    updatedAt: '2026-10-29T10:00:00.000Z',
    localDate: '2026-10-29',
    actions: 0,
    introduced: [],
    practiced: [],
    again: 0,
    revision: 1,
    lastUndoEvent: null,
    nextDue: null,
    previewAt: null,
  };
}

function ids(explanation: QueueExplanation) {
  return explanation.items.map(item => item.entryId);
}

describe('buildQueueExplanation', () => {
  it('annotates exactly the queue buildQueue will use, in the same order', () => {
    const data = withData(snapshot => {
      snapshot.cards.push(card('due', '2026-10-28T12:00:00.000Z'), card('later', '2026-11-10T12:00:00.000Z'));
      snapshot.meta.priorityEntries = ['priority'];
      snapshot.reviews.push(
        review('due', '2026-10-27T12:00:00.000Z', 3),
        review('due', '2026-10-20T12:00:00.000Z', 1, true),
      );
    });

    const expected = buildQueue(data, 'vocabulary', entries, now);
    const explanation = buildQueueExplanation(data, entries, null, now);

    expect(explanation.source).toBe('next-session');
    expect(ids(explanation)).toEqual(expected.map(item => item.entryId));
    expect(ids(explanation)).toEqual(['due', 'priority', 'course']);
    expect(explanation.items.map(item => item.reason)).toEqual(['due', 'queued', 'course']);
    expect(explanation.items.map(item => item.position)).toEqual([1, 2, 3]);
    expect(explanation.items.map(item => item.queued)).toEqual([false, true, false]);
  });

  it('reports real queue metadata and only real non-undone vocabulary history', () => {
    const data = withData(snapshot => {
      snapshot.cards.push(card('due', '2026-10-28T12:00:00.000Z'));
      snapshot.meta.priorityEntries = ['priority'];
      snapshot.reviews.push(
        review('due', '2026-10-27T12:00:00.000Z', 3),
        review('due', '2026-10-25T12:00:00.000Z', 2),
        review('due', '2026-10-24T12:00:00.000Z', 1, true),
        review('due', '2026-10-23T12:00:00.000Z', 4, false, 'names'),
        review('priority', '2026-10-22T12:00:00.000Z', 3),
      );
    });

    const explanation = buildQueueExplanation(data, entries, null, now);
    const due = explanation.items[0]!;
    const priority = explanation.items[1]!;
    const course = explanation.items[2]!;

    expect(due.dueAt).toBe('2026-10-28T12:00:00.000Z');
    expect(due.historyTotal).toBe(2);
    expect(due.history.map(item => item.timestamp)).toEqual([
      '2026-10-27T12:00:00.000Z',
      '2026-10-25T12:00:00.000Z',
    ]);
    expect(due.history.map(item => item.grade)).toEqual([3, 2]);
    expect(due.history.every(item => item.timeZone === 'UTC')).toBe(true);
    expect(due.lastReview?.timestamp).toBe('2026-10-27T12:00:00.000Z');
    expect(priority.reason).toBe('queued');
    expect(priority.historyTotal).toBe(1);
    expect(course.history).toEqual([]);
    expect(course.historyTotal).toBe(0);
    expect(course.lastReview).toBeUndefined();
  });

  it('sorts real review timestamps chronologically even with offsets', () => {
    const data = withData(snapshot => {
      snapshot.cards.push(card('due', '2026-10-28T12:00:00.000Z'));
      snapshot.reviews.push(
        review('due', '2026-10-28T10:00:00+05:00', 2),
        review('due', '2026-10-28T06:00:00.000Z', 3),
      );
    });

    const due = buildQueueExplanation(data, entries, null, now).items[0]!;

    expect(due.history.map(item => item.timestamp)).toEqual([
      '2026-10-28T06:00:00.000Z',
      '2026-10-28T10:00:00+05:00',
    ]);
    expect(due.lastReview?.grade).toBe(3);
  });

  it('keeps the latest five real reviews and counts the rest', () => {
    const data = withData(snapshot => {
      snapshot.cards.push(card('due', '2026-10-28T12:00:00.000Z'));
      for (let index = 0; index < 7; index += 1) {
        snapshot.reviews.push(review('due', `2026-10-${String(20 + index).padStart(2, '0')}T12:00:00.000Z`, 3));
      }
    });

    const explanation = buildQueueExplanation(data, entries, null, now);
    const due = explanation.items[0]!;

    expect(due.history).toHaveLength(5);
    expect(due.historyTotal).toBe(7);
    expect(due.history[0]!.timestamp).toBe('2026-10-26T12:00:00.000Z');
    expect(due.history[4]!.timestamp).toBe('2026-10-22T12:00:00.000Z');
    expect(due.lastReview?.timestamp).toBe('2026-10-26T12:00:00.000Z');
  });

  it('explains the remaining attempts of an active vocabulary session in stored order', () => {
    const data = withData(snapshot => {
      snapshot.cards.push(
        card('due', '2026-10-28T12:00:00.000Z'),
        card('later', '2026-11-10T12:00:00.000Z'),
      );
      snapshot.meta.priorityEntries = ['priority'];
      snapshot.reviews.push(review('due', '2026-10-27T12:00:00.000Z', 3));
    });
    const active = session([
      {entryId: 'due', isNew: false, due: '2026-10-28T12:00:00.000Z'},
      {entryId: 'priority', isNew: true, due: '2026-10-29T12:00:00.000Z'},
      {entryId: 'later', isNew: false, due: '2026-11-10T12:00:00.000Z'},
      {entryId: 'course', isNew: false, due: '2026-10-29T00:00:00.000Z'},
    ], 1);

    const explanation = buildQueueExplanation(data, entries, active, now);

    expect(explanation.source).toBe('active-session');
    expect(ids(explanation)).toEqual(['priority', 'later', 'course']);
    expect(explanation.items.map(item => item.reason)).toEqual(['session-new', 'scheduled', 'due']);
    expect(explanation.items[1]!.dueAt).toBe('2026-11-10T12:00:00.000Z');
    expect(explanation.items[0]!.historyTotal).toBe(0);
  });

  it('returns an empty explanation when the daily allowance is zero and nothing is due', () => {
    const data = withData(snapshot => {
      snapshot.meta.settings = {...defaultSettings, dailyNew: 0};
    });

    expect(buildQueue(data, 'vocabulary', entries, now)).toEqual([]);
    expect(buildQueueExplanation(data, entries, null, now)).toEqual({
      source: 'next-session',
      items: [],
    });
  });

  it('does not mutate the snapshot, entries or active session', () => {
    const data = withData(snapshot => {
      snapshot.cards.push(card('due', '2026-10-28T12:00:00.000Z'));
      snapshot.meta.priorityEntries = ['priority'];
      snapshot.reviews.push(review('due', '2026-10-27T12:00:00.000Z', 2));
    });
    const active = session([
      {entryId: 'priority', isNew: true, due: '2026-10-29T12:00:00.000Z'},
      {entryId: 'due', isNew: false, due: '2026-10-28T12:00:00.000Z'},
    ]);
    const before = structuredClone({data, entries, active});

    buildQueueExplanation(data, entries, active, now);

    expect({data, entries, active}).toEqual(before);
  });

  it('has a label for every reason it can emit', () => {
    expect(queueReasonLabels).toEqual({
      due: 'Due for review',
      queued: 'Queued from saved study',
      course: 'Next in course order',
      'session-new': 'New word in your active session',
      scheduled: 'Scheduled later in this session',
    });
  });
});
