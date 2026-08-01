import type { OnePieceCard } from '../types/card';
import { getCardSetName } from './cards';

export type ChipFilterValue = string; // 'all' o valor concreto

export const COLOR_FILTER_OPTIONS = [
  { id: 'all', label: 'ALL' },
  { id: 'Red', label: 'Red' },
  { id: 'Green', label: 'Green' },
  { id: 'Blue', label: 'Blue' },
  { id: 'Purple', label: 'Purple' },
  { id: 'Black', label: 'Black' },
  { id: 'Yellow', label: 'Yellow' },
  { id: 'Multicolor', label: 'Multicolor' },
] as const;

export const TYPE_FILTER_OPTIONS = [
  { id: 'all', label: 'ALL' },
  { id: 'Leader', label: 'Leader' },
  { id: 'Character', label: 'Character' },
  { id: 'Stage', label: 'Stage' },
  { id: 'Event', label: 'Event' },
] as const;

export const RARITY_FILTER_OPTIONS = [
  { id: 'all', label: 'ALL' },
  { id: 'C', label: 'C' },
  { id: 'UC', label: 'UC' },
  { id: 'R', label: 'R' },
  { id: 'SR', label: 'SR' },
  { id: 'L', label: 'L' },
  { id: 'SEC', label: 'SEC' },
  { id: 'SP', label: 'SP' },
  { id: 'TR', label: 'TR' },
  { id: 'P', label: 'P' },
] as const;

export const OWNED_FILTER_OPTIONS = [
  { id: 'all', label: 'All cards' },
  { id: 'owned', label: 'Owned' },
  { id: 'missing', label: 'Missing' },
] as const;

export const ILLUSTRATION_FILTER_OPTIONS = [
  { id: 'all', label: 'ALL' },
  { id: 'Comic', label: 'Comic' },
  { id: 'Animation', label: 'Animation' },
  { id: 'Original Illustrations', label: 'Original Illustrations' },
  { id: 'Other', label: 'Other' },
] as const;

function normalizeCardType(type: string): string {
  const t = type.trim().toUpperCase();
  if (t === 'LEADER') return 'Leader';
  if (t === 'CHARACTER') return 'Character';
  if (t === 'STAGE') return 'Stage';
  if (t === 'EVENT') return 'Event';
  return type;
}

function cardColors(card: OnePieceCard): string[] {
  if (!card.color) return [];
  return card.color.split('/').map((c) => c.trim()).filter(Boolean);
}

export function cardMatchesColor(card: OnePieceCard, filter: ChipFilterValue): boolean {
  if (filter === 'all') return true;
  const colors = cardColors(card);
  if (filter === 'Multicolor') return colors.length > 1;
  return colors.some((c) => c.toLowerCase() === filter.toLowerCase());
}

export function cardMatchesType(card: OnePieceCard, filter: ChipFilterValue): boolean {
  if (filter === 'all') return true;
  return normalizeCardType(card.type) === filter;
}

export function cardMatchesIllustration(card: OnePieceCard, filter: ChipFilterValue): boolean {
  if (filter === 'all') return true;
  if (!card.illustrationType) return false;
  return card.illustrationType === filter;
}

export function cardMatchesRarity(card: OnePieceCard, filter: ChipFilterValue): boolean {
  if (filter === 'all') return true;
  const rarity = card.rarity ?? '';
  if (filter === 'SR') return rarity.startsWith('SR');
  if (filter === 'SP') return rarity === 'SP CARD' || rarity.startsWith('SP');
  return rarity === filter;
}

/** Traits / categories on the card (e.g. Supernovas, Straw Hat Crew). */
export function getCardFamilies(card: OnePieceCard): string[] {
  if (!card.family?.trim()) return [];
  return card.family.split('/').map((t) => t.trim()).filter(Boolean);
}

export function cardMatchesFamily(card: OnePieceCard, filter: ChipFilterValue): boolean {
  if (filter === 'all') return true;
  const needle = filter.toLowerCase();
  return getCardFamilies(card).some((f) => f.toLowerCase() === needle);
}

export function extractUniqueFamilies(cards: OnePieceCard[]): string[] {
  const names = new Set<string>();
  for (const card of cards) {
    for (const f of getCardFamilies(card)) names.add(f);
  }
  return [...names].sort((a, b) => a.localeCompare(b));
}

export function buildFamilyCounts(cards: OnePieceCard[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const card of cards) {
    for (const f of getCardFamilies(card)) {
      counts[f] = (counts[f] ?? 0) + 1;
    }
  }
  return counts;
}

/** Multi-word search across name, code, family, set, color. */
export function cardMatchesSearch(card: OnePieceCard, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const terms = q.split(/\s+/).filter(Boolean);
  const hay = [
    card.name,
    card.code,
    card.family,
    getCardSetName(card),
    card.color,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return terms.every((t) => hay.includes(t));
}

export type OwnedFilterValue = 'all' | 'owned' | 'missing';

export interface CatalogFiltersState {
  color: ChipFilterValue;
  cardType: ChipFilterValue;
  illustration: ChipFilterValue;
  rarity: ChipFilterValue;
  family: ChipFilterValue;
  owned: OwnedFilterValue;
}

export function applyCatalogFilters(
  cards: OnePieceCard[],
  filters: CatalogFiltersState
): OnePieceCard[] {
  return cards.filter(
    (c) =>
      cardMatchesColor(c, filters.color) &&
      cardMatchesType(c, filters.cardType) &&
      cardMatchesIllustration(c, filters.illustration) &&
      cardMatchesRarity(c, filters.rarity) &&
      cardMatchesFamily(c, filters.family)
  );
}
