import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-24 text-center">
      <div className="font-amiri text-6xl text-gold" dir="rtl" style={{ fontFamily: 'var(--font-amiri), serif' }}>
        ٤٠٤
      </div>
      <div className="text-harf-text text-xl font-medium">Page Not Found</div>
      <div className="text-muted text-sm">The page you are looking for does not exist.</div>
      <Link
        href="/"
        className="px-6 py-3 bg-gold text-bg rounded-xl font-semibold hover:bg-gold-muted transition-colors"
      >
        Go Home
      </Link>
    </div>
  );
}
