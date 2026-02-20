import { describe, it, expect } from 'vitest';
import { getDailyAyahRef } from '../quran-api';

describe('getDailyAyahRef', () => {
  it('returns a string in "surah:ayah" format', () => {
    const ref = getDailyAyahRef();
    expect(ref).toMatch(/^\d+:\d+$/);
  });

  it('surah number is between 1 and 114', () => {
    const [s] = getDailyAyahRef().split(':').map(Number);
    expect(s).toBeGreaterThanOrEqual(1);
    expect(s).toBeLessThanOrEqual(114);
  });

  it('ayah number is >= 1', () => {
    const [, a] = getDailyAyahRef().split(':').map(Number);
    expect(a).toBeGreaterThanOrEqual(1);
  });

  it('returns consistent result for same day (deterministic)', () => {
    const r1 = getDailyAyahRef();
    const r2 = getDailyAyahRef();
    expect(r1).toBe(r2);
  });
});
