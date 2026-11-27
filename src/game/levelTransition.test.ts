import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { DEFAULT_GAME_CONFIG, sanitizeGameConfig } from './gameConfig';
import { countActiveParticles } from './particles';
import type { GameStatus, HudSnapshot, LevelNumber } from './types';

// Stub static image imports pulled in via renderer -> backgroundAssets when running in Node ESM
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

interface StrictCanvasStats {
  drawCalls: number;
  maxSaveDepth: number;
  finalSaveDepth: number;
}

function createStrictCanvasContext(): {
  ctx: CanvasRenderingContext2D;
  stats: StrictCanvasStats;
} {
  let saveDepth = 0;
  const stats: StrictCanvasStats = {
    drawCalls: 0,
    maxSaveDepth: 0,
    finalSaveDepth: 0,
  };

  const assertFinite = (method: string, args: unknown[]) => {
    for (let i = 0; i < args.length; i += 1) {
      const v = args[i];
      if (typeof v === 'number') {
        assert.ok(
          Number.isFinite(v),
          `Canvas2D ${method} received non-finite arg[${i}] = ${String(v)}`
        );
      }
    }
  };

  const dummyGrad = {
    addColorStop: (offset: number, color: string) => {
      assert.ok(Number.isFinite(offset) && offset >= 0 && offset <= 1, `Invalid gradient stop: ${offset}`);
      assert.equal(typeof color, 'string');
    },
  };

  const target: Record<string, unknown> = {
    save: () => {
      saveDepth += 1;
      stats.maxSaveDepth = Math.max(stats.maxSaveDepth, saveDepth);
    },
    restore: () => {
      saveDepth -= 1;
      assert.ok(saveDepth >= 0, 'Canvas2D restore() called more times than save()');
      stats.finalSaveDepth = saveDepth;
    },
    arc: (x: number, y: number, radius: number, start: number, end: number) => {
      assertFinite('arc', [x, y, radius, start, end]);
      assert.ok(radius >= 0, `Canvas2D arc() received negative radius: ${radius}`);
      stats.drawCalls += 1;
    },
    ellipse: (x: number, y: number, rx: number, ry: number, rot: number, s: number, e: number) => {
      assertFinite('ellipse', [x, y, rx, ry, rot, s, e]);
      assert.ok(rx >= 0 && ry >= 0, `Canvas2D ellipse() received negative radius: ${rx}, ${ry}`);
      stats.drawCalls += 1;
    },
    createLinearGradient: (x0: number, y0: number, x1: number, y1: number) => {
      assertFinite('createLinearGradient', [x0, y0, x1, y1]);
      return dummyGrad;
    },
    createRadialGradient: (x0: number, y0: number, r0: number, x1: number, y1: number, r1: number) => {
      assertFinite('createRadialGradient', [x0, y0, r0, x1, y1, r1]);
      assert.ok(r0 >= 0 && r1 >= 0, `Canvas2D createRadialGradient() negative radius: ${r0}, ${r1}`);
      return dummyGrad;
    },
    measureText: (text: string) => ({ width: String(text).length * 7 }),
    setLineDash: () => {},
    getLineDash: () => [],
  };

  const proxy = new Proxy(target, {
    get(obj, prop) {
      if (prop in obj) return obj[prop as string];
      if (typeof prop === 'string') {
        return (...args: unknown[]) => {
          assertFinite(prop, args);
          stats.drawCalls += 1;
        };
      }
      return undefined;
    },
    set(obj, prop, value) {
      if (typeof value === 'number') {
        assert.ok(
          Number.isFinite(value),
          `Canvas2D property ${String(prop)} assigned non-finite number: ${String(value)}`
        );
      }
      obj[prop as string] = value;
      return true;
    },
  });

  return { ctx: proxy as unknown as CanvasRenderingContext2D, stats };
}

test('sanitizeGameConfig restores missing Level 2-5 waves from legacy 3-wave saves', () => {
  const legacyOnlyLevel1 = {
    ...DEFAULT_GAME_CONFIG,
    waves: DEFAULT_GAME_CONFIG.waves.filter((w) => w.level === 1),
  };

  const sanitized = sanitizeGameConfig(legacyOnlyLevel1);
  const levelsPresent = new Set(sanitized.waves.map((w) => w.level));

  for (const lvl of [1, 2, 3, 4, 5] as LevelNumber[]) {
    assert.ok(levelsPresent.has(lvl), `Expected waves for level ${lvl}`);
  }
  assert.ok(sanitized.waves.length >= 15, `Expected at least 15 waves across 5 levels, got ${sanitized.waves.length}`);

  // Verify wave levels are monotonically non-decreasing (1..5)
  for (let i = 1; i < sanitized.waves.length; i += 1) {
    assert.ok(
      sanitized.waves[i].level >= sanitized.waves[i - 1].level,
      `Wave levels must be ordered 1..5 (found ${sanitized.waves[i - 1].level} before ${sanitized.waves[i].level})`
    );
  }
});

test('full 5-level campaign transition loop completes cleanly with zero Canvas2D anomalies', async () => {
  const { GameSimulation } = await import('./simulation');

  const state: { hud: HudSnapshot | null; status: GameStatus } = {
    hud: null,
    status: 'title',
  };
  const sim = new GameSimulation(
    DEFAULT_GAME_CONFIG,
    (snap) => {
      state.hud = snap;
    },
    (status) => {
      state.status = status;
    }
  );
  sim.resize(1280, 720);
  sim.startNewGame();

  const { ctx, stats } = createStrictCanvasContext();
  const simAny = sim as unknown as {
    boss: { active: boolean; hp: number; dyingTimer: number; level: LevelNumber; isMiniBoss: boolean };
    waveIndex: number;
    levelIndex: LevelNumber;
    particlePool: Parameters<typeof countActiveParticles>[0];
    enemies: unknown[];
    spawnBossEncounter: (level: LevelNumber, isMiniBoss: boolean) => void;
    defeatBeatTimer: number;
    hp: number;
    shakeState: { trauma: number };
    hitstopTimer: number;
  };

  for (const expectedLevel of [1, 2, 3, 4, 5] as LevelNumber[]) {
    assert.equal(sim.getLevelIndex(), expectedLevel);
    assert.equal(state.status, 'playing');

    // Run normal wave combat frames + render
    for (let i = 0; i < 45; i += 1) {
      sim.step(1 / 60);
      sim.render(ctx);
    }

    // Spawn and defeat the level's final boss
    simAny.spawnBossEncounter(expectedLevel, false);
    assert.equal(simAny.boss.active, true);
    assert.equal(simAny.boss.level, expectedLevel);

    // Trigger lethal boss hit and step through dyingTimer + dimensional portal forming & entering
    simAny.boss.hp = 0;
    for (let i = 0; i < 320; i += 1) {
      sim.step(1 / 60);
      sim.render(ctx);
      if (state.status !== 'playing') break;
    }

    if (expectedLevel < 5) {
      assert.equal(state.status, 'level_clear', `Expected level_clear after defeating Level ${expectedLevel} boss`);
      assert.ok(state.hud?.clearedLevelSummary, 'Expected clearedLevelSummary on level_clear');
      assert.equal(state.hud.clearedLevelSummary.clearedLevel, expectedLevel);
      assert.equal(state.hud.clearedLevelSummary.nextLevel, expectedLevel + 1);

      // Render during level_clear modal state
      sim.render(ctx);

      // Equip unlocked pet during level_clear if one was unlocked
      if (state.hud.clearedLevelSummary.unlockedPetId) {
        sim.setSelectedPet(state.hud.clearedLevelSummary.unlockedPetId);
      }

      // First transition succeeds, duplicate call returns false
      assert.equal(sim.continueToNextLevel(), true);
      assert.equal(sim.continueToNextLevel(), false);

      assert.equal(state.status, 'playing');
      assert.equal(sim.getLevelIndex(), expectedLevel + 1);
      assert.equal(simAny.boss.active, false);
      assert.equal(simAny.boss.level, expectedLevel + 1);
      assert.equal(countActiveParticles(simAny.particlePool), 0);
      assert.equal(simAny.enemies.length, 0);
      assert.equal(simAny.shakeState.trauma, 0);
      assert.equal(simAny.hitstopTimer, 0);
      assert.equal(simAny.defeatBeatTimer, 0);
      assert.equal(
        DEFAULT_GAME_CONFIG.waves[simAny.waveIndex]?.level,
        expectedLevel + 1,
        `waveIndex must point to Level ${expectedLevel + 1}`
      );

      // Step through the full dimensional portal exiting animation (radius shrinking to 0)
      // to verify zero negative-radius Canvas2D anomalies!
      for (let i = 0; i < 90; i += 1) {
        sim.step(1 / 60);
        sim.render(ctx);
      }
      assert.equal(state.status, 'playing', `Expected active gameplay after exiting portal into Level ${expectedLevel + 1}`);
    } else {
      assert.equal(state.status, 'victory', 'Expected victory after defeating Level 5 boss');
    }
  }

  assert.ok(stats.drawCalls > 100, 'Expected substantial Canvas2D rendering calls across all 5 levels');
  assert.equal(stats.finalSaveDepth, 0, 'Canvas2D save()/restore() stack must remain balanced at 0');
});

test('fatal player damage right before boss defeat finishes does not cause gameover in next level', async () => {
  const { GameSimulation } = await import('./simulation');

  const state: { status: GameStatus } = { status: 'title' };
  const sim = new GameSimulation(
    DEFAULT_GAME_CONFIG,
    () => {},
    (status) => {
      state.status = status;
    }
  );
  sim.resize(1280, 720);
  sim.startNewGame();

  const simAny = sim as unknown as {
    boss: { active: boolean; hp: number; dyingTimer: number };
    hp: number;
    defeatBeatTimer: number;
    spawnBossEncounter: (level: LevelNumber, isMiniBoss: boolean) => void;
  };

  simAny.spawnBossEncounter(1, false);
  simAny.boss.hp = 0;
  sim.step(1 / 60); // enters boss dyingTimer + hitstop

  // Simulate player taking fatal damage right before boss dyingTimer finishes
  simAny.hp = 0;
  simAny.defeatBeatTimer = 0.25;
  for (let i = 0; i < 320; i += 1) {
    sim.step(1 / 60);
    if (state.status !== 'playing') break;
  }

  assert.equal(state.status, 'level_clear');
  assert.equal(simAny.defeatBeatTimer, 0, 'defeatBeatTimer must be cleared on boss defeat');
  assert.ok(simAny.hp >= 1, 'Player HP must be restored to at least 1 on level clear');

  assert.equal(sim.continueToNextLevel(), true);
  // Step 1 second into Level 2 and confirm player is alive and playing
  for (let i = 0; i < 60; i += 1) {
    sim.step(1 / 60);
  }
  assert.equal(state.status, 'playing', 'Player must not immediately hit gameover upon entering Level 2');
});

test('step() safely guards negative, NaN, and oversized dt values', async () => {
  const { GameSimulation } = await import('./simulation');
  const state: { hud: HudSnapshot | null } = { hud: null };
  const sim = new GameSimulation(
    DEFAULT_GAME_CONFIG,
    (snap) => {
      state.hud = snap;
    },
    () => {}
  );
  sim.resize(1280, 720);
  sim.startNewGame();

  sim.step(-0.25);
  sim.step(Number.NaN);
  sim.step(Number.POSITIVE_INFINITY);
  sim.step(4.5);
  sim.step(1 / 60);

  assert.ok(state.hud !== null);
  assert.ok(Number.isFinite(state.hud.elapsedSec) && state.hud.elapsedSec >= 0);
  assert.ok(Number.isFinite(state.hud.score));
  assert.ok(Number.isFinite(state.hud.invasionIntensity) && state.hud.invasionIntensity >= 0);
});
