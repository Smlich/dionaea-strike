/**
 * Punto de entrada listo para importar en cualquier frontend React (MERN / Vite / CRA).
 *
 * Ejemplo de uso en tu app MERN:
 *   import { CarnivoraShmupGame, type GameSessionResult } from './games/dionaea-strike/dionaea-embed';
 */
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
export type {
  GameConfig,
  GameStatus,
  HudSnapshot,
  LevelNumber,
  PetCatalogItem,
  PetId,
  SpeciesId,
} from './game/types';
