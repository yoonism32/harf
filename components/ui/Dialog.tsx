'use client';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { Button } from './Button';
export function Dialog({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
 const ref = useRef<HTMLDialogElement>(null); const titleId = useId();
 useEffect(() => { const dialog = ref.current; if (!dialog) return; const trigger = document.activeElement; if (open && !dialog.open) dialog.showModal(); if (!open && dialog.open) dialog.close(); return () => { if (dialog.open) dialog.close(); if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus(); }; }, [open]);
 return <dialog ref={ref} aria-labelledby={titleId} onCancel={onClose} onClose={onClose}><div className="row between"><h2 id={titleId}>{title}</h2><Button variant="text" onClick={onClose}>Close</Button></div>{children}</dialog>;
}
