'use client';

/**
 * Global error boundary — catches errors in the root layout.
 * Must include its own <html>/<body> since the layout is broken.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ar" dir="rtl" style={{ colorScheme: 'dark' }}>
      <body
        style={{
          background: '#0b0f1a',
          color: '#ddd6c8',
          fontFamily: 'Rubik, system-ui, sans-serif',
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
        <div
          style={{
            fontFamily: 'Amiri, Georgia, serif',
            fontSize: '2.5rem',
            color: '#c9a84c',
            lineHeight: 1.3,
          }}
          lang="ar"
        >
          حدث خطأ فادح
        </div>
        <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>
          A critical error occurred
        </div>
        {process.env.NODE_ENV === 'development' && error.message && (
          <pre
            style={{
              background: '#141929',
              padding: '1rem',
              borderRadius: '0.5rem',
              fontSize: '0.75rem',
              maxWidth: '40rem',
              overflow: 'auto',
              textAlign: 'left',
              color: '#7a7d8a',
              border: '1px solid #252b3e',
            }}
          >
            {error.message}
            {error.digest && `\n\nDigest: ${error.digest}`}
          </pre>
        )}
        <button
          onClick={reset}
          style={{
            padding: '0.75rem 1.5rem',
            background: '#c9a84c',
            color: '#0b0f1a',
            border: 'none',
            borderRadius: '0.75rem',
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
