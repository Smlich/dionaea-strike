export interface ScreenShakeState {
  trauma: number;
  punchX: number;
  punchY: number;
  damageFlashTimer: number;
  damageFlashMax: number;
  seedPhase: number;
}

export interface BossHitShakeOptions {
  damage: number;
  isSecondary?: boolean;
  shielded?: boolean;
  heavy?: boolean;
  impactDirX?: number;
  impactDirY?: number;
}

export interface ScreenShakeSample {
  offsetX: number;
  offsetY: number;
  angleRad: number;
  overscanScale: number;
  intensity: number;
  damageFlashAlpha: number;
}

export const MAX_SHAKE_OFFSET_PX = 18;
export const MAX_SHAKE_ANGLE_RAD = 0.022;
const TRAUMA_DECAY_PER_SEC = 1.85;
const PUNCH_DAMPING = 16;

function normalizeDir(dx: number, dy: number, fallbackX = -1, fallbackY = 0): [number, number] {
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) {
    return [fallbackX, fallbackY];
  }
  const len = Math.hypot(dx, dy);
  if (len < 0.0001) {
    return [fallbackX, fallbackY];
  }
  return [dx / len, dy / len];
}

export function createScreenShakeState(): ScreenShakeState {
  return {
    trauma: 0,
    punchX: 0,
    punchY: 0,
    damageFlashTimer: 0,
    damageFlashMax: 0.28,
    seedPhase: 0,
  };
}

export function resetScreenShakeState(state: ScreenShakeState): void {
  state.trauma = 0;
  state.punchX = 0;
  state.punchY = 0;
  state.damageFlashTimer = 0;
  state.damageFlashMax = 0.28;
  state.seedPhase = 0;
}

/**
 * Adds generic trauma (clamped to [0, maxTrauma]) while preserving any higher existing trauma.
 */
export function addScreenShakeTrauma(
  state: ScreenShakeState,
  amount: number,
  maxTrauma = 1
): void {
  if (!Number.isFinite(amount) || amount <= 0) return;
  const ceiling = Math.max(0, Math.min(1, maxTrauma));
  if (state.trauma < ceiling) {
    state.trauma = Math.min(ceiling, state.trauma + amount);
  }
  state.seedPhase = (state.seedPhase + 1.37) % 100;
}

/**
 * Heavy directional impact shake + brief red edge flash whenever the player takes damage.
 */
export function triggerPlayerDamageShake(
  state: ScreenShakeState,
  impactDirX = -1,
  impactDirY = 0,
  fatal = false
): void {
  const [nx, ny] = normalizeDir(impactDirX, impactDirY, -1, 0);
  const floorTrauma = fatal ? 1 : 0.76;
  const addAmount = fatal ? 1 : 0.72;
  state.trauma = Math.min(1, Math.max(floorTrauma, state.trauma + addAmount));

  const punchMag = fatal ? 16 : 11;
  state.punchX = Math.max(-18, Math.min(18, state.punchX + nx * punchMag));
  state.punchY = Math.max(-18, Math.min(18, state.punchY + ny * punchMag));

  const flashDur = fatal ? 0.42 : 0.28;
  state.damageFlashMax = flashDur;
  state.damageFlashTimer = flashDur;
  state.seedPhase = (state.seedPhase + 2.19) % 100;
}

/**
 * Crisp punchy shake whenever a boss takes damage from player shots, abilities, or pet summons.
 * Uses a soft ceiling for rapid primary hits so sustained fire feels electric without obscuring aiming,
 * while secondary / heavy strikes kick significantly harder.
 */
export function triggerBossHitShake(
  state: ScreenShakeState,
  opts: BossHitShakeOptions
): void {
  const dmg = Number.isFinite(opts.damage) ? Math.max(1, opts.damage) : 10;
  const [nx, ny] = normalizeDir(opts.impactDirX ?? 1, opts.impactDirY ?? 0, 1, 0);

  if (opts.shielded) {
    addScreenShakeTrauma(state, 0.14, 0.38);
    state.punchX = Math.max(-12, Math.min(12, state.punchX + nx * 3));
    state.punchY = Math.max(-12, Math.min(12, state.punchY + ny * 3));
    return;
  }

  const isHeavy = Boolean(opts.heavy || opts.isSecondary || dmg >= 55);
  if (isHeavy) {
    const heavyBonus = Math.min(0.14, (dmg / 120) * 0.14);
    addScreenShakeTrauma(state, 0.34 + heavyBonus, 0.82);
    state.punchX = Math.max(-14, Math.min(14, state.punchX + nx * 6.5));
    state.punchY = Math.max(-14, Math.min(14, state.punchY + ny * 6.5));
  } else {
    const dmgScale = Math.min(0.1, (dmg / 45) * 0.1);
    addScreenShakeTrauma(state, 0.2 + dmgScale, 0.56);
    state.punchX = Math.max(-10, Math.min(10, state.punchX + nx * 2.5));
    state.punchY = Math.max(-10, Math.min(10, state.punchY + ny * 2.5));
  }
}

export function stepScreenShake(state: ScreenShakeState, dt: number): void {
  const safeDt = Number.isFinite(dt) && dt > 0 ? Math.min(dt, 0.1) : 0;
  if (safeDt <= 0) return;

  if (state.trauma > 0) {
    state.trauma = Math.max(0, state.trauma - safeDt * TRAUMA_DECAY_PER_SEC);
  }

  if (state.punchX !== 0 || state.punchY !== 0) {
    const damp = Math.exp(-PUNCH_DAMPING * safeDt);
    state.punchX *= damp;
    state.punchY *= damp;
    if (Math.abs(state.punchX) < 0.05) state.punchX = 0;
    if (Math.abs(state.punchY) < 0.05) state.punchY = 0;
  }

  if (state.damageFlashTimer > 0) {
    state.damageFlashTimer = Math.max(0, state.damageFlashTimer - safeDt);
  }
}

/**
 * Samples deterministic multi-frequency shake displacement + subtle roll + edge overscan scale.
 * Automatically tones down motion when prefers-reduced-motion is active.
 */
export function sampleScreenShake(
  state: ScreenShakeState,
  timeSec: number,
  reducedMotion = false
): ScreenShakeSample {
  const clampedTrauma = Math.max(0, Math.min(1, state.trauma));
  const intensity = clampedTrauma * clampedTrauma;
  const flashAlpha =
    state.damageFlashTimer > 0 && state.damageFlashMax > 0
      ? Math.max(0, Math.min(1, state.damageFlashTimer / state.damageFlashMax))
      : 0;

  if (intensity < 0.0004 && state.punchX === 0 && state.punchY === 0) {
    return {
      offsetX: 0,
      offsetY: 0,
      angleRad: 0,
      overscanScale: 1,
      intensity: 0,
      damageFlashAlpha: flashAlpha,
    };
  }

  const t = Number.isFinite(timeSec) ? timeSec : 0;
  const phase = state.seedPhase;

  const waveX = Math.sin(t * 47 + phase) * 0.65 + Math.cos(t * 73 + phase * 1.7) * 0.35;
  const waveY = Math.cos(t * 53 + phase * 1.3) * 0.65 + Math.sin(t * 81 + phase * 2.1) * 0.35;
  const waveRot = Math.sin(t * 39 + phase * 0.9) * 0.7 + Math.cos(t * 61 + phase * 1.4) * 0.3;

  const motionScale = reducedMotion ? 0.22 : 1;
  const maxPx = MAX_SHAKE_OFFSET_PX * motionScale;

  const offsetX = waveX * intensity * maxPx + state.punchX * motionScale;
  const offsetY = waveY * intensity * maxPx + state.punchY * motionScale;
  const angleRad = reducedMotion ? 0 : waveRot * intensity * MAX_SHAKE_ANGLE_RAD;

  const overscanScale =
    1 + Math.min(0.055, (Math.abs(offsetX) + Math.abs(offsetY)) / 420 + Math.abs(angleRad) * 0.9);

  return {
    offsetX,
    offsetY,
    angleRad,
    overscanScale,
    intensity,
    damageFlashAlpha: flashAlpha,
  };
}
