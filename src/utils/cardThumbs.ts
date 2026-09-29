/**
 * Miniaturas propias de carta, servidas desde el mismo dominio.
 *
 * Las rejillas piden 60 imágenes de golpe; a ~17 KB cada una en vez de pasar
 * por un proxy externo, la diferencia se nota. Las genera
 * `npm run build:thumbs` en `public/card-thumbs/`.
 *
 * La ficha de carta y la apertura de sobres no las usan como imagen final
 * -ahí vale más la calidad que el peso-, pero sí como primer fotograma
 * mientras llega la nítida: la rejilla acaba de descargarla, así que aparece
 * sin esperar nada. Ver `getCardThumbPath`.
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
  if (width > THUMB_MAX_WIDTH) return null;
  return getCardThumbPath(cardId);
}

/**
 * Ruta de la miniatura sin mirar el tamaño, para usarla de primer fotograma.
 *
 * A tamaño grande se ve blanda, pero dura lo que tarda la nítida y evita el
 * hueco: pedir la de 480 px al proxy cuesta unos 450 ms con su caché caliente
 * y pasa de cuatro segundos cuando es la primera vez que la transforma.
 */
export function getCardThumbPath(cardId: string | undefined): string | null {
  if (Platform.OS !== 'web') return null;
  if (!cardId) return null;
  return resolveWebStaticPath(`/card-thumbs/${encodeURIComponent(cardId)}.webp`);
}
