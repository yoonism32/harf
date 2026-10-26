import {describe,expect,it} from 'vitest';
import {audioSourceDetail,reciterDetail,verseAudioUrl,recordedWordAudioUrl} from '../audio';
describe('audio source labels',()=>{
 it('names the ayah reciter and stated bitrate',()=>{
  expect(reciterDetail('Alafasy_128kbps')).toBe('Alafasy · 128 kbps');
  expect(audioSourceDetail(verseAudioUrl('1','1','Alafasy_64kbps'))).toBe('Alafasy · 64 kbps');
 });
 it('never shows a raw id and distinguishes the fixed word voice',()=>{
  expect(reciterDetail('translations/urdu_farhat_hashmi')).toBe('Farhat Hashmi (w/ Urdu translations)');
  expect(reciterDetail('translations/urdu_shamshad_ali_khan_46kbps')).toBe('Shamshad Ali Khan (w/ Urdu translations) · 46 kbps');
  expect(audioSourceDetail(recordedWordAudioUrl('wbw/036_028_001.mp3'))).toBe('Word recording (fixed voice)');
  expect(audioSourceDetail('https://example.com/x.mp3')).toBeNull();
 });
});
