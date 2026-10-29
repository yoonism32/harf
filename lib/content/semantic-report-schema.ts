import {z} from 'zod';

const approvalSchema = z.object({
  status: z.enum(['pending', 'approved']),
  reviewer: z.string().optional(),
  reviewedAt: z.string().optional(),
  evidence: z.string().optional(),
});

const entrySchema = z.object({
  id: z.string().regex(/^l-[a-f0-9]{16}$/),
  lemma: z.string().min(1),
  root: z.string().nullable(),
  arabic: z.string().min(1),
  gloss: z.string().min(1),
  representativeKey: z.string().regex(/^\d+:\d+:\d+$/),
  exampleKeys: z.array(z.string().regex(/^\d+:\d+:\d+$/)).min(1).max(3),
  occurrenceCount: z.number().int().positive(),
  occurrenceKeys: z.array(z.string().regex(/^\d+:\d+:\d+$/)),
  sourceIds: z.array(z.string()),
  approval: approvalSchema,
});

const noteSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  ref: z.object({surah: z.number().int().min(1).max(114), ayah: z.number().int().positive()}).nullable(),
});

const ayahSchema = z.object({
  ref: z.string().regex(/^\d+:\d+$/),
  translation: z.string().min(1),
  translationSource: z.string().min(1),
  notes: z.array(noteSchema),
});

const countsSchema = z.object({
  approved: z.number().int().nonnegative(),
  pending: z.number().int().nonnegative(),
});

export const semanticBaselineSchema = z.object({
  schemaVersion: z.literal(1),
  kind: z.literal('harf-semantic-baseline'),
  digest: z.string().regex(/^[a-f0-9]{64}$/),
  contentVersion: z.string().regex(/^[a-f0-9]{16}$/),
  approvalCounts: countsSchema,
  entries: z.array(entrySchema),
  ayahs: z.array(ayahSchema),
});

const changeSchema = z.object({
  kind: z.enum(['added', 'removed', 'rekeyed', 'changed']),
  scope: z.enum(['entry', 'ayah']),
  field: z
    .enum([
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
    ])
    .optional(),
  entryId: z.string().optional(),
  previousEntryId: z.string().optional(),
  ref: z.string().optional(),
  noteId: z.string().optional(),
  before: z.string().optional(),
  after: z.string().optional(),
  citation: z.string().min(1),
});

const diffCountsSchema = z.object({
  added: z.number().int().nonnegative(),
  removed: z.number().int().nonnegative(),
  rekeyed: z.number().int().nonnegative(),
  changed: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
});

export const semanticDiffSchema = z.object({
  schemaVersion: z.literal(1),
  kind: z.literal('harf-semantic-diff'),
  status: z.enum(['ok', 'missing-baseline', 'invalid-baseline']),
  message: z.string().min(1),
  baseline: z
    .object({
      contentVersion: z.string(),
      digest: z.string(),
      approvedEntries: z.number().int().nonnegative(),
      pendingEntries: z.number().int().nonnegative(),
    })
    .nullable(),
  current: z.object({
    contentVersion: z.string(),
    approvedEntries: z.number().int().nonnegative(),
    pendingEntries: z.number().int().nonnegative(),
  }),
  counts: diffCountsSchema,
  changes: z.array(changeSchema),
});

export type SemanticBaselineDocument = z.infer<typeof semanticBaselineSchema>;
export type SemanticDiffDocument = z.infer<typeof semanticDiffSchema>;
