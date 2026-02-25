/** All verse-audio reciters — sourced from EveryAyah CDN (same as QuranWBW) */
export const RECITERS = [
  { id: 'alafasy',         label: 'Mishary Rashid Alafasy',          url: 'https://everyayah.com/data/Alafasy_128kbps' },
  { id: 'sudais',          label: 'Abdul-Rahman Al-Sudais',           url: 'https://everyayah.com/data/Abdurrahmaan_As-Sudais_192kbps' },
  { id: 'maher',           label: 'Maher Al-Muaiqly',                 url: 'https://everyayah.com/data/MaherAlMuaiqly128kbps' },
  { id: 'basit_murattal',  label: 'Abdul Basit (Murattal)',           url: 'https://everyayah.com/data/Abdul_Basit_Murattal_192kbps' },
  { id: 'basit_mujawwad',  label: 'Abdul Basit (Mujawwad)',           url: 'https://everyayah.com/data/Abdul_Basit_Mujawwad_128kbps' },
  { id: 'husary',          label: 'Mahmoud Khalil Al-Husary',         url: 'https://everyayah.com/data/Husary_128kbps' },
  { id: 'minshawi',        label: 'Mohamed El-Minshawi (Murattal)',   url: 'https://everyayah.com/data/Minshawy_Mujawwad_192kbps' },
  { id: 'shuraym',         label: 'Saood Ash-Shuraym',                url: 'https://everyayah.com/data/Saood_ash-Shuraym_128kbps' },
  { id: 'qatami',          label: 'Nasser Al Qatami',                 url: 'https://everyayah.com/data/Nasser_Alqatami_128kbps' },
  { id: 'dossari',         label: 'Yasser Ad-Dossari',                url: 'https://everyayah.com/data/Yasser_Ad-Dussary_128kbps' },
  { id: 'shaatree',        label: 'Abu Bakr Ash-Shaatree',            url: 'https://everyayah.com/data/Abu%20Bakr%20Ash-Shaatree_128kbps' },
  { id: 'hani',            label: 'Hani Ar-Rifai',                    url: 'https://everyayah.com/data/Hani_Rifai_192kbps' },
] as const;

export type ReciterId = typeof RECITERS[number]['id'];
export const DEFAULT_RECITER_ID: ReciterId = 'alafasy';
export const RECITER_STORAGE_KEY = 'harf-reciter';

/** Returns the base CDN URL for the currently saved reciter */
export function getReciterUrl(): string {
  if (typeof window === 'undefined') return RECITERS[0].url;
  const id = localStorage.getItem(RECITER_STORAGE_KEY) ?? DEFAULT_RECITER_ID;
  return RECITERS.find(r => r.id === id)?.url ?? RECITERS[0].url;
}

/** Build a full verse audio URL — reads reciter from localStorage at call time */
export function verseAudioUrl(ch: string, vs: string): string {
  return `${getReciterUrl()}/${ch.padStart(3, '0')}${vs.padStart(3, '0')}.mp3`;
}

/** Build a WBW word audio URL — fixed reciter (QuranWBW CDN only has one) */
export function wordAudioUrl(ch: string, vs: string, wd: number): string {
  const file = `${ch.padStart(3, '0')}_${vs.padStart(3, '0')}_${String(wd).padStart(3, '0')}.mp3`;
  return `https://audios.quranwbw.com/words/${ch}/${file}?version=2`;
}
