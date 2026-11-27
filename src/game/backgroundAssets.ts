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

export interface SeamlessStageBackground {
  source: CanvasImageSource;
  width: number;
  height: number;
}

interface CachedBackdropImage {
  img: HTMLImageElement;
  seamlessCanvas: HTMLCanvasElement | null;
  seamlessWidth: number;
  seamlessHeight: number;
  ready: boolean;
  failed: boolean;
}

const backdropCache: Partial<Record<LandscapeId, CachedBackdropImage>> = {};

/**
 * Construye un lienzo horizontal verdaderamente sin costuras mezclando suavemente el borde derecho
 * sobre el borde izquierdo con una curva smoothstep, evitando espejados artificiales y cortes.
 */
function buildSeamlessPanoramaCanvas(img: HTMLImageElement): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  if (w < 64 || h < 64) return null;

  const blendW = Math.max(48, Math.min(Math.floor(w * 0.28), Math.round(w * 0.22)));
  const tileW = w - blendW;
  if (tileW < 64) return null;

  const outCanvas = document.createElement('canvas');
  outCanvas.width = tileW;
  outCanvas.height = h;
  const outCtx = outCanvas.getContext('2d', { alpha: false });
  if (!outCtx) return null;

  // Base image covering [0 .. tileW] from source [0 .. tileW]
  outCtx.drawImage(img, 0, 0, tileW, h, 0, 0, tileW, h);

  // Extract right tail [tileW .. w] and feather its alpha 1 -> 0 across [0 .. blendW]
  const patchCanvas = document.createElement('canvas');
  patchCanvas.width = blendW;
  patchCanvas.height = h;
  const patchCtx = patchCanvas.getContext('2d');
  if (!patchCtx) return outCanvas;

  patchCtx.drawImage(img, tileW, 0, blendW, h, 0, 0, blendW, h);
  patchCtx.globalCompositeOperation = 'destination-in';
  const mask = patchCtx.createLinearGradient(0, 0, blendW, 0);
  mask.addColorStop(0, 'rgba(0, 0, 0, 1)');
  mask.addColorStop(0.25, 'rgba(0, 0, 0, 0.85)');
  mask.addColorStop(0.55, 'rgba(0, 0, 0, 0.45)');
  mask.addColorStop(0.82, 'rgba(0, 0, 0, 0.12)');
  mask.addColorStop(1, 'rgba(0, 0, 0, 0)');
  patchCtx.fillStyle = mask;
  patchCtx.fillRect(0, 0, blendW, h);

  outCtx.drawImage(patchCanvas, 0, 0);
  return outCanvas;
}

function ensureLoaded(landscape: LandscapeId): CachedBackdropImage | null {
  if (typeof window === 'undefined' || typeof Image === 'undefined') {
    return null;
  }
  const existing = backdropCache[landscape];
  if (existing) return existing;

  const img = new Image();
  img.decoding = 'async';
  img.referrerPolicy = 'no-referrer';
  const entry: CachedBackdropImage = {
    img,
    seamlessCanvas: null,
    seamlessWidth: 0,
    seamlessHeight: 0,
    ready: false,
    failed: false,
  };
  backdropCache[landscape] = entry;

  img.onload = () => {
    entry.ready = img.naturalWidth > 0 && img.naturalHeight > 0;
    if (entry.ready) {
      const seamless = buildSeamlessPanoramaCanvas(img);
      if (seamless) {
        entry.seamlessCanvas = seamless;
        entry.seamlessWidth = seamless.width;
        entry.seamlessHeight = seamless.height;
      } else {
        entry.seamlessWidth = img.naturalWidth;
        entry.seamlessHeight = img.naturalHeight;
      }
    }
  };
  img.onerror = () => {
    entry.failed = true;
    entry.ready = false;
  };
  img.src = STAGE_BACKGROUND_URLS[landscape];
  return entry;
}

/**
 * Precarga una ilustración de fondo terrestre específica bajo demanda (minimiza la descarga inicial).
 */
export function preloadStageBackground(landscape: LandscapeId): void {
  if (typeof window === 'undefined') return;
  ensureLoaded(landscape);
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

/**
 * Devuelve el panorama pre-mezclado listo para scroll infinito continuo sin uniones visibles.
 */
export function getSeamlessStageBackground(landscape: LandscapeId): SeamlessStageBackground | null {
  const entry = ensureLoaded(landscape);
  if (!entry || !entry.ready || entry.failed) return null;
  if (entry.seamlessCanvas) {
    return {
      source: entry.seamlessCanvas,
      width: entry.seamlessWidth,
      height: entry.seamlessHeight,
    };
  }
  return {
    source: entry.img,
    width: entry.img.naturalWidth || 1600,
    height: entry.img.naturalHeight || 900,
  };
}
