'use client';

/**
 * Global error boundary — catches errors in the root layout.
 * Must include its own <html>/<body> since the layout is broken.
 */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en" dir="ltr" style={{ colorScheme: 'light' }}>
      <body
        style={{
          background: '#F6F3EC',
          color: '#182A27',
          fontFamily: 'system-ui, sans-serif',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100dvh',
          gap: '1.5rem',
          textAlign: 'center',
          padding: '1.5rem',
          margin: 0,
        }}
      >
        <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>
          Harf could not open
        </div>
        <p>Your saved progress has not been reset. Try loading the app again.</p>
        <button
          onClick={reset}
          style={{
            padding: '0.75rem 1.5rem',
            background: '#155A4A',
            color: '#FFFDF8',
            border: 'none',
            borderRadius: '0.5rem',
            fontWeight: 700,
            fontSize: '1rem',
            cursor: 'pointer',
          }}
        >
          Try Again
        </button>
      </body>
    </html>
  );
}
