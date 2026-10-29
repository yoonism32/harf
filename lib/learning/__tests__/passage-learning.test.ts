import 'fake-indexeddb/auto';
import {it, expect, vi, beforeEach, afterEach} from 'vitest';
import {deleteDB} from 'idb';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
vi.mock('@/lib/data/store', () => ({notifyChange: vi.fn()}));
import {closeDB, readData} from '@/lib/data/db';
import {validateBackup, exportBackup, parseImport, replaceFromBackup} from '@/lib/data/backup';
import {savePassageLearning} from '../passage-learning-commands';
import {passageLearning, rangeSchema} from '../passage-learning';
import {languagePatterns} from '../language-patterns';
import {CONTENT_VERSION} from '@/lib/content/client';
import {saveReflection} from '../reflections';
import {migrateLegacy} from '@/lib/data/migrate';
beforeEach(async () => {await closeDB(); await deleteDB('harf'); await migrateLegacy();});
afterEach(closeDB);
const assessment = {reference: '1:5', assessment: 'Need another look' as const, obstacle: 'construction' as const, updatedAt: '2026-10-28T23:00:00.000Z'};
it('retains range, assessments and reflections across reload and backup replacement', async () => {
 await savePassageLearning({assessment, expectedUpdatedAt: null});
 await savePassageLearning({range: {reference: '1:5', current: 6, end: 7}, expectedRange: null});
 await saveReflection('1:5', 'Look into this construction', null);
 const files = await exportBackup('test');
 const backup = await parseImport(files.map(file => new File([file.text], file.name)));
 await closeDB();
 expect(passageLearning((await readData()).meta.passageLearning).assessments).toEqual([assessment]);
 await savePassageLearning({range: null, expectedRange: {reference: '1:5', current: 6, end: 7}});
 await replaceFromBackup(backup.backup);
 const restored = await readData();
 expect(passageLearning(restored.meta.passageLearning).range?.current).toBe(6);
 expect(restored.notes.find(note => note.id === 'ayah-1-5')?.text).toBe('Look into this construction');
});
it('rejects stale assessment saves and invalid ranges without losing data', async () => {
 await savePassageLearning({assessment, expectedUpdatedAt: null});
 await expect(savePassageLearning({assessment: {...assessment, assessment: 'Understood'}, expectedUpdatedAt: null})).rejects.toThrow('changed elsewhere');
 expect(passageLearning((await readData()).meta.passageLearning).assessments).toEqual([assessment]);
 expect(rangeSchema.safeParse({reference: '1:5', current: 5, end: 8}).success).toBe(false);
 expect(rangeSchema.safeParse({reference: '999:1', current: 1, end: 2}).success).toBe(false);
 const data = await readData(); data.meta.passageLearning = {assessments: [assessment, assessment]};
 expect(() => validateBackup({app:'harf', schemaVersion:2, contentVersion:'test', exportedAt:assessment.updatedAt, data})).toThrow();
});
it('rejects stale range replacement and removal, then permits a deliberate retry', async () => {
 const first = {reference:'1:5',current:5,end:7};
 const second = {reference:'1:5',current:6,end:7};
 await savePassageLearning({range:first,expectedRange:null});
 await savePassageLearning({range:second,expectedRange:first});
 await expect(savePassageLearning({range:first,expectedRange:first})).rejects.toThrow('changed elsewhere');
 await expect(savePassageLearning({range:null,expectedRange:first})).rejects.toThrow('changed elsewhere');
 expect(passageLearning((await readData()).meta.passageLearning).range).toEqual(second);
 await savePassageLearning({range:null,expectedRange:second});
 expect(passageLearning((await readData()).meta.passageLearning).range).toBeNull();
});
it('clears only the selected assessment and preserves reflections, ranges and other assessments', async () => {
 await savePassageLearning({assessment,expectedUpdatedAt:null});
 const other = {...assessment,reference:'1:6'};
 await savePassageLearning({assessment:other,expectedUpdatedAt:null});
 const range={reference:'1:5',current:5,end:7};
 await savePassageLearning({range,expectedRange:null});
 await saveReflection('1:5','Keep this reflection',null);
 await expect(savePassageLearning({removeAssessment:'1:5',expectedUpdatedAt:'2026-10-27T00:00:00.000Z'})).rejects.toThrow('changed elsewhere');
 await savePassageLearning({removeAssessment:'1:5',expectedUpdatedAt:assessment.updatedAt});
 const data=await readData();
 expect(passageLearning(data.meta.passageLearning)).toEqual({range,assessments:[other]});
 expect(data.notes[0]!.text).toBe('Keep this reflection');
});
it('anchors every curated pattern to features in the pinned morphology', () => {
 for (const pattern of languagePatterns) {
  const surah = pattern.reference.split(':')[0];
  const morphology = JSON.parse(readFileSync(resolve(`public/content/${CONTENT_VERSION}/morphology/${surah}.json`), 'utf8'));
  const features = morphology[pattern.wordKey].segments.flatMap((segment: {features: string[]}) => segment.features);
  for (const feature of pattern.evidence) expect(features).toContain(feature);
 }
});
it('keeps the previous assessment on a failed write and permits retry', async () => {
 await savePassageLearning({assessment, expectedUpdatedAt: null});
 const transaction = vi.spyOn(IDBDatabase.prototype, 'transaction').mockImplementationOnce(() => {throw Error('Storage unavailable');});
 const next = {...assessment, assessment: 'Understood' as const, updatedAt: '2026-10-28T23:01:00.000Z'};
 await expect(savePassageLearning({assessment: next, expectedUpdatedAt: assessment.updatedAt})).rejects.toThrow('Storage unavailable');
 transaction.mockRestore();
 expect(passageLearning((await readData()).meta.passageLearning).assessments[0]).toEqual(assessment);
 await savePassageLearning({assessment: next, expectedUpdatedAt: assessment.updatedAt});
 expect(passageLearning((await readData()).meta.passageLearning).assessments[0]).toEqual(next);
});
