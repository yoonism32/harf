'use client';

import { useState } from 'react';

interface AudioButtonProps {
  text: string;
  lang?: string;
  className?: string;
}

export function AudioButton({ text, lang = 'ar-SA', className = '' }: AudioButtonProps) {
  const [playing, setPlaying] = useState(false);

  const speak = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.8;
    utterance.pitch = 1;

    // Prefer Arabic voice if available
    const voices = window.speechSynthesis.getVoices();
    const arabicVoice = voices.find(v => v.lang.startsWith('ar'));
    if (arabicVoice) utterance.voice = arabicVoice;

    utterance.onstart = () => setPlaying(true);
    utterance.onend = () => setPlaying(false);
    utterance.onerror = () => setPlaying(false);

    window.speechSynthesis.speak(utterance);
  };

  return (
    <button
      onClick={speak}
      disabled={playing}
      aria-label={playing ? 'Playing pronunciation' : 'Listen to pronunciation'}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors
        focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none
        ${playing
          ? 'bg-gold/20 text-gold cursor-default'
          : 'bg-surface-plus hover:bg-border text-muted hover:text-harf-text'
        } ${className}`}
    >
      {playing ? (
        <>
          <span aria-hidden="true" className="flex gap-0.5 items-end h-4">
            <span className="w-0.5 bg-gold rounded animate-bounce" style={{ height: '60%', animationDelay: '0ms' }} />
            <span className="w-0.5 bg-gold rounded animate-bounce" style={{ height: '100%', animationDelay: '150ms' }} />
            <span className="w-0.5 bg-gold rounded animate-bounce" style={{ height: '70%', animationDelay: '300ms' }} />
            <span className="w-0.5 bg-gold rounded animate-bounce" style={{ height: '90%', animationDelay: '100ms' }} />
          </span>
          Playing…
        </>
      ) : (
        <>
          <svg aria-hidden="true" className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.784L4.39 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.39l3.993-3.784a1 1 0 011 .076zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
          </svg>
          Listen
        </>
      )}
    </button>
  );
}
