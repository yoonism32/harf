'use client';

import { useEffect } from 'react';

export function PWARegister() {
  useEffect(() => {
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .catch((err) => {
          // Non-fatal: app works fine without SW
          console.debug('[SW] Registration failed:', err);
        });
    }
  }, []);

  return null;
}
