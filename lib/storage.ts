// Schema version — bump when data shape changes to avoid stale data
const SCHEMA_VERSION = 'v1';

// ── Branded types — prevent mix-ups between word IDs and name IDs ──
declare const __brand: unique symbol;
type Brand<T, B> = T & { [__brand]: B };

/** Opaque string that only comes from the words dataset */
export type WordId = Brand<string, 'WordId'>;

/** Opaque number that only comes from the 99-names dataset */
export type NameId = Brand<number, 'NameId'>;

/** Safe cast — use at data-boundary only (JSON parsing, route params) */
export function toWordId(raw: string): WordId { return raw as WordId; }
export function toNameId(raw: number): NameId { return raw as NameId; }

// localStorage keys
const KEYS = {
  WORD_PROGRESS: `harf:${SCHEMA_VERSION}:word_progress`,
  NAME_PROGRESS: `harf:${SCHEMA_VERSION}:name_progress`,
  STUDY_SESSIONS: `harf:${SCHEMA_VERSION}:study_sessions`,
  DAILY_AYAH: `harf:${SCHEMA_VERSION}:daily_ayah`,
} as const;

export interface WordProgress {
  id: WordId;
  mastery: number;          // 0–5
  interval: number;         // SM-2 interval in days
  repetition: number;       // SM-2 repetition count
  efactor: number;          // SM-2 ease factor
  nextReview: string;       // ISO date string
  lastReviewed?: string;    // ISO date string
}

export interface NameProgress {
  id: number;
  mastery: number;
  interval: number;
  repetition: number;
  efactor: number;
  nextReview: string;
  lastReviewed?: string;
}

export interface StudySession {
  date: string;
  wordsReviewed: number;
  coverageBefore: number;
  coverageAfter: number;
}

export interface DailyAyahCache {
  date: string;
  surah: number;
  ayah: number;
  arabic: string;
  english: string;
  surahName: string;
}

// ── Word Progress ──────────────────────────────────────────────

export function getAllWordProgress(): Record<string, WordProgress> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(KEYS.WORD_PROGRESS);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function getWordProgress(id: WordId): WordProgress | null {
  return getAllWordProgress()[id] ?? null;
}

export function setWordProgress(progress: WordProgress): void {
  if (typeof window === 'undefined') return;
  const all = getAllWordProgress();
  all[progress.id] = progress;
  localStorage.setItem(KEYS.WORD_PROGRESS, JSON.stringify(all));
}

// ── Name Progress ──────────────────────────────────────────────

export function getAllNameProgress(): Record<number, NameProgress> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(KEYS.NAME_PROGRESS);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function getNameProgress(id: number): NameProgress | null {
  return getAllNameProgress()[id] ?? null;
}

export function setNameProgress(progress: NameProgress): void {
  if (typeof window === 'undefined') return;
  const all = getAllNameProgress();
  all[progress.id] = progress;
  localStorage.setItem(KEYS.NAME_PROGRESS, JSON.stringify(all));
}

// ── Study Sessions ─────────────────────────────────────────────

export function getStudySessions(): StudySession[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEYS.STUDY_SESSIONS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addStudySession(session: StudySession): void {
  if (typeof window === 'undefined') return;
  const sessions = getStudySessions();
  sessions.push(session);
  // Keep last 90 sessions
  const trimmed = sessions.slice(-90);
  localStorage.setItem(KEYS.STUDY_SESSIONS, JSON.stringify(trimmed));
}

// ── Daily Ayah Cache ───────────────────────────────────────────

export function getDailyAyahCache(): DailyAyahCache | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(KEYS.DAILY_AYAH);
    if (!raw) return null;
    const cached: DailyAyahCache = JSON.parse(raw);
    const today = new Date().toISOString().slice(0, 10);
    return cached.date === today ? cached : null;
  } catch {
    return null;
  }
}

export function setDailyAyahCache(data: DailyAyahCache): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEYS.DAILY_AYAH, JSON.stringify(data));
}

// ── Derived helpers ────────────────────────────────────────────

/** Words due for review today or overdue */
export function getDueWordIds(): string[] {
  const all = getAllWordProgress();
  const today = new Date().toISOString().slice(0, 10);
  return Object.values(all)
    .filter(p => p.nextReview <= today)
    .map(p => p.id);
}

/** Get review counts for the next N days */
export function getFutureReviews(days: number): Record<string, number> {
  const all = getAllWordProgress();
  const projection: Record<string, number> = {};
  const today = new Date();

  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().slice(0, 10);
    projection[dateStr] = Object.values(all).filter(p => p.nextReview === dateStr).length;
  }

  return projection;
}

/** Calculate current study streak */
export function getStreak(): number {
  const sessions = getStudySessions();
  if (sessions.length === 0) return 0;

  const dates = sessions.map(s => s.date).sort().reverse();
  const uniqueDates = Array.from(new Set(dates));

  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  if (uniqueDates[0] !== today && uniqueDates[0] !== yesterday) return 0;

  let streak = 0;
  let current = new Date(uniqueDates[0]!);

  for (const dateStr of uniqueDates) {
    const d = new Date(dateStr);
    if (d.toISOString().slice(0, 10) === current.toISOString().slice(0, 10)) {
      streak++;
      current.setDate(current.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

/** Find "Leech" words (high repetition, low mastery) */
export function getLeechIds(): string[] {
  const all = getAllWordProgress();
  return Object.values(all)
    .filter(p => p.repetition > 5 && p.mastery < 3)
    .map(p => p.id);
}

/** Count of words at each mastery level */
export function getMasteryDistribution(): Record<number, number> {
  const all = getAllWordProgress();
  const dist: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const p of Object.values(all)) {
    dist[p.mastery] = (dist[p.mastery] ?? 0) + 1;
  }
  return dist;
}

/** Total words with mastery >= threshold */
export function getMasteredCount(threshold = 4): number {
  const all = getAllWordProgress();
  return Object.values(all).filter(p => p.mastery >= threshold).length;
}
