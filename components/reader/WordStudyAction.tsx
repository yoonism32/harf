'use client';

import {ExploreLink as Link} from '@/components/shell/QuickReturn';
import {useState} from 'react';
import type {Token} from '@/lib/content/schema';
import {useHarfStore} from '@/lib/data/store';
import {prioritizeEntry, toggleBookmark} from '@/lib/learning/commands';
import {familiarity} from '@/lib/learning/scheduler';

export function WordStudyAction({token}: {token: Token}) {
 const store = useHarfStore();
 const [busy, setBusy] = useState(false);
 const [message, setMessage] = useState('');
 const [error, setError] = useState('');
 const card = store.cards.find(c => c.collection === 'vocabulary' && c.entryId === token.entryId);
 const queued = (store.meta.priorityEntries as string[] | undefined)?.includes(token.entryId ?? '');
 const reference = token.key.split(':').slice(0, 2).join(':');
 const bookmarked = store.bookmarks.some(b => b.id === reference);

 async function save() {
  setBusy(true); setError('');
  try {
   if (token.entryId) {
    await prioritizeEntry(token.entryId);
    setMessage('Added to your next new-word queue. Daily limits still apply.');
   } else {
    await toggleBookmark(reference);
    setMessage(bookmarked ? 'Ayah bookmark removed.' : 'Ayah bookmarked for revisiting.');
   }
  } catch (cause) {
   setError(cause instanceof Error ? cause.message : 'Could not save. Please try again.');
  } finally { setBusy(false); }
 }

 return <div className="stack">
  {token.entryId ? <>
   <p>{store.status === 'ready' ? familiarity(card) : 'Loading study status…'} · Vocabulary course</p>
   {card ? <p className="muted">{card.paused ? 'Reviews are paused. Open the entry to resume.' : 'Already in your review schedule.'}</p> :
    <button className="button button-primary" disabled={busy || store.status !== 'ready' || queued} onClick={() => void save()}>{queued ? 'Queued for study' : 'Study next'}</button>}
   <Link href={`/learn/${token.entryId}`}>Explore vocabulary entry →</Link>
  </> : <>
   <p className="muted">This word is outside the current vocabulary course. Save its ayah to revisit it.</p>
   <button className="button button-secondary" aria-pressed={bookmarked} disabled={busy || store.status !== 'ready'} onClick={() => void save()}>{bookmarked ? 'Remove ayah bookmark' : 'Bookmark this ayah'}</button>
  </>}
  {message && <p role="status">{message}</p>}
  {error && <p role="alert">{error}</p>}
 </div>;
}
