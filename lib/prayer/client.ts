import { z } from 'zod';
import { prayerLocationSchema, type PrayerLocation } from '@/lib/data/schema';

const resultSchema = z.object({
  name: z.string().min(1).max(100),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  timezone: z.string().min(1).max(100),
  country: z.string().min(1).max(100).optional(),
  country_code: z.string().min(2).max(2).optional(),
});
const responseSchema = z.object({ results: z.array(resultSchema).optional() });
export type Coordinates = { latitude: number; longitude: number; timeZone: string };

const ALIASES: Record<string, string> = {
  uk: 'united kingdom',
  'great britain': 'united kingdom',
  britain: 'united kingdom',
  england: 'united kingdom',
  scotland: 'united kingdom',
  wales: 'united kingdom',
  'northern ireland': 'united kingdom',
  usa: 'united states',
  us: 'united states',
  'u.s.a': 'united states',
  uae: 'united arab emirates',
};
const normalize = (value: string) => value.trim().toLowerCase().replace(/[.'’]/g, '').replace(/\s+/g, ' ');
const countryMatches = (typed: string, found: string | undefined) => {
  if (!found) return false;
  const wanted = normalize(typed);
  return normalize(found) === (ALIASES[wanted] ?? wanted);
};

// One lookup when the location is saved, using Open-Meteo's keyless geocoder.
// Prayer times themselves never leave the device.
export async function lookupCoordinates(location: PrayerLocation): Promise<Coordinates> {
  const safe = prayerLocationSchema.parse(location);
  const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
  url.searchParams.set('name', safe.city);
  url.searchParams.set('count', '10');
  url.searchParams.set('language', 'en');
  url.searchParams.set('format', 'json');
  let response: Response;
  try {
    response = await fetch(url, { cache: 'no-store' });
  } catch {
    throw new Error('Your city could not be looked up. Check your connection and try again.');
  }
  if (!response.ok) throw new Error('Your city could not be looked up. Check your connection and try again.');
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new Error('The location lookup returned an invalid response. Try again later.');
  }
  const parsed = responseSchema.safeParse(body);
  if (!parsed.success) throw new Error('The location lookup returned an invalid response. Try again later.');
  const results = parsed.data.results ?? [];
  if (!results.length) throw new Error('That city could not be found. Check the spelling and try again.');
  const match = results.find((result) => countryMatches(safe.country, result.country));
  if (!match) throw new Error(`That city was not found in ${safe.country}. Check the spelling and try again.`);
  try {
    new Intl.DateTimeFormat('en', { timeZone: match.timezone }).format();
  } catch {
    throw new Error('The location lookup returned an invalid time zone. Try again later.');
  }
  return { latitude: match.latitude, longitude: match.longitude, timeZone: match.timezone };
}
