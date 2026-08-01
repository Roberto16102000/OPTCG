import type { CollectionEntry, OnePieceCard } from '../types/card';
import type { CatalogFiltersState, OwnedFilterValue } from './cardFilters';
import {
  applyCatalogFilters,
  cardMatchesColor,
  cardMatchesFamily,
  cardMatchesRarity,
  cardMatchesSearch,
  cardMatchesType,
  COLOR_FILTER_OPTIONS,
  RARITY_FILTER_OPTIONS,
  TYPE_FILTER_OPTIONS,
} from './cardFilters';

export type CollectionSort = 'recent' | 'name' | 'code' | 'rarity';

export interface CollectionDisplayItem {
  card: OnePieceCard;
  owned: boolean;
  quantity: number;
  addedAt?: string;
}

const RARITY_ORDER: Record<string, number> = {
  SEC: 0,
  'SP CARD': 1,
  L: 2,
  'SR★': 3,
  SR: 4,
  TR: 5,
  R: 6,
  UC: 7,
  C: 8,
  P: 9,
};

export function getCardColorHex(colorName: string): string {
  const c = colorName.toLowerCase();
  if (c.includes('red')) return '#c41e3a';
  if (c.includes('green')) return '#16a34a';
  if (c.includes('blue')) return '#2563eb';
  if (c.includes('purple')) return '#9333ea';
  if (c.includes('black')) return '#334155';
  if (c.includes('yellow')) return '#eab308';
  return '#64748b';
}

export function getPrimaryCardColor(card: OnePieceCard): string {
  return card.color?.split('/')[0]?.trim() || '—';
}

function raritySortKey(rarity: string | undefined): number {
  if (!rarity) return 99;
  if (RARITY_ORDER[rarity] !== undefined) return RARITY_ORDER[rarity];
  if (rarity.startsWith('SR')) return 4;
  if (rarity.startsWith('SP')) return 1;
  return 50;
}

export function buildCollectionDisplayItems(
  catalogCards: OnePieceCard[],
  collectionList: CollectionEntry[],
  ownedView: OwnedFilterValue,
  filters: CatalogFiltersState,
  search: string
): CollectionDisplayItem[] {
  const entryById = new Map(collectionList.map((e) => [e.card.id, e]));
  const ownedIds = new Set(collectionList.map((e) => e.card.id));

  let pool: OnePieceCard[];
  if (ownedView === 'owned') {
    pool = collectionList.map((e) => e.card);
  } else if (ownedView === 'missing') {
    pool = catalogCards.filter((c) => !ownedIds.has(c.id));
  } else {
    pool = catalogCards.length ? catalogCards : collectionList.map((e) => e.card);
  }

  const filtered = applyCatalogFilters(pool, filters).filter((c) => cardMatchesSearch(c, search));

  return filtered.map((card) => {
    const entry = entryById.get(card.id);
    return {
      card,
      owned: ownedIds.has(card.id),
      quantity: entry?.quantity ?? 0,
      addedAt: entry?.addedAt,
    };
  });
}

export function sortCollectionItems(
  items: CollectionDisplayItem[],
  sort: CollectionSort
): CollectionDisplayItem[] {
  const next = [...items];
  next.sort((a, b) => {
    if (sort === 'recent') {
      if (a.addedAt && b.addedAt) return b.addedAt.localeCompare(a.addedAt);
      if (a.addedAt) return -1;
      if (b.addedAt) return 1;
      return a.card.code.localeCompare(b.card.code);
    }
    if (sort === 'name') return a.card.name.localeCompare(b.card.name);
    if (sort === 'rarity') {
      const diff = raritySortKey(a.card.rarity) - raritySortKey(b.card.rarity);
      return diff !== 0 ? diff : a.card.code.localeCompare(b.card.code);
    }
    return a.card.code.localeCompare(b.card.code);
  });
  return next;
}

function getCollectionPool(
  catalogCards: OnePieceCard[],
  collectionList: CollectionEntry[],
  ownedView: OwnedFilterValue
): OnePieceCard[] {
  const ownedIds = new Set(collectionList.map((e) => e.card.id));
  if (ownedView === 'owned') return collectionList.map((e) => e.card);
  if (ownedView === 'missing') return catalogCards.filter((c) => !ownedIds.has(c.id));
  return catalogCards.length ? catalogCards : collectionList.map((e) => e.card);
}

export interface CollectionFilterCounts {
  type: Record<string, number>;
  rarity: Record<string, number>;
  color: Record<string, number>;
}

export function getCollectionFilterCounts(
  catalogCards: OnePieceCard[],
  collectionList: CollectionEntry[],
  ownedView: OwnedFilterValue,
  search: string,
  filters: CatalogFiltersState
): CollectionFilterCounts {
  const pool = getCollectionPool(catalogCards, collectionList, ownedView).filter((c) =>
    cardMatchesSearch(c, search)
  );

  const baseForType = pool.filter(
    (c) =>
      cardMatchesRarity(c, filters.rarity) &&
      cardMatchesColor(c, filters.color) &&
      cardMatchesFamily(c, filters.family)
  );
  const baseForRarity = pool.filter(
    (c) =>
      cardMatchesType(c, filters.cardType) &&
      cardMatchesColor(c, filters.color) &&
      cardMatchesFamily(c, filters.family)
  );
  const baseForColor = pool.filter(
    (c) =>
      cardMatchesType(c, filters.cardType) &&
      cardMatchesRarity(c, filters.rarity) &&
      cardMatchesFamily(c, filters.family)
  );

  const type: Record<string, number> = { all: baseForType.length };
  for (const opt of TYPE_FILTER_OPTIONS) {
    if (opt.id === 'all') continue;
    type[opt.id] = baseForType.filter((c) => cardMatchesType(c, opt.id)).length;
  }

  const rarity: Record<string, number> = { all: baseForRarity.length };
  for (const opt of RARITY_FILTER_OPTIONS) {
    if (opt.id === 'all') continue;
    rarity[opt.id] = baseForRarity.filter((c) => cardMatchesRarity(c, opt.id)).length;
  }

  const color: Record<string, number> = { all: baseForColor.length };
  for (const opt of COLOR_FILTER_OPTIONS) {
    if (opt.id === 'all') continue;
    color[opt.id] = baseForColor.filter((c) => cardMatchesColor(c, opt.id)).length;
  }

  return { type, rarity, color };
}

export function countCollectionActiveFilters(
  search: string,
  ownedView: OwnedFilterValue,
  filters: CatalogFiltersState,
  defaultOwnedView: OwnedFilterValue = 'owned'
): number {
  let count = 0;
  if (search.trim()) count++;
  if (ownedView !== defaultOwnedView) count++;
  if (filters.cardType !== 'all') count++;
  if (filters.rarity !== 'all') count++;
  if (filters.color !== 'all') count++;
  if (filters.family !== 'all') count++;
  return count;
}

export const COLLECTION_GRID_COLUMNS = 4;
export const COLLECTION_GRID_GAP = 10;

export function getCollectionGridColumns(_containerWidth?: number): number {
  return COLLECTION_GRID_COLUMNS;
}

export function getCollectionTileSize(
  containerWidth: number,
  numColumns: number = COLLECTION_GRID_COLUMNS,
  gap = COLLECTION_GRID_GAP,
  horizontalPadding = 32
): { width: number; imageHeight: number } {
  const inner = Math.max(0, containerWidth - horizontalPadding);
  const totalGap = gap * (numColumns - 1);
  const width = Math.floor((inner - totalGap) / numColumns);
  const imageHeight = Math.round(width * 1.35);
  return { width: Math.max(width, 68), imageHeight };
}
