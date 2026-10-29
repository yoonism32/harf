'use client';

import Link from 'next/link';
import {useEffect, useMemo, useRef, useState} from 'react';
import {useSearchParams} from 'next/navigation';
import {ExploreLink} from '@/components/shell/QuickReturn';
import {Skeleton, StatusMessage} from '@/components/ui';
import type {Catalog} from '@/lib/content/schema';
import {useHarfStore} from '@/lib/data/store';
import {obstacleLabels} from '@/lib/learning/passage-learning';
import {filterStudyThreads, latestAssessment, savedStudyFilters, type SavedStudyFilter} from '@/lib/learning/saved-study';
import {buildStudyThreads, studyThreadKey, type StudyThread} from '@/lib/learning/study-thread';
import {savedStudyHref, savedThreadHref} from '@/lib/navigation/saved-study';
import {SavedThreadDetail} from './SavedThreadDetail';

const filters: Array<{id: SavedStudyFilter; label: string}> = [
  {id: 'all', label: 'All'},
  {id: 'reflections', label: 'Reflections'},
  {id: 'revisit', label: 'Needs another look'},
  {id: 'bookmarks', label: 'Bookmarks'},
];

function filterFrom(value: string | null): SavedStudyFilter {
  return savedStudyFilters.find(filter => filter === value) ?? 'all';
}

function titleFor(thread: StudyThread) {
  return thread.kind === 'passage' && thread.range
    ? `Ayahs ${thread.ref}–${thread.ref.split(':')[0]}:${thread.range.end}`
    : `Ayah ${thread.ref}`;
}

export function SavedStudy({catalog}: {catalog?: Catalog}) {
  const store = useHarfStore();
  const params = useSearchParams();
  const filter = filterFrom(params.get('saved'));
  const urlFind = params.get('find') ?? '';
  const selectedKey = params.get('thread');
  const [find, setFind] = useState(urlFind);
  const lastUrlFind = useRef(urlFind);
  const threads = useMemo(() => buildStudyThreads(store), [store]);
  const filtered = useMemo(() => filterStudyThreads(threads, filter, find), [threads, filter, find]);
  const visible = filtered.slice(0, 100);
  const selected = useMemo(
    () => selectedKey ? threads.find(thread => studyThreadKey(thread) === selectedKey) : undefined,
    [selectedKey, threads],
  );

  useEffect(() => {
    if (urlFind === lastUrlFind.current) return;
    lastUrlFind.current = urlFind;
    setFind(urlFind);
  }, [urlFind]);

  useEffect(() => {
    if (find === lastUrlFind.current) return;
    const base = params.toString();
    const timer = window.setTimeout(() => {
      // A different navigation won the pause; never overwrite it.
      if (new URLSearchParams(window.location.search).toString() !== base) return;
      lastUrlFind.current = find;
      const next = new URLSearchParams(params);
      next.set('view', 'saved');
      if (filter === 'all') next.delete('saved'); else next.set('saved', filter);
      if (find.trim()) next.set('find', find); else next.delete('find');
      next.delete('thread');
      const search = next.toString();
      window.history.replaceState(null, '', search ? `/read?${search}` : '/read');
    }, 200);
    return () => window.clearTimeout(timer);
  }, [filter, find, params]);

  const heading = <div className="row between">
    <div>
      <p className="eyebrow">Reflections and passages</p>
      <h2 id="saved-study-title">Saved study</h2>
    </div>
    {store.status === 'ready' && <span className="badge">{threads.length} saved</span>}
  </div>;

  if (store.status === 'loading') {
    return <section className="stack" aria-labelledby="saved-study-title">
      {heading}
      <Skeleton height={160} label="Loading saved study"/>
    </section>;
  }

  if (store.status === 'unavailable') {
    return <section className="stack" aria-labelledby="saved-study-title">
      {heading}
      <StatusMessage error>
        <p>{store.error ?? 'Saved study could not be loaded.'}</p>
        <Link href="/settings">Open settings and backup controls</Link>
      </StatusMessage>
    </section>;
  }

  const filterLabel = filters.find(item => item.id === filter)!.label;

  return <section className="stack" aria-labelledby="saved-study-title">
    {heading}
    <p className="muted">Your private reflections, bookmarks and passage assessments together. Quran search stays in the Surahs view.</p>

    {threads.length === 0 ? <div className="sheet stack">
      <h3>Nothing saved yet</h3>
      <p>Bookmark an ayah or save a reflection while reading. Passage assessments appear here too.</p>
      <Link className="button button-primary" href="/read">Browse surahs</Link>
    </div> : <>
      <div className="filters">
        <label className="field">Find in your reflections
          <input type="search" value={find} maxLength={200} placeholder="Words from a reflection"
            onChange={event => setFind(event.target.value)}/>
        </label>
        <nav className="row" aria-label="Saved study filters">
          {filters.map(item => <Link key={item.id} className="button button-secondary"
            aria-current={filter === item.id ? 'page' : undefined}
            href={savedStudyHref({filter: item.id, find})} scroll={false}>{item.label}</Link>)}
        </nav>
      </div>

      {selected && <SavedThreadDetail thread={selected} catalog={catalog} snapshot={store}
        closeHref={savedStudyHref({filter, find})}
        threadHref={savedThreadHref(selected, {filter, find})}/>}

      <p role="status" className="muted">
        {filtered.length} saved {filtered.length === 1 ? 'item' : 'items'}
        {find.trim() ? ` matching “${find.trim()}”` : ''}
        {filter !== 'all' ? ` · ${filterLabel}` : ''}
        {filtered.length > 100 ? ' · showing the first 100' : ''}
      </p>

      {visible.length ? <ul className="entry-list">
        {visible.map(thread => {
          const title = titleFor(thread);
          const latest = latestAssessment(thread.assessments);
          return <li key={studyThreadKey(thread)} className="saved-thread">
            <div className="saved-thread-main">
              <h3>{title}</h3>
              <div className="saved-signals">
                {thread.signals.bookmarked && <span className="badge">Bookmark</span>}
                {thread.signals.reflected && <span className="badge">Reflection</span>}
                {thread.signals.needsRevisit && <span className="badge">Needs another look</span>}
                {thread.inSavedPassage && <span className="badge">In saved passage</span>}
                {!thread.available && <span className="badge">Unavailable</span>}
              </div>
              {thread.reflectionExcerpt && <p className="muted saved-excerpt">{thread.reflectionExcerpt}</p>}
              {latest && <p className="muted saved-assessment-summary">
                {latest.assessment} · {obstacleLabels[latest.obstacle]}
                {thread.assessments.length > 1 ? ` (+${thread.assessments.length - 1} more)` : ''}
              </p>}
            </div>
            <div className="saved-thread-actions">
              <Link className="button button-secondary" href={savedThreadHref(thread, {filter, find})}
                scroll={false} aria-label={`Details for ${title}`}>Details</Link>
              {thread.available && <ExploreLink className="button button-secondary"
                href={`/read/${thread.ref.replace(':', '/')}`} aria-label={`Open ayah ${thread.ref}`}>Open ayah</ExploreLink>}
            </div>
          </li>;
        })}
      </ul> : <div className="sheet stack">
        <h3>No saved study here</h3>
        <p>{find.trim() ? `No saved items match “${find.trim()}”.` : 'Nothing matches this filter.'}</p>
        <Link href={savedStudyHref({filter: 'all', find: ''})} scroll={false}>Show all saved study</Link>
      </div>}
    </>}
  </section>;
}
