import type { EnemyArchetypeId } from './types';

export type ParticleKind = 'spark' | 'ring' | 'smoke' | 'shard' | 'flash' | 'droplet';

export type ExplosionTier = 'small' | 'medium' | 'heavy' | 'miniboss' | 'boss';

export interface Particle {
  active: boolean;
  kind: ParticleKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  endSize: number;
  color: string;
  secondaryColor: string;
  outlined: boolean;
  drag: number;
  gravity: number;
  rotation: number;
  spin: number;
  lineWidth: number;
}

export interface ParticlePool {
  items: Particle[];
  cursor: number;
  capacity: number;
}

export interface BulletImpactParticleOptions {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  secondaryColor?: string;
  heavy?: boolean;
  shielded?: boolean;
  acid?: boolean;
  reducedMotion?: boolean;
}

export interface EnemyExplosionParticleOptions {
  x: number;
  y: number;
  primaryColor: string;
  accentColor?: string;
  tier: ExplosionTier;
  reducedMotion?: boolean;
}

export interface PlayerHitParticleOptions {
  x: number;
  y: number;
  dirX?: number;
  dirY?: number;
  fatal?: boolean;
  reducedMotion?: boolean;
}

export interface GenericBurstOptions {
  x: number;
  y: number;
  color: string;
  count: number;
  speed: number;
  outlined?: boolean;
  reducedMotion?: boolean;
}

export const PARTICLE_POOL_SIZE = 320;

function createEmptyParticle(): Particle {
  return {
    active: false,
    kind: 'spark',
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    life: 0,
    maxLife: 1,
    size: 4,
    endSize: 1,
    color: '#FFFFFF',
    secondaryColor: '#FEF08A',
    outlined: false,
    drag: 0.94,
    gravity: 0,
    rotation: 0,
    spin: 0,
    lineWidth: 2,
  };
}

export function createParticlePool(capacity = PARTICLE_POOL_SIZE): ParticlePool {
  const safeCap = Math.max(16, Math.round(capacity));
  return {
    items: Array.from({ length: safeCap }, createEmptyParticle),
    cursor: 0,
    capacity: safeCap,
  };
}

export function clearParticlePool(pool: ParticlePool): void {
  for (let i = 0; i < pool.items.length; i++) {
    pool.items[i].active = false;
  }
  pool.cursor = 0;
}

export function countActiveParticles(pool: ParticlePool): number {
  let count = 0;
  for (let i = 0; i < pool.items.length; i++) {
    if (pool.items[i].active) count++;
  }
  return count;
}

function acquireParticle(pool: ParticlePool): Particle {
  const item = pool.items[pool.cursor];
  pool.cursor = (pool.cursor + 1) % pool.capacity;
  return item;
}

function spawnParticle(
  pool: ParticlePool,
  params: Omit<Particle, 'active'>
): void {
  if (!Number.isFinite(params.x) || !Number.isFinite(params.y)) return;
  const p = acquireParticle(pool);
  p.active = true;
  p.kind = params.kind;
  p.x = params.x;
  p.y = params.y;
  p.vx = Number.isFinite(params.vx) ? params.vx : 0;
  p.vy = Number.isFinite(params.vy) ? params.vy : 0;
  p.maxLife = Math.max(0.02, Number.isFinite(params.maxLife) ? params.maxLife : 0.2);
  p.life = Math.min(p.maxLife, Math.max(0.01, Number.isFinite(params.life) ? params.life : p.maxLife));
  p.size = Math.max(0.5, Number.isFinite(params.size) ? params.size : 4);
  p.endSize = Math.max(0.1, Number.isFinite(params.endSize) ? params.endSize : p.size * 0.4);
  p.color = params.color;
  p.secondaryColor = params.secondaryColor;
  p.outlined = params.outlined;
  p.drag = Math.max(0.5, Math.min(1, Number.isFinite(params.drag) ? params.drag : 0.94));
  p.gravity = Number.isFinite(params.gravity) ? params.gravity : 0;
  p.rotation = Number.isFinite(params.rotation) ? params.rotation : 0;
  p.spin = Number.isFinite(params.spin) ? params.spin : 0;
  p.lineWidth = Math.max(0.8, Number.isFinite(params.lineWidth) ? params.lineWidth : 2);
}

export function getExplosionTierForArchetype(archetype: EnemyArchetypeId): ExplosionTier {
  if (archetype === 'bomber' || archetype === 'tank' || archetype === 'hornet') {
    return 'heavy';
  }
  if (archetype === 'sniper' || archetype === 'flanker' || archetype === 'locust') {
    return 'medium';
  }
  return 'small';
}

/**
 * Directional bullet impact particles: crisp core flash, reflected sparks along the
 * impact cone, optional metallic/heavy shock ring, and bio-acid/mucilage droplets.
 */
export function emitBulletImpactParticles(
  pool: ParticlePool,
  opts: BulletImpactParticleOptions,
  rng: () => number = Math.random
): void {
  const { x, y, vx, vy, color } = opts;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return;

  const heavy = Boolean(opts.heavy);
  const shielded = Boolean(opts.shielded);
  const acid = Boolean(opts.acid);
  const reduced = Boolean(opts.reducedMotion);
  const secondary = opts.secondaryColor ?? (shielded ? '#FEF08A' : '#FFFFFF');

  // Reflect direction opposite the incoming bullet vector
  const speedMag = Math.hypot(vx, vy);
  const baseAngle = speedMag > 1 ? Math.atan2(-vy, -vx) : Math.PI;

  // 1. Crisp impact flash starburst right at collision point
  spawnParticle(pool, {
    kind: 'flash',
    x,
    y,
    vx: 0,
    vy: 0,
    life: heavy ? 0.11 : 0.075,
    maxLife: heavy ? 0.11 : 0.075,
    size: heavy ? 16 : shielded ? 13 : 9.5,
    endSize: heavy ? 5 : 3,
    color: shielded ? '#E0F2FE' : '#FFFFFF',
    secondaryColor: shielded ? '#38BDF8' : color,
    outlined: false,
    drag: 0.9,
    gravity: 0,
    rotation: rng() * Math.PI,
    spin: 0,
    lineWidth: 2,
  });

  // 2. Micro shockwave ring on heavy, secondary, or shielded impacts
  if (heavy || shielded) {
    spawnParticle(pool, {
      kind: 'ring',
      x,
      y,
      vx: 0,
      vy: 0,
      life: heavy ? 0.22 : 0.17,
      maxLife: heavy ? 0.22 : 0.17,
      size: heavy ? 6 : 5,
      endSize: heavy ? 30 : 22,
      color: shielded ? '#38BDF8' : color,
      secondaryColor: secondary,
      outlined: false,
      drag: 1,
      gravity: 0,
      rotation: 0,
      spin: 0,
      lineWidth: heavy ? 3.2 : 2.6,
    });
  }

  // 3. Directional reflected spark streaks
  const sparkCount = reduced
    ? heavy
      ? 3
      : 2
    : heavy
    ? 8
    : shielded
    ? 6
    : 4;
  const spreadRad = shielded ? 1.25 : heavy ? 1.45 : 0.95;

  for (let i = 0; i < sparkCount; i++) {
    const ang = baseAngle + (rng() - 0.5) * spreadRad * 2;
    const spd = (heavy ? 185 : shielded ? 195 : 135) * (0.55 + rng() * 0.85);
    const maxLife = (heavy ? 0.24 : 0.17) + rng() * 0.1;
    spawnParticle(pool, {
      kind: 'spark',
      x,
      y,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd,
      life: maxLife,
      maxLife,
      size: (heavy ? 11 : 7.5) + rng() * 5,
      endSize: 2,
      color: shielded ? (i % 2 === 0 ? '#38BDF8' : '#FEF08A') : i === 0 ? '#FFFFFF' : color,
      secondaryColor: secondary,
      outlined: false,
      drag: 0.89,
      gravity: shielded ? 110 : 40,
      rotation: ang,
      spin: 0,
      lineWidth: heavy ? 2.6 : 2.0,
    });
  }

  // 4. Bio-droplets for acid / mucilage hits or heavy splashes
  if (acid || heavy) {
    const dropCount = reduced ? 1 : acid ? 4 : 3;
    for (let i = 0; i < dropCount; i++) {
      const ang = baseAngle + (rng() - 0.5) * 2.2;
      const spd = (acid ? 110 : 140) * (0.45 + rng() * 0.8);
      const maxLife = 0.24 + rng() * 0.18;
      spawnParticle(pool, {
        kind: 'droplet',
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 25,
        life: maxLife,
        maxLife,
        size: (acid ? 4.4 : 3.8) + rng() * 2.4,
        endSize: 1.2,
        color,
        secondaryColor: secondary,
        outlined: heavy,
        drag: 0.94,
        gravity: 240,
        rotation: ang,
        spin: 0,
        lineWidth: 1.4,
      });
    }
  }
}

/**
 * Multi-layered anime/arcade enemy explosion: hot core flash, expanding shockwave
 * ring(s), radial spark streaks, tumbling chitin debris shards, and smoke puffs.
 */
export function emitEnemyExplosionParticles(
  pool: ParticlePool,
  opts: EnemyExplosionParticleOptions,
  rng: () => number = Math.random
): void {
  const { x, y, primaryColor, tier } = opts;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return;

  const accent = opts.accentColor ?? '#FDE047';
  const reduced = Boolean(opts.reducedMotion);

  const tierCfg: Record<
    ExplosionTier,
    {
      ringRadius: number;
      secondRing: boolean;
      flashSize: number;
      sparks: number;
      shards: number;
      smoke: number;
      speed: number;
    }
  > = {
    small: { ringRadius: 34, secondRing: false, flashSize: 20, sparks: 7, shards: 4, smoke: 3, speed: 205 },
    medium: { ringRadius: 46, secondRing: false, flashSize: 26, sparks: 10, shards: 6, smoke: 4, speed: 240 },
    heavy: { ringRadius: 62, secondRing: true, flashSize: 34, sparks: 14, shards: 8, smoke: 6, speed: 280 },
    miniboss: { ringRadius: 84, secondRing: true, flashSize: 44, sparks: 18, shards: 11, smoke: 8, speed: 325 },
    boss: { ringRadius: 116, secondRing: true, flashSize: 56, sparks: 24, shards: 14, smoke: 10, speed: 375 },
  };

  const cfg = tierCfg[tier];
  const scaleCount = (n: number) => (reduced ? Math.max(1, Math.ceil(n * 0.4)) : n);

  // 1. Billowing smoke puffs (spawned first so sparks/flash pop cleanly)
  const smokeCount = scaleCount(cfg.smoke);
  for (let i = 0; i < smokeCount; i++) {
    const ang = (i / Math.max(1, smokeCount)) * Math.PI * 2 + (rng() - 0.5) * 0.6;
    const spd = cfg.speed * (0.14 + rng() * 0.24);
    const maxLife = 0.38 + rng() * 0.26;
    const startSize = (tier === 'boss' ? 14 : tier === 'heavy' ? 10 : 7.5) + rng() * 5;
    spawnParticle(pool, {
      kind: 'smoke',
      x: x + (rng() - 0.5) * 14,
      y: y + (rng() - 0.5) * 14,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd - 22,
      life: maxLife,
      maxLife,
      size: startSize,
      endSize: startSize * 2.15,
      color: i % 2 === 0 ? '#334155' : '#475569',
      secondaryColor: primaryColor,
      outlined: false,
      drag: 0.91,
      gravity: -35,
      rotation: rng() * Math.PI * 2,
      spin: (rng() - 0.5) * 2.2,
      lineWidth: 1.4,
    });
  }

  // 2. Expanding shockwave ring(s)
  spawnParticle(pool, {
    kind: 'ring',
    x,
    y,
    vx: 0,
    vy: 0,
    life: tier === 'boss' ? 0.42 : tier === 'miniboss' ? 0.34 : 0.26,
    maxLife: tier === 'boss' ? 0.42 : tier === 'miniboss' ? 0.34 : 0.26,
    size: 8,
    endSize: cfg.ringRadius,
    color: accent,
    secondaryColor: primaryColor,
    outlined: false,
    drag: 1,
    gravity: 0,
    rotation: 0,
    spin: 0,
    lineWidth: tier === 'boss' ? 5.2 : tier === 'heavy' || tier === 'miniboss' ? 4.0 : 3.2,
  });

  if (cfg.secondRing && !reduced) {
    spawnParticle(pool, {
      kind: 'ring',
      x,
      y,
      vx: 0,
      vy: 0,
      life: tier === 'boss' ? 0.54 : 0.36,
      maxLife: tier === 'boss' ? 0.54 : 0.36,
      size: 6,
      endSize: cfg.ringRadius * 0.72,
      color: primaryColor,
      secondaryColor: '#FFFFFF',
      outlined: false,
      drag: 1,
      gravity: 0,
      rotation: 0,
      spin: 0,
      lineWidth: 3.0,
    });
  }

  // 3. Tumbling cel-shaded chitin/armor debris shards
  const shardCount = scaleCount(cfg.shards);
  for (let i = 0; i < shardCount; i++) {
    const ang = (i / Math.max(1, shardCount)) * Math.PI * 2 + (rng() - 0.5) * 0.5;
    const spd = cfg.speed * (0.35 + rng() * 0.62);
    const maxLife = 0.36 + rng() * 0.28;
    const sz = (tier === 'boss' ? 7.8 : tier === 'heavy' ? 6.2 : 4.8) + rng() * 3.4;
    spawnParticle(pool, {
      kind: 'shard',
      x: x + (rng() - 0.5) * 10,
      y: y + (rng() - 0.5) * 10,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd - 45,
      life: maxLife,
      maxLife,
      size: sz,
      endSize: sz * 0.35,
      color: i % 3 === 0 ? accent : primaryColor,
      secondaryColor: '#FFFFFF',
      outlined: true,
      drag: 0.95,
      gravity: 340,
      rotation: rng() * Math.PI * 2,
      spin: (rng() < 0.5 ? -1 : 1) * (5 + rng() * 9),
      lineWidth: 1.6,
    });
  }

  // 4. High-speed radial spark streaks
  const sparkCount = scaleCount(cfg.sparks);
  for (let i = 0; i < sparkCount; i++) {
    const ang = rng() * Math.PI * 2;
    const spd = cfg.speed * (0.55 + rng() * 0.85);
    const maxLife = 0.22 + rng() * 0.2;
    spawnParticle(pool, {
      kind: 'spark',
      x,
      y,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd,
      life: maxLife,
      maxLife,
      size: (tier === 'boss' ? 16 : tier === 'heavy' ? 12 : 9) + rng() * 7,
      endSize: 2,
      color: i % 3 === 0 ? '#FFFFFF' : i % 2 === 0 ? accent : primaryColor,
      secondaryColor: accent,
      outlined: false,
      drag: 0.9,
      gravity: 65,
      rotation: ang,
      spin: 0,
      lineWidth: tier === 'boss' ? 3.0 : 2.3,
    });
  }

  // 5. Blinding core flash star
  spawnParticle(pool, {
    kind: 'flash',
    x,
    y,
    vx: 0,
    vy: 0,
    life: tier === 'boss' ? 0.2 : 0.13,
    maxLife: tier === 'boss' ? 0.2 : 0.13,
    size: cfg.flashSize,
    endSize: cfg.flashSize * 0.25,
    color: '#FFFFFF',
    secondaryColor: accent,
    outlined: false,
    drag: 0.9,
    gravity: 0,
    rotation: rng() * Math.PI,
    spin: 2.5,
    lineWidth: 2,
  });
}

/**
 * Directional crimson/leaf damage burst when the player biplane takes a hit.
 */
export function emitPlayerHitParticles(
  pool: ParticlePool,
  opts: PlayerHitParticleOptions,
  rng: () => number = Math.random
): void {
  const { x, y, fatal, reducedMotion } = opts;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return;

  const baseAngle =
    opts.dirX !== undefined && opts.dirY !== undefined && Math.hypot(opts.dirX, opts.dirY) > 0.01
      ? Math.atan2(opts.dirY, opts.dirX)
      : Math.PI;

  spawnParticle(pool, {
    kind: 'ring',
    x,
    y,
    vx: 0,
    vy: 0,
    life: fatal ? 0.42 : 0.26,
    maxLife: fatal ? 0.42 : 0.26,
    size: 10,
    endSize: fatal ? 92 : 52,
    color: '#FB7185',
    secondaryColor: '#FDE047',
    outlined: false,
    drag: 1,
    gravity: 0,
    rotation: 0,
    spin: 0,
    lineWidth: fatal ? 4.6 : 3.4,
  });

  const count = reducedMotion ? 6 : fatal ? 20 : 12;
  for (let i = 0; i < count; i++) {
    const ang = fatal ? rng() * Math.PI * 2 : baseAngle + (rng() - 0.5) * 2.1;
    const spd = (fatal ? 280 : 210) * (0.4 + rng() * 0.8);
    const maxLife = 0.26 + rng() * 0.24;
    const isShard = i % 3 === 0;
    spawnParticle(pool, {
      kind: isShard ? 'shard' : 'spark',
      x,
      y,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd,
      life: maxLife,
      maxLife,
      size: isShard ? 5.5 + rng() * 3 : 10 + rng() * 6,
      endSize: 2,
      color: i % 4 === 0 ? '#4ADE80' : i % 2 === 0 ? '#FB7185' : '#FDE047',
      secondaryColor: '#FFFFFF',
      outlined: isShard,
      drag: 0.92,
      gravity: isShard ? 280 : 60,
      rotation: ang,
      spin: isShard ? (rng() - 0.5) * 12 : 0,
      lineWidth: 2.3,
    });
  }
}

/**
 * Versatile cel-shaded burst emitter for pet abilities, pickups, phase shifts, and teleports.
 */
export function emitGenericBurstParticles(
  pool: ParticlePool,
  opts: GenericBurstOptions,
  rng: () => number = Math.random
): void {
  const { x, y, color, speed, outlined } = opts;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return;
  const rawCount = Math.max(1, Math.round(opts.count));
  const count = opts.reducedMotion ? Math.max(1, Math.ceil(rawCount * 0.45)) : rawCount;

  if (count >= 10) {
    spawnParticle(pool, {
      kind: 'ring',
      x,
      y,
      vx: 0,
      vy: 0,
      life: 0.24,
      maxLife: 0.24,
      size: 6,
      endSize: Math.min(68, 22 + count * 1.8),
      color,
      secondaryColor: '#FFFFFF',
      outlined: false,
      drag: 1,
      gravity: 0,
      rotation: 0,
      spin: 0,
      lineWidth: 2.8,
    });
  }

  for (let i = 0; i < count; i++) {
    const ang = rng() * Math.PI * 2;
    const spd = speed * (0.35 + rng() * 0.75);
    const maxLife = 0.24 + rng() * 0.28;
    const kind: ParticleKind =
      outlined && i % 3 === 0 ? 'shard' : i % 2 === 0 ? 'spark' : 'droplet';
    spawnParticle(pool, {
      kind,
      x,
      y,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd,
      life: maxLife,
      maxLife,
      size: kind === 'spark' ? 7 + rng() * 5 : 3.6 + rng() * 4,
      endSize: 1.2,
      color: i === 0 && count >= 6 ? '#FFFFFF' : color,
      secondaryColor: '#FEF08A',
      outlined: Boolean(outlined),
      drag: kind === 'spark' ? 0.91 : 0.94,
      gravity: kind === 'shard' ? 210 : 40,
      rotation: ang,
      spin: kind === 'shard' ? (rng() - 0.5) * 10 : 0,
      lineWidth: 2.0,
    });
  }
}

/**
 * Advances all active particles in-place with zero heap allocations.
 */
export function stepParticlePool(pool: ParticlePool, dt: number): void {
  const safeDt = Number.isFinite(dt) && dt > 0 ? Math.min(dt, 0.1) : 0;
  if (safeDt <= 0) return;

  const frameFactor = safeDt * 60;
  for (let i = 0; i < pool.items.length; i++) {
    const p = pool.items[i];
    if (!p.active) continue;

    p.life -= safeDt;
    if (p.life <= 0) {
      p.active = false;
      continue;
    }

    p.vy += p.gravity * safeDt;
    const damp = p.drag < 0.999 ? Math.pow(p.drag, frameFactor) : 1;
    p.vx *= damp;
    p.vy *= damp;
    p.x += p.vx * safeDt;
    p.y += p.vy * safeDt;
    p.rotation += p.spin * safeDt;
  }
}
