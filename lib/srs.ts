import { supermemo, SuperMemoItem, SuperMemoGrade } from 'supermemo';
import type { WordProgress, NameProgress } from './storage';
import { setWordProgress, setNameProgress, getWordProgress, getNameProgress, getAllWordProgress } from './storage';

export type { SuperMemoGrade };

/** Map our 4-button UI to SM-2 quality scores */
export const RESPONSE_TO_GRADE = {
  blackout:  0,  // Complete blackout
  wrong:     1,  // Wrong but remembered on seeing answer
  hard:      2,  // Correct with serious difficulty
  good:      3,  // Correct with hesitation
  easy:      4,  // Correct after brief thought
  perfect:   5,  // Perfect recall
} as const satisfies Record<string, SuperMemoGrade>;

export type ResponseKey = keyof typeof RESPONSE_TO_GRADE;

/** Our 4-button labels mapped to grade keys */
export const STUDY_BUTTONS = [
  { key: 'blackout' as ResponseKey, label: "Don't Know",  grade: 0, color: 'text-red-400',    bg: 'bg-red-950/60'    },
  { key: 'hard'     as ResponseKey, label: 'Vague',       grade: 2, color: 'text-orange-400', bg: 'bg-orange-950/60' },
  { key: 'good'     as ResponseKey, label: 'Got It',      grade: 4, color: 'text-blue-400',   bg: 'bg-blue-950/60'   },
  { key: 'perfect'  as ResponseKey, label: 'Perfect',     grade: 5, color: 'text-gold',       bg: 'bg-yellow-950/60' },
] as const;

export const MASTERY_LABELS = [
  'Unknown',    // 0
  'Seen',       // 1
  'Learning',   // 2
  'Familiar',   // 3
  'Confident',  // 4
  'Mastered',   // 5
] as const;

export const MASTERY_COLORS = [
  'bg-zinc-700',   // 0 Unknown
  'bg-zinc-500',   // 1 Seen
  'bg-orange-600', // 2 Learning
  'bg-yellow-600', // 3 Familiar
  'bg-blue-500',   // 4 Confident
  'bg-gold',       // 5 Mastered
] as const;

function gradeToMastery(grade: SuperMemoGrade, currentMastery: number): number {
  if (grade === 0 || grade === 1) return Math.max(0, currentMastery - 1);
  if (grade === 2) return Math.max(1, currentMastery);
  if (grade === 3) return Math.min(5, Math.max(2, currentMastery));
  if (grade === 4) return Math.min(5, currentMastery + 1);
  if (grade === 5) return Math.min(5, currentMastery + 1);
  return currentMastery;
}

function addDays(date: Date, days: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + Math.max(1, Math.round(days)));
  return d.toISOString().slice(0, 10);
}

// ── Word SRS ───────────────────────────────────────────────────

export function reviewWord(wordId: string, grade: SuperMemoGrade): WordProgress {
  const existing = getWordProgress(wordId);
  const now = new Date();

  let item: SuperMemoItem;
  let currentMastery = 0;

  if (existing) {
    item = { interval: existing.interval, repetition: existing.repetition, efactor: existing.efactor };
    currentMastery = existing.mastery;
  } else {
    item = { interval: 0, repetition: 0, efactor: 2.5 };
    currentMastery = 0;
  }

  const result = supermemo(item, grade);
  const newMastery = gradeToMastery(grade, currentMastery);

  // First time seeing it: mastery goes to at least 1
  const finalMastery = existing ? newMastery : Math.max(1, newMastery);

  const updated: WordProgress = {
    id: wordId,
    mastery: finalMastery,
    interval: result.interval,
    repetition: result.repetition,
    efactor: result.efactor,
    nextReview: addDays(now, result.interval),
    lastReviewed: now.toISOString(),
  };

  setWordProgress(updated);
  return updated;
}

// ── Name SRS ───────────────────────────────────────────────────

export function reviewName(nameId: number, grade: SuperMemoGrade): NameProgress {
  const existing = getNameProgress(nameId);
  const now = new Date();

  let item: SuperMemoItem;
  let currentMastery = 0;

  if (existing) {
    item = { interval: existing.interval, repetition: existing.repetition, efactor: existing.efactor };
    currentMastery = existing.mastery;
  } else {
    item = { interval: 0, repetition: 0, efactor: 2.5 };
  }

  const result = supermemo(item, grade);
  const newMastery = gradeToMastery(grade, currentMastery);
  const finalMastery = existing ? newMastery : Math.max(1, newMastery);

  const updated: NameProgress = {
    id: nameId,
    mastery: finalMastery,
    interval: result.interval,
    repetition: result.repetition,
    efactor: result.efactor,
    nextReview: addDays(now, result.interval),
    lastReviewed: now.toISOString(),
  };

  setNameProgress(updated);
  return updated;
}

// ── Study Queue ────────────────────────────────────────────────

/** Get new words not yet studied (up to limit) */
export function getNewWords(allWordIds: string[], limit: number): string[] {
  const progress = getAllWordProgress();
  return allWordIds.filter(id => !progress[id]).slice(0, limit);
}

/** Build a session queue: due reviews + some new words */
export function buildSessionQueue(
  allWordIds: string[],
  dueIds: string[],
  newWordCount = 10,
): string[] {
  const newWords = getNewWords(allWordIds, newWordCount);
  // Interleave: 2 reviews, 1 new, etc.
  const queue: string[] = [];
  let di = 0, ni = 0;
  while (di < dueIds.length || ni < newWords.length) {
    const d1 = dueIds[di]; if (d1 !== undefined) { queue.push(d1); di++; }
    const d2 = dueIds[di]; if (d2 !== undefined) { queue.push(d2); di++; }
    const n1 = newWords[ni]; if (n1 !== undefined) { queue.push(n1); ni++; }
  }
  return queue;
}
