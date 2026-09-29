/**
 * Miniaturas propias de carta, servidas desde el mismo dominio.
 *
 * Las rejillas piden 60 imágenes de golpe; a ~17 KB cada una en vez de pasar
 * por un proxy externo, la diferencia se nota. Las genera
 * `npm run build:thumbs` en `public/card-thumbs/`.
 *
 * La ficha de carta y la apertura de sobres NO las usan: ahí se ve una carta
 * cada vez y vale más la calidad que el peso.
 */
import { Platform } from 'react-native';
import { resolveWebStaticPath } from './localImages';

/**
 * Ancho a partir del cual la miniatura se queda corta. Cubre todas las
 * rejillas: la mayor es la del catálogo, con fichas de unos 179 px.
 */
export const THUMB_MAX_WIDTH = 200;

/** Ancho con el que se generaron; sirve para no ampliarlas. */
export const THUMB_WIDTH = 300;

/**
 * Ruta de la miniatura, o `null` si a ese tamaño no conviene.
 *
 * No hay manifiesto a propósito: existen para todas las cartas del catálogo,
 * y el que falte alguna lo cubre la cadena de respaldo de `CardImage`, que
 * reintenta con la imagen remota.
 */
export function getCardThumbUri(cardId: string | undefined, width: number): string | null {
  if (Platform.OS !== 'web') return null;
  if (!cardId || width > THUMB_MAX_WIDTH) return null;
  return resolveWebStaticPath(`/card-thumbs/${encodeURIComponent(cardId)}.webp`);
}
