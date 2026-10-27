'use client';

import { useEffect } from 'react';
import { getTheme } from '@/lib/theme';

/**
 * Re-asserts the saved theme after hydration.
 *
 * The inline boot script in the document head sets the attribute before first
 * paint, but it can fail to run (blocked subresource, restored document, or an
 * extension interfering), which leaves the page on the default paper theme
 * after a refresh. This makes the saved choice authoritative on every mount.
 */
export function ThemeSync() {
  useEffect(() => {
    const theme = getTheme();
    if (document.documentElement.dataset.theme !== theme) {
      document.documentElement.dataset.theme = theme;
    }
  }, []);

  return null;
}
