import {afterEach,describe,expect,it,vi} from 'vitest';
import {defaultSettings,prayerLocationSchema,settingsSchema} from '@/lib/data/schema';
import {lookupCoordinates} from '../client';
import {formatPrayerTime,nextPrayer,type PrayerTimes} from '../times';

const times:PrayerTimes={timings:{Fajr:'05:00',Sunrise:'06:30',Dhuhr:'12:10',Asr:'15:20',Maghrib:'18:00',Isha:'19:30'},readableDate:'1 Jan 2026',hijriDate:'12 Rajab 1447',timeZone:'UTC'};
const leeds={name:'Leeds',latitude:53.79648,longitude:-1.54785,timezone:'Europe/London',country:'United Kingdom',country_code:'GB'};
const respond=(body:unknown)=>vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify(body),{status:200,headers:{'Content-Type':'application/json'}})));

describe('prayer settings boundaries',()=>{
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

describe('one-time location lookup',()=>{
 afterEach(()=>vi.unstubAllGlobals());
 it('resolves a city in the typed country to coordinates and a time zone',async()=>{
  respond({results:[leeds]});
  await expect(lookupCoordinates({city:' Leeds ',country:'United Kingdom'})).resolves.toEqual({latitude:53.79648,longitude:-1.54785,timeZone:'Europe/London'});
 });
 it('uses the country to choose between cities with the same name',async()=>{
  respond({results:[{...leeds,name:'Cambridge',country:'United States',country_code:'US',timezone:'America/New_York',latitude:42.37,longitude:-71.11},leeds]});
  await expect(lookupCoordinates({city:'Leeds',country:'United Kingdom'})).resolves.toMatchObject({timeZone:'Europe/London'});
 });
 it('accepts common country aliases',async()=>{
  respond({results:[leeds]});
  await expect(lookupCoordinates({city:'Leeds',country:'UK'})).resolves.toMatchObject({latitude:53.79648});
  await expect(lookupCoordinates({city:'Leeds',country:'England'})).resolves.toMatchObject({latitude:53.79648});
 });
 it('refuses a city that exists only in another country',async()=>{
  respond({results:[{...leeds,country:'United States',country_code:'US'}]});
  await expect(lookupCoordinates({city:'Leeds',country:'United Kingdom'})).rejects.toThrow(/not found in United Kingdom/);
 });
 it('reports an unknown city and an unreachable service',async()=>{
  respond({results:[]});
  await expect(lookupCoordinates({city:'Nowhere',country:'Nowhere'})).rejects.toThrow(/could not be found/);
  vi.stubGlobal('fetch',vi.fn(async()=>{throw new TypeError('offline');}));
  await expect(lookupCoordinates({city:'Leeds',country:'United Kingdom'})).rejects.toThrow(/connection/);
 });
});
