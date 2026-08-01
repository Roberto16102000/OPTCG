import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { CardDetailModal } from '../../src/components/CardDetailModal';
import { OfficialCatalogBanner } from '../../src/components/OfficialCatalogBanner';
import { hasOfficialCatalog } from '../../src/api/official';
import { colors } from '../../src/constants/theme';
import { useCollection } from '../../src/context/CollectionContext';
import { useCollectionBounty } from '../../src/context/CollectionBountyContext';
import { loadCardsCache } from '../../src/storage/collection';
import type { OnePieceCard } from '../../src/types/card';

export default function CardDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { isInCollection, getQuantity, addCard, removeCard, setQuantity } =
    useCollection();
  const { ensurePrice } = useCollectionBounty();

  const addCardWithBounty = async (c: OnePieceCard) => {
    await addCard(c);
    void ensurePrice(c);
  };
  const [card, setCard] = useState<OnePieceCard | null>(null);
  const [loading, setLoading] = useState(true);

  const loadCard = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const cache = await loadCardsCache();
    const fromCache = cache?.find((c) => c.id === id);
    setCard(fromCache ?? null);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    loadCard();
  }, [loadCard]);

  if (!hasOfficialCatalog() && !card) {
    return (
      <View style={styles.container}>
        <OfficialCatalogBanner />
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CardDetailModal
        card={card}
        visible={card !== null}
        onClose={() => router.back()}
        inCollection={card ? isInCollection(card.id) : false}
        quantity={card ? getQuantity(card.id) : 0}
        onAdd={card ? () => addCardWithBounty(card) : undefined}
        onRemove={
          card
            ? () => {
                removeCard(card.id);
                router.back();
              }
            : undefined
        }
        onIncrement={card ? () => addCardWithBounty(card) : undefined}
        onDecrement={
          card ? () => setQuantity(card.id, getQuantity(card.id) - 1) : undefined
        }
      />
      {!card && !loading ? (
        <View style={styles.centered} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});
