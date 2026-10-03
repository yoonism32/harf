import { openDB, type IDBPDatabase } from "idb";
import { stores, emptyData, type DataSnapshot } from "./schema";
import { databaseIdentity } from "../account/client";
let opening: Promise<IDBPDatabase> | undefined;
export async function getDB() {
  const identity = await databaseIdentity();
  return (opening ??= new Promise<IDBPDatabase>((resolve, reject) => {
    let blockedTimer: ReturnType<typeof setTimeout> | undefined;
    openDB(identity ? `harf-account-${identity.id}` : "harf", 2, {
      upgrade(db, oldVersion, _newVersion, tx) {
        for (const name of [...stores, "recovery", "sync"]) {
          if (db.objectStoreNames.contains(name)) continue;
          const store = db.createObjectStore(name);
          if (name === "reviews") {
            store.createIndex("attemptId", "attemptId", { unique: true });
            store.createIndex("cardId", "cardId");
            store.createIndex("localDate", "localDate");
          }
        }
        if (identity && oldVersion === 0)
          for (const [key,value] of Object.entries(emptyData().meta)) void tx.objectStore("meta").put(value,key);
      },
      blocking() {
        void opening?.then((db) => db.close());
        opening = undefined;
      },
      blocked() {
        blockedTimer = setTimeout(
          () =>
            reject(
              Error(
                "Storage is open in another tab. Close other Harf tabs and reload.",
              ),
            ),
          8000,
        );
      },
    }).then(
      (db) => {
        clearTimeout(blockedTimer);
        resolve(db);
      },
      (error) => {
        clearTimeout(blockedTimer);
        reject(error);
      },
    );
  }).catch((error) => {
    opening = undefined;
    throw error;
  }));
}
export async function readData(): Promise<DataSnapshot> {
  const db = await getDB();
  const tx = db.transaction([...stores], "readonly");
  void tx.done.catch(() => undefined);
  const result: Record<string, unknown> = {};
  await Promise.all(
    stores.map(async (name) => {
      const values = await tx.objectStore(name).getAll();
      if (name === "meta" || name === "legacy") {
        const keys = await tx.objectStore(name).getAllKeys();
        result[name] = Object.fromEntries(
          keys.map((key, i) => [String(key), values[i]]),
        );
      } else result[name] = values;
    }),
  );
  await tx.done;
  return result as DataSnapshot;
}
export async function closeDB() {
  if (opening) (await opening).close();
  opening = undefined;
}
export async function writeData(
  data: DataSnapshot,
  reason: string,
  recovery = true,
  sync?: { expectedRevision: number; state: unknown },
) {
  const db = await getDB();
  const tx = db.transaction([...stores, "recovery", "sync"], "readwrite");
  void tx.done.catch(() => undefined);
  if (sync && Number((await tx.objectStore("meta").get("revision")) ?? 0) !== sync.expectedRevision) {
    tx.abort();
    throw Error("Progress changed while downloading. Try syncing again.");
  }
  const revision =
    Number((await tx.objectStore("meta").get("revision")) ?? 0) + 1;
  if (recovery) {
    const previous: Record<string, unknown> = {};
    for (const name of stores) {
      const values = await tx.objectStore(name).getAll();
      const keys = await tx.objectStore(name).getAllKeys();
      previous[name] =
        name === "meta" || name === "legacy"
          ? Object.fromEntries(keys.map((k, i) => [String(k), values[i]]))
          : values;
    }
    await tx
      .objectStore("recovery")
      .put(
        { data: previous, createdAt: new Date().toISOString(), reason },
        "previous",
      );
  }
  for (const name of stores) {
    const store = tx.objectStore(name);
    await store.clear();
    if (name === "meta" || name === "legacy") {
      for (const [key, value] of Object.entries(data[name]))
        await store.put(value, key);
    } else for (const value of data[name]) await store.put(value, value.id);
  }
  await tx.objectStore("meta").put(revision, "revision");
  if (sync) await tx.objectStore("sync").put(sync.state, "state");
  await tx.done;
}
