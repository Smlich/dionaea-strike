import test from 'node:test';
import assert from 'node:assert/strict';
import {
  INTRO_REDUCED_MOTION_MS,
  INTRO_TRANSITION_REVEAL_MS,
  INTRO_TRANSITION_TOTAL_MS,
  createIntroTransitionController,
  getIntroTransitionTiming,
  type IntroTransitionPhase,
} from './introTransition';

function createFakeScheduler() {
  let nextId = 1;
  let now = 0;
  const tasks = new Map<number, { at: number; fn: () => void }>();

  return {
    scheduler: {
      setTimeout(fn: () => void, ms: number): number {
        const id = nextId++;
        tasks.set(id, { at: now + ms, fn });
        return id;
      },
      clearTimeout(id: number): void {
        tasks.delete(id);
      },
    },
    advance(ms: number) {
      const target = now + ms;
      while (true) {
        let earliestId: number | null = null;
        let earliestAt = Infinity;
        for (const [id, task] of tasks.entries()) {
          if (task.at <= target && task.at < earliestAt) {
            earliestAt = task.at;
            earliestId = id;
          }
        }
        if (earliestId === null) break;
        const task = tasks.get(earliestId)!;
        tasks.delete(earliestId);
        now = task.at;
        task.fn();
      }
      now = target;
    },
    pendingCount() {
      return tasks.size;
    },
  };
}

test('getIntroTransitionTiming returns full curtain timeline by default and crisp fade for reduced motion', () => {
  assert.deepEqual(getIntroTransitionTiming(false), {
    mode: 'curtain',
    revealDelayMs: INTRO_TRANSITION_REVEAL_MS,
    totalDurationMs: INTRO_TRANSITION_TOTAL_MS,
  });
  assert.deepEqual(getIntroTransitionTiming(true), {
    mode: 'fade',
    revealDelayMs: 0,
    totalDurationMs: INTRO_REDUCED_MOTION_MS,
  });
});

test('curtain transition covers first, reveals title at midpoint, and completes without duplicate triggers', () => {
  const fake = createFakeScheduler();
  const events: string[] = [];
  const phases: IntroTransitionPhase[] = [];

  const controller = createIntroTransitionController(
    {
      onPhaseChange: (phase) => {
        phases.push(phase);
        events.push(`phase:${phase}`);
      },
      onTransitionStart: () => events.push('start'),
      onRevealTitle: () => events.push('reveal'),
      onComplete: () => events.push('complete'),
    },
    fake.scheduler
  );

  assert.equal(controller.start(false), true);
  // Second trigger (e.g. skip click right as video ends) must be ignored
  assert.equal(controller.start(false), false);
  assert.equal(controller.isStarted(), true);

  assert.deepEqual(events, ['start', 'phase:covering']);

  // Just before reveal midpoint, title is not revealed yet
  fake.advance(INTRO_TRANSITION_REVEAL_MS - 1);
  assert.equal(events.includes('reveal'), false);

  // At midpoint, curtain covers viewport and title reveals underneath
  fake.advance(1);
  assert.deepEqual(events, ['start', 'phase:covering', 'phase:revealing', 'reveal']);

  // Just before total duration, overlay is still finishing sweep-out
  fake.advance(INTRO_TRANSITION_TOTAL_MS - INTRO_TRANSITION_REVEAL_MS - 1);
  assert.equal(events.includes('complete'), false);

  // At total duration, transition completes cleanly
  fake.advance(1);
  assert.deepEqual(events, [
    'start',
    'phase:covering',
    'phase:revealing',
    'reveal',
    'phase:complete',
    'complete',
  ]);
  assert.deepEqual(phases, ['covering', 'revealing', 'complete']);
  assert.equal(fake.pendingCount(), 0);
});

test('reduced motion transition reveals title immediately and completes after short fade', () => {
  const fake = createFakeScheduler();
  const events: string[] = [];

  const controller = createIntroTransitionController(
    {
      onPhaseChange: (phase) => events.push(`phase:${phase}`),
      onTransitionStart: () => events.push('start'),
      onRevealTitle: () => events.push('reveal'),
      onComplete: () => events.push('complete'),
    },
    fake.scheduler
  );

  assert.equal(controller.start(true), true);
  assert.deepEqual(events, ['start', 'phase:fade', 'reveal']);

  fake.advance(INTRO_REDUCED_MOTION_MS);
  assert.deepEqual(events, ['start', 'phase:fade', 'reveal', 'phase:complete', 'complete']);
  assert.equal(fake.pendingCount(), 0);
});

test('cancel clears all pending transition timers cleanly on unmount', () => {
  const fake = createFakeScheduler();
  let revealCount = 0;
  let completeCount = 0;

  const controller = createIntroTransitionController(
    {
      onPhaseChange: () => {},
      onRevealTitle: () => {
        revealCount++;
      },
      onComplete: () => {
        completeCount++;
      },
    },
    fake.scheduler
  );

  controller.start(false);
  assert.equal(fake.pendingCount(), 2);

  controller.cancel();
  assert.equal(fake.pendingCount(), 0);

  fake.advance(2000);
  assert.equal(revealCount, 0);
  assert.equal(completeCount, 0);
});
