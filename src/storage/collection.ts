import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CollectionEntry, OnePieceCard } from '../types/card';

const COLLECTION_KEY = '@onepiece/collection';
const CARDS_CACHE_KEY = '@onepiece/cards_cache';
const CACHE_META_KEY = '@onepiece/cache_meta';

export type CacheMeta = {
  count: number;
  syncedAt: string;
  source: 'official' | 'apitcg';
  /** Fecha del JSON empaquetado (official-catalog.json) */
  catalogSyncedAt?: string;
};

export function isCatalogCacheStale(
  cacheMeta: CacheMeta | null,
  officialCount: number,
  officialCatalogSyncedAt: string | null
): boolean {
  if (!officialCount) return false;
  if (!cacheMeta) return true;
  if (cacheMeta.source !== 'official') return true;
  // Distinto, no menor: un catálogo que encoge está igual de obsoleto que uno
  // que crece. Con `<`, quitar cartas no invalidaba nada y seguían apareciendo
  // en la app -OP-18 y EB-05 sobrevivieron así a que las borráramos-.
  if (cacheMeta.count !== officialCount) return true;
  if (
    officialCatalogSyncedAt &&
    cacheMeta.catalogSyncedAt &&
    cacheMeta.catalogSyncedAt < officialCatalogSyncedAt
  ) {
    return true;
  }
  return false;
}

export async function loadCollection(): Promise<Record<string, CollectionEntry>> {
  const raw = await AsyncStorage.getItem(COLLECTION_KEY);
  if (!raw) return {};
  return JSON.parse(raw) as Record<string, CollectionEntry>;
}

export async function saveCollection(
  collection: Record<string, CollectionEntry>
): Promise<void> {
  await AsyncStorage.setItem(COLLECTION_KEY, JSON.stringify(collection));
}

export async function addCardToCollection(card: OnePieceCard): Promise<CollectionEntry> {
  const collection = await loadCollection();
  const existing = collection[card.id];
  const entry: CollectionEntry = existing
    ? { ...existing, quantity: existing.quantity + 1 }
    : { card, quantity: 1, addedAt: new Date().toISOString() };
  collection[card.id] = entry;
  await saveCollection(collection);
  return entry;
}

/**
 * Limpieza de un solo uso: vacía la colección física la primera vez que se
 * abre la app en cada navegador. Existe porque hasta ahora el simulador
 * escribía aquí, y quedaron cartas que no se tienen en papel.
 *
 * Se puede borrar este bloque —y su llamada en CollectionContext— en cuanto
 * haya corrido en los navegadores que uses.
 */
const RESET_FLAG_KEY = '@onepiece/collection_reset_v1';

export async function runOneTimeCollectionReset(): Promise<boolean> {
  const done = await AsyncStorage.getItem(RESET_FLAG_KEY);
  if (done) return false;
  await AsyncStorage.removeItem(COLLECTION_KEY);
  await AsyncStorage.setItem(RESET_FLAG_KEY, new Date().toISOString());
  return true;
}

/** Vacía la colección física. No toca la del simulador ni la caché. */
export async function clearCollection(): Promise<void> {
  await AsyncStorage.removeItem(COLLECTION_KEY);
}

export async function removeCardFromCollection(cardId: string): Promise<void> {
  const collection = await loadCollection();
  delete collection[cardId];
  await saveCollection(collection);
}

export async function updateCardQuantity(
  cardId: string,
  quantity: number
): Promise<void> {
  const collection = await loadCollection();
  const entry = collection[cardId];
  if (!entry) return;
  if (quantity <= 0) {
    delete collection[cardId];
  } else {
    collection[cardId] = { ...entry, quantity };
  }
  await saveCollection(collection);
}

export async function loadCardsCache(): Promise<OnePieceCard[] | null> {
  const raw = await AsyncStorage.getItem(CARDS_CACHE_KEY);
  if (!raw) return null;
  return JSON.parse(raw) as OnePieceCard[];
}

export async function saveCardsCache(
  cards: OnePieceCard[],
  meta?: Partial<CacheMeta>
): Promise<void> {
  await AsyncStorage.setItem(CARDS_CACHE_KEY, JSON.stringify(cards));
  const entry: CacheMeta = {
    count: cards.length,
    syncedAt: new Date().toISOString(),
    source: 'official',
    ...meta,
  };
  await AsyncStorage.setItem(CACHE_META_KEY, JSON.stringify(entry));
}

export async function getCacheMeta(): Promise<CacheMeta | null> {
  const raw = await AsyncStorage.getItem(CACHE_META_KEY);
  if (!raw) return null;
  return JSON.parse(raw) as CacheMeta;
}
