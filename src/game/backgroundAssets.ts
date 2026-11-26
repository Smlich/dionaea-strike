import type { LandscapeId } from './types';
import bgPampaDawn from '../assets/images/bg_level1_pampa_dawn_1795680228068.jpg';
import bgJungleFalls from '../assets/images/bg_level2_jungle_falls_1795680229742.jpg';
import bgCityNight from '../assets/images/bg_level3_buenos_aires_night_1795680231005.jpg';
import bgUrbanViaduct from '../assets/images/bg_level4_urban_viaduct_1795680233413.jpg';
import bgHumahuacaAndes from '../assets/images/bg_level5_humahuaca_andes_1795680234321.jpg';

export const STAGE_BACKGROUND_URLS: Record<LandscapeId, string> = {
  pampa_dawn: bgPampaDawn,
  jungle_falls: bgJungleFalls,
  city_night: bgCityNight,
  urban_viaduct: bgUrbanViaduct,
  humahuaca_andes: bgHumahuacaAndes,
};

interface CachedBackdropImage {
  img: HTMLImageElement;
  ready: boolean;
  failed: boolean;
}

const backdropCache: Partial<Record<LandscapeId, CachedBackdropImage>> = {};

function ensureLoaded(landscape: LandscapeId): CachedBackdropImage | null {
  if (typeof window === 'undefined' || typeof Image === 'undefined') {
    return null;
  }
  const existing = backdropCache[landscape];
  if (existing) return existing;

  const img = new Image();
  img.decoding = 'async';
  img.referrerPolicy = 'no-referrer';
  const entry: CachedBackdropImage = { img, ready: false, failed: false };
  backdropCache[landscape] = entry;

  img.onload = () => {
    entry.ready = img.naturalWidth > 0 && img.naturalHeight > 0;
  };
  img.onerror = () => {
    entry.failed = true;
    entry.ready = false;
  };
  img.src = STAGE_BACKGROUND_URLS[landscape];
  return entry;
}

/**
 * Precarga las 5 ilustraciones de fondo terrestres para transiciones fluidas sin cortes.
 */
export function preloadStageBackgrounds(): void {
  if (typeof window === 'undefined') return;
  (Object.keys(STAGE_BACKGROUND_URLS) as LandscapeId[]).forEach((id) => {
    ensureLoaded(id);
  });
}

/**
 * Devuelve la imagen HTML cargada y lista para dibujar en Canvas 2D (o null si aún decodifica).
 */
export function getStageBackgroundImage(landscape: LandscapeId): HTMLImageElement | null {
  const entry = ensureLoaded(landscape);
  if (!entry || !entry.ready || entry.failed) return null;
  return entry.img;
}
