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
 await savePassageLearning({range: {reference: '1:5', current: 6, end: 7}});
 await saveReflection('1:5', 'Look into this construction', null);
 const files = await exportBackup('test');
 const backup = await parseImport(files.map(file => new File([file.text], file.name)));
 await closeDB();
 expect(passageLearning((await readData()).meta.passageLearning).assessments).toEqual([assessment]);
 await savePassageLearning({range: null});
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
 const data = await readData(); data.meta.passageLearning = {assessments: [assessment, assessment]};
 expect(() => validateBackup({app:'harf', schemaVersion:2, contentVersion:'test', exportedAt:assessment.updatedAt, data})).toThrow();
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
