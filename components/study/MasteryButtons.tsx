'use client';

import { STUDY_BUTTONS, type ResponseKey } from '@/lib/srs';

interface MasteryButtonsProps {
  onResponse: (key: ResponseKey) => void;
  disabled?: boolean;
}

export function MasteryButtons({ onResponse, disabled = false }: MasteryButtonsProps) {
  return (
    <div className="grid grid-cols-2 gap-2.5 w-full max-w-md mx-auto">
      {STUDY_BUTTONS.map((btn, i) => (
        <button
          key={btn.key}
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
