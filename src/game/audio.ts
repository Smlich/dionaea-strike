import type { GameStatus, LevelNumber, SpeciesId } from './types';

export const AUDIO_PREFS_STORAGE_KEY = 'dionaea_strike_audio_v1';

export const MENU_MUSIC_SRC = '/assets/aistudio/Dionaea_Strike_-_Men___Voz_AR__87d64c21.m4a';
export const LEVEL_1_MUSIC_SRC = '/assets/aistudio/Dionaea_Strike_-_Rap_AR__Voz_Argentina__5bdef878.m4a';
export const LEVEL_2_MUSIC_SRC = '/assets/aistudio/Dionaea_Strike_-_Nivel_2_Cumbia__Voz_AR__3aaf9dca.m4a';
export const LEVEL_3_MUSIC_SRC = '/assets/aistudio/Dionaea_Strike_-_Nivel_3_Boom_Bap__Voz_AR__7c61e348.m4a';
export const LEVEL_4_MUSIC_SRC = '/assets/aistudio/Dionaea_Strike_-_Rap_AR__Voz_Argentina__5bdef878.m4a';
export const LEVEL_5_MUSIC_SRC = '/assets/aistudio/Dionaea_Strike_-_Nivel_5_Boss__Voz_AR__2a892b6f.m4a';

export const LEVEL_MUSIC_TRACKS: Record<LevelNumber, string> = {
  1: LEVEL_1_MUSIC_SRC,
  2: LEVEL_2_MUSIC_SRC,
  3: LEVEL_3_MUSIC_SRC,
  4: LEVEL_4_MUSIC_SRC,
  5: LEVEL_5_MUSIC_SRC,
};

export interface LevelRhythmProfile {
  bpm: number;
  firstDropSec: number;
  beatsPerSpawn: number;
  trackDurationSec: number;
}

/**
 * Perfiles rítmicos medidos directamente sobre cada pista .m4a real del juego
 * para sincronizar oleadas enemigas y pulso visual con la música de cada nivel.
 */
export const LEVEL_RHYTHM_PROFILES: Record<LevelNumber, LevelRhythmProfile> = {
  1: { bpm: 140, firstDropSec: 0.12, beatsPerSpawn: 2.0, trackDurationSec: 164.0 },
  2: { bpm: 99, firstDropSec: 0.2, beatsPerSpawn: 1.5, trackDurationSec: 159.1 },
  3: { bpm: 118, firstDropSec: 1.82, beatsPerSpawn: 1.5, trackDurationSec: 180.2 },
  4: { bpm: 140, firstDropSec: 0.12, beatsPerSpawn: 1.5, trackDurationSec: 164.0 },
  5: { bpm: 118, firstDropSec: 2.02, beatsPerSpawn: 1.0, trackDurationSec: 151.1 },
};

export function getLevelRhythmProfile(levelIndex: LevelNumber): LevelRhythmProfile {
  return LEVEL_RHYTHM_PROFILES[levelIndex] ?? LEVEL_RHYTHM_PROFILES[1];
}

export function getMusicTrackForState(status: GameStatus, levelIndex: LevelNumber): string | null {
  if (status === 'title') {
    return MENU_MUSIC_SRC;
  }
  if (status !== 'playing' && status !== 'paused') {
    return null;
  }
  return LEVEL_MUSIC_TRACKS[levelIndex] ?? null;
}

interface LevelSfxProfile {
  shootWave: OscillatorType;
  hitWave: OscillatorType;
  bassWave: OscillatorType;
  tempoMult: number;
  pitchMult: number;
  scaleNotes: [number, number, number, number];
}

const LEVEL_SFX_PROFILES: Record<LevelNumber, LevelSfxProfile> = {
  // Nivel 1 (Pampa Amanecer / Anime-Rap AR)
  1: {
    shootWave: 'triangle',
    hitWave: 'triangle',
    bassWave: 'sawtooth',
    tempoMult: 0.92,
    pitchMult: 0.96,
    scaleNotes: [440, 554.37, 659.25, 880],
  },
  // Nivel 2 (Selva Misionera / Cumbia)
  2: {
    shootWave: 'sine',
    hitWave: 'triangle',
    bassWave: 'triangle',
    tempoMult: 1.04,
    pitchMult: 1.08,
    scaleNotes: [392, 493.88, 587.33, 783.99],
  },
  // Nivel 3 (Buenos Aires Nocturno / Boom Bap)
  3: {
    shootWave: 'square',
    hitWave: 'sawtooth',
    bassWave: 'sine',
    tempoMult: 1.06,
    pitchMult: 0.86,
    scaleNotes: [329.63, 392, 493.88, 659.25],
  },
  // Nivel 4 (Autopista y Puerto / Rap AR Callejero)
  4: {
    shootWave: 'sawtooth',
    hitWave: 'square',
    bassWave: 'sawtooth',
    tempoMult: 1.14,
    pitchMult: 1.04,
    scaleNotes: [349.23, 415.3, 523.25, 698.46],
  },
  // Nivel 5 (Quebrada de Humahuaca / El Humahuaqueño)
  5: {
    shootWave: 'triangle',
    hitWave: 'sine',
    bassWave: 'triangle',
    tempoMult: 1.22,
    pitchMult: 1.15,
    scaleNotes: [440, 523.25, 659.25, 880],
  },
};

function clampUnit(v: number): number {
  if (!Number.isFinite(v)) return 0.7;
  return Math.max(0, Math.min(1, v));
}

function loadSavedAudioPrefs(): { musicVolume: number; sfxVolume: number } {
  if (typeof window === 'undefined') {
    return { musicVolume: 0.65, sfxVolume: 0.75 };
  }
  try {
    const raw = window.localStorage.getItem(AUDIO_PREFS_STORAGE_KEY);
    if (!raw) return { musicVolume: 0.65, sfxVolume: 0.75 };
    const parsed = JSON.parse(raw) as Partial<{ musicVolume: number; sfxVolume: number }>;
    return {
      musicVolume: typeof parsed.musicVolume === 'number' ? clampUnit(parsed.musicVolume) : 0.65,
      sfxVolume: typeof parsed.sfxVolume === 'number' ? clampUnit(parsed.sfxVolume) : 0.75,
    };
  } catch {
    return { musicVolume: 0.65, sfxVolume: 0.75 };
  }
}

class AnimeSoundEngine {
  private ctx: AudioContext | null = null;
  private muted = false;
  private currentLevel: LevelNumber = 1;
  private currentStatus: GameStatus = 'title';
  private musicAudio: HTMLAudioElement | null = null;
  private currentTrackSrc: string | null = null;
  private desiredTrackSrc: string | null = null;
  private musicShouldPlay = false;
  private musicVolume = 0.65;
  private sfxVolume = 0.75;
  private musicPlaybackRate = 1.0;
  private assetBasePath = '';

  constructor() {
    const prefs = loadSavedAudioPrefs();
    this.musicVolume = prefs.musicVolume;
    this.sfxVolume = prefs.sfxVolume;
  }

  public setAssetBasePath(basePath?: string) {
    if (!basePath || basePath === '/') {
      this.assetBasePath = '';
      return;
    }
    this.assetBasePath = basePath.replace(/\/+$/, '');
  }

  private resolveTrackUrl(trackPath: string): string {
    if (/^https?:\/\//i.test(trackPath)) return trackPath;
    if (!this.assetBasePath) return trackPath;
    const normalized = trackPath.startsWith('/') ? trackPath : `/${trackPath}`;
    return `${this.assetBasePath}${normalized}`;
  }

  private persistAudioPrefs() {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(
        AUDIO_PREFS_STORAGE_KEY,
        JSON.stringify({
          musicVolume: Number(this.musicVolume.toFixed(2)),
          sfxVolume: Number(this.sfxVolume.toFixed(2)),
        })
      );
    } catch {
      // Ignore storage errors
    }
  }

  private getEffectiveMusicGain(status: GameStatus): number {
    const scale = status === 'title' ? 0.54 : 0.68;
    return clampUnit(this.musicVolume * scale);
  }

  public getMusicVolume(): number {
    return this.musicVolume;
  }

  public getSfxVolume(): number {
    return this.sfxVolume;
  }

  public setMusicVolume(volume: number) {
    this.musicVolume = clampUnit(volume);
    this.persistAudioPrefs();
    if (this.musicAudio) {
      this.musicAudio.volume = this.getEffectiveMusicGain(this.currentStatus);
      if (this.musicVolume <= 0.001) {
        this.musicAudio.pause();
      } else if (this.musicShouldPlay && !this.muted && this.musicAudio.paused) {
        this.musicAudio.play().catch(() => {});
      }
    }
  }

  public setSfxVolume(volume: number) {
    this.sfxVolume = clampUnit(volume);
    this.persistAudioPrefs();
  }

  public setMuted(muted: boolean) {
    this.muted = muted;
    if (this.musicAudio) {
      this.musicAudio.muted = muted;
      if (muted) {
        this.musicAudio.pause();
      } else if (this.musicShouldPlay && this.desiredTrackSrc && this.musicVolume > 0.001) {
        this.musicAudio.play().catch(() => {});
      }
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setLevel(levelIndex: LevelNumber) {
    this.currentLevel = levelIndex;
  }

  public getMusicTimeSec(): number | null {
    if (!this.musicAudio || this.musicAudio.paused || this.muted || this.musicVolume <= 0.001) {
      return null;
    }
    if (this.musicAudio.readyState >= 2 && Number.isFinite(this.musicAudio.currentTime)) {
      return this.musicAudio.currentTime;
    }
    return null;
  }

  public syncMusicTempo(bossActive: boolean, bossPhase: 1 | 2) {
    const targetRate = bossActive && bossPhase === 2 ? 1.06 : 1.0;
    if (Math.abs(this.musicPlaybackRate - targetRate) < 0.005) return;
    this.musicPlaybackRate = targetRate;
    if (this.musicAudio) {
      try {
        this.musicAudio.playbackRate = targetRate;
      } catch {
        // Ignore playbackRate errors in restricted environments
      }
    }
  }

  public syncMusic(status: GameStatus, levelIndex: LevelNumber) {
    this.currentLevel = levelIndex;
    this.currentStatus = status;
    if (typeof window === 'undefined' || typeof Audio === 'undefined') return;

    const nextSrc = getMusicTrackForState(status, levelIndex);
    this.desiredTrackSrc = nextSrc;

    if (!nextSrc) {
      this.musicShouldPlay = false;
      this.stopMusic();
      return;
    }

    if (!this.musicAudio || this.currentTrackSrc !== nextSrc) {
      this.stopMusic();
      const audio = new Audio(this.resolveTrackUrl(nextSrc));
      audio.loop = true;
      audio.preload = 'auto';
      audio.volume = this.getEffectiveMusicGain(status);
      audio.muted = this.muted;
      try {
        audio.playbackRate = status === 'title' ? 1.0 : this.musicPlaybackRate;
      } catch {
        // Ignore
      }
      this.musicAudio = audio;
      this.currentTrackSrc = nextSrc;
    } else {
      this.musicAudio.volume = this.getEffectiveMusicGain(status);
    }

    this.musicShouldPlay = status === 'playing' || status === 'title';
    this.musicAudio.muted = this.muted;

    if (this.musicShouldPlay && !this.muted && this.musicVolume > 0.001) {
      if (this.musicAudio.paused) {
        this.musicAudio.play().catch(() => {});
      }
    } else {
      // On paused, keep currentTime intact so music resumes right on beat!
      this.musicAudio.pause();
    }
  }

  public restartLevelMusic(levelIndex: LevelNumber = 1) {
    this.currentLevel = levelIndex;
    this.currentStatus = 'playing';
    this.musicPlaybackRate = 1.0;
    if (typeof window === 'undefined' || typeof Audio === 'undefined') return;
    const src = LEVEL_MUSIC_TRACKS[levelIndex] ?? null;
    if (!src) {
      this.stopMusic();
      return;
    }
    this.desiredTrackSrc = src;
    this.musicShouldPlay = true;

    if (!this.musicAudio || this.currentTrackSrc !== src) {
      this.stopMusic();
      const audio = new Audio(this.resolveTrackUrl(src));
      audio.loop = true;
      audio.preload = 'auto';
      audio.volume = this.getEffectiveMusicGain('playing');
      this.musicAudio = audio;
      this.currentTrackSrc = src;
    } else {
      this.musicAudio.volume = this.getEffectiveMusicGain('playing');
      try {
        this.musicAudio.currentTime = 0;
        this.musicAudio.playbackRate = 1.0;
      } catch {
        // Ignore seek error before metadata loads
      }
    }

    this.musicAudio.muted = this.muted;
    if (!this.muted && this.musicVolume > 0.001) {
      this.musicAudio.play().catch(() => {});
    }
  }

  public unlockMusicOnGesture() {
    if (
      this.musicShouldPlay &&
      !this.muted &&
      this.musicVolume > 0.001 &&
      this.musicAudio &&
      this.musicAudio.paused
    ) {
      this.musicAudio.play().catch(() => {});
    }
  }

  public stopMusic() {
    if (this.musicAudio) {
      this.musicAudio.pause();
      try {
        this.musicAudio.currentTime = 0;
      } catch {
        // Ignore seek error
      }
    }
    this.musicAudio = null;
    this.currentTrackSrc = null;
  }

  private ensureContext(): AudioContext | null {
    if (this.muted || this.sfxVolume <= 0.001 || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private playTone(
    freqStart: number,
    freqEnd: number,
    duration: number,
    type: OscillatorType,
    gainPeak: number,
    delaySec = 0
  ) {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const scaledPeak = gainPeak * this.sfxVolume;
    if (scaledPeak <= 0.0005) return;

    const now = ctx.currentTime + delaySec;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    const jitter = 1 + (Math.random() - 0.5) * 0.1;
    osc.frequency.setValueAtTime(Math.max(36, freqStart * jitter), now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(36, freqEnd * jitter), now + duration);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(scaledPeak, now + Math.min(0.014, duration * 0.28));
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.01);
  }

  public playUiSfxPreview() {
    this.playTone(520, 780, 0.09, 'triangle', 0.085);
    this.playTone(780, 1040, 0.08, 'sine', 0.06, 0.055);
  }

  public playShoot(fusionLevel: number, combo = 0) {
    const prof = LEVEL_SFX_PROFILES[this.currentLevel];
    const speedBonus = 1 + Math.min(0.28, combo * 0.015);
    const dur = Math.max(0.042, 0.072 / (prof.tempoMult * speedBonus));
    const base = (540 + fusionLevel * 68) * prof.pitchMult * (1 + Math.min(0.16, combo * 0.01));
    this.playTone(base, base * (this.currentLevel === 2 ? 1.24 : 0.55), dur, prof.shootWave, 0.045);
    if (this.currentLevel === 5) {
      this.playTone(base * 1.498, base * 1.12, dur * 0.85, 'sine', 0.025, dur * 0.45);
    }
  }

  public playSnapBite() {
    const prof = LEVEL_SFX_PROFILES[this.currentLevel];
    const dur = 0.095 / prof.tempoMult;
    this.playTone(340 * prof.pitchMult, 125 * prof.pitchMult, dur, prof.bassWave, 0.072);
  }

  public playHit(heavy = false) {
    const prof = LEVEL_SFX_PROFILES[this.currentLevel];
    const dur = (heavy ? 0.11 : 0.055) / prof.tempoMult;
    if (heavy) {
      this.playTone(230 * prof.pitchMult, 72, dur, prof.hitWave, 0.08);
    } else {
      const endFreq = this.currentLevel === 2 ? 620 : 210;
      this.playTone(460 * prof.pitchMult, endFreq, dur, prof.hitWave, 0.042);
    }
  }

  public playShieldClang() {
    this.playTone(980, 420, 0.08, 'square', 0.055);
  }

  public playWindGust() {
    this.playTone(210, 460, 0.35, 'sine', 0.075);
    this.playTone(320, 180, 0.35, 'triangle', 0.05, 0.12);
  }

  public playExplosion() {
    const prof = LEVEL_SFX_PROFILES[this.currentLevel];
    const dur = 0.24 / prof.tempoMult;
    if (this.currentLevel === 3 || this.currentLevel === 4) {
      this.playTone(135, 36, dur * 1.15, 'sine', 0.13);
      this.playTone(420, 140, dur * 0.35, 'square', 0.06);
    } else if (this.currentLevel === 5) {
      this.playTone(155, 44, dur * 1.1, 'triangle', 0.13);
      this.playTone(660, 440, dur * 0.4, 'sine', 0.05);
    } else {
      this.playTone(175 * prof.pitchMult, 42, dur, prof.bassWave, 0.115);
    }
  }

  public playPlayerHurt() {
    const prof = LEVEL_SFX_PROFILES[this.currentLevel];
    this.playTone(280 * prof.pitchMult, 62, 0.26 / prof.tempoMult, 'sawtooth', 0.15);
  }

  public playPodShift(cycleIndex: number) {
    const prof = LEVEL_SFX_PROFILES[this.currentLevel];
    const baseNote = prof.scaleNotes[cycleIndex % prof.scaleNotes.length];
    const stepDur = 0.075 / prof.tempoMult;
    this.playTone(baseNote, baseNote * 1.26, stepDur, 'triangle', 0.07);
    this.playTone(baseNote * 1.5, baseNote * 1.58, stepDur, 'sine', 0.05, stepDur * 0.6);
  }

  public playFusionFanfare() {
    const prof = LEVEL_SFX_PROFILES[this.currentLevel];
    const stepSec = 0.064 / prof.tempoMult;
    prof.scaleNotes.forEach((n, idx) => {
      this.playTone(n, n * 1.04, 0.16 / prof.tempoMult, prof.shootWave, 0.095, idx * stepSec);
    });
  }

  public playSpecialVacuum() {
    const prof = LEVEL_SFX_PROFILES[this.currentLevel];
    this.playTone(170 * prof.pitchMult, 960 * prof.pitchMult, 0.34 / prof.tempoMult, 'sine', 0.12);
  }

  public playSicarioMafiaCall() {
    // Low noir brass whistle + feline chorus chord summoning La Mafia Gatuna
    this.playTone(220, 330, 0.14, 'sawtooth', 0.09, 0);
    this.playTone(261.63, 392, 0.16, 'triangle', 0.085, 0.08);
    this.playTone(329.63, 493.88, 0.22, 'sawtooth', 0.095, 0.16);
    this.playTone(146.83, 98, 0.32, 'sine', 0.12, 0.18);
  }

  public playMafiaSlash() {
    this.playTone(880, 290, 0.075, 'sawtooth', 0.055);
  }

  public playRoyHorridScream() {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const peak = 0.12 * this.sfxVolume;
    if (peak <= 0.0005) return;

    const main = ctx.createOscillator();
    const clash = ctx.createOscillator();
    const sub = ctx.createOscillator();
    const gain = ctx.createGain();
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();

    main.type = 'sawtooth';
    clash.type = 'square';
    sub.type = 'triangle';

    main.frequency.setValueAtTime(640, now);
    main.frequency.exponentialRampToValueAtTime(1480, now + 0.11);
    main.frequency.exponentialRampToValueAtTime(590, now + 0.24);
    main.frequency.exponentialRampToValueAtTime(1620, now + 0.36);
    main.frequency.exponentialRampToValueAtTime(430, now + 0.62);

    clash.frequency.setValueAtTime(695, now);
    clash.frequency.exponentialRampToValueAtTime(1590, now + 0.12);
    clash.frequency.exponentialRampToValueAtTime(530, now + 0.26);
    clash.frequency.exponentialRampToValueAtTime(1710, now + 0.38);
    clash.frequency.exponentialRampToValueAtTime(385, now + 0.62);

    sub.frequency.setValueAtTime(215, now);
    sub.frequency.exponentialRampToValueAtTime(310, now + 0.18);
    sub.frequency.exponentialRampToValueAtTime(140, now + 0.62);

    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(29, now);
    lfoGain.gain.setValueAtTime(58, now);
    lfo.connect(lfoGain);
    lfoGain.connect(main.frequency);
    lfoGain.connect(clash.frequency);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(peak, now + 0.04);
    gain.gain.setValueAtTime(peak * 0.86, now + 0.36);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.64);

    main.connect(gain);
    clash.connect(gain);
    sub.connect(gain);
    gain.connect(ctx.destination);

    main.start(now);
    clash.start(now);
    sub.start(now);
    lfo.start(now);

    main.stop(now + 0.65);
    clash.stop(now + 0.65);
    sub.stop(now + 0.65);
    lfo.stop(now + 0.65);
  }

  public playBossWarning() {
    const prof = LEVEL_SFX_PROFILES[this.currentLevel];
    const gapSec = 0.27 / prof.tempoMult;
    this.playTone(230 * prof.pitchMult, 175 * prof.pitchMult, 0.23 / prof.tempoMult, prof.bassWave, 0.095);
    this.playTone(255 * prof.pitchMult, 185 * prof.pitchMult, 0.23 / prof.tempoMult, prof.bassWave, 0.095, gapSec);
  }

  public playComboMilestone(tierIndex: number) {
    const prof = LEVEL_SFX_PROFILES[this.currentLevel];
    const boost = 1 + Math.max(0, tierIndex) * 0.12;
    const dur = 0.14 / prof.tempoMult;
    const notes = [
      prof.scaleNotes[0] * boost,
      prof.scaleNotes[2] * boost,
      prof.scaleNotes[3] * boost,
    ];
    notes.forEach((n, idx) => {
      this.playTone(n, n * 1.08, dur, idx === 2 ? 'triangle' : prof.shootWave, 0.09, idx * 0.048);
    });
  }

  public playSecondaryFire(speciesId: SpeciesId) {
    const prof = LEVEL_SFX_PROFILES[this.currentLevel];
    switch (speciesId) {
      case 'dionaea':
        // Heavy double-jaw metallic chomp + forward slash
        this.playTone(460, 120, 0.14, 'sawtooth', 0.12);
        this.playTone(280, 88, 0.16, 'triangle', 0.1, 0.045);
        break;
      case 'drosera':
        // Elastic mucilage bola fling
        this.playTone(320, 680, 0.12, 'sine', 0.09);
        this.playTone(620, 290, 0.14, 'triangle', 0.08, 0.06);
        break;
      case 'nepenthes':
        // Deep pressurized pitcher mortar launch
        this.playTone(190, 74, 0.22, 'sawtooth', 0.12);
        this.playTone(340, 150, 0.14, 'triangle', 0.08, 0.04);
        break;
      case 'utricularia':
        // Singularity gravity swell
        this.playTone(140, 640, 0.26, 'sine', 0.11);
        this.playTone(480, 180, 0.24, 'triangle', 0.075, 0.06);
        break;
      case 'sarracenia':
        // Supersonic staggered rocket salvo ignition
        for (let i = 0; i < 4; i++) {
          this.playTone(380 + i * 75, 920 + i * 80, 0.11, 'sawtooth', 0.065, i * 0.038);
        }
        break;
      case 'pinguicula':
        // Crystalline prism fan chime
        this.playTone(740, 1180, 0.12, 'triangle', 0.085);
        this.playTone(980, 1480, 0.14, 'sine', 0.07, 0.035);
        break;
      case 'heliamphora':
        // Twin solar helix laser arc
        this.playTone(540 * prof.pitchMult, 1080 * prof.pitchMult, 0.18, 'triangle', 0.1);
        this.playTone(810 * prof.pitchMult, 440 * prof.pitchMult, 0.18, 'sine', 0.08, 0.04);
        break;
      case 'cephalotus':
        // Heavy cluster warhead thump
        this.playTone(170, 58, 0.24, 'square', 0.1);
        this.playTone(420, 210, 0.12, 'sawtooth', 0.08, 0.05);
        break;
    }
  }

  public playAbilitySwap() {
    const prof = LEVEL_SFX_PROFILES[this.currentLevel];
    const base = prof.scaleNotes[1];
    this.playTone(base, base * 1.33, 0.075, 'triangle', 0.08);
    this.playTone(base * 1.5, base * 1.68, 0.085, 'sine', 0.065, 0.045);
  }

  public playInvasionHorn() {
    // Low distant atmospheric air-raid brass swell signaling approaching swarm/dreadnought
    this.playTone(124, 116, 0.62, 'sawtooth', 0.085);
    this.playTone(186, 174, 0.58, 'triangle', 0.065, 0.06);
  }

  public playBatricioMatingCall() {
    // Rhythmic resonant toad mating croaks ("CROAC-CROAC-CROOOAC!") calling poisonous female frogs
    const croaks = [
      { delay: 0.0, f1: 145, f2: 260, dur: 0.18 },
      { delay: 0.24, f1: 158, f2: 285, dur: 0.2 },
      { delay: 0.5, f1: 138, f2: 310, dur: 0.26 },
      { delay: 0.82, f1: 165, f2: 340, dur: 0.28 },
    ];
    for (const c of croaks) {
      this.playTone(c.f1, c.f2, c.dur, 'sawtooth', 0.095, c.delay);
      this.playTone(c.f1 * 0.52, c.f2 * 0.58, c.dur, 'triangle', 0.11, c.delay + 0.015);
    }
  }

  public playRoyAnnoyingMeow() {
    // Sharp, whiny close-range nasal cat meow ("¡ÑAAAU!")
    this.playTone(540, 960, 0.085, 'sawtooth', 0.075, 0);
    this.playTone(960, 480, 0.14, 'sawtooth', 0.07, 0.08);
    this.playTone(1040, 620, 0.12, 'triangle', 0.045, 0.04);
  }

  public playSicarioGunshot() {
    // Punchy noir pistol crack + metallic slide click
    this.playTone(620, 74, 0.075, 'sawtooth', 0.115, 0);
    this.playTone(1240, 190, 0.045, 'square', 0.075, 0);
    this.playTone(185, 52, 0.09, 'triangle', 0.095, 0.01);
  }

  public playPalitoShieldBlock() {
    // Warm crystalline protective chime deflecting enemy attacks
    this.playTone(587.33, 880, 0.1, 'triangle', 0.085, 0);
    this.playTone(1174.66, 1318.5, 0.12, 'sine', 0.065, 0.03);
  }

  public playPalitoCharmWave() {
    // Dreamy romantic harp/glockenspiel arpeggio enamoring all enemies on screen
    const chord = [523.25, 659.25, 783.99, 987.77, 1046.5, 1318.5];
    chord.forEach((freq, idx) => {
      this.playTone(freq, freq * 1.03, 0.28, 'sine', 0.085, idx * 0.055);
      this.playTone(freq * 0.5, freq * 0.51, 0.3, 'triangle', 0.045, idx * 0.055);
    });
  }

  public playFaconSlash() {
    // Crisp gaucho silver facón blade slash
    this.playTone(1480, 380, 0.095, 'sawtooth', 0.085, 0);
    this.playTone(980, 260, 0.11, 'triangle', 0.075, 0.02);
  }

  public playPonchoParry() {
    // Heavy woven wool poncho whip + deflection thud
    this.playTone(340, 140, 0.11, 'triangle', 0.105, 0);
    this.playTone(520, 760, 0.08, 'sine', 0.06, 0.03);
  }

  public playSapucaiCry() {
    // Iconic long Argentine "¡SAPUCAAAAAAIIII!!" gaucho cry (~2.35s) + galloping hoofbeats!
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const peak = 0.125 * this.sfxVolume;
    if (peak <= 0.0005) return;

    const voice = ctx.createOscillator();
    const harm = ctx.createOscillator();
    const vibrato = ctx.createOscillator();
    const vibGain = ctx.createGain();
    const gain = ctx.createGain();

    voice.type = 'sawtooth';
    harm.type = 'triangle';

    // Rising joyful trill -> long soaring high note -> triumphant cadence!
    voice.frequency.setValueAtTime(390, now);
    voice.frequency.exponentialRampToValueAtTime(660, now + 0.18);
    voice.frequency.exponentialRampToValueAtTime(920, now + 0.42);
    voice.frequency.setValueAtTime(960, now + 0.6);
    voice.frequency.exponentialRampToValueAtTime(1080, now + 1.15);
    voice.frequency.exponentialRampToValueAtTime(990, now + 1.85);
    voice.frequency.exponentialRampToValueAtTime(620, now + 2.35);

    harm.frequency.setValueAtTime(585, now);
    harm.frequency.exponentialRampToValueAtTime(1380, now + 0.45);
    harm.frequency.exponentialRampToValueAtTime(1620, now + 1.15);
    harm.frequency.exponentialRampToValueAtTime(930, now + 2.35);

    vibrato.type = 'sine';
    vibrato.frequency.setValueAtTime(10.5, now);
    vibGain.gain.setValueAtTime(24, now);
    vibrato.connect(vibGain);
    vibGain.connect(voice.frequency);

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1150, now);
    filter.Q.setValueAtTime(1.6, now);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(peak, now + 0.12);
    gain.gain.setValueAtTime(peak * 0.94, now + 1.75);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.38);

    voice.connect(filter);
    harm.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    voice.start(now);
    harm.start(now);
    vibrato.start(now);
    voice.stop(now + 2.4);
    harm.stop(now + 2.4);
    vibrato.stop(now + 2.4);

    // Galloping hoofbeats underneath the Sapucai!
    for (let step = 0; step < 9; step++) {
      const t = step * 0.24;
      this.playTone(135, 62, 0.055, 'triangle', 0.08, t);
      this.playTone(160, 74, 0.05, 'triangle', 0.065, t + 0.085);
    }
  }

  public playVictory() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, idx) => {
      this.playTone(n, n * 1.03, 0.24, 'triangle', 0.105, idx * 0.09);
    });
  }
}

export const soundEngine = new AnimeSoundEngine();
