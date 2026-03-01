import recitersRaw from '@/data/ea_reciters.json';

const CDN_BASE = 'https://everyayah.com/data';

/** All verse-audio reciters sourced from EveryAyah CDN (ea_reciters.json) */
export const RECITERS = (recitersRaw as Array<{ id: string; label: string }>).map(r => ({
  id: r.id,
  label: r.label,
  /** Constructed CDN base URL — e.g. https://everyayah.com/data/Alafasy_128kbps */
  url: `${CDN_BASE}/${r.id}`,
}));

export type ReciterId = string;
export const DEFAULT_RECITER_ID = 'Alafasy_128kbps';
export const RECITER_STORAGE_KEY = 'harf-reciter';

function getCurrentReciterId(): string {
  if (typeof window === 'undefined') return DEFAULT_RECITER_ID;
  const stored = localStorage.getItem(RECITER_STORAGE_KEY);
  if (stored && RECITERS.some(r => r.id === stored)) return stored;
  return DEFAULT_RECITER_ID;
}

/** Returns the base CDN URL for the currently saved reciter */
export function getReciterUrl(): string {
  return `${CDN_BASE}/${getCurrentReciterId()}`;
}

/** Build a full verse audio URL — reads reciter from localStorage at call time */
export function verseAudioUrl(ch: string, vs: string): string {
  return `${CDN_BASE}/${getCurrentReciterId()}/${ch.padStart(3, '0')}${vs.padStart(3, '0')}.mp3`;
}

/** Build a WBW word audio URL — fixed reciter (QuranWBW CDN only has one) */
export function wordAudioUrl(ch: string, vs: string, wd: number): string {
  const file = `${ch.padStart(3, '0')}_${vs.padStart(3, '0')}_${String(wd).padStart(3, '0')}.mp3`;
  return `https://audios.quranwbw.com/words/${ch}/${file}?version=2`;
}
