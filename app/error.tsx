'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-24 text-center">
      <div className="font-amiri text-4xl text-gold" dir="rtl" style={{ fontFamily: 'var(--font-amiri), serif' }}>
        حدث خطأ
      </div>
      <div className="text-harf-text text-xl font-medium">Something went wrong</div>
      <div className="text-muted text-sm max-w-sm">
        {process.env.NODE_ENV === 'development' && error.message
          ? error.message
          : 'An unexpected error occurred.'}
      </div>
      <button
        onClick={reset}
        className="px-6 py-3 bg-gold text-bg rounded-xl font-semibold hover:bg-gold-muted transition-colors"
      >
        Try Again
      </button>
    </div>
  );
}
