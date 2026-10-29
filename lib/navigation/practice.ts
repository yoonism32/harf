import type {PracticeMode} from '@/lib/practice/questions';
import {safeReturn} from './return';

const modes: readonly PracticeMode[] = ['listening', 'meaning', 'root'];
const focusPattern = /^(?:ayah:[1-9]\d{0,2}:[1-9]\d{0,2}|passage:[1-9]\d{0,2}:[1-9]\d{0,2}:[1-9]\d{0,3})$/;

export type PracticeHrefOptions = {
  mode: PracticeMode;
  seed: number;
  round: number;
  answer?: string;
  focus?: string | null;
  prepared?: boolean;
  returnTo?: string | null;
};

function validRound(value: number) {
  return Number.isSafeInteger(value) && value >= 0 && value <= 9999;
}

function validSeed(value: number) {
  return Number.isSafeInteger(value) && value >= 0 && value <= 0xffffffff;
}

function validFocus(value: string | null | undefined) {
  return !!value && value.length <= 80 && focusPattern.test(value);
}

/**
 * One builder for every practice transition.
 *
 * `returnTo` is revalidated with the same rules as the rest of the app, so an
 * invalid external origin is dropped rather than carried through a round.
 */
export function practiceHref({mode, seed, round, answer, focus, prepared, returnTo}: PracticeHrefOptions): string {
  if (!modes.includes(mode)) throw new Error('Invalid practice mode.');
  if (!validSeed(seed)) throw new Error('Invalid practice seed.');
  if (!validRound(round)) throw new Error('Invalid practice round.');
  if (answer !== undefined && answer.length > 200) throw new Error('Invalid practice answer.');

  const params = new URLSearchParams({
    mode,
    seed: String(seed),
    round: String(round),
  });
  if (answer) params.set('answer', answer);
  if (validFocus(focus)) {
    params.set('focus', focus!);
    if (prepared) params.set('prepared', '1');
  }
  const origin = safeReturn(returnTo);
  if (origin) params.set('returnTo', origin);
  return `/practice?${params.toString()}`;
}

export function practiceStartHref(options: Omit<PracticeHrefOptions, 'round'>): string {
  return practiceHref({...options, round: 0});
}

export function practiceAnswerHref(options: PracticeHrefOptions & {answer: string}): string {
  return practiceHref(options);
}

export function practiceNextRoundHref(options: PracticeHrefOptions): string {
  return practiceHref({...options, round: options.round + 1});
}

/** Deterministic session seed so a saved thread always starts reproducibly. */
export function practiceSeedFor(key: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < key.length; index += 1) {
    hash ^= key.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}
