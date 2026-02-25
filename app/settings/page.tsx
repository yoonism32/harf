'use client';

import { useEffect, useState } from 'react';
import { RECITERS, DEFAULT_RECITER_ID, RECITER_STORAGE_KEY, type ReciterId } from '@/lib/audio';

export default function SettingsPage() {
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [locationSaved, setLocationSaved] = useState(false);
  const [reciterId, setReciterId] = useState<ReciterId>(DEFAULT_RECITER_ID);

  useEffect(() => {
    const stored = localStorage.getItem('harf-location');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setCity(parsed.city ?? '');
        setCountry(parsed.country ?? '');
      } catch { /* ignore */ }
    }
    const storedReciter = localStorage.getItem(RECITER_STORAGE_KEY);
    if (storedReciter) setReciterId((storedReciter as ReciterId) ?? DEFAULT_RECITER_ID);
  }, []);

  const handleSaveLocation = () => {
    if (!city.trim() || !country.trim()) return;
    localStorage.setItem('harf-location', JSON.stringify({ city: city.trim(), country: country.trim() }));
    setLocationSaved(true);
    setTimeout(() => setLocationSaved(false), 2000);
  };

  const handleReciterChange = (id: ReciterId) => {
    setReciterId(id);
    localStorage.setItem(RECITER_STORAGE_KEY, id);
  };

  return (
    <div className="flex flex-col gap-8 py-8 max-w-lg">
      <div>
        <h1 className="text-xl font-semibold text-harf-text">Settings</h1>
        <p className="text-muted text-sm mt-1">Saved locally on this device.</p>
      </div>

      {/* Prayer times location */}
      <div className="card p-6 flex flex-col gap-5">
        <h2 className="text-harf-text font-medium">Prayer Times Location</h2>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-muted text-xs uppercase tracking-wider">City</label>
            <input
              type="text"
              value={city}
              onChange={e => { setCity(e.target.value); setLocationSaved(false); }}
              placeholder="e.g. London"
              className="bg-surface-plus border border-border rounded-xl px-4 py-2.5 text-harf-text text-sm placeholder:text-muted focus:outline-none focus:border-gold transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-muted text-xs uppercase tracking-wider">Country</label>
            <input
              type="text"
              value={country}
              onChange={e => { setCountry(e.target.value); setLocationSaved(false); }}
              placeholder="e.g. GB"
              className="bg-surface-plus border border-border rounded-xl px-4 py-2.5 text-harf-text text-sm placeholder:text-muted focus:outline-none focus:border-gold transition-colors"
            />
          </div>
        </div>

        <button
          onClick={handleSaveLocation}
          disabled={!city.trim() || !country.trim()}
          className="px-5 py-2.5 bg-gold text-bg rounded-xl font-semibold text-sm hover:bg-gold/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {locationSaved ? 'Saved ✓' : 'Save Location'}
        </button>
      </div>

      {/* Reciter */}
      <div className="card p-6 flex flex-col gap-5">
        <div>
          <h2 className="text-harf-text font-medium">Quran Reciter</h2>
          <p className="text-muted text-xs mt-1">Used for verse audio on flashcards and daily ayah.</p>
        </div>

        <div className="flex flex-col gap-2">
          {RECITERS.map(r => (
            <button
              key={r.id}
              onClick={() => handleReciterChange(r.id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-colors
                ${reciterId === r.id
                  ? 'border-gold/60 bg-gold/10 text-harf-text'
                  : 'border-border hover:border-gold/30 text-muted hover:text-harf-text'
                }`}
            >
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${reciterId === r.id ? 'bg-gold' : 'bg-border'}`} />
              <span className="text-sm">{r.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
