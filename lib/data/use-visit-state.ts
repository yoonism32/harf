'use client';

import {useEffect, useRef, useState, type SetStateAction} from 'react';
import type {ZodType} from 'zod';
import {currentOwner} from '@/lib/account/client';
import {CONTENT_VERSION} from '@/lib/content/client';
import {useHarfStore} from './store';

// Temporary navigation state belongs to this tab and identity, never to cloud study records.
export function useVisitState<T>(id: string, initial: T, schema: ZodType<T>) {
 const store = useHarfStore();
 const key = `harf:visit:${currentOwner()?.id ?? 'guest'}:${CONTENT_VERSION}:${String(store.meta.lastRecoveryAction ?? '')}:${id}`;
 const defaults = useRef(initial); defaults.current = initial;
 const validator = useRef(schema); validator.current = schema;
 const [saved, setSaved] = useState<{key: string; value: T} | null>(null);
 useEffect(() => {
  if (store.status === 'loading') return;
  function restore() {
  let value = defaults.current;
  try {
   const raw = sessionStorage.getItem(key);
   const parsed = raw && raw.length <= 500000 ? validator.current.safeParse(JSON.parse(raw)) : null;
   if (parsed?.success) value = parsed.data;
  } catch { /* Browsing still works when tab storage is unavailable. */ }
  setSaved({key, value});
  }
  restore();
  const changed = (event: Event) => {if ((event as CustomEvent<string>).detail === key) restore();};
  window.addEventListener('harf:visit', changed);
  return () => window.removeEventListener('harf:visit', changed);
 }, [key, store.status]);
 const ready = saved?.key === key;
 const value = ready ? saved.value : initial;
 const current = useRef(value); current.current = value;
 function update(action: SetStateAction<T>) {
  const next = typeof action === 'function' ? (action as (value: T) => T)(current.current) : action;
  current.current = next;
  setSaved({key, value: next});
  try {
   const text = JSON.stringify(next);
   if (text.length > 500000) return;
   sessionStorage.removeItem(key);
   sessionStorage.setItem(key, text);
   const keys = Object.keys(sessionStorage).filter(k => k.startsWith('harf:visit:') && k !== key);
   for (const old of keys.slice(0, Math.max(0, keys.length - 99))) sessionStorage.removeItem(old);
   window.dispatchEvent(new CustomEvent('harf:visit', {detail: key}));
  } catch { /* Keep the current activity usable if storage is full or blocked. */ }
 }
 return [value, update, ready] as const;
}
