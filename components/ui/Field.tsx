import type { ReactNode } from 'react';
export function Field({ id, label, hint, error, children }: { id: string; label: string; hint?: string; error?: string; children: ReactNode }) {
 return <div className="field"><label htmlFor={id}>{label}</label>{children}{hint && <p id={`${id}-hint`} className="muted">{hint}</p>}{error && <p id={`${id}-error`} role="alert" className="error-text">{error}</p>}</div>;
}
