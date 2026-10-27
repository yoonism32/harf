'use client';
import Link from 'next/link';
import {useEffect,useState} from 'react';
import type {PrayerLocation} from '@/lib/data/schema';
import {formatPrayerTime,isLocated,nextPrayer,prayerNames,prayerTimes,type PrayerTimes as Times} from '@/lib/prayer/times';
import {Skeleton} from '@/components/ui';

export function PrayerTimes({location}:{location:PrayerLocation|null}) {
 const [now,setNow]=useState<Date|null>(null);
 useEffect(()=>{setNow(new Date());const timer=setInterval(()=>setNow(new Date()),60000);return()=>clearInterval(timer);},[]);
 const located=isLocated(location);
 const times=located&&now?prayerTimes(location,now):null;
 return <section className="stack" aria-labelledby="prayer-times-title"><div><p className="eyebrow">Optional utility</p><h2 id="prayer-times-title">Prayer times</h2></div>{!location?<div className="status-message"><p>Add your city and country to see prayer times. Harf never requests precise device location.</p><Link href="/settings#prayer-location">Set prayer location →</Link></div>:!located?<div className="status-message"><p>Your saved location still needs its coordinates. Save it once more to switch to on-device calculation.</p><Link href="/settings#prayer-location">Refresh prayer location →</Link></div>:!now||!times?<Skeleton height={220} label="Calculating prayer times"/>:<PrayerList times={times} location={location} now={now}/>}</section>;
}

function PrayerList({times,location,now}:{times:Times;location:PrayerLocation;now:Date}) {
 const next=nextPrayer(times,now);
 return <div className="stack"><p><strong>{next.tomorrow?'Tomorrow’s ':''}{next.name}</strong>{next.time==='—'?' has no reliable time at this latitude today.':` is next at ${formatPrayerTime(next.time)}.`}</p><ul style={{listStyle:'none',padding:0,margin:0}}>{prayerNames.map(name=><li className="list-row" key={name}><span>{name}{name==='Sunrise'&&<small className="muted"> · not a prayer</small>}</span><time>{formatPrayerTime(times.timings[name])}</time></li>)}</ul><p className="muted">{location.city}, {location.country} · {times.readableDate}<br/>{times.hijriDate} · Muslim World League · calculated on this device</p><Link href="/settings#prayer-location">Change location</Link></div>;
}
