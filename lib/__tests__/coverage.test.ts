import { describe, it, expect } from 'vitest';
import {
  calculateCoverage,
  getRank,
  rankProgress,
  formatPct,
  RANKS,
  SURAHS,
  type WordWithWeight,
} from '../coverage';
import { toWordId } from '../storage';
import type { WordProgress } from '../storage';

// ── getRank ─────────────────────────────────────────────────────

describe('getRank', () => {
  it('returns Mubtadi at 0%', () => {
    expect(getRank(0).transliteration).toBe("Mubtadi'");
  });

  it("returns Muta'allim at 20%", () => {
    expect(getRank(20).transliteration).toBe("Muta'allim");
  });

  it('returns Alim at 75%', () => {
    expect(getRank(75).transliteration).toBe('Alim');
  });

  it('returns Alim at 80% (max)', () => {
    expect(getRank(80).level).toBe(5);
  });

  it('covers all 5 rank thresholds', () => {
    const levels = [0, 25, 45, 65, 76].map(p => getRank(p).level);
    expect(levels).toEqual([1, 2, 3, 4, 5]);
  });
});

// ── calculateCoverage ────────────────────────────────────────────

const makeWord = (id: string, weight: number): WordWithWeight => ({ id, coverage_weight: weight });
const makeProgress = (id: string, mastery: number): WordProgress => ({
  id: toWordId(id),
  mastery,
  stability:  7,
  difficulty: 5,
  state:      2,
  lapses:     0,
  reps:       1,
  nextReview: '2099-01-01',
});

describe('calculateCoverage', () => {
  const words = [
    makeWord('w1', 0.01),
    makeWord('w2', 0.02),
    makeWord('w3', 0.03),
  ];

  it('returns 0% with no progress', () => {
    const result = calculateCoverage(words, {});
    expect(result.percentage).toBe(0);
    expect(result.masteredCount).toBe(0);
  });

  it('only counts mastery >= 4 by default', () => {
    const progress = {
      w1: makeProgress('w1', 3),  // below threshold
      w2: makeProgress('w2', 4),  // at threshold
      w3: makeProgress('w3', 5),  // above threshold
    };
    const result = calculateCoverage(words, progress);
    expect(result.masteredCount).toBe(2);
  });

  it('respects custom mastery threshold', () => {
    const progress = { w1: makeProgress('w1', 2), w2: makeProgress('w2', 3) };
    const result = calculateCoverage(words, progress, 2);
    expect(result.masteredCount).toBe(2);
  });

  it('returns totalWords = words.length', () => {
    const result = calculateCoverage(words, {});
    expect(result.totalWords).toBe(3);
  });

  it('percentage is capped at 80', () => {
    // Give all words high weight to push past 80%
    const heavyWords = [makeWord('x', 1.0)];
    const progress = { x: makeProgress('x', 5) };
    const result = calculateCoverage(heavyWords, progress);
    expect(result.percentage).toBeLessThanOrEqual(80);
  });

  it('includes rank in result', () => {
    const result = calculateCoverage(words, {});
    expect(result.rank).toBeDefined();
    expect(result.rank.level).toBeGreaterThanOrEqual(1);
  });
});

// ── rankProgress ──────────────────────────────────────────────

describe('rankProgress', () => {
  it('returns 0 at rank minimum (start of rank)', () => {
    // Rank 1: 0–20%. At 0% → progress within rank = 0
    expect(rankProgress(0)).toBe(0);
  });

  it('returns 1 at the last rank (Alim, 75–100%)', () => {
    // Alim rank maxPct is 100; at 100% progress = (100-75)/(100-75) = 1
    expect(rankProgress(100)).toBe(1);
  });

  it('returns 0.5 halfway through a rank', () => {
    const rank = RANKS[0]!; // 0–20%
    const mid = (rank.minPct + rank.maxPct) / 2; // 10%
    // getRank(10) → rank 1 (0–20%), progress = (10-0)/(20-0) = 0.5
    expect(rankProgress(mid)).toBeCloseTo(0.5, 1);
  });
});

// ── RANKS structure ───────────────────────────────────────────

describe('RANKS', () => {
  it('has exactly 5 ranks', () => {
    expect(RANKS).toHaveLength(5);
  });

  it('levels are sequential 1–5', () => {
    expect(RANKS.map(r => r.level)).toEqual([1, 2, 3, 4, 5]);
  });

  it('each rank has required string fields', () => {
    for (const rank of RANKS) {
      expect(typeof rank.arabic).toBe('string');
      expect(rank.arabic.length).toBeGreaterThan(0);
      expect(typeof rank.transliteration).toBe('string');
      expect(typeof rank.label).toBe('string');
    }
  });

  it('minPct of rank N equals maxPct of rank N-1 (contiguous ranges)', () => {
    for (let i = 1; i < RANKS.length; i++) {
      expect(RANKS[i]!.minPct).toBe(RANKS[i - 1]!.maxPct);
    }
  });

  it('first rank starts at 0%', () => {
    expect(RANKS[0]!.minPct).toBe(0);
  });

  it('last rank ends at 100%', () => {
    expect(RANKS[RANKS.length - 1]!.maxPct).toBe(100);
  });
});

// ── SURAHS structure ──────────────────────────────────────────

describe('SURAHS', () => {
  it('has exactly 114 surahs', () => {
    expect(SURAHS).toHaveLength(114);
  });

  it('surah numbers are sequential 1–114', () => {
    for (let i = 0; i < SURAHS.length; i++) {
      expect(SURAHS[i]!.number).toBe(i + 1);
    }
  });

  it('each surah has name, nameArabic, and positive ayah count', () => {
    for (const s of SURAHS) {
      expect(s.name.length).toBeGreaterThan(0);
      expect(s.nameArabic.length).toBeGreaterThan(0);
      expect(s.ayahs).toBeGreaterThan(0);
    }
  });

  it('Al-Fatiha is surah 1 with 7 ayahs', () => {
    expect(SURAHS[0]!.name).toBe('Al-Fatiha');
    expect(SURAHS[0]!.ayahs).toBe(7);
  });

  it('Al-Baqarah is surah 2 with 286 ayahs (longest)', () => {
    expect(SURAHS[1]!.name).toBe('Al-Baqarah');
    expect(SURAHS[1]!.ayahs).toBe(286);
  });

  it('An-Nas is surah 114', () => {
    expect(SURAHS[113]!.name).toBe('An-Nas');
    expect(SURAHS[113]!.number).toBe(114);
  });
});

// ── calculateCoverage precise math ────────────────────────────

describe('calculateCoverage — weight math', () => {
  it('computes percentage as (masteredWeight / totalWeight) * 80', () => {
    // Two equal-weight words, one mastered → 50% of 80 = 40%
    const words = [makeWord('a', 0.5), makeWord('b', 0.5)];
    const progress = { a: makeProgress('a', 5) };
    const result = calculateCoverage(words, progress);
    expect(result.percentage).toBeCloseTo(40, 0);
  });

  it('progress keys must exactly match word IDs for counting', () => {
    const words = [makeWord('kh-t-b', 1.0)];
    // Wrong key format — won't match
    const progress = { 'wrong-id': makeProgress('wrong-id', 5) };
    const result = calculateCoverage(words, progress);
    expect(result.masteredCount).toBe(0);
  });
});

// ── formatPct ─────────────────────────────────────────────────

describe('formatPct', () => {
  it('formats 0 as "0%"', () => {
    expect(formatPct(0)).toBe('0%');
  });

  it('formats small values with 1 decimal', () => {
    expect(formatPct(0.5)).toBe('0.5%');
  });

  it('rounds values >= 1', () => {
    expect(formatPct(12.6)).toBe('13%');
  });

  it('formats 80 correctly', () => {
    expect(formatPct(80)).toBe('80%');
  });
});
