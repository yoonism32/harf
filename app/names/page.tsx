'use client';

import { useState, useEffect, useCallback } from 'react';
import { AudioButton } from '@/components/study/AudioButton';
import { STUDY_BUTTONS, RESPONSE_TO_GRADE, MASTERY_LABELS, MASTERY_COLORS, type ResponseKey } from '@/lib/srs';
import { reviewName } from '@/lib/srs';
import { getAllNameProgress, type NameProgress } from '@/lib/storage';
import namesData from '@/data/99names.json';

interface NameEntry {
  id: number;
  arabic: string;
  transliteration: string;
  meaning: string;
  explanation: string;
  root: string | null;
}

const names = namesData as NameEntry[];

export default function NamesPage() {
  const [mode, setMode] = useState<'browse' | 'study'>('browse');
  const [allProgress, setAllProgress] = useState<Record<number, NameProgress>>({});
  const [queue, setQueue] = useState<number[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [done, setDone] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setAllProgress(getAllNameProgress());
  }, []);

  const startStudy = () => {
    const progress = getAllNameProgress();
    const today = new Date().toISOString().slice(0, 10);

    const dueIds = Object.values(progress)
      .filter(p => p.nextReview <= today)
      .map(p => p.id);

    const newIds = names
      .filter(n => !progress[n.id])
      .map(n => n.id)
      .slice(0, 10);

    const q = [...dueIds, ...newIds];
    if (q.length === 0) {
      alert('No names due for review! Come back tomorrow.');
      return;
    }
    setQueue(q);
    setCurrentIndex(0);
    setFlipped(false);
    setDone(false);
    setMode('study');
  };

  const handleResponse = useCallback((key: ResponseKey) => {
    if (currentIndex >= queue.length) return;
    const nameId = queue[currentIndex] ?? 0;
    const grade = RESPONSE_TO_GRADE[key] ?? 0;
    reviewName(nameId, grade);
    setAllProgress(getAllNameProgress());
    setFlipped(false);

    const next = currentIndex + 1;
    if (next >= queue.length) {
      setDone(true);
    } else {
      setCurrentIndex(next);
    }
  }, [currentIndex, queue]);

  // Study mode
  if (mode === 'study') {
    if (done) {
      return (
        <div className="flex flex-col items-center justify-center gap-6 py-16 text-center">
          <div className="font-amiri text-5xl text-gold" dir="rtl" style={{ fontFamily: 'Amiri, serif' }}>
            سبحان الله
          </div>
          <div className="text-harf-text text-xl font-medium">Session complete!</div>
          <div className="flex gap-3">
            <button onClick={startStudy} className="px-6 py-3 bg-gold text-bg rounded-xl font-semibold">
              Study More
            </button>
            <button onClick={() => setMode('browse')} className="px-6 py-3 bg-surface-plus text-harf-text rounded-xl">
              Browse Names
            </button>
          </div>
        </div>
      );
    }

    const nameId = queue[currentIndex] ?? 0;
    const name = names.find(n => n.id === nameId);
    if (!name) return null;

    const progress = nameId ? (allProgress[nameId] ?? null) : null;
    const mastery = progress?.mastery ?? 0;

    return (
      <div className="flex flex-col gap-6 py-8 max-w-2xl mx-auto">
        {/* Progress */}
        <div className="flex items-center gap-4">
          <div className="text-muted text-sm">{currentIndex + 1} / {queue.length}</div>
          <div className="flex-1 h-1.5 bg-surface-plus rounded-full overflow-hidden">
            <div
              className="h-full bg-gold rounded-full transition-all"
              style={{ width: `${(currentIndex / queue.length) * 100}%` }}
            />
          </div>
          <button onClick={() => setMode('browse')} className="text-muted text-sm hover:text-harf-text">
            Exit
          </button>
        </div>

        {/* Card */}
        <div
          className="card min-h-64 flex flex-col items-center justify-center gap-4 p-8 cursor-pointer"
          onClick={() => !flipped && setFlipped(true)}
          style={{ borderColor: flipped ? 'var(--gold)' : 'var(--border)' }}
        >
          {flipped && <div className="absolute inset-0 bg-gradient-to-br from-gold/5 to-transparent pointer-events-none rounded-2xl" />}

          <div className="text-center" dir="rtl">
            <div className="font-amiri text-6xl text-harf-text" style={{ fontFamily: 'Amiri, serif' }}>
              {name.arabic}
            </div>
            <div className="text-muted text-sm mt-2" dir="ltr">
              #{name.id} • {name.transliteration}
            </div>
          </div>

          <AudioButton text={name.arabic} />

          {!flipped && (
            <div className="text-muted text-sm animate-pulse mt-2">Tap to reveal</div>
          )}

          {flipped && (
            <div className="w-full flex flex-col gap-4 border-t border-border pt-4 mt-2">
              <div className="text-center text-xl text-harf-text font-medium">{name.meaning}</div>
              <div className="text-muted text-sm text-center leading-relaxed">{name.explanation}</div>
              {name.root && (
                <div className="text-center">
                  <span className="text-xs text-muted">Root: </span>
                  <span className="text-gold text-sm font-mono">{name.root}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Mastery dots */}
        <div className="flex items-center justify-center gap-2">
          <div className="flex gap-1">
            {[1,2,3,4,5].map(l => (
              <div key={l} className={`mastery-dot ${l <= mastery ? MASTERY_COLORS[mastery] : 'bg-border'}`} />
            ))}
          </div>
          <span className="text-muted text-sm">{MASTERY_LABELS[mastery]}</span>
        </div>

        {/* Response buttons */}
        {flipped && (
          <div className="flex flex-col gap-3 items-center">
            <div className="text-muted text-sm">How well did you know it?</div>
            <div className="grid grid-cols-2 gap-3 w-full max-w-md">
              {STUDY_BUTTONS.map(btn => (
                <button
                  key={btn.key}
                  onClick={() => handleResponse(btn.key)}
                  className={`py-4 px-6 rounded-xl font-medium border border-border ${btn.bg} ${btn.color} hover:brightness-110 transition-all active:scale-95`}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Browse mode
  const masteredCount = mounted
    ? Object.values(allProgress).filter(p => p.mastery >= 4).length
    : 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="card p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-harf-text">أسماء الله الحسنى</h1>
          <p className="text-muted text-sm mt-1">The 99 Beautiful Names of Allah</p>
          {mounted && (
            <p className="text-muted text-sm mt-1">
              <span className="text-gold font-semibold">{masteredCount}</span> of 99 mastered
            </p>
          )}
        </div>
        <button
          onClick={startStudy}
          className="px-6 py-3 bg-gold text-bg rounded-xl font-semibold hover:bg-gold-muted transition-colors self-start md:self-auto"
        >
          Start Study Session
        </button>
      </div>

      {/* Names grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {names.map(name => {
          const progress = mounted ? (allProgress[name.id] ?? null) : null;
          const mastery = progress?.mastery ?? 0;

          return (
            <div
              key={name.id}
              className="card p-4 flex flex-col gap-2 hover:border-gold/30 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div
                  className="font-amiri text-2xl text-gold leading-tight"
                  dir="rtl"
                  style={{ fontFamily: 'Amiri, serif' }}
                >
                  {name.arabic}
                </div>
                <span className="text-muted text-xs font-mono mt-1">{name.id}</span>
              </div>

              <div className="text-harf-text text-sm font-medium">{name.transliteration}</div>
              <div className="text-muted text-sm">{name.meaning}</div>

              {name.root && (
                <div className="text-xs text-gold/60 font-mono">root: {name.root}</div>
              )}

              {/* Mastery dots */}
              <div className="flex items-center gap-2 mt-auto pt-2 border-t border-border">
                <div className="flex gap-1">
                  {[1,2,3,4,5].map(l => (
                    <div key={l} className={`mastery-dot ${l <= mastery ? MASTERY_COLORS[mastery] : 'bg-border'}`} />
                  ))}
                </div>
                <span className="text-muted text-xs">{MASTERY_LABELS[mastery]}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
