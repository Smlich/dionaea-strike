import { AlertTriangle, ArrowLeftRight, Crosshair, Flame, Gamepad2, Pause, RotateCcw, Volume2, VolumeX, Zap } from 'lucide-react';
import { getComboRank, getControlPrompts } from '../game/fusionRules';
import { ALL_SPECIES_IDS, PET_CATALOG } from '../game/gameConfig';
import type { GameConfig, HudSnapshot, PetId } from '../game/types';
import { PetEmblem, SpeciesEmblem, VitalityLeafSocket } from './SpeciesIcons';

interface GameHudProps {
  hud: HudSnapshot;
  config: GameConfig;
  muted: boolean;
  onToggleMute: () => void;
  onPause: () => void;
  onRestart: () => void;
  onTriggerSpecial: () => void;
  onFireSecondary: () => void;
  onSwapAbilities: () => void;
}

const PET_HUD_THEME: Record<
  PetId,
  {
    shortLabel: string;
    desktopLabel: string;
    readyClass: string;
    activeClass: string;
    chargeBg: string;
    allyBarBg: string;
  }
> = {
  batricio: {
    shortLabel: 'Apaream.',
    desktopLabel: 'Apareamiento',
    readyClass: 'bg-lime-500 text-slate-950 hover:bg-lime-400',
    activeClass: 'bg-lime-400/95 text-slate-950 border-lime-200 cursor-default',
    chargeBg: 'bg-lime-400/30',
    allyBarBg: 'bg-lime-400/25',
  },
  roy: {
    shortLabel: 'Grito Roy',
    desktopLabel: 'Grito Roy',
    readyClass: 'bg-amber-400 text-slate-950 hover:bg-amber-300',
    activeClass: 'bg-amber-400/95 text-slate-950 border-amber-200 cursor-default',
    chargeBg: 'bg-amber-400/30',
    allyBarBg: 'bg-amber-400/25',
  },
  sicario: {
    shortLabel: 'Mafia',
    desktopLabel: 'Mafia Gatuna',
    readyClass: 'bg-emerald-500 text-slate-950 hover:bg-emerald-400',
    activeClass: 'bg-emerald-400/95 text-slate-950 border-emerald-200 cursor-default',
    chargeBg: 'bg-emerald-400/30',
    allyBarBg: 'bg-emerald-400/25',
  },
  palito: {
    shortLabel: 'Enamorar ♥',
    desktopLabel: 'Enamorar ♥',
    readyClass: 'bg-pink-500 text-white hover:bg-pink-400',
    activeClass: 'bg-pink-500/95 text-white border-pink-200 cursor-default',
    chargeBg: 'bg-pink-400/30',
    allyBarBg: 'bg-pink-400/25',
  },
  carpincho: {
    shortLabel: '¡Sapucai!',
    desktopLabel: '¡Sapucai!',
    readyClass: 'bg-orange-500 text-slate-950 hover:bg-orange-400',
    activeClass: 'bg-amber-500/95 text-slate-950 border-amber-200 cursor-default',
    chargeBg: 'bg-orange-400/30',
    allyBarBg: 'bg-orange-400/25',
  },
};

export function GameHud({
  hud,
  config,
  muted,
  onToggleMute,
  onPause,
  onRestart,
  onTriggerSpecial,
  onFireSecondary,
  onSwapAbilities,
}: GameHudProps) {
  const isCriticalHp = hud.hp <= 1;
  const specialReady = hud.specialCharge >= 0.999;
  const secondaryReady = hud.secondaryCharge >= 0.999;
  const activeSpeciesIds = ALL_SPECIES_IDS.filter((id) => hud.speciesLevels[id] > 0);
  const petInfo = PET_CATALOG.find((p) => p.id === hud.petId) ?? PET_CATALOG[0];
  const petTheme = PET_HUD_THEME[hud.petId] ?? PET_HUD_THEME.batricio;
  const primarySp = config.species[hud.primarySpecies] ?? config.species.dionaea;
  const secondarySp = config.species[hud.secondarySpecies] ?? config.species.dionaea;
  const prompts = getControlPrompts(hud.gamepadConnected);
  const isXbox = prompts.mode === 'xbox';
  const specialOngoing = Boolean(hud.activeSpecialLabel && hud.activeSpecialRemainingSec > 0.05);

  return (
    <div className="fixed inset-0 pointer-events-none select-none z-20 flex flex-col justify-between pt-[max(0.5rem,env(safe-area-inset-top))] pb-[max(0.5rem,env(safe-area-inset-bottom))] pl-[max(0.5rem,env(safe-area-inset-left))] pr-[max(0.5rem,env(safe-area-inset-right))] sm:p-3">
      {isCriticalHp && (
        <div
          aria-hidden="true"
          className="fixed inset-0 pointer-events-none"
          style={{
            boxShadow: 'inset 0 0 80px rgba(225, 29, 72, 0.5)',
          }}
        />
      )}

      {/* Top HUD Flow: Perimeter Row + Non-Overlapping Center Boss/Banner Slot */}
      <div className="flex flex-col gap-1.5 w-full">
        <div className="flex items-start justify-between gap-1.5 sm:gap-2">
          {/* Top-Left Cluster: Compact Vitality, Active Evolutions, Special & Pet */}
          <div className="flex flex-col gap-1 sm:gap-1.5 min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1 sm:gap-1.5">
              {/* Vitality Chip */}
              <div className="inline-flex items-center gap-1.5 sm:gap-2 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-lg bg-[#0B1422]/86 border border-[#090D16] shadow-[0_2px_0_#090D16]">
                <div className="flex items-center gap-0.5" aria-label={`Salud ${hud.hp} de ${hud.maxHp}`}>
                  {Array.from({ length: hud.maxHp }).map((_, idx) => {
                    const state =
                      idx < hud.hp
                        ? isCriticalHp && idx === 0
                          ? 'damaged'
                          : 'full'
                        : 'empty';
                    return <VitalityLeafSocket key={idx} state={state} />;
                  })}
                </div>
                <span className="text-[11px] sm:text-xs font-display font-extrabold tabular-nums text-white pl-1 border-l border-slate-700/80">
                  {hud.hp}/{hud.maxHp}
                </span>
              </div>

              {/* Active-Only Carnivorous Evolutions Chip */}
              <div
                className="inline-flex items-center gap-1 px-1.5 py-0.5 sm:py-1 rounded-lg bg-[#0B1422]/86 border border-[#090D16] shadow-[0_2px_0_#090D16]"
                aria-label="Niveles de mutaciones carnívoras"
              >
                {activeSpeciesIds.map((id) => {
                  const sp = config.species[id];
                  const lv = hud.speciesLevels[id];
                  return (
                    <div
                      key={id}
                      title={`${sp.name} Nv.${lv}: ${sp.roleLabel}`}
                      className={`flex items-center gap-1 px-1 sm:px-1.5 py-0.5 rounded-md ${
                        lv >= 5 ? 'bg-amber-500/20 border border-amber-400/60' : 'bg-slate-800/90'
                      }`}
                    >
                      <SpeciesEmblem
                        speciesId={id}
                        color={lv >= 5 ? '#FACC15' : sp.accentColor}
                        unlocked={true}
                        size={13}
                      />
                      <span className="hidden md:inline text-[10px] font-semibold text-slate-200 whitespace-nowrap">
                        {sp.name}
                      </span>
                      <span
                        className={`text-[10px] font-mono font-bold tabular-nums ${
                          lv >= 5 ? 'text-amber-300' : lv === 4 ? 'text-cyan-300' : 'text-emerald-300'
                        }`}
                      >
                        {lv >= 5 ? 'S5' : `N${lv}`}
                      </span>
                    </div>
                  );
                })}
                <span
                  aria-label={
                    hud.secretEvolution
                      ? 'Evolución secreta nivel 5 desbloqueada'
                      : `Evoluciones activas ${hud.activeSlotsCount} de ${hud.maxSlots}`
                  }
                  className={`px-0.5 sm:px-1 text-[10px] font-mono font-bold tabular-nums whitespace-nowrap ${
                    hud.secretEvolution ? 'text-amber-300' : 'text-slate-300'
                  }`}
                >
                  {hud.secretEvolution ? 'S5' : `${hud.activeSlotsCount}/${hud.maxSlots}`}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1 sm:gap-1.5">
              {/* Touch, Keyboard & Xbox Special Trigger Button */}
              <button
                type="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.currentTarget.blur();
                  onTriggerSpecial();
                }}
                disabled={!specialReady && !specialOngoing}
                data-testid="pet-special-btn"
                aria-label={`Activar ${petInfo.specialName} con ${prompts.specialFull}`}
                title={`${petInfo.name} — ${petInfo.specialName} [${prompts.specialFull}]: ${petInfo.specialDesc}`}
                className={`pointer-events-auto touch-manipulation relative overflow-hidden inline-flex items-center gap-1.5 min-h-[30px] sm:min-h-[28px] px-2.5 py-1 rounded-lg border border-[#090D16] shadow-[0_2px_0_#090D16] text-[11px] font-bold whitespace-nowrap active:translate-y-0.5 cursor-pointer ${
                  specialOngoing
                    ? petTheme.activeClass
                    : specialReady
                    ? petTheme.readyClass
                    : 'bg-[#0B1422]/86 text-slate-400 cursor-not-allowed'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`absolute inset-0 origin-left ${petTheme.chargeBg}`}
                  style={{ transform: `scaleX(${hud.specialCharge})` }}
                />
                <span className="relative z-10 inline-flex items-center">
                  {hud.petId ? <PetEmblem petId={hud.petId} size={15} /> : <Zap className="w-3 h-3" />}
                </span>
                <span className="relative z-10 sm:hidden">
                  {specialOngoing
                    ? `${hud.activeSpecialLabel} ${hud.activeSpecialRemainingSec.toFixed(1)}s`
                    : petTheme.shortLabel}
                </span>
                <span className="relative z-10 hidden sm:inline-flex items-center gap-1">
                  <span>
                    {specialOngoing
                      ? `${hud.activeSpecialLabel} ${hud.activeSpecialRemainingSec.toFixed(1)}s`
                      : petTheme.desktopLabel}
                  </span>
                  {!specialOngoing && (
                    <span
                      className={`px-1 py-0.5 rounded text-[9px] font-mono font-black leading-none border ${
                        isXbox
                          ? 'bg-[#DC2626] text-white border-[#090D16]'
                          : 'bg-[#090D16]/75 text-white border-white/20'
                      }`}
                    >
                      {prompts.specialShort}
                    </span>
                  )}
                </span>
              </button>

              {/* Compact Co-Pilot Pet Status */}
              {hud.frogActive && (
                <div
                  aria-label={`${petInfo.name} copiloto`}
                  title={`${petInfo.name} · Cerca: ${petInfo.closeRangeLabel} · Especial: ${petInfo.specialName}`}
                  className="relative overflow-hidden inline-flex items-center gap-1 min-h-[30px] sm:min-h-[28px] px-2 py-1 rounded-lg bg-[#0B1422]/86 border border-[#090D16] shadow-[0_2px_0_#090D16] text-[10px] font-semibold text-slate-200 whitespace-nowrap"
                >
                  <span
                    aria-hidden="true"
                    className={`absolute inset-0 origin-left ${petTheme.allyBarBg}`}
                    style={{ transform: `scaleX(${hud.frogReady})` }}
                  />
                  <span className="relative z-10 inline-flex items-center">
                    <PetEmblem petId={hud.petId} size={14} />
                  </span>
                  <span className="relative z-10 hidden sm:inline">{petInfo.name}</span>
                </div>
              )}

              {/* Xbox Controller Active Indicator */}
              {isXbox && (
                <div
                  data-testid="gamepad-badge"
                  aria-label="Control Xbox conectado"
                  title={prompts.footerSummary}
                  className="inline-flex items-center gap-1 min-h-[28px] px-2 py-0.5 rounded-lg bg-[#0B2618]/92 border border-[#107C10] shadow-[0_2px_0_#090D16] text-[10px] font-extrabold text-[#4ADE80] whitespace-nowrap"
                >
                  <Gamepad2 className="w-3.5 h-3.5 text-[#22C55E]" />
                  <span className="hidden sm:inline">Control Xbox</span>
                </div>
              )}
            </div>
          </div>

          {/* Top-Right Cluster: Compact Level/Score + Controls + Slim Combo */}
          <div className="flex flex-col items-end gap-1 sm:gap-1.5 shrink-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="flex flex-col items-end px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg bg-[#0B1422]/86 border border-[#090D16] shadow-[0_2px_0_#090D16]">
                <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-400 whitespace-nowrap leading-tight">
                  {hud.bossActive
                    ? hud.isMiniBoss
                      ? `NV.${hud.levelIndex}/5 · MINI`
                      : `NV.${hud.levelIndex}/5 · JEFE`
                    : `NV.${hud.levelIndex}/5 · OL.${hud.waveInLevel}/${hud.wavesInLevel}`}
                </span>
                <span
                  aria-label={`Puntuación ${hud.score}`}
                  className="text-sm sm:text-lg font-display font-black tabular-nums leading-none text-white"
                >
                  {hud.score.toLocaleString('es-ES')}
                </span>
              </div>

              <div className="flex items-center gap-1 pointer-events-auto">
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onToggleMute();
                  }}
                  aria-label={muted ? 'Activar sonido (M)' : 'Silenciar sonido (M)'}
                  title={muted ? 'Activar sonido [M]' : 'Silenciar [M]'}
                  className="touch-manipulation w-8 h-8 sm:w-7 sm:h-7 rounded-md bg-[#0B1422]/86 border border-[#090D16] shadow-[0_2px_0_#090D16] flex items-center justify-center text-slate-200 hover:bg-slate-800 cursor-pointer"
                >
                  {muted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5" />}
                </button>
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onRestart();
                  }}
                  aria-label="Reiniciar partida (R)"
                  title="Reiniciar [R]"
                  className="touch-manipulation w-8 h-8 sm:w-7 sm:h-7 rounded-md bg-[#0B1422]/86 border border-[#090D16] shadow-[0_2px_0_#090D16] flex items-center justify-center text-slate-200 hover:bg-slate-800 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onPause();
                  }}
                  aria-label={`Pausar juego (${prompts.pauseShort})`}
                  title={`Pausa [${prompts.pauseShort}]`}
                  className="touch-manipulation min-w-8 h-8 sm:h-7 px-1.5 rounded-md bg-[#0B1422]/86 border border-[#090D16] shadow-[0_2px_0_#090D16] inline-flex items-center justify-center gap-1 text-slate-200 hover:bg-slate-800 cursor-pointer"
                >
                  <Pause className="w-3.5 h-3.5" />
                  {isXbox && <span className="hidden sm:inline text-[9px] font-mono font-bold text-slate-300">☰</span>}
                </button>
              </div>
            </div>

            {/* Slim Live Anime Combo Streak Gauge */}
            {hud.combo >= 2 && (() => {
              const rankStyle = getComboRank(hud.combo);
              return (
                <div
                  data-testid="combo-gauge"
                  aria-label={`Combo ${hud.combo} bajas seguidas, Rango ${hud.comboRank}, multiplicador x${hud.comboMultiplier.toFixed(1)}`}
                  className="pointer-events-none flex items-center gap-1.5 sm:gap-2 px-2 py-0.5 sm:py-1 rounded-lg bg-[#0B1422]/90 border border-[#090D16] shadow-[0_2px_0_#090D16]"
                  style={{ borderColor: rankStyle.accentColor }}
                >
                  <div
                    className="w-5 h-5 sm:w-6 sm:h-6 -skew-x-[10deg] rounded border border-[#090D16] flex items-center justify-center font-display font-black text-[11px] sm:text-xs"
                    style={{ backgroundColor: rankStyle.secondaryColor, color: rankStyle.accentColor }}
                  >
                    <span className="skew-x-[10deg]">{hud.comboRank}</span>
                  </div>
                  <div className="flex flex-col min-w-[70px] sm:min-w-[82px]">
                    <div className="flex items-baseline justify-between gap-1">
                      <span
                        key={hud.combo}
                        className="animate-combo-pop text-[11px] sm:text-xs font-display font-black tabular-nums leading-none text-white"
                      >
                        {hud.combo} HITS
                      </span>
                      <span
                        className="text-[10px] font-mono font-extrabold tabular-nums"
                        style={{ color: rankStyle.accentColor }}
                      >
                        x{hud.comboMultiplier.toFixed(1)}
                      </span>
                    </div>
                    <div className="mt-0.5 h-1 w-full rounded-full bg-slate-900 overflow-hidden">
                      <div
                        className="h-full w-full origin-left transition-transform duration-75 linear"
                        style={{
                          backgroundColor: rankStyle.accentColor,
                          transform: `scaleX(${hud.comboTimerRatio})`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Non-Overlapping Center Boss HP Bar OR Compact Announcement OR Invasion Signal */}
        {(hud.bossActive || hud.banner || hud.invasionAlertLabel) && (
          <div className="self-center w-full max-w-xs sm:max-w-sm px-1 pointer-events-none flex flex-col items-center gap-1">
            {hud.bossActive && (
              <div className="w-full px-2.5 py-1 rounded-lg bg-[#0B1422]/88 border border-[#090D16] shadow-[0_2px_0_#090D16]">
                <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-bold mb-0.5 sm:mb-1 gap-2">
                  <span className={`truncate ${hud.isMiniBoss ? 'text-amber-400 tracking-wide' : 'text-rose-400 tracking-wide'}`}>
                    {hud.isMiniBoss ? 'MINI-JEFE · ' : ''}
                    {hud.bossName} {hud.bossPhase === 2 ? '· FASE 2' : ''}
                  </span>
                  <span className="tabular-nums text-slate-200 shrink-0">
                    {hud.bossHp}/{hud.bossMaxHp}
                  </span>
                </div>
                <div className="h-1.5 sm:h-2 w-full rounded-full bg-slate-900 overflow-hidden border border-slate-700">
                  <div
                    className={`h-full w-full origin-left ${hud.isMiniBoss ? 'bg-amber-500' : 'bg-rose-500'}`}
                    style={{
                      transform: `scaleX(${Math.max(0, Math.min(1, hud.bossHp / Math.max(1, hud.bossMaxHp)))})`,
                    }}
                  />
                </div>
              </div>
            )}

            {hud.banner && (
              <div
                key={hud.banner.title}
                className="animate-anime-banner px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg bg-[#0B1422]/90 border shadow-[0_3px_0_#090D16] text-center max-w-full"
                style={{ borderColor: hud.banner.accentColor }}
              >
                <div className="text-[11px] sm:text-xs font-display font-black tracking-wide text-white">
                  {hud.banner.title}
                </div>
                <div className="text-[10px] sm:text-[11px] text-slate-200">{hud.banner.detail}</div>
              </div>
            )}

            {!hud.banner && !hud.bossActive && hud.invasionAlertLabel && (
              <div
                data-testid="invasion-signal"
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#180C18]/88 border border-rose-500/70 shadow-[0_2px_0_#090D16] text-[10px] font-display font-extrabold tracking-wider uppercase text-amber-300"
              >
                <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0" />
                <span>{hud.invasionAlertLabel}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Compact Anime Combo Milestone Cut-In Overlay (bottom-left safe-area perimeter) */}
      {hud.comboMilestone && (
        <div
          key={`${hud.comboMilestone.threshold}-${hud.comboMilestone.rank}`}
          data-testid="combo-milestone-overlay"
          role="status"
          aria-live="polite"
          className="fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-[max(0.75rem,env(safe-area-inset-left))] sm:bottom-5 sm:left-5 max-w-[calc(100vw-1.5rem)] pointer-events-none z-25"
        >
          <div
            className="animate-anime-cutin relative overflow-hidden flex items-center gap-2 sm:gap-2.5 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg border-2 border-[#090D16] shadow-[0_4px_0_#090D16]"
            style={{
              backgroundColor: '#0B1422',
              boxShadow: `0 4px 0 #090D16, 0 0 0 1.5px ${hud.comboMilestone.accentColor}`,
            }}
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 240 80"
              preserveAspectRatio="none"
              className="absolute inset-0 w-full h-full opacity-25 pointer-events-none"
            >
              <polygon points="0,0 165,0 130,80 0,80" fill={hud.comboMilestone.secondaryColor} />
              <line x1="150" y1="8" x2="236" y2="8" stroke={hud.comboMilestone.accentColor} strokeWidth="2.5" />
              <line x1="158" y1="62" x2="232" y2="62" stroke={hud.comboMilestone.accentColor} strokeWidth="2" />
            </svg>

            <div
              className="relative z-10 w-8 h-8 sm:w-10 sm:h-10 rounded-md border border-[#090D16] flex flex-col items-center justify-center shrink-0"
              style={{ backgroundColor: hud.comboMilestone.secondaryColor }}
            >
              <span className="text-[7px] sm:text-[8px] font-bold uppercase tracking-widest text-slate-200 leading-none">
                Rango
              </span>
              <span
                className="text-lg sm:text-xl font-display font-black leading-none anime-stroke"
                style={{ color: hud.comboMilestone.accentColor }}
              >
                {hud.comboMilestone.rank}
              </span>
            </div>

            <div className="relative z-10 skew-x-[8deg] pr-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 shrink-0" style={{ color: hud.comboMilestone.accentColor }} />
                <span className="text-xs sm:text-sm font-display font-black tracking-wide text-white anime-stroke-sm truncate">
                  {hud.comboMilestone.title}
                </span>
                <span
                  className="px-1.5 py-0.5 rounded text-[10px] font-mono font-black tabular-nums border border-[#090D16] text-[#090D16] shrink-0"
                  style={{ backgroundColor: hud.comboMilestone.accentColor }}
                >
                  x{hud.comboMilestone.multiplier.toFixed(1)}
                </span>
              </div>
              <div className="text-[10px] sm:text-[11px] font-semibold text-slate-200 tabular-nums truncate">
                {hud.comboMilestone.subtitle}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom-Right Dual-Mode Ability Dock: Slot 1 (Auto) <-> Swap <-> Slot 2 (Manual) */}
      <div
        data-testid="dual-ability-dock"
        className="self-end flex items-center gap-1.5 pointer-events-auto"
      >
        {/* Slot 1: Primary Auto-Fire */}
        <div
          aria-label={`Habilidad principal automática ${primarySp.name}`}
          title={`Principal (Auto-Disparo): ${primarySp.name}`}
          className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#0B1422]/88 border border-[#090D16] shadow-[0_2px_0_#090D16]"
        >
          <SpeciesEmblem
            speciesId={hud.primarySpecies}
            color={primarySp.accentColor}
            unlocked={true}
            size={15}
          />
          <div className="leading-none">
            <div className="text-[8px] font-bold uppercase tracking-wider text-emerald-400">
              Auto
            </div>
            <div className="text-[11px] font-display font-bold text-white whitespace-nowrap">
              {primarySp.name}
            </div>
          </div>
        </div>

        {/* Rotate Abilities Button ([Q] or Xbox [X / LB]) */}
        <button
          type="button"
          tabIndex={-1}
          disabled={!hud.canSwapAbilities}
          onClick={(e) => {
            e.currentTarget.blur();
            onSwapAbilities();
          }}
          data-testid="swap-ability-btn"
          aria-label={`Rotar habilidad principal y secundaria con ${prompts.swapFull}`}
          title={
            hud.canSwapAbilities
              ? `Rotar Principal ↔ Secundaria [${prompts.swapFull}]`
              : `Recoge una 2ª evolución para rotar habilidades [${prompts.swapShort}]`
          }
          className={`touch-manipulation inline-flex items-center gap-1 min-h-[40px] sm:min-h-[34px] px-2.5 py-1.5 rounded-lg border border-[#090D16] shadow-[0_2px_0_#090D16] text-[11px] font-bold whitespace-nowrap transition-transform active:translate-y-0.5 ${
            hud.canSwapAbilities
              ? isXbox
                ? 'bg-[#2563EB] hover:bg-[#1D4ED8] text-white cursor-pointer'
                : 'bg-sky-600 hover:bg-sky-500 text-white cursor-pointer'
              : 'bg-[#0B1422]/80 text-slate-400 cursor-not-allowed'
          }`}
        >
          <ArrowLeftRight className="w-3.5 h-3.5" />
          <span
            className={
              isXbox
                ? 'px-1 py-0.5 rounded bg-[#1D4ED8] text-white font-mono text-[10px] leading-none border border-blue-300/40'
                : 'font-mono'
            }
          >
            {isXbox ? prompts.swapShort : `[${prompts.swapShort}]`}
          </span>
        </button>

        {/* Slot 2: Manual Secondary Power Skill ([E] or Xbox [A / RT]) */}
        <button
          type="button"
          tabIndex={-1}
          disabled={!secondaryReady}
          onClick={(e) => {
            e.currentTarget.blur();
            onFireSecondary();
          }}
          data-testid="secondary-skill-btn"
          aria-label={`Disparar habilidad secundaria ${hud.secondaryName} con ${prompts.secondaryFull}`}
          title={`Secundaria Manual [${prompts.secondaryFull}]: ${hud.secondaryName}`}
          className={`touch-manipulation relative overflow-hidden inline-flex items-center gap-1.5 min-h-[40px] sm:min-h-[34px] px-3 py-1.5 rounded-lg border-2 border-[#090D16] shadow-[0_3px_0_#090D16] text-left whitespace-nowrap transition-transform active:translate-y-0.5 ${
            secondaryReady
              ? 'bg-[#111C2E] text-white cursor-pointer'
              : 'bg-[#0B1422]/88 text-slate-400 cursor-not-allowed'
          }`}
          style={{
            borderColor: secondaryReady ? secondarySp.accentColor : '#090D16',
          }}
        >
          <span
            aria-hidden="true"
            className="absolute inset-0 origin-left opacity-30"
            style={{
              backgroundColor: secondarySp.accentColor,
              transform: `scaleX(${hud.secondaryCharge})`,
            }}
          />
          <SpeciesEmblem
            speciesId={hud.secondarySpecies}
            color={secondarySp.accentColor}
            unlocked={true}
            size={16}
          />
          <div className="relative z-10 leading-none">
            <div className="flex items-center gap-1 text-[8px] font-bold uppercase tracking-wider text-amber-300">
              <Crosshair className="w-2.5 h-2.5" />
              <span>Secundaria</span>
              <span
                className={`px-1 py-0.5 rounded font-mono text-[9px] font-black leading-none ${
                  isXbox ? 'bg-[#107C10] text-white border border-emerald-300/40' : 'text-amber-200'
                }`}
              >
                {isXbox ? prompts.secondaryShort : `[${prompts.secondaryShort}]`}
              </span>
            </div>
            <div className="text-[11px] sm:text-xs font-display font-black text-white mt-0.5">
              {hud.secondaryName}
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}

