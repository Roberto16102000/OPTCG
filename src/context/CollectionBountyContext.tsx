import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { OnePieceCard } from '../types/card';
import { useCollection } from './CollectionContext';
import { bountyFromCollectionUsd } from '../utils/bounty';
import {
  fetchOptcgPrices,
  marketPriceForCatalogCard,
} from '../utils/optcgPrices';

interface CollectionBountyContextValue {
  bountyUsd: number;
  priceByCardId: Record<string, number>;
  pricesLoading: boolean;
  ensurePrice: (card: OnePieceCard) => Promise<number>;
}

const CollectionBountyContext = createContext<CollectionBountyContextValue | null>(null);

export function CollectionBountyProvider({ children }: { children: React.ReactNode }) {
  const { collectionList } = useCollection();
  const [priceByCardId, setPriceByCardId] = useState<Record<string, number>>({});
  const [pricesLoading, setPricesLoading] = useState(false);

  const cardIdsKey = useMemo(
    () => [...new Set(collectionList.map((e) => e.card.id))].sort().join(','),
    [collectionList]
  );

  const ensurePrice = useCallback(async (card: OnePieceCard) => {
    try {
      const rows = await fetchOptcgPrices(card.code);
      const value = marketPriceForCatalogCard(rows, card.id);
      setPriceByCardId((prev) => ({ ...prev, [card.id]: value }));
      return value;
    } catch {
      setPriceByCardId((prev) => ({ ...prev, [card.id]: 0 }));
      return 0;
    }
  }, []);

  useEffect(() => {
    const entries = collectionList;
    if (!entries.length) {
      setPricesLoading(false);
      return;
    }

    let cancelled = false;
    setPricesLoading(true);

    void (async () => {
      const rowsByCode = new Map<string, Awaited<ReturnType<typeof fetchOptcgPrices>>>();
      const updates: Record<string, number> = {};

      for (const entry of entries) {
        if (cancelled) return;
        const { code, id } = entry.card;
        try {
          if (!rowsByCode.has(code)) {
            rowsByCode.set(code, await fetchOptcgPrices(code));
          }
          const rows = rowsByCode.get(code) ?? [];
          updates[id] = marketPriceForCatalogCard(rows, id);
        } catch {
          updates[id] = 0;
        }
      }

      if (!cancelled) {
        setPriceByCardId((prev) => ({ ...prev, ...updates }));
        setPricesLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [cardIdsKey, collectionList]);

  const bountyUsd = useMemo(
    () =>
      bountyFromCollectionUsd(
        collectionList.map((e) => ({ cardId: e.card.id, quantity: e.quantity })),
        priceByCardId
      ),
    [collectionList, priceByCardId]
  );

  const value = useMemo(
    () => ({ bountyUsd, priceByCardId: priceByCardId, pricesLoading, ensurePrice }),
    [bountyUsd, priceByCardId, pricesLoading, ensurePrice]
  );

  return (
    <CollectionBountyContext.Provider value={value}>{children}</CollectionBountyContext.Provider>
  );
}

export function useCollectionBounty(): CollectionBountyContextValue {
  const ctx = useContext(CollectionBountyContext);
  if (!ctx) {
    throw new Error('useCollectionBounty must be used within CollectionBountyProvider');
  }
  return ctx;
}
