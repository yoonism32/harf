import recitersRaw from '@/data/ea_reciters.json';
import surahs from '@/data/quran-surah-meta.json';
export const DEFAULT_RECITER_ID = 'Alafasy_128kbps';
export const RECITER_STORAGE_KEY = 'harf-reciter';
export const RECITERS = recitersRaw.map(r => ({ ...r, url: `https://everyayah.com/data/${r.id}` }));
export type ReciterId = string;
/** "Alafasy · 128 kbps"; bitrate only when the recording id states it. */
export function reciterDetail(id: string): string {
  const reciter = RECITERS.find(r => r.id === id); const kbps = id.match(/(\d+)kbps/i)?.[1];
  return [reciter?.label ?? 'Unknown reciter', kbps && `${kbps} kbps`].filter(Boolean).join(' · ');
}
/** Short source note for a playable URL: the ayah reciter, or the fixed word-recording voice. */
export function audioSourceDetail(url: string): string | null {
  const ayah = url.match(/^https:\/\/everyayah\.com\/data\/(.+)\/\d{6}\.mp3$/)?.[1];
  if (ayah) return reciterDetail(ayah);
  return /^https:\/\/audio\.qurancdn\.com\/wbw\//.test(url) ? 'Word recording (fixed voice)' : null;
}
export function getReciterUrl(id = DEFAULT_RECITER_ID): string { return RECITERS.find(r => r.id === id)?.url ?? `https://everyayah.com/data/${DEFAULT_RECITER_ID}`; }
function validate(ch: string, vs: string) {
  if (!/^\d+$/.test(ch) || !/^\d+$/.test(vs) || +ch < 1 || +ch > 114 || +vs < 1 || +vs > surahs[+ch - 1]!.verses) throw new Error('Invalid ayah reference');
}
export function verseAudioUrl(ch: string, vs: string, reciter = DEFAULT_RECITER_ID): string {
  validate(ch, vs); return `${getReciterUrl(reciter)}/${ch.padStart(3, '0')}${vs.padStart(3, '0')}.mp3`;
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
// The reader speed slider: 0.5–1.5 in 0.05 steps, which keeps every legacy stop (0.75, 1.25 …) on the grid.
export const SPEED_MIN = 0.5;
export const SPEED_MAX = 1.5;
export const SPEED_STEP = 0.05;
/** The original Harf speed stops, shown as labelled ticks on the slider. */
export const SPEED_STOPS = [0.5, 0.75, 1, 1.25, 1.5];
function validSpeed(rate: number): boolean {
  return rate >= SPEED_MIN && rate <= SPEED_MAX && Math.abs(rate / SPEED_STEP - Math.round(rate / SPEED_STEP)) < 1e-6;
}
export async function playAudio(url: string, playbackRate = 1, onEnded?: () => void) {
  if (!validSpeed(playbackRate)) throw new Error('Unsupported playback speed');
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:' || !['everyayah.com', 'audios.quranwbw.com', 'audio.qurancdn.com'].includes(parsed.hostname)) throw new Error('Unsupported audio source');
  // Assigning src resets playbackRate to defaultPlaybackRate, so set both on every play.
  if (player) { player.defaultPlaybackRate = playbackRate; player.playbackRate = playbackRate; }
  if (snapshot.url === url && snapshot.status === 'playing') { clearTimeout(timer); player?.pause(); publish({ url, status: 'paused' }); return; }
  if (snapshot.url === url && snapshot.status === 'paused' && player) {
    const token = generation;
    try { await player.play(); if (token === generation) publish({ url, status: 'playing' }); } catch { if (token === generation) publish({ url, status: 'error', error: 'Audio could not load. Try again.' }); }
    return;
  }
  stopAudio(); const token = generation; player ??= new Audio();
  // CORS mode keeps playback alive when an extension routes media through Web Audio (Firefox silences opaque sources).
  player.crossOrigin = 'anonymous'; player.defaultPlaybackRate = playbackRate; player.playbackRate = playbackRate;
  const fail = () => { if (token === generation) { clearTimeout(timer); generation++; player?.pause(); publish({ url, status: 'error', error: 'Audio could not load. Try again.' }); } };
  player.onended = () => { if (token === generation) { stopAudio(); onEnded?.(); } };
  player.onerror = fail;
  player.onplaying = () => { if (token === generation) { clearTimeout(timer); publish({ url, status: 'playing' }); } };
  publish({ url, status: 'loading' }); player.src = url; timer = setTimeout(fail, 12_000);
  try { await player.play(); } catch { fail(); }
}

export function setPlaybackSpeed(rate:number){
 if(!validSpeed(rate))throw Error('Unsupported playback speed');
 if(player){player.defaultPlaybackRate=rate;player.playbackRate=rate;}
}
