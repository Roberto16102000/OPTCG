import { Platform } from 'react-native';
import { resolveWebStaticPath } from './localImages';

type BoosterManifest = {
  images?: Record<string, string>;
  profiles?: Record<string, ArtProfile>;
  /** Recorte medido para imágenes sueltas que no encajan en ningún perfil. */
  crops?: Record<string, ArtCrop>;
};

/** Familias de arte con encuadre propio. */
export type ArtProfile = 'booster' | 'deckModern' | 'deckLegacy' | 'deckRetail';

export interface ArtCrop {
  canvasW: number;
  canvasH: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Recuadro útil de cada familia de arte, medido sobre las imágenes reales.
 * Los sobres y los mazos recientes comparten lienzo de 670² pero NO el mismo
 * encuadre; los mazos antiguos vienen recortados de origen.
 */
export const ART_CROPS: Record<ArtProfile, ArtCrop> = {
  booster: { canvasW: 670, canvasH: 670, x: 164, y: 50, width: 343, height: 572 },
  deckModern: { canvasW: 670, canvasH: 670, x: 169, y: 27, width: 332, height: 616 },
  deckLegacy: { canvasW: 247, canvasH: 247, x: 0, y: 0, width: 247, height: 247 },
  // Fotos de tienda: encuadre irregular entre unas y otras, así que no se
  // recortan; se muestran enteras dentro de un marco cuadrado.
  deckRetail: { canvasW: 400, canvasH: 400, x: 0, y: 0, width: 400, height: 400 },
};

/** Se mantiene el nombre anterior: el recorte de sobre es el caso por defecto. */
export const BOOSTER_CROP = ART_CROPS.booster;

/** Proporción ancho/alto del sobre ya recortado (≈0.6). */
export const BOOSTER_ASPECT = BOOSTER_CROP.width / BOOSTER_CROP.height;

let cached: Record<string, string> | null = null;
let cachedProfiles: Record<string, ArtProfile> | null = null;
let cachedCrops: Record<string, ArtCrop> | null = null;

function loadManifest(): Record<string, string> {
  if (cached) return cached;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const data = require('../../assets/data/booster-image-manifest.json') as BoosterManifest;
    cached = data?.images ?? {};
    cachedProfiles = data?.profiles ?? {};
    cachedCrops = data?.crops ?? {};
  } catch {
    cached = {};
    cachedProfiles = {};
    cachedCrops = {};
  }
  return cached;
}

/**
 * Arte del sobre descargado con `npm run sync:boosters`. Solo en web: en nativo
 * no hay servidor estático, así que la pantalla cae al sobre estilizado.
 */
export function getBoosterImageUri(packId: string): string | undefined {
  if (Platform.OS !== 'web') return undefined;
  const path = loadManifest()[packId.toUpperCase()];
  if (!path) return undefined;
  return resolveWebStaticPath(path);
}

/**
 * Si tenemos arte para este sobre. Mira el manifiesto sin filtrar por
 * plataforma, para que la lista de sobres sea la misma en web y en nativo.
 */
export function hasBoosterArt(packId: string): boolean {
  return Boolean(loadManifest()[packId.toUpperCase()]);
}

/**
 * Arte a partir del código que aparece en el nombre del set (`OP-01`). Algunas
 * ediciones son conjuntas y traen dos códigos (`OP15-EB04`), así que se prueba
 * segmento a segmento antes de rendirse.
 */
export function getBoosterImageUriForSetCode(code: string | null | undefined): string | undefined {
  if (!code) return undefined;
  const compact = code.replace(/[^A-Z0-9]/gi, '').toUpperCase();
  const direct = getBoosterImageUri(compact);
  if (direct) return direct;

  for (const segment of code.toUpperCase().split(/[^A-Z0-9]+/).filter(Boolean)) {
    const uri = getBoosterImageUri(segment);
    if (uri) return uri;
  }
  return undefined;
}

/** Familia de encuadre de esta imagen. Sin dato, se asume sobre. */
export function getArtProfile(packId: string): ArtProfile {
  loadManifest();
  return cachedProfiles?.[packId.toUpperCase()] ?? 'booster';
}

/** Recorte a aplicar: el medido a mano si existe, si no el de su familia. */
export function getArtCrop(packId: string): ArtCrop {
  loadManifest();
  return cachedCrops?.[packId.toUpperCase()] ?? ART_CROPS[getArtProfile(packId)];
}

/** Proporción ancho/alto ya recortada. */
export function getArtAspect(packId: string): number {
  const crop = getArtCrop(packId);
  return crop.width / crop.height;
}
