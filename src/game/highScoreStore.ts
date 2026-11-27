import type { GlobalHighScoreState, HighScoreRunEntry, LevelNumber, PetId } from './types';

export const GLOBAL_HIGHSCORE_STORAGE_KEY = 'dionaea_strike_global_records_v1';
export const LEGACY_HIGHSCORE_STORAGE_KEY = 'dionaea_strike_highscore_v2';
export const MAX_TOP_RUNS = 5;

const VALID_PET_IDS: readonly PetId[] = ['batricio', 'roy', 'sicario', 'palito', 'carpincho'];

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
}

export interface RecordRunInput {
  score: number;
  maxCombo: number;
  levelReached: LevelNumber;
  victory: boolean;
  petId: PetId;
  enemiesDefeated: number;
  elapsedSec: number;
  achievedAt?: string;
}

export interface RecordRunOutcome {
  state: GlobalHighScoreState;
  entry: HighScoreRunEntry | null;
  isNewBestScore: boolean;
  rankIndex: number; // 0-based index in topRuns, or -1 if not in topRuns
}

function getDefaultStorage(): StorageLike | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function createEmptyGlobalHighScoreState(): GlobalHighScoreState {
  return {
    bestScore: 0,
    bestCombo: 0,
    highestLevel: 1,
    totalVictories: 0,
    totalRuns: 0,
    bestRun: null,
    topRuns: [],
    updatedAt: null,
  };
}

function clampNonNegInt(val: unknown, fallback = 0): number {
  if (typeof val !== 'number' || !Number.isFinite(val)) return fallback;
  return Math.max(0, Math.round(val));
}

function normalizeLevel(val: unknown): LevelNumber {
  if (val === 1 || val === 2 || val === 3 || val === 4 || val === 5) return val;
  if (typeof val === 'number' && Number.isFinite(val)) {
    const clamped = Math.max(1, Math.min(5, Math.round(val)));
    return clamped as LevelNumber;
  }
  return 1;
}

function normalizePetId(val: unknown): PetId {
  if (typeof val === 'string' && VALID_PET_IDS.includes(val as PetId)) {
    return val as PetId;
  }
  return 'batricio';
}

function sanitizeRunEntry(raw: unknown, fallbackIdx = 0): HighScoreRunEntry | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Partial<HighScoreRunEntry>;
  const score = clampNonNegInt(r.score, -1);
  if (score <= 0) return null;
  const achievedAt =
    typeof r.achievedAt === 'string' && r.achievedAt.trim().length > 0
      ? r.achievedAt
      : new Date(0).toISOString();
  const id =
    typeof r.id === 'string' && r.id.trim().length > 0
      ? r.id
      : `run_${score}_${fallbackIdx}`;

  return {
    id,
    score,
    maxCombo: clampNonNegInt(r.maxCombo, 0),
    levelReached: normalizeLevel(r.levelReached),
    victory: Boolean(r.victory),
    petId: normalizePetId(r.petId),
    enemiesDefeated: clampNonNegInt(r.enemiesDefeated, 0),
    elapsedSec: clampNonNegInt(r.elapsedSec, 0),
    achievedAt,
  };
}

export function compareRunEntries(a: HighScoreRunEntry, b: HighScoreRunEntry): number {
  if (b.score !== a.score) return b.score - a.score;
  if (b.victory !== a.victory) return b.victory ? 1 : -1;
  if (b.levelReached !== a.levelReached) return b.levelReached - a.levelReached;
  if (b.maxCombo !== a.maxCombo) return b.maxCombo - a.maxCombo;
  return b.achievedAt.localeCompare(a.achievedAt);
}

export function sanitizeGlobalHighScoreState(raw: unknown, legacyScore = 0): GlobalHighScoreState {
  const cleanLegacy = clampNonNegInt(legacyScore, 0);
  if (!raw || typeof raw !== 'object') {
    const empty = createEmptyGlobalHighScoreState();
    if (cleanLegacy > 0) {
      empty.bestScore = cleanLegacy;
    }
    return empty;
  }

  const input = raw as Partial<GlobalHighScoreState>;
  const rawRuns = Array.isArray(input.topRuns) ? input.topRuns : [];
  const validRuns = rawRuns
    .map((entry, idx) => sanitizeRunEntry(entry, idx))
    .filter((entry): entry is HighScoreRunEntry => entry !== null)
    .sort(compareRunEntries)
    .slice(0, MAX_TOP_RUNS);

  const sanitizedBestRun = sanitizeRunEntry(input.bestRun, 999);
  const topRunBest = validRuns[0] ?? null;
  const bestRun =
    sanitizedBestRun && topRunBest
      ? compareRunEntries(sanitizedBestRun, topRunBest) <= 0
        ? sanitizedBestRun
        : topRunBest
      : sanitizedBestRun ?? topRunBest;

  const bestScore = Math.max(
    cleanLegacy,
    clampNonNegInt(input.bestScore, 0),
    bestRun?.score ?? 0,
    topRunBest?.score ?? 0
  );

  const bestCombo = Math.max(
    clampNonNegInt(input.bestCombo, 0),
    bestRun?.maxCombo ?? 0,
    ...validRuns.map((r) => r.maxCombo)
  );

  const highestLevel = normalizeLevel(
    Math.max(
      normalizeLevel(input.highestLevel),
      bestRun?.levelReached ?? 1,
      ...validRuns.map((r) => r.levelReached)
    )
  );

  const totalVictories = Math.max(
    clampNonNegInt(input.totalVictories, 0),
    validRuns.filter((r) => r.victory).length
  );

  const totalRuns = Math.max(clampNonNegInt(input.totalRuns, 0), validRuns.length);

  return {
    bestScore,
    bestCombo,
    highestLevel,
    totalVictories,
    totalRuns,
    bestRun,
    topRuns: validRuns,
    updatedAt: typeof input.updatedAt === 'string' ? input.updatedAt : null,
  };
}

function readLegacyHighScore(storage: StorageLike | null): number {
  if (!storage) return 0;
  try {
    const raw = storage.getItem(LEGACY_HIGHSCORE_STORAGE_KEY);
    if (!raw) return 0;
    return clampNonNegInt(Number(raw), 0);
  } catch {
    return 0;
  }
}

export function loadGlobalHighScoreState(storage: StorageLike | null = getDefaultStorage()): GlobalHighScoreState {
  if (!storage) return createEmptyGlobalHighScoreState();
  const legacyScore = readLegacyHighScore(storage);
  try {
    const raw = storage.getItem(GLOBAL_HIGHSCORE_STORAGE_KEY);
    if (!raw) {
      const migrated = createEmptyGlobalHighScoreState();
      migrated.bestScore = legacyScore;
      return migrated;
    }
    return sanitizeGlobalHighScoreState(JSON.parse(raw), legacyScore);
  } catch {
    const fallback = createEmptyGlobalHighScoreState();
    fallback.bestScore = legacyScore;
    return fallback;
  }
}

export function saveGlobalHighScoreState(
  state: GlobalHighScoreState,
  storage: StorageLike | null = getDefaultStorage()
): GlobalHighScoreState {
  const clean = sanitizeGlobalHighScoreState(state, 0);
  if (storage) {
    try {
      storage.setItem(GLOBAL_HIGHSCORE_STORAGE_KEY, JSON.stringify(clean));
      storage.setItem(LEGACY_HIGHSCORE_STORAGE_KEY, String(clean.bestScore));
    } catch {
      // Ignore storage quota or private-mode errors
    }
  }
  return clean;
}

/**
 * Updates the persisted global high score live during an active run when the player
 * surpasses their previous best score, ensuring progress survives reloads or tab closure.
 */
export function syncLiveHighScore(
  currentScore: number,
  currentCombo = 0,
  currentLevel: LevelNumber = 1,
  storage: StorageLike | null = getDefaultStorage(),
  nowIso: string = new Date().toISOString()
): { bestScore: number; brokeRecord: boolean; state: GlobalHighScoreState } {
  const cleanScore = clampNonNegInt(currentScore, 0);
  const cleanCombo = clampNonNegInt(currentCombo, 0);
  const cleanLevel = normalizeLevel(currentLevel);
  const prev = loadGlobalHighScoreState(storage);

  const brokeRecord = cleanScore > prev.bestScore;
  const comboImproved = cleanCombo > prev.bestCombo;
  const levelImproved = cleanLevel > prev.highestLevel;

  if (!brokeRecord && !comboImproved && !levelImproved) {
    return { bestScore: prev.bestScore, brokeRecord: false, state: prev };
  }

  const next: GlobalHighScoreState = {
    ...prev,
    bestScore: Math.max(prev.bestScore, cleanScore),
    bestCombo: Math.max(prev.bestCombo, cleanCombo),
    highestLevel: Math.max(prev.highestLevel, cleanLevel) as LevelNumber,
    updatedAt: nowIso,
  };
  const saved = saveGlobalHighScoreState(next, storage);
  return { bestScore: saved.bestScore, brokeRecord, state: saved };
}

/**
 * Records a completed (or restarted with points) session into the global high score
 * store, updating all-time bests and maintaining the sorted Top 5 leaderboard.
 */
export function recordRunPerformance(
  run: RecordRunInput,
  storage: StorageLike | null = getDefaultStorage()
): RecordRunOutcome {
  const prev = loadGlobalHighScoreState(storage);
  const cleanScore = clampNonNegInt(run.score, 0);
  const cleanCombo = clampNonNegInt(run.maxCombo, 0);
  const cleanLevel = normalizeLevel(run.levelReached);
  const nowIso = run.achievedAt ?? new Date().toISOString();

  if (cleanScore <= 0 && !run.victory) {
    return {
      state: prev,
      entry: null,
      isNewBestScore: false,
      rankIndex: -1,
    };
  }

  const entry: HighScoreRunEntry = {
    id: `run_${Date.parse(nowIso) || Date.now()}_${cleanScore}_${Math.floor(Math.random() * 10000)}`,
    score: cleanScore,
    maxCombo: cleanCombo,
    levelReached: cleanLevel,
    victory: Boolean(run.victory),
    petId: normalizePetId(run.petId),
    enemiesDefeated: clampNonNegInt(run.enemiesDefeated, 0),
    elapsedSec: clampNonNegInt(run.elapsedSec, 0),
    achievedAt: nowIso,
  };

  const isNewBestScore = cleanScore > prev.bestScore;
  const mergedRuns = [...prev.topRuns, entry].sort(compareRunEntries).slice(0, MAX_TOP_RUNS);
  const rankIndex = mergedRuns.findIndex((r) => r.id === entry.id);

  const nextBestRun =
    !prev.bestRun || compareRunEntries(entry, prev.bestRun) < 0 ? entry : prev.bestRun;

  const nextState: GlobalHighScoreState = {
    bestScore: Math.max(prev.bestScore, cleanScore),
    bestCombo: Math.max(prev.bestCombo, cleanCombo),
    highestLevel: Math.max(prev.highestLevel, cleanLevel) as LevelNumber,
    totalVictories: prev.totalVictories + (entry.victory ? 1 : 0),
    totalRuns: prev.totalRuns + 1,
    bestRun: nextBestRun,
    topRuns: mergedRuns,
    updatedAt: nowIso,
  };

  const saved = saveGlobalHighScoreState(nextState, storage);
  return {
    state: saved,
    entry,
    isNewBestScore,
    rankIndex,
  };
}

export function resetGlobalHighScoreState(
  storage: StorageLike | null = getDefaultStorage()
): GlobalHighScoreState {
  const empty = createEmptyGlobalHighScoreState();
  if (storage) {
    try {
      if (storage.removeItem) {
        storage.removeItem(GLOBAL_HIGHSCORE_STORAGE_KEY);
        storage.removeItem(LEGACY_HIGHSCORE_STORAGE_KEY);
      } else {
        storage.setItem(GLOBAL_HIGHSCORE_STORAGE_KEY, JSON.stringify(empty));
        storage.setItem(LEGACY_HIGHSCORE_STORAGE_KEY, '0');
      }
    } catch {
      // Ignore storage errors
    }
  }
  return empty;
}
