'use client';
import Link from 'next/link';
import {useState} from 'react';
import {useHarfStore} from '@/lib/data/store';
import {passageLearning} from '@/lib/learning/passage-learning';
import {savePassageLearning} from '@/lib/learning/passage-learning-commands';

export function PassageRevisit() {
 const store = useHarfStore(), state = passageLearning(store.meta.passageLearning);
 const [error, setError] = useState(''), [busy, setBusy] = useState(false);
 const difficult = state.assessments.filter(item => item.assessment !== 'Understood').sort((a,b) => b.updatedAt.localeCompare(a.updatedAt));
 if (!state.range && !difficult.length) return null;
 async function clear() {
  setBusy(true); setError('');
  try {await savePassageLearning({range: null});} catch {setError('Could not remove the saved passage. Try again.');} finally {setBusy(false);}
 }
 return <section className="sheet stack" aria-label="Personal passage practice"><h2>Revisit a passage</h2>
  {state.range && <><Link href={`/read/${state.range.reference.replace(':','/')}/study?back=%2Ftoday&resume=1`}>Resume saved passage {state.range.reference}–{state.range.end} →</Link><p>Continue at ayah {state.range.current}. Save your place again after practising.</p><button className="button button-secondary" disabled={busy} onClick={() => void clear()}>Remove saved passage</button></>}
  {difficult.length > 0 && <details><summary>Ayahs to look at again ({difficult.length})</summary><ul>{difficult.map(item => <li key={item.reference}><Link href={`/read/${item.reference.replace(':','/')}/study?back=%2Ftoday`}>Ayah {item.reference}</Link> · {item.assessment} · {item.obstacle}</li>)}</ul></details>}
  <p className="muted">Chosen by you, separate from due vocabulary and similar-passage comparisons.</p>{error && <p role="alert">{error}</p>}
 </section>;
}
