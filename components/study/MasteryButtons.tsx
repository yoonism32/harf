'use client';

import { STUDY_BUTTONS, type ResponseKey } from '@/lib/srs';

interface MasteryButtonsProps {
  onResponse: (key: ResponseKey) => void;
  disabled?: boolean;
}

export function MasteryButtons({ onResponse, disabled = false }: MasteryButtonsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 w-full max-w-md mx-auto">
      {STUDY_BUTTONS.map(btn => (
        <button
          key={btn.key}
          onClick={() => onResponse(btn.key)}
          disabled={disabled}
          className={`
            py-4 px-6 rounded-xl font-medium text-base
            min-h-[44px] min-w-[44px]
            border border-border
            ${btn.bg} ${btn.color}
            transition-[transform,brightness,opacity] duration-150
            hover:scale-[1.03] hover:brightness-110
            active:scale-[0.95]
            disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:active:scale-100
            motion-reduce:transition-none
          `}
        >
          {btn.label}
        </button>
      ))}
    </div>
  );
}
