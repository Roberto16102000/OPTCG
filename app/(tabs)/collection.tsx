import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  ScrollView,
  useWindowDimensions,
  View,
} from 'react-native';
import { getOfficialCatalogMeta } from '../../src/api/official';
import { CollectionFiltersPanel } from '../../src/components/collection/CollectionFiltersPanel';
import { CollectionGridItem } from '../../src/components/collection/CollectionGridItem';
import { CollectionGridToolbar } from '../../src/components/collection/CollectionGridToolbar';
import { CollectionHeader } from '../../src/components/collection/CollectionHeader';
import { CollectionStatsPanel } from '../../src/components/collection/CollectionStatsPanel';
import { CardDetailModal } from '../../src/components/CardDetailModal';
import { colors, spacing } from '../../src/constants/theme';
import { useCollection } from '../../src/context/CollectionContext';
import { useCollectionBounty } from '../../src/context/CollectionBountyContext';
import { useCatalogCards } from '../../src/hooks/useCatalogCards';
import type { CatalogFiltersState, OwnedFilterValue } from '../../src/utils/cardFilters';
import { buildFamilyCounts, extractUniqueFamilies } from '../../src/utils/cardFilters';
import {
  buildCollectionDisplayItems,
  countCollectionActiveFilters,
  getCollectionFilterCounts,
  getCollectionGridColumns,
  getCollectionTileSize,
  sortCollectionItems,
  type CollectionSort,
} from '../../src/utils/collectionView';

const DEFAULT_FILTERS: CatalogFiltersState = {
  color: 'all',
  cardType: 'all',
  illustration: 'all',
  art: 'all',
  rarity: 'all',
  family: 'all',
  owned: 'all',
};

const THREE_COLUMN_BREAKPOINT = 1100;

export default function CollectionScreen() {
  const router = useRouter();
  const { width: windowWidth } = useWindowDimensions();
  const layoutWidth = Math.max(320, windowWidth);
  const useThreeColumns = layoutWidth >= THREE_COLUMN_BREAKPOINT;

  const {
    collectionList,
    totalCards,
    loading,
    isInCollection,
    getQuantity,
    addCard,
    removeCard,
    setQuantity,
  } = useCollection();
  const { bountyUsd, priceByCardId, pricesLoading, ensurePrice } = useCollectionBounty();
  const { cards: catalogCards, loading: catalogLoading } = useCatalogCards();

  const [search, setSearch] = useState('');
  const [ownedView, setOwnedView] = useState<OwnedFilterValue>('owned');
  const [filters, setFilters] = useState<CatalogFiltersState>(DEFAULT_FILTERS);
  const [sort, setSort] = useState<CollectionSort>('recent');
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [gridWidth, setGridWidth] = useState(0);

  const effectiveGridWidth = gridWidth > 0 ? gridWidth : layoutWidth - (useThreeColumns ? 512 : 0);

  const filterCounts = useMemo(
    () => getCollectionFilterCounts(catalogCards, collectionList, ownedView, search, filters),
    [catalogCards, collectionList, ownedView, search, filters]
  );

  const poolCards = useMemo(() => {
    if (ownedView === 'owned') return collectionList.map((e) => e.card);
    const ownedIds = new Set(collectionList.map((e) => e.card.id));
    if (ownedView === 'missing') return catalogCards.filter((c) => !ownedIds.has(c.id));
    return catalogCards.length ? catalogCards : collectionList.map((e) => e.card);
  }, [catalogCards, collectionList, ownedView]);

  const availableFamilies = useMemo(() => extractUniqueFamilies(poolCards), [poolCards]);
  const familyCounts = useMemo(() => buildFamilyCounts(poolCards), [poolCards]);

  const activeFilterCount = useMemo(
    () => countCollectionActiveFilters(search, ownedView, filters),
    [search, ownedView, filters]
  );

  const clearAllFilters = useCallback(() => {
    setSearch('');
    setOwnedView('owned');
    setFilters(DEFAULT_FILTERS);
  }, []);

  const addCardWithBounty = useCallback(
    async (card: Parameters<typeof addCard>[0]) => {
      await addCard(card);
      void ensurePrice(card);
    },
    [addCard, ensurePrice]
  );

  const catalogTotal = getOfficialCatalogMeta()?.count ?? catalogCards.length;

  const displayItems = useMemo(() => {
    const built = buildCollectionDisplayItems(
      catalogCards,
      collectionList,
      ownedView,
      filters,
      search
    );
    return sortCollectionItems(built, sort);
  }, [catalogCards, collectionList, ownedView, filters, search, sort]);

  const previewCard =
    previewIndex !== null && previewIndex >= 0 && previewIndex < displayItems.length
      ? displayItems[previewIndex].card
      : null;

  const numColumns = getCollectionGridColumns(effectiveGridWidth);
  const tileSize = useMemo(
    () => getCollectionTileSize(effectiveGridWidth, numColumns),
    [effectiveGridWidth, numColumns]
  );

  const openPreview = useCallback((index: number) => {
    setPreviewIndex(index);
  }, []);

  if (loading || catalogLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const buildGrid = (header?: ReactNode, footer?: ReactNode) => (
    <View
      style={styles.centerPanel}
      onLayout={(e) => {
        const w = Math.floor(e.nativeEvent.layout.width);
        if (w > 0) setGridWidth(w);
      }}
    >
      <FlatList
        key={`collection-grid-${numColumns}`}
        data={displayItems}
        keyExtractor={(item) => item.card.id}
        numColumns={numColumns}
        columnWrapperStyle={numColumns > 1 ? styles.gridRow : undefined}
        contentContainerStyle={styles.gridContent}
        initialNumToRender={24}
        removeClippedSubviews={Platform.OS !== 'web'}
        ListHeaderComponent={
          <>
            {header}
            <CollectionGridToolbar
              count={displayItems.length}
              sort={sort}
              onSortChange={setSort}
            />
          </>
        }
        ListFooterComponent={footer ? <>{footer}</> : null}
        renderItem={({ item, index }) => (
          <CollectionGridItem
            card={item.card}
            width={tileSize.width}
            imageHeight={tileSize.imageHeight}
            owned={item.owned}
            quantity={item.quantity}
            onPress={() => openPreview(index)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🏴‍☠️</Text>
            <Text style={styles.emptyTitle}>
              {ownedView === 'missing' ? 'No missing cards match' : 'Empty collection'}
            </Text>
            <Text style={styles.emptyText}>
              {ownedView === 'owned'
                ? 'Browse the catalog and tap + on a card to add it.'
                : 'Try another search or change filters.'}
            </Text>
            {ownedView === 'owned' ? (
              <Pressable style={styles.linkBtn} onPress={() => router.push('/')}>
                <Text style={styles.linkBtnText}>Go to catalog</Text>
              </Pressable>
            ) : null}
          </View>
        }
      />
    </View>
  );

  return (
    <View style={styles.container}>
      <CollectionHeader
        uniqueCount={collectionList.length}
        totalCopies={totalCards}
        catalogTotal={catalogTotal}
        bountyUsd={bountyUsd}
        pricesLoading={pricesLoading}
      />

      {useThreeColumns ? (
        <View style={styles.mainRow}>
          <CollectionFiltersPanel
            search={search}
            onSearchChange={setSearch}
            ownedView={ownedView}
            onOwnedViewChange={setOwnedView}
            filters={filters}
            onFiltersChange={(patch) => setFilters((f) => ({ ...f, ...patch }))}
            filterCounts={filterCounts}
            families={availableFamilies}
            familyCounts={familyCounts}
            poolCount={poolCards.length}
            activeFilterCount={activeFilterCount}
            onClearFilters={clearAllFilters}
          />
          {buildGrid()}
          <CollectionStatsPanel
            collectionList={collectionList}
            totalCopies={totalCards}
            priceByCardId={priceByCardId}
          />
        </View>
      ) : (
        buildGrid(
          <CollectionFiltersPanel
            search={search}
            onSearchChange={setSearch}
            ownedView={ownedView}
            onOwnedViewChange={setOwnedView}
            filters={filters}
            onFiltersChange={(patch) => setFilters((f) => ({ ...f, ...patch }))}
            filterCounts={filterCounts}
            families={availableFamilies}
            familyCounts={familyCounts}
            poolCount={poolCards.length}
            activeFilterCount={activeFilterCount}
            onClearFilters={clearAllFilters}
            compact
          />,
          <CollectionStatsPanel
            collectionList={collectionList}
            totalCopies={totalCards}
            priceByCardId={priceByCardId}
            compact
          />
        )
      )}

      <CardDetailModal
        card={previewCard}
        visible={previewCard !== null}
        onClose={() => setPreviewIndex(null)}
        onPrevious={() => setPreviewIndex((i) => (i !== null && i > 0 ? i - 1 : i))}
        onNext={() =>
          setPreviewIndex((i) => (i !== null && i < displayItems.length - 1 ? i + 1 : i))
        }
        hasPrevious={previewIndex !== null && previewIndex > 0}
        hasNext={previewIndex !== null && previewIndex < displayItems.length - 1}
        inCollection={previewCard ? isInCollection(previewCard.id) : false}
        quantity={previewCard ? getQuantity(previewCard.id) : 0}
        onAdd={previewCard ? () => addCardWithBounty(previewCard) : undefined}
        onRemove={
          previewCard
            ? () => {
                removeCard(previewCard.id);
                setPreviewIndex(null);
              }
            : undefined
        }
        onIncrement={previewCard ? () => addCardWithBounty(previewCard) : undefined}
        onDecrement={
          previewCard
            ? () => setQuantity(previewCard.id, getQuantity(previewCard.id) - 1)
            : undefined
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    minHeight: 0,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  mainRow: {
    flex: 1,
    flexDirection: 'row',
    minHeight: 0,
  },
  mobileLayout: {
    flex: 1,
    minHeight: 0,
  },
  mobileContent: {
    paddingBottom: spacing.lg,
  },
  centerPanel: {
    flex: 1,
    minWidth: 0,
    backgroundColor: colors.background,
  },
  gridRow: {
    gap: 10,
    justifyContent: 'flex-start',
  },
  gridContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
    flexGrow: 1,
  },
  empty: {
    alignItems: 'center',
    padding: spacing.xl,
    marginTop: spacing.xl,
  },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
    marginTop: spacing.md,
  },
  emptyText: {
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 22,
  },
  linkBtn: {
    marginTop: spacing.lg,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 10,
  },
  linkBtnText: { color: '#fff', fontWeight: '700' },
});
