/**
 * Copia grande de cada carta, servida desde el mismo dominio.
 *
 * La ficha y la apertura de sobres pedían la imagen al proxy: unos 450 ms con
 * su caché caliente y más de cuatro segundos la primera vez que la transforma.
 * A 900 px cubre los 512 que pide la ficha incluso en pantalla densa, que los
 * pinta al doble.
 *
 * Las genera `npm run build:hd` en `public/card-hd/`. Pesan unos 580 MB, y se
 * publican tal cual: en Cloudflare las peticiones a archivos estáticos son
 * gratis e ilimitadas y guardarlos no cuesta.
 *
 * Es el unico juego: las rejillas tiran tambien de estas. Cuesta peso -una
 * pagina de catalogo son 60 imagenes- pero el navegador las reduce al pintar y
 * la carta se ve igual de nitida en todas partes.
 */
import { Platform } from 'react-native';
import { resolveWebStaticPath } from './localImages';

/** Ancho con el que se generaron. */
export const HD_WIDTH = 900;

/** Ruta de la carta, o `null` si no hay id o no estamos en web. */
export function getCardHdUri(cardId: string | undefined): string | null {
  if (Platform.OS !== 'web') return null;
  if (!cardId) return null;
  return resolveWebStaticPath(`/card-hd/${encodeURIComponent(cardId)}.webp`);
}
