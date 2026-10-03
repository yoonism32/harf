import { z } from "zod";
import reciters from "@/data/ea_reciters.json";
export const instant = z.string().datetime({ offset: true });
const count = z.number().int().nonnegative();
export const collectionSchema = z.enum(["vocabulary", "names"]);
export type Collection = z.infer<typeof collectionSchema>;
export const fsrsSchema = z.object({
  due: instant,
  stability: z.number().finite().nonnegative(),
  difficulty: z.number().finite().min(0).max(10),
  elapsed_days: count,
  scheduled_days: count,
  learning_steps: count,
  reps: count,
  lapses: count,
  state: z.number().int().min(0).max(3),
  last_review: instant.optional(),
});
export type SerializedCard = z.infer<typeof fsrsSchema>;
export const cardSchema = z.object({
  id: z
    .string()
    .regex(/^(vocabulary:[a-zA-Z0-9_-]+|names:(?:[1-9]|[1-9][0-9]))$/),
  entryId: z.string().min(1).max(100),
  collection: collectionSchema,
  card: fsrsSchema,
  paused: z.boolean(),
  contentVersion: z.string().max(100),
  revision: count,
});
export type CardRecord = z.infer<typeof cardSchema>;
export const prayerLocationSchema = z.object({
  city: z.string().trim().min(1).max(80).regex(/^[\p{L}\p{M}\p{N} .,'’()-]+$/u, "Invalid city"),
  country: z.string().trim().min(1).max(80).regex(/^[\p{L}\p{M}\p{N} .,'’()-]+$/u, "Invalid country"),
});
export type PrayerLocation = z.infer<typeof prayerLocationSchema>;
export const settingsSchema = z.object({
  dailyNew: z.union([z.literal(0), z.literal(3), z.literal(5), z.literal(10)]),
  namesDailyNew: z.union([z.literal(0), z.literal(3)]),
  introTransliteration: z.boolean(),
  arabicSize: z.union([z.literal(30), z.literal(36), z.literal(42)]),
  reciter: z
    .string()
    .refine(
      (value) => reciters.some((reciter) => reciter.id === value),
      "Unknown reciter",
    ),
  prayerLocation: prayerLocationSchema.nullable().default(null),
  onboardingComplete: z.boolean(),
});
export type Settings = z.infer<typeof settingsSchema>;
export const defaultSettings: Settings = {
  dailyNew: 5,
  namesDailyNew: 3,
  introTransliteration: true,
  arabicSize: 36,
  reciter: "Alafasy_128kbps",
  prayerLocation: null,
  onboardingComplete: false,
};
export const attemptSchema = z.object({
  id: z.string().min(1).max(100),
  entryId: z.string().min(1).max(100),
  cardId: z.string().min(1).max(120),
  isNew: z.boolean(),
  cardRevision: z.number().int().nonnegative().optional(),
  due: instant,
  payload: z.record(z.string(), z.unknown()).optional(),
});
export type Attempt = z.infer<typeof attemptSchema>;
export const sessionSchema = z.object({
  id: z.string().min(1).max(100),
  collection: collectionSchema,
  contentVersion: z.string().max(100),
  queue: z.array(attemptSchema).max(100),
  cursor: count,
  phase: z.enum(["introduction", "question", "answer", "complete"]),
  status: z.enum(["active", "paused", "completed", "ended"]),
  createdAt: instant,
  updatedAt: instant,
  localDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  actions: count,
  introduced: z.array(z.string()).max(20),
  practiced: z.array(z.string()).max(20),
  again: count,
  revision: count,
  lastUndoEvent: z.string().nullable(),
  nextDue: instant.nullable(),
  previewAt: instant.nullable(),
});
export type StudySession = z.infer<typeof sessionSchema>;
export const reviewSchema = z.object({
  id: z.string().min(1).max(100),
  attemptId: z.string().min(1).max(100),
  cardId: z.string().max(120),
  sessionId: z.string().max(100),
  timestamp: instant,
  localDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timeZone: z.string().max(100),
  grade: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  before: cardSchema.nullable(),
  after: cardSchema,
  undone: z.boolean(),
  sessionBefore: sessionSchema.optional(),
});
export type ReviewEvent = z.infer<typeof reviewSchema>;
export const noteSchema = z.object({
  id: z.string().min(1).max(100),
  text: z.string().max(1000),
  updatedAt: instant,
});
export const bookmarkSchema = z.object({
  id: z.string().regex(/^\d{1,3}:\d{1,3}$/),
  createdAt: instant,
});
export type Note = z.infer<typeof noteSchema>;
export type Bookmark = z.infer<typeof bookmarkSchema>;
export const stores = [
  "meta",
  "cards",
  "reviews",
  "sessions",
  "notes",
  "bookmarks",
  "legacy",
] as const;
export type StoreName = (typeof stores)[number];
export type DataSnapshot = {
  meta: Record<string, unknown>;
  cards: CardRecord[];
  reviews: ReviewEvent[];
  sessions: StudySession[];
  notes: Note[];
  bookmarks: Bookmark[];
  legacy: Record<string, unknown>;
};
export function emptyData(): DataSnapshot {
  return {
    meta: {
      settings: defaultSettings,
      schemaVersion: 2,
      revision: 0,
      migrationComplete: true,
    },
    cards: [],
    reviews: [],
    sessions: [],
    notes: [],
    bookmarks: [],
    legacy: {},
  };
}
export function cardId(collection: Collection, id: string) {
  return `${collection}:${id}`;
}
