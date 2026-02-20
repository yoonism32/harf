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

/** Fetch a single ayah */
export async function fetchAyah(ref: string): Promise<AyahResponse | null> {
  const [s, a] = ref.split(':');
  if (!s || !a) return null;
  try {
    const [arRes, enRes] = await Promise.all([
      fetch(`${CDN}/${AR_EDITION}/${s}/${a}.min.json`, { next: { revalidate: 86400 } }),
      fetch(`${CDN}/${EN_EDITION}/${s}/${a}.min.json`, { next: { revalidate: 86400 } }),
    ]);
    if (!arRes.ok || !enRes.ok) return null;
    const [ar, en] = await Promise.all([arRes.json(), enRes.json()]);
    return {
      arabic: ar.text,
      english: en.text,
      reference: `${s}:${a}`,
      surahNumber: Number(s),
      ayahNumber: Number(a),
      surahName: surahName(Number(s)),
    };
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

  const lengths = [
    7,286,200,176,120,165,206,75,129,109,123,111,43,52,99,128,111,110,98,135,
    112,78,118,64,77,227,93,88,69,60,34,30,73,54,45,83,182,88,75,85,54,53,89,
    59,37,35,38,29,18,45,60,49,62,55,78,96,29,22,24,13,14,11,11,18,12,12,30,
    52,52,44,28,28,20,56,40,31,50,40,46,42,29,19,36,25,22,17,19,26,30,20,15,
    21,11,8,8,19,5,8,8,11,11,8,3,9,5,4,7,3,6,3,5,4,5,6,
  ];
  let cum = 0;
  for (let i = 0; i < lengths.length; i++) {
    const len = lengths[i] ?? 0;
    cum += len;
    if (idx <= cum) return `${i + 1}:${idx - (cum - len)}`;
  }
  return '1:1';
}

/** Fetch first N verses of a surah */
export async function fetchSurahVerses(surah: number, limit = 5): Promise<AyahResponse[]> {
  const refs = Array.from({ length: limit }, (_, i) => `${surah}:${i + 1}`);
  return fetchWordVerses(refs);
}
