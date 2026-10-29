'use client';

import Link from 'next/link';
import {useCallback, useEffect, useId, useMemo, useState} from 'react';
import {ExploreLink} from '@/components/shell/QuickReturn';
import {useResource} from '@/components/learning/useResource';
import {Button, Skeleton, StatusMessage} from '@/components/ui';
import {getAyah} from '@/lib/content/client';
import type {Catalog} from '@/lib/content/schema';
import type {DataSnapshot} from '@/lib/data/schema';
import {obstacleLabels} from '@/lib/learning/passage-learning';
import {buildStudyThreadDetail, passageRefs, studyThreadKey, type StudyThread} from '@/lib/learning/study-thread';
import {practiceStartHref, practiceSeedFor} from '@/lib/navigation/practice';
import {buildFocusedPracticePool, focusedPracticeReason} from '@/lib/practice/pools';
import {PassagePreparation} from './PassagePreparation';

function savedDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {year: 'numeric', month: 'short', day: 'numeric'});
}

export function SavedThreadDetail({thread, catalog, snapshot, closeHref, threadHref}: {
  thread: StudyThread;
  catalog?: Catalog;
  snapshot: DataSnapshot;
  closeHref: string;
  threadHref: string;
}) {
  const titleId = useId();
  const threadKey = studyThreadKey(thread);
  const [preparing, setPreparing] = useState(false);
  useEffect(() => setPreparing(false), [threadKey]);
  const load = useCallback(async () => {
    if (!thread.available) return [];
    if (thread.kind === 'ayah') return [await getAyah(thread.ref)];
    if (!thread.range) throw new Error('This saved passage has no range. Save it again from the reader.');
    const refs = passageRefs(thread.range);
    if (!refs.length) throw new Error('This saved passage has no available ayahs.');
    return Promise.all(refs.map(getAyah));
  }, [thread.available, thread.kind, thread.range, thread.ref]);
  const resource = useResource(load);
  const detail = useMemo(
    () => resource.data ? buildStudyThreadDetail(thread, resource.data, snapshot) : null,
    [resource.data, snapshot, thread],
  );
  const pool = useMemo(
    () => resource.data ? buildFocusedPracticePool(thread, resource.data, snapshot) : null,
    [resource.data, snapshot, thread],
  );
  const reason = pool ? focusedPracticeReason(pool, thread) : null;
  const practiceHref = pool ? practiceStartHref({
    mode: 'meaning',
    seed: practiceSeedFor(studyThreadKey(thread)),
    focus: studyThreadKey(thread),
    returnTo: threadHref,
  }) : null;
  const entries = useMemo(() => new Map((catalog?.entries ?? []).map(entry => [entry.id, entry])), [catalog]);
  const assessments = useMemo(
    () => [...thread.assessments].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
    [thread.assessments],
  );
  const title = thread.kind === 'passage' && thread.range
    ? `Ayahs ${thread.ref}–${thread.ref.split(':')[0]}:${thread.range.end}`
    : `Ayah ${thread.ref}`;
  const openRef = thread.kind === 'passage' && thread.range
    ? `${thread.ref.split(':')[0]}:${thread.range.current}`
    : thread.ref;

  return <section className="sheet stack saved-detail" aria-labelledby={titleId}>
    <div className="row between saved-detail-header">
      <div>
        <p className="eyebrow">{thread.kind === 'passage' ? 'Saved passage' : 'Saved ayah'}</p>
        <h3 id={titleId}>{title}</h3>
        {thread.inSavedPassage && <span className="badge">In your saved passage</span>}
      </div>
      <div className="row">
        {thread.available && <ExploreLink className="button button-primary" href={`/read/${openRef.replace(':', '/')}`}>
          {thread.kind === 'passage' ? `Open at ayah ${openRef}` : `Open ayah ${thread.ref}`}
        </ExploreLink>}
        <Link className="button button-secondary" href={closeHref} scroll={false}>Back to saved study</Link>
      </div>
    </div>

    {!thread.available && <StatusMessage>
      <p>This reference is not in the current Quran content. Your saved reflection or bookmark is kept.</p>
    </StatusMessage>}

    {thread.reflection && <div className="stack">
      <h4>Your reflection</h4>
      <p className="saved-reflection">{thread.reflection.text}</p>
      <small className="muted">Saved {savedDate(thread.reflection.updatedAt)}</small>
    </div>}

    {assessments.length > 0 && <div className="stack">
      <h4>Your assessments</h4>
      <ul className="saved-assessments">
        {assessments.map(assessment => <li key={assessment.reference}>
          {assessment.reference} · {assessment.assessment} · {obstacleLabels[assessment.obstacle]}{' '}
          <small className="muted">{savedDate(assessment.updatedAt)}</small>
        </li>)}
      </ul>
    </div>}

    <div className="stack">
      <div className="row between">
        <h4>Course words in this {thread.kind === 'passage' ? 'passage' : 'ayah'}</h4>
        {thread.kind === 'passage' && thread.available && resource.data &&
          <button className="button button-secondary" aria-expanded={preparing}
            onClick={() => setPreparing(open => !open)}>
            {preparing ? 'Close preparation' : 'Prepare words'}
          </button>}
      </div>
      {(!preparing || !resource.data) && <>
        {!thread.available ? <p className="muted">Words cannot be loaded for a reference outside this content version.</p>
          : resource.error ? <StatusMessage error>
            <p>{resource.error}</p>
            <Button variant="secondary" onClick={resource.retry}>Try again</Button>
          </StatusMessage>
          : !resource.data ? <Skeleton height={80} label="Loading course words"/>
          : detail && detail.entryIds.length ? <ul className="saved-entry-list">
            {detail.entryIds.map(id => {
              const entry = entries.get(id);
              return <li key={id}>{entry
                ? <ExploreLink href={`/learn/${id}`}><span lang="ar" dir="rtl">{entry.arabic}</span> · {entry.gloss}</ExploreLink>
                : <code>{id}</code>}</li>;
            })}
          </ul>
          : <p className="muted">No vocabulary-course words occur here.</p>}
      </>}
      {preparing && thread.kind === 'passage' && resource.data && <PassagePreparation
        thread={thread}
        ayahs={resource.data}
        catalog={catalog}
        snapshot={snapshot}
        threadHref={threadHref}
      />}
      {!preparing && detail?.prepared && pool?.reason !== 'queued' && <p className="muted">At least one of these words is already queued for your next new-word session. Daily limits still apply.</p>}
      {detail?.practisedAt && <p className="muted">Last practised {savedDate(detail.practisedAt)}.</p>}
      {!preparing && pool && reason && practiceHref && <div className="saved-practice stack">
        <p>{reason}</p>
        <Link className="button button-primary" href={practiceHref}>Practise these words</Link>
        <small className="muted">Practice only. Your review schedule is not changed.</small>
      </div>}
    </div>
  </section>;
}
