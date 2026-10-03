import { describe, expect, it } from 'vitest';
import { positionsInRanges, wordsInRanges } from '../compare';
import { getPracticePairs, getRepeatedPhrases, getSurahThemes, getThemeForAyah } from '../data';
import type { Token } from '@/lib/content/schema';

describe('insight data', () => {
  it('finds a theme both in its surah outline and at an ayah', () => {
    const theme = getThemeForAyah(1, 3);
    expect(theme).not.toBeNull();
    expect(getSurahThemes(1)).toContainEqual(theme);
  });

  it('returns comparison pairs with a visible wording difference', () => {
    const pairs = getPracticePairs(8);
    expect(pairs).toHaveLength(8);
    expect(pairs.every(pair => pair.score >= 80 && pair.score < 100)).toBe(true);
    expect(new Set(pairs.flatMap(pair => [pair.verseA, pair.verseB])).size).toBe(16);
  });

  it('orders repeated phrases by occurrence count', () => {
    const phrases = getRepeatedPhrases('2:107', 3);
    expect(phrases.length).toBeGreaterThan(0);
    expect(phrases.map(phrase => phrase.count)).toEqual(
      [...phrases].map(phrase => phrase.count).sort((a, b) => b - a),
    );
  });
});

describe('word ranges', () => {
  it('expands valid inclusive ranges and ignores malformed ranges', () => {
    expect([...positionsInRanges([[2, 4], [7], [0, 2], [9, 8]])]).toEqual([2, 3, 4, 7]);
  });

  it('extracts only Quran words in the requested positions', () => {
    const tokens = [
      { key: '1:1:1', position: 1, arabic: 'بِسْمِ', kind: 'word' },
      { key: '1:1:2', position: 2, arabic: 'ٱللَّهِ', kind: 'word' },
      { key: '1:1:3', position: 3, arabic: '١', kind: 'end-marker' },
    ] as Token[];
    expect(wordsInRanges(tokens, [[1, 2]])).toBe('بِسْمِ ٱللَّهِ');
  });
});
