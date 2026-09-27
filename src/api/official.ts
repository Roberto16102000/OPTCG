/**
 * Catálogo generado desde el sitio oficial (npm run sync:official).
 * No requiere API key. Más actualizado que API TCG (OP-15, PRB-02, EB-03, etc.).
 */
import type { OnePieceCard } from '../types/card';
import { unifySetNames } from '../utils/cards';

type OfficialCatalogFile = {
  source: string;
  syncedAt: string;
  packCount: number;
  count: number;
  cards: OnePieceCard[];
};

let cached: OfficialCatalogFile | null = null;

function loadFile(): OfficialCatalogFile | null {
  if (cached) return cached;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const data = require('../../assets/data/official-catalog.json') as OfficialCatalogFile;
    if (data?.cards?.length) {
      cached = { ...data, cards: unifySetNames(data.cards) };
      return cached;
    }
  } catch {
    return null;
  }
  return null;
}

export function hasOfficialCatalog(): boolean {
  return Boolean(loadFile()?.cards?.length);
}

export function getOfficialCatalogMeta(): {
  count: number;
  syncedAt: string;
  source: string;
} | null {
  const file = loadFile();
  if (!file) return null;
  return {
    count: file.count,
    syncedAt: file.syncedAt,
    source: file.source,
  };
}

export function getOfficialCatalogCards(): OnePieceCard[] {
  return loadFile()?.cards ?? [];
}

export class OfficialCatalogError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OfficialCatalogError';
  }
}

export function loadOfficialCatalog(): OnePieceCard[] {
  const cards = getOfficialCatalogCards();
  if (!cards.length) {
    throw new OfficialCatalogError(
      'No official catalog in the app. In the project folder run: npm run sync:official'
    );
  }
  return cards;
}
