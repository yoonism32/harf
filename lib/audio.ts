import recitersRaw from '@/data/ea_reciters.json';
import surahs from '@/data/quran-surah-meta.json';
export const DEFAULT_RECITER_ID = 'Alafasy_128kbps';
export const RECITER_STORAGE_KEY = 'harf-reciter';
export const RECITERS = recitersRaw.map(r => ({ ...r, url: `https://everyayah.com/data/${r.id}` }));
export type ReciterId = string;
export function getReciterUrl(id = DEFAULT_RECITER_ID): string { return RECITERS.find(r => r.id === id)?.url ?? `https://everyayah.com/data/${DEFAULT_RECITER_ID}`; }
function validate(ch: string, vs: string) {
  if (!/^\d+$/.test(ch) || !/^\d+$/.test(vs) || +ch < 1 || +ch > 114 || +vs < 1 || +vs > surahs[+ch - 1]!.verses) throw new Error('Invalid ayah reference');
}
export function verseAudioUrl(ch: string, vs: string, reciter = DEFAULT_RECITER_ID): string {
  validate(ch, vs); return `${getReciterUrl(reciter)}/${ch.padStart(3, '0')}${vs.padStart(3, '0')}.mp3`;
}
export function wordAudioUrl(ch: string, vs: string, wd: number): string {
  validate(ch, vs);
  if (!Number.isInteger(wd) || wd < 1 || wd > 500) throw new Error('Invalid word position');
  return `https://audios.quranwbw.com/words/${ch}/${ch.padStart(3, '0')}_${vs.padStart(3, '0')}_${String(wd).padStart(3, '0')}.mp3?version=2`;
}
// Use the recorded source path: audio filenames are not reliably equal to displayed word positions.
export function recordedWordAudioUrl(path:string):string {
 if(!/^wbw\/\d{3}_\d{3}_\d{3}\.mp3$/.test(path))throw Error('Invalid word audio path');
 return `https://audio.qurancdn.com/${path}`;
}
export type AudioState = { url: string | null; status: 'idle' | 'loading' | 'playing' | 'paused' | 'error'; error?: string };
let player: HTMLAudioElement | undefined;
let generation = 0;
let timer: ReturnType<typeof setTimeout> | undefined;
const idle: AudioState = { url: null, status: 'idle' };
let snapshot = idle;
const listeners = new Set<() => void>();
function publish(value: AudioState) { snapshot = value; listeners.forEach(fn => fn()); }
export const getAudioState = () => snapshot;
export const getServerAudioState = () => idle;
export function subscribeAudio(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; }
export function stopAudio() {
  generation++; clearTimeout(timer);
  if (player) { player.pause(); player.removeAttribute('src'); player.load(); }
  publish(idle);
}
export async function playAudio(url: string) {
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:' || !['everyayah.com', 'audios.quranwbw.com', 'audio.qurancdn.com'].includes(parsed.hostname)) throw new Error('Unsupported audio source');
  if (snapshot.url === url && snapshot.status === 'playing') { clearTimeout(timer); player?.pause(); publish({ url, status: 'paused' }); return; }
  if (snapshot.url === url && snapshot.status === 'paused' && player) {
    const token = generation;
    try { await player.play(); if (token === generation) publish({ url, status: 'playing' }); } catch { if (token === generation) publish({ url, status: 'error', error: 'Audio could not load. Try again.' }); }
    return;
  }
  stopAudio(); const token = generation; player ??= new Audio();
  const fail = () => { if (token === generation) { clearTimeout(timer); generation++; player?.pause(); publish({ url, status: 'error', error: 'Audio could not load. Try again.' }); } };
  player.onended = () => { if (token === generation) stopAudio(); };
  player.onerror = fail;
  player.onplaying = () => { if (token === generation) { clearTimeout(timer); publish({ url, status: 'playing' }); } };
  publish({ url, status: 'loading' }); player.src = url; timer = setTimeout(fail, 12_000);
  try { await player.play(); } catch { fail(); }
}
