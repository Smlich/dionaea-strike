import { useCallback, useEffect, useRef, useState } from 'react';
import { SkipForward, Volume2, VolumeX } from 'lucide-react';

export const CREATOR_INTRO_VIDEO_PATH = 'assets/video/intro.webm';

interface CreatorIntroOverlayProps {
  assetBasePath?: string;
  initialMuted?: boolean;
  volume?: number;
  exitRequested?: boolean;
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

export function CreatorIntroOverlay({
  assetBasePath = '.',
  initialMuted = false,
  volume = 0.8,
  exitRequested = false,
  onRevealTitle,
  onComplete,
}: CreatorIntroOverlayProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const completedRef = useRef(false);
  const fadeTimerRef = useRef<number | null>(null);
  const [isMuted, setIsMuted] = useState(initialMuted);
  const [fadingOut, setFadingOut] = useState(false);
  const [progress, setProgress] = useState(0);
  const [needsGestureToPlay, setNeedsGestureToPlay] = useState(false);

  const finishIntro = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    onRevealTitle?.();
    setFadingOut(true);
    fadeTimerRef.current = window.setTimeout(() => {
      fadeTimerRef.current = null;
      onComplete();
    }, 240);
  }, [onComplete, onRevealTitle]);

  useEffect(() => {
    if (exitRequested) {
      finishIntro();
    }
  }, [exitRequested, finishIntro]);

  useEffect(() => {
    return () => {
      if (fadeTimerRef.current !== null) {
        window.clearTimeout(fadeTimerRef.current);
      }
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
    if (!video) return;
    video.volume = Math.max(0, Math.min(1, volume));
    video.muted = initialMuted;
    setIsMuted(initialMuted);
  }, [initialMuted, volume]);

  const handleToggleSound = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const nextMuted = !isMuted;
    video.muted = nextMuted;
    video.volume = Math.max(0.15, Math.min(1, volume));
    setIsMuted(nextMuted);
    if (video.paused) {
      video.play().catch(() => {});
    }
  }, [isMuted, volume]);

  const handleManualPlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
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
  }, [finishIntro, volume]);

  const videoSrc = resolveIntroUrl(assetBasePath, CREATOR_INTRO_VIDEO_PATH);

  return (
    <div
      data-testid="creator-intro-overlay"
      className={`fixed inset-0 z-50 bg-[#04070E] flex items-center justify-center overflow-hidden transition-opacity duration-[240ms] ${
        fadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
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
        className="w-full h-full object-contain bg-[#04070E]"
      />

      {needsGestureToPlay && (
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
        className="fixed bottom-0 left-0 right-0 h-1 bg-slate-900/80 pointer-events-none"
      >
        <div
          className="h-full w-full origin-left bg-amber-400/90 transition-transform duration-100 linear"
          style={{ transform: `scaleX(${progress})` }}
        />
      </div>

      {/* Bottom-right intro controls (Safe area aware) */}
      <div className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-[max(1rem,env(safe-area-inset-right))] sm:bottom-6 sm:right-6 z-20 flex items-center gap-2">
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
  );
}
