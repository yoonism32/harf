'use client';

import { useEffect, useRef, useState } from 'react';
import { RECITERS } from '@/lib/audio';

/** Extract "128kbps" / "64kbps" etc. from a reciter ID */
export function reciterQuality(id: string): string {
  return id.match(/(\d+kbps)/i)?.[1] ?? '';
}

interface ReciterSelectProps {
  value: string;
  onChange: (id: string) => void;
}

export function ReciterSelect({ value, onChange }: ReciterSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = RECITERS.find(r => r.id === value);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className="relative z-30">
      {/* Trigger */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Select reciter"
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm
          bg-surface-plus border border-border hover:border-gold/40
          text-muted hover:text-harf-text transition-colors focus:outline-none focus:border-gold"
      >
        <span className="max-w-[160px] truncate">{selected?.label ?? value}</span>
        {selected && reciterQuality(selected.id) && (
          <span className="text-[10px] text-muted/50 font-mono shrink-0">
            {reciterQuality(selected.id)}
          </span>
        )}
        <svg className="w-3 h-3 text-muted/60 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div
          role="listbox"
          className="absolute top-full left-0 mt-1 w-72 bg-surface border border-border
            rounded-xl shadow-2xl overflow-y-auto max-h-72 z-[60]"
        >
          {RECITERS.map(r => {
            const quality = reciterQuality(r.id);
            const active  = r.id === value;
            return (
              <button
                key={r.id}
                role="option"
                aria-selected={active}
                onClick={() => { onChange(r.id); setOpen(false); }}
                className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 text-sm text-left transition-colors
                  ${active ? 'bg-gold/10 text-gold' : 'text-muted hover:bg-surface-plus hover:text-harf-text'}`}
              >
                <span className="truncate">{r.label}</span>
                {quality && (
                  <span className={`text-[10px] font-mono shrink-0 ${active ? 'text-gold/60' : 'text-muted/50'}`}>
                    {quality}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
