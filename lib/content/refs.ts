import metadata from '@/data/quran-surah-meta.json';
export function parseRef(value: string): { surah: number; ayah: number } | null {
  if (!/^[1-9]\d{0,2}:[1-9]\d{0,2}$/.test(value)) return null;
  const [surah, ayah] = value.split(':').map(Number) as [number, number];
  const chapter = metadata[surah - 1];
  return chapter && ayah <= chapter.verses ? { surah, ayah } : null;
}
export function parseWordKey(value: string) {
  const match = /^([1-9]\d{0,2}:[1-9]\d{0,2}):([1-9]\d{0,2})$/.exec(value);
  const ref = match?.[1];
  return ref && parseRef(ref) ? { ...parseRef(ref)!, position: Number(match![2]), ref } : null;
}
export function adjacentRef(value: string, direction: -1 | 1): string | null {
  const parsed = parseRef(value);
  if (!parsed) return null;
  const { surah, ayah } = parsed;
  if (direction === -1) return ayah > 1 ? `${surah}:${ayah - 1}` : surah > 1 ? `${surah - 1}:${metadata[surah - 2]!.verses}` : null;
  return ayah < metadata[surah - 1]!.verses ? `${surah}:${ayah + 1}` : surah < 114 ? `${surah + 1}:1` : null;
}
