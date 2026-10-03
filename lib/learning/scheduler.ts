import { createEmptyCard, fsrs, type Card, type Grade } from "ts-fsrs";
import type { CardRecord, SerializedCard } from "../data/schema";
const scheduler = fsrs({
  request_retention: 0.9,
  enable_fuzz: false,
  enable_short_term: true,
  learning_steps: ["1m", "10m"],
  relearning_steps: ["10m"],
});
export function serializeCard(card: Card): SerializedCard {
  return {
    ...card,
    due: card.due.toISOString(),
    last_review: card.last_review?.toISOString(),
  };
}
export function previews(
  card: SerializedCard | null,
  now: Date,
): Record<Grade, SerializedCard> {
  if (!Number.isFinite(now.getTime())) throw Error("Invalid review time");
  if (card?.last_review && Date.parse(card.last_review) > now.getTime())
    throw Error(
      "Your clock is earlier than your last review. Check your device time.",
    );
  const input: Card = card
    ? {
        ...card,
        due: new Date(card.due),
        last_review: card.last_review ? new Date(card.last_review) : undefined,
      }
    : createEmptyCard(now);
  const output = scheduler.repeat(input, now);
  return {
    1: serializeCard(output[1].card),
    2: serializeCard(output[2].card),
    3: serializeCard(output[3].card),
    4: serializeCard(output[4].card),
  };
}
export function schedule(card: SerializedCard | null, grade: Grade, now: Date) {
  return previews(card, now)[grade];
}
export function familiarity(
  record: CardRecord | undefined,
  includePaused = false,
): "New" | "Learning" | "Familiar" | "Paused" {
  if (record?.paused && !includePaused) return "Paused";
  if (!record || record.card.reps === 0) return "New";
  return record.card.state === 2 && record.card.stability >= 21
    ? "Familiar"
    : "Learning";
}
