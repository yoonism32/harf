import { normalizeArabic } from "./match";
import type { SearchMode } from "../content/schema";
function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
const ALEF = "[اأإآٱ]";
const YA = "[يى]";
const DIACRITICS = "[\\u064B-\\u065F\\u0670\\u06D6-\\u06ED\\u0640]*";
function arabicPattern(token: string) {
  return (
    DIACRITICS +
    [...token]
      .map((ch) => (ch === "ا" ? ALEF : ch === "ي" ? YA : escapeRegExp(ch)))
      .join(DIACRITICS) +
    DIACRITICS
  );
}
export type Range = [number, number];
export function highlightRanges(
  text: string,
  query: string,
  mode: SearchMode,
): Range[] {
  const tokens = (
    mode === "arabic" ? normalizeArabic(query) : query.trim().toLowerCase()
  )
    .split(/\s+/)
    .filter(Boolean);
  if (!tokens.length) return [];
  const pattern = tokens
    .map((t) => (mode === "arabic" ? arabicPattern(t) : escapeRegExp(t)))
    .join("|");
  let matches: RegExpMatchArray[];
  try {
    matches = [...text.matchAll(new RegExp(pattern, mode === "arabic" ? "gu" : "giu"))];
  } catch {
    return [];
  }
  const ranges = matches
    .filter((m) => m[0])
    .map((m) => [m.index!, m.index! + m[0].length] as Range)
    .sort((a, b) => a[0] - b[0]);
  const merged: Range[] = [];
  for (const [start, end] of ranges) {
    const last = merged.at(-1);
    if (last && start <= last[1]) last[1] = Math.max(last[1], end);
    else merged.push([start, end]);
  }
  return merged;
}
export function splitHighlighted(text: string, ranges: Range[]) {
  const segments: { text: string; match: boolean }[] = [];
  let cursor = 0;
  for (const [start, end] of ranges) {
    if (start > cursor) segments.push({ text: text.slice(cursor, start), match: false });
    segments.push({ text: text.slice(start, end), match: true });
    cursor = end;
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor), match: false });
  return segments;
}
