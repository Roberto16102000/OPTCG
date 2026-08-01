import AsyncStorage from '@react-native-async-storage/async-storage';

const FAVORITES_KEY = '@onepiece/favorites';

export async function loadFavoriteIds(): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(FAVORITES_KEY);
    if (!raw) return new Set();
    const ids = JSON.parse(raw) as string[];
    return new Set(ids);
  } catch {
    return new Set();
  }
}

export async function saveFavoriteIds(ids: Set<string>): Promise<void> {
  await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify([...ids]));
}

export async function toggleFavorite(cardId: string): Promise<boolean> {
  const ids = await loadFavoriteIds();
  if (ids.has(cardId)) {
    ids.delete(cardId);
    await saveFavoriteIds(ids);
    return false;
  }
  ids.add(cardId);
  await saveFavoriteIds(ids);
  return true;
}
