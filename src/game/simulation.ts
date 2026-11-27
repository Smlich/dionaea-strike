import { getLevelRhythmProfile, soundEngine } from './audio';
import {
  computeDifficultySpawnTiming,
  computeDynamicEscalation,
  loadDifficulty,
  saveDifficulty,
  type DynamicEscalationSnapshot,
} from './difficulty';
import {
  advanceMutagenPodByShot,
  applyMutagenPickup,
  applyPalitoHeartCharm,
  buildApexFusionPrimaryPattern,
  buildApexFusionSecondaryPattern,
  buildPrimaryShotPattern,
  buildSecondaryShotPattern,
  calculateKillScore,
  CARPINCHO_FACON_RANGE,
  checkCircleCollision,
  checkComboMilestoneCrossed,
  COMBO_WINDOW_SEC,
  computeBeatSnapshot,
  computeBeatSpawnEvents,
  computeEnemyBulletSpeedMult,
  computeFusedLoadout,
  computeInvasionState,
  computeLevelEnemyStats,
  getAllowedMutagenSpecies,
  getApexFusionMeta,
  getComboMultiplier,
  getComboRank,
  getPetSpecialProfile,
  isPetUnlocked,
  MAX_ACTIVE_SPECIES,
  pickFrogTongueTarget,
  resolveAbilitySlots,
  SECONDARY_ABILITY_META,
  stepEnemyBehavior,
  stepFrogAllyPosition,
  swapAbilitySlots,
  type FrogCompanionState,
  type SimEnemyState,
} from './fusionRules';
import {
  PET_CATALOG,
  loadHighScore,
  loadSelectedPet,
  loadUnlockedPets,
  loadUnlockedSpecies,
  saveSelectedPet,
  unlockPetForNextRuns,
  unlockSpeciesForNextRuns,
} from './gameConfig';
import { recordRunPerformance, syncLiveHighScore } from './highScoreStore';
import {
  PARTICLE_POOL_SIZE,
  clearParticlePool,
  createParticlePool,
  emitBulletImpactParticles,
  emitEnemyExplosionParticles,
  emitGenericBurstParticles,
  emitPlayerHitParticles,
  getExplosionTierForArchetype,
  stepParticlePool,
  type ParticlePool,
} from './particles';
import {
  renderGameFrame,
  type AcidPool,
  type BossState,
  type EnemyBullet,
  type FloatingCallout,
  type InfernalRiderUnit,
  type MafiaCatUnit,
  type MutagenPod,
  type PlayerBullet,
  type PoisonFrogUnit,
  type RenderState,
  type VacuumVortex,
} from './renderer';
import {
  addScreenShakeTrauma,
  createScreenShakeState,
  resetScreenShakeState,
  sampleScreenShake,
  stepScreenShake,
  triggerBossHitShake,
  triggerPlayerDamageShake,
  type ScreenShakeState,
} from './screenShake';
import type {
  BossConfig,
  ClearedLevelSummary,
  ComboMilestoneAnnouncement,
  DifficultyId,
  EnemyArchetypeId,
  FusedLoadout,
  GameConfig,
  GameStatus,
  HudSnapshot,
  LandscapeId,
  LevelNumber,
  PetId,
  PortalSequenceState,
  ProjectileDescriptor,
  SpeciesId,
  SpeciesLevels,
} from './types';

const LEVEL_LANDSCAPES: Record<LevelNumber, LandscapeId> = {
  1: 'pampa_dawn',
  2: 'jungle_falls',
  3: 'city_night',
  4: 'urban_viaduct',
  5: 'humahuaca_andes',
};

function createInitialSpeciesLevels(): SpeciesLevels {
  return {
    dionaea: 1,
    drosera: 0,
    nepenthes: 0,
    utricularia: 0,
    sarracenia: 0,
    pinguicula: 0,
    heliamphora: 0,
    cephalotus: 0,
  };
}

const PLAYER_BULLET_POOL_SIZE = 240;
const ENEMY_BULLET_POOL_SIZE = 180;
const MAX_ACID_POOLS = 10;
const MAX_CALLOUTS = 12;
const LIVE_SCORE_PERSIST_INTERVAL_SEC = 3.0;
const HUD_EMIT_INTERVAL_SEC = 0.1;

export class GameSimulation {
  private config: GameConfig;
  private status: GameStatus = 'title';
  private width = 960;
  private height = 720;

  private time = 0;
  private hitstopTimer = 0;
  private killHitstopCooldown = 0;
  private lastLivePersistTimeSec = -LIVE_SCORE_PERSIST_INTERVAL_SEC;
  private cachedLevelWavesLevel = -1;
  private cachedLevelWaves: GameConfig['waves'] = [];
  private shakeState: ScreenShakeState = createScreenShakeState();
  private reducedMotion =
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false;
  private difficulty: DifficultyId = loadDifficulty();
  private escalation: DynamicEscalationSnapshot = computeDynamicEscalation(0, 0, this.difficulty);

  // Player state (Horizontal side-scroller: left side facing right)
  private playerX = 160;
  private playerY = 360;
  private playerVx = 0;
  private playerVy = 0;
  private hp = 5;
  private maxHp = 5;
  private playerInvulnTimer = 0;
  private playerHitFlash = 0;
  private playerScaleX = 1;
  private playerScaleY = 1;
  private fireCooldown = 0;
  private shotIndex = 0;
  private specialCooldown = 0;
  private specialPulseTimer = 0;
  private specialPulseRadius = 0;

  // Dual-Mode Rotating Abilities (Primary Auto-Fire vs. Secondary Manual Power Skill)
  private primarySpecies: SpeciesId = 'dionaea';
  private secondarySpecies: SpeciesId = 'dionaea';
  private secondaryCooldown = 0;
  private secondaryMaxCooldown = SECONDARY_ABILITY_META.dionaea.cooldownSec;

  // High-HD Fluid Hero Biplane Animations
  private heroJawChompTimer = 0;
  private heroBankAngle = 0;
  private heroRecoil = 0;

  // Dynamic Evolving Invasion Signals
  private invasionIntensity = 0;
  private invasionAlertLabel: string | null = null;
  private prevInvasionStage = 0;

  // Progression, Levels, Unlocks, Pets, Portals & Landscapes
  private speciesLevels: SpeciesLevels = createInitialSpeciesLevels();
  private cachedLoadout: FusedLoadout | null = null;
  private superSaiyanAnnounced = false;
  private portal: PortalSequenceState | null = null;
  private pendingBossClearResult: 'level_clear' | 'victory' | null = null;
  private portalOriginX = 160;
  private portalOriginY = 360;
  private unlockedSpecies: SpeciesId[] = loadUnlockedSpecies();
  private unlockedPets: PetId[] = loadUnlockedPets();
  private selectedPet: PetId = loadSelectedPet();
  private royScreamTimer = 0;
  private royScreamRadius = 0;
  private palitoLoveTimer = 0;
  private palitoLoveRadius = 0;
  private palitoCharmActiveTimer = 0;
  private sapucaiCryTimer = 0;
  private batricioRainPending = 0;
  private batricioRainTimer = 0;
  private batricioRainDamage = 42;
  private clearedLevelSummary: ClearedLevelSummary | null = null;
  private levelIndex: LevelNumber = 1;
  private miniBossDefeatedForLevel = false;
  private waveIndex = 0;
  private waveTimer = 0;
  private waveSpawnedMutagen = false;
  private mutagenDropCooldown = 0;
  private spawnTimer = 0;
  private score = 0;
  private highScore = 0;
  private sessionStartBestScore = 0;
  private isNewHighScore = false;
  private newRecordAnnounced = false;
  private runRecorded = false;
  private lastPersistedLiveScore = 0;
  private combo = 0;
  private maxCombo = 0;
  private comboTimer = 0;
  private comboMilestone: ComboMilestoneAnnouncement | null = null;
  private enemiesDefeated = 0;
  private damageTaken = 0;
  private elapsedSec = 0;
  private defeatBeatTimer = 0;
  private nextEnemyId = 1;
  private banner: HudSnapshot['banner'] = null;

  private currentLandscape: LandscapeId = 'pampa_dawn';
  private prevLandscape: LandscapeId = 'pampa_dawn';
  private landscapeBlend = 1;

  // Musical rhythm sync & environmental wind
  private levelBeatClockSec = 0;
  private prevBeatClockSec = 0;
  private beatPulse = 0;
  private lastBossBeatIndex = -1;
  private windForceX = 0;

  // Secondary Pet Co-Pilot (Sapo Batricio / Roy / Sicario / Palito / Carpincho Matero)
  private frog: FrogCompanionState = {
    enabled: true,
    x: 102,
    y: 312,
    vx: 0,
    vy: 0,
    tongueCooldown: 0.4,
    tongueTimer: 0,
    tongueTargetX: 0,
    tongueTargetY: 0,
    tongueKind: null,
    throatPuff: 0,
    bubbleTimer: 0.45,
    muzzleFlashTimer: 0,
    meowBurstTimer: 0,
    shieldBlockTimer: 0,
    faconSlashTimer: 0,
    ponchoBlockTimer: 0,
    singingTimer: 0,
  };

  // Pet Special Summons: Mafia Gatuna (Sicario), Poisonous Female Frogs (Batricio), Los Infernales (Carpincho)
  private mafiaCats: MafiaCatUnit[] = [];
  private nextMafiaCatId = 1;
  private poisonFrogs: PoisonFrogUnit[] = [];
  private nextPoisonFrogId = 1;
  private infernalesRiders: InfernalRiderUnit[] = [];
  private nextInfernalId = 1;

  // Pools & active entities
  private playerBullets: PlayerBullet[];
  private enemyBullets: EnemyBullet[];
  private particlePool: ParticlePool = createParticlePool(PARTICLE_POOL_SIZE);
  private enemies: SimEnemyState[] = [];
  private acidPools: AcidPool[] = [];
  private vortexes: VacuumVortex[] = [];
  private pickups: MutagenPod[] = [];
  private callouts: FloatingCallout[] = [];
  private boss: BossState;

  // Input state (Keyboard + Pointer + Gamepad)
  private keys = new Set<string>();
  private pointerActive = false;
  private pointerTargetX = 160;
  private pointerTargetY = 360;
  private manualFireHeld = false;
  private gamepadConnected = false;
  private gamepadMoveX = 0;
  private gamepadMoveY = 0;
  private gamepadFocusSlow = false;

  private hudAccumulator = 0;
  private onHudUpdate: (snap: HudSnapshot) => void;
  private onStatusChange: (status: GameStatus) => void;

  constructor(
    config: GameConfig,
    onHudUpdate: (snap: HudSnapshot) => void,
    onStatusChange: (status: GameStatus) => void
  ) {
    this.config = config;
    this.onHudUpdate = onHudUpdate;
    this.onStatusChange = onStatusChange;
    this.highScore = loadHighScore();
    this.sessionStartBestScore = this.highScore;
    this.lastPersistedLiveScore = this.highScore;

    this.playerBullets = Array.from({ length: PLAYER_BULLET_POOL_SIZE }, () => ({
      active: false,
      kind: 'thorn',
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      baseVy: 0,
      accelX: 0,
      gravity: 0,
      drag: 1,
      bounces: 0,
      bounceCeiling: false,
      splitsOnHit: 0,
      damage: 10,
      radius: 5,
      color: '#E11D48',
      glowColor: '#22C55E',
      slowFactor: 0,
      acidDps: 0,
      acidRadius: 0,
      armorPierce: false,
      chainAcid: false,
      pullStrength: 0,
      spawnsVortex: false,
      piercing: false,
      life: 0,
      isSecondary: false,
      rootDuration: 0,
      clearsEnemyBullets: false,
      sinWaveAmp: 0,
      sinWaveFreq: 0,
      age: 0,
    }));

    this.enemyBullets = Array.from({ length: ENEMY_BULLET_POOL_SIZE }, () => ({
      active: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      accelX: 0,
      gravity: 0,
      bounces: 0,
      radius: 5,
      color: '#F43F5E',
      kind: 'spore',
      age: 0,
    }));

    this.boss = this.createEmptyBoss(1, false);
    this.resetRunState();
  }

  private getActiveBossConfig(level: LevelNumber, isMiniBoss: boolean): BossConfig {
    return isMiniBoss
      ? this.config.miniBosses[level - 1] ?? this.config.miniBosses[0]
      : this.config.bosses[level - 1] ?? this.config.bosses[0];
  }

  private createEmptyBoss(level: LevelNumber, isMiniBoss: boolean): BossState {
    const bossCfg = this.getActiveBossConfig(level, isMiniBoss);
    return {
      active: false,
      level,
      isMiniBoss,
      x: this.width + 110,
      y: this.height * 0.5,
      targetX: Math.max(this.width * 0.72, this.width - (isMiniBoss ? 185 : 155)),
      vy: isMiniBoss ? 145 : 120,
      hp: bossCfg.maxHp,
      maxHp: bossCfg.maxHp,
      radius: isMiniBoss ? 44 : 58,
      phase: 1,
      age: 0,
      fireTimer: 1.25,
      windupTimer: 0,
      windupKind: 'fan',
      hitFlashTimer: 0,
      dyingTimer: 0,
      shieldActive: false,
      shieldTimer: 3.2,
      blinkCooldown: 3.4,
      blinkGhostTimer: 0,
      blinkGhostX: this.width * 0.78,
      blinkGhostY: this.height * 0.5,
      windCooldown: 3.8,
      windActiveTimer: 0,
    };
  }

  private getLoadout(): FusedLoadout {
    if (!this.cachedLoadout) {
      this.cachedLoadout = computeFusedLoadout(this.speciesLevels, this.config);
    }
    return this.cachedLoadout;
  }

  public setConfig(config: GameConfig) {
    this.config = config;
    this.cachedLoadout = null;
    this.cachedLevelWavesLevel = -1;
    this.maxHp = config.player.maxHp;
    this.hp = Math.min(this.hp, this.maxHp);
    this.emitHud();
  }

  private getLevelWaves(level: LevelNumber): GameConfig['waves'] {
    if (this.cachedLevelWavesLevel !== level) {
      this.cachedLevelWavesLevel = level;
      this.cachedLevelWaves = this.config.waves.filter((w) => w.level === level);
    }
    return this.cachedLevelWaves;
  }

  private pushAcidPool(pool: AcidPool) {
    if (this.acidPools.length >= MAX_ACID_POOLS) {
      this.acidPools.shift();
    }
    this.acidPools.push(pool);
  }

  public resize(width: number, height: number) {
    const prevW = this.width;
    const prevH = this.height;
    this.width = Math.max(320, width);
    this.height = Math.max(320, height);
    if (prevW > 0 && prevH > 0) {
      this.playerX = Math.max(42, Math.min(this.width - 70, (this.playerX / prevW) * this.width));
      this.playerY = Math.max(58, Math.min(this.height - 42, (this.playerY / prevH) * this.height));
    } else {
      this.playerX = Math.min(180, this.width * 0.16);
      this.playerY = this.height * 0.5;
    }
    if (this.boss.active) {
      this.boss.targetX = Math.max(this.width * 0.72, this.width - (this.boss.isMiniBoss ? 185 : 155));
    }
  }

  public getStatus(): GameStatus {
    return this.status;
  }

  public getLevelIndex(): LevelNumber {
    return this.levelIndex;
  }

  public getDifficulty(): DifficultyId {
    return this.difficulty;
  }

  public setDifficulty(next: DifficultyId) {
    this.difficulty = saveDifficulty(next);
    this.escalation = computeDynamicEscalation(this.score, this.elapsedSec, this.difficulty);
    this.emitHud();
  }

  public getDynamicEscalation(): DynamicEscalationSnapshot {
    return { ...this.escalation };
  }

  public getPlayerPosition(): { x: number; y: number } {
    return { x: this.playerX, y: this.playerY };
  }

  public startNewGame() {
    if ((this.status === 'playing' || this.status === 'paused' || this.status === 'level_clear') && this.score > 0 && !this.runRecorded) {
      this.finalizeRunRecord(false);
    }
    this.resetRunState();
    this.status = 'playing';
    this.onStatusChange('playing');
    this.emitHud();
  }

  public setStatus(next: GameStatus) {
    this.status = next;
    if (next !== 'playing') {
      this.checkLiveHighScoreProgress(true);
    }
    this.onStatusChange(next);
    this.emitHud();
  }

  public refreshHighScore() {
    const latest = loadHighScore();
    this.highScore = latest;
    this.lastPersistedLiveScore = latest;
    if (this.status !== 'playing') {
      this.sessionStartBestScore = latest;
      this.isNewHighScore = false;
      this.newRecordAnnounced = false;
    }
    this.emitHud();
  }

  private checkLiveHighScoreProgress(forcePersist = false) {
    const rounded = Math.round(this.score);
    if (rounded > this.highScore) {
      this.highScore = rounded;
      this.isNewHighScore = true;
      if (this.sessionStartBestScore > 0 && !this.newRecordAnnounced) {
        this.newRecordAnnounced = true;
        soundEngine.playUiSfxPreview();
        this.callouts.push({
          x: this.playerX + 12,
          y: Math.max(48, this.playerY - 46),
          vy: -42,
          text: '¡NUEVO RÉCORD!',
          color: '#FACC15',
          life: 1.6,
          maxLife: 1.6,
        });
      }
    }
    if (
      rounded > this.lastPersistedLiveScore &&
      (forcePersist || this.time - this.lastLivePersistTimeSec >= LIVE_SCORE_PERSIST_INTERVAL_SEC)
    ) {
      const res = syncLiveHighScore(rounded, this.maxCombo, this.levelIndex);
      this.highScore = res.bestScore;
      this.lastPersistedLiveScore = res.bestScore;
      this.lastLivePersistTimeSec = this.time;
    }
  }

  public finalizeRunRecord(victory: boolean) {
    if (this.runRecorded) return;
    this.runRecorded = true;
    const rounded = Math.round(this.score);
    if (rounded > 0 || victory) {
      const outcome = recordRunPerformance({
        score: rounded,
        maxCombo: this.maxCombo,
        levelReached: this.levelIndex,
        victory,
        petId: this.selectedPet,
        enemiesDefeated: this.enemiesDefeated,
        elapsedSec: Math.round(this.elapsedSec),
      });
      this.highScore = outcome.state.bestScore;
      this.lastPersistedLiveScore = outcome.state.bestScore;
      if (rounded > this.sessionStartBestScore && rounded > 0) {
        this.isNewHighScore = true;
      }
    }
  }

  public setSelectedPet(petId: PetId) {
    this.unlockedPets = loadUnlockedPets();
    if (!isPetUnlocked(petId, this.unlockedPets)) return;
    this.selectedPet = petId;
    saveSelectedPet(petId);
    this.emitHud();
  }

  public refreshUnlocks() {
    this.unlockedSpecies = loadUnlockedSpecies();
    this.unlockedPets = loadUnlockedPets();
    if (!isPetUnlocked(this.selectedPet, this.unlockedPets)) {
      this.selectedPet = 'batricio';
      saveSelectedPet('batricio');
    }
    this.emitHud();
  }

  public continueToNextLevel(): boolean {
    if (this.status !== 'level_clear') return false;
    this.clearedLevelSummary = null;

    // Guarantee waveIndex points to the first wave of the destination level
    const firstWaveForLevel = this.config.waves.findIndex((w) => w.level === this.levelIndex);
    if (firstWaveForLevel >= 0) {
      this.waveIndex = firstWaveForLevel;
    }

    const nextWave = this.config.waves[this.waveIndex];
    if (nextWave) {
      this.prevLandscape = nextWave.landscape;
      this.currentLandscape = nextWave.landscape;
      this.landscapeBlend = 1;
    }

    // Hard reset transient combat entities & timers so nothing leaks across levels
    this.boss = this.createEmptyBoss(this.levelIndex, false);
    this.enemies = [];
    this.acidPools = [];
    this.vortexes = [];
    this.pickups = [];
    this.callouts = [];
    for (const b of this.playerBullets) b.active = false;
    for (const eb of this.enemyBullets) eb.active = false;
    clearParticlePool(this.particlePool);
    resetScreenShakeState(this.shakeState);
    this.hitstopTimer = 0;
    this.defeatBeatTimer = 0;
    this.pendingBossClearResult = null;
    this.hp = Math.max(1, this.hp);

    this.spawnTimer = 0.75;
    this.waveTimer = 0;
    this.waveSpawnedMutagen = false;
    this.levelBeatClockSec = 0;
    this.prevBeatClockSec = 0;
    this.beatPulse = 0;
    this.lastBossBeatIndex = -1;
    this.windForceX = 0;
    this.mafiaCats = [];
    this.poisonFrogs = [];
    this.infernalesRiders = [];
    this.batricioRainPending = 0;
    this.palitoLoveTimer = 0;
    this.palitoCharmActiveTimer = 0;
    this.sapucaiCryTimer = 0;
    this.invasionIntensity = 0;
    this.invasionAlertLabel = null;
    this.prevInvasionStage = 0;
    this.secondaryCooldown = 0;
    this.playerInvulnTimer = Math.max(this.playerInvulnTimer, 1.35);

    // Start Levels 2-5 with protagonist emerging from a dimensional portal linked to the previous stage!
    const prevLv = Math.max(1, this.levelIndex - 1) as LevelNumber;
    const entryX = Math.min(130, this.width * 0.14);
    const entryY = this.height * 0.5;
    this.playerX = entryX - 28;
    this.playerY = entryY;
    this.playerScaleX = 0.28;
    this.playerScaleY = 0.28;
    this.frog.x = this.playerX - 24;
    this.frog.y = this.playerY - 18;
    this.portalOriginX = entryX;
    this.portalOriginY = entryY;
    this.portal = {
      phase: 'exiting',
      x: entryX,
      y: entryY,
      radius: 76,
      maxRadius: 76,
      progress: 0,
      duration: 1.2,
      textureTarget: LEVEL_LANDSCAPES[prevLv],
      label: `SALIDA · NIVEL ${prevLv} → ${this.levelIndex}`,
    };
    soundEngine.playPortalOpen();

    this.banner = {
      title: `NIVEL ${this.levelIndex} · ${nextWave?.title ?? 'NUEVO SECTOR'}`,
      detail: '¡Emergiendo del portal dimensional al ritmo del sector!',
      accentColor: '#38BDF8',
      ttl: 2.8,
    };
    this.setStatus('playing');
    return true;
  }

  public resetRunState() {
    this.hitstopTimer = 0;
    this.killHitstopCooldown = 0;
    this.lastLivePersistTimeSec = -LIVE_SCORE_PERSIST_INTERVAL_SEC;
    resetScreenShakeState(this.shakeState);
    this.cachedLoadout = null;
    this.superSaiyanAnnounced = false;
    this.portal = null;
    this.pendingBossClearResult = null;
    this.playerX = Math.min(190, this.width * 0.16);
    this.playerY = this.height * 0.5;
    this.playerVx = 0;
    this.playerVy = 0;
    this.maxHp = this.config.player.maxHp;
    this.hp = this.maxHp;
    this.playerInvulnTimer = 0.85;
    this.playerHitFlash = 0;
    this.playerScaleX = 1;
    this.playerScaleY = 1;
    this.fireCooldown = 0;
    this.shotIndex = 0;
    this.specialCooldown = 0;
    this.specialPulseTimer = 0;
    this.specialPulseRadius = 0;
    this.primarySpecies = 'dionaea';
    this.secondarySpecies = 'dionaea';
    this.secondaryCooldown = 0;
    this.secondaryMaxCooldown = SECONDARY_ABILITY_META.dionaea.cooldownSec;
    this.heroJawChompTimer = 0;
    this.heroBankAngle = 0;
    this.heroRecoil = 0;
    this.invasionIntensity = 0;
    this.invasionAlertLabel = null;
    this.prevInvasionStage = 0;
    this.royScreamTimer = 0;
    this.royScreamRadius = 0;
    this.palitoLoveTimer = 0;
    this.palitoLoveRadius = 0;
    this.palitoCharmActiveTimer = 0;
    this.sapucaiCryTimer = 0;
    this.batricioRainPending = 0;
    this.batricioRainTimer = 0;
    this.clearedLevelSummary = null;

    this.speciesLevels = createInitialSpeciesLevels();
    this.unlockedSpecies = loadUnlockedSpecies();
    this.unlockedPets = loadUnlockedPets();
    const storedPet = loadSelectedPet();
    this.selectedPet = isPetUnlocked(storedPet, this.unlockedPets) ? storedPet : 'batricio';
    this.levelIndex = 1;
    this.miniBossDefeatedForLevel = false;
    this.waveIndex = 0;
    this.waveTimer = 0;
    this.waveSpawnedMutagen = false;
    this.mutagenDropCooldown = 0;
    this.spawnTimer = 0.55;
    this.levelBeatClockSec = 0;
    this.prevBeatClockSec = 0;
    this.beatPulse = 0;
    this.lastBossBeatIndex = -1;
    this.windForceX = 0;
    this.score = 0;
    this.highScore = loadHighScore();
    this.sessionStartBestScore = this.highScore;
    this.lastPersistedLiveScore = this.highScore;
    this.isNewHighScore = false;
    this.newRecordAnnounced = false;
    this.runRecorded = false;
    this.combo = 0;
    this.maxCombo = 0;
    this.comboTimer = 0;
    this.comboMilestone = null;
    this.enemiesDefeated = 0;
    this.damageTaken = 0;
    this.elapsedSec = 0;
    this.defeatBeatTimer = 0;
    this.escalation = computeDynamicEscalation(0, 0, this.difficulty);

    const firstLand = this.config.waves[0]?.landscape ?? 'pampa_dawn';
    this.currentLandscape = firstLand;
    this.prevLandscape = firstLand;
    this.landscapeBlend = 1;

    this.frog = {
      enabled: this.config.player.frogAlly.enabled,
      x: this.playerX - 58,
      y: this.playerY - 48,
      vx: 0,
      vy: 0,
      tongueCooldown: 0.5,
      tongueTimer: 0,
      tongueTargetX: this.playerX + 120,
      tongueTargetY: this.playerY,
      tongueKind: null,
      throatPuff: 0,
      bubbleTimer: 0.5,
      muzzleFlashTimer: 0,
      meowBurstTimer: 0,
      shieldBlockTimer: 0,
      faconSlashTimer: 0,
      ponchoBlockTimer: 0,
      singingTimer: 0,
    };
    this.mafiaCats = [];
    this.poisonFrogs = [];
    this.infernalesRiders = [];

    this.banner = {
      title: 'NIVEL 1 · AMANECER EN LA PAMPA',
      detail: 'Vuelo rasante sobre la Tierra · Enemigos sincronizados al ritmo · Combina 2 evoluciones',
      accentColor: '#4ADE80',
      ttl: 2.8,
    };

    this.enemies = [];
    this.acidPools = [];
    this.vortexes = [];
    this.pickups = [];
    this.callouts = [];
    this.boss = this.createEmptyBoss(1, false);

    for (const b of this.playerBullets) b.active = false;
    for (const eb of this.enemyBullets) eb.active = false;
    clearParticlePool(this.particlePool);
    this.clearInputs();
  }

  private transitionLandscape(next: LandscapeId) {
    if (next === this.currentLandscape) return;
    this.prevLandscape = this.currentLandscape;
    this.currentLandscape = next;
    this.landscapeBlend = 0;
  }

  public clearInputs() {
    this.keys.clear();
    this.pointerActive = false;
    this.manualFireHeld = false;
    this.gamepadMoveX = 0;
    this.gamepadMoveY = 0;
    this.gamepadFocusSlow = false;
  }

  public setGamepadState(connected: boolean, moveX: number, moveY: number, focusSlow: boolean) {
    const changed = this.gamepadConnected !== connected;
    this.gamepadConnected = connected;
    this.gamepadMoveX = connected ? moveX : 0;
    this.gamepadMoveY = connected ? moveY : 0;
    this.gamepadFocusSlow = connected ? focusSlow : false;
    if (changed) {
      this.emitHud();
    }
  }

  public handleKeyDown(code: string) {
    this.keys.add(code);
    if (this.status !== 'playing') return;
    if (code === 'Space' || code === 'KeyX') {
      this.triggerSpecialPulse();
    } else if (code === 'KeyE' || code === 'KeyK' || code === 'KeyZ') {
      this.fireSecondaryAbility();
    } else if (code === 'KeyQ' || code === 'Tab') {
      this.swapActiveAbilities();
    }
  }

  public handleKeyUp(code: string) {
    this.keys.delete(code);
  }

  public fireSecondaryAbility() {
    if (this.status !== 'playing' || this.portal || this.secondaryCooldown > 0) return;

    const slots = resolveAbilitySlots(this.speciesLevels, this.primarySpecies, this.secondarySpecies);
    this.primarySpecies = slots.primary;
    this.secondarySpecies = slots.secondary;

    const loadout = this.getLoadout();
    const isApexFusion = loadout.isSuperSaiyanFusion && loadout.fusedPair !== null;
    const apexMeta = isApexFusion && loadout.fusedPair
      ? getApexFusionMeta(loadout.fusedPair[0], loadout.fusedPair[1], this.config)
      : null;

    const meta = SECONDARY_ABILITY_META[this.secondarySpecies];
    const secShots = isApexFusion && loadout.fusedPair
      ? buildApexFusionSecondaryPattern(loadout.fusedPair[0], loadout.fusedPair[1], this.speciesLevels, this.config)
      : buildSecondaryShotPattern(this.secondarySpecies, this.speciesLevels, this.config);
    if (secShots.length === 0) return;

    for (const desc of secShots) {
      this.spawnPlayerBullet(desc, this.playerX + desc.offsetX, this.playerY + desc.offsetY);
    }

    const cd = apexMeta ? apexMeta.cooldownSec : meta.cooldownSec;
    const calloutName = apexMeta ? apexMeta.manualName : meta.name;
    const spColor = apexMeta ? '#FACC15' : this.config.species[this.secondarySpecies].accentColor;

    this.secondaryMaxCooldown = cd;
    this.secondaryCooldown = cd;
    this.heroJawChompTimer = 0.28;
    this.heroRecoil = 1;
    this.playerScaleX = 0.88;
    this.playerScaleY = 1.12;
    addScreenShakeTrauma(this.shakeState, 0.24);
    soundEngine.playSecondaryFire(this.secondarySpecies);

    this.spawnBurst(this.playerX + 34, this.playerY, spColor, isApexFusion ? 16 : 10, 185, true);
    this.callouts.push({
      x: this.playerX + 26,
      y: this.playerY - 28,
      vy: -36,
      text: `⚡ ${calloutName.toUpperCase()}!`,
      color: spColor,
      life: 0.9,
      maxLife: 0.9,
    });
    this.emitHud();
  }

  public swapActiveAbilities() {
    if (this.status !== 'playing') return;
    const swapped = swapAbilitySlots(this.speciesLevels, this.primarySpecies, this.secondarySpecies);
    if (!swapped.canSwap) return;

    this.primarySpecies = swapped.primary;
    this.secondarySpecies = swapped.secondary;
    const newMeta = SECONDARY_ABILITY_META[this.secondarySpecies];
    this.secondaryMaxCooldown = newMeta.cooldownSec;
    this.secondaryCooldown = Math.min(this.secondaryCooldown, 0.25);

    soundEngine.playAbilitySwap();
    const priSp = this.config.species[this.primarySpecies];
    const secSp = this.config.species[this.secondarySpecies];
    this.spawnBurst(this.playerX, this.playerY, secSp.accentColor, 8, 130, false);
    this.callouts.push({
      x: this.playerX + 12,
      y: this.playerY - 30,
      vy: -34,
      text: `↻ AUTO: ${priSp.name} · MAN: ${newMeta.name}`,
      color: secSp.accentColor,
      life: 1.05,
      maxLife: 1.05,
    });
    this.emitHud();
  }

  public setPointerTarget(active: boolean, x: number, y: number) {
    this.pointerActive = active;
    this.manualFireHeld = active;
    if (active) {
      this.pointerTargetX = Math.max(42, Math.min(this.width - 70, x));
      this.pointerTargetY = Math.max(58, Math.min(this.height - 42, y));
    }
  }

  public triggerSpecialPulse() {
    if (this.status !== 'playing' || this.portal || this.specialCooldown > 0) return;
    const loadout = this.getLoadout();
    const uLv = loadout.utriculariaLevel;
    const profile = getPetSpecialProfile(this.selectedPet, loadout.specialPower, uLv);

    this.specialCooldown = this.config.player.specialCooldownSec * profile.cooldownFactor;

    if (this.selectedPet === 'roy') {
      this.royScreamTimer = 0.72;
      this.royScreamRadius = 56;
      addScreenShakeTrauma(this.shakeState, 0.58);
      soundEngine.playRoyHorridScream();

      for (const eb of this.enemyBullets) {
        if (!eb.active) continue;
        const hitFromPlayer = checkCircleCollision(this.playerX, this.playerY, profile.bulletClearRadius, eb.x, eb.y, eb.radius);
        const hitFromRoy = checkCircleCollision(this.frog.x, this.frog.y, profile.bulletClearRadius, eb.x, eb.y, eb.radius);
        if (hitFromPlayer || hitFromRoy) {
          eb.active = false;
          this.spawnBurst(eb.x, eb.y, '#FACC15', 4, 155, false);
        }
      }

      for (const enemy of this.enemies) {
        if (enemy.dying) continue;
        const hitFromPlayer = checkCircleCollision(this.playerX, this.playerY, profile.damageRadius, enemy.x, enemy.y, enemy.radius);
        const hitFromRoy = checkCircleCollision(this.frog.x, this.frog.y, profile.damageRadius, enemy.x, enemy.y, enemy.radius);
        if (hitFromPlayer || hitFromRoy) {
          enemy.hp -= profile.enemyDamage;
          enemy.hitFlashTimer = 0.08;
          enemy.slowTimer = Math.max(enemy.slowTimer, profile.stunSec);
          enemy.slowFactor = Math.max(enemy.slowFactor, 0.68);
          enemy.x = Math.min(this.width - 36, enemy.x + profile.knockbackX);
          this.spawnBurst(enemy.x, enemy.y, '#FDE047', 6, 170, true);
        }
      }

      if (this.boss.active && this.boss.dyingTimer <= 0 && profile.bossDamage > 0) {
        this.boss.hp -= profile.bossDamage;
        this.boss.hitFlashTimer = 0.08;
        triggerBossHitShake(this.shakeState, {
          damage: profile.bossDamage,
          heavy: true,
          impactDirX: this.boss.x - this.frog.x,
          impactDirY: this.boss.y - this.frog.y,
        });
        this.spawnBurst(this.boss.x - 24, this.boss.y, '#FDE047', 10, 200, true);
      }

      this.callouts.push({
        x: this.frog.x + 18,
        y: this.frog.y - 28,
        vy: -38,
        text: profile.calloutText,
        color: '#FACC15',
        life: 1.05,
        maxLife: 1.05,
      });
    } else if (this.selectedPet === 'sicario') {
      // Sicario summons the Mafia Gatuna: 4 gangster tabby cats stay on screen for ~4.8s
      addScreenShakeTrauma(this.shakeState, 0.46);
      soundEngine.playSicarioMafiaCall();

      for (const eb of this.enemyBullets) {
        if (!eb.active) continue;
        if (
          checkCircleCollision(this.playerX, this.playerY, profile.bulletClearRadius, eb.x, eb.y, eb.radius) ||
          checkCircleCollision(this.frog.x, this.frog.y, profile.bulletClearRadius, eb.x, eb.y, eb.radius)
        ) {
          eb.active = false;
          this.spawnBurst(eb.x, eb.y, '#4ADE80', 4, 145, false);
        }
      }

      const squadConfigs = [
        { ox: 120, oy: -82, coat: '#94A3B8', stripe: '#334155', band: '#22C55E' },
        { ox: 155, oy: 74, coat: '#64748B', stripe: '#1E293B', band: '#FACC15' },
        { ox: 82, oy: -125, coat: '#CBD5E1', stripe: '#475569', band: '#F43F5E' },
        { ox: 96, oy: 122, coat: '#475569', stripe: '#0F172A', band: '#38BDF8' },
      ];

      this.mafiaCats = [];
      const squadCount = Math.max(1, profile.squadSize);
      for (let i = 0; i < squadCount; i++) {
        const cfg = squadConfigs[i % squadConfigs.length];
        const spawnX = Math.max(44, this.frog.x - 18 + (i % 2) * 14);
        const spawnY = Math.max(64, Math.min(this.height - 64, this.frog.y + (i - 1.5) * 34));
        this.mafiaCats.push({
          id: this.nextMafiaCatId++,
          x: spawnX,
          y: spawnY,
          vx: 320,
          vy: (i - 1.5) * 90,
          homeOffsetX: cfg.ox,
          homeOffsetY: cfg.oy,
          coatColor: cfg.coat,
          stripeColor: cfg.stripe,
          hatBand: cfg.band,
          fireTimer: 0.16 + i * 0.08,
          slashTimer: 0,
          slashX: spawnX + 24,
          slashY: spawnY,
          life: profile.durationSec,
          maxLife: profile.durationSec,
          bobSeed: i * 1.65,
        });
        this.spawnBurst(spawnX, spawnY, '#4ADE80', 6, 150, true);
      }

      this.callouts.push({
        x: this.frog.x + 22,
        y: this.frog.y - 30,
        vy: -36,
        text: profile.calloutText,
        color: profile.calloutColor,
        life: 1.25,
        maxLife: 1.25,
      });
    } else if (this.selectedPet === 'palito') {
      // PALITO: Onda Enamoradora — charms ALL enemies on screen (no shooting, slow dreamy circles!)
      this.palitoLoveTimer = 0.85;
      this.palitoLoveRadius = 36;
      this.palitoCharmActiveTimer = profile.durationSec;
      addScreenShakeTrauma(this.shakeState, 0.35);
      soundEngine.playPalitoCharmWave();

      for (const eb of this.enemyBullets) {
        if (!eb.active) continue;
        if (
          checkCircleCollision(this.playerX, this.playerY, profile.bulletClearRadius, eb.x, eb.y, eb.radius) ||
          checkCircleCollision(this.frog.x, this.frog.y, profile.bulletClearRadius, eb.x, eb.y, eb.radius)
        ) {
          eb.active = false;
          this.spawnBurst(eb.x, eb.y, '#F472B6', 4, 140, false);
        }
      }

      for (const enemy of this.enemies) {
        if (enemy.dying) continue;
        enemy.hp -= profile.enemyDamage;
        enemy.hitFlashTimer = 0.06;
        enemy.windupTimer = 0;
        enemy.charmedTimer = Math.max(enemy.charmedTimer ?? 0, profile.stunSec);
        enemy.charmAnchorX = enemy.x;
        enemy.charmAnchorY = enemy.y;
        enemy.charmAngle = Math.random() * Math.PI * 2;
        this.spawnBurst(enemy.x, enemy.y, '#F472B6', 5, 130, false);
      }

      if (this.boss.active && this.boss.dyingTimer <= 0) {
        this.boss.hp -= profile.bossDamage;
        this.boss.hitFlashTimer = 0.08;
        this.boss.fireTimer = Math.max(this.boss.fireTimer, 2.2);
        triggerBossHitShake(this.shakeState, {
          damage: profile.bossDamage,
          heavy: true,
          impactDirX: this.boss.x - this.frog.x,
          impactDirY: this.boss.y - this.frog.y,
        });
        this.spawnBurst(this.boss.x - 20, this.boss.y, '#F472B6', 10, 175, true);
      }

      this.callouts.push({
        x: this.frog.x + 24,
        y: this.frog.y - 30,
        vy: -34,
        text: profile.calloutText,
        color: profile.calloutColor,
        life: 1.35,
        maxLife: 1.35,
      });
    } else if (this.selectedPet === 'carpincho') {
      // CARPINCHO MATERO: Los Infernales a Caballo leaping from bottom-left to a long ¡SAPUCAAAAAAIIII!!
      this.sapucaiCryTimer = 2.45;
      addScreenShakeTrauma(this.shakeState, 0.56);
      soundEngine.playSapucaiCry();

      for (const eb of this.enemyBullets) {
        if (!eb.active) continue;
        if (
          checkCircleCollision(this.playerX, this.playerY, profile.bulletClearRadius, eb.x, eb.y, eb.radius) ||
          checkCircleCollision(this.frog.x, this.frog.y, profile.bulletClearRadius, eb.x, eb.y, eb.radius)
        ) {
          eb.active = false;
          this.spawnBurst(eb.x, eb.y, '#FACC15', 4, 150, false);
        }
      }

      const horsePalette = ['#78350F', '#451A03', '#92400E', '#1E1B18', '#B45309'];
      const riderCount = Math.max(4, profile.squadSize);
      for (let i = 0; i < riderCount; i++) {
        this.infernalesRiders.push({
          id: this.nextInfernalId++,
          x: -68 - i * 98,
          y: this.height - 54 - (i % 2) * 32,
          vx: 540 + i * 24,
          vy: -470 - (i % 3) * 62,
          horseColor: horsePalette[i % horsePalette.length],
          ponchoColor: '#B91C1C',
          radius: 36,
          life: profile.durationSec,
          maxLife: profile.durationSec,
          gallopPhase: i * 1.4,
          hitIds: [],
        });
      }

      this.callouts.push({
        x: this.frog.x + 36,
        y: this.frog.y - 34,
        vy: -30,
        text: profile.calloutText,
        color: profile.calloutColor,
        life: 2.1,
        maxLife: 2.1,
      });
    } else {
      // SAPO BATRICIO: Llamado de Apareamiento — sings croaks summoning a rain of poisonous female frogs!
      this.specialPulseTimer = 0.45;
      this.specialPulseRadius = 40;
      this.frog.singingTimer = 2.85;
      this.frog.throatPuff = 0.9;
      this.batricioRainPending = profile.squadSize;
      this.batricioRainTimer = 0.04;
      this.batricioRainDamage = profile.enemyDamage;
      addScreenShakeTrauma(this.shakeState, 0.42);
      soundEngine.playBatricioMatingCall();

      let cleared = 0;
      for (const eb of this.enemyBullets) {
        if (!eb.active) continue;
        if (checkCircleCollision(this.playerX, this.playerY, profile.bulletClearRadius, eb.x, eb.y, eb.radius)) {
          eb.active = false;
          this.spawnBurst(eb.x, eb.y, '#A3E635', 4, 140, false);
          cleared++;
        }
      }

      if (loadout.vacuumLifeSiphon && cleared >= 3 && this.hp < this.maxHp) {
        this.hp = Math.min(this.maxHp, this.hp + 1);
        this.callouts.push({
          x: this.playerX,
          y: this.playerY - 34,
          vy: -42,
          text: '+1 SIFÓN VITAL',
          color: '#4ADE80',
          life: 1.1,
          maxLife: 1.1,
        });
      } else {
        this.callouts.push({
          x: this.frog.x + 24,
          y: this.frog.y - 32,
          vy: -36,
          text: profile.calloutText,
          color: profile.calloutColor,
          life: 1.35,
          maxLife: 1.35,
        });
      }
    }
    this.emitHud();
  }

  public step(rawDt: number) {
    const dt = Number.isFinite(rawDt) && rawDt > 0 ? Math.min(rawDt, 0.05) : 0;
    if (dt <= 0) return;
    this.time += dt;

    if (this.status !== 'playing') return;

    if (this.landscapeBlend < 1) {
      this.landscapeBlend = Math.min(1, this.landscapeBlend + dt * 0.65);
    }

    stepScreenShake(this.shakeState, dt);
    if (this.playerHitFlash > 0) this.playerHitFlash = Math.max(0, this.playerHitFlash - dt);
    this.playerScaleX += (1 - this.playerScaleX) * Math.min(1, dt * 14);
    this.playerScaleY += (1 - this.playerScaleY) * Math.min(1, dt * 14);

    if (this.defeatBeatTimer > 0) {
      // If a final boss is already dying or portal transition is active, victory takes precedence over defeat
      if ((this.boss.active && !this.boss.isMiniBoss && this.boss.dyingTimer > 0) || this.portal !== null) {
        this.defeatBeatTimer = 0;
        this.hp = Math.max(1, this.hp);
      } else {
        this.defeatBeatTimer -= dt;
        this.updateParticles(dt);
        if (this.defeatBeatTimer <= 0) {
          this.finalizeRunRecord(false);
          this.setStatus('gameover');
        }
        return;
      }
    }

    if (this.hitstopTimer > 0) {
      this.hitstopTimer = Math.max(0, this.hitstopTimer - dt);
      this.updateParticles(dt);
      return;
    }

    this.elapsedSec += dt;
    this.escalation = computeDynamicEscalation(this.score, this.elapsedSec, this.difficulty);

    // Advance level beat clock synced to live music playback (with smooth fallback & jump guard)
    this.prevBeatClockSec = this.levelBeatClockSec;
    const liveAudioTime = soundEngine.getMusicTimeSec(this.levelIndex);
    if (liveAudioTime !== null && Number.isFinite(liveAudioTime)) {
      if (liveAudioTime + 0.4 < this.prevBeatClockSec) {
        // Track looped back to start
        this.prevBeatClockSec = Math.max(0, liveAudioTime - dt);
        this.levelBeatClockSec = liveAudioTime;
      } else if (liveAudioTime >= this.prevBeatClockSec && liveAudioTime - this.prevBeatClockSec <= 0.65) {
        this.levelBeatClockSec = liveAudioTime;
      } else {
        this.levelBeatClockSec += dt;
      }
    } else {
      this.levelBeatClockSec += dt;
    }

    const rhythm = getLevelRhythmProfile(this.levelIndex);
    const beatSnap = computeBeatSnapshot(this.levelBeatClockSec, rhythm.bpm, rhythm.firstDropSec);
    this.beatPulse = beatSnap.beatPulse;

    if (!this.boss.active || this.boss.windActiveTimer <= 0) {
      this.windForceX *= Math.max(0, 1 - dt * 5);
      if (Math.abs(this.windForceX) < 1) this.windForceX = 0;
    }

    if (this.killHitstopCooldown > 0) this.killHitstopCooldown = Math.max(0, this.killHitstopCooldown - dt);
    if (this.playerInvulnTimer > 0) this.playerInvulnTimer = Math.max(0, this.playerInvulnTimer - dt);
    if (this.specialCooldown > 0) this.specialCooldown = Math.max(0, this.specialCooldown - dt);
    if (this.secondaryCooldown > 0) this.secondaryCooldown = Math.max(0, this.secondaryCooldown - dt);
    if (this.heroJawChompTimer > 0) this.heroJawChompTimer = Math.max(0, this.heroJawChompTimer - dt);
    if (this.heroRecoil > 0) this.heroRecoil = Math.max(0, this.heroRecoil - dt * 5.2);
    if (this.mutagenDropCooldown > 0) this.mutagenDropCooldown = Math.max(0, this.mutagenDropCooldown - dt);

    // Update dynamic approaching-invasion intensity & alert signals
    const curWave = this.config.waves[this.waveIndex];
    const levelWaves = this.getLevelWaves(this.levelIndex);
    const waveInLevel =
      curWave && curWave.level === this.levelIndex
        ? Math.max(1, levelWaves.indexOf(curWave) + 1)
        : levelWaves.length;
    const waveProg = curWave ? this.waveTimer / Math.max(1, curWave.durationSec) : 1;
    const inv = computeInvasionState(
      this.levelIndex,
      waveInLevel,
      Math.max(1, levelWaves.length),
      waveProg,
      this.boss.active,
      this.boss.isMiniBoss
    );
    this.invasionIntensity = inv.intensity;
    this.invasionAlertLabel = inv.alertLabel;
    if (inv.stage > this.prevInvasionStage) {
      if (inv.stage >= 2 && this.prevInvasionStage >= 1 && !this.boss.active) {
        soundEngine.playInvasionHorn();
      }
      this.prevInvasionStage = inv.stage;
    }

    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.comboTimer = 0;
        this.combo = 0;
      }
    }

    if (this.comboMilestone) {
      this.comboMilestone.ttl -= dt;
      if (this.comboMilestone.ttl <= 0) {
        this.comboMilestone = null;
      }
    }

    if (this.specialPulseTimer > 0) {
      this.specialPulseTimer = Math.max(0, this.specialPulseTimer - dt);
      this.specialPulseRadius += 700 * dt;
    }

    if (this.royScreamTimer > 0) {
      this.royScreamTimer = Math.max(0, this.royScreamTimer - dt);
      this.royScreamRadius += 820 * dt;
    }

    if (this.palitoLoveTimer > 0) {
      this.palitoLoveTimer = Math.max(0, this.palitoLoveTimer - dt);
      this.palitoLoveRadius += 1260 * dt;
    }

    if (this.palitoCharmActiveTimer > 0) {
      this.palitoCharmActiveTimer = Math.max(0, this.palitoCharmActiveTimer - dt);
    }

    if (this.sapucaiCryTimer > 0) {
      this.sapucaiCryTimer = Math.max(0, this.sapucaiCryTimer - dt);
    }

    if (this.banner) {
      this.banner.ttl -= dt;
      if (this.banner.ttl <= 0) this.banner = null;
    }

    if (this.portal) {
      this.updatePortalSequence(dt);
      this.updatePlayerBullets(dt);
      this.updateParticles(dt);
      this.updateCallouts(dt);
      this.hudAccumulator += dt;
      if (this.hudAccumulator >= HUD_EMIT_INTERVAL_SEC) {
        this.hudAccumulator = 0;
        this.emitHud();
      }
      return;
    }

    this.updatePlayer(dt);
    this.updatePetCompanion(dt);
    this.updateMafiaCats(dt);
    this.updatePoisonFrogs(dt);
    this.updateInfernalesRiders(dt);
    this.updateWavesAndSpawns(dt);
    this.updatePickups(dt);
    this.updateAcidPools(dt);
    this.updateVortexes(dt);
    this.updatePlayerBullets(dt);
    this.updateEnemies(dt);
    this.updateBoss(dt);
    this.updateEnemyBullets(dt);
    this.updateParticles(dt);
    this.updateCallouts(dt);

    this.hudAccumulator += dt;
    if (this.hudAccumulator >= HUD_EMIT_INTERVAL_SEC) {
      this.hudAccumulator = 0;
      this.emitHud();
    }
  }

  private updatePortalSequence(dt: number) {
    const p = this.portal;
    if (!p) return;

    p.progress = Math.min(1, p.progress + dt / Math.max(0.1, p.duration));
    this.playerInvulnTimer = Math.max(this.playerInvulnTimer, 0.4);

    if (p.phase === 'forming') {
      // Swirling boss-defeat particles condense inward into the swirling dimensional rift!
      p.radius = p.maxRadius * (0.18 + 0.82 * Math.sin(p.progress * Math.PI * 0.5));
      for (const pt of this.particlePool.items) {
        if (!pt.active) continue;
        const dx = p.x - pt.x;
        const dy = p.y - pt.y;
        const dist = Math.max(12, Math.hypot(dx, dy));
        const nx = dx / dist;
        const ny = dy / dist;
        // Swirl tangential + inward pull
        pt.vx = pt.vx * 0.88 + (nx * 360 - ny * 210) * dt * 6;
        pt.vy = pt.vy * 0.88 + (ny * 360 + nx * 210) * dt * 6;
      }
      if (p.progress >= 1) {
        p.phase = 'entering';
        p.progress = 0;
        p.duration = 1.65;
        p.radius = p.maxRadius;
        this.portalOriginX = this.playerX;
        this.portalOriginY = this.playerY;
      }
      return;
    }

    if (p.phase === 'entering') {
      const ease = p.progress * p.progress * (3 - 2 * p.progress);
      this.playerX = this.portalOriginX + (p.x - this.portalOriginX) * ease;
      this.playerY = this.portalOriginY + (p.y - this.portalOriginY) * ease;
      this.playerVx = (p.x - this.portalOriginX) * 0.6;
      this.playerVy = (p.y - this.portalOriginY) * 0.6;
      this.heroBankAngle = Math.max(-1, Math.min(1, (p.y - this.portalOriginY) / 220));
      const scaleFade = Math.max(0.08, 1 - Math.max(0, (p.progress - 0.58) / 0.42) * 0.92);
      this.playerScaleX = scaleFade;
      this.playerScaleY = scaleFade;
      this.frog.x += (this.playerX - 28 * scaleFade - this.frog.x) * Math.min(1, dt * 10);
      this.frog.y += (this.playerY - 22 * scaleFade - this.frog.y) * Math.min(1, dt * 10);

      if (Math.random() < 0.45) {
        this.spawnBurst(p.x + (Math.random() - 0.5) * 40, p.y + (Math.random() - 0.5) * 40, '#38BDF8', 2, 110, false);
      }

      if (p.progress >= 1) {
        this.playerScaleX = 1;
        this.playerScaleY = 1;
        this.portal = null;
        const result = this.pendingBossClearResult ?? 'level_clear';
        this.pendingBossClearResult = null;
        if (result === 'level_clear') {
          this.clearInputs();
          this.setStatus('level_clear');
        } else {
          this.finalizeRunRecord(true);
          soundEngine.playVictory();
          this.setStatus('victory');
        }
      }
      return;
    }

    // phase === 'exiting' (Levels 2-5 start: hero emerges out of the rift linked to the prior world!)
    const targetX = Math.min(195, this.width * 0.19);
    const targetY = this.height * 0.5;
    const easeOut = 1 - Math.pow(1 - p.progress, 3);
    this.playerX = p.x - 24 + (targetX - (p.x - 24)) * easeOut;
    this.playerY = p.y + (targetY - p.y) * easeOut;
    const emergeScale = Math.min(1, 0.25 + easeOut * 0.75);
    this.playerScaleX = emergeScale;
    this.playerScaleY = emergeScale;
    this.frog.x += (this.playerX - 58 - this.frog.x) * Math.min(1, dt * 10);
    this.frog.y += (this.playerY - 48 - this.frog.y) * Math.min(1, dt * 10);

    if (p.progress > 0.65) {
      p.radius = p.maxRadius * Math.max(0, 1 - (p.progress - 0.65) / 0.35);
    }

    if (p.progress >= 1) {
      this.playerScaleX = 1;
      this.playerScaleY = 1;
      this.portal = null;
      this.spawnBurst(this.playerX, this.playerY, '#38BDF8', 16, 195, true);
    }
  }

  private updatePlayer(dt: number) {
    const shiftFocus =
      this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') || this.gamepadFocusSlow;
    const speed = this.config.player.moveSpeed * (shiftFocus ? 0.55 : 1);

    let dx = 0;
    let dy = 0;
    if (this.keys.has('ArrowLeft') || this.keys.has('KeyA')) dx -= 1;
    if (this.keys.has('ArrowRight') || this.keys.has('KeyD')) dx += 1;
    if (this.keys.has('ArrowUp') || this.keys.has('KeyW')) dy -= 1;
    if (this.keys.has('ArrowDown') || this.keys.has('KeyS')) dy += 1;

    // Blend analog Gamepad stick / D-Pad if keyboard isn't pressed
    if (dx === 0 && dy === 0 && (this.gamepadMoveX !== 0 || this.gamepadMoveY !== 0)) {
      dx = this.gamepadMoveX;
      dy = this.gamepadMoveY;
    }

    if (dx !== 0 || dy !== 0) {
      const len = Math.hypot(dx, dy);
      const norm = len > 1 ? 1 / len : 1;
      this.playerVx = dx * norm * speed;
      this.playerVy = dy * norm * speed;
      this.playerX += this.playerVx * dt;
      this.playerY += this.playerVy * dt;
    } else if (this.pointerActive) {
      const pdx = this.pointerTargetX - this.playerX;
      const pdy = this.pointerTargetY - this.playerY;
      this.playerVx = pdx * 10;
      this.playerVy = pdy * 10;
      this.playerX += pdx * Math.min(1, dt * 12);
      this.playerY += pdy * Math.min(1, dt * 12);
    } else {
      this.playerVx *= 0.8;
      this.playerVy *= 0.8;
    }

    // Smooth 2.5D wing banking animation driven by vertical climb/dive velocity
    const targetBank = Math.max(-1, Math.min(1, this.playerVy / Math.max(120, this.config.player.moveSpeed)));
    this.heroBankAngle += (targetBank - this.heroBankAngle) * Math.min(1, dt * 10);

    if (this.windForceX !== 0) {
      this.playerX += this.windForceX * dt;
    }

    this.playerX = Math.max(42, Math.min(this.width - 70, this.playerX));
    this.playerY = Math.max(58, Math.min(this.height - 42, this.playerY));

    const wantsFire =
      this.config.player.autoFire ||
      this.manualFireHeld ||
      this.keys.has('KeyJ');

    this.fireCooldown -= dt;
    if (wantsFire && this.fireCooldown <= 0) {
      const slots = resolveAbilitySlots(this.speciesLevels, this.primarySpecies, this.secondarySpecies);
      this.primarySpecies = slots.primary;
      this.secondarySpecies = slots.secondary;

      const loadout = this.getLoadout();
      this.fireCooldown = loadout.fireInterval;
      this.shotIndex++;
      const isApexFusion = loadout.isSuperSaiyanFusion && loadout.fusedPair !== null;
      const pattern = isApexFusion && loadout.fusedPair
        ? buildApexFusionPrimaryPattern(
            loadout.fusedPair[0],
            loadout.fusedPair[1],
            this.speciesLevels,
            this.shotIndex,
            this.config
          )
        : buildPrimaryShotPattern(
            this.primarySpecies,
            this.speciesLevels,
            this.shotIndex,
            this.config
          );
      for (const desc of pattern) {
        this.spawnPlayerBullet(desc, this.playerX + desc.offsetX, this.playerY + desc.offsetY);
      }
      this.heroJawChompTimer = Math.max(this.heroJawChompTimer, 0.13);
      this.heroRecoil = Math.max(this.heroRecoil, 0.38);
      this.playerScaleX = 0.96;
      this.playerScaleY = 1.04;
      if (this.shotIndex % 2 === 0) {
        soundEngine.playShoot(loadout.activeSpecies.length, this.combo);
      }
      if (pattern.some((p) => p.kind === 'snap')) {
        soundEngine.playSnapBite();
      }
    }
  }

  private updatePetCompanion(dt: number) {
    this.frog.enabled = this.config.player.frogAlly.enabled;
    if (!this.frog.enabled) return;

    stepFrogAllyPosition(
      this.frog,
      this.playerX,
      this.playerY,
      this.time,
      dt,
      this.width,
      this.height
    );

    // Tick pet-specific animation timers
    if ((this.frog.muzzleFlashTimer ?? 0) > 0) {
      this.frog.muzzleFlashTimer = Math.max(0, (this.frog.muzzleFlashTimer ?? 0) - dt);
    }
    if ((this.frog.meowBurstTimer ?? 0) > 0) {
      this.frog.meowBurstTimer = Math.max(0, (this.frog.meowBurstTimer ?? 0) - dt);
    }
    if ((this.frog.shieldBlockTimer ?? 0) > 0) {
      this.frog.shieldBlockTimer = Math.max(0, (this.frog.shieldBlockTimer ?? 0) - dt);
    }
    if ((this.frog.faconSlashTimer ?? 0) > 0) {
      this.frog.faconSlashTimer = Math.max(0, (this.frog.faconSlashTimer ?? 0) - dt);
    }
    if ((this.frog.ponchoBlockTimer ?? 0) > 0) {
      this.frog.ponchoBlockTimer = Math.max(0, (this.frog.ponchoBlockTimer ?? 0) - dt);
    }
    if ((this.frog.singingTimer ?? 0) > 0) {
      this.frog.singingTimer = Math.max(0, (this.frog.singingTimer ?? 0) - dt);
    }

    const pet = this.selectedPet;

    // 1) Companion periodic ranged shot bespoke to each pet
    this.frog.bubbleTimer -= dt;
    if (this.frog.bubbleTimer <= 0) {
      if (pet === 'sicario') {
        // Sicario fires crisp high-velocity PISTOL BULLETS!
        this.frog.bubbleTimer = 0.36;
        this.frog.muzzleFlashTimer = 0.12;
        soundEngine.playSicarioGunshot();
        this.spawnPlayerBullet(
          {
            kind: 'pistol_shot',
            offsetX: 22,
            offsetY: 4,
            vx: 860,
            vy: 0,
            gravity: 0,
            drag: 1,
            bounces: 0,
            damage: Math.round(this.config.player.frogAlly.bubbleDamage * 1.25),
            radius: 5.5,
            color: '#FACC15',
            glowColor: '#FEF9C3',
            slowFactor: 0,
            acidDps: 0,
            acidRadius: 0,
            armorPierce: true,
            chainAcid: false,
            pullStrength: 0,
            spawnsVortex: false,
            piercing: false,
          },
          this.frog.x + 22,
          this.frog.y + 4
        );
      } else if (pet === 'roy') {
        // Roy emits sonic annoying meow arcs forward
        this.frog.bubbleTimer = 0.4;
        this.spawnPlayerBullet(
          {
            kind: 'meow_wave',
            offsetX: 16,
            offsetY: -2,
            vx: 660,
            vy: -8,
            gravity: 0,
            drag: 0.996,
            bounces: 0,
            damage: Math.round(this.config.player.frogAlly.bubbleDamage * 1.12),
            radius: 6.5,
            color: '#FDE047',
            glowColor: '#FB7185',
            slowFactor: 0.14,
            acidDps: 0,
            acidRadius: 0,
            armorPierce: false,
            chainAcid: false,
            pullStrength: 0,
            spawnsVortex: false,
            piercing: false,
          },
          this.frog.x + 16,
          this.frog.y - 2
        );
      } else if (pet === 'palito') {
        // Palito dispara corazones que enamoran a sus enemigos lentamente
        this.frog.bubbleTimer = 0.56;
        this.spawnPlayerBullet(
          {
            kind: 'palito_heart',
            offsetX: 18,
            offsetY: -2,
            vx: 430,
            vy: -4,
            gravity: 0,
            drag: 0.997,
            bounces: 0,
            damage: Math.round(this.config.player.frogAlly.bubbleDamage * 0.95),
            radius: 7.4,
            color: '#F472B6',
            glowColor: '#FEF08A',
            slowFactor: 0.24,
            acidDps: 0,
            acidRadius: 0,
            armorPierce: false,
            chainAcid: false,
            pullStrength: 0,
            spawnsVortex: false,
            piercing: false,
          },
          this.frog.x + 18,
          this.frog.y - 2
        );
      } else if (pet === 'carpincho') {
        // Carpincho Matero NO lanza proyectiles: solo protege con su poncho y pelea cuerpo a cuerpo con facón
        this.frog.bubbleTimer = 0.5;
      } else {
        // Sapo Batricio fires buoyant dew bubbles
        this.frog.bubbleTimer = 0.44;
        this.spawnPlayerBullet(
          {
            kind: 'frog_bubble',
            offsetX: 16,
            offsetY: -2,
            vx: 520,
            vy: 25,
            gravity: -115,
            drag: 0.992,
            bounces: 0,
            damage: Math.round(this.config.player.frogAlly.bubbleDamage),
            radius: 6.5,
            color: '#65A30D',
            glowColor: '#DCFCE7',
            slowFactor: 0.2,
            acidDps: 0,
            acidRadius: 0,
            armorPierce: false,
            chainAcid: false,
            pullStrength: 0,
            spawnsVortex: false,
            piercing: false,
          },
          this.frog.x + 16,
          this.frog.y - 2
        );
      }
    }

    // 2) Signature Close-Range Pet Behavior (distinct for every single pet!)
    if (this.frog.tongueCooldown <= 0) {
      if (pet === 'roy') {
        // ROY: NO tongue/paw lash! Emits annoying close-range meows that shatter nearby bullets & stun close foes!
        const nearbyBullet = this.enemyBullets.some(
          (eb) => eb.active && checkCircleCollision(this.frog.x, this.frog.y, 130, eb.x, eb.y, eb.radius)
        );
        const nearbyEnemy = this.enemies.some(
          (e) => !e.dying && checkCircleCollision(this.frog.x, this.frog.y, 170, e.x, e.y, e.radius)
        );
        if (nearbyBullet || nearbyEnemy) {
          this.frog.tongueCooldown = this.config.player.frogAlly.tongueCooldownSec * 0.92;
          this.frog.meowBurstTimer = 0.28;
          soundEngine.playRoyAnnoyingMeow();

          for (const eb of this.enemyBullets) {
            if (eb.active && checkCircleCollision(this.frog.x, this.frog.y, 135, eb.x, eb.y, eb.radius)) {
              eb.active = false;
              this.score += 40;
              this.specialCooldown = Math.max(0, this.specialCooldown - 0.55);
              this.spawnBurst(eb.x, eb.y, '#FDE047', 5, 135, false);
            }
          }
          for (const en of this.enemies) {
            if (!en.dying && checkCircleCollision(this.frog.x, this.frog.y, 175, en.x, en.y, en.radius)) {
              en.hp -= this.config.player.frogAlly.bubbleDamage * 2.4;
              en.hitFlashTimer = 0.07;
              en.slowTimer = Math.max(en.slowTimer, 1.5);
              en.slowFactor = Math.max(en.slowFactor, 0.5);
              en.x = Math.min(this.width - 36, en.x + 28);
              this.spawnBurst(en.x, en.y, '#FB7185', 7, 145, true);
            }
          }
          const meows = ['¡MIAU!', '¡ÑAAAU!', '¡MREOW!'];
          this.callouts.push({
            x: this.frog.x + 14,
            y: this.frog.y - 22,
            vy: -36,
            text: meows[Math.floor(this.time * 7) % meows.length],
            color: '#FDE047',
            life: 0.78,
            maxLife: 0.78,
          });
        }
      } else if (pet === 'sicario') {
        // SICARIO: Uses PISTOL & GUNSHOTS on nearby enemies/bullets (NO tongue/claw!)
        const target = pickFrogTongueTarget(
          this.frog.x,
          this.frog.y,
          this.config.player.frogAlly.tongueRange * 1.15,
          this.enemyBullets,
          this.enemies
        );
        if (target) {
          this.frog.tongueCooldown = this.config.player.frogAlly.tongueCooldownSec * 0.82;
          this.frog.muzzleFlashTimer = 0.22;
          soundEngine.playSicarioGunshot();

          if (target.kind === 'bullet') {
            const eb = this.enemyBullets[target.index];
            eb.active = false;
            this.score += 50;
            this.specialCooldown = Math.max(0, this.specialCooldown - 0.7);
            this.spawnBurst(eb.x, eb.y, '#FACC15', 7, 150, false);
          } else {
            const en = this.enemies.find((e) => e.id === target.id);
            if (en) {
              const adx = en.x - this.frog.x;
              const ady = en.y - this.frog.y;
              const dist = Math.max(1, Math.hypot(adx, ady));
              for (const spread of [-0.07, 0.07]) {
                const ang = Math.atan2(ady, adx) + spread;
                this.spawnPlayerBullet(
                  {
                    kind: 'pistol_shot',
                    offsetX: 20,
                    offsetY: 4,
                    vx: Math.cos(ang) * 900,
                    vy: Math.sin(ang) * 900,
                    gravity: 0,
                    drag: 1,
                    bounces: 0,
                    damage: Math.round(this.config.player.frogAlly.bubbleDamage * 1.7),
                    radius: 6,
                    color: '#FACC15',
                    glowColor: '#FEF9C3',
                    slowFactor: 0,
                    acidDps: 0,
                    acidRadius: 0,
                    armorPierce: true,
                    chainAcid: false,
                    pullStrength: 0,
                    spawnsVortex: false,
                    piercing: false,
                  },
                  this.frog.x + (adx / dist) * 18,
                  this.frog.y + (ady / dist) * 18
                );
              }
            }
          }
          this.callouts.push({
            x: this.frog.x + 16,
            y: this.frog.y - 20,
            vy: -36,
            text: '¡BANG!',
            color: '#FACC15',
            life: 0.7,
            maxLife: 0.7,
          });
        }
      } else if (pet === 'palito') {
        // PALITO: Protective Shield replacing tongue — defends protagonist from incoming projectiles & close foes!
        let blockedCount = 0;
        for (const eb of this.enemyBullets) {
          if (!eb.active) continue;
          const nearPilot = checkCircleCollision(this.playerX + 18, this.playerY, 118, eb.x, eb.y, eb.radius);
          const nearPalito = checkCircleCollision(this.frog.x, this.frog.y, 110, eb.x, eb.y, eb.radius);
          if (nearPilot || nearPalito) {
            eb.active = false;
            blockedCount++;
            this.score += 55;
            this.specialCooldown = Math.max(0, this.specialCooldown - 0.65);
            this.spawnBurst(eb.x, eb.y, '#FEF08A', 6, 145, false);
            if (blockedCount >= 3) break;
          }
        }
        let pushedEnemy = false;
        if (blockedCount === 0) {
          for (const en of this.enemies) {
            if (!en.dying && checkCircleCollision(this.playerX + 20, this.playerY, 128, en.x, en.y, en.radius)) {
              en.hp -= this.config.player.frogAlly.bubbleDamage * 1.6;
              en.hitFlashTimer = 0.06;
              en.x = Math.min(this.width - 36, en.x + 58);
              en.slowTimer = Math.max(en.slowTimer, 1.3);
              en.slowFactor = Math.max(en.slowFactor, 0.45);
              this.spawnBurst(en.x, en.y, '#FACC15', 7, 150, true);
              pushedEnemy = true;
              break;
            }
          }
        }
        if (blockedCount > 0 || pushedEnemy) {
          this.frog.tongueCooldown = this.config.player.frogAlly.tongueCooldownSec * 0.88;
          this.frog.shieldBlockTimer = 0.38;
          soundEngine.playPalitoShieldBlock();
          this.callouts.push({
            x: this.playerX + 34,
            y: this.playerY - 26,
            vy: -36,
            text: '¡ESCUDO PALITO!',
            color: '#FDE047',
            life: 0.85,
            maxLife: 0.85,
          });
        }
      } else if (pet === 'carpincho') {
        // CARPINCHO MATERO: Esgrima Gaucha — blocks projectiles with poncho shield OR slices close foes with faconazos!
        let parried = 0;
        for (const eb of this.enemyBullets) {
          if (!eb.active) continue;
          const nearPilot = checkCircleCollision(this.playerX + 12, this.playerY, 110, eb.x, eb.y, eb.radius);
          const nearCarpincho = checkCircleCollision(this.frog.x + 12, this.frog.y, 122, eb.x, eb.y, eb.radius);
          if (nearPilot || nearCarpincho) {
            eb.active = false;
            parried++;
            this.score += 55;
            this.specialCooldown = Math.max(0, this.specialCooldown - 0.65);
            this.spawnBurst(eb.x, eb.y, '#EF4444', 6, 150, false);
            if (parried >= 2) break;
          }
        }
        if (parried > 0) {
          this.frog.tongueCooldown = this.config.player.frogAlly.tongueCooldownSec * 0.85;
          this.frog.ponchoBlockTimer = 0.34;
          soundEngine.playPonchoParry();
          this.callouts.push({
            x: this.frog.x + 18,
            y: this.frog.y - 22,
            vy: -36,
            text: '¡PONCHO!',
            color: '#FCA5A5',
            life: 0.8,
            maxLife: 0.8,
          });
        } else {
          // Faconazos de largo alcance sobre enemigos cercanos (sin disparos)
          let slashed = false;
          for (const en of this.enemies) {
            if (!en.dying && checkCircleCollision(this.frog.x + 28, this.frog.y, CARPINCHO_FACON_RANGE, en.x, en.y, en.radius)) {
              en.hp -= this.config.player.frogAlly.bubbleDamage * 3.3;
              en.hitFlashTimer = 0.08;
              en.slowTimer = Math.max(en.slowTimer, 1.3);
              en.slowFactor = Math.max(en.slowFactor, 0.4);
              this.spawnBurst(en.x, en.y, '#F8FAFC', 9, 175, true);
              slashed = true;
            }
          }
          if (
            this.boss.active &&
            this.boss.dyingTimer <= 0 &&
            checkCircleCollision(this.frog.x + 28, this.frog.y, CARPINCHO_FACON_RANGE, this.boss.x, this.boss.y, this.boss.radius)
          ) {
            const faconDmg = this.config.player.frogAlly.bubbleDamage * 2.8;
            this.boss.hp -= faconDmg;
            this.boss.hitFlashTimer = 0.06;
            triggerBossHitShake(this.shakeState, {
              damage: faconDmg,
              heavy: true,
              impactDirX: this.boss.x - this.frog.x,
              impactDirY: this.boss.y - this.frog.y,
            });
            this.spawnBurst(this.boss.x - 24, this.boss.y, '#F8FAFC', 7, 160, true);
            slashed = true;
          }
          if (slashed) {
            this.frog.tongueCooldown = this.config.player.frogAlly.tongueCooldownSec * 0.8;
            this.frog.faconSlashTimer = 0.3;
            soundEngine.playFaconSlash();
            this.callouts.push({
              x: this.frog.x + 22,
              y: this.frog.y - 22,
              vy: -38,
              text: '¡FACONAZO!',
              color: '#F8FAFC',
              life: 0.82,
              maxLife: 0.82,
            });
          }
        }
      } else {
        // SAPO BATRICIO: Signature sticky toad tongue lash ("¡CROAC!")
        const target = pickFrogTongueTarget(
          this.frog.x,
          this.frog.y,
          this.config.player.frogAlly.tongueRange,
          this.enemyBullets,
          this.enemies
        );
        if (target) {
          this.frog.tongueCooldown = this.config.player.frogAlly.tongueCooldownSec;
          this.frog.tongueTimer = 0.22;
          this.frog.throatPuff = 0.35;
          this.frog.tongueKind = target.kind;

          if (target.kind === 'bullet') {
            const eb = this.enemyBullets[target.index];
            this.frog.tongueTargetX = eb.x;
            this.frog.tongueTargetY = eb.y;
            eb.active = false;
            this.score += 45;
            this.specialCooldown = Math.max(0, this.specialCooldown - 0.8);
            this.spawnBurst(eb.x, eb.y, '#FB7185', 6, 130, false);
            this.callouts.push({
              x: this.frog.x,
              y: this.frog.y - 20,
              vy: -36,
              text: '¡CROAC!',
              color: '#84CC16',
              life: 0.75,
              maxLife: 0.75,
            });
          } else {
            const en = this.enemies.find((e) => e.id === target.id);
            if (en) {
              this.frog.tongueTargetX = en.x;
              this.frog.tongueTargetY = en.y;
              en.hp -= this.config.player.frogAlly.bubbleDamage * 2.2;
              en.hitFlashTimer = 0.06;
              en.slowTimer = Math.max(en.slowTimer, 1.4);
              en.slowFactor = Math.max(en.slowFactor, 0.35);
              this.spawnBurst(en.x, en.y, '#84CC16', 8, 150, true);
              soundEngine.playHit(false);
            }
          }
        }
      }
    }
  }

  private updatePoisonFrogs(dt: number) {
    // Stagger spawning raining poisonous female frogs while Batricio sings!
    if (this.batricioRainPending > 0) {
      this.batricioRainTimer -= dt;
      if (this.batricioRainTimer <= 0) {
        this.batricioRainPending--;
        this.batricioRainTimer = 0.16;
        const palettes = [
          { body: '#D946EF', spot: '#A3E635' },
          { body: '#EC4899', spot: '#FDE047' },
          { body: '#9333EA', spot: '#4ADE80' },
          { body: '#F43F5E', spot: '#BEF264' },
        ];
        const pal = palettes[this.nextPoisonFrogId % palettes.length];
        const spawnX = 110 + Math.random() * Math.max(120, this.width - 170);
        this.poisonFrogs.push({
          id: this.nextPoisonFrogId++,
          x: spawnX,
          y: -24,
          vx: (Math.random() - 0.5) * 90,
          vy: 290 + Math.random() * 140,
          rot: (Math.random() - 0.5) * 0.5,
          vRot: (Math.random() - 0.5) * 3.5,
          color: pal.body,
          spotColor: pal.spot,
          radius: 14,
          life: 3.4,
        });
      }
    }

    for (let i = this.poisonFrogs.length - 1; i >= 0; i--) {
      const pf = this.poisonFrogs[i];
      pf.life -= dt;
      pf.vy += 320 * dt;
      pf.x += pf.vx * dt;
      pf.y += pf.vy * dt;
      pf.rot += pf.vRot * dt;

      // Clear enemy bullets touched by falling poisonous frogs
      for (const eb of this.enemyBullets) {
        if (eb.active && checkCircleCollision(pf.x, pf.y, pf.radius + 8, eb.x, eb.y, eb.radius)) {
          eb.active = false;
          this.spawnBurst(eb.x, eb.y, '#A3E635', 4, 120, false);
        }
      }

      // Smash & poison enemies
      let hitTarget = false;
      for (const en of this.enemies) {
        if (en.dying) continue;
        if (checkCircleCollision(pf.x, pf.y, pf.radius + 6, en.x, en.y, en.radius)) {
          en.hp -= this.batricioRainDamage;
          en.hitFlashTimer = 0.08;
          en.poisonTimer = Math.max(en.poisonTimer ?? 0, 3.6);
          en.poisonDps = 22;
          this.spawnBurst(en.x, en.y, '#A3E635', 9, 165, true);
          soundEngine.playHit(true);
          hitTarget = true;
          break;
        }
      }

      if (!hitTarget && this.boss.active && this.boss.dyingTimer <= 0) {
        if (checkCircleCollision(pf.x, pf.y, pf.radius + 8, this.boss.x, this.boss.y, this.boss.radius)) {
          const frogDmg = Math.round(this.batricioRainDamage * 0.72);
          this.boss.hp -= frogDmg;
          this.boss.hitFlashTimer = 0.06;
          triggerBossHitShake(this.shakeState, {
            damage: frogDmg,
            heavy: false,
            impactDirX: pf.vx,
            impactDirY: pf.vy,
          });
          this.spawnBurst(pf.x, pf.y, '#A3E635', 9, 175, true);
          soundEngine.playHit(true);
          hitTarget = true;
        }
      }

      if (hitTarget || pf.y > this.height + 40 || pf.life <= 0) {
        this.poisonFrogs.splice(i, 1);
      }
    }
  }

  private updateInfernalesRiders(dt: number) {
    if (this.infernalesRiders.length === 0) return;

    for (let i = this.infernalesRiders.length - 1; i >= 0; i--) {
      const r = this.infernalesRiders[i];
      r.life -= dt;
      // Parabolic heroic horse leap from bottom-left across the sky with bouncing charge!
      r.vy += 430 * dt;
      r.x += r.vx * dt;
      r.y += r.vy * dt;

      if (r.y > this.height - 46 && r.vy > 0) {
        r.y = this.height - 46;
        r.vy = -420 - (r.id % 3) * 45;
        this.spawnBurst(r.x, r.y + 18, '#FACC15', 6, 130, false);
      }

      // Lance clears all enemy bullets in path
      for (const eb of this.enemyBullets) {
        if (eb.active && checkCircleCollision(r.x + 28, r.y - 8, 44, eb.x, eb.y, eb.radius)) {
          eb.active = false;
          this.spawnBurst(eb.x, eb.y, '#38BDF8', 4, 140, false);
        }
      }

      // Lance impales enemies along the jump arc!
      for (const en of this.enemies) {
        if (en.dying || r.hitIds.includes(en.id)) continue;
        if (checkCircleCollision(r.x + 26, r.y - 8, r.radius + 14, en.x, en.y, en.radius)) {
          r.hitIds.push(en.id);
          en.hp -= 115;
          en.hitFlashTimer = 0.1;
          en.x = Math.min(this.width - 34, en.x + 48);
          this.spawnBurst(en.x, en.y, '#FACC15', 11, 195, true);
          soundEngine.playFaconSlash();
        }
      }

      // Lance strikes active Boss!
      if (this.boss.active && this.boss.dyingTimer <= 0 && !r.hitIds.includes(-999)) {
        if (checkCircleCollision(r.x + 26, r.y - 8, r.radius + 14, this.boss.x, this.boss.y, this.boss.radius)) {
          r.hitIds.push(-999);
          this.boss.hp -= 92;
          this.boss.hitFlashTimer = 0.09;
          triggerBossHitShake(this.shakeState, {
            damage: 92,
            heavy: true,
            impactDirX: r.vx,
            impactDirY: r.vy,
          });
          this.spawnBurst(this.boss.x - 24, this.boss.y, '#FACC15', 14, 210, true);
          soundEngine.playFaconSlash();
        }
      }

      if (r.x > this.width + 130 || r.life <= 0) {
        this.infernalesRiders.splice(i, 1);
      }
    }
  }

  private updateMafiaCats(dt: number) {
    if (this.mafiaCats.length === 0) return;

    const activeEnemies = this.enemies.filter((e) => !e.dying);
    const hasBoss = this.boss.active && this.boss.dyingTimer <= 0;

    for (let i = this.mafiaCats.length - 1; i >= 0; i--) {
      const cat = this.mafiaCats[i];
      cat.life -= dt;
      if (cat.slashTimer > 0) cat.slashTimer = Math.max(0, cat.slashTimer - dt);

      if (cat.life <= 0) {
        this.spawnBurst(cat.x, cat.y, '#94A3B8', 7, 130, false);
        this.mafiaCats.splice(i, 1);
        continue;
      }

      let targetX = Math.min(this.width - 70, this.playerX + cat.homeOffsetX + Math.sin(this.time * 3 + cat.bobSeed) * 26);
      let targetY = Math.max(66, Math.min(this.height - 62, this.playerY + cat.homeOffsetY + Math.cos(this.time * 3.4 + cat.bobSeed) * 24));
      let aimTargetX = targetX + 260;
      let aimTargetY = targetY;

      if (activeEnemies.length > 0) {
        const assigned = activeEnemies[i % activeEnemies.length];
        targetX = Math.max(90, assigned.x - 115 + Math.cos(this.time * 4 + cat.bobSeed) * 22);
        targetY = Math.max(66, Math.min(this.height - 62, assigned.y + Math.sin(this.time * 4.5 + cat.bobSeed) * 28));
        aimTargetX = assigned.x;
        aimTargetY = assigned.y;
      } else if (hasBoss) {
        const orbitAng = this.time * 2.6 + cat.bobSeed;
        targetX = Math.max(120, this.boss.x - 145 + Math.cos(orbitAng) * 32);
        targetY = Math.max(66, Math.min(this.height - 62, this.boss.y + Math.sin(orbitAng) * 84));
        aimTargetX = this.boss.x;
        aimTargetY = this.boss.y;
      }

      const dx = targetX - cat.x;
      const dy = targetY - cat.y;
      cat.vx += (dx * 6.5 - cat.vx) * Math.min(1, dt * 8);
      cat.vy += (dy * 6.5 - cat.vy) * Math.min(1, dt * 8);
      cat.x = Math.max(36, Math.min(this.width - 42, cat.x + cat.vx * dt));
      cat.y = Math.max(58, Math.min(this.height - 46, cat.y + cat.vy * dt));

      // Shoot down any nearby enemy bullets with pistol!
      for (const eb of this.enemyBullets) {
        if (!eb.active) continue;
        if (checkCircleCollision(cat.x, cat.y, 48, eb.x, eb.y, eb.radius)) {
          eb.active = false;
          cat.slashTimer = 0.16;
          cat.slashX = eb.x;
          cat.slashY = eb.y;
          this.score += 30;
          this.spawnBurst(eb.x, eb.y, '#FACC15', 5, 130, false);
          soundEngine.playSicarioGunshot();
          break;
        }
      }

      // Pistol gunshots aimed at enemies/boss!
      cat.fireTimer -= dt;
      if (cat.fireTimer <= 0 && (activeEnemies.length > 0 || hasBoss)) {
        cat.fireTimer = 0.28;
        const adx = aimTargetX - cat.x;
        const ady = aimTargetY - cat.y;
        const dist = Math.max(1, Math.hypot(adx, ady));
        const speed = 860;
        cat.slashTimer = 0.12;
        cat.slashX = cat.x + (adx / dist) * 58;
        cat.slashY = cat.y + (ady / dist) * 58;
        soundEngine.playSicarioGunshot();
        this.spawnPlayerBullet(
          {
            kind: 'pistol_shot',
            offsetX: 20,
            offsetY: 2,
            vx: (adx / dist) * speed,
            vy: (ady / dist) * speed,
            gravity: 0,
            drag: 1,
            bounces: 0,
            damage: 18,
            radius: 5.5,
            color: '#FACC15',
            glowColor: '#FEF9C3',
            slowFactor: 0,
            acidDps: 0,
            acidRadius: 0,
            armorPierce: true,
            chainAcid: false,
            pullStrength: 0,
            spawnsVortex: false,
            piercing: false,
          },
          cat.x + 18,
          cat.y + 2
        );
      }
    }
  }

  private spawnPlayerBullet(desc: ProjectileDescriptor, x: number, y: number) {
    for (const b of this.playerBullets) {
      if (!b.active) {
        b.active = true;
        b.kind = desc.kind;
        b.x = x;
        b.y = y;
        b.vx = desc.vx;
        b.vy = desc.vy;
        b.baseVy = desc.vy;
        b.accelX = desc.accelX ?? 0;
        b.gravity = desc.gravity;
        b.drag = desc.drag;
        b.bounces = desc.bounces;
        b.bounceCeiling = Boolean(desc.bounceCeiling);
        b.splitsOnHit = desc.splitsOnHit ?? 0;
        b.damage = desc.damage;
        b.radius = desc.radius;
        b.color = desc.color;
        b.glowColor = desc.glowColor;
        b.slowFactor = desc.slowFactor;
        b.acidDps = desc.acidDps;
        b.acidRadius = desc.acidRadius;
        b.armorPierce = desc.armorPierce;
        b.chainAcid = desc.chainAcid;
        b.pullStrength = desc.pullStrength;
        b.spawnsVortex = desc.spawnsVortex;
        b.piercing = desc.piercing;
        b.isSecondary = Boolean(desc.isSecondary);
        b.rootDuration = desc.rootDuration ?? 0;
        b.clearsEnemyBullets = Boolean(desc.clearsEnemyBullets || desc.kind === 'snap');
        b.sinWaveAmp = desc.sinWaveAmp ?? 0;
        b.sinWaveFreq = desc.sinWaveFreq ?? 0;
        b.age = 0;
        b.life =
          desc.kind === 'jaw_guillotine'
            ? 0.95
            : desc.kind === 'singularity'
            ? 2.8
            : desc.kind === 'prism_crystal'
            ? 3.6
            : desc.kind === 'snap'
            ? 0.65
            : desc.kind === 'crystal'
            ? 3.2
            : 2.4;
        return;
      }
    }
  }

  private spawnEnemyBullet(
    x: number,
    y: number,
    vx: number,
    vy: number,
    color: string,
    kind: EnemyBullet['kind'] = 'spore',
    physics?: { accelX?: number; gravity?: number; bounces?: number; radius?: number }
  ) {
    for (const eb of this.enemyBullets) {
      if (!eb.active) {
        eb.active = true;
        eb.x = x;
        eb.y = y;
        eb.vx = vx;
        eb.vy = vy;
        eb.accelX = physics?.accelX ?? 0;
        eb.gravity = physics?.gravity ?? 0;
        eb.bounces = physics?.bounces ?? 0;
        eb.radius =
          physics?.radius ??
          (kind === 'gravity_orb'
            ? 12
            : kind === 'bounce_orb'
            ? 9
            : kind === 'boomerang'
            ? 9
            : kind === 'stinger'
            ? 8.5
            : kind === 'sniper'
            ? 6
            : 5.5);
        eb.color = color;
        eb.kind = kind;
        eb.age = 0;
        return;
      }
    }
  }

  private spawnMutagenPod(x: number, y: number) {
    const allowed = getAllowedMutagenSpecies(this.speciesLevels, this.config, this.unlockedSpecies);
    const startIdx = Math.floor(Math.random() * allowed.length);
    const clampedY = Math.max(96, Math.min(this.height - 96, y));
    this.pickups.push({
      x,
      y: clampedY,
      baseY: clampedY,
      vx: -86,
      cycleIndex: startIdx,
      cycleTimer: this.config.player.mutagenCycleSec,
      cycleDuration: this.config.player.mutagenCycleSec,
      hitCooldown: 0,
      shiftFlash: 0,
      speciesOrder: allowed,
      age: 0,
    });
  }

  private spawnBossEncounter(level: LevelNumber, isMiniBoss: boolean) {
    const bossCfg = this.getActiveBossConfig(level, isMiniBoss);
    this.transitionLandscape(bossCfg.landscape);
    this.boss = this.createEmptyBoss(level, isMiniBoss);
    this.boss.active = true;
    this.boss.x = this.width + 110;
    this.boss.y = this.height * 0.5;
    this.boss.targetX = Math.max(this.width * 0.72, this.width - (isMiniBoss ? 185 : 155));
    soundEngine.playBossWarning();
    this.banner = {
      title: isMiniBoss
        ? `¡MINI-JEFE NV.${level}: ${bossCfg.name}!`
        : `¡JEFE FINAL NV.${level}: ${bossCfg.name}!`,
      detail: bossCfg.mechanicHint,
      accentColor: isMiniBoss ? '#F59E0B' : '#F43F5E',
      ttl: 2.8,
    };
    this.emitHud();
  }

  private updateWavesAndSpawns(dt: number) {
    if (this.boss.active) return;

    const currentWave = this.config.waves[this.waveIndex];
    if (!currentWave || currentWave.level !== this.levelIndex) {
      this.spawnBossEncounter(this.levelIndex, false);
      return;
    }

    this.transitionLandscape(currentWave.landscape);
    this.waveTimer += dt;
    this.spawnTimer -= dt;

    if (
      currentWave.dropsMutagen &&
      !this.waveSpawnedMutagen &&
      this.waveTimer >= currentWave.durationSec * 0.42
    ) {
      this.waveSpawnedMutagen = true;
      this.spawnMutagenPod(this.width + 26, this.height * (0.28 + Math.random() * 0.44));
    }

    // Rhythm-synced enemy spawning aligned to each level's song BPM & first beat drop,
    // dynamically scaled by difficulty + player score and time survived
    const rhythm = getLevelRhythmProfile(this.levelIndex);
    const beatDur = 60 / rhythm.bpm;
    const timing = computeDifficultySpawnTiming(
      currentWave.spawnIntervalSec,
      beatDur,
      this.difficulty,
      this.escalation
    );
    const beatEvents = computeBeatSpawnEvents(
      this.prevBeatClockSec,
      this.levelBeatClockSec,
      rhythm.bpm,
      rhythm.firstDropSec,
      timing.beatsPerSpawn
    );

    const archList = currentWave.archetypes;
    if (beatEvents.count > 0 && this.enemies.length < timing.maxActiveEnemies) {
      for (let s = 0; s < beatEvents.count; s++) {
        if (this.enemies.length >= timing.maxActiveEnemies) break;
        const pickIdx = Math.floor(Math.random() * archList.length);
        const arch = archList[pickIdx] as EnemyArchetypeId;
        this.spawnEnemy(arch);
        // On strong musical downbeats (beat 1 of bar), drop a tight rhythmic wingman pair
        if (
          beatEvents.hasDownbeat &&
          s === 0 &&
          this.waveTimer > 2.5 &&
          this.enemies.length < timing.maxDownbeatPairCap
        ) {
          const partnerArch = archList[(pickIdx + 1) % archList.length] as EnemyArchetypeId;
          this.spawnEnemy(partnerArch);
        }
        // High difficulty or high dynamic escalation: extra swarm reinforcement on downbeats
        if (
          timing.extraDownbeatSpawn &&
          beatEvents.hasDownbeat &&
          s === 0 &&
          this.waveTimer > 4.0 &&
          this.enemies.length < timing.maxActiveEnemies
        ) {
          const extraArch = archList[(pickIdx + 2) % archList.length] as EnemyArchetypeId;
          this.spawnEnemy(extraArch);
        }
      }
      this.spawnTimer = timing.spawnIntervalSec;
    } else if (
      this.spawnTimer <= 0 &&
      this.waveTimer > 1.2 &&
      this.enemies.length < timing.maxActiveEnemies &&
      (this.enemies.length === 0 || this.escalation.spawnRateMult > 1.04)
    ) {
      // Continuous dynamic reinforcement timer (and intro safety net) so rising score/time
      // smoothly accelerates enemy fly spawn frequency even between musical beat subdivisions
      this.spawnTimer = timing.spawnIntervalSec;
      const arch = archList[Math.floor(Math.random() * archList.length)] as EnemyArchetypeId;
      this.spawnEnemy(arch);
    }

    if (this.waveTimer >= currentWave.durationSec) {
      const nextWave = this.config.waves[this.waveIndex + 1];
      const waveAfterNext = this.config.waves[this.waveIndex + 2];
      this.waveIndex++;
      this.waveTimer = 0;
      this.waveSpawnedMutagen = false;

      if (nextWave && nextWave.level === this.levelIndex) {
        const isBeforeFinalLevelWave = !waveAfterNext || waveAfterNext.level !== this.levelIndex;
        if (!this.miniBossDefeatedForLevel && isBeforeFinalLevelWave) {
          this.spawnBossEncounter(this.levelIndex, true);
        } else {
          this.banner = {
            title: nextWave.title,
            detail: '¡Nueva formación al ritmo del sector!',
            accentColor: '#38BDF8',
            ttl: 2.0,
          };
          this.emitHud();
        }
      } else {
        this.spawnBossEncounter(this.levelIndex, false);
      }
    }
  }

  private spawnEnemy(archetype: EnemyArchetypeId) {
    const cfg = this.config.enemies[archetype];
    const scaled = computeLevelEnemyStats(
      cfg.hp,
      cfg.speed,
      cfg.fireInterval,
      this.levelIndex,
      this.difficulty,
      this.escalation.velocityMult
    );
    const marginY = cfg.radius + 54;
    const y = marginY + Math.random() * Math.max(40, this.height - marginY * 2);
    this.enemies.push({
      id: this.nextEnemyId++,
      archetype,
      x: this.width + cfg.radius + 18,
      y,
      vx: -scaled.speed,
      vy: 0,
      hp: scaled.hp,
      maxHp: scaled.hp,
      radius: cfg.radius,
      age: 0,
      phaseOffset: Math.random() * Math.PI * 2,
      fireTimer: 0.4 + Math.random() * scaled.fireInterval * 0.45,
      windupTimer: 0,
      windupDuration: 0,
      aimX: this.playerX,
      aimY: this.playerY,
      lungeState: 'track',
      lungeTimer: 0.78,
      shieldActive: archetype === 'tank',
      slowTimer: 0,
      slowFactor: 0,
      mucilageHits: 0,
      rootedTimer: 0,
      acidTimer: 0,
      acidDps: 0,
      hitFlashTimer: 0,
      koTimer: 0.28,
      dying: false,
      orbitCenterX: this.width * (0.64 + Math.random() * 0.18),
      orbitCenterY: y,
    });
  }

  private updatePickups(dt: number) {
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const p = this.pickups[i];
      p.age += dt;
      if (p.hitCooldown > 0) p.hitCooldown = Math.max(0, p.hitCooldown - dt);
      if (p.shiftFlash > 0) p.shiftFlash = Math.max(0, p.shiftFlash - dt);
      p.x += p.vx * dt;
      if (p.vx > -86) {
        p.vx = Math.max(-86, p.vx - 95 * dt);
      }
      p.y = p.baseY + Math.sin(p.age * 2.5) * 42;

      p.cycleTimer -= dt;
      if (p.cycleTimer <= 0) {
        p.cycleTimer = p.cycleDuration;
        p.cycleIndex = (p.cycleIndex + 1) % p.speciesOrder.length;
        this.spawnBurst(p.x, p.y, '#FFFFFF', 4, 70, false);
      }

      const dist = Math.hypot(this.playerX - p.x, this.playerY - p.y);
      if (dist < 155) {
        p.x += ((this.playerX - p.x) / Math.max(1, dist)) * 185 * dt;
        p.baseY += ((this.playerY - p.y) / Math.max(1, dist)) * 185 * dt;
      }

      const allowedNow = getAllowedMutagenSpecies(this.speciesLevels, this.config, this.unlockedSpecies);
      if (allowedNow.length > 0 && p.speciesOrder.length !== allowedNow.length) {
        p.speciesOrder = allowedNow;
        p.cycleIndex = p.cycleIndex % allowedNow.length;
      }

      if (checkCircleCollision(this.playerX, this.playerY, 36, p.x, p.y, 18)) {
        const chosenId = p.speciesOrder[p.cycleIndex % p.speciesOrder.length] ?? 'dionaea';
        const sp = this.config.species[chosenId];
        const prevActiveCount = Object.values(this.speciesLevels).filter((lv) => lv > 0).length;
        const res = applyMutagenPickup(this.speciesLevels, chosenId, this.config, this.unlockedSpecies);
        this.speciesLevels = res.nextLevels;
        this.cachedLoadout = null;
        const loadoutAfterPickup = this.getLoadout();
        const isFreshSuperSaiyan =
          loadoutAfterPickup.isSuperSaiyanFusion &&
          loadoutAfterPickup.fusedPair !== null &&
          !this.superSaiyanAnnounced;
        const newActiveCount = Object.values(this.speciesLevels).filter((lv) => lv > 0).length;

        // If a 2nd species was newly unlocked, assign it immediately to Secondary slot so player can fire & rotate!
        if (prevActiveCount === 1 && newActiveCount === 2 && chosenId !== this.primarySpecies) {
          this.secondarySpecies = chosenId;
          this.secondaryMaxCooldown = SECONDARY_ABILITY_META[chosenId].cooldownSec;
          this.secondaryCooldown = 0;
        } else {
          const slots = resolveAbilitySlots(this.speciesLevels, this.primarySpecies, this.secondarySpecies);
          this.primarySpecies = slots.primary;
          this.secondarySpecies = slots.secondary;
        }

        const bigBurst = res.unlockedSecret || isFreshSuperSaiyan;
        this.hitstopTimer = bigBurst ? 0.095 : 0.055;
        addScreenShakeTrauma(this.shakeState, bigBurst ? 0.58 : 0.32);
        this.playerScaleX = bigBurst ? 1.35 : 1.24;
        this.playerScaleY = bigBurst ? 0.76 : 0.82;
        this.spawnBurst(
          this.playerX,
          this.playerY,
          bigBurst ? '#FACC15' : sp.accentColor,
          bigBurst ? 38 : 22,
          bigBurst ? 300 : 240,
          true
        );
        if (isFreshSuperSaiyan && loadoutAfterPickup.fusedPair) {
          this.superSaiyanAnnounced = true;
          const apexMeta = getApexFusionMeta(
            loadoutAfterPickup.fusedPair[0],
            loadoutAfterPickup.fusedPair[1],
            this.config
          );
          this.secondaryMaxCooldown = apexMeta.cooldownSec;
          this.secondaryCooldown = 0;
          this.spawnBurst(this.frog.x, this.frog.y, '#FACC15', 22, 220, true);
          soundEngine.playSuperSaiyanTransform();
          this.score += 900;
          this.hp = Math.min(this.maxHp, this.hp + 1);
          this.banner = {
            title: `¡MODO SUPER SAIYAJIN · ${apexMeta.title}!`,
            detail: `Auto: ${apexMeta.autoName} · Manual [E]: ${apexMeta.manualName}`,
            accentColor: '#FACC15',
            ttl: 4.0,
          };
        } else {
          soundEngine.playFusionFanfare();
        }

        const clearRadius = bigBurst ? 9999 : 175;
        for (const eb of this.enemyBullets) {
          if (eb.active && checkCircleCollision(this.playerX, this.playerY, clearRadius, eb.x, eb.y, eb.radius)) {
            eb.active = false;
          }
        }

        if (isFreshSuperSaiyan) {
          // Super Saiyan banner already set above!
        } else if (res.unlockedSecret) {
          this.score += 750;
          this.hp = Math.min(this.maxHp, this.hp + 2);
          this.banner = {
            title: `¡EVOLUCIÓN SECRETA NV.5: ${sp.name.toUpperCase()} APEX!`,
            detail: sp.levelDescriptions[4],
            accentColor: '#FACC15',
            ttl: 3.6,
          };
        } else if (res.isOvercharge) {
          this.score += 350;
          if (this.hp < this.maxHp) this.hp++;
          this.banner = {
            title: res.blockedBySlotLimit
              ? '¡LÍMITE 2 EVOLUCIONES!'
              : `¡SOBRECARGA ${sp.name.toUpperCase()}!`,
            detail: '+350 Puntos y Néctar Reparador',
            accentColor: sp.accentColor,
            ttl: 2.2,
          };
        } else {
          const newlyAddedSecond = prevActiveCount === 1 && newActiveCount === 2;
          this.banner = {
            title: `¡MUTACIÓN: ${sp.name.toUpperCase()} NV.${res.newLevel}!`,
            detail: newlyAddedSecond
              ? `Secundaria [E]: ${SECONDARY_ABILITY_META[chosenId].name} · Pulsa [Q] para rotar`
              : sp.levelDescriptions[res.newLevel - 1],
            accentColor: sp.accentColor,
            ttl: 2.9,
          };
        }

        this.pickups.splice(i, 1);
        this.emitHud();
        continue;
      }

      // Bounce horizontally on left border once so players get a fair second chance to time mutations
      if (p.x < 56 && p.vx < 0) {
        p.x = 56;
        p.vx = 92;
      } else if (p.x > this.width - 56 && p.vx > 0) {
        p.vx = -86;
      }
    }
  }

  private updateAcidPools(dt: number) {
    for (let i = this.acidPools.length - 1; i >= 0; i--) {
      const pool = this.acidPools[i];
      pool.life -= dt;
      pool.x += pool.vx * dt;
      if (pool.life <= 0) {
        this.acidPools.splice(i, 1);
        continue;
      }
      for (const e of this.enemies) {
        if (!e.dying && checkCircleCollision(pool.x, pool.y, pool.radius, e.x, e.y, e.radius)) {
          e.hp -= pool.dps * dt;
          e.acidTimer = Math.max(e.acidTimer, 0.9);
          e.acidDps = pool.dps;
          if (e.archetype === 'tank') e.shieldActive = false;
        }
      }
      if (this.boss.active && this.boss.dyingTimer <= 0) {
        if (checkCircleCollision(pool.x, pool.y, pool.radius, this.boss.x, this.boss.y, this.boss.radius)) {
          this.boss.hp -= pool.dps * dt;
        }
      }
    }
  }

  private updateVortexes(dt: number) {
    for (let i = this.vortexes.length - 1; i >= 0; i--) {
      const v = this.vortexes[i];
      v.life -= dt;
      if (v.life <= 0) {
        this.vortexes.splice(i, 1);
        continue;
      }
      for (const e of this.enemies) {
        if (e.dying) continue;
        const dist = Math.hypot(v.x - e.x, v.y - e.y);
        if (dist > 4 && dist < v.radius * 2.2) {
          e.x += ((v.x - e.x) / dist) * v.pullStrength * dt * 1.4;
          e.y += ((v.y - e.y) / dist) * v.pullStrength * dt * 1.4;
        }
      }
      for (const eb of this.enemyBullets) {
        if (!eb.active) continue;
        if (checkCircleCollision(v.x, v.y, v.radius, eb.x, eb.y, eb.radius)) {
          eb.active = false;
          this.spawnBurst(eb.x, eb.y, '#67E8F9', 3, 90, false);
          if (v.siphonHeal && this.hp < this.maxHp && Math.random() < 0.2) {
            this.hp++;
          }
        }
      }
    }
  }

  private spawnMortarShrapnel(b: PlayerBullet) {
    if (b.splitsOnHit <= 0) return;
    const count = b.splitsOnHit;
    const isCluster = b.kind === 'cluster_bomb';
    const spread = isCluster ? 230 : 135;
    for (let i = 0; i < count; i++) {
      const frac = count === 1 ? 0 : (i / (count - 1)) * 2 - 1;
      this.spawnPlayerBullet(
        {
          kind: isCluster ? 'mortar' : 'thorn',
          offsetX: 0,
          offsetY: 0,
          vx: isCluster ? 420 + (i % 2) * 140 : 640,
          vy: frac * spread - (isCluster ? 160 : 60),
          gravity: isCluster ? 540 : 240,
          drag: 0.996,
          bounces: isCluster ? 2 : 0,
          damage: Math.round(b.damage * (isCluster ? 0.45 : 0.52)),
          radius: isCluster ? 7.5 : 5,
          color: isCluster ? '#FACC15' : '#F43F5E',
          glowColor: '#84CC16',
          slowFactor: 0,
          acidDps: 0,
          acidRadius: 0,
          armorPierce: b.armorPierce,
          chainAcid: false,
          pullStrength: 0,
          spawnsVortex: false,
          piercing: !isCluster,
        },
        b.x,
        b.y
      );
    }
  }

  private spawnMegaAcidSplash(b: PlayerBullet) {
    this.pushAcidPool({
      x: b.x,
      y: Math.min(this.height - 32, b.y),
      vx: -32,
      radius: Math.max(76, b.acidRadius),
      dps: Math.max(26, b.acidDps),
      life: 2.8,
      maxLife: 2.8,
      color: b.color,
    });
    for (let s = 0; s < 4; s++) {
      const frac = (s / 3) * 2 - 1;
      this.spawnPlayerBullet(
        {
          kind: 'acid',
          offsetX: 0,
          offsetY: 0,
          vx: 160 + frac * 150,
          vy: -280 - (s % 2) * 65,
          gravity: 780,
          drag: 0.995,
          bounces: 1,
          damage: Math.round(b.damage * 0.45),
          radius: 7,
          color: '#A855F7',
          glowColor: '#BEF264',
          slowFactor: 0.15,
          acidDps: Math.round(b.acidDps * 0.65),
          acidRadius: 42,
          armorPierce: true,
          chainAcid: false,
          pullStrength: 0,
          spawnsVortex: false,
          piercing: false,
        },
        b.x,
        b.y
      );
    }
  }

  private updatePlayerBullets(dt: number) {
    const loadout = this.getLoadout();

    for (const b of this.playerBullets) {
      if (!b.active) continue;

      b.age += dt;
      // Real 2D Ballistic Physics (Acceleration + Gravity + Sinusoidal Helix + Drag + Bounces)
      b.vx += b.accelX * dt;
      if (b.sinWaveAmp !== 0) {
        b.vy = b.baseVy + Math.cos(b.age * b.sinWaveFreq) * b.sinWaveAmp;
      } else {
        b.vy += b.gravity * dt;
      }
      if (b.drag < 1) {
        const dragFactor = Math.pow(b.drag, dt * 60);
        b.vx *= dragFactor;
        b.vy *= dragFactor;
      }
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;

      // Secondary Utricularia Singularity: continuously pulls nearby enemies while gliding!
      if (b.kind === 'singularity') {
        for (const e of this.enemies) {
          if (e.dying) continue;
          const dist = Math.hypot(b.x - e.x, b.y - e.y);
          if (dist > 6 && dist < 210) {
            e.x += ((b.x - e.x) / dist) * b.pullStrength * dt * 1.45;
            e.y += ((b.y - e.y) / dist) * b.pullStrength * dt * 1.45;
          }
        }
      }

      // Ceiling bounce (Pinguicula crystals & prism_crystal)
      if (b.bounceCeiling && b.bounces > 0 && b.y <= 54 && b.vy < 0) {
        b.y = 54;
        b.vy = Math.abs(b.vy) * 0.94;
        b.bounces--;
        this.spawnBurst(b.x, b.y, b.color, 4, 95, false);
      }

      // Floor bounce (Drosera mucilage / Pinguicula crystals / Sticky Bola / Cluster Bomblets)
      if (b.bounces > 0 && b.y >= this.height - 28 && b.vy > 0) {
        b.y = this.height - 28;
        b.vy = -Math.abs(b.vy) * (b.kind === 'crystal' || b.kind === 'prism_crystal' ? 0.94 : 0.74);
        b.bounces--;
        this.spawnBurst(b.x, b.y, b.color, 4, 95, false);
      }

      // Cephalotus mortar & Secondary Cluster Bomb shrapnel burst on floor impact
      if ((b.kind === 'mortar' || b.kind === 'cluster_bomb') && b.y >= this.height - 24) {
        this.spawnBurst(b.x, b.y, b.color, b.kind === 'cluster_bomb' ? 14 : 7, 175, true);
        this.spawnMortarShrapnel(b);
        b.active = false;
        continue;
      }

      // Nepenthes acid & Secondary Mega Acid detonate on atmospheric floor!
      if ((b.kind === 'acid' || b.kind === 'mega_acid') && b.y >= this.height - 24) {
        if (b.kind === 'mega_acid') {
          this.spawnMegaAcidSplash(b);
          this.spawnBurst(b.x, b.y, '#BEF264', 14, 170, true);
        } else {
          this.pushAcidPool({
            x: b.x,
            y: this.height - 32,
            vx: -45,
            radius: b.acidRadius,
            dps: b.acidDps,
            life: 2.0,
            maxLife: 2.0,
            color: b.color,
          });
          this.spawnBurst(b.x, b.y, b.color, 7, 130, true);
        }
        b.active = false;
        continue;
      }

      if (b.life <= 0 || b.x > this.width + 60 || b.x < -60 || b.y < -60 || b.y > this.height + 60) {
        b.active = false;
        continue;
      }

      // Shooting a Mutagen Pod cycles to the next evolution so players can aim for desired upgrades!
      if (b.kind !== 'frog_bubble' && b.kind !== 'palito_heart' && !b.isSecondary && this.pickups.length > 0) {
        let shiftedPod = false;
        for (const p of this.pickups) {
          if (checkCircleCollision(b.x, b.y, b.radius, p.x, p.y, 24)) {
            if (advanceMutagenPodByShot(p)) {
              const nextId = p.speciesOrder[p.cycleIndex % p.speciesOrder.length] ?? 'dionaea';
              const nextSp = this.config.species[nextId];
              this.spawnBurst(p.x, p.y, nextSp.accentColor, 8, 130, true);
              soundEngine.playPodShift(p.cycleIndex);
              this.callouts.push({
                x: p.x,
                y: p.y - 26,
                vy: -32,
                text: `↻ ${nextSp.name}`,
                color: nextSp.accentColor,
                life: 0.7,
                maxLife: 0.7,
              });
            }
            if (!b.piercing) {
              b.active = false;
            }
            shiftedPod = true;
            break;
          }
        }
        if (shiftedPod && !b.active) {
          continue;
        }
      }

      // Bullet-slicing abilities (Dionaea Snap, Secondary Jaw Guillotine, Secondary Singularity)
      if (b.clearsEnemyBullets) {
        const clearR = b.radius + (b.isSecondary ? 14 : 8);
        for (const eb of this.enemyBullets) {
          if (eb.active && checkCircleCollision(b.x, b.y, clearR, eb.x, eb.y, eb.radius)) {
            eb.active = false;
            this.spawnBurst(eb.x, eb.y, b.glowColor || '#86EFAC', 4, 110, false);
            if (loadout.snapChargesSpecial || b.isSecondary) {
              this.specialCooldown = Math.max(0, this.specialCooldown - 0.45);
            }
          }
        }
      }

      for (const e of this.enemies) {
        if (e.dying) continue;
        if (checkCircleCollision(b.x, b.y, b.radius, e.x, e.y, e.radius)) {
          let dmg = b.damage;
          if (e.archetype === 'tank' && e.shieldActive && !b.armorPierce) {
            dmg = Math.round(dmg * 0.55);
          } else if (e.archetype === 'tank' && b.armorPierce) {
            dmg = Math.round(dmg * 1.45);
            e.shieldActive = false;
          }
          if (e.rootedTimer > 0) {
            dmg = Math.round(dmg * 1.35);
          }

          e.hp -= dmg;
          e.hitFlashTimer = 0.052;

          if (b.rootDuration > 0) {
            e.rootedTimer = Math.max(e.rootedTimer, b.rootDuration);
            // Secondary Sticky Bola splashes snare to nearby swarm!
            for (const other of this.enemies) {
              if (!other.dying && other.id !== e.id && checkCircleCollision(e.x, e.y, 105, other.x, other.y, other.radius)) {
                other.rootedTimer = Math.max(other.rootedTimer, b.rootDuration * 0.72);
                other.slowFactor = Math.max(other.slowFactor, 0.55);
                other.slowTimer = Math.max(other.slowTimer, 2.4);
              }
            }
          }

          if (b.kind === 'palito_heart') {
            const charmRes = applyPalitoHeartCharm(e);
            this.spawnBurst(e.x, e.y, '#F472B6', charmRes.charmed ? 9 : 4, 125, charmRes.charmed);
            if (charmRes.charmed) {
              this.callouts.push({
                x: e.x,
                y: e.y - 22,
                vy: -28,
                text: '♥ ENAMORADO',
                color: '#F472B6',
                life: 0.9,
                maxLife: 0.9,
              });
            }
          }

          if (b.slowFactor > 0) {
            e.slowFactor = Math.max(e.slowFactor, b.slowFactor);
            e.slowTimer = 2.5;
            e.mucilageHits++;
            if (loadout.mucilageSplash) {
              for (const other of this.enemies) {
                if (!other.dying && other.id !== e.id && checkCircleCollision(e.x, e.y, 78, other.x, other.y, other.radius)) {
                  other.slowFactor = Math.max(other.slowFactor, b.slowFactor * 0.8);
                  other.slowTimer = 1.8;
                }
              }
            }
            if (loadout.mucilageRootCap && e.mucilageHits >= 2) {
              e.rootedTimer = 1.1;
              e.mucilageHits = 0;
            }
          }

          if (b.acidDps > 0) {
            e.acidDps = b.acidDps;
            e.acidTimer = 2.8;
            if (b.kind === 'mega_acid') {
              this.spawnMegaAcidSplash(b);
            } else {
              this.pushAcidPool({
                x: e.x,
                y: e.y,
                vx: -35,
                radius: b.acidRadius,
                dps: b.acidDps,
                life: 2.1,
                maxLife: 2.1,
                color: b.color,
              });
            }
          }

          if (b.pullStrength > 0) {
            for (const other of this.enemies) {
              if (other.dying || other.id === e.id) continue;
              const dist = Math.hypot(e.x - other.x, e.y - other.y);
              if (dist > 4 && dist < 155) {
                other.x += ((e.x - other.x) / dist) * b.pullStrength * dt * 2.2;
                other.y += ((e.y - other.y) / dist) * b.pullStrength * dt * 2.2;
              }
            }
            if (b.spawnsVortex && this.vortexes.length < 4) {
              this.vortexes.push({
                x: e.x,
                y: e.y,
                radius: b.isSecondary ? 82 : 56,
                pullStrength: b.pullStrength,
                life: b.isSecondary ? 1.85 : 1.25,
                maxLife: b.isSecondary ? 1.85 : 1.25,
                siphonHeal: loadout.vacuumLifeSiphon,
              });
            }
          }

          emitBulletImpactParticles(this.particlePool, {
            x: b.x,
            y: b.y,
            vx: b.vx,
            vy: b.vy,
            color: b.color,
            secondaryColor: b.glowColor,
            heavy:
              b.isSecondary ||
              b.kind === 'mega_acid' ||
              b.kind === 'mortar' ||
              b.kind === 'snap' ||
              b.kind === 'cluster_bomb',
            shielded: e.archetype === 'tank' && e.shieldActive && !b.armorPierce,
            acid: b.acidDps > 0 || b.kind === 'acid' || b.kind === 'mega_acid',
            reducedMotion: this.reducedMotion,
          });
          soundEngine.playHit(b.isSecondary || b.kind === 'acid' || b.kind === 'snap' || b.kind === 'mortar');

          if (b.splitsOnHit > 0) {
            this.spawnMortarShrapnel(b);
          }

          if (!b.piercing) {
            b.active = false;
            break;
          }
        }
      }

      if (b.active && this.boss.active && this.boss.dyingTimer <= 0) {
        if (checkCircleCollision(b.x, b.y, b.radius, this.boss.x, this.boss.y, this.boss.radius)) {
          const shieldedBoss =
            this.boss.level === 1 && !this.boss.isMiniBoss && this.boss.shieldActive && !b.armorPierce;
          const bossDmg = shieldedBoss ? Math.max(1, Math.round(b.damage * 0.35)) : b.damage;
          this.boss.hp -= bossDmg;
          this.boss.hitFlashTimer = 0.048;
          triggerBossHitShake(this.shakeState, {
            damage: bossDmg,
            isSecondary: b.isSecondary,
            shielded: shieldedBoss,
            heavy: b.isSecondary || b.damage >= 45 || b.kind === 'mega_acid' || b.kind === 'cluster_bomb',
            impactDirX: b.vx,
            impactDirY: b.vy,
          });
          if (b.acidDps > 0) {
            if (b.kind === 'mega_acid') {
              this.spawnMegaAcidSplash(b);
            } else {
              this.pushAcidPool({
                x: b.x,
                y: b.y,
                vx: -25,
                radius: b.acidRadius,
                dps: b.acidDps,
                life: 1.8,
                maxLife: 1.8,
                color: b.color,
              });
            }
          }
          emitBulletImpactParticles(this.particlePool, {
            x: b.x,
            y: b.y,
            vx: b.vx,
            vy: b.vy,
            color: shieldedBoss ? '#38BDF8' : b.color,
            secondaryColor: shieldedBoss ? '#FEF08A' : b.glowColor,
            heavy: b.isSecondary || b.damage >= 45,
            shielded: shieldedBoss,
            acid: b.acidDps > 0 || b.kind === 'acid' || b.kind === 'mega_acid',
            reducedMotion: this.reducedMotion,
          });
          if (shieldedBoss) {
            soundEngine.playShieldClang();
          } else {
            soundEngine.playHit(b.isSecondary);
          }
          if (b.splitsOnHit > 0) {
            this.spawnMortarShrapnel(b);
          }
          if (!b.piercing) {
            b.active = false;
          }
        }
      }
    }
  }

  private updateEnemies(dt: number) {
    const loadout = this.getLoadout();
    let activeAttackers = 0;
    for (let k = 0; k < this.enemies.length; k++) {
      const en = this.enemies[k];
      if (!en.dying && en.windupTimer > 0) activeAttackers++;
    }
    const maxAttackers = 4 + Math.floor((this.levelIndex - 1) / 2);
    let tokensLeft = Math.max(0, maxAttackers - activeAttackers);

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];

      if (!e.dying && e.hp <= 0) {
        e.dying = true;
        e.koTimer = 0.28;
        e.vy = -80;
        this.enemiesDefeated++;
        this.registerComboKill(e.x, e.y);
        const pts = calculateKillScore(this.config.enemies[e.archetype].score, this.combo);
        this.score += pts;
        // Reserve kill hitstop for heavy tank kills with cooldown so rapid swarm kills never stutter movement
        if (e.archetype === 'tank' && this.killHitstopCooldown <= 0) {
          this.hitstopTimer = Math.max(this.hitstopTimer, 0.02);
          this.killHitstopCooldown = 0.45;
        }
        addScreenShakeTrauma(this.shakeState, e.archetype === 'tank' ? 0.16 : 0.09);
        const expTier = getExplosionTierForArchetype(e.archetype);
        emitEnemyExplosionParticles(this.particlePool, {
          x: e.x,
          y: e.y,
          primaryColor: this.config.enemies[e.archetype].accentColor,
          accentColor: '#FDE047',
          tier: expTier,
          reducedMotion: this.reducedMotion,
        });
        soundEngine.playExplosion(
          expTier === 'heavy' ? 'heavy' : expTier === 'medium' ? 'medium' : 'small'
        );

        if (loadout.acidChainExplosion && e.acidTimer > 0) {
          this.pushAcidPool({
            x: e.x,
            y: e.y,
            vx: -30,
            radius: loadout.acidRadius + 16,
            dps: loadout.acidDps,
            life: 2.2,
            maxLife: 2.2,
            color: this.config.species.nepenthes.accentColor,
          });
        }

        if (
          (e.archetype === 'tank' || e.archetype === 'hornet') &&
          this.pickups.length === 0 &&
          this.mutagenDropCooldown <= 0 &&
          Math.random() < 0.09
        ) {
          this.mutagenDropCooldown = 14;
          this.spawnMutagenPod(e.x, e.y);
        }

        this.callouts.push({
          x: e.x,
          y: e.y - 10,
          vy: -36,
          text: `+${pts}`,
          color: '#FDE047',
          life: 0.7,
          maxLife: 0.7,
        });
        continue;
      }

      const res = stepEnemyBehavior(
        e,
        this.playerX,
        this.playerY,
        dt,
        this.width,
        this.height,
        this.config,
        tokensLeft,
        this.levelIndex,
        this.difficulty,
        this.escalation.velocityMult
      );
      if (res.consumedToken) tokensLeft = Math.max(0, tokensLeft - 1);

      if (res.shouldFire) {
        const dx = this.playerX - e.x;
        const dy = this.playerY - e.y;
        const dist = Math.max(1, Math.hypot(dx, dy));
        const spdMult = computeEnemyBulletSpeedMult(this.levelIndex, this.difficulty);
        if (res.fireKind === 'sniper') {
          const adx = e.aimX - e.x;
          const ady = e.aimY - e.y;
          const adist = Math.max(1, Math.hypot(adx, ady));
          this.spawnEnemyBullet(
            e.x - 12,
            e.y,
            (adx / adist) * 470 * spdMult,
            (ady / adist) * 470 * spdMult,
            '#F43F5E',
            'sniper'
          );
        } else if (res.fireKind === 'spread') {
          for (const angleOffset of [-0.34, 0, 0.34]) {
            const baseAng = Math.atan2(dy, dx) + angleOffset;
            this.spawnEnemyBullet(
              e.x - 16,
              e.y,
              Math.cos(baseAng) * 265 * spdMult,
              Math.sin(baseAng) * 265 * spdMult,
              '#FB923C',
              'spore'
            );
          }
        } else if (res.fireKind === 'stinger') {
          for (const side of [-1, 1]) {
            this.spawnEnemyBullet(
              e.x - 16,
              e.y + side * 12,
              -240 * spdMult,
              side * 70 * spdMult,
              '#FB7185',
              'stinger'
            );
          }
        } else if (res.fireKind === 'bomb') {
          this.spawnEnemyBullet(e.x - 12, e.y + 12, -165 * spdMult, -45, '#E879F9', 'bounce_orb', {
            gravity: 390,
            bounces: 1,
            radius: 9,
          });
        } else if (res.fireKind === 'twin') {
          for (const side of [-1, 1]) {
            this.spawnEnemyBullet(
              e.x - 14,
              e.y,
              -235 * spdMult,
              side * 68 * spdMult,
              '#BEF264',
              'spore'
            );
          }
        } else {
          this.spawnEnemyBullet(
            e.x - 14,
            e.y,
            (dx / dist) * 250 * spdMult,
            (dy / dist) * 250 * spdMult,
            '#A3E635',
            'spore'
          );
        }
      }

      if (e.dying && e.koTimer <= 0) {
        this.enemies.splice(i, 1);
        continue;
      }

      if (!e.dying && checkCircleCollision(this.playerX, this.playerY, 12, e.x, e.y, e.radius * 0.78)) {
        this.damagePlayer(this.playerX - e.x, this.playerY - e.y);
        e.hp = 0;
      }

      if (e.x < -70) {
        this.enemies.splice(i, 1);
      }
    }
  }

  private updateBoss(dt: number) {
    const b = this.boss;
    if (!b.active) return;

    const bossCfg = this.getActiveBossConfig(b.level, b.isMiniBoss);
    b.age += dt;
    if (b.hitFlashTimer > 0) b.hitFlashTimer = Math.max(0, b.hitFlashTimer - dt);

    if (b.dyingTimer > 0) {
      b.dyingTimer -= dt;
      if (Math.random() < 0.48) {
        emitEnemyExplosionParticles(this.particlePool, {
          x: b.x + (Math.random() - 0.5) * 95,
          y: b.y + (Math.random() - 0.5) * 70,
          primaryColor: b.isMiniBoss ? '#F59E0B' : '#F43F5E',
          accentColor: '#FDE047',
          tier: b.isMiniBoss ? 'medium' : 'heavy',
          reducedMotion: this.reducedMotion,
        });
      }
      if (b.dyingTimer <= 0) {
        b.active = false;
        this.registerComboKill(b.x, b.y);
        this.score += calculateKillScore(bossCfg.scoreBonus, this.combo);

        if (b.isMiniBoss) {
          this.miniBossDefeatedForLevel = true;
          const nextWave = this.config.waves[this.waveIndex];
          this.banner = {
            title: `¡MINI-JEFE DERROTADO! · ${nextWave?.title ?? `NIVEL ${b.level}`}`,
            detail: '¡Camino despejado hacia el Jefe del sector!',
            accentColor: '#4ADE80',
            ttl: 2.5,
          };
          soundEngine.playFusionFanfare();
          this.emitHud();
        } else {
          if (this.hp < this.maxHp) this.hp++;
          let unlockedSpeciesId: SpeciesId | undefined;
          let unlockedSpeciesName: string | undefined;
          if (bossCfg.unlocksSpecies) {
            const unlockRes = unlockSpeciesForNextRuns(bossCfg.unlocksSpecies);
            this.unlockedSpecies = unlockRes.unlocked;
            const unlockedSp = this.config.species[bossCfg.unlocksSpecies];
            if (unlockRes.newlyUnlocked || b.level < 5) {
              unlockedSpeciesId = bossCfg.unlocksSpecies;
              unlockedSpeciesName = unlockedSp.name;
            }
          }

          let unlockedPetId: PetId | undefined;
          let unlockedPetName: string | undefined;
          if (bossCfg.unlocksPet) {
            const petRes = unlockPetForNextRuns(bossCfg.unlocksPet);
            this.unlockedPets = petRes.unlocked;
            unlockedPetId = bossCfg.unlocksPet;
            unlockedPetName = PET_CATALOG.find((p) => p.id === bossCfg.unlocksPet)?.name;
          }

          if (b.level < 5) {
            const nextLevel = (b.level + 1) as LevelNumber;
            const nextWave = this.config.waves[this.waveIndex];
            this.clearedLevelSummary = {
              clearedLevel: b.level,
              nextLevel,
              bossName: bossCfg.name,
              nextLevelTitle: nextWave?.title ?? `Nivel ${nextLevel}`,
              unlockedSpeciesId,
              unlockedSpeciesName,
              unlockedPetId,
              unlockedPetName,
            };

            for (const eb of this.enemyBullets) eb.active = false;
            this.enemies = [];
            this.acidPools = [];
            this.vortexes = [];
            this.pickups = [];
            this.windForceX = 0;
            this.banner = {
              title: `¡JEFE NV.${b.level} DERROTADO!`,
              detail: `Portal abierto hacia el Nivel ${nextLevel} — ¡Entrando!`,
              accentColor: '#38BDF8',
              ttl: 3.2,
            };

            this.levelIndex = nextLevel;
            this.miniBossDefeatedForLevel = false;
            this.checkLiveHighScoreProgress();
            syncLiveHighScore(Math.round(this.score), this.maxCombo, this.levelIndex);
            soundEngine.stopMusic();
            soundEngine.playBossClearAnimeTheme();
            soundEngine.playPortalOpen();
            this.spawnBurst(b.x, b.y, '#FACC15', 24, 240, true);
            this.spawnBurst(b.x, b.y, '#38BDF8', 20, 210, true);
            this.portal = {
              phase: 'forming',
              x: Math.min(this.width - 110, Math.max(this.width * 0.62, b.x)),
              y: Math.min(this.height - 95, Math.max(95, b.y)),
              radius: 16,
              maxRadius: 84,
              progress: 0,
              duration: 1.55,
              textureTarget: LEVEL_LANDSCAPES[nextLevel],
              label: `PORTAL · NIVEL ${nextLevel}`,
            };
            this.pendingBossClearResult = 'level_clear';
            this.emitHud();
          } else {
            for (const eb of this.enemyBullets) eb.active = false;
            this.enemies = [];
            this.acidPools = [];
            this.vortexes = [];
            this.pickups = [];
            this.windForceX = 0;
            this.banner = {
              title: '¡ESCORPIÓN EMPERADOR DERROTADO!',
              detail: 'Portal hacia La Reina Nodriza abierto — ¡Próxima actualización!',
              accentColor: '#F43F5E',
              ttl: 3.4,
            };
            this.checkLiveHighScoreProgress();
            soundEngine.stopMusic();
            soundEngine.playBossClearAnimeTheme();
            soundEngine.playPortalOpen();
            this.spawnBurst(b.x, b.y, '#F43F5E', 24, 250, true);
            this.spawnBurst(b.x, b.y, '#FACC15', 22, 220, true);
            this.portal = {
              phase: 'forming',
              x: Math.min(this.width - 110, Math.max(this.width * 0.62, b.x)),
              y: Math.min(this.height - 95, Math.max(95, b.y)),
              radius: 18,
              maxRadius: 92,
              progress: 0,
              duration: 1.65,
              textureTarget: 'queen_mothership',
              label: 'PORTAL · LA REINA NODRIZA',
            };
            this.pendingBossClearResult = 'victory';
            this.emitHud();
          }
        }
      }
      return;
    }

    if (b.hp <= 0) {
      b.hp = 0;
      b.dyingTimer = 0.65;
      this.hitstopTimer = 0.08;
      addScreenShakeTrauma(this.shakeState, 1, 1);
      emitEnemyExplosionParticles(this.particlePool, {
        x: b.x,
        y: b.y,
        primaryColor: b.isMiniBoss ? '#F59E0B' : '#F43F5E',
        accentColor: '#FDE047',
        tier: b.isMiniBoss ? 'miniboss' : 'boss',
        reducedMotion: this.reducedMotion,
      });
      if (!b.isMiniBoss) {
        this.defeatBeatTimer = 0;
        this.hp = Math.max(1, this.hp);
        for (const eb of this.enemyBullets) eb.active = false;
        this.playerInvulnTimer = Math.max(this.playerInvulnTimer, 2.5);
      }
      soundEngine.playExplosion(b.isMiniBoss ? 'heavy' : 'boss');
      return;
    }

    if (b.hp <= b.maxHp * 0.5 && b.phase === 1) {
      b.phase = 2;
      addScreenShakeTrauma(this.shakeState, 0.5);
      this.spawnBurst(b.x, b.y, '#F43F5E', 24, 280, true);
      soundEngine.playBossWarning();
      this.callouts.push({
        x: b.x - 20,
        y: b.y - 50,
        vy: -25,
        text: '¡FASE 2: SOBRECARGA!',
        color: '#FB7185',
        life: 1.5,
        maxLife: 1.5,
      });
    }

    // Horizontal entry from right edge, then vertical patrol + bespoke per-level boss mechanics!
    if (b.blinkGhostTimer > 0) {
      b.blinkGhostTimer = Math.max(0, b.blinkGhostTimer - dt);
    }

    if (b.x > b.targetX) {
      b.x -= 130 * dt;
    } else {
      const spd = bossCfg.speed * (b.phase === 2 ? 1.35 : 1);
      b.y += b.vy * (spd / 120) * dt;
      if (b.y < b.radius + 64) {
        b.y = b.radius + 64;
        b.vy = Math.abs(b.vy);
      } else if (b.y > this.height - b.radius - 56) {
        b.y = this.height - b.radius - 56;
        b.vy = -Math.abs(b.vy);
      }

      // 1) Lv.1 Final Boss TRILOBITES (1 Mecánica): coraza fósil retráctil con escudo cíclico
      if (b.level === 1 && !b.isMiniBoss) {
        b.shieldTimer -= dt;
        if (b.shieldTimer <= 0) {
          b.shieldActive = !b.shieldActive;
          b.shieldTimer = b.shieldActive ? 2.4 : b.phase === 2 ? 3.2 : 4.0;
          if (b.shieldActive) {
            soundEngine.playShieldClang();
            this.callouts.push({
              x: b.x - 28,
              y: b.y - 46,
              vy: -24,
              text: '¡CORAZA FÓSIL!',
              color: '#38BDF8',
              life: 1.0,
              maxLife: 1.0,
            });
          }
        }
      }

      // 2) Lv.2 MARIQUITA PARÁSITA (2 Mecánicas): apertura de élitros al compás (Fase 1 & 2)
      if (b.level === 2 && !b.isMiniBoss) {
        const rhythm = getLevelRhythmProfile(2);
        const snap = computeBeatSnapshot(this.levelBeatClockSec, rhythm.bpm, rhythm.firstDropSec);
        const modBeats = b.phase === 2 ? 8 : 12;
        if (snap.isDownbeat && snap.beatIndex >= 0 && snap.beatIndex !== this.lastBossBeatIndex && snap.beatIndex % modBeats === 0) {
          this.lastBossBeatIndex = snap.beatIndex;
          const spots = b.phase === 2 ? [-0.38, -0.14, 0.14, 0.38] : [-0.25, 0, 0.25];
          for (const angOff of spots) {
            const baseAng = Math.PI + angOff;
            this.spawnEnemyBullet(
              b.x - 32,
              b.y,
              Math.cos(baseAng) * 265,
              Math.sin(baseAng) * 265,
              '#FB7185',
              'spore'
            );
          }
        }
      }

      // 3) Lv.3 AVISPA XENO-REINA (3 Mecánicas): persecución agresiva en Y y embestida depredadora
      if (b.level === 3 && !b.isMiniBoss && b.phase === 2) {
        const dy = this.playerY - b.y;
        b.y += Math.max(-95, Math.min(95, dy * 0.9)) * dt;
      }

      // 4) Lv.4 MANTIS ESPECTRAL (4 Mecánicas): parpadeo dimensional con siluetas
      if (b.level === 4) {
        b.blinkCooldown -= dt;
        if (b.blinkCooldown <= 0) {
          b.blinkCooldown = b.phase === 2 ? 2.2 : 3.2;
          b.blinkGhostX = b.x;
          b.blinkGhostY = b.y;
          b.blinkGhostTimer = 0.6;
          const topLane = b.radius + 78;
          const botLane = this.height - b.radius - 70;
          b.y = b.y > this.height * 0.5 ? topLane + Math.random() * 90 : botLane - Math.random() * 90;
          this.spawnBurst(b.blinkGhostX, b.blinkGhostY, '#E879F9', 12, 185, false);
          this.spawnBurst(b.x, b.y, '#22D3EE', 12, 195, true);
        }
      }

      // 5) Lv.5 ESCORPIÓN EMPERADOR (5 Mecánicas): ráfaga de viento andino + aguijón supremo
      if (b.level === 5) {
        if (b.windActiveTimer > 0) {
          b.windActiveTimer = Math.max(0, b.windActiveTimer - dt);
          this.windForceX = b.phase === 2 ? -142 : -112;
        } else {
          b.windCooldown -= dt;
          if (b.windCooldown <= 0) {
            b.windActiveTimer = 2.6;
            b.windCooldown = b.phase === 2 ? 3.1 : 4.2;
            soundEngine.playWindGust();
            this.callouts.push({
              x: b.x - 30,
              y: b.y - 52,
              vy: -24,
              text: '¡TORMENTA DEL AGUIJÓN!',
              color: '#FDE047',
              life: 1.15,
              maxLife: 1.15,
            });
          }
        }
      }
    }

    if (b.windupTimer > 0) {
      b.windupTimer -= dt;
      if (b.windupTimer <= 0) {
        const bossShotMult = b.level === 1 ? 0.8 : Math.min(1.22, 0.92 + (b.level - 2) * 0.09);
        if (b.windupKind === 'beam') {
          const lanes = b.level >= 4 ? 3 : 2;
          for (let k = -lanes; k <= lanes; k++) {
            this.spawnEnemyBullet(
              b.x - 40,
              b.y + k * (b.level === 4 ? 14 : 9),
              (-410 - b.level * 24) * bossShotMult,
              k * 20 * bossShotMult,
              b.level === 4 ? '#22D3EE' : '#F43F5E',
              'sniper'
            );
          }
        } else if (b.windupKind === 'boomerang') {
          const count = b.level >= 5 ? (b.phase === 2 ? 5 : 4) : b.phase === 2 ? 4 : 3;
          for (let i = 0; i < count; i++) {
            const spread = (i - (count - 1) / 2) * 105 * bossShotMult;
            this.spawnEnemyBullet(b.x - 32, b.y, -385 * bossShotMult, spread, '#FACC15', 'boomerang', {
              accelX: 310 * bossShotMult,
              radius: 9,
            });
          }
        } else if (b.windupKind === 'bounce_orb') {
          const count = b.phase === 2 ? 4 : 3;
          for (let i = 0; i < count; i++) {
            const vy = (-210 + i * 115) * bossShotMult;
            this.spawnEnemyBullet(
              b.x - 28,
              b.y,
              (-260 - i * 24) * bossShotMult,
              vy,
              b.level === 2 ? '#FB7185' : '#34D399',
              'bounce_orb',
              {
                gravity: 480,
                bounces: b.level >= 4 ? 4 : 3,
                radius: 9.5,
              }
            );
          }
        } else if (b.windupKind === 'anvil') {
          // Venom mortars / heavy acid drops
          const count = b.phase === 2 ? 5 : 3;
          for (let i = 0; i < count; i++) {
            this.spawnEnemyBullet(b.x - 26, b.y - 14, (-195 - i * 68) * bossShotMult, -240, '#E879F9', 'bounce_orb', {
              gravity: 640,
              bounces: 1,
              radius: 10,
            });
          }
        } else if (b.windupKind === 'gravity_well') {
          this.spawnEnemyBullet(
            b.x - 36,
            b.y,
            -145 * bossShotMult,
            (this.playerY - b.y) * 0.18,
            '#C084FC',
            'gravity_orb',
            {
              radius: 14,
            }
          );
          for (const side of [-1, 1]) {
            this.spawnEnemyBullet(
              b.x - 30,
              b.y + side * 26,
              -275 * bossShotMult,
              side * 78 * bossShotMult,
              '#FDE047',
              'stinger'
            );
          }
        } else if (b.windupKind === 'dash') {
          if (b.level === 3 && !b.isMiniBoss) {
            // Avispa Xeno-Reina: rapid piercing stinger dash salvo aimed at player!
            const adx = this.playerX - b.x;
            const ady = this.playerY - b.y;
            const baseAng = Math.atan2(ady, adx);
            for (let s = -2; s <= 2; s++) {
              const ang = baseAng + s * 0.16;
              this.spawnEnemyBullet(
                b.x - 34,
                b.y,
                Math.cos(ang) * 390 * bossShotMult,
                Math.sin(ang) * 390 * bossShotMult,
                '#FACC15',
                'stinger'
              );
            }
          } else {
            // Trilobites Nv.1: radial fossil burst when armor unlocks
            const ring = b.phase === 2 ? 8 : 6;
            for (let i = 0; i < ring; i++) {
              const ang = (i / ring) * Math.PI * 2;
              this.spawnEnemyBullet(
                b.x - 20,
                b.y,
                (Math.cos(ang) * 200 - 75) * bossShotMult,
                Math.sin(ang) * 200 * bossShotMult,
                '#FACC15',
                'spore'
              );
            }
          }
        } else {
          const count = b.phase === 2 ? 7 : 5;
          for (let i = 0; i < count; i++) {
            const ang = Math.PI * 0.72 + (i / (count - 1)) * Math.PI * 0.56;
            this.spawnEnemyBullet(
              b.x - 30,
              b.y,
              Math.cos(ang) * 250 * bossShotMult,
              Math.sin(ang) * 250 * bossShotMult,
              '#FB923C',
              b.level === 3 ? 'stinger' : 'spore'
            );
          }
        }
        b.fireTimer = bossCfg.fireInterval * (b.phase === 2 ? 0.76 : 1);
      }
    } else if (b.x <= b.targetX + 12) {
      b.fireTimer -= dt;
      if (b.fireTimer <= 0) {
        const roll = Math.random();
        if (b.level === 1) {
          // Lv.1 Trilobites: 1 bespoke primary mechanic (carapace + radial fossil burst)
          b.windupKind = b.isMiniBoss
            ? roll < 0.6 ? 'boomerang' : 'fan'
            : 'dash';
        } else if (b.level === 2) {
          // Lv.2 Mariquita: 2 mechanics (bouncy parasite eggs + elytra spot fan)
          b.windupKind = roll < 0.52 ? 'bounce_orb' : 'fan';
        } else if (b.level === 3) {
          // Lv.3 Avispa: 3 mechanics (stinger fan + predator lunge + venom mortars)
          b.windupKind = roll < 0.36 ? 'fan' : roll < 0.68 ? 'dash' : 'anvil';
        } else if (b.level === 4) {
          // Lv.4 Mantis: 4 mechanics (spectral blink active above + scythe boomerangs + twin optic beams + ricochet orbs)
          b.windupKind = roll < 0.35 ? 'boomerang' : roll < 0.7 ? 'beam' : 'bounce_orb';
        } else {
          // Lv.5 Escorpión: 5 mechanics (wind gale active above + gravity telson + chitin meteors + acid beam + pincer nova boomerangs)
          b.windupKind =
            roll < 0.28
              ? 'gravity_well'
              : roll < 0.55
              ? 'bounce_orb'
              : roll < 0.8
              ? 'beam'
              : 'boomerang';
        }
        b.windupTimer = b.windupKind === 'beam' || b.windupKind === 'gravity_well' ? 0.56 : 0.38;
        if (b.phase === 2 && this.enemies.length < 4 && Math.random() < 0.45) {
          this.spawnEnemy(b.level >= 4 ? 'hornet' : b.level >= 2 ? 'flanker' : 'mosquito');
        }
      }
    }

    if (checkCircleCollision(this.playerX, this.playerY, 12, b.x, b.y, b.radius * 0.78)) {
      this.damagePlayer(this.playerX - b.x, this.playerY - b.y);
    }
  }

  private updateEnemyBullets(dt: number) {
    for (const eb of this.enemyBullets) {
      if (!eb.active) continue;
      eb.age += dt;
      eb.vx += eb.accelX * dt;
      eb.vy += eb.gravity * dt;
      eb.x += eb.vx * dt;
      eb.y += eb.vy * dt;

      if (eb.bounces > 0) {
        if (eb.y >= this.height - 26 && eb.vy > 0) {
          eb.y = this.height - 26;
          eb.vy = -Math.abs(eb.vy) * 0.88;
          eb.bounces--;
          // Level 3 Bombus Titán heavy anvil orbs emit horizontal ground shockwave spores on floor slam
          if (eb.kind === 'bounce_orb' && eb.gravity >= 600) {
            this.spawnBurst(eb.x, eb.y, '#E879F9', 6, 150, true);
            this.spawnEnemyBullet(eb.x - 10, eb.y - 6, -240, -35, '#FACC15', 'spore');
            this.spawnEnemyBullet(eb.x + 10, eb.y - 6, 165, -35, '#FACC15', 'spore');
          }
        } else if (eb.y <= 56 && eb.vy < 0) {
          eb.y = 56;
          eb.vy = Math.abs(eb.vy) * 0.88;
          eb.bounces--;
        }
      }

      if (eb.kind === 'gravity_orb') {
        const pdx = eb.x - this.playerX;
        const pdy = eb.y - this.playerY;
        const pdist = Math.hypot(pdx, pdy);
        if (pdist > 14 && pdist < 185) {
          const pull = (1 - pdist / 185) * 145 * dt;
          this.playerX = Math.max(46, Math.min(this.width - 80, this.playerX + (pdx / pdist) * pull));
          this.playerY = Math.max(68, Math.min(this.height - 46, this.playerY + (pdy / pdist) * pull));
        }
      }

      if (eb.x < -60 || eb.x > this.width + 90 || eb.y < -50 || eb.y > this.height + 50 || eb.age > 7) {
        eb.active = false;
        continue;
      }

      if (checkCircleCollision(this.playerX, this.playerY, 9.5, eb.x, eb.y, eb.radius)) {
        eb.active = false;
        this.damagePlayer(eb.vx || -1, eb.vy);
      }
    }
  }

  private registerComboKill(killX: number, killY: number) {
    const prevCombo = this.combo;
    this.combo++;
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    this.comboTimer = COMBO_WINDOW_SEC;

    const crossed = checkComboMilestoneCrossed(prevCombo, this.combo);
    if (crossed) {
      const milestoneBonus = crossed.threshold * 25;
      this.score += milestoneBonus;
      addScreenShakeTrauma(this.shakeState, 0.24);
      this.spawnBurst(this.playerX, this.playerY, crossed.accentColor, 18, 250, true);
      this.spawnBurst(killX, killY, crossed.accentColor, 14, 210, true);
      soundEngine.playComboMilestone(crossed.tierIndex);
      this.comboMilestone = {
        threshold: crossed.threshold,
        rank: crossed.rank,
        title: crossed.title,
        subtitle: `${crossed.subtitle} · +${milestoneBonus} pts`,
        multiplier: crossed.multiplier,
        accentColor: crossed.accentColor,
        secondaryColor: crossed.secondaryColor,
        ttl: 2.4,
        maxTtl: 2.4,
      };
      this.emitHud();
    }
  }

  private damagePlayer(impactDirX = -1, impactDirY = 0) {
    if (
      this.playerInvulnTimer > 0 ||
      this.defeatBeatTimer > 0 ||
      this.portal !== null ||
      (this.boss.active && !this.boss.isMiniBoss && this.boss.dyingTimer > 0)
    ) {
      return;
    }
    this.hp = Math.max(0, this.hp - 1);
    const fatal = this.hp <= 0;
    this.damageTaken++;
    this.combo = 0;
    this.comboTimer = 0;
    this.comboMilestone = null;
    this.playerInvulnTimer = this.config.player.invulnerableDurationSec;
    this.playerHitFlash = 0.09;
    this.hitstopTimer = fatal ? 0.09 : 0.055;
    triggerPlayerDamageShake(this.shakeState, impactDirX, impactDirY, fatal);
    this.playerScaleX = 0.75;
    this.playerScaleY = 1.28;
    emitPlayerHitParticles(this.particlePool, {
      x: this.playerX,
      y: this.playerY,
      dirX: impactDirX,
      dirY: impactDirY,
      fatal,
      reducedMotion: this.reducedMotion,
    });
    soundEngine.playPlayerHurt();

    if (fatal) {
      this.defeatBeatTimer = 0.55;
    }
    this.emitHud();
  }

  private spawnBurst(
    x: number,
    y: number,
    color: string,
    count: number,
    speed: number,
    outlined: boolean
  ) {
    emitGenericBurstParticles(this.particlePool, {
      x,
      y,
      color,
      count,
      speed,
      outlined,
      reducedMotion: this.reducedMotion,
    });
  }

  private updateParticles(dt: number) {
    stepParticlePool(this.particlePool, dt);
  }

  private updateCallouts(dt: number) {
    if (this.callouts.length > MAX_CALLOUTS) {
      this.callouts.splice(0, this.callouts.length - MAX_CALLOUTS);
    }
    for (let i = this.callouts.length - 1; i >= 0; i--) {
      const c = this.callouts[i];
      c.y += c.vy * dt;
      c.life -= dt;
      if (c.life <= 0) this.callouts.splice(i, 1);
    }
  }

  public emitHud() {
    const wave = this.config.waves[this.waveIndex];
    const levelWaves = this.getLevelWaves(this.levelIndex);
    const waveInLevel = wave && wave.level === this.levelIndex
      ? Math.max(1, levelWaves.indexOf(wave) + 1)
      : levelWaves.length;
    const bossCfg = this.getActiveBossConfig(this.levelIndex, this.boss.isMiniBoss);
    const loadout = this.getLoadout();
    const maxCd =
      loadout.utriculariaLevel > 0
        ? this.config.player.specialCooldownSec * (1 - loadout.utriculariaLevel * 0.1)
        : this.config.player.specialCooldownSec;

    const slots = resolveAbilitySlots(this.speciesLevels, this.primarySpecies, this.secondarySpecies);
    this.primarySpecies = slots.primary;
    this.secondarySpecies = slots.secondary;
    const isApexFusion = loadout.isSuperSaiyanFusion && loadout.fusedPair !== null;
    const apexMeta =
      isApexFusion && loadout.fusedPair
        ? getApexFusionMeta(loadout.fusedPair[0], loadout.fusedPair[1], this.config)
        : null;
    const secMeta = SECONDARY_ABILITY_META[this.secondarySpecies];
    const effectiveMaxCd = apexMeta ? apexMeta.cooldownSec : secMeta.cooldownSec;
    const secCharge = Math.max(
      0,
      Math.min(1, 1 - this.secondaryCooldown / Math.max(0.1, this.secondaryMaxCooldown || effectiveMaxCd))
    );

    this.checkLiveHighScoreProgress();
    const rankInfo = getComboRank(this.combo);

    this.onHudUpdate({
      hp: this.hp,
      maxHp: this.maxHp,
      score: Math.round(this.score),
      highScore: Math.max(this.highScore, Math.round(this.score)),
      previousHighScore: this.sessionStartBestScore,
      isNewHighScore: this.isNewHighScore,
      combo: this.combo,
      maxCombo: this.maxCombo,
      comboMultiplier: getComboMultiplier(this.combo),
      comboRank: rankInfo.rank,
      comboTimerRatio: this.combo > 0 ? Math.max(0, Math.min(1, this.comboTimer / COMBO_WINDOW_SEC)) : 0,
      comboMilestone: this.comboMilestone ? { ...this.comboMilestone } : null,
      levelIndex: this.levelIndex,
      waveInLevel,
      wavesInLevel: Math.max(1, levelWaves.length),
      waveTitle: this.boss.active ? bossCfg.name : wave ? wave.title : bossCfg.name,
      landscape: this.currentLandscape,
      speciesLevels: { ...this.speciesLevels },
      activeSlotsCount: loadout.activeSpecies.length,
      maxSlots: MAX_ACTIVE_SPECIES,
      secretEvolution: loadout.secretEvolution,
      isSuperSaiyanFusion: loadout.isSuperSaiyanFusion,
      apexFusionName: apexMeta?.title ?? null,
      apexFusionAutoName: apexMeta?.autoName ?? null,
      apexFusionManualName: apexMeta?.manualName ?? null,
      portalActive: this.portal !== null,
      primarySpecies: this.primarySpecies,
      secondarySpecies: this.secondarySpecies,
      secondaryName: apexMeta ? apexMeta.manualName : secMeta.name,
      secondaryCharge: secCharge,
      secondaryCooldownSec: effectiveMaxCd,
      canSwapAbilities: slots.canSwap && !isApexFusion,
      invasionIntensity: this.invasionIntensity,
      invasionAlertLabel: this.invasionAlertLabel,
      gamepadConnected: this.gamepadConnected,
      unlockedSpecies: [...this.unlockedSpecies],
      petId: this.selectedPet,
      unlockedPets: [...this.unlockedPets],
      specialCharge: Math.max(0, Math.min(1, 1 - this.specialCooldown / Math.max(0.1, maxCd))),
      frogReady: this.frog.enabled
        ? Math.max(0, Math.min(1, 1 - this.frog.tongueCooldown / Math.max(0.2, this.config.player.frogAlly.tongueCooldownSec)))
        : 0,
      frogActive: this.frog.enabled,
      mafiaActive: this.mafiaCats.length > 0,
      mafiaRemainingSec:
        this.mafiaCats.length > 0
          ? Number(Math.max(...this.mafiaCats.map((c) => c.life)).toFixed(1))
          : 0,
      activeSpecialLabel:
        this.mafiaCats.length > 0
          ? 'Mafia Gatuna'
          : this.infernalesRiders.length > 0 || this.sapucaiCryTimer > 0
          ? '¡Infernales!'
          : this.palitoCharmActiveTimer > 0
          ? 'Enamorados ♥'
          : this.batricioRainPending > 0 || this.poisonFrogs.length > 0
          ? 'Ranitas Venenosas'
          : null,
      activeSpecialRemainingSec:
        this.mafiaCats.length > 0
          ? Number(Math.max(...this.mafiaCats.map((c) => c.life)).toFixed(1))
          : this.infernalesRiders.length > 0 || this.sapucaiCryTimer > 0
          ? Number(
              Math.max(
                this.sapucaiCryTimer,
                ...(this.infernalesRiders.length > 0 ? this.infernalesRiders.map((r) => r.life) : [0])
              ).toFixed(1)
            )
          : this.palitoCharmActiveTimer > 0
          ? Number(this.palitoCharmActiveTimer.toFixed(1))
          : this.batricioRainPending > 0 || this.poisonFrogs.length > 0
          ? Number((this.batricioRainPending * 0.16 + 0.6).toFixed(1))
          : 0,
      bossActive: this.boss.active,
      isMiniBoss: this.boss.isMiniBoss,
      bossName: bossCfg.name,
      bossSubtitle: bossCfg.subtitle,
      bossHp: Math.max(0, Math.round(this.boss.hp)),
      bossMaxHp: Math.round(this.boss.maxHp),
      bossPhase: this.boss.phase,
      banner: this.banner ? { ...this.banner } : null,
      clearedLevelSummary: this.clearedLevelSummary ? { ...this.clearedLevelSummary } : null,
      enemiesDefeated: this.enemiesDefeated,
      damageTaken: this.damageTaken,
      elapsedSec: Math.round(this.elapsedSec),
      difficulty: this.difficulty,
      dynamicVelocityMult: this.escalation.velocityMult,
      dynamicSpawnRateMult: this.escalation.spawnRateMult,
      escalationTier: this.escalation.tier,
    });
  }

  public render(ctx: CanvasRenderingContext2D) {
    const shake = sampleScreenShake(this.shakeState, this.time, this.reducedMotion);
    const loadout = this.getLoadout();
    const secMeta = SECONDARY_ABILITY_META[this.secondarySpecies];
    const secCharge = Math.max(
      0,
      Math.min(1, 1 - this.secondaryCooldown / Math.max(0.1, this.secondaryMaxCooldown || secMeta.cooldownSec))
    );

    const renderState: RenderState = {
      width: this.width,
      height: this.height,
      time: this.time,
      beatPulse: this.beatPulse,
      windForceX: this.windForceX,
      levelIndex: this.levelIndex,
      landscape: this.currentLandscape,
      prevLandscape: this.prevLandscape,
      landscapeBlend: this.landscapeBlend,
      invasionIntensity: this.invasionIntensity,
      invasionAlertLabel: this.invasionAlertLabel,
      superSaiyanActive: loadout.isSuperSaiyanFusion,
      portal: this.portal,
      shakeX: shake.offsetX,
      shakeY: shake.offsetY,
      shakeAngleRad: shake.angleRad,
      shakeOverscanScale: shake.overscanScale,
      damageFlashAlpha: shake.damageFlashAlpha,
      playerX: this.playerX,
      playerY: this.playerY,
      playerVy: this.playerVy,
      playerInvulnTimer: this.playerInvulnTimer,
      playerHitFlash: this.playerHitFlash,
      playerScaleX: this.playerScaleX,
      playerScaleY: this.playerScaleY,
      heroJawChompTimer: this.heroJawChompTimer,
      heroBankAngle: this.heroBankAngle,
      heroRecoil: this.heroRecoil,
      primarySpecies: this.primarySpecies,
      secondarySpecies: this.secondarySpecies,
      secondaryCharge: secCharge,
      specialPulseTimer: this.specialPulseTimer,
      specialPulseRadius: this.specialPulseRadius,
      petId: this.selectedPet,
      royScreamTimer: this.royScreamTimer,
      royScreamRadius: this.royScreamRadius,
      palitoLoveTimer: this.palitoLoveTimer,
      palitoLoveRadius: this.palitoLoveRadius,
      sapucaiCryTimer: this.sapucaiCryTimer,
      speciesLevels: this.speciesLevels,
      frog: this.frog,
      mafiaCats: this.mafiaCats,
      poisonFrogs: this.poisonFrogs,
      infernalesRiders: this.infernalesRiders,
      playerBullets: this.playerBullets,
      enemyBullets: this.enemyBullets,
      enemies: this.enemies,
      acidPools: this.acidPools,
      vortexes: this.vortexes,
      pickups: this.pickups,
      boss: this.boss,
      particles: this.particlePool.items,
      callouts: this.callouts,
      config: this.config,
    };
    renderGameFrame(ctx, renderState);
  }
}
