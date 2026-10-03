import {describe,expect,it} from 'vitest';
import {defaultSettings,prayerLocationSchema,settingsSchema} from '@/lib/data/schema';
import {formatPrayerTime,nextPrayer,type PrayerTimes} from '../client';

const times:PrayerTimes={timings:{Fajr:'05:00',Sunrise:'06:30',Dhuhr:'12:10',Asr:'15:20',Maghrib:'18:00',Isha:'19:30'},readableDate:'1 Jan 2026',hijriDate:'12 Rajab 1447',timeZone:'UTC'};
describe('prayer utility boundaries',()=>{
 it('validates and trims an optional location while old settings default to off',()=>{
  expect(prayerLocationSchema.parse({city:' London ',country:' United Kingdom '})).toEqual({city:'London',country:'United Kingdom'});
  expect(()=>prayerLocationSchema.parse({city:'https://example.com',country:'GB'})).toThrow();
  expect(settingsSchema.parse({...defaultSettings,prayerLocation:undefined}).prayerLocation).toBeNull();
 });
 it('finds the next obligatory prayer in the location time zone',()=>{
  expect(nextPrayer(times,new Date('2026-01-01T12:00:00Z'))).toEqual({name:'Dhuhr',time:'12:10',tomorrow:false});
  expect(nextPrayer(times,new Date('2026-01-01T20:00:00Z'))).toEqual({name:'Fajr',time:'05:00',tomorrow:true});
  expect(formatPrayerTime('00:05')).toBe('12:05 am');
 });
});
