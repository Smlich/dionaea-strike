import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  Check,
  Gamepad2,
  Lock,
  Maximize2,
  Music,
  Settings2,
  Shield,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
  Trophy,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';
import { soundEngine } from '../game/audio';
import { preloadStageBackgrounds } from '../game/backgroundAssets';
import {
  computeGamepadEdges,
  computeLogicalViewport,
  computeRelativeTouchTarget,
  getControlPrompts,
  parseGamepadInput,
  SECONDARY_ABILITY_META,
  shouldRequireLandscape,
  type GamepadMappedInput,
} from '../game/fusionRules';
import {
  ALL_SPECIES_IDS,
  DEFAULT_GAME_CONFIG,
  PET_CATALOG,
  loadGameConfig,
  loadHighScore,
  loadSelectedPet,
  loadUnlockedPets,
  loadUnlockedSpecies,
  sanitizeGameConfig,
  saveGameConfig,
} from '../game/gameConfig';
import {
  GLOBAL_HIGHSCORE_STORAGE_KEY,
  LEGACY_HIGHSCORE_STORAGE_KEY,
  loadGlobalHighScoreState,
  resetGlobalHighScoreState,
} from '../game/highScoreStore';
import { GameSimulation } from '../game/simulation';
import type { GameConfig, GameStatus, GlobalHighScoreState, HudSnapshot, PetId } from '../game/types';
import { AdminConfigModal } from './AdminConfigModal';
import { CreatorIntroOverlay } from './CreatorIntroOverlay';
import { GameHud } from './GameHud';
import { HighScoreModal } from './HighScoreModal';
import { PetEmblem, SpeciesEmblem, TitleLogoLockup } from './SpeciesIcons';
import titleHeroBg from '../assets/images/hero_title_dionaea_biplane_1795699672875.jpg';

export interface GameSessionResult {
  score: number;
  highScore: number;
  maxCombo: number;
  levelReached: number;
  victory: boolean;
  elapsedSec: number;
  enemiesDefeated: number;
  damageTaken: number;
  petId: PetId;
}

export interface CarnivoraShmupGameProps {
  /** Controla si el usuario actual tiene cuenta de administrador. Por defecto false para clientes. */
  isAdmin?: boolean;
  /** Configuración inicial opcional provista desde MongoDB/Express en tu web MERN. */
  initialConfig?: GameConfig;
  /** Callback opcional cuando el administrador guarda nuevos parámetros (ideal para PUT /api/game/config). */
  onConfigChange?: (config: GameConfig) => void;
  /** Callback opcional que se dispara al finalizar una partida (ideal para POST /api/game/scores en MongoDB). */
  onScoreSubmit?: (result: GameSessionResult) => void;
  /** Ruta base opcional si montás el juego bajo un subpath en tu web MERN (ej: '/juego/'). Por defecto '/'. */
  assetBasePath?: string;
}

function createInitialHud(cfg: GameConfig): HudSnapshot {
  const firstBoss = cfg.bosses[0];
  const best = loadHighScore();
  return {
    hp: cfg.player.maxHp,
    maxHp: cfg.player.maxHp,
    score: 0,
    highScore: best,
    previousHighScore: best,
    isNewHighScore: false,
    combo: 0,
    maxCombo: 0,
    comboMultiplier: 1,
    comboRank: 'C',
    comboTimerRatio: 0,
    comboMilestone: null,
    levelIndex: 1,
    waveInLevel: 1,
    wavesInLevel: cfg.waves.filter((w) => w.level === 1).length || 3,
    waveTitle: cfg.waves[0]?.title ?? '',
    landscape: cfg.waves[0]?.landscape ?? 'pampa_dawn',
    speciesLevels: {
      dionaea: 1,
      drosera: 0,
      nepenthes: 0,
      utricularia: 0,
      sarracenia: 0,
      pinguicula: 0,
      heliamphora: 0,
      cephalotus: 0,
    },
    activeSlotsCount: 1,
    maxSlots: 2,
    secretEvolution: null,
    primarySpecies: 'dionaea',
    secondarySpecies: 'dionaea',
    secondaryName: SECONDARY_ABILITY_META.dionaea.name,
    secondaryCharge: 1,
    secondaryCooldownSec: SECONDARY_ABILITY_META.dionaea.cooldownSec,
    canSwapAbilities: false,
    invasionIntensity: 0,
    invasionAlertLabel: null,
    gamepadConnected: false,
    unlockedSpecies: loadUnlockedSpecies(),
    petId: loadSelectedPet(),
    unlockedPets: loadUnlockedPets(),
    specialCharge: 1,
    frogReady: 1,
    frogActive: cfg.player.frogAlly.enabled,
    mafiaActive: false,
    mafiaRemainingSec: 0,
    activeSpecialLabel: null,
    activeSpecialRemainingSec: 0,
    bossActive: false,
    isMiniBoss: false,
    bossName: firstBoss.name,
    bossSubtitle: firstBoss.subtitle,
    bossHp: firstBoss.maxHp,
    bossMaxHp: firstBoss.maxHp,
    bossPhase: 1,
    banner: null,
    clearedLevelSummary: null,
    enemiesDefeated: 0,
    damageTaken: 0,
    elapsedSec: 0,
  };
}

function getInitialStatus(): GameStatus {
  if (typeof window === 'undefined') return 'title';
  const params = new URLSearchParams(window.location.search);
  if (params.get('autostart') === '1' || params.get('skipIntro') === '1') {
    return 'title';
  }
  return 'intro';
}

export function CarnivoraShmupGame({
  isAdmin = false,
  initialConfig,
  onConfigChange,
  onScoreSubmit,
  assetBasePath = '/',
}: CarnivoraShmupGameProps) {
  const [config, setConfig] = useState<GameConfig>(() => initialConfig ?? loadGameConfig());
  const [status, setStatus] = useState<GameStatus>(() => getInitialStatus());
  const [introOverlayMounted, setIntroOverlayMounted] = useState<boolean>(() => getInitialStatus() === 'intro');
  const [introExitRequested, setIntroExitRequested] = useState<boolean>(false);
  const [titleRevealFromIntro, setTitleRevealFromIntro] = useState<boolean>(false);
  const [hud, setHud] = useState<HudSnapshot>(() => createInitialHud(config));
  const [globalRecords, setGlobalRecords] = useState<GlobalHighScoreState>(() => loadGlobalHighScoreState());
  const [showRecordsModal, setShowRecordsModal] = useState(false);
  const [muted, setMuted] = useState(false);
  const [musicVolume, setMusicVolume] = useState<number>(() => soundEngine.getMusicVolume());
  const [sfxVolume, setSfxVolume] = useState<number>(() => soundEngine.getSfxVolume());
  const [showAudioPopover, setShowAudioPopover] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [bgFailed, setBgFailed] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const coarse = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
    return coarse || (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0);
  });
  const [requiresLandscape, setRequiresLandscape] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const coarse = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
    const touch = coarse || (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0);
    return shouldRequireLandscape(window.innerWidth, window.innerHeight, touch);
  });
  const [isFullscreen, setIsFullscreen] = useState<boolean>(() =>
    typeof document !== 'undefined' ? Boolean(document.fullscreenElement) : false
  );
  const [orientationHint, setOrientationHint] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const simRef = useRef<GameSimulation | null>(null);
  const worldScaleRef = useRef<number>(1);
  const statusRef = useRef<GameStatus>(status);
  const hudRef = useRef<HudSnapshot>(hud);
  const showAdminRef = useRef<boolean>(false);
  const showRecordsRef = useRef<boolean>(false);
  const onScoreSubmitRef = useRef(onScoreSubmit);
  const submittedRunRef = useRef<boolean>(false);
  const touchMoveRef = useRef<{
    pointerId: number;
    anchorPlayerX: number;
    anchorPlayerY: number;
    anchorPointerX: number;
    anchorPointerY: number;
  } | null>(null);

  type FullscreenDocEl = HTMLElement & {
    webkitRequestFullscreen?: () => Promise<void> | void;
  };
  const docEl = typeof document !== 'undefined' ? (document.documentElement as FullscreenDocEl) : null;
  const canFullscreen = Boolean(docEl && (docEl.requestFullscreen || docEl.webkitRequestFullscreen));
  const canOrientationLock =
    typeof screen !== 'undefined' &&
    Boolean(screen.orientation && 'lock' in screen.orientation);

  statusRef.current = status;
  hudRef.current = hud;
  showAdminRef.current = isAdmin && showAdmin;
  showRecordsRef.current = showRecordsModal;
  onScoreSubmitRef.current = onScoreSubmit;

  useEffect(() => {
    if (!initialConfig) return;
    const clean = sanitizeGameConfig(initialConfig);
    setConfig(clean);
    simRef.current?.setConfig(clean);
  }, [initialConfig]);

  useEffect(() => {
    soundEngine.setAssetBasePath(assetBasePath);
  }, [assetBasePath]);

  useEffect(() => {
    const bodyState = status === 'victory' ? 'gameover' : status;
    document.body.dataset.state = bodyState;

    if (status === 'playing') {
      submittedRunRef.current = false;
    } else if (status === 'title' || status === 'paused' || status === 'level_clear') {
      setGlobalRecords(loadGlobalHighScoreState());
    } else if ((status === 'gameover' || status === 'victory') && !submittedRunRef.current) {
      submittedRunRef.current = true;
      setGlobalRecords(loadGlobalHighScoreState());
      const latestHud = hudRef.current;
      onScoreSubmitRef.current?.({
        score: latestHud.score,
        highScore: latestHud.highScore,
        maxCombo: latestHud.maxCombo,
        levelReached: latestHud.levelIndex,
        victory: status === 'victory',
        elapsedSec: latestHud.elapsedSec,
        enemiesDefeated: latestHud.enemiesDefeated,
        damageTaken: latestHud.damageTaken,
        petId: latestHud.petId,
      });
    }
  }, [status]);

  // Keep global high scores synchronized across multiple browser tabs in real time
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === GLOBAL_HIGHSCORE_STORAGE_KEY || e.key === LEGACY_HIGHSCORE_STORAGE_KEY || e.key === null) {
        setGlobalRecords(loadGlobalHighScoreState());
        simRef.current?.refreshHighScore();
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // If admin privileges drop, close any open admin modal immediately
  useEffect(() => {
    if (!isAdmin && showAdmin) {
      setShowAdmin(false);
    }
  }, [isAdmin, showAdmin]);

  useEffect(() => {
    soundEngine.syncMusic(status, hud.levelIndex);
    if (status === 'level_clear') {
      soundEngine.preloadGameAudio(hud.clearedLevelSummary?.nextLevel ?? hud.levelIndex);
    }
  }, [status, hud.levelIndex, hud.clearedLevelSummary?.nextLevel]);

  useEffect(() => {
    soundEngine.syncMusicTempo(status === 'playing' && hud.bossActive, hud.bossPhase);
  }, [status, hud.bossActive, hud.bossPhase]);

  const handleIntroRevealTitle = useCallback(() => {
    setTitleRevealFromIntro(true);
    setStatus((prev) => (prev === 'intro' ? 'title' : prev));
    setGlobalRecords(loadGlobalHighScoreState());
    soundEngine.unlockMusicOnGesture();
  }, []);

  const handleIntroComplete = useCallback(() => {
    setIntroOverlayMounted(false);
    setIntroExitRequested(false);
    setStatus((prev) => (prev === 'intro' ? 'title' : prev));
  }, []);

  const handleResetRecords = useCallback(() => {
    const cleared = resetGlobalHighScoreState();
    setGlobalRecords(cleared);
    simRef.current?.refreshHighScore();
    setHud((prev) => ({
      ...prev,
      highScore: 0,
      previousHighScore: 0,
      isNewHighScore: false,
    }));
  }, []);

  const handleReturnToTitle = useCallback(() => {
    simRef.current?.finalizeRunRecord(false);
    setGlobalRecords(loadGlobalHighScoreState());
    setTitleRevealFromIntro(false);
    simRef.current?.resetRunState();
    simRef.current?.setStatus('title');
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const syncOrientationGate = () => {
      const w = window.visualViewport?.width ?? window.innerWidth;
      const h = window.visualViewport?.height ?? window.innerHeight;
      const nextRequires = shouldRequireLandscape(w, h, isTouchDevice);
      setRequiresLandscape(nextRequires);
      if (!nextRequires) {
        setOrientationHint(null);
      }
    };
    const syncFullscreen = () => {
      const docWithWebkit = document as Document & { webkitFullscreenElement?: Element | null };
      setIsFullscreen(Boolean(document.fullscreenElement || docWithWebkit.webkitFullscreenElement));
      syncOrientationGate();
    };
    syncOrientationGate();
    window.addEventListener('resize', syncOrientationGate);
    window.addEventListener('orientationchange', syncOrientationGate);
    window.visualViewport?.addEventListener('resize', syncOrientationGate);
    screen.orientation?.addEventListener?.('change', syncOrientationGate);
    document.addEventListener('fullscreenchange', syncFullscreen);
    return () => {
      window.removeEventListener('resize', syncOrientationGate);
      window.removeEventListener('orientationchange', syncOrientationGate);
      window.visualViewport?.removeEventListener('resize', syncOrientationGate);
      screen.orientation?.removeEventListener?.('change', syncOrientationGate);
      document.removeEventListener('fullscreenchange', syncFullscreen);
    };
  }, [isTouchDevice]);

  useEffect(() => {
    if (requiresLandscape && statusRef.current === 'playing') {
      touchMoveRef.current = null;
      simRef.current?.clearInputs();
      simRef.current?.setStatus('paused');
    }
  }, [requiresLandscape]);

  const requestMobileLandscapeFullscreen = useCallback(
    async (showFeedback = false) => {
      if (showFeedback) {
        setOrientationHint(null);
      }
      const targetEl = (typeof document !== 'undefined'
        ? document.documentElement
        : containerRef.current) as FullscreenDocEl | null;
      const docWithWebkit = typeof document !== 'undefined'
        ? (document as Document & { webkitFullscreenElement?: Element | null })
        : null;
      const alreadyFullscreen = Boolean(docWithWebkit?.fullscreenElement || docWithWebkit?.webkitFullscreenElement);

      if (targetEl && !alreadyFullscreen) {
        try {
          if (targetEl.requestFullscreen) {
            try {
              await targetEl.requestFullscreen({ navigationUI: 'hide' } as FullscreenOptions);
            } catch {
              await targetEl.requestFullscreen();
            }
          } else if (targetEl.webkitRequestFullscreen) {
            await targetEl.webkitRequestFullscreen();
          }
        } catch {
          // Ignore fullscreen denial (e.g. iOS Safari or blocked gesture)
        }
      }

      const orientation = typeof screen !== 'undefined'
        ? (screen.orientation as ScreenOrientation & { lock?: (mode: string) => Promise<void> })
        : null;
      if (orientation?.lock) {
        try {
          await orientation.lock('landscape');
        } catch {
          try {
            await orientation.lock('landscape-primary');
          } catch {
            // Ignore orientation lock denial when unsupported or blocked by OS setting
          }
        }
      }

      if (showFeedback && typeof window !== 'undefined') {
        await new Promise((resolve) => window.setTimeout(resolve, 180));
        const w = window.visualViewport?.width ?? window.innerWidth;
        const h = window.visualViewport?.height ?? window.innerHeight;
        if (shouldRequireLandscape(w, h, isTouchDevice)) {
          setOrientationHint(
            'Tu navegador no permitió girar automáticamente. Activá "Giro automático" en tu teléfono y ponelo horizontal.'
          );
        }
      }
    },
    [isTouchDevice]
  );

  const handleToggleFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await requestMobileLandscapeFullscreen();
      }
    } catch {
      // Ignore fullscreen toggle errors
    }
  }, [requestMobileLandscapeFullscreen]);

  const handleStart = useCallback(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setIntroOverlayMounted(false);
    setIntroExitRequested(false);
    if (isTouchDevice) {
      void requestMobileLandscapeFullscreen();
    }
    touchMoveRef.current = null;
    setShowAdmin(false);
    setShowRecordsModal(false);
    simRef.current?.startNewGame();
    setGlobalRecords(loadGlobalHighScoreState());
    soundEngine.restartLevelMusic(1);
    canvasRef.current?.focus();
  }, [isTouchDevice, requestMobileLandscapeFullscreen]);

  const handleTogglePause = useCallback(() => {
    const sim = simRef.current;
    if (!sim) return;
    if (statusRef.current === 'playing') {
      sim.clearInputs();
      sim.setStatus('paused');
    } else if (statusRef.current === 'paused') {
      sim.clearInputs();
      sim.setStatus('playing');
      canvasRef.current?.focus();
    }
  }, []);

  const handleToggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      soundEngine.setMuted(next);
      return next;
    });
  }, []);

  const handleMusicVolumeChange = useCallback((nextVal: number) => {
    const clamped = Math.max(0, Math.min(1, nextVal));
    setMusicVolume(clamped);
    soundEngine.setMusicVolume(clamped);
    soundEngine.unlockMusicOnGesture();
    if (clamped > 0 && muted) {
      setMuted(false);
      soundEngine.setMuted(false);
    }
  }, [muted]);

  const handleSfxVolumeChange = useCallback((nextVal: number) => {
    const clamped = Math.max(0, Math.min(1, nextVal));
    setSfxVolume(clamped);
    soundEngine.setSfxVolume(clamped);
    if (clamped > 0 && muted) {
      setMuted(false);
      soundEngine.setMuted(false);
    }
  }, [muted]);

  const handleSaveConfig = useCallback(
    (nextCfg: GameConfig) => {
      if (!isAdmin) return;
      const saved = saveGameConfig(nextCfg);
      setConfig(saved);
      simRef.current?.setConfig(saved);
      onConfigChange?.(saved);
    },
    [isAdmin, onConfigChange]
  );

  const handleUnlocksUpdated = useCallback(() => {
    const latestSpecies = loadUnlockedSpecies();
    const latestPets = loadUnlockedPets();
    const latestPet = loadSelectedPet();
    setHud((prev) => ({
      ...prev,
      unlockedSpecies: latestSpecies,
      unlockedPets: latestPets,
      petId: latestPets.includes(latestPet) ? latestPet : 'batricio',
    }));
    simRef.current?.refreshUnlocks();
  }, []);

  const handleSelectPet = useCallback((petId: PetId) => {
    simRef.current?.setSelectedPet(petId);
  }, []);

  const handleContinueNextLevel = useCallback(() => {
    const sim = simRef.current;
    if (!sim || statusRef.current !== 'level_clear') return;
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    sim.continueToNextLevel();
    soundEngine.restartLevelMusic(hud.clearedLevelSummary?.nextLevel ?? hud.levelIndex);
    canvasRef.current?.focus();
  }, [hud.clearedLevelSummary?.nextLevel, hud.levelIndex]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    preloadStageBackgrounds();
    soundEngine.preloadGameAudio(1);

    const sim = new GameSimulation(
      config,
      (snap) => setHud(snap),
      (nextStatus) => setStatus(nextStatus)
    );
    simRef.current = sim;

    const updateSize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const vp = computeLogicalViewport(rect.width, rect.height);
      worldScaleRef.current = vp.scale;
      canvas.width = Math.round(vp.cssWidth * dpr);
      canvas.height = Math.round(vp.cssHeight * dpr);
      ctx.setTransform(dpr * vp.scale, 0, 0, dpr * vp.scale, 0, 0);
      sim.resize(vp.logicalWidth, vp.logicalHeight);
      sim.render(ctx);
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(container);
    window.addEventListener('orientationchange', updateSize);
    window.visualViewport?.addEventListener('resize', updateSize);

    const params = new URLSearchParams(window.location.search);
    const forceXbox = params.get('gamepad') === 'xbox';
    if (forceXbox) {
      sim.setGamepadState(true, 0, 0, false);
    }
    if (params.get('autostart') === '1') {
      sim.startNewGame();
    }

    let rafId = 0;
    let yieldTimer = 0;
    let disposed = false;
    let lastTime = performance.now();
    let lastDrawnStatus: GameStatus | null = null;
    let prevGamepad: GamepadMappedInput | null = null;
    let prevTitleCycleLeft = false;
    let prevTitleCycleRight = false;

    const cycleTitlePet = (dir: -1 | 1) => {
      const unlocked = loadUnlockedPets();
      if (unlocked.length <= 1) return;
      const curPet = loadSelectedPet();
      const idx = Math.max(0, unlocked.indexOf(curPet));
      const next = unlocked[(idx + dir + unlocked.length) % unlocked.length];
      sim.setSelectedPet(next);
      soundEngine.playUiSfxPreview();
    };

    const pollGamepad = () => {
      const pads = typeof navigator !== 'undefined' && navigator.getGamepads ? navigator.getGamepads() : [];
      let activePad: Gamepad | null = null;
      for (let i = 0; i < pads.length; i++) {
        if (pads[i] && pads[i]!.connected) {
          activePad = pads[i];
          break;
        }
      }
      if (!activePad) {
        if (prevGamepad !== null && !forceXbox) {
          sim.setGamepadState(false, 0, 0, false);
        } else if (forceXbox) {
          sim.setGamepadState(true, 0, 0, false);
        }
        prevGamepad = null;
        prevTitleCycleLeft = false;
        prevTitleCycleRight = false;
        return;
      }

      const rawButtons = activePad.buttons.map((b) => ({ pressed: b.pressed, value: b.value }));
      const mapped = parseGamepadInput(activePad.axes, rawButtons);
      const edges = computeGamepadEdges(prevGamepad, mapped);
      prevGamepad = mapped;

      const lbOrLeft = Boolean(rawButtons[4]?.pressed || rawButtons[14]?.pressed);
      const rbOrRight = Boolean(rawButtons[5]?.pressed || rawButtons[15]?.pressed);
      const cycleLeftEdge = lbOrLeft && !prevTitleCycleLeft;
      const cycleRightEdge = rbOrRight && !prevTitleCycleRight;
      prevTitleCycleLeft = lbOrLeft;
      prevTitleCycleRight = rbOrRight;

      sim.setGamepadState(true, mapped.moveX, mapped.moveY, mapped.focusSlow);

      if (showAdminRef.current || showRecordsRef.current) return;

      const cur = statusRef.current;
      if (cur === 'intro') {
        if (edges.confirmPressed || edges.pausePressed) {
          setIntroExitRequested(true);
        }
        return;
      }
      if (cur === 'playing') {
        if (edges.fireSecondaryPressed) {
          soundEngine.unlockMusicOnGesture();
          sim.fireSecondaryAbility();
        }
        if (edges.swapAbilityPressed) {
          soundEngine.unlockMusicOnGesture();
          sim.swapActiveAbilities();
        }
        if (edges.triggerSpecialPressed) {
          soundEngine.unlockMusicOnGesture();
          sim.triggerSpecialPulse();
        }
        if (edges.pausePressed) {
          sim.clearInputs();
          sim.setStatus('paused');
        }
      } else if (cur === 'paused') {
        if (edges.pausePressed || edges.confirmPressed) {
          sim.clearInputs();
          sim.setStatus('playing');
        }
      } else if (cur === 'title') {
        if (cycleLeftEdge) cycleTitlePet(-1);
        else if (cycleRightEdge) cycleTitlePet(1);
        if (edges.confirmPressed || edges.pausePressed) {
          soundEngine.unlockMusicOnGesture();
          sim.startNewGame();
          soundEngine.restartLevelMusic(1);
        }
      } else if (cur === 'level_clear') {
        if (edges.confirmPressed || edges.pausePressed) {
          soundEngine.unlockMusicOnGesture();
          sim.continueToNextLevel();
          soundEngine.restartLevelMusic(sim.getLevelIndex());
        }
      } else if (cur === 'gameover' || cur === 'victory') {
        if (edges.confirmPressed || edges.pausePressed) {
          soundEngine.unlockMusicOnGesture();
          sim.startNewGame();
          soundEngine.restartLevelMusic(1);
        }
      }
    };

    const scheduleNext = (renderMs: number) => {
      if (disposed) return;
      if (renderMs > 6) {
        yieldTimer = window.setTimeout(() => {
          if (!disposed) rafId = requestAnimationFrame(frame);
        }, 4);
      } else {
        rafId = requestAnimationFrame(frame);
      }
    };

    const frame = (now: number) => {
      const t0 = performance.now();
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      pollGamepad();

      const curStatus = statusRef.current;
      if (curStatus === 'playing') {
        sim.step(dt);
        sim.render(ctx);
        lastDrawnStatus = curStatus;
      } else if (lastDrawnStatus !== curStatus) {
        sim.render(ctx);
        lastDrawnStatus = curStatus;
      }

      if (!disposed) {
        if (curStatus === 'playing') {
          scheduleNext(performance.now() - t0);
        } else {
          yieldTimer = window.setTimeout(() => {
            if (!disposed) {
              lastTime = performance.now();
              rafId = requestAnimationFrame(frame);
            }
          }, 120);
        }
      }
    };
    rafId = requestAnimationFrame(frame);

    const onKeyDown = (e: KeyboardEvent) => {
      if (showAdminRef.current) {
        if (e.code === 'Escape') setShowAdmin(false);
        return;
      }

      if (showRecordsRef.current) {
        if (e.code === 'Escape') setShowRecordsModal(false);
        return;
      }

      if (statusRef.current === 'intro') {
        if (e.code === 'Enter' || e.code === 'Space' || e.code === 'Escape') {
          e.preventDefault();
          setIntroExitRequested(true);
        }
        return;
      }

      if (e.code === 'KeyM') {
        setMuted((prev) => {
          const next = !prev;
          soundEngine.setMuted(next);
          return next;
        });
        return;
      }

      if (statusRef.current === 'title') {
        soundEngine.unlockMusicOnGesture();
        if (e.code === 'Enter' || e.code === 'Space') {
          e.preventDefault();
          sim.startNewGame();
          soundEngine.restartLevelMusic(1);
        }
        return;
      }

      if (statusRef.current === 'level_clear') {
        soundEngine.unlockMusicOnGesture();
        if (e.code === 'Enter' || e.code === 'Space') {
          e.preventDefault();
          sim.continueToNextLevel();
          soundEngine.restartLevelMusic(sim.getLevelIndex());
        }
        return;
      }

      if (e.code === 'Escape' || e.code === 'KeyP') {
        e.preventDefault();
        if (statusRef.current === 'playing') {
          sim.clearInputs();
          sim.setStatus('paused');
        } else if (statusRef.current === 'paused') {
          sim.clearInputs();
          sim.setStatus('playing');
        }
        return;
      }

      if (e.code === 'KeyR' && statusRef.current === 'playing') {
        sim.startNewGame();
        soundEngine.restartLevelMusic(1);
        return;
      }

      if (statusRef.current === 'playing') {
        soundEngine.unlockMusicOnGesture();
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab'].includes(e.code)) {
          e.preventDefault();
        }
        sim.handleKeyDown(e.code);
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      sim.handleKeyUp(e.code);
    };

    const clearOnBlur = () => {
      sim.clearInputs();
    };

    const unlockOnPointer = () => {
      soundEngine.unlockMusicOnGesture();
    };

    const onGamepadConnected = () => {
      sim.setGamepadState(true, 0, 0, false);
    };
    const onGamepadDisconnected = () => {
      if (!forceXbox) {
        sim.setGamepadState(false, 0, 0, false);
      }
    };

    window.addEventListener('pointerdown', unlockOnPointer, { passive: true });
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', clearOnBlur);
    window.addEventListener('gamepadconnected', onGamepadConnected);
    window.addEventListener('gamepaddisconnected', onGamepadDisconnected);
    document.addEventListener('visibilitychange', clearOnBlur);

    return () => {
      disposed = true;
      soundEngine.stopMusic();
      cancelAnimationFrame(rafId);
      clearTimeout(yieldTimer);
      observer.disconnect();
      window.removeEventListener('orientationchange', updateSize);
      window.visualViewport?.removeEventListener('resize', updateSize);
      window.removeEventListener('pointerdown', unlockOnPointer);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', clearOnBlur);
      window.removeEventListener('gamepadconnected', onGamepadConnected);
      window.removeEventListener('gamepaddisconnected', onGamepadDisconnected);
      document.removeEventListener('visibilitychange', clearOnBlur);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const screenToCanvas = (clientX: number, clientY: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    const ws = worldScaleRef.current || 1;
    if (!rect) return { x: 480, y: 360 };
    const x = (clientX - rect.left) / ws;
    const y = (clientY - rect.top) / ws;
    return { x, y };
  };

  const releaseTouchPointer = (pointerId: number) => {
    if (touchMoveRef.current && touchMoveRef.current.pointerId === pointerId) {
      touchMoveRef.current = null;
      simRef.current?.setPointerTarget(false, 0, 0);
    }
  };

  const activeMutationsCount = ALL_SPECIES_IDS.filter((id) => hud.speciesLevels[id] > 0).length;
  const unlockedSet = new Set(hud.unlockedSpecies);
  const prompts = getControlPrompts(hud.gamepadConnected);
  const isXbox = prompts.mode === 'xbox';
  const selectedPetInfo = PET_CATALOG.find((p) => p.id === hud.petId) ?? PET_CATALOG[0];

  return (
    <div ref={containerRef} className="relative w-full h-dvh overflow-hidden select-none bg-[#08101C]">
      <canvas
        ref={canvasRef}
        data-testid="game-canvas"
        tabIndex={0}
        onContextMenu={(e) => {
          e.preventDefault();
          if (status === 'playing') {
            soundEngine.unlockMusicOnGesture();
            simRef.current?.fireSecondaryAbility();
          }
        }}
        onPointerDown={(e) => {
          if (status !== 'playing' || requiresLandscape) return;
          soundEngine.unlockMusicOnGesture();
          if (e.pointerType === 'touch') {
            if (!isTouchDevice) setIsTouchDevice(true);
            if (touchMoveRef.current === null && simRef.current) {
              const pt = screenToCanvas(e.clientX, e.clientY);
              const playerPos = simRef.current.getPlayerPosition();
              touchMoveRef.current = {
                pointerId: e.pointerId,
                anchorPlayerX: playerPos.x,
                anchorPlayerY: playerPos.y,
                anchorPointerX: pt.x,
                anchorPointerY: pt.y,
              };
              try {
                e.currentTarget.setPointerCapture?.(e.pointerId);
              } catch {
                // Ignore pointer capture errors
              }
              simRef.current.setPointerTarget(true, playerPos.x, playerPos.y);
            }
            return;
          }
          if (e.button === 2) {
            simRef.current?.fireSecondaryAbility();
            return;
          }
          const pt = screenToCanvas(e.clientX, e.clientY);
          simRef.current?.setPointerTarget(true, pt.x, pt.y);
        }}
        onPointerMove={(e) => {
          if (status !== 'playing' || requiresLandscape) return;
          if (e.pointerType === 'touch') {
            const activeTouch = touchMoveRef.current;
            if (!activeTouch || activeTouch.pointerId !== e.pointerId) return;
            const pt = screenToCanvas(e.clientX, e.clientY);
            const target = computeRelativeTouchTarget(
              activeTouch.anchorPlayerX,
              activeTouch.anchorPlayerY,
              activeTouch.anchorPointerX,
              activeTouch.anchorPointerY,
              pt.x,
              pt.y,
              1.18
            );
            simRef.current?.setPointerTarget(true, target.x, target.y);
            return;
          }
          if ((e.buttons & 1) !== 0) {
            const pt = screenToCanvas(e.clientX, e.clientY);
            simRef.current?.setPointerTarget(true, pt.x, pt.y);
          }
        }}
        onPointerUp={(e) => {
          if (e.pointerType === 'touch') {
            releaseTouchPointer(e.pointerId);
            return;
          }
          simRef.current?.setPointerTarget(false, 0, 0);
        }}
        onPointerCancel={(e) => {
          if (e.pointerType === 'touch') {
            releaseTouchPointer(e.pointerId);
            return;
          }
          simRef.current?.setPointerTarget(false, 0, 0);
        }}
        onLostPointerCapture={(e) => {
          if (e.pointerType === 'touch') {
            releaseTouchPointer(e.pointerId);
          }
        }}
        className="block w-full h-full touch-none outline-none"
      />

      {/* CREATOR INTRO VIDEO & CINEMATIC TRANSITION CURTAIN */}
      {introOverlayMounted && (
        <CreatorIntroOverlay
          assetBasePath={assetBasePath}
          initialMuted={muted}
          volume={musicVolume}
          exitRequested={introExitRequested}
          onRevealTitle={handleIntroRevealTitle}
          onComplete={handleIntroComplete}
        />
      )}

      {/* REWORKED TITLE SCREEN (Scroll-free responsive across short landscape phones, tablets & desktop) */}
      {status === 'title' && (
        <div
          data-testid="title-screen-container"
          className="fixed inset-0 z-30 h-dvh overflow-hidden [@media(max-height:280px)]:overflow-y-auto overscroll-contain"
        >
          <div className="relative h-full min-h-0 flex flex-col justify-between">
            {!bgFailed ? (
              <img
                src={titleHeroBg}
                alt="Biplano carnívoro Dionaea argentino y Sapo Batricio enfrentando artrópodos invasores"
                referrerPolicy="no-referrer"
                onError={() => setBgFailed(true)}
                className={`fixed inset-0 w-full h-full object-cover object-[70%_center] sm:object-[76%_center] lg:object-right pointer-events-none ${
                  titleRevealFromIntro ? 'animate-title-hero-reveal' : ''
                }`}
              />
            ) : (
              <div
                aria-hidden="true"
                className="fixed inset-0 bg-gradient-to-br from-[#08101C] via-[#133142] to-[#1E4B45] pointer-events-none"
              />
            )}

            {/* Measured editorial scrim keeping left UI >= 4.5:1 while letting protagonist biplane shine brightly on right */}
            <div
              aria-hidden="true"
              className="fixed inset-0 pointer-events-none bg-gradient-to-b from-[#070E1A]/90 via-[#091220]/78 to-[#070E1A]/94 lg:bg-gradient-to-r lg:from-[#070E1A]/95 lg:via-[#081220]/76 lg:via-[46%] lg:to-transparent"
            />

            {/* Top Utility Bar: Xbox Detection Banner + Audio Toggle */}
            <div
              className={`relative z-20 shrink-0 flex items-center justify-between gap-2 pt-[max(0.65rem,env(safe-area-inset-top))] [@media(max-height:540px)]:pt-[max(0.35rem,env(safe-area-inset-top))] pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] sm:px-10 ${
                titleRevealFromIntro ? 'animate-title-stage-reveal' : ''
              }`}
            >
              <div className="flex items-center gap-2">
                {isXbox && (
                  <div
                    data-testid="title-xbox-banner"
                    className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-[#0B2618]/95 border-2 border-[#107C10] shadow-[0_3px_0_#070D17] text-xs font-extrabold text-[#4ADE80]"
                  >
                    <Gamepad2 className="w-4 h-4 text-[#22C55E]" />
                    <span>Control Xbox Detectado</span>
                  </div>
                )}
              </div>

              <div className="relative flex items-center gap-1.5">
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => setShowAdmin(true)}
                    className="hidden [@media(max-height:540px)]:inline-flex touch-manipulation items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#0F172A]/95 hover:bg-[#1E293B] text-slate-100 text-xs font-semibold border-2 border-[#0B1120] shadow-[0_3px_0_#0B1120] cursor-pointer"
                  >
                    <Settings2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Admin</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    soundEngine.unlockMusicOnGesture();
                    setShowAudioPopover((prev) => !prev);
                  }}
                  aria-expanded={showAudioPopover}
                  aria-label="Abrir menú de volumen de música y efectos"
                  className="hidden [@media(max-height:540px)]:inline-flex touch-manipulation items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#0F172A]/92 hover:bg-[#1E293B] text-slate-100 text-xs font-semibold border-2 border-[#0B1120] shadow-[0_3px_0_#0B1120] cursor-pointer"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-sky-400" />
                  <span>Volumen</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    soundEngine.unlockMusicOnGesture();
                    handleToggleMute();
                  }}
                  aria-label={muted ? 'Activar música y sonido' : 'Silenciar música y sonido'}
                  title="Silenciar / Activar Audio (M)"
                  className="touch-manipulation inline-flex items-center gap-1.5 px-3 py-1.5 [@media(max-height:540px)]:py-1 rounded-xl bg-[#0F172A]/92 hover:bg-[#1E293B] text-slate-100 text-xs font-semibold border-2 border-[#0B1120] shadow-[0_3px_0_#0B1120] cursor-pointer"
                >
                  {muted ? (
                    <VolumeX className="w-4 h-4 text-rose-400" />
                  ) : (
                    <Volume2 className="w-4 h-4 text-emerald-400" />
                  )}
                  <span>{muted ? 'Audio Off' : 'Audio On'}</span>
                </button>

                {/* Short-landscape popover volume mixer */}
                {showAudioPopover && (
                  <div
                    role="region"
                    aria-label="Mezclador de volumen rápido"
                    className="hidden [@media(max-height:540px)]:block absolute right-0 top-9 w-60 p-3 rounded-xl bg-[#0B1422]/96 border-2 border-[#090D16] shadow-[0_6px_0_#090D16] space-y-2.5 z-30"
                  >
                    <label className="flex flex-col gap-1 text-[11px] font-semibold text-slate-200">
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-1 text-sky-300">
                          <Music className="w-3 h-3" /> Música
                        </span>
                        <span className="font-mono tabular-nums text-white">{Math.round(musicVolume * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={Math.round(musicVolume * 100)}
                        onChange={(e) => handleMusicVolumeChange(Number(e.target.value) / 100)}
                        className="w-full accent-sky-400 cursor-pointer"
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-[11px] font-semibold text-slate-200">
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-1 text-emerald-300">
                          <Sparkles className="w-3 h-3" /> Efectos
                        </span>
                        <span className="font-mono tabular-nums text-white">{Math.round(sfxVolume * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={Math.round(sfxVolume * 100)}
                        onChange={(e) => handleSfxVolumeChange(Number(e.target.value) / 100)}
                        onPointerUp={() => soundEngine.playUiSfxPreview()}
                        onKeyUp={() => soundEngine.playUiSfxPreview()}
                        className="w-full accent-emerald-400 cursor-pointer"
                      />
                    </label>
                  </div>
                )}
              </div>
            </div>

            {/* Main Reworked Hero & Tactical Hangar Stage (2-column compact on short landscape phones) */}
            <div
              className={`relative z-10 flex-1 min-h-0 flex items-center pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] sm:px-10 lg:px-12 py-2 [@media(max-height:540px)]:py-1 ${
                titleRevealFromIntro ? 'animate-title-stage-reveal' : ''
              }`}
            >
              <div className="w-full max-w-3xl [@media(max-height:540px)]:max-w-5xl grid grid-cols-1 [@media(max-height:540px)]:grid-cols-[minmax(195px,0.82fr)_minmax(0,1.18fr)] gap-2.5 sm:gap-3 [@media(max-height:540px)]:gap-x-4 [@media(max-height:540px)]:gap-y-2 items-start [@media(max-height:540px)]:items-center">
                {/* Block 1: Main Logo Emblem + Title + Global High Score */}
                <div className="flex flex-col items-start gap-1 [@media(max-height:540px)]:gap-1 min-w-0">
                  <TitleLogoLockup title={config.gameTitle} />
                  <p className="text-xs sm:text-sm [@media(max-height:540px)]:text-[11px] [@media(max-height:540px)]:line-clamp-2 text-slate-100/95 font-medium max-w-xl leading-snug">
                    Defiende los cielos de la Tierra con tu biplano carnívoro junto a{' '}
                    <span className="font-extrabold text-amber-300">{selectedPetInfo.name}</span>, combina armas rotativas y derrota a los jefes al ritmo de cada nivel.
                  </p>

                  {/* Global High Score Summary Line */}
                  <div
                    data-testid="title-global-highscore"
                    className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 pt-0.5 text-xs text-slate-200"
                  >
                    <div className="inline-flex items-baseline gap-1.5">
                      <Trophy className="w-3.5 h-3.5 text-amber-400 self-center shrink-0" />
                      <span className="text-[11px] [@media(max-height:540px)]:text-[10px] font-bold uppercase tracking-wider text-amber-300">
                        Récord Global
                      </span>
                      <span
                        data-testid="title-best-score-value"
                        className="text-base sm:text-lg [@media(max-height:540px)]:text-sm font-display font-black tabular-nums text-white"
                      >
                        {globalRecords.bestScore.toLocaleString('es-ES')}
                      </span>
                    </div>
                    {globalRecords.bestScore > 0 && (
                      <span className="text-[11px] [@media(max-height:600px)]:hidden text-slate-300 tabular-nums">
                        Combo Máx. {globalRecords.bestCombo} · Niv. {globalRecords.highestLevel}/5
                        {globalRecords.totalVictories > 0
                          ? ` · ${globalRecords.totalVictories} ${globalRecords.totalVictories === 1 ? 'victoria' : 'victorias'}`
                          : ''}
                      </span>
                    )}
                    <button
                      type="button"
                      data-testid="open-records-btn"
                      onClick={() => {
                        setGlobalRecords(loadGlobalHighScoreState());
                        setShowRecordsModal(true);
                      }}
                      className="touch-manipulation text-xs [@media(max-height:540px)]:text-[11px] font-semibold text-sky-300 hover:text-sky-200 underline underline-offset-4 decoration-sky-400/60 hover:decoration-sky-300 cursor-pointer whitespace-nowrap"
                    >
                      Ver Récords
                    </button>
                  </div>
                </div>

                {/* Block 2: Co-Pilot Pet Hangar Deck (occupies right column on short landscape screens) */}
                <div
                  data-testid="pet-hangar-panel"
                  className="w-full max-w-2xl [@media(max-height:540px)]:row-span-2 rounded-2xl bg-[#091220]/90 border-2 border-[#050810] shadow-[0_6px_0_#050810] p-2.5 sm:p-3 [@media(max-height:540px)]:p-2 space-y-2 [@media(max-height:540px)]:space-y-1.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5">
                    <div className="text-[11px] [@media(max-height:540px)]:text-[10px] font-display font-black uppercase tracking-wider text-sky-300">
                      Hangar de Mascotas Copiloto
                    </div>
                    <div className="text-[10px] font-semibold text-slate-300 shrink-0">
                      {isXbox ? (
                        <span className="inline-flex items-center gap-1 text-emerald-300 font-bold whitespace-nowrap">
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-600 font-mono text-[9px] text-white whitespace-nowrap shrink-0">
                            LB / RB
                          </span>
                          <span>Cambiar Mascota</span>
                        </span>
                      ) : (
                        <span className="[@media(max-height:540px)]:hidden">5 copilotos desbloqueables por nivel</span>
                      )}
                    </div>
                  </div>

                  {/* Responsive Pet Selector Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 [@media(max-height:540px)]:grid-cols-3 gap-1.5 sm:gap-2 [@media(max-height:540px)]:gap-1.5">
                    {PET_CATALOG.map((pet) => {
                      const isPlayable =
                        pet.implemented && (pet.id === 'batricio' || hud.unlockedPets.includes(pet.id as PetId));
                      const isSelected = pet.implemented && hud.petId === pet.id;

                      if (!pet.implemented) {
                        return (
                          <div
                            key={pet.id}
                            title={pet.specialDesc}
                            className="overflow-hidden min-h-[44px] [@media(max-height:540px)]:min-h-[36px] flex items-center gap-1.5 sm:gap-2 px-2 py-1 rounded-xl bg-[#0B1525] border border-slate-800 text-slate-400"
                          >
                            <div className="w-5 h-5 rounded-md bg-slate-900 border border-slate-700/80 flex items-center justify-center shrink-0">
                              <Lock className="w-3 h-3 text-slate-400" />
                            </div>
                            <div className="min-w-0 leading-tight">
                              <div className="text-[11px] [@media(max-height:540px)]:text-[10px] font-bold truncate">
                                Próxima Mascota
                              </div>
                              <div className="text-[9px] text-slate-400 truncate">Jefe Nv.{pet.unlockLevel}</div>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <button
                          key={pet.id}
                          type="button"
                          disabled={!isPlayable}
                          onClick={() => isPlayable && handleSelectPet(pet.id as PetId)}
                          title={
                            isPlayable
                              ? `${pet.name} · Cerca: ${pet.closeRangeLabel} · Especial: ${pet.specialName}`
                              : `Derrota al Jefe del Nivel ${pet.unlockLevel} para desbloquear a ${pet.name}`
                          }
                          className={`touch-manipulation overflow-hidden min-h-[44px] [@media(max-height:540px)]:min-h-[36px] flex items-center gap-1.5 sm:gap-2 px-2 py-1 rounded-xl border-2 text-left transition-colors ${
                            isSelected
                              ? 'bg-[#122840] border-sky-400 text-white shadow-[0_3px_0_#050810] cursor-pointer'
                              : isPlayable
                              ? 'bg-[#0C1829] border-[#050810] hover:border-slate-500 text-slate-100 cursor-pointer'
                              : 'bg-[#0B1525] border-[#050810] text-slate-400 cursor-not-allowed'
                          }`}
                        >
                          <div className="shrink-0">
                            {isPlayable ? (
                              <PetEmblem petId={pet.id as PetId} size={20} />
                            ) : (
                              <div className="w-5 h-5 rounded-md bg-slate-900 border border-slate-700/80 flex items-center justify-center">
                                <Lock className="w-3 h-3 text-slate-400" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1 leading-tight">
                            <div className="text-[11px] [@media(max-height:540px)]:text-[10px] font-extrabold flex items-center gap-1 truncate">
                              <span className="truncate">{pet.name}</span>
                              {isSelected && <Check className="w-3 h-3 text-sky-400 shrink-0" />}
                            </div>
                            <div className="text-[9px] text-slate-300 truncate">
                              {isPlayable ? pet.specialName : `Jefe Nv.${pet.unlockLevel}`}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Active Pet Combat Briefing Strip */}
                  <div className="[@media(max-height:600px)]:hidden rounded-xl bg-[#0D1A2C] border border-slate-700/70 px-3 py-1.5 grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-3 text-[11px]">
                    <div className="flex items-start gap-1.5 min-w-0">
                      <Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <div className="leading-snug min-w-0">
                        <span className="font-bold text-emerald-300">Cerca: </span>
                        <span className="text-slate-100">{selectedPetInfo.closeRangeLabel}</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-1.5 min-w-0">
                      <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <div className="leading-snug min-w-0">
                        <span className="font-bold text-amber-300">
                          Especial [{prompts.specialShort}]:{' '}
                        </span>
                        <span className="text-slate-100">{selectedPetInfo.specialDesc}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Block 3: Primary CTA + Compact Audio Mixer + Arsenal */}
                <div className="w-full max-w-2xl flex flex-col gap-2">
                  <div className="w-full flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2.5">
                    <button
                      type="button"
                      data-start="true"
                      onClick={handleStart}
                      className="touch-manipulation w-full sm:w-auto [@media(max-height:540px)]:w-full min-h-[46px] [@media(max-height:540px)]:min-h-[42px] inline-flex items-center justify-center gap-2.5 px-6 py-2.5 [@media(max-height:540px)]:py-2 rounded-xl bg-[#E11D48] hover:bg-[#BE123C] text-white font-display font-black text-sm sm:text-base tracking-wide border-2 border-[#050810] shadow-[0_4px_0_#050810] active:translate-y-0.5 transition-transform cursor-pointer whitespace-nowrap"
                    >
                      {isXbox && (
                        <span className="w-5 h-5 rounded-full bg-[#107C10] border border-emerald-200 text-[11px] font-mono font-black inline-flex items-center justify-center shadow-inner">
                          A
                        </span>
                      )}
                      <span>Iniciar Misión</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>

                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => setShowAdmin(true)}
                        className="[@media(max-height:540px)]:hidden touch-manipulation inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0F172A]/95 hover:bg-[#1E293B] text-slate-100 font-semibold text-xs sm:text-sm border-2 border-[#050810] shadow-[0_4px_0_#050810] transition-colors cursor-pointer whitespace-nowrap"
                      >
                        <Settings2 className="w-4 h-4 text-emerald-400" />
                        <span>Administrar</span>
                      </button>
                    )}

                    {/* Compact Inline Audio Mixer (Música & Efectos) */}
                    <div
                      data-testid="startup-volume-menu"
                      className="flex-1 min-w-[230px] [@media(max-height:540px)]:hidden rounded-xl bg-[#091220]/90 border-2 border-[#050810] shadow-[0_4px_0_#050810] px-3 py-2 grid grid-cols-2 gap-3"
                    >
                      <label className="flex flex-col gap-1 text-[11px] font-semibold text-slate-200">
                        <div className="flex items-center justify-between gap-1">
                          <span className="inline-flex items-center gap-1 text-sky-300">
                            <Music className="w-3 h-3 shrink-0" />
                            <span>Música</span>
                          </span>
                          <span className="font-mono text-[10px] tabular-nums text-white">
                            {Math.round(musicVolume * 100)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          aria-label="Volumen de música"
                          min={0}
                          max={100}
                          value={Math.round(musicVolume * 100)}
                          onChange={(e) => handleMusicVolumeChange(Number(e.target.value) / 100)}
                          className="w-full h-1.5 accent-sky-400 cursor-pointer"
                        />
                      </label>

                      <label className="flex flex-col gap-1 text-[11px] font-semibold text-slate-200">
                        <div className="flex items-center justify-between gap-1">
                          <span className="inline-flex items-center gap-1 text-emerald-300">
                            <Sparkles className="w-3 h-3 shrink-0" />
                            <span>Efectos</span>
                          </span>
                          <span className="font-mono text-[10px] tabular-nums text-white">
                            {Math.round(sfxVolume * 100)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          aria-label="Volumen de efectos"
                          min={0}
                          max={100}
                          value={Math.round(sfxVolume * 100)}
                          onChange={(e) => handleSfxVolumeChange(Number(e.target.value) / 100)}
                          onPointerUp={() => soundEngine.playUiSfxPreview()}
                          onKeyUp={() => soundEngine.playUiSfxPreview()}
                          className="w-full h-1.5 accent-emerald-400 cursor-pointer"
                        />
                      </label>
                    </div>
                  </div>

                  {/* Unboxed Carnivorous Arsenal Strip */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] [@media(max-height:540px)]:hidden text-slate-200">
                    {ALL_SPECIES_IDS.filter((id) => id === 'dionaea' || config.species[id].enabled).map((id) => {
                      const sp = config.species[id];
                      const isUnlocked = unlockedSet.has(id);
                      return (
                        <div
                          key={id}
                          title={
                            isUnlocked
                              ? `${sp.name}: ${sp.roleLabel}`
                              : `Vence al Jefe del Nivel ${sp.unlockRequirementLevel} para desbloquear ${sp.name}`
                          }
                          className={`inline-flex items-center gap-1 ${isUnlocked ? '' : 'opacity-55'}`}
                        >
                          {isUnlocked ? (
                            <SpeciesEmblem speciesId={id} color={sp.accentColor} unlocked={true} size={13} />
                          ) : (
                            <Lock className="w-3 h-3 text-slate-400" />
                          )}
                          <span className={`font-semibold ${isUnlocked ? 'text-white' : 'text-slate-400'}`}>
                            {sp.name}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Dynamic Control Guide Footer: Keyboard/Touch OR Full Xbox Controller Bar */}
            <div
              data-testid="title-controls-bar"
              className="relative z-10 shrink-0 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] sm:px-10 lg:px-12 pb-[max(0.55rem,env(safe-area-inset-bottom))] [@media(max-height:540px)]:pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-1"
            >
              {isXbox ? (
                <div className="inline-flex flex-wrap items-center gap-x-3 gap-y-1.5 px-3 py-1.5 rounded-xl bg-[#081512]/92 border border-[#107C10]/80 text-[11px] font-semibold text-slate-100">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-600 font-mono text-[10px] font-bold text-white">
                      {prompts.move}
                    </span>
                    <span>Mover</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded bg-[#107C10] border border-emerald-300/50 font-mono text-[10px] font-black text-white">
                      {prompts.secondaryShort}
                    </span>
                    <span>Secundaria</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded bg-[#2563EB] border border-blue-300/50 font-mono text-[10px] font-black text-white">
                      {prompts.swapShort}
                    </span>
                    <span>Rotar</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded bg-[#DC2626] border border-rose-300/50 font-mono text-[10px] font-black text-white">
                      {prompts.specialShort}
                    </span>
                    <span>Especial Mascota</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-600 font-mono text-[10px] font-bold text-white">
                      {prompts.pauseShort}
                    </span>
                    <span>Pausa</span>
                  </span>
                </div>
              ) : (
                <div className="text-[11px] sm:text-xs text-slate-200/90 font-medium tracking-wide">
                  {isTouchDevice ? (
                    <span>Pulgar izq.: Arrastrar nave · Auto Principal · Pulgar der.: Secundaria, Rotar y Especial</span>
                  ) : (
                    <>
                      <span className="sm:hidden">Arrastrar Mover · Auto Principal · Secundaria [E] · Rotar [Q]</span>
                      <span className="hidden sm:inline">{prompts.footerSummary}</span>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ACTIVE PLAYING HUD */}
      {status === 'playing' && (
        <GameHud
          hud={hud}
          config={config}
          muted={muted}
          isTouchDevice={isTouchDevice}
          isFullscreen={isFullscreen}
          canFullscreen={canFullscreen}
          onToggleFullscreen={handleToggleFullscreen}
          onToggleMute={handleToggleMute}
          onPause={handleTogglePause}
          onRestart={handleStart}
          onTriggerSpecial={() => simRef.current?.triggerSpecialPulse()}
          onFireSecondary={() => simRef.current?.fireSecondaryAbility()}
          onSwapAbilities={() => simRef.current?.swapActiveAbilities()}
        />
      )}

      {/* LEVEL CLEAR INTERMISSION MODAL */}
      {status === 'level_clear' && hud.clearedLevelSummary && (
        <div
          className="fixed inset-0 z-40 flex items-start sm:items-center justify-center overflow-y-auto bg-slate-950/75 p-3 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`Nivel ${hud.clearedLevelSummary.clearedLevel} completado`}
        >
          <div className="my-auto w-full max-w-md rounded-2xl bg-[#101B2C] border-2 border-[#0B1120] shadow-[0_8px_0_#0B1120] p-4 sm:p-6 text-center space-y-3 sm:space-y-4">
            <div>
              <div className="text-xs font-bold uppercase tracking-widest text-emerald-400">
                Nivel {hud.clearedLevelSummary.clearedLevel} Completado · +1 HP Reparado
              </div>
              <h2 className="text-2xl sm:text-3xl font-display font-black text-white mt-1">
                ¡{hud.clearedLevelSummary.bossName} Derrotado!
              </h2>
              <p className="text-xs text-slate-300 mt-1">
                Próximo sector: {hud.clearedLevelSummary.nextLevelTitle}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 text-left">
              <div className="p-2.5 sm:p-3 rounded-xl bg-slate-900 border border-slate-800">
                <div className="text-[10px] uppercase text-slate-400 font-semibold">Puntuación</div>
                <div className="text-base sm:text-lg font-display font-extrabold tabular-nums text-white">
                  {hud.score.toLocaleString('es-ES')}
                </div>
              </div>
              <div className="p-2.5 sm:p-3 rounded-xl bg-slate-900 border border-slate-800">
                <div className="text-[10px] uppercase text-slate-400 font-semibold">Récord</div>
                <div className="text-base sm:text-lg font-display font-extrabold tabular-nums text-amber-400">
                  {hud.highScore.toLocaleString('es-ES')}
                </div>
              </div>
              <div className="p-2.5 sm:p-3 rounded-xl bg-slate-900 border border-slate-800">
                <div className="text-[10px] uppercase text-slate-400 font-semibold">Combo Máx.</div>
                <div className="text-base sm:text-lg font-display font-extrabold tabular-nums text-cyan-400">
                  {hud.maxCombo}
                </div>
              </div>
            </div>

            {(hud.clearedLevelSummary.unlockedSpeciesName || hud.clearedLevelSummary.unlockedPetName) && (
              <div className="space-y-2 text-left">
                {hud.clearedLevelSummary.unlockedSpeciesId && hud.clearedLevelSummary.unlockedSpeciesName && (
                  <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-emerald-950/50 border border-emerald-500/40">
                    <SpeciesEmblem
                      speciesId={hud.clearedLevelSummary.unlockedSpeciesId}
                      color={config.species[hud.clearedLevelSummary.unlockedSpeciesId].accentColor}
                      unlocked={true}
                      size={20}
                    />
                    <div className="text-xs">
                      <div className="font-bold text-emerald-300">
                        Mutación Desbloqueada: {hud.clearedLevelSummary.unlockedSpeciesName}
                      </div>
                      <div className="text-slate-300 text-[11px]">
                        Disponible en cápsulas de próximas partidas.
                      </div>
                    </div>
                  </div>
                )}

                {hud.clearedLevelSummary.unlockedPetId && hud.clearedLevelSummary.unlockedPetName && (
                  <div className="flex items-center justify-between gap-2.5 p-2.5 rounded-xl bg-sky-950/60 border border-sky-400/50">
                    <div className="flex items-center gap-2.5">
                      <PetEmblem petId={hud.clearedLevelSummary.unlockedPetId} size={24} />
                      <div className="text-xs">
                        <div className="font-bold text-sky-300">
                          Nueva Mascota: {hud.clearedLevelSummary.unlockedPetName}
                        </div>
                        <div className="text-slate-300 text-[11px]">
                          {PET_CATALOG.find((p) => p.id === hud.clearedLevelSummary?.unlockedPetId)?.specialDesc ??
                            'Poder especial de mascota en [Espacio].'}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSelectPet(hud.clearedLevelSummary!.unlockedPetId!)}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold shrink-0 cursor-pointer ${
                        hud.petId === hud.clearedLevelSummary.unlockedPetId
                          ? 'bg-emerald-600 text-white'
                          : 'bg-sky-500 hover:bg-sky-400 text-slate-950'
                      }`}
                    >
                      {hud.petId === hud.clearedLevelSummary.unlockedPetId ? 'Equipado' : 'Equipar'}
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-col gap-2 pt-1">
              <button
                type="button"
                data-continue="true"
                onClick={handleContinueNextLevel}
                className="touch-manipulation w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-display font-extrabold text-sm border-2 border-[#0B1120] shadow-[0_3px_0_#0B1120] inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                {isXbox && (
                  <span className="w-5 h-5 rounded-full bg-[#107C10] border border-emerald-200 text-[10px] font-mono font-black inline-flex items-center justify-center">
                    A
                  </span>
                )}
                <span>Siguiente Nivel (Nv.{hud.clearedLevelSummary.nextLevel})</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleReturnToTitle}
                className="touch-manipulation w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold text-xs border border-slate-700 cursor-pointer"
              >
                Volver al Menú
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PAUSED MODAL */}
      {status === 'paused' && !(isAdmin && showAdmin) && (
        <div
          className="fixed inset-0 z-40 flex items-start sm:items-center justify-center overflow-y-auto bg-slate-950/70 p-3 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Juego en pausa"
        >
          <div className="my-auto w-full max-w-sm rounded-2xl bg-[#101B2C] border-2 border-[#0B1120] shadow-[0_8px_0_#0B1120] p-4 sm:p-6 text-center space-y-4 sm:space-y-5">
            <h2 className="text-xl sm:text-2xl font-display font-black text-white tracking-wide">
              Misión en Pausa
            </h2>

            <div className="grid grid-cols-3 gap-2 text-left">
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                <div className="text-[10px] uppercase text-slate-400 font-semibold">Puntos</div>
                <div className="text-base sm:text-lg font-display font-extrabold tabular-nums text-white">
                  {hud.score.toLocaleString('es-ES')}
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                <div className="text-[10px] uppercase text-slate-400 font-semibold">Récord</div>
                <div className="text-base sm:text-lg font-display font-extrabold tabular-nums text-amber-400">
                  {hud.highScore.toLocaleString('es-ES')}
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                <div className="text-[10px] uppercase text-slate-400 font-semibold">Mutac.</div>
                <div className="text-base sm:text-lg font-display font-extrabold tabular-nums text-emerald-400">
                  {hud.secretEvolution ? 'S5' : `${activeMutationsCount}/${hud.maxSlots}`}
                </div>
              </div>
            </div>

            {/* Pause Audio Volume Controls */}
            <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2.5 text-left">
              <label className="flex flex-col gap-1 text-xs font-semibold text-slate-200">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-sky-300">
                    <Music className="w-3.5 h-3.5" /> Volumen Música
                  </span>
                  <span className="font-mono text-[11px] tabular-nums text-white">
                    {Math.round(musicVolume * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  aria-label="Volumen de música en pausa"
                  min={0}
                  max={100}
                  value={Math.round(musicVolume * 100)}
                  onChange={(e) => handleMusicVolumeChange(Number(e.target.value) / 100)}
                  className="w-full h-1.5 accent-sky-400 cursor-pointer"
                />
              </label>

              <label className="flex flex-col gap-1 text-xs font-semibold text-slate-200">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-emerald-300">
                    <Sparkles className="w-3.5 h-3.5" /> Volumen Efectos
                  </span>
                  <span className="font-mono text-[11px] tabular-nums text-white">
                    {Math.round(sfxVolume * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  aria-label="Volumen de efectos en pausa"
                  min={0}
                  max={100}
                  value={Math.round(sfxVolume * 100)}
                  onChange={(e) => handleSfxVolumeChange(Number(e.target.value) / 100)}
                  onPointerUp={() => soundEngine.playUiSfxPreview()}
                  onKeyUp={() => soundEngine.playUiSfxPreview()}
                  className="w-full h-1.5 accent-emerald-400 cursor-pointer"
                />
              </label>
            </div>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={handleTogglePause}
                className="touch-manipulation w-full py-2.5 sm:py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-display font-bold text-sm border-2 border-[#0B1120] shadow-[0_3px_0_#0B1120] inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                {isXbox && (
                  <span className="w-5 h-5 rounded-full bg-[#107C10] border border-emerald-200 text-[10px] font-mono font-black inline-flex items-center justify-center">
                    A
                  </span>
                )}
                <span>Continuar</span>
              </button>
              <button
                type="button"
                onClick={handleStart}
                className="touch-manipulation w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold text-sm border border-slate-700 cursor-pointer"
              >
                Reiniciar
              </button>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setShowAdmin(true)}
                  className="touch-manipulation w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold text-sm border border-slate-700 cursor-pointer"
                >
                  Administrar Parámetros
                </button>
              )}
              <button
                type="button"
                onClick={handleReturnToTitle}
                className="touch-manipulation w-full py-2 text-xs font-medium text-slate-400 hover:text-white cursor-pointer"
              >
                Volver al Título
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VICTORY / GAME OVER MODAL */}
      {(status === 'victory' || status === 'gameover') && (
        <div
          className="fixed inset-0 z-40 flex items-start sm:items-center justify-center overflow-y-auto bg-slate-950/75 p-3 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label={status === 'victory' ? 'Victoria' : 'Fin de la partida'}
        >
          <div className="my-auto w-full max-w-md rounded-2xl bg-[#101B2C] border-2 border-[#0B1120] shadow-[0_8px_0_#0B1120] p-4 sm:p-6 text-center space-y-4 sm:space-y-5">
            <div>
              <div
                className={`text-xs font-bold uppercase tracking-widest ${
                  status === 'victory' ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {status === 'victory' ? 'Cielos Despejados' : 'Trampa Sobrepasada'}
              </div>
              <h2 className="text-2xl sm:text-3xl font-display font-black text-white mt-1">
                {status === 'victory' ? '¡Invasión Neutralizada!' : 'Misión Fallida'}
              </h2>
              {hud.isNewHighScore && hud.score > 0 && (
                <div
                  data-testid="gameover-new-record"
                  className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-display font-black tracking-wide text-amber-300"
                >
                  <Trophy className="w-3.5 h-3.5 text-amber-400" />
                  <span>¡NUEVO RÉCORD GLOBAL GUARDADO!</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5 text-left">
              <div className="p-2.5 sm:p-3 rounded-xl bg-slate-900 border border-slate-800">
                <div className="text-[10px] uppercase text-slate-400 font-semibold">Puntos</div>
                <div className="text-base sm:text-lg font-display font-extrabold tabular-nums text-white">
                  {hud.score.toLocaleString('es-ES')}
                </div>
              </div>
              <div
                className={`p-2.5 sm:p-3 rounded-xl bg-slate-900 border ${
                  hud.isNewHighScore && hud.score > 0 ? 'border-amber-400/70' : 'border-slate-800'
                }`}
              >
                <div className="text-[10px] uppercase text-slate-400 font-semibold">Récord</div>
                <div className="text-base sm:text-lg font-display font-extrabold tabular-nums text-amber-400">
                  {hud.highScore.toLocaleString('es-ES')}
                </div>
              </div>
              <div className="p-2.5 sm:p-3 rounded-xl bg-slate-900 border border-slate-800">
                <div className="text-[10px] uppercase text-slate-400 font-semibold">Combo Máx.</div>
                <div className="text-base sm:text-lg font-display font-extrabold tabular-nums text-cyan-400">
                  {hud.maxCombo}
                </div>
              </div>
              <div className="p-2.5 sm:p-3 rounded-xl bg-slate-900 border border-slate-800">
                <div className="text-[10px] uppercase text-slate-400 font-semibold">
                  {status === 'victory' ? 'Tiempo' : 'Progreso'}
                </div>
                <div className="text-base sm:text-lg font-display font-extrabold tabular-nums text-emerald-400">
                  {status === 'victory' ? `${hud.elapsedSec}s` : `Niv.${hud.levelIndex}`}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                data-start="true"
                onClick={handleStart}
                className="touch-manipulation w-full py-2.5 sm:py-3 rounded-xl bg-[#E11D48] hover:bg-[#BE123C] text-white font-display font-extrabold text-sm border-2 border-[#0B1120] shadow-[0_3px_0_#0B1120] inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                {isXbox && (
                  <span className="w-5 h-5 rounded-full bg-[#107C10] border border-emerald-200 text-[10px] font-mono font-black inline-flex items-center justify-center">
                    A
                  </span>
                )}
                <span>Jugar de Nuevo</span>
              </button>
              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setGlobalRecords(loadGlobalHighScoreState());
                    setShowRecordsModal(true);
                  }}
                  className="touch-manipulation flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-semibold text-xs border border-slate-700 inline-flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <Trophy className="w-3.5 h-3.5" />
                  <span>Ver Récords</span>
                </button>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => setShowAdmin(true)}
                    className="touch-manipulation flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold text-xs border border-slate-700 cursor-pointer whitespace-nowrap"
                  >
                    Administrar
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleReturnToTitle}
                  className="touch-manipulation flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold text-xs border border-slate-700 cursor-pointer whitespace-nowrap"
                >
                  Menú Principal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* GLOBAL HIGH SCORES / RECORDS MODAL */}
      {showRecordsModal && (
        <HighScoreModal
          records={globalRecords}
          onResetRecords={handleResetRecords}
          onClose={() => setShowRecordsModal(false)}
        />
      )}

      {/* ADMIN / CUSTOMIZATION PANEL — Strictly gated behind isAdmin */}
      {isAdmin && showAdmin && (
        <AdminConfigModal
          config={config}
          onSave={handleSaveConfig}
          onUnlocksChanged={handleUnlocksUpdated}
          onClose={() => setShowAdmin(false)}
        />
      )}

      {/* MANDATORY LANDSCAPE ORIENTATION GATE FOR PORTRAIT MOBILE/TABLET */}
      {requiresLandscape && (
        <div
          data-testid="rotate-landscape-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Girá tu teléfono a modo horizontal para jugar"
          className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-5 px-6 text-center bg-[#08101C]/96 backdrop-blur-md"
        >
          <div className="w-24 h-24 rounded-3xl bg-[#0F1C30] border-2 border-emerald-400/50 shadow-[0_6px_0_#050810] flex items-center justify-center">
            <Smartphone className="w-12 h-12 text-emerald-400 animate-rotate-phone" />
          </div>

          <div className="space-y-2 max-w-xs">
            <div className="text-[11px] font-mono font-bold uppercase tracking-[0.18em] text-amber-300">
              Modo Horizontal Requerido
            </div>
            <h2 className="text-2xl font-display font-black text-white leading-tight">
              Girá tu teléfono a horizontal
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Dionaea Strike está diseñado para jugar con dos pulgares en pantalla apaisada y ver mejor los ataques enemigos.
            </p>
          </div>

          {status === 'paused' && (
            <div className="px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-400/50 text-xs font-bold text-amber-200">
              Partida en pausa automática — girá para continuar
            </div>
          )}

          {(canFullscreen || canOrientationLock) && (
            <button
              type="button"
              onClick={() => void requestMobileLandscapeFullscreen(true)}
              className="touch-manipulation inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-display font-bold text-sm border-2 border-[#050810] shadow-[0_4px_0_#050810] cursor-pointer"
            >
              <Maximize2 className="w-4 h-4" />
              <span>Pasar a pantalla horizontal</span>
            </button>
          )}

          {orientationHint && (
            <p className="max-w-xs px-3 py-2 rounded-xl bg-amber-500/15 border border-amber-400/50 text-[11px] font-medium text-amber-200 leading-relaxed">
              {orientationHint}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export { DEFAULT_GAME_CONFIG };
