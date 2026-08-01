import { Platform } from 'react-native';

type CardImageManifest = {
  images?: Record<string, string>;
};

let cached: Record<string, string> | null = null;

function loadManifest(): Record<string, string> {
  if (cached) return cached;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const data = require('../../assets/data/card-image-manifest.json') as CardImageManifest;
    cached = data?.images ?? {};
  } catch {
    cached = {};
  }
  return cached;
}

/** Ruta local servida en web (/card-images/...) si la imagen fue descargada. */
export function getLocalWebImageUri(cardId: string): string | undefined {
  if (Platform.OS !== 'web') return undefined;
  const path = loadManifest()[cardId];
  if (!path) return undefined;
  return resolveWebStaticPath(path);
}

/** Convierte /card-images/... en URL absoluta para fetch/img en web. */
export function resolveWebStaticPath(path: string): string {
  if (Platform.OS !== 'web' || !path.startsWith('/')) return path;
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}${path}`;
  }
  return path;
}

/** Rutas estáticas que servimos nosotros y no deben pasar por el proxy wsrv. */
const LOCAL_IMAGE_DIRS = ['/card-images/', '/booster-images/'];

export function isLocalWebImageUri(uri: string): boolean {
  return LOCAL_IMAGE_DIRS.some((dir) => uri.includes(dir));
}

export function hasLocalWebImages(): boolean {
  return Platform.OS === 'web' && Object.keys(loadManifest()).length > 0;
}
