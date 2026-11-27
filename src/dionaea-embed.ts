/**
 * Punto de entrada listo para importar en cualquier frontend React (MERN / Vite / CRA).
 * Incluye automáticamente los estilos propios del juego (`dionaea-styles.css`) sin pisar el CSS global de tu tienda.
 *
 * Ejemplo de uso en tu app MERN:
 *   import { CarnivoraShmupGame, type GameSessionResult } from './games/dionaea-strike/dionaea-embed';
 */
import './dionaea-styles.css';

export {
  CarnivoraShmupGame,
  DEFAULT_GAME_CONFIG,
  type CarnivoraShmupGameProps,
  type GameSessionResult,
} from './components/CarnivoraShmupGame';
export {
  ALL_PET_IDS,
  ALL_SPECIES_IDS,
  PET_CATALOG,
  loadGameConfig,
  saveGameConfig,
} from './game/gameConfig';
export {
  GLOBAL_HIGHSCORE_STORAGE_KEY,
  loadGlobalHighScoreState,
  recordRunPerformance,
  resetGlobalHighScoreState,
  syncLiveHighScore,
} from './game/highScoreStore';
export type {
  GameConfig,
  GameStatus,
  GlobalHighScoreState,
  HighScoreRunEntry,
  HudSnapshot,
  LevelNumber,
  PetCatalogItem,
  PetId,
  SpeciesId,
} from './game/types';
