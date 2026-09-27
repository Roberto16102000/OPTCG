import type { OnePieceCard } from '../types/card';

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

/** Una carta es ALT cuando su id lleva sufijo de variante (`OP09-007_p1`). */
export const ART_FILTER_OPTIONS = [
  { id: 'all', label: 'ALL' },
  { id: 'base', label: 'Base' },
  { id: 'alt', label: 'ALT' },
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

export function isAltArtCard(card: OnePieceCard): boolean {
  return Boolean(card.code) && card.id !== card.code;
}

function cardMatchesArt(card: OnePieceCard, value: ChipFilterValue): boolean {
  if (value === 'all') return true;
  return value === 'alt' ? isAltArtCard(card) : !isAltArtCard(card);
}

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

/**
 * Búsqueda por varias palabras sobre la identidad de la carta: nombre, código,
 * traits y color.
 *
 * El nombre de la colección queda fuera a propósito. Seis mazos se llaman como
 * su líder —`RED Monkey.D.Luffy [ST-31]`, `Monkey D. Luffy [ST-08]`…—, así que
 * buscar "luffy" devolvía además las 78 cartas de esos mazos: Nami, Marco,
 * Uso-Hachi y compañía, que no tienen nada que ver. Para buscar por colección
 * está el selector de sets, que además acierta siempre.
 */
export function cardMatchesSearch(card: OnePieceCard, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const terms = q.split(/\s+/).filter(Boolean);
  const hay = [card.name, card.code, card.family, card.color]
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
  /** Ilustración base o alternativa. */
  art: ChipFilterValue;
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
      cardMatchesFamily(c, filters.family) &&
      cardMatchesArt(c, filters.art)
  );
}
