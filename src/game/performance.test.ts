import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { DEFAULT_GAME_CONFIG } from './gameConfig';
import type { HudSnapshot } from './types';

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

function createGradientTrackingCtx() {
  let linearGradientCalls = 0;
  let radialGradientCalls = 0;
  let saveDepth = 0;

  const dummyGrad = {
    addColorStop: () => {},
  };

  const target: Record<string, unknown> = {
    save: () => {
      saveDepth++;
    },
    restore: () => {
      saveDepth--;
      assert.ok(saveDepth >= 0, 'restore() called more times than save()');
    },
    createLinearGradient: () => {
      linearGradientCalls++;
      return dummyGrad;
    },
    createRadialGradient: () => {
      radialGradientCalls++;
      return dummyGrad;
    },
    measureText: (text: string) => ({ width: String(text).length * 7 }),
    setLineDash: () => {},
    getLineDash: () => [],
  };

  const proxy = new Proxy(target, {
    get(obj, prop) {
      if (prop in obj) return obj[prop as string];
      if (typeof prop === 'string') return () => {};
      return undefined;
    },
    set(obj, prop, val) {
      obj[prop as string] = val;
      return true;
    },
  });

  return {
    ctx: proxy as unknown as CanvasRenderingContext2D,
    getCounts: () => ({ linearGradientCalls, radialGradientCalls, saveDepth }),
  };
}

test('standard enemy swarm kills do not trigger hitstop micro-freezes or per-kill HUD spam', async () => {
  const { GameSimulation } = await import('./simulation');
  let hudEmits = 0;
  let lastHud: HudSnapshot | null = null;
  const sim = new GameSimulation(
    DEFAULT_GAME_CONFIG,
    (snap) => {
      hudEmits++;
      lastHud = snap;
    },
    () => {}
  );
  sim.resize(1280, 720);
  sim.startNewGame();
  hudEmits = 0;

  const simAny = sim as unknown as {
    enemies: Array<{
      id: number;
      archetype: 'drone' | 'tank';
      x: number;
      y: number;
      vx: number;
      vy: number;
      hp: number;
      maxHp: number;
      radius: number;
      age: number;
      dying: boolean;
      koTimer: number;
      hitFlashTimer: number;
      windupTimer: number;
      fireCooldown: number;
      slowFactor: number;
      slowTimer: number;
      rootedTimer: number;
      mucilageHits: number;
      acidTimer: number;
      acidDps: number;
      shieldActive: boolean;
      charmed: boolean;
      charmProgress: number;
      charmTimer: number;
      phaseOffset: number;
    }>;
    hitstopTimer: number;
  };

  // Seed 4 regular drone enemies with 0 hp to be processed on the very next frame
  simAny.enemies = Array.from({ length: 4 }, (_, idx) => ({
    id: 100 + idx,
    archetype: 'drone',
    x: 600 + idx * 30,
    y: 300,
    vx: -100,
    vy: 0,
    hp: 0,
    maxHp: 20,
    radius: 16,
    age: 0.5,
    dying: false,
    koTimer: 0,
    hitFlashTimer: 0,
    windupTimer: 0,
    fireCooldown: 2,
    slowFactor: 0,
    slowTimer: 0,
    rootedTimer: 0,
    mucilageHits: 0,
    acidTimer: 0,
    acidDps: 0,
    shieldActive: false,
    charmed: false,
    charmProgress: 0,
    charmTimer: 0,
    phaseOffset: idx,
  }));

  sim.step(1 / 60);
  assert.equal(simAny.hitstopTimer, 0, 'Standard swarm kills must not freeze the simulation');
  assert.equal(hudEmits, 0, 'Non-milestone combo kills should wait for throttled HUD flush');

  // After 0.12s total, HUD flushes once cleanly with updated score and combo
  for (let i = 0; i < 7; i++) {
    sim.step(1 / 60);
  }
  assert.equal(hudEmits, 1, 'HUD should flush at ~10 Hz cadence');
  assert.ok(lastHud !== null && (lastHud as HudSnapshot).combo >= 4);
});

test('renderer caches iridescent wing and damage vignette gradients across frames', async () => {
  const { GameSimulation } = await import('./simulation');
  const sim = new GameSimulation(DEFAULT_GAME_CONFIG, () => {}, () => {});
  sim.resize(1280, 720);
  sim.startNewGame();

  // Advance enough frames so multiple flying enemies are active on screen
  for (let i = 0; i < 180; i++) {
    sim.step(1 / 60);
  }

  const { ctx, getCounts } = createGradientTrackingCtx();
  sim.render(ctx);
  const afterFirst = getCounts();
  assert.equal(afterFirst.saveDepth, 0);

  // Render 10 more combat frames on the same context
  const baseLinear = afterFirst.linearGradientCalls;
  for (let i = 0; i < 10; i++) {
    sim.step(1 / 60);
    sim.render(ctx);
  }
  const afterTen = getCounts();
  assert.equal(afterTen.saveDepth, 0);
  // Only fallback procedural sky/terrain gradients (when DOM Image isn't loaded in Node) may run;
  // wing gradients per enemy must NOT add 20+ linear gradients per frame.
  const linearPerFrame = (afterTen.linearGradientCalls - baseLinear) / 10;
  assert.ok(
    linearPerFrame <= 4,
    `Expected <= 4 linearGradient calls/frame in Node fallback (wings cached), got ${linearPerFrame}`
  );
});

test('120 frames of active gameplay simulation execute well within 60fps CPU budget', async () => {
  const { GameSimulation } = await import('./simulation');
  const sim = new GameSimulation(DEFAULT_GAME_CONFIG, () => {}, () => {});
  sim.resize(1280, 720);
  sim.startNewGame();
  sim.handleKeyDown('Space');

  const t0 = performance.now();
  for (let i = 0; i < 120; i++) {
    sim.step(1 / 60);
  }
  const elapsedMs = performance.now() - t0;
  const avgStepMs = elapsedMs / 120;
  assert.ok(avgStepMs < 4, `Expected average sim.step() < 4ms, got ${avgStepMs.toFixed(3)}ms`);
});
