// Schema version — bump when data shape changes to avoid stale data
export const SCHEMA_VERSION = 'v1';

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
  MUTASHABIHAT_PROGRESS: `harf:${SCHEMA_VERSION}:mutashabihat_progress`,
  MUTASHABIHAT_PAIR_PROGRESS: `harf:${SCHEMA_VERSION}:mutashabihat_pair_progress`,
  STUDY_SESSIONS: `harf:${SCHEMA_VERSION}:study_sessions`,
  DAILY_AYAH: `harf:${SCHEMA_VERSION}:daily_ayah`,
  LAST_VERSE: `harf:${SCHEMA_VERSION}:last_verse`,
} as const;

export interface WordProgress {
  id: WordId;
  mastery: number;          // 0–5 display level (derived from FSRS state + stability)
  stability: number;        // FSRS S — days until retrieval probability < 90 %
  difficulty: number;       // FSRS D — intrinsic card difficulty (1–10)
  state: 0 | 1 | 2 | 3;   // FSRS State: New=0 | Learning=1 | Review=2 | Relearning=3
  lapses: number;           // times forgotten after graduating to Review
  reps: number;             // total reviews
  nextReview: string;       // ISO date string (YYYY-MM-DD)
  lastReviewed?: string;    // ISO timestamp
  suspended?: boolean;      // leech flag
  mnemonic?: string;        // personal memory hint
}

export interface NameProgress {
  id: number;
  mastery: number;
  stability: number;
  difficulty: number;
  state: 0 | 1 | 2 | 3;
  lapses: number;
  reps: number;
  nextReview: string;
  lastReviewed?: string;
}

export interface MutashabihatProgress {
  id: string;           // phrase ID (string key from phrases.json)
  mastery: number;      // 0–5
  stability: number;
  difficulty: number;
  state: 0 | 1 | 2 | 3;
  lapses: number;
  reps: number;
  nextReview: string;   // ISO date string
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
    const all: Record<string, WordProgress> = raw ? JSON.parse(raw) : {};
    // One-time migration: SM-2 records have `interval`/`efactor` but no `stability`
    let migrated = false;
    for (const [id, p] of Object.entries(all)) {
      if (!('stability' in p)) {
        const sm2 = p as unknown as { id: string; mastery: number; interval: number; repetition: number; efactor: number; nextReview: string; lastReviewed?: string };
        all[id] = {
          id: sm2.id as WordId,
          mastery: sm2.mastery ?? 0,
          stability: Math.max(1, sm2.interval ?? 1),
          difficulty: 5.0,
          state: sm2.repetition >= 2 ? 2 : sm2.repetition > 0 ? 1 : 0,
          lapses: 0,
          reps: sm2.repetition ?? 0,
          nextReview: sm2.nextReview,
          lastReviewed: sm2.lastReviewed,
        };
        migrated = true;
      }
    }
    if (migrated) {
      localStorage.setItem(KEYS.WORD_PROGRESS, JSON.stringify(all));
    }
    return all;
  } catch (err) {
    if (process.env.NODE_ENV === 'development') console.error('[storage] word progress parse error:', err);
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
    const all: Record<number, NameProgress> = raw ? JSON.parse(raw) : {};
    let migrated = false;
    for (const [id, p] of Object.entries(all)) {
      if (!('stability' in p)) {
        const sm2 = p as unknown as { id: number; mastery: number; interval: number; repetition: number; efactor: number; nextReview: string; lastReviewed?: string };
        all[Number(id)] = {
          id: sm2.id,
          mastery: sm2.mastery ?? 0,
          stability: Math.max(1, sm2.interval ?? 1),
          difficulty: 5.0,
          state: sm2.repetition >= 2 ? 2 : sm2.repetition > 0 ? 1 : 0,
          lapses: 0,
          reps: sm2.repetition ?? 0,
          nextReview: sm2.nextReview,
          lastReviewed: sm2.lastReviewed,
        };
        migrated = true;
      }
    }
    if (migrated) {
      localStorage.setItem(KEYS.NAME_PROGRESS, JSON.stringify(all));
    }
    return all;
  } catch (err) {
    if (process.env.NODE_ENV === 'development') console.error('[storage] name progress parse error:', err);
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

// ── Mutashabihat Progress ──────────────────────────────────────

export function getAllMutashabihatProgress(): Record<string, MutashabihatProgress> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(KEYS.MUTASHABIHAT_PROGRESS);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function getMutashabihatProgress(id: string): MutashabihatProgress | null {
  return getAllMutashabihatProgress()[id] ?? null;
}

export function setMutashabihatProgress(progress: MutashabihatProgress): void {
  if (typeof window === 'undefined') return;
  const all = getAllMutashabihatProgress();
  all[progress.id] = progress;
  localStorage.setItem(KEYS.MUTASHABIHAT_PROGRESS, JSON.stringify(all));
}

export function getDueMutashabihatIds(): string[] {
  const all = getAllMutashabihatProgress();
  const today = new Date().toISOString().slice(0, 10);
  return Object.values(all)
    .filter(p => p.nextReview <= today)
    .map(p => p.id);
}

// ── Mutashabihat Pair Progress ─────────────────────────────────

export function getAllPairProgress(): Record<string, MutashabihatProgress> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(KEYS.MUTASHABIHAT_PAIR_PROGRESS);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

export function getPairProgress(id: string): MutashabihatProgress | null {
  return getAllPairProgress()[id] ?? null;
}

export function setPairProgress(progress: MutashabihatProgress): void {
  if (typeof window === 'undefined') return;
  const all = getAllPairProgress();
  all[progress.id] = progress;
  localStorage.setItem(KEYS.MUTASHABIHAT_PAIR_PROGRESS, JSON.stringify(all));
}

export function getDuePairIds(): string[] {
  const all = getAllPairProgress();
  const today = new Date().toISOString().slice(0, 10);
  return Object.values(all).filter(p => p.nextReview <= today).map(p => p.id);
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

// ── Last Visited Verse ─────────────────────────────────────────

export function setLastVerse(surah: number, ayah: number): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEYS.LAST_VERSE, JSON.stringify({ surah, ayah }));
}

export function getLastVerse(): { surah: number; ayah: number } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(KEYS.LAST_VERSE);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
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

/** Find "Leech" words (forgot 8+ times after graduating to Review) */
export function getLeechIds(): string[] {
  const all = getAllWordProgress();
  return Object.values(all)
    .filter(p => p.lapses >= 8 && !p.suspended)
    .map(p => p.id);
}

// ── Export / Import ────────────────────────────────────────────

export interface HarfBackup {
  version: string;
  exportedAt: string;
  wordProgress: Record<string, WordProgress>;
  nameProgress: Record<number, NameProgress>;
  studySessions: StudySession[];
  location: { city: string; country: string } | null;
  reciter: string | null;
}

/** Download all user data as a JSON backup file */
export function exportAllData(): void {
  if (typeof window === 'undefined') return;
  const backup: HarfBackup = {
    version: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    wordProgress: getAllWordProgress(),
    nameProgress: getAllNameProgress(),
    studySessions: getStudySessions(),
    location: (() => {
      try { return JSON.parse(localStorage.getItem('harf-location') ?? 'null'); } catch { return null; }
    })(),
    reciter: localStorage.getItem('harf-reciter'),
  };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `harf-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Restore all user data from a JSON backup string. Returns success status and message. */
export function importAllData(raw: string): { ok: boolean; message: string } {
  if (typeof window === 'undefined') return { ok: false, message: 'Not available server-side.' };
  try {
    const data: Partial<HarfBackup> = JSON.parse(raw);
    if (!data || typeof data !== 'object') return { ok: false, message: 'Invalid file format.' };

    if (data.version && data.version !== SCHEMA_VERSION) {
      return { ok: false, message: `Backup version ${data.version} does not match app schema ${SCHEMA_VERSION}.` };
    }

    if (data.wordProgress && typeof data.wordProgress === 'object') {
      localStorage.setItem(KEYS.WORD_PROGRESS, JSON.stringify(data.wordProgress));
    }
    if (data.nameProgress && typeof data.nameProgress === 'object') {
      localStorage.setItem(KEYS.NAME_PROGRESS, JSON.stringify(data.nameProgress));
    }
    if (Array.isArray(data.studySessions)) {
      localStorage.setItem(KEYS.STUDY_SESSIONS, JSON.stringify(data.studySessions));
    }
    if (data.location && typeof data.location === 'object') {
      localStorage.setItem('harf-location', JSON.stringify(data.location));
    }
    if (typeof data.reciter === 'string') {
      localStorage.setItem('harf-reciter', data.reciter);
    }

    const wordCount = Object.keys(data.wordProgress ?? {}).length;
    const sessionCount = (data.studySessions ?? []).length;
    return { ok: true, message: `Restored: ${wordCount} words · ${sessionCount} sessions.` };
  } catch {
    return { ok: false, message: 'Failed to read backup file.' };
  }
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
