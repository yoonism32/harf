import type { HTMLAttributes } from 'react';
export function ArabicText({ quran = false, className = '', ...props }: HTMLAttributes<HTMLSpanElement> & { quran?: boolean }) { return <span lang="ar" dir="rtl" className={`${quran ? 'quran-text' : 'arabic-text'} ${className}`} {...props} />; }
