import type {Ayah} from '@/lib/content/schema';
import {parseRef} from '@/lib/content/refs';
import type {Bookmark, DataSnapshot, Note} from '@/lib/data/schema';
import type {Assessment, PassageRange} from './passage-learning';
import {passageLearning} from './passage-learning';
import {reflectionReference} from './reflection-id';

export type StudyThreadSignals = {
  bookmarked: boolean;
  reflected: boolean;
  needsRevisit: boolean;
  needsRevisitCount: number;
};

export type StudyThread = {
  kind: 'ayah' | 'passage';
  ref: string;
  range?: PassageRange;
  bookmark?: Bookmark;
  reflection?: Note;
  assessments: Assessment[];
  signals: StudyThreadSignals;
  lastActivityAt?: string;
  reflectionExcerpt?: string;
  /** False when the reference is not in the current content version. */
  available: boolean;
  /** Ayah threads only: also inside the single saved passage range. */
  inSavedPassage: boolean;
};

export type StudyThreadDetail = StudyThread & {
  entryIds: string[];
  /** Global signal from meta.priorityEntries, not proof for this thread. */
  prepared: boolean;
  practisedAt: string | null;
};

const excerptLength = 160;

export function reflectionExcerpt(text: string): string {
  const compact = text.replace(/\s+/g, ' ').trim();
  return compact.length > excerptLength ? `${compact.slice(0, excerptLength - 1).trimEnd()}…` : compact;
}

export function referenceInRange(reference: string, range: PassageRange): boolean {
  const target = parseRef(reference);
  const start = parseRef(range.reference);
  return !!target && !!start && target.surah === start.surah && target.ayah >= start.ayah && target.ayah <= range.end;
}

/** The canonical refs covered by a saved range, bounded by the range schema. */
export function passageRefs(range: PassageRange): string[] {
  const start = parseRef(range.reference);
  if (!start) return [];
  return Array.from({length: Math.max(0, range.end - start.ayah + 1)}, (_, index) => `${start.surah}:${start.ayah + index}`);
}

export function studyThreadKey(thread: Pick<StudyThread, 'kind' | 'ref' | 'range'>): string {
  return thread.kind === 'passage' ? `passage:${thread.ref}:${thread.range?.end ?? ''}` : `ayah:${thread.ref}`;
}

function bump(thread: StudyThread, timestamp: string | undefined) {
  if (timestamp && (!thread.lastActivityAt || timestamp > thread.lastActivityAt)) thread.lastActivityAt = timestamp;
}

function referenceOrder(reference: string): string {
  const parsed = parseRef(reference);
  return parsed ? `${String(parsed.surah).padStart(3, '0')}:${String(parsed.ayah).padStart(3, '0')}` : reference;
}

function compareThreads(left: StudyThread, right: StudyThread): number {
  if (left.lastActivityAt && right.lastActivityAt && left.lastActivityAt !== right.lastActivityAt) {
    return right.lastActivityAt.localeCompare(left.lastActivityAt);
  }
  if (!!left.lastActivityAt !== !!right.lastActivityAt) return left.lastActivityAt ? -1 : 1;
  const byReference = referenceOrder(left.ref).localeCompare(referenceOrder(right.ref));
  if (byReference) return byReference;
  if (left.kind !== right.kind) return left.kind === 'passage' ? -1 : 1;
  return (left.range?.end ?? 0) - (right.range?.end ?? 0);
}

/**
 * Derive one list row per saved ayah plus one row for the saved passage.
 *
 * Pure: it reads only the snapshot and never fetches content, writes, or reads
 * a clock. Vocabulary notes in the shared `notes` store are excluded by the
 * strict reflection-id parser.
 */
export function buildStudyThreads(snapshot: DataSnapshot): StudyThread[] {
  const threads = new Map<string, StudyThread>();
  const ensure = (kind: StudyThread['kind'], reference: string) => {
    const key = kind === 'passage' ? `passage:${reference}` : `ayah:${reference}`;
    let thread = threads.get(key);
    if (!thread) {
      thread = {
        kind,
        ref: reference,
        assessments: [],
        signals: {bookmarked: false, reflected: false, needsRevisit: false, needsRevisitCount: 0},
        available: !!parseRef(reference),
        inSavedPassage: false,
      };
      threads.set(key, thread);
    }
    return thread;
  };

  for (const bookmark of snapshot.bookmarks) {
    const thread = ensure('ayah', bookmark.id);
    thread.bookmark = bookmark;
    bump(thread, bookmark.createdAt);
  }

  for (const note of snapshot.notes) {
    const reference = reflectionReference(note.id);
    if (!reference || !note.text.trim()) continue;
    const thread = ensure('ayah', reference);
    thread.reflection = note;
    thread.reflectionExcerpt = reflectionExcerpt(note.text);
    bump(thread, note.updatedAt);
  }

  const learning = passageLearning(snapshot.meta.passageLearning);
  const range = learning.range;
  for (const assessment of learning.assessments) {
    // Assessments inside the saved range belong to the passage row. Only an
    // ayah that was separately bookmarked or reflected gets its own row.
    if (range && referenceInRange(assessment.reference, range)) {
      const existing = threads.get(`ayah:${assessment.reference}`);
      if (!existing) continue;
      existing.assessments.push(assessment);
      bump(existing, assessment.updatedAt);
      continue;
    }
    const thread = ensure('ayah', assessment.reference);
    thread.assessments.push(assessment);
    bump(thread, assessment.updatedAt);
  }

  if (range) {
    const thread = ensure('passage', range.reference);
    thread.range = range;
    thread.available = !!parseRef(range.reference) && !!parseRef(`${parseRef(range.reference)!.surah}:${range.end}`);
    thread.assessments = learning.assessments.filter(assessment => referenceInRange(assessment.reference, range));
    thread.assessments.forEach(assessment => bump(thread, assessment.updatedAt));
  }

  for (const thread of threads.values()) {
    if (thread.kind === 'ayah' && range) thread.inSavedPassage = referenceInRange(thread.ref, range);
    const revisit = thread.assessments.filter(assessment => assessment.assessment !== 'Understood');
    thread.signals = {
      bookmarked: !!thread.bookmark,
      reflected: !!thread.reflection,
      needsRevisit: revisit.length > 0,
      needsRevisitCount: revisit.length,
    };
  }

  return [...threads.values()].sort(compareThreads);
}

/** Entry-level signals require ayah content, so they stay out of the list model. */
export function buildStudyThreadDetail(
  thread: StudyThread,
  ayahs: readonly Ayah[],
  snapshot: DataSnapshot,
): StudyThreadDetail {
  const entryIds: string[] = [];
  const seen = new Set<string>();
  for (const ayah of ayahs) {
    for (const token of ayah.tokens) {
      if (token.kind !== 'word' || !token.entryId || seen.has(token.entryId)) continue;
      seen.add(token.entryId);
      entryIds.push(token.entryId);
    }
  }

  const priority = Array.isArray(snapshot.meta.priorityEntries)
    ? new Set(snapshot.meta.priorityEntries.filter((value): value is string => typeof value === 'string'))
    : new Set<string>();
  const relevant = new Set(entryIds);
  let practisedAt: string | null = null;
  for (const review of snapshot.reviews) {
    if (review.undone || review.after.collection !== 'vocabulary' || !relevant.has(review.after.entryId)) continue;
    if (!practisedAt || review.timestamp > practisedAt) practisedAt = review.timestamp;
  }

  return {
    ...thread,
    entryIds,
    prepared: entryIds.some(id => priority.has(id)),
    practisedAt,
  };
}
