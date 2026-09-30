/**
 * Copia grande de cada carta, servida desde el mismo dominio.
 *
 * La ficha y la apertura de sobres pedían la imagen al proxy: unos 450 ms con
 * su caché caliente y más de cuatro segundos la primera vez que la transforma.
 * A 900 px cubre los 512 que pide la ficha incluso en pantalla densa, que los
 * pinta al doble.
 *
 * Las genera `npm run build:hd` en `public/card-hd/`. Pesan unos 580 MB, que
 * no caben en Vercel —250 MB por despliegue— pero sí en Cloudflare, donde las
 * peticiones a archivos estáticos son gratis e ilimitadas.
 *
 * Para las rejillas está [[cardThumbs]], que es otro juego mucho más ligero:
 * ahí se piden 60 de golpe y manda el peso, no la calidad.
 */
import { Platform } from 'react-native';
import { resolveWebStaticPath } from './localImages';
import { THUMB_MAX_WIDTH } from './cardThumbs';

/** Ancho con el que se generaron. */
export const HD_WIDTH = 900;

/**
 * Ruta de la copia grande, o `null` si a ese tamaño no toca.
 *
 * Por debajo del umbral de miniatura no se usa: una rejilla que pidiera estas
 * descargaría 60 imágenes de 100 KB en vez de 60 de 25 KB.
 */
export function getCardHdUri(cardId: string | undefined, width: number): string | null {
  if (Platform.OS !== 'web') return null;
  if (!cardId || width <= THUMB_MAX_WIDTH) return null;
  return resolveWebStaticPath(`/card-hd/${encodeURIComponent(cardId)}.webp`);
}
