import {afterEach,describe,expect,it,vi} from 'vitest';
import {playAudio,stopAudio,getAudioState,setPlaybackSpeed,verseAudioUrl} from '../audio';
class FakeAudio {
 static instance:FakeAudio;
 src='';crossOrigin='';defaultPlaybackRate=1;playbackRate=1;
 onended:(()=>void)|null=null;onerror:(()=>void)|null=null;onplaying:(()=>void)|null=null;
 constructor(){FakeAudio.instance=this;}
 async play(){this.onplaying?.();}
 pause(){}
 load(){}
 removeAttribute(){this.src='';}
}
vi.stubGlobal('Audio',FakeAudio);
afterEach(()=>stopAudio());
describe('reader range playback',()=>{
 it('resumes without advancing, changes speed live, and advances only on completion',async()=>{
  const next=vi.fn(),url=verseAudioUrl('11','102');
  await playAudio(url,0.75,next);
  expect(getAudioState().status).toBe('playing');
  await playAudio(url,0.75,next);
  expect(getAudioState().status).toBe('paused');
  expect(next).not.toHaveBeenCalled();
  await playAudio(url,0.75,next);
  setPlaybackSpeed(1.25);
  expect(FakeAudio.instance.playbackRate).toBe(1.25);
  FakeAudio.instance.onended?.();
  expect(next).toHaveBeenCalledTimes(1);
  expect(getAudioState().status).toBe('idle');
 });
 it('cancels stale completion callbacks when stopped or replaced by word audio',async()=>{
  const next=vi.fn();await playAudio(verseAudioUrl('1','1'),1,next);
  const ended=FakeAudio.instance.onended;stopAudio();ended?.();
  expect(next).not.toHaveBeenCalled();
  await playAudio(verseAudioUrl('1','1'),1,next);
  const replaced=FakeAudio.instance.onended;
  await playAudio('https://audio.qurancdn.com/wbw/001_001_001.mp3');replaced?.();
  expect(next).not.toHaveBeenCalled();
 }); it('applies fine slider speeds and rejects rates off the slider grid',async()=>{
  await playAudio(verseAudioUrl('2','1'),1.05);
  expect(FakeAudio.instance.playbackRate).toBe(1.05);
  setPlaybackSpeed(1.15);
  expect(FakeAudio.instance.playbackRate).toBe(1.15);
  expect(()=>setPlaybackSpeed(1.12)).toThrow();
  expect(()=>setPlaybackSpeed(0.45)).toThrow();
 });
 it('does not advance a failed recording and rejects unsupported speeds',async()=>{
  const next=vi.fn();await playAudio(verseAudioUrl('1','1'),1,next);
  FakeAudio.instance.onerror?.();FakeAudio.instance.onended?.();
  expect(getAudioState().status).toBe('error');expect(next).not.toHaveBeenCalled();
  expect(()=>setPlaybackSpeed(8)).toThrow();
 });
});
