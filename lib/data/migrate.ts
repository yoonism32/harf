import { getDB } from "./db";
import {
  cardSchema,
  defaultSettings,
  emptyData,
  type DataSnapshot,
  type CardRecord,
} from "./schema";
import reciters from "@/data/ea_reciters.json";
import surahs from "@/data/quran-surah-meta.json";
export function validReference(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{1,3}:\d{1,3}$/.test(value))
    return false;
  const [s, a] = value.split(":").map(Number);
  return !!surahs.find((row) => row.id === s && a! >= 1 && a! <= row.verses);
}
export function convertLegacy(
  raw: Record<string, string>,
  mapping: Record<string, string> = {},
): DataSnapshot {
  const data = emptyData();
  data.legacy.raw = raw;
  const warnings: string[] = [];
  const settings = { ...defaultSettings };
  let archived = 0;
  const parsed = (key: string): unknown => {
    try {
      return raw[key] ? JSON.parse(raw[key]) : undefined;
    } catch {
      warnings.push(`Could not read ${key}; original preserved.`);
      return undefined;
    }
  };
  for (const key of ["harf:v1:word_progress", "harf:v1:name_progress"]) {
    const records = parsed(key);
    if (!records || typeof records !== "object" || Array.isArray(records))
      continue;
    for (const [oldId, value] of Object.entries(records)) {
      if (!value || typeof value !== "object") {
        archived++;
        continue;
      }
      const v = value as Record<string, unknown>;
      const names = key.includes("name_progress");
      const entryId = names ? String(v.id ?? oldId) : mapping[oldId];
      if (!entryId || (names && !/^(?:[1-9]|[1-9][0-9])$/.test(entryId))) {
        archived++;
        continue;
      }
      const last =
        typeof v.lastReviewed === "string" &&
        Number.isFinite(Date.parse(v.lastReviewed))
          ? new Date(v.lastReviewed).toISOString()
          : undefined;
      const due =
        typeof v.nextReview === "string" &&
        Number.isFinite(Date.parse(v.nextReview))
          ? new Date(v.nextReview).toISOString()
          : null;
      if (!due) {
        archived++;
        continue;
      }
      const sm2 = v.stability === undefined;
      const reps = sm2 ? v.repetition : v.reps;
      const proposed = {
        id: `${names ? "names" : "vocabulary"}:${entryId}`,
        entryId,
        collection: names ? "names" : "vocabulary",
        contentVersion: "legacy",
        paused: v.suspended === true,
        revision: 0,
        card: {
          due,
          stability: sm2 ? Math.max(1, Number(v.interval ?? 1)) : v.stability,
          difficulty: sm2 ? 5 : v.difficulty,
          state: sm2
            ? Number(reps) >= 2
              ? 2
              : Number(reps) > 0
                ? 1
                : 0
            : v.state,
          reps: reps ?? 0,
          lapses: sm2 ? 0 : v.lapses,
          elapsed_days: 0,
          scheduled_days: last
            ? Math.max(
                0,
                Math.round((Date.parse(due) - Date.parse(last)) / 86400000),
              )
            : 0,
          learning_steps: 0,
          last_review: last,
        },
      };
      const result = cardSchema.safeParse(proposed);
      if (!result.success) {
        archived++;
        continue;
      }
      const card = result.data;
      const existing = data.cards.find((c) => c.id === card.id);
      const sourceKey = `source:${card.id}`;
      const oldSource = String(data.legacy[sourceKey] ?? "");
      const score = (c: CardRecord) => c.card.last_review ?? "";
      if (
        !existing ||
        score(card) > score(existing) ||
        (score(card) === score(existing) &&
          (card.card.reps > existing.card.reps ||
            (card.card.reps === existing.card.reps && oldId < oldSource)))
      ) {
        data.cards = data.cards.filter((c) => c.id !== card.id);
        data.cards.push(card);
        data.legacy[sourceKey] = oldId;
        if (!names && typeof v.mnemonic === "string") {
          data.notes = data.notes.filter((n) => n.id !== entryId);
          data.notes.push({
            id: entryId,
            text: v.mnemonic.slice(0, 1000),
            updatedAt: last ?? due,
          });
        }
      } else archived++;
      if (sm2) warnings.push(`${oldId}: converted SM-2 scheduling.`);
      warnings.push(
        `${oldId}: reconstructed scheduled days; learning step starts at zero.`,
      );
    }
  }
  for (const key of ["harf-reciter", "harf:reciter"]) {
    const candidate = raw[key]?.replace(/^"|"$/g, "");
    if (reciters.some((r) => r.id === candidate)) {
      settings.reciter = candidate!;
      break;
    }
  }
  const last = parsed("harf:v1:last_verse");
  const ref =
    typeof last === "string"
      ? last
      : last && typeof last === "object"
        ? `${(last as Record<string, unknown>).surah}:${(last as Record<string, unknown>).ayah}`
        : undefined;
  if (validReference(ref)) data.meta.lastVerse = ref;
  data.legacy.studySessions = parsed("harf:v1:study_sessions") ?? [];
  settings.onboardingComplete = data.cards.some((c) => c.card.reps > 0);
  data.meta.settings = settings;
  data.legacy.migrationReport = {
    migrated: data.cards.length,
    archived,
    warnings,
  };
  return data;
}
export async function migrateLegacy(mapping: Record<string, string> = {}) {
  const db = await getDB();
  if (
    (await db.get("meta", "migrationComplete")) ||
    (await db.get("meta", "schemaVersion")) === 2
  )
    return;
  const raw: Record<string, string> = {};
  if (typeof localStorage !== "undefined") {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (
        key &&
        (key.startsWith("harf:v1:") ||
          ["harf-location", "harf-reciter", "harf:reciter"].includes(key))
      ) {
        const value = localStorage.getItem(key);
        if (value !== null) raw[key] = value;
      }
    }
  }
  const data = convertLegacy(raw, mapping);
  const tx = db.transaction(["meta", "cards", "notes", "legacy"], "readwrite");
  void tx.done.catch(() => undefined);
  if (await tx.objectStore("meta").get("migrationComplete")) {
    await tx.done;
    return;
  }
  for (const [key, value] of Object.entries(data.meta))
    await tx.objectStore("meta").put(value, key);
  for (const [key, value] of Object.entries(data.legacy))
    await tx.objectStore("legacy").put(value, key);
  for (const card of data.cards)
    await tx.objectStore("cards").put(card, card.id);
  for (const note of data.notes)
    await tx.objectStore("notes").put(note, note.id);
  await tx.done;
}
