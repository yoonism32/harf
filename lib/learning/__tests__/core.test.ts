import "fake-indexeddb/auto";
import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
vi.mock("../../data/store", () => ({ notifyChange: vi.fn() }));
import { deleteDB } from "idb";
import { closeDB, readData, writeData } from "../../data/db";
import { cardId } from "../../data/schema";
import { convertLegacy, migrateLegacy } from "../../data/migrate";
import {
  startSession,
  beginRecall,
  revealSession,
  commitReview,
  undoReview,
  updateSettings,
  setPaused,
} from "../commands";
import { previews } from "../scheduler";
import { localDate, shiftDate, weekStart } from "../calendar";
import { overlap } from "../metrics";
import { introductions } from "../queue";
beforeEach(async () => {
  await closeDB();
  await deleteDB("harf");
  await migrateLegacy();
});
afterEach(async () => {
  await closeDB();
});
describe("learning integrity", () => {
  it("preserves minute learning steps and does not mutate scheduler input", () => {
    const now = new Date("2026-09-21T12:00:00Z");
    const cards = previews(null, now);
    expect(cards[1].due).toBe("2026-09-21T12:01:00.000Z");
    expect(cards[3].due).toBe("2026-09-21T12:10:00.000Z");
    expect(now.toISOString()).toBe("2026-09-21T12:00:00.000Z");
  });
  it("captures local day and handles calendar arithmetic across DST", () => {
    expect(localDate(new Date("2026-03-29T23:30:00Z"), "Europe/London")).toBe(
      "2026-03-30",
    );
    expect(shiftDate("2026-03-29", 1)).toBe("2026-03-30");
    expect(weekStart("2026-03-29")).toBe("2026-03-23");
  });
  it("commits once per attempt, undoes exact card, retains session", async () => {
    await updateSettings({ dailyNew: 5 });
    let session = await startSession({
      collection: "vocabulary",
      contentVersion: "test",
      entries: [
        { id: "one", order: 1 },
        { id: "two", order: 2 },
      ],
      loadPayload: async () => ({ word: "example" }),
    });
    await beginRecall(session.id);
    session = await revealSession(session.id);
    const input = {
      sessionId: session.id,
      expectedRevision: session.revision,
      attemptId: session.queue[0]!.id,
      grade: 3 as const,
    };
    const first = await commitReview(input);
    const second = await commitReview(input);
    expect(second.id).toBe(first.id);
    let data = await readData();
    expect(data.reviews).toHaveLength(1);
    expect(data.cards).toHaveLength(1);
    await undoReview(session.id);
    data = await readData();
    expect(data.cards).toHaveLength(0);
    expect(data.reviews[0]!.undone).toBe(true);
    expect(data.sessions[0]!.cursor).toBe(0);
  });
  it("limits first introductions to three and reserves one active session", async () => {
    const args = {
      collection: "names" as const,
      contentVersion: "test",
      entries: Array.from({ length: 8 }, (_, i) => ({
        id: String(i + 1),
        order: i,
      })),
      loadPayload: async () => ({}),
    };
    const a = await startSession(args);
    const b = await startSession(args);
    expect(a.queue).toHaveLength(3);
    expect(a.id).toBe(b.id);
  });
  it("does not let card changes invalidate a queued session", async () => {
    const session = await startSession({
      collection: "names",
      contentVersion: "test",
      entries: [{ id: "1", order: 1 }],
      loadPayload: async () => ({}),
    });
    await expect(setPaused("names", "1", true)).rejects.toThrow("active session");
    expect((await readData()).sessions[0]!.id).toBe(session.id);
  });
  it("does not count reviews of migrated cards as new introductions", () => {
    const data = convertLegacy({
      "harf:v1:name_progress": JSON.stringify({
        1: {
          id: 1,
          stability: 30,
          difficulty: 5,
          state: 2,
          reps: 4,
          lapses: 0,
          nextReview: "2026-09-20",
          lastReviewed: "2026-09-19T12:00:00Z",
        },
      }),
    });
    const card = data.cards[0]!;
    data.reviews.push({
      id: "review",
      attemptId: "attempt",
      cardId: card.id,
      sessionId: "legacy",
      timestamp: "2026-09-21T12:00:00.000Z",
      localDate: "2026-09-21",
      timeZone: "UTC",
      grade: 3,
      before: card,
      after: { ...card, revision: 1 },
      undone: false,
    });
    expect(introductions(data, "names", "2026-09-21")).toBe(0);
  });
  it("uses unique positions and null for empty denominators", () => {
    expect(overlap([], [], {}).percentage).toBeNull();
  });
  it("caps a session queue at 20 due cards and introduces nothing new when full", async () => {
    await updateSettings({ dailyNew: 5 });
    const now = new Date("2026-09-21T12:00:00Z");
    const data = await readData();
    data.cards = Array.from({ length: 50 }, (_, i) => ({
      id: cardId("vocabulary", `w${i}`),
      entryId: `w${i}`,
      collection: "vocabulary" as const,
      paused: false,
      contentVersion: "test",
      revision: 0,
      card: {
        due: new Date(now.getTime() - 1000 * (i + 1)).toISOString(),
        stability: 1,
        difficulty: 5,
        elapsed_days: 0,
        scheduled_days: 0,
        learning_steps: 0,
        reps: 1,
        lapses: 0,
        state: 2,
      },
    }));
    await writeData(data, "test");
    const session = await startSession({
      collection: "vocabulary",
      contentVersion: "test",
      entries: Array.from({ length: 50 }, (_, i) => ({ id: `w${i}`, order: i })),
      loadPayload: async () => ({}),
      now,
    });
    expect(session.queue).toHaveLength(20);
    expect(session.queue.every((a) => !a.isNew)).toBe(true);
  });
});
it("rejects stale concurrent grade and invalid command references", async () => {
  const command = await import("../commands");
  let s = await startSession({
    collection: "names",
    contentVersion: "test",
    entries: [
      { id: "1", order: 1 },
      { id: "2", order: 2 },
    ],
    loadPayload: async () => ({}),
  });
  await beginRecall(s.id);
  s = await revealSession(s.id);
  await expect(
    commitReview({
      sessionId: s.id,
      expectedRevision: 0,
      attemptId: s.queue[0]!.id,
      grade: 3,
    }),
  ).rejects.toThrow("another tab");
  expect((await readData()).reviews).toHaveLength(0);
  await expect(command.toggleBookmark("115:1")).rejects.toThrow("Invalid");
  await expect(command.saveNote("bad/id", "memo")).rejects.toThrow("Invalid");
});
