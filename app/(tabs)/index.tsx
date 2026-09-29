import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { takeSetFilter } from '../../src/utils/pendingSetFilter';

import {

  ActivityIndicator,

  FlatList,

  Platform,

  Pressable,

  ScrollView,
  StyleSheet,

  Text,

  TextInput,

  useWindowDimensions,

  View,

  type ViewToken,

} from 'react-native';

import {

  getOfficialCatalogMeta,

  hasOfficialCatalog,

  loadOfficialCatalog,

  OfficialCatalogError,

} from '../../src/api/official';

import MaterialDesignIcons from '@react-native-vector-icons/material-design-icons';
import { FilterLayoutProvider } from '../../src/components/filters/FilterLayoutContext';
import { Panel, PirateButton, SectionHeading } from '../../src/components/ui';
import { CatalogCardTile } from '../../src/components/CatalogCardTile';
import { CatalogPagination } from '../../src/components/CatalogPagination';
import { CardDetailModal } from '../../src/components/CardDetailModal';
import { CatalogFilters } from '../../src/components/CatalogFilters';
import { CollapsibleFilters } from '../../src/components/CollapsibleFilters';
import { OfficialCatalogBanner } from '../../src/components/OfficialCatalogBanner';
import { RegionFilter } from '../../src/components/RegionFilter';
import { SetFilter } from '../../src/components/SetFilter';
import { FamilyFilter } from '../../src/components/FamilyFilter';
import { breakpoints, colors, radii, spacing } from '../../src/constants/theme';

import { useCollection } from '../../src/context/CollectionContext';
import { useCollectionBounty } from '../../src/context/CollectionBountyContext';

import { useImageRegion } from '../../src/context/ImageRegionContext';

import {

  getCacheMeta,

  isCatalogCacheStale,

  loadCardsCache,

  saveCardsCache,

} from '../../src/storage/collection';

import type { OnePieceCard } from '../../src/types/card';

import {
  applyCatalogFilters,
  cardMatchesSearch,
  buildFamilyCounts,
  extractUniqueFamilies,
  type CatalogFiltersState,
} from '../../src/utils/cardFilters';

import {

  CATALOG_PAGE_SIZE,

  getGridColumns,

  getPageSlice,

  getTileSize,

  getTotalPages,

  GRID_GAP,

  GRID_HORIZONTAL_PADDING,

} from '../../src/utils/catalogGrid';

import {
  extractUniqueSets,
  getCardSetName,
  sortCards,
  unifySetNames,
} from '../../src/utils/cards';

import { CATALOG_THUMB, prefetchImageUris } from '../../src/utils/imageLoading';



/** Ancho de la columna de filtros; se descuenta del espacio del grid. */
const FILTERS_COLUMN_WIDTH = 264;

const DEFAULT_FILTERS: CatalogFiltersState = {
  color: 'all',
  cardType: 'all',
  illustration: 'all',
  art: 'all',
  rarity: 'all',
  family: 'all',
  owned: 'all',
};



export default function CatalogScreen() {
  const { width: windowWidth } = useWindowDimensions();
  const narrow = windowWidth < breakpoints.compact;

  const { getDisplayImageUri, region } = useImageRegion();

  const {
    isInCollection,
    getQuantity,
    addCard,
    removeCard,
    setQuantity,
  } = useCollection();
  const { ensurePrice } = useCollectionBounty();

  const addCardWithBounty = useCallback(
    async (card: OnePieceCard) => {
      await addCard(card);
      void ensurePrice(card);
    },
    [addCard, ensurePrice]
  );

  const [cards, setCards] = useState<OnePieceCard[]>([]);

  const [search, setSearch] = useState('');

  const [loading, setLoading] = useState(true);

  const [syncing, setSyncing] = useState(false);

  const [syncProgress, setSyncProgress] = useState('');

  const [error, setError] = useState<string | null>(null);

  const [selectedSet, setSelectedSet] = useState<string | null>(null);

  const [catalogFilters, setCatalogFilters] = useState<CatalogFiltersState>(DEFAULT_FILTERS);

  const [currentPage, setCurrentPage] = useState(1);

  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  // La columna arranca oculta: al entrar manda el catálogo, no los filtros.
  const [filtersOpen, setFiltersOpen] = useState(false);

  // El ancho se deduce, no se mide: `onLayout` no vuelve a dispararse cuando
  // aparece la columna, y el grid seguía calculando columnas de más.
  const showFiltersColumn = !narrow && filtersOpen;
  const effectiveGridWidth = Math.max(
    320,
    windowWidth - (showFiltersColumn ? FILTERS_COLUMN_WIDTH : 0)
  );



  const numColumns = useMemo(
    () => getGridColumns(effectiveGridWidth),
    [effectiveGridWidth]
  );

  const tileSize = useMemo(
    () => getTileSize(effectiveGridWidth, numColumns),
    [effectiveGridWidth, numColumns]
  );

  const loadFromCache = useCallback(async () => {

    const cached = await loadCardsCache();

    if (cached?.length) {

      setCards(sortCards(unifySetNames(cached)));

    }

    return cached?.length ?? 0;

  }, []);



  const syncFullDatabase = useCallback(async () => {

    setSyncing(true);

    setError(null);

    setSyncProgress('Loading official catalog...');

    try {

      const all = sortCards(loadOfficialCatalog());

      const bundled = getOfficialCatalogMeta();

      await saveCardsCache(all, {

        source: 'official',

        catalogSyncedAt: bundled?.syncedAt,

      });

      setCards(all);

      setSyncProgress('');

    } catch (e) {

      setError(

        e instanceof OfficialCatalogError

          ? e.message

          : e instanceof Error

            ? e.message

            : 'Sync failed'

      );

    } finally {

      setSyncing(false);

    }

  }, []);



  const loadInitial = useCallback(async () => {

    setLoading(true);

    setError(null);

    const officialMeta = getOfficialCatalogMeta();

    const cacheMeta = await getCacheMeta();

    const cachedCount = await loadFromCache();



    if (!hasOfficialCatalog()) {

      setLoading(false);

      return;

    }



    const needsRefresh =

      cachedCount === 0 ||

      isCatalogCacheStale(

        cacheMeta,

        officialMeta?.count ?? 0,

        officialMeta?.syncedAt ?? null

      );



    if (needsRefresh) {

      setSyncProgress(

        cacheMeta?.count

          ? `Updating catalog (${cacheMeta.count} → ${officialMeta?.count ?? '?'})...`

          : 'Loading official catalog...'

      );

      await syncFullDatabase();

    }

    setLoading(false);

  }, [loadFromCache, syncFullDatabase]);



  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  useFocusEffect(
    useCallback(() => {
      const queued = takeSetFilter();
      if (queued) {
        setSelectedSet(queued);
        setCurrentPage(1);
      }
    }, [])
  );

  const availableSets = useMemo(() => extractUniqueSets(cards), [cards]);



  const setCounts = useMemo(() => {

    const counts: Record<string, number> = {};

    for (const card of cards) {

      const setName = getCardSetName(card);

      if (setName) counts[setName] = (counts[setName] ?? 0) + 1;

    }

    return counts;

  }, [cards]);

  const availableFamilies = useMemo(() => extractUniqueFamilies(cards), [cards]);

  const familyCounts = useMemo(() => buildFamilyCounts(cards), [cards]);



  const filteredCards = useMemo(() => {

    let result = applyCatalogFilters(cards, catalogFilters);

    if (selectedSet) {

      result = result.filter((c) => getCardSetName(c) === selectedSet);

    }

    if (search.trim()) {
      result = result.filter((c) => cardMatchesSearch(c, search));
    }

    if (catalogFilters.owned === 'owned') {
      result = result.filter((c) => isInCollection(c.id));
    } else if (catalogFilters.owned === 'missing') {
      result = result.filter((c) => !isInCollection(c.id));
    }

    return sortCards(result);
  }, [cards, search, selectedSet, catalogFilters, isInCollection]);



  const totalPages = getTotalPages(filteredCards.length);

  const pageCards = useMemo(

    () => getPageSlice(filteredCards, currentPage),

    [filteredCards, currentPage]

  );



  const hasActiveFilters =
    catalogFilters.color !== 'all' ||
    catalogFilters.cardType !== 'all' ||
    catalogFilters.illustration !== 'all' ||
    catalogFilters.rarity !== 'all' ||
    catalogFilters.family !== 'all' ||
    catalogFilters.art !== 'all' ||
    catalogFilters.owned !== 'all';

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (catalogFilters.color !== 'all') count += 1;
    if (catalogFilters.cardType !== 'all') count += 1;
    if (catalogFilters.illustration !== 'all') count += 1;
    if (catalogFilters.rarity !== 'all') count += 1;
    if (catalogFilters.family !== 'all') count += 1;
    if (catalogFilters.art !== 'all') count += 1;
    if (catalogFilters.owned !== 'all') count += 1;
    if (selectedSet) count += 1;
    return count;
  }, [catalogFilters, selectedSet]);

  const canClear = Boolean(search.trim() || selectedSet || hasActiveFilters);



  useEffect(() => {

    setCurrentPage(1);

  }, [search, selectedSet, catalogFilters]);



  useEffect(() => {

    if (currentPage > totalPages) setCurrentPage(totalPages);

  }, [totalPages, currentPage]);



  const clearAllFilters = () => {

    setSearch('');

    setSelectedSet(null);

    setCatalogFilters(DEFAULT_FILTERS);

    setCurrentPage(1);

  };



  const previewCard =

    previewIndex !== null && previewIndex >= 0 && previewIndex < filteredCards.length

      ? filteredCards[previewIndex]

      : null;



  const detailPrefetchUris = useMemo(() => {

    if (previewIndex === null) return [];

    const neighbors = [

      filteredCards[previewIndex - 1],

      filteredCards[previewIndex],

      filteredCards[previewIndex + 1],

    ];

    return neighbors

      .map((c) => (c ? getDisplayImageUri(c, 'large') : undefined))

      .filter((u): u is string => Boolean(u));

  }, [previewIndex, filteredCards, getDisplayImageUri, region]);



  const prefetchVisibleThumbs = useCallback(

    (items: OnePieceCard[]) => {

      // Los codigos van en paralelo a las URLs para que la precarga pida la
      // miniatura propia, la misma que va a pintar el grid.
      const visibles = items.filter((c) => Boolean(getDisplayImageUri(c)));

      void prefetchImageUris(
        visibles.map((c) => getDisplayImageUri(c) as string),
        tileSize.width,
        tileSize.height,
        visibles.map((c) => c.id)
      );

    },

    [getDisplayImageUri, tileSize.width, tileSize.height]

  );



  useEffect(() => {

    if (pageCards.length) prefetchVisibleThumbs(pageCards);

  }, [pageCards, prefetchVisibleThumbs]);



  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 40 }).current;

  const prefetchVisibleThumbsRef = useRef(prefetchVisibleThumbs);
  prefetchVisibleThumbsRef.current = prefetchVisibleThumbs;

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken<OnePieceCard>[] }) => {
      const visible = viewableItems
        .filter((v) => v.isViewable && v.item)
        .map((v) => v.item as OnePieceCard);
      if (visible.length) prefetchVisibleThumbsRef.current(visible);
    }
  ).current;



  const openPreview = useCallback(
    (index: number) => {
      setPreviewIndex(index);
    },
    []
  );

  if (!hasOfficialCatalog()) {

    return (

      <View style={styles.container}>

        <OfficialCatalogBanner />

      </View>

    );

  }

  const filtersContent = (
    <>
      <SetFilter
        sets={availableSets}
        setCounts={setCounts}
        totalCount={cards.length}
        value={selectedSet}
        onChange={setSelectedSet}
      />
      <FamilyFilter
        families={availableFamilies}
        familyCounts={familyCounts}
        totalCount={cards.length}
        value={catalogFilters.family}
        onChange={(family) => setCatalogFilters((f) => ({ ...f, family }))}
      />
      <CatalogFilters
        filters={catalogFilters}
        onChange={(patch) => setCatalogFilters((f) => ({ ...f, ...patch }))}
      />
      <RegionFilter />
    </>
  );

  const catalogHeader = (
    <View style={styles.listHeader}>

      <Panel crowned style={styles.header}>
        <TextInput
          style={styles.search}
          placeholder="Search by name or code..."
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
        />
        {!narrow && cards.length > 0 ? (
          <Pressable
            onPress={() => setFiltersOpen((v) => !v)}
            accessibilityRole="button"
            accessibilityState={{ expanded: filtersOpen }}
            accessibilityLabel={filtersOpen ? 'Ocultar filtros' : 'Mostrar filtros'}
            style={({ pressed }) => [
              styles.filtersToggle,
              filtersOpen && styles.filtersToggleActive,
              pressed && styles.syncIconPressed,
            ]}
          >
            <MaterialDesignIcons
              name={filtersOpen ? 'filter-off-outline' : 'filter-variant'}
              size={20}
              color={filtersOpen ? colors.textOnPrimary : colors.text}
            />
            <Text
              style={[styles.filtersToggleText, filtersOpen && styles.filtersToggleTextActive]}
            >
              Filtros{activeFilterCount > 0 ? ` · ${activeFilterCount}` : ''}
            </Text>
          </Pressable>
        ) : null}

        {narrow ? (
          <Pressable
            onPress={syncFullDatabase}
            disabled={syncing}
            accessibilityRole="button"
            accessibilityLabel="Sincronizar catálogo"
            hitSlop={8}
            style={({ pressed }) => [
              styles.syncIcon,
              pressed && styles.syncIconPressed,
              syncing && styles.syncIconDisabled,
            ]}
          >
            <MaterialDesignIcons
              name={syncing ? 'progress-clock' : 'refresh'}
              size={22}
              color={colors.textOnPrimary}
            />
          </Pressable>
        ) : (
          <PirateButton
            label={syncing ? '...' : '↻ Sync'}
            variant="primary"
            onPress={syncFullDatabase}
            disabled={syncing}
          />
        )}
      </Panel>

      {cards.length > 0 && narrow ? (
        <CollapsibleFilters activeCount={activeFilterCount}>{filtersContent}</CollapsibleFilters>
      ) : null}

      {syncProgress ? <Text style={styles.progress}>{syncProgress}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.resultsBar}>
        <View style={styles.resultsLeft}>
          {canClear && (
            <PirateButton label="Clear" variant="ghost" onPress={clearAllFilters} />
          )}
          <Text style={styles.resultCount}>
            {filteredCards.length} result{filteredCards.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <CatalogPagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {loading && cards.length === 0 ? (
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      ) : (
        <View style={styles.body}>
          {showFiltersColumn && cards.length > 0 ? (
            <View style={styles.filtersColumn}>
              <SectionHeading
                title="Filtros"
                meta={activeFilterCount > 0 ? `${activeFilterCount} activos` : undefined}
                style={styles.filtersHeading}
              />
              <ScrollView
                style={styles.filtersScroll}
                contentContainerStyle={styles.filtersContent}
                showsVerticalScrollIndicator={false}
              >
                <FilterLayoutProvider stacked>{filtersContent}</FilterLayoutProvider>
              </ScrollView>
            </View>
          ) : null}

          <View style={styles.gridColumn}>
          {catalogHeader}
          <FlatList
            style={styles.gridList}
            key={`grid-${numColumns}`}
            data={pageCards}
            keyExtractor={(item) => item.id}
            numColumns={numColumns}
            columnWrapperStyle={numColumns > 1 ? styles.gridRow : undefined}
            initialNumToRender={36}
            maxToRenderPerBatch={36}
            windowSize={5}
            removeClippedSubviews={Platform.OS !== 'web'}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            contentContainerStyle={styles.gridContent}
            renderItem={({ item, index }) => (
              <CatalogCardTile
                card={item}
                width={tileSize.width}
                height={tileSize.height}
                onPress={() => openPreview((currentPage - 1) * CATALOG_PAGE_SIZE + index)}
                onQuickAdd={() => void addCardWithBounty(item)}
                inCollection={isInCollection(item.id)}
                quantity={getQuantity(item.id)}
              />
            )}
            ListEmptyComponent={
              <Text style={styles.empty}>
                {cards.length === 0
                  ? 'Press Sync to load the official catalog'
                  : 'No cards match these filters'}
              </Text>
            }
          />
          </View>
        </View>
      )}



      <CardDetailModal

        card={previewCard}

        visible={previewCard !== null}

        prefetchUris={detailPrefetchUris}

        onClose={() => setPreviewIndex(null)}

        onPrevious={() =>

          setPreviewIndex((i) => (i !== null && i > 0 ? i - 1 : i))

        }

        onNext={() =>

          setPreviewIndex((i) =>

            i !== null && i < filteredCards.length - 1 ? i + 1 : i

          )

        }

        hasPrevious={previewIndex !== null && previewIndex > 0}

        hasNext={

          previewIndex !== null && previewIndex < filteredCards.length - 1

        }

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
    position: 'relative',
    minHeight: 0,
  },

  body: {
    flex: 1,
    flexDirection: 'row',
    minHeight: 0,
  },
  gridColumn: {
    flex: 1,
    minWidth: 0,
  },
  /** Columna de filtros: ocupa el hueco que dejó la barra lateral. */
  filtersColumn: {
    width: FILTERS_COLUMN_WIDTH,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    backgroundColor: colors.gridPanel,
    paddingTop: spacing.md,
  },
  filtersHeading: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  filtersScroll: { flex: 1 },
  filtersContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  filtersToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    height: 44,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  filtersToggleActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filtersToggleText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  filtersToggleTextActive: { color: colors.textOnPrimary },
  /** En estrecho el sync es un icono junto al buscador, no una barra entera. */
  syncIcon: {
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  syncIconPressed: { opacity: 0.82 },
  syncIconDisabled: { opacity: 0.45 },
  header: {
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
    alignItems: 'center',
  },

  search: {
    flex: 1,
    minWidth: 0,
    backgroundColor: colors.glass,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },



  progress: { color: colors.accent, textAlign: 'center', marginBottom: spacing.sm },

  error: { color: colors.error, textAlign: 'center', margin: spacing.md },

  loader: { marginTop: spacing.xl },

  resultsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: GRID_HORIZONTAL_PADDING,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    flexWrap: 'wrap',
    backgroundColor: colors.toolbarBg,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },

  resultsLeft: {

    flexDirection: 'row',

    alignItems: 'center',

    gap: spacing.md,

    flexShrink: 1,

  },

  resultCount: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  listHeader: {
    width: '100%',
    alignSelf: 'stretch',
    backgroundColor: colors.background,
  },

  gridList: {
    flex: 1,
    minHeight: 0,
    backgroundColor: colors.gridPanel,
  },

  gridContent: {
    paddingHorizontal: GRID_HORIZONTAL_PADDING,
    paddingVertical: spacing.md,
    paddingBottom: spacing.lg,
    flexGrow: 1,
    width: '100%',
    alignSelf: 'stretch',
  },

  gridRow: {
    gap: GRID_GAP,
    marginBottom: GRID_GAP,
    justifyContent: 'flex-start',
  },

  empty: {

    color: colors.textMuted,

    textAlign: 'center',

    marginTop: spacing.xl,

    width: '100%',

  },

});


