import {describe,expect,it} from 'vitest';
import {formatPrayerTime,isLocated,nextPrayer,prayerTimes,type PrayerName,type PrayerTimes} from '../times';
import fixtures from './fixtures.json';

const names={fajr:'Fajr',sunrise:'Sunrise',dhuhr:'Dhuhr',asr:'Asr',maghrib:'Maghrib',isha:'Isha'} as const;
const day=(date:string)=>{const [year,month,dayOfMonth]=date.split('-').map(Number);return new Date(year!,month!-1,dayOfMonth!);};

describe('on-device prayer times',()=>{
 it('matches every Mawaqit Adhan fixture row',()=>{
  for(const row of fixtures.rows){
   const times=prayerTimes({city:row.location,country:'Test',latitude:row.lat,longitude:row.lng,timeZone:row.tz},day(row.date));
   for(const [key,name] of Object.entries(names) as [keyof typeof names,PrayerName][]){
    const expected=(row as unknown as Record<string,string|null>)[key]??'—';
    expect(times.timings[name],`${row.location} ${row.date} ${name}`).toBe(expected);
   }
  }
 });
 it('labels the day in the location time zone',()=>{
  const times=prayerTimes({city:'Leeds',country:'United Kingdom',latitude:53.81,longitude:-1.56,timeZone:'Europe/London'},day('2026-01-15'));
  expect(times.readableDate).toBe('15 Jan 2026');
  expect(times.hijriDate).toBe('26 Rajab 1447');
 });
 it('needs coordinates before calculating',()=>{
  expect(isLocated({city:'London',country:'United Kingdom'})).toBe(false);
  expect(isLocated({city:'London',country:'United Kingdom',latitude:51.5,longitude:-0.12,timeZone:'Europe/London'})).toBe(true);
 });
 it('skips a time the sun never reaches',()=>{
  const polar:PrayerTimes={timings:{Fajr:'—',Sunrise:'—',Dhuhr:'12:00',Asr:'12:30',Maghrib:'—',Isha:'—'},readableDate:'',hijriDate:'',timeZone:'Europe/Oslo'};
  expect(nextPrayer(polar,new Date('2026-07-15T09:00:00Z'))).toEqual({name:'Dhuhr',time:'12:00',tomorrow:false});
  expect(formatPrayerTime('—')).toBe('—');
 });
});
