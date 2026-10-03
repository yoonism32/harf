import type { ReactNode } from 'react';
export function StatusMessage({ children, error = false }: { children: ReactNode; error?: boolean }) { return <div className={`status-message${error ? ' error-text' : ''}`} role={error ? 'alert' : 'status'}>{children}</div>; }
