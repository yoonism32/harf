import { describe, it, expect, vi } from 'vitest';
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

  it('returns 1:1 on Jan 1 (day 0 → idx 1)', () => {
    vi.setSystemTime(new Date('2024-01-01T06:00:00Z'));
    expect(getDailyAyahRef()).toBe('1:1');
    vi.useRealTimers();
  });

  it('returns 1:2 on Jan 2 (day 1 → idx 2)', () => {
    vi.setSystemTime(new Date('2024-01-02T06:00:00Z'));
    expect(getDailyAyahRef()).toBe('1:2');
    vi.useRealTimers();
  });
});
