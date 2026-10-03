import { parseWordKey } from '@/lib/content/refs';
import type { Catalog, Surah, VocabularyEntry } from '@/lib/content/schema';

export type PracticeMode = 'listening' | 'meaning' | 'root';

export type WordQuestion = {
  entry: VocabularyEntry;
  correct: string;
  choices: string[];
};

export type ListeningQuestion = {
  ref: string;
  surah: Surah;
  choices: Surah[];
};

function random(seed: number, round: number, salt: number) {
  let value = (seed ^ Math.imul(round + 1, 0x9e3779b1) ^ salt) >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let mixed = value;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled<T>(values: readonly T[], seed: number, round: number, salt: number) {
  const result = [...values];
  const next = random(seed, round, salt);
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(next() * (index + 1));
    [result[index], result[swap]] = [result[swap]!, result[index]!];
  }
  return result;
}

export function buildWordQuestion(
  entries: readonly VocabularyEntry[],
  mode: Exclude<PracticeMode, 'listening'>,
  seed: number,
  round: number,
): WordQuestion {
  const answer = (entry: VocabularyEntry) => mode === 'root' ? entry.root : entry.gloss;
  const eligible = entries.filter((entry) => answer(entry)?.trim());
  const answerPool = [...new Set(eligible.map(answer).filter((value): value is string => !!value))];
  if (answerPool.length < 4) throw new Error(`Not enough ${mode} entries are available for practice.`);
  const entry = shuffled(eligible, seed, 0, 11)[round % eligible.length]!;
  const correct = answer(entry)!;
  const distractors = shuffled(
    answerPool.filter((value) => value !== correct),
    seed,
    round,
    23,
  ).slice(0, 3);
  return { entry, correct, choices: shuffled([correct, ...distractors], seed, round, 37) };
}

export function buildListeningQuestion(catalog: Catalog, seed: number, round: number): ListeningQuestion {
  const candidatesByRef = new Map(catalog.entries.flatMap((entry) => {
    const parsed = parseWordKey(entry.representativeKey);
    return parsed ? [[parsed.ref, { ref: parsed.ref, surah: catalog.surahs[parsed.surah - 1]! }] as const] : [];
  }));
  const candidates = [...candidatesByRef.values()];
  if (!candidates.length) throw new Error('No listening passages are available.');
  const target = shuffled(candidates, seed, 0, 41)[round % candidates.length]!;
  const distractors = shuffled(
    catalog.surahs.filter((surah) => surah.number !== target.surah.number),
    seed,
    round,
    53,
  ).slice(0, 3);
  return { ...target, choices: shuffled([target.surah, ...distractors], seed, round, 67) };
}

export function nextRoundHref(mode: PracticeMode, seed: number, round: number) {
  return `/practice?mode=${mode}&seed=${seed}&round=${round + 1}`;
}
