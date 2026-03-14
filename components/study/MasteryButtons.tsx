'use client';

import { STUDY_BUTTONS, type ResponseKey } from '@/lib/srs';

interface MasteryButtonsProps {
  onResponse: (key: ResponseKey) => void;
  disabled?: boolean;
}

const BUTTON_TITLES: Record<string, string> = {
  blackout: "Complete blackout — I didn't remember (keyboard: 1)",
  hard:     'Vague recall — barely remembered (keyboard: 2)',
  good:     'Got it with effort — remembered after thinking (keyboard: 3)',
  perfect:  'Perfect recall — knew it immediately (keyboard: 4)',
};

export function MasteryButtons({ onResponse, disabled = false }: MasteryButtonsProps) {
  return (
    <div className="grid grid-cols-2 gap-2.5 w-full max-w-md mx-auto">
      {STUDY_BUTTONS.map((btn, i) => (
        <button
          key={btn.key}
          title={BUTTON_TITLES[btn.key]}
          onClick={() => onResponse(btn.key)}
          disabled={disabled}
          className={`
            py-3 px-5 rounded-xl font-medium text-sm
            min-h-[44px] min-w-[44px]
            border border-border/60
            flex items-center justify-between gap-2
            ${btn.bg} ${btn.color}
            transition-[transform,box-shadow,opacity] duration-150
            hover:scale-[1.02] hover:brightness-110
            active:scale-[0.97]
            disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:active:scale-100
            motion-reduce:transition-none
          `}
        >
          <span>{btn.label}</span>
          <span className="text-[10px] font-mono opacity-40 shrink-0">[{i + 1}]</span>
        </button>
      ))}
    </div>
  );
}
