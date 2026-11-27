export type IntroTransitionMode = 'curtain' | 'fade';
export type IntroTransitionPhase = 'playing' | 'covering' | 'revealing' | 'fade' | 'complete';

export interface IntroTransitionTiming {
  mode: IntroTransitionMode;
  revealDelayMs: number;
  totalDurationMs: number;
}

export const INTRO_TRANSITION_REVEAL_MS = 320;
export const INTRO_TRANSITION_TOTAL_MS = 880;
export const INTRO_REDUCED_MOTION_MS = 180;

export function getIntroTransitionTiming(prefersReducedMotion: boolean): IntroTransitionTiming {
  if (prefersReducedMotion) {
    return {
      mode: 'fade',
      revealDelayMs: 0,
      totalDurationMs: INTRO_REDUCED_MOTION_MS,
    };
  }
  return {
    mode: 'curtain',
    revealDelayMs: INTRO_TRANSITION_REVEAL_MS,
    totalDurationMs: INTRO_TRANSITION_TOTAL_MS,
  };
}

export interface IntroTransitionScheduler {
  setTimeout: (fn: () => void, ms: number) => number;
  clearTimeout: (id: number) => void;
}

export interface IntroTransitionCallbacks {
  onPhaseChange: (phase: IntroTransitionPhase) => void;
  onTransitionStart?: () => void;
  onRevealTitle?: () => void;
  onComplete: () => void;
}

export interface IntroTransitionController {
  start: (prefersReducedMotion: boolean) => boolean;
  cancel: () => void;
  isStarted: () => boolean;
}

/**
 * Coordinates the one-shot intro-to-title transition timeline so both natural
 * video end (`onEnded`) and manual skip (`Saltar intro` / keyboard / gamepad)
 * execute the exact same non-reentrant sequence and cleanly cancel pending
 * timers on unmount.
 */
export function createIntroTransitionController(
  callbacks: IntroTransitionCallbacks,
  scheduler: IntroTransitionScheduler = {
    setTimeout: (fn, ms) => window.setTimeout(fn, ms),
    clearTimeout: (id) => window.clearTimeout(id),
  }
): IntroTransitionController {
  let started = false;
  let revealTimerId: number | null = null;
  let completeTimerId: number | null = null;

  const clearTimers = () => {
    if (revealTimerId !== null) {
      scheduler.clearTimeout(revealTimerId);
      revealTimerId = null;
    }
    if (completeTimerId !== null) {
      scheduler.clearTimeout(completeTimerId);
      completeTimerId = null;
    }
  };

  return {
    start(prefersReducedMotion: boolean): boolean {
      if (started) return false;
      started = true;

      const timing = getIntroTransitionTiming(prefersReducedMotion);
      callbacks.onTransitionStart?.();

      if (timing.mode === 'fade') {
        callbacks.onPhaseChange('fade');
        callbacks.onRevealTitle?.();
        completeTimerId = scheduler.setTimeout(() => {
          completeTimerId = null;
          callbacks.onPhaseChange('complete');
          callbacks.onComplete();
        }, timing.totalDurationMs);
        return true;
      }

      callbacks.onPhaseChange('covering');
      revealTimerId = scheduler.setTimeout(() => {
        revealTimerId = null;
        callbacks.onPhaseChange('revealing');
        callbacks.onRevealTitle?.();
      }, timing.revealDelayMs);

      completeTimerId = scheduler.setTimeout(() => {
        completeTimerId = null;
        callbacks.onPhaseChange('complete');
        callbacks.onComplete();
      }, timing.totalDurationMs);

      return true;
    },

    cancel() {
      clearTimers();
    },

    isStarted() {
      return started;
    },
  };
}
