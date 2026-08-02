import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { CollectionEntry, OnePieceCard } from '../types/card';
import * as collectionStorage from '../storage/collection';
import { compareCards } from '../utils/cards';

interface CollectionContextValue {
  collection: Record<string, CollectionEntry>;
  collectionList: CollectionEntry[];
  totalCards: number;
  isInCollection: (cardId: string) => boolean;
  getQuantity: (cardId: string) => number;
  addCard: (card: OnePieceCard) => Promise<void>;
  removeCard: (cardId: string) => Promise<void>;
  setQuantity: (cardId: string, quantity: number) => Promise<void>;
  clearAll: () => Promise<void>;
  refresh: () => Promise<void>;
  loading: boolean;
}

const CollectionContext = createContext<CollectionContextValue | null>(null);

export function CollectionProvider({ children }: { children: React.ReactNode }) {
  const [collection, setCollection] = useState<Record<string, CollectionEntry>>({});
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const data = await collectionStorage.loadCollection();
    setCollection(data);
  }, []);

  useEffect(() => {
    // La limpieza corre antes de leer, para no cargar lo que se va a borrar.
    collectionStorage
      .runOneTimeCollectionReset()
      .then(() => refresh())
      .finally(() => setLoading(false));
  }, [refresh]);

  const addCard = useCallback(
    async (card: OnePieceCard) => {
      const entry = await collectionStorage.addCardToCollection(card);
      setCollection((prev) => ({ ...prev, [card.id]: entry }));
    },
    []
  );

  const clearAll = useCallback(async () => {
    await collectionStorage.clearCollection();
    setCollection({});
  }, []);

  const removeCard = useCallback(async (cardId: string) => {
    await collectionStorage.removeCardFromCollection(cardId);
    setCollection((prev) => {
      const next = { ...prev };
      delete next[cardId];
      return next;
    });
  }, []);

  const setQuantity = useCallback(async (cardId: string, quantity: number) => {
    await collectionStorage.updateCardQuantity(cardId, quantity);
    setCollection((prev) => {
      const next = { ...prev };
      if (quantity <= 0) {
        delete next[cardId];
      } else if (next[cardId]) {
        next[cardId] = { ...next[cardId], quantity };
      }
      return next;
    });
  }, []);

  const collectionList = useMemo(
    () => Object.values(collection).sort((a, b) => compareCards(a.card, b.card)),
    [collection]
  );

  const totalCards = useMemo(
    () => collectionList.reduce((sum, e) => sum + e.quantity, 0),
    [collectionList]
  );

  const value = useMemo(
    () => ({
      collection,
      collectionList,
      totalCards,
      isInCollection: (id: string) => Boolean(collection[id]),
      getQuantity: (id: string) => collection[id]?.quantity ?? 0,
      addCard,
      removeCard,
      setQuantity,
      clearAll,
      refresh,
      loading,
    }),
    [
      collection,
      collectionList,
      totalCards,
      addCard,
      removeCard,
      setQuantity,
      clearAll,
      refresh,
      loading,
    ]
  );

  return (
    <CollectionContext.Provider value={value}>{children}</CollectionContext.Provider>
  );
}

export function useCollection() {
  const ctx = useContext(CollectionContext);
  if (!ctx) {
    throw new Error('useCollection must be used within CollectionProvider');
  }
  return ctx;
}
