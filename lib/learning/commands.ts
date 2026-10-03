import { validReference } from "../data/migrate";
import { getDB, readData } from "../data/db";
import {
  cardId,
  defaultSettings,
  settingsSchema,
  type Collection,
  type Settings,
  type StudySession,
  type ReviewEvent,
  type CardRecord,
} from "../data/schema";
import { notifyChange } from "../data/store";
import { buildQueue, type CourseItem, currentAttempt } from "./queue";
import { localDate } from "./calendar";
import { schedule } from "./scheduler";
import { finishSession } from "./session";
import type { Grade } from "ts-fsrs";
function validId(id: string) {
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(id)) throw Error("Invalid entry ID");
}
async function changed() {
  await notifyChange();
}
export async function updateSettings(patch: Partial<Settings>) {
  const db = await getDB();
  const tx = db.transaction("meta", "readwrite");
  void tx.done.catch(() => undefined);
  const settings = settingsSchema.parse({
    ...defaultSettings,
    ...(await tx.store.get("settings")),
    ...patch,
  });
  await tx.store.put(settings, "settings");
  await tx.store.put(((await tx.store.get("revision")) ?? 0) + 1, "revision");
  await tx.done;
  await changed();
}
export async function startSession(input: {
  collection: Collection;
  contentVersion: string;
  entries: CourseItem[];
  loadPayload: (id: string, reps: number) => Promise<Record<string, unknown>>;
  now?: Date;
}) {
  if (!["vocabulary", "names"].includes(input.collection))
    throw Error("Invalid collection");
  input.entries.forEach((e) => validId(e.id));
  if (new Set(input.entries.map((e) => e.id)).size !== input.entries.length)
    throw Error("Duplicate course entries");
  const now = input.now ?? new Date();
  const data = await readData();
  const existing = data.sessions.find(
    (s) => s.id === data.meta.activeSessionId,
  );
  if (existing) return existing;
  const chosen = buildQueue(data, input.collection, input.entries, now);
  if (!chosen.length)
    throw Error(
      "No entries are ready. Your next review will be available at its scheduled time.",
    );
  const payloads = new Map<string, Record<string, unknown>>();
  let index = 0;
  await Promise.all(
    Array.from({ length: Math.min(4, chosen.length) }, async () => {
      while (index < chosen.length) {
        const item = chosen[index++]!;
        payloads.set(
          item.entryId,
          await input.loadPayload(
            item.entryId,
            data.cards.find((c) => c.id === item.cardId)?.card.reps ?? 0,
          ),
        );
      }
    }),
  );
  for (const item of chosen)
    if (payloads.get(item.entryId) == null)
      throw Error("Study content for this session did not load. Try again.");
  const db = await getDB();
  const tx = db.transaction(["meta", "sessions"], "readwrite");
  void tx.done.catch(() => undefined);
  if (await tx.objectStore("meta").get("activeSessionId")) {
    tx.abort();
    throw Error("A session started in another tab. Resume it from Today.");
  }
  if (
    ((await tx.objectStore("meta").get("revision")) ?? 0) !==
    (data.meta.revision ?? 0)
  ) {
    tx.abort();
    throw Error("Your progress changed in another tab. Try again.");
  }
  const session: StudySession = {
    id: crypto.randomUUID(),
    collection: input.collection,
    contentVersion: input.contentVersion,
    queue: chosen.map((item) => ({
      ...item,
      id: crypto.randomUUID(),
      cardRevision: data.cards.find((c) => c.id === item.cardId)?.revision ?? 0,
      due: now.toISOString(),
      payload: payloads.get(item.entryId)!,
    })),
    cursor: 0,
    phase: chosen[0]!.isNew ? "introduction" : "question",
    status: "active",
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    localDate: localDate(now),
    actions: 0,
    introduced: [],
    practiced: [],
    again: 0,
    revision: 0,
    lastUndoEvent: null,
    nextDue: null,
    previewAt: null,
  };
  await tx.objectStore("sessions").put(session, session.id);
  await tx.objectStore("meta").put(session.id, "activeSessionId");
  await tx
    .objectStore("meta")
    .put(Number(data.meta.revision ?? 0) + 1, "revision");
  await tx.done;
  await changed();
  return session;
}
export async function commitReview(input: {
  sessionId: string;
  expectedRevision: number;
  attemptId: string;
  grade: Grade;
  now?: Date;
}) {
  if (![1, 2, 3, 4].includes(input.grade)) throw Error("Invalid grade");
  const db = await getDB();
  const tx = db.transaction(
    ["meta", "cards", "reviews", "sessions"],
    "readwrite",
  );
  void tx.done.catch(() => undefined);
  const previous = (await tx
    .objectStore("reviews")
    .index("attemptId")
    .get(input.attemptId)) as ReviewEvent | undefined;
  if (previous && !previous.undone) {
    if (previous.sessionId !== input.sessionId)
      throw Error("Attempt belongs to another session");
    await tx.done;
    return previous;
  }
  const session = (await tx.objectStore("sessions").get(input.sessionId)) as
    | StudySession
    | undefined;
  const attempt = session && currentAttempt(session);
  if (
    !session ||
    session.status !== "active" ||
    session.revision !== input.expectedRevision ||
    attempt?.id !== input.attemptId ||
    session.phase !== "answer" ||
    (await tx.objectStore("meta").get("activeSessionId")) !== session.id
  ) {
    tx.abort();
    throw Error(
      "This session changed in another tab. Reload its current state.",
    );
  }
  const before = (await tx.objectStore("cards").get(attempt.cardId)) as
    | CardRecord
    | undefined;
  if ((before?.revision ?? 0) !== (attempt.cardRevision ?? 0)) {
    tx.abort();
    throw Error(
      "This card changed in another tab. Resume the current session.",
    );
  }
  const now = new Date(
    session.previewAt ?? input.now?.toISOString() ?? new Date().toISOString(),
  );
  const after: CardRecord = {
    id: attempt.cardId,
    entryId: attempt.entryId,
    collection: session.collection,
    card: schedule(before?.card ?? null, input.grade, now),
    paused: false,
    contentVersion: session.contentVersion,
    revision: (before?.revision ?? 0) + 1,
  };
  const event: ReviewEvent = {
    id: crypto.randomUUID(),
    attemptId: attempt.id,
    cardId: attempt.cardId,
    sessionId: session.id,
    timestamp: now.toISOString(),
    localDate: localDate(now),
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    grade: input.grade,
    before: before ?? null,
    after,
    undone: false,
    sessionBefore: session,
  };
  let updated: StudySession = {
    ...session,
    queue: [...session.queue],
    cursor: session.cursor + 1,
    actions: session.actions + 1,
    again: session.again + (input.grade === 1 ? 1 : 0),
    practiced: [...new Set([...session.practiced, attempt.entryId])],
    introduced: before
      ? session.introduced
      : [...new Set([...session.introduced, attempt.entryId])],
    lastUndoEvent: event.id,
    revision: session.revision + 1,
    updatedAt: now.toISOString(),
    previewAt: null,
  };
  if (after.card.state === 1 || after.card.state === 3)
    updated.queue.push({
      ...attempt,
      id: crypto.randomUUID(),
      isNew: false,
      cardRevision: after.revision,
      due: after.card.due,
    });
  const remaining = updated.queue.slice(updated.cursor);
  const ready = remaining.findIndex(
    (a) => !a.isNew && Date.parse(a.due) <= now.getTime(),
  );
  if (ready > 0) {
    const absolute = updated.cursor + ready;
    const [next] = updated.queue.splice(absolute, 1);
    updated.queue.splice(updated.cursor, 0, next!);
  }
  const next = currentAttempt(updated);
  if (updated.actions >= 30 || !next || Date.parse(next.due) > now.getTime()) {
    updated.nextDue = remaining.map((a) => a.due).sort()[0] ?? null;
    updated = finishSession(updated, "completed", now);
    await tx.objectStore("meta").delete("activeSessionId");
  } else updated.phase = next.isNew ? "introduction" : "question";
  if (session.lastUndoEvent) {
    const old = (await tx.objectStore("reviews").get(session.lastUndoEvent)) as
      | ReviewEvent
      | undefined;
    if (old)
      await tx
        .objectStore("reviews")
        .put({ ...old, sessionBefore: undefined }, old.id);
  }
  if (updated.status === "completed") event.sessionBefore = undefined;
  await tx.objectStore("cards").put(after, after.id);
  if (previous) await tx.objectStore("reviews").delete(previous.id);
  await tx.objectStore("reviews").put(event, event.id);
  await tx.objectStore("sessions").put(updated, updated.id);
  await tx
    .objectStore("meta")
    .put(((await tx.objectStore("meta").get("revision")) ?? 0) + 1, "revision");
  await tx.done;
  await changed();
  return event;
}
async function mutateSession(
  id: string,
  mutate: (s: StudySession) => StudySession,
  expectedRevision?:number,
) {
  const db = await getDB();
  const tx = db.transaction(["sessions", "meta", "reviews"], "readwrite");
  void tx.done.catch(() => undefined);
  const session = (await tx.objectStore("sessions").get(id)) as
    | StudySession
    | undefined;
  if (
    !session ||
    (await tx.objectStore("meta").get("activeSessionId")) !== id ||
    !["active", "paused"].includes(session.status)||expectedRevision!==undefined&&session.revision!==expectedRevision
  )
    throw Error("This session is no longer active");
  const updated = mutate(session);
  if (!updated.lastUndoEvent && session.lastUndoEvent) {
    const old = (await tx.objectStore("reviews").get(session.lastUndoEvent)) as
      | ReviewEvent
      | undefined;
    if (old)
      await tx
        .objectStore("reviews")
        .put({ ...old, sessionBefore: undefined }, old.id);
  }
  updated.revision++;
  await tx.objectStore("sessions").put(updated, id);
  if (["ended", "completed"].includes(updated.status))
    await tx.objectStore("meta").delete("activeSessionId");
  await tx
    .objectStore("meta")
    .put(((await tx.objectStore("meta").get("revision")) ?? 0) + 1, "revision");
  await tx.done;
  await changed();
  return updated;
}
export const revealSession = (id: string,expectedRevision?:number) =>
  mutateSession(id, (s) => ({
    ...s,
    phase: "answer",
    previewAt: s.previewAt??new Date().toISOString(),
  }),expectedRevision);
export const beginRecall = (id: string,expectedRevision?:number) =>
  mutateSession(id, (s) => {if(s.phase!=="introduction")throw Error("This question changed in another tab");return {...s,phase:"question"};},expectedRevision);
export const pauseSession = (id: string) =>
  mutateSession(id, (s) => ({ ...s, status: "paused", lastUndoEvent: null }));
export const resumeSession = (id: string) =>
  mutateSession(id, (s) => ({ ...s, status: "active", lastUndoEvent: null }));
export const endSession = (id: string) =>
  mutateSession(id, (s) => finishSession(s, "ended", new Date()));
export async function undoReview(id: string) {
  const db = await getDB();
  const tx = db.transaction(
    ["meta", "cards", "sessions", "reviews"],
    "readwrite",
  );
  void tx.done.catch(() => undefined);
  const session = (await tx.objectStore("sessions").get(id)) as StudySession;
  const event = session?.lastUndoEvent
    ? ((await tx
        .objectStore("reviews")
        .get(session.lastUndoEvent)) as ReviewEvent)
    : undefined;
  const card = event
    ? ((await tx.objectStore("cards").get(event.cardId)) as CardRecord)
    : undefined;
  if (
    !event ||
    event.undone ||
    session.status !== "active" ||
    card?.revision !== event.after.revision
  ) {
    tx.abort();
    throw Error("This answer can no longer be undone.");
  }
  if (event.before)
    await tx.objectStore("cards").put(event.before, event.cardId);
  else await tx.objectStore("cards").delete(event.cardId);
  await tx
    .objectStore("reviews")
    .put({ ...event, undone: true, sessionBefore: undefined }, event.id);
  if (!event.sessionBefore) {
    tx.abort();
    throw Error("Undo is no longer available");
  }
  const restored = {
    ...event.sessionBefore,
    revision: session.revision + 1,
    lastUndoEvent: null,
    phase: "answer" as const,
  };
  await tx.objectStore("sessions").put(restored, id);
  await tx
    .objectStore("meta")
    .put(((await tx.objectStore("meta").get("revision")) ?? 0) + 1, "revision");
  await tx.done;
  await changed();
}
async function setRecord(
  store: "notes" | "bookmarks" | "meta",
  key: string,
  value: unknown,
) {
  const db = await getDB();
  const tx = db.transaction([...new Set([store, "meta"])], "readwrite");
  void tx.done.catch(() => undefined);
  if (value === undefined) await tx.objectStore(store).delete(key);
  else await tx.objectStore(store).put(value, key);
  await tx
    .objectStore("meta")
    .put(((await tx.objectStore("meta").get("revision")) ?? 0) + 1, "revision");
  await tx.done;
  await changed();
}
export async function saveNote(id: string, text: string) {
  validId(id);
  if (text.length > 1000) throw Error("Use at most 1,000 characters");
  await setRecord("notes", id, {
    id,
    text,
    updatedAt: new Date().toISOString(),
  });
}
export async function toggleBookmark(ref: string) {
  if (!validReference(ref)) throw Error("Invalid ayah reference");
  const db = await getDB();
  const tx = db.transaction(["bookmarks", "meta"], "readwrite");
  void tx.done.catch(() => undefined);
  if (await tx.objectStore("bookmarks").get(ref))
    await tx.objectStore("bookmarks").delete(ref);
  else
    await tx
      .objectStore("bookmarks")
      .put({ id: ref, createdAt: new Date().toISOString() }, ref);
  await tx
    .objectStore("meta")
    .put(((await tx.objectStore("meta").get("revision")) ?? 0) + 1, "revision");
  await tx.done;
  await changed();
}
export async function setLastVerse(ref: string) {
  if (!validReference(ref)) throw Error("Invalid ayah reference");
  await setRecord("meta", "lastVerse", ref);
}
export async function prioritizeEntry(id: string) {
  validId(id);
  const db = await getDB();
  const tx = db.transaction("meta", "readwrite");
  void tx.done.catch(() => undefined);
  const priorities = (await tx.store.get("priorityEntries")) ?? [];
  await tx.store.put([...new Set([...priorities, id])], "priorityEntries");
  await tx.store.put(((await tx.store.get("revision")) ?? 0) + 1, "revision");
  await tx.done;
  await changed();
}
export async function setPaused(
  collection: Collection,
  id: string,
  paused: boolean,
) {
  const db = await getDB();
  const tx = db.transaction(["cards", "meta", "sessions"], "readwrite");
  void tx.done.catch(() => undefined);
  const key = cardId(collection, id);
  const activeSessionId = await tx.objectStore("meta").get("activeSessionId");
  const activeSession = activeSessionId
    ? ((await tx.objectStore("sessions").get(activeSessionId)) as
        | StudySession
        | undefined)
    : undefined;
  if (
    activeSession?.queue
      .slice(activeSession.cursor)
      .some((attempt) => attempt.cardId === key)
  ) {
    tx.abort();
    throw Error("Finish or end the active session before changing this entry's review status.");
  }
  const record = (await tx.objectStore("cards").get(key)) as
    | CardRecord
    | undefined;
  if (!record) throw Error("This entry has not been studied");
  await tx
    .objectStore("cards")
    .put({ ...record, paused, revision: record.revision + 1 }, key);
  await tx
    .objectStore("meta")
    .put(((await tx.objectStore("meta").get("revision")) ?? 0) + 1, "revision");
  await tx.done;
  await changed();
}
