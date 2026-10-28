import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../data/store", () => ({ notifyChange: vi.fn() }));

import { deleteDB } from "idb";
import { closeDB, readData, writeData } from "../../data/db";
import { migrateLegacy } from "../../data/migrate";
import { rememberPassage, reviewPassage, undoPassageReview } from "../passage-commands";
import { duePassageCards, passageId } from "../passage-model";

beforeEach(async () => {
  await closeDB();
  await deleteDB("harf");
  await migrateLegacy();
});

afterEach(closeDB);

describe("saved passage practice", () => {
  it("keeps only unpaused due pairs in due-time order", async () => {
    await rememberPassage("1:1", "1:2", "test");
    await rememberPassage("1:3", "1:4", "test");
    await rememberPassage("1:5", "1:6", "test");
    const data = await readData();
    data.passageCards[0] = { ...data.passageCards[0]!, card: { ...data.passageCards[0]!.card, due: "2026-09-21T10:00:00.000Z" } };
    data.passageCards[1] = { ...data.passageCards[1]!, paused: true, card: { ...data.passageCards[1]!.card, due: "2026-09-21T09:00:00.000Z" } };
    data.passageCards[2] = { ...data.passageCards[2]!, card: { ...data.passageCards[2]!.card, due: "2026-09-21T08:00:00.000Z" } };
    await writeData(data, "test", false);

    expect(duePassageCards(data.passageCards, new Date("2026-09-21T12:00:00Z")).map(card => card.id)).toEqual([
      passageId("1:5", "1:6"),
      passageId("1:1", "1:2"),
    ]);
  });

  it("commits an attempt once, rejects a stale grade, and returns the restored card after undo", async () => {
    const id = await rememberPassage("1:1", "1:2", "test");
    const now = new Date("2026-09-21T12:00:00Z");
    const data = await readData();
    data.passageCards[0] = { ...data.passageCards[0]!, card: { ...data.passageCards[0]!.card, due: "2026-09-21T11:00:00.000Z" } };
    await writeData(data, "test", false);
    const first = await reviewPassage({ id, attemptId: "attempt-one", expectedRevision: 0, grade: 3 }, now);
    const repeated = await reviewPassage({ id, attemptId: "attempt-one", expectedRevision: 0, grade: 3 }, now);

    expect(repeated.id).toBe(first.id);
    await expect(reviewPassage({ id, attemptId: "attempt-two", expectedRevision: 0, grade: 3 }, now)).rejects.toThrow("another tab");
    const restored = await undoPassageReview(first.id);
    expect(restored.revision).toBe(2);
    expect((await readData()).passageReviews[0]!.undone).toBe(true);
  });
});
