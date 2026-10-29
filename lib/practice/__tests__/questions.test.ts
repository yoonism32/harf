import { describe, expect, it } from 'vitest';
import { buildListeningQuestion, buildWordQuestion } from '../questions';
import type { Catalog, VocabularyEntry } from '@/lib/content/schema';

const entries: VocabularyEntry[] = Array.from({ length: 8 }, (_, index) => ({
  id: `l-${String(index).padStart(16, 'a')}`,
  lemma: `lemma-${index}`,
  root: index < 4 ? `root-${index}` : null,
  arabic: `word-${index}`,
  gloss: `meaning-${index}`,
  transliteration: `transliteration-${index}`,
  representativeKey: `${index + 1}:1:1`,
  exampleKeys: [`${index + 1}:1:1`],
  occurrenceCount: index + 1,
  courseOrder: index + 1,
  sourceIds: ['test'],
  approval: { status: 'pending' },
}));

const catalog = {
  contentVersion: '1234567890abcdef',
  entries,
  surahs: Array.from({ length: 114 }, (_, index) => ({
    number: index + 1,
    arabicName: `Arabic ${index + 1}`,
    englishName: `Surah ${index + 1}`,
    ayahCount: 1,
  })),
  releaseReady: false,
  blockers: [],
} satisfies Catalog;

describe('practice questions', () => {
  it('reconstructs a meaning round deterministically with four unique choices', () => {
    const first = buildWordQuestion(entries, 'meaning', 42, 3);
    const again = buildWordQuestion(entries, 'meaning', 42, 3);
    expect(again).toEqual(first);
    expect(new Set(first.choices)).toHaveLength(4);
    expect(first.choices).toContain(first.correct);
  });

  it('uses only entries with recorded roots for root rounds', () => {
    const question = buildWordQuestion(entries, 'root', 9, 2);
    expect(question.entry.root).toBeTruthy();
    expect(question.correct).toBe(question.entry.root);
    expect(new Set(question.choices)).toHaveLength(4);
  });

  it('builds a deterministic listening round with distinct surah choices', () => {
    const question = buildListeningQuestion(catalog, 77, 4);
    expect(buildListeningQuestion(catalog, 77, 4)).toEqual(question);
    expect(new Set(question.choices.map((choice) => choice.number))).toHaveLength(4);
    expect(question.choices.some((choice) => choice.number === question.surah.number)).toBe(true);
  });

  it('draws targets only from an explicit pool and does not repeat until it is exhausted', () => {
    const targetIds = [entries[2]!.id, entries[5]!.id];
    const first = buildWordQuestion(entries, 'meaning', 42, 0, targetIds);
    const second = buildWordQuestion(entries, 'meaning', 42, 1, targetIds);
    expect(targetIds).toContain(first.entry.id);
    expect(targetIds).toContain(second.entry.id);
    expect(second.entry.id).not.toBe(first.entry.id);
    expect(buildWordQuestion(entries, 'meaning', 42, 2, targetIds).entry.id).toBe(first.entry.id);
  });

  it('keeps broad approved distractors when the target pool is smaller than four', () => {
    const question = buildWordQuestion(entries, 'meaning', 42, 0, [entries[0]!.id]);
    expect(question.entry.id).toBe(entries[0]!.id);
    expect(new Set(question.choices)).toHaveLength(4);
  });
});
