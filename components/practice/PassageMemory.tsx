'use client';
import {useState} from 'react';
import {useHarfStore} from '@/lib/data/store';
import {passageLearning, type Assessment} from '@/lib/learning/passage-learning';
import {savePassageLearning} from '@/lib/learning/passage-learning-commands';

export function PassageAssessment({reference, assessment}: {reference: string; assessment: string}) {
 const store = useHarfStore(), saved = passageLearning(store.meta.passageLearning).assessments.find(item => item.reference === reference);
 const [obstacle, setObstacle] = useState<Assessment['obstacle']>(saved?.obstacle ?? 'none');
 const [version, setVersion] = useState(saved?.updatedAt ?? null);
 const [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [error, setError] = useState('');
 async function save() {
  setBusy(true); setError('');
  const updatedAt = new Date(Math.max(Date.now(), version ? Date.parse(version) + 1 : 0)).toISOString();
  try {
   await savePassageLearning({assessment: {reference, assessment: assessment as Assessment['assessment'], obstacle, updatedAt}, expectedUpdatedAt: version});
   setVersion(updatedAt); setMessage('Assessment saved for another visit.');
  } catch (cause) {setError(cause instanceof Error ? cause.message : 'Could not save. Try again.');}
  finally {setBusy(false);}
 }
 return <section className="stack" aria-label="Save passage assessment">
  <label className="field">What made this difficult?<select value={obstacle} onChange={event => setObstacle(event.target.value as Assessment['obstacle'])} disabled={busy}>
   <option value="none">No particular obstacle</option><option value="word">An unfamiliar word</option><option value="construction">A language construction</option><option value="context">Missing context</option>
  </select></label>
  <p className="muted">Keep the latest assessment for up to 200 ayahs. This is personal feedback, not a comprehension score.</p>
  <button className="button button-secondary" disabled={!assessment || busy || store.status !== 'ready'} onClick={() => void save()}>{busy ? 'Saving assessment…' : 'Save assessment'}</button>
  {saved && <p>Saved: {saved.assessment} · {saved.obstacle}</p>}{message && <p role="status">{message}</p>}{error && <p role="alert">{error}</p>}
 </section>;
}

export function SavePassage({reference, end, current}: {reference: string; end: number; current: number}) {
 const [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [error, setError] = useState('');
 async function save() {
  setBusy(true); setError('');
  try {await savePassageLearning({range: {reference, end, current}}); setMessage('Passage and current ayah saved. Resume it from Today.');}
  catch (cause) {setError(cause instanceof Error ? cause.message : 'Could not save. Try again.');}
  finally {setBusy(false);}
 }
 return <div className="stack"><button className="button button-secondary" disabled={busy} onClick={() => void save()}>Save passage for Today</button>{message && <p role="status">{message}</p>}{error && <p role="alert">{error}</p>}</div>;
}
