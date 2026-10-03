import { z } from 'zod';
import { prayerLocationSchema, type PrayerLocation } from '@/lib/data/schema';

const prayerNameSchema=z.enum(['Fajr','Sunrise','Dhuhr','Asr','Maghrib','Isha']);
export type PrayerName=z.infer<typeof prayerNameSchema>;
export type PrayerTimes={timings:Record<PrayerName,string>;readableDate:string;hijriDate:string;timeZone:string};
const responseSchema=z.object({code:z.number(),data:z.object({
  timings:z.object({Fajr:z.string(),Sunrise:z.string(),Dhuhr:z.string(),Asr:z.string(),Maghrib:z.string(),Isha:z.string()}),
  date:z.object({readable:z.string(),hijri:z.object({day:z.string(),month:z.object({en:z.string()}),year:z.string()})}),
  meta:z.object({timezone:z.string().min(1).max(100)}),
})});
const names=prayerNameSchema.options;

function clock(value:string) {
  const match=/^(\d{1,2}):(\d{2})/.exec(value);
  const hours=Number(match?.[1]),minutes=Number(match?.[2]);
  if(!match||hours>23||minutes>59)throw new Error('Prayer service returned an invalid time');
  return `${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}`;
}

export async function fetchPrayerTimes(location:PrayerLocation,signal?:AbortSignal):Promise<PrayerTimes> {
  const safe=prayerLocationSchema.parse(location);
  const url=new URL('https://api.aladhan.com/v1/timingsByCity');
  url.searchParams.set('city',safe.city);url.searchParams.set('country',safe.country);url.searchParams.set('method','3');
  let response:Response;
  try{response=await fetch(url,{signal,cache:'no-store'});}catch(cause){if(cause instanceof DOMException&&cause.name==='AbortError')throw cause;throw new Error('Prayer times could not be reached. Check your connection and try again.');}
  if(!response.ok)throw new Error('Prayer times could not be reached. Check your connection and try again.');
  let body:unknown;
  try{body=await response.json();}catch{throw new Error('Prayer service returned an invalid response. Try again later.');}
  const status=z.object({code:z.number()}).safeParse(body);
  if(status.success&&status.data.code!==200)throw new Error('Prayer times were unavailable for this location. Check the city and country.');
  let value:z.infer<typeof responseSchema>;
  try{value=responseSchema.parse(body);}catch{throw new Error('Prayer service returned an invalid response. Try again later.');}
  try{new Intl.DateTimeFormat('en',{timeZone:value.data.meta.timezone}).format();}catch{throw new Error('Prayer service returned an invalid time zone. Try again later.');}
  return {timings:Object.fromEntries(names.map(name=>[name,clock(value.data.timings[name])])) as Record<PrayerName,string>,readableDate:value.data.date.readable,hijriDate:`${value.data.date.hijri.day} ${value.data.date.hijri.month.en} ${value.data.date.hijri.year}`,timeZone:value.data.meta.timezone};
}

function minutesAt(now:Date,timeZone:string) {
  const parts=new Intl.DateTimeFormat('en-GB',{timeZone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now);
  return Number(parts.find(part=>part.type==='hour')?.value)*60+Number(parts.find(part=>part.type==='minute')?.value);
}

export function nextPrayer(times:PrayerTimes,now=new Date()):{name:Exclude<PrayerName,'Sunrise'>;time:string;tomorrow:boolean} {
  const current=minutesAt(now,times.timeZone);
  for(const name of ['Fajr','Dhuhr','Asr','Maghrib','Isha'] as const){
    const [hours,minutes]=times.timings[name].split(':').map(Number);
    if(hours!*60+minutes!>current)return {name,time:times.timings[name],tomorrow:false};
  }
  return {name:'Fajr',time:times.timings.Fajr,tomorrow:true};
}

export function formatPrayerTime(value:string) {
  const [hours,minutes]=value.split(':').map(Number);
  const suffix=hours!>=12?'pm':'am';
  return `${hours!%12||12}:${String(minutes).padStart(2,'0')} ${suffix}`;
}
