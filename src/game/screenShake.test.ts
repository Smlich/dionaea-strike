import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addScreenShakeTrauma,
  createScreenShakeState,
  resetScreenShakeState,
  sampleScreenShake,
  stepScreenShake,
  triggerBossHitShake,
  triggerPlayerDamageShake,
} from './screenShake';

test('player damage triggers strong trauma, directional recoil punch, and crimson impact flash', () => {
  const state = createScreenShakeState();
  const idle = sampleScreenShake(state, 1.0, false);
  assert.equal(idle.offsetX, 0);
  assert.equal(idle.offsetY, 0);
  assert.equal(idle.angleRad, 0);
  assert.equal(idle.overscanScale, 1);
  assert.equal(idle.damageFlashAlpha, 0);

  triggerPlayerDamageShake(state, -1, 0.2, false);
  assert.ok(state.trauma >= 0.75, 'Normal player hit delivers heavy trauma');
  assert.ok(state.punchX < -5, 'Directional kick recoils away from incoming hit');
  assert.ok(state.damageFlashTimer > 0.2, 'Player damage activates edge impact flash');

  const active = sampleScreenShake(state, 1.23, false);
  assert.ok(Math.hypot(active.offsetX, active.offsetY) > 4, 'Active shake displaces viewport clearly');
  assert.ok(active.overscanScale > 1, 'Overscan scale prevents border seams during shake');
  assert.ok(active.damageFlashAlpha > 0.9);

  // Fatal damage hits maximum trauma
  triggerPlayerDamageShake(state, -1, 0, true);
  assert.equal(state.trauma, 1);
});

test('boss hits scale shake intensity cleanly across shielded, primary, and heavy/secondary attacks', () => {
  const shieldedState = createScreenShakeState();
  triggerBossHitShake(shieldedState, { damage: 12, shielded: true });

  const primaryState = createScreenShakeState();
  triggerBossHitShake(primaryState, { damage: 18, isSecondary: false, impactDirX: 1, impactDirY: 0 });

  const heavyState = createScreenShakeState();
  triggerBossHitShake(heavyState, { damage: 72, isSecondary: true, heavy: true, impactDirX: 1, impactDirY: -0.2 });

  assert.ok(shieldedState.trauma > 0 && shieldedState.trauma < primaryState.trauma);
  assert.ok(primaryState.trauma < heavyState.trauma);
  assert.ok(heavyState.punchX > primaryState.punchX);

  // Rapid primary hits cap cleanly below heavy/player-damage peaks so aiming remains crisp
  for (let i = 0; i < 12; i++) {
    triggerBossHitShake(primaryState, { damage: 16, isSecondary: false });
  }
  assert.ok(primaryState.trauma <= 0.56, 'Sustained primary boss hits stay within soft rumble cap');
});

test('screen shake decays smoothly to exact rest and respects prefers-reduced-motion', () => {
  const state = createScreenShakeState();
  triggerPlayerDamageShake(state, -1, 0, false);

  const fullSample = sampleScreenShake(state, 2.5, false);
  const reducedSample = sampleScreenShake(state, 2.5, true);
  assert.equal(reducedSample.angleRad, 0, 'Reduced motion disables rotational roll');
  assert.ok(
    Math.hypot(reducedSample.offsetX, reducedSample.offsetY) <
      Math.hypot(fullSample.offsetX, fullSample.offsetY),
    'Reduced motion scales down displacement magnitude'
  );

  // Advance 1.2 seconds -> trauma, punch, and flash settle back to exact 0
  for (let i = 0; i < 60; i++) {
    stepScreenShake(state, 0.02);
  }
  assert.equal(state.trauma, 0);
  assert.equal(state.punchX, 0);
  assert.equal(state.punchY, 0);
  assert.equal(state.damageFlashTimer, 0);

  addScreenShakeTrauma(state, 0.4);
  assert.ok(state.trauma > 0);
  resetScreenShakeState(state);
  assert.equal(state.trauma, 0);
});
