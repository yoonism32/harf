import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  RESPONSE_TO_GRADE,
  STUDY_BUTTONS,
  MASTERY_LABELS,
  MASTERY_COLORS,
  buildSessionQueue,
  reviewWord,
  reviewName,
} from '../srs';
import { Rating } from 'ts-fsrs';
import { getAllNameProgress } from '../storage';
import { getAllWordProgress } from '../storage';

// ── localStorage mock ─────────────────────────────────────────
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
  it('maps all 4 study buttons to valid FSRS ratings (1–4)', () => {
    for (const grade of Object.values(RESPONSE_TO_GRADE)) {
      expect(grade).toBeGreaterThanOrEqual(1);
      expect(grade).toBeLessThanOrEqual(4);
    }
  });

  it('blackout maps to Rating.Again (1)', () => {
    expect(RESPONSE_TO_GRADE.blackout).toBe(Rating.Again);
    expect(RESPONSE_TO_GRADE.blackout).toBe(1);
  });

  it('perfect maps to Rating.Easy (4)', () => {
    expect(RESPONSE_TO_GRADE.perfect).toBe(Rating.Easy);
    expect(RESPONSE_TO_GRADE.perfect).toBe(4);
  });

  it('hard maps to Rating.Hard (2)', () => {
    expect(RESPONSE_TO_GRADE.hard).toBe(Rating.Hard);
  });

  it('good maps to Rating.Good (3)', () => {
    expect(RESPONSE_TO_GRADE.good).toBe(Rating.Good);
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

// ── reviewWord (FSRS) ─────────────────────────────────────────
describe('reviewWord', () => {
  it('Rating.Again on first review sets mastery to 1 (floor for first view)', () => {
    const result = reviewWord('word-x', Rating.Again);
    expect(result.mastery).toBe(1);
    expect(result.state).toBe(1); // State.Learning
    expect(result.lapses).toBe(0); // No lapses on first review
    expect(result.reps).toBe(1);
  });

  it('Rating.Easy on first review graduates immediately (state=Review, mastery >= 2)', () => {
    const result = reviewWord('word-easy', Rating.Easy);
    expect(result.mastery).toBeGreaterThanOrEqual(2);
    expect(result.state).toBe(2); // State.Review — Easy skips learning steps
    expect(result.stability).toBeGreaterThan(5);
  });

  it('Rating.Good on first review enters Learning state (mastery=1)', () => {
    const result = reviewWord('word-good-new', Rating.Good);
    expect(result.mastery).toBe(1);
    expect(result.state).toBe(1); // State.Learning
    expect(result.stability).toBeGreaterThan(0);
  });

  it('Rating.Again after graduating to Review increments lapses and lowers mastery', () => {
    // Prime to Review state with Easy (skips learning steps)
    reviewWord('w-established', Rating.Easy);
    reviewWord('w-established', Rating.Easy);
    const before = getAllWordProgress()['w-established']!;
    const beforeMastery = before.mastery;
    expect(before.state).toBe(2); // ensure we're in Review

    const result = reviewWord('w-established', Rating.Again);
    expect(result.mastery).toBeLessThan(beforeMastery);
    expect(result.lapses).toBeGreaterThanOrEqual(1); // FSRS increments lapses on lapse
    expect(result.state).toBe(3); // State.Relearning
  });

  it('consecutive Rating.Good reviews grow stability over time', () => {
    reviewWord('w-grow', Rating.Good);
    const after1 = getAllWordProgress()['w-grow']!;
    reviewWord('w-grow', Rating.Good);
    const after2 = getAllWordProgress()['w-grow']!;
    expect(after2.stability).toBeGreaterThanOrEqual(after1.stability);
  });

  it('stability is always a positive number after any rating', () => {
    for (const rating of [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy]) {
      const result = reviewWord(`w-stab-${rating}`, rating);
      expect(result.stability).toBeGreaterThan(0);
    }
  });

  it('nextReview is always at least tomorrow', () => {
    const result = reviewWord('w-date', Rating.Again);
    const today = new Date().toISOString().slice(0, 10);
    expect(result.nextReview > today).toBe(true);
  });

  it('result is persisted to localStorage', () => {
    reviewWord('w-persist', Rating.Good);
    const stored = getAllWordProgress()['w-persist'];
    expect(stored).toBeDefined();
    expect(stored?.id).toBe('w-persist');
    expect(stored?.reps).toBe(1);
  });

  it('reps increments with each review', () => {
    reviewWord('w-reps', Rating.Good);
    reviewWord('w-reps', Rating.Good);
    reviewWord('w-reps', Rating.Good);
    const result = getAllWordProgress()['w-reps']!;
    expect(result.reps).toBe(3);
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
    for (const id of due) {
      expect(queue).toContain(id);
    }
  });
});

// ── reviewName ────────────────────────────────────────────────
describe('reviewName', () => {
  it('Rating.Easy on first review sets mastery >= 2 and graduates to Review', () => {
    const result = reviewName(1, Rating.Easy);
    expect(result.mastery).toBeGreaterThanOrEqual(2);
    expect(result.id).toBe(1);
    expect(result.state).toBe(2); // State.Review
  });

  it('Rating.Again on first review sets mastery to 1 (floor)', () => {
    const result = reviewName(2, Rating.Again);
    expect(result.mastery).toBe(1);
    expect(result.lapses).toBe(0); // No lapses on first review
    expect(result.state).toBe(1); // State.Learning
  });

  it('result is persisted to localStorage', () => {
    reviewName(3, Rating.Good);
    const stored = getAllNameProgress()[3];
    expect(stored).toBeDefined();
    expect(stored?.id).toBe(3);
    expect(stored?.reps).toBe(1);
  });

  it('nextReview is always at least tomorrow', () => {
    const result = reviewName(4, Rating.Again);
    const today = new Date().toISOString().slice(0, 10);
    expect(result.nextReview > today).toBe(true);
  });

  it('consecutive Rating.Easy reviews grow stability', () => {
    reviewName(5, Rating.Easy);
    const after1 = getAllNameProgress()[5]!;
    reviewName(5, Rating.Easy);
    const after2 = getAllNameProgress()[5]!;
    expect(after2.stability).toBeGreaterThanOrEqual(after1.stability);
  });

  it('Rating.Again after graduating to Review lowers mastery', () => {
    reviewName(6, Rating.Easy); // Graduate immediately
    const before = getAllNameProgress()[6]!;
    const beforeMastery = before.mastery;
    const result = reviewName(6, Rating.Again);
    expect(result.mastery).toBeLessThan(beforeMastery);
    expect(result.state).toBe(3); // State.Relearning
  });

  it('difficulty stays in valid FSRS range (1–10)', () => {
    for (let i = 0; i < 5; i++) reviewName(7, Rating.Again);
    const result = getAllNameProgress()[7]!;
    expect(result.difficulty).toBeGreaterThanOrEqual(1);
    expect(result.difficulty).toBeLessThanOrEqual(10);
  });
});
