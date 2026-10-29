'use client';

import Link from 'next/link';
import {useEffect, useMemo, useState} from 'react';
import type {Ayah, Catalog} from '@/lib/content/schema';
import type {DataSnapshot} from '@/lib/data/schema';
import {setEntryPriority} from '@/lib/learning/commands';
import {studyThreadKey, type StudyThread} from '@/lib/learning/study-thread';
import {practiceSeedFor, practiceStartHref} from '@/lib/navigation/practice';
import {buildPassagePreparation, preparationStateLabels} from '@/lib/practice/preparation';

export function PassagePreparation({thread, ayahs, catalog, snapshot, threadHref}: {
  thread: StudyThread;
  ayahs: readonly Ayah[];
  catalog?: Catalog;
  snapshot: DataSnapshot;
  threadHref: string;
}) {
  const preparation = useMemo(() => buildPassagePreparation(ayahs, snapshot), [ayahs, snapshot]);
  const entries = useMemo(() => new Map((catalog?.entries ?? []).map(entry => [entry.id, entry])), [catalog]);
  const [busy, setBusy] = useState<string | null>(null);
  const [optimistic, setOptimistic] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  // The command writes asynchronously; reconcile the immediate checkbox state with the refreshed snapshot.
  useEffect(() => setOptimistic({}), [snapshot]);
  const key = studyThreadKey(thread);
  const queuedCount = preparation.queuedCount;
  const practiceHref = queuedCount > 0 ? practiceStartHref({
    mode: 'meaning',
    seed: practiceSeedFor(`${key}:prepared`),
    focus: key,
    prepared: true,
    returnTo: threadHref,
  }) : null;

  async function toggle(entryId: string, queued: boolean) {
    setBusy(entryId);
    setOptimistic(current => ({...current, [entryId]: !queued}));
    setError('');
    setMessage('');
    try {
      await setEntryPriority(entryId, !queued);
      setMessage(queued
        ? 'Removed from your next new-word queue.'
        : 'Added to your next new-word queue. Daily limits still apply.');
    } catch (cause) {
      setOptimistic(current => {
        const next = {...current};
        delete next[entryId];
        return next;
      });
      setError(cause instanceof Error ? cause.message : 'Could not update the queue. Please try again.');
    } finally {
      setBusy(null);
    }
  }

  return <section className="saved-preparation stack" aria-labelledby="prepare-words-title">
    <div>
      <h4 id="prepare-words-title">Prepare this passage</h4>
      <p className="muted">Choose course words to queue before practising. The queue is your existing new-word queue; nothing else is saved.</p>
    </div>

    {preparation.entries.length === 0
      ? <p className="muted">No vocabulary-course words occur in this passage.</p>
      : <>
        <ul className="saved-preparation-list">
          {preparation.entries.map(entry => {
            const courseEntry = entries.get(entry.entryId);
            const checked = optimistic[entry.entryId] ?? entry.queued;
            return <li className="saved-preparation-row" key={entry.entryId}>
              <label className="saved-preparation-choice">
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={busy !== null}
                  onChange={() => void toggle(entry.entryId, checked)}
                />
                <span>{courseEntry
                  ? <><span lang="ar" dir="rtl">{courseEntry.arabic}</span> · {courseEntry.gloss}</>
                  : entry.entryId}</span>
              </label>
              <span className="badge">{preparationStateLabels[entry.state]}</span>
            </li>;
          })}
        </ul>
        <p className="muted" role="status">{queuedCount} queued for focused practice.</p>
        {practiceHref
          ? <Link className="button button-primary" href={practiceHref}>Practise {queuedCount} queued {queuedCount === 1 ? 'word' : 'words'}</Link>
          : <p className="muted">Queue at least one word to practise just those.</p>}
        <small className="muted">Queued words also join your next new-word session. Daily limits still apply.</small>
      </>}

    {message && <p role="status">{message}</p>}
    {error && <p role="alert">{error}</p>}
  </section>;
}
