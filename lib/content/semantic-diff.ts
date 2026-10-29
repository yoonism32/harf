import metadata from '../../data/quran-surah-meta.json';
import type {Ayah, Catalog, Overlap, TranslationNote, VocabularyEntry} from './schema';

export type SemanticApproval = VocabularyEntry['approval'];
export type SemanticEntry = {
  id: string;
  lemma: string;
  root: string | null;
  arabic: string;
  gloss: string;
  representativeKey: string;
  exampleKeys: string[];
  occurrenceCount: number;
  occurrenceKeys: string[];
  sourceIds: string[];
  approval: SemanticApproval;
};
export type SemanticNote = {
  id: string;
  text: string;
  ref: TranslationNote['ref'];
};
export type SemanticAyah = {
  ref: string;
  translation: string;
  translationSource: string;
  notes: SemanticNote[];
};
export type SemanticSnapshot = {
  contentVersion: string;
  approvalCounts: {approved: number; pending: number};
  entries: SemanticEntry[];
  ayahs: SemanticAyah[];
};
export type SemanticBaseline = SemanticSnapshot & {
  schemaVersion: 1;
  kind: 'harf-semantic-baseline';
  digest: string;
};

export type SemanticChangeKind = 'added' | 'removed' | 'rekeyed' | 'changed';
export type SemanticField =
  | 'arabic'
  | 'lemma'
  | 'root'
  | 'representativeExample'
  | 'examples'
  | 'gloss'
  | 'sourceIds'
  | 'occurrences'
  | 'approval'
  | 'translation'
  | 'footnote';
export type SemanticChange = {
  kind: SemanticChangeKind;
  scope: 'entry' | 'ayah';
  field?: SemanticField;
  entryId?: string;
  previousEntryId?: string;
  ref?: string;
  noteId?: string;
  before?: string;
  after?: string;
  citation: string;
};
export type SemanticDiffCounts = {
  added: number;
  removed: number;
  rekeyed: number;
  changed: number;
  total: number;
};
export type SemanticDiffStatus = 'ok' | 'missing-baseline' | 'invalid-baseline';
export type SemanticDiff = {
  schemaVersion: 1;
  kind: 'harf-semantic-diff';
  status: SemanticDiffStatus;
  message: string;
  baseline: {
    contentVersion: string;
    digest: string;
    approvedEntries: number;
    pendingEntries: number;
  } | null;
  current: {
    contentVersion: string;
    approvedEntries: number;
    pendingEntries: number;
  };
  counts: SemanticDiffCounts;
  changes: SemanticChange[];
};
const surahNames = new Map(metadata.map(surah => [surah.id, surah.name]));
const fieldOrder: SemanticField[] = [
  'arabic',
  'lemma',
  'root',
  'representativeExample',
  'examples',
  'gloss',
  'sourceIds',
  'occurrences',
  'approval',
  'translation',
  'footnote',
];
const kindOrder: Record<SemanticChangeKind, number> = {
  added: 0,
  removed: 1,
  rekeyed: 2,
  changed: 3,
};

function approvalCounts(entries: SemanticEntry[]): SemanticSnapshot['approvalCounts'] {
  const approved = entries.filter(entry => entry.approval.status === 'approved').length;
  return {approved, pending: entries.length - approved};
}

export function buildSemanticSnapshot({
  catalog,
  ayahs,
  overlap,
}: {
  catalog: Catalog;
  ayahs: Ayah[];
  overlap: Overlap;
}): SemanticSnapshot {
  const entries: SemanticEntry[] = catalog.entries.map(entry => ({
    id: entry.id,
    lemma: entry.lemma,
    root: entry.root,
    arabic: entry.arabic,
    gloss: entry.gloss,
    representativeKey: entry.representativeKey,
    exampleKeys: [...entry.exampleKeys],
    occurrenceCount: entry.occurrenceCount,
    occurrenceKeys: [...(overlap.entries[entry.id] ?? [])].sort(compareWordKeys),
    sourceIds: [...entry.sourceIds].sort(),
    approval: {...entry.approval},
  }));
  return {
    contentVersion: catalog.contentVersion,
    approvalCounts: approvalCounts(entries),
    entries,
    ayahs: ayahs.map(ayah => ({
      ref: ayah.ref,
      translation: ayah.translation,
      translationSource: ayah.translationSource,
      notes: ayah.notes.map((note, index) => ({
        id: note.id ?? `${ayah.ref}#note-${index + 1}`,
        text: note.text,
        ref: note.ref ? {...note.ref} : null,
      })),
    })),
  };
}

function compareWordKeys(a: string, b: string) {
  const aa = a.split(':').map(Number);
  const bb = b.split(':').map(Number);
  return (aa[0]! - bb[0]!) || (aa[1]! - bb[1]!) || (aa[2]! - bb[2]!);
}

function surahLabel(surah: number) {
  return surahNames.get(surah) ?? `Surah ${surah}`;
}

export function citationForRef(ref: string) {
  const [surah, ayah] = ref.split(':').map(Number);
  return `${surahLabel(surah!)} ${ref}`;
}

export function citationForWord(key: string) {
  const [surah, ayah, word] = key.split(':').map(Number);
  return `${surahLabel(surah!)} ${surah}:${ayah} word ${word}`;
}

function entryCitation(entry: SemanticEntry) {
  return `${citationForWord(entry.representativeKey)} · ${entry.lemma}`;
}

function entrySummary(entry: SemanticEntry) {
  return `${entry.lemma} · ${entry.arabic} · ${entry.gloss} · ${entry.id} (${citationForRef(
    entry.representativeKey.split(':').slice(0, 2).join(':'),
  )})`;
}

function approvalText(approval: SemanticApproval) {
  const parts: string[] = [approval.status];
  if (approval.reviewer) parts.push(approval.reviewer);
  if (approval.reviewedAt) parts.push(approval.reviewedAt);
  if (approval.evidence) parts.push(approval.evidence);
  return parts.join(' · ');
}

function entryFieldValue(entry: SemanticEntry, field: SemanticField) {
  switch (field) {
    case 'arabic':
      return entry.arabic;
    case 'lemma':
      return entry.lemma;
    case 'root':
      return entry.root ?? '';
    case 'representativeExample':
      return entry.representativeKey;
    case 'examples':
      return entry.exampleKeys.join(', ');
    case 'gloss':
      return entry.gloss;
    case 'sourceIds':
      return entry.sourceIds.join(', ');
    case 'occurrences':
      return entry.occurrenceKeys.join(', ');
    case 'approval':
      return approvalText(entry.approval);
    default:
      return '';
  }
}

function fieldCitation(entry: SemanticEntry, field: SemanticField) {
  if (field === 'representativeExample' || field === 'examples') {
    return `${citationForRef(entry.representativeKey.split(':').slice(0, 2).join(':'))} · ${entry.lemma}`;
  }
  if (field === 'occurrences') {
    return entryCitation(entry);
  }
  if (field === 'approval') {
    return `${entryCitation(entry)} · approval record`;
  }
  return entryCitation(entry);
}

function changedEntryFields(before: SemanticEntry, after: SemanticEntry): SemanticChange[] {
  const changes: SemanticChange[] = [];
  for (const field of fieldOrder) {
    if (field === 'translation' || field === 'footnote') continue;
    if (field === 'occurrences') {
      const beforeKeys = before.occurrenceKeys;
      const afterKeys = after.occurrenceKeys;
      if (beforeKeys.join('\u0000') === afterKeys.join('\u0000')) continue;
      const afterSet = new Set(afterKeys);
      const beforeSet = new Set(beforeKeys);
      const added = afterKeys.filter(key => !beforeSet.has(key));
      const removed = beforeKeys.filter(key => !afterSet.has(key));
      const anchor = added[0] ?? removed[0] ?? after.representativeKey;
      changes.push({
        kind: 'changed',
        scope: 'entry',
        field,
        entryId: after.id,
        before: beforeKeys.join(', '),
        after: afterKeys.join(', '),
        citation: citationForWord(anchor),
      });
      continue;
    }
    const beforeValue = entryFieldValue(before, field);
    const afterValue = entryFieldValue(after, field);
    if (beforeValue === afterValue) continue;
    changes.push({
      kind: 'changed',
      scope: 'entry',
      field,
      entryId: after.id,
      before: beforeValue,
      after: afterValue,
      citation: fieldCitation(after, field),
    });
  }
  return changes;
}

function rekeyCitation(entry: SemanticEntry) {
  return entryCitation(entry);
}

function sortChanges(changes: SemanticChange[]) {
  return changes
    .map((change, index) => ({change, index}))
    .sort((a, b) => {
      const kind = kindOrder[a.change.kind] - kindOrder[b.change.kind];
      if (kind) return kind;
      const scope = (a.change.scope === 'entry' ? 0 : 1) - (b.change.scope === 'entry' ? 0 : 1);
      if (scope) return scope;
      const left = a.change.entryId ?? a.change.ref ?? '';
      const right = b.change.entryId ?? b.change.ref ?? '';
      if (left !== right) return left.localeCompare(right);
      const field = fieldOrder.indexOf(a.change.field ?? 'arabic') - fieldOrder.indexOf(b.change.field ?? 'arabic');
      if (field) return field;
      return a.index - b.index;
    })
    .map(item => item.change);
}

function diffAyahs(baseline: SemanticAyah[], current: SemanticAyah[]): SemanticChange[] {
  const changes: SemanticChange[] = [];
  const beforeByRef = new Map(baseline.map(ayah => [ayah.ref, ayah]));
  const afterByRef = new Map(current.map(ayah => [ayah.ref, ayah]));
  const refs = [...new Set([...beforeByRef.keys(), ...afterByRef.keys()])].sort((a, b) =>
    compareWordKeys(`${a}:0`, `${b}:0`),
  );

  for (const ref of refs) {
    const before = beforeByRef.get(ref);
    const after = afterByRef.get(ref);
    const citation = citationForRef(ref);
    if (!before && after) {
      changes.push({
        kind: 'added',
        scope: 'ayah',
        ref,
        after: after.translation,
        citation,
      });
      continue;
    }
    if (before && !after) {
      changes.push({
        kind: 'removed',
        scope: 'ayah',
        ref,
        before: before.translation,
        citation,
      });
      continue;
    }
    if (!before || !after) continue;
    if (before.translation !== after.translation) {
      changes.push({
        kind: 'changed',
        scope: 'ayah',
        field: 'translation',
        ref,
        before: before.translation,
        after: after.translation,
        citation: `${citation} translation`,
      });
    }
    const beforeNotes = new Map(before.notes.map(note => [note.id, note]));
    const afterNotes = new Map(after.notes.map(note => [note.id, note]));
    for (const noteId of [...new Set([...beforeNotes.keys(), ...afterNotes.keys()])].sort()) {
      const beforeNote = beforeNotes.get(noteId);
      const afterNote = afterNotes.get(noteId);
      const noteCitation = `${citation} footnote ${noteId}`;
      if (!beforeNote && afterNote) {
        changes.push({
          kind: 'added',
          scope: 'ayah',
          field: 'footnote',
          ref,
          noteId,
          after: afterNote.text,
          citation: noteCitation,
        });
      } else if (beforeNote && !afterNote) {
        changes.push({
          kind: 'removed',
          scope: 'ayah',
          field: 'footnote',
          ref,
          noteId,
          before: beforeNote.text,
          citation: noteCitation,
        });
      } else if (beforeNote && afterNote && beforeNote.text !== afterNote.text) {
        changes.push({
          kind: 'changed',
          scope: 'ayah',
          field: 'footnote',
          ref,
          noteId,
          before: beforeNote.text,
          after: afterNote.text,
          citation: noteCitation,
        });
      }
    }
  }
  return changes;
}

function diffEntries(baseline: SemanticEntry[], current: SemanticEntry[]): SemanticChange[] {
  const changes: SemanticChange[] = [];
  const beforeById = new Map(baseline.map(entry => [entry.id, entry]));
  const afterById = new Map(current.map(entry => [entry.id, entry]));
  const matched = new Set<string>();

  for (const after of current) {
    const before = beforeById.get(after.id);
    if (!before) continue;
    matched.add(before.id);
    changes.push(...changedEntryFields(before, after));
  }

  const unmatchedBefore = baseline.filter(entry => !matched.has(entry.id));
  const unmatchedAfter = current.filter(entry => !beforeById.has(entry.id));
  const usedBefore = new Set<string>();
  const pairing = new Map<string, SemanticEntry>();

  for (const after of unmatchedAfter) {
    let candidates = unmatchedBefore.filter(
      entry => !usedBefore.has(entry.id) && entry.lemma === after.lemma,
    );
    if (candidates.length > 1) {
      candidates = candidates.filter(entry => entry.root === after.root);
    }
    if (candidates.length !== 1) continue;
    const before = candidates[0]!;
    usedBefore.add(before.id);
    pairing.set(after.id, before);
  }

  for (const after of unmatchedAfter) {
    const before = pairing.get(after.id);
    if (!before) continue;
    changes.push({
      kind: 'rekeyed',
      scope: 'entry',
      previousEntryId: before.id,
      entryId: after.id,
      before: before.id,
      after: after.id,
      citation: rekeyCitation(after),
    });
    changes.push(...changedEntryFields(before, after));
  }

  for (const before of unmatchedBefore) {
    if (usedBefore.has(before.id)) continue;
    changes.push({
      kind: 'removed',
      scope: 'entry',
      entryId: before.id,
      before: entrySummary(before),
      citation: entryCitation(before),
    });
  }
  for (const after of unmatchedAfter) {
    if (pairing.has(after.id)) continue;
    changes.push({
      kind: 'added',
      scope: 'entry',
      entryId: after.id,
      after: entrySummary(after),
      citation: entryCitation(after),
    });
  }

  return changes;
}

function countChanges(changes: SemanticChange[]): SemanticDiffCounts {
  return {
    added: changes.filter(change => change.kind === 'added').length,
    removed: changes.filter(change => change.kind === 'removed').length,
    rekeyed: changes.filter(change => change.kind === 'rekeyed').length,
    changed: changes.filter(change => change.kind === 'changed').length,
    total: changes.length,
  };
}

function baselineMetadata(baseline: SemanticBaseline): NonNullable<SemanticDiff['baseline']> {
  return {
    contentVersion: baseline.contentVersion,
    digest: baseline.digest,
    approvedEntries: baseline.approvalCounts.approved,
    pendingEntries: baseline.approvalCounts.pending,
  };
}

function currentMetadata(current: SemanticSnapshot): SemanticDiff['current'] {
  return {
    contentVersion: current.contentVersion,
    approvedEntries: current.approvalCounts.approved,
    pendingEntries: current.approvalCounts.pending,
  };
}

export function buildSemanticDiff({
  baseline,
  current,
}: {
  baseline: SemanticBaseline;
  current: SemanticSnapshot;
}): SemanticDiff {
  const changes = sortChanges([...diffEntries(baseline.entries, current.entries), ...diffAyahs(baseline.ayahs, current.ayahs)]);
  return {
    schemaVersion: 1,
    kind: 'harf-semantic-diff',
    status: 'ok',
    message:
      changes.length === 0
        ? 'No semantic changes against the approved baseline.'
        : `${changes.length} semantic ${changes.length === 1 ? 'change' : 'changes'} against the approved baseline.`,
    baseline: baselineMetadata(baseline),
    current: currentMetadata(current),
    counts: countChanges(changes),
    changes,
  };
}

export function missingSemanticBaseline(current: SemanticSnapshot): SemanticDiff {
  return {
    schemaVersion: 1,
    kind: 'harf-semantic-diff',
    status: 'missing-baseline',
    message:
      'No approved baseline manifest is stored for this build, so no semantic change set is claimed.',
    baseline: null,
    current: currentMetadata(current),
    counts: {added: 0, removed: 0, rekeyed: 0, changed: 0, total: 0},
    changes: [],
  };
}

export function invalidSemanticBaseline(current: SemanticSnapshot, message: string): SemanticDiff {
  return {
    schemaVersion: 1,
    kind: 'harf-semantic-diff',
    status: 'invalid-baseline',
    message,
    baseline: null,
    current: currentMetadata(current),
    counts: {added: 0, removed: 0, rekeyed: 0, changed: 0, total: 0},
    changes: [],
  };
}
