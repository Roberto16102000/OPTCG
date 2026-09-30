/**
 * Recorte de las cartas que traen relleno dentro del archivo.
 *
 * El catálogo junta imágenes de cuatro sitios y no todas vienen encuadradas
 * igual: unas 650 llevan un borde transparente o blanco alrededor de la carta.
 * Al pintarlas en su hueco la carta se queda corta y se ve el marco vacío.
 *
 * Lo miden y lo guardan `npm run build:crops`; aquí solo se lee. Lo usan los
 * dos caminos por los que se pinta una carta —la miniatura propia y la imagen
 * que sirve el proxy— para que al cambiar una por otra no se mueva.
 */
import manifiesto from '../../assets/data/card-crop-manifest.json';

/** `[x, y, ancho, alto, anchoOriginal, altoOriginal]`, en píxeles del original. */
type Recorte = readonly [number, number, number, number, number, number];

const RECORTES = manifiesto as unknown as Record<string, Recorte>;

export interface CardCrop {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Recorte de esa carta, o `null` si viene bien encuadrada. */
export function getCardCrop(cardId: string | undefined): CardCrop | null {
  if (!cardId) return null;
  const r = RECORTES[cardId];
  if (!r) return null;
  return { x: r[0], y: r[1], width: r[2], height: r[3] };
}

/** Cuántas cartas necesitan recorte. Solo para los scripts de comprobación. */
export function countCardCrops(): number {
  return Object.keys(RECORTES).length;
}
