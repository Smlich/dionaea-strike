import { useState } from 'react';
import { Check, Copy, Download, RotateCcw, Unlock, Upload, X } from 'lucide-react';
import {
  ALL_PET_IDS,
  ALL_SPECIES_IDS,
  DEFAULT_GAME_CONFIG,
  cloneGameConfig,
  resetUnlockedPets,
  resetUnlockedSpecies,
  sanitizeGameConfig,
  saveUnlockedPets,
  saveUnlockedSpecies,
} from '../game/gameConfig';
import type { BossConfig, EnemyArchetypeId, GameConfig, LandscapeId } from '../game/types';

interface AdminConfigModalProps {
  config: GameConfig;
  onSave: (next: GameConfig) => void;
  onUnlocksChanged?: () => void;
  onClose: () => void;
}

type AdminTab = 'species' | 'player' | 'waves' | 'json';

const ENEMY_IDS: EnemyArchetypeId[] = [
  'drone',
  'mosquito',
  'tank',
  'sniper',
  'flanker',
  'hornet',
  'locust',
  'bomber',
];

export function AdminConfigModal({ config, onSave, onUnlocksChanged, onClose }: AdminConfigModalProps) {
  const [draft, setDraft] = useState<GameConfig>(() => cloneGameConfig(config));
  const [activeTab, setActiveTab] = useState<AdminTab>('species');
  const [jsonText, setJsonText] = useState(() => JSON.stringify(config, null, 2));
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSave = () => {
    const clean = sanitizeGameConfig(draft);
    onSave(clean);
    onClose();
  };

  const handleReset = () => {
    const fresh = cloneGameConfig(DEFAULT_GAME_CONFIG);
    setDraft(fresh);
    setJsonText(JSON.stringify(fresh, null, 2));
    setJsonError(null);
  };

  const handleCopyJson = async () => {
    const text = JSON.stringify(sanitizeGameConfig(draft), null, 2);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setJsonText(text);
    }
  };

  const handleDownloadJson = () => {
    const text = JSON.stringify(sanitizeGameConfig(draft), null, 2);
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'dionaea-strike-config.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleApplyJson = () => {
    try {
      const parsed = JSON.parse(jsonText);
      const clean = sanitizeGameConfig(parsed);
      setDraft(clean);
      setJsonText(JSON.stringify(clean, null, 2));
      setJsonError(null);
    } catch {
      setJsonError('El formato JSON no es válido. Revisa comas o comillas.');
    }
  };

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-modal-title"
    >
      <div className="w-full max-w-3xl max-h-[92dvh] flex flex-col rounded-2xl bg-[#101B2C] border-2 border-slate-700 shadow-2xl overflow-hidden text-slate-100">
        <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-slate-800">
          <div>
            <h2 id="admin-modal-title" className="text-lg font-display font-bold text-white">
              Panel de Administrador · Personalizar Juego
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Solo visible para cuentas administradoras. Configura las 8 carnívoras, artrópodos, 5 niveles, mini-jefes, jefes y exporta el JSON para tu web.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar panel de administración"
            className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-1 px-5 py-2.5 bg-[#0C1524] border-b border-slate-800 overflow-x-auto">
          {(
            [
              { id: 'species', label: 'Carnívoras y Mutaciones' },
              { id: 'player', label: 'Biplano, Ranita y Cápsula' },
              { id: 'waves', label: 'Artrópodos, Niveles y Jefes' },
              { id: 'json', label: 'Exportar / Importar JSON' },
            ] as { id: AdminTab; label: string }[]
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                if (tab.id === 'json') setJsonText(JSON.stringify(draft, null, 2));
                setActiveTab(tab.id);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {activeTab === 'species' && (
            <div className="space-y-4">
              {ALL_SPECIES_IDS.map((id) => {
                const sp = draft.species[id];
                const updateSp = (patch: Partial<typeof sp>) => {
                  setDraft((prev) => ({
                    ...prev,
                    species: { ...prev.species, [id]: { ...prev.species[id], ...patch } },
                  }));
                };
                return (
                  <div
                    key={id}
                    className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <input
                          type="color"
                          aria-label={`Color de ${sp.name}`}
                          value={sp.accentColor}
                          onChange={(e) => updateSp({ accentColor: e.target.value })}
                          className="w-8 h-8 rounded border border-slate-700 bg-transparent cursor-pointer"
                        />
                        <div>
                          <div className="text-sm font-display font-bold text-white">
                            {sp.name}{' '}
                            <span className="text-xs font-normal italic text-slate-400">
                              ({sp.scientificName})
                            </span>
                          </div>
                          <div className="text-xs text-slate-400">{sp.biologicalTrait}</div>
                        </div>
                      </div>
                      {id !== 'dionaea' ? (
                        <div className="flex items-center gap-3 shrink-0">
                          {sp.unlockRequirementLevel && (
                            <span className="text-[11px] font-semibold text-amber-300">
                              Desbloqueo Jefe Nv.{sp.unlockRequirementLevel}
                            </span>
                          )}
                          <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-200 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={sp.enabled}
                              onChange={(e) => updateSp({ enabled: e.target.checked })}
                              className="w-4 h-4 accent-emerald-500"
                            />
                            <span>Activa</span>
                          </label>
                        </div>
                      ) : (
                        <span className="text-xs text-emerald-400 font-medium shrink-0">Base inicial</span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <label className="flex flex-col gap-1 text-xs">
                        <span className="text-slate-400">Nombre visible</span>
                        <input
                          type="text"
                          value={sp.name}
                          onChange={(e) => updateSp({ name: e.target.value })}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-100"
                        />
                      </label>
                      <label className="flex flex-col gap-1 text-xs">
                        <span className="text-slate-400">Daño base</span>
                        <input
                          type="number"
                          min={1}
                          max={200}
                          value={sp.damage}
                          onChange={(e) => updateSp({ damage: Number(e.target.value) })}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 tabular-nums"
                        />
                      </label>
                      <label className="flex flex-col gap-1 text-xs">
                        <span className="text-slate-400">Bono cadencia (x)</span>
                        <input
                          type="number"
                          step="0.05"
                          min={0.5}
                          max={2.5}
                          value={sp.fireRateMultiplier}
                          onChange={(e) => updateSp({ fireRateMultiplier: Number(e.target.value) })}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 tabular-nums"
                        />
                      </label>
                      <label className="flex flex-col gap-1 text-xs">
                        <span className="text-slate-400">
                          {id === 'dionaea'
                            ? 'Cadencia Mordida'
                            : id === 'drosera' || id === 'pinguicula'
                            ? 'Ralentización (0.1-0.8)'
                            : id === 'nepenthes'
                            ? 'Ácido DPS'
                            : id === 'utricularia'
                            ? 'Fuerza de vacío'
                            : id === 'sarracenia'
                            ? 'Aceleración (+X)'
                            : id === 'heliamphora'
                            ? 'Curva Solar'
                            : 'Esquirlas al impacto'}
                        </span>
                        <input
                          type="number"
                          step={id === 'drosera' || id === 'pinguicula' ? '0.05' : '1'}
                          value={sp.traitStrength}
                          onChange={(e) => updateSp({ traitStrength: Number(e.target.value) })}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 tabular-nums"
                        />
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'player' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="flex flex-col gap-1 text-xs">
                <span className="text-slate-300 font-medium">Título del juego</span>
                <input
                  type="text"
                  value={draft.gameTitle}
                  onChange={(e) => setDraft({ ...draft, gameTitle: e.target.value })}
                  className="px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs">
                <span className="text-slate-300 font-medium">Subtítulo</span>
                <input
                  type="text"
                  value={draft.gameSubtitle}
                  onChange={(e) => setDraft({ ...draft, gameSubtitle: e.target.value })}
                  className="px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs">
                <span className="text-slate-300 font-medium">Vidas / HP máximo (1-12)</span>
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={draft.player.maxHp}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      player: { ...draft.player, maxHp: Number(e.target.value) },
                    })
                  }
                  className="px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white tabular-nums"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs">
                <span className="text-slate-300 font-medium">Velocidad del biplano (px/s)</span>
                <input
                  type="number"
                  min={180}
                  max={800}
                  value={draft.player.moveSpeed}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      player: { ...draft.player, moveSpeed: Number(e.target.value) },
                    })
                  }
                  className="px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white tabular-nums"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs">
                <span className="text-slate-300 font-medium">Intervalo base de disparo (seg)</span>
                <input
                  type="number"
                  step="0.02"
                  min={0.06}
                  max={0.6}
                  value={draft.player.baseFireInterval}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      player: { ...draft.player, baseFireInterval: Number(e.target.value) },
                    })
                  }
                  className="px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white tabular-nums"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs">
                <span className="text-slate-300 font-medium">Cambio de Cápsula Mutágena (seg)</span>
                <input
                  type="number"
                  step="0.1"
                  min={0.7}
                  max={5}
                  value={draft.player.mutagenCycleSec}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      player: { ...draft.player, mutagenCycleSec: Number(e.target.value) },
                    })
                  }
                  className="px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white tabular-nums"
                />
              </label>
              <label className="sm:col-span-2 flex items-center gap-2.5 p-3 rounded-xl bg-slate-900 border border-slate-800 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={draft.player.autoFire}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      player: { ...draft.player, autoFire: e.target.checked },
                    })
                  }
                  className="w-4 h-4 accent-emerald-500"
                />
                <span>Auto-disparo continuo activado</span>
              </label>

              <div className="sm:col-span-2 p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-display font-bold text-emerald-300">
                      Personaje Secundario: Ranita Copiloto
                    </div>
                    <div className="text-xs text-slate-400">
                      Dispara burbujas de rocío e intercepta esporas e insectos con su lengua.
                    </div>
                  </div>
                  <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={draft.player.frogAlly.enabled}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          player: {
                            ...draft.player,
                            frogAlly: { ...draft.player.frogAlly, enabled: e.target.checked },
                          },
                        })
                      }
                      className="w-4 h-4 accent-emerald-500"
                    />
                    <span>Activa</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <label className="flex flex-col gap-1 text-xs">
                    <span className="text-slate-400">Nombre</span>
                    <input
                      type="text"
                      value={draft.player.frogAlly.name}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          player: {
                            ...draft.player,
                            frogAlly: { ...draft.player.frogAlly, name: e.target.value },
                          },
                        })
                      }
                      className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-xs">
                    <span className="text-slate-400">Enfriamiento Lengua (seg)</span>
                    <input
                      type="number"
                      step="0.2"
                      min={1}
                      max={8}
                      value={draft.player.frogAlly.tongueCooldownSec}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          player: {
                            ...draft.player,
                            frogAlly: {
                              ...draft.player.frogAlly,
                              tongueCooldownSec: Number(e.target.value),
                            },
                          },
                        })
                      }
                      className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white tabular-nums"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-xs">
                    <span className="text-slate-400">Daño Burbuja</span>
                    <input
                      type="number"
                      min={4}
                      max={80}
                      value={draft.player.frogAlly.bubbleDamage}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          player: {
                            ...draft.player,
                            frogAlly: { ...draft.player.frogAlly, bubbleDamage: Number(e.target.value) },
                          },
                        })
                      }
                      className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white tabular-nums"
                    />
                  </label>
                </div>
              </div>

              <div className="sm:col-span-2 p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-display font-bold text-amber-300">
                    Desbloqueos de Próximas Partidas
                  </div>
                  <div className="text-xs text-slate-400">
                    Prueba las 4 carnívoras desbloqueables al instante o reinicia el progreso local.
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      saveUnlockedSpecies([...ALL_SPECIES_IDS]);
                      saveUnlockedPets([...ALL_PET_IDS]);
                      onUnlocksChanged?.();
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-xs font-bold text-white cursor-pointer"
                  >
                    <Unlock className="w-3.5 h-3.5" />
                    <span>Desbloquear Todas (8 + 5 Mascotas)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      resetUnlockedSpecies();
                      resetUnlockedPets();
                      onUnlocksChanged?.();
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 cursor-pointer"
                  >
                    Solo Iniciales
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'waves' && (
            <div className="space-y-5">
              <div className="space-y-2.5">
                <h3 className="text-sm font-display font-bold text-white">
                  Artrópodos Enemigos (Moscas y Presas de Carnívoras)
                </h3>
                <div className="grid grid-cols-1 gap-2.5">
                  {ENEMY_IDS.map((id) => {
                    const en = draft.enemies[id];
                    const updateEn = (patch: Partial<typeof en>) => {
                      setDraft((prev) => ({
                        ...prev,
                        enemies: { ...prev.enemies, [id]: { ...prev.enemies[id], ...patch } },
                      }));
                    };
                    return (
                      <div
                        key={id}
                        className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 items-end p-3 rounded-xl bg-slate-900/80 border border-slate-800"
                      >
                        <div className="col-span-2 sm:col-span-1 flex items-center gap-2">
                          <input
                            type="color"
                            aria-label={`Color de ${en.name}`}
                            value={en.accentColor}
                            onChange={(e) => updateEn({ accentColor: e.target.value })}
                            className="w-7 h-7 rounded border border-slate-700 bg-transparent cursor-pointer shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-white truncate">{en.name}</div>
                            <div className="text-[10px] text-slate-400 truncate">{en.scientificHint}</div>
                          </div>
                        </div>
                        <label className="flex flex-col gap-1 text-[11px]">
                          <span className="text-slate-400">HP</span>
                          <input
                            type="number"
                            value={en.hp}
                            onChange={(e) => updateEn({ hp: Number(e.target.value) })}
                            className="px-2 py-1 rounded bg-slate-950 border border-slate-700 text-white tabular-nums"
                          />
                        </label>
                        <label className="flex flex-col gap-1 text-[11px]">
                          <span className="text-slate-400">Velocidad</span>
                          <input
                            type="number"
                            value={en.speed}
                            onChange={(e) => updateEn({ speed: Number(e.target.value) })}
                            className="px-2 py-1 rounded bg-slate-950 border border-slate-700 text-white tabular-nums"
                          />
                        </label>
                        <label className="flex flex-col gap-1 text-[11px]">
                          <span className="text-slate-400">Puntos</span>
                          <input
                            type="number"
                            value={en.score}
                            onChange={(e) => updateEn({ score: Number(e.target.value) })}
                            className="px-2 py-1 rounded bg-slate-950 border border-slate-700 text-white tabular-nums"
                          />
                        </label>
                        <label className="flex flex-col gap-1 text-[11px]">
                          <span className="text-slate-400">Tiro (seg)</span>
                          <input
                            type="number"
                            step="0.2"
                            value={en.fireInterval}
                            onChange={(e) => updateEn({ fireInterval: Number(e.target.value) })}
                            className="px-2 py-1 rounded bg-slate-950 border border-slate-700 text-white tabular-nums"
                          />
                        </label>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2.5">
                <h3 className="text-sm font-display font-bold text-white">Oleadas y Paisajes (Niveles 1 al 5)</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {draft.waves.map((w, idx) => (
                    <div key={w.id} className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                      <div className="text-xs font-semibold text-emerald-300">{w.title}</div>
                      <div className="grid grid-cols-2 gap-2">
                        <label className="flex flex-col gap-1 text-[11px]">
                          <span className="text-slate-400">Duración (seg)</span>
                          <input
                            type="number"
                            min={8}
                            max={90}
                            value={w.durationSec}
                            onChange={(e) => {
                              const nextWaves = [...draft.waves];
                              nextWaves[idx] = { ...w, durationSec: Number(e.target.value) };
                              setDraft({ ...draft, waves: nextWaves });
                            }}
                            className="px-2 py-1 rounded bg-slate-950 border border-slate-700 text-white tabular-nums"
                          />
                        </label>
                        <label className="flex flex-col gap-1 text-[11px]">
                          <span className="text-slate-400">Paisaje</span>
                          <select
                            value={w.landscape}
                            onChange={(e) => {
                              const nextWaves = [...draft.waves];
                              nextWaves[idx] = { ...w, landscape: e.target.value as LandscapeId };
                              setDraft({ ...draft, waves: nextWaves });
                            }}
                            className="px-2 py-1 rounded bg-slate-950 border border-slate-700 text-white"
                          >
                            <option value="pampa_dawn">N1 · Amanecer en La Pampa</option>
                            <option value="jungle_falls">N2 · Selva y Cataratas Tropicales</option>
                            <option value="city_night">N3 · Buenos Aires Nocturna</option>
                            <option value="urban_viaduct">N4 · Autopista y Viaducto Urbano</option>
                            <option value="humahuaca_andes">N5 · Quebrada de Humahuaca</option>
                          </select>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2.5">
                <h3 className="text-sm font-display font-bold text-amber-400">Mini-Jefes (Mitad de Nivel)</h3>
                <div className="grid grid-cols-1 gap-2.5">
                  {draft.miniBosses.map((mb, idx) => (
                    <div
                      key={mb.level}
                      className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-xl bg-slate-900/80 border border-slate-800"
                    >
                      <label className="flex flex-col gap-1 text-xs">
                        <span className="text-slate-400">Mini-Jefe Nv.{mb.level}</span>
                        <input
                          type="text"
                          value={mb.name}
                          onChange={(e) => {
                            const nextMbs = [...draft.miniBosses] as [BossConfig, BossConfig, BossConfig, BossConfig, BossConfig];
                            nextMbs[idx] = { ...mb, name: e.target.value };
                            setDraft({ ...draft, miniBosses: nextMbs });
                          }}
                          className="px-2.5 py-1.5 rounded bg-slate-950 border border-slate-700 text-white"
                        />
                      </label>
                      <label className="flex flex-col gap-1 text-xs">
                        <span className="text-slate-400">HP Máximo</span>
                        <input
                          type="number"
                          min={180}
                          max={8000}
                          value={mb.maxHp}
                          onChange={(e) => {
                            const nextMbs = [...draft.miniBosses] as [BossConfig, BossConfig, BossConfig, BossConfig, BossConfig];
                            nextMbs[idx] = { ...mb, maxHp: Number(e.target.value) };
                            setDraft({ ...draft, miniBosses: nextMbs });
                          }}
                          className="px-2.5 py-1.5 rounded bg-slate-950 border border-slate-700 text-white tabular-nums"
                        />
                      </label>
                      <label className="flex flex-col gap-1 text-xs">
                        <span className="text-slate-400">Bono de Puntos</span>
                        <input
                          type="number"
                          min={200}
                          max={15000}
                          value={mb.scoreBonus}
                          onChange={(e) => {
                            const nextMbs = [...draft.miniBosses] as [BossConfig, BossConfig, BossConfig, BossConfig, BossConfig];
                            nextMbs[idx] = { ...mb, scoreBonus: Number(e.target.value) };
                            setDraft({ ...draft, miniBosses: nextMbs });
                          }}
                          className="px-2.5 py-1.5 rounded bg-slate-950 border border-slate-700 text-white tabular-nums"
                        />
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2.5">
                <h3 className="text-sm font-display font-bold text-rose-400">Jefes Finales de Nivel</h3>
                <div className="grid grid-cols-1 gap-3">
                  {draft.bosses.map((boss, idx) => (
                    <div
                      key={boss.level}
                      className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-900/80 border border-slate-800"
                    >
                      <label className="flex flex-col gap-1 text-xs">
                        <span className="text-slate-400">
                          Jefe Nv.{boss.level}
                          {boss.unlocksSpecies ? ` (Desbloquea ${draft.species[boss.unlocksSpecies]?.name})` : ''}
                        </span>
                        <input
                          type="text"
                          value={boss.name}
                          onChange={(e) => {
                            const nextBosses = [...draft.bosses] as [BossConfig, BossConfig, BossConfig, BossConfig, BossConfig];
                            nextBosses[idx] = { ...boss, name: e.target.value };
                            setDraft({ ...draft, bosses: nextBosses });
                          }}
                          className="px-2.5 py-1.5 rounded bg-slate-950 border border-slate-700 text-white"
                        />
                      </label>
                      <label className="flex flex-col gap-1 text-xs">
                        <span className="text-slate-400">HP Máximo</span>
                        <input
                          type="number"
                          min={250}
                          max={14000}
                          value={boss.maxHp}
                          onChange={(e) => {
                            const nextBosses = [...draft.bosses] as [BossConfig, BossConfig, BossConfig, BossConfig, BossConfig];
                            nextBosses[idx] = { ...boss, maxHp: Number(e.target.value) };
                            setDraft({ ...draft, bosses: nextBosses });
                          }}
                          className="px-2.5 py-1.5 rounded bg-slate-950 border border-slate-700 text-white tabular-nums"
                        />
                      </label>
                      <label className="flex flex-col gap-1 text-xs">
                        <span className="text-slate-400">Bono de Puntos</span>
                        <input
                          type="number"
                          min={500}
                          max={25000}
                          value={boss.scoreBonus}
                          onChange={(e) => {
                            const nextBosses = [...draft.bosses] as [BossConfig, BossConfig, BossConfig, BossConfig, BossConfig];
                            nextBosses[idx] = { ...boss, scoreBonus: Number(e.target.value) };
                            setDraft({ ...draft, bosses: nextBosses });
                          }}
                          className="px-2.5 py-1.5 rounded bg-slate-950 border border-slate-700 text-white tabular-nums"
                        />
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'json' && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyJson}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copiado' : 'Copiar JSON'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadJson}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Descargar archivo</span>
                </button>
                <button
                  type="button"
                  onClick={handleApplyJson}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-xs font-semibold text-white cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Importar texto JSON</span>
                </button>
              </div>
              {jsonError && <p className="text-xs text-rose-400 font-medium">{jsonError}</p>}
              <textarea
                aria-label="Editor JSON de configuración del juego"
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                rows={13}
                className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 font-mono text-xs text-emerald-300 leading-relaxed"
              />
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 bg-[#0C1524] border-t border-slate-800">
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restaurar Original</span>
          </button>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white cursor-pointer"
            >
              Guardar y Aplicar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
