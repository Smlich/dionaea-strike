import test from 'node:test';
import assert from 'node:assert/strict';
import { WebAudioSoundManager, type UiSfxKind } from './soundManager';

interface FakeParam {
  value: number;
  lastTarget?: number;
  setValueAtTime: (v: number, t: number) => void;
  linearRampToValueAtTime: (v: number, t: number) => void;
  exponentialRampToValueAtTime: (v: number, t: number) => void;
  setTargetAtTime: (v: number, t: number, tc: number) => void;
}

function makeFakeParam(initial = 1): FakeParam {
  const param: FakeParam = {
    value: initial,
    setValueAtTime(v: number) {
      param.value = v;
    },
    linearRampToValueAtTime(v: number) {
      param.value = v;
    },
    exponentialRampToValueAtTime(v: number) {
      param.value = v;
    },
    setTargetAtTime(v: number) {
      param.value = v;
      param.lastTarget = v;
    },
  };
  return param;
}

interface FakeNode {
  connections: unknown[];
  connect: (dest: unknown) => unknown;
  disconnect: () => void;
}

interface FakeBufferSource extends FakeNode {
  buffer: AudioBuffer | null;
  loop: boolean;
  loopStart: number;
  loopEnd: number;
  playbackRate: FakeParam;
  startedAt: number | null;
  startOffset: number | null;
  stopped: boolean;
  onended: (() => void) | null;
  start: (when?: number, offset?: number) => void;
  stop: (when?: number) => void;
}

interface FakeOscillator extends FakeNode {
  type: OscillatorType;
  frequency: FakeParam;
  started: boolean;
  stopped: boolean;
  onended: (() => void) | null;
  start: (when?: number) => void;
  stop: (when?: number) => void;
}

interface FakeFilter extends FakeNode {
  type: BiquadFilterType;
  frequency: FakeParam;
  Q: FakeParam;
}

interface FakeAudioContextHarness {
  ctx: AudioContext;
  advanceTime: (sec: number) => void;
  setState: (s: AudioContextState) => void;
  gains: Array<FakeNode & { gain: FakeParam }>;
  oscillators: FakeOscillator[];
  bufferSources: FakeBufferSource[];
  filters: FakeFilter[];
  compressors: FakeNode[];
  resumeCalls: number;
}

function createFakeAudioContext(initialState: AudioContextState = 'running'): FakeAudioContextHarness {
  let currentTime = 0;
  let state: AudioContextState = initialState;
  const gains: Array<FakeNode & { gain: FakeParam }> = [];
  const oscillators: FakeOscillator[] = [];
  const bufferSources: FakeBufferSource[] = [];
  const filters: FakeFilter[] = [];
  const compressors: FakeNode[] = [];
  let resumeCalls = 0;

  const destination = { kind: 'destination' };

  const makeNode = (): FakeNode => {
    const node: FakeNode = {
      connections: [],
      connect(dest: unknown) {
        node.connections.push(dest);
        return dest;
      },
      disconnect() {},
    };
    return node;
  };

  const ctx = {
    get currentTime() {
      return currentTime;
    },
    get state() {
      return state;
    },
    sampleRate: 44100,
    destination,
    resume() {
      resumeCalls += 1;
      state = 'running';
      return Promise.resolve();
    },
    createGain() {
      const node = { ...makeNode(), gain: makeFakeParam(1) };
      gains.push(node);
      return node;
    },
    createDynamicsCompressor() {
      const node = {
        ...makeNode(),
        threshold: makeFakeParam(-14),
        knee: makeFakeParam(18),
        ratio: makeFakeParam(6),
        attack: makeFakeParam(0.003),
        release: makeFakeParam(0.18),
      };
      compressors.push(node);
      return node;
    },
    createOscillator() {
      const osc: FakeOscillator = {
        ...makeNode(),
        type: 'sine',
        frequency: makeFakeParam(440),
        started: false,
        stopped: false,
        onended: null,
        start() {
          osc.started = true;
        },
        stop() {
          osc.stopped = true;
        },
      };
      oscillators.push(osc);
      return osc;
    },
    createBufferSource() {
      const src: FakeBufferSource = {
        ...makeNode(),
        buffer: null,
        loop: false,
        loopStart: 0,
        loopEnd: 0,
        playbackRate: makeFakeParam(1),
        startedAt: null,
        startOffset: null,
        stopped: false,
        onended: null,
        start(when = 0, offset = 0) {
          src.startedAt = when;
          src.startOffset = offset;
        },
        stop() {
          src.stopped = true;
        },
      };
      bufferSources.push(src);
      return src;
    },
    createBiquadFilter() {
      const filter: FakeFilter = {
        ...makeNode(),
        type: 'lowpass',
        frequency: makeFakeParam(1000),
        Q: makeFakeParam(1),
      };
      filters.push(filter);
      return filter;
    },
    createBuffer(_channels: number, length: number, sampleRate: number) {
      const data = new Float32Array(length);
      return {
        duration: length / sampleRate,
        length,
        sampleRate,
        numberOfChannels: 1,
        getChannelData: () => data,
      } as unknown as AudioBuffer;
    },
  } as unknown as AudioContext;

  return {
    ctx,
    advanceTime: (sec: number) => {
      currentTime += sec;
    },
    setState: (s: AudioContextState) => {
      state = s;
    },
    gains,
    oscillators,
    bufferSources,
    filters,
    compressors,
    get resumeCalls() {
      return resumeCalls;
    },
  };
}

function makeFakeAudioBuffer(duration: number): AudioBuffer {
  return {
    duration,
    length: Math.floor(duration * 44100),
    sampleRate: 44100,
    numberOfChannels: 2,
    getChannelData: () => new Float32Array(1),
  } as unknown as AudioBuffer;
}

test('WebAudioSoundManager initializes master -> compressor -> destination graph and updates bus gains', () => {
  const harness = createFakeAudioContext('running');
  const manager = new WebAudioSoundManager({
    createContext: () => harness.ctx,
  });

  manager.setMusicVolume(0.8);
  manager.setSfxVolume(0.5);
  manager.unlock();

  const buses = manager.getBusNodes();
  assert.ok(buses.masterGain, 'Expected masterGain node');
  assert.ok(buses.musicGain, 'Expected musicGain node');
  assert.ok(buses.sfxGain, 'Expected sfxGain node');
  assert.ok(buses.compressor, 'Expected compressor node');

  const musicNode = buses.musicGain as unknown as FakeNode & { gain: FakeParam };
  const sfxNode = buses.sfxGain as unknown as FakeNode & { gain: FakeParam };
  const masterNode = buses.masterGain as unknown as FakeNode & { gain: FakeParam };

  assert.equal(musicNode.connections[0], buses.masterGain);
  assert.equal(sfxNode.connections[0], buses.masterGain);
  assert.equal(masterNode.connections[0], buses.compressor);
  assert.equal(masterNode.gain.value, 1);
  assert.equal(sfxNode.gain.value, 0.5);

  manager.setMuted(true);
  assert.equal(masterNode.gain.value, 0);
  manager.setMuted(false);
  assert.equal(masterNode.gain.value, 1);

  // System mute (tab blur / hidden document) preserves user's manual mute state
  manager.setSystemMuted(true);
  assert.equal(manager.isSystemMuted(), true);
  assert.equal(manager.isMuted(), false);
  assert.equal(masterNode.gain.value, 0);
  manager.setSystemMuted(false);
  assert.equal(masterNode.gain.value, 1);

  // If user manually muted, clearing system mute must keep audio silenced
  manager.setMuted(true);
  manager.setSystemMuted(true);
  manager.setSystemMuted(false);
  assert.equal(manager.isMuted(), true);
  assert.equal(masterNode.gain.value, 0);
});

const flushAsync = () => new Promise<void>((resolve) => setImmediate(resolve));

test('playMusicLoop decodes once, caches AudioBuffer, loops seamlessly, and preserves offset on pause/resume & rate change', async () => {
  const harness = createFakeAudioContext('running');
  let fetchCount = 0;
  const manager = new WebAudioSoundManager({
    createContext: () => harness.ctx,
    fetchAudioBuffer: async () => {
      fetchCount += 1;
      return makeFakeAudioBuffer(10); // 10-second loop
    },
  });

  manager.playMusicLoop('level-1', '/assets/lvl1.m4a', { gainScale: 0.68, playbackRate: 1.0 });
  await flushAsync();

  assert.equal(fetchCount, 1);
  assert.equal(manager.getActiveTrackId(), 'level-1');
  assert.equal(manager.isMusicPlaying(), true);

  const firstSource = harness.bufferSources[0];
  assert.ok(firstSource);
  assert.equal(firstSource.loop, true);
  assert.equal(firstSource.loopEnd, 10);
  assert.equal(firstSource.startOffset, 0);

  // Advance 4 seconds and verify exact clock
  harness.advanceTime(4);
  assert.equal(manager.getMusicPlaybackTime('level-1'), 4);
  assert.equal(manager.getMusicPlaybackTime('level-2'), null);

  // Advance past loop boundary (4 + 8 = 12 => wraps to 2s)
  harness.advanceTime(8);
  assert.ok(Math.abs((manager.getMusicPlaybackTime('level-1') ?? 0) - 2) < 1e-6);

  // Pause preserves exact offset (2s) and stops source
  manager.pauseMusic();
  assert.equal(firstSource.stopped, true);
  assert.equal(manager.getMusicPlaybackTime('level-1'), null);

  // Resume restarts AudioBufferSourceNode from offset 2s without re-fetching
  harness.advanceTime(5);
  manager.resumeMusic();
  assert.equal(fetchCount, 1, 'Cached AudioBuffer should not re-fetch on resume');
  const resumedSource = harness.bufferSources[1];
  assert.ok(resumedSource);
  assert.ok(Math.abs((resumedSource.startOffset ?? 0) - 2) < 1e-6);

  // Change playback rate mid-track without losing offset continuity
  harness.advanceTime(2); // now at 4s
  manager.setMusicPlaybackRate(1.5);
  harness.advanceTime(2); // 2 * 1.5 = +3s => 7s
  assert.ok(Math.abs((manager.getMusicPlaybackTime('level-1') ?? 0) - 7) < 1e-6);
});

test('playMusicLoop discards stale async track decode when switching levels quickly', async () => {
  const harness = createFakeAudioContext('running');
  let resolveTrack1!: (buf: AudioBuffer | null) => void;

  const manager = new WebAudioSoundManager({
    createContext: () => harness.ctx,
    fetchAudioBuffer: (_ctx, url) => {
      if (url.includes('lvl1')) {
        return new Promise<AudioBuffer | null>((resolve) => {
          resolveTrack1 = resolve;
        });
      }
      return Promise.resolve(makeFakeAudioBuffer(12));
    },
  });

  manager.playMusicLoop('level-1', '/assets/lvl1.m4a');
  // Switch to level-2 before level-1 finishes decoding
  manager.playMusicLoop('level-2', '/assets/lvl2.m4a');
  await flushAsync();

  assert.equal(manager.getActiveTrackId(), 'level-2');

  // Now resolve stale level-1 buffer — must NOT overwrite level-2!
  resolveTrack1(makeFakeAudioBuffer(10));
  await flushAsync();

  assert.equal(manager.getActiveTrackId(), 'level-2');
});

test('triggered SFX synthesize firing, tiered noise explosions, and all UI interactions with mute & rate-limit guards', () => {
  const harness = createFakeAudioContext('running');
  let clockMs = 1000;
  const manager = new WebAudioSoundManager({
    createContext: () => harness.ctx,
    nowMs: () => clockMs,
  });

  // Firing creates tone + highpass noise transient and rate-limits same-frame duplicates
  assert.equal(manager.playFireSfx({ baseFreq: 600, duration: 0.06 }), true);
  assert.equal(manager.playFireSfx({ baseFreq: 600, duration: 0.06 }), false, 'Same-ms duplicate fire should be rate-limited');
  assert.ok(harness.oscillators.length >= 1);
  assert.ok(harness.bufferSources.length >= 1, 'Fire SFX should emit crisp noise transient');

  // Tiered explosions synthesize sub-bass + filtered noise bursts
  const oscBeforeExp = harness.oscillators.length;
  const noiseBeforeExp = harness.bufferSources.length;
  clockMs += 100;
  assert.equal(manager.playExplosionSfx('boss'), true);
  assert.ok(harness.oscillators.length >= oscBeforeExp + 2, 'Boss explosion should emit primary + secondary sub-bass tones');
  assert.ok(harness.bufferSources.length >= noiseBeforeExp + 2, 'Boss explosion should emit layered noise bursts');
  assert.ok(harness.filters.length >= 2, 'Explosion should route through BiquadFilterNode');

  // All UI interaction kinds synthesize cleanly
  const uiKinds: UiSfxKind[] = ['click', 'confirm', 'cancel', 'toggle_on', 'toggle_off', 'hover'];
  for (const kind of uiKinds) {
    clockMs += 50;
    assert.equal(manager.playUiSfx(kind), true, `Expected UI SFX "${kind}" to play`);
  }

  // Muted manager blocks all SFX triggers
  manager.setMuted(true);
  clockMs += 100;
  assert.equal(manager.playFireSfx(), false);
  assert.equal(manager.playExplosionSfx('medium'), false);
  assert.equal(manager.playUiSfx('confirm'), false);
});
