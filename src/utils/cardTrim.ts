/**
 * Cuánto recortar de cada carta para quitarle el marco claro que Bandai deja
 * alrededor en sus escaneos.
 *
 * No es una cantidad fija: el marco va de 0 a un 2,8 % del ancho según la
 * carta, y varias vienen ya a sangre. Lo mide `npm run measure:trim` imagen a
 * imagen y aquí solo se consulta.
 */
export interface CardTrim {
  l: number;
  r: number;
  t: number;
  b: number;
}

let cache: Record<string, CardTrim> | null = null;

function load(): Record<string, CardTrim> {
  if (cache) return cache;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const data = require('../../assets/data/card-trim-manifest.json') as {
      crops?: Record<string, CardTrim>;
    };
    cache = data?.crops ?? {};
  } catch {
    // Sin manifiesto no se recorta nada; la carta se ve con su marco.
    cache = {};
  }
  return cache;
}

export function getCardTrim(id: string): CardTrim | null {
  return load()[id] ?? null;
}
