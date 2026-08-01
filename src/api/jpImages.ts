import { JAPANESE_CARDLIST_BASE } from '../constants/regions';
import type { OnePieceCard } from '../types/card';

type JpImageMapFile = {
  source: string;
  syncedAt: string;
  count: number;
  images: Record<string, string>;
};

let cached: Record<string, string> | null = null;

function loadMap(): Record<string, string> {
  if (cached) return cached;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const data = require('../../assets/data/jp-image-map.json') as JpImageMapFile;
    cached = data?.images ?? {};
    return cached;
  } catch {
    cached = {};
    return cached;
  }
}

export function hasJapaneseImageMap(): boolean {
  return Object.keys(loadMap()).length > 0;
}

/** URL de imagen JP por id de carta (p. ej. OP01-001, OP01-001_p2). */
export function getJapaneseImageUrl(cardId: string): string | undefined {
  return loadMap()[cardId];
}

/** Imagen japonesa para carta EN: id exacto, luego código base. */
export function resolveJapaneseImageUri(card: OnePieceCard): string | undefined {
  const map = loadMap();
  if (map[card.id]) return map[card.id];
  if (map[card.code]) return map[card.code];
  return `${JAPANESE_CARDLIST_BASE}/images/cardlist/card/${encodeURIComponent(card.id)}.png`;
}
