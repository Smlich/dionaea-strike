import { useCallback, useEffect, useRef, useState } from 'react';
import { SkipForward, Volume2, VolumeX } from 'lucide-react';
import {
  createIntroTransitionController,
  type IntroTransitionController,
  type IntroTransitionPhase,
} from '../game/introTransition';

export const CREATOR_INTRO_VIDEO_PATH = 'assets/video/intro.webm';

interface CreatorIntroOverlayProps {
  assetBasePath?: string;
  initialMuted?: boolean;
  volume?: number;
  exitRequested?: boolean;
  onTransitionStart?: () => void;
  onRevealTitle?: () => void;
  onComplete: () => void;
}

function resolveIntroUrl(basePath: string | undefined, path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  const relative = path.replace(/^\/+/, '');
  const trimmed = basePath ? basePath.replace(/\/+$/, '') : '';
  if (!trimmed || trimmed === '/' || trimmed === '.') return `./${relative}`;
  return `${trimmed}/${relative}`;
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function CreatorIntroOverlay({
  assetBasePath = '.',
  initialMuted = false,
  volume = 0.8,
  exitRequested = false,
  onTransitionStart,
  onRevealTitle,
  onComplete,
}: CreatorIntroOverlayProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controllerRef = useRef<IntroTransitionController | null>(null);
  const callbacksRef = useRef({ onTransitionStart, onRevealTitle, onComplete });
  callbacksRef.current = { onTransitionStart, onRevealTitle, onComplete };

  const [isMuted, setIsMuted] = useState(initialMuted);
  const [phase, setPhase] = useState<IntroTransitionPhase>('playing');
  const [progress, setProgress] = useState(0);
  const [needsGestureToPlay, setNeedsGestureToPlay] = useState(false);

  const getController = useCallback((): IntroTransitionController => {
    if (!controllerRef.current) {
      controllerRef.current = createIntroTransitionController({
        onPhaseChange: (nextPhase) => {
          setPhase(nextPhase);
          if (nextPhase === 'revealing' || nextPhase === 'fade') {
            const video = videoRef.current;
            if (video) {
              video.muted = true;
              video.pause();
            }
          }
        },
        onTransitionStart: () => {
          callbacksRef.current.onTransitionStart?.();
        },
        onRevealTitle: () => {
          callbacksRef.current.onRevealTitle?.();
        },
        onComplete: () => {
          callbacksRef.current.onComplete();
        },
      });
    }
    return controllerRef.current;
  }, []);

  const finishIntro = useCallback(() => {
    getController().start(prefersReducedMotion());
  }, [getController]);

  useEffect(() => {
    if (exitRequested) {
      finishIntro();
    }
  }, [exitRequested, finishIntro]);

  useEffect(() => {
    return () => {
      controllerRef.current?.cancel();
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.volume = Math.max(0, Math.min(1, volume));
    video.muted = initialMuted;

    let cancelled = false;
    const attemptPlay = async () => {
      try {
        await video.play();
        if (!cancelled) {
          setIsMuted(video.muted);
          setNeedsGestureToPlay(false);
        }
      } catch {
        // Autoplay with audio blocked by browser policy -> fallback cleanly to muted autoplay
        try {
          video.muted = true;
          await video.play();
          if (!cancelled) {
            setIsMuted(true);
            setNeedsGestureToPlay(false);
          }
        } catch {
          if (!cancelled) {
            setNeedsGestureToPlay(true);
          }
        }
      }
    };

    void attemptPlay();

    return () => {
      cancelled = true;
      video.pause();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || phase !== 'playing') return;
    video.volume = Math.max(0, Math.min(1, volume));
    video.muted = initialMuted;
    setIsMuted(initialMuted);
  }, [initialMuted, volume, phase]);

  const handleToggleSound = useCallback(() => {
    const video = videoRef.current;
    if (!video || phase !== 'playing') return;
    const nextMuted = !isMuted;
    video.muted = nextMuted;
    video.volume = Math.max(0.15, Math.min(1, volume));
    setIsMuted(nextMuted);
    if (video.paused) {
      video.play().catch(() => {});
    }
  }, [isMuted, phase, volume]);

  const handleManualPlay = useCallback(() => {
    const video = videoRef.current;
    if (!video || phase !== 'playing') return;
    video.muted = false;
    video.volume = Math.max(0.2, Math.min(1, volume));
    video
      .play()
      .then(() => {
        setIsMuted(false);
        setNeedsGestureToPlay(false);
      })
      .catch(() => {
        finishIntro();
      });
  }, [finishIntro, phase, volume]);

  const videoSrc = resolveIntroUrl(assetBasePath, CREATOR_INTRO_VIDEO_PATH);
  const isTransitioning = phase !== 'playing';
  const showCurtain = phase === 'covering' || phase === 'revealing';
  const showVideoBackdrop = phase === 'playing' || phase === 'covering' || phase === 'fade';

  return (
    <div
      data-testid="creator-intro-overlay"
      data-transition-phase={phase}
      className={`fixed inset-0 z-50 overflow-hidden ${
        isTransitioning ? 'pointer-events-none' : ''
      }`}
    >
      {/* Intro video stage (cleanly hidden behind the opaque curtain at midpoint) */}
      {showVideoBackdrop && (
        <div
          className={`absolute inset-0 bg-[#04070E] flex items-center justify-center overflow-hidden transition-opacity duration-[180ms] ease-out ${
            phase === 'fade' ? 'opacity-0' : 'opacity-100'
          }`}
        >
          <video
            ref={videoRef}
            data-testid="creator-intro-video"
            src={videoSrc}
            playsInline
            autoPlay
            preload="auto"
            onTimeUpdate={(e) => {
              const el = e.currentTarget;
              if (el.duration && Number.isFinite(el.duration) && el.duration > 0) {
                setProgress(Math.max(0, Math.min(1, el.currentTime / el.duration)));
              }
            }}
            onEnded={finishIntro}
            onError={finishIntro}
            className={`w-full h-full object-contain bg-[#04070E] transition-all duration-300 ease-out ${
              phase === 'covering' ? 'scale-[1.05] brightness-75' : 'scale-100 brightness-100'
            }`}
          />

          {needsGestureToPlay && !isTransitioning && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#04070E]/75">
              <button
                type="button"
                onClick={handleManualPlay}
                className="touch-manipulation px-6 py-3 rounded-xl bg-[#E11D48] hover:bg-[#BE123C] text-white font-display font-black text-sm sm:text-base border-2 border-[#050810] shadow-[0_4px_0_#050810] cursor-pointer"
              >
                Reproducir Intro
              </button>
            </div>
          )}

          {/* Subtle bottom progress hairline */}
          <div
            aria-hidden="true"
            className={`fixed bottom-0 left-0 right-0 h-1 bg-slate-900/80 pointer-events-none transition-opacity duration-150 ${
              isTransitioning ? 'opacity-0' : 'opacity-100'
            }`}
          >
            <div
              className="h-full w-full origin-left bg-amber-400/90 transition-transform duration-100 linear"
              style={{ transform: `scaleX(${progress})` }}
            />
          </div>

          {/* Bottom-right intro controls (Safe area aware) */}
          <div
            className={`fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-[max(1rem,env(safe-area-inset-right))] sm:bottom-6 sm:right-6 z-20 flex items-center gap-2 transition-opacity duration-150 ${
              isTransitioning ? 'opacity-0 pointer-events-none' : 'opacity-100'
            }`}
          >
            <button
              type="button"
              onClick={handleToggleSound}
              aria-label={isMuted ? 'Activar sonido de la intro' : 'Silenciar intro'}
              className="touch-manipulation inline-flex items-center gap-1.5 min-h-[40px] px-3.5 py-2 rounded-xl bg-[#0B1422]/90 hover:bg-[#162338] text-slate-100 text-xs font-semibold border border-slate-700/80 shadow-[0_3px_0_#050810] cursor-pointer whitespace-nowrap"
            >
              {isMuted ? (
                <>
                  <VolumeX className="w-4 h-4 text-amber-400" />
                  <span>Activar sonido</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-4 h-4 text-emerald-400" />
                  <span>Sonido On</span>
                </>
              )}
            </button>

            <button
              type="button"
              data-testid="skip-intro-btn"
              onClick={finishIntro}
              aria-label="Saltar video de introducción"
              className="touch-manipulation inline-flex items-center gap-1.5 min-h-[40px] px-4 py-2 rounded-xl bg-[#0B1422]/92 hover:bg-[#1E293B] text-white text-xs sm:text-sm font-display font-bold border border-slate-600/90 shadow-[0_3px_0_#050810] cursor-pointer whitespace-nowrap"
            >
              <span>Saltar intro</span>
              <SkipForward className="w-4 h-4 text-sky-400" />
            </button>
          </div>
        </div>
      )}

      {/* Sweeping Argentine cel-shaded diagonal transition curtain (two-stage so it never uncovers the video early) */}
      {showCurtain && (
        <>
          <div
            aria-hidden="true"
            data-testid="intro-transition-curtain"
            className={`pointer-events-none fixed inset-y-0 -left-[40%] w-[180%] z-30 flex overflow-hidden shadow-[0_0_60px_rgba(5,8,16,0.9)] ${
              phase === 'revealing' ? 'animate-intro-curtain-out' : 'animate-intro-curtain-in'
            }`}
          >
            {/* Trailing edge (left) unveiling the Title Screen */}
            <div className="h-full w-2.5 sm:w-3.5 bg-[#050810] shrink-0" />
            <div className="h-full w-5 sm:w-9 bg-gradient-to-b from-[#7DD3FC] via-[#38BDF8] to-[#0284C7] shrink-0" />
            <div className="h-full w-3 sm:w-5 bg-[#F8FAFC] shrink-0" />
            <div className="h-full w-4 sm:w-7 bg-gradient-to-b from-[#FEF08A] via-[#FACC15] to-[#D97706] shrink-0" />
            <div className="h-full w-2 bg-[#050810] shrink-0" />

            {/* Opaque cel-shaded night-sky body with anime speed streaks */}
            <div className="relative flex-1 h-full bg-gradient-to-r from-[#071120] via-[#0E2542] to-[#071120] overflow-hidden">
              {/* Subtle horizontal Argentine sky-gold horizon ribbon */}
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-24 sm:h-32 opacity-25 flex flex-col justify-between pointer-events-none">
                <div className="h-6 sm:h-8 w-full bg-gradient-to-r from-transparent via-[#38BDF8] to-transparent" />
                <div className="h-2.5 sm:h-3 w-full bg-gradient-to-r from-transparent via-[#FACC15] to-transparent" />
                <div className="h-6 sm:h-8 w-full bg-gradient-to-r from-transparent via-[#38BDF8] to-transparent" />
              </div>

              {/* Crisp anime speed-line streaks */}
              <div className="animate-intro-streak absolute inset-0 pointer-events-none">
                <div className="absolute top-[16%] left-[12%] w-[48%] h-[3px] bg-gradient-to-r from-transparent via-[#38BDF8]/80 to-transparent" />
                <div className="absolute top-[31%] left-[24%] w-[56%] h-[2px] bg-gradient-to-r from-transparent via-white/75 to-transparent" />
                <div className="absolute top-[49%] left-[8%] w-[68%] h-[4px] bg-gradient-to-r from-transparent via-[#FACC15]/85 to-transparent" />
                <div className="absolute top-[67%] left-[20%] w-[52%] h-[2px] bg-gradient-to-r from-transparent via-[#FB7185]/75 to-transparent" />
                <div className="absolute top-[82%] left-[14%] w-[46%] h-[3px] bg-gradient-to-r from-transparent via-[#38BDF8]/70 to-transparent" />
              </div>
            </div>

            {/* Leading edge (right) slicing across the intro video */}
            <div className="h-full w-2 bg-[#050810] shrink-0" />
            <div className="h-full w-4 sm:w-6 bg-gradient-to-b from-[#7DD3FC] via-[#38BDF8] to-[#0284C7] shrink-0" />
            <div className="h-full w-2.5 sm:w-4 bg-[#F8FAFC] shrink-0" />
            <div className="h-full w-5 sm:w-9 bg-gradient-to-b from-[#FB7185] via-[#E11D48] to-[#9F1239] shrink-0" />
            <div className="h-full w-2.5 sm:w-3.5 bg-[#050810] shrink-0" />
          </div>

          {/* Warm golden-sky radial flash bloom firing as the title screen is unveiled */}
          {phase === 'revealing' && (
            <div
              aria-hidden="true"
              data-testid="intro-transition-flash"
              className="pointer-events-none fixed inset-0 z-40 animate-intro-flash bg-[radial-gradient(circle_at_70%_48%,rgba(254,240,138,0.82),rgba(56,189,248,0.26)_42%,transparent_74%)]"
            />
          )}
        </>
      )}
    </div>
  );
}

