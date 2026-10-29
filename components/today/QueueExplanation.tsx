'use client';

import {useMemo, useState} from 'react';
import type {Catalog} from '@/lib/content/schema';
import type {DataSnapshot, StudySession} from '@/lib/data/schema';
import type {CourseItem} from '@/lib/learning/queue';
import {buildQueueExplanation, queueReasonLabels} from '@/lib/learning/queue-explanation';

const gradeLabels = {1: 'Again', 2: 'Hard', 3: 'Good', 4: 'Easy'} as const;

function timeLabel(value: string) {
  return new Date(value).toLocaleString(undefined, {dateStyle: 'medium', timeStyle: 'short'});
}

function reviewTimeLabel(value: string, timeZone: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {hour: '2-digit', minute: '2-digit', timeZone}).format(new Date(value));
  } catch {
    return new Date(value).toLocaleTimeString(undefined, {hour: '2-digit', minute: '2-digit'});
  }
}

function reasonDetail(item: ReturnType<typeof buildQueueExplanation>['items'][number]) {
  switch (item.reason) {
    case 'due':
      return <>Was due <time dateTime={item.dueAt}>{item.dueAt ? timeLabel(item.dueAt) : 'at its recorded time'}</time>.</>;
    case 'queued':
      return 'You queued this from saved study.';
    case 'course':
      return 'The next unstudied word in course order.';
    case 'session-new':
      return 'Already in the vocabulary session you started.';
    case 'scheduled':
      return <>Scheduled for <time dateTime={item.dueAt}>{item.dueAt ? timeLabel(item.dueAt) : 'a later time in this session'}</time>.</>;
  }
}

export function QueueExplanation({data, entries, activeSession, catalog, now}: {
  data: DataSnapshot;
  entries: readonly CourseItem[];
  activeSession: StudySession | null;
  catalog?: Catalog;
  now: Date;
}) {
  const [open, setOpen] = useState(false);
  const explanation = useMemo(
    () => open ? buildQueueExplanation(data, [...entries], activeSession, now) : null,
    [activeSession, data, entries, now, open],
  );
  const catalogEntries = useMemo(
    () => new Map((catalog?.entries ?? []).map(entry => [entry.id, entry])),
    [catalog],
  );

  return <details className="queue-explanation" onToggle={(event) => setOpen(event.currentTarget.open)}>
    <summary>Why these words?</summary>
    {explanation && <div className="queue-explanation-body">
      <p className="muted">{explanation.source === 'active-session'
        ? 'These are the words remaining in your active vocabulary session, in the order you will see them.'
        : 'These are the words your next vocabulary session will use, in order. This is the same queue the session starts from.'}</p>
      {explanation.items.length === 0
        ? <p>No words are queued right now. Your next review will appear when it is due, and new words are added within your daily allowance.</p>
        : <>
          <p className="muted">{explanation.items.length} {explanation.items.length === 1 ? 'word' : 'words'} in this queue.</p>
          <ol className="queue-explanation-list">
            {explanation.items.map(item => {
              const entry = catalogEntries.get(item.entryId);
              return <li className="queue-explanation-row" key={`${item.position}-${item.cardId}`}>
                <span className="queue-position" aria-hidden="true">{item.position}</span>
                <div className="queue-explanation-copy">
                  <div className="queue-word">
                    {entry
                      ? <><span lang="ar" dir="rtl">{entry.arabic}</span><span> · {entry.gloss}</span></>
                      : <code>{item.entryId}</code>}
                  </div>
                  <p className="queue-reason">
                    <strong>{queueReasonLabels[item.reason]}</strong>. {reasonDetail(item)}
                  </p>
                  {item.queued && item.reason !== 'queued' && <span className="badge">Also queued from saved study</span>}
                  {item.lastReview
                    ? <p className="queue-last-review">Last answer: <strong>{gradeLabels[item.lastReview.grade]}</strong>{' · '}<time dateTime={item.lastReview.timestamp}>{timeLabel(item.lastReview.timestamp)}</time></p>
                    : <p className="queue-last-review">No review history yet.</p>}
                  {item.historyTotal > 0 && <details className="queue-history">
                    <summary>{item.historyTotal === 1 ? '1 review recorded' : `${item.historyTotal} reviews recorded`}</summary>
                    <ol className="queue-history-list">
                      {item.history.map(review => <li key={review.id}>
                        <strong>{gradeLabels[review.grade]}</strong>{' · '}
                        <time dateTime={review.timestamp}>{review.localDate} · {reviewTimeLabel(review.timestamp, review.timeZone)}</time>
                      </li>)}
                    </ol>
                    {item.historyTotal > item.history.length && <p className="muted">Showing the latest {item.history.length}.</p>}
                  </details>}
                </div>
              </li>;
            })}
          </ol>
        </>}
      <p className="muted">This explanation is derived from your saved queue and review records. It does not change your schedule.</p>
    </div>}
  </details>;
}
