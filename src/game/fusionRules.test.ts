import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_GAME_CONFIG,
  STARTER_PETS,
  STARTER_SPECIES,
  cloneGameConfig,
  sanitizeGameConfig,
} from './gameConfig';
import {
  LEVEL_1_MUSIC_SRC,
  LEVEL_2_MUSIC_SRC,
  LEVEL_3_MUSIC_SRC,
  LEVEL_4_MUSIC_SRC,
  LEVEL_5_MUSIC_SRC,
  LEVEL_RHYTHM_PROFILES,
  MENU_MUSIC_SRC,
  getLevelRhythmProfile,
  getMusicTrackForState,
  soundEngine,
} from './audio';
import {
  advanceMutagenPodByShot,
  applyMutagenPickup,
  applyPalitoHeartCharm,
  BOSS_BASE_HP,
  BOSS_MECHANICS_BY_LEVEL,
  buildApexFusionPrimaryPattern,
  buildApexFusionSecondaryPattern,
  buildFusedShotPattern,
  buildPrimaryShotPattern,
  buildSecondaryShotPattern,
  calculateKillScore,
  CARPINCHO_FACON_RANGE,
  checkCircleCollision,
  checkComboMilestoneCrossed,
  clampAudioVolume,
  computeBeatSnapshot,
  computeBeatSpawnEvents,
  computeBossScaledMaxHp,
  computeEnemyBulletSpeedMult,
  computeFusedLoadout,
  computeGamepadEdges,
  computeInvasionState,
  computeLevelEnemyStats,
  computeLogicalViewport,
  computeRelativeTouchTarget,
  getAllowedMutagenSpecies,
  getApexFusionMeta,
  getComboMultiplier,
  getComboRank,
  getControlPrompts,
  getPetSpecialProfile,
  isPetUnlocked,
  PALITO_CHARM_HITS_REQUIRED,
  parseGamepadInput,
  pickFrogTongueTarget,
  resolveAbilitySlots,
  SECONDARY_ABILITY_META,
  shouldRequireLandscape,
  stepEnemyBehavior,
  stepFrogAllyPosition,
  swapAbilitySlots,
  type FrogCompanionState,
  type SimEnemyState,
} from './fusionRules';
import type { SpeciesLevels } from './types';

function makeLevels(overrides: Partial<SpeciesLevels> = {}): SpeciesLevels {
  return {
    dionaea: 1,
    drosera: 0,
    nepenthes: 0,
    utricularia: 0,
    sarracenia: 0,
    pinguicula: 0,
    heliamphora: 0,
    cephalotus: 0,
    ...overrides,
  };
}

test('max 2 active evolutions cap at Lv 4 while blocking a 3rd species and respecting unlocked species', () => {
  const levels = makeLevels();

  // Only starter species appear when only starter species are unlocked
  assert.deepEqual(
    getAllowedMutagenSpecies(levels, DEFAULT_GAME_CONFIG, STARTER_SPECIES),
    ['dionaea', 'drosera', 'nepenthes', 'utricularia']
  );

  // Attempting to pick a locked species is ignored cleanly
  const lockedAttempt = applyMutagenPickup(levels, 'sarracenia', DEFAULT_GAME_CONFIG, STARTER_SPECIES);
  assert.equal(lockedAttempt.isOvercharge, true);
  assert.equal(lockedAttempt.nextLevels.sarracenia, 0);

  // Once Sarracenia is unlocked for future runs, it becomes eligible
  const withSarracenia = [...STARTER_SPECIES, 'sarracenia'] as const;
  assert.ok(getAllowedMutagenSpecies(levels, DEFAULT_GAME_CONFIG, withSarracenia).includes('sarracenia'));

  // Pick 2nd species -> allowed, now 2/2 slots filled
  const r1 = applyMutagenPickup(levels, 'drosera', DEFAULT_GAME_CONFIG, withSarracenia);
  assert.equal(r1.newLevel, 1);
  assert.equal(r1.isOvercharge, false);

  // Allowed pod species should now restrict to the 2 active species
  assert.deepEqual(
    getAllowedMutagenSpecies(r1.nextLevels, DEFAULT_GAME_CONFIG, withSarracenia),
    ['dionaea', 'drosera']
  );

  // Attempting to unlock a 3rd species is blocked
  const blocked = applyMutagenPickup(r1.nextLevels, 'nepenthes', DEFAULT_GAME_CONFIG, withSarracenia);
  assert.equal(blocked.blockedBySlotLimit, true);
  assert.equal(blocked.nextLevels.nepenthes, 0);

  // Mixed 2-species build upgrades Drosera up to Lv 4 max, then overcharges
  const r2 = applyMutagenPickup(r1.nextLevels, 'drosera', DEFAULT_GAME_CONFIG, withSarracenia);
  const r3 = applyMutagenPickup(r2.nextLevels, 'drosera', DEFAULT_GAME_CONFIG, withSarracenia);
  const r4 = applyMutagenPickup(r3.nextLevels, 'drosera', DEFAULT_GAME_CONFIG, withSarracenia);
  assert.equal(r4.newLevel, 4);
  assert.equal(r4.unlockedSecret, false);

  const r5 = applyMutagenPickup(r4.nextLevels, 'drosera', DEFAULT_GAME_CONFIG, withSarracenia);
  assert.equal(r5.newLevel, 4);
  assert.equal(r5.isOvercharge, true);
});

test('catching all pods of the same evolution unlocks Secret Lv 5 evolution', () => {
  let levels = makeLevels();
  for (let expected = 2; expected <= 4; expected++) {
    const res = applyMutagenPickup(levels, 'dionaea', DEFAULT_GAME_CONFIG);
    assert.equal(res.newLevel, expected);
    assert.equal(res.unlockedSecret, false);
    levels = res.nextLevels;
  }

  const secret = applyMutagenPickup(levels, 'dionaea', DEFAULT_GAME_CONFIG);
  assert.equal(secret.newLevel, 5);
  assert.equal(secret.unlockedSecret, true);
  assert.equal(secret.isOvercharge, false);

  const secretLoadout = computeFusedLoadout(secret.nextLevels, DEFAULT_GAME_CONFIG);
  assert.equal(secretLoadout.secretEvolution, 'dionaea');
  assert.equal(secretLoadout.thornCount, 5);
  const secretShots = buildFusedShotPattern(secretLoadout, 2, DEFAULT_GAME_CONFIG);
  assert.equal(secretShots.filter((s) => s.kind === 'thorn').length, 5);
  assert.equal(secretShots.filter((s) => s.kind === 'snap').length, 3);
});

test('weapons start with 1 single projectile at Lv 1 and unlockable species emit distinct ballistic physics', () => {
  const startLoadout = computeFusedLoadout(makeLevels(), DEFAULT_GAME_CONFIG);
  assert.equal(startLoadout.thornCount, 1);
  const startNormalShots = buildFusedShotPattern(startLoadout, 1, DEFAULT_GAME_CONFIG);
  assert.equal(startNormalShots.length, 1, 'Dionaea Lv 1 normal shot fires exactly 1 projectile');
  const startSnapShots = buildFusedShotPattern(startLoadout, startLoadout.snapIntervalShots, DEFAULT_GAME_CONFIG);
  assert.equal(startSnapShots.length, 1, 'Dionaea Lv 1 snap tick fires exactly 1 projectile');

  const mixedLv4 = computeFusedLoadout(
    makeLevels({ dionaea: 4, drosera: 4, nepenthes: 1, utricularia: 1 }),
    DEFAULT_GAME_CONFIG
  );
  const shots = buildFusedShotPattern(mixedLv4, 6, DEFAULT_GAME_CONFIG);
  const thorns = shots.filter((s) => s.kind === 'thorn');
  const mucilage = shots.filter((s) => s.kind === 'mucilage');
  const acid = shots.filter((s) => s.kind === 'acid');
  const snap = shots.filter((s) => s.kind === 'snap');
  const vacuum = shots.filter((s) => s.kind === 'vacuum');

  assert.equal(thorns.length, 4);
  assert.equal(mucilage.length, 4);
  assert.equal(acid.length, 1);
  assert.equal(snap.length, 1);
  assert.equal(vacuum.length, 1);

  assert.ok(thorns[0].vx > 700 && thorns[0].gravity > 0, 'Thorns fly right with mild aerodynamic drop');
  assert.ok(mucilage[0].vy < -200 && mucilage[0].gravity > 400 && mucilage[0].bounces === 2, 'Drosera Lv 4 lobs double-bouncing mucilage');
  assert.ok(acid[0].gravity > 600, 'Nepenthes acid bombs have heavy dive-bomb gravity');
  assert.ok(vacuum[0].gravity < 0, 'Utricularia vacuum torpedoes drift upward via negative pressure buoyancy');

  const unlockablesLoadout = computeFusedLoadout(
    makeLevels({ sarracenia: 1, pinguicula: 1, heliamphora: 1, cephalotus: 1 }),
    DEFAULT_GAME_CONFIG
  );
  const evenTick = buildFusedShotPattern(unlockablesLoadout, 6, DEFAULT_GAME_CONFIG);
  const oddTick = buildFusedShotPattern(unlockablesLoadout, 7, DEFAULT_GAME_CONFIG);

  const trumpet = evenTick.filter((s) => s.kind === 'trumpet');
  const solarArc = evenTick.filter((s) => s.kind === 'solar_arc');
  const mortar = evenTick.filter((s) => s.kind === 'mortar');
  const crystal = oddTick.filter((s) => s.kind === 'crystal');

  assert.equal(trumpet.length, 1, 'Sarracenia Lv 1 starts with 1 accelerating rocket');
  assert.ok((trumpet[0].accelX ?? 0) > 300);
  assert.equal(crystal.length, 1, 'Pinguicula Lv 1 starts with 1 ceiling/floor bouncing crystal');
  assert.equal(crystal[0].bounceCeiling, true);
  assert.equal(solarArc.length, 1, 'Heliamphora Lv 1 starts with 1 curved solar arc');
  assert.ok(solarArc[0].gravity < 0);
  assert.equal(mortar.length, 1, 'Cephalotus Lv 1 starts with 1 fragmenting mortar');
  assert.equal(mortar[0].splitsOnHit, 2);
});

test('horizontal side-scroller arthropod AI: mosquito lunges left and hornet winds up stinger barrage', () => {
  const mosquito: SimEnemyState = {
    id: 1,
    archetype: 'mosquito',
    x: 700,
    y: 360,
    vx: 0,
    vy: 0,
    hp: 36,
    maxHp: 36,
    radius: 18,
    age: 0,
    phaseOffset: 0,
    fireTimer: 2,
    windupTimer: 0,
    windupDuration: 0,
    aimX: 0,
    aimY: 0,
    lungeState: 'track',
    lungeTimer: 0,
    shieldActive: false,
    slowTimer: 0,
    slowFactor: 0,
    mucilageHits: 0,
    rootedTimer: 0,
    acidTimer: 0,
    acidDps: 0,
    hitFlashTimer: 0,
    koTimer: 0,
    dying: false,
    orbitCenterX: 700,
    orbitCenterY: 360,
  };

  stepEnemyBehavior(mosquito, 160, 365, 0.1, 960, 720, DEFAULT_GAME_CONFIG, 2);
  assert.equal(mosquito.lungeState, 'windup', 'Mosquito transitions to windup when aligned on Y to the right of player');

  stepEnemyBehavior(mosquito, 160, 365, 0.4, 960, 720, DEFAULT_GAME_CONFIG, 2);
  assert.equal(mosquito.lungeState, 'lunge', 'Mosquito lunges leftward after windup');
  assert.ok(mosquito.vx < -200);

  const hornet: SimEnemyState = {
    ...mosquito,
    id: 2,
    archetype: 'hornet',
    x: 780,
    fireTimer: 0,
    lungeState: 'track',
  };
  const windupRes = stepEnemyBehavior(hornet, 160, 365, 0.05, 960, 720, DEFAULT_GAME_CONFIG, 2);
  assert.equal(windupRes.consumedToken, true, 'Hornet consumes attack token to begin stinger telegraph');
  const fireRes = stepEnemyBehavior(hornet, 160, 365, 0.35, 960, 720, DEFAULT_GAME_CONFIG, 2);
  assert.equal(fireRes.shouldFire, true);
  assert.equal(fireRes.fireKind, 'stinger');
});

test('enemies scale stronger per level and modifier wave drops are sparse', () => {
  const lv1 = computeLevelEnemyStats(40, 165, 1.65, 1);
  const lv5 = computeLevelEnemyStats(40, 165, 1.65, 5);
  assert.equal(lv1.hp, 40);
  assert.equal(lv1.speed, 165);
  assert.ok(lv5.hp > lv1.hp * 1.6, 'Level 5 enemies have substantially higher HP than Level 1');
  assert.ok(lv5.speed > lv1.speed, 'Level 5 enemies move faster than Level 1');
  assert.ok(lv5.fireInterval < lv1.fireInterval, 'Level 5 enemies fire more frequently than Level 1');

  const waveDrops = DEFAULT_GAME_CONFIG.waves.filter((w) => w.dropsMutagen).length;
  assert.ok(waveDrops <= 5, 'At most half of waves guarantee a mutagen modifier pod');
  assert.ok(DEFAULT_GAME_CONFIG.enemies.tank.hp >= 120);
  assert.equal(DEFAULT_GAME_CONFIG.bosses[0].maxHp, computeBossScaledMaxHp(BOSS_BASE_HP[1], 1));
});

test('frog ally follows side-scroller wingman offset and prioritizes nearby enemy projectiles', () => {
  const frog: FrogCompanionState = {
    enabled: true,
    x: 40,
    y: 400,
    vx: 0,
    vy: 0,
    tongueCooldown: 0,
    tongueTimer: 0,
    tongueTargetX: 0,
    tongueTargetY: 0,
    tongueKind: null,
    throatPuff: 0,
    bubbleTimer: 0,
  };
  stepFrogAllyPosition(frog, 200, 360, 0.5, 0.1, 960, 720);
  assert.ok(frog.x > 40 && frog.y < 400);

  const pickBullet = pickFrogTongueTarget(
    frog.x,
    frog.y,
    180,
    [{ active: true, x: frog.x + 40, y: frog.y }],
    [{ id: 7, dying: false, x: frog.x + 20, y: frog.y }]
  );
  assert.equal(pickBullet?.kind, 'bullet');

  const pickEnemy = pickFrogTongueTarget(
    frog.x,
    frog.y,
    180,
    [{ active: false, x: frog.x + 10, y: frog.y }],
    [{ id: 9, dying: false, x: frog.x + 50, y: frog.y }]
  );
  assert.equal(pickEnemy?.kind, 'enemy');
});

test('sanitizeGameConfig handles 5 levels, 15 full-song waves, Earth landscapes, miniBosses, and clamps values', () => {
  assert.equal(DEFAULT_GAME_CONFIG.waves.length, 15);
  assert.equal(DEFAULT_GAME_CONFIG.miniBosses.length, 5);
  assert.equal(DEFAULT_GAME_CONFIG.bosses.length, 5);
  assert.equal(DEFAULT_GAME_CONFIG.bosses[0].unlocksSpecies, 'sarracenia');
  assert.equal(DEFAULT_GAME_CONFIG.bosses[3].unlocksSpecies, 'cephalotus');
  assert.equal(DEFAULT_GAME_CONFIG.bosses[0].unlocksPet, 'roy');
  assert.equal(DEFAULT_GAME_CONFIG.bosses[1].unlocksPet, 'sicario');

  const edited = cloneGameConfig(DEFAULT_GAME_CONFIG);
  edited.player.mutagenCycleSec = 2.5;
  edited.player.frogAlly.tongueCooldownSec = 0.2;
  edited.bosses[4].maxHp = 50000;
  edited.miniBosses[2].maxHp = 99999;
  edited.enemies.hornet.hp = 85;
  const legacyRaw = {
    ...edited,
    waves: [
      { ...edited.waves[0], landscape: 'orbit_dawn', archetypes: ['drone', 'spider'] },
      ...edited.waves.slice(1, 14),
      { ...edited.waves[14], landscape: 'andean_zenith' },
    ],
  };
  const clean = sanitizeGameConfig(legacyRaw);
  assert.equal(clean.player.mutagenCycleSec, 2.5);
  assert.equal(clean.player.frogAlly.tongueCooldownSec, 1.0);
  assert.equal(clean.bosses[4].maxHp, 14000);
  assert.equal(clean.miniBosses[2].maxHp, 8000);
  assert.equal(clean.enemies.hornet.hp, 85);
  assert.equal(clean.waves[0].landscape, 'pampa_dawn', 'Legacy orbit_dawn migrates cleanly to terrestrial pampa_dawn');
  assert.equal(clean.waves[14].landscape, 'humahuaca_andes', 'Legacy andean_zenith migrates cleanly to humahuaca_andes');
  assert.deepEqual(clean.waves[0].archetypes, ['drone', 'hornet']);
  assert.equal(checkCircleCollision(0, 0, 10, 5, 5, 10), true);
  assert.equal(calculateKillScore(100, 8), 200);
});

test('all menu and 5 level music tracks resolve appropriately', () => {
  assert.equal(getMusicTrackForState('intro', 1), null);
  assert.equal(getMusicTrackForState('title', 1), MENU_MUSIC_SRC);
  assert.equal(getMusicTrackForState('gameover', 1), null);
  assert.equal(getMusicTrackForState('victory', 1), null);
  assert.equal(getMusicTrackForState('playing', 1), LEVEL_1_MUSIC_SRC);
  assert.equal(getMusicTrackForState('paused', 1), LEVEL_1_MUSIC_SRC);
  assert.equal(getMusicTrackForState('playing', 2), LEVEL_2_MUSIC_SRC);
  assert.equal(LEVEL_2_MUSIC_SRC, 'assets/audio/level-2-cumbia.m4a');
  assert.equal(getMusicTrackForState('playing', 3), LEVEL_3_MUSIC_SRC);
  assert.equal(getMusicTrackForState('playing', 4), LEVEL_4_MUSIC_SRC);
  assert.equal(LEVEL_4_MUSIC_SRC, 'assets/audio/level-4-cuarteto.m4a');
  assert.notEqual(LEVEL_4_MUSIC_SRC, LEVEL_1_MUSIC_SRC);
  assert.equal(getMusicTrackForState('playing', 5), LEVEL_5_MUSIC_SRC);

  for (const lv of [1, 2, 3, 4, 5] as const) {
    const prof = getLevelRhythmProfile(lv);
    assert.ok(prof.startOffsetSec >= 0 && prof.startOffsetSec <= prof.firstDropSec, `Level ${lv} startOffsetSec leads cleanly into drop`);
  }

  soundEngine.setMusicVolume(0);
  assert.equal(soundEngine.getMusicVolume(), 0);
  soundEngine.setSfxVolume(0);
  assert.equal(soundEngine.getSfxVolume(), 0);
  soundEngine.setMusicVolume(0.65);
  soundEngine.setSfxVolume(0.75);
});

test('Level 1 projectile speeds are calmer, pod shooting cycles evolutions, and locust/bomber AIs work', () => {
  const lv1Start = computeFusedLoadout(makeLevels(), DEFAULT_GAME_CONFIG);
  const lv1Thorn = buildFusedShotPattern(lv1Start, 1, DEFAULT_GAME_CONFIG)[0];
  assert.ok(lv1Thorn.vx <= 720, 'Level 1 initial thorn velocity is calmer');

  assert.ok(computeEnemyBulletSpeedMult(1) < computeEnemyBulletSpeedMult(2));
  assert.ok(computeEnemyBulletSpeedMult(2) < computeEnemyBulletSpeedMult(5));

  const pod = {
    cycleIndex: 0,
    cycleTimer: 1.5,
    cycleDuration: 4.5,
    hitCooldown: 0,
    shiftFlash: 0,
    vx: -86,
    speciesOrder: ['dionaea', 'drosera', 'nepenthes'] as const,
  };
  assert.equal(advanceMutagenPodByShot(pod), true);
  assert.equal(pod.cycleIndex, 1);
  assert.equal(pod.cycleTimer, 4.5);
  assert.ok(pod.vx > 0, 'Shooting a pod briefly knocks it rightward for easier collection');
  assert.equal(advanceMutagenPodByShot(pod), false, 'hitCooldown prevents multi-shot volleys from skipping multiple evolutions in one frame');

  const locust: SimEnemyState = {
    id: 10,
    archetype: 'locust',
    x: 720,
    y: 340,
    vx: 0,
    vy: 0,
    hp: 58,
    maxHp: 58,
    radius: 17,
    age: 0,
    phaseOffset: 0,
    fireTimer: 0,
    windupTimer: 0,
    windupDuration: 0,
    aimX: 0,
    aimY: 0,
    lungeState: 'track',
    lungeTimer: 0,
    shieldActive: false,
    slowTimer: 0,
    slowFactor: 0,
    mucilageHits: 0,
    rootedTimer: 0,
    acidTimer: 0,
    acidDps: 0,
    hitFlashTimer: 0,
    koTimer: 0,
    dying: false,
    orbitCenterX: 720,
    orbitCenterY: 340,
  };
  const locustRes = stepEnemyBehavior(locust, 160, 360, 0.05, 960, 720, DEFAULT_GAME_CONFIG, 2, 2);
  assert.ok(locust.vy < -150, 'Locust triggers upward parabolic jump impulse');
  assert.equal(locustRes.shouldFire, true);
  assert.equal(locustRes.fireKind, 'twin');

  const bomber: SimEnemyState = {
    ...locust,
    id: 11,
    archetype: 'bomber',
    fireTimer: 0,
  };
  const bWindup = stepEnemyBehavior(bomber, 160, 360, 0.05, 960, 720, DEFAULT_GAME_CONFIG, 2, 3);
  assert.equal(bWindup.consumedToken, true);
  const bFire = stepEnemyBehavior(bomber, 160, 360, 0.3, 960, 720, DEFAULT_GAME_CONFIG, 2, 3);
  assert.equal(bFire.shouldFire, true);
  assert.equal(bFire.fireKind, 'bomb');
});

test('combo multiplier scales up to x5.0 and triggers milestone overlays at streak thresholds', () => {
  assert.equal(getComboMultiplier(0), 1);
  assert.equal(getComboMultiplier(3), 1);
  assert.equal(getComboMultiplier(4), 1.5);
  assert.equal(getComboMultiplier(8), 2);
  assert.equal(getComboMultiplier(20), 3.5);
  assert.equal(getComboMultiplier(40), 5);

  assert.equal(getComboRank(1).rank, 'C');
  assert.equal(getComboRank(2).rank, 'B');
  assert.equal(getComboRank(5).rank, 'A');
  assert.equal(getComboRank(10).rank, 'S');
  assert.equal(getComboRank(20).rank, 'SS');
  assert.equal(getComboRank(35).rank, 'SSS');
  assert.equal(getComboRank(50).rank, 'APEX');

  assert.equal(checkComboMilestoneCrossed(3, 4), null);
  const m5 = checkComboMilestoneCrossed(4, 5);
  assert.equal(m5?.threshold, 5);
  assert.equal(m5?.rank, 'A');
  assert.equal(m5?.multiplier, 1.5);

  const m20 = checkComboMilestoneCrossed(19, 20);
  assert.equal(m20?.threshold, 20);
  assert.equal(m20?.rank, 'SS');
  assert.equal(m20?.multiplier, 3.5);

  const m50 = checkComboMilestoneCrossed(49, 50);
  assert.equal(m50?.rank, 'APEX');
  assert.equal(m50?.multiplier, 5);

  assert.equal(calculateKillScore(100, 32), 500);
});

test('pet system (Batricio mating call, Roy, Sicario, Palito charm, Carpincho Infernales), Boss 1-4 unlocks, and level_clear track', () => {
  assert.equal(isPetUnlocked('batricio', STARTER_PETS), true);
  assert.equal(isPetUnlocked('roy', STARTER_PETS), false);
  assert.equal(isPetUnlocked('sicario', STARTER_PETS), false);
  assert.equal(isPetUnlocked('palito', STARTER_PETS), false);
  assert.equal(isPetUnlocked('carpincho', STARTER_PETS), false);
  assert.equal(isPetUnlocked('roy', ['batricio', 'roy']), true);
  assert.equal(isPetUnlocked('sicario', ['batricio', 'roy', 'sicario']), true);
  assert.equal(isPetUnlocked('palito', ['batricio', 'palito']), true);
  assert.equal(isPetUnlocked('carpincho', ['batricio', 'carpincho']), true);

  const batricioSpec = getPetSpecialProfile('batricio', 1.2, 2);
  assert.equal(batricioSpec.kind, 'mating_call');
  assert.equal(batricioSpec.calloutText, '¡LLAMADO DE APAREAMIENTO!');
  assert.equal(batricioSpec.squadSize, 16);

  const roySpec = getPetSpecialProfile('roy', 1.2, 0);
  assert.equal(roySpec.kind, 'roy_scream');
  assert.equal(roySpec.calloutText, '¡MIAAAAAUUUU!!');
  assert.ok(roySpec.stunSec > 1.5, 'Roy horrid scream stuns enemies');
  assert.ok(roySpec.knockbackX > 40, 'Roy scream knocks enemies back');
  assert.ok(roySpec.bossDamage > 0, 'Roy scream damages active boss');

  const sicarioSpec = getPetSpecialProfile('sicario', 1.0, 0);
  assert.equal(sicarioSpec.kind, 'sicario_mafia');
  assert.equal(sicarioSpec.calloutText, '¡MAFIA GATUNA!!');
  assert.ok(sicarioSpec.durationSec >= 4.5, 'Mafia Gatuna cats stay on screen for several seconds');
  assert.equal(sicarioSpec.squadSize, 4, 'Sicario summons 4 gangster cats');

  const palitoSpec = getPetSpecialProfile('palito', 1.0, 0);
  assert.equal(palitoSpec.kind, 'palito_charm');
  assert.equal(palitoSpec.calloutText, '¡ONDA ENAMORADORA ♥!');
  assert.ok(palitoSpec.durationSec >= 4.0, 'Palito charm lasts several seconds');
  assert.ok(palitoSpec.damageRadius >= 1200, 'Palito charm wave covers entire screen');

  const carpinchoSpec = getPetSpecialProfile('carpincho', 1.0, 0);
  assert.equal(carpinchoSpec.kind, 'carpincho_infernales');
  assert.equal(carpinchoSpec.calloutText, '¡SAPUCAAAAAAIIII!!');
  assert.equal(carpinchoSpec.squadSize, 5, 'Carpincho Matero summons 5 horseback Infernales');
  assert.ok(carpinchoSpec.durationSec >= 3.0);

  assert.equal(DEFAULT_GAME_CONFIG.bosses[0].unlocksPet, 'roy');
  assert.equal(DEFAULT_GAME_CONFIG.bosses[1].unlocksPet, 'sicario');
  assert.equal(DEFAULT_GAME_CONFIG.bosses[2].unlocksPet, 'palito');
  assert.equal(DEFAULT_GAME_CONFIG.bosses[3].unlocksPet, 'carpincho');
  assert.equal(getMusicTrackForState('level_clear', 2), null);

  const enemies = DEFAULT_GAME_CONFIG.enemies;
  assert.ok(enemies.mosquito.radius < enemies.drone.radius);
  assert.ok(enemies.drone.radius < enemies.hornet.radius);
  assert.ok(enemies.hornet.radius < enemies.tank.radius);
});

test('Palito charm stops enemy firing and orbits in slow circles; Batricio frog venom deals poison DoT', () => {
  const charmedEnemy: SimEnemyState = {
    id: 50,
    archetype: 'hornet',
    x: 680,
    y: 340,
    vx: 0,
    vy: 0,
    hp: 90,
    maxHp: 90,
    radius: 20,
    age: 1,
    phaseOffset: 0,
    fireTimer: 0,
    windupTimer: 0.2,
    windupDuration: 0.3,
    aimX: 0,
    aimY: 0,
    lungeState: 'track',
    lungeTimer: 0,
    shieldActive: false,
    slowTimer: 0,
    slowFactor: 0,
    mucilageHits: 0,
    rootedTimer: 0,
    acidTimer: 0,
    acidDps: 0,
    poisonTimer: 2.0,
    poisonDps: 20,
    charmedTimer: 4.0,
    charmAnchorX: 680,
    charmAnchorY: 340,
    charmAngle: 0,
    hitFlashTimer: 0,
    koTimer: 0,
    dying: false,
    orbitCenterX: 680,
    orbitCenterY: 340,
  };

  const res = stepEnemyBehavior(charmedEnemy, 180, 340, 0.25, 960, 720, DEFAULT_GAME_CONFIG, 3, 1);
  assert.equal(res.shouldFire, false, 'Charmed enemy cannot shoot');
  assert.equal(charmedEnemy.windupTimer, 0, 'Charmed enemy cancels telegraph windup');
  assert.ok((charmedEnemy.charmAngle ?? 0) > 0, 'Charmed enemy advances circular dreamy orbit angle');
  assert.ok(charmedEnemy.hp < 90, 'Poisoned enemy suffers venom DoT damage');
});

test('getControlPrompts dynamically switches all prompts to Xbox controller layout when gamepad is connected', () => {
  const kb = getControlPrompts(false);
  assert.equal(kb.mode, 'keyboard');
  assert.equal(kb.secondaryShort, 'E');
  assert.equal(kb.swapShort, 'Q');
  assert.equal(kb.specialShort, 'Esp');

  const xbox = getControlPrompts(true);
  assert.equal(xbox.mode, 'xbox');
  assert.equal(xbox.move, 'LS / Cruceta');
  assert.equal(xbox.secondaryShort, 'A / RT');
  assert.equal(xbox.swapShort, 'X / LB');
  assert.equal(xbox.specialShort, 'B / LT');
  assert.equal(xbox.pauseShort, 'Menú ☰');
  assert.ok(xbox.footerSummary.includes('Control Xbox'));
});

test('rhythm-synced enemy spawning aligns to each level song BPM and audio volume clamps cleanly', () => {
  assert.equal(clampAudioVolume(-0.4), 0);
  assert.equal(clampAudioVolume(1.8), 1);
  assert.equal(clampAudioVolume(0.65), 0.65);
  assert.equal(clampAudioVolume(Number.NaN), 0.7);

  for (const level of [1, 2, 3, 4, 5] as const) {
    const profile = getLevelRhythmProfile(level);
    assert.equal(profile.bpm, LEVEL_RHYTHM_PROFILES[level].bpm);
    assert.ok(profile.bpm >= 95 && profile.bpm <= 150);

    const beforeDrop = computeBeatSnapshot(profile.firstDropSec - 0.05, profile.bpm, profile.firstDropSec);
    assert.equal(beforeDrop.beatIndex, -1);

    const onDownbeat = computeBeatSnapshot(profile.firstDropSec + 0.001, profile.bpm, profile.firstDropSec);
    assert.equal(onDownbeat.beatIndex, 0);
    assert.equal(onDownbeat.isDownbeat, true);
    assert.ok(onDownbeat.beatPulse > 0.9);

    const beatDur = 60 / profile.bpm;
    const spawnEvt = computeBeatSpawnEvents(
      profile.firstDropSec + beatDur * 1.9,
      profile.firstDropSec + beatDur * 2.1,
      profile.bpm,
      profile.firstDropSec,
      2
    );
    assert.equal(spawnEvt.count, 1, `Level ${level} emits 1 enemy spawn on 2-beat boundary`);
  }
});

test('computeLogicalViewport maintains uniform playable proportions across mobile portrait, landscape, tablet, desktop, and ultrawide', () => {
  const mobilePortrait = computeLogicalViewport(360, 640);
  assert.ok(mobilePortrait.logicalWidth >= 600, 'Portrait phone keeps >= 600 logical width for fair bullet dodging');
  assert.ok(mobilePortrait.scale < 1);

  const mobileLandscape = computeLogicalViewport(844, 390);
  assert.ok(mobileLandscape.logicalHeight >= 550, 'Short landscape phone never clips vertical playfield');
  assert.ok(mobileLandscape.logicalWidth >= 1100);

  const tablet = computeLogicalViewport(768, 1024);
  assert.equal(tablet.scale, 1);
  assert.equal(tablet.logicalWidth, 768);
  assert.equal(tablet.logicalHeight, 1024);

  const hd = computeLogicalViewport(1280, 720);
  assert.equal(hd.scale, 1);
  assert.equal(hd.logicalWidth, 1280);
  assert.equal(hd.logicalHeight, 720);

  const fhd = computeLogicalViewport(1920, 1080);
  assert.equal(fhd.scale, 1.5);
  assert.equal(fhd.logicalWidth, 1280);
  assert.equal(fhd.logicalHeight, 720);

  const ultrawide = computeLogicalViewport(2560, 1080);
  assert.equal(ultrawide.scale, 1.5);
  assert.ok(ultrawide.logicalWidth > 1600);
  assert.equal(ultrawide.logicalHeight, 720);
});

test('dual-mode rotating abilities: all 8 species have distinct Primary auto and Secondary manual physics + clean slot swap', () => {
  // Single species active -> both slots default to dionaea so manual secondary is usable immediately
  const oneSlot = resolveAbilitySlots(makeLevels({ dionaea: 1 }), 'dionaea', 'dionaea');
  assert.equal(oneSlot.primary, 'dionaea');
  assert.equal(oneSlot.secondary, 'dionaea');
  assert.equal(oneSlot.canSwap, false);
  assert.equal(swapAbilitySlots(makeLevels({ dionaea: 1 }), 'dionaea', 'dionaea').canSwap, false);

  // Two species active -> swap flips Primary <-> Secondary cleanly
  const twoLevels = makeLevels({ dionaea: 2, drosera: 1 });
  const resolvedTwo = resolveAbilitySlots(twoLevels, 'dionaea', 'drosera');
  assert.equal(resolvedTwo.canSwap, true);
  assert.equal(resolvedTwo.primary, 'dionaea');
  assert.equal(resolvedTwo.secondary, 'drosera');

  const swapped = swapAbilitySlots(twoLevels, 'dionaea', 'drosera');
  assert.equal(swapped.canSwap, true);
  assert.equal(swapped.primary, 'drosera');
  assert.equal(swapped.secondary, 'dionaea');

  // Every single species has distinct Primary Auto vs Manual Secondary projectile kinds & power
  const expectedSecondaryKinds = {
    dionaea: 'jaw_guillotine',
    drosera: 'sticky_bola',
    nepenthes: 'mega_acid',
    utricularia: 'singularity',
    sarracenia: 'supersonic_rocket',
    pinguicula: 'prism_crystal',
    heliamphora: 'solar_helix',
    cephalotus: 'cluster_bomb',
  } as const;

  for (const spId of Object.keys(expectedSecondaryKinds) as Array<keyof typeof expectedSecondaryKinds>) {
    const lv = makeLevels({ dionaea: 0, [spId]: 2 });
    const pri = buildPrimaryShotPattern(spId, lv, 1, DEFAULT_GAME_CONFIG);
    const sec = buildSecondaryShotPattern(spId, lv, DEFAULT_GAME_CONFIG);
    assert.ok(pri.length >= 1, `${spId} primary fires at least 1 projectile`);
    assert.ok(sec.length >= 1, `${spId} secondary fires at least 1 manual projectile`);
    assert.equal(sec[0].kind, expectedSecondaryKinds[spId], `${spId} secondary uses bespoke projectile kind`);
    assert.equal(sec[0].isSecondary, true);
    assert.notEqual(pri[0].kind, sec[0].kind, `${spId} primary and secondary have distinct modes`);
    assert.ok(SECONDARY_ABILITY_META[spId].cooldownSec >= 1.1);
  }
});

test('approaching invasion state escalates cleanly across waves, mini-boss, and final boss', () => {
  const early = computeInvasionState(1, 1, 3, 0.1, false, false);
  const mid = computeInvasionState(1, 2, 3, 0.5, false, false);
  const mini = computeInvasionState(1, 2, 3, 0.9, true, true);
  const finalBoss = computeInvasionState(1, 3, 3, 1, true, false);

  assert.ok(early.intensity < mid.intensity);
  assert.ok(mid.intensity < mini.intensity);
  assert.ok(mini.intensity <= finalBoss.intensity);
  assert.equal(finalBoss.stage, 3);
  assert.ok(finalBoss.alertLabel && finalBoss.alertLabel.length > 0);
});

test('gamepad input mapping handles stick deadzone, D-pad override, buttons, and rising-edge triggers', () => {
  const idle = parseGamepadInput(
    [0.05, -0.08],
    Array.from({ length: 16 }, () => ({ pressed: false, value: 0 }))
  );
  assert.equal(idle.moveX, 0);
  assert.equal(idle.moveY, 0);

  const buttons = Array.from({ length: 16 }, () => ({ pressed: false, value: 0 }));
  buttons[0] = { pressed: true, value: 1 }; // A -> secondary + confirm
  buttons[2] = { pressed: true, value: 1 }; // X -> swap
  buttons[1] = { pressed: true, value: 1 }; // B -> pet special
  buttons[9] = { pressed: true, value: 1 }; // Start -> pause
  buttons[12] = { pressed: true, value: 1 }; // D-Pad Up
  buttons[15] = { pressed: true, value: 1 }; // D-Pad Right

  const active = parseGamepadInput([0, 0], buttons);
  assert.ok(active.moveX > 0.6 && active.moveX < 0.8, 'Diagonal D-Pad is normalized');
  assert.ok(active.moveY < -0.6 && active.moveY > -0.8);
  assert.equal(active.fireSecondary, true);
  assert.equal(active.swapAbility, true);
  assert.equal(active.triggerSpecial, true);
  assert.equal(active.pause, true);

  const rising = computeGamepadEdges(idle, active);
  assert.equal(rising.fireSecondaryPressed, true);
  assert.equal(rising.swapAbilityPressed, true);
  assert.equal(rising.triggerSpecialPressed, true);
  assert.equal(rising.pausePressed, true);

  const held = computeGamepadEdges(active, active);
  assert.equal(held.fireSecondaryPressed, false, 'Holding button does not re-trigger rising edge');
  assert.equal(held.swapAbilityPressed, false);
});

test('shouldRequireLandscape enforces landscape on portrait phones/tablets and relative touch drag tracks deltas cleanly', () => {
  assert.equal(shouldRequireLandscape(390, 844, true), true);
  assert.equal(shouldRequireLandscape(390, 844, false), true);
  assert.equal(shouldRequireLandscape(844, 390, true), false);
  assert.equal(shouldRequireLandscape(768, 1024, true), true);
  assert.equal(shouldRequireLandscape(1024, 768, true), false);
  assert.equal(shouldRequireLandscape(1280, 720, false), false);
  assert.equal(shouldRequireLandscape(800, 900, false), false);

  const samePos = computeRelativeTouchTarget(160, 360, 220, 400, 220, 400, 1.15);
  assert.deepEqual(samePos, { x: 160, y: 360 });

  const moved = computeRelativeTouchTarget(160, 360, 200, 400, 300, 340, 1.2);
  assert.equal(Math.round(moved.x), 280);
  assert.equal(Math.round(moved.y), 288);
});

test('Palito slow-charming hearts, Carpincho extended facón range, slower base attack, Dual Lv.4 Super Saiyan Fusion & 5 Xeno Bosses', () => {
  // 1. Palito slow-charming heart buildup
  const heartVictim: SimEnemyState = {
    id: 91,
    archetype: 'drone',
    x: 700,
    y: 350,
    vx: -140,
    vy: 0,
    hp: 100,
    maxHp: 100,
    radius: 19,
    age: 0.5,
    phaseOffset: 0,
    fireTimer: 1,
    windupTimer: 0,
    windupDuration: 0,
    aimX: 0,
    aimY: 0,
    lungeState: 'track',
    lungeTimer: 0,
    shieldActive: false,
    slowTimer: 0,
    slowFactor: 0,
    mucilageHits: 0,
    rootedTimer: 0,
    acidTimer: 0,
    acidDps: 0,
    hitFlashTimer: 0,
    koTimer: 0,
    dying: false,
    orbitCenterX: 700,
    orbitCenterY: 350,
  };
  for (let hit = 1; hit < PALITO_CHARM_HITS_REQUIRED; hit++) {
    const partial = applyPalitoHeartCharm(heartVictim);
    assert.equal(partial.charmed, false, `Hit ${hit} builds love slowly without instant full charm`);
    assert.ok(heartVictim.slowTimer > 0 && heartVictim.slowFactor > 0.2);
  }
  const fullCharm = applyPalitoHeartCharm(heartVictim);
  assert.equal(fullCharm.charmed, true, 'Reaching threshold charms enemy completely');
  assert.ok((heartVictim.charmedTimer ?? 0) > 2.5);

  // 2. Carpincho facón expanded melee range
  assert.ok(CARPINCHO_FACON_RANGE >= 240, 'Carpincho facón melee range is substantially increased');

  // 3. Slower initial attack speed at Lv.1
  assert.ok(DEFAULT_GAME_CONFIG.player.baseFireInterval >= 0.25, 'Initial base attack interval is slower');
  const lv1Loadout = computeFusedLoadout(makeLevels({ dionaea: 1 }), DEFAULT_GAME_CONFIG);
  assert.equal(lv1Loadout.isSuperSaiyanFusion, false);
  assert.ok(lv1Loadout.fireInterval >= 0.25);

  // 4. Dual Max-Level (Lv.4 + Lv.4) Apex Fusion + Super Saiyan mode (auto + manual triggers!)
  const apexLevels = makeLevels({ dionaea: 4, nepenthes: 4 });
  const apexLoadout = computeFusedLoadout(apexLevels, DEFAULT_GAME_CONFIG);
  assert.equal(apexLoadout.isSuperSaiyanFusion, true);
  assert.deepEqual(apexLoadout.fusedPair, ['dionaea', 'nepenthes']);

  const meta = getApexFusionMeta('dionaea', 'nepenthes', DEFAULT_GAME_CONFIG);
  assert.ok(meta.autoName.length > 0 && meta.manualName.length > 0);

  const autoShots = buildApexFusionPrimaryPattern('dionaea', 'nepenthes', apexLevels, 3, DEFAULT_GAME_CONFIG);
  assert.ok(autoShots.length >= 3);
  assert.equal(autoShots[0].kind, 'apex_fusion_auto');
  assert.ok(autoShots.some((s) => s.acidDps > 0 && s.armorPierce), 'Auto shot fuses acid + armor pierce traits');

  const manualShots = buildApexFusionSecondaryPattern('dionaea', 'nepenthes', apexLevels, DEFAULT_GAME_CONFIG);
  assert.ok(manualShots.length >= 3);
  assert.equal(manualShots[0].kind, 'apex_fusion_manual');
  assert.equal(manualShots[0].isSecondary, true);
  assert.ok(manualShots[0].clearsEnemyBullets && manualShots[0].acidDps > 0, 'Manual shot fuses both Ult traits');

  // 5. Customized Horror+Anime+Xenomorph Bosses: exact x mechanics and HP * x/2 scaling
  const expectedBossNames = ['TRILOBITES', 'MARIQUITA', 'AVISPA', 'MANTIS', 'ESCORPIÓN'] as const;
  for (const lv of [1, 2, 3, 4, 5] as const) {
    const cfg = DEFAULT_GAME_CONFIG.bosses[lv - 1];
    assert.ok(cfg.name.includes(expectedBossNames[lv - 1]), `Level ${lv} boss is ${expectedBossNames[lv - 1]}`);
    assert.equal(cfg.maxHp, computeBossScaledMaxHp(BOSS_BASE_HP[lv], lv), `Level ${lv} boss HP uses x/2 multiplier`);
    assert.equal(BOSS_MECHANICS_BY_LEVEL[lv].length, lv, `Level ${lv} boss defines exact ${lv} mechanics`);
    if (lv > 1) {
      const prev = DEFAULT_GAME_CONFIG.bosses[lv - 2];
      assert.ok(cfg.maxHp > prev.maxHp && cfg.speed > prev.speed && cfg.fireInterval < prev.fireInterval);
    }
  }

  // 6. Headless-safe celebratory anime theme & transform SFX hooks
  soundEngine.playBossClearAnimeTheme();
  soundEngine.playPortalOpen();
  soundEngine.playSuperSaiyanTransform();
});





