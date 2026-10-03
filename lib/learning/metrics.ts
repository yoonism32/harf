import type { CardRecord, ReviewEvent } from "../data/schema";
import { familiarity } from "./scheduler";
import { localDate, shiftDate, weekStart } from "./calendar";
export function activity(events: ReviewEvent[], now = new Date()) {
  const today = localDate(now);
  const start = weekStart(today);
  const current = events.filter((e) => !e.undone);
  const week = current.filter(
    (e) => e.localDate >= start && e.localDate <= today,
  );
  return {
    reviewedThisWeek: new Set(week.map((e) => e.cardId)).size,
    studyDaysThisWeek: new Set(week.map((e) => e.localDate)).size,
    days: Array.from({ length: 28 }, (_, i) => {
      const date = shiftDate(today, i - 27);
      return {
        date,
        count: current.filter((e) => e.localDate === date).length,
      };
    }),
  };
}
export function overlap(
  cards: CardRecord[],
  wordKeys: string[],
  occurrences: Record<string, string[]>,
) {
  const words = new Set(wordKeys);
  const familiar = new Set(
    cards
      .filter(
        (c) =>
          c.collection === "vocabulary" && familiarity(c, true) === "Familiar",
      )
      .flatMap((c) => occurrences[c.entryId] ?? []),
  );
  const numerator = [...familiar].filter((k) => words.has(k)).length;
  return {
    numerator,
    denominator: words.size,
    percentage: words.size ? (100 * numerator) / words.size : null,
  };
}
