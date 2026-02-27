import { describe, it, expect } from 'vitest';
import {
  calculateCoverage,
  getRank,
  rankProgress,
  formatPct,
  RANKS,
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
  interval: 1,
  repetition: 1,
  efactor: 2.5,
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
