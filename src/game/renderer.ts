import { getSeamlessStageBackground, type SeamlessStageBackground } from './backgroundAssets';
import { ALL_SPECIES_IDS } from './gameConfig';
import type {
  GameConfig,
  LandscapeId,
  LevelNumber,
  PetId,
  PlayerProjectileKind,
  PortalSequenceState,
  SpeciesId,
  SpeciesLevels,
} from './types';
import type { FrogCompanionState, SimEnemyState } from './fusionRules';

// Precomputed 36-bucket HSL palette LUTs to avoid per-bullet per-frame string allocations in hot loops
const BULLET_LUT_SIZE = 36;
const ENEMY_BULLET_FILL_LUT: string[] = Array.from({ length: BULLET_LUT_SIZE }, (_, i) => {
  const hue = Math.round((i / BULLET_LUT_SIZE) * 360);
  return `hsl(${hue}, 100%, 56%)`;
});
const ENEMY_BULLET_CORE_LUT: string[] = Array.from({ length: BULLET_LUT_SIZE }, (_, i) => {
  const altHue = Math.round(((i / BULLET_LUT_SIZE) * 360 + 145) % 360);
  return `hsl(${altHue}, 100%, 72%)`;
});

export interface PlayerBullet {
  active: boolean;
  kind: PlayerProjectileKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  baseVy: number;
  accelX: number;
  gravity: number;
  drag: number;
  bounces: number;
  bounceCeiling: boolean;
  splitsOnHit: number;
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
  isSecondary: boolean;
  rootDuration: number;
  clearsEnemyBullets: boolean;
  sinWaveAmp: number;
  sinWaveFreq: number;
  age: number;
  life: number;
}

export interface EnemyBullet {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  accelX: number;
  gravity: number;
  bounces: number;
  radius: number;
  color: string;
  kind: 'spore' | 'sniper' | 'stinger' | 'bounce_orb' | 'boomerang' | 'gravity_orb';
  age: number;
}

export interface AcidPool {
  x: number;
  y: number;
  vx: number;
  radius: number;
  dps: number;
  life: number;
  maxLife: number;
  color: string;
}

export interface VacuumVortex {
  x: number;
  y: number;
  radius: number;
  pullStrength: number;
  life: number;
  maxLife: number;
  siphonHeal: boolean;
}

export interface MutagenPod {
  x: number;
  y: number;
  vx: number;
  baseY: number;
  cycleIndex: number;
  cycleTimer: number;
  cycleDuration: number;
  hitCooldown: number;
  shiftFlash: number;
  speciesOrder: SpeciesId[];
  age: number;
}

export interface MafiaCatUnit {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  homeOffsetX: number;
  homeOffsetY: number;
  coatColor: string;
  stripeColor: string;
  hatBand: string;
  fireTimer: number;
  slashTimer: number;
  slashX: number;
  slashY: number;
  life: number;
  maxLife: number;
  bobSeed: number;
}

export interface PoisonFrogUnit {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vRot: number;
  color: string;
  spotColor: string;
  radius: number;
  life: number;
}

export interface InfernalRiderUnit {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  horseColor: string;
  ponchoColor: string;
  radius: number;
  life: number;
  maxLife: number;
  gallopPhase: number;
  hitIds: number[];
}

export interface BossState {
  active: boolean;
  level: LevelNumber;
  isMiniBoss: boolean;
  x: number;
  y: number;
  targetX: number;
  vy: number;
  hp: number;
  maxHp: number;
  radius: number;
  phase: 1 | 2;
  age: number;
  fireTimer: number;
  windupTimer: number;
  windupKind: 'fan' | 'beam' | 'dash' | 'boomerang' | 'bounce_orb' | 'gravity_well' | 'anvil';
  hitFlashTimer: number;
  dyingTimer: number;
  shieldActive: boolean;
  shieldTimer: number;
  blinkCooldown: number;
  blinkGhostTimer: number;
  blinkGhostX: number;
  blinkGhostY: number;
  windCooldown: number;
  windActiveTimer: number;
}

export interface Particle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  outlined: boolean;
}

export interface FloatingCallout {
  x: number;
  y: number;
  vy: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
}

export interface RenderState {
  width: number;
  height: number;
  time: number;
  beatPulse: number; // 0..1 synced to level music BPM
  windForceX: number; // negative when Andean gusts blow leftward
  levelIndex: LevelNumber;
  landscape: LandscapeId;
  prevLandscape: LandscapeId;
  landscapeBlend: number; // 0..1
  shakeX: number;
  shakeY: number;
  playerX: number;
  playerY: number;
  playerVy: number;
  playerInvulnTimer: number;
  playerHitFlash: number;
  playerScaleX: number;
  playerScaleY: number;
  specialPulseTimer: number;
  specialPulseRadius: number;
  royScreamTimer: number;
  royScreamRadius: number;
  palitoLoveTimer: number;
  palitoLoveRadius: number;
  sapucaiCryTimer: number;
  petId: PetId;
  speciesLevels: SpeciesLevels;
  primarySpecies: SpeciesId;
  secondarySpecies: SpeciesId;
  secondaryCharge: number; // 0..1
  heroJawChompTimer: number; // >0 when chomping jaws animate
  heroBankAngle: number; // -1..1 smooth vertical bank factor
  heroRecoil: number; // 0..1 recoil kickback
  invasionIntensity: number; // 0..1 approaching invasion escalation
  invasionAlertLabel: string | null;
  superSaiyanActive: boolean;
  portal: PortalSequenceState | null;
  frog: FrogCompanionState;
  mafiaCats: MafiaCatUnit[];
  poisonFrogs: PoisonFrogUnit[];
  infernalesRiders: InfernalRiderUnit[];
  playerBullets: PlayerBullet[];
  enemyBullets: EnemyBullet[];
  enemies: SimEnemyState[];
  acidPools: AcidPool[];
  vortexes: VacuumVortex[];
  pickups: MutagenPod[];
  boss: BossState;
  particles: Particle[];
  callouts: FloatingCallout[];
  config: GameConfig;
}

const INK = '#0E1722';

// ============================================================================
// ENDLESS HORIZONTAL TERRESTRIAL EARTH BACKDROPS (100% On Earth — Zero Space!)
// ============================================================================

interface EarthPalette {
  skyTop: [number, number, number];
  skyMid: [number, number, number];
  skyBot: [number, number, number];
  horizonGlow: [number, number, number];
  cloudBody: [number, number, number];
  cloudShade: [number, number, number];
  cloudLit: [number, number, number];
  sunRayAlpha: number;
}

const EARTH_PALETTES: Record<LandscapeId, EarthPalette> = {
  pampa_dawn: {
    skyTop: [29, 78, 137],
    skyMid: [86, 166, 214],
    skyBot: [248, 214, 138],
    horizonGlow: [254, 240, 138],
    cloudBody: [252, 244, 232],
    cloudShade: [148, 178, 204],
    cloudLit: [255, 248, 205],
    sunRayAlpha: 0.2,
  },
  jungle_falls: {
    skyTop: [22, 62, 86],
    skyMid: [188, 92, 54],
    skyBot: [246, 178, 96],
    horizonGlow: [253, 224, 71],
    cloudBody: [248, 204, 164],
    cloudShade: [122, 74, 86],
    cloudLit: [254, 243, 199],
    sunRayAlpha: 0.18,
  },
  city_night: {
    skyTop: [16, 20, 44],
    skyMid: [34, 30, 74],
    skyBot: [72, 42, 88],
    horizonGlow: [251, 146, 60],
    cloudBody: [72, 64, 110],
    cloudShade: [32, 28, 58],
    cloudLit: [186, 118, 152],
    sunRayAlpha: 0.06,
  },
  urban_viaduct: {
    skyTop: [15, 29, 54],
    skyMid: [22, 78, 108],
    skyBot: [194, 86, 98],
    horizonGlow: [56, 189, 248],
    cloudBody: [198, 176, 192],
    cloudShade: [64, 82, 112],
    cloudLit: [253, 186, 116],
    sunRayAlpha: 0.14,
  },
  humahuaca_andes: {
    skyTop: [20, 68, 146],
    skyMid: [54, 136, 196],
    skyBot: [244, 198, 118],
    horizonGlow: [250, 204, 21],
    cloudBody: [254, 242, 224],
    cloudShade: [148, 136, 164],
    cloudLit: [254, 249, 195],
    sunRayAlpha: 0.24,
  },
};

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function mixRgb(a: [number, number, number], b: [number, number, number], t: number, alpha = 1): string {
  const r = Math.round(lerp(a[0], b[0], t));
  const g = Math.round(lerp(a[1], b[1], t));
  const bl = Math.round(lerp(a[2], b[2], t));
  return alpha >= 0.999 ? `rgb(${r},${g},${bl})` : `rgba(${r},${g},${bl},${alpha.toFixed(2)})`;
}

function hash01(n: number): number {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
  return s - Math.floor(s);
}

function drawAnimeCloudCluster(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  scale: number,
  bodyCol: string,
  shadeCol: string,
  litCol: string,
  seed: number
) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);

  const w1 = 48 + hash01(seed + 1) * 32;
  const w2 = 34 + hash01(seed + 2) * 24;
  const w3 = 28 + hash01(seed + 3) * 20;

  ctx.fillStyle = shadeCol;
  ctx.beginPath();
  ctx.ellipse(-w1 * 0.55, 16, w2 * 0.85, 22, 0, 0, Math.PI * 2);
  ctx.ellipse(0, 18, w1 * 0.95, 26, 0, 0, Math.PI * 2);
  ctx.ellipse(w1 * 0.6, 15, w3 * 0.85, 20, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = bodyCol;
  ctx.beginPath();
  ctx.arc(-w1 * 0.55, 4, w2 * 0.72, 0, Math.PI * 2);
  ctx.arc(-w1 * 0.12, -10, w1 * 0.7, 0, Math.PI * 2);
  ctx.arc(w1 * 0.36, -2, w2 * 0.65, 0, Math.PI * 2);
  ctx.arc(w1 * 0.72, 8, w3 * 0.58, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = litCol;
  ctx.beginPath();
  ctx.arc(-w1 * 0.14, -14, w1 * 0.54, Math.PI * 1.05, Math.PI * 1.92);
  ctx.arc(w1 * 0.34, -6, w2 * 0.48, Math.PI * 1.08, Math.PI * 1.95);
  ctx.fill();

  ctx.restore();
}

function drawPampaDawnTerrain(ctx: CanvasRenderingContext2D, width: number, height: number, time: number, beatPulse: number) {
  // Golden sunrise sun disc on right horizon (pulsing gently on the beat)
  const sunX = width * 0.82;
  const sunY = height * 0.58;
  const sunR = 46 + beatPulse * 7;
  ctx.fillStyle = 'rgba(254, 240, 138, 0.28)';
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunR * 1.9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#FEF9C3';
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
  ctx.fill();

  // Far rolling pampean hills
  ctx.fillStyle = '#3B7A57';
  ctx.beginPath();
  ctx.moveTo(0, height);
  for (let x = 0; x <= width + 60; x += 48) {
    const wy = height * 0.68 + Math.sin((x + time * 26) * 0.0065) * 18 + Math.cos((x + time * 14) * 0.013) * 8;
    ctx.lineTo(x, wy);
  }
  ctx.lineTo(width + 60, height);
  ctx.closePath();
  ctx.fill();

  // Mid Paraná Celeste River band with sunlit sparkles
  const riverTop = height * 0.73;
  const riverBot = height * 0.85;
  const riverGrad = ctx.createLinearGradient(0, riverTop, 0, riverBot);
  riverGrad.addColorStop(0, '#38BDF8');
  riverGrad.addColorStop(0.5, '#0284C7');
  riverGrad.addColorStop(1, '#0369A1');
  ctx.fillStyle = riverGrad;
  ctx.fillRect(0, riverTop, width, riverBot - riverTop);

  // Shimmering water glints scrolling leftward
  const glintSpan = width + 180;
  ctx.fillStyle = 'rgba(254, 249, 195, 0.55)';
  for (let i = 0; i < 18; i++) {
    const gx = ((hash01(i * 17.3) * glintSpan - time * (68 + (i % 3) * 18)) % glintSpan + glintSpan) % glintSpan - 90;
    const gy = riverTop + 6 + hash01(i * 9.7) * (riverBot - riverTop - 12);
    const gw = 18 + (i % 4) * 10;
    ctx.fillRect(gx, gy, gw, 2.2);
  }

  // Lush Pampean foreground meadows
  ctx.fillStyle = '#1E5B3A';
  ctx.beginPath();
  ctx.moveTo(0, height);
  for (let x = 0; x <= width + 40; x += 36) {
    const my = height * 0.84 + Math.sin((x + time * 95) * 0.012) * 7;
    ctx.lineTo(x, my);
  }
  ctx.lineTo(width + 40, height);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#14452B';
  ctx.fillRect(0, height * 0.91, width, height * 0.1);

  // Scrolling Argentine Windmills (Molinos de Viento) & Eucalyptus Trees!
  const propSpan = width + 360;
  for (let i = 0; i < 6; i++) {
    const px = ((i * 250 - time * 110) % propSpan + propSpan) % propSpan - 120;
    const groundY = height * 0.86;
    if (i % 2 === 0) {
      // Classic metal pampa windmill tower
      ctx.strokeStyle = '#0E1722';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(px - 10, groundY + 12);
      ctx.lineTo(px - 2, groundY - 48);
      ctx.lineTo(px + 2, groundY - 48);
      ctx.lineTo(px + 10, groundY + 12);
      ctx.moveTo(px - 7, groundY - 12);
      ctx.lineTo(px + 7, groundY - 12);
      ctx.moveTo(px - 5, groundY - 30);
      ctx.lineTo(px + 5, groundY - 30);
      ctx.stroke();

      // Rotating fan wheel
      ctx.save();
      ctx.translate(px, groundY - 50);
      ctx.rotate(time * (2.6 + beatPulse * 0.5) + i);
      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 2;
      for (let b = 0; b < 6; b++) {
        const a = (b / 6) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a) * 14, Math.sin(a) * 14);
        ctx.stroke();
      }
      ctx.fillStyle = '#E11D48';
      ctx.beginPath();
      ctx.arc(0, 0, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else {
      // Eucalyptus grove silhouette
      ctx.fillStyle = '#0F3623';
      ctx.fillRect(px - 3, groundY - 26, 6, 36);
      ctx.beginPath();
      ctx.arc(px, groundY - 34, 16, 0, Math.PI * 2);
      ctx.arc(px - 11, groundY - 26, 12, 0, Math.PI * 2);
      ctx.arc(px + 12, groundY - 27, 13, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawJungleFallsTerrain(ctx: CanvasRenderingContext2D, width: number, height: number, time: number, beatPulse: number) {
  // Distant misty Misiones mesas
  ctx.fillStyle = '#114B46';
  ctx.beginPath();
  ctx.moveTo(0, height);
  for (let x = 0; x <= width + 60; x += 50) {
    const my = height * 0.58 + Math.sin((x + time * 24) * 0.008) * 26;
    ctx.lineTo(x, my);
  }
  ctx.lineTo(width + 60, height);
  ctx.closePath();
  ctx.fill();

  // Red-earth basalt cliffs & cascading turquoise Iguazú waterfalls
  const cliffSpan = width + 420;
  for (let c = 0; c < 4; c++) {
    const cx = ((c * 340 - time * 64) % cliffSpan + cliffSpan) % cliffSpan - 180;
    const cliffY = height * (0.64 + (c % 2) * 0.05);
    const cliffW = 190 + (c % 2) * 50;

    // Terracotta red cliff face
    ctx.fillStyle = '#7C2D12';
    ctx.fillRect(cx, cliffY, cliffW, height - cliffY);
    ctx.fillStyle = '#9A3412';
    ctx.fillRect(cx + 12, cliffY + 8, cliffW - 24, height - cliffY);

    // Emerald jungle cap on top of cliff
    ctx.fillStyle = '#047857';
    ctx.beginPath();
    ctx.ellipse(cx + cliffW * 0.5, cliffY, cliffW * 0.58, 16, 0, 0, Math.PI * 2);
    ctx.fill();

    // Cascading Iguazú Waterfall ribbon
    const wfX = cx + cliffW * 0.34;
    const wfW = 36 + beatPulse * 4;
    const wfGrad = ctx.createLinearGradient(0, cliffY, 0, height);
    wfGrad.addColorStop(0, '#E0F2FE');
    wfGrad.addColorStop(0.35, '#38BDF8');
    wfGrad.addColorStop(1, '#0EA5E9');
    ctx.fillStyle = wfGrad;
    ctx.fillRect(wfX, cliffY + 4, wfW, height - cliffY);

    // Animated foam streaks falling down the waterfall
    ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
    for (let s = 0; s < 5; s++) {
      const sy = cliffY + ((time * 165 + s * 38) % Math.max(40, height - cliffY));
      ctx.fillRect(wfX + 4 + (s * 7) % (wfW - 8), sy, 3.5, 16);
    }

    // Rising misty spray cloud at waterfall base pulsing to Cumbia beat
    ctx.fillStyle = `rgba(224, 242, 254, ${(0.34 + beatPulse * 0.22).toFixed(2)})`;
    ctx.beginPath();
    ctx.arc(wfX + wfW * 0.5, height * 0.91, 34 + beatPulse * 10, 0, Math.PI * 2);
    ctx.arc(wfX + wfW * 0.1, height * 0.93, 24 + beatPulse * 6, 0, Math.PI * 2);
    ctx.arc(wfX + wfW * 0.9, height * 0.93, 26 + beatPulse * 7, 0, Math.PI * 2);
    ctx.fill();
  }

  // Lush foreground rainforest canopy silhouettes
  const palmSpan = width + 260;
  ctx.fillStyle = '#064E3B';
  ctx.fillRect(0, height * 0.9, width, height * 0.12);
  for (let i = 0; i < 10; i++) {
    const px = ((i * 155 - time * 135) % palmSpan + palmSpan) % palmSpan - 80;
    const py = height * 0.89;
    ctx.fillStyle = '#022C22';
    ctx.beginPath();
    ctx.arc(px, py, 24 + (i % 3) * 8, Math.PI, Math.PI * 2);
    ctx.fill();
  }

  // Warm bioluminescent jungle fireflies drifting with the Cumbia groove
  const ffSpan = width + 140;
  for (let i = 0; i < 16; i++) {
    const fx = ((hash01(i * 19.7) * ffSpan - time * (62 + (i % 4) * 18)) % ffSpan + ffSpan) % ffSpan - 70;
    const fy = height * (0.28 + hash01(i * 7.1) * 0.58) + Math.sin(time * 3.8 + i) * 12;
    const r = 2.2 + beatPulse * 1.8;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(250, 204, 21, 0.72)' : 'rgba(52, 211, 153, 0.72)';
    ctx.beginPath();
    ctx.arc(fx, fy, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawCityNightTerrain(ctx: CanvasRenderingContext2D, width: number, height: number, time: number, beatPulse: number) {
  // Warm urban sodium-amber glow along wet street horizon (no space/stars!)
  const glowGrad = ctx.createLinearGradient(0, height * 0.56, 0, height);
  glowGrad.addColorStop(0, 'rgba(251, 146, 60, 0)');
  glowGrad.addColorStop(0.7, `rgba(234, 88, 12, ${(0.16 + beatPulse * 0.12).toFixed(2)})`);
  glowGrad.addColorStop(1, 'rgba(15, 23, 42, 0.92)');
  ctx.fillStyle = glowGrad;
  ctx.fillRect(0, height * 0.56, width, height * 0.44);

  // Expanding Boom-Bap sub-bass acoustic pulse rings in the rainy sky
  ctx.save();
  ctx.strokeStyle = `rgba(232, 121, 249, ${(0.12 + beatPulse * 0.28).toFixed(2)})`;
  ctx.lineWidth = 2.5 + beatPulse * 3.5;
  ctx.beginPath();
  ctx.arc(width * 0.72, height * 0.44, 62 + beatPulse * 85, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = `rgba(251, 146, 60, ${(0.08 + beatPulse * 0.18).toFixed(2)})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(width * 0.72, height * 0.44, 125 + beatPulse * 95, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // Far Porteño high-rise skyline
  const farSpan = width + 320;
  for (let i = 0; i < 16; i++) {
    const bx = ((i * 96 - time * 32) % farSpan + farSpan) % farSpan - 120;
    const bw = 54 + (i % 3) * 18;
    const bh = 110 + (i % 5) * 34;
    const by = height - bh;
    ctx.fillStyle = '#17153B';
    ctx.fillRect(bx, by, bw, bh);
    // Warm lit apartment windows
    ctx.fillStyle = i % 3 === 0 ? 'rgba(253, 224, 71, 0.42)' : 'rgba(251, 146, 60, 0.36)';
    for (let wy = by + 12; wy < height - 50; wy += 16) {
      for (let wx = bx + 8; wx < bx + bw - 10; wx += 12) {
        if (hash01(wx * 3.1 + wy * 1.7 + i) > 0.45) {
          ctx.fillRect(wx, wy, 5, 7);
        }
      }
    }
  }

  // Iconic Buenos Aires Obelisco gliding in mid-ground parallax!
  const obSpan = width + 900;
  const obX = ((width * 0.75 - time * 58) % obSpan + obSpan) % obSpan - 200;
  const obBaseY = height * 0.92;
  const obTopY = height * 0.38;
  ctx.fillStyle = '#334155';
  ctx.strokeStyle = '#0B1120';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(obX - 18, obBaseY);
  ctx.lineTo(obX - 10, obTopY + 18);
  ctx.lineTo(obX, obTopY);
  ctx.lineTo(obX + 10, obTopY + 18);
  ctx.lineTo(obX + 18, obBaseY);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Illuminated summit windows on Obelisco
  ctx.fillStyle = `rgba(254, 240, 138, ${(0.72 + beatPulse * 0.25).toFixed(2)})`;
  ctx.fillRect(obX - 4, obTopY + 22, 8, 5);

  // Foreground dark buildings & glowing wet avenue + streetlamps
  const nearSpan = width + 300;
  for (let i = 0; i < 12; i++) {
    const bx = ((i * 124 - time * 88) % nearSpan + nearSpan) % nearSpan - 120;
    const bw = 66 + (i % 2) * 26;
    const bh = 64 + (i % 4) * 24;
    const by = height - bh;
    ctx.fillStyle = '#0B1021';
    ctx.fillRect(bx, by, bw, bh);
    // Neon signage accents
    if (i % 3 === 1) {
      ctx.fillStyle = i % 2 === 0 ? 'rgba(244, 63, 94, 0.7)' : 'rgba(56, 189, 248, 0.7)';
      ctx.fillRect(bx + 10, by + 12, bw - 20, 4);
    }
  }

  // Wet asphalt street & sodium streetlamp reflections
  ctx.fillStyle = '#090D16';
  ctx.fillRect(0, height * 0.92, width, height * 0.1);
  const lampSpan = width + 240;
  for (let i = 0; i < 9; i++) {
    const lx = ((i * 180 - time * 145) % lampSpan + lampSpan) % lampSpan - 80;
    ctx.fillStyle = 'rgba(251, 191, 36, 0.75)';
    ctx.beginPath();
    ctx.arc(lx, height * 0.89, 3.5 + beatPulse * 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(251, 191, 36, 0.18)';
    ctx.beginPath();
    ctx.ellipse(lx, height * 0.95, 22, 4, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Crisp angled rain streaks falling across Buenos Aires night
  ctx.strokeStyle = 'rgba(186, 230, 253, 0.24)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (let i = 0; i < 34; i++) {
    const rx = ((hash01(i * 23.1) * (width + 160) - time * 420) % (width + 160) + (width + 160)) % (width + 160) - 80;
    const ry = ((hash01(i * 11.7) * height + time * 640) % height);
    ctx.moveTo(rx, ry);
    ctx.lineTo(rx - 10, ry + 20);
  }
  ctx.stroke();
}

function drawUrbanViaductTerrain(ctx: CanvasRenderingContext2D, width: number, height: number, time: number, beatPulse: number) {
  // Harbor gantry cranes & suspension bridge towers in mid-ground
  const craneSpan = width + 480;
  for (let i = 0; i < 5; i++) {
    const cx = ((i * 310 - time * 48) % craneSpan + craneSpan) % craneSpan - 180;
    const baseY = height * 0.84;
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 4;
    if (i % 2 === 0) {
      // Industrial harbor gantry crane
      ctx.beginPath();
      ctx.moveTo(cx, baseY);
      ctx.lineTo(cx + 8, baseY - 125);
      ctx.lineTo(cx + 34, baseY - 125);
      ctx.lineTo(cx + 42, baseY);
      // Long angled boom arm
      ctx.moveTo(cx - 48, baseY - 110);
      ctx.lineTo(cx + 95, baseY - 148);
      ctx.stroke();
      // Red aviation warning beacon blinking on beat
      ctx.fillStyle = beatPulse > 0.4 ? '#F43F5E' : '#9F1239';
      ctx.beginPath();
      ctx.arc(cx + 95, baseY - 148, 3.5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Suspension bridge pylon + sweeping cables
      ctx.beginPath();
      ctx.moveTo(cx, baseY);
      ctx.lineTo(cx, baseY - 160);
      ctx.moveTo(cx + 26, baseY);
      ctx.lineTo(cx + 26, baseY - 160);
      ctx.moveTo(cx, baseY - 140);
      ctx.lineTo(cx + 26, baseY - 140);
      ctx.moveTo(cx, baseY - 88);
      ctx.lineTo(cx + 26, baseY - 88);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - 140, baseY - 35);
      ctx.quadraticCurveTo(cx - 50, baseY - 75, cx + 13, baseY - 155);
      ctx.quadraticCurveTo(cx + 85, baseY - 75, cx + 170, baseY - 35);
      ctx.stroke();
    }
  }

  // Elevated concrete highway viaduct deck & arches scrolling fast along bottom
  const deckY = height * 0.81;
  ctx.fillStyle = '#1E293B';
  ctx.fillRect(0, deckY, width, 16);
  ctx.fillStyle = '#334155';
  ctx.fillRect(0, deckY, width, 4);

  const archSpan = width + 240;
  ctx.fillStyle = '#0F172A';
  for (let i = 0; i < 10; i++) {
    const ax = ((i * 150 - time * 165) % archSpan + archSpan) % archSpan - 120;
    ctx.fillRect(ax, deckY + 14, 24, height - deckY);
    // Concrete arch ribs
    ctx.beginPath();
    ctx.moveTo(ax + 24, deckY + 14);
    ctx.quadraticCurveTo(ax + 75, deckY + 14, ax + 126, deckY + 14);
    ctx.lineTo(ax + 126, deckY + 46);
    ctx.quadraticCurveTo(ax + 75, deckY + 18, ax + 24, deckY + 46);
    ctx.closePath();
    ctx.fill();
  }

  // Fast streaking traffic light trails along the highway deck
  const carSpan = width + 320;
  for (let i = 0; i < 10; i++) {
    const dir = i % 2 === 0 ? -1 : 1;
    const speed = dir < 0 ? 310 : 210;
    const cx = ((hash01(i * 33.7) * carSpan + time * speed * dir) % carSpan + carSpan) % carSpan - 120;
    const cy = deckY + (dir < 0 ? 5 : 10);
    ctx.fillStyle = dir < 0 ? '#FDE047' : '#FB7185';
    ctx.fillRect(cx, cy, 26, 2.5);
  }
}

function drawHumahuacaAndesTerrain(ctx: CanvasRenderingContext2D, width: number, height: number, time: number, beatPulse: number, windForceX: number) {
  // Radiant Inti Golden Sun + Rotating Chakana Solar Crest in high Andean sky
  const sunX = width * 0.78;
  const sunY = height * 0.22;
  ctx.save();
  ctx.translate(sunX, sunY);
  ctx.fillStyle = `rgba(254, 240, 138, ${(0.22 + beatPulse * 0.16).toFixed(2)})`;
  ctx.beginPath();
  ctx.arc(0, 0, 56 + beatPulse * 14, 0, Math.PI * 2);
  ctx.fill();

  ctx.rotate(time * 0.24);
  ctx.strokeStyle = 'rgba(250, 204, 21, 0.55)';
  ctx.lineWidth = 2.6;
  ctx.strokeRect(-32, -32, 64, 64);
  ctx.rotate(Math.PI / 4);
  ctx.strokeRect(-32, -32, 64, 64);
  ctx.fillStyle = '#FEF08A';
  ctx.beginPath();
  ctx.arc(0, 0, 22 + beatPulse * 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Flowing Andean Aguayo fabric wind ribbons
  const aguayoColors = ['rgba(250, 204, 21, 0.28)', 'rgba(225, 29, 72, 0.24)', 'rgba(14, 165, 233, 0.24)'];
  aguayoColors.forEach((col, idx) => {
    ctx.strokeStyle = col;
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    for (let x = -20; x <= width + 20; x += 44) {
      const y = height * (0.27 + idx * 0.04) + Math.sin(x * 0.011 + time * 2.6 + idx) * (16 + beatPulse * 5);
      if (x === -20) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  });

  // Far Snow-Capped Andean Cordillera peaks
  const farSpan = width + 420;
  for (let i = 0; i < 8; i++) {
    const mx = ((i * 210 - time * 26) % farSpan + farSpan) % farSpan - 180;
    const mw = 230 + (i % 3) * 45;
    const mh = 185 + (i % 4) * 32;
    ctx.fillStyle = '#475569';
    ctx.beginPath();
    ctx.moveTo(mx - mw * 0.5, height);
    ctx.lineTo(mx, height - mh);
    ctx.lineTo(mx + mw * 0.5, height);
    ctx.closePath();
    ctx.fill();
    // Snow cap
    ctx.fillStyle = '#F8FAFC';
    ctx.beginPath();
    ctx.moveTo(mx, height - mh);
    ctx.lineTo(mx - mw * 0.16, height - mh + 34);
    ctx.lineTo(mx - mw * 0.05, height - mh + 26);
    ctx.lineTo(mx + mw * 0.06, height - mh + 36);
    ctx.lineTo(mx + mw * 0.16, height - mh + 32);
    ctx.closePath();
    ctx.fill();
  }

  // Mid-ground CERRO DE LOS SIETE COLORES (Stratified colored Humahuaca ridges!)
  const strataColors = ['#B45309', '#DC2626', '#D97706', '#7E22CE', '#15803D', '#EA580C'];
  const hillSpan = width + 360;
  for (let i = 0; i < 10; i++) {
    const hx = ((i * 165 - time * 64) % hillSpan + hillSpan) % hillSpan - 160;
    const hw = 195 + (i % 3) * 35;
    const hh = 115 + (i % 4) * 24;
    const baseCol = strataColors[i % strataColors.length];
    const bandCol = strataColors[(i + 2) % strataColors.length];

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(hx - hw * 0.5, height);
    ctx.lineTo(hx - hw * 0.12, height - hh);
    ctx.lineTo(hx + hw * 0.1, height - hh * 0.94);
    ctx.lineTo(hx + hw * 0.5, height);
    ctx.closePath();
    ctx.fillStyle = baseCol;
    ctx.fill();
    ctx.clip();

    // Diagonal mineral geological strata bands
    ctx.fillStyle = bandCol;
    ctx.beginPath();
    ctx.moveTo(hx - hw * 0.5, height - hh * 0.35);
    ctx.lineTo(hx + hw * 0.5, height - hh * 0.72);
    ctx.lineTo(hx + hw * 0.5, height - hh * 0.45);
    ctx.lineTo(hx - hw * 0.5, height - hh * 0.12);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#FACC15';
    ctx.globalAlpha = 0.55;
    ctx.fillRect(hx - hw * 0.5, height - hh * 0.25, hw, 10);
    ctx.restore();
  }

  // Foreground canyon terracotta floor & Cardón cacti
  ctx.fillStyle = '#7C2D12';
  ctx.fillRect(0, height * 0.89, width, height * 0.12);
  const cactusSpan = width + 280;
  ctx.fillStyle = '#14532D';
  for (let i = 0; i < 7; i++) {
    const cx = ((i * 210 - time * 130) % cactusSpan + cactusSpan) % cactusSpan - 100;
    const cy = height * 0.9;
    ctx.fillRect(cx - 3, cy - 28, 6, 30);
    ctx.fillRect(cx - 11, cy - 20, 8, 4);
    ctx.fillRect(cx - 11, cy - 26, 4, 9);
    ctx.fillRect(cx + 3, cy - 16, 8, 4);
    ctx.fillRect(cx + 7, cy - 23, 4, 10);
  }

  // Gliding Andean Condor silhouettes in upper air
  const condorSpan = width + 260;
  ctx.strokeStyle = '#1E1B4B';
  ctx.lineWidth = 2.4;
  for (let i = 0; i < 3; i++) {
    const bx = ((hash01(i * 41.3) * condorSpan - time * (45 + i * 14)) % condorSpan + condorSpan) % condorSpan - 100;
    const by = height * (0.18 + i * 0.11) + Math.sin(time * 2 + i) * 10;
    const wingY = Math.sin(time * 5 + i * 2) * 5;
    ctx.beginPath();
    ctx.moveTo(bx - 16, by + wingY);
    ctx.quadraticCurveTo(bx - 6, by - 6, bx, by);
    ctx.quadraticCurveTo(bx + 6, by - 6, bx + 16, by + wingY);
    ctx.stroke();
  }

  // Visible high-altitude wind gusts when Boss 5 unleashes Andean Wind!
  if (windForceX < -5) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = 2.4;
    const gustSpan = width + 220;
    for (let i = 0; i < 16; i++) {
      const gx = ((hash01(i * 13.9) * gustSpan - time * 980) % gustSpan + gustSpan) % gustSpan - 100;
      const gy = height * (0.1 + hash01(i * 29.1) * 0.78);
      ctx.beginPath();
      ctx.moveTo(gx, gy);
      ctx.lineTo(gx + 95, gy);
      ctx.stroke();
    }
    ctx.restore();
  }
}

/**
 * Draws a pre-blended panoramic stage background in a continuous infinite horizontal loop
 * with smooth vertical camera parallax and zero seams or overlapping images.
 */
function drawSeamlessPanorama(
  ctx: CanvasRenderingContext2D,
  bg: SeamlessStageBackground,
  width: number,
  height: number,
  time: number,
  playerY: number,
  scrollSpeed: number
) {
  const srcW = bg.width || 1600;
  const srcH = bg.height || 900;
  const drawH = Math.ceil(height * 1.08);
  const scale = drawH / srcH;
  const drawW = Math.max(Math.ceil(width * 1.1), Math.ceil(srcW * scale));

  const yNorm = Math.max(0, Math.min(1, playerY / Math.max(1, height)));
  const offsetY = Math.round(-yNorm * (drawH - height));

  const rawOffset = ((time * scrollSpeed) % drawW + drawW) % drawW;
  const startX = -Math.floor(rawOffset);

  for (let x = startX; x < width + 2; x += drawW) {
    ctx.drawImage(bg.source, x, offsetY, drawW + 1, drawH);
  }
}

/**
 * Crisp combat embers when a boss fight is active — zero background ships,
 * zero searchlight laser beams, and zero blurry screen-wide dark/red washes.
 */
function drawInvasionSignals(ctx: CanvasRenderingContext2D, state: RenderState) {
  const { width, height, time, boss } = state;
  if (!boss.active) return;

  const emberSpan = width + 180;
  ctx.save();
  for (let i = 0; i < 12; i++) {
    const ex = ((hash01(i * 43.1) * emberSpan - time * (240 + (i % 4) * 55)) % emberSpan + emberSpan) % emberSpan - 80;
    const ey = ((hash01(i * 17.7) * height - time * (28 + (i % 3) * 16)) % height + height) % height;
    ctx.fillStyle = i % 2 === 0 ? '#FB923C' : '#FDE047';
    ctx.fillRect(ex, ey, 4, 2);
  }
  ctx.restore();
}

/**
 * Crisp atmospheric effects tailored to each Earth stage without muddying foreground visibility.
 */
function drawLevelAtmosphereEffects(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number,
  beatPulse: number,
  windForceX: number,
  landscape: LandscapeId
) {
  if (landscape === 'pampa_dawn') {
    // Golden floating Pampa pollen motes & crisp warm morning breeze lines
    const span = width + 160;
    for (let i = 0; i < 14; i++) {
      const px = ((hash01(i * 17.3) * span - time * (75 + (i % 4) * 22)) % span + span) % span - 80;
      const py = height * (0.14 + hash01(i * 9.1) * 0.72) + Math.sin(time * 2.4 + i) * 9;
      ctx.fillStyle = i % 2 === 0 ? '#FEF08A' : '#FDE047';
      ctx.beginPath();
      ctx.arc(px, py, 1.8 + beatPulse * 0.9, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(254, 240, 138, 0.28)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const bx = ((hash01(i * 31.7) * span - time * 320) % span + span) % span - 80;
      const by = height * (0.18 + i * 0.13);
      ctx.moveTo(bx, by);
      ctx.lineTo(bx + 36, by);
    }
    ctx.stroke();
  } else if (landscape === 'jungle_falls') {
    // Crisp Misiones tropical fireflies pulsing to Cumbia Villera groove + drifting jungle leaves
    const span = width + 160;
    for (let i = 0; i < 16; i++) {
      const fx = ((hash01(i * 19.7) * span - time * (68 + (i % 4) * 18)) % span + span) % span - 80;
      const fy = height * (0.18 + hash01(i * 7.1) * 0.68) + Math.sin(time * 3.8 + i) * 12;
      const r = 2.0 + beatPulse * 1.4;
      ctx.fillStyle = i % 2 === 0 ? '#34D399' : '#FACC15';
      ctx.beginPath();
      ctx.arc(fx, fy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(fx, fy, r * 0.45, 0, Math.PI * 2);
      ctx.fill();
    }
    // Small gliding jungle leaves
    for (let i = 0; i < 6; i++) {
      const lx = ((hash01(i * 41.9) * span - time * (120 + (i % 3) * 26)) % span + span) % span - 80;
      const ly = height * (0.16 + hash01(i * 13.7) * 0.66) + Math.sin(time * 4.5 + i * 2) * 14;
      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate(Math.sin(time * 3 + i) * 0.5 - 0.35);
      ctx.fillStyle = '#22C55E';
      ctx.beginPath();
      ctx.ellipse(0, 0, 5.5, 2.3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  } else if (landscape === 'city_night') {
    // Crisp Buenos Aires night rain + low street splash glints
    const span = width + 160;
    ctx.strokeStyle = 'rgba(186, 230, 253, 0.34)';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    for (let i = 0; i < 34; i++) {
      const rx = ((hash01(i * 23.1) * span - time * 420) % span + span) % span - 80;
      const ry = (hash01(i * 11.7) * height + time * 640) % height;
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx - 10, ry + 19);
    }
    ctx.stroke();
    // Crisp city light glints near lower horizon
    for (let i = 0; i < 10; i++) {
      const gx = ((i * 145 - time * 110) % span + span) % span - 70;
      const gy = height * 0.94;
      ctx.fillStyle = i % 2 === 0 ? '#38BDF8' : '#FBBF24';
      ctx.fillRect(gx, gy, 10, 2);
    }
  } else if (landscape === 'urban_viaduct') {
    // Fast highway taillight streaks along bottom edge & crisp motion sparks
    const span = width + 240;
    for (let i = 0; i < 12; i++) {
      const cx = ((hash01(i * 33.7) * span - time * (320 + (i % 3) * 75)) % span + span) % span - 100;
      const cy = height * (0.87 + (i % 3) * 0.03);
      ctx.fillStyle = i % 2 === 0 ? '#FDE047' : '#FB7185';
      ctx.fillRect(cx, cy, 24, 2.5);
    }
  } else if (landscape === 'humahuaca_andes') {
    // High-altitude golden mineral dust & crisp Andean sun sparkles
    const span = width + 180;
    for (let i = 0; i < 14; i++) {
      const dx = ((hash01(i * 27.3) * span - time * (115 + (i % 4) * 28)) % span + span) % span - 90;
      const dy = height * (0.15 + hash01(i * 14.9) * 0.72) + Math.sin(time * 2.8 + i) * 7;
      ctx.fillStyle = i % 3 === 0 ? '#FDE047' : i % 3 === 1 ? '#FB923C' : '#F8FAFC';
      ctx.fillRect(dx, dy, 3, 2);
    }
    if (windForceX < -5) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
      ctx.lineWidth = 2.2;
      const gustSpan = width + 220;
      for (let i = 0; i < 14; i++) {
        const gx = ((hash01(i * 13.9) * gustSpan - time * 980) % gustSpan + gustSpan) % gustSpan - 100;
        const gy = height * (0.1 + hash01(i * 29.1) * 0.78);
        ctx.beginPath();
        ctx.moveTo(gx, gy);
        ctx.lineTo(gx + 90, gy);
        ctx.stroke();
      }
      ctx.restore();
    }
  }
}

function drawEarthLevelBackdrop(ctx: CanvasRenderingContext2D, state: RenderState) {
  const { width, height, time, beatPulse, windForceX, landscape, prevLandscape, landscapeBlend, playerY } = state;
  const t = Math.max(0, Math.min(1, landscapeBlend));

  const curBg = getSeamlessStageBackground(landscape);

  if (curBg) {
    const baseSpeed =
      landscape === 'urban_viaduct'
        ? 84
        : landscape === 'humahuaca_andes'
        ? 68
        : landscape === 'city_night'
        ? 56
        : 52;

    drawSeamlessPanorama(ctx, curBg, width, height, time, playerY, baseSpeed);
    drawLevelAtmosphereEffects(ctx, width, height, time, beatPulse, windForceX, landscape);
  } else {
    // Graceful procedural fallback while stage illustration loads
    const palA = EARTH_PALETTES[prevLandscape] ?? EARTH_PALETTES.pampa_dawn;
    const palB = EARTH_PALETTES[landscape] ?? EARTH_PALETTES.pampa_dawn;

    const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
    skyGrad.addColorStop(0, mixRgb(palA.skyTop, palB.skyTop, t));
    skyGrad.addColorStop(0.54, mixRgb(palA.skyMid, palB.skyMid, t));
    skyGrad.addColorStop(1, mixRgb(palA.skyBot, palB.skyBot, t));
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, width, height);

    const cloudBody = mixRgb(palA.cloudBody, palB.cloudBody, t, 0.52);
    const cloudShade = mixRgb(palA.cloudShade, palB.cloudShade, t, 0.54);
    const cloudLit = mixRgb(palA.cloudLit, palB.cloudLit, t, 0.65);

    const cloudWrapW = width + 420;
    for (let i = 0; i < 6; i++) {
      const speed = i < 3 ? 38 : 76;
      const rawX = hash01(i * 41.2) * cloudWrapW - time * speed;
      const cycleNum = Math.floor(rawX / cloudWrapW);
      const cx = ((rawX % cloudWrapW) + cloudWrapW) % cloudWrapW - 210;
      const cy = height * (0.14 + hash01(i * 17.9 + cycleNum * 7.3) * 0.34);
      const scale = (i < 3 ? 0.68 : 0.96) * (0.85 + hash01(i * 9.1 + cycleNum) * 0.35);
      drawAnimeCloudCluster(ctx, cx, cy, scale, cloudBody, cloudShade, cloudLit, i * 13 + cycleNum * 5);
    }

    if (landscape === 'pampa_dawn') {
      drawPampaDawnTerrain(ctx, width, height, time, beatPulse);
    } else if (landscape === 'jungle_falls') {
      drawJungleFallsTerrain(ctx, width, height, time, beatPulse);
    } else if (landscape === 'city_night') {
      drawCityNightTerrain(ctx, width, height, time, beatPulse);
    } else if (landscape === 'urban_viaduct') {
      drawUrbanViaductTerrain(ctx, width, height, time, beatPulse);
    } else {
      drawHumahuacaAndesTerrain(ctx, width, height, time, beatPulse, windForceX);
    }
  }

  // Crisp boss embers (no background ship or laser beams)
  drawInvasionSignals(ctx, state);

  // Crisp Horizontal Anime Flight Speed Lines (Right-to-Left)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const ly = ((i * 89 + 47) % (height - 80)) + 40;
    const span = width + 180;
    const lx = ((hash01(i * 29.3) * span - time * 680) % span + span) % span - 90;
    const len = 48 + (i % 3) * 24;
    ctx.moveTo(lx, ly);
    ctx.lineTo(lx + len, ly);
  }
  ctx.stroke();
}

// ============================================================================
// HIGH-DEFINITION ANIMATED HERO BIPLANE (Argentine Dionaea + Fluid Multi-Part Animation)
// ============================================================================

function drawHeroBiplane(ctx: CanvasRenderingContext2D, state: RenderState) {
  const {
    playerX,
    playerY,
    playerVy,
    playerInvulnTimer,
    playerHitFlash,
    playerScaleX,
    playerScaleY,
    speciesLevels,
    primarySpecies,
    secondarySpecies,
    secondaryCharge,
    heroJawChompTimer,
    heroBankAngle,
    heroRecoil,
    time,
    config,
  } = state;

  const isInvulnBlink = playerInvulnTimer > 0 && Math.floor(time * 18) % 2 === 0 && playerHitFlash <= 0;

  const dLv = speciesLevels.dionaea;
  const drLv = speciesLevels.drosera;
  const nLv = speciesLevels.nepenthes;
  const uLv = speciesLevels.utricularia;
  const sarLv = speciesLevels.sarracenia;
  const pinLv = speciesLevels.pinguicula;
  const helLv = speciesLevels.heliamphora;
  const cepLv = speciesLevels.cephalotus;
  const secretLv5Id = ALL_SPECIES_IDS.find((id) => speciesLevels[id] >= 5) ?? null;

  ctx.save();
  if (isInvulnBlink) {
    ctx.globalAlpha = 0.46;
  }

  // Smooth engine micro-vibration + recoil kickback on shot/secondary
  const engineHumY = Math.sin(time * 38) * 0.85;
  const recoilShiftX = -heroRecoil * 6.5;
  ctx.translate(playerX + recoilShiftX, playerY + engineHumY);

  const bank = Math.max(-1, Math.min(1, heroBankAngle || playerVy / 520));
  const pitchTilt = Math.max(-0.3, Math.min(0.3, bank * 0.28));
  ctx.rotate(pitchTilt);
  // Agile readable proportion with crisp cel-shaded definition
  ctx.scale(playerScaleX * 0.88, playerScaleY * 0.88);

  const flash = playerHitFlash > 0;
  const jade = flash ? '#FFFFFF' : '#2EB852';
  const jadeDark = flash ? '#FFFFFF' : '#14532D';
  const jadeMid = flash ? '#FFFFFF' : '#16A34A';
  const jadeHi = flash ? '#FFFFFF' : '#86EFAC';
  const crimson = flash ? '#FFFFFF' : config.species.dionaea.accentColor;
  const crimsonDark = flash ? '#FFFFFF' : '#881337';
  const crimsonBright = flash ? '#FFFFFF' : '#FB7185';
  const toothCol = flash ? '#FFFFFF' : '#F8FAFC';
  const brass = flash ? '#FFFFFF' : '#F59E0B';
  const brassHi = flash ? '#FFFFFF' : '#FEF08A';

  // Active secondary accent glow when secondary skill is 100% charged!
  const secAccent = config.species[secondarySpecies]?.accentColor ?? '#FB7185';
  const priAccent = config.species[primarySpecies]?.accentColor ?? '#E11D48';

  // 1. Dynamic Wingtip Slipstream Contrails (curved smoothly by banking velocity)
  if (!flash) {
    const trailCurve = -bank * 14;
    ctx.strokeStyle = secretLv5Id ? 'rgba(250, 204, 21, 0.65)' : 'rgba(224, 242, 254, 0.45)';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-14, -22 + bank * 3);
    ctx.quadraticCurveTo(-36, -22 + trailCurve * 0.5, -62 - Math.sin(time * 24) * 8, -22 + trailCurve);
    ctx.moveTo(-10, 13 + bank * 2);
    ctx.quadraticCurveTo(-30, 13 + trailCurve * 0.5, -50 - Math.cos(time * 22) * 7, 13 + trailCurve);
    ctx.stroke();
  }

  // 2. Secondary-Ready Subtle Charge Halo behind nose/wings
  if (secondaryCharge >= 0.999 && !flash) {
    const pulse = 0.42 + Math.sin(time * 8.5) * 0.22;
    ctx.save();
    ctx.strokeStyle = secAccent;
    ctx.globalAlpha = pulse;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.ellipse(8, -1, 48 + Math.sin(time * 8.5) * 2.5, 29, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // 3. Utricularia Lv 3+ Orbital Pressure Ring / Secret Lv 5 Golden Apex Aura
  if (uLv >= 3 && !flash) {
    ctx.save();
    ctx.strokeStyle = 'rgba(34, 211, 238, 0.68)';
    ctx.lineWidth = 2.4;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.ellipse(0, 0, 56, 35, 0, time * 2.8, time * 2.8 + Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }
  if ((secretLv5Id || state.superSaiyanActive) && !flash) {
    const spCol = config.species[secretLv5Id ?? primarySpecies]?.accentColor ?? '#FACC15';
    ctx.save();
    ctx.strokeStyle = 'rgba(250, 204, 21, 0.94)';
    ctx.lineWidth = state.superSaiyanActive ? 4.2 : 3.2;
    ctx.beginPath();
    ctx.ellipse(6, -1, 58, 36, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = spCol;
    ctx.globalAlpha = 0.82;
    ctx.lineWidth = 2.6;
    ctx.setLineDash([10, 6]);
    ctx.beginPath();
    ctx.ellipse(6, -1, 65, 42, 0, -time * 3.8, -time * 3.8 + Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    if (state.superSaiyanActive) {
      // Super Saiyan golden spiky flame aura + crackling ki lightning!
      ctx.globalAlpha = 0.88;
      ctx.fillStyle = 'rgba(250, 204, 21, 0.28)';
      ctx.strokeStyle = '#FEF08A';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      const spikes = 16;
      for (let s = 0; s <= spikes; s++) {
        const ang = (s / spikes) * Math.PI * 2 + time * 3.5;
        const flare = s % 2 === 0 ? 16 + Math.sin(time * 28 + s) * 6 : 2;
        const px = Math.cos(ang) * (54 + flare);
        const py = Math.sin(ang) * (32 + flare * 0.65);
        if (s === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Golden spiky Super Saiyan crest atop fuselage
      ctx.fillStyle = '#FACC15';
      ctx.strokeStyle = '#FEF9C3';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(-12, -26);
      ctx.lineTo(-4, -44);
      ctx.lineTo(3, -30);
      ctx.lineTo(12, -46);
      ctx.lineTo(14, -30);
      ctx.lineTo(24, -40);
      ctx.lineTo(18, -24);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  // 4. Layered Anime Afterburner Thruster Exhaust (-X)
  const flameW = 18 + Math.sin(time * 48) * 6 + heroRecoil * 8;
  ctx.fillStyle = secretLv5Id ? '#FACC15' : priAccent;
  ctx.beginPath();
  ctx.moveTo(-33, -5.5);
  ctx.lineTo(-33 - flameW * 1.15, 0);
  ctx.lineTo(-33, 5.5);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#FEF9C3';
  ctx.beginPath();
  ctx.moveTo(-33, -2.8);
  ctx.lineTo(-33 - flameW * 0.62, 0);
  ctx.lineTo(-33, 2.8);
  ctx.closePath();
  ctx.fill();

  // 5. Drosera Living Streaming Sticky Dew Tentacles (-X)
  if (drLv > 0) {
    const droCol = flash ? '#FFFFFF' : config.species.drosera.accentColor;
    const droHi = flash ? '#FFFFFF' : '#FEF08A';
    const tentacleCount = 2 + drLv * 2;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.2;
    for (let t = 0; t < tentacleCount; t++) {
      const by = -16 + t * (32 / Math.max(1, tentacleCount - 1));
      const bx = -14;
      const tx = bx - 19 - drLv * 3.6;
      const ty = by + Math.sin(time * 13 + t * 1.4) * (4.6 + drLv * 0.7) - bank * 5;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.quadraticCurveTo(bx - 9, by + (ty - by) * 0.35, tx, ty);
      ctx.stroke();

      ctx.fillStyle = droCol;
      ctx.beginPath();
      ctx.arc(tx, ty, 3.2 + drLv * 0.45, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = droHi;
      ctx.beginPath();
      ctx.arc(tx - 0.8, ty - 0.8, 1.25, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 6. Far-Side Lower Wing (2.5D Banking Perspective Shift)
  const lowerWingY = 8 - bank * 3.5;
  ctx.fillStyle = jadeDark;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.3;
  ctx.beginPath();
  ctx.moveTo(-6, lowerWingY - 2);
  ctx.lineTo(22, lowerWingY);
  ctx.lineTo(17, lowerWingY + 6.5 - bank * 1.8);
  ctx.lineTo(-14, lowerWingY + 5.5 - bank * 1.8);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 7. Landing Gear Struts & Cel-Shaded Teardrop Wheel Spats
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(4, 8);
  ctx.lineTo(10, 21.5);
  ctx.moveTo(15, 8);
  ctx.lineTo(10, 21.5);
  ctx.stroke();

  ctx.fillStyle = '#0F172A';
  ctx.beginPath();
  ctx.arc(10, 23.5, 5.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = secretLv5Id ? '#FACC15' : crimson;
  ctx.beginPath();
  ctx.ellipse(9.5, 21, 9.2, 4.8, -0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  if (!flash) {
    ctx.fillStyle = crimsonBright;
    ctx.beginPath();
    ctx.ellipse(10, 19.3, 5.2, 1.5, -0.1, 0, Math.PI * 2);
    ctx.fill();
  }

  // 8. Nepenthes Belly Pitcher Bomb Pods
  if (nLv > 0) {
    const podColor = flash ? '#FFFFFF' : config.species.nepenthes.accentColor;
    const podCount = nLv >= 3 ? 3 : nLv >= 2 ? 2 : 1;
    for (let p = 0; p < podCount; p++) {
      ctx.save();
      ctx.translate(-6 + p * 13, 15.5 + (p % 2) * 2.5);
      ctx.rotate(Math.sin(time * 7 + p) * 0.08);
      const w = 8.8 + nLv * 1.1;
      const h = 5.6 + nLv * 0.8;
      ctx.fillStyle = podColor;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, 0, w, h, 0.14, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = nLv >= 3 ? '#FDE047' : '#BEF264';
      ctx.beginPath();
      ctx.ellipse(w * 0.65, 0, 2.8, h * 0.78, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }

  // 9. Rippling Argentine Flag Tail Fin & Rudder (Celeste / Blanco / Celeste + Radiant Sol de Mayo!)
  const flagRipple = Math.sin(time * 18) * 1.8;
  const traceTailFin = () => {
    ctx.beginPath();
    ctx.moveTo(-20, -2);
    ctx.lineTo(-35, -22 + flagRipple * 0.5);
    ctx.quadraticCurveTo(-43 - flagRipple * 0.4, -15, -36, 4 + flagRipple * 0.3);
    ctx.lineTo(-22, 5.5);
    ctx.closePath();
  };

  ctx.fillStyle = flash ? '#FFFFFF' : '#74ACDF';
  traceTailFin();
  ctx.fill();

  if (!flash) {
    ctx.save();
    traceTailFin();
    ctx.clip();

    // Top celeste stripe
    ctx.fillStyle = '#74ACDF';
    ctx.fillRect(-46, -24, 28, 10);
    // Center pure white stripe
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(-46, -14, 28, 9);
    // Bottom celeste stripe
    ctx.fillStyle = '#74ACDF';
    ctx.fillRect(-46, -5, 28, 13);
    // Subtle anime fabric wave shadow
    ctx.fillStyle = 'rgba(15, 23, 42, 0.14)';
    ctx.fillRect(-35 + flagRipple, -24, 4, 32);

    // Detailed Golden Sol de Mayo with sun rays
    ctx.save();
    ctx.translate(-31.5, -9.5);
    ctx.strokeStyle = '#D97706';
    ctx.lineWidth = 1;
    for (let r = 0; r < 8; r++) {
      const a = (r / 8) * Math.PI * 2 + time * 0.6;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 2.2, Math.sin(a) * 2.2);
      ctx.lineTo(Math.cos(a) * 4.2, Math.sin(a) * 4.2);
      ctx.stroke();
    }
    ctx.fillStyle = '#FACC15';
    ctx.beginPath();
    ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    ctx.restore();
  }

  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.3;
  traceTailFin();
  ctx.stroke();

  // Horizontal Rear Stabilizer Fin
  ctx.fillStyle = jadeMid;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(-29, 3.5 + bank * 1.4, 8.5, 2.8, 0.08, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // 10. Main Cel-Shaded Organic-Metal Fuselage Facing Right (+X)
  ctx.fillStyle = jade;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(-34, 1.8);
  ctx.quadraticCurveTo(-14, -12.5, 22, -11);
  ctx.lineTo(26, 10);
  ctx.quadraticCurveTo(-12, 12, -34, 5.8);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  if (!flash) {
    // Glossy anime upper rim highlight
    ctx.fillStyle = jadeHi;
    ctx.beginPath();
    ctx.moveTo(-23, -4);
    ctx.quadraticCurveTo(-4, -11, 20, -9.5);
    ctx.lineTo(18, -6);
    ctx.quadraticCurveTo(-3, -7, -21, -2.5);
    ctx.closePath();
    ctx.fill();

    // Rich crimson carnivorous belly plating
    ctx.fillStyle = crimson;
    ctx.beginPath();
    ctx.moveTo(-27, 3.2);
    ctx.quadraticCurveTo(-4, -2.5, 21, -1.8);
    ctx.lineTo(21, 9);
    ctx.quadraticCurveTo(-6, 10, -27, 4.8);
    ctx.closePath();
    ctx.fill();

    // Deep underside core shadow for crisp 3D volume
    ctx.fillStyle = crimsonDark;
    ctx.beginPath();
    ctx.moveTo(-24, 5.2);
    ctx.quadraticCurveTo(-2, 7.5, 20, 6.2);
    ctx.lineTo(20, 9);
    ctx.quadraticCurveTo(-6, 10, -24, 5.5);
    ctx.closePath();
    ctx.fill();

    // Wrapping glowing botanical leaf vein along fuselage flank
    ctx.strokeStyle = jadeHi;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-19, 2.5);
    ctx.quadraticCurveTo(-6, -3.5, 5, 3.5);
    ctx.quadraticCurveTo(13, 6.5, 20, 0.5);
    ctx.stroke();

    // Crisp brass cockpit fairing & fuselage rivets
    ctx.fillStyle = brass;
    for (const rx of [-14, -4, 6, 16]) {
      ctx.beginPath();
      ctx.arc(rx, -4.5, 1.05, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 11. Open Cockpit, Multi-Segment Flowing Aviator Scarf & Expressive Goggled Pilot
  if (!flash) {
    // 3-segment whipping scarf reacting smoothly to both speed and vertical bank!
    const w1 = Math.sin(time * 24) * 3.5 - bank * 4;
    const w2 = Math.sin(time * 24 - 1.1) * 5.2 - bank * 8;
    const w3 = Math.sin(time * 24 - 2.2) * 6.8 - bank * 11;

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 5.4;
    ctx.beginPath();
    ctx.moveTo(-8, -8.5);
    ctx.lineTo(-16, -10.5 + w1 * 0.45);
    ctx.lineTo(-25, -9.5 + w2 * 0.65);
    ctx.lineTo(-35, -10 + w3 * 0.8);
    ctx.stroke();

    ctx.strokeStyle = '#F8FAFC';
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(-8, -8.5);
    ctx.lineTo(-16, -10.5 + w1 * 0.45);
    ctx.lineTo(-25, -9.5 + w2 * 0.65);
    ctx.lineTo(-35, -10 + w3 * 0.8);
    ctx.stroke();

    // Argentine celeste stripe accent along scarf tip
    ctx.strokeStyle = '#74ACDF';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-25, -9.5 + w2 * 0.65);
    ctx.lineTo(-34, -10 + w3 * 0.8);
    ctx.stroke();
  }

  // Cockpit leather rim & windshield glass
  ctx.fillStyle = '#1E293B';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.ellipse(-5, -8.5, 8.2, 3.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Pilot aviator leather helmet + ear flap + glowing sky-blue goggles
  ctx.fillStyle = '#92400E';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(-5, -11, 5.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  if (!flash) {
    // Leather helmet highlight
    ctx.fillStyle = '#D97706';
    ctx.beginPath();
    ctx.arc(-6.4, -13, 2, 0, Math.PI * 2);
    ctx.fill();
    // Brass-rimmed reflective sky-blue aviator goggles
    ctx.fillStyle = '#38BDF8';
    ctx.strokeStyle = brass;
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.roundRect(-2.5, -13.6, 5.2, 3.4, 1.4);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(-1.4, -12.9, 1.8, 1.1);
    // Angled glass windscreen in front of pilot
    ctx.strokeStyle = '#BAE6FD';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(2, -9.5);
    ctx.lineTo(-1, -15.5);
    ctx.stroke();
  }

  // 12. Utricularia Dorsal Cyan Vacuum Turbine Nacelles
  if (uLv > 0) {
    const utCol = flash ? '#FFFFFF' : config.species.utricularia.accentColor;
    ctx.fillStyle = utCol;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(-16, -9.5, 5.4 + uLv * 0.9, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    if (uLv >= 2) {
      ctx.beginPath();
      ctx.arc(-24, -6.5, 4 + uLv * 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    ctx.strokeStyle = '#CFFAFE';
    ctx.lineWidth = 1.7;
    ctx.beginPath();
    ctx.arc(-16, -9.5, 9.2 + uLv * 1.1, time * 7.5, time * 7.5 + Math.PI * 1.3);
    ctx.stroke();
  }

  // 13. Interplane Brass Struts & Cross-Rigging Wires (adapt to 2.5D bank)
  const upperWingY = -22 + bank * 3.8;
  ctx.strokeStyle = secretLv5Id ? '#FACC15' : brass;
  ctx.lineWidth = 2.4;
  for (const sx of [-1, 13]) {
    ctx.beginPath();
    ctx.moveTo(sx, upperWingY + 5);
    ctx.lineTo(sx - 2, lowerWingY + 1);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(15, 23, 42, 0.72)';
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(-1, upperWingY + 5);
  ctx.lineTo(11, lowerWingY + 1);
  ctx.moveTo(13, upperWingY + 5);
  ctx.lineTo(-3, lowerWingY + 1);
  ctx.stroke();

  // 14. Upper Parasol Biplane Wing (2.5D Bank Perspective + Crimson Inner Leaf + Argentine Roundel!)
  ctx.fillStyle = secretLv5Id && !flash ? '#FACC15' : jade;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(-16, upperWingY);
  ctx.quadraticCurveTo(6, upperWingY - 5.5 - bank * 2, 26, upperWingY + 3.5);
  ctx.lineTo(18, upperWingY + 9.5 + bank * 1.5);
  ctx.quadraticCurveTo(3, upperWingY + 5.5, -18, upperWingY + 6.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  if (!flash) {
    ctx.fillStyle = crimson;
    ctx.beginPath();
    ctx.moveTo(-12, upperWingY + 2);
    ctx.quadraticCurveTo(6, upperWingY - 2, 20, upperWingY + 4.5);
    ctx.lineTo(14, upperWingY + 7.2);
    ctx.quadraticCurveTo(4, upperWingY + 5, -13, upperWingY + 5.5);
    ctx.closePath();
    ctx.fill();

    // Crisp Argentine celeste-white-celeste wing roundel bar
    ctx.fillStyle = '#74ACDF';
    ctx.fillRect(9, upperWingY + 0.5, 7, 1.8);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(9, upperWingY + 2.3, 7, 1.8);
    ctx.fillStyle = '#74ACDF';
    ctx.fillRect(9, upperWingY + 4.1, 7, 1.8);
  }

  // Dionaea Marginal Spikes along Upper Wing (flex slightly with speed!)
  const toothLen = 5.8 + dLv * 1.9;
  ctx.fillStyle = dLv >= 5 && !flash ? '#FACC15' : dLv >= 3 && !flash ? '#FEF08A' : toothCol;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 3 + Math.min(5, dLv); i++) {
    const tx = -11 + i * 4.5;
    const ty = upperWingY + Math.abs(i - 2) * 0.65;
    ctx.beginPath();
    ctx.moveTo(tx - 1.9, ty);
    ctx.lineTo(tx + 1.4, ty - toothLen);
    ctx.lineTo(tx + 2.4, ty + 0.6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // 15. ARTICULATED HINGED VENUS-FLYTRAP JAWS AT NOSE (Actively Opens & Chomps on Fire / Secondary!)
  // chompOpen is 0..1: spikes open when firing or secondary triggers, breathes subtly otherwise
  const chompPhase =
    heroJawChompTimer > 0
      ? Math.sin(Math.min(1, heroJawChompTimer / 0.24) * Math.PI)
      : 0.14 + Math.sin(time * 6.5) * 0.08;
  const jawAngle = 0.12 + chompPhase * 0.52;

  // Inner glowing gullet visible when jaws open wide!
  if (!flash) {
    ctx.fillStyle = '#9F1239';
    ctx.beginPath();
    ctx.ellipse(24, -0.5, 8.5, 10 + chompPhase * 4.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FB7185';
    ctx.beginPath();
    ctx.ellipse(25.5, -0.5, 5, 6.5 + chompPhase * 2.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Upper Hinged Flytrap Jaw Lobe
  ctx.save();
  ctx.translate(18, -4.5);
  ctx.rotate(-jawAngle);
  ctx.fillStyle = dLv >= 5 && !flash ? '#FACC15' : jade;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(9, -11, 20, -4);
  ctx.quadraticCurveTo(13, 3, 0, 2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  if (!flash) {
    ctx.fillStyle = crimson;
    ctx.beginPath();
    ctx.moveTo(3, 0.5);
    ctx.quadraticCurveTo(11, -5.5, 17, -2.5);
    ctx.quadraticCurveTo(11, 2, 3, 1.5);
    ctx.closePath();
    ctx.fill();
  }
  // Upper interlocking fangs pointing down-forward
  ctx.fillStyle = dLv >= 5 && !flash ? '#FEF08A' : toothCol;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.25;
  for (let f = 0; f < 3; f++) {
    const fx = 6 + f * 4.8;
    const fy = -1.2 - f * 0.6;
    ctx.beginPath();
    ctx.moveTo(fx - 1.6, fy);
    ctx.lineTo(fx + 1.8, fy + 5.8 + dLv * 0.5);
    ctx.lineTo(fx + 2.2, fy - 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();

  // Lower Hinged Flytrap Jaw Lobe
  ctx.save();
  ctx.translate(18, 4.2);
  ctx.rotate(jawAngle);
  ctx.fillStyle = dLv >= 5 && !flash ? '#FACC15' : jadeMid;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(9, 10.5, 19.5, 3.5);
  ctx.quadraticCurveTo(13, -3, 0, -2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  if (!flash) {
    ctx.fillStyle = crimsonDark;
    ctx.beginPath();
    ctx.moveTo(3, -0.5);
    ctx.quadraticCurveTo(11, 5.2, 16.5, 2.2);
    ctx.quadraticCurveTo(11, -2, 3, -1.5);
    ctx.closePath();
    ctx.fill();
  }
  // Lower interlocking fangs pointing up-forward
  ctx.fillStyle = dLv >= 5 && !flash ? '#FEF08A' : toothCol;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.25;
  for (let f = 0; f < 3; f++) {
    const fx = 6 + f * 4.8;
    const fy = 1.2 + f * 0.5;
    ctx.beginPath();
    ctx.moveTo(fx - 1.6, fy);
    ctx.lineTo(fx + 1.8, fy - 5.6 - dLv * 0.5);
    ctx.lineTo(fx + 2.2, fy + 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();

  // 16. Brass Spinner Hub + 4-Blade Motion-Blurred Propeller + Muzzle Flash Starburst
  ctx.fillStyle = secretLv5Id ? '#FACC15' : brass;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(31.5, -0.5, 5.2, 4.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  if (!flash) {
    ctx.fillStyle = brassHi;
    ctx.beginPath();
    ctx.arc(32.2, -1.8, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Spinning 4-blade motion blur disc
  const propH = 18 + Math.abs(Math.cos(time * 54)) * 9;
  ctx.save();
  ctx.translate(36.5, -0.5);
  ctx.fillStyle = 'rgba(248, 250, 252, 0.22)';
  ctx.beginPath();
  ctx.ellipse(0, 0, 4.8, propH, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(248, 250, 252, 0.88)';
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(0, -propH);
  ctx.lineTo(0, propH);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(250, 204, 21, 0.72)';
  ctx.lineWidth = 1.8;
  const subH = 10 + Math.abs(Math.sin(time * 54)) * 11;
  ctx.beginPath();
  ctx.moveTo(-1.5, -subH);
  ctx.lineTo(1.5, subH);
  ctx.stroke();
  ctx.restore();

  // Muzzle starburst flash during recoil
  if (heroRecoil > 0.25 && !flash) {
    const fScale = heroRecoil * 1.15;
    ctx.save();
    ctx.translate(40, -0.5);
    ctx.scale(fScale, fScale);
    ctx.fillStyle = '#FEF9C3';
    ctx.strokeStyle = priAccent;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    for (let s = 0; s < 8; s++) {
      const a = (s / 8) * Math.PI * 2;
      const rad = s % 2 === 0 ? 12 : 4.5;
      if (s === 0) ctx.moveTo(Math.cos(a) * rad, Math.sin(a) * rad);
      else ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // 17. Unlockable Species Biological Morphs
  if (sarLv > 0) {
    const podN = sarLv >= 3 ? 2 : 1;
    for (let k = 0; k < podN; k++) {
      ctx.fillStyle = flash ? '#FFFFFF' : config.species.sarracenia.accentColor;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.9;
      ctx.beginPath();
      ctx.moveTo(-10, -14 + k * 25);
      ctx.lineTo(18 + sarLv * 1.5, -11.5 + k * 25);
      ctx.lineTo(22 + sarLv * 1.5, -16 + k * 25);
      ctx.lineTo(-12, -17 + k * 25);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }

  if (pinLv > 0) {
    ctx.fillStyle = flash ? '#FFFFFF' : config.species.pinguicula.accentColor;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.8;
    const cLen = 10 + pinLv * 2.5;
    ctx.beginPath();
    ctx.moveTo(14, upperWingY + 1);
    ctx.lineTo(18 + cLen, upperWingY - 6 - pinLv);
    ctx.lineTo(22, upperWingY + 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  if (helLv > 0) {
    ctx.fillStyle = flash ? '#FFFFFF' : config.species.heliamphora.accentColor;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.8;
    for (let p = 0; p < Math.min(3, helLv); p++) {
      ctx.beginPath();
      ctx.moveTo(-13, -10 - p * 3);
      ctx.quadraticCurveTo(-27 - helLv * 2, -23 - p * 5, -5, -15 - p * 3);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }

  if (cepLv > 0) {
    ctx.fillStyle = flash ? '#FFFFFF' : config.species.cephalotus.accentColor;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(4, 16, 9.5 + cepLv, 5.8 + cepLv * 0.6, 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#F43F5E';
    ctx.beginPath();
    ctx.arc(12 + cepLv, 17, 2.8, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

// ============================================================================
// HIGH-DETAIL ANIMATED PETS WITH ARTIFICIAL FLIGHT CONTRAPTIONS
// (Sapo Batricio on Winged Lily-Pad Glider · Roy with Jetpack + Balloon · Sicario on Twin-Thruster Rocket Sled)
// ============================================================================

function drawMafiaCatSprite(
  ctx: CanvasRenderingContext2D,
  coatColor: string,
  stripeColor: string,
  hatBand: string,
  time: number,
  scale = 1,
  withShades = false
) {
  ctx.save();
  ctx.scale(scale, scale);

  const isBlinking = Math.sin(time * 1.45) > 0.965;
  const earTwitch = Math.sin(time * 9.5) > 0.85 ? 0.18 : 0;

  // ARTIFICIAL FLIGHT RIG: Twin-Thruster Pinstripe Gangster Rocket Sled!
  const jetLen = 11 + Math.sin(time * 46) * 4;
  for (const jy of [7.5, 13.5]) {
    ctx.fillStyle = '#4ADE80';
    ctx.beginPath();
    ctx.moveTo(-15, jy - 2.4);
    ctx.lineTo(-15 - jetLen, jy);
    ctx.lineTo(-15, jy + 2.4);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#FEF9C3';
    ctx.beginPath();
    ctx.moveTo(-15, jy - 1.1);
    ctx.lineTo(-15 - jetLen * 0.55, jy);
    ctx.lineTo(-15, jy + 1.1);
    ctx.closePath();
    ctx.fill();
  }

  // Brass rocket exhaust nozzles + tail fin
  ctx.fillStyle = '#D97706';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.6;
  ctx.fillRect(-16.5, 5.5, 4.5, 4);
  ctx.strokeRect(-16.5, 5.5, 4.5, 4);
  ctx.fillRect(-16.5, 11.5, 4.5, 4);
  ctx.strokeRect(-16.5, 11.5, 4.5, 4);

  // Sleek dark pinstripe rocket sled deck
  ctx.fillStyle = '#0F172A';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(-14, 7.5);
  ctx.lineTo(13, 6.5);
  ctx.quadraticCurveTo(21, 10, 14, 14.5);
  ctx.lineTo(-14, 14.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Pinstripe trim + brass winglet
  ctx.strokeStyle = hatBand;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-11, 10.8);
  ctx.lineTo(14, 10.2);
  ctx.stroke();

  // Animated swishing striped tabby tail
  const tailWag = Math.sin(time * 11) * 5;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-9, 3.5);
  ctx.quadraticCurveTo(-19, -2 + tailWag * 0.4, -15, -10.5 + tailWag);
  ctx.stroke();
  ctx.strokeStyle = coatColor;
  ctx.lineWidth = 3.4;
  ctx.beginPath();
  ctx.moveTo(-9, 3.5);
  ctx.quadraticCurveTo(-19, -2 + tailWag * 0.4, -15, -10.5 + tailWag);
  ctx.stroke();

  // Gray tabby body + cel highlight + gangster trench coat
  ctx.fillStyle = coatColor;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.1;
  ctx.beginPath();
  ctx.ellipse(-1, 2.5, 10.8, 7.4, -0.06, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Tabby stripes across back
  ctx.strokeStyle = stripeColor;
  ctx.lineWidth = 2.1;
  for (const sx of [-6, -2, 2]) {
    ctx.beginPath();
    ctx.moveTo(sx, -3.2);
    ctx.lineTo(sx - 1.6, 4.2);
    ctx.stroke();
  }

  // Mafia dark lapel + golden tie pin
  ctx.fillStyle = '#0F172A';
  ctx.beginPath();
  ctx.moveTo(-5.5, 3);
  ctx.lineTo(7.5, 3);
  ctx.lineTo(5.5, 8.5);
  ctx.lineTo(-4.5, 8.5);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = hatBand;
  ctx.fillRect(0.8, 4, 2, 3.8);

  // Twitching pointed tabby ears with pink inner triangles
  const earCoords: [number, number, number, number][] = [
    [-6, -9, -1, -earTwitch],
    [2, 5.5, 8.5, earTwitch],
  ];
  for (const [ex1, ex2, ex3, rot] of earCoords) {
    ctx.save();
    ctx.rotate(rot);
    ctx.fillStyle = coatColor;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.9;
    ctx.beginPath();
    ctx.moveTo(ex1, -6);
    ctx.lineTo(ex2, -16.5);
    ctx.lineTo(ex3, -7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#FDA4AF';
    ctx.beginPath();
    ctx.moveTo(ex1 + 1.5, -7.2);
    ctx.lineTo(ex2, -13.5);
    ctx.lineTo(ex3 - 1.4, -7.8);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // Gray tabby head + cel cheek fluff
  ctx.fillStyle = coatColor;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.1;
  ctx.beginPath();
  ctx.ellipse(2, -4, 9.6, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Tabby forehead "M" & cheek whiskers
  ctx.strokeStyle = stripeColor;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-4, -5);
  ctx.lineTo(-1, -5);
  ctx.moveTo(-4, -2);
  ctx.lineTo(-1, -2.5);
  ctx.moveTo(0.8, -10.2);
  ctx.lineTo(2.4, -7.6);
  ctx.lineTo(4, -10.2);
  ctx.stroke();

  // Vivid Emerald Green Eyes (#22C55E) with periodic blink — or Mafia Shades for squad
  if (withShades) {
    ctx.fillStyle = '#090D16';
    ctx.strokeStyle = '#4ADE80';
    ctx.lineWidth = 1.2;
    ctx.fillRect(-1.5, -7, 10.8, 3.8);
    ctx.strokeRect(-1.5, -7, 10.8, 3.8);
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.fillRect(0.2, -6.3, 3, 1.1);
  } else if (isBlinking) {
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-1.2, -4.6);
    ctx.lineTo(3, -4.6);
    ctx.moveTo(4.6, -4.6);
    ctx.lineTo(8.8, -4.6);
    ctx.stroke();
  } else {
    for (const ex of [0.8, 6.8]) {
      ctx.fillStyle = '#22C55E';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.arc(ex, -4.6, 2.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#052E16';
      ctx.fillRect(ex - 0.5, -6.2, 1.0, 3.1);
      ctx.fillStyle = '#DCFCE7';
      ctx.beginPath();
      ctx.arc(ex - 0.9, -5.6, 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Smug nose & feline smirk
  ctx.fillStyle = '#334155';
  ctx.beginPath();
  ctx.arc(4.2, -2, 1.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(2, -0.3);
  ctx.quadraticCurveTo(4.6, 1.1, 7.4, -0.7);
  ctx.stroke();

  // Tilted Mafia Fedora Hat with Fluttering Ribbon Tail
  ctx.save();
  ctx.translate(1.5, -10.8);
  ctx.rotate(-0.14);
  ctx.fillStyle = '#1E293B';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.ellipse(0, 0.5, 11.8, 2.9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-6.8, 0);
  ctx.lineTo(-4.8, -6.8);
  ctx.lineTo(0, -5.4);
  ctx.lineTo(4.8, -6.8);
  ctx.lineTo(6.8, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = hatBand;
  ctx.fillRect(-6.4, -2.4, 12.8, 2.2);
  // Fluttering hat ribbon tail
  ctx.strokeStyle = hatBand;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-6.4, -1.3);
  ctx.quadraticCurveTo(-11, -2 + Math.sin(time * 22) * 2.5, -14, -0.5 + Math.sin(time * 22) * 3.2);
  ctx.stroke();
  ctx.restore();

  // Sicario & Mafia Gatuna Pistol held forward in paw!
  ctx.save();
  ctx.translate(11.5, 4.5);
  // Pistol grip
  ctx.fillStyle = '#334155';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.roundRect(-2.5, 1.5, 4.2, 6.5, 1.2);
  ctx.fill();
  ctx.stroke();
  // Pistol steel slide & barrel
  ctx.fillStyle = '#CBD5E1';
  ctx.beginPath();
  ctx.roundRect(-2.2, -2.2, 13.8, 4.6, 1.4);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#475569';
  ctx.fillRect(-1.2, 0.2, 11.8, 1.6);
  ctx.restore();

  ctx.restore();
}

function drawMafiaGatunaSquad(ctx: CanvasRenderingContext2D, state: RenderState) {
  const { mafiaCats, time } = state;
  if (!mafiaCats || mafiaCats.length === 0) return;

  for (const cat of mafiaCats) {
    const fadeIn = Math.min(1, (cat.maxLife - cat.life) / 0.25);
    const fadeOut = Math.min(1, cat.life / 0.4);
    const alpha = Math.max(0, Math.min(fadeIn, fadeOut));

    ctx.save();
    ctx.globalAlpha = alpha;

    // Pistol gunshot tracer flash when firing / intercepting bullets
    if (cat.slashTimer > 0) {
      ctx.save();
      ctx.strokeStyle = '#FDE047';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(cat.x + 21, cat.y + 3);
      ctx.lineTo(cat.slashX, cat.slashY);
      ctx.stroke();
      ctx.fillStyle = '#FEF9C3';
      ctx.beginPath();
      ctx.arc(cat.x + 22, cat.y + 3, 6.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.translate(cat.x, cat.y);
    const tilt = Math.max(-0.26, Math.min(0.26, cat.vy / 850));
    ctx.rotate(tilt);

    const ratio = Math.max(0, Math.min(1, cat.life / Math.max(0.1, cat.maxLife)));
    ctx.strokeStyle = 'rgba(74, 222, 128, 0.55)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 22, -Math.PI / 2, -Math.PI / 2 + ratio * Math.PI * 2);
    ctx.stroke();

    drawMafiaCatSprite(ctx, cat.coatColor, cat.stripeColor, cat.hatBand, time + cat.bobSeed, 0.94, true);
    ctx.restore();
  }
}

function drawPoisonFrogsRain(ctx: CanvasRenderingContext2D, state: RenderState) {
  const { poisonFrogs, time } = state;
  if (!poisonFrogs || poisonFrogs.length === 0) return;

  for (const pf of poisonFrogs) {
    ctx.save();
    ctx.translate(pf.x, pf.y);
    ctx.rotate(pf.rot);

    // Trailing neon venom droplets
    ctx.fillStyle = 'rgba(163, 230, 53, 0.65)';
    ctx.beginPath();
    ctx.arc(-4, -14, 3.2, 0, Math.PI * 2);
    ctx.arc(4, -20, 2.2, 0, Math.PI * 2);
    ctx.fill();

    // Kicking frog legs
    ctx.fillStyle = pf.color;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.7;
    const kick = Math.sin(time * 22 + pf.id) * 3;
    ctx.beginPath();
    ctx.ellipse(-9, -6 + kick * 0.4, 4.5, 7, -0.45, 0, Math.PI * 2);
    ctx.ellipse(9, -6 - kick * 0.4, 4.5, 7, 0.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Poisonous dart-frog body
    ctx.fillStyle = pf.color;
    ctx.beginPath();
    ctx.ellipse(0, 0, pf.radius * 0.78, pf.radius * 0.9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Toxic bright spots
    ctx.fillStyle = pf.spotColor;
    ctx.beginPath();
    ctx.arc(-4.5, -2, 2.6, 0, Math.PI * 2);
    ctx.arc(4.8, 1.5, 2.4, 0, Math.PI * 2);
    ctx.arc(0, -6, 2.1, 0, Math.PI * 2);
    ctx.fill();

    // Female frog eyes + cute eyelashes & tiny magenta bow
    ctx.fillStyle = '#FEF08A';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.arc(-5, 6, 3.2, 0, Math.PI * 2);
    ctx.arc(5, 6, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.arc(-5, 6.5, 1.4, 0, Math.PI * 2);
    ctx.arc(5, 6.5, 1.4, 0, Math.PI * 2);
    ctx.fill();

    // Little pink bow on head
    ctx.fillStyle = '#F472B6';
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.lineTo(-5, -13);
    ctx.lineTo(-4, -7);
    ctx.closePath();
    ctx.moveTo(0, -10);
    ctx.lineTo(5, -13);
    ctx.lineTo(4, -7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }
}

function drawPalitoLoveWave(ctx: CanvasRenderingContext2D, state: RenderState) {
  if (state.palitoLoveTimer <= 0) return;
  const alpha = Math.min(1, state.palitoLoveTimer * 1.6);
  const r = state.palitoLoveRadius;
  ctx.save();
  ctx.globalAlpha = alpha;

  // Concentric rosy-gold heartwave rings
  ctx.strokeStyle = '#EC4899';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.arc(state.frog.x, state.frog.y, r, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = '#FDE047';
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.arc(state.frog.x, state.frog.y, Math.max(12, r - 18), 0, Math.PI * 2);
  ctx.stroke();

  // Floating hearts along the shockwave ring
  const count = 12;
  for (let i = 0; i < count; i++) {
    const ang = (i / count) * Math.PI * 2 + state.time * 1.8;
    const hx = state.frog.x + Math.cos(ang) * r;
    const hy = state.frog.y + Math.sin(ang) * r;
    ctx.save();
    ctx.translate(hx, hy);
    ctx.fillStyle = i % 2 === 0 ? '#F472B6' : '#FB7185';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(0, 5);
    ctx.bezierCurveTo(-8, -2, -6, -9, 0, -4);
    ctx.bezierCurveTo(6, -9, 8, -2, 0, 5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

function drawInfernalesRiders(ctx: CanvasRenderingContext2D, state: RenderState) {
  const { infernalesRiders, sapucaiCryTimer, time, width } = state;

  // Soaring long Argentine "¡SAPUCAAAAAAIIII!!" sound banner across top-left while crying!
  if (sapucaiCryTimer > 0) {
    const alpha = Math.min(1, sapucaiCryTimer * 1.4);
    ctx.save();
    ctx.globalAlpha = alpha;
    const waveY = 114 + Math.sin(time * 14) * 5;
    ctx.font = '900 26px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.strokeStyle = '#090D16';
    ctx.lineWidth = 7;
    const txt = '¡SAPUCAAAAAAAAIIIIII!!';
    ctx.strokeText(txt, width * 0.5, waveY);
    ctx.fillStyle = '#FACC15';
    ctx.fillText(txt, width * 0.5, waveY);
    ctx.restore();
  }

  if (!infernalesRiders || infernalesRiders.length === 0) return;

  for (const r of infernalesRiders) {
    ctx.save();
    ctx.translate(r.x, r.y);
    const jumpPitch = Math.max(-0.55, Math.min(0.45, Math.atan2(r.vy, Math.max(120, r.vx)) * 0.65));
    ctx.rotate(jumpPitch);

    const stride = Math.sin(time * 22 + r.gallopPhase);

    // Galloping Criollo Horse legs
    ctx.strokeStyle = INK;
    ctx.lineWidth = 6.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    // Front legs leaping forward
    ctx.moveTo(14, 10);
    ctx.lineTo(24 + stride * 8, 22 - stride * 5);
    ctx.moveTo(10, 11);
    ctx.lineTo(18 - stride * 7, 24 + stride * 4);
    // Hind legs kicking back
    ctx.moveTo(-14, 10);
    ctx.lineTo(-26 - stride * 8, 22 + stride * 5);
    ctx.moveTo(-10, 11);
    ctx.lineTo(-20 + stride * 7, 23 - stride * 4);
    ctx.stroke();

    ctx.strokeStyle = r.horseColor;
    ctx.lineWidth = 3.6;
    ctx.stroke();

    // Flowing horse tail
    ctx.strokeStyle = '#1C1917';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(-20, 4);
    ctx.quadraticCurveTo(-34, 2 + stride * 4, -40, 12);
    ctx.stroke();

    // Muscular Criollo horse torso & arched neck + head
    ctx.fillStyle = r.horseColor;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.ellipse(0, 6, 22, 11.5, -0.05, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(14, 2);
    ctx.lineTo(24, -13);
    ctx.lineTo(35, -7);
    ctx.lineTo(32, -1);
    ctx.lineTo(22, -2);
    ctx.lineTo(18, 9);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Horse white blaze & dark eye
    ctx.fillStyle = '#F8FAFC';
    ctx.beginPath();
    ctx.arc(28, -9, 2, 0, Math.PI * 2);
    ctx.fill();

    // Capybara Infernal Rider wearing Crimson Salta Poncho & Gaucho Hat!
    ctx.fillStyle = r.ponchoColor;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(-12, -12);
    ctx.lineTo(8, -12);
    ctx.lineTo(12, 5);
    ctx.lineTo(-18, 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Black poncho border stripe (Poncho Salteño de Güemes!)
    ctx.strokeStyle = '#111827';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(-16, 3.5);
    ctx.lineTo(10, 2.5);
    ctx.stroke();

    // Capybara head
    ctx.fillStyle = '#92400E';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-6, -24, 16, 12, 4.5);
    ctx.fill();
    ctx.stroke();
    // Capybara eye & nostrils
    ctx.fillStyle = INK;
    ctx.fillRect(3, -20, 3.2, 1.5);
    ctx.beginPath();
    ctx.arc(8, -16, 1, 0, Math.PI * 2);
    ctx.fill();

    // Sombrero de Gaucho
    ctx.fillStyle = '#451A03';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.ellipse(0, -24.5, 13, 2.8, -0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.roundRect(-6, -31.5, 12, 7.5, 2.5);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#38BDF8';
    ctx.fillRect(-5.8, -26.5, 11.6, 2);

    // LONG GAUCHO LANCE thrust forward with Argentine celeste-white-celeste pennant!
    ctx.strokeStyle = '#78350F';
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(-16, -6);
    ctx.lineTo(54, -14);
    ctx.stroke();
    // Gleaming steel spearhead
    ctx.fillStyle = '#F8FAFC';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(52, -17.5);
    ctx.lineTo(68, -15.5);
    ctx.lineTo(52, -10.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Fluttering Argentine lance pennant
    const flagWave = Math.sin(time * 24 + r.gallopPhase) * 3.5;
    ctx.fillStyle = '#38BDF8';
    ctx.beginPath();
    ctx.moveTo(50, -13);
    ctx.lineTo(35, -18 + flagWave);
    ctx.lineTo(36, -6 + flagWave);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#F8FAFC';
    ctx.fillRect(38, -13 + flagWave * 0.6, 10, 2.5);

    ctx.restore();
  }
}

function drawPetCompanion(ctx: CanvasRenderingContext2D, state: RenderState) {
  const { frog, time, petId, royScreamTimer, royScreamRadius, superSaiyanActive } = state;
  if (!frog.enabled) return;

  if (superSaiyanActive) {
    // Super Saiyan golden flame aura & spiky golden ki halo around active pet!
    ctx.save();
    ctx.translate(frog.x, frog.y);
    ctx.fillStyle = 'rgba(250, 204, 21, 0.34)';
    ctx.strokeStyle = '#FEF08A';
    ctx.lineWidth = 2;
    ctx.beginPath();
    const spikes = 12;
    for (let s = 0; s <= spikes; s++) {
      const ang = (s / spikes) * Math.PI * 2 - time * 4.5;
      const rad = (s % 2 === 0 ? 34 : 21) + Math.sin(time * 26 + s) * 3.5;
      const px = Math.cos(ang) * rad;
      const py = Math.sin(ang) * rad;
      if (s === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Small golden Super Saiyan spiky crest above pet
    ctx.fillStyle = '#FACC15';
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-7, -15);
    ctx.lineTo(-3, -27);
    ctx.lineTo(2, -18);
    ctx.lineTo(7, -28);
    ctx.lineTo(9, -15);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  if (petId === 'sicario') {
    // Sicario uses PISTOL & GUNSHOTS (no tongue/claw slashes!)
    const muzzle = frog.muzzleFlashTimer ?? 0;

    ctx.save();
    ctx.translate(frog.x, frog.y);
    const tilt = Math.max(-0.22, Math.min(0.22, frog.vy / 900));
    ctx.rotate(tilt);
    drawMafiaCatSprite(ctx, '#94A3B8', '#334155', '#E11D48', time, 1.08, false);

    // Crisp muzzle flash burst at pistol barrel tip
    if (muzzle > 0) {
      ctx.save();
      ctx.translate(26, 4.5);
      ctx.fillStyle = '#FDE047';
      ctx.strokeStyle = '#FB923C';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let s = 0; s < 8; s++) {
        const ang = (s / 8) * Math.PI * 2 + time * 12;
        const rad = s % 2 === 0 ? 11 : 4.5;
        if (s === 0) ctx.moveTo(Math.cos(ang) * rad, Math.sin(ang) * rad);
        else ctx.lineTo(Math.cos(ang) * rad, Math.sin(ang) * rad);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();
    return;
  }

  if (petId === 'palito') {
    // PALITO: Yellow striped tabby cat with Protective Shield defending the protagonist!
    const shieldFlare = (frog.shieldBlockTimer ?? 0) > 0;
    const shieldX = state.playerX + 36;
    const shieldY = state.playerY;

    // Protective golden-cyan arc shield guarding the protagonist!
    ctx.save();
    ctx.translate(shieldX, shieldY);
    const pulse = 1 + Math.sin(time * 9) * 0.04 + (shieldFlare ? 0.16 : 0);
    ctx.scale(pulse, pulse);
    ctx.strokeStyle = shieldFlare ? '#FEF08A' : 'rgba(250, 204, 21, 0.78)';
    ctx.lineWidth = shieldFlare ? 8 : 4.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(-6, 0, 34, -Math.PI * 0.44, Math.PI * 0.44);
    ctx.stroke();
    ctx.strokeStyle = shieldFlare ? '#F472B6' : 'rgba(56, 189, 248, 0.72)';
    ctx.lineWidth = shieldFlare ? 3.5 : 2;
    ctx.beginPath();
    ctx.arc(-2, 0, 38, -Math.PI * 0.36, Math.PI * 0.36);
    ctx.stroke();
    ctx.restore();

    // Draw Palito (Yellow Tabby Cat on Golden Heart Balloon + Jetpack)
    ctx.save();
    ctx.translate(frog.x, frog.y);
    const tilt = Math.max(-0.22, Math.min(0.22, frog.vy / 900));
    ctx.rotate(tilt);

    const sway = Math.sin(time * 4.8) * 2.5;
    // Tether + Heart-shaped Pink Aviator Balloon
    ctx.strokeStyle = '#FEF08A';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-2, -3);
    ctx.lineTo(-4 + sway * 0.6, -21);
    ctx.stroke();
    ctx.save();
    ctx.translate(-4 + sway, -28);
    ctx.fillStyle = '#F472B6';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(0, 9);
    ctx.bezierCurveTo(-12, 1, -11, -11, 0, -4);
    ctx.bezierCurveTo(11, -11, 12, 1, 0, 9);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Striped yellow tail
    const wag = Math.sin(time * 11) * 4.5;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-8, 4);
    ctx.quadraticCurveTo(-18, -1 + wag * 0.4, -15, -10 + wag);
    ctx.stroke();
    ctx.strokeStyle = '#FACC15';
    ctx.lineWidth = 3.5;
    ctx.stroke();

    // Yellow tabby body
    ctx.fillStyle = '#FACC15';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.1;
    ctx.beginPath();
    ctx.ellipse(0, 3.5, 10.6, 7.4, -0.05, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Tabby stripes on back
    ctx.strokeStyle = '#B45309';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-5, -1.5);
    ctx.lineTo(-3, 4);
    ctx.moveTo(-1, -2);
    ctx.lineTo(1, 3.8);
    ctx.stroke();

    // Pointy yellow ears
    for (const [x1, x2, x3] of [
      [-5.5, -9, -0.5],
      [2.5, 6, 8.8],
    ]) {
      ctx.fillStyle = '#FACC15';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.9;
      ctx.beginPath();
      ctx.moveTo(x1, -5.5);
      ctx.lineTo(x2, -16);
      ctx.lineTo(x3, -6.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#FDBA74';
      ctx.beginPath();
      ctx.moveTo(x1 + 1.5, -6.5);
      ctx.lineTo(x2, -13);
      ctx.lineTo(x3 - 1.5, -7.2);
      ctx.closePath();
      ctx.fill();
    }

    // Round yellow tabby head
    ctx.fillStyle = '#FACC15';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.1;
    ctx.beginPath();
    ctx.ellipse(2.5, -4, 9.6, 8.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Forehead tabby M stripes
    ctx.strokeStyle = '#B45309';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-1.5, -10.5);
    ctx.lineTo(0.8, -8.5);
    ctx.lineTo(2.5, -10.5);
    ctx.lineTo(4.2, -8.5);
    ctx.lineTo(6.5, -10.5);
    ctx.stroke();

    // Bright affectionate eyes
    ctx.fillStyle = '#FEF9C3';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.arc(0.5, -4.8, 2.7, 0, Math.PI * 2);
    ctx.arc(6.8, -4.8, 2.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#0F172A';
    ctx.beginPath();
    ctx.arc(0.8, -4.8, 1.35, 0, Math.PI * 2);
    ctx.arc(7.1, -4.8, 1.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(-0.1, -5.6, 0.7, 0, Math.PI * 2);
    ctx.arc(6.2, -5.6, 0.7, 0, Math.PI * 2);
    ctx.fill();

    // Pink nose & sweet ":3" smile
    ctx.fillStyle = '#FB7185';
    ctx.beginPath();
    ctx.arc(4, -2, 1.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(1.5, -0.4);
    ctx.quadraticCurveTo(4, 1.5, 6.8, -0.4);
    ctx.stroke();

    // Mini buckler shield held in front paw
    ctx.fillStyle = shieldFlare ? '#FEF08A' : '#38BDF8';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(10, -1);
    ctx.lineTo(17, 1.5);
    ctx.lineTo(15, 9.5);
    ctx.lineTo(10, 11);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();
    return;
  }

  if (petId === 'carpincho') {
    // CARPINCHO MATERO: Gaucho Hat + Steaming Mate + Esgrima Gaucha (Poncho Shield + Silver Facón)!
    const faconSlash = frog.faconSlashTimer ?? 0;
    const ponchoBlock = frog.ponchoBlockTimer ?? 0;

    // Sweeping extended silver facón slash arc (matches expanded melee reach!)
    if (faconSlash > 0) {
      const prog = Math.sin((faconSlash / 0.3) * Math.PI);
      ctx.save();
      ctx.translate(frog.x + 24, frog.y);
      ctx.strokeStyle = '#F8FAFC';
      ctx.lineWidth = 8.5 * prog + 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(0, 0, 108, -Math.PI * 0.44, Math.PI * 0.44);
      ctx.stroke();
      ctx.strokeStyle = '#38BDF8';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(8, 0, 122, -Math.PI * 0.38, Math.PI * 0.38);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(254, 240, 138, 0.72)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(14, 0, 136, -Math.PI * 0.28, Math.PI * 0.28);
      ctx.stroke();
      ctx.restore();
    }

    // Gaucho Poncho shield flare blocking bullets in front of pilot/Carpincho!
    if (ponchoBlock > 0) {
      ctx.save();
      ctx.translate(frog.x + 22, frog.y + 4);
      ctx.fillStyle = 'rgba(185, 28, 28, 0.85)';
      ctx.strokeStyle = '#FDE047';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(0, 0, 11, 28, 0.12, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    ctx.save();
    ctx.translate(frog.x, frog.y);
    const tilt = Math.max(-0.2, Math.min(0.2, frog.vy / 950));
    ctx.rotate(tilt);

    const sway = Math.sin(time * 4.2) * 2.2;
    // Argentine Celeste-White-Celeste Balloon lifting Carpincho Matero!
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-4, -3);
    ctx.lineTo(-6 + sway * 0.6, -24);
    ctx.stroke();
    ctx.save();
    ctx.translate(-6 + sway, -31);
    ctx.fillStyle = '#38BDF8';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.ellipse(0, 0, 9.5, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#F8FAFC';
    ctx.fillRect(-9, -3, 18, 6);
    ctx.fillStyle = '#FACC15';
    ctx.beginPath();
    ctx.arc(0, 0, 2.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Stout brown Capybara body + Salta Red Gaucho Poncho wrapped over off-arm!
    ctx.fillStyle = '#92400E';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.ellipse(-1, 4, 13.5, 9.2, -0.05, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Flowing red Salta poncho with black gaucho stripe wrapped across off-hand (gaucho fencing shield)
    ctx.fillStyle = '#B91C1C';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.9;
    ctx.beginPath();
    ctx.moveTo(-12, -2);
    ctx.lineTo(5, -2);
    ctx.lineTo(9, 12);
    ctx.lineTo(-15, 11 + Math.sin(time * 12) * 1.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#111827';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(-13, 8);
    ctx.lineTo(7, 8.5);
    ctx.stroke();

    // Iconic square-snout Capybara head
    ctx.fillStyle = '#92400E';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.1;
    ctx.beginPath();
    ctx.roundRect(-2, -11, 17, 12.5, 4.5);
    ctx.fill();
    ctx.stroke();
    // Lighter muzzle
    ctx.fillStyle = '#B45309';
    ctx.beginPath();
    ctx.roundRect(7, -7, 8, 8, 2.5);
    ctx.fill();
    // Chill half-lidded capybara eye & nostril
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.9;
    ctx.beginPath();
    ctx.moveTo(4, -7.2);
    ctx.lineTo(8.5, -7.2);
    ctx.stroke();
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.arc(12.2, -4.2, 1.1, 0, Math.PI * 2);
    ctx.fill();

    // Sombrero de Gaucho (wide brim + Argentine ribbon)
    ctx.fillStyle = '#451A03';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.9;
    ctx.beginPath();
    ctx.ellipse(4.5, -11.5, 13.5, 2.9, -0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.roundRect(-1.5, -18.8, 12, 7.6, 2.4);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#38BDF8';
    ctx.fillRect(-1.2, -13.6, 11.4, 2);

    // Steaming Mate Gourd + Silver Bombilla in front
    ctx.fillStyle = '#15803D';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(10.5, 7.5, 4.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(11.5, 4.2);
    ctx.lineTo(14.5, -0.5);
    ctx.stroke();
    // Rising mate steam wisp
    ctx.strokeStyle = 'rgba(248, 250, 252, 0.72)';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(10, 2);
    ctx.quadraticCurveTo(8 + Math.sin(time * 9) * 2, -2, 11, -5);
    ctx.stroke();

    // Gleaming Silver Facón Dagger held ready!
    ctx.save();
    ctx.translate(13, 1.5);
    ctx.rotate(faconSlash > 0 ? -0.9 + (1 - faconSlash / 0.3) * 1.9 : -0.25);
    ctx.fillStyle = '#E2E8F0';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -1.5);
    ctx.lineTo(14, 0);
    ctx.lineTo(0, 2.2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.restore();
    return;
  }

  if (petId === 'roy') {
    // Roy's Horrid Misbehaving Cat Scream Soundwave Shock-Cones ("¡MIAAAAAUUU!!")
    if (royScreamTimer > 0) {
      const alpha = Math.min(1, royScreamTimer * 2.1);
      ctx.save();
      ctx.globalAlpha = alpha;
      for (let ring = 0; ring < 3; ring++) {
        const r = Math.max(20, royScreamRadius * (1 - ring * 0.22));
        ctx.strokeStyle = ring === 0 ? '#FDE047' : ring === 1 ? '#FB7185' : '#FFFFFF';
        ctx.lineWidth = 5 - ring * 1.2;
        ctx.beginPath();
        const spikes = 22;
        for (let s = 0; s <= spikes; s++) {
          const ang = (s / spikes) * Math.PI * 2 + time * 8;
          const jag = s % 2 === 0 ? 18 : -10;
          const px = frog.x + Math.cos(ang) * (r + jag);
          const py = frog.y + Math.sin(ang) * (r + jag);
          if (s === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(253, 224, 71, 0.72)';
      ctx.lineWidth = 3.5;
      for (let ray = -2; ray <= 2; ray++) {
        ctx.beginPath();
        ctx.moveTo(frog.x + 14, frog.y);
        ctx.lineTo(frog.x + 14 + Math.cos(ray * 0.28) * royScreamRadius, frog.y + Math.sin(ray * 0.28) * royScreamRadius);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Roy close-range ANNOYING MEOW acoustic cone (NO tongue/paw slash!)
    const meowBurst = frog.meowBurstTimer ?? 0;
    if (meowBurst > 0) {
      const p = 1 - meowBurst / 0.28;
      ctx.save();
      ctx.translate(frog.x + 12, frog.y - 2);
      ctx.globalAlpha = Math.max(0, 1 - p * 0.85);
      for (let arc = 0; arc < 3; arc++) {
        const rad = 24 + p * 86 + arc * 18;
        ctx.strokeStyle = arc === 0 ? '#FDE047' : arc === 1 ? '#FB7185' : '#38BDF8';
        ctx.lineWidth = 4 - arc * 0.9;
        ctx.beginPath();
        ctx.arc(0, 0, rad, -Math.PI * 0.36, Math.PI * 0.36);
        ctx.stroke();
      }
      ctx.restore();
    }

    ctx.save();
    ctx.translate(frog.x, frog.y);
    const tilt = Math.max(-0.22, Math.min(0.22, frog.vy / 900));
    ctx.rotate(tilt);

    const isBlinking = royScreamTimer <= 0 && Math.sin(time * 1.35) > 0.965;
    const balloonSway = Math.sin(time * 4.5) * 2.4;

    // ARTIFICIAL FLIGHT RIG #1 FOR ROY: Striped Lifting Aviator Balloon tethered to harness!
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-4, -2);
    ctx.lineTo(-7 + balloonSway * 0.6, -21);
    ctx.moveTo(1, -2);
    ctx.lineTo(-2 + balloonSway * 0.6, -21);
    ctx.stroke();

    ctx.save();
    ctx.translate(-5 + balloonSway, -28);
    ctx.fillStyle = '#E11D48';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.9;
    ctx.beginPath();
    ctx.ellipse(0, 0, 9.5, 11.5, -0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Golden balloon stripe + specular highlight
    ctx.fillStyle = '#FACC15';
    ctx.beginPath();
    ctx.ellipse(0, 0, 4.2, 11, -0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath();
    ctx.ellipse(-3.8, -4.5, 2, 4, -0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // ARTIFICIAL FLIGHT RIG #2 FOR ROY: Brass Mini Aviator Jetpack with Twin Flames!
    const jetF = 9 + Math.sin(time * 42) * 3.5;
    ctx.fillStyle = '#FDE047';
    ctx.beginPath();
    ctx.moveTo(-14, 1);
    ctx.lineTo(-14 - jetF, 3.5);
    ctx.lineTo(-14, 6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#FB923C';
    ctx.beginPath();
    ctx.moveTo(-13, 6.5);
    ctx.lineTo(-13 - jetF * 0.85, 8.8);
    ctx.lineTo(-13, 11);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#D97706';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.roundRect(-15, -1, 7.5, 11, 3);
    ctx.fill();
    ctx.stroke();

    // Fluffy animated white tail
    const tailWag = Math.sin(time * 10.5) * 5.2;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 6.4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-8, 4);
    ctx.quadraticCurveTo(-18, -2 + tailWag * 0.4, -15, -10 + tailWag);
    ctx.stroke();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 3.8;
    ctx.beginPath();
    ctx.moveTo(-8, 4);
    ctx.quadraticCurveTo(-18, -2 + tailWag * 0.4, -15, -10 + tailWag);
    ctx.stroke();

    // Animated kicking cat paws dangling below harness
    const pawKick = Math.sin(time * 14) * 2.5;
    ctx.fillStyle = '#F8FAFC';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.ellipse(-4, 10 + pawKick * 0.5, 3.4, 2.4, 0.3, 0, Math.PI * 2);
    ctx.ellipse(5, 10 - pawKick * 0.5, 3.4, 2.4, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Fluffy white cat body + sky-blue aviator harness strap
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.ellipse(0, 3, 10.8, 7.6, -0.06, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Soft cel shadow along belly
    ctx.fillStyle = '#E2E8F0';
    ctx.beginPath();
    ctx.ellipse(-1, 6.2, 8.2, 3.2, -0.06, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#38BDF8';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(-6, -1);
    ctx.lineTo(4, 8.5);
    ctx.stroke();

    // Twitching pink-lined cat ears
    for (const [ex1, ex2, ex3] of [
      [-6, -9.5, -1],
      [2, 5.5, 8.5],
    ]) {
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(ex1, -5.5);
      ctx.lineTo(ex2, -16.5);
      ctx.lineTo(ex3, -6.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#FDA4AF';
      ctx.beginPath();
      ctx.moveTo(ex1 + 1.5, -6.5);
      ctx.lineTo(ex2, -13.2);
      ctx.lineTo(ex3 - 1.5, -7.2);
      ctx.closePath();
      ctx.fill();
    }

    // Round fluffy white cat head
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.ellipse(2.5, -4, 9.8, 8.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Iconic Heterochromia Eyes (Left Sky-Blue #38BDF8, Right Emerald-Green #22C55E!)
    if (isBlinking) {
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(-1.5, -5);
      ctx.lineTo(2.8, -5);
      ctx.moveTo(4.6, -5);
      ctx.lineTo(9, -5);
      ctx.stroke();
    } else {
      // Blue eye
      ctx.fillStyle = '#38BDF8';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(0.6, -5, 2.9, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(0.2, -6.6, 1.0, 3.2);
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(-0.4, -6, 0.9, 0, Math.PI * 2);
      ctx.fill();

      // Green eye
      ctx.fillStyle = '#22C55E';
      ctx.strokeStyle = INK;
      ctx.beginPath();
      ctx.arc(7, -5, 2.9, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(6.6, -6.6, 1.0, 3.2);
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(6.0, -6, 0.9, 0, Math.PI * 2);
      ctx.fill();
    }

    // Pink triangle nose
    ctx.fillStyle = '#FB7185';
    ctx.beginPath();
    ctx.arc(4.2, -2.2, 1.25, 0, Math.PI * 2);
    ctx.fill();

    // Expressive wide-open yowling mouth when screaming OR emitting annoying close-range meow
    if (royScreamTimer > 0 || (frog.meowBurstTimer ?? 0) > 0) {
      ctx.fillStyle = '#9F1239';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.ellipse(4.8, 1.5, 4.6, 3.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(2.6, -1.3, 1.3, 1.8);
      ctx.fillRect(6.0, -1.3, 1.3, 1.8);
    } else {
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(1.5, -0.4);
      ctx.quadraticCurveTo(4.2, 1.6, 7.2, -0.5);
      ctx.stroke();
    }

    ctx.restore();
    return;
  }

  // ---- SAPO BATRICIO (High-Detail Dappled Argentine Toad on a Winged Lily-Pad Glider!) ----
  if (frog.tongueTimer > 0) {
    const prog = Math.sin((frog.tongueTimer / 0.22) * Math.PI);
    const tipX = frog.x + 11 + (frog.tongueTargetX - (frog.x + 11)) * prog;
    const tipY = frog.y - 1 + (frog.tongueTargetY - (frog.y - 1)) * prog;

    ctx.save();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 9.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(frog.x + 11, frog.y - 1);
    ctx.lineTo(tipX, tipY);
    ctx.stroke();

    ctx.strokeStyle = '#FB7185';
    ctx.lineWidth = 5.6;
    ctx.beginPath();
    ctx.moveTo(frog.x + 11, frog.y - 1);
    ctx.lineTo(tipX, tipY);
    ctx.stroke();

    ctx.fillStyle = '#F43F5E';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(tipX, tipY, 6.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  ctx.save();
  ctx.translate(frog.x, frog.y);
  const tilt = Math.max(-0.24, Math.min(0.24, frog.vy / 850));
  ctx.rotate(tilt);

  const isBlinking = frog.tongueTimer <= 0 && Math.sin(time * 1.25) > 0.965;
  const wingFlap = Math.sin(time * 18) * 0.24;
  const breathe = Math.sin(time * 5.2) * 0.9;

  // ARTIFICIAL FLIGHT RIG FOR BATRICIO: Botanical Winged Lily-Pad Glider + Rear Spinning Leaf Propeller!
  // Rear bamboo shaft & spinning wooden-leaf propeller
  ctx.strokeStyle = '#92400E';
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(-16, 9);
  ctx.lineTo(-24, 9);
  ctx.stroke();

  const propSpin = 8 + Math.abs(Math.cos(time * 44)) * 7;
  ctx.strokeStyle = '#D9F99D';
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(-24.5, 9 - propSpin);
  ctx.lineTo(-24.5, 9 + propSpin);
  ctx.stroke();
  ctx.fillStyle = '#F59E0B';
  ctx.beginPath();
  ctx.arc(-24.5, 9, 2.4, 0, Math.PI * 2);
  ctx.fill();

  // Far botanical glider leaf-wing
  ctx.save();
  ctx.translate(-3, 7);
  ctx.rotate(-0.42 + wingFlap);
  ctx.fillStyle = '#22C55E';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.9;
  ctx.beginPath();
  ctx.ellipse(-2, -10, 5.5, 13, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Sturdy veined Lily-Pad Glider Deck
  ctx.fillStyle = '#15803D';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.3;
  ctx.beginPath();
  ctx.ellipse(0, 10, 21, 6.8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = '#4ADE80';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(-14, 10);
  ctx.lineTo(14, 10);
  ctx.stroke();

  // Kicking webbed toad hind leg & foot
  const kick = Math.sin(time * 10) * 2.2;
  ctx.fillStyle = '#365314';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(-8.5, 5.2 + kick * 0.3, 7.6, 5.4, -0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Stout cel-shaded olive-emerald toad torso
  ctx.fillStyle = '#4D7C0F';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.3;
  ctx.beginPath();
  ctx.ellipse(0, 0.5, 14, 10 + breathe * 0.4, -0.08, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Upper cel highlight + characteristic dappled warty toad spots
  ctx.fillStyle = '#84CC16';
  ctx.beginPath();
  ctx.ellipse(-1, -4.5, 8.5, 3.2, -0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#365314';
  ctx.beginPath();
  ctx.arc(-6.5, -3.5, 2.5, 0, Math.PI * 2);
  ctx.arc(-1.2, -5.4, 2.1, 0, Math.PI * 2);
  ctx.arc(-4.2, 1.8, 2.0, 0, Math.PI * 2);
  ctx.fill();

  // Breathing & puffing golden-cream toad vocal throat sac!
  const sacR = 5.4 + breathe * 0.75 + frog.throatPuff * 5.6;
  ctx.fillStyle = frog.throatPuff > 0 ? '#FDE047' : '#FEF3C7';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.7;
  ctx.beginPath();
  ctx.ellipse(7, 4.2, sacR + 1.8, sacR, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Tiny Argentine celeste aviator scarf around Batricio's neck!
  ctx.strokeStyle = '#74ACDF';
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(2, 4);
  ctx.quadraticCurveTo(-8, 6, -15, 2 + Math.sin(time * 20) * 2.5);
  ctx.stroke();

  // Prominent Toad Brow Ridge + Golden-Amber Eye with Horizontal Pupil & Natural Blink!
  ctx.fillStyle = '#4D7C0F';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.1;
  ctx.beginPath();
  ctx.arc(5.2, -7.5, 5.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  if (isBlinking) {
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(2.4, -7.2);
    ctx.lineTo(8.8, -7.2);
    ctx.stroke();
  } else {
    ctx.fillStyle = '#F59E0B';
    ctx.beginPath();
    ctx.arc(6.0, -7.2, 3.5, 0, Math.PI * 2);
    ctx.fill();
    // Horizontal toad pupil + white glint
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(4.3, -8.1, 3.6, 1.6);
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(4.8, -8.8, 0.9, 0, Math.PI * 2);
    ctx.fill();
  }

  // Batricio singing vocal puff & musical notes during "Llamado de Apareamiento"!
  const isSinging = (frog.singingTimer ?? 0) > 0;
  if (isSinging) {
    const singPulse = Math.abs(Math.sin(time * 11));
    ctx.fillStyle = '#FACC15';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.9;
    ctx.beginPath();
    ctx.ellipse(9.5, 5.2, 7.5 + singPulse * 4.5, 6.2 + singPulse * 3.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Floating green-gold croak musical notes
    ctx.font = '900 13px Outfit, sans-serif';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.8;
    const ny1 = -16 - ((time * 28) % 22);
    const ny2 = -12 - (((time + 0.4) * 28) % 22);
    ctx.strokeText('♪', 16, ny1);
    ctx.fillStyle = '#A3E635';
    ctx.fillText('♪', 16, ny1);
    ctx.strokeText('♫', 24, ny2);
    ctx.fillStyle = '#FDE047';
    ctx.fillText('♫', 24, ny2);
  }

  // Expressive brow ridge & broad toad smile (or open singing mouth!)
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.1;
  ctx.beginPath();
  ctx.moveTo(1.2, -11.2);
  ctx.lineTo(9.8, -10.4);
  ctx.stroke();

  if (isSinging) {
    ctx.fillStyle = '#9F1239';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.ellipse(10.5, -0.5, 4.4, 3.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.lineWidth = 1.9;
    ctx.beginPath();
    ctx.moveTo(4, -0.4);
    ctx.quadraticCurveTo(10, 1.8, 14, -1.5);
    ctx.stroke();
  }

  // Tongue-ready pink glint badge
  if (frog.tongueCooldown <= 0) {
    ctx.fillStyle = '#FB7185';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(-9.5, -8.8, 3.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore();
}

// ============================================================================
// COMPLETELY REWORKED PER-LEVEL ENEMY DESIGNS, SPRITES, STYLES & TEXTURES
// (5 Distinct Level Artistic Languages + Subtle British Crown Regalia)
// ============================================================================

function drawSubtleCoronet(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  goldCol: string,
  gemCol: string,
  isFlash: boolean
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = isFlash ? '#FFFFFF' : goldCol;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-7, 2);
  ctx.lineTo(-8, -5);
  ctx.lineTo(-3, -1);
  ctx.lineTo(0, -8);
  ctx.lineTo(3, -1);
  ctx.lineTo(8, -5);
  ctx.lineTo(7, 2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  if (!isFlash) {
    ctx.fillStyle = gemCol;
    ctx.beginPath();
    ctx.arc(0, -1.5, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/**
 * Helper: draws exact Title-Screen translucent iridescent pink-purple-cyan veined insect wings!
 */
function drawTitleArtIridescentWings(
  ctx: CanvasRenderingContext2D,
  len: number,
  wid: number,
  time: number,
  phaseOffset: number,
  isFlash: boolean,
  tandemDouble = false
) {
  const flap = Math.sin(time * 54 + phaseOffset) * 0.34;
  const wingCount = tandemDouble ? 3 : 2;
  for (let w = 0; w < wingCount; w++) {
    ctx.save();
    const ox = -2 + w * (tandemDouble ? 7 : 5);
    const oy = -wid * 0.55;
    ctx.translate(ox, oy);
    const baseRot = -0.52 - w * 0.28 + flap * (w % 2 === 0 ? 1 : -0.78);
    ctx.rotate(baseRot);

    const wl = len * (w === 0 ? 1.12 : w === 1 ? 0.88 : 0.72);
    const ww = wid * (w === 0 ? 1.12 : 0.88);

    if (isFlash) {
      ctx.fillStyle = '#FFFFFF';
    } else {
      const grad = ctx.createLinearGradient(0, 0, wl, -ww);
      grad.addColorStop(0, 'rgba(244, 114, 182, 0.72)'); // Iridescent pink
      grad.addColorStop(0.5, 'rgba(168, 85, 247, 0.58)'); // Translucent violet-purple
      grad.addColorStop(1, 'rgba(56, 189, 248, 0.56)'); // Shimmering cyan tip
      ctx.fillStyle = grad;
    }

    ctx.strokeStyle = isFlash ? '#FFFFFF' : '#4C1D95';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(wl * 0.25, -ww * 1.4, wl * 0.85, -ww * 1.15, wl, -ww * 0.22);
    ctx.bezierCurveTo(wl * 0.78, ww * 0.42, wl * 0.3, ww * 0.35, 0, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    if (!isFlash) {
      // Branching insectoid wing veins + specular pink-cyan highlight
      ctx.strokeStyle = 'rgba(88, 28, 135, 0.72)';
      ctx.lineWidth = 1.15;
      ctx.beginPath();
      ctx.moveTo(2, -1);
      ctx.quadraticCurveTo(wl * 0.45, -ww * 0.55, wl * 0.92, -ww * 0.22);
      ctx.moveTo(wl * 0.28, -ww * 0.24);
      ctx.lineTo(wl * 0.52, -ww * 0.85);
      ctx.moveTo(wl * 0.48, -ww * 0.32);
      ctx.lineTo(wl * 0.74, -ww * 0.74);
      ctx.moveTo(wl * 0.36, -ww * 0.14);
      ctx.lineTo(wl * 0.62, ww * 0.12);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(wl * 0.14, -ww * 0.46);
      ctx.quadraticCurveTo(wl * 0.42, -ww * 0.95, wl * 0.75, -ww * 0.68);
      ctx.stroke();
    }
    ctx.restore();
  }
}

/**
 * Helper: draws 6 articulated dangling jointed insect legs beneath the body (exact Title-Screen look!)
 */
function drawSixJointedLegs(
  ctx: CanvasRenderingContext2D,
  r: number,
  time: number,
  phaseOffset: number,
  isFlash: boolean,
  color = '#1E293B'
) {
  ctx.save();
  ctx.strokeStyle = isFlash ? '#FFFFFF' : INK;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const legOffsets = [-0.42, -0.1, 0.22, -0.28, 0.06, 0.38];
  for (let i = 0; i < 6; i++) {
    const isFar = i >= 3;
    const ox = r * legOffsets[i];
    const oy = r * (isFar ? 0.34 : 0.48);
    const swing = Math.sin(time * 13 + phaseOffset + i * 1.15) * (r * 0.14);
    const kneeX = ox + (i % 3 === 0 ? -r * 0.18 : r * 0.16) + swing * 0.5;
    const kneeY = oy + r * (isFar ? 0.38 : 0.48);
    const footX = kneeX + (i % 3 === 0 ? -r * 0.16 : r * 0.22) + swing;
    const footY = kneeY + r * (isFar ? 0.3 : 0.38);

    ctx.lineWidth = Math.max(2.2, r * 0.13);
    ctx.strokeStyle = isFlash ? '#FFFFFF' : INK;
    ctx.beginPath();
    ctx.moveTo(ox, oy);
    ctx.lineTo(kneeX, kneeY);
    ctx.lineTo(footX, footY);
    ctx.stroke();

    if (!isFlash) {
      ctx.lineWidth = Math.max(1.2, r * 0.065);
      ctx.strokeStyle = isFar ? '#334155' : color;
      ctx.beginPath();
      ctx.moveTo(ox, oy);
      ctx.lineTo(kneeX, kneeY);
      ctx.lineTo(footX, footY);
      ctx.stroke();
    }
  }
  ctx.restore();
}

/**
 * Helper: Artificial Flight Rig (Lifting Balloon + Twin Side Rockets) for non-flying heavy beetles/tanks!
 */
function drawArtificialFlightBalloonAndRockets(
  ctx: CanvasRenderingContext2D,
  r: number,
  time: number,
  primaryColor: string,
  stripeColor: string,
  isFlash: boolean
) {
  const sway = Math.sin(time * 4.5) * 3.5;
  const balloonY = -r * 1.55;
  const bx = sway;
  const brX = Math.max(11, r * 0.62);
  const brY = Math.max(13, r * 0.72);

  // Tether cords from armored beetle shell up to balloon basket ring
  ctx.save();
  ctx.strokeStyle = isFlash ? '#FFFFFF' : '#CBD5E1';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-r * 0.35, -r * 0.52);
  ctx.lineTo(bx - brX * 0.38, balloonY + brY * 0.85);
  ctx.moveTo(r * 0.35, -r * 0.52);
  ctx.lineTo(bx + brX * 0.38, balloonY + brY * 0.85);
  ctx.stroke();

  // Striped hot-air lifting balloon
  ctx.fillStyle = isFlash ? '#FFFFFF' : primaryColor;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(bx, balloonY, brX, brY, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  if (!isFlash) {
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(bx, balloonY, brX, brY, 0, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = stripeColor;
    ctx.beginPath();
    ctx.ellipse(bx, balloonY, brX * 0.44, brY, 0, 0, Math.PI * 2);
    ctx.fill();
    // Balloon shine
    ctx.fillStyle = 'rgba(255, 255, 255, 0.38)';
    ctx.beginPath();
    ctx.ellipse(bx - brX * 0.42, balloonY - brY * 0.35, brX * 0.18, brY * 0.34, -0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // Re-stroke outline
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(bx, balloonY, brX, brY, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Twin side brass rocket boosters strapped to the flanks
  const flameLen = 10 + Math.sin(time * 42) * 4;
  for (const side of [-1, 1]) {
    const ry = side * r * 0.58;
    // Rocket flame plume
    if (!isFlash) {
      ctx.fillStyle = '#F97316';
      ctx.beginPath();
      ctx.moveTo(r * 0.72, ry - 3.5);
      ctx.lineTo(r * 0.72 + flameLen, ry);
      ctx.lineTo(r * 0.72, ry + 3.5);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#FEF08A';
      ctx.beginPath();
      ctx.moveTo(r * 0.72, ry - 1.8);
      ctx.lineTo(r * 0.72 + flameLen * 0.62, ry);
      ctx.lineTo(r * 0.72, ry + 1.8);
      ctx.closePath();
      ctx.fill();
    }
    // Cylindrical booster housing
    ctx.fillStyle = isFlash ? '#FFFFFF' : '#64748B';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.7;
    ctx.beginPath();
    ctx.roundRect(r * 0.08, ry - 4.5, r * 0.68, 9, 3);
    ctx.fill();
    ctx.stroke();
    if (!isFlash) {
      ctx.fillStyle = '#FACC15';
      ctx.fillRect(r * 0.25, ry - 3.6, 3.5, 7.2);
    }
  }
  ctx.restore();
}

/**
 * Draws level-specific wings/rotors so every level has a distinct silhouette & texture,
 * while Level 1 matches the EXACT translucent pink-purple-cyan iridescent veined wings from the title art!
 */
function drawLevelSpecificWings(
  ctx: CanvasRenderingContext2D,
  levelIndex: LevelNumber,
  len: number,
  wid: number,
  time: number,
  phaseOffset: number,
  isFlash: boolean,
  tandemDouble = false
) {
  if (levelIndex === 1) {
    drawTitleArtIridescentWings(ctx, len, wid, time, phaseOffset, isFlash, tandemDouble);
    return;
  }

  const flap = Math.sin(time * 48 + phaseOffset) * 0.36;

  if (levelIndex === 2) {
    // LEVEL 2 (SELVA MISIONERA): Translucent Emerald-Lime Veined Tropical Insect Wings
    const count = tandemDouble ? 3 : 2;
    for (let w = 0; w < count; w++) {
      ctx.save();
      ctx.translate(2 + w * 5, -wid * 0.65);
      ctx.rotate(-0.45 - w * 0.28 + flap * (w % 2 === 0 ? 1.1 : -0.9));
      const wl = len * (w === 0 ? 1.08 : 0.82);
      ctx.fillStyle = isFlash ? '#FFFFFF' : w === 0 ? 'rgba(52, 211, 153, 0.78)' : 'rgba(163, 230, 53, 0.72)';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(wl * 0.45, -wid * 1.5, wl, -wid * 0.42);
      ctx.quadraticCurveTo(wl * 0.55, wid * 0.42, 0, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      if (!isFlash) {
        ctx.strokeStyle = '#FEF08A';
        ctx.lineWidth = 1.25;
        ctx.beginPath();
        ctx.moveTo(3, -1);
        ctx.lineTo(wl * 0.85, -wid * 0.4);
        ctx.moveTo(wl * 0.35, -wid * 0.2);
        ctx.lineTo(wl * 0.52, -wid * 0.8);
        ctx.stroke();
      }
      ctx.restore();
    }
  } else if (levelIndex === 3) {
    // LEVEL 3 (BUENOS AIRES NOIR): Translucent Amber-Violet Vibrating Insect Wings + Urban Jet Pods
    for (let w = 0; w < 2; w++) {
      ctx.save();
      ctx.translate(2 + w * 5, -wid * 0.65);
      ctx.rotate(-0.48 - w * 0.28 + flap * (w === 0 ? 1.05 : -0.82));
      const wl = len * (w === 0 ? 1.05 : 0.8);
      ctx.fillStyle = isFlash ? '#FFFFFF' : w === 0 ? 'rgba(250, 204, 21, 0.52)' : 'rgba(232, 121, 249, 0.46)';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(wl * 0.3, -wid * 1.35, wl * 0.82, -wid * 1.05, wl, -wid * 0.2);
      ctx.bezierCurveTo(wl * 0.65, wid * 0.4, wl * 0.25, wid * 0.28, 0, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  } else if (levelIndex === 4) {
    // LEVEL 4 (AUTOPISTA Y PUERTO): Cyber-Veined Translucent Cyan-Magenta Insect Wings + Stealth Thrusters
    for (let w = 0; w < 2; w++) {
      ctx.save();
      ctx.translate(2 + w * 4, -wid * 0.58);
      ctx.rotate(-0.4 - w * 0.28 + flap * (w === 0 ? 0.9 : -0.7));
      const wl = len * (w === 0 ? 1.05 : 0.8);
      ctx.fillStyle = isFlash ? '#FFFFFF' : w === 0 ? 'rgba(34, 211, 238, 0.56)' : 'rgba(244, 63, 94, 0.46)';
      ctx.strokeStyle = isFlash ? '#FFFFFF' : '#0F172A';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(wl * 0.45, -wid * 1.3);
      ctx.lineTo(wl, -wid * 0.4);
      ctx.lineTo(wl * 0.55, wid * 0.22);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  } else {
    // LEVEL 5 (QUEBRADA DE HUMAHUACA): Sweeping Feathered Andean Condor-Gold Wings!
    for (let w = 0; w < 2; w++) {
      ctx.save();
      ctx.translate(3 + w * 5, -wid * 0.65);
      ctx.rotate(-0.42 - w * 0.26 + flap * (w === 0 ? 0.95 : -0.7));
      const wl = len * (w === 0 ? 1.15 : 0.86);
      ctx.fillStyle = isFlash ? '#FFFFFF' : w === 0 ? '#1C1917' : '#FACC15';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.9;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(wl * 0.42, -wid * 1.25);
      ctx.lineTo(wl, -wid * 0.96);
      ctx.lineTo(wl * 0.85, -wid * 0.52);
      ctx.lineTo(wl * 0.98, -wid * 0.22);
      ctx.lineTo(wl * 0.65, wid * 0.14);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      if (!isFlash) {
        ctx.strokeStyle = w === 0 ? '#FACC15' : '#DC2626';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(wl * 0.2, -wid * 0.48);
        ctx.lineTo(wl * 0.82, -wid * 0.7);
        ctx.stroke();
      }
      ctx.restore();
    }
  }
}

/**
 * Draws anatomical & level-unique carapace armor textures INSIDE the clipped insect body!
 */
function drawLevelCarapaceTexture(
  ctx: CanvasRenderingContext2D,
  levelIndex: LevelNumber,
  r: number,
  beatPulse: number,
  archetype?: SimEnemyState['archetype']
) {
  if (archetype === 'hornet') {
    // True Wasp/Hornet black & warning-gold abdomen bands!
    ctx.fillStyle = '#FACC15';
    for (let s = -1; s <= 2; s++) {
      ctx.fillRect(s * r * 0.34, -r, r * 0.15, r * 2);
    }
    return;
  }

  if (levelIndex === 1) {
    // EXACT TITLE-SCREEN ART: Dark metallic gunmetal-slate segmented chitin plates + subtle metallic sheen!
    ctx.fillStyle = '#475569';
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.34, r * 0.78, r * 0.24, -0.05, 0, Math.PI * 2);
    ctx.fill();

    // Ribbed insectoid abdomen segments
    ctx.strokeStyle = '#0B1120';
    ctx.lineWidth = 1.8;
    for (let s = 0; s < 3; s++) {
      const sx = r * (0.05 + s * 0.27);
      ctx.beginPath();
      ctx.arc(sx, 0, r * 0.68, -Math.PI * 0.42, Math.PI * 0.42);
      ctx.stroke();
    }
    // Subtle iridescent cyan-magenta edge rim light
    ctx.strokeStyle = 'rgba(192, 132, 252, 0.42)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-r * 0.4, -r * 0.48);
    ctx.quadraticCurveTo(r * 0.2, -r * 0.56, r * 0.72, -r * 0.26);
    ctx.stroke();
  } else if (levelIndex === 2) {
    // Level 2: Jungle rosettes + bioluminescent emerald/gold chitin sheen
    ctx.fillStyle = '#022C22';
    const spots: [number, number, number][] = [
      [-r * 0.12, -r * 0.24, r * 0.16],
      [r * 0.34, -r * 0.14, r * 0.19],
      [r * 0.16, r * 0.26, r * 0.15],
    ];
    for (const [sx, sy, sr] of spots) {
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FACC15';
      ctx.beginPath();
      ctx.arc(sx, sy, sr * (0.45 + beatPulse * 0.25), 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#022C22';
    }
  } else if (levelIndex === 3) {
    // Level 3: Striped bumblebee/noir yellow-black hazard bands
    ctx.fillStyle = '#FACC15';
    for (let s = -1; s <= 2; s++) {
      ctx.fillRect(s * r * 0.38, -r, r * 0.16, r * 2);
    }
  } else if (levelIndex === 4) {
    // Level 4: Carbon-fiber diagonal armored segments + cyan stealth chevron
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.26)';
    ctx.lineWidth = 1.1;
    for (let x = -r; x <= r; x += 6) {
      ctx.beginPath();
      ctx.moveTo(x, -r);
      ctx.lineTo(x + r, r);
      ctx.stroke();
    }
    ctx.strokeStyle = '#22D3EE';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(r * 0.2, -r * 0.38);
    ctx.lineTo(-r * 0.08, 0);
    ctx.lineTo(r * 0.2, r * 0.38);
    ctx.stroke();
  } else {
    // Level 5: Andean Aguayo crimson-sky-gold ceremonial carapace stripes
    ctx.fillStyle = '#DC2626';
    ctx.fillRect(-r * 0.08, -r, r * 0.26, r * 2);
    ctx.fillStyle = '#0EA5E9';
    ctx.fillRect(r * 0.18, -r, r * 0.14, r * 2);
    ctx.strokeStyle = '#FACC15';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(r * 0.1, -r * 0.34);
    ctx.lineTo(r * 0.4, 0);
    ctx.lineTo(r * 0.1, r * 0.34);
    ctx.lineTo(-r * 0.2, 0);
    ctx.closePath();
    ctx.stroke();
  }
}

function drawArthropodEnemy(
  ctx: CanvasRenderingContext2D,
  enemy: SimEnemyState,
  time: number,
  beatPulse: number,
  config: GameConfig,
  levelIndex: LevelNumber
) {
  const archCfg = config.enemies[enemy.archetype];
  const isFlash = enemy.hitFlashTimer > 0;
  const accent = isFlash ? '#FFFFFF' : archCfg.accentColor;

  // Level 1 uses EXACT Title-Screen palette: Dark Metallic Gunmetal-Slate + Glowing Neon-Green Compound Eyes!
  const levelBases: Record<LevelNumber, { body: string; gold: string; royal: string; eye: string; leg: string }> = {
    1: { body: '#1E293B', gold: '#F59E0B', royal: '#E11D48', eye: '#4ADE80', leg: '#334155' },
    2: { body: '#0F766E', gold: '#FACC15', royal: '#FB7185', eye: '#FEF08A', leg: '#115E59' },
    3: { body: '#1E1B4B', gold: '#FACC15', royal: '#E11D48', eye: '#E879F9', leg: '#312E81' },
    4: { body: '#27272A', gold: '#FDE047', royal: '#F43F5E', eye: '#22D3EE', leg: '#3F3F46' },
    5: { body: '#442416', gold: '#FACC15', royal: '#DC2626', eye: '#F43F5E', leg: '#78350F' },
  };
  const mat = levelBases[levelIndex] ?? levelBases[1];

  const chitin = isFlash
    ? '#FFFFFF'
    : enemy.rootedTimer > 0
    ? '#D97706'
    : enemy.slowTimer > 0
    ? '#B45309'
    : mat.body;

  // Sniper crimson laser telegraph
  if (!enemy.dying && enemy.archetype === 'sniper' && enemy.windupTimer > 0) {
    const prog = 1 - enemy.windupTimer / Math.max(0.01, enemy.windupDuration);
    ctx.save();
    ctx.strokeStyle = `rgba(244, 63, 94, ${0.42 + prog * 0.58})`;
    ctx.lineWidth = 1.8 + prog * 2.4;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.moveTo(enemy.x, enemy.y);
    ctx.lineTo(enemy.aimX, enemy.aimY);
    ctx.stroke();
    ctx.restore();
  }

  // Mosquito lunge telegraph
  if (!enemy.dying && enemy.archetype === 'mosquito' && enemy.lungeState === 'windup') {
    ctx.save();
    ctx.strokeStyle = 'rgba(250, 204, 21, 0.82)';
    ctx.lineWidth = 2.2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(enemy.x, enemy.y);
    ctx.lineTo(enemy.aimX, enemy.aimY);
    ctx.stroke();
    ctx.restore();
  }

  ctx.save();
  ctx.translate(enemy.x, enemy.y);

  const beatScale = 1 + (Number.isFinite(beatPulse) ? beatPulse : 0) * 0.045;
  ctx.scale(beatScale, beatScale);

  if (enemy.dying) {
    const t = Math.max(0, enemy.koTimer / 0.28);
    ctx.globalAlpha = t;
    ctx.rotate((1 - t) * -5);
    ctx.scale(0.55 + t * 0.45, 0.55 + t * 0.45);
  }

  const r = enemy.radius;

  if (!enemy.dying && enemy.archetype === 'hornet' && enemy.windupTimer > 0) {
    const pulse = 1 + Math.sin(time * 30) * 0.14;
    ctx.strokeStyle = '#FB7185';
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    ctx.arc(0, 0, (r + 8) * pulse, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (!enemy.dying && enemy.archetype === 'tank' && enemy.windupTimer > 0) {
    const pulse = 1 + Math.sin(time * 28) * 0.12;
    ctx.strokeStyle = '#FB923C';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, (r + 9) * pulse, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Tank front shield facing LEFT (-X)
  if (!enemy.dying && enemy.archetype === 'tank' && enemy.shieldActive) {
    ctx.strokeStyle = '#FDBA74';
    ctx.lineWidth = 4.2;
    ctx.beginPath();
    ctx.arc(-5, 0, r + 6, Math.PI * 0.65, Math.PI * 1.35);
    ctx.stroke();
  }

  // ---- FLIGHT MECHANISM MATCHING ANIMAL ANATOMY ----
  // Heavy ground beetles (tank & bomber) CANNOT fly naturally -> lifted by Royal Hot-Air Balloons + Twin Side Rockets!
  // Natural fliers (drone fly, mosquito, hornet, flanker dragonfly, locust, mantis sniper) get authentic wings!
  if (enemy.archetype === 'tank') {
    drawArtificialFlightBalloonAndRockets(ctx, r, time, '#BE123C', '#FACC15', isFlash);
  } else if (enemy.archetype === 'bomber') {
    drawArtificialFlightBalloonAndRockets(ctx, r, time, '#7E22CE', '#38BDF8', isFlash);
  } else {
    drawLevelSpecificWings(
      ctx,
      levelIndex,
      r * (enemy.archetype === 'flanker' ? 1.65 : 1.48),
      r * (enemy.archetype === 'flanker' ? 0.36 : 0.44),
      time,
      enemy.phaseOffset,
      isFlash,
      enemy.archetype === 'flanker' || enemy.archetype === 'hornet'
    );
    // Praying Mantis Sniper also gets dorsal stealth rocket stabilizer thruster
    if (enemy.archetype === 'sniper' && !isFlash) {
      ctx.fillStyle = '#38BDF8';
      ctx.beginPath();
      ctx.moveTo(r * 0.8, -3);
      ctx.lineTo(r * 1.35 + Math.sin(time * 36) * 4, 0);
      ctx.lineTo(r * 0.8, 3);
      ctx.closePath();
      ctx.fill();
    }
  }

  // ---- 6 ARTICULATED DANGLING JOINTED INSECT LEGS (exact Title-Screen look!) ----
  drawSixJointedLegs(ctx, r, time, enemy.phaseOffset, isFlash, mat.leg);

  // ---- TRUE ANIMAL ANATOMY SILHOUETTE (Head + Thorax + Segmented Abdomen) ----
  const traceBodyPath = () => {
    ctx.beginPath();
    if (enemy.archetype === 'tank') {
      // Heavy Rhinoceros Beetle armored shell + front upward horn!
      ctx.moveTo(-r * 1.12, -r * 0.12);
      ctx.quadraticCurveTo(-r * 0.96, -r * 0.65, -r * 0.56, -r * 0.58);
      ctx.quadraticCurveTo(r * 0.12, -r * 0.95, r * 0.88, -r * 0.42);
      ctx.quadraticCurveTo(r * 1.06, 0, r * 0.88, r * 0.5);
      ctx.quadraticCurveTo(0, r * 0.72, -r * 0.78, r * 0.48);
      ctx.closePath();
    } else if (enemy.archetype === 'mosquito') {
      // Humped mosquito thorax + narrow striped abdomen
      ctx.moveTo(-r * 0.85, 0);
      ctx.quadraticCurveTo(-r * 0.45, -r * 0.68, 0, -r * 0.52);
      ctx.lineTo(r * 1.1, -r * 0.18);
      ctx.lineTo(r * 1.18, r * 0.08);
      ctx.lineTo(r * 0.15, r * 0.4);
      ctx.quadraticCurveTo(-r * 0.5, r * 0.46, -r * 0.85, 0);
      ctx.closePath();
    } else if (enemy.archetype === 'flanker') {
      // Sleek Dragonfly (Libélula) elongated segmented tail + compact thorax
      ctx.moveTo(-r * 0.88, -r * 0.15);
      ctx.quadraticCurveTo(-r * 0.4, -r * 0.58, r * 0.12, -r * 0.34);
      ctx.lineTo(r * 1.32, -r * 0.14);
      ctx.lineTo(r * 1.38, r * 0.08);
      ctx.lineTo(r * 0.14, r * 0.34);
      ctx.quadraticCurveTo(-r * 0.45, r * 0.52, -r * 0.88, r * 0.15);
      ctx.closePath();
    } else if (enemy.archetype === 'hornet') {
      // Wasp/Hornet pinched waist + tapered venomous abdomen
      ctx.moveTo(-r * 0.86, 0);
      ctx.quadraticCurveTo(-r * 0.48, -r * 0.66, -r * 0.05, -r * 0.32);
      ctx.quadraticCurveTo(r * 0.45, -r * 0.74, r * 1.02, -r * 0.05);
      ctx.quadraticCurveTo(r * 0.42, r * 0.72, -r * 0.05, r * 0.32);
      ctx.quadraticCurveTo(-r * 0.52, r * 0.6, -r * 0.86, 0);
      ctx.closePath();
    } else if (enemy.archetype === 'sniper') {
      // Praying Mantis elongated prothorax + slender blade abdomen
      ctx.moveTo(-r * 1.02, -r * 0.14);
      ctx.lineTo(-r * 0.25, -r * 0.54);
      ctx.lineTo(r * 1.04, -r * 0.28);
      ctx.lineTo(r * 1.12, r * 0.06);
      ctx.lineTo(r * 0.94, r * 0.34);
      ctx.lineTo(-r * 0.32, r * 0.46);
      ctx.closePath();
    } else {
      // Exact Title-Screen Armored Fly / Insectoid Drone / Locust / Bomber Scarab:
      // Distinct rounded insectoid head + armored thorax + bulbous segmented abdomen
      ctx.moveTo(-r * 0.96, 0);
      ctx.quadraticCurveTo(-r * 0.78, -r * 0.58, -r * 0.22, -r * 0.64);
      ctx.quadraticCurveTo(r * 0.44, -r * 0.74, r * 0.96, -r * 0.26);
      ctx.quadraticCurveTo(r * 1.12, r * 0.12, r * 0.86, r * 0.48);
      ctx.quadraticCurveTo(r * 0.22, r * 0.72, -r * 0.44, r * 0.52);
      ctx.quadraticCurveTo(-r * 0.86, r * 0.38, -r * 0.96, 0);
      ctx.closePath();
    }
  };

  ctx.fillStyle = chitin;
  traceBodyPath();
  ctx.fill();

  if (!isFlash) {
    ctx.save();
    traceBodyPath();
    ctx.clip();
    drawLevelCarapaceTexture(ctx, levelIndex, r, beatPulse, enemy.archetype);
    ctx.restore();
  }

  ctx.strokeStyle = levelIndex === 5 && !isFlash ? '#FACC15' : INK;
  ctx.lineWidth = r >= 26 ? 2.8 : 2.2;
  traceBodyPath();
  ctx.stroke();

  // ---- ARCHETYPE ANATOMICAL SIGNATURE APPENDAGES ----
  if (enemy.archetype === 'mosquito') {
    // Needle-sharp long blood-sucking proboscis
    ctx.fillStyle = enemy.lungeState === 'windup' ? '#F43F5E' : '#E2E8F0';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-r * 0.78, -2.4);
    ctx.lineTo(-r * 1.85, 0);
    ctx.lineTo(-r * 0.78, 2.4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (enemy.archetype === 'hornet') {
    // Sharp venomous hornet stinger & mandibles + royal coronet
    ctx.fillStyle = '#F43F5E';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.7;
    ctx.beginPath();
    ctx.moveTo(-r * 0.72, 2);
    ctx.lineTo(-r * 1.42, 6);
    ctx.lineTo(-r * 0.72, 9);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    drawSubtleCoronet(ctx, -r * 0.28, -r * 0.74, 0.78, mat.gold, mat.royal, isFlash);
  } else if (enemy.archetype === 'sniper') {
    // Folded serrated Praying Mantis raptorial scythe forearms!
    ctx.strokeStyle = isFlash ? '#FFFFFF' : '#4ADE80';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-r * 0.55, r * 0.25);
    ctx.lineTo(-r * 1.05, r * 0.62);
    ctx.lineTo(-r * 1.38, r * 0.18);
    ctx.stroke();
  } else if (enemy.archetype === 'bomber') {
    // Dangling glowing payload sac under scarab beetle
    ctx.fillStyle = isFlash ? '#FFFFFF' : '#E879F9';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, r * 0.6, r * 0.34, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    drawSubtleCoronet(ctx, -r * 0.24, -r * 0.76, 0.82, mat.gold, mat.royal, isFlash);
  } else if (enemy.archetype === 'tank') {
    // Curved Rhinoceros Beetle front horn + royal gold coronet
    ctx.fillStyle = isFlash ? '#FFFFFF' : '#F59E0B';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.9;
    ctx.beginPath();
    ctx.moveTo(-r * 0.85, -r * 0.14);
    ctx.quadraticCurveTo(-r * 1.38, -r * 0.28, -r * 1.46, -r * 0.68);
    ctx.quadraticCurveTo(-r * 1.1, -r * 0.42, -r * 0.72, -r * 0.34);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    drawSubtleCoronet(ctx, -r * 0.25, -r * 0.84, 0.94, mat.gold, mat.royal, isFlash);
  } else if (enemy.archetype === 'locust') {
    // Iconic bent Z-shaped muscular grasshopper hind jumping legs + antennae!
    const kick = Math.sin(time * 16 + enemy.phaseOffset) * 3.5;
    ctx.strokeStyle = isFlash ? '#FFFFFF' : INK;
    ctx.lineWidth = 5;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(0, r * 0.22);
    ctx.lineTo(r * 0.68, -r * 0.64 + kick * 0.4);
    ctx.lineTo(r * 1.24, r * 0.68 + kick);
    ctx.stroke();
    if (!isFlash) {
      ctx.strokeStyle = '#84CC16';
      ctx.lineWidth = 2.6;
      ctx.stroke();
    }
    // Swept locust antennae
    ctx.strokeStyle = isFlash ? '#FFFFFF' : '#BEF264';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-r * 0.78, -r * 0.25);
    ctx.quadraticCurveTo(-r * 1.28, -r * 0.72, -r * 1.56, -r * 0.42);
    ctx.stroke();
  } else {
    // Drone insectoid mandibles & short antennae (exact title screen fly!)
    if (!isFlash) {
      ctx.strokeStyle = '#94A3B8';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(-r * 0.74, -r * 0.28);
      ctx.quadraticCurveTo(-r * 1.15, -r * 0.56, -r * 1.32, -r * 0.36);
      ctx.stroke();
    }
  }

  // ---- ICONIC FACETED COMPOUND EYES (Level 1 = Bright Glowing Neon-Green Compound Eyes from Title Art!) ----
  const eyeX = -r * 0.52;
  const eyeY = -r * 0.08;
  const eyeR = Math.max(4.4, r * 0.31);

  if (levelIndex === 1) {
    // Exact Title-Screen Glowing Neon-Green Oval Faceted Compound Eye!
    if (!isFlash) {
      ctx.save();
      ctx.fillStyle = 'rgba(74, 222, 128, 0.28)';
      ctx.beginPath();
      ctx.arc(eyeX, eyeY, eyeR * 1.42, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = isFlash ? '#FFFFFF' : enemy.archetype === 'sniper' ? '#F43F5E' : '#4ADE80';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(eyeX, eyeY, eyeR * 0.92, eyeR * 1.18, -0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    if (!isFlash) {
      // Facet crosshatch & lime highlight
      ctx.strokeStyle = 'rgba(21, 128, 61, 0.55)';
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(eyeX - eyeR * 0.65, eyeY);
      ctx.lineTo(eyeX + eyeR * 0.65, eyeY);
      ctx.moveTo(eyeX, eyeY - eyeR * 0.85);
      ctx.lineTo(eyeX, eyeY + eyeR * 0.85);
      ctx.stroke();

      ctx.fillStyle = '#DCFCE7';
      ctx.beginPath();
      ctx.arc(eyeX - eyeR * 0.28, eyeY - eyeR * 0.36, eyeR * 0.32, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (levelIndex === 4) {
    // Level 4 Stealth Tactical Visor Slit
    ctx.fillStyle = isFlash ? '#FFFFFF' : enemy.archetype === 'sniper' ? '#F43F5E' : mat.eye;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(eyeX - eyeR * 1.1, eyeY - eyeR * 0.45);
    ctx.lineTo(eyeX + eyeR * 0.9, eyeY - eyeR * 0.8);
    ctx.lineTo(eyeX + eyeR * 0.7, eyeY + eyeR * 0.5);
    ctx.lineTo(eyeX - eyeR * 1.1, eyeY + eyeR * 0.35);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.fillStyle = isFlash ? '#FFFFFF' : enemy.archetype === 'sniper' ? '#F43F5E' : mat.eye;
    ctx.strokeStyle = enemy.archetype === 'sniper' && !isFlash ? mat.gold : INK;
    ctx.lineWidth = enemy.archetype === 'sniper' ? 2.5 : 1.9;
    ctx.beginPath();
    ctx.ellipse(eyeX, eyeY, eyeR * 0.9, eyeR * 1.1, -0.14, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    if (!isFlash) {
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(eyeX - 1.4, eyeY - 1.5, eyeR * 0.32, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (enemy.archetype === 'sniper' && !isFlash) {
    // Subtle British royal gold monocle chain
    ctx.strokeStyle = mat.gold;
    ctx.lineWidth = 1.15;
    ctx.beginPath();
    ctx.moveTo(eyeX + eyeR * 0.6, eyeY + eyeR * 0.6);
    ctx.quadraticCurveTo(eyeX + 5, eyeY + eyeR + 6, eyeX + 9, eyeY + eyeR + 2);
    ctx.stroke();
  }

  // Drosera & Nepenthes status rings
  if (!enemy.dying && enemy.rootedTimer > 0) {
    ctx.strokeStyle = '#FBBF24';
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.arc(0, 0, r + 5, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (!enemy.dying && enemy.acidTimer > 0) {
    ctx.strokeStyle = '#C084FC';
    ctx.lineWidth = 2.4;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(0, 0, r + 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Batricio female frog poison aura
  if (!enemy.dying && (enemy.poisonTimer ?? 0) > 0) {
    ctx.strokeStyle = '#A3E635';
    ctx.lineWidth = 2.4;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(0, 0, r + 5 + Math.sin(time * 12) * 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Palito slow-charm buildup hearts (progresses toward full enamored circle!)
  const charmBuildup = enemy.charmBuildup ?? 0;
  if (!enemy.dying && charmBuildup > 0 && (enemy.charmedTimer ?? 0) <= 0) {
    for (let h = 0; h < charmBuildup; h++) {
      const hx = (h - (charmBuildup - 1) * 0.5) * 11;
      const hy = -r - 12 - Math.abs(Math.sin(time * 7 + h)) * 3;
      ctx.save();
      ctx.translate(hx, hy);
      ctx.fillStyle = '#F472B6';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(0, 3);
      ctx.bezierCurveTo(-4.5, -1, -4, -5.5, 0, -2.2);
      ctx.bezierCurveTo(4, -5.5, 4.5, -1, 0, 3);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }

  // Palito enamored floating hearts above charmed enemy!
  if (!enemy.dying && (enemy.charmedTimer ?? 0) > 0) {
    for (let h = 0; h < 2; h++) {
      const ang = time * 4 + h * Math.PI;
      const hx = Math.cos(ang) * (r * 0.65);
      const hy = -r - 12 + Math.sin(time * 6 + h * 2) * 3.5;
      ctx.save();
      ctx.translate(hx, hy);
      ctx.fillStyle = h === 0 ? '#EC4899' : '#F472B6';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(0, 4);
      ctx.bezierCurveTo(-6, -1.5, -5, -7, 0, -3);
      ctx.bezierCurveTo(5, -7, 6, -1.5, 0, 4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }

  if (!enemy.dying && enemy.hp < enemy.maxHp && enemy.maxHp > 45) {
    const bw = r * 1.55;
    const ratio = Math.max(0, enemy.hp / enemy.maxHp);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.fillRect(-bw / 2, -r - 13, bw, 4.5);
    ctx.fillStyle = accent;
    ctx.fillRect(-bw / 2, -r - 13, bw * ratio, 4.5);
  }

  ctx.restore();
}

function drawDimensionalPortal(ctx: CanvasRenderingContext2D, state: RenderState) {
  const portal = state.portal;
  if (!portal || portal.radius <= 1) return;

  const { x, y, radius, textureTarget, label } = portal;
  const rx = radius * 0.72;
  const ry = radius;
  const isQueen = textureTarget === 'queen_mothership';

  ctx.save();
  ctx.translate(x, y);

  // Outer energy shockwave ring
  ctx.strokeStyle = isQueen ? 'rgba(244, 63, 94, 0.65)' : 'rgba(56, 189, 248, 0.65)';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.ellipse(0, 0, rx + 12 + Math.sin(state.time * 12) * 3, ry + 14 + Math.sin(state.time * 12) * 3, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Clipped portal window revealing the connected destination texture!
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
  ctx.clip();

  if (isQueen) {
    // Organic Xenomorph Queen Mothership Hive Texture inside final portal
    ctx.fillStyle = '#180510';
    ctx.fillRect(-rx, -ry, rx * 2, ry * 2);
    ctx.rotate(state.time * 0.7);
    for (let ring = 0; ring < 5; ring++) {
      ctx.strokeStyle = ring % 2 === 0 ? '#E11D48' : '#FACC15';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.ellipse(0, 0, rx * (0.3 + ring * 0.16), ry * (0.3 + ring * 0.16), ring * 0.4, 0, Math.PI * 1.6);
      ctx.stroke();
    }
    // Queen Mothership silhouette eyes peeking from deep inside the portal!
    ctx.fillStyle = '#F43F5E';
    ctx.beginPath();
    ctx.arc(-14, -6, 6, 0, Math.PI * 2);
    ctx.arc(14, -6, 6, 0, Math.PI * 2);
    ctx.fill();
  } else {
    const seamBg = getSeamlessStageBackground(textureTarget);
    if (seamBg && seamBg.width > 0) {
      const drawH = ry * 2.2;
      const aspect = seamBg.width / Math.max(1, seamBg.height);
      const drawW = drawH * aspect;
      const pan = (state.time * 75) % Math.max(1, drawW);
      ctx.drawImage(seamBg.source, -rx - pan, -ry - 6, drawW, drawH);
      ctx.drawImage(seamBg.source, -rx - pan + drawW, -ry - 6, drawW, drawH);
    } else {
      ctx.fillStyle = '#0C4A6E';
      ctx.fillRect(-rx, -ry, rx * 2, ry * 2);
    }
  }

  // Swirling portal distortion spiral overlay
  ctx.rotate(state.time * 2.6);
  ctx.strokeStyle = isQueen ? 'rgba(250, 204, 21, 0.48)' : 'rgba(224, 242, 254, 0.5)';
  ctx.lineWidth = 2.6;
  for (let arc = 0; arc < 3; arc++) {
    ctx.beginPath();
    ctx.arc(0, 0, radius * (0.28 + arc * 0.22), arc * 1.1, arc * 1.1 + Math.PI * 1.25);
    ctx.stroke();
  }
  ctx.restore();

  // Solid anime cel-shaded portal rim
  ctx.strokeStyle = isQueen ? '#F43F5E' : '#38BDF8';
  ctx.lineWidth = 4.5;
  ctx.beginPath();
  ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = '#FEF08A';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(0, 0, rx - 3, ry - 3, 0, -state.time * 3, -state.time * 3 + Math.PI * 1.4);
  ctx.stroke();

  // Destination label above portal
  ctx.font = '900 12px Outfit, sans-serif';
  ctx.textAlign = 'center';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3.5;
  ctx.strokeText(label, 0, -ry - 14);
  ctx.fillStyle = isQueen ? '#FDA4AF' : '#FEF08A';
  ctx.fillText(label, 0, -ry - 14);

  ctx.restore();
}

function drawBoss(ctx: CanvasRenderingContext2D, state: RenderState) {
  const { boss, time } = state;
  const beatPulse = Number.isFinite(state.beatPulse) ? state.beatPulse : 0;
  if (!boss.active) return;

  // Level 4 Blink-Teleport Holographic Afterimage Ghost
  if (boss.blinkGhostTimer > 0) {
    ctx.save();
    ctx.globalAlpha = Math.min(0.65, boss.blinkGhostTimer * 1.2);
    ctx.translate(boss.blinkGhostX, boss.blinkGhostY);
    ctx.strokeStyle = '#22D3EE';
    ctx.fillStyle = 'rgba(34, 211, 238, 0.25)';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.ellipse(0, 0, boss.radius * 0.95, boss.radius * 0.62, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  ctx.save();
  ctx.translate(boss.x, boss.y);
  const visualScale = (boss.isMiniBoss ? 0.84 : 1.06) * (1 + beatPulse * 0.035);
  ctx.scale(visualScale, visualScale);

  if (boss.dyingTimer > 0) {
    const alpha = Math.max(0, boss.dyingTimer / 0.65);
    ctx.globalAlpha = alpha;
    ctx.rotate((1 - alpha) * 2);
  }

  const isFlash = boss.hitFlashTimer > 0;
  const phase2 = boss.phase === 2;

  // Level 1 Armored Front Shield Stance Barrier!
  if (boss.shieldActive && !isFlash) {
    ctx.save();
    ctx.strokeStyle = '#38BDF8';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(-18, 0, 70, Math.PI * 0.58, Math.PI * 1.42);
    ctx.stroke();
    ctx.strokeStyle = '#FEF08A';
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    ctx.arc(-22, 0, 76, Math.PI * 0.62, Math.PI * 1.38);
    ctx.stroke();
    ctx.restore();
  }

  // Level 5 Andean Wind Halo when Wind Gust is active!
  if (boss.windActiveTimer > 0 && !isFlash) {
    ctx.save();
    ctx.strokeStyle = 'rgba(254, 240, 138, 0.65)';
    ctx.lineWidth = 3.5;
    ctx.setLineDash([12, 8]);
    ctx.beginPath();
    ctx.arc(0, 0, 78 + Math.sin(time * 22) * 8, time * 5, time * 5 + Math.PI * 1.7);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  if (phase2 && !isFlash) {
    ctx.strokeStyle = 'rgba(244, 63, 94, 0.66)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, boss.radius / visualScale + 12 + Math.sin(time * 16) * 5, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Horizontal Beam Telegraph sweeping Left (-X)
  if (boss.windupTimer > 0 && boss.windupKind === 'beam') {
    ctx.fillStyle = 'rgba(244, 63, 94, 0.24)';
    ctx.fillRect(-boss.x / visualScale - 40, -28, boss.x / visualScale + 20, 56);
    ctx.strokeStyle = '#FB7185';
    ctx.lineWidth = 2.2;
    ctx.setLineDash([10, 8]);
    ctx.beginPath();
    ctx.moveTo(-24, 0);
    ctx.lineTo(-boss.x / visualScale - 40, 0);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  if (boss.windupTimer > 0 && (boss.windupKind === 'dash' || boss.windupKind === 'gravity_well')) {
    ctx.strokeStyle = boss.windupKind === 'gravity_well' ? '#A855F7' : '#FACC15';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(0, 0, 74 + Math.sin(time * 24) * 6, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Horror + Anime + Xenomorph Bio-Mechanical Arthropod Boss Hulls (for !boss.isMiniBoss Levels 1..5)
  const levelPalettes: Record<
    LevelNumber,
    { body: string; bodyP2: string; trim: string; eye: string; crown: string }
  > = boss.isMiniBoss
    ? {
        1: { body: '#1E293B', bodyP2: '#4C1D95', trim: '#E11D48', eye: '#4ADE80', crown: '#FACC15' },
        2: { body: '#0F766E', bodyP2: '#9A3412', trim: '#FB7185', eye: '#FACC15', crown: '#FDE047' },
        3: { body: '#1E1B4B', bodyP2: '#7F1D1D', trim: '#FACC15', eye: '#E879F9', crown: '#FACC15' },
        4: { body: '#18181B', bodyP2: '#881337', trim: '#22D3EE', eye: '#22D3EE', crown: '#FDE047' },
        5: { body: '#292524', bodyP2: '#7F1D1D', trim: '#DC2626', eye: '#F43F5E', crown: '#FACC15' },
      }
    : {
        1: { body: '#0F172A', bodyP2: '#3B0764', trim: '#F43F5E', eye: '#A3E635', crown: '#38BDF8' },
        2: { body: '#18181B', bodyP2: '#7F1D1D', trim: '#DC2626', eye: '#BEF264', crown: '#FB7185' },
        3: { body: '#111827', bodyP2: '#581C87', trim: '#F59E0B', eye: '#F43F5E', crown: '#FDE047' },
        4: { body: '#090D16', bodyP2: '#881337', trim: '#22D3EE', eye: '#FB7185', crown: '#E879F9' },
        5: { body: '#0B090C', bodyP2: '#7F1D1D', trim: '#E11D48', eye: '#FACC15', crown: '#FACC15' },
      };
  const pal = levelPalettes[boss.level];

  if (boss.isMiniBoss || boss.level >= 3) {
    drawLevelSpecificWings(ctx, boss.level, 114, 28, time, 0.4, isFlash, true);
  }

  // Level 5 Escorpión Emperador: Massive arching Xenomorph Scorpion Tail & Dripping Venom Telson overhead!
  if (!boss.isMiniBoss && boss.level === 5) {
    const tailWag = Math.sin(time * 4.6) * 5;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3.2;
    const segs: [number, number, number][] = [
      [48, -14, 15],
      [62, -34, 13],
      [54, -56, 11],
      [32, -68 + tailWag * 0.4, 10],
      [6, -70 + tailWag * 0.6, 9],
      [-20, -64 + tailWag, 10],
    ];
    for (const [sx, sy, sr] of segs) {
      ctx.fillStyle = isFlash ? '#FFFFFF' : '#18181B';
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      if (!isFlash) {
        ctx.fillStyle = '#E11D48';
        ctx.beginPath();
        ctx.arc(sx - 2, sy - 2, sr * 0.34, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // Glowing razor xenomorph stinger bulb & fang!
    ctx.fillStyle = isFlash ? '#FFFFFF' : '#F43F5E';
    ctx.beginPath();
    ctx.moveTo(-24, -64 + tailWag);
    ctx.lineTo(-48, -56 + tailWag);
    ctx.lineTo(-56, -42 + tailWag);
    ctx.lineTo(-32, -52 + tailWag);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // Level 3 Avispa Xeno-Reina & Level 4 Mantis Espectral wear twin biomech thrusters
  if ((boss.level === 3 || boss.level === 4) && !isFlash) {
    const flame = 16 + Math.sin(time * 40) * 6;
    for (const sy of [-28, 28]) {
      ctx.fillStyle = boss.level === 4 ? '#22D3EE' : '#F43F5E';
      ctx.beginPath();
      ctx.moveTo(52, sy - 6);
      ctx.lineTo(52 + flame, sy);
      ctx.lineTo(52, sy + 6);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#1E293B';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(22, sy - 8, 32, 16, 4);
      ctx.fill();
      ctx.stroke();
    }
  }

  drawSixJointedLegs(ctx, 48, time, 0.6, isFlash, boss.isMiniBoss && boss.level === 1 ? '#334155' : pal.body);

  // Bespoke Carapace Geometry (Horror + Anime + Xenomorph for Final Bosses!)
  const traceBossHull = () => {
    ctx.beginPath();
    if (!boss.isMiniBoss && boss.level === 1) {
      // TRILOBITES ABISAL: wide ribbed armored fossil dome + extended xenomorph cranial crown!
      ctx.moveTo(-72, 6);
      ctx.quadraticCurveTo(-56, -46, 2, -44);
      ctx.lineTo(66, -34);
      ctx.quadraticCurveTo(84, -4, 66, 32);
      ctx.lineTo(-4, 42);
      ctx.quadraticCurveTo(-56, 38, -72, 6);
      ctx.closePath();
    } else if (!boss.isMiniBoss && boss.level === 2) {
      // MARIQUITA PARÁSITA: sinister split armored beetle dome with alien cranial crest!
      ctx.moveTo(-66, 4);
      ctx.quadraticCurveTo(-48, -48, 12, -46);
      ctx.quadraticCurveTo(64, -36, 68, 4);
      ctx.quadraticCurveTo(56, 44, -18, 42);
      ctx.quadraticCurveTo(-56, 36, -66, 4);
      ctx.closePath();
    } else if (!boss.isMiniBoss && boss.level === 3) {
      // AVISPA XENO-REINA: elongated alien xenomorph dome head + wasp pinched waist & venomous tail!
      ctx.moveTo(-70, 2);
      ctx.quadraticCurveTo(-36, -42, 8, -32);
      ctx.lineTo(74, -22);
      ctx.quadraticCurveTo(86, 0, 74, 22);
      ctx.lineTo(8, 32);
      ctx.quadraticCurveTo(-40, 42, -70, 2);
      ctx.closePath();
    } else if (boss.level === 4) {
      // MANTIS ESPECTRAL: gaunt angular xeno-mantis thorax + crest blade
      ctx.moveTo(-72, 2);
      ctx.lineTo(-34, -40);
      ctx.lineTo(42, -42);
      ctx.lineTo(76, -8);
      ctx.lineTo(44, 34);
      ctx.lineTo(-32, 38);
      ctx.closePath();
    } else if (boss.level === 5 && !boss.isMiniBoss) {
      // ESCORPIÓN EMPERADOR: broad armored arachnid prosoma & serrated carapace!
      ctx.moveTo(-64, 0);
      ctx.lineTo(-34, -40);
      ctx.lineTo(46, -34);
      ctx.lineTo(64, 0);
      ctx.lineTo(46, 36);
      ctx.lineTo(-34, 40);
      ctx.closePath();
    } else if (boss.level === 2) {
      ctx.moveTo(-64, 0);
      ctx.quadraticCurveTo(-36, -42, 24, -36);
      ctx.quadraticCurveTo(68, -16, 68, 8);
      ctx.quadraticCurveTo(44, 38, -28, 36);
      ctx.closePath();
    } else if (boss.level === 3) {
      ctx.ellipse(-4, 0, 58, 44, 0.04, 0, Math.PI * 2);
    } else if (boss.level === 5) {
      ctx.moveTo(-66, 4);
      ctx.lineTo(-38, -42);
      ctx.lineTo(6, -46);
      ctx.lineTo(48, -36);
      ctx.lineTo(68, -6);
      ctx.lineTo(66, 18);
      ctx.lineTo(40, 42);
      ctx.lineTo(-34, 42);
      ctx.closePath();
    } else {
      ctx.moveTo(-64, 4);
      ctx.quadraticCurveTo(-36, -44, 24, -38);
      ctx.quadraticCurveTo(66, -24, 64, 10);
      ctx.quadraticCurveTo(52, 42, -18, 40);
      ctx.quadraticCurveTo(-52, 36, -64, 4);
      ctx.closePath();
    }
  };

  ctx.fillStyle = isFlash ? '#FFFFFF' : phase2 ? pal.bodyP2 : pal.body;
  traceBossHull();
  ctx.fill();

  if (!isFlash) {
    ctx.save();
    traceBossHull();
    ctx.clip();
    drawLevelCarapaceTexture(ctx, boss.level, 58, beatPulse);
    // Biomechanical xenomorph glowing spine/rib sutures across every final boss!
    if (!boss.isMiniBoss) {
      ctx.strokeStyle = pal.trim;
      ctx.lineWidth = 2.2;
      for (let rx = -24; rx <= 44; rx += 16) {
        ctx.beginPath();
        ctx.arc(rx, 0, 44, -Math.PI * 0.44, Math.PI * 0.44);
        ctx.stroke();
      }
      if (boss.level === 2) {
        // Mariquita crimson blood-red elytra dome & glowing parasite spots!
        ctx.fillStyle = '#991B1B';
        ctx.fillRect(-16, -48, 86, 96);
        ctx.strokeStyle = '#090D16';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(-16, 0);
        ctx.lineTo(72, 0);
        ctx.stroke();
        const spots: [number, number, number][] = [
          [8, -22, 9],
          [34, -14, 10],
          [14, 22, 9],
          [42, 18, 8],
        ];
        for (const [sx, sy, sr] of spots) {
          ctx.fillStyle = '#090D16';
          ctx.beginPath();
          ctx.arc(sx, sy, sr, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#BEF264';
          ctx.beginPath();
          ctx.arc(sx, sy, sr * (0.4 + beatPulse * 0.25), 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    ctx.restore();
  }

  ctx.strokeStyle = boss.level === 5 && !isFlash ? '#FACC15' : !boss.isMiniBoss && !isFlash ? pal.trim : INK;
  ctx.lineWidth = 3.5;
  traceBossHull();
  ctx.stroke();

  // Bespoke Final Boss Anatomical Features (Trilobites, Mariquita, Avispa, Mantis, Escorpión)
  if (!boss.isMiniBoss && boss.level === 1 && !isFlash) {
    // Trilobites axial spine ridges + acid dorsal fissure
    ctx.strokeStyle = '#38BDF8';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(-48, 0);
    ctx.lineTo(62, 0);
    ctx.stroke();
  } else if (!boss.isMiniBoss && boss.level === 3) {
    // Avispa Xeno-Reina serrated front venomous stinger lance!
    ctx.fillStyle = isFlash ? '#FFFFFF' : '#F43F5E';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(-64, -5);
    ctx.lineTo(-104, 0);
    ctx.lineTo(-64, 7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (boss.level === 4) {
    // Mantis Espectral horror bone-scythe forearms!
    ctx.fillStyle = isFlash ? '#FFFFFF' : boss.isMiniBoss ? '#22D3EE' : '#F43F5E';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(-42, 22);
    ctx.lineTo(-92, 54);
    ctx.lineTo(-106, 10);
    ctx.lineTo(-78, 28);
    ctx.lineTo(-52, 14);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (!boss.isMiniBoss && boss.level === 5) {
    // Escorpión Emperador twin colossal xenomorph pincer claws!
    for (const side of [-1, 1]) {
      ctx.fillStyle = isFlash ? '#FFFFFF' : '#7F1D1D';
      ctx.strokeStyle = '#FACC15';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(-44, side * 24);
      ctx.quadraticCurveTo(-76, side * 46, -98, side * 26);
      ctx.lineTo(-74, side * 18);
      ctx.lineTo(-92, side * 8);
      ctx.quadraticCurveTo(-66, side * 12, -44, side * 14);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  } else if (boss.level === 5 && !isFlash) {
    // Mini-boss Condor-Tábano neck ruff
    ctx.fillStyle = '#F8FAFC';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.2;
    for (let f = -3; f <= 3; f++) {
      ctx.beginPath();
      ctx.arc(-28 + Math.abs(f) * 2, f * 9, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  } else if (boss.level === 2 && boss.isMiniBoss && !isFlash) {
    const vib = Math.sin(time * 36) * 2;
    ctx.fillStyle = '#FACC15';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(22, 16, 15 + vib, 10, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  drawSubtleCoronet(
    ctx,
    -20,
    -42,
    boss.isMiniBoss ? 1.55 : boss.level === 5 ? 2.45 : 2.05,
    pal.crown,
    pal.trim,
    isFlash
  );

  // Heavy xenomorph pharyngeal mandibles (double horror jaw for final bosses!)
  ctx.fillStyle = isFlash ? '#FFFFFF' : boss.isMiniBoss ? '#38BDF8' : '#E2E8F0';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(-48, -18);
  ctx.lineTo(-82, -30);
  ctx.lineTo(-56, -6);
  ctx.lineTo(-88, 3);
  ctx.lineTo(-56, 12);
  ctx.lineTo(-80, 30);
  ctx.lineTo(-48, 18);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Glowing Anime + Horror Compound / Xenomorph Multi-Eyes!
  if (!boss.isMiniBoss && !isFlash) {
    ctx.fillStyle = pal.eye;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.4;
    // Cluster of eerie horror eyes along brow
    for (let e = 0; e < 3; e++) {
      ctx.beginPath();
      ctx.ellipse(-36 + e * 10, -14 + e * 9, 8.5 - e * 1.2, 11 - e * 1.5, -0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  } else {
    ctx.fillStyle = isFlash ? '#FFFFFF' : phase2 ? '#F43F5E' : pal.eye;
    ctx.strokeStyle = boss.level === 4 || boss.isMiniBoss ? pal.crown : INK;
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.ellipse(-30, -4, 16, 22, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  if (!isFlash) {
    if (boss.level === 1) {
      ctx.strokeStyle = 'rgba(21, 128, 61, 0.55)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(-42, -4);
      ctx.lineTo(-18, -4);
      ctx.moveTo(-30, -22);
      ctx.lineTo(-30, 14);
      ctx.stroke();
    }
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(-35, -12, 4.8, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

export function renderGameFrame(ctx: CanvasRenderingContext2D, state: RenderState) {
  ctx.save();
  ctx.translate(state.shakeX, state.shakeY);

  drawEarthLevelBackdrop(ctx, state);

  // Acid digestive clouds (Nepenthes)
  for (const pool of state.acidPools) {
    const alpha = Math.min(1, pool.life / Math.max(0.1, pool.maxLife));
    ctx.save();
    ctx.globalAlpha = alpha * 0.72;
    ctx.fillStyle = pool.color;
    ctx.strokeStyle = '#FDE047';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(pool.x, pool.y, pool.radius * (0.88 + Math.sin(state.time * 10) * 0.08), 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#FEF08A';
    ctx.beginPath();
    ctx.arc(pool.x - pool.radius * 0.3, pool.y - pool.radius * 0.2, 4.5, 0, Math.PI * 2);
    ctx.arc(pool.x + pool.radius * 0.25, pool.y + pool.radius * 0.22, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Utricularia swirling vacuum vortexes
  for (const v of state.vortexes) {
    const alpha = Math.min(1, v.life / Math.max(0.1, v.maxLife));
    ctx.save();
    ctx.translate(v.x, v.y);
    ctx.globalAlpha = alpha * 0.85;
    ctx.rotate(state.time * 9);
    ctx.strokeStyle = '#38BDF8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, v.radius * 0.72, 0, Math.PI * 1.45);
    ctx.stroke();
    ctx.strokeStyle = '#E0F2FE';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, v.radius * 0.38, Math.PI, Math.PI * 2.45);
    ctx.stroke();
    ctx.restore();
  }

  // Special Vacuum Pulse + Frog Sonic Croak Wave
  if (state.specialPulseTimer > 0) {
    ctx.save();
    ctx.strokeStyle = '#38BDF8';
    ctx.lineWidth = 5;
    ctx.globalAlpha = Math.min(1, state.specialPulseTimer * 2);
    ctx.beginPath();
    ctx.arc(state.playerX, state.playerY, state.specialPulseRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(56, 189, 248, 0.14)';
    ctx.fill();
    if (state.frog.enabled) {
      ctx.strokeStyle = '#4ADE80';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(state.frog.x, state.frog.y, state.specialPulseRadius * 0.55, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Ornate Cycling Biological Mutagen Pod
  const activeCount = ALL_SPECIES_IDS.filter(
    (s) => state.speciesLevels[s] > 0
  ).length;

  for (const p of state.pickups) {
    const activeId = p.speciesOrder[p.cycleIndex % p.speciesOrder.length] ?? 'dionaea';
    const sp = state.config.species[activeId];
    const cycleProgress = Math.max(0, Math.min(1, 1 - p.cycleTimer / Math.max(0.1, p.cycleDuration)));
    const isSecretUnlockNext = activeCount === 1 && state.speciesLevels[activeId] === 4;

    ctx.save();
    ctx.translate(p.x, p.y);

    if (isSecretUnlockNext) {
      ctx.strokeStyle = '#FACC15';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, 31 + Math.sin(state.time * 10) * 3, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.save();
    ctx.rotate(state.time * 2.4);
    ctx.fillStyle = isSecretUnlockNext ? '#FACC15' : sp.secondaryColor;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.8;
    for (let k = 0; k < 4; k++) {
      ctx.rotate(Math.PI / 2);
      ctx.beginPath();
      ctx.moveTo(0, -14);
      ctx.lineTo(4, -22);
      ctx.lineTo(-4, -22);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 24, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = isSecretUnlockNext ? '#FACC15' : sp.accentColor;
    ctx.lineWidth = 3.6;
    ctx.beginPath();
    ctx.arc(0, 0, 24, -Math.PI / 2, -Math.PI / 2 + cycleProgress * Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = sp.accentColor;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.arc(0, 0, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    if (p.shiftFlash > 0) {
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 4;
      ctx.globalAlpha = Math.min(1, p.shiftFlash * 4);
      ctx.beginPath();
      ctx.arc(0, 0, 29 + (0.25 - p.shiftFlash) * 32, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '800 10px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(sp.name.slice(0, 3).toUpperCase(), 0, 0.5);

    ctx.font = '800 11px Outfit, sans-serif';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3.2;
    const label = isSecretUnlockNext ? `★ ${sp.name.toUpperCase()} N5` : sp.name.toUpperCase();
    ctx.strokeText(label, 0, 36);
    ctx.fillStyle = isSecretUnlockNext ? '#FDE047' : sp.accentColor;
    ctx.fillText(label, 0, 36);
    ctx.restore();
  }

  // Player & Frog Ballistic Projectiles (rotated cleanly along their velocity vector!)
  for (const b of state.playerBullets) {
    if (!b.active) continue;
    ctx.save();
    ctx.translate(b.x, b.y);
    const angle = Math.atan2(b.vy, b.vx);

    if (b.kind === 'jaw_guillotine') {
      // SECONDARY 1 (DIONAEA): Massive chomping toothy crescent wave!
      ctx.rotate(angle);
      const chomp = Math.abs(Math.sin(state.time * 28)) * 0.14;
      ctx.fillStyle = 'rgba(251, 113, 133, 0.25)';
      ctx.beginPath();
      ctx.arc(-10, 0, b.radius + 6, -Math.PI * 0.44, Math.PI * 0.44);
      ctx.fill();

      ctx.strokeStyle = b.color;
      ctx.lineWidth = 8.5;
      ctx.beginPath();
      ctx.arc(-10, 0, b.radius, -Math.PI * (0.46 - chomp), Math.PI * (0.46 - chomp));
      ctx.stroke();

      ctx.strokeStyle = '#FEF08A';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(-10, 0, b.radius - 5, -Math.PI * 0.38, Math.PI * 0.38);
      ctx.stroke();

      // Razor white teeth along the crescent arc
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.5;
      for (let t = -3; t <= 3; t++) {
        const a = t * 0.22;
        const tx = -10 + Math.cos(a) * b.radius;
        const ty = Math.sin(a) * b.radius;
        ctx.beginPath();
        ctx.moveTo(tx + 8, ty);
        ctx.lineTo(tx - 2, ty - 4.5);
        ctx.lineTo(tx - 2, ty + 4.5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    } else if (b.kind === 'sticky_bola') {
      // SECONDARY 2 (DROSERA): Spinning golden mucilage snare bola with glowing dew strands!
      ctx.rotate(state.time * 14);
      ctx.strokeStyle = '#FEF08A';
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.moveTo(-b.radius, 0);
      ctx.lineTo(b.radius, 0);
      ctx.stroke();
      for (const sx of [-b.radius * 0.85, b.radius * 0.85]) {
        ctx.fillStyle = b.color;
        ctx.strokeStyle = INK;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.arc(sx, 0, 7.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(sx - 2, -2, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (b.kind === 'mega_acid') {
      // SECONDARY 3 (NEPENTHES): Oversized bubbling purple-lime pitcher mortar bomb!
      ctx.rotate(angle);
      ctx.fillStyle = 'rgba(192, 132, 252, 0.3)';
      ctx.beginPath();
      ctx.arc(0, 0, b.radius + 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = b.color;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.ellipse(0, 0, b.radius * 1.18, b.radius * 0.92, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#BEF264';
      ctx.beginPath();
      ctx.arc(-3, -3, b.radius * 0.42, 0, Math.PI * 2);
      ctx.arc(5, 3, b.radius * 0.26, 0, Math.PI * 2);
      ctx.fill();
    } else if (b.kind === 'singularity') {
      // SECONDARY 4 (UTRICULARIA): Swirling cyan-indigo miniature black-hole vortex orb!
      ctx.rotate(state.time * 11);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.55)';
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.arc(0, 0, b.radius + 7, 0, Math.PI * 1.4);
      ctx.stroke();
      ctx.strokeStyle = '#E0F2FE';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(0, 0, b.radius + 2, Math.PI, Math.PI * 2.35);
      ctx.stroke();
      ctx.fillStyle = '#0C4A6E';
      ctx.strokeStyle = '#38BDF8';
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      ctx.arc(0, 0, b.radius * 0.72, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else if (b.kind === 'supersonic_rocket') {
      // SECONDARY 5 (SARRACENIA): Piercing Mach-3 Crimson-Orange Trumpet Missile!
      ctx.rotate(angle);
      const flame = 22 + Math.sin(state.time * 50) * 8;
      ctx.fillStyle = '#FB923C';
      ctx.beginPath();
      ctx.moveTo(-12, -6);
      ctx.lineTo(-12 - flame, 0);
      ctx.lineTo(-12, 6);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#FEF08A';
      ctx.beginPath();
      ctx.moveTo(-12, -3);
      ctx.lineTo(-12 - flame * 0.6, 0);
      ctx.lineTo(-12, 3);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = b.color;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(22, 0);
      ctx.lineTo(-10, 8.5);
      ctx.lineTo(-14, 0);
      ctx.lineTo(-10, -8.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // Mach shockwave cone
      ctx.strokeStyle = 'rgba(254, 240, 138, 0.78)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(22, 0);
      ctx.lineTo(2, -14);
      ctx.moveTo(22, 0);
      ctx.lineTo(2, 14);
      ctx.stroke();
    } else if (b.kind === 'prism_crystal') {
      // SECONDARY 6 (PINGUICULA): Heavy ricochet ice-prism star!
      ctx.rotate(state.time * 12);
      ctx.fillStyle = 'rgba(56, 189, 248, 0.3)';
      ctx.beginPath();
      ctx.arc(0, 0, b.radius + 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = b.color;
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const rad = i % 2 === 0 ? b.radius * 1.2 : b.radius * 0.56;
        if (i === 0) ctx.moveTo(Math.cos(a) * rad, Math.sin(a) * rad);
        else ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (b.kind === 'solar_helix') {
      // SECONDARY 7 (HELIAMPHORA): Radiant golden-white twin helix orb!
      ctx.rotate(angle);
      ctx.fillStyle = 'rgba(250, 204, 21, 0.34)';
      ctx.beginPath();
      ctx.ellipse(-6, 0, b.radius * 1.8, b.radius * 1.15, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FEF08A';
      ctx.strokeStyle = '#EA580C';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.arc(0, 0, b.radius * 0.9, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else if (b.kind === 'cluster_bomb') {
      // SECONDARY 8 (CEPHALOTUS): Giant spiked crimson-gold fragmentation canister!
      ctx.rotate(state.time * 9);
      ctx.fillStyle = b.color;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.arc(0, 0, b.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#FACC15';
      for (let s = 0; s < 6; s++) {
        const a = (s / 6) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * b.radius * 0.88, Math.sin(a) * b.radius * 0.88, 3.2, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (b.kind === 'snap') {
      // Interlocking Dionaea mandibular jaw wave rotated along flight direction
      ctx.rotate(angle);
      ctx.strokeStyle = b.color;
      ctx.lineWidth = b.color === '#FACC15' ? 7 : 5.5;
      ctx.beginPath();
      ctx.arc(-8, 0, b.radius, -Math.PI * 0.36, Math.PI * 0.36);
      ctx.stroke();
      ctx.strokeStyle = b.color === '#FACC15' ? '#FB7185' : '#DCFCE7';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.arc(-8, 0, b.radius - 4, -Math.PI * 0.3, Math.PI * 0.3);
      ctx.stroke();
    } else if (b.kind === 'acid') {
      // Dive-bomb Nepenthes pitcher flask tilted along gravity fall arc
      ctx.rotate(angle);
      ctx.fillStyle = b.color;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, 0, b.radius * 1.15, b.radius * 0.85, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#FEF08A';
      ctx.beginPath();
      ctx.arc(-2, -1.5, b.radius * 0.38, 0, Math.PI * 2);
      ctx.fill();
    } else if (b.kind === 'vacuum') {
      ctx.rotate(angle);
      ctx.fillStyle = b.color;
      ctx.strokeStyle = '#E0F2FE';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, 0, 14, 5.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else if (b.kind === 'mucilage') {
      ctx.rotate(angle);
      ctx.fillStyle = b.color;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.ellipse(0, 0, b.radius * 1.18, b.radius * 0.88, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(1.8, -1.8, 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (b.kind === 'frog_bubble') {
      ctx.fillStyle = 'rgba(134, 239, 172, 0.85)';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, b.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(-2, -2, b.radius * 0.36, 0, Math.PI * 2);
      ctx.fill();
    } else if (b.kind === 'trumpet') {
      // Sarracenia accelerating rocket dart
      ctx.rotate(angle);
      ctx.fillStyle = '#FDBA74';
      ctx.beginPath();
      ctx.moveTo(-6, -3);
      ctx.lineTo(-16 - Math.sin(state.time * 40) * 4, 0);
      ctx.lineTo(-6, 3);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = b.color;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.9;
      ctx.beginPath();
      ctx.moveTo(14, 0);
      ctx.lineTo(-8, 5.5);
      ctx.lineTo(-6, -5.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (b.kind === 'crystal') {
      // Pinguicula bouncing frost prism
      ctx.rotate(state.time * 8);
      ctx.fillStyle = b.color;
      ctx.strokeStyle = '#E0F2FE';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -b.radius);
      ctx.lineTo(b.radius * 0.85, 0);
      ctx.lineTo(0, b.radius);
      ctx.lineTo(-b.radius * 0.85, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (b.kind === 'solar_arc') {
      // Heliamphora golden tepuy crescent blade
      ctx.rotate(angle);
      ctx.strokeStyle = b.color;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(-4, 0, b.radius, -Math.PI * 0.42, Math.PI * 0.42);
      ctx.stroke();
      ctx.strokeStyle = '#FEF9C3';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(-4, 0, b.radius - 2, -Math.PI * 0.32, Math.PI * 0.32);
      ctx.stroke();
    } else if (b.kind === 'mortar') {
      // Cephalotus heavy spiked fragmentation mortar
      ctx.rotate(state.time * 6);
      ctx.fillStyle = b.color;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.1;
      ctx.beginPath();
      ctx.arc(0, 0, b.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#F43F5E';
      for (let s = 0; s < 4; s++) {
        const a = (s / 4) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * b.radius * 0.85, Math.sin(a) * b.radius * 0.85, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (b.kind === 'pistol_shot') {
      // Sicario brass-gold pistol round + tracer streak
      ctx.rotate(angle);
      ctx.strokeStyle = 'rgba(253, 224, 71, 0.55)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-18, 0);
      ctx.lineTo(-4, 0);
      ctx.stroke();
      ctx.fillStyle = '#FACC15';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.9;
      ctx.beginPath();
      ctx.roundRect(-7, -3.2, 15, 6.4, 3);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#FEF9C3';
      ctx.fillRect(1, -1.5, 5, 2.2);
    } else if (b.kind === 'meow_wave') {
      // Roy sonic annoying meow arc
      ctx.rotate(angle);
      ctx.strokeStyle = '#FDE047';
      ctx.lineWidth = 4.2;
      ctx.beginPath();
      ctx.arc(-3, 0, b.radius + 3, -Math.PI * 0.42, Math.PI * 0.42);
      ctx.stroke();
      ctx.strokeStyle = '#FB7185';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(0, 0, b.radius, -Math.PI * 0.32, Math.PI * 0.32);
      ctx.stroke();
    } else if (b.kind === 'palito_heart') {
      // Palito Pink Glowing Charm Heart (slows & gradually charms enemies!)
      const pulse = 1 + Math.sin(state.time * 12 + b.age * 8) * 0.08;
      ctx.scale(pulse, pulse);
      ctx.fillStyle = 'rgba(244, 114, 182, 0.32)';
      ctx.beginPath();
      ctx.arc(0, 0, b.radius + 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#EC4899';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.9;
      ctx.beginPath();
      ctx.moveTo(0, b.radius * 0.95);
      ctx.bezierCurveTo(-b.radius * 1.25, b.radius * 0.1, -b.radius * 1.15, -b.radius * 1.05, 0, -b.radius * 0.35);
      ctx.bezierCurveTo(b.radius * 1.15, -b.radius * 1.05, b.radius * 1.25, b.radius * 0.1, 0, b.radius * 0.95);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#FCE7F3';
      ctx.beginPath();
      ctx.arc(-b.radius * 0.3, -b.radius * 0.25, 1.8, 0, Math.PI * 2);
      ctx.fill();
    } else if (b.kind === 'apex_fusion_auto' || b.kind === 'apex_fusion_manual') {
      // Dual Max-Level Super Saiyan Fused Energy Projectile!
      ctx.rotate(angle);
      const isManual = b.kind === 'apex_fusion_manual';
      ctx.fillStyle = isManual ? 'rgba(250, 204, 21, 0.36)' : 'rgba(250, 204, 21, 0.25)';
      ctx.beginPath();
      ctx.ellipse(-2, 0, b.radius * 1.45, b.radius * 1.1, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = b.color;
      ctx.strokeStyle = b.glowColor || '#FEF08A';
      ctx.lineWidth = isManual ? 3.2 : 2.2;
      ctx.beginPath();
      ctx.moveTo(b.radius * 1.35, 0);
      ctx.lineTo(-b.radius * 0.6, b.radius * 0.72);
      ctx.lineTo(-b.radius * 0.2, 0);
      ctx.lineTo(-b.radius * 0.6, -b.radius * 0.72);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (b.kind === 'mate_shot') {
      // Carpincho Matero hot yerba-mate splash droplet
      ctx.rotate(angle);
      ctx.fillStyle = '#22C55E';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.ellipse(0, 0, b.radius + 2, b.radius * 0.85, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#DCFCE7';
      ctx.beginPath();
      ctx.arc(2, -1.5, b.radius * 0.35, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Dionaea Thorn Dart rotated along ballistic flight tangent!
      ctx.rotate(angle);
      ctx.fillStyle = b.color;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.9;
      ctx.beginPath();
      ctx.moveTo(12, 0);
      ctx.lineTo(-6, 5);
      ctx.lineTo(-3, 0);
      ctx.lineTo(-6, -5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  // Arthropod Enemies (5 completely distinct per-level visual languages)
  for (const enemy of state.enemies) {
    drawArthropodEnemy(ctx, enemy, state.time, state.beatPulse, state.config, state.levelIndex);
  }

  // Boss
  drawBoss(ctx, state);

  // Enemy Bullets & Physics-Driven Boss Projectiles:
  // Indexed into precomputed HSL LUTs to eliminate per-bullet string allocations!
  let ebIdx = 0;
  for (const eb of state.enemyBullets) {
    if (!eb.active) continue;
    ebIdx++;
    const lutIdx = Math.floor(((state.time * 82 + eb.age * 96 + ebIdx * 5) % BULLET_LUT_SIZE + BULLET_LUT_SIZE) % BULLET_LUT_SIZE);
    const multiFill = ENEMY_BULLET_FILL_LUT[lutIdx];
    const multiCore = ENEMY_BULLET_CORE_LUT[lutIdx];

    ctx.save();
    ctx.translate(eb.x, eb.y);
    if (eb.kind === 'stinger') {
      ctx.rotate(state.time * 5.2 + eb.age * 2.5);
      const traceStar = () => {
        ctx.beginPath();
        for (let s = 0; s < 4; s++) {
          const ang = (s / 4) * Math.PI * 2;
          ctx.lineTo(Math.cos(ang) * (eb.radius + 3.5), Math.sin(ang) * (eb.radius + 3.5));
          ctx.lineTo(Math.cos(ang + Math.PI / 4) * (eb.radius * 0.48), Math.sin(ang + Math.PI / 4) * (eb.radius * 0.48));
        }
        ctx.closePath();
      };
      // High-contrast outer white halo + jet-black border
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 5.4;
      traceStar();
      ctx.stroke();
      ctx.fillStyle = multiFill;
      ctx.strokeStyle = '#05070D';
      ctx.lineWidth = 2.6;
      traceStar();
      ctx.fill();
      ctx.stroke();
    } else if (eb.kind === 'boomerang') {
      ctx.rotate(state.time * 14 + eb.age * 6);
      const traceBoom = () => {
        ctx.beginPath();
        ctx.arc(0, 0, eb.radius + 3.5, -Math.PI * 0.75, Math.PI * 0.75);
        ctx.arc(-3, 0, eb.radius * 0.55, Math.PI * 0.75, -Math.PI * 0.75, true);
        ctx.closePath();
      };
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 5.6;
      traceBoom();
      ctx.stroke();
      ctx.fillStyle = multiFill;
      ctx.strokeStyle = '#05070D';
      ctx.lineWidth = 2.6;
      traceBoom();
      ctx.fill();
      ctx.stroke();
    } else if (eb.kind === 'gravity_orb') {
      ctx.strokeStyle = multiCore;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(0, 0, eb.radius + 8 + Math.sin(state.time * 14) * 3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 5.8;
      ctx.beginPath();
      ctx.arc(0, 0, eb.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = multiFill;
      ctx.strokeStyle = '#05070D';
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      ctx.arc(0, 0, eb.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#05070D';
      ctx.beginPath();
      ctx.arc(0, 0, eb.radius * 0.42, 0, Math.PI * 2);
      ctx.fill();
    } else if (eb.kind === 'bounce_orb') {
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 5.4;
      ctx.beginPath();
      ctx.arc(0, 0, eb.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = multiFill;
      ctx.strokeStyle = '#05070D';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.arc(0, 0, eb.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = multiCore;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, eb.radius * 0.55, 0, Math.PI * 2);
      ctx.stroke();
    } else if (eb.kind === 'sniper') {
      ctx.rotate(Math.atan2(eb.vy, eb.vx));
      const traceDart = () => {
        ctx.beginPath();
        ctx.moveTo(13, 0);
        ctx.lineTo(-8, 5);
        ctx.lineTo(-8, -5);
        ctx.closePath();
      };
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 5.2;
      traceDart();
      ctx.stroke();
      ctx.fillStyle = multiFill;
      ctx.strokeStyle = '#05070D';
      ctx.lineWidth = 2.5;
      traceDart();
      ctx.fill();
      ctx.stroke();
    } else {
      // Standard spore orb: high-contrast white halo + jet-black border + rapid multicolor body
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 5.0;
      ctx.beginPath();
      ctx.arc(0, 0, eb.radius + 0.6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = multiFill;
      ctx.strokeStyle = '#05070D';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, eb.radius + 0.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(-1.6, -1.6, eb.radius * 0.36, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // Dimensional Portal (Boss Clear -> Next Level / Reina Nodriza Teaser, or Level Entry)
  drawDimensionalPortal(ctx, state);

  // Pet Special Effects: Palito Love Wave, Batricio Poisonous Female Frogs Rain, Carpincho Infernales Cavalry, Sicario Mafia Squad
  drawPalitoLoveWave(ctx, state);
  drawPoisonFrogsRain(ctx, state);
  drawInfernalesRiders(ctx, state);
  drawMafiaGatunaSquad(ctx, state);
  drawPetCompanion(ctx, state);
  drawHeroBiplane(ctx, state);

  // Pooled Particles (flat state, zero ctx.save/restore overhead per particle!)
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.4;
  for (const pt of state.particles) {
    if (!pt.active) continue;
    const alpha = Math.max(0, pt.life / pt.maxLife);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = pt.color;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, pt.size * (0.4 + alpha * 0.6), 0, Math.PI * 2);
    ctx.fill();
    if (pt.outlined) {
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;

  // Floating Anime Callouts (shared font & outline state outside loop)
  if (state.callouts.length > 0) {
    ctx.font = '800 14px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3.5;
    for (const c of state.callouts) {
      ctx.globalAlpha = Math.min(1, c.life / Math.max(0.1, c.maxLife));
      ctx.strokeText(c.text, c.x, c.y);
      ctx.fillStyle = c.color;
      ctx.fillText(c.text, c.x, c.y);
    }
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}
