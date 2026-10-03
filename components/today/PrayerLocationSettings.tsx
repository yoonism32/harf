'use client';
import {useEffect,useState,type FormEvent} from 'react';
import {prayerLocationSchema,type PrayerLocation} from '@/lib/data/schema';
import {updateSettings} from '@/lib/learning/commands';
import {Button,Field} from '@/components/ui';

export function PrayerLocationSettings({location,disabled}:{location:PrayerLocation|null;disabled:boolean}) {
 const [city,setCity]=useState(location?.city??''),[country,setCountry]=useState(location?.country??''),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
 useEffect(()=>{setCity(location?.city??'');setCountry(location?.country??'');},[location?.city,location?.country]);
 async function save(event:FormEvent){event.preventDefault();setMessage('');setError('');const parsed=prayerLocationSchema.safeParse({city,country});if(!parsed.success){setError('Enter a valid city and country (up to 80 characters each).');return;}setBusy(true);try{await updateSettings({prayerLocation:parsed.data});setMessage('Prayer location saved.');}catch(cause){setError(cause instanceof Error?cause.message:'Location could not be saved.');}finally{setBusy(false);}}
 async function remove(){setBusy(true);setMessage('');setError('');try{await updateSettings({prayerLocation:null});setMessage('Prayer times are turned off.');}catch(cause){setError(cause instanceof Error?cause.message:'Location could not be removed.');}finally{setBusy(false);}}
 return <section className="stack" id="prayer-location"><div><h2>Prayer times</h2><p className="muted">Optional. Harf sends only this city and country to AlAdhan when Today loads; it never requests precise device location.</p></div><form className="stack" onSubmit={save}><Field id="prayer-city" label="City"><input id="prayer-city" value={city} maxLength={80} autoComplete="address-level2" disabled={disabled||busy} onChange={event=>setCity(event.target.value)} placeholder="London"/></Field><Field id="prayer-country" label="Country"><input id="prayer-country" value={country} maxLength={80} autoComplete="country-name" disabled={disabled||busy} onChange={event=>setCountry(event.target.value)} placeholder="United Kingdom"/></Field>{error&&<p role="alert" className="error-text">{error}</p>}{message&&<p role="status">{message}</p>}<div className="row"><Button type="submit" disabled={disabled||busy}>{busy?'Saving…':'Save prayer location'}</Button>{location&&<Button variant="secondary" disabled={disabled||busy} onClick={()=>void remove()}>Turn off prayer times</Button>}</div></form></section>;
}
