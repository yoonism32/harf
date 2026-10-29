import {describe, expect, it} from 'vitest';
import {
  practiceAnswerHref,
  practiceHref,
  practiceNextRoundHref,
  practiceSeedFor,
  practiceStartHref,
} from '../practice';

const returnTo = '/read?view=saved&thread=ayah%3A1%3A5';
const base = {mode: 'meaning' as const, seed: 42, round: 2, focus: 'ayah:1:5', returnTo};

function params(href: string) {
  return new URL(href, 'https://harf.local').searchParams;
}

describe('practice URL builders', () => {
  it('preserves the saved-thread origin and focus on an answer', () => {
    const href = practiceAnswerHref({...base, answer: 'you worship'});
    const query = params(href);

    expect(query.get('answer')).toBe('you worship');
    expect(query.get('focus')).toBe('ayah:1:5');
    expect(query.get('returnTo')).toBe(returnTo);
    expect(query.get('round')).toBe('2');
  });

  it('preserves both through the next round', () => {
    const href = practiceNextRoundHref(base);
    const query = params(href);

    expect(query.get('round')).toBe('3');
    expect(query.get('focus')).toBe('ayah:1:5');
    expect(query.get('returnTo')).toBe(returnTo);
  });

  it('preserves both when a fresh round starts from the chooser', () => {
    const href = practiceStartHref({mode: 'root', seed: 7, focus: 'passage:1:5:7', returnTo});
    const query = params(href);

    expect(query.get('round')).toBe('0');
    expect(query.get('mode')).toBe('root');
    expect(query.get('focus')).toBe('passage:1:5:7');
    expect(query.get('returnTo')).toBe(returnTo);
  });

  it('preserves an explicit prepared-set flag through start, answer and next', () => {
    expect(params(practiceAnswerHref({...base, prepared: true, answer: 'you worship'})).get('prepared')).toBe('1');
    expect(params(practiceNextRoundHref({...base, prepared: true})).get('prepared')).toBe('1');
    const {round, ...startBase} = base;
    expect(params(practiceStartHref({...startBase, prepared: true})).get('prepared')).toBe('1');
    expect(round).toBe(2);
  });

  it('does not attach a prepared flag without a valid focus', () => {
    const query = params(practiceHref({...base, focus: null, prepared: true}));
    expect(query.has('prepared')).toBe(false);
  });

  it('drops an unsafe origin instead of carrying it into practice', () => {
    for (const unsafe of ['https://example.com', '//example.com', '/read\\1/5', '/read/1/5\nnext']) {
      const query = params(practiceHref({...base, returnTo: unsafe}));
      expect(query.has('returnTo')).toBe(false);
    }
  });

  it('drops a malformed focus instead of targeting the wrong study item', () => {
    for (const focus of ['ayah:1', 'javascript:alert(1)', 'passage:1:5', 'ayah:1:5:7']) {
      const query = params(practiceHref({...base, focus}));
      expect(query.has('focus')).toBe(false);
    }
  });

  it('rejects invalid seeds and rounds rather than building a broken URL', () => {
    expect(() => practiceHref({...base, seed: -1})).toThrow();
    expect(() => practiceHref({...base, seed: 1.5})).toThrow();
    expect(() => practiceHref({...base, round: -1})).toThrow();
    expect(() => practiceHref({...base, round: 10_000})).toThrow();
  });

  it('derives a stable uint32 seed for each saved thread', () => {
    const first = practiceSeedFor('ayah:1:5');
    expect(first).toBe(practiceSeedFor('ayah:1:5'));
    expect(Number.isInteger(first)).toBe(true);
    expect(first).toBeGreaterThanOrEqual(0);
    expect(first).toBeLessThanOrEqual(0xffffffff);
    expect(first).not.toBe(practiceSeedFor('ayah:1:6'));
  });
});
