import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GLOBAL_HIGHSCORE_STORAGE_KEY,
  LEGACY_HIGHSCORE_STORAGE_KEY,
  MAX_TOP_RUNS,
  loadGlobalHighScoreState,
  recordRunPerformance,
  resetGlobalHighScoreState,
  syncLiveHighScore,
  type StorageLike,
} from './highScoreStore';

function createMemoryStorage(initial: Record<string, string> = {}): StorageLike & { data: Map<string, string> } {
  const data = new Map<string, string>(Object.entries(initial));
  return {
    data,
    getItem(key: string) {
      return data.has(key) ? data.get(key)! : null;
    },
    setItem(key: string, value: string) {
      data.set(key, value);
    },
    removeItem(key: string) {
      data.delete(key);
    },
  };
}

test('loads clean default state and migrates legacy v2 high score seamlessly', () => {
  const emptyStorage = createMemoryStorage();
  const initial = loadGlobalHighScoreState(emptyStorage);
  assert.equal(initial.bestScore, 0);
  assert.equal(initial.topRuns.length, 0);
  assert.equal(initial.highestLevel, 1);

  const legacyStorage = createMemoryStorage({ [LEGACY_HIGHSCORE_STORAGE_KEY]: '4850' });
  const migrated = loadGlobalHighScoreState(legacyStorage);
  assert.equal(migrated.bestScore, 4850);
  assert.equal(migrated.topRuns.length, 0);
});

test('recovers safely from corrupted JSON in localStorage without losing legacy score', () => {
  const corruptStorage = createMemoryStorage({
    [GLOBAL_HIGHSCORE_STORAGE_KEY]: '{broken-json',
    [LEGACY_HIGHSCORE_STORAGE_KEY]: '1200',
  });
  const recovered = loadGlobalHighScoreState(corruptStorage);
  assert.equal(recovered.bestScore, 1200);
  assert.deepEqual(recovered.topRuns, []);
});

test('recordRunPerformance persists best score, stats, and sorted Top 5 runs across sessions', () => {
  const storage = createMemoryStorage();

  const r1 = recordRunPerformance(
    {
      score: 2400,
      maxCombo: 12,
      levelReached: 2,
      victory: false,
      petId: 'batricio',
      enemiesDefeated: 18,
      elapsedSec: 74,
      achievedAt: '2026-11-26T10:00:00.000Z',
    },
    storage
  );
  assert.equal(r1.isNewBestScore, true);
  assert.equal(r1.rankIndex, 0);
  assert.equal(r1.state.bestScore, 2400);
  assert.equal(r1.state.totalRuns, 1);
  assert.equal(storage.getItem(LEGACY_HIGHSCORE_STORAGE_KEY), '2400');

  const r2 = recordRunPerformance(
    {
      score: 6800,
      maxCombo: 28,
      levelReached: 5,
      victory: true,
      petId: 'carpincho',
      enemiesDefeated: 64,
      elapsedSec: 310,
      achievedAt: '2026-11-26T10:15:00.000Z',
    },
    storage
  );
  assert.equal(r2.isNewBestScore, true);
  assert.equal(r2.rankIndex, 0);
  assert.equal(r2.state.bestScore, 6800);
  assert.equal(r2.state.bestCombo, 28);
  assert.equal(r2.state.highestLevel, 5);
  assert.equal(r2.state.totalVictories, 1);
  assert.equal(r2.state.bestRun?.petId, 'carpincho');

  // Add 5 more lower-scoring runs to confirm Top 5 cap and descending sort
  const extraScores = [1500, 3200, 5100, 900, 4200];
  extraScores.forEach((score, i) => {
    recordRunPerformance(
      {
        score,
        maxCombo: 5 + i,
        levelReached: 3,
        victory: false,
        petId: 'roy',
        enemiesDefeated: 10 + i,
        elapsedSec: 60 + i,
        achievedAt: `2026-11-26T10:2${i}:00.000Z`,
      },
      storage
    );
  });

  // Simulate reloading a brand new game session from localStorage
  const reloaded = loadGlobalHighScoreState(storage);
  assert.equal(reloaded.bestScore, 6800);
  assert.equal(reloaded.totalRuns, 7);
  assert.equal(reloaded.topRuns.length, MAX_TOP_RUNS);
  assert.deepEqual(
    reloaded.topRuns.map((r) => r.score),
    [6800, 5100, 4200, 3200, 2400]
  );
});

test('syncLiveHighScore persists mid-run record breakthroughs immediately and resets cleanly', () => {
  const storage = createMemoryStorage();
  const s1 = syncLiveHighScore(1350, 9, 2, storage, '2026-11-26T11:00:00.000Z');
  assert.equal(s1.brokeRecord, true);
  assert.equal(s1.bestScore, 1350);

  // Lower score does not overwrite high score
  const s2 = syncLiveHighScore(800, 4, 1, storage, '2026-11-26T11:01:00.000Z');
  assert.equal(s2.brokeRecord, false);
  assert.equal(s2.bestScore, 1350);

  // Reloading preserves mid-run breakthrough even before game over
  const persisted = loadGlobalHighScoreState(storage);
  assert.equal(persisted.bestScore, 1350);
  assert.equal(persisted.bestCombo, 9);
  assert.equal(persisted.highestLevel, 2);

  // Reset clears both global and legacy keys
  const cleared = resetGlobalHighScoreState(storage);
  assert.equal(cleared.bestScore, 0);
  assert.equal(cleared.topRuns.length, 0);
  assert.equal(loadGlobalHighScoreState(storage).bestScore, 0);
});
