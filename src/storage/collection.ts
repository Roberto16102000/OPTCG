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
  if (cacheMeta.count < officialCount) return true;
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
