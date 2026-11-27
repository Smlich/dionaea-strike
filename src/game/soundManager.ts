/**
 * Pure Web Audio API Sound Manager
 * Handles unified audio bus routing (master -> compressor -> destination, with separate music & SFX buses),
 * gapless AudioBufferSourceNode background music looping with pause/resume/rate-synced clock tracking,
 * and triggered procedural Web Audio SFX for firing, explosions, and UI interactions.
 */

export type UiSfxKind = 'click' | 'confirm' | 'cancel' | 'toggle_on' | 'toggle_off' | 'hover';

export type ExplosionSfxTier = 'small' | 'medium' | 'heavy' | 'boss';

export interface ToneOptions {
  freqStart: number;
  freqEnd: number;
  duration: number;
  type?: OscillatorType;
  gainPeak: number;
  delaySec?: number;
  jitterRatio?: number;
  filterType?: BiquadFilterType;
  filterFreq?: number;
  filterQ?: number;
}

export interface NoiseBurstOptions {
  duration: number;
  gainPeak: number;
  delaySec?: number;
  filterType?: BiquadFilterType;
  filterFreqStart?: number;
  filterFreqEnd?: number;
  filterQ?: number;
}

export interface MusicLoopOptions {
  gainScale?: number;
  playbackRate?: number;
  restart?: boolean;
  startOffsetSec?: number;
}

export interface FireSfxOptions {
  baseFreq?: number;
  endFreq?: number;
  duration?: number;
  wave?: OscillatorType;
  gain?: number;
  addHarmonic?: boolean;
  harmonicStart?: number;
  harmonicEnd?: number;
}

export interface ExplosionSfxOptions {
  pitchMult?: number;
  tempoMult?: number;
  bassWave?: OscillatorType;
}

export interface SoundManagerDeps {
  createContext?: () => AudioContext | null;
  fetchAudioBuffer?: (ctx: AudioContext, url: string) => Promise<AudioBuffer | null>;
  nowMs?: () => number;
}

function clampUnit(value: number, fallback = 0.7): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(0, Math.min(1, value));
}

function defaultCreateContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return null;
  try {
    return new AudioCtx();
  } catch {
    return null;
  }
}

async function defaultFetchAudioBuffer(ctx: AudioContext, url: string): Promise<AudioBuffer | null> {
  if (typeof fetch !== 'function') return null;
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const raw = await response.arrayBuffer();
    if (!raw || raw.byteLength === 0) return null;
    return await ctx.decodeAudioData(raw.slice(0));
  } catch {
    return null;
  }
}

export class WebAudioSoundManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  private muted = false;
  private systemMuted = false;
  private musicVolume = 0.65;
  private sfxVolume = 0.75;
  private musicGainScale = 0.68;

  // Gapless Web Audio music loop state
  private readonly bufferCache = new Map<string, AudioBuffer>();
  private readonly pendingLoads = new Map<string, Promise<AudioBuffer | null>>();
  private activeMusicSource: AudioBufferSourceNode | null = null;
  private activeMusicBuffer: AudioBuffer | null = null;
  private activeTrackId: string | null = null;
  private desiredTrackId: string | null = null;
  private desiredTrackUrl: string | null = null;
  private musicShouldPlay = false;
  private musicPaused = false;
  private musicPlaybackRate = 1.0;
  private musicStartCtxTime = 0;
  private musicOffsetSec = 0;
  private musicRequestToken = 0;

  // Lightweight SFX voice rate-limiter to avoid harsh stacking on same-frame bursts
  private readonly lastTriggerMs = new Map<string, number>();

  private readonly createContextFn: () => AudioContext | null;
  private readonly fetchAudioBufferFn: (ctx: AudioContext, url: string) => Promise<AudioBuffer | null>;
  private readonly nowMsFn: () => number;

  constructor(deps: SoundManagerDeps = {}) {
    this.createContextFn = deps.createContext ?? defaultCreateContext;
    this.fetchAudioBufferFn = deps.fetchAudioBuffer ?? defaultFetchAudioBuffer;
    this.nowMsFn = deps.nowMs ?? (() => (typeof performance !== 'undefined' ? performance.now() : Date.now()));
  }

  public getContext(): AudioContext | null {
    return this.ctx;
  }

  public getMusicVolume(): number {
    return this.musicVolume;
  }

  public getSfxVolume(): number {
    return this.sfxVolume;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public isSystemMuted(): boolean {
    return this.systemMuted;
  }

  private isEffectivelyMuted(): boolean {
    return this.muted || this.systemMuted;
  }

  public getActiveTrackId(): string | null {
    return this.activeTrackId;
  }

  public isMusicPlaying(): boolean {
    return Boolean(this.activeMusicSource && this.activeMusicBuffer && !this.musicPaused && !this.isEffectivelyMuted());
  }

  public isMusicDesired(): boolean {
    return this.musicShouldPlay;
  }

  public preloadBuffer(url: string): void {
    if (!url || this.bufferCache.has(url) || this.pendingLoads.has(url)) return;
    if (!this.ctx) {
      // Warm HTTP cache safely before AudioContext gesture unlock without creating a suspended context
      if (typeof fetch === 'function' && typeof window !== 'undefined') {
        void fetch(url).catch(() => {});
      }
      return;
    }
    void this.loadTrackBuffer(this.ctx, url);
  }

  public getBusNodes(): {
    masterGain: GainNode | null;
    musicGain: GainNode | null;
    sfxGain: GainNode | null;
    compressor: DynamicsCompressorNode | null;
  } {
    return {
      masterGain: this.masterGain,
      musicGain: this.musicGain,
      sfxGain: this.sfxGain,
      compressor: this.compressor,
    };
  }

  public ensureContext(allowWhenMuted = false): AudioContext | null {
    if (!allowWhenMuted && this.isEffectivelyMuted()) return null;
    if (!this.ctx) {
      const created = this.createContextFn();
      if (!created) return null;
      this.ctx = created;
      this.initAudioGraph(created);
    }
    if (this.ctx.state === 'suspended') {
      try {
        const res = this.ctx.resume();
        if (res && typeof res.catch === 'function') {
          res.catch(() => {});
        }
      } catch {
        // Ignore autoplay restriction until user gesture
      }
    }
    return this.ctx;
  }

  private initAudioGraph(ctx: AudioContext) {
    this.masterGain = ctx.createGain();
    this.musicGain = ctx.createGain();
    this.sfxGain = ctx.createGain();

    this.musicGain.connect(this.masterGain);
    this.sfxGain.connect(this.masterGain);

    if (typeof ctx.createDynamicsCompressor === 'function') {
      try {
        const comp = ctx.createDynamicsCompressor();
        comp.threshold?.setValueAtTime?.(-14, ctx.currentTime);
        comp.knee?.setValueAtTime?.(18, ctx.currentTime);
        comp.ratio?.setValueAtTime?.(6, ctx.currentTime);
        comp.attack?.setValueAtTime?.(0.003, ctx.currentTime);
        comp.release?.setValueAtTime?.(0.18, ctx.currentTime);
        this.masterGain.connect(comp);
        comp.connect(ctx.destination);
        this.compressor = comp;
      } catch {
        this.masterGain.connect(ctx.destination);
        this.compressor = null;
      }
    } else {
      this.masterGain.connect(ctx.destination);
      this.compressor = null;
    }

    this.applyBusGains(true);
  }

  private setGainSmooth(node: GainNode | null, value: number, immediate = false) {
    if (!node || !this.ctx) return;
    const safe = Number.isFinite(value) ? Math.max(0, Math.min(1.5, value)) : 0;
    const now = this.ctx.currentTime;
    try {
      if (immediate || typeof node.gain.setTargetAtTime !== 'function') {
        if (typeof node.gain.setValueAtTime === 'function') {
          node.gain.setValueAtTime(safe, now);
        } else {
          node.gain.value = safe;
        }
      } else {
        node.gain.setTargetAtTime(safe, now, 0.025);
      }
    } catch {
      node.gain.value = safe;
    }
  }

  private applyBusGains(immediate = false) {
    this.setGainSmooth(this.masterGain, this.isEffectivelyMuted() ? 0 : 1, immediate);
    this.setGainSmooth(this.musicGain, clampUnit(this.musicVolume * this.musicGainScale, 0), immediate);
    this.setGainSmooth(this.sfxGain, clampUnit(this.sfxVolume, 0), immediate);
  }

  private syncEffectiveMuteTransition() {
    this.applyBusGains(false);
    if (this.isEffectivelyMuted()) {
      if (this.activeMusicSource && !this.musicPaused) {
        this.snapshotCurrentOffset();
        this.stopActiveSourceOnly();
      }
    } else if (this.musicShouldPlay && !this.musicPaused && this.musicVolume > 0.001) {
      this.startDesiredTrackIfPossible();
    }
  }

  public setMuted(muted: boolean) {
    this.muted = Boolean(muted);
    this.syncEffectiveMuteTransition();
  }

  /**
   * Temporary system-level mute (e.g., browser tab hidden or window blur)
   * that preserves the player's own manual mute setting when cleared.
   */
  public setSystemMuted(muted: boolean) {
    const next = Boolean(muted);
    if (this.systemMuted === next) return;
    this.systemMuted = next;
    this.syncEffectiveMuteTransition();
  }

  public setMusicVolume(volume: number) {
    this.musicVolume = clampUnit(volume, 0.65);
    this.applyBusGains(false);
    if (this.musicVolume <= 0.001) {
      if (this.activeMusicSource && !this.musicPaused) {
        this.snapshotCurrentOffset();
        this.stopActiveSourceOnly();
      }
    } else if (this.musicShouldPlay && !this.musicPaused && !this.isEffectivelyMuted() && !this.activeMusicSource) {
      this.startDesiredTrackIfPossible();
    }
  }

  public setSfxVolume(volume: number) {
    this.sfxVolume = clampUnit(volume, 0.75);
    this.applyBusGains(false);
  }

  public setMusicGainScale(scale: number) {
    this.musicGainScale = clampUnit(scale, 0.68);
    this.applyBusGains(false);
  }

  public unlock() {
    const ctx = this.ensureContext(true);
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      try {
        const p = ctx.resume();
        if (p && typeof p.then === 'function') {
          p.then(() => {
            if (this.musicShouldPlay && !this.musicPaused && !this.isEffectivelyMuted() && this.musicVolume > 0.001) {
              this.startDesiredTrackIfPossible();
            }
          }).catch(() => {});
        }
      } catch {
        // Ignore resume failure
      }
    } else if (this.musicShouldPlay && !this.musicPaused && !this.isEffectivelyMuted() && this.musicVolume > 0.001) {
      if (!this.activeMusicSource) {
        this.startDesiredTrackIfPossible();
      }
    }
  }

  private snapshotCurrentOffset() {
    if (!this.activeMusicSource || !this.activeMusicBuffer || !this.ctx) return;
    const duration = this.activeMusicBuffer.duration;
    if (!Number.isFinite(duration) || duration <= 0) {
      this.musicOffsetSec = 0;
      return;
    }
    const elapsed = Math.max(0, this.ctx.currentTime - this.musicStartCtxTime) * this.musicPlaybackRate;
    this.musicOffsetSec = (this.musicOffsetSec + elapsed) % duration;
    this.musicStartCtxTime = this.ctx.currentTime;
  }

  private stopActiveSourceOnly() {
    if (this.activeMusicSource) {
      try {
        this.activeMusicSource.onended = null;
        this.activeMusicSource.stop();
      } catch {
        // Already stopped
      }
      try {
        this.activeMusicSource.disconnect();
      } catch {
        // Already disconnected
      }
      this.activeMusicSource = null;
    }
  }

  private async loadTrackBuffer(ctx: AudioContext, url: string): Promise<AudioBuffer | null> {
    const cached = this.bufferCache.get(url);
    if (cached) return cached;

    const existing = this.pendingLoads.get(url);
    if (existing) return existing;

    const promise = this.fetchAudioBufferFn(ctx, url)
      .then((buf) => {
        if (buf && Number.isFinite(buf.duration) && buf.duration > 0) {
          this.bufferCache.set(url, buf);
          return buf;
        }
        return null;
      })
      .catch(() => null)
      .finally(() => {
        this.pendingLoads.delete(url);
      });

    this.pendingLoads.set(url, promise);
    return promise;
  }

  private startBufferLoop(ctx: AudioContext, trackId: string, buffer: AudioBuffer) {
    if (!this.musicGain) return;
    this.stopActiveSourceOnly();

    const duration = buffer.duration;
    const safeOffset = Number.isFinite(duration) && duration > 0
      ? ((this.musicOffsetSec % duration) + duration) % duration
      : 0;

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.loopStart = 0;
    source.loopEnd = duration;
    if (source.playbackRate && typeof source.playbackRate.setValueAtTime === 'function') {
      source.playbackRate.setValueAtTime(this.musicPlaybackRate, ctx.currentTime);
    } else if (source.playbackRate) {
      source.playbackRate.value = this.musicPlaybackRate;
    }

    source.connect(this.musicGain);
    source.start(0, safeOffset);

    this.activeMusicSource = source;
    this.activeMusicBuffer = buffer;
    this.activeTrackId = trackId;
    this.musicOffsetSec = safeOffset;
    this.musicStartCtxTime = ctx.currentTime;
    this.musicPaused = false;
  }

  private startDesiredTrackIfPossible() {
    if (!this.desiredTrackId || !this.desiredTrackUrl) return;
    if (!this.musicShouldPlay || this.musicPaused || this.isEffectivelyMuted() || this.musicVolume <= 0.001) return;

    const ctx = this.ensureContext(true);
    if (!ctx) return;

    const trackId = this.desiredTrackId;
    const url = this.desiredTrackUrl;
    const cached = this.bufferCache.get(url);
    if (cached) {
      if (this.activeTrackId !== trackId || !this.activeMusicSource) {
        this.startBufferLoop(ctx, trackId, cached);
      }
      return;
    }

    const token = ++this.musicRequestToken;
    void this.loadTrackBuffer(ctx, url).then((buffer) => {
      if (!buffer) return;
      if (
        token !== this.musicRequestToken ||
        this.desiredTrackId !== trackId ||
        !this.musicShouldPlay ||
        this.musicPaused ||
        this.isEffectivelyMuted() ||
        this.musicVolume <= 0.001
      ) {
        return;
      }
      this.startBufferLoop(ctx, trackId, buffer);
    });
  }

  public playMusicLoop(trackId: string, url: string, options: MusicLoopOptions = {}) {
    if (options.gainScale !== undefined) {
      this.musicGainScale = clampUnit(options.gainScale, this.musicGainScale);
    }
    if (options.playbackRate !== undefined && Number.isFinite(options.playbackRate)) {
      this.setMusicPlaybackRate(options.playbackRate);
    }

    const isSameTrack = this.desiredTrackId === trackId && this.desiredTrackUrl === url;
    this.desiredTrackId = trackId;
    this.desiredTrackUrl = url;
    this.musicShouldPlay = true;
    this.applyBusGains(false);

    if (isSameTrack && !options.restart) {
      if (this.musicPaused) {
        this.resumeMusic();
        return;
      }
      if (!this.activeMusicSource && !this.isEffectivelyMuted() && this.musicVolume > 0.001) {
        this.startDesiredTrackIfPossible();
      }
      return;
    }

    // Track change or explicit restart: reset playback offset cleanly (respecting optional startOffsetSec)
    this.musicRequestToken += 1;
    this.stopActiveSourceOnly();
    this.activeMusicBuffer = null;
    this.activeTrackId = null;
    const rawOffset = options.startOffsetSec ?? 0;
    this.musicOffsetSec = Number.isFinite(rawOffset) && rawOffset > 0 ? rawOffset : 0;
    this.musicPaused = false;

    if (!this.isEffectivelyMuted() && this.musicVolume > 0.001) {
      this.startDesiredTrackIfPossible();
    }
  }

  public pauseMusic() {
    if (!this.musicShouldPlay && !this.activeMusicSource) return;
    this.snapshotCurrentOffset();
    this.stopActiveSourceOnly();
    this.musicPaused = true;
  }

  public resumeMusic() {
    if (!this.desiredTrackId || !this.desiredTrackUrl) return;
    this.musicShouldPlay = true;
    this.musicPaused = false;
    if (!this.isEffectivelyMuted() && this.musicVolume > 0.001) {
      this.startDesiredTrackIfPossible();
    }
  }

  public stopMusic() {
    this.musicRequestToken += 1;
    this.stopActiveSourceOnly();
    this.activeMusicBuffer = null;
    this.activeTrackId = null;
    this.desiredTrackId = null;
    this.desiredTrackUrl = null;
    this.musicShouldPlay = false;
    this.musicPaused = false;
    this.musicOffsetSec = 0;
  }

  public setMusicPlaybackRate(rate: number) {
    const safeRate = Number.isFinite(rate) ? Math.max(0.5, Math.min(2.0, rate)) : 1.0;
    if (Math.abs(this.musicPlaybackRate - safeRate) < 0.004) return;
    if (this.activeMusicSource && !this.musicPaused) {
      this.snapshotCurrentOffset();
      if (this.ctx && this.activeMusicSource.playbackRate) {
        try {
          if (typeof this.activeMusicSource.playbackRate.setValueAtTime === 'function') {
            this.activeMusicSource.playbackRate.setValueAtTime(safeRate, this.ctx.currentTime);
          } else {
            this.activeMusicSource.playbackRate.value = safeRate;
          }
        } catch {
          // Ignore playbackRate error
        }
      }
    }
    this.musicPlaybackRate = safeRate;
  }

  public getMusicPlaybackTime(expectedTrackId?: string): number | null {
    if (
      this.isEffectivelyMuted() ||
      this.musicVolume <= 0.001 ||
      this.musicPaused ||
      !this.activeMusicSource ||
      !this.activeMusicBuffer ||
      !this.ctx
    ) {
      return null;
    }
    if (this.ctx.state !== 'running') {
      return null;
    }
    if (expectedTrackId !== undefined && this.activeTrackId !== expectedTrackId) {
      return null;
    }
    const duration = this.activeMusicBuffer.duration;
    if (!Number.isFinite(duration) || duration <= 0) return null;
    const elapsed = Math.max(0, this.ctx.currentTime - this.musicStartCtxTime) * this.musicPlaybackRate;
    const current = (this.musicOffsetSec + elapsed) % duration;
    return Number.isFinite(current) ? current : null;
  }

  private allowTrigger(tag: string, minIntervalMs: number): boolean {
    if (minIntervalMs <= 0) return true;
    const now = this.nowMsFn();
    const prev = this.lastTriggerMs.get(tag) ?? -Infinity;
    if (now - prev < minIntervalMs) {
      return false;
    }
    this.lastTriggerMs.set(tag, now);
    return true;
  }

  private getNoiseBuffer(ctx: AudioContext): AudioBuffer | null {
    if (this.noiseBuffer) return this.noiseBuffer;
    if (typeof ctx.createBuffer !== 'function') return null;
    const sampleRate = Math.max(8000, ctx.sampleRate || 44100);
    const length = Math.floor(sampleRate * 1.0);
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const channel = buffer.getChannelData(0);
    // Deterministic xorshift PRNG for crisp repeatable white noise
    let seed = 0x12345678;
    for (let i = 0; i < length; i++) {
      seed ^= seed << 13;
      seed ^= seed >>> 17;
      seed ^= seed << 5;
      channel[i] = ((seed >>> 0) / 0xffffffff) * 2 - 1;
    }
    this.noiseBuffer = buffer;
    return buffer;
  }

  public playTone(options: ToneOptions): boolean {
    if (this.isEffectivelyMuted() || this.sfxVolume <= 0.001) return false;
    const ctx = this.ensureContext(false);
    if (!ctx || !this.sfxGain) return false;

    const peak = Math.max(0, options.gainPeak);
    if (peak <= 0.0005 || options.duration <= 0) return false;

    const delay = Math.max(0, options.delaySec ?? 0);
    const dur = Math.max(0.015, options.duration);
    const now = ctx.currentTime + delay;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = options.type ?? 'triangle';

    const jitterRatio = options.jitterRatio ?? 0.08;
    const jitter = jitterRatio > 0 ? 1 + (Math.random() - 0.5) * jitterRatio : 1;
    const fStart = Math.max(32, options.freqStart * jitter);
    const fEnd = Math.max(32, options.freqEnd * jitter);

    osc.frequency.setValueAtTime(fStart, now);
    osc.frequency.exponentialRampToValueAtTime(fEnd, now + dur);

    gain.gain.setValueAtTime(0.0008, now);
    gain.gain.linearRampToValueAtTime(peak, now + Math.min(0.012, dur * 0.28));
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    let filter: BiquadFilterNode | null = null;
    if (options.filterType && typeof ctx.createBiquadFilter === 'function') {
      filter = ctx.createBiquadFilter();
      filter.type = options.filterType;
      filter.frequency.setValueAtTime(Math.max(60, options.filterFreq ?? 1200), now);
      if (options.filterQ !== undefined) {
        filter.Q.setValueAtTime(options.filterQ, now);
      }
      osc.connect(filter);
      filter.connect(gain);
    } else {
      osc.connect(gain);
    }

    gain.connect(this.sfxGain);
    osc.onended = () => {
      try {
        osc.disconnect();
        filter?.disconnect();
        gain.disconnect();
      } catch {
        // Ignore cleanup errors
      }
    };

    osc.start(now);
    osc.stop(now + dur + 0.015);
    return true;
  }

  public playNoiseBurst(options: NoiseBurstOptions): boolean {
    if (this.isEffectivelyMuted() || this.sfxVolume <= 0.001) return false;
    const ctx = this.ensureContext(false);
    if (!ctx || !this.sfxGain) return false;

    const noiseBuf = this.getNoiseBuffer(ctx);
    if (!noiseBuf) return false;

    const peak = Math.max(0, options.gainPeak);
    const dur = Math.max(0.02, Math.min(0.95, options.duration));
    if (peak <= 0.0005) return false;

    const now = ctx.currentTime + Math.max(0, options.delaySec ?? 0);
    const source = ctx.createBufferSource();
    source.buffer = noiseBuf;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0008, now);
    gain.gain.linearRampToValueAtTime(peak, now + Math.min(0.01, dur * 0.2));
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    let filter: BiquadFilterNode | null = null;
    if (typeof ctx.createBiquadFilter === 'function') {
      filter = ctx.createBiquadFilter();
      filter.type = options.filterType ?? 'lowpass';
      const fStart = Math.max(80, options.filterFreqStart ?? 1600);
      const fEnd = Math.max(60, options.filterFreqEnd ?? 240);
      filter.frequency.setValueAtTime(fStart, now);
      filter.frequency.exponentialRampToValueAtTime(fEnd, now + dur);
      if (options.filterQ !== undefined) {
        filter.Q.setValueAtTime(options.filterQ, now);
      }
      source.connect(filter);
      filter.connect(gain);
    } else {
      source.connect(gain);
    }

    gain.connect(this.sfxGain);
    source.onended = () => {
      try {
        source.disconnect();
        filter?.disconnect();
        gain.disconnect();
      } catch {
        // Ignore cleanup errors
      }
    };

    source.start(now);
    source.stop(now + dur + 0.015);
    return true;
  }

  public allowSfxKey(key: string, minIntervalMs: number): boolean {
    return this.allowTrigger(key, minIntervalMs);
  }

  /**
   * High-level Firing SFX (rate-limited for rapid fire clarity + crisp noise transient)
   */
  public playFireSfx(options: FireSfxOptions = {}): boolean {
    if (!this.allowTrigger('fire', 42)) return false;
    const baseFreq = options.baseFreq ?? 580;
    const endFreq = options.endFreq ?? baseFreq * 0.52;
    const duration = options.duration ?? 0.07;
    const wave = options.wave ?? 'triangle';
    const gain = options.gain ?? 0.055;

    const played = this.playTone({
      freqStart: baseFreq,
      freqEnd: endFreq,
      duration,
      type: wave,
      gainPeak: gain,
    });
    if (!played) return false;

    // Subtle crisp muzzle pop
    this.playNoiseBurst({
      duration: Math.min(0.032, duration * 0.45),
      gainPeak: gain * 0.45,
      filterType: 'highpass',
      filterFreqStart: 2400,
      filterFreqEnd: 1100,
      filterQ: 0.9,
    });

    if (options.addHarmonic) {
      this.playTone({
        freqStart: options.harmonicStart ?? baseFreq * 1.498,
        freqEnd: options.harmonicEnd ?? baseFreq * 1.12,
        duration: duration * 0.85,
        type: 'sine',
        gainPeak: gain * 0.55,
        delaySec: duration * 0.4,
      });
    }
    return true;
  }

  /**
   * High-level Explosion SFX (layered Web Audio filtered noise blast + sub-bass thump)
   */
  public playExplosionSfx(tier: ExplosionSfxTier = 'medium', options: ExplosionSfxOptions = {}): boolean {
    const minInterval = tier === 'boss' ? 20 : 40;
    if (!this.allowTrigger(`explosion_${tier}`, minInterval)) return false;

    const pitchMult = options.pitchMult ?? 1.0;
    const tempoMult = options.tempoMult ?? 1.0;
    const bassWave = options.bassWave ?? 'sawtooth';

    const scale =
      tier === 'boss'
        ? { dur: 0.48, subGain: 0.2, noiseGain: 0.17, cutoffStart: 2600, cutoffEnd: 120, punchFreq: 210 }
        : tier === 'heavy'
          ? { dur: 0.32, subGain: 0.16, noiseGain: 0.135, cutoffStart: 2200, cutoffEnd: 160, punchFreq: 185 }
          : tier === 'small'
            ? { dur: 0.17, subGain: 0.1, noiseGain: 0.085, cutoffStart: 2400, cutoffEnd: 320, punchFreq: 240 }
            : { dur: 0.24, subGain: 0.13, noiseGain: 0.11, cutoffStart: 2100, cutoffEnd: 210, punchFreq: 190 };

    const dur = scale.dur / Math.max(0.75, tempoMult);

    // 1. Sub-bass chest punch
    const played = this.playTone({
      freqStart: Math.max(70, scale.punchFreq * pitchMult),
      freqEnd: 36,
      duration: dur,
      type: bassWave,
      gainPeak: scale.subGain,
      filterType: 'lowpass',
      filterFreq: 520,
    });
    if (!played) return false;

    // 2. Filtered explosion noise blast
    this.playNoiseBurst({
      duration: dur * 1.05,
      gainPeak: scale.noiseGain,
      filterType: 'lowpass',
      filterFreqStart: scale.cutoffStart,
      filterFreqEnd: scale.cutoffEnd,
      filterQ: tier === 'boss' ? 1.4 : 0.9,
    });

    // 3. High-energy crunch / secondary detonation for heavy & boss explosions
    if (tier === 'heavy' || tier === 'boss') {
      this.playNoiseBurst({
        duration: dur * 0.55,
        gainPeak: scale.noiseGain * 0.65,
        delaySec: 0.055,
        filterType: 'bandpass',
        filterFreqStart: 1450,
        filterFreqEnd: 280,
        filterQ: 1.3,
      });
    }
    if (tier === 'boss') {
      this.playTone({
        freqStart: 130,
        freqEnd: 32,
        duration: dur * 1.15,
        type: 'sine',
        gainPeak: 0.22,
        delaySec: 0.06,
      });
    }
    return true;
  }

  /**
   * High-level UI Interaction SFX (crisp non-fatiguing feedback for buttons, modals, and toggles)
   */
  public playUiSfx(kind: UiSfxKind): boolean {
    if (!this.allowTrigger(`ui_${kind}`, 25)) return false;

    switch (kind) {
      case 'click':
        return this.playTone({
          freqStart: 560,
          freqEnd: 740,
          duration: 0.055,
          type: 'triangle',
          gainPeak: 0.075,
          jitterRatio: 0.02,
        });
      case 'confirm': {
        const ok = this.playTone({
          freqStart: 523.25,
          freqEnd: 659.25,
          duration: 0.075,
          type: 'triangle',
          gainPeak: 0.09,
          jitterRatio: 0,
        });
        if (!ok) return false;
        this.playTone({
          freqStart: 783.99,
          freqEnd: 1046.5,
          duration: 0.11,
          type: 'sine',
          gainPeak: 0.08,
          delaySec: 0.05,
          jitterRatio: 0,
        });
        return true;
      }
      case 'cancel': {
        const ok = this.playTone({
          freqStart: 460,
          freqEnd: 310,
          duration: 0.08,
          type: 'triangle',
          gainPeak: 0.075,
          jitterRatio: 0,
        });
        if (!ok) return false;
        this.playTone({
          freqStart: 310,
          freqEnd: 220,
          duration: 0.08,
          type: 'sine',
          gainPeak: 0.06,
          delaySec: 0.045,
          jitterRatio: 0,
        });
        return true;
      }
      case 'toggle_on': {
        const ok = this.playTone({
          freqStart: 480,
          freqEnd: 720,
          duration: 0.065,
          type: 'triangle',
          gainPeak: 0.08,
          jitterRatio: 0,
        });
        if (!ok) return false;
        this.playTone({
          freqStart: 720,
          freqEnd: 960,
          duration: 0.07,
          type: 'sine',
          gainPeak: 0.065,
          delaySec: 0.04,
          jitterRatio: 0,
        });
        return true;
      }
      case 'toggle_off':
        return this.playTone({
          freqStart: 620,
          freqEnd: 360,
          duration: 0.075,
          type: 'triangle',
          gainPeak: 0.075,
          jitterRatio: 0,
        });
      case 'hover':
        return this.playTone({
          freqStart: 760,
          freqEnd: 840,
          duration: 0.032,
          type: 'sine',
          gainPeak: 0.03,
          jitterRatio: 0.02,
        });
    }
  }
}
