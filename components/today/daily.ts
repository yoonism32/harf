import type { Surah } from '@/lib/content/schema';

/** Select one canonical ayah for a local calendar date. */
export function dailyAyahReference(date: string, surahs: Surah[]) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || surahs.length !== 114) {
    throw new Error('Daily ayah data is unavailable');
  }
  let hash = 2166136261;
  for (const character of date) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  let position = (hash >>> 0) % surahs.reduce((sum, surah) => sum + surah.ayahCount, 0);
  for (const surah of surahs) {
    if (position < surah.ayahCount) return `${surah.number}:${position + 1}`;
    position -= surah.ayahCount;
  }
  throw new Error('Daily ayah data is unavailable');
}
