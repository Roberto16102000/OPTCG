import { useCallback, useEffect, useState } from 'react';
import { getOfficialCatalogMeta, hasOfficialCatalog, loadOfficialCatalog } from '../api/official';
import { getCacheMeta, isCatalogCacheStale, loadCardsCache } from '../storage/collection';
import type { OnePieceCard } from '../types/card';
import { sortCards, unifySetNames } from '../utils/cards';

export function useCatalogCards() {
  const [cards, setCards] = useState<OnePieceCard[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);

    // El caché se guardó con un catálogo anterior: si se ha quedado corto se
    // ignora y manda el que viene con la app. Antes cualquier copia guardada
    // valía, y por eso una expansión nueva no aparecía hasta pulsar Sync.
    const bundled = getOfficialCatalogMeta();
    const cacheMeta = await getCacheMeta();
    const stale = isCatalogCacheStale(
      cacheMeta,
      bundled?.count ?? 0,
      bundled?.syncedAt ?? null
    );

    const cached = stale ? null : await loadCardsCache();
    if (cached?.length) {
      // Al caché hay que unificarle los nombres de set igual que al catálogo:
      // se guardó antes de que existiera esa limpieza.
      setCards(sortCards(unifySetNames(cached)));
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
