const BASE = 'https://api.aladhan.com/v1';

export interface PrayerTimes {
  Fajr: string;
  Sunrise: string;
  Dhuhr: string;
  Asr: string;
  Maghrib: string;
  Isha: string;
  date: string;
  hijriDate: string;
}

export interface Coordinates {
  lat: number;
  lon: number;
}

export interface Name99 {
  name: string;
  transliteration: string;
  number: number;
  en: {
    meaning: string;
  };
}

/** Get prayer times for coordinates — method 2 = ISNA */
export async function fetchPrayerTimes(
  coords: Coordinates,
  method = 2,
): Promise<PrayerTimes | null> {
  try {
    const today = new Date();
    const date = `${today.getDate()}-${today.getMonth() + 1}-${today.getFullYear()}`;
    const res = await fetch(
      `${BASE}/timings/${date}?latitude=${coords.lat}&longitude=${coords.lon}&method=${method}`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const timings = data.data.timings;
    const dateInfo = data.data.date;
    return {
      Fajr:    formatTime(timings.Fajr),
      Sunrise: formatTime(timings.Sunrise),
      Dhuhr:   formatTime(timings.Dhuhr),
      Asr:     formatTime(timings.Asr),
      Maghrib: formatTime(timings.Maghrib),
      Isha:    formatTime(timings.Isha),
      date:    dateInfo.readable,
      hijriDate: `${dateInfo.hijri.day} ${dateInfo.hijri.month.en} ${dateInfo.hijri.year}`,
    };
  } catch {
    return null;
  }
}

function formatTime(time24: string): string {
  const parts = time24.split(':').map(Number);
  const h = parts[0] ?? 0;
  const m = parts[1] ?? 0;
  if (!Number.isFinite(h) || !Number.isFinite(m)) return '--:--';
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${period}`;
}

/** Get next prayer name and time */
export function getNextPrayer(times: PrayerTimes): { name: string; time: string } | null {
  const prayers = [
    { name: 'Fajr',    time: times.Fajr    },
    { name: 'Sunrise', time: times.Sunrise },
    { name: 'Dhuhr',   time: times.Dhuhr   },
    { name: 'Asr',     time: times.Asr     },
    { name: 'Maghrib', time: times.Maghrib  },
    { name: 'Isha',    time: times.Isha    },
  ];

  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  for (const prayer of prayers) {
    const timeParts = prayer.time.split(' ');
    const timePart = timeParts[0] ?? '';
    const period = timeParts[1] ?? 'AM';
    const hParts = timePart.split(':').map(Number);
    const h = hParts[0] ?? 0;
    const m = hParts[1] ?? 0;
    let hour24 = h;
    if (period === 'PM' && h !== 12) hour24 += 12;
    if (period === 'AM' && h === 12) hour24 = 0;
    const prayerMinutes = hour24 * 60 + m;
    if (prayerMinutes > nowMinutes) return prayer;
  }

  return prayers[0] ?? null; // Next day Fajr (or null if prayers array is empty)
}

/** Fetch Qibla direction */
export async function fetchQibla(coords: Coordinates): Promise<number | null> {
  try {
    const res = await fetch(`${BASE}/qibla/${coords.lat}/${coords.lon}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.data.direction;
  } catch {
    return null;
  }
}

/** Fetch prayer times by city + country name */
export async function fetchPrayerTimesByCity(
  city: string,
  country: string,
  method = 2,
): Promise<PrayerTimes | null> {
  try {
    const today = new Date();
    const date = `${today.getDate()}-${today.getMonth() + 1}-${today.getFullYear()}`;
    const res = await fetch(
      `${BASE}/timingsByCity/${date}?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}&method=${method}`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const timings = data.data.timings;
    const dateInfo = data.data.date;
    return {
      Fajr:    formatTime(timings.Fajr),
      Sunrise: formatTime(timings.Sunrise),
      Dhuhr:   formatTime(timings.Dhuhr),
      Asr:     formatTime(timings.Asr),
      Maghrib: formatTime(timings.Maghrib),
      Isha:    formatTime(timings.Isha),
      date:    dateInfo.readable,
      hijriDate: `${dateInfo.hijri.day} ${dateInfo.hijri.month.en} ${dateInfo.hijri.year}`,
    };
  } catch {
    return null;
  }
}

/** Get browser geolocation as a promise */
export function getBrowserLocation(): Promise<Coordinates> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      err => reject(err),
      { timeout: 10000 },
    );
  });
}

/** Fallback: Mecca coordinates */
export const MECCA: Coordinates = { lat: 21.3891, lon: 39.8579 };
