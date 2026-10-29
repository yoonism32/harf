import {getDB} from '@/lib/data/db';
import {notifyChange} from '@/lib/data/store';
import {assessmentSchema, passageLearning, rangeSchema, type Assessment} from './passage-learning';

export async function savePassageLearning(change: {assessment: Assessment; expectedUpdatedAt: string | null} | {range: unknown}) {
 if ('assessment' in change) assessmentSchema.parse(change.assessment);
 else if (change.range !== null) rangeSchema.parse(change.range);
 const db = await getDB(), tx = db.transaction(['meta'], 'readwrite');
 void tx.done.catch(() => undefined);
 const meta = tx.objectStore('meta');
 const state = passageLearning(await meta.get('passageLearning'));
 if ('assessment' in change) {
  const previous = state.assessments.find(item => item.reference === change.assessment.reference);
  if ((previous?.updatedAt ?? null) !== change.expectedUpdatedAt) {
   tx.abort(); throw Error('This assessment changed elsewhere. Reopen the passage before replacing it.');
  }
  state.assessments = [change.assessment, ...state.assessments.filter(item => item.reference !== change.assessment.reference)].slice(0, 200);
 } else state.range = change.range === null ? null : rangeSchema.parse(change.range);
 await meta.put(state, 'passageLearning');
 await meta.put(Number(await meta.get('revision') ?? 0) + 1, 'revision');
 await tx.done; await notifyChange();
}
