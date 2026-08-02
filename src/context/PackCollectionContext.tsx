import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as packStorage from '../storage/packCollection';
import type { CollectionEntry, OnePieceCard } from '../types/card';

interface PackCollectionValue {
  packCollection: Record<string, CollectionEntry>;
  packList: CollectionEntry[];
  /** Copias totales, contando repetidas. */
  totalCopies: number;
  hasCard: (cardId: string) => boolean;
  addPackCard: (card: OnePieceCard) => Promise<void>;
  clearAll: () => Promise<void>;
  loading: boolean;
}

const PackCollectionContext = createContext<PackCollectionValue | null>(null);

/**
 * Cartas del simulador. Deliberadamente separado de `CollectionContext`, que
 * representa la colección física.
 */
export function PackCollectionProvider({ children }: { children: React.ReactNode }) {
  const [packCollection, setPackCollection] = useState<Record<string, CollectionEntry>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    packStorage
      .loadPackCollection()
      .then(setPackCollection)
      .finally(() => setLoading(false));
  }, []);

  const addPackCard = useCallback(async (card: OnePieceCard) => {
    const entry = await packStorage.addCardToPackCollection(card);
    setPackCollection((prev) => ({ ...prev, [card.id]: entry }));
  }, []);

  const clearAll = useCallback(async () => {
    await packStorage.clearPackCollection();
    setPackCollection({});
  }, []);

  const packList = useMemo(() => Object.values(packCollection), [packCollection]);
  const totalCopies = useMemo(
    () => packList.reduce((sum, entry) => sum + entry.quantity, 0),
    [packList]
  );
  const hasCard = useCallback((cardId: string) => Boolean(packCollection[cardId]), [packCollection]);

  const value = useMemo(
    () => ({ packCollection, packList, totalCopies, hasCard, addPackCard, clearAll, loading }),
    [packCollection, packList, totalCopies, hasCard, addPackCard, clearAll, loading]
  );

  return (
    <PackCollectionContext.Provider value={value}>{children}</PackCollectionContext.Provider>
  );
}

export function usePackCollection() {
  const ctx = useContext(PackCollectionContext);
  if (!ctx) throw new Error('usePackCollection debe usarse dentro de PackCollectionProvider');
  return ctx;
}
