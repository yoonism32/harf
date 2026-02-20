'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

// ── Typewriter sequence ──────────────────────────────────────────────────────
const SEGMENTS = [
  {
    id: 'h-ar',
    typeText: 'أجْزَاءُ الْجُمْلَةِ',
    kind: 'header-ar' as const,
    speed: 55,
    pauseAfter: 350,
  },
  {
    id: 'h-en',
    typeText: 'The parts of the sentence',
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
    typeText: '— a word used to name a person, animal, plant, non-living thing or anything else',
    kind: 'entry' as const,
    speed: 20,
    pauseAfter: 650,
  },
  {
    id: 'fil',
    label: 'فِعْل',
    phonetic: "fi'l",
    typeText: '— a word that denotes the occurrence of an action in a specific time',
    kind: 'entry' as const,
    speed: 20,
    pauseAfter: 650,
  },
  {
    id: 'harf',
    label: 'حَرْف',
    phonetic: 'harf',
    typeText: '— a word whose meaning does not completely manifest except in the presence of other words.',
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

  const { step, chars, done } = useTypewriter(SEGMENTS, {
    startDelay: 700,
    disabled: reduceMotion,
  });

  useEffect(() => {
    if (!done) {
      setShowCTA(false);
      return;
    }
    const t = setTimeout(() => setShowCTA(true), 500);
    return () => clearTimeout(t);
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

  const lastIdx = SEGMENTS.length - 1;

  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden bg-black flex items-center">
      {/* ── Islamic geometric background ─────────────────────────────── */}
      <svg
        aria-hidden="true"
        className="absolute inset-0 w-full h-full opacity-[0.06] pointer-events-none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern
            id="geo"
            x="0"
            y="0"
            width="60"
            height="60"
            patternUnits="userSpaceOnUse"
          >
            <g fill="none" stroke="white" strokeWidth="0.75">
              <rect x="10" y="10" width="40" height="40" />
              <rect x="10" y="10" width="40" height="40" transform="rotate(45 30 30)" />
            </g>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#geo)" />
      </svg>

      <div className="relative z-10 w-full max-w-5xl mx-auto px-6 py-16">
        <div className="flex flex-col gap-10">
          {/* Wordmark */}
          <div className="flex flex-col gap-2">
            <div
              lang="ar"
              dir="rtl"
              aria-label="حرف (harf)"
              className="harf-wordmark"
            >
              حرف
            </div>
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
                  kind: 'entry' | 'entry-brand';
                  speed: number;
                  pauseAfter: number;
                };
                const isBrand = seg.kind === 'entry-brand';
                if (!isVisible(idx)) return null;

                return (
                  <div
                    key={seg.id}
                    className={isBrand ? 'relative p-4 -mx-4 rounded-2xl bg-[#C41E3A]/5 border border-[#C41E3A]/10 shadow-[0_0_40px_rgba(196,30,58,0.05)]' : ''}
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
              <div className="mt-8">
                <Link
                  href="/app"
                  className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-gold text-bg font-semibold text-sm tracking-[0.12em] uppercase transition-all hover:gap-5 hover:-translate-y-0.5"
                >
                  Begin
                  <span aria-hidden="true" className="text-base">→</span>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Screen-reader summary */}
        <p className="sr-only">
          Harf — a Quranic Arabic learning app. حرف (harf): a word whose meaning does not completely manifest except in the presence of other words.
        </p>
      </div>
    </div>
  );
}
