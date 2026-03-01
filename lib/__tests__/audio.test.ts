import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  RECITERS,
  DEFAULT_RECITER_ID,
  RECITER_STORAGE_KEY,
  getReciterUrl,
  verseAudioUrl,
  wordAudioUrl,
} from '../audio';

// ── localStorage mock (audio.ts reads from it via getReciterUrl) ──
const store: Record<string, string> = {};
const localStorageMock = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => { store[key] = value; },
  removeItem: (key: string) => { delete store[key]; },
  clear: () => { for (const k in store) delete store[k]; },
  get length() { return Object.keys(store).length; },
  key: (i: number) => Object.keys(store)[i] ?? null,
};
vi.stubGlobal('window', {});
vi.stubGlobal('localStorage', localStorageMock);

beforeEach(() => { localStorageMock.clear(); });

// ── RECITERS ──────────────────────────────────────────────────
describe('RECITERS', () => {
  it('contains at least one reciter', () => {
    expect(RECITERS.length).toBeGreaterThan(0);
  });

  it('every reciter has id, label, and url', () => {
    for (const r of RECITERS) {
      expect(r.id).toBeTruthy();
      expect(r.label).toBeTruthy();
      expect(r.url).toMatch(/^https:\/\/everyayah\.com\/data\//);
    }
  });

  it('DEFAULT_RECITER_ID exists in RECITERS', () => {
    expect(RECITERS.some(r => r.id === DEFAULT_RECITER_ID)).toBe(true);
  });

  it('all ids are unique', () => {
    const ids = RECITERS.map(r => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

// ── getReciterUrl ─────────────────────────────────────────────
describe('getReciterUrl', () => {
  it('returns default reciter URL when nothing is stored', () => {
    expect(getReciterUrl()).toBe(`https://everyayah.com/data/${DEFAULT_RECITER_ID}`);
  });

  it('returns URL for stored reciter id', () => {
    const target = RECITERS[1]!;
    localStorageMock.setItem(RECITER_STORAGE_KEY, target.id);
    expect(getReciterUrl()).toBe(target.url);
  });

  it('falls back to default reciter for unknown stored id', () => {
    localStorageMock.setItem(RECITER_STORAGE_KEY, 'unknown-id');
    expect(getReciterUrl()).toBe(`https://everyayah.com/data/${DEFAULT_RECITER_ID}`);
  });
});

// ── verseAudioUrl ─────────────────────────────────────────────
describe('verseAudioUrl', () => {
  it('produces correct format: <base>/<ch3d><vs3d>.mp3', () => {
    const reciter = RECITERS[0]!;
    localStorageMock.setItem(RECITER_STORAGE_KEY, reciter.id);
    const url = verseAudioUrl('2', '255');
    expect(url).toBe(`https://everyayah.com/data/${reciter.id}/002255.mp3`);
  });

  it('zero-pads surah number to 3 digits', () => {
    localStorageMock.setItem(RECITER_STORAGE_KEY, RECITERS[0]!.id);
    const url = verseAudioUrl('1', '1');
    expect(url).toContain('001001.mp3');
  });

  it('handles large surah/ayah numbers without padding', () => {
    localStorageMock.setItem(RECITER_STORAGE_KEY, RECITERS[0]!.id);
    const url = verseAudioUrl('114', '286');
    expect(url).toContain('114286.mp3');
  });

  it('ends with .mp3', () => {
    const url = verseAudioUrl('2', '1');
    expect(url).toMatch(/\.mp3$/);
  });
});

// ── wordAudioUrl ──────────────────────────────────────────────
describe('wordAudioUrl', () => {
  it('produces correct WBW CDN format', () => {
    const url = wordAudioUrl('2', '255', 3);
    expect(url).toBe('https://audios.quranwbw.com/words/2/002_255_003.mp3?version=2');
  });

  it('zero-pads all three segments to 3 digits', () => {
    const url = wordAudioUrl('1', '1', 1);
    expect(url).toContain('001_001_001.mp3');
  });

  it('includes version=2 query param', () => {
    const url = wordAudioUrl('3', '10', 5);
    expect(url).toContain('?version=2');
  });

  it('uses the correct CDN base URL', () => {
    const url = wordAudioUrl('2', '1', 1);
    expect(url).toMatch(/^https:\/\/audios\.quranwbw\.com\/words\//);
  });
});
