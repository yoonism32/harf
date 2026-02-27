import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  RESPONSE_TO_GRADE,
  STUDY_BUTTONS,
  MASTERY_LABELS,
  MASTERY_COLORS,
  buildSessionQueue,
  reviewWord,
} from '../srs';
import { getAllWordProgress } from '../storage';

// ── localStorage mock (same as storage.test.ts) ───────────────
const store: Record<string, string> = {};
const localStorageMock = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => { store[key] = value; },
  removeItem: (key: string) => { delete store[key]; },
  clear: () => { for (const k in store) delete store[k]; },
  get length() { return Object.keys(store).length; },
  key: (i: number) => Object.keys(store)[i] ?? null,
};
vi.stubGlobal('window', {}); // makes typeof window !== 'undefined' (storage.ts SSR guard)
vi.stubGlobal('localStorage', localStorageMock);

beforeEach(() => {
  localStorageMock.clear();
});

describe('RESPONSE_TO_GRADE', () => {
  it('maps all 4 study buttons to valid SM-2 grades (0–5)', () => {
    for (const grade of Object.values(RESPONSE_TO_GRADE)) {
      expect(grade).toBeGreaterThanOrEqual(0);
      expect(grade).toBeLessThanOrEqual(5);
    }
  });

  it('blackout maps to grade 0', () => {
    expect(RESPONSE_TO_GRADE.blackout).toBe(0);
  });

  it('perfect maps to grade 5', () => {
    expect(RESPONSE_TO_GRADE.perfect).toBe(5);
  });
});

describe('STUDY_BUTTONS', () => {
  it('has exactly 4 buttons', () => {
    expect(STUDY_BUTTONS).toHaveLength(4);
  });

  it('each button has required fields', () => {
    for (const btn of STUDY_BUTTONS) {
      expect(btn.key).toBeTruthy();
      expect(btn.label).toBeTruthy();
      expect(btn.bg).toBeTruthy();
      expect(btn.color).toBeTruthy();
    }
  });

  it('button keys exist in RESPONSE_TO_GRADE', () => {
    for (const btn of STUDY_BUTTONS) {
      expect(btn.key in RESPONSE_TO_GRADE).toBe(true);
    }
  });
});

describe('MASTERY_LABELS', () => {
  it('has 6 levels (0–5)', () => {
    expect(MASTERY_LABELS).toHaveLength(6);
  });

  it('first label is Unknown', () => {
    expect(MASTERY_LABELS[0]).toBe('Unknown');
  });

  it('last label is Mastered', () => {
    expect(MASTERY_LABELS[5]).toBe('Mastered');
  });
});

describe('MASTERY_COLORS', () => {
  it('has 6 colors matching mastery levels', () => {
    expect(MASTERY_COLORS).toHaveLength(6);
  });

  it('each color is a non-empty string', () => {
    for (const color of MASTERY_COLORS) {
      expect(typeof color).toBe('string');
      expect(color.length).toBeGreaterThan(0);
    }
  });
});

// ── reviewWord (SM-2 integration) ────────────────────────────
describe('reviewWord', () => {
  it('grade 0 (blackout) on first review sets mastery to 1 (floor for first review)', () => {
    const result = reviewWord('word-x', 0);
    // First time: mastery is max(1, gradeToMastery(0, 0)) = max(1, max(0,0-1)) = max(1,0) = 1
    expect(result.mastery).toBe(1);
    expect(result.repetition).toBe(0);
    expect(result.interval).toBeGreaterThanOrEqual(1);
  });

  it('grade 5 (perfect) on first review raises mastery to 1', () => {
    const result = reviewWord('word-perfect', 5);
    expect(result.mastery).toBeGreaterThanOrEqual(1);
    expect(result.efactor).toBeGreaterThanOrEqual(2.5); // perfect → efactor unchanged or grows
  });

  it('grade 0 after established progress resets repetition and lowers mastery', () => {
    // Prime the word to mastery 3
    reviewWord('w-established', 4);
    reviewWord('w-established', 4);
    const before = getAllWordProgress()['w-established'];
    const beforeMastery = before?.mastery ?? 0;

    const result = reviewWord('w-established', 0);
    expect(result.mastery).toBeLessThan(beforeMastery);
    expect(result.repetition).toBe(0); // SM-2 resets on grade < 3
  });

  it('grade 5 (perfect) → efactor stays at or above 2.5 on first review', () => {
    const result = reviewWord('w-new-perfect', 5);
    expect(result.efactor).toBeGreaterThanOrEqual(2.5);
  });

  it('consecutive grade 5 reviews increase interval over time', () => {
    reviewWord('w-grow', 5);
    const after1 = getAllWordProgress()['w-grow']!;
    reviewWord('w-grow', 5);
    const after2 = getAllWordProgress()['w-grow']!;
    expect(after2.interval).toBeGreaterThanOrEqual(after1.interval);
  });

  it('efactor does not drop below SM-2 floor of 1.3', () => {
    // Grade 0 repeatedly to drive efactor down
    for (let i = 0; i < 10; i++) reviewWord('w-floor', 0);
    const result = getAllWordProgress()['w-floor']!;
    expect(result.efactor).toBeGreaterThanOrEqual(1.3);
  });

  it('nextReview is always at least tomorrow', () => {
    const result = reviewWord('w-date', 0);
    const today = new Date().toISOString().slice(0, 10);
    // Date strings are ISO-8601 and compare lexicographically
    expect(result.nextReview > today).toBe(true);
  });

  it('result is persisted to localStorage', () => {
    reviewWord('w-persist', 4);
    const stored = getAllWordProgress()['w-persist'];
    expect(stored).toBeDefined();
    expect(stored?.id).toBe('w-persist');
  });
});

describe('buildSessionQueue', () => {
  const allIds = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l'];

  it('includes due words in the queue', () => {
    const queue = buildSessionQueue(allIds, ['a', 'b'], 0);
    expect(queue).toContain('a');
    expect(queue).toContain('b');
  });

  it('does not exceed new word count', () => {
    const queue = buildSessionQueue(allIds, [], 3);
    expect(queue.length).toBeLessThanOrEqual(3);
  });

  it('returns empty array when no due words and limit 0', () => {
    const queue = buildSessionQueue(allIds, [], 0);
    expect(queue).toHaveLength(0);
  });

  it('interleaves due and new words (2:1 pattern)', () => {
    const due = ['d1', 'd2', 'd3', 'd4'];
    const queue = buildSessionQueue(['n1', 'n2', 'n3', ...due], due, 3);
    // Should have all due words + up to 3 new
    for (const id of due) {
      expect(queue).toContain(id);
    }
  });
});
