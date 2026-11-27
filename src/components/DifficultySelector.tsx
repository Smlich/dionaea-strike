import { Check, Gauge } from 'lucide-react';
import { DIFFICULTY_ORDER, DIFFICULTY_PROFILES, getDifficultyProfile } from '../game/difficulty';
import type { DifficultyId } from '../game/types';

interface DifficultySelectorProps {
  value: DifficultyId;
  onChange: (next: DifficultyId) => void;
  compact?: boolean;
  testIdPrefix?: string;
}

const DIFFICULTY_BUTTON_STYLE: Record<
  DifficultyId,
  {
    selectedBg: string;
    selectedBorder: string;
    accentText: string;
    subLabel: string;
  }
> = {
  easy: {
    selectedBg: 'bg-emerald-950/75',
    selectedBorder: 'border-emerald-400',
    accentText: 'text-emerald-300',
    subLabel: '0.8× vel · Calma',
  },
  normal: {
    selectedBg: 'bg-[#122840]',
    selectedBorder: 'border-sky-400',
    accentText: 'text-sky-300',
    subLabel: '1.0× vel · Clásico',
  },
  hard: {
    selectedBg: 'bg-rose-950/75',
    selectedBorder: 'border-rose-400',
    accentText: 'text-rose-300',
    subLabel: '1.25× vel · Enjambre',
  },
};

function formatMult(mult: number): string {
  return `${Number.isInteger(mult) ? mult.toFixed(1) : mult.toString()}×`;
}

export function DifficultySelector({
  value,
  onChange,
  compact = false,
  testIdPrefix = 'difficulty',
}: DifficultySelectorProps) {
  const activeProfile = getDifficultyProfile(value);
  const activeStyle = DIFFICULTY_BUTTON_STYLE[value];

  if (compact) {
    return (
      <div
        data-testid={`${testIdPrefix}-selector`}
        className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2 text-left"
      >
        <div className="flex items-center justify-between gap-2 text-xs font-semibold">
          <span className="inline-flex items-center gap-1.5 text-slate-200">
            <Gauge className="w-3.5 h-3.5 text-sky-400" />
            <span>Dificultad</span>
          </span>
          <span className={`font-mono text-[10px] tabular-nums font-bold ${activeStyle.accentText}`}>
            Vel. {formatMult(activeProfile.enemySpeedMult)} · Oleadas {formatMult(activeProfile.spawnRateMult)}
          </span>
        </div>

        <div
          role="radiogroup"
          aria-label="Selector de dificultad en pausa"
          className="grid grid-cols-3 gap-1.5"
        >
          {DIFFICULTY_ORDER.map((id) => {
            const prof = DIFFICULTY_PROFILES[id];
            const style = DIFFICULTY_BUTTON_STYLE[id];
            const isSelected = value === id;
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                data-testid={`${testIdPrefix}-btn-${id}`}
                onClick={() => onChange(id)}
                className={`touch-manipulation min-h-[34px] px-2 py-1.5 rounded-lg border text-xs font-display font-extrabold transition-colors cursor-pointer inline-flex items-center justify-center gap-1 ${
                  isSelected
                    ? `${style.selectedBg} ${style.selectedBorder} text-white`
                    : 'bg-slate-950/80 border-slate-800 hover:border-slate-600 text-slate-300'
                }`}
              >
                <span>{prof.label}</span>
                {isSelected && <Check className={`w-3 h-3 shrink-0 ${style.accentText}`} />}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid={`${testIdPrefix}-selector`}
      className="w-full max-w-2xl rounded-2xl bg-[#091220]/90 border-2 border-[#050810] shadow-[0_5px_0_#050810] px-3 py-2 sm:px-3.5 sm:py-2 [@media(max-height:540px)]:px-2 [@media(max-height:540px)]:py-1.5 space-y-1.5 [@media(max-height:540px)]:space-y-1"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5">
        <div className="inline-flex items-center gap-1.5 text-[11px] [@media(max-height:540px)]:text-[10px] font-display font-black uppercase tracking-wider text-sky-300">
          <Gauge className="w-3.5 h-3.5 [@media(max-height:540px)]:w-3 [@media(max-height:540px)]:h-3 text-sky-400" />
          <span>Dificultad</span>
        </div>
        <div
          data-testid={`${testIdPrefix}-stats`}
          className={`text-[10px] sm:text-[11px] [@media(max-height:540px)]:text-[9px] font-mono font-bold tabular-nums ${activeStyle.accentText}`}
        >
          Vel. {formatMult(activeProfile.enemySpeedMult)} · Oleadas {formatMult(activeProfile.spawnRateMult)}
        </div>
      </div>

      <div
        role="radiogroup"
        aria-label="Selector de dificultad"
        className="grid grid-cols-3 gap-1.5 sm:gap-2 [@media(max-height:540px)]:gap-1"
      >
        {DIFFICULTY_ORDER.map((id) => {
          const prof = DIFFICULTY_PROFILES[id];
          const style = DIFFICULTY_BUTTON_STYLE[id];
          const isSelected = value === id;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              data-testid={`${testIdPrefix}-btn-${id}`}
              title={`${prof.label} (${prof.englishLabel}): ${prof.description}`}
              onClick={() => onChange(id)}
              className={`touch-manipulation min-h-[40px] [@media(max-height:540px)]:min-h-[32px] px-2.5 py-1 [@media(max-height:540px)]:px-1.5 rounded-xl border-2 text-left transition-colors cursor-pointer flex flex-col justify-center ${
                isSelected
                  ? `${style.selectedBg} ${style.selectedBorder} text-white shadow-[0_3px_0_#050810]`
                  : 'bg-[#0C1829] border-[#050810] hover:border-slate-500 text-slate-200'
              }`}
            >
              <div className="flex items-center justify-between gap-1 leading-tight">
                <span className="text-xs sm:text-[13px] [@media(max-height:540px)]:text-[11px] font-display font-extrabold truncate">
                  {prof.label}
                </span>
                {isSelected && <Check className={`w-3.5 h-3.5 [@media(max-height:540px)]:w-3 [@media(max-height:540px)]:h-3 shrink-0 ${style.accentText}`} />}
              </div>
              <div
                className={`[@media(max-height:540px)]:hidden text-[9px] sm:text-[10px] font-medium truncate leading-tight mt-0.5 ${
                  isSelected ? style.accentText : 'text-slate-400'
                }`}
              >
                {style.subLabel}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
