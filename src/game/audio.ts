import {
  WebAudioSoundManager,
  type ExplosionSfxTier,
  type UiSfxKind,
} from './soundManager';
import type { GameStatus, LevelNumber, SpeciesId } from './types';

export type { ExplosionSfxTier, UiSfxKind };

export const AUDIO_PREFS_STORAGE_KEY = 'dionaea_strike_audio_v1';

export const MENU_MUSIC_SRC = 'assets/audio/menu-theme.m4a';
export const LEVEL_1_MUSIC_SRC = 'assets/audio/level-1-pampa.m4a';
export const LEVEL_2_MUSIC_SRC = 'assets/audio/level-2-cumbia.m4a';
export const LEVEL_3_MUSIC_SRC = 'assets/audio/level-3-boombap.m4a';
export const LEVEL_4_MUSIC_SRC = 'assets/audio/level-4-cuarteto.m4a';
export const LEVEL_5_MUSIC_SRC = 'assets/audio/level-5-boss.m4a';

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
  startOffsetSec: number;
  beatsPerSpawn: number;
  trackDurationSec: number;
}

/**
 * Perfiles rítmicos medidos directamente sobre cada pista .m4a real del juego
 * para sincronizar oleadas enemigas y pulso visual con la música de cada nivel.
 */
export const LEVEL_RHYTHM_PROFILES: Record<LevelNumber, LevelRhythmProfile> = {
  1: { bpm: 140, firstDropSec: 0.12, startOffsetSec: 0, beatsPerSpawn: 2.0, trackDurationSec: 164.0 },
  2: { bpm: 96, firstDropSec: 2.0, startOffsetSec: 1.5, beatsPerSpawn: 1.5, trackDurationSec: 65.0 },
  3: { bpm: 118, firstDropSec: 1.82, startOffsetSec: 1.35, beatsPerSpawn: 1.5, trackDurationSec: 180.2 },
  4: { bpm: 146, firstDropSec: 0.35, startOffsetSec: 0, beatsPerSpawn: 1.5, trackDurationSec: 60.0 },
  5: { bpm: 118, firstDropSec: 2.02, startOffsetSec: 1.5, beatsPerSpawn: 1.0, trackDurationSec: 151.1 },
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
  // Nivel 2 (Selva Misionera / Cumbia Villera)
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
  // Nivel 4 (Autopista y Puerto / Cuarteto)
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

function trackIdForState(status: GameStatus, levelIndex: LevelNumber): string {
  return status === 'title' ? 'menu' : `level-${levelIndex}`;
}

class AnimeSoundEngine {
  private readonly manager = new WebAudioSoundManager();
  private currentLevel: LevelNumber = 1;
  private currentStatus: GameStatus = 'title';
  private assetBasePath = '';

  constructor() {
    const prefs = loadSavedAudioPrefs();
    this.manager.setMusicVolume(prefs.musicVolume);
    this.manager.setSfxVolume(prefs.sfxVolume);
  }

  public getManager(): WebAudioSoundManager {
    return this.manager;
  }

  public setAssetBasePath(basePath?: string) {
    const trimmed = basePath ? basePath.replace(/\/+$/, '') : '';
    const nextBase = !trimmed || trimmed === '/' || trimmed === '.' ? '' : trimmed;
    if (nextBase !== this.assetBasePath) {
      this.assetBasePath = nextBase;
    }
  }

  private resolveTrackUrl(trackPath: string): string {
    if (/^https?:\/\//i.test(trackPath)) return trackPath;
    const relative = trackPath.replace(/^\/+/, '');
    if (!this.assetBasePath) return `./${relative}`;
    return `${this.assetBasePath}/${relative}`;
  }

  public preloadTrack(trackPath: string) {
    if (typeof window === 'undefined') return;
    this.manager.preloadBuffer(this.resolveTrackUrl(trackPath));
  }

  public preloadGameAudio(levelIndex?: LevelNumber) {
    if (typeof window === 'undefined') return;
    if (levelIndex === undefined) {
      this.preloadTrack(MENU_MUSIC_SRC);
      return;
    }
    const curTrack = LEVEL_MUSIC_TRACKS[levelIndex];
    if (curTrack) this.preloadTrack(curTrack);
  }

  private persistAudioPrefs() {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(
        AUDIO_PREFS_STORAGE_KEY,
        JSON.stringify({
          musicVolume: Number(this.manager.getMusicVolume().toFixed(2)),
          sfxVolume: Number(this.manager.getSfxVolume().toFixed(2)),
        })
      );
    } catch {
      // Ignore storage errors
    }
  }

  private getMusicGainScale(status: GameStatus): number {
    return status === 'title' ? 0.54 : 0.68;
  }

  public getMusicVolume(): number {
    return this.manager.getMusicVolume();
  }

  public getSfxVolume(): number {
    return this.manager.getSfxVolume();
  }

  public setMusicVolume(volume: number) {
    this.manager.setMusicVolume(clampUnit(volume));
    this.persistAudioPrefs();
  }

  public setSfxVolume(volume: number) {
    this.manager.setSfxVolume(clampUnit(volume));
    this.persistAudioPrefs();
  }

  public setMuted(muted: boolean) {
    this.manager.setMuted(muted);
  }

  public isMuted(): boolean {
    return this.manager.isMuted();
  }

  public setSystemMuted(muted: boolean) {
    this.manager.setSystemMuted(muted);
  }

  public isSystemMuted(): boolean {
    return this.manager.isSystemMuted();
  }

  public isMusicPlayingDesired(): boolean {
    return this.manager.isMusicDesired();
  }

  public setLevel(levelIndex: LevelNumber) {
    this.currentLevel = levelIndex;
  }

  public getMusicTimeSec(expectedLevel?: LevelNumber): number | null {
    const expectedTrackId = expectedLevel !== undefined ? `level-${expectedLevel}` : undefined;
    return this.manager.getMusicPlaybackTime(expectedTrackId);
  }

  public syncMusicTempo(bossActive: boolean, bossPhase: 1 | 2) {
    const targetRate = bossActive && bossPhase === 2 ? 1.06 : 1.0;
    this.manager.setMusicPlaybackRate(targetRate);
  }

  public syncMusic(status: GameStatus, levelIndex: LevelNumber) {
    this.currentLevel = levelIndex;
    this.currentStatus = status;

    const nextSrc = getMusicTrackForState(status, levelIndex);
    if (!nextSrc) {
      this.manager.stopMusic();
      return;
    }

    if (status === 'paused') {
      this.manager.pauseMusic();
      return;
    }

    const startOffsetSec = status === 'title' ? 0 : getLevelRhythmProfile(levelIndex).startOffsetSec;
    this.manager.playMusicLoop(trackIdForState(status, levelIndex), this.resolveTrackUrl(nextSrc), {
      gainScale: this.getMusicGainScale(status),
      playbackRate: status === 'title' ? 1.0 : undefined,
      restart: false,
      startOffsetSec,
    });
  }

  public restartLevelMusic(levelIndex: LevelNumber = 1) {
    this.currentLevel = levelIndex;
    this.currentStatus = 'playing';
    const src = LEVEL_MUSIC_TRACKS[levelIndex] ?? null;
    if (!src) {
      this.manager.stopMusic();
      return;
    }
    const startOffsetSec = getLevelRhythmProfile(levelIndex).startOffsetSec;
    this.manager.playMusicLoop(`level-${levelIndex}`, this.resolveTrackUrl(src), {
      gainScale: this.getMusicGainScale('playing'),
      playbackRate: 1.0,
      restart: true,
      startOffsetSec,
    });
  }

  public unlockMusicOnGesture() {
    this.manager.unlock();
  }

  public stopMusic() {
    this.manager.stopMusic();
  }

  private playTone(
    freqStart: number,
    freqEnd: number,
    duration: number,
    type: OscillatorType,
    gainPeak: number,
    delaySec = 0
  ) {
    this.manager.playTone({
      freqStart,
      freqEnd,
      duration,
      type,
      gainPeak,
      delaySec,
    });
  }

  // ---- UI Interaction SFX ----

  public playUiInteraction(kind: UiSfxKind) {
    this.manager.playUiSfx(kind);
  }

  public playUiClick() {
    this.manager.playUiSfx('click');
  }

  public playUiConfirm() {
    this.manager.playUiSfx('confirm');
  }

  public playUiCancel() {
    this.manager.playUiSfx('cancel');
  }

  public playUiToggle(enabled: boolean) {
    this.manager.playUiSfx(enabled ? 'toggle_on' : 'toggle_off');
  }

  public playUiHover() {
    this.manager.playUiSfx('hover');
  }

  public playUiSfxPreview() {
    this.manager.playUiSfx('confirm');
  }

  // ---- Combat & Weapon SFX ----

  public playShoot(fusionLevel: number, combo = 0) {
    const prof = LEVEL_SFX_PROFILES[this.currentLevel];
    const speedBonus = 1 + Math.min(0.28, combo * 0.015);
    const dur = Math.max(0.042, 0.072 / (prof.tempoMult * speedBonus));
    const base = (540 + fusionLevel * 68) * prof.pitchMult * (1 + Math.min(0.16, combo * 0.01));
    this.manager.playFireSfx({
      baseFreq: base,
      endFreq: base * (this.currentLevel === 2 ? 1.24 : 0.55),
      duration: dur,
      wave: prof.shootWave,
      gain: 0.052,
      addHarmonic: this.currentLevel === 5,
      harmonicStart: base * 1.498,
      harmonicEnd: base * 1.12,
    });
  }

  public playSnapBite() {
    const prof = LEVEL_SFX_PROFILES[this.currentLevel];
    const dur = 0.095 / prof.tempoMult;
    this.playTone(340 * prof.pitchMult, 125 * prof.pitchMult, dur, prof.bassWave, 0.072);
  }

  public playHit(heavy = false) {
    if (!this.manager.allowSfxKey(heavy ? 'hit_heavy' : 'hit', heavy ? 46 : 42)) return;
    const prof = LEVEL_SFX_PROFILES[this.currentLevel];
    const dur = (heavy ? 0.11 : 0.055) / prof.tempoMult;
    if (heavy) {
      this.playTone(230 * prof.pitchMult, 72, dur, prof.hitWave, 0.08);
      this.manager.playNoiseBurst({
        duration: 0.045,
        gainPeak: 0.048,
        filterType: 'bandpass',
        filterFreqStart: 1200,
        filterFreqEnd: 380,
      });
    } else {
      const endFreq = this.currentLevel === 2 ? 620 : 210;
      this.playTone(460 * prof.pitchMult, endFreq, dur, prof.hitWave, 0.042);
    }
  }

  public playShieldClang() {
    if (!this.manager.allowSfxKey('shield_clang', 55)) return;
    this.playTone(980, 420, 0.08, 'square', 0.055);
    this.manager.playNoiseBurst({
      duration: 0.035,
      gainPeak: 0.04,
      filterType: 'highpass',
      filterFreqStart: 2800,
      filterFreqEnd: 1600,
    });
  }

  public playWindGust() {
    this.playTone(210, 460, 0.35, 'sine', 0.075);
    this.playTone(320, 180, 0.35, 'triangle', 0.05, 0.12);
    this.manager.playNoiseBurst({
      duration: 0.42,
      gainPeak: 0.055,
      filterType: 'bandpass',
      filterFreqStart: 500,
      filterFreqEnd: 1250,
      filterQ: 1.5,
    });
  }

  public playExplosion(tier: ExplosionSfxTier = 'medium') {
    const prof = LEVEL_SFX_PROFILES[this.currentLevel];
    this.manager.playExplosionSfx(tier, {
      pitchMult: prof.pitchMult,
      tempoMult: prof.tempoMult,
      bassWave: prof.bassWave,
    });
  }

  public playPlayerHurt() {
    const prof = LEVEL_SFX_PROFILES[this.currentLevel];
    this.playTone(280 * prof.pitchMult, 62, 0.26 / prof.tempoMult, 'sawtooth', 0.15);
    this.manager.playNoiseBurst({
      duration: 0.16,
      gainPeak: 0.11,
      filterType: 'lowpass',
      filterFreqStart: 1400,
      filterFreqEnd: 220,
    });
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
    if (this.manager.isMuted() || this.manager.isSystemMuted() || this.manager.getSfxVolume() <= 0.001) return;
    const ctx = this.manager.ensureContext(false);
    const sfxBus = this.manager.getBusNodes().sfxGain;
    if (!ctx || !sfxBus) return;

    const now = ctx.currentTime;
    const peak = 0.12;

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
    gain.connect(sfxBus);

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
        this.playTone(460, 120, 0.14, 'sawtooth', 0.12);
        this.playTone(280, 88, 0.16, 'triangle', 0.1, 0.045);
        break;
      case 'drosera':
        this.playTone(320, 680, 0.12, 'sine', 0.09);
        this.playTone(620, 290, 0.14, 'triangle', 0.08, 0.06);
        break;
      case 'nepenthes':
        this.playTone(190, 74, 0.22, 'sawtooth', 0.12);
        this.playTone(340, 150, 0.14, 'triangle', 0.08, 0.04);
        break;
      case 'utricularia':
        this.playTone(140, 640, 0.26, 'sine', 0.11);
        this.playTone(480, 180, 0.24, 'triangle', 0.075, 0.06);
        break;
      case 'sarracenia':
        for (let i = 0; i < 4; i++) {
          this.playTone(380 + i * 75, 920 + i * 80, 0.11, 'sawtooth', 0.065, i * 0.038);
        }
        break;
      case 'pinguicula':
        this.playTone(740, 1180, 0.12, 'triangle', 0.085);
        this.playTone(980, 1480, 0.14, 'sine', 0.07, 0.035);
        break;
      case 'heliamphora':
        this.playTone(540 * prof.pitchMult, 1080 * prof.pitchMult, 0.18, 'triangle', 0.1);
        this.playTone(810 * prof.pitchMult, 440 * prof.pitchMult, 0.18, 'sine', 0.08, 0.04);
        break;
      case 'cephalotus':
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
    this.playTone(124, 116, 0.62, 'sawtooth', 0.085);
    this.playTone(186, 174, 0.58, 'triangle', 0.065, 0.06);
  }

  public playBatricioMatingCall() {
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
    this.playTone(540, 960, 0.085, 'sawtooth', 0.075, 0);
    this.playTone(960, 480, 0.14, 'sawtooth', 0.07, 0.08);
    this.playTone(1040, 620, 0.12, 'triangle', 0.045, 0.04);
  }

  public playSicarioGunshot() {
    this.playTone(620, 74, 0.075, 'sawtooth', 0.115, 0);
    this.playTone(1240, 190, 0.045, 'square', 0.075, 0);
    this.playTone(185, 52, 0.09, 'triangle', 0.095, 0.01);
    this.manager.playNoiseBurst({
      duration: 0.04,
      gainPeak: 0.07,
      filterType: 'highpass',
      filterFreqStart: 1800,
      filterFreqEnd: 700,
    });
  }

  public playPalitoShieldBlock() {
    this.playTone(587.33, 880, 0.1, 'triangle', 0.085, 0);
    this.playTone(1174.66, 1318.5, 0.12, 'sine', 0.065, 0.03);
  }

  public playPalitoCharmWave() {
    const chord = [523.25, 659.25, 783.99, 987.77, 1046.5, 1318.5];
    chord.forEach((freq, idx) => {
      this.playTone(freq, freq * 1.03, 0.28, 'sine', 0.085, idx * 0.055);
      this.playTone(freq * 0.5, freq * 0.51, 0.3, 'triangle', 0.045, idx * 0.055);
    });
  }

  public playFaconSlash() {
    this.playTone(1480, 380, 0.095, 'sawtooth', 0.085, 0);
    this.playTone(980, 260, 0.11, 'triangle', 0.075, 0.02);
  }

  public playPonchoParry() {
    this.playTone(340, 140, 0.11, 'triangle', 0.105, 0);
    this.playTone(520, 760, 0.08, 'sine', 0.06, 0.03);
  }

  public playSapucaiCry() {
    if (this.manager.isMuted() || this.manager.isSystemMuted() || this.manager.getSfxVolume() <= 0.001) return;
    const ctx = this.manager.ensureContext(false);
    const sfxBus = this.manager.getBusNodes().sfxGain;
    if (!ctx || !sfxBus) return;

    const now = ctx.currentTime;
    const peak = 0.125;

    const voice = ctx.createOscillator();
    const harm = ctx.createOscillator();
    const vibrato = ctx.createOscillator();
    const vibGain = ctx.createGain();
    const gain = ctx.createGain();

    voice.type = 'sawtooth';
    harm.type = 'triangle';

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
    gain.connect(sfxBus);

    voice.start(now);
    harm.start(now);
    vibrato.start(now);
    voice.stop(now + 2.4);
    harm.stop(now + 2.4);
    vibrato.stop(now + 2.4);

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

  /**
   * Música moderna estilo anime / J-pop de felicitación al derrotar a un Jefe final
   * mientras se abre el portal dimensional.
   */
  public playBossClearAnimeTheme() {
    const melody: Array<{ freq: number; dur: number; delay: number; next?: number }> = [
      { freq: 587.33, dur: 0.14, delay: 0.0 },
      { freq: 659.25, dur: 0.14, delay: 0.12 },
      { freq: 783.99, dur: 0.18, delay: 0.24 },
      { freq: 987.77, dur: 0.28, delay: 0.42 },
      { freq: 880.0, dur: 0.15, delay: 0.72 },
      { freq: 987.77, dur: 0.15, delay: 0.87 },
      { freq: 1174.66, dur: 0.36, delay: 1.02, next: 1244.51 },
      { freq: 1046.5, dur: 0.16, delay: 1.42 },
      { freq: 1174.66, dur: 0.18, delay: 1.58 },
      { freq: 1318.51, dur: 0.32, delay: 1.76 },
      { freq: 1567.98, dur: 0.72, delay: 2.08 },
    ];
    for (const note of melody) {
      this.playTone(note.freq, note.next ?? note.freq * 1.015, note.dur, 'triangle', 0.095, note.delay);
      this.playTone(note.freq * 0.5, note.freq * 0.5, note.dur * 0.9, 'sawtooth', 0.042, note.delay);
    }

    const chords: Array<{ delay: number; root: number; triad: [number, number, number] }> = [
      { delay: 0.0, root: 196.0, triad: [392.0, 493.88, 587.33] },
      { delay: 0.7, root: 220.0, triad: [440.0, 554.37, 659.25] },
      { delay: 1.4, root: 246.94, triad: [493.88, 622.25, 739.99] },
      { delay: 2.08, root: 261.63, triad: [523.25, 659.25, 783.99] },
    ];
    for (const ch of chords) {
      this.playTone(ch.root, ch.root, 0.3, 'sawtooth', 0.068, ch.delay);
      this.playTone(ch.root * 2, ch.root * 2, 0.16, 'triangle', 0.055, ch.delay + 0.32);
      for (const f of ch.triad) {
        this.playTone(f, f * 1.006, 0.55, 'sine', 0.045, ch.delay);
      }
    }

    const sparkles = [1046.5, 1318.51, 1567.98, 2093.0];
    sparkles.forEach((freq, idx) => {
      this.playTone(freq, freq * 1.02, 0.42, 'sine', 0.06, 2.24 + idx * 0.075);
    });
  }

  public playPortalOpen() {
    this.playTone(220, 880, 0.52, 'sine', 0.095, 0);
    this.playTone(330, 1320, 0.56, 'triangle', 0.065, 0.08);
    this.playTone(660, 440, 0.48, 'sine', 0.05, 0.35);
  }

  public playSuperSaiyanTransform() {
    this.playTone(140, 620, 0.28, 'sawtooth', 0.11, 0);
    this.playTone(210, 930, 0.32, 'triangle', 0.095, 0.04);
    const burst = [523.25, 659.25, 783.99, 1046.5, 1318.51];
    burst.forEach((f, idx) => {
      this.playTone(f, f * 1.04, 0.36, 'triangle', 0.085, 0.12 + idx * 0.055);
    });
  }

  public playIntroTransitionSfx() {
    this.manager.playNoiseBurst({
      duration: 0.34,
      gainPeak: 0.09,
      filterType: 'bandpass',
      filterFreqStart: 360,
      filterFreqEnd: 2400,
      filterQ: 1.4,
    });
    this.playTone(392.0, 587.33, 0.18, 'triangle', 0.065, 0.08);
    this.playTone(587.33, 880.0, 0.26, 'sine', 0.075, 0.24);
  }
}

export const soundEngine = new AnimeSoundEngine();
