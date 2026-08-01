import { useCallback, useEffect, useState } from 'react';
import { loadOfficialCatalog, hasOfficialCatalog } from '../api/official';
import { loadCardsCache } from '../storage/collection';
import type { OnePieceCard } from '../types/card';
import { sortCards } from '../utils/cards';

export function useCatalogCards() {
  const [cards, setCards] = useState<OnePieceCard[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const cached = await loadCardsCache();
    if (cached?.length) {
      setCards(sortCards(cached));
    } else if (hasOfficialCatalog()) {
      setCards(sortCards(loadOfficialCatalog()));
    } else {
      setCards([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { cards, loading, refresh };
}
