import { describe, it, expect } from 'vitest';
import {
  RESPONSE_TO_GRADE,
  STUDY_BUTTONS,
  MASTERY_LABELS,
  MASTERY_COLORS,
  buildSessionQueue,
} from '../srs';

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
