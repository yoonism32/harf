import {
  cardId,
  type Collection,
  type DataSnapshot,
  type StudySession,
} from "../data/schema";
import { localDate } from "./calendar";
export type CourseItem = { id: string; order: number };
export function introductions(
  data: DataSnapshot,
  collection: Collection,
  date: string,
) {
  const first = new Map<string, string>();
  for (const event of data.reviews
    .filter(
      (e) =>
        !e.undone &&
        e.after.collection === collection &&
        (!e.before || e.before.card.reps === 0),
    )
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp)))
    if (!first.has(event.cardId)) first.set(event.cardId, event.localDate);
  return [...first.values()].filter((d) => d === date).length;
}
export function buildQueue(
  data: DataSnapshot,
  collection: Collection,
  entries: CourseItem[],
  now: Date,
) {
  const allowed = new Set(entries.map((e) => e.id));
  const cards = data.cards.filter(
    (c) => c.collection === collection && allowed.has(c.entryId),
  );
  const due = cards
    .filter((c) => !c.paused && Date.parse(c.card.due) <= now.getTime())
    .sort(
      (a, b) =>
        a.card.due.localeCompare(b.card.due) || a.id.localeCompare(b.id),
    )
    .slice(0, 20);
  const settings = data.meta.settings as {
    dailyNew: number;
    namesDailyNew: number;
  };
  const limit =
    collection === "names" ? settings.namesDailyNew : settings.dailyNew;
  const hadReviews = data.reviews.some(
    (e) => !e.undone && e.after.collection === collection,
  );
  const remaining = Math.max(
    0,
    Math.min(
      hadReviews ? limit : Math.min(3, limit),
      limit - introductions(data, collection, localDate(now)),
    ),
  );
  const known = new Set(cards.map((c) => c.entryId));
  const priority = (data.meta.priorityEntries as string[] | undefined) ?? [];
  const fresh = entries
    .filter((e) => !known.has(e.id))
    .sort((a, b) => {
      const pa = priority.indexOf(a.id),
        pb = priority.indexOf(b.id);
      return (
        (pa < 0 ? Infinity : pa) - (pb < 0 ? Infinity : pb) ||
        a.order - b.order ||
        a.id.localeCompare(b.id)
      );
    })
    .slice(0, Math.min(20 - due.length, remaining));
  return [
    ...due.map((c) => ({ entryId: c.entryId, cardId: c.id, isNew: false })),
    ...fresh.map((e) => ({
      entryId: e.id,
      cardId: cardId(collection, e.id),
      isNew: true,
    })),
  ];
}
export function currentAttempt(session: StudySession) {
  return session.queue[session.cursor];
}
