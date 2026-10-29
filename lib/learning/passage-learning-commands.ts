import {getDB} from '@/lib/data/db';
import {notifyChange} from '@/lib/data/store';
import {assessmentSchema, passageLearning, rangeSchema, type Assessment, type PassageRange} from './passage-learning';

export async function savePassageLearning(change: {assessment: Assessment; expectedUpdatedAt: string | null} | {removeAssessment: string; expectedUpdatedAt: string} | {range: PassageRange | null; expectedRange: PassageRange | null}) {
 if ('assessment' in change) assessmentSchema.parse(change.assessment);
 else if ('range' in change) {rangeSchema.nullable().parse(change.range); rangeSchema.nullable().parse(change.expectedRange);}
 else {assessmentSchema.shape.reference.parse(change.removeAssessment); assessmentSchema.shape.updatedAt.parse(change.expectedUpdatedAt);}
 const db = await getDB(), tx = db.transaction(['meta'], 'readwrite');
 void tx.done.catch(() => undefined);
 const meta = tx.objectStore('meta');
 const state = passageLearning(await meta.get('passageLearning'));
 if ('range' in change) {
  if (JSON.stringify(state.range) !== JSON.stringify(rangeSchema.nullable().parse(change.expectedRange))) {
   tx.abort(); throw Error('The saved passage changed elsewhere. Review the current saved passage before trying again.');
  }
  state.range = change.range === null ? null : rangeSchema.parse(change.range);
 } else {
  const reference = 'assessment' in change ? change.assessment.reference : change.removeAssessment;
  const previous = state.assessments.find(item => item.reference === reference);
  if ((previous?.updatedAt ?? null) !== change.expectedUpdatedAt) {
   tx.abort(); throw Error('This assessment changed elsewhere. Reopen the passage before replacing it.');
  }
  const retained = state.assessments.filter(item => item.reference !== reference);
  state.assessments = 'assessment' in change ? [change.assessment, ...retained].slice(0, 200) : retained;
 }
 await meta.put(state, 'passageLearning');
 await meta.put(Number(await meta.get('revision') ?? 0) + 1, 'revision');
 await tx.done; await notifyChange();
}
