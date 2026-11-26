export type GameStatus = 'title' | 'playing' | 'paused' | 'level_clear' | 'victory' | 'gameover';

export type PetId = 'batricio' | 'roy' | 'sicario' | 'palito' | 'carpincho';

export type SpeciesId =
  | 'dionaea'
  | 'drosera'
  | 'nepenthes'
  | 'utricularia'
  | 'sarracenia'
  | 'pinguicula'
  | 'heliamphora'
  | 'cephalotus';

export type SpeciesLevel = 0 | 1 | 2 | 3 | 4 | 5;
export type SpeciesLevels = Record<SpeciesId, SpeciesLevel>;

export type LevelNumber = 1 | 2 | 3 | 4 | 5;

export type EnemyArchetypeId =
  | 'drone'
  | 'mosquito'
  | 'tank'
  | 'sniper'
  | 'flanker'
  | 'hornet'
  | 'locust'
  | 'bomber';

export type LandscapeId =
  | 'pampa_dawn'
  | 'jungle_falls'
  | 'city_night'
  | 'urban_viaduct'
  | 'humahuaca_andes';

export interface SpeciesConfig {
  id: SpeciesId;
  name: string;
  scientificName: string;
  roleLabel: string;
  biologicalTrait: string;
  levelDescriptions: [string, string, string, string, string];
  unlockRequirementLevel?: 1 | 2 | 3 | 4;
  enabled: boolean;
  damage: number;
  fireRateMultiplier: number;
  accentColor: string;
  secondaryColor: string;
  traitStrength: number;
}

export interface EnemyArchetypeConfig {
  id: EnemyArchetypeId;
  name: string;
  scientificHint: string;
  hp: number;
  speed: number;
  score: number;
  radius: number;
  fireInterval: number;
  accentColor: string;
}

export interface WaveConfig {
  id: number;
  level: LevelNumber;
  title: string;
  landscape: LandscapeId;
  durationSec: number;
  spawnIntervalSec: number;
  archetypes: EnemyArchetypeId[];
  dropsMutagen: boolean;
}

export interface BossConfig {
  level: LevelNumber;
  name: string;
  subtitle: string;
  mechanicHint: string;
  landscape: LandscapeId;
  maxHp: number;
  speed: number;
  scoreBonus: number;
  fireInterval: number;
  unlocksSpecies?: SpeciesId;
  unlocksPet?: PetId;
}

export interface PetCatalogItem {
  id: PetId | 'locked_lv5';
  name: string;
  subtitle: string;
  closeRangeLabel: string;
  specialName: string;
  specialDesc: string;
  unlockLevel: number | null;
  implemented: boolean;
  accentColor: string;
}

export interface FrogAllyConfig {
  enabled: boolean;
  name: string;
  tongueCooldownSec: number;
  tongueRange: number;
  bubbleDamage: number;
}

export interface PlayerConfig {
  maxHp: number;
  moveSpeed: number;
  baseFireInterval: number;
  autoFire: boolean;
  specialCooldownSec: number;
  invulnerableDurationSec: number;
  mutagenCycleSec: number;
  frogAlly: FrogAllyConfig;
}

export interface GameConfig {
  gameTitle: string;
  gameSubtitle: string;
  player: PlayerConfig;
  species: Record<SpeciesId, SpeciesConfig>;
  enemies: Record<EnemyArchetypeId, EnemyArchetypeConfig>;
  waves: WaveConfig[];
  miniBosses: [BossConfig, BossConfig, BossConfig, BossConfig, BossConfig];
  bosses: [BossConfig, BossConfig, BossConfig, BossConfig, BossConfig];
}

export interface FusedLoadout {
  levels: SpeciesLevels;
  activeSpecies: SpeciesId[];
  secretEvolution: SpeciesId | null;
  fireInterval: number;
  dionaeaLevel: SpeciesLevel;
  dionaeaDamage: number;
  thornCount: number;
  snapIntervalShots: number;
  snapRadius: number;
  snapDamage: number;
  snapChargesSpecial: boolean;
  droseraLevel: SpeciesLevel;
  droseraDamage: number;
  mucilageCount: number;
  mucilageSlowFactor: number;
  mucilageSplash: boolean;
  mucilageRootCap: boolean;
  nepenthesLevel: SpeciesLevel;
  nepenthesDamage: number;
  acidBombCount: number;
  acidDps: number;
  acidRadius: number;
  acidArmorPierce: boolean;
  acidChainExplosion: boolean;
  utriculariaLevel: SpeciesLevel;
  utriculariaDamage: number;
  vacuumCount: number;
  vacuumPullStrength: number;
  vacuumSpawnsVortex: boolean;
  vacuumLifeSiphon: boolean;
  sarraceniaLevel: SpeciesLevel;
  sarraceniaDamage: number;
  trumpetCount: number;
  pinguiculaLevel: SpeciesLevel;
  pinguiculaDamage: number;
  crystalCount: number;
  heliamphoraLevel: SpeciesLevel;
  heliamphoraDamage: number;
  solarArcCount: number;
  cephalotusLevel: SpeciesLevel;
  cephalotusDamage: number;
  mortarCount: number;
  specialPower: number;
}

export type PlayerProjectileKind =
  | 'thorn'
  | 'mucilage'
  | 'acid'
  | 'vacuum'
  | 'snap'
  | 'frog_bubble'
  | 'trumpet'
  | 'crystal'
  | 'solar_arc'
  | 'mortar'
  | 'jaw_guillotine'
  | 'sticky_bola'
  | 'mega_acid'
  | 'singularity'
  | 'supersonic_rocket'
  | 'prism_crystal'
  | 'solar_helix'
  | 'cluster_bomb'
  | 'pistol_shot'
  | 'meow_wave'
  | 'mate_shot';

export interface ProjectileDescriptor {
  kind: PlayerProjectileKind;
  offsetX: number;
  offsetY: number;
  vx: number;
  vy: number;
  accelX?: number;
  gravity: number;
  drag: number;
  bounces: number;
  bounceCeiling?: boolean;
  splitsOnHit?: number;
  damage: number;
  radius: number;
  color: string;
  glowColor: string;
  slowFactor: number;
  acidDps: number;
  acidRadius: number;
  armorPierce: boolean;
  chainAcid: boolean;
  pullStrength: number;
  spawnsVortex: boolean;
  piercing: boolean;
  isSecondary?: boolean;
  rootDuration?: number;
  clearsEnemyBullets?: boolean;
  sinWaveAmp?: number;
  sinWaveFreq?: number;
}

export type ComboRank = 'C' | 'B' | 'A' | 'S' | 'SS' | 'SSS' | 'APEX';

export interface ComboMilestoneAnnouncement {
  threshold: number;
  rank: ComboRank;
  title: string;
  subtitle: string;
  multiplier: number;
  accentColor: string;
  secondaryColor: string;
  ttl: number;
  maxTtl: number;
}

export interface ClearedLevelSummary {
  clearedLevel: LevelNumber;
  nextLevel: LevelNumber;
  bossName: string;
  nextLevelTitle: string;
  unlockedSpeciesId?: SpeciesId;
  unlockedSpeciesName?: string;
  unlockedPetId?: PetId;
  unlockedPetName?: string;
}

export interface HudSnapshot {
  hp: number;
  maxHp: number;
  score: number;
  highScore: number;
  combo: number;
  maxCombo: number;
  comboMultiplier: number;
  comboRank: ComboRank;
  comboTimerRatio: number;
  comboMilestone: ComboMilestoneAnnouncement | null;
  levelIndex: LevelNumber;
  waveInLevel: number;
  wavesInLevel: number;
  waveTitle: string;
  landscape: LandscapeId;
  speciesLevels: SpeciesLevels;
  activeSlotsCount: number;
  maxSlots: number;
  secretEvolution: SpeciesId | null;
  unlockedSpecies: SpeciesId[];
  petId: PetId;
  unlockedPets: PetId[];
  clearedLevelSummary: ClearedLevelSummary | null;
  specialCharge: number;
  primarySpecies: SpeciesId;
  secondarySpecies: SpeciesId;
  secondaryName: string;
  secondaryCharge: number;
  secondaryCooldownSec: number;
  canSwapAbilities: boolean;
  invasionIntensity: number;
  invasionAlertLabel: string | null;
  gamepadConnected: boolean;
  mafiaActive: boolean;
  mafiaRemainingSec: number;
  activeSpecialLabel: string | null;
  activeSpecialRemainingSec: number;
  frogReady: number;
  frogActive: boolean;
  bossActive: boolean;
  isMiniBoss: boolean;
  bossName: string;
  bossSubtitle: string;
  bossHp: number;
  bossMaxHp: number;
  bossPhase: 1 | 2;
  banner: { title: string; detail: string; accentColor: string; ttl: number } | null;
  enemiesDefeated: number;
  damageTaken: number;
  elapsedSec: number;
}
