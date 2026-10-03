import { describe, it, expect } from 'vitest';
import { RECITERS, DEFAULT_RECITER_ID, getReciterUrl, verseAudioUrl, wordAudioUrl } from '../audio';
describe('validated audio URLs', () => {
  it('uses explicit preferences and a safe fallback', () => {
    expect(getReciterUrl('invalid')).toContain(DEFAULT_RECITER_ID);
    expect(verseAudioUrl('2', '255', RECITERS[0]!.id)).toBe(`${RECITERS[0]!.url}/002255.mp3`);
    expect(wordAudioUrl('2', '255', 3)).toContain('/2/002_255_003.mp3');
  });
  it('rejects malformed and nonexistent references', () => {
    for (const [s,a] of [['114','286'], ['../2','1'], ['0','1'], ['2','0']]) expect(() => verseAudioUrl(s!,a!)).toThrow();
    expect(() => wordAudioUrl('1','1',-1)).toThrow();
  });
});

it('uses recorded audio paths without deriving them from a canonical word number',async()=>{
 const {recordedWordAudioUrl}=await import('../audio');
 expect(recordedWordAudioUrl('wbw/002_181_004.mp3')).toBe('https://audio.qurancdn.com/wbw/002_181_004.mp3');
 for(const path of ['../secret','https://evil.example/x','wbw/002_181_004.mp3?x=1'])expect(()=>recordedWordAudioUrl(path)).toThrow();
});
