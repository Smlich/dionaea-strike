import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clearParticlePool,
  countActiveParticles,
  createParticlePool,
  emitBulletImpactParticles,
  emitEnemyExplosionParticles,
  emitGenericBurstParticles,
  emitPlayerHitParticles,
  getExplosionTierForArchetype,
  PARTICLE_POOL_SIZE,
  stepParticlePool,
} from './particles';

function makeDeterministicRng(seed = 0.37) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

test('createParticlePool pre-allocates fixed capacity with zero active slots', () => {
  const pool = createParticlePool();
  assert.equal(pool.capacity, PARTICLE_POOL_SIZE);
  assert.equal(pool.items.length, PARTICLE_POOL_SIZE);
  assert.equal(countActiveParticles(pool), 0);
});

test('emitBulletImpactParticles emits flash and reflected directional sparks opposite bullet velocity', () => {
  const pool = createParticlePool(64);
  const rng = makeDeterministicRng();
  // Bullet moving right (+vx = 700, vy = 0) hits at (500, 300)
  emitBulletImpactParticles(
    pool,
    {
      x: 500,
      y: 300,
      vx: 700,
      vy: 0,
      color: '#4ADE80',
      heavy: false,
    },
    rng
  );

  const active = pool.items.filter((p) => p.active);
  assert.ok(active.length >= 5, 'Should spawn flash + multiple sparks');
  assert.ok(active.some((p) => p.kind === 'flash'), 'Should include impact flash');
  const sparks = active.filter((p) => p.kind === 'spark');
  assert.ok(sparks.length >= 4, 'Should spawn directional impact sparks');
  // Sparks reflect opposite (+vx) so average spark vx must point leftward (< 0)
  const avgVx = sparks.reduce((sum, p) => sum + p.vx, 0) / sparks.length;
  assert.ok(avgVx < 0, `Reflected sparks should travel opposite incoming bullet, got avgVx=${avgVx}`);
});

test('emitBulletImpactParticles differentiates heavy/shielded/acid impacts with rings and droplets', () => {
  const pool = createParticlePool(64);
  const rng = makeDeterministicRng();

  emitBulletImpactParticles(
    pool,
    {
      x: 420,
      y: 260,
      vx: 600,
      vy: 40,
      color: '#A855F7',
      heavy: true,
      acid: true,
    },
    rng
  );

  const active = pool.items.filter((p) => p.active);
  assert.ok(active.some((p) => p.kind === 'ring'), 'Heavy impact should emit shockwave ring');
  assert.ok(active.some((p) => p.kind === 'droplet'), 'Acid impact should emit droplets');
  assert.ok(active.some((p) => p.kind === 'flash'), 'Heavy impact should emit flash');

  clearParticlePool(pool);
  emitBulletImpactParticles(
    pool,
    {
      x: 680,
      y: 340,
      vx: 650,
      vy: 0,
      color: '#E11D48',
      shielded: true,
    },
    rng
  );
  const shieldActive = pool.items.filter((p) => p.active);
  assert.ok(shieldActive.some((p) => p.kind === 'ring' && p.color === '#38BDF8'), 'Shielded impact emits blue metallic ring');
});

test('emitEnemyExplosionParticles scales layered explosion across enemy tiers', () => {
  const smallPool = createParticlePool(128);
  const bossPool = createParticlePool(128);
  const rng = makeDeterministicRng();

  emitEnemyExplosionParticles(
    smallPool,
    { x: 500, y: 300, primaryColor: '#4ADE80', tier: 'small' },
    rng
  );
  emitEnemyExplosionParticles(
    bossPool,
    { x: 700, y: 360, primaryColor: '#F43F5E', accentColor: '#FDE047', tier: 'boss' },
    rng
  );

  const smallActive = smallPool.items.filter((p) => p.active);
  const bossActive = bossPool.items.filter((p) => p.active);

  assert.ok(bossActive.length > smallActive.length * 2, 'Boss explosion must emit significantly more particles than small enemy');
  for (const kind of ['flash', 'ring', 'spark', 'shard', 'smoke'] as const) {
    assert.ok(smallActive.some((p) => p.kind === kind), `Small explosion should include ${kind}`);
    assert.ok(bossActive.some((p) => p.kind === kind), `Boss explosion should include ${kind}`);
  }
  assert.equal(getExplosionTierForArchetype('drone'), 'small');
  assert.equal(getExplosionTierForArchetype('sniper'), 'medium');
  assert.equal(getExplosionTierForArchetype('bomber'), 'heavy');
});

test('stepParticlePool advances physics, applies drag/gravity/spin, and deactivates expired particles', () => {
  const pool = createParticlePool(32);
  const rng = makeDeterministicRng();
  emitEnemyExplosionParticles(
    pool,
    { x: 300, y: 200, primaryColor: '#FACC15', tier: 'medium' },
    rng
  );

  const initialCount = countActiveParticles(pool);
  assert.ok(initialCount > 0);

  // Negative or NaN dt must be ignored safely
  stepParticlePool(pool, -0.5);
  stepParticlePool(pool, Number.NaN);
  assert.equal(countActiveParticles(pool), initialCount);

  // Step 2 full seconds -> all particles should expire cleanly
  for (let i = 0; i < 120; i++) {
    stepParticlePool(pool, 1 / 60);
  }
  assert.equal(countActiveParticles(pool), 0, 'All finite-life particles must deactivate after 2s');
});

test('pool ring buffer wraps cleanly without allocating and respects reducedMotion', () => {
  const pool = createParticlePool(24);
  const rng = makeDeterministicRng();
  const initialRefs = [...pool.items];

  for (let i = 0; i < 8; i++) {
    emitGenericBurstParticles(pool, { x: 100 + i * 10, y: 120, color: '#38BDF8', count: 10, speed: 150 }, rng);
  }

  // Exact same object references reused in-place (zero GC)
  for (let i = 0; i < pool.capacity; i++) {
    assert.strictEqual(pool.items[i], initialRefs[i]);
  }
  assert.equal(countActiveParticles(pool), 24);

  clearParticlePool(pool);
  assert.equal(countActiveParticles(pool), 0);

  const fullPool = createParticlePool(128);
  const reducedPool = createParticlePool(128);
  emitPlayerHitParticles(fullPool, { x: 200, y: 300, dirX: -1, dirY: 0, fatal: false, reducedMotion: false }, rng);
  emitPlayerHitParticles(reducedPool, { x: 200, y: 300, dirX: -1, dirY: 0, fatal: false, reducedMotion: true }, rng);
  assert.ok(countActiveParticles(reducedPool) < countActiveParticles(fullPool), 'reducedMotion reduces particle volume');
});
