import { useState } from 'react';
import { Award, RotateCcw, Trophy, X } from 'lucide-react';
import { PET_CATALOG } from '../game/gameConfig';
import type { GlobalHighScoreState } from '../game/types';
import { PetEmblem } from './SpeciesIcons';

interface HighScoreModalProps {
  records: GlobalHighScoreState;
  onResetRecords: () => void;
  onClose: () => void;
}

function formatRunDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime()) || date.getTime() === 0) return '—';
  try {
    return date.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

export function HighScoreModal({ records, onResetRecords, onClose }: HighScoreModalProps) {
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start sm:items-center justify-center overflow-y-auto bg-slate-950/80 p-3 sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="highscores-modal-title"
      data-testid="highscores-modal"
    >
      <div className="my-auto w-full max-w-lg rounded-2xl bg-[#0D1726] border-2 border-[#050810] shadow-[0_8px_0_#050810] overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-800/90">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-400/40 flex items-center justify-center shrink-0">
              <Trophy className="w-5 h-5 text-amber-400" />
            </div>
            <div className="min-w-0">
              <h2
                id="highscores-modal-title"
                className="text-base sm:text-lg font-display font-black text-white leading-tight truncate"
              >
                Récords Globales
              </h2>
              <p className="text-xs text-slate-400 truncate">
                Guardados automáticamente en este navegador
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar tabla de récords"
            className="touch-manipulation w-9 h-9 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-200 cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Best Performance Summary */}
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 rounded-xl bg-[#08101C] border border-amber-500/35 flex flex-col justify-between">
              <div className="text-[10px] font-bold uppercase tracking-wider text-amber-300 whitespace-nowrap">
                Récord
              </div>
              <div
                data-testid="records-best-score"
                className="text-lg sm:text-xl font-display font-black tabular-nums text-white mt-1 leading-none"
              >
                {records.bestScore.toLocaleString('es-ES')}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#08101C] border border-slate-800 flex flex-col justify-between">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap">
                Combo Máx.
              </div>
              <div className="text-lg sm:text-xl font-display font-black tabular-nums text-cyan-300 mt-1 leading-none">
                {records.bestCombo}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#08101C] border border-slate-800 flex flex-col justify-between">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap">
                Nivel Máx.
              </div>
              <div className="text-lg sm:text-xl font-display font-black tabular-nums text-emerald-400 mt-1 leading-none">
                {records.highestLevel}/5
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#08101C] border border-slate-800 flex flex-col justify-between">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap">
                Victorias
              </div>
              <div className="text-lg sm:text-xl font-display font-black tabular-nums text-amber-300 mt-1 leading-none">
                {records.totalVictories}
              </div>
            </div>
          </div>

          {/* Top 5 Runs Leaderboard */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-display font-bold text-slate-200">
                Mejores Partidas (Top 5)
              </span>
              <span className="text-slate-400 tabular-nums">
                {records.totalRuns}{' '}
                {records.totalRuns === 1 ? 'partida registrada' : 'partidas registradas'}
              </span>
            </div>

            {records.topRuns.length === 0 ? (
              <div
                data-testid="records-empty-state"
                className="rounded-xl bg-[#08101C] border border-slate-800/90 px-4 py-6 text-center space-y-1"
              >
                <Award className="w-6 h-6 text-slate-500 mx-auto" />
                <p className="text-sm font-semibold text-slate-200">
                  Aún no hay partidas registradas
                </p>
                <p className="text-xs text-slate-400">
                  Completa o finaliza una misión para registrar tu mejor desempeño aquí.
                </p>
              </div>
            ) : (
              <div
                data-testid="records-leaderboard-list"
                className="rounded-xl bg-[#08101C] border border-slate-800/90 divide-y divide-slate-800/80 overflow-hidden"
              >
                {records.topRuns.map((run, idx) => {
                  const petInfo = PET_CATALOG.find((p) => p.id === run.petId) ?? PET_CATALOG[0];
                  return (
                    <div
                      key={run.id}
                      className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`w-6 h-6 rounded-md font-mono font-black text-xs flex items-center justify-center shrink-0 ${
                            idx === 0
                              ? 'bg-amber-400 text-slate-950'
                              : idx === 1
                              ? 'bg-slate-300 text-slate-950'
                              : idx === 2
                              ? 'bg-amber-700/80 text-white'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {idx + 1}
                        </span>
                        <PetEmblem petId={run.petId} size={20} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-display font-black text-sm tabular-nums text-white">
                              {run.score.toLocaleString('es-ES')}
                            </span>
                            {run.victory && (
                              <span className="text-[10px] font-bold text-emerald-400">
                                · Victoria
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate">
                            {petInfo.name} · Niv.{run.levelReached}/5 · Combo {run.maxCombo}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0 text-[11px] text-slate-400 tabular-nums">
                        <div>{run.elapsedSec}s</div>
                        <div className="text-[10px] text-slate-500">{formatRunDate(run.achievedAt)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between gap-3 px-5 py-3.5 bg-[#09111E] border-t border-slate-800/90">
          {records.bestScore > 0 || records.topRuns.length > 0 ? (
            confirmReset ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-rose-300 font-semibold">¿Borrar todo?</span>
                <button
                  type="button"
                  data-testid="confirm-reset-records-btn"
                  onClick={() => {
                    onResetRecords();
                    setConfirmReset(false);
                  }}
                  className="touch-manipulation px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer whitespace-nowrap"
                >
                  Confirmar
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmReset(false)}
                  className="touch-manipulation px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer whitespace-nowrap"
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                type="button"
                data-testid="reset-records-btn"
                onClick={() => setConfirmReset(true)}
                className="touch-manipulation inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold cursor-pointer whitespace-nowrap"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reiniciar Récords</span>
              </button>
            )
          ) : (
            <div />
          )}

          <button
            type="button"
            onClick={onClose}
            className="touch-manipulation px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-display font-bold border border-slate-700 cursor-pointer whitespace-nowrap"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
