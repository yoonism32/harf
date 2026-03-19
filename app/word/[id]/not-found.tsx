import Link from 'next/link';

export default function WordNotFound() {
  return (
    <div className="py-24 text-center flex flex-col gap-4 items-center">
      <div className="font-amiri text-6xl text-muted" dir="rtl">؟</div>
      <h2 className="text-harf-text text-xl font-semibold">Word not found</h2>
      <p className="text-muted text-sm max-w-xs">
        This word ID doesn&apos;t exist in the Harf dataset.
      </p>
      <Link
        href="/words"
        className="mt-2 px-5 py-2.5 bg-surface-plus border border-border rounded-xl text-harf-text text-sm hover:border-gold/40 hover:text-gold transition-colors"
      >
        ← Back to Word Library
      </Link>
    </div>
  );
}
