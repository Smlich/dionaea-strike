import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import {
  DIFFICULTY_ORDER,
  DIFFICULTY_PROFILES,
  DIFFICULTY_STORAGE_KEY,
  computeDifficultySpawnTiming,
  computeDynamicEscalation,
  getDifficultyProfile,
  loadDifficulty,
  sanitizeDifficulty,
  saveDifficulty,
  type DifficultyStorageLike,
} from './difficulty';
import { DEFAULT_GAME_CONFIG } from './gameConfig';
import {
  computeEnemyBulletSpeedMult,
  computeLevelEnemyStats,
  stepEnemyBehavior,
  type SimEnemyState,
} from './fusionRules';

// Stub static image imports when dynamically importing simulation.ts under Node ESM
registerHooks({
  load(url, context, nextLoad) {
    if (/\.(?:jpg|jpeg|png|webp|gif|svg)(?:\?.*)?$/i.test(url)) {
      return {
        format: 'module',
        shortCircuit: true,
        source: 'export default "stub-asset.jpg";',
      };
    }
    return nextLoad(url, context);
  },
});

function createMemoryStorage(): DifficultyStorageLike {
  const map = new Map<string, string>();
  return {
    getItem(key: string) {
      return map.has(key) ? map.get(key)! : null;
    },
    setItem(key: string, value: string) {
      map.set(key, value);
    },
  };
}

function makeDroneEnemy(): SimEnemyState {
  return {
    id: 100,
    archetype: 'drone',
    x: 820,
    y: 360,
    vx: 0,
    vy: 0,
    hp: 40,
    maxHp: 40,
    radius: 17,
    age: 0,
    phaseOffset: 0,
    fireTimer: 5,
    windupTimer: 0,
    windupDuration: 0,
    aimX: 0,
    aimY: 0,
    lungeState: 'track',
    lungeTimer: 0,
    shieldActive: false,
    slowTimer: 0,
    slowFactor: 0,
    mucilageHits: 0,
    rootedTimer: 0,
    acidTimer: 0,
    acidDps: 0,
    hitFlashTimer: 0,
    koTimer: 0,
    dying: false,
    orbitCenterX: 820,
    orbitCenterY: 360,
  };
}

test('difficulty profiles scale enemy speed, spawn rate, bullet speed, and enemy cap monotonically', () => {
  assert.deepEqual([...DIFFICULTY_ORDER], ['easy', 'normal', 'hard']);

  const easy = getDifficultyProfile('easy');
  const normal = getDifficultyProfile('normal');
  const hard = getDifficultyProfile('hard');

  assert.ok(easy.enemySpeedMult < normal.enemySpeedMult && normal.enemySpeedMult < hard.enemySpeedMult);
  assert.ok(easy.spawnRateMult < normal.spawnRateMult && normal.spawnRateMult < hard.spawnRateMult);
  assert.ok(easy.enemyBulletSpeedMult < normal.enemyBulletSpeedMult && normal.enemyBulletSpeedMult < hard.enemyBulletSpeedMult);
  assert.ok(easy.maxActiveEnemies < normal.maxActiveEnemies && normal.maxActiveEnemies < hard.maxActiveEnemies);
  assert.equal(normal.enemySpeedMult, 1.0);
  assert.equal(normal.spawnRateMult, 1.0);
  assert.equal(DIFFICULTY_PROFILES.hard.extraDownbeatSpawn, true);
  assert.equal(DIFFICULTY_PROFILES.easy.extraDownbeatSpawn, false);
});

test('enemy stats, movement distance, and bullet speed scale cleanly across Easy, Normal, and Hard', () => {
  for (const level of [1, 2, 3, 4, 5] as const) {
    const easyStats = computeLevelEnemyStats(40, 165, 1.65, level, 'easy');
    const normalStats = computeLevelEnemyStats(40, 165, 1.65, level, 'normal');
    const defaultStats = computeLevelEnemyStats(40, 165, 1.65, level);
    const hardStats = computeLevelEnemyStats(40, 165, 1.65, level, 'hard');

    assert.deepEqual(normalStats, defaultStats, `Normal matches default stats on Level ${level}`);
    assert.ok(easyStats.speed < normalStats.speed, `Easy enemy speed < Normal on Level ${level}`);
    assert.ok(normalStats.speed < hardStats.speed, `Normal enemy speed < Hard on Level ${level}`);

    const easyBullet = computeEnemyBulletSpeedMult(level, 'easy');
    const normalBullet = computeEnemyBulletSpeedMult(level, 'normal');
    const hardBullet = computeEnemyBulletSpeedMult(level, 'hard');
    assert.ok(easyBullet < normalBullet && normalBullet < hardBullet);
  }

  const easyDrone = makeDroneEnemy();
  const normalDrone = makeDroneEnemy();
  const hardDrone = makeDroneEnemy();

  stepEnemyBehavior(easyDrone, 160, 360, 0.2, 960, 720, DEFAULT_GAME_CONFIG, 2, 1, 'easy');
  stepEnemyBehavior(normalDrone, 160, 360, 0.2, 960, 720, DEFAULT_GAME_CONFIG, 2, 1, 'normal');
  stepEnemyBehavior(hardDrone, 160, 360, 0.2, 960, 720, DEFAULT_GAME_CONFIG, 2, 1, 'hard');

  const easyTraveled = 820 - easyDrone.x;
  const normalTraveled = 820 - normalDrone.x;
  const hardTraveled = 820 - hardDrone.x;
  assert.ok(easyTraveled < normalTraveled && normalTraveled < hardTraveled);
});

test('spawn timing scales wave spawn intervals and beat subdivisions cleanly for all difficulties', () => {
  const beatDur = 60 / 130; // ~0.4615s
  const easyTiming = computeDifficultySpawnTiming(1.2, beatDur, 'easy');
  const normalTiming = computeDifficultySpawnTiming(1.2, beatDur, 'normal');
  const hardTiming = computeDifficultySpawnTiming(1.2, beatDur, 'hard');

  // Lower spawn rate -> longer interval & more beats between spawns; higher spawn rate -> shorter interval & fewer beats
  assert.ok(easyTiming.spawnIntervalSec > normalTiming.spawnIntervalSec);
  assert.ok(normalTiming.spawnIntervalSec > hardTiming.spawnIntervalSec);
  assert.ok(easyTiming.beatsPerSpawn > normalTiming.beatsPerSpawn);
  assert.ok(normalTiming.beatsPerSpawn > hardTiming.beatsPerSpawn);
  assert.ok(hardTiming.beatsPerSpawn >= 0.5);
});

test('difficulty sanitizes invalid inputs and persists cleanly to storage', () => {
  const storage = createMemoryStorage();
  assert.equal(loadDifficulty(storage), 'normal');

  assert.equal(sanitizeDifficulty('HARD'), 'hard');
  assert.equal(sanitizeDifficulty('fácil'), 'easy');
  assert.equal(sanitizeDifficulty('unknown_mode'), 'normal');
  assert.equal(sanitizeDifficulty(null), 'normal');

  saveDifficulty('hard', storage);
  assert.equal(storage.getItem(DIFFICULTY_STORAGE_KEY), 'hard');
  assert.equal(loadDifficulty(storage), 'hard');

  saveDifficulty('easy', storage);
  assert.equal(loadDifficulty(storage), 'easy');
});

test('computeDynamicEscalation increases enemy velocity and spawn rate monotonically with score and survival time', () => {
  const baseline = computeDynamicEscalation(0, 0, 'normal');
  assert.equal(baseline.intensity, 0);
  assert.equal(baseline.velocityMult, 1);
  assert.equal(baseline.spawnRateMult, 1);
  assert.equal(baseline.bonusMaxEnemies, 0);
  assert.equal(baseline.tier, 0);

  // Escalation driven purely by time survived
  const at30s = computeDynamicEscalation(0, 30, 'normal');
  const at90s = computeDynamicEscalation(0, 90, 'normal');
  const at240s = computeDynamicEscalation(0, 240, 'normal');
  assert.ok(at30s.velocityMult > baseline.velocityMult && at90s.velocityMult > at30s.velocityMult && at240s.velocityMult > at90s.velocityMult);
  assert.ok(at30s.spawnRateMult > baseline.spawnRateMult && at90s.spawnRateMult > at30s.spawnRateMult && at240s.spawnRateMult > at90s.spawnRateMult);

  // Escalation driven purely by player score
  const at3k = computeDynamicEscalation(3000, 0, 'normal');
  const at12k = computeDynamicEscalation(12000, 0, 'normal');
  const at30k = computeDynamicEscalation(30000, 0, 'normal');
  assert.ok(at3k.velocityMult > baseline.velocityMult && at12k.velocityMult > at3k.velocityMult && at30k.velocityMult > at12k.velocityMult);
  assert.ok(at3k.spawnRateMult > baseline.spawnRateMult && at12k.spawnRateMult > at3k.spawnRateMult && at30k.spawnRateMult > at12k.spawnRateMult);

  // Combined score + survival time exceeds either alone and stays smoothly bounded
  const combined = computeDynamicEscalation(12000, 90, 'normal');
  assert.ok(combined.velocityMult > at90s.velocityMult);
  assert.ok(combined.velocityMult > at12k.velocityMult);
  assert.ok(combined.velocityMult <= 1.42);
  assert.ok(combined.spawnRateMult <= 1.58);

  // Extreme values remain finite and safely capped across all difficulties
  const easyExtreme = computeDynamicEscalation(999999, 9999, 'easy');
  const normalExtreme = computeDynamicEscalation(999999, 9999, 'normal');
  const hardExtreme = computeDynamicEscalation(999999, 9999, 'hard');
  assert.ok(easyExtreme.velocityMult < normalExtreme.velocityMult && normalExtreme.velocityMult < hardExtreme.velocityMult);
  assert.ok(easyExtreme.spawnRateMult < normalExtreme.spawnRateMult && normalExtreme.spawnRateMult < hardExtreme.spawnRateMult);
  assert.equal(hardExtreme.tier, 4);

  // Spawn timing tightens and expands active cap under escalation
  const beatDur = 60 / 130;
  const baseTiming = computeDifficultySpawnTiming(1.2, beatDur, 'normal', baseline);
  const escalatedTiming = computeDifficultySpawnTiming(1.2, beatDur, 'normal', combined);
  assert.ok(escalatedTiming.spawnIntervalSec < baseTiming.spawnIntervalSec);
  assert.ok(escalatedTiming.beatsPerSpawn <= baseTiming.beatsPerSpawn);
  assert.ok(escalatedTiming.maxActiveEnemies > baseTiming.maxActiveEnemies);
});

test('GameSimulation dynamically accelerates enemy fly velocity and spawn rate as score and time survived grow', async () => {
  const { GameSimulation } = await import('./simulation');

  const createSim = () => {
    const sim = new GameSimulation(
      {
        ...DEFAULT_GAME_CONFIG,
        player: { ...DEFAULT_GAME_CONFIG.player, autoFire: false, frogAlly: { ...DEFAULT_GAME_CONFIG.player.frogAlly, enabled: false } },
      },
      () => {},
      () => {}
    );
    sim.setDifficulty('normal');
    sim.resize(1280, 720);
    sim.startNewGame();
    return sim;
  };

  type SimInspector = {
    score: number;
    elapsedSec: number;
    enemies: SimEnemyState[];
    nextEnemyId: number;
    spawnEnemy: (archetype: SimEnemyState['archetype']) => void;
  };

  // 1) Measure baseline spawns and fly speed over 12 seconds starting at score=0, elapsed=0
  const baseSim = createSim();
  const baseAny = baseSim as unknown as SimInspector;
  for (let i = 0; i < 12 * 60; i += 1) {
    baseSim.step(1 / 60);
  }
  const baseSpawnedCount = baseAny.nextEnemyId - 1;
  baseAny.enemies = [];
  baseAny.spawnEnemy('drone');
  const baseFlySpeed = Math.abs(baseAny.enemies[0].vx);

  // 2) Measure escalated spawns and fly speed over 12 seconds starting at high score & survival time
  const hotSim = createSim();
  const hotAny = hotSim as unknown as SimInspector;
  hotAny.score = 22000;
  hotAny.elapsedSec = 140;
  for (let i = 0; i < 12 * 60; i += 1) {
    hotSim.step(1 / 60);
  }
  const hotSpawnedCount = hotAny.nextEnemyId - 1;
  hotAny.enemies = [];
  hotAny.spawnEnemy('drone');
  const hotFlySpeed = Math.abs(hotAny.enemies[0].vx);

  assert.ok(
    hotSpawnedCount > baseSpawnedCount,
    `Expected escalated game loop to spawn more enemy flies (${hotSpawnedCount} > ${baseSpawnedCount})`
  );
  assert.ok(
    hotFlySpeed > baseFlySpeed * 1.2,
    `Expected escalated enemy fly velocity (${hotFlySpeed}) to significantly exceed baseline (${baseFlySpeed})`
  );
  assert.ok(hotSim.getDynamicEscalation().velocityMult > baseSim.getDynamicEscalation().velocityMult);
  assert.ok(hotSim.getDynamicEscalation().spawnRateMult > baseSim.getDynamicEscalation().spawnRateMult);
});
