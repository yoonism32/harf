const CDN = 'https://cdn.jsdelivr.net/gh/fawazahmed0/quran-api@1/editions';

// Editions used
const AR_EDITION  = 'ara-quranacademy';      // Uthmani-style Arabic
const EN_EDITION  = 'eng-muhammadtaqiudd';   // Hilali & Khan (Noble Quran)

export interface AyahResponse {
  arabic: string;
  english: string;
  reference: string;    // "2:255"
  surahNumber: number;
  ayahNumber: number;
  surahName: string;
}

// Surah names (static — avoids extra fetch)
import { SURAHS } from './coverage';

function surahName(n: number): string {
  return SURAHS.find(s => s.number === n)?.name ?? `Surah ${n}`;
}

const ayahCache = new Map<string, AyahResponse>();

/** Fetch a single ayah (client-side cached — same ref never fetched twice) */
export async function fetchAyah(ref: string): Promise<AyahResponse | null> {
  if (ayahCache.has(ref)) return ayahCache.get(ref)!;
  const [s, a] = ref.split(':');
  // Validate both parts are positive integers before using in URLs
  if (!s || !a || !/^\d+$/.test(s) || !/^\d+$/.test(a)) return null;
  try {
    const [arRes, enRes] = await Promise.all([
      fetch(`${CDN}/${AR_EDITION}/${s}/${a}.min.json`),
      fetch(`${CDN}/${EN_EDITION}/${s}/${a}.min.json`),
    ]);
    if (!arRes.ok || !enRes.ok) return null;
    const [ar, en] = await Promise.all([arRes.json(), enRes.json()]);
    const result: AyahResponse = {
      arabic: ar.text,
      english: en.text,
      reference: `${s}:${a}`,
      surahNumber: Number(s),
      ayahNumber: Number(a),
      surahName: surahName(Number(s)),
    };
    ayahCache.set(ref, result);
    return result;
  } catch {
    return null;
  }
}

/** Fetch multiple ayahs in parallel — uses allSettled so partial failures don't block all results */
export async function fetchWordVerses(refs: string[]): Promise<AyahResponse[]> {
  const results = await Promise.allSettled(refs.map(fetchAyah));
  return results
    .filter((r): r is PromiseFulfilledResult<AyahResponse> => r.status === 'fulfilled' && r.value !== null)
    .map(r => r.value);
}

/** Deterministic daily ayah — cycles through all 6236 ayahs by day of year */
export function getDailyAyahRef(): string {
  const now   = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const day   = Math.floor((now.getTime() - start.getTime()) / 86400000);
  const idx   = (day % 6236) + 1;

  let cum = 0;
  for (const surah of SURAHS) {
    cum += surah.ayahs;
    if (idx <= cum) return `${surah.number}:${idx - (cum - surah.ayahs)}`;
  }
  return '1:1';
}

/** Fetch first N verses of a surah */
export async function fetchSurahVerses(surah: number, limit = 5): Promise<AyahResponse[]> {
  const refs = Array.from({ length: limit }, (_, i) => `${surah}:${i + 1}`);
  return fetchWordVerses(refs);
}
