import { createEmptyCard, fsrs, generatorParameters, Rating, State } from 'ts-fsrs';
import type { WordProgress, NameProgress } from './storage';
import { setWordProgress, setNameProgress, getWordProgress, getNameProgress, getAllWordProgress, toWordId } from './storage';

export type { Rating };

/** 0–5 mastery level as a nominal union — prevents accidental widening to number */
export type Mastery = 0 | 1 | 2 | 3 | 4 | 5;

/** Map our 4-button UI to FSRS Rating values */
export const RESPONSE_TO_GRADE = {
  blackout: Rating.Again,  // 1 — complete blackout
  hard:     Rating.Hard,   // 2 — vague recall
  good:     Rating.Good,   // 3 — got it with effort
  perfect:  Rating.Easy,   // 4 — immediate perfect recall
} as const satisfies Record<string, Rating>;

export type ResponseKey = keyof typeof RESPONSE_TO_GRADE;

type StudyButton = {
  readonly key: ResponseKey;
  readonly label: string;
  readonly color: string;
  readonly bg: string;
};

/** Our 4-button labels mapped to grade keys */
export const STUDY_BUTTONS = [
  { key: 'blackout', label: "Don't Know",  color: 'text-red-400',    bg: 'bg-red-950/60'    },
  { key: 'hard',     label: 'Vague',       color: 'text-orange-400', bg: 'bg-orange-950/60' },
  { key: 'good',     label: 'Got It',      color: 'text-blue-400',   bg: 'bg-blue-950/60'   },
  { key: 'perfect',  label: 'Perfect',     color: 'text-gold',       bg: 'bg-yellow-950/60' },
] as const satisfies readonly StudyButton[];

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

// FSRS scheduler — deterministic output, no fuzz for reproducibility
const f = fsrs(generatorParameters({ enable_fuzz: false }));

/**
 * Derive a 0–5 mastery level from the resulting FSRS state + stability.
 *
 * State progression:
 *   New(0) → Learning(1) → Review(2)
 *                ↑              ↓ (lapse)
 *            Relearning(3) ────┘
 *
 * Mastery scale:
 *   0 = never reviewed
 *   1 = in Learning (first seen)
 *   2 = graduated to Review, stability < 7 days
 *   3 = Review, 7–21 days stability (Familiar)
 *   4 = Review, 21–90 days stability (Confident)
 *   5 = Review, ≥90 days stability (Mastered)
 */
function deriveMastery(
  newState: number,
  stability: number,
  prevMastery: Mastery,
  isFirstReview: boolean,
): Mastery {
  if (newState === State.Learning) {
    // Active learning phase: first review always floors at 1
    return isFirstReview ? 1 : Math.max(1, prevMastery) as Mastery;
  }
  if (newState === State.Relearning) {
    // Forgot a graduated card: drop mastery by 1, floor at 1 (they did know it)
    return Math.max(1, prevMastery - 1) as Mastery;
  }
  if (newState === State.Review) {
    // Graduated: mastery is determined purely by stability
    if (stability < 7)  return 2;
    if (stability < 21) return 3;
    if (stability < 90) return 4;
    return 5;
  }
  // State.New — shouldn't occur post-review
  return isFirstReview ? 1 : 0;
}

/** Format a FSRS due Date to YYYY-MM-DD, guaranteeing at least tomorrow */
function toNextReview(due: Date): string {
  const today = new Date().toISOString().slice(0, 10);
  const dueStr = due.toISOString().slice(0, 10);
  return dueStr > today ? dueStr : new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
}

/** Reconstruct a ts-fsrs Card object from stored progress */
function buildCard(progress: WordProgress | NameProgress) {
  return {
    due:            new Date(progress.nextReview),
    stability:      progress.stability,
    difficulty:     progress.difficulty,
    elapsed_days:   progress.lastReviewed
      ? Math.max(0, Math.floor(
          (Date.now() - new Date(progress.lastReviewed).getTime()) / 86_400_000
        ))
      : 0,
    scheduled_days: Math.max(1, Math.round(progress.stability)),
    reps:           progress.reps,
    lapses:         progress.lapses,
    learning_steps: 0,
    state:          progress.state as State,
    last_review:    progress.lastReviewed ? new Date(progress.lastReviewed) : undefined,
  };
}

// ── Word SRS ───────────────────────────────────────────────────

export function reviewWord(wordId: string, rating: Rating): WordProgress {
  const wid = toWordId(wordId);
  const existing = getWordProgress(wid);
  const now = new Date();

  const card = existing ? buildCard(existing) : createEmptyCard();
  const prevMastery: Mastery = (existing?.mastery ?? 0) as Mastery;
  const isFirstReview = !existing;

  const scheduling = f.repeat(card, now);
  const { card: next } = scheduling[rating as 1 | 2 | 3 | 4];

  const updated: WordProgress = {
    id:           wid,
    mastery:      deriveMastery(next.state, next.stability, prevMastery, isFirstReview),
    stability:    next.stability,
    difficulty:   next.difficulty,
    state:        next.state as 0 | 1 | 2 | 3,
    lapses:       next.lapses,
    reps:         next.reps,
    nextReview:   toNextReview(next.due),
    lastReviewed: now.toISOString(),
    // Preserve optional fields that FSRS doesn't manage
    ...(existing?.suspended !== undefined && { suspended: existing.suspended }),
    ...(existing?.mnemonic   !== undefined && { mnemonic:  existing.mnemonic  }),
  };

  setWordProgress(updated);
  return updated;
}

// ── Name SRS ───────────────────────────────────────────────────

export function reviewName(nameId: number, rating: Rating): NameProgress {
  const existing = getNameProgress(nameId);
  const now = new Date();

  const card = existing ? buildCard(existing) : createEmptyCard();
  const prevMastery: Mastery = (existing?.mastery ?? 0) as Mastery;
  const isFirstReview = !existing;

  const scheduling = f.repeat(card, now);
  const { card: next } = scheduling[rating as 1 | 2 | 3 | 4];

  const updated: NameProgress = {
    id:           nameId,
    mastery:      deriveMastery(next.state, next.stability, prevMastery, isFirstReview),
    stability:    next.stability,
    difficulty:   next.difficulty,
    state:        next.state as 0 | 1 | 2 | 3,
    lapses:       next.lapses,
    reps:         next.reps,
    nextReview:   toNextReview(next.due),
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

/** Build a session queue: due reviews + some new words, interleaved 2:1 */
export function buildSessionQueue(
  allWordIds: string[],
  dueIds: string[],
  newWordCount = 10,
): string[] {
  const newWords = getNewWords(allWordIds, newWordCount);
  const queue: string[] = [];
  let di = 0, ni = 0;
  while (di < dueIds.length || ni < newWords.length) {
    const d1 = dueIds[di]; if (d1 !== undefined) { queue.push(d1); di++; }
    const d2 = dueIds[di]; if (d2 !== undefined) { queue.push(d2); di++; }
    const n1 = newWords[ni]; if (n1 !== undefined) { queue.push(n1); ni++; }
  }
  return queue;
}
