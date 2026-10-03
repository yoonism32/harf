"use client";
import { useSyncExternalStore } from "react";
import { readData, getDB } from "./db";
import {
  defaultSettings,
  emptyData,
  type DataSnapshot,
  type Settings,
  type StudySession,
} from "./schema";
import { migrateLegacy } from "./migrate";
import overrides from "@/data/course-overrides.json";
import {
  cardSchema,
  reviewSchema,
  sessionSchema,
  noteSchema,
  bookmarkSchema,
  settingsSchema,
} from "./schema";
import { ensureIdentity } from "../account/client";
import { scheduleSync, syncAccount } from "../account/sync";
import { deleteDB } from "idb";
export type HarfSnapshot = DataSnapshot & {
  status: "loading" | "ready" | "unavailable";
  error: string | null;
  settings: Settings;
  activeSession: StudySession | null;
};
const initial: HarfSnapshot = {
  ...emptyData(),
  status: "loading",
  error: null,
  settings: defaultSettings,
  activeSession: null,
};
let snapshot = initial;
const listeners = new Set<() => void>();
let started: Promise<void> | undefined;
let channel: BroadcastChannel | undefined;
function emit() {
  for (const listener of listeners) listener();
}
export async function refreshStore() {
  try {
    const data = await readData();
    const settings = settingsSchema.parse({
      ...defaultSettings,
      ...(data.meta.settings as Partial<Settings> | undefined),
    });
    data.cards.forEach((card) => cardSchema.parse(card));
    data.reviews.forEach((review) => reviewSchema.parse(review));
    data.sessions.forEach((session) => sessionSchema.parse(session));
    data.notes.forEach((note) => noteSchema.parse(note));
    data.bookmarks.forEach((bookmark) => bookmarkSchema.parse(bookmark));
    snapshot = {
      ...data,
      status: "ready",
      error: null,
      settings,
      activeSession:
        data.sessions.find((s) => s.id === data.meta.activeSessionId) ?? null,
    };
  } catch (error) {
    snapshot = {
      ...snapshot,
      status: "unavailable",
      error:
        error instanceof Error
          ? error.message
          : "Progress storage is unavailable",
    };
  }
  emit();
}
export async function notifyChange(sync = true) {
  await refreshStore();
  channel?.postMessage("changed");
  if (sync) scheduleSync();
}
export function initializeStore() {
  return (started ??= (async () => {
    try {
      await deleteDB("harf-import-staging");
      const owner = await ensureIdentity();
      if (owner) {
        const db = await getDB();
        await syncAccount();
        if (!(await db.get("sync", "state"))) throw Error("Connect once to load this account before studying. Reload to retry.");
      } else await migrateLegacy(overrides.legacyMappings);
      await refreshStore();
      if (typeof BroadcastChannel !== "undefined") {
        channel = new BroadcastChannel(`harf-progress-${owner?.id ?? "guest"}`);
        channel.onmessage = () => void refreshStore();
      }
      window.addEventListener("online", scheduleSync);
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") { void refreshStore(); scheduleSync(); }
      });
    } catch (error) {
      snapshot = {
        ...initial,
        status: "unavailable",
        error:
          error instanceof Error
            ? error.message
            : "Progress storage is unavailable",
      };
      emit();
    }
  })());
}
export function useHarfStore() {
  const state = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      void initializeStore();
      return () => {
        listeners.delete(listener);
      };
    },
    () => snapshot,
    () => initial,
  );
  return state;
}
export function getSnapshot() {
  return snapshot;
}
