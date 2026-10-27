import { CalculationMethod, Coordinates, HighLatitudeRule, Madhab, PrayerTimes as Adhan } from 'adhan';
import type { PrayerLocation } from '@/lib/data/schema';

export const prayerNames = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'] as const;
export type PrayerName = (typeof prayerNames)[number];
export type PrayerTimes = { timings: Record<PrayerName, string>; readableDate: string; hijriDate: string; timeZone: string };
export type LocatedLocation = PrayerLocation & { latitude: number; longitude: number; timeZone: string };

const CLOCK = /^\d{2}:\d{2}$/;
const UNAVAILABLE = '—';

export function isLocated(location: PrayerLocation | null): location is LocatedLocation {
  return !!location && typeof location.latitude === 'number' && typeof location.longitude === 'number' && typeof location.timeZone === 'string';
}

const clocks = new Map<string, Intl.DateTimeFormat>();
function clock(date: Date, timeZone: string) {
  if (Number.isNaN(date.getTime())) return UNAVAILABLE;
  let formatter = clocks.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
    clocks.set(timeZone, formatter);
  }
  return formatter.format(date);
}

const hijriFormatters = new Map<string, Intl.DateTimeFormat>();
function hijri(date: Date, timeZone: string) {
  let formatter = hijriFormatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { timeZone, day: 'numeric', month: 'long', year: 'numeric' });
    hijriFormatters.set(timeZone, formatter);
  }
  const parts = formatter.formatToParts(date);
  const value = (type: 'day' | 'month' | 'year') => parts.find((part) => part.type === type)?.value ?? '';
  return `${value('day')} ${value('month')} ${value('year')}`.trim();
}

// Muslim World League and the Shafi madhab match the Mawaqit watch, so both devices agree.
export function prayerTimes(location: LocatedLocation, on = new Date()): PrayerTimes {
  const params = CalculationMethod.MuslimWorldLeague();
  params.madhab = Madhab.Shafi;
  params.highLatitudeRule = HighLatitudeRule.SeventhOfTheNight;
  const times = new Adhan(new Coordinates(location.latitude, location.longitude), on, params);
  // Anchor the date labels to the computed solar day in that city, not to the device clock.
  const day = times.dhuhr;
  return {
    timings: {
      Fajr: clock(times.fajr, location.timeZone),
      Sunrise: clock(times.sunrise, location.timeZone),
      Dhuhr: clock(times.dhuhr, location.timeZone),
      Asr: clock(times.asr, location.timeZone),
      Maghrib: clock(times.maghrib, location.timeZone),
      Isha: clock(times.isha, location.timeZone),
    },
    readableDate: new Intl.DateTimeFormat('en-GB', { timeZone: location.timeZone, day: 'numeric', month: 'short', year: 'numeric' }).format(day),
    hijriDate: hijri(day, location.timeZone),
    timeZone: location.timeZone,
  };
}

function minutesAt(now: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now);
  return Number(parts.find((part) => part.type === 'hour')?.value) * 60 + Number(parts.find((part) => part.type === 'minute')?.value);
}

export function nextPrayer(times: PrayerTimes, now = new Date()): { name: Exclude<PrayerName, 'Sunrise'>; time: string; tomorrow: boolean } {
  const current = minutesAt(now, times.timeZone);
  for (const name of ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'] as const) {
    const value = times.timings[name];
    if (!CLOCK.test(value)) continue;
    const [hours, minutes] = value.split(':').map(Number);
    if (hours! * 60 + minutes! > current) return { name, time: value, tomorrow: false };
  }
  return { name: 'Fajr', time: times.timings.Fajr, tomorrow: true };
}

export function formatPrayerTime(value: string) {
  if (!CLOCK.test(value)) return value;
  const [hours, minutes] = value.split(':').map(Number);
  const suffix = hours! >= 12 ? 'pm' : 'am';
  return `${hours! % 12 || 12}:${String(minutes).padStart(2, '0')} ${suffix}`;
}
