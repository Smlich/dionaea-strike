import type { DifficultyId, DifficultyProfile } from './types';

export const DIFFICULTY_STORAGE_KEY = 'dionaea_strike_difficulty_v1';

export const DIFFICULTY_ORDER: readonly DifficultyId[] = ['easy', 'normal', 'hard'] as const;

export const DIFFICULTY_PROFILES: Record<DifficultyId, DifficultyProfile> = {
  easy: {
    id: 'easy',
    label: 'Fácil',
    shortLabel: 'FÁCIL',
    englishLabel: 'Easy',
    description: 'Enemigos más lentos y oleadas espaciadas',
    enemySpeedMult: 0.8,
    spawnRateMult: 0.72,
    enemyBulletSpeedMult: 0.86,
    maxActiveEnemies: 9,
    maxDownbeatPairCap: 6,
    extraDownbeatSpawn: false,
    accentColor: '#34D399',
  },
  normal: {
    id: 'normal',
    label: 'Normal',
    shortLabel: 'NORMAL',
    englishLabel: 'Normal',
    description: 'Equilibrio clásico al ritmo de cada nivel',
    enemySpeedMult: 1.0,
    spawnRateMult: 1.0,
    enemyBulletSpeedMult: 1.0,
    maxActiveEnemies: 11,
    maxDownbeatPairCap: 9,
    extraDownbeatSpawn: false,
    accentColor: '#38BDF8',
  },
  hard: {
    id: 'hard',
    label: 'Difícil',
    shortLabel: 'DIFÍCIL',
    englishLabel: 'Hard',
    description: 'Enjambres veloces y oleadas intensas',
    enemySpeedMult: 1.25,
    spawnRateMult: 1.35,
    enemyBulletSpeedMult: 1.15,
    maxActiveEnemies: 15,
    maxDownbeatPairCap: 12,
    extraDownbeatSpawn: true,
    accentColor: '#FB7185',
  },
};

export interface DifficultyStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface DifficultySpawnTiming {
  spawnIntervalSec: number;
  beatsPerSpawn: number;
  maxActiveEnemies: number;
  maxDownbeatPairCap: number;
  extraDownbeatSpawn: boolean;
}

export interface DynamicEscalationSnapshot {
  /** Normalized progression intensity in [0, 1] driven by score and time survived. */
  intensity: number;
  /** Dynamic multiplier (>= 1.0) applied to enemy fly velocity. */
  velocityMult: number;
  /** Dynamic multiplier (>= 1.0) applied to wave spawn rate. */
  spawnRateMult: number;
  /** Additional simultaneous enemy cap unlocked as intensity rises. */
  bonusMaxEnemies: number;
  /** Escalation tier (0..4) for subtle pacing feedback. */
  tier: number;
}

const ESCALATION_HEADROOM: Record<
  DifficultyId,
  { maxVelBonus: number; maxSpawnBonus: number; maxBonusEnemies: number }
> = {
  easy: { maxVelBonus: 0.28, maxSpawnBonus: 0.36, maxBonusEnemies: 2 },
  normal: { maxVelBonus: 0.42, maxSpawnBonus: 0.58, maxBonusEnemies: 4 },
  hard: { maxVelBonus: 0.55, maxSpawnBonus: 0.75, maxBonusEnemies: 6 },
};

/**
 * Dynamically escalates enemy fly velocity and spawn rate based on the player's
 * current score and total time survived. Uses smooth saturating curves so combat
 * intensifies noticeably without ever becoming mathematically unbounded.
 */
export function computeDynamicEscalation(
  score: number,
  elapsedSec: number,
  difficulty: DifficultyId = 'normal'
): DynamicEscalationSnapshot {
  const safeScore = Number.isFinite(score) && score > 0 ? score : 0;
  const safeElapsed = Number.isFinite(elapsedSec) && elapsedSec > 0 ? elapsedSec : 0;
  const cleanDiff = sanitizeDifficulty(difficulty);
  const headroom = ESCALATION_HEADROOM[cleanDiff];

  // Smooth saturating ramps: noticeable within the first 20-30s or 2,500+ pts, capping cleanly
  const timeProgress = 1 - Math.exp(-safeElapsed / 95);
  const scoreProgress = 1 - Math.exp(-safeScore / 12000);

  // Either surviving longer OR scoring rapidly accelerates the swarm; both together push higher
  const intensity = Math.max(
    0,
    Math.min(1, Math.max(timeProgress, scoreProgress) * 0.7 + ((timeProgress + scoreProgress) * 0.5) * 0.3)
  );

  const velocityMult = Number((1 + intensity * headroom.maxVelBonus).toFixed(3));
  const spawnRateMult = Number((1 + intensity * headroom.maxSpawnBonus).toFixed(3));
  const bonusMaxEnemies = Math.floor(intensity * headroom.maxBonusEnemies);
  const tier = Math.min(4, Math.floor(intensity * 4.5));

  return {
    intensity: Number(intensity.toFixed(4)),
    velocityMult,
    spawnRateMult,
    bonusMaxEnemies,
    tier,
  };
}

export function sanitizeDifficulty(raw: unknown): DifficultyId {
  if (typeof raw === 'string') {
    const normalized = raw.trim().toLowerCase();
    if (normalized === 'easy' || normalized === 'facil' || normalized === 'fácil') return 'easy';
    if (normalized === 'hard' || normalized === 'dificil' || normalized === 'difícil') return 'hard';
    if (normalized === 'normal') return 'normal';
  }
  return 'normal';
}

export function getDifficultyProfile(difficulty: DifficultyId = 'normal'): DifficultyProfile {
  return DIFFICULTY_PROFILES[sanitizeDifficulty(difficulty)] ?? DIFFICULTY_PROFILES.normal;
}

/**
 * Calcula el intervalo de aparición y los tiempos musicales (beatsPerSpawn)
 * ajustados por dificultad y escalado dinámico por puntaje/tiempo sobrevivido,
 * manteniendo la sincronización al pulso de la pista.
 */
export function computeDifficultySpawnTiming(
  baseSpawnIntervalSec: number,
  beatDurationSec: number,
  difficulty: DifficultyId = 'normal',
  dynamicEscalation?: DynamicEscalationSnapshot
): DifficultySpawnTiming {
  const profile = getDifficultyProfile(difficulty);
  const safeBaseInterval = Number.isFinite(baseSpawnIntervalSec) && baseSpawnIntervalSec > 0 ? baseSpawnIntervalSec : 1.0;
  const safeBeatDur = Number.isFinite(beatDurationSec) && beatDurationSec > 0.05 ? beatDurationSec : 0.5;
  const dynSpawn =
    dynamicEscalation && Number.isFinite(dynamicEscalation.spawnRateMult)
      ? Math.max(1, dynamicEscalation.spawnRateMult)
      : 1;
  const bonusCap =
    dynamicEscalation && Number.isFinite(dynamicEscalation.bonusMaxEnemies)
      ? Math.max(0, Math.floor(dynamicEscalation.bonusMaxEnemies))
      : 0;

  const effectiveRate = profile.spawnRateMult * dynSpawn;
  const minInterval = dynamicEscalation ? 0.24 : 0.32;
  const spawnIntervalSec = Math.max(minInterval, Number((safeBaseInterval / effectiveRate).toFixed(3)));
  const rawBeats = spawnIntervalSec / safeBeatDur;

  // Quantize to clean musical subdivisions (half-beat baseline, quarter-beat when dynamically escalated)
  const beatsPerSpawn = dynamicEscalation
    ? Math.max(0.25, Math.round(rawBeats * 4) / 4)
    : Math.max(0.5, Math.round(rawBeats * 2) / 2);

  return {
    spawnIntervalSec,
    beatsPerSpawn,
    maxActiveEnemies: profile.maxActiveEnemies + bonusCap,
    maxDownbeatPairCap: profile.maxDownbeatPairCap + Math.ceil(bonusCap * 0.75),
    extraDownbeatSpawn: profile.extraDownbeatSpawn || (dynamicEscalation !== undefined && dynamicEscalation.tier >= 3),
  };
}

function resolveStorage(storage?: DifficultyStorageLike | null): DifficultyStorageLike | null {
  if (storage !== undefined) return storage;
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function loadDifficulty(storage?: DifficultyStorageLike | null): DifficultyId {
  const store = resolveStorage(storage);
  if (!store) return 'normal';
  try {
    return sanitizeDifficulty(store.getItem(DIFFICULTY_STORAGE_KEY));
  } catch {
    return 'normal';
  }
}

export function saveDifficulty(difficulty: DifficultyId, storage?: DifficultyStorageLike | null): DifficultyId {
  const clean = sanitizeDifficulty(difficulty);
  const store = resolveStorage(storage);
  if (store) {
    try {
      store.setItem(DIFFICULTY_STORAGE_KEY, clean);
    } catch {
      // Ignore storage quota errors
    }
  }
  return clean;
}
