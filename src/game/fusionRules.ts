import type {
  ComboRank,
  EnemyArchetypeId,
  FusedLoadout,
  GameConfig,
  PetId,
  ProjectileDescriptor,
  SpeciesId,
  SpeciesLevel,
  SpeciesLevels,
} from './types';

export interface SimEnemyState {
  id: number;
  archetype: EnemyArchetypeId;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  radius: number;
  age: number;
  phaseOffset: number;
  fireTimer: number;
  windupTimer: number;
  windupDuration: number;
  aimX: number;
  aimY: number;
  // Mosquito lunge AI state
  lungeState: 'track' | 'windup' | 'lunge';
  lungeTimer: number;
  // Tank shield state
  shieldActive: boolean;
  // Status effects from Carnivorous Mutations
  slowTimer: number;
  slowFactor: number;
  mucilageHits: number;
  rootedTimer: number;
  acidTimer: number;
  acidDps: number;
  hitFlashTimer: number;
  koTimer: number;
  dying: boolean;
  orbitCenterX: number;
  orbitCenterY: number;
  // Palito love charm (prevents shooting & orbits slowly in circles) + Batricio female frog venom DoT
  charmedTimer?: number;
  charmAnchorX?: number;
  charmAnchorY?: number;
  charmAngle?: number;
  poisonTimer?: number;
  poisonDps?: number;
}

export interface FrogCompanionState {
  enabled: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  tongueCooldown: number;
  tongueTimer: number;
  tongueTargetX: number;
  tongueTargetY: number;
  tongueKind: 'bullet' | 'enemy' | null;
  throatPuff: number;
  bubbleTimer: number;
  // Pet-specific close-range & singing animation timers
  muzzleFlashTimer?: number;
  meowBurstTimer?: number;
  shieldBlockTimer?: number;
  faconSlashTimer?: number;
  ponchoBlockTimer?: number;
  singingTimer?: number;
}

import { ALL_SPECIES_IDS } from './gameConfig';

const ALL_SPECIES: SpeciesId[] = ALL_SPECIES_IDS;
export const MAX_ACTIVE_SPECIES = 2;
export const STANDARD_MAX_LEVEL: SpeciesLevel = 4;
export const SECRET_MAX_LEVEL: SpeciesLevel = 5;

/**
 * Devuelve qué especies puede ofrecer la Cápsula Mutágena según las especies desbloqueadas,
 * el límite de 2 evoluciones activas o el bloqueo de evolución secreta pura (Nv 5).
 */
export function getAllowedMutagenSpecies(
  current: SpeciesLevels,
  config: GameConfig,
  unlockedSpecies: readonly SpeciesId[] = ALL_SPECIES
): SpeciesId[] {
  const unlockedSet = new Set(unlockedSpecies);
  const enabled = ALL_SPECIES.filter(
    (s) => s === 'dionaea' || (config.species[s]?.enabled && unlockedSet.has(s))
  );
  const active = enabled.filter((s) => current[s] > 0);
  if (active.length >= MAX_ACTIVE_SPECIES) {
    return active;
  }
  if (active.length === 1 && current[active[0]] >= SECRET_MAX_LEVEL) {
    return active;
  }
  return enabled;
}

/**
 * Evoluciona una mutación:
 * - Máximo 2 evoluciones diferentes activas al mismo tiempo (Nv 1..4).
 * - Si se atrapan TODAS las cápsulas de la misma evolución (1 sola activa), desbloquea la evolución secreta al llegar a Nv 5.
 */
export function applyMutagenPickup(
  current: SpeciesLevels,
  picked: SpeciesId,
  config: GameConfig,
  unlockedSpecies: readonly SpeciesId[] = ALL_SPECIES
): {
  nextLevels: SpeciesLevels;
  newLevel: SpeciesLevel;
  isOvercharge: boolean;
  unlockedSecret: boolean;
  blockedBySlotLimit: boolean;
} {
  const nextLevels: SpeciesLevels = { ...current };
  const unlockedSet = new Set(unlockedSpecies);
  if (picked !== 'dionaea' && (!config.species[picked]?.enabled || !unlockedSet.has(picked))) {
    return {
      nextLevels,
      newLevel: nextLevels[picked],
      isOvercharge: true,
      unlockedSecret: false,
      blockedBySlotLimit: false,
    };
  }

  const active = ALL_SPECIES.filter((s) => nextLevels[s] > 0);
  const cur = nextLevels[picked];

  // Regla: máximo 2 evoluciones a la vez
  if (cur === 0 && active.length >= MAX_ACTIVE_SPECIES) {
    return {
      nextLevels,
      newLevel: 0,
      isOvercharge: true,
      unlockedSecret: false,
      blockedBySlotLimit: true,
    };
  }

  // Si ya ascendió a evolución secreta Nv 5 en una sola especie, mantiene esa forma pura
  if (cur === 0 && active.length === 1 && nextLevels[active[0]] >= SECRET_MAX_LEVEL) {
    return {
      nextLevels,
      newLevel: 0,
      isOvercharge: true,
      unlockedSecret: false,
      blockedBySlotLimit: true,
    };
  }

  const hasOtherSpecies = active.some((s) => s !== picked);
  const maxAllowed: SpeciesLevel = hasOtherSpecies ? STANDARD_MAX_LEVEL : SECRET_MAX_LEVEL;

  if (cur >= maxAllowed) {
    return {
      nextLevels,
      newLevel: cur,
      isOvercharge: true,
      unlockedSecret: false,
      blockedBySlotLimit: false,
    };
  }

  const upgraded = (cur + 1) as SpeciesLevel;
  nextLevels[picked] = upgraded;
  return {
    nextLevels,
    newLevel: upgraded,
    isOvercharge: false,
    unlockedSecret: upgraded === SECRET_MAX_LEVEL,
    blockedBySlotLimit: false,
  };
}

/**
 * Calcula las habilidades combinadas y su evolución (Nv 1..4 estándar, Nv 5 secreta pura) para las 8 carnívoras.
 */
export function computeFusedLoadout(levels: SpeciesLevels, config: GameConfig): FusedLoadout {
  const clampLv = (v: SpeciesLevel | undefined, enabled: boolean): SpeciesLevel =>
    enabled ? (Math.max(0, Math.min(5, v ?? 0)) as SpeciesLevel) : 0;

  const safeLevels: SpeciesLevels = {
    dionaea: Math.max(1, Math.min(5, levels.dionaea ?? 1)) as SpeciesLevel,
    drosera: clampLv(levels.drosera, config.species.drosera.enabled),
    nepenthes: clampLv(levels.nepenthes, config.species.nepenthes.enabled),
    utricularia: clampLv(levels.utricularia, config.species.utricularia.enabled),
    sarracenia: clampLv(levels.sarracenia, config.species.sarracenia.enabled),
    pinguicula: clampLv(levels.pinguicula, config.species.pinguicula.enabled),
    heliamphora: clampLv(levels.heliamphora, config.species.heliamphora.enabled),
    cephalotus: clampLv(levels.cephalotus, config.species.cephalotus.enabled),
  };

  const activeSpecies = ALL_SPECIES.filter((s) => safeLevels[s] > 0);
  const secretEvolution = activeSpecies.length === 1 && safeLevels[activeSpecies[0]] >= 5 ? activeSpecies[0] : null;
  const dLv = safeLevels.dionaea;
  const drLv = safeLevels.drosera;
  const nLv = safeLevels.nepenthes;
  const uLv = safeLevels.utricularia;
  const sarLv = safeLevels.sarracenia;
  const pinLv = safeLevels.pinguicula;
  const helLv = safeLevels.heliamphora;
  const cepLv = safeLevels.cephalotus;

  let rateBoost = config.species.dionaea.fireRateMultiplier * (1 + (dLv - 1) * 0.12);
  for (const id of ALL_SPECIES) {
    if (id === 'dionaea') continue;
    const lv = safeLevels[id];
    if (lv > 0) {
      rateBoost *= config.species[id].fireRateMultiplier * (1 + (lv - 1) * 0.08);
    }
  }

  const fireInterval = Math.max(0.055, config.player.baseFireInterval / rateBoost);

  const dBase = config.species.dionaea.damage;
  const drBase = config.species.drosera.damage;
  const nBase = config.species.nepenthes.damage;
  const uBase = config.species.utricularia.damage;
  const sarBase = config.species.sarracenia.damage;
  const pinBase = config.species.pinguicula.damage;
  const helBase = config.species.heliamphora.damage;
  const cepBase = config.species.cephalotus.damage;

  const snapInterval =
    dLv === 1
      ? Math.max(4, Math.round(config.species.dionaea.traitStrength))
      : dLv === 2
      ? 5
      : dLv === 3
      ? 4
      : dLv === 4
      ? 3
      : 2;

  const totalLevels = ALL_SPECIES.reduce((acc, s) => acc + safeLevels[s], 0);

  return {
    levels: safeLevels,
    activeSpecies,
    secretEvolution,
    fireInterval,
    dionaeaLevel: dLv,
    dionaeaDamage: Math.round(dBase * (1 + (dLv - 1) * 0.22)),
    thornCount: dLv,
    snapIntervalShots: snapInterval,
    snapRadius: dLv === 1 ? 22 : dLv === 2 ? 30 : dLv === 3 ? 38 : dLv === 4 ? 46 : 58,
    snapDamage: Math.round(dBase * (1.7 + dLv * 0.48)),
    snapChargesSpecial: dLv >= 3,

    droseraLevel: drLv,
    droseraDamage: Math.round(drBase * (1 + Math.max(0, drLv - 1) * 0.24)),
    mucilageCount: drLv === 0 ? 0 : drLv === 1 ? 1 : drLv === 2 ? 2 : drLv === 3 ? 3 : 4,
    mucilageSlowFactor: Math.min(0.8, config.species.drosera.traitStrength + Math.max(0, drLv - 1) * 0.1),
    mucilageSplash: drLv >= 2,
    mucilageRootCap: drLv >= 3,

    nepenthesLevel: nLv,
    nepenthesDamage: Math.round(nBase * (1 + Math.max(0, nLv - 1) * 0.26)),
    acidBombCount: nLv === 0 ? 0 : nLv === 1 ? 1 : nLv <= 3 ? 2 : 3,
    acidDps: Math.round(config.species.nepenthes.traitStrength * (1 + Math.max(0, nLv - 1) * 0.32)),
    acidRadius: nLv >= 4 ? 86 : nLv >= 2 ? 70 : 54,
    acidArmorPierce: nLv >= 2,
    acidChainExplosion: nLv >= 3,

    utriculariaLevel: uLv,
    utriculariaDamage: Math.round(uBase * (1 + Math.max(0, uLv - 1) * 0.24)),
    vacuumCount: uLv === 0 ? 0 : uLv <= 2 ? 1 : uLv === 3 ? 2 : 3,
    vacuumPullStrength: config.species.utricularia.traitStrength * (1 + Math.max(0, uLv - 1) * 0.32),
    vacuumSpawnsVortex: uLv >= 2,
    vacuumLifeSiphon: uLv >= 3,

    sarraceniaLevel: sarLv,
    sarraceniaDamage: Math.round(sarBase * (1 + Math.max(0, sarLv - 1) * 0.25)),
    trumpetCount: sarLv === 0 ? 0 : sarLv,

    pinguiculaLevel: pinLv,
    pinguiculaDamage: Math.round(pinBase * (1 + Math.max(0, pinLv - 1) * 0.24)),
    crystalCount: pinLv === 0 ? 0 : pinLv === 1 ? 1 : pinLv <= 3 ? 2 : 3,

    heliamphoraLevel: helLv,
    heliamphoraDamage: Math.round(helBase * (1 + Math.max(0, helLv - 1) * 0.25)),
    solarArcCount: helLv === 0 ? 0 : helLv === 1 ? 1 : helLv <= 3 ? 2 : 3,

    cephalotusLevel: cepLv,
    cephalotusDamage: Math.round(cepBase * (1 + Math.max(0, cepLv - 1) * 0.26)),
    mortarCount: cepLv === 0 ? 0 : cepLv === 1 ? 1 : cepLv <= 3 ? 2 : 3,

    specialPower: 1 + Math.max(0, totalLevels - 1) * 0.18,
  };
}

/**
 * Construye los proyectiles en AVANCE LATERAL (+X) empezando con 1 solo proyectil a Nv.1
 * y escalando hasta Nv.4 estándar o Nv.5 Evolución Secreta.
 */
export function buildFusedShotPattern(
  loadout: FusedLoadout,
  shotIndex: number,
  config: GameConfig
): ProjectileDescriptor[] {
  const shots: ProjectileDescriptor[] = [];
  const isSecretDionaea = loadout.dionaeaLevel >= 5;
  const dCol = isSecretDionaea ? '#FACC15' : config.species.dionaea.accentColor;
  const dGlow = isSecretDionaea ? '#E11D48' : config.species.dionaea.secondaryColor;
  const isSnapTick = shotIndex % loadout.snapIntervalShots === 0;

  // 1. Dionaea (Base): Nv.1 empieza con 1 proyectil
  if (loadout.thornCount === 1) {
    if (isSnapTick) {
      shots.push({
        kind: 'snap',
        offsetX: 38,
        offsetY: 0,
        vx: 580,
        vy: 0,
        gravity: 0,
        drag: 1,
        bounces: 0,
        damage: loadout.snapDamage,
        radius: loadout.snapRadius,
        color: '#FB7185',
        glowColor: '#4ADE80',
        slowFactor: 0,
        acidDps: 0,
        acidRadius: 0,
        armorPierce: false,
        chainAcid: false,
        pullStrength: 0,
        spawnsVortex: false,
        piercing: true,
      });
    } else {
      shots.push({
        kind: 'thorn',
        offsetX: 32,
        offsetY: 0,
        vx: 700,
        vy: -14,
        gravity: 112,
        drag: 0.998,
        bounces: 0,
        damage: loadout.dionaeaDamage,
        radius: 5.5,
        color: dCol,
        glowColor: dGlow,
        slowFactor: 0,
        acidDps: 0,
        acidRadius: 0,
        armorPierce: false,
        chainAcid: false,
        pullStrength: 0,
        spawnsVortex: false,
        piercing: false,
      });
    }
  } else {
    const lanes =
      loadout.thornCount === 2
        ? [-0.5, 0.5]
        : loadout.thornCount === 3
        ? [-1, 0, 1]
        : loadout.thornCount === 4
        ? [-1.5, -0.5, 0.5, 1.5]
        : [-2, -1, 0, 1, 2];

    for (const lane of lanes) {
      shots.push({
        kind: 'thorn',
        offsetX: 32 - Math.abs(lane) * 2.5,
        offsetY: lane * 9,
        vx: isSecretDionaea ? 930 : 840 + loadout.dionaeaLevel * 14,
        vy: lane * (isSecretDionaea ? 62 : 48) - 20,
        gravity: isSecretDionaea ? 95 : 142,
        drag: 0.998,
        bounces: 0,
        damage: loadout.dionaeaDamage,
        radius: isSecretDionaea ? 6.6 : 5.5,
        color: dCol,
        glowColor: dGlow,
        slowFactor: 0,
        acidDps: 0,
        acidRadius: 0,
        armorPierce: loadout.dionaeaLevel >= 4,
        chainAcid: false,
        pullStrength: 0,
        spawnsVortex: false,
        piercing: isSecretDionaea,
      });
    }

    if (isSnapTick) {
      const snapAngles = isSecretDionaea ? [-140, 0, 140] : [0];
      for (const sVy of snapAngles) {
        shots.push({
          kind: 'snap',
          offsetX: 40,
          offsetY: 0,
          vx: isSecretDionaea ? 780 : 690,
          vy: sVy,
          gravity: 0,
          drag: 1,
          bounces: 0,
          damage: loadout.snapDamage,
          radius: loadout.snapRadius,
          color: isSecretDionaea ? '#FACC15' : '#FB7185',
          glowColor: isSecretDionaea ? '#E11D48' : '#4ADE80',
          slowFactor: 0,
          acidDps: 0,
          acidRadius: 0,
          armorPierce: loadout.dionaeaLevel >= 3,
          chainAcid: false,
          pullStrength: 0,
          spawnsVortex: false,
          piercing: true,
        });
      }
    }
  }

  // 2. Drosera: Nv.1 = 1 gota parabólica, escalando hasta 4 globos rebotantes
  if (loadout.droseraLevel > 0) {
    const drCol = config.species.drosera.accentColor;
    const drGlow = config.species.drosera.secondaryColor;
    const arcs =
      loadout.mucilageCount === 1
        ? [{ vx: 540, vy: -210 }]
        : loadout.mucilageCount === 2
        ? [
            { vx: 560, vy: -255 },
            { vx: 540, vy: 70 },
          ]
        : loadout.mucilageCount === 3
        ? [
            { vx: 570, vy: -290 },
            { vx: 450, vy: -185 },
            { vx: 580, vy: 95 },
          ]
        : [
            { vx: 590, vy: -315 },
            { vx: 470, vy: -215 },
            { vx: 550, vy: -55 },
            { vx: 600, vy: 115 },
          ];
    const bounceCap = loadout.droseraLevel >= 4 ? 2 : loadout.droseraLevel >= 2 ? 1 : 0;
    for (const arc of arcs) {
      shots.push({
        kind: 'mucilage',
        offsetX: 16,
        offsetY: arc.vy < 0 ? -14 : 14,
        vx: arc.vx,
        vy: arc.vy,
        gravity: 520,
        drag: 0.996,
        bounces: bounceCap,
        damage: loadout.droseraDamage,
        radius: loadout.droseraLevel >= 3 ? 7.8 : 6.4,
        color: drCol,
        glowColor: drGlow,
        slowFactor: loadout.mucilageSlowFactor,
        acidDps: 0,
        acidRadius: 0,
        armorPierce: false,
        chainAcid: false,
        pullStrength: 0,
        spawnsVortex: false,
        piercing: false,
      });
    }
  }

  // 3. Nepenthes: Nv.1 = 1 bomba aérea ácida
  if (loadout.nepenthesLevel > 0 && shotIndex % (loadout.nepenthesLevel >= 3 ? 2 : 3) === 0) {
    const nCol = config.species.nepenthes.accentColor;
    const nGlow = config.species.nepenthes.secondaryColor;
    const bombConfigs =
      loadout.acidBombCount === 1
        ? [{ vx: 390, vy: -55 }]
        : loadout.acidBombCount === 2
        ? [
            { vx: 440, vy: -85 },
            { vx: 300, vy: -20 },
          ]
        : [
            { vx: 480, vy: -110 },
            { vx: 365, vy: -60 },
            { vx: 260, vy: -10 },
          ];
    for (const cfg of bombConfigs) {
      shots.push({
        kind: 'acid',
        offsetX: 8,
        offsetY: 20,
        vx: cfg.vx,
        vy: cfg.vy,
        gravity: 720,
        drag: 0.995,
        bounces: 0,
        damage: loadout.nepenthesDamage,
        radius: loadout.nepenthesLevel >= 2 ? 10.5 : 9,
        color: nCol,
        glowColor: nGlow,
        slowFactor: 0,
        acidDps: loadout.acidDps,
        acidRadius: loadout.acidRadius,
        armorPierce: loadout.acidArmorPierce,
        chainAcid: loadout.acidChainExplosion,
        pullStrength: 0,
        spawnsVortex: false,
        piercing: false,
      });
    }
  }

  // 4. Utricularia: Nv.1 = 1 torpedo antigravedad
  if (loadout.utriculariaLevel > 0 && shotIndex % (loadout.utriculariaLevel >= 2 ? 1 : 2) === 0) {
    const uCol = config.species.utricularia.accentColor;
    const uGlow = config.species.utricularia.secondaryColor;
    const vacConfigs =
      loadout.vacuumCount === 1
        ? [{ vy: 32, gravity: -145 }]
        : loadout.vacuumCount === 2
        ? [
            { vy: -18, gravity: -125 },
            { vy: 64, gravity: -165 },
          ]
        : [
            { vy: -52, gravity: -110 },
            { vy: 18, gravity: -145 },
            { vy: 88, gravity: -180 },
          ];
    for (const vc of vacConfigs) {
      shots.push({
        kind: 'vacuum',
        offsetX: 28,
        offsetY: -8,
        vx: 760 + loadout.utriculariaLevel * 20,
        vy: vc.vy,
        gravity: vc.gravity,
        drag: 0.997,
        bounces: 0,
        damage: loadout.utriculariaDamage,
        radius: loadout.utriculariaLevel >= 3 ? 10.5 : 8.5,
        color: uCol,
        glowColor: uGlow,
        slowFactor: 0.15,
        acidDps: 0,
        acidRadius: 0,
        armorPierce: false,
        chainAcid: false,
        pullStrength: loadout.vacuumPullStrength,
        spawnsVortex: loadout.vacuumSpawnsVortex,
        piercing: true,
      });
    }
  }

  // 5. Sarracenia (Desbloqueable Nv.1): Nv.1 = 1 misil trompeta propulsado (+accelX tras ligera caída)
  if (loadout.sarraceniaLevel > 0 && shotIndex % 2 === 0) {
    const sarCfg = config.species.sarracenia;
    const lanes =
      loadout.trumpetCount === 1
        ? [0]
        : loadout.trumpetCount === 2
        ? [-0.6, 0.6]
        : loadout.trumpetCount === 3
        ? [-1, 0, 1]
        : [-1.5, -0.5, 0.5, 1.5];
    for (const lane of lanes) {
      shots.push({
        kind: 'trumpet',
        offsetX: 22,
        offsetY: lane * 11,
        vx: 320,
        vy: lane * 48 + 38,
        accelX: sarCfg.traitStrength + loadout.sarraceniaLevel * 65,
        gravity: 95,
        drag: 0.999,
        bounces: 0,
        damage: loadout.sarraceniaDamage,
        radius: loadout.sarraceniaLevel >= 3 ? 8.5 : 7,
        color: sarCfg.accentColor,
        glowColor: sarCfg.secondaryColor,
        slowFactor: 0,
        acidDps: 0,
        acidRadius: 0,
        armorPierce: loadout.sarraceniaLevel >= 4,
        chainAcid: false,
        pullStrength: 0,
        spawnsVortex: false,
        piercing: loadout.sarraceniaLevel >= 3,
      });
    }
  }

  // 6. Pinguicula (Desbloqueable Nv.2): Nv.1 = 1 cristal graso con rebote en techo y suelo
  if (loadout.pinguiculaLevel > 0 && shotIndex % 2 === 1) {
    const pinCfg = config.species.pinguicula;
    const angles =
      loadout.crystalCount === 1
        ? [-210]
        : loadout.crystalCount === 2
        ? [-240, 220]
        : [-260, -40, 240];
    const bounceCount = loadout.pinguiculaLevel === 1 ? 2 : loadout.pinguiculaLevel <= 3 ? 3 : 4;
    for (const vy of angles) {
      shots.push({
        kind: 'crystal',
        offsetX: 24,
        offsetY: 0,
        vx: 570,
        vy,
        gravity: 210,
        drag: 0.998,
        bounces: bounceCount,
        bounceCeiling: true,
        damage: loadout.pinguiculaDamage,
        radius: 7.5,
        color: pinCfg.accentColor,
        glowColor: pinCfg.secondaryColor,
        slowFactor: Math.min(0.75, pinCfg.traitStrength + (loadout.pinguiculaLevel - 1) * 0.08),
        acidDps: 0,
        acidRadius: 0,
        armorPierce: loadout.pinguiculaLevel >= 3,
        chainAcid: false,
        pullStrength: 0,
        spawnsVortex: false,
        piercing: loadout.pinguiculaLevel >= 3,
      });
    }
  }

  // 7. Heliamphora (Desbloqueable Nv.3): Nv.1 = 1 arco solar curvo antigravedad
  if (loadout.heliamphoraLevel > 0 && shotIndex % 2 === 0) {
    const helCfg = config.species.heliamphora;
    const arcProfiles =
      loadout.solarArcCount === 1
        ? [{ vy: 120, grav: -helCfg.traitStrength }]
        : loadout.solarArcCount === 2
        ? [
            { vy: 135, grav: -helCfg.traitStrength },
            { vy: -135, grav: helCfg.traitStrength },
          ]
        : [
            { vy: 150, grav: -helCfg.traitStrength },
            { vy: 0, grav: 0 },
            { vy: -150, grav: helCfg.traitStrength },
          ];
    for (const prof of arcProfiles) {
      shots.push({
        kind: 'solar_arc',
        offsetX: 28,
        offsetY: 0,
        vx: 660,
        vy: prof.vy,
        gravity: prof.grav,
        drag: 0.998,
        bounces: 0,
        damage: loadout.heliamphoraDamage,
        radius: 9.5,
        color: helCfg.accentColor,
        glowColor: helCfg.secondaryColor,
        slowFactor: 0,
        acidDps: 0,
        acidRadius: 0,
        armorPierce: loadout.heliamphoraLevel >= 3,
        chainAcid: false,
        pullStrength: 0,
        spawnsVortex: false,
        piercing: loadout.heliamphoraLevel >= 3,
      });
    }
  }

  // 8. Cephalotus (Desbloqueable Nv.4): Nv.1 = 1 mortero dentado pesado que se fragmenta
  if (loadout.cephalotusLevel > 0 && shotIndex % 3 === 0) {
    const cepCfg = config.species.cephalotus;
    const launches =
      loadout.mortarCount === 1
        ? [{ vx: 390, vy: -95 }]
        : loadout.mortarCount === 2
        ? [
            { vx: 450, vy: -120 },
            { vx: 320, vy: -50 },
          ]
        : [
            { vx: 490, vy: -140 },
            { vx: 380, vy: -90 },
            { vx: 270, vy: -35 },
          ];
    const splits = loadout.cephalotusLevel >= 3 ? 3 : 2;
    for (const l of launches) {
      shots.push({
        kind: 'mortar',
        offsetX: 12,
        offsetY: 16,
        vx: l.vx,
        vy: l.vy,
        gravity: 840,
        drag: 0.996,
        bounces: 0,
        splitsOnHit: splits,
        damage: loadout.cephalotusDamage,
        radius: 9.5,
        color: cepCfg.accentColor,
        glowColor: cepCfg.secondaryColor,
        slowFactor: 0,
        acidDps: 0,
        acidRadius: 0,
        armorPierce: loadout.cephalotusLevel >= 2,
        chainAcid: false,
        pullStrength: 0,
        spawnsVortex: false,
        piercing: false,
      });
    }
  }

  return shots;
}

/**
 * Posiciona suavemente a la Ranita Copiloto arriba-detrás del biplano en vista lateral.
 */
export function stepFrogAllyPosition(
  frog: FrogCompanionState,
  playerX: number,
  playerY: number,
  time: number,
  dt: number,
  worldWidth: number,
  worldHeight: number
) {
  const targetX = Math.max(24, Math.min(worldWidth - 60, playerX - 58 + Math.cos(time * 3.1) * 7));
  const targetY = Math.max(44, Math.min(worldHeight - 36, playerY - 48 + Math.sin(time * 4.2) * 8));
  const lerp = Math.min(1, dt * 8.5);
  const nextX = frog.x + (targetX - frog.x) * lerp;
  const nextY = frog.y + (targetY - frog.y) * lerp;
  frog.vx = (nextX - frog.x) / Math.max(0.001, dt);
  frog.vy = (nextY - frog.y) / Math.max(0.001, dt);
  frog.x = nextX;
  frog.y = nextY;
  if (frog.tongueCooldown > 0) frog.tongueCooldown = Math.max(0, frog.tongueCooldown - dt);
  if (frog.tongueTimer > 0) frog.tongueTimer = Math.max(0, frog.tongueTimer - dt);
  if (frog.throatPuff > 0) frog.throatPuff = Math.max(0, frog.throatPuff - dt);
}

/**
 * Elige el objetivo prioritario del lengüetazo de la Ranita:
 * 1) Proyectil enemigo peligroso cercano
 * 2) Insecto dentro del rango
 */
export function pickFrogTongueTarget(
  frogX: number,
  frogY: number,
  range: number,
  bullets: ReadonlyArray<{ active: boolean; x: number; y: number }>,
  enemies: ReadonlyArray<{ id: number; dying: boolean; x: number; y: number }>
): { kind: 'bullet'; index: number; dist: number } | { kind: 'enemy'; id: number; dist: number } | null {
  let bestBulletIdx = -1;
  let bestBulletDist = range;
  for (let i = 0; i < bullets.length; i++) {
    const b = bullets[i];
    if (!b.active) continue;
    const d = Math.hypot(b.x - frogX, b.y - frogY);
    if (d <= bestBulletDist) {
      bestBulletDist = d;
      bestBulletIdx = i;
    }
  }
  if (bestBulletIdx >= 0) {
    return { kind: 'bullet', index: bestBulletIdx, dist: bestBulletDist };
  }

  let bestEnemyId = -1;
  let bestEnemyDist = range * 1.15;
  for (const e of enemies) {
    if (e.dying) continue;
    const d = Math.hypot(e.x - frogX, e.y - frogY);
    if (d <= bestEnemyDist) {
      bestEnemyDist = d;
      bestEnemyId = e.id;
    }
  }
  if (bestEnemyId >= 0) {
    return { kind: 'enemy', id: bestEnemyId, dist: bestEnemyDist };
  }

  return null;
}

/**
 * Escala velocidad de proyectiles enemigos según el nivel (Nv.1 mucho más calmo, acelerando hacia Nv.5).
 */
export function computeEnemyBulletSpeedMult(levelIndex = 1): number {
  switch (levelIndex) {
    case 1:
      return 0.72;
    case 2:
      return 0.88;
    case 3:
      return 0.98;
    case 4:
      return 1.08;
    default:
      return levelIndex >= 5 ? 1.18 : 0.72;
  }
}

/**
 * Al disparar a una Cápsula Mutágena, cambia a la siguiente evolución disponible y reinicia su temporizador.
 */
export function advanceMutagenPodByShot(pod: {
  cycleIndex: number;
  cycleTimer: number;
  cycleDuration: number;
  hitCooldown: number;
  shiftFlash: number;
  vx: number;
  speciesOrder: readonly SpeciesId[];
}): boolean {
  if (pod.hitCooldown > 0 || pod.speciesOrder.length === 0) {
    return false;
  }
  pod.cycleIndex = (pod.cycleIndex + 1) % pod.speciesOrder.length;
  pod.cycleTimer = pod.cycleDuration;
  pod.hitCooldown = 0.14;
  pod.shiftFlash = 0.25;
  pod.vx = Math.min(125, Math.max(45, pod.vx + 72));
  return true;
}

/**
 * Escala vida, velocidad y cadencia enemiga según el nivel actual (Nv. 1..5).
 */
export function computeLevelEnemyStats(
  baseHp: number,
  baseSpeed: number,
  baseFireInterval: number,
  levelIndex = 1
): { hp: number; speed: number; fireInterval: number } {
  const lvlOffset = Math.max(0, levelIndex - 1);
  const fireScale = levelIndex === 1 ? 1.22 : Math.max(0.6, 1 - lvlOffset * 0.06);
  return {
    hp: Math.round(baseHp * (1 + lvlOffset * 0.18)),
    speed: Math.round(baseSpeed * (1 + lvlOffset * 0.07)),
    fireInterval: Math.max(0.55, Number((baseFireInterval * fireScale).toFixed(2))),
  };
}

/**
 * 8 IAs de artrópodos alados en AVANCE LATERAL (entran desde la derecha y avanzan hacia -X).
 */
export function stepEnemyBehavior(
  enemy: SimEnemyState,
  playerX: number,
  playerY: number,
  dt: number,
  worldWidth: number,
  worldHeight: number,
  config: GameConfig,
  attackTokensAvailable: number,
  levelIndex = 1
): {
  shouldFire: boolean;
  fireKind: 'single' | 'spread' | 'sniper' | 'stinger' | 'bomb' | 'twin';
  consumedToken: boolean;
} {
  enemy.age += dt;
  if (enemy.hitFlashTimer > 0) enemy.hitFlashTimer = Math.max(0, enemy.hitFlashTimer - dt);

  if (enemy.dying) {
    enemy.koTimer -= dt;
    enemy.vy += 420 * dt; // Gravity drop KO tumble!
    enemy.x += enemy.vx * 0.4 * dt;
    enemy.y += enemy.vy * dt;
    return { shouldFire: false, fireKind: 'single', consumedToken: false };
  }

  // Status effects: Drosera slow / root & Nepenthes acid DoT
  let speedMult = 1;
  if (enemy.rootedTimer > 0) {
    enemy.rootedTimer = Math.max(0, enemy.rootedTimer - dt);
    speedMult = 0.05;
  } else if (enemy.slowTimer > 0) {
    enemy.slowTimer = Math.max(0, enemy.slowTimer - dt);
    speedMult = Math.max(0.2, 1 - enemy.slowFactor);
  }

  if (enemy.acidTimer > 0) {
    enemy.acidTimer = Math.max(0, enemy.acidTimer - dt);
    enemy.hp -= enemy.acidDps * dt;
    if (enemy.archetype === 'tank') {
      enemy.shieldActive = false;
    }
  }

  // Batricio's poisonous female frogs venom DoT + mild slow
  if ((enemy.poisonTimer ?? 0) > 0) {
    enemy.poisonTimer = Math.max(0, (enemy.poisonTimer ?? 0) - dt);
    enemy.hp -= (enemy.poisonDps ?? 16) * dt;
    speedMult = Math.min(speedMult, 0.74);
  }

  // Palito's Onda Enamoradora: enamored foes cannot shoot and drift slowly in dreamy circles!
  if ((enemy.charmedTimer ?? 0) > 0) {
    enemy.charmedTimer = Math.max(0, (enemy.charmedTimer ?? 0) - dt);
    enemy.windupTimer = 0;
    const anchorX = enemy.charmAnchorX ?? enemy.x;
    const anchorY = enemy.charmAnchorY ?? enemy.y;
    enemy.charmAnchorX = anchorX;
    enemy.charmAnchorY = anchorY;
    const nextAngle = (enemy.charmAngle ?? 0) + dt * 2.15;
    enemy.charmAngle = nextAngle;
    const orbitR = 30;
    const targetX = Math.max(76, Math.min(worldWidth - 46, anchorX + Math.cos(nextAngle) * orbitR));
    const targetY = Math.max(58, Math.min(worldHeight - 58, anchorY + Math.sin(nextAngle) * orbitR));
    enemy.vx = (targetX - enemy.x) * 4.5;
    enemy.vy = (targetY - enemy.y) * 4.5;
    enemy.x += enemy.vx * dt;
    enemy.y += enemy.vy * dt;
    return { shouldFire: false, fireKind: 'single', consumedToken: false };
  }

  const enemyCfg = config.enemies[enemy.archetype];
  const scaled = computeLevelEnemyStats(enemyCfg.hp, enemyCfg.speed, enemyCfg.fireInterval, levelIndex);
  const baseSpeed = scaled.speed * speedMult;

  switch (enemy.archetype) {
    case 'drone': {
      // IA 1: Mosca Exploradora — oleada sinusoidal ágil que acelera suavemente en niveles altos
      const waveFreq = 2.7 + (levelIndex - 1) * 0.28;
      enemy.vx = -baseSpeed;
      enemy.vy = Math.cos(enemy.age * waveFreq + enemy.phaseOffset) * 96 * speedMult;
      break;
    }

    case 'mosquito': {
      // IA 2: Mosquito Lancero — se alinea en Y, retrocede en tensión 0.32s y embiste como aguijón
      if (enemy.lungeState === 'track') {
        const dy = playerY - enemy.y;
        enemy.vx = -baseSpeed * 0.52;
        enemy.vy = Math.max(-baseSpeed * 1.15, Math.min(baseSpeed * 1.15, dy * 3.1));
        enemy.lungeTimer -= dt;
        if (enemy.x < worldWidth - 65 && enemy.x > playerX + 85 && Math.abs(dy) < 56 && enemy.lungeTimer <= 0) {
          enemy.lungeState = 'windup';
          enemy.lungeTimer = 0.3;
          enemy.aimX = playerX;
          enemy.aimY = playerY;
        }
      } else if (enemy.lungeState === 'windup') {
        enemy.vx = 24 * speedMult;
        enemy.vy *= 0.65;
        enemy.lungeTimer -= dt;
        if (enemy.lungeTimer <= 0) {
          enemy.lungeState = 'lunge';
          enemy.lungeTimer = 0.88;
          const adx = Math.min(-95, enemy.aimX - enemy.x);
          const ady = enemy.aimY - enemy.y;
          const dist = Math.max(1, Math.hypot(adx, ady));
          enemy.vx = (adx / dist) * baseSpeed * 2.25;
          enemy.vy = (ady / dist) * baseSpeed * 2.25;
        }
      } else {
        enemy.lungeTimer -= dt;
        if (enemy.lungeTimer <= 0) {
          enemy.lungeState = 'track';
          enemy.lungeTimer = 0.92;
        }
      }
      break;
    }

    case 'tank': {
      // IA 3: Acorazado Real — crucero blindado con escudo frontal que frena antes de disparar en abanico
      const windupSlow = enemy.windupTimer > 0 ? 0.16 : 1;
      enemy.vx = -baseSpeed * windupSlow;
      enemy.vy = Math.sin(enemy.age * 1.35 + enemy.phaseOffset) * 48 * speedMult * windupSlow;
      break;
    }

    case 'sniper': {
      // IA 4: Mantis Monóculo — mantiene distancia táctica en el tercio derecho y esquiva hacia atrás
      const hoverX = Math.max(worldWidth * 0.68, worldWidth - 220);
      const distToPlayer = Math.hypot(playerX - enemy.x, playerY - enemy.y);
      if (distToPlayer < 220 && enemy.windupTimer <= 0) {
        enemy.vx = baseSpeed * 1.05;
        enemy.vy = (enemy.y >= playerY ? 1 : -1) * baseSpeed * 1.32;
      } else if (enemy.x > hoverX) {
        enemy.vx = -baseSpeed * 1.2;
      } else {
        enemy.vx = Math.sin(enemy.age * 2.2 + enemy.phaseOffset) * 28 * speedMult;
      }
      if (enemy.windupTimer > 0) {
        enemy.vy *= 0.4;
      } else if (distToPlayer >= 220) {
        const dy = playerY - enemy.y;
        enemy.vy = Math.max(-baseSpeed, Math.min(baseSpeed, dy * 1.85));
      }
      break;
    }

    case 'flanker': {
      // IA 5: Cazador Orbital — describe elipses amplias barriendo arriba y abajo mientras avanza
      enemy.orbitCenterX = Math.max(worldWidth * 0.4, enemy.orbitCenterX - 46 * dt * speedMult);
      enemy.orbitCenterY += Math.sin(enemy.age * 1.15 + enemy.phaseOffset) * 38 * dt;
      const tx = enemy.orbitCenterX + Math.cos(enemy.age * 3.3 + enemy.phaseOffset) * 74;
      const ty = enemy.orbitCenterY + Math.sin(enemy.age * 3.3 + enemy.phaseOffset) * 124;
      enemy.vx = (tx - enemy.x) * 3.0 * speedMult;
      enemy.vy = (ty - enemy.y) * 3.4 * speedMult;
      break;
    }

    case 'hornet': {
      // IA 6: Avispón Guardia — escolta real en patrón figura-8 barriendo el flanco derecho
      const patrolX = Math.max(worldWidth * 0.54, worldWidth - 190 - enemy.age * 20);
      enemy.vx = enemy.x > patrolX ? -baseSpeed * 1.05 : Math.sin(enemy.age * 4.2 + enemy.phaseOffset) * 62 * speedMult;
      enemy.vy = Math.cos(enemy.age * 2.35 + enemy.phaseOffset) * 168 * speedMult;
      break;
    }

    case 'locust': {
      // IA 7: Langosta Saltarina — saltos parabólicos altos con ráfaga doble en el aire
      enemy.vx = -baseSpeed;
      enemy.lungeTimer -= dt;
      if (enemy.lungeTimer <= 0) {
        enemy.lungeTimer = 1.0 + (enemy.phaseOffset % 0.35);
        enemy.vy = -275 * speedMult;
      } else {
        enemy.vy += 480 * dt * speedMult;
      }
      break;
    }

    case 'bomber': {
      // IA 8: Escarabajo Galeón — bombardero pesado en carril alto soltando bombas rebotantes
      const targetLaneY = worldHeight * (0.21 + Math.sin(enemy.age * 1.15 + enemy.phaseOffset) * 0.09);
      enemy.vx = -baseSpeed * 0.88;
      enemy.vy = (targetLaneY - enemy.y) * 2.6 * speedMult;
      break;
    }
  }

  enemy.x += enemy.vx * dt;
  enemy.y += enemy.vy * dt;

  const marginY = enemy.radius + 46;
  if (enemy.y < marginY) {
    enemy.y = marginY;
    enemy.vy = Math.abs(enemy.vy);
  } else if (enemy.y > worldHeight - marginY) {
    enemy.y = worldHeight - marginY;
    enemy.vy = -Math.abs(enemy.vy);
  }
  if ((enemy.archetype === 'sniper' || enemy.archetype === 'hornet') && enemy.x > worldWidth - 36 && enemy.age > 1.2) {
    enemy.x = worldWidth - 36;
  }

  // Telegraph & fire with crowd attack token pool
  if (enemy.windupTimer > 0) {
    enemy.windupTimer -= dt;
    if (enemy.windupTimer <= 0) {
      enemy.windupTimer = 0;
      enemy.fireTimer = scaled.fireInterval;
      if (enemy.archetype === 'tank') {
        enemy.shieldActive = true;
      }
      const fireKind =
        enemy.archetype === 'tank'
          ? 'spread'
          : enemy.archetype === 'sniper'
          ? 'sniper'
          : enemy.archetype === 'hornet'
          ? 'stinger'
          : enemy.archetype === 'bomber'
          ? 'bomb'
          : enemy.archetype === 'locust'
          ? 'twin'
          : 'single';
      return { shouldFire: true, fireKind, consumedToken: false };
    }
    return { shouldFire: false, fireKind: 'single', consumedToken: false };
  }

  enemy.fireTimer -= dt;
  const inFireZone = enemy.x < worldWidth - 28 && enemy.x > worldWidth * 0.24;
  if (enemy.fireTimer <= 0 && inFireZone && attackTokensAvailable > 0) {
    if (enemy.archetype === 'sniper') {
      enemy.windupDuration = 0.56;
      enemy.windupTimer = 0.56;
      enemy.aimX = playerX;
      enemy.aimY = playerY;
      return { shouldFire: false, fireKind: 'sniper', consumedToken: true };
    }
    if (enemy.archetype === 'tank') {
      enemy.windupDuration = 0.48;
      enemy.windupTimer = 0.48;
      enemy.shieldActive = false;
      return { shouldFire: false, fireKind: 'spread', consumedToken: true };
    }
    if (enemy.archetype === 'hornet') {
      enemy.windupDuration = 0.3;
      enemy.windupTimer = 0.3;
      return { shouldFire: false, fireKind: 'stinger', consumedToken: true };
    }
    if (enemy.archetype === 'bomber') {
      enemy.windupDuration = 0.26;
      enemy.windupTimer = 0.26;
      return { shouldFire: false, fireKind: 'bomb', consumedToken: true };
    }
    enemy.fireTimer = scaled.fireInterval;
    return {
      shouldFire: true,
      fireKind: enemy.archetype === 'locust' ? 'twin' : 'single',
      consumedToken: true,
    };
  }

  return { shouldFire: false, fireKind: 'single', consumedToken: false };
}

export function checkCircleCollision(
  ax: number,
  ay: number,
  ar: number,
  bx: number,
  by: number,
  br: number
): boolean {
  const dx = ax - bx;
  const dy = ay - by;
  const r = ar + br;
  return dx * dx + dy * dy <= r * r;
}

export const COMBO_WINDOW_SEC = 3.2;

export interface ComboMilestoneSpec {
  threshold: number;
  rank: ComboRank;
  title: string;
  subtitle: string;
  accentColor: string;
  secondaryColor: string;
}

export const COMBO_MILESTONES: readonly ComboMilestoneSpec[] = [
  {
    threshold: 5,
    rank: 'A',
    title: '¡RACHA BOTÁNICA!',
    subtitle: '5 bajas seguidas',
    accentColor: '#4ADE80',
    secondaryColor: '#14532D',
  },
  {
    threshold: 10,
    rank: 'S',
    title: '¡FURIA CARNÍVORA!',
    subtitle: '10 bajas seguidas',
    accentColor: '#38BDF8',
    secondaryColor: '#0C4A6E',
  },
  {
    threshold: 20,
    rank: 'SS',
    title: '¡TORMENTA CLOROFILA!',
    subtitle: '20 bajas seguidas',
    accentColor: '#FACC15',
    secondaryColor: '#713F12',
  },
  {
    threshold: 35,
    rank: 'SSS',
    title: '¡DEPREDADOR SUPREMO!',
    subtitle: '35 bajas seguidas',
    accentColor: '#FB7185',
    secondaryColor: '#881337',
  },
  {
    threshold: 50,
    rank: 'APEX',
    title: '¡SOBRECARGA APEX!',
    subtitle: '50 bajas seguidas',
    accentColor: '#E879F9',
    secondaryColor: '#581C87',
  },
];

export function getComboMultiplier(combo: number): number {
  const safe = Math.max(0, combo);
  return Math.min(5, 1 + Math.floor(safe / 4) * 0.5);
}

export function getComboRank(combo: number): {
  rank: ComboRank;
  accentColor: string;
  secondaryColor: string;
} {
  if (combo >= 50) return { rank: 'APEX', accentColor: '#E879F9', secondaryColor: '#581C87' };
  if (combo >= 35) return { rank: 'SSS', accentColor: '#FB7185', secondaryColor: '#881337' };
  if (combo >= 20) return { rank: 'SS', accentColor: '#FACC15', secondaryColor: '#713F12' };
  if (combo >= 10) return { rank: 'S', accentColor: '#38BDF8', secondaryColor: '#0C4A6E' };
  if (combo >= 5) return { rank: 'A', accentColor: '#4ADE80', secondaryColor: '#14532D' };
  if (combo >= 2) return { rank: 'B', accentColor: '#94A3B8', secondaryColor: '#1E293B' };
  return { rank: 'C', accentColor: '#64748B', secondaryColor: '#0F172A' };
}

export function checkComboMilestoneCrossed(
  prevCombo: number,
  nextCombo: number
): (ComboMilestoneSpec & { multiplier: number; tierIndex: number }) | null {
  if (nextCombo <= prevCombo) return null;
  for (let i = COMBO_MILESTONES.length - 1; i >= 0; i--) {
    const m = COMBO_MILESTONES[i];
    if (prevCombo < m.threshold && nextCombo >= m.threshold) {
      return {
        ...m,
        multiplier: getComboMultiplier(nextCombo),
        tierIndex: i,
      };
    }
  }
  return null;
}

export function calculateKillScore(baseScore: number, combo: number): number {
  return Math.round(baseScore * getComboMultiplier(combo));
}

export interface PetSpecialProfile {
  kind: 'mating_call' | 'roy_scream' | 'sicario_mafia' | 'palito_charm' | 'carpincho_infernales';
  bulletClearRadius: number;
  damageRadius: number;
  enemyDamage: number;
  bossDamage: number;
  stunSec: number;
  knockbackX: number;
  durationSec: number;
  squadSize: number;
  cooldownFactor: number;
  calloutText: string;
  calloutColor: string;
}

export function getPetSpecialProfile(
  petId: PetId,
  specialPower: number,
  utriculariaLevel: SpeciesLevel
): PetSpecialProfile {
  if (petId === 'roy') {
    return {
      kind: 'roy_scream',
      bulletClearRadius: 380 * specialPower,
      damageRadius: 350 * specialPower,
      enemyDamage: Math.round(66 * specialPower),
      bossDamage: Math.round(54 * specialPower),
      stunSec: 2.2,
      knockbackX: 72,
      durationSec: 0.72,
      squadSize: 0,
      cooldownFactor: utriculariaLevel > 0 ? 1 - utriculariaLevel * 0.08 : 1,
      calloutText: '¡MIAAAAAUUUU!!',
      calloutColor: '#FDE047',
    };
  }
  if (petId === 'sicario') {
    return {
      kind: 'sicario_mafia',
      bulletClearRadius: 155 * specialPower,
      damageRadius: 170 * specialPower,
      enemyDamage: Math.round(34 * specialPower),
      bossDamage: Math.round(24 * specialPower),
      stunSec: 0.45,
      knockbackX: 28,
      durationSec: 4.8,
      squadSize: 4,
      cooldownFactor: utriculariaLevel > 0 ? 1 - utriculariaLevel * 0.08 : 1,
      calloutText: '¡MAFIA GATUNA!!',
      calloutColor: '#4ADE80',
    };
  }
  if (petId === 'palito') {
    return {
      kind: 'palito_charm',
      bulletClearRadius: 340 * specialPower,
      damageRadius: 1600, // Full-screen romantic wave!
      enemyDamage: Math.round(28 * specialPower),
      bossDamage: Math.round(36 * specialPower),
      stunSec: 4.8,
      knockbackX: 0,
      durationSec: 4.8,
      squadSize: 0,
      cooldownFactor: utriculariaLevel > 0 ? 1 - utriculariaLevel * 0.08 : 1,
      calloutText: '¡ONDA ENAMORADORA ♥!',
      calloutColor: '#F472B6',
    };
  }
  if (petId === 'carpincho') {
    return {
      kind: 'carpincho_infernales',
      bulletClearRadius: 240 * specialPower,
      damageRadius: 280 * specialPower,
      enemyDamage: Math.round(78 * specialPower),
      bossDamage: Math.round(68 * specialPower),
      stunSec: 1.1,
      knockbackX: 54,
      durationSec: 3.6,
      squadSize: 5,
      cooldownFactor: utriculariaLevel > 0 ? 1 - utriculariaLevel * 0.08 : 1,
      calloutText: '¡SAPUCAAAAAAIIII!!',
      calloutColor: '#FACC15',
    };
  }
  // Sapo Batricio: Llamado de Apareamiento — sings croaks summoning raining poisonous female frogs!
  return {
    kind: 'mating_call',
    bulletClearRadius: 250 * specialPower,
    damageRadius: 230 * specialPower,
    enemyDamage: Math.round(42 * specialPower),
    bossDamage: Math.round(32 * specialPower),
    stunSec: 0,
    knockbackX: 0,
    durationSec: 3.2,
    squadSize: 16,
    cooldownFactor: utriculariaLevel > 0 ? 1 - utriculariaLevel * 0.1 : 1,
    calloutText: '¡LLAMADO DE APAREAMIENTO!',
    calloutColor: '#A3E635',
  };
}

export function isPetUnlocked(petId: PetId, unlockedPets: readonly PetId[]): boolean {
  return petId === 'batricio' || unlockedPets.includes(petId);
}

export function clampAudioVolume(value: number): number {
  if (!Number.isFinite(value)) return 0.7;
  return Math.max(0, Math.min(1, value));
}

export interface BeatSnapshot {
  beatIndex: number;
  beatPhase: number;
  beatPulse: number;
  isDownbeat: boolean;
}

/**
 * Calcula la fase exacta del compás musical para pulsar fondos, efectos y ritmo de juego.
 */
export function computeBeatSnapshot(
  musicTimeSec: number,
  bpm: number,
  firstDropSec: number
): BeatSnapshot {
  const safeBpm = Math.max(40, bpm);
  const beatDuration = 60 / safeBpm;
  const rel = musicTimeSec - firstDropSec;
  if (rel < 0) {
    return { beatIndex: -1, beatPhase: 0, beatPulse: 0, isDownbeat: false };
  }
  const exactBeat = rel / beatDuration;
  const beatIndex = Math.floor(exactBeat);
  const beatPhase = exactBeat - beatIndex;
  const beatPulse = Math.pow(1 - beatPhase, 3);
  return {
    beatIndex,
    beatPhase,
    beatPulse,
    isDownbeat: beatIndex % 4 === 0,
  };
}

/**
 * Determina cuántos spawns rítmicos corresponden entre [prevTimeSec, nextTimeSec]
 * alineados estrictamente al BPM y primer golpe de la canción del nivel.
 */
export function computeBeatSpawnEvents(
  prevTimeSec: number,
  nextTimeSec: number,
  bpm: number,
  firstDropSec: number,
  beatsPerSpawn: number
): { count: number; hasDownbeat: boolean; lastSlotIndex: number } {
  const safeBpm = Math.max(40, bpm);
  const slotSec = (60 / safeBpm) * Math.max(0.5, beatsPerSpawn);
  const prevRel = prevTimeSec - firstDropSec;
  const nextRel = nextTimeSec - firstDropSec;

  if (nextRel < 0 || nextTimeSec <= prevTimeSec) {
    return { count: 0, hasDownbeat: false, lastSlotIndex: -1 };
  }

  const prevSlot = prevRel < 0 ? -1 : Math.floor(prevRel / slotSec);
  const nextSlot = Math.floor(nextRel / slotSec);

  if (nextSlot <= prevSlot) {
    return { count: 0, hasDownbeat: false, lastSlotIndex: prevSlot };
  }

  const count = Math.min(2, nextSlot - prevSlot);
  let hasDownbeat = false;
  for (let s = prevSlot + 1; s <= nextSlot; s++) {
    const beatNum = Math.round(s * beatsPerSpawn);
    if (beatNum % 4 === 0) {
      hasDownbeat = true;
      break;
    }
  }
  return { count, hasDownbeat, lastSlotIndex: nextSlot };
}

export interface LogicalViewport {
  cssWidth: number;
  cssHeight: number;
  scale: number;
  logicalWidth: number;
  logicalHeight: number;
}

/**
 * Computes a uniform world scale so the playfield guarantees enough tactical space
 * on small portrait/landscape phones while keeping consistent arcade proportions on
 * tablets, laptops, 4K, and ultrawide displays without black bars or distortion.
 */
export function computeViewportScale(cssWidth: number, cssHeight: number): number {
  const w = Math.max(280, cssWidth);
  const h = Math.max(280, cssHeight);
  const minFit = Math.min(w / 620, h / 560);
  if (minFit < 1) {
    return Math.max(0.42, minFit);
  }
  const wideFit = Math.min(w / 1180, h / 720);
  return Math.max(1, Math.min(2, wideFit));
}

export function computeLogicalViewport(cssWidth: number, cssHeight: number): LogicalViewport {
  const w = Math.max(280, Math.round(cssWidth));
  const h = Math.max(280, Math.round(cssHeight));
  const scale = computeViewportScale(w, h);
  return {
    cssWidth: w,
    cssHeight: h,
    scale,
    logicalWidth: Math.round(w / scale),
    logicalHeight: Math.round(h / scale),
  };
}

// ============================================================================
// DUAL-MODE ROTATING ABILITY SYSTEM (PRIMARY AUTO vs. SECONDARY MANUAL SKILL)
// ============================================================================

export interface SecondaryAbilityMeta {
  speciesId: SpeciesId;
  name: string;
  shortName: string;
  description: string;
  cooldownSec: number;
  accentColor: string;
  secondaryColor: string;
}

export const SECONDARY_ABILITY_META: Record<SpeciesId, SecondaryAbilityMeta> = {
  dionaea: {
    speciesId: 'dionaea',
    name: 'Fauces Guillotina',
    shortName: 'Guillotina',
    description: 'Mandíbula gigante que devora balas enemigas y perfora blindaje.',
    cooldownSec: 1.25,
    accentColor: '#FB7185',
    secondaryColor: '#4ADE80',
  },
  drosera: {
    speciesId: 'drosera',
    name: 'Red Pegajosa',
    shortName: 'Red Bola',
    description: 'Abanico de 5 bolas pegajosas que enraízan y frenan a toda la formación.',
    cooldownSec: 1.45,
    accentColor: '#F59E0B',
    secondaryColor: '#FDE047',
  },
  nepenthes: {
    speciesId: 'nepenthes',
    name: 'Jarra Mortero',
    shortName: 'Mortero',
    description: 'Bomba ácida colosal que explota en un mega-charco y 4 chorros corrosivos.',
    cooldownSec: 1.75,
    accentColor: '#A855F7',
    secondaryColor: '#BEF264',
  },
  utricularia: {
    speciesId: 'utricularia',
    name: 'Singularidad Botánica',
    shortName: 'Singularidad',
    description: 'Orbe gravitacional lento que succiona enemigos y absorbe balas a su paso.',
    cooldownSec: 1.95,
    accentColor: '#38BDF8',
    secondaryColor: '#CFFAFE',
  },
  sarracenia: {
    speciesId: 'sarracenia',
    name: 'Salva Supersónica',
    shortName: 'Salva Jet',
    description: '4 misiles escalonados que caen y aceleran a velocidad supersónica perforante.',
    cooldownSec: 1.55,
    accentColor: '#FB923C',
    secondaryColor: '#FEF08A',
  },
  pinguicula: {
    speciesId: 'pinguicula',
    name: 'Lluvia de Prisma',
    shortName: 'Prismas',
    description: 'Abanico de 5 prismas hiper-elásticos con 5 rebotes que inundan la pantalla.',
    cooldownSec: 1.6,
    accentColor: '#2DD4BF',
    secondaryColor: '#E0F2FE',
  },
  heliamphora: {
    speciesId: 'heliamphora',
    name: 'Hélice Solar',
    shortName: 'Hélice',
    description: 'Dobles medias lunas solares ondulantes que atraviesan jefes y escudos.',
    cooldownSec: 1.4,
    accentColor: '#FACC15',
    secondaryColor: '#FEF9C3',
  },
  cephalotus: {
    speciesId: 'cephalotus',
    name: 'Bomba Racimo',
    shortName: 'Racimo',
    description: 'Ojiva pesada que se fragmenta en 6 submuniciones incendiarias rebotantes.',
    cooldownSec: 1.85,
    accentColor: '#F43F5E',
    secondaryColor: '#84CC16',
  },
};

export interface AbilitySlotAssignment {
  primary: SpeciesId;
  secondary: SpeciesId;
  canSwap: boolean;
}

/**
 * Resolves which species occupies Slot 1 (Auto Primary) and Slot 2 (Manual Secondary).
 * When only 1 species is active (e.g. Dionaea at run start), both slots use it so the
 * manual Secondary skill is immediately playable from second 1.
 */
export function resolveAbilitySlots(
  levels: SpeciesLevels,
  preferredPrimary: SpeciesId,
  preferredSecondary: SpeciesId
): AbilitySlotAssignment {
  const active = ALL_SPECIES.filter((s) => (levels[s] ?? 0) > 0);
  if (active.length === 0) {
    return { primary: 'dionaea', secondary: 'dionaea', canSwap: false };
  }
  if (active.length === 1) {
    return { primary: active[0], secondary: active[0], canSwap: false };
  }
  const primary = active.includes(preferredPrimary) ? preferredPrimary : active[0];
  const other = active.find((s) => s !== primary) ?? active[1];
  const secondary =
    preferredSecondary !== primary && active.includes(preferredSecondary) ? preferredSecondary : other;
  return { primary, secondary, canSwap: true };
}

/**
 * Rotates Primary (Auto) <-> Secondary (Manual) when at least 2 evolutions are unlocked.
 */
export function swapAbilitySlots(
  levels: SpeciesLevels,
  currentPrimary: SpeciesId,
  currentSecondary: SpeciesId
): AbilitySlotAssignment {
  const resolved = resolveAbilitySlots(levels, currentPrimary, currentSecondary);
  if (!resolved.canSwap) return resolved;
  return {
    primary: resolved.secondary,
    secondary: resolved.primary,
    canSwap: true,
  };
}

/**
 * Mode 1 (PRIMARY — AUTO-FIRE): Builds the focused automatic fire pattern for the species
 * currently slotted in Primary, scaling cleanly from Lv.1 to Lv.5 with a light synergy bonus
 * when a 2nd species is equipped in Secondary.
 */
export function buildPrimaryShotPattern(
  primarySpecies: SpeciesId,
  levels: SpeciesLevels,
  shotIndex: number,
  config: GameConfig
): ProjectileDescriptor[] {
  const lv = Math.max(1, Math.min(5, levels[primarySpecies] || 1)) as SpeciesLevel;
  const activeCount = ALL_SPECIES.filter((s) => (levels[s] ?? 0) > 0).length;
  const synergyDmgMult = activeCount >= 2 ? 1.12 : 1.0;
  const sp = config.species[primarySpecies];
  const isSecret = lv >= 5;
  const shots: ProjectileDescriptor[] = [];

  switch (primarySpecies) {
    case 'dionaea': {
      const col = isSecret ? '#FACC15' : sp.accentColor;
      const glow = isSecret ? '#E11D48' : sp.secondaryColor;
      const baseDmg = Math.round(sp.damage * (1 + (lv - 1) * 0.22) * synergyDmgMult);
      const snapInterval = lv === 1 ? 5 : lv === 2 ? 5 : lv === 3 ? 4 : lv === 4 ? 3 : 2;
      const isSnapTick = shotIndex % snapInterval === 0;

      if (lv === 1) {
        if (isSnapTick) {
          shots.push({
            kind: 'snap',
            offsetX: 38,
            offsetY: 0,
            vx: 580,
            vy: 0,
            gravity: 0,
            drag: 1,
            bounces: 0,
            damage: Math.round(baseDmg * 1.9),
            radius: 22,
            color: '#FB7185',
            glowColor: '#4ADE80',
            slowFactor: 0,
            acidDps: 0,
            acidRadius: 0,
            armorPierce: false,
            chainAcid: false,
            pullStrength: 0,
            spawnsVortex: false,
            piercing: true,
            clearsEnemyBullets: true,
          });
        } else {
          shots.push({
            kind: 'thorn',
            offsetX: 32,
            offsetY: 0,
            vx: 700,
            vy: -12,
            gravity: 105,
            drag: 0.998,
            bounces: 0,
            damage: baseDmg,
            radius: 5.5,
            color: col,
            glowColor: glow,
            slowFactor: 0,
            acidDps: 0,
            acidRadius: 0,
            armorPierce: false,
            chainAcid: false,
            pullStrength: 0,
            spawnsVortex: false,
            piercing: false,
          });
        }
      } else {
        const lanes =
          lv === 2 ? [-0.5, 0.5] : lv === 3 ? [-1, 0, 1] : lv === 4 ? [-1.5, -0.5, 0.5, 1.5] : [-2, -1, 0, 1, 2];
        for (const lane of lanes) {
          shots.push({
            kind: 'thorn',
            offsetX: 32 - Math.abs(lane) * 2.5,
            offsetY: lane * 9,
            vx: isSecret ? 920 : 820 + lv * 16,
            vy: lane * (isSecret ? 58 : 44) - 16,
            gravity: isSecret ? 90 : 132,
            drag: 0.998,
            bounces: 0,
            damage: baseDmg,
            radius: isSecret ? 6.5 : 5.6,
            color: col,
            glowColor: glow,
            slowFactor: 0,
            acidDps: 0,
            acidRadius: 0,
            armorPierce: lv >= 4,
            chainAcid: false,
            pullStrength: 0,
            spawnsVortex: false,
            piercing: isSecret,
          });
        }
        if (isSnapTick) {
          const snapAngles = isSecret ? [-130, 0, 130] : [0];
          for (const sVy of snapAngles) {
            shots.push({
              kind: 'snap',
              offsetX: 40,
              offsetY: 0,
              vx: isSecret ? 780 : 690,
              vy: sVy,
              gravity: 0,
              drag: 1,
              bounces: 0,
              damage: Math.round(baseDmg * 2.1),
              radius: 22 + lv * 7,
              color: isSecret ? '#FACC15' : '#FB7185',
              glowColor: isSecret ? '#E11D48' : '#4ADE80',
              slowFactor: 0,
              acidDps: 0,
              acidRadius: 0,
              armorPierce: lv >= 3,
              chainAcid: false,
              pullStrength: 0,
              spawnsVortex: false,
              piercing: true,
              clearsEnemyBullets: true,
            });
          }
        }
      }
      break;
    }

    case 'drosera': {
      const dmg = Math.round(sp.damage * (1 + (lv - 1) * 0.25) * synergyDmgMult);
      const slowFactor = Math.min(0.8, sp.traitStrength + (lv - 1) * 0.1);
      const arcs =
        lv === 1
          ? [{ vx: 560, vy: -185 }]
          : lv === 2
          ? [
              { vx: 580, vy: -220 },
              { vx: 560, vy: 55 },
            ]
          : lv === 3
          ? [
              { vx: 590, vy: -265 },
              { vx: 510, vy: -120 },
              { vx: 600, vy: 85 },
            ]
          : [
              { vx: 610, vy: -290 },
              { vx: 520, vy: -175 },
              { vx: 590, vy: -30 },
              { vx: 610, vy: 110 },
            ];
      const bounces = lv >= 4 ? 2 : lv >= 2 ? 1 : 0;
      for (const arc of arcs) {
        shots.push({
          kind: 'mucilage',
          offsetX: 20,
          offsetY: arc.vy < 0 ? -10 : 10,
          vx: arc.vx,
          vy: arc.vy,
          gravity: 490,
          drag: 0.996,
          bounces,
          damage: dmg,
          radius: lv >= 3 ? 7.6 : 6.4,
          color: sp.accentColor,
          glowColor: sp.secondaryColor,
          slowFactor,
          acidDps: 0,
          acidRadius: 0,
          armorPierce: false,
          chainAcid: false,
          pullStrength: 0,
          spawnsVortex: false,
          piercing: false,
        });
      }
      break;
    }

    case 'nepenthes': {
      const dmg = Math.round(sp.damage * (1 + (lv - 1) * 0.26) * synergyDmgMult);
      const acidDps = Math.round(sp.traitStrength * (1 + (lv - 1) * 0.32));
      const acidRadius = lv >= 4 ? 86 : lv >= 2 ? 70 : 54;
      const count = lv === 1 ? 1 : lv <= 3 ? 2 : 3;
      const cfgs =
        count === 1
          ? [{ vx: 430, vy: -70 }]
          : count === 2
          ? [
              { vx: 470, vy: -95 },
              { vx: 340, vy: -30 },
            ]
          : [
              { vx: 510, vy: -115 },
              { vx: 400, vy: -65 },
              { vx: 295, vy: -15 },
            ];
      for (const cfg of cfgs) {
        shots.push({
          kind: 'acid',
          offsetX: 14,
          offsetY: 16,
          vx: cfg.vx,
          vy: cfg.vy,
          gravity: 680,
          drag: 0.995,
          bounces: 0,
          damage: dmg,
          radius: lv >= 2 ? 10.5 : 9,
          color: sp.accentColor,
          glowColor: sp.secondaryColor,
          slowFactor: 0,
          acidDps,
          acidRadius,
          armorPierce: lv >= 2,
          chainAcid: lv >= 3,
          pullStrength: 0,
          spawnsVortex: false,
          piercing: false,
        });
      }
      break;
    }

    case 'utricularia': {
      const dmg = Math.round(sp.damage * (1 + (lv - 1) * 0.24) * synergyDmgMult);
      const pull = sp.traitStrength * (1 + (lv - 1) * 0.32);
      const cfgs =
        lv === 1
          ? [{ vy: 24, gravity: -135 }]
          : lv === 2
          ? [
              { vy: -22, gravity: -115 },
              { vy: 58, gravity: -155 },
            ]
          : [
              { vy: -52, gravity: -105 },
              { vy: 12, gravity: -135 },
              { vy: 78, gravity: -165 },
            ];
      for (const vc of cfgs) {
        shots.push({
          kind: 'vacuum',
          offsetX: 28,
          offsetY: -4,
          vx: 760 + lv * 22,
          vy: vc.vy,
          gravity: vc.gravity,
          drag: 0.997,
          bounces: 0,
          damage: dmg,
          radius: lv >= 3 ? 10.5 : 8.5,
          color: sp.accentColor,
          glowColor: sp.secondaryColor,
          slowFactor: 0.15,
          acidDps: 0,
          acidRadius: 0,
          armorPierce: false,
          chainAcid: false,
          pullStrength: pull,
          spawnsVortex: lv >= 2,
          piercing: true,
        });
      }
      break;
    }

    case 'sarracenia': {
      const dmg = Math.round(sp.damage * (1 + (lv - 1) * 0.25) * synergyDmgMult);
      const lanes = lv === 1 ? [0] : lv === 2 ? [-0.6, 0.6] : lv === 3 ? [-1, 0, 1] : [-1.5, -0.5, 0.5, 1.5];
      for (const lane of lanes) {
        shots.push({
          kind: 'trumpet',
          offsetX: 22,
          offsetY: lane * 11,
          vx: 330,
          vy: lane * 46 + 32,
          accelX: sp.traitStrength + lv * 75,
          gravity: 90,
          drag: 0.999,
          bounces: 0,
          damage: dmg,
          radius: lv >= 3 ? 8.5 : 7,
          color: sp.accentColor,
          glowColor: sp.secondaryColor,
          slowFactor: 0,
          acidDps: 0,
          acidRadius: 0,
          armorPierce: lv >= 4,
          chainAcid: false,
          pullStrength: 0,
          spawnsVortex: false,
          piercing: lv >= 3,
        });
      }
      break;
    }

    case 'pinguicula': {
      const dmg = Math.round(sp.damage * (1 + (lv - 1) * 0.24) * synergyDmgMult);
      const angles = lv === 1 ? [-195] : lv === 2 ? [-230, 210] : [-255, -35, 235];
      const bounceCount = lv === 1 ? 2 : lv <= 3 ? 3 : 4;
      for (const vy of angles) {
        shots.push({
          kind: 'crystal',
          offsetX: 24,
          offsetY: 0,
          vx: 580,
          vy,
          gravity: 205,
          drag: 0.998,
          bounces: bounceCount,
          bounceCeiling: true,
          damage: dmg,
          radius: 7.5,
          color: sp.accentColor,
          glowColor: sp.secondaryColor,
          slowFactor: Math.min(0.75, sp.traitStrength + (lv - 1) * 0.08),
          acidDps: 0,
          acidRadius: 0,
          armorPierce: lv >= 3,
          chainAcid: false,
          pullStrength: 0,
          spawnsVortex: false,
          piercing: lv >= 3,
        });
      }
      break;
    }

    case 'heliamphora': {
      const dmg = Math.round(sp.damage * (1 + (lv - 1) * 0.25) * synergyDmgMult);
      const profiles =
        lv === 1
          ? [{ vy: 115, grav: -sp.traitStrength }]
          : lv === 2
          ? [
              { vy: 130, grav: -sp.traitStrength },
              { vy: -130, grav: sp.traitStrength },
            ]
          : [
              { vy: 145, grav: -sp.traitStrength },
              { vy: 0, grav: 0 },
              { vy: -145, grav: sp.traitStrength },
            ];
      for (const prof of profiles) {
        shots.push({
          kind: 'solar_arc',
          offsetX: 28,
          offsetY: 0,
          vx: 660,
          vy: prof.vy,
          gravity: prof.grav,
          drag: 0.998,
          bounces: 0,
          damage: dmg,
          radius: 9.5,
          color: sp.accentColor,
          glowColor: sp.secondaryColor,
          slowFactor: 0,
          acidDps: 0,
          acidRadius: 0,
          armorPierce: lv >= 3,
          chainAcid: false,
          pullStrength: 0,
          spawnsVortex: false,
          piercing: lv >= 3,
        });
      }
      break;
    }

    case 'cephalotus': {
      const dmg = Math.round(sp.damage * (1 + (lv - 1) * 0.26) * synergyDmgMult);
      const launches =
        lv === 1
          ? [{ vx: 400, vy: -95 }]
          : lv === 2
          ? [
              { vx: 455, vy: -120 },
              { vx: 330, vy: -50 },
            ]
          : [
              { vx: 495, vy: -140 },
              { vx: 385, vy: -90 },
              { vx: 280, vy: -35 },
            ];
      const splits = lv >= 3 ? 3 : 2;
      for (const l of launches) {
        shots.push({
          kind: 'mortar',
          offsetX: 12,
          offsetY: 14,
          vx: l.vx,
          vy: l.vy,
          gravity: 820,
          drag: 0.996,
          bounces: 0,
          splitsOnHit: splits,
          damage: dmg,
          radius: 9.5,
          color: sp.accentColor,
          glowColor: sp.secondaryColor,
          slowFactor: 0,
          acidDps: 0,
          acidRadius: 0,
          armorPierce: lv >= 2,
          chainAcid: false,
          pullStrength: 0,
          spawnsVortex: false,
          piercing: false,
        });
      }
      break;
    }
  }

  return shots;
}

/**
 * Mode 2 (SECONDARY — MANUAL POWER SKILL): Every one of the 8 species has a bespoke,
 * tactile, high-impact manual skill with distinct physics, trajectory, and payoff!
 */
export function buildSecondaryShotPattern(
  secondarySpecies: SpeciesId,
  levels: SpeciesLevels,
  config: GameConfig
): ProjectileDescriptor[] {
  const lv = Math.max(1, Math.min(5, levels[secondarySpecies] || 1)) as SpeciesLevel;
  const sp = config.species[secondarySpecies];
  const powerScale = 1 + (lv - 1) * 0.26;
  const shots: ProjectileDescriptor[] = [];

  switch (secondarySpecies) {
    case 'dionaea': {
      // Fauces Guillotina: Massive lunging flytrap jaw that accelerates forward, eats enemy bullets, & crunches armor
      const count = lv >= 5 ? 3 : 1;
      const vyList = count === 3 ? [-115, 0, 115] : [0];
      for (const vy of vyList) {
        shots.push({
          kind: 'jaw_guillotine',
          offsetX: 42,
          offsetY: 0,
          vx: 560,
          vy,
          accelX: 480,
          gravity: 0,
          drag: 1,
          bounces: 0,
          damage: Math.round(sp.damage * 4.4 * powerScale),
          radius: 36 + lv * 4,
          color: lv >= 5 ? '#FACC15' : '#FB7185',
          glowColor: '#4ADE80',
          slowFactor: 0,
          acidDps: 0,
          acidRadius: 0,
          armorPierce: true,
          chainAcid: false,
          pullStrength: 0,
          spawnsVortex: false,
          piercing: true,
          isSecondary: true,
          clearsEnemyBullets: true,
        });
      }
      break;
    }

    case 'drosera': {
      // Red Pegajosa: 5-orb arcing bola net that roots enemies on contact & splashes sticky slow
      const vyArcs = [-310, -210, -105, 10, 125];
      for (let i = 0; i < vyArcs.length; i++) {
        shots.push({
          kind: 'sticky_bola',
          offsetX: 22,
          offsetY: (i - 2) * 7,
          vx: 540 + (2 - Math.abs(i - 2)) * 45,
          vy: vyArcs[i],
          gravity: 460,
          drag: 0.996,
          bounces: 2,
          damage: Math.round(sp.damage * 2.1 * powerScale),
          radius: 10.5,
          color: '#F59E0B',
          glowColor: '#FEF08A',
          slowFactor: 0.78,
          acidDps: 0,
          acidRadius: 0,
          armorPierce: false,
          chainAcid: false,
          pullStrength: 0,
          spawnsVortex: false,
          piercing: false,
          isSecondary: true,
          rootDuration: 1.6 + lv * 0.25,
        });
      }
      break;
    }

    case 'nepenthes': {
      // Jarra Mortero: Giant pressurized pitcher bomb arcing heavily & exploding into a mega corrosive pool + splashes
      shots.push({
        kind: 'mega_acid',
        offsetX: 20,
        offsetY: 8,
        vx: 420,
        vy: -195,
        gravity: 690,
        drag: 0.996,
        bounces: 0,
        splitsOnHit: 4,
        damage: Math.round(sp.damage * 4.2 * powerScale),
        radius: 17,
        color: '#A855F7',
        glowColor: '#BEF264',
        slowFactor: 0.25,
        acidDps: Math.round(sp.traitStrength * 2.2 * powerScale),
        acidRadius: 118 + lv * 10,
        armorPierce: true,
        chainAcid: true,
        pullStrength: 0,
        spawnsVortex: false,
        piercing: false,
        isSecondary: true,
      });
      break;
    }

    case 'utricularia': {
      // Singularidad Botánica: Slow piercing gravity sphere pulling foes & swallowing enemy bullets along its path
      shots.push({
        kind: 'singularity',
        offsetX: 34,
        offsetY: 0,
        vx: 255,
        vy: 0,
        gravity: 0,
        drag: 0.999,
        bounces: 0,
        damage: Math.round(sp.damage * 2.8 * powerScale),
        radius: 26 + lv * 2.5,
        color: '#38BDF8',
        glowColor: '#E0F2FE',
        slowFactor: 0.45,
        acidDps: 0,
        acidRadius: 0,
        armorPierce: true,
        chainAcid: false,
        pullStrength: 290 * powerScale,
        spawnsVortex: true,
        piercing: true,
        isSecondary: true,
        clearsEnemyBullets: true,
      });
      break;
    }

    case 'sarracenia': {
      // Salva Supersónica: 4 staggered piercing missiles that drop slightly then ignite to blistering speed
      const offsets = [-24, -8, 8, 24];
      for (let i = 0; i < offsets.length; i++) {
        shots.push({
          kind: 'supersonic_rocket',
          offsetX: 16 - i * 5,
          offsetY: offsets[i],
          vx: 160 + i * 35,
          vy: offsets[i] * 1.6 + 22,
          accelX: 1650 + lv * 140,
          gravity: 55,
          drag: 1,
          bounces: 0,
          damage: Math.round(sp.damage * 2.6 * powerScale),
          radius: 10.5,
          color: '#FB923C',
          glowColor: '#FEF08A',
          slowFactor: 0,
          acidDps: 0,
          acidRadius: 0,
          armorPierce: true,
          chainAcid: false,
          pullStrength: 0,
          spawnsVortex: false,
          piercing: true,
          isSecondary: true,
        });
      }
      break;
    }

    case 'pinguicula': {
      // Lluvia de Prisma: 5-way hyper-elastic 5-bounce crystal storm filling the screen with slowing shards
      const vyFan = [-340, -180, 0, 180, 340];
      for (const vy of vyFan) {
        shots.push({
          kind: 'prism_crystal',
          offsetX: 28,
          offsetY: 0,
          vx: 640,
          vy,
          gravity: 130,
          drag: 0.999,
          bounces: 5,
          bounceCeiling: true,
          damage: Math.round(sp.damage * 2.2 * powerScale),
          radius: 10,
          color: '#2DD4BF',
          glowColor: '#E0F2FE',
          slowFactor: 0.65,
          acidDps: 0,
          acidRadius: 0,
          armorPierce: true,
          chainAcid: false,
          pullStrength: 0,
          spawnsVortex: false,
          piercing: lv >= 3,
          isSecondary: true,
        });
      }
      break;
    }

    case 'heliamphora': {
      // Hélice Solar: Twin opposing sinusoidal solar blades weaving through armor & bosses
      for (const phaseSign of [-1, 1]) {
        shots.push({
          kind: 'solar_helix',
          offsetX: 30,
          offsetY: phaseSign * 10,
          vx: 620,
          vy: phaseSign * 30,
          accelX: 180,
          gravity: 0,
          drag: 1,
          bounces: 0,
          damage: Math.round(sp.damage * 3.4 * powerScale),
          radius: 16,
          color: '#FACC15',
          glowColor: '#FEF9C3',
          slowFactor: 0,
          acidDps: 0,
          acidRadius: 0,
          armorPierce: true,
          chainAcid: false,
          pullStrength: 0,
          spawnsVortex: false,
          piercing: true,
          isSecondary: true,
          sinWaveAmp: phaseSign * 310,
          sinWaveFreq: 11.5,
        });
      }
      break;
    }

    case 'cephalotus': {
      // Bomba Racimo: Heavy cluster shell that splits into 6 bouncing incendiary bomblets
      shots.push({
        kind: 'cluster_bomb',
        offsetX: 20,
        offsetY: 8,
        vx: 440,
        vy: -170,
        gravity: 720,
        drag: 0.997,
        bounces: 0,
        splitsOnHit: 6,
        damage: Math.round(sp.damage * 3.8 * powerScale),
        radius: 15.5,
        color: '#F43F5E',
        glowColor: '#84CC16',
        slowFactor: 0,
        acidDps: 0,
        acidRadius: 0,
        armorPierce: true,
        chainAcid: false,
        pullStrength: 0,
        spawnsVortex: false,
        piercing: false,
        isSecondary: true,
      });
      break;
    }
  }

  return shots;
}

// ============================================================================
// DYNAMIC INVASION PROGRESSION SIGNALS (0..1 INTENSITY + ALERT STAGES)
// ============================================================================

export interface InvasionState {
  intensity: number; // 0..1
  stage: 0 | 1 | 2 | 3;
  alertLabel: string | null;
}

export function computeInvasionState(
  levelIndex: number,
  waveInLevel: number,
  wavesInLevel: number,
  waveProgress01: number,
  bossActive: boolean,
  isMiniBoss: boolean
): InvasionState {
  if (bossActive) {
    return {
      intensity: isMiniBoss ? 0.78 : 1.0,
      stage: 3,
      alertLabel: isMiniBoss
        ? `¡SEÑAL DE AVANZADA · NV.${levelIndex}!`
        : `¡INVASIÓN TOTAL · JEFE NV.${levelIndex}!`,
    };
  }
  const safeWaves = Math.max(1, wavesInLevel);
  const clampedProg = Math.max(0, Math.min(1, waveProgress01));
  const raw = ((Math.max(1, waveInLevel) - 1) + clampedProg) / safeWaves;
  const intensity = Math.max(0, Math.min(0.95, Number(raw.toFixed(3))));

  if (intensity >= 0.72) {
    return {
      intensity,
      stage: 2,
      alertLabel: '¡FLOTA INVASORA EN EL HORIZONTE!',
    };
  }
  if (intensity >= 0.36) {
    return {
      intensity,
      stage: 1,
      alertLabel: 'SEÑAL DE INVASIÓN EN AUMENTO',
    };
  }
  return {
    intensity,
    stage: 0,
    alertLabel: null,
  };
}

// ============================================================================
// STANDARD GAMEPAD / CONTROLLER MAPPING (PURE & UNIT-TESTABLE)
// ============================================================================

export interface GamepadMappedInput {
  moveX: number; // -1..1
  moveY: number; // -1..1
  fireSecondary: boolean; // A (0) or RT (7)
  swapAbility: boolean; // X (2), LB (4), or RB (5)
  triggerSpecial: boolean; // B (1), Y (3), or LT (6)
  pause: boolean; // Start (9)
  confirm: boolean; // A (0) or Start (9)
  focusSlow: boolean; // L3 (10)
}

export interface GamepadButtonEdges {
  fireSecondaryPressed: boolean;
  swapAbilityPressed: boolean;
  triggerSpecialPressed: boolean;
  pausePressed: boolean;
  confirmPressed: boolean;
}

function isBtnDown(buttons: ReadonlyArray<{ pressed?: boolean; value?: number } | number | boolean>, idx: number): boolean {
  const b = buttons[idx];
  if (typeof b === 'boolean') return b;
  if (typeof b === 'number') return b > 0.35;
  if (!b) return false;
  return Boolean(b.pressed) || (typeof b.value === 'number' && b.value > 0.35);
}

export function parseGamepadInput(
  axes: ReadonlyArray<number>,
  buttons: ReadonlyArray<{ pressed?: boolean; value?: number } | number | boolean>,
  deadzone = 0.16
): GamepadMappedInput {
  const rawX = axes[0] ?? 0;
  const rawY = axes[1] ?? 0;

  let moveX = Math.abs(rawX) >= deadzone ? Math.max(-1, Math.min(1, rawX)) : 0;
  let moveY = Math.abs(rawY) >= deadzone ? Math.max(-1, Math.min(1, rawY)) : 0;

  // D-Pad standard indices: 12=Up, 13=Down, 14=Left, 15=Right
  if (isBtnDown(buttons, 14)) moveX = -1;
  else if (isBtnDown(buttons, 15)) moveX = 1;
  if (isBtnDown(buttons, 12)) moveY = -1;
  else if (isBtnDown(buttons, 13)) moveY = 1;

  const mag = Math.hypot(moveX, moveY);
  if (mag > 1) {
    moveX /= mag;
    moveY /= mag;
  }

  const aBtn = isBtnDown(buttons, 0);
  const bBtn = isBtnDown(buttons, 1);
  const xBtn = isBtnDown(buttons, 2);
  const yBtn = isBtnDown(buttons, 3);
  const lbBtn = isBtnDown(buttons, 4);
  const rbBtn = isBtnDown(buttons, 5);
  const ltBtn = isBtnDown(buttons, 6);
  const rtBtn = isBtnDown(buttons, 7);
  const startBtn = isBtnDown(buttons, 9);
  const l3Btn = isBtnDown(buttons, 10);

  return {
    moveX,
    moveY,
    fireSecondary: aBtn || rtBtn,
    swapAbility: xBtn || lbBtn || rbBtn,
    triggerSpecial: bBtn || yBtn || ltBtn,
    pause: startBtn,
    confirm: aBtn || startBtn,
    focusSlow: l3Btn,
  };
}

export function computeGamepadEdges(
  prev: GamepadMappedInput | null,
  next: GamepadMappedInput
): GamepadButtonEdges {
  return {
    fireSecondaryPressed: next.fireSecondary && !prev?.fireSecondary,
    swapAbilityPressed: next.swapAbility && !prev?.swapAbility,
    triggerSpecialPressed: next.triggerSpecial && !prev?.triggerSpecial,
    pausePressed: next.pause && !prev?.pause,
    confirmPressed: next.confirm && !prev?.confirm,
  };
}

export interface ControlPromptSet {
  mode: 'keyboard' | 'xbox';
  move: string;
  secondaryShort: string;
  secondaryFull: string;
  swapShort: string;
  swapFull: string;
  specialShort: string;
  specialFull: string;
  pauseShort: string;
  confirmShort: string;
  petCycleHint: string;
  footerSummary: string;
}

/**
 * Devuelve todas las indicaciones de controles adaptadas dinámicamente:
 * - Teclado/Ratón por defecto
 * - Control de Xbox completo al detectar un mando conectado
 */
export function getControlPrompts(gamepadConnected: boolean): ControlPromptSet {
  if (gamepadConnected) {
    return {
      mode: 'xbox',
      move: 'LS / Cruceta',
      secondaryShort: 'A / RT',
      secondaryFull: 'Botón A / Gatillo RT',
      swapShort: 'X / LB',
      swapFull: 'Botón X / LB / RB',
      specialShort: 'B / LT',
      specialFull: 'Botón B / Y / Gatillo LT',
      pauseShort: 'Menú ☰',
      confirmShort: 'A',
      petCycleHint: 'LB / RB Elegir Mascota',
      footerSummary:
        'Control Xbox: LS/Cruceta Mover · A/RT Secundaria · X/LB/RB Rotar · B/LT Especial Mascota · ☰ Pausa',
    };
  }
  return {
    mode: 'keyboard',
    move: 'WASD / Flechas',
    secondaryShort: 'E',
    secondaryFull: 'Tecla E / Click Der.',
    swapShort: 'Q',
    swapFull: 'Tecla Q / Tab',
    specialShort: 'Esp',
    specialFull: 'Espacio / X',
    pauseShort: 'P / Esc',
    confirmShort: 'Enter',
    petCycleHint: 'Click para elegir Mascota',
    footerSummary:
      'WASD/Flechas Mover · Auto Principal · [E]/Click Der. Secundaria · [Q] Rotar · [Espacio] Mascota · Mando Xbox compatible',
  };
}

/**
 * Determina si debe mostrarse el bloqueo obligatorio pidiendo girar el dispositivo a horizontal.
 * Se activa en móviles/tablets en orientación vertical, pero nunca en escritorios anchos.
 */
export function shouldRequireLandscape(
  cssWidth: number,
  cssHeight: number,
  isTouchDevice: boolean
): boolean {
  const w = Math.max(1, cssWidth);
  const h = Math.max(1, cssHeight);
  if (h <= w) return false;
  if (isTouchDevice) {
    return Math.min(w, h) <= 1024;
  }
  return w <= 640;
}

/**
 * Calcula la posición objetivo del biplano usando arrastre táctil relativo al punto de apoyo del dedo,
 * evitando que el dedo tape la nave en pantallas móviles.
 */
export function computeRelativeTouchTarget(
  anchorPlayerX: number,
  anchorPlayerY: number,
  anchorPointerX: number,
  anchorPointerY: number,
  currentPointerX: number,
  currentPointerY: number,
  sensitivity = 1.15
): { x: number; y: number } {
  return {
    x: anchorPlayerX + (currentPointerX - anchorPointerX) * sensitivity,
    y: anchorPlayerY + (currentPointerY - anchorPointerY) * sensitivity,
  };
}



