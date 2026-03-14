'use client';

import { useEffect, useRef, useState } from 'react';
import { DEFAULT_RECITER_ID, RECITER_STORAGE_KEY } from '@/lib/audio';
import { ReciterSelect } from '@/components/ReciterSelect';
import { exportAllData, importAllData, getAllWordProgress, getStudySessions } from '@/lib/storage';

export default function SettingsPage() {
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [locationSaved, setLocationSaved] = useState(false);
  const [reciterId, setReciterId] = useState(DEFAULT_RECITER_ID);
  const [importStatus, setImportStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [dataStats, setDataStats] = useState({ words: 0, sessions: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    if (storedReciter) setReciterId(storedReciter);
    setDataStats({
      words: Object.keys(getAllWordProgress()).length,
      sessions: getStudySessions().length,
    });
  }, []);

  const handleSaveLocation = () => {
    if (!city.trim() || !country.trim()) return;
    localStorage.setItem('harf-location', JSON.stringify({ city: city.trim(), country: country.trim() }));
    setLocationSaved(true);
    setTimeout(() => setLocationSaved(false), 2000);
  };

  const handleReciterChange = (id: string) => {
    setReciterId(id);
    localStorage.setItem(RECITER_STORAGE_KEY, id);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result;
      if (typeof text !== 'string') return;
      const result = importAllData(text);
      setImportStatus(result);
      if (result.ok) {
        setDataStats({
          words: Object.keys(getAllWordProgress()).length,
          sessions: getStudySessions().length,
        });
      }
      // Reset file input so the same file can be re-imported if needed
      if (fileInputRef.current) fileInputRef.current.value = '';
      setTimeout(() => setImportStatus(null), 5000);
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex flex-col gap-8 py-8 max-w-lg">
      <div>
        <h1 className="text-xl font-semibold text-harf-text">Settings</h1>
        <p className="text-muted text-sm mt-1">Saved locally on this device.</p>
      </div>

      {/* Prayer times location */}
      <div className="card p-6 flex flex-col gap-5 relative z-10">
        <h2 className="text-harf-text font-medium">Prayer Times Location</h2>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="settings-city" className="text-muted text-xs uppercase tracking-wider">City</label>
            <input
              id="settings-city"
              type="text"
              value={city}
              onChange={e => { setCity(e.target.value); setLocationSaved(false); }}
              placeholder="e.g. London"
              className="bg-surface-plus border border-border rounded-xl px-4 py-2.5 text-harf-text text-sm placeholder:text-muted focus:outline-none focus:border-gold transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="settings-country" className="text-muted text-xs uppercase tracking-wider">Country</label>
            <input
              id="settings-country"
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
        <span aria-live="polite" className="sr-only">{locationSaved ? 'Location saved' : ''}</span>
      </div>

      {/* Reciter */}
      <div className="card p-6 flex flex-col gap-5 relative z-10">
        <div>
          <h2 className="text-harf-text font-medium">Quran Reciter</h2>
          <p className="text-muted text-xs mt-1">Used for verse audio on flashcards and daily ayah.</p>
        </div>
        <ReciterSelect value={reciterId} onChange={handleReciterChange} />
      </div>

      {/* Data */}
      <div className="card p-6 flex flex-col gap-5">
        <div>
          <h2 className="text-harf-text font-medium">Your Data</h2>
          <p className="text-muted text-xs mt-1">All progress is stored locally on this device.</p>
        </div>

        <div className="flex gap-4 text-sm">
          <div className="flex flex-col gap-0.5">
            <span className="text-gold font-bold text-lg tabular-nums">{dataStats.words}</span>
            <span className="text-muted text-xs">words tracked</span>
          </div>
          <div className="w-px bg-border" />
          <div className="flex flex-col gap-0.5">
            <span className="text-gold font-bold text-lg tabular-nums">{dataStats.sessions}</span>
            <span className="text-muted text-xs">study sessions</span>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={exportAllData}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-surface-plus border border-border text-harf-text text-sm font-medium hover:border-gold/50 hover:text-gold transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export Backup
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-surface-plus border border-border text-harf-text text-sm font-medium hover:border-gold/50 hover:text-gold transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l4-4m0 0l4 4m-4-4v12" />
            </svg>
            Import Backup
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleImport}
            className="sr-only"
            aria-label="Import backup file"
          />
        </div>

        {importStatus && (
          <div className={`text-sm px-4 py-2.5 rounded-xl border ${
            importStatus.ok
              ? 'bg-green/10 border-green/30 text-green'
              : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}>
            {importStatus.message}
          </div>
        )}

        <p className="text-muted/60 text-xs leading-relaxed">
          Export saves all your word progress, study sessions, and settings to a JSON file.
          Import from a backup to restore everything on a new device.
        </p>
      </div>
    </div>
  );
}
