'use client';
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { useRouter } from 'next/navigation';
import { hitsFor, type Hit } from './jump';

// Live reference search from any page: the same affordance the old search had, without a round trip.
export function AyahJump() {
    const router = useRouter(); const id = useId(); const listId = `${id}-results`;
    const [value, setValue] = useState('');
    const [open, setOpen] = useState(false);
    const [active, setActive] = useState(0);
    const listRef = useRef<HTMLUListElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const hits = hitsFor(value);
    useEffect(() => { setActive(0); }, [value]);
    useEffect(() => {
        if (!open) return;
        const row = listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`);
        row?.scrollIntoView({ block: 'nearest' });
    }, [active, open]);
    function go(hit: Hit) { setValue(''); setOpen(false); router.push(`/read/${hit.surah}/${hit.ayah}`); }
    function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
        if (e.key === 'Escape') { setOpen(false); setValue(''); return; }
        if (e.key === 'ArrowDown' && hits.length) { e.preventDefault(); setOpen(true); setActive(i => Math.min(i + 1, hits.length - 1)); return; }
        if (e.key === 'ArrowUp' && hits.length) { e.preventDefault(); setActive(i => Math.max(i - 1, 0)); return; }
        if (e.key === 'Enter') {
            e.preventDefault();
            const hit = hits[active] ?? hits[0];
            if (hit) { go(hit); return; }
            const input = inputRef.current;
            if (input) { input.setCustomValidity('Enter an ayah like 2:255, a surah number like 101, or a surah name like Yasin.'); input.reportValidity(); }
        }
    }
    return <form role="search" aria-label="Go to ayah" className="ayah-jump" onSubmit={e => e.preventDefault()}>
        <label className="sr-only" htmlFor={id}>Go to ayah (surah:ayah or name)</label>
        <input ref={inputRef} id={id} name="ref" autoComplete="off" placeholder="2:255 or Saf" size={13}
            value={value} role="combobox" aria-expanded={open && hits.length > 0} aria-controls={listId} aria-autocomplete="list"
            aria-activedescendant={open && hits[active] ? `${listId}-${active}` : undefined}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 140)}
            onInput={e => e.currentTarget.setCustomValidity('')}
            onChange={e => { setValue(e.target.value); setOpen(true); }}
            onKeyDown={onKeyDown} />
        {open && hits.length > 0 && <ul ref={listRef} id={listId} role="listbox" aria-label="Matching references" className="ayah-jump-results">
            {hits.map((hit, index) => <li key={`${hit.surah}:${hit.ayah}`}>
                <button type="button" role="option" id={`${listId}-${index}`} data-index={index} aria-selected={index === active}
                    onMouseEnter={() => setActive(index)} onMouseDown={e => { e.preventDefault(); go(hit); }}>
                    <span className="ayah-ref">{hit.surah}:{hit.ayah}</span>
                    <span className="ayah-name">{hit.name}</span>
                </button>
            </li>)}
        </ul>}
    </form>;
}
