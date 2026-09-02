'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

const SEEN_KEY = 'harf:landing-seen';

// ── Typewriter sequence ──────────────────────────────────────────────────────
const SEGMENTS = [
  {
    id: 'h-ar',
    typeText: 'أَقْسَامُ الْكَلِمَةِ',
    kind: 'header-ar' as const,
    speed: 55,
    pauseAfter: 350,
  },
  {
    id: 'h-en',
    typeText: 'The types of words',
    kind: 'header-en' as const,
    speed: 36,
    pauseAfter: 900,
  },
  {
    id: 'intro',
    typeText: 'There are three kinds of words:',
    kind: 'intro' as const,
    speed: 30,
    pauseAfter: 650,
  },
  {
    id: 'ism',
    label: 'اسْم',
    phonetic: 'ism',
    typeText: '— a word that conveys a meaning in itself without being tied to a particular time',
    examples: ['كِتَابٌ', 'رَجُلٌ', 'جَمِيلٌ'],
    kind: 'entry' as const,
    speed: 20,
    pauseAfter: 650,
  },
  {
    id: 'fil',
    label: 'فِعْل',
    phonetic: "fi'l",
    typeText: '— a word that conveys a meaning in itself and is associated with a time',
    examples: ['كَتَبَ', 'يَكْتُبُ', 'اُكْتُبْ'],
    kind: 'entry' as const,
    speed: 20,
    pauseAfter: 650,
  },
  {
    id: 'harf',
    label: 'حَرْف',
    phonetic: 'harf',
    typeText: '— a word whose meaning is understood through its relationship with other words.',
    examples: ['فِي', 'مِنْ', 'إِلَى'],
    kind: 'entry-brand' as const,
    speed: 18,
    pauseAfter: 0,
  },
] as const;

type Segment = (typeof SEGMENTS)[number];

function useTypewriter(
  segments: readonly Segment[],
  options: { startDelay?: number; disabled?: boolean } = {},
) {
  const { startDelay = 700, disabled = false } = options;
  const [step, setStep] = useState(disabled ? segments.length : -1);
  const [chars, setChars] = useState(0);
  const [done, setDone] = useState(disabled);

  useEffect(() => {
    if (disabled) {
      setStep(segments.length);
      setChars(0);
      setDone(true);
      return;
    }

    setDone(false);
    const t = setTimeout(() => setStep(0), startDelay);
    return () => clearTimeout(t);
  }, [disabled, segments.length, startDelay]);

  useEffect(() => {
    if (disabled) return;
    if (step < 0 || step >= segments.length) return;

    const seg = segments[step];
    if (!seg) return;

    let i = 0;
    setChars(0);

    let timer: ReturnType<typeof setTimeout> | null = null;
    const tick = () => {
      if (i >= seg.typeText.length) {
        const next = step + 1;
        if (next >= segments.length) {
          setDone(true);
        } else {
          timer = setTimeout(() => setStep(next), seg.pauseAfter);
        }
        return;
      }

      i += 1;
      setChars(i);
      timer = setTimeout(tick, seg.speed);
    };

    timer = setTimeout(tick, seg.speed);
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [disabled, segments, step]);

  return { step, chars, done };
}

function Cursor() {
  return <span aria-hidden="true" className="cursor-blink" />;
}

export default function LandingPage() {
  const [reduceMotion, setReduceMotion] = useState(false);
  const [skipForReturning, setSkipForReturning] = useState(false);
  const [manualSkip, setManualSkip] = useState(false);
  const [showCTA, setShowCTA] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduceMotion(mq.matches);
    update();
    if (mq.addEventListener) mq.addEventListener('change', update);
    else mq.addListener(update);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', update);
      else mq.removeListener(update);
    };
  }, []);

  // Full cinematic reveal on first visit this session; instant on return.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      if (sessionStorage.getItem(SEEN_KEY) === '1') {
        setSkipForReturning(true);
      }
    } catch {
      // sessionStorage unavailable (private mode etc.) — fall back to full animation
    }
  }, []);

  const skipAnimation = reduceMotion || skipForReturning || manualSkip;

  const { step, chars, done } = useTypewriter(SEGMENTS, {
    startDelay: 700,
    disabled: skipAnimation,
  });

  // Once seen, remember it — no replaying the cinematic intro this session.
  useEffect(() => {
    if (!done || typeof window === 'undefined') return;
    try {
      sessionStorage.setItem(SEEN_KEY, '1');
    } catch {
      // ignore
    }
  }, [done]);

  useEffect(() => {
    if (!done) {
      setShowCTA(false);
      return;
    }
    // Skip the artificial pacing delay when the animation itself was skipped.
    if (skipAnimation) {
      setShowCTA(true);
      return;
    }
    const t = setTimeout(() => setShowCTA(true), 500);
    return () => clearTimeout(t);
  }, [done, skipAnimation]);

  const handleSkipClick = useCallback(() => {
    if (!done) setManualSkip(true);
  }, [done]);

  const isVisible = (idx: number) => step >= idx;
  const isDone = (idx: number) => {
    const seg = SEGMENTS[idx];
    if (!seg) return false;
    return step > idx || (step === idx && chars >= seg.typeText.length);
  };
  const getText = (idx: number): string => {
    const seg = SEGMENTS[idx];
    if (!seg) return '';
    if (step > idx) return seg.typeText;
    if (step === idx) return seg.typeText.substring(0, chars);
    return '';
  };
  const hasCursor = (idx: number) => step === idx && !isDone(idx);

  return (
    <main
      onClick={handleSkipClick}
      className={`relative min-h-[100dvh] w-full overflow-hidden bg-black flex items-center ${!done ? 'cursor-pointer' : ''}`}
    >
      {/* ── Ambient glow — off-center brand + accent light, no tiling ──── */}
      <div aria-hidden="true" className="landing-atmosphere" />

      <div className="relative z-10 w-full max-w-5xl mx-auto px-6 py-16">
        <div className="flex flex-col gap-10">
          {/* Wordmark */}
          <div className="flex flex-col gap-2">
            <h1
              lang="ar"
              dir="rtl"
              aria-label="حرف (harf)"
              className="harf-wordmark"
            >
              حرف
            </h1>
            <div className="font-rubik text-muted text-sm tracking-[0.3em] uppercase">
              Harf — Quranic Arabic Mastery
            </div>
          </div>

          {/* Typewriter stack */}
          <div className="max-w-3xl">
            {/* Header — Arabic script */}
            {isVisible(0) && (
              <p
                lang="ar"
                dir="rtl"
                className="font-amiri text-[clamp(1.15rem,2.6vw,1.6rem)] text-[#ddd6c8] leading-relaxed"
              >
                {getText(0)}
                {hasCursor(0) && <Cursor />}
              </p>
            )}

            {/* Header — English translation */}
            {isVisible(1) && (
              <p className="font-rubik text-xs tracking-[0.35em] uppercase text-muted mt-1">
                {getText(1)}
                {hasCursor(1) && <Cursor />}
              </p>
            )}

            {/* Intro line */}
            {isVisible(2) && (
              <p className="text-muted text-sm italic mt-6">
                {getText(2)}
                {hasCursor(2) && <Cursor />}
              </p>
            )}

            {/* Entry lines: ism, fi'l, harf */}
            <div className="mt-6 flex flex-col gap-6">
              {SEGMENTS.slice(3).map((seg, i) => {
                const idx = i + 3;
                if (seg.kind !== 'entry' && seg.kind !== 'entry-brand') return null;
                const entrySeg = seg as {
                  id: string;
                  label: string;
                  phonetic: string;
                  typeText: string;
                  examples: readonly string[];
                  kind: 'entry' | 'entry-brand';
                  speed: number;
                  pauseAfter: number;
                };
                const isBrand = seg.kind === 'entry-brand';
                if (!isVisible(idx)) return null;

                return (
                  <div
                    key={seg.id}
                    className={`
                      animate-slide-up animate-fade-in
                      ${isBrand ? 'relative p-4 -mx-4 rounded-2xl bg-[#C41E3A]/5 border border-[#C41E3A]/10 shadow-[0_0_40px_rgba(196,30,58,0.05)]' : ''}
                    `}
                  >
                    {/* Arabic term + phonetic */}
                    <div className="flex items-baseline gap-2">
                      <span
                        lang="ar"
                        dir="rtl"
                        className={
                          isBrand
                            ? 'font-amiri text-[clamp(2rem,5vw,2.8rem)] font-bold text-[#C41E3A] harf-glow'
                            : 'font-amiri text-[clamp(2rem,5vw,2.8rem)] text-gold'
                        }
                      >
                        {entrySeg.label}
                      </span>
                      <span className="font-rubik text-xs italic tracking-[0.08em] text-muted">
                        ({entrySeg.phonetic})
                      </span>
                    </div>

                    {/* English definition */}
                    <div
                      className={
                        isBrand
                          ? 'mt-2 pl-3 border-l border-[#C41E3A]/40 text-harf-text font-semibold leading-relaxed'
                          : 'mt-2 pl-3 border-l border-gold/30 text-[#a09890] leading-relaxed'
                      }
                    >
                      {getText(idx)}
                      {hasCursor(idx) && <Cursor />}
                    </div>

                    {/* Example words */}
                    {isDone(idx) && (
                      <div
                        lang="ar"
                        dir="rtl"
                        className="mt-2 pl-3 inline-flex items-center gap-3 font-amiri text-sm text-muted/80"
                      >
                        {entrySeg.examples.map((word, wi) => (
                          <span key={word} className="flex items-center gap-3">
                            {wi > 0 && <span aria-hidden="true" className="text-muted/40">·</span>}
                            {word}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Motto line under last entry */}
                    {isBrand && isDone(idx) && (
                      <p className="mt-3 text-muted text-sm leading-relaxed">
                        Our motto: meaning only emerges in relation to other{' '}
                        <Link
                          href="/words"
                          className="text-harf-text underline decoration-gold/60 underline-offset-4 hover:text-gold"
                        >
                          words
                        </Link>.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* CTA */}
            {showCTA && (
              <div className="mt-8 animate-slide-up">
                <Link
                  href="/app"
                  className="relative overflow-hidden inline-flex items-center gap-3 px-6 py-3 rounded-full bg-gold text-bg font-semibold text-sm tracking-[0.12em] uppercase transition-all hover:gap-5 hover:-translate-y-0.5"
                >
                  <div className="absolute inset-0 w-1/2 bg-white/20 blur-md animate-shine-sweep" />
                  <span className="relative z-10">Begin</span>
                  <span aria-hidden="true" className="text-base relative z-10">→</span>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Screen-reader summary — static, complete regardless of animation state */}
        <div className="sr-only">
          <h2>أَقْسَامُ الْكَلِمَةِ — The types of words</h2>
          <p>There are three kinds of words in Arabic:</p>
          <p>
            Ism (اسْم): a word that conveys a meaning in itself without being tied to a
            particular time. Examples: kitābun (book), rajulun (man), jamīlun (beautiful).
          </p>
          <p>
            Fi&apos;l (فِعْل): a word that conveys a meaning in itself and is associated
            with a time. Examples: kataba (he wrote), yaktubu (he writes), uktub (write!).
          </p>
          <p>
            Harf (حَرْف): a word whose meaning is understood through its relationship with
            other words — the idea behind this app&apos;s name. Examples: fī (in), min
            (from), ilā (to).
          </p>
          <p>Harf is a Quranic Arabic vocabulary-mastery app. Select Begin to continue to the app.</p>
        </div>
      </div>
    </main>
  );
}
