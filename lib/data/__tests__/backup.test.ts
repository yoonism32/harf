import "fake-indexeddb/auto";
import { afterEach, beforeEach, it, expect, vi } from "vitest";
vi.mock("../store", () => ({ notifyChange: vi.fn() }));
import { deleteDB } from "idb";
import { closeDB, readData } from "../db";
import { convertLegacy, migrateLegacy } from "../migrate";
import { emptyData } from "../schema";
import {
  validateBackup,
  exportBackup,
  parseImport,
  MAX_IMPORT_BYTES,
  MAX_IMPORT_PARTS,
  replaceFromBackup,
  resetProgress,
  recoverPrevious,
} from "../backup";
beforeEach(async () => {
  await closeDB();
  await deleteDB("harf");
  await migrateLegacy();
});
afterEach(closeDB);
it("archives unmapped roots and migrates valid Names independently", () => {
  const record = {
    id: 1,
    stability: 2,
    difficulty: 5,
    state: 1,
    reps: 1,
    lapses: 0,
    nextReview: "2026-09-22",
    lastReviewed: "2026-09-21T12:00:00Z",
  };
  const data = convertLegacy({
    "harf:v1:word_progress": JSON.stringify({
      root: { ...record, id: "root" },
    }),
    "harf:v1:name_progress": JSON.stringify({ 1: record }),
  });
  expect(data.cards.map((c) => c.id)).toEqual(["names:1"]);
  expect(data.cards[0]!.card.due).toBe("2026-09-22T00:00:00.000Z");
  expect(data.legacy.raw).toBeDefined();
});
it("rejects dangerous object keys before mutation", () => {
  const data = JSON.parse('{"__proto__":{"polluted":true}}');
  expect(() => validateBackup(data)).toThrow("Unsafe object key");
});
it("round-trips ordinary backup and reset recovery", async () => {
  const files = await exportBackup("test");
  const parsed = await parseImport(
    files.map((f) => new File([f.text], f.name)),
  );
  await replaceFromBackup(parsed.backup);
  await resetProgress();
  await recoverPrevious();
  expect((await readData()).meta.schemaVersion).toBe(2);
});
it("rejects arbitrary empty legacy object", async () => {
  await expect(parseImport([new File(["{}"], "empty.json")])).rejects.toThrow();
});
it("rejects malformed legacy sections instead of importing empty progress", async () => {
  for (const value of [null, [], "broken"]) {
    await expect(
      parseImport([
        new File([JSON.stringify({ version: "v1", wordProgress: value })], "legacy.json"),
      ]),
    ).rejects.toThrow();
  }
  await expect(
    parseImport([
      new File([JSON.stringify({ version: "v1", studySessions: {} })], "legacy.json"),
    ]),
  ).rejects.toThrow();
});
it("rejects imports whose aggregate size or part count can exhaust memory", async()=>{
  await expect(parseImport([{size:MAX_IMPORT_BYTES+1} as File])).rejects.toThrow("128 MiB");
  await expect(parseImport(Array.from({length:MAX_IMPORT_PARTS+2},()=>({size:0}) as File))).rejects.toThrow("at most");
});
it("validates finite FSRS fields", () => {
  const data = emptyData();
  const backup = {
    app: "harf",
    schemaVersion: 2,
    contentVersion: "test",
    exportedAt: new Date().toISOString(),
    data,
  };
  expect(validateBackup(backup).schemaVersion).toBe(2);
});
it("validates multipart order, hashes, missing parts without changing active data", async () => {
  const db = await import("../db").then((m) => m.getDB());
  for (let i = 0; i < 8; i++)
    await db.put("legacy", "x".repeat(600), `archive-${i}`);
  const parts = await exportBackup("test", 2200);
  expect(parts.length).toBeGreaterThan(2);
  const files = parts.map((p) => new File([p.text], p.name));
  const result = await parseImport([...files].reverse());
  expect(result.backup.data.legacy["archive-7"]).toBe("x".repeat(600));
  await expect(parseImport(files.slice(1))).rejects.toThrow();
  expect((await readData()).legacy["archive-7"]).toBe("x".repeat(600));
  const corrupt = parts.map(
    (p, i) =>
      new File([i === 0 ? p.text.replace("xxxx", "yyyy") : p.text], p.name),
  );
  await expect(parseImport(corrupt)).rejects.toThrow("damaged");
});
