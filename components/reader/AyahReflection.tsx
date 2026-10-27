'use client';

import {useEffect, useState} from 'react';
import {z} from 'zod';
import {useHarfStore} from '@/lib/data/store';
import {readNoteDraft, writeNoteDraft, clearNoteDraft} from '@/lib/data/note-draft';
import {reflectionId, saveReflection} from '@/lib/learning/reflections';

const draftSchema = z.object({text: z.string().max(1000), updatedAt: z.string().nullable()});
type Draft = z.infer<typeof draftSchema>;

export function AyahReflection({reference}: {reference: string}) {
 const store = useHarfStore(), id = reflectionId(reference);
 const saved = store.notes.find(note => note.id === id);
 const [draft, setDraft] = useState<Draft | null>(null);
 const [ready, setReady] = useState(false);
 const [busy, setBusy] = useState(false);
 const [error, setError] = useState('');
 const [message, setMessage] = useState('');
 useEffect(() => {
  if (store.status !== 'ready') return;
  const raw = readNoteDraft(id);
  try { const parsed = raw ? draftSchema.safeParse(JSON.parse(raw)) : null; setDraft(parsed?.success ? parsed.data : null); }
  catch { setDraft(null); }
  setReady(true);
 }, [id, store.status]);
 const text = draft?.text ?? saved?.text ?? '';
 const dirty = draft !== null && text !== (saved?.text ?? '');
 useEffect(() => {
  if (!dirty) return;
  const guard = (event: BeforeUnloadEvent) => event.preventDefault();
  window.addEventListener('beforeunload', guard);
  return () => window.removeEventListener('beforeunload', guard);
 }, [dirty]);
 async function save() {
  if (!draft) return;
  setBusy(true); setError(''); setMessage('');
  try {await saveReflection(reference, draft.text, draft.updatedAt); clearNoteDraft(id); setDraft(null); setMessage('Reflection saved.');}
  catch (cause) {setError(cause instanceof Error ? cause.message : 'Could not save. Your draft is still here.');}
  finally {setBusy(false);}
 }
 return <section className="sheet stack" aria-label={`Reflection on ${reference}`}>
  <h2>My reflection · {reference}</h2>
  <p className="muted">Your personal thoughts and questions, separate from the translation and tafsir.</p>
  <label className="field">What did I understand? What do I want to look into?
   <textarea rows={7} maxLength={1000} disabled={!ready || busy || store.status !== 'ready'} value={text} onChange={event => {
    const next = {text: event.target.value, updatedAt: draft ? draft.updatedAt : saved?.updatedAt ?? null};
    setDraft(next); writeNoteDraft(id, JSON.stringify(next)); setMessage('');
   }}/>
  </label>
  <small>{text.length} / 1,000 characters{dirty ? ' · Unsaved draft retained in this tab' : ''}</small>
  <button className="button button-primary" disabled={!dirty || busy || store.status !== 'ready'} onClick={() => void save()}>Save reflection</button>
  {error && <div role="alert" className="stack"><p>{error}</p><p>Currently saved: {saved?.text || 'No saved reflection.'}</p><button className="button button-secondary" disabled={busy} onClick={() => {setDraft(null); clearNoteDraft(id); setError('');}}>Discard draft and use saved reflection</button></div>}
  {message && <p role="status">{message}</p>}
 </section>;
}
