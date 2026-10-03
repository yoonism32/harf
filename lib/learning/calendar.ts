export function localDate(
  now: Date,
  timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone,
) {
  const p = Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  return ["year", "month", "day"]
    .map((type) => p.find((part) => part.type === type)!.value)
    .join("-");
}
export function shiftDate(date: string, days: number) {
  const [y, m, d] = date.split("-").map(Number);
  const value = new Date(Date.UTC(y!, m! - 1, d! + days));
  return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, "0")}-${String(value.getUTCDate()).padStart(2, "0")}`;
}
export function weekStart(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  const day = new Date(Date.UTC(y!, m! - 1, d!)).getUTCDay();
  return shiftDate(date, -((day + 6) % 7));
}
