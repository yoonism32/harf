import { z } from "zod";
import { openDB, deleteDB } from "idb";
import { getDB, readData, writeData } from "./db";
import {
  bookmarkSchema,
  cardSchema,
  emptyData,
  instant,
  noteSchema,
  reviewSchema,
  sessionSchema,
  settingsSchema,
  defaultSettings,
  stores,
  type DataSnapshot,
  type StoreName,
} from "./schema";
import { convertLegacy, validReference } from "./migrate";
import { notifyChange } from "./store";
export const MAX_PART_BYTES = 20 * 1024 * 1024;
export const MAX_IMPORT_BYTES = 128 * 1024 * 1024;
export const MAX_IMPORT_PARTS = 64;
const dataSchema = z.object({
  meta: z.record(z.string(), z.unknown()),
  cards: z.array(cardSchema).max(100000),
  reviews: z.array(reviewSchema).max(2000000),
  sessions: z.array(sessionSchema).max(200000),
  notes: z.array(noteSchema).max(100000),
  bookmarks: z.array(bookmarkSchema).max(6236),
  legacy: z.record(z.string(), z.unknown()),
});
const backupSchema = z.object({
  app: z.literal("harf"),
  schemaVersion: z.literal(2),
  contentVersion: z.string().max(100),
  exportedAt: instant,
  data: dataSchema,
});
export type Backup = z.infer<typeof backupSchema>;
export type BackupFile = { name: string; text: string };
const bytes = (text: string) => new TextEncoder().encode(text).length;
async function sha(text: string) {
  return [
    ...new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)),
    ),
  ]
    .map((n) => n.toString(16).padStart(2, "0"))
    .join("");
}
export function rejectDangerous(value: unknown, depth = 0) {
  if (depth > 50) throw Error("Backup nesting is too deep");
  if (value && typeof value === "object")
    for (const [key, v] of Object.entries(value)) {
      if (["__proto__", "constructor", "prototype"].includes(key))
        throw Error("Unsafe object key in backup");
      rejectDangerous(v, depth + 1);
    }
}
export function validateBackup(value: unknown): Backup {
  rejectDangerous(value);
  const result = backupSchema.parse(value);
  const data = result.data;
  data.meta.settings = settingsSchema.parse({
    ...defaultSettings,
    ...(data.meta.settings as Record<string, unknown> | undefined),
  });
  if (!Number.isInteger(data.meta.revision) || Number(data.meta.revision) < 0)
    throw Error("Invalid database revision");
  if (
    data.meta.activeSessionId !== undefined &&
    typeof data.meta.activeSessionId !== "string"
  )
    throw Error("Invalid active session");
  if (data.meta.priorityEntries !== undefined)
    z.array(z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/))
      .max(300)
      .parse(data.meta.priorityEntries);
  if (data.meta.lastExportAt !== undefined)
    instant.parse(data.meta.lastExportAt);
  if (data.meta.schemaVersion !== 2) throw Error("Unsupported app schema");
  for (const name of [
    "cards",
    "reviews",
    "sessions",
    "notes",
    "bookmarks",
  ] as const) {
    const keys = data[name].map((v) => v.id);
    if (new Set(keys).size !== keys.length)
      throw Error(`Duplicate ${name} record`);
  }
  for (const bookmark of data.bookmarks)
    if (!validReference(bookmark.id)) throw Error("Invalid bookmark reference");
  if (data.meta.lastVerse && !validReference(data.meta.lastVerse))
    throw Error("Invalid reading position");
  const attempts = data.reviews.map((e) => e.attemptId);
  if (new Set(attempts).size !== attempts.length)
    throw Error("Duplicate review attempt");
  for (const card of data.cards) {
    if (card.id !== `${card.collection}:${card.entryId}`)
      throw Error("Card identity mismatch");
  }
  const sessions = new Set(data.sessions.map((s) => s.id));
  for (const event of data.reviews) {
    if (
      !sessions.has(event.sessionId) ||
      event.after.id !== event.cardId ||
      (event.before && event.before.id !== event.cardId)
    )
      throw Error("Broken review references");
  }
  for (const session of data.sessions) {
    for (const attempt of session.queue)
      if (attempt.cardId !== `${session.collection}:${attempt.entryId}`)
        throw Error("Attempt identity mismatch");
    if (session.cursor > session.queue.length)
      throw Error("Invalid session cursor");
    if (session.actions > 30) throw Error("Invalid session action count");
  }
  return result;
}
export async function exportBackup(
  contentVersion: string,
  maxBytes = MAX_PART_BYTES,
): Promise<BackupFile[]> {
  const data = await readData();
  const exportedAt = new Date().toISOString();
  data.meta.lastExportAt = exportedAt;
  const backup: Backup = {
    app: "harf",
    schemaVersion: 2,
    contentVersion,
    exportedAt,
    data,
  };
  validateBackup(backup);
  const text = JSON.stringify(backup);
  let files: BackupFile[];
  const prefix = `harf-${exportedAt.slice(0, 10)}`;
  if (bytes(text) <= maxBytes) files = [{ name: `${prefix}.json`, text }];
  else {
    const records: { store: StoreName; key: string; value: unknown }[] = [];
    for (const store of stores) {
      if (store === "meta" || store === "legacy")
        for (const [key, value] of Object.entries(data[store]))
          records.push({ store, key, value });
      else
        for (const value of data[store])
          records.push({ store, key: value.id, value });
    }
    const backupId = crypto.randomUUID();
    const groups: (typeof records)[] = [];
    let group: typeof records = [];
    let size = 1024;
    for (const record of records) {
      const n = bytes(JSON.stringify(record)) + 1;
      if (n + 1024 > maxBytes)
        throw Error(
          "A single archived record exceeds the backup part size. Export the legacy archive separately.",
        );
      if (size + n > maxBytes) {
        groups.push(group);
        group = [];
        size = 1024;
      }
      group.push(record);
      size += n;
    }
    if (group.length) groups.push(group);
    if (groups.length > MAX_IMPORT_PARTS)
      throw Error("Backup needs too many parts. Remove archived data and export again.");
    files = groups.map((records, index) => ({
      name: `${prefix}-${backupId}-part-${index + 1}.json`,
      text: JSON.stringify({
        app: "harf",
        schemaVersion: 2,
        backupId,
        partIndex: index + 1,
        partCount: groups.length,
        exportedAt,
        contentVersion,
        records,
      }),
    }));
    for (const file of files)
      if (bytes(file.text) > maxBytes) throw Error("Backup part exceeds limit");
    files.push({
      name: `${prefix}-${backupId}-manifest.json`,
      text: JSON.stringify({
        app: "harf",
        schemaVersion: 2,
        type: "multipart-manifest",
        backupId,
        partCount: groups.length,
        hashes: await Promise.all(files.map((f) => sha(f.text))),
        sha256: await sha(files.map((f) => f.text).join("")),
      }),
    });
  }
  const db = await getDB();
  await db.put("meta", exportedAt, "lastExportAt");
  await notifyChange();
  return files;
}
export async function discardStaging() {
  await deleteDB("harf-import-staging");
}
export async function parseImport(
  files: File[],
  legacyMapping: Record<string, string> = {},
): Promise<{ backup: Backup; warnings: string[] }> {
  if (!files.length) throw Error("Choose a backup file");
  if (files.length > MAX_IMPORT_PARTS + 1)
    throw Error(`Choose at most ${MAX_IMPORT_PARTS} backup parts and one manifest`);
  if (files.reduce((total, file) => total + file.size, 0) > MAX_IMPORT_BYTES)
    throw Error("The complete backup must be at most 128 MiB");
  for (const file of files)
    if (file.size > MAX_PART_BYTES)
      throw Error("Backup parts must be at most 20 MiB");
  async function readObject(file:File) {
    const text = await file.text();
    const value: unknown = JSON.parse(text);
    rejectDangerous(value);
    if (!value || typeof value !== "object" || Array.isArray(value))
      throw Error("Invalid backup");
    return {text,value:value as Record<string,unknown>};
  }
  const single=files.length===1?await readObject(files[0]!):null;
  if (single?.value.data)
    return { backup: validateBackup(single.value), warnings: [] };
  const one = single?.value;
  if (
    one &&
    (one.version === "v1" || one.version === undefined)
  ) {
    const allowed = new Set([
      "version",
      "exportedAt",
      "wordProgress",
      "nameProgress",
      "studySessions",
      "location",
      "reciter",
    ]);
    if (
      Object.keys(one).some((k) => !allowed.has(k)) ||
      !["wordProgress", "nameProgress", "studySessions"].some((k) => k in one)
    )
      throw Error("Not a recognized legacy backup");
    const progress = z.record(z.string(), z.record(z.string(), z.unknown()));
    if (one.wordProgress !== undefined) progress.parse(one.wordProgress);
    if (one.nameProgress !== undefined) progress.parse(one.nameProgress);
    if (one.studySessions !== undefined)
      z.array(z.record(z.string(), z.unknown())).parse(one.studySessions);
    if (one.location !== undefined)
      z.union([
        z.null(),
        z.object({ city: z.string().max(200), country: z.string().max(200) }),
      ]).parse(one.location);
    if (one.reciter !== undefined)
      z.union([z.null(), z.string().max(100)]).parse(one.reciter);
    const raw: Record<string, string> = {};
    for (const [key, target] of Object.entries({
      wordProgress: "harf:v1:word_progress",
      nameProgress: "harf:v1:name_progress",
      studySessions: "harf:v1:study_sessions",
      location: "harf-location",
      reciter: "harf-reciter",
    }))
      if (one[key] !== undefined) raw[target] = JSON.stringify(one[key]);
    return {
      backup: {
        app: "harf",
        schemaVersion: 2,
        contentVersion: "legacy",
        exportedAt: new Date().toISOString(),
        data: convertLegacy(raw, legacyMapping),
      },
      warnings: [
        "Legacy exports did not include all similar-verse progress. Unmapped vocabulary stays in the archive.",
      ],
    };
  }
  let manifest:Record<string,unknown>|undefined;
  const parts:{file:File;partIndex:number}[]=[];
  for(const file of files){const {value}=files.length===1?single!:await readObject(file);if(value.type==="multipart-manifest"){if(manifest)throw Error("Select only one backup manifest");manifest=value;}else if(Number.isInteger(value.partIndex))parts.push({file,partIndex:Number(value.partIndex)});else throw Error("Select all numbered parts and their manifest");}
  if (
    !manifest ||
    !Number.isInteger(manifest.partCount) ||
    Number(manifest.partCount)<1 ||
    Number(manifest.partCount)>MAX_IMPORT_PARTS ||
    !Array.isArray(manifest.hashes) ||
    manifest.hashes.length!==manifest.partCount ||
    manifest.hashes.some(hash=>typeof hash!=="string"||!/^[a-f0-9]{64}$/.test(hash))
  )
    throw Error("Select all numbered parts and their manifest");
  parts.sort((a,b)=>a.partIndex-b.partIndex);
  if (parts.length !== manifest.partCount) throw Error("Missing backup parts");
  await discardStaging();
  const stage = await openDB("harf-import-staging", 1, {
    upgrade(db) {
      db.createObjectStore("records");
    },
  });
  try {
    const first=(await readObject(parts[0]!.file)).value;
    const data = emptyData();
    data.meta = {};
    data.legacy = {};
    for (let i = 0; i < parts.length; i++) {
      const {value,text}=await readObject(parts[i]!.file);
      if (
        value.app !== "harf" ||
        value.schemaVersion !== 2 ||
        value.backupId !== manifest.backupId ||
        value.partIndex !== i + 1 ||
        value.partCount !== parts.length ||
        value.contentVersion !== first.contentVersion ||
        value.exportedAt !== first.exportedAt ||
        (await sha(text)) !== manifest.hashes[i] ||
        !Array.isArray(value.records)
      )
        throw Error("Invalid or damaged backup part");
      for (const raw of value.records) {
        const record = z
          .object({
            store: z.enum(stores),
            key: z.string().max(200),
            value: z.unknown(),
          })
          .parse(raw);
        const key = `${record.store}:${record.key}`;
        await stage.add("records", record, key);
        if (record.store === "meta" || record.store === "legacy")
          data[record.store][record.key] = record.value;
        else {
          if (
            !record.value ||
            typeof record.value !== "object" ||
            (record.value as { id?: unknown }).id !== record.key
          )
            throw Error("Record key mismatch");
          (data[record.store] as unknown[]).push(record.value);
        }
      }
    }
    return {
      backup: validateBackup({
        app: "harf",
        schemaVersion: 2,
        contentVersion: first.contentVersion,
        exportedAt: first.exportedAt,
        data,
      }),
      warnings: [],
    };
  } finally {
    stage.close();
    await discardStaging();
  }
}
async function ensureStorageHeadroom(data: DataSnapshot) {
  if (typeof navigator === "undefined" || !navigator.storage?.estimate) return;
  let estimate: StorageEstimate;
  try {
    estimate = await navigator.storage.estimate();
  } catch {
    return;
  }
  if (estimate.quota === undefined) return;
  const required = new TextEncoder().encode(JSON.stringify(data)).length * 2;
  if (estimate.quota - (estimate.usage ?? 0) < required)
    throw Error(
      "Not enough storage space for this import. Free up space and try again.",
    );
}
export async function replaceFromBackup(
  backup: Backup,
  knownVocabularyIds?: Set<string>,
) {
  const data = validateBackup(backup).data;
  await ensureStorageHeadroom(data);
  for (const event of data.reviews) event.sessionBefore = undefined;
  for (const session of data.sessions)
    if (session.status === "active" || session.status === "paused") {
      session.status = "ended";
      session.phase = "complete";
      session.lastUndoEvent = null;
      session.queue = session.queue.map(({ payload: _, ...a }) => a);
    }
  delete data.meta.activeSessionId;
  data.meta.migrationComplete = true;
  if (knownVocabularyIds) {
    const unknown = data.cards.filter(
      (c) =>
        c.collection === "vocabulary" && !knownVocabularyIds.has(c.entryId),
    );
    if (unknown.length)
      data.legacy[`unknownContentCards:${backup.exportedAt}`] = unknown;
    data.cards = data.cards.filter((c) => !unknown.includes(c));
  }
  await writeData(data, "import");
  await notifyChange();
}
export async function resetProgress() {
  const previous = await readData();
  const next = emptyData();
  next.meta.settings = previous.meta.settings;
  next.legacy = previous.legacy;
  await writeData(next, "reset");
  await notifyChange();
}
export async function recoverPrevious() {
  const db = await getDB();
  const tx = db.transaction([...stores, "recovery"], "readwrite");
  void tx.done.catch(() => undefined);
  const currentRevision = Number(
    (await tx.objectStore("meta").get("revision")) ?? 0,
  );
  const snapshot = (await tx.objectStore("recovery").get("previous")) as
    | { data: DataSnapshot }
    | undefined;
  if (!snapshot) throw Error("No recovery snapshot is available");
  for (const name of stores) {
    await tx.objectStore(name).clear();
    if (name === "meta" || name === "legacy")
      for (const [key, value] of Object.entries(snapshot.data[name]))
        await tx.objectStore(name).put(value, key);
    else
      for (const value of snapshot.data[name])
        await tx.objectStore(name).put(value, value.id);
  }
  await tx.objectStore("meta").put(currentRevision + 1, "revision");
  await tx
    .objectStore("meta")
    .put(new Date().toISOString(), "lastRecoveryAction");
  await tx.objectStore("recovery").delete("previous");
  await tx.done;
  await notifyChange();
}
export async function exportLegacyArchive() {
  return {
    name: "harf-legacy-archive.json",
    text: JSON.stringify((await readData()).legacy, null, 2),
  };
}
export async function getRecoveryInfo(): Promise<{
  createdAt: string;
  reason: string;
} | null> {
  const value = await (await getDB()).get("recovery", "previous");
  return value ? { createdAt: value.createdAt, reason: value.reason } : null;
}
export function needsBackupReminder(data: DataSnapshot) {
  const last =
    typeof data.meta.lastExportAt === "string" ? data.meta.lastExportAt : "";
  return (
    new Set(
      data.reviews
        .filter((e) => !e.undone && e.timestamp > last)
        .map((e) => e.localDate),
    ).size >= 7
  );
}
