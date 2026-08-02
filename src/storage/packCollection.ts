import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CollectionEntry, OnePieceCard } from '../types/card';

/**
 * Cartas obtenidas en el simulador de sobres. Van aparte de `@onepiece/collection`
 * a propósito: esa representa lo que tienes en físico, y mezclarlas falsearía
 * tanto el recuento real como la recompensa.
 */
const PACK_COLLECTION_KEY = '@onepiece/pack_collection';

export async function loadPackCollection(): Promise<Record<string, CollectionEntry>> {
  const raw = await AsyncStorage.getItem(PACK_COLLECTION_KEY);
  if (!raw) return {};
  return JSON.parse(raw) as Record<string, CollectionEntry>;
}

export async function savePackCollection(
  collection: Record<string, CollectionEntry>
): Promise<void> {
  await AsyncStorage.setItem(PACK_COLLECTION_KEY, JSON.stringify(collection));
}

/** Añade una copia; si ya estaba, sube la cantidad. */
export async function addCardToPackCollection(card: OnePieceCard): Promise<CollectionEntry> {
  const collection = await loadPackCollection();
  const existing = collection[card.id];
  const entry: CollectionEntry = existing
    ? { ...existing, quantity: existing.quantity + 1 }
    : { card, quantity: 1, addedAt: new Date().toISOString() };
  collection[card.id] = entry;
  await savePackCollection(collection);
  return entry;
}

export async function clearPackCollection(): Promise<void> {
  await AsyncStorage.removeItem(PACK_COLLECTION_KEY);
}
