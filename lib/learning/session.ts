import type { StudySession } from "../data/schema";
export function finishSession(
  session: StudySession,
  status: "ended" | "completed",
  now: Date,
): StudySession {
  return {
    ...session,
    status,
    phase: "complete",
    previewAt: null,
    lastUndoEvent: null,
    updatedAt: now.toISOString(),
    queue: session.queue.map(({ payload: _, ...attempt }) => attempt),
  };
}
