import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getAllWordProgress,
  getWordProgress,
  setWordProgress,
  getAllNameProgress,
  getNameProgress,
  setNameProgress,
  getStudySessions,
  addStudySession,
  getDailyAyahCache,
  setDailyAyahCache,
  setLastVerse,
  getLastVerse,
  getLocation,
  importAllData,
  getStreak,
  getLeechIds,
  getMasteryDistribution,
  getMasteredCount,
  getFutureReviews,
  getDueWordIds,
  toWordId,
  SCHEMA_VERSION,
  type WordProgress,
  type NameProgress,
  type StudySession,
  type DailyAyahCache,
  type HarfBackup,
} from '../storage';

// ── localStorage mock ───────────────────────────────────────────
// storage.ts checks `typeof window === 'undefined'` to detect SSR.
// In Vitest's node environment we must stub both window and localStorage.
const store: Record<string, string> = {};

const localStorageMock = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => { store[key] = value; },
  removeItem: (key: string) => { delete store[key]; },
  clear: () => { for (const k in store) delete store[k]; },
  get length() { return Object.keys(store).length; },
  key: (i: number) => Object.keys(store)[i] ?? null,
};

vi.stubGlobal('window', {}); // makes typeof window !== 'undefined'
vi.stubGlobal('localStorage', localStorageMock);

// Helper: make a WordProgress fixture (FSRS fields)
function makeProgress(overrides: Partial<WordProgress> = {}): WordProgress {
  return {
    id:         toWordId('word-1'),
    mastery:    3,
    stability:  10,
    difficulty: 5,
    state:      2,   // Review
    lapses:     0,
    reps:       3,
    nextReview: '2025-01-01',
    ...overrides,
  };
}

beforeEach(() => {
  localStorageMock.clear();
});

// ── getAllWordProgress ─────────────────────────────────────────
describe('getAllWordProgress', () => {
  it('returns empty object when nothing stored', () => {
    expect(getAllWordProgress()).toEqual({});
  });

  it('returns stored progress', () => {
    const p = makeProgress();
    setWordProgress(p);
    const all = getAllWordProgress();
    expect(all['word-1']).toMatchObject({ id: 'word-1', mastery: 3 });
  });

  it('returns {} on JSON.parse corruption', () => {
    store['harf:v1:word_progress'] = 'not-json{{';
    expect(getAllWordProgress()).toEqual({});
  });
});

// ── getWordProgress ───────────────────────────────────────────
describe('getWordProgress', () => {
  it('returns null for unknown id', () => {
    expect(getWordProgress(toWordId('unknown'))).toBeNull();
  });

  it('returns progress for known id', () => {
    const p = makeProgress({ id: toWordId('abc') });
    setWordProgress(p);
    const result = getWordProgress(toWordId('abc'));
    expect(result?.mastery).toBe(3);
  });
});

// ── setWordProgress ────────────────────────────────────────────
describe('setWordProgress', () => {
  it('persists and overwrites existing entry', () => {
    setWordProgress(makeProgress({ id: toWordId('w1'), mastery: 1 }));
    setWordProgress(makeProgress({ id: toWordId('w1'), mastery: 4 }));
    expect(getWordProgress(toWordId('w1'))?.mastery).toBe(4);
  });

  it('stores multiple words independently', () => {
    setWordProgress(makeProgress({ id: toWordId('w1'), mastery: 1 }));
    setWordProgress(makeProgress({ id: toWordId('w2'), mastery: 5 }));
    expect(getWordProgress(toWordId('w1'))?.mastery).toBe(1);
    expect(getWordProgress(toWordId('w2'))?.mastery).toBe(5);
  });
});

// ── getStreak ─────────────────────────────────────────────────
describe('getStreak', () => {
  it('returns 0 with no sessions', () => {
    expect(getStreak()).toBe(0);
  });

  it('returns 1 for a single session today', () => {
    const today = new Date().toISOString().slice(0, 10);
    addStudySession({ date: today, wordsReviewed: 5, coverageBefore: 10, coverageAfter: 12 });
    expect(getStreak()).toBe(1);
  });

  it('returns 1 for a session yesterday only', () => {
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    addStudySession({ date: yesterday, wordsReviewed: 3, coverageBefore: 5, coverageAfter: 6 });
    expect(getStreak()).toBe(1);
  });

  it('returns 2 for today + yesterday', () => {
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    addStudySession({ date: yesterday, wordsReviewed: 3, coverageBefore: 5, coverageAfter: 6 });
    addStudySession({ date: today, wordsReviewed: 5, coverageBefore: 6, coverageAfter: 8 });
    expect(getStreak()).toBe(2);
  });

  it('breaks streak on gap (two days ago only)', () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10);
    addStudySession({ date: twoDaysAgo, wordsReviewed: 2, coverageBefore: 3, coverageAfter: 4 });
    expect(getStreak()).toBe(0);
  });

  it('counts multiple sessions on same day as one streak day', () => {
    const today = new Date().toISOString().slice(0, 10);
    addStudySession({ date: today, wordsReviewed: 5, coverageBefore: 10, coverageAfter: 12 });
    addStudySession({ date: today, wordsReviewed: 3, coverageBefore: 12, coverageAfter: 13 });
    expect(getStreak()).toBe(1);
  });
});

// ── getLeechIds ────────────────────────────────────────────────
describe('getLeechIds', () => {
  it('returns empty array when no progress', () => {
    expect(getLeechIds()).toEqual([]);
  });

  it('identifies leech: lapses >= 8', () => {
    setWordProgress(makeProgress({ id: toWordId('leech'), lapses: 8 }));
    expect(getLeechIds()).toContain('leech');
  });

  it('does not flag word with lapses < 8', () => {
    setWordProgress(makeProgress({ id: toWordId('ok'), lapses: 7 }));
    expect(getLeechIds()).not.toContain('ok');
  });

  it('does not flag word with lapses === 0', () => {
    setWordProgress(makeProgress({ id: toWordId('new'), lapses: 0 }));
    expect(getLeechIds()).not.toContain('new');
  });

  it('exact boundary: lapses === 7 is NOT a leech', () => {
    setWordProgress(makeProgress({ id: toWordId('boundary'), lapses: 7 }));
    expect(getLeechIds()).not.toContain('boundary');
  });

  it('exact boundary: lapses === 8 IS a leech', () => {
    setWordProgress(makeProgress({ id: toWordId('boundary2'), lapses: 8 }));
    expect(getLeechIds()).toContain('boundary2');
  });

  it('does not flag suspended words', () => {
    setWordProgress(makeProgress({ id: toWordId('suspended'), lapses: 10, suspended: true }));
    expect(getLeechIds()).not.toContain('suspended');
  });
});

// ── getMasteryDistribution ────────────────────────────────────
describe('getMasteryDistribution', () => {
  it('returns all-zero distribution with no progress', () => {
    const dist = getMasteryDistribution();
    for (let i = 0; i <= 5; i++) {
      expect(dist[i]).toBe(0);
    }
  });

  it('counts correctly across mastery levels', () => {
    setWordProgress(makeProgress({ id: toWordId('w1'), mastery: 0 }));
    setWordProgress(makeProgress({ id: toWordId('w2'), mastery: 3 }));
    setWordProgress(makeProgress({ id: toWordId('w3'), mastery: 3 }));
    setWordProgress(makeProgress({ id: toWordId('w4'), mastery: 5 }));
    const dist = getMasteryDistribution();
    expect(dist[0]).toBe(1);
    expect(dist[3]).toBe(2);
    expect(dist[5]).toBe(1);
  });

  it('total count equals number of stored words', () => {
    setWordProgress(makeProgress({ id: toWordId('a'), mastery: 1 }));
    setWordProgress(makeProgress({ id: toWordId('b'), mastery: 2 }));
    setWordProgress(makeProgress({ id: toWordId('c'), mastery: 4 }));
    const dist = getMasteryDistribution();
    const total = Object.values(dist).reduce((s, n) => s + n, 0);
    expect(total).toBe(3);
  });
});

// ── getMasteredCount ──────────────────────────────────────────
describe('getMasteredCount', () => {
  beforeEach(() => {
    setWordProgress(makeProgress({ id: toWordId('m5'), mastery: 5 }));
    setWordProgress(makeProgress({ id: toWordId('m4'), mastery: 4 }));
    setWordProgress(makeProgress({ id: toWordId('m3'), mastery: 3 }));
    setWordProgress(makeProgress({ id: toWordId('m2'), mastery: 2 }));
  });

  it('default threshold 4: counts mastery >= 4', () => {
    expect(getMasteredCount()).toBe(2);
  });

  it('custom threshold 3: counts mastery >= 3', () => {
    expect(getMasteredCount(3)).toBe(3);
  });

  it('custom threshold 5: only perfect mastery', () => {
    expect(getMasteredCount(5)).toBe(1);
  });

  it('threshold 6: nothing above max', () => {
    expect(getMasteredCount(6)).toBe(0);
  });
});

// ── getFutureReviews ──────────────────────────────────────────
describe('getFutureReviews', () => {
  it('returns object with N keys for N days', () => {
    const result = getFutureReviews(7);
    expect(Object.keys(result)).toHaveLength(7);
  });

  it('first key is today', () => {
    const today = new Date().toISOString().slice(0, 10);
    const result = getFutureReviews(3);
    expect(Object.keys(result)[0]).toBe(today);
  });

  it('counts words scheduled for specific future date', () => {
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    setWordProgress(makeProgress({ id: toWordId('due-tomorrow'), nextReview: tomorrow }));
    const result = getFutureReviews(3);
    expect(result[tomorrow]).toBe(1);
  });

  it('returns 0 for a day with no scheduled reviews', () => {
    const result = getFutureReviews(5);
    // With no progress stored, all counts should be 0
    for (const val of Object.values(result)) {
      expect(val).toBe(0);
    }
  });
});

// ── getDailyAyahCache ─────────────────────────────────────────
describe('getDailyAyahCache', () => {
  const today = new Date().toISOString().slice(0, 10);

  const fixture: DailyAyahCache = {
    date: today,
    surah: 2,
    ayah: 255,
    arabic: 'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ',
    english: 'Allah — there is no deity except Him',
    surahName: 'Al-Baqarah',
  };

  it('returns null with nothing stored', () => {
    expect(getDailyAyahCache()).toBeNull();
  });

  it('returns cached ayah if date matches today', () => {
    setDailyAyahCache(fixture);
    const result = getDailyAyahCache();
    expect(result?.ayah).toBe(255);
    expect(result?.surahName).toBe('Al-Baqarah');
  });

  it('returns null for stale date (yesterday)', () => {
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    setDailyAyahCache({ ...fixture, date: yesterday });
    expect(getDailyAyahCache()).toBeNull();
  });

  it('handles corrupt JSON gracefully', () => {
    store['harf:v1:daily_ayah'] = 'bad-json{{';
    expect(getDailyAyahCache()).toBeNull();
  });
});

// ── getDueWordIds ──────────────────────────────────────────────
describe('getDueWordIds', () => {
  it('returns empty array when no progress', () => {
    expect(getDueWordIds()).toEqual([]);
  });

  it('returns id for word due today', () => {
    const today = new Date().toISOString().slice(0, 10);
    setWordProgress(makeProgress({ id: toWordId('due-today'), nextReview: today }));
    expect(getDueWordIds()).toContain('due-today');
  });

  it('returns id for overdue word (past date)', () => {
    setWordProgress(makeProgress({ id: toWordId('overdue'), nextReview: '2020-01-01' }));
    expect(getDueWordIds()).toContain('overdue');
  });

  it('does not return a word due in the future', () => {
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    setWordProgress(makeProgress({ id: toWordId('future'), nextReview: tomorrow }));
    expect(getDueWordIds()).not.toContain('future');
  });

  it('returns multiple due words', () => {
    const today = new Date().toISOString().slice(0, 10);
    setWordProgress(makeProgress({ id: toWordId('due-1'), nextReview: today }));
    setWordProgress(makeProgress({ id: toWordId('due-2'), nextReview: '2020-06-01' }));
    const ids = getDueWordIds();
    expect(ids).toContain('due-1');
    expect(ids).toContain('due-2');
  });

  it('does not include words due in the future when mixed with due words', () => {
    const today = new Date().toISOString().slice(0, 10);
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    setWordProgress(makeProgress({ id: toWordId('now'), nextReview: today }));
    setWordProgress(makeProgress({ id: toWordId('later'), nextReview: tomorrow }));
    const ids = getDueWordIds();
    expect(ids).toContain('now');
    expect(ids).not.toContain('later');
  });
});

// ── getAllNameProgress / setNameProgress ───────────────────────
function makeNameProgress(overrides: Partial<NameProgress> = {}): NameProgress {
  return {
    id: 1,
    mastery: 2,
    stability: 7,
    difficulty: 5,
    state: 1,
    lapses: 0,
    reps: 2,
    nextReview: '2099-01-01',
    ...overrides,
  };
}

describe('getAllNameProgress', () => {
  it('returns empty object when nothing stored', () => {
    expect(getAllNameProgress()).toEqual({});
  });

  it('returns stored name progress', () => {
    setNameProgress(makeNameProgress({ id: 1, mastery: 3 }));
    const all = getAllNameProgress();
    expect(all[1]).toMatchObject({ id: 1, mastery: 3 });
  });

  it('returns {} on JSON parse corruption', () => {
    store['harf:v1:name_progress'] = '{{bad';
    expect(getAllNameProgress()).toEqual({});
  });
});

describe('getNameProgress', () => {
  it('returns null for unknown id', () => {
    expect(getNameProgress(99)).toBeNull();
  });

  it('returns stored entry for known id', () => {
    setNameProgress(makeNameProgress({ id: 42, mastery: 4 }));
    expect(getNameProgress(42)?.mastery).toBe(4);
  });
});

describe('setNameProgress', () => {
  it('persists and overwrites existing entry', () => {
    setNameProgress(makeNameProgress({ id: 5, mastery: 1 }));
    setNameProgress(makeNameProgress({ id: 5, mastery: 5 }));
    expect(getNameProgress(5)?.mastery).toBe(5);
  });

  it('stores multiple names independently', () => {
    setNameProgress(makeNameProgress({ id: 1, mastery: 1 }));
    setNameProgress(makeNameProgress({ id: 2, mastery: 5 }));
    expect(getNameProgress(1)?.mastery).toBe(1);
    expect(getNameProgress(2)?.mastery).toBe(5);
  });
});

// ── setLastVerse / getLastVerse ────────────────────────────────
describe('setLastVerse / getLastVerse', () => {
  it('returns null when nothing stored', () => {
    expect(getLastVerse()).toBeNull();
  });

  it('round-trips surah and ayah', () => {
    setLastVerse(2, 255);
    expect(getLastVerse()).toEqual({ surah: 2, ayah: 255 });
  });

  it('overwrites on second call', () => {
    setLastVerse(1, 1);
    setLastVerse(36, 83);
    expect(getLastVerse()).toEqual({ surah: 36, ayah: 83 });
  });

  it('handles corrupt JSON gracefully', () => {
    store['harf:v1:last_verse'] = 'not-json';
    expect(getLastVerse()).toBeNull();
  });
});

// ── getLocation ────────────────────────────────────────────────
describe('getLocation', () => {
  it('returns null when nothing stored', () => {
    expect(getLocation()).toBeNull();
  });

  it('returns parsed location', () => {
    store['harf-location'] = JSON.stringify({ city: 'London', country: 'GB' });
    expect(getLocation()).toEqual({ city: 'London', country: 'GB' });
  });

  it('returns null for corrupt JSON', () => {
    store['harf-location'] = '{{bad';
    expect(getLocation()).toBeNull();
  });
});

// ── importAllData ─────────────────────────────────────────────
function makeBackup(overrides: Partial<HarfBackup> = {}): string {
  const backup: HarfBackup = {
    version: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    wordProgress: {},
    nameProgress: {},
    studySessions: [],
    location: null,
    reciter: null,
    ...overrides,
  };
  return JSON.stringify(backup);
}

describe('importAllData', () => {
  it('returns ok:false for invalid JSON', () => {
    const result = importAllData('not-json{{');
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/failed|invalid/i);
  });

  it('returns ok:false for JSON null', () => {
    const result = importAllData('null');
    expect(result.ok).toBe(false);
  });

  it('returns ok:false for wrong schema version', () => {
    const result = importAllData(makeBackup({ version: 'v99' }));
    expect(result.ok).toBe(false);
    expect(result.message).toContain('v99');
  });

  it('returns ok:true and imports word progress', () => {
    const wordProgress = {
      'a-l-h': makeProgress({ id: toWordId('a-l-h'), mastery: 5 }),
    };
    const result = importAllData(makeBackup({ wordProgress }));
    expect(result.ok).toBe(true);
    expect(getAllWordProgress()['a-l-h']?.mastery).toBe(5);
  });

  it('reports word count and session count in success message', () => {
    const wordProgress = {
      w1: makeProgress({ id: toWordId('w1') }),
      w2: makeProgress({ id: toWordId('w2') }),
    };
    const studySessions: StudySession[] = [
      { date: '2025-01-01', wordsReviewed: 5, coverageBefore: 10, coverageAfter: 12 },
    ];
    const result = importAllData(makeBackup({ wordProgress, studySessions }));
    expect(result.ok).toBe(true);
    expect(result.message).toContain('2');  // 2 words
    expect(result.message).toContain('1');  // 1 session
  });

  it('imports name progress', () => {
    const nameProgress = { 1: makeNameProgress({ id: 1, mastery: 4 }) };
    importAllData(makeBackup({ nameProgress }));
    expect(getNameProgress(1)?.mastery).toBe(4);
  });

  it('imports study sessions', () => {
    const studySessions: StudySession[] = [
      { date: '2025-03-01', wordsReviewed: 10, coverageBefore: 20, coverageAfter: 22 },
    ];
    importAllData(makeBackup({ studySessions }));
    expect(getStudySessions()).toHaveLength(1);
    expect(getStudySessions()[0]?.wordsReviewed).toBe(10);
  });

  it('imports location', () => {
    importAllData(makeBackup({ location: { city: 'Cairo', country: 'EG' } }));
    expect(getLocation()).toEqual({ city: 'Cairo', country: 'EG' });
  });

  it('imports reciter preference', () => {
    importAllData(makeBackup({ reciter: 'mishari_alafasy_128kbps' }));
    expect(store['harf-reciter']).toBe('mishari_alafasy_128kbps');
  });

  it('accepts backup without version field (forward compat)', () => {
    const noVersion = makeBackup();
    const parsed = JSON.parse(noVersion) as HarfBackup;
    delete (parsed as Partial<HarfBackup>).version;
    const result = importAllData(JSON.stringify(parsed));
    expect(result.ok).toBe(true);
  });

  it('skips wordProgress import when field is missing', () => {
    setWordProgress(makeProgress({ id: toWordId('kept'), mastery: 3 }));
    const noWords = makeBackup();
    const parsed = JSON.parse(noWords) as HarfBackup;
    delete (parsed as Partial<HarfBackup>).wordProgress;
    importAllData(JSON.stringify(parsed));
    // Existing word progress should be preserved since we skipped import
    expect(getAllWordProgress()['kept']?.mastery).toBe(3);
  });
});
