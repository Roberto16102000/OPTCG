import type { OnePieceCard } from '../types/card';
import { PROMO_SET_NAME } from './cards';

/** Un sobre abrible: una expansión con suficientes cartas para tirar 12. */
export interface PackDefinition {
  /** Prefijo del código, p. ej. "OP12". */
  id: string;
  /** Etiqueta corta mostrada en el carrusel: "OP-12". */
  label: string;
  /** Nombre de la colección tal como lo publica Bandai. */
  name: string;
  /** Todas las cartas del set (base + arts alternativos). */
  cards: OnePieceCard[];
  /** Solo cartas base (id === code); es el denominador de la colección. */
  baseCards: OnePieceCard[];
  /** Cartas que reparte. Los boosters dan 12; el de promos, 1. */
  cardsPerPack: number;
  /**
   * Colecciones que agrupa, cuando el sobre no es una expansión única. El de
   * promos junta "Promotion card" y "Other Product Card", y cada una se lista
   * por separado igual que en la pestaña Sets.
   */
  subSets?: { name: string; cards: OnePieceCard[] }[];
}

export interface PulledCard {
  card: OnePieceCard;
  /** Slot del que salió, para saber qué animación merece. */
  tier: PullTier;
  /** true si el usuario no la tenía antes de abrir este sobre. */
  isNew: boolean;
  /** true si es un art alternativo (id !== code). */
  isAltArt: boolean;
}

export type PullTier = 'base' | 'mid' | 'high' | 'chase';

const BOOSTER_PREFIX = /^(OP|EB|PRB)\d+$/;
const MIN_CARDS_FOR_BOOSTER = 12;
const CARDS_PER_BOOSTER = 12;

/** Id del sobre de promos; no viene del catálogo, se construye aparte. */
export const PROMO_PACK_ID = 'PROMO';

/**
 * Sobre de promos y productos sueltos: las cartas que no pertenecen a ningún
 * booster ni mazo. Reparte una sola carta, como el Bonus Pack real.
 */
/**
 * Todas las colecciones sin código se cargan bajo este nombre al leer el
 * catálogo, así que el sobre de promos tira de un solo grupo.
 */
const PROMO_SET_NAMES = [PROMO_SET_NAME];

/** Nombre de colección sin el HTML escapado que trae el catálogo. */
function plainSetName(card: OnePieceCard): string {
  return (card.set?.name ?? '')
    .replace(/&lt;[^&]*&gt;/g, '')
    .replace(/<[^>]*>/g, '')
    .trim();
}

export function buildPromoPack(cards: OnePieceCard[]): PackDefinition | null {
  const subSets = PROMO_SET_NAMES.map((name) => ({
    name,
    cards: cards.filter((card) => plainSetName(card) === name),
  })).filter((group) => group.cards.length > 0);

  if (!subSets.length) return null;

  const pool = subSets.flatMap((group) => group.cards);
  const baseCards = pool.filter((card) => card.id === card.code);
  if (!baseCards.length) return null;

  return {
    id: PROMO_PACK_ID,
    label: 'PROMO',
    name: 'Promos y otros',
    cards: pool,
    baseCards,
    cardsPerPack: 1,
    subSets,
  };
}

/** Cartas por sobre, igual que un booster físico de One Piece. */
export const CARDS_PER_PACK = 12;

/** Sobres abiertos sin chase antes de garantizar uno. */
export const PITY_THRESHOLD = 30;

/**
 * Limpia el nombre de colección que viene del sitio oficial: trae HTML
 * escapado y el código del set repetido al final.
 * `&lt;br class="spInline"&gt;-Anime 25th Collection [EB-02]` → `Anime 25th Collection`
 */
export function cleanSetName(raw: string | undefined, fallback: string): string {
  if (!raw) return fallback;
  const withoutTags = raw
    .replace(/&lt;[^&]*&gt;/g, '')
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&');
  const withoutCode = withoutTags.replace(/\[[^\]]*\]\s*$/, '');
  // Varios títulos vienen enmarcados en guiones: `-ADVENTURE ON KAMI’S ISLAND-`.
  const cleaned = withoutCode.replace(/^[\s\-–—]+/, '').replace(/[\s\-–—]+$/, '').trim();
  return cleaned || fallback;
}

/**
 * Si el código entre corchetes del final corresponde a este sobre. Algunos sets
 * son ediciones conjuntas y llevan dos códigos (`[OP15-EB04]`), así que se
 * compara segmento a segmento.
 */
function rawNameBelongsToPack(raw: string, id: string): boolean {
  const match = raw.match(/\[([^\]]*)\]\s*$/);
  if (!match) return false;
  return match[1]
    .toUpperCase()
    .split(/[^A-Z0-9]+/)
    .filter(Boolean)
    .includes(id.toUpperCase());
}

/**
 * Nombre del producto a partir de sus cartas. Un sobre incluye reprints de
 * otros sets, así que no vale mirar la primera carta: se busca la que lleva el
 * código del propio sobre y, si ninguna lo lleva, el nombre más repetido.
 */
export function resolvePackName(id: string, cards: OnePieceCard[]): string {
  const fallback = formatPackLabel(id);
  const counts = new Map<string, number>();
  let mostCommon: string | undefined;
  let mostCommonCount = 0;

  for (const card of cards) {
    const raw = card.set?.name;
    if (!raw) continue;
    if (rawNameBelongsToPack(raw, id)) return cleanSetName(raw, fallback);

    const count = (counts.get(raw) ?? 0) + 1;
    counts.set(raw, count);
    if (count > mostCommonCount) {
      mostCommonCount = count;
      mostCommon = raw;
    }
  }

  return cleanSetName(mostCommon, fallback);
}

/** "OP12" → "OP-12" */
export function formatPackLabel(id: string): string {
  const match = id.match(/^([A-Z]+)(\d+)$/);
  return match ? `${match[1]}-${match[2]}` : id;
}

/** Agrupa el catálogo en sobres abribles, ordenados del más reciente al más antiguo. */
export function buildPacks(cards: OnePieceCard[]): PackDefinition[] {
  const groups = new Map<string, OnePieceCard[]>();

  for (const card of cards) {
    const prefix = card.code?.split('-')[0];
    if (!prefix || !BOOSTER_PREFIX.test(prefix)) continue;
    const bucket = groups.get(prefix);
    if (bucket) bucket.push(card);
    else groups.set(prefix, [card]);
  }

  const packs: PackDefinition[] = [];
  for (const [id, packCards] of groups) {
    const baseCards = packCards.filter((card) => card.id === card.code);
    if (baseCards.length < MIN_CARDS_FOR_BOOSTER) continue;
    packs.push({
      id,
      label: formatPackLabel(id),
      name: resolvePackName(id, packCards),
      cards: packCards,
      baseCards,
      cardsPerPack: CARDS_PER_BOOSTER,
    });
  }

  // Orden de lectura: primero las expansiones principales por número, luego los
  // extra booster y los premium. Antes iba del más reciente al más antiguo.
  const FAMILY_ORDER = ['OP', 'EB', 'PRB'];
  const familyOf = (id: string) => id.replace(/\d+$/, '');
  const numberOf = (id: string) => Number(id.match(/\d+$/)?.[0] ?? 0);

  return packs.sort((a, b) => {
    const famA = FAMILY_ORDER.indexOf(familyOf(a.id));
    const famB = FAMILY_ORDER.indexOf(familyOf(b.id));
    if (famA !== famB) return famA - famB;
    return numberOf(a.id) - numberOf(b.id);
  });
}

/** Rarezas que puede ocupar cada slot, de preferida a respaldo. */
const SLOT_RARITIES: Record<'common' | 'uncommon' | 'rare', string[]> = {
  common: ['C', 'UC', 'R'],
  uncommon: ['UC', 'C', 'R'],
  rare: ['R', 'SR', 'UC'],
};

interface HitOutcome {
  rarities: string[];
  tier: PullTier;
  weight: number;
  altArt?: boolean;
}

/** Slot 12: el "hit". Pesos aproximados a las tasas reales de Bandai. */
const HIT_TABLE: HitOutcome[] = [
  { rarities: ['R'], tier: 'mid', weight: 55 },
  { rarities: ['SR'], tier: 'high', weight: 26 },
  { rarities: ['L'], tier: 'high', weight: 8 },
  { rarities: ['SEC'], tier: 'chase', weight: 5 },
  { rarities: ['SP CARD', 'TR'], tier: 'chase', weight: 4 },
  { rarities: [], tier: 'chase', weight: 2, altArt: true },
];

/** Resultados que cuentan como chase para el contador de pity. */
const PITY_OUTCOMES = HIT_TABLE.filter((outcome) => outcome.tier === 'chase');

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function pickWeighted(outcomes: HitOutcome[]): HitOutcome {
  const total = outcomes.reduce((sum, outcome) => sum + outcome.weight, 0);
  let roll = Math.random() * total;
  for (const outcome of outcomes) {
    roll -= outcome.weight;
    if (roll <= 0) return outcome;
  }
  return outcomes[outcomes.length - 1];
}

/**
 * Elige una carta de la primera rareza con stock. Devuelve null si el set
 * no tiene ninguna de esas rarezas (pasa en los EB, que no llevan UC).
 */
function pickByRarity(pool: OnePieceCard[], rarities: string[]): OnePieceCard | null {
  for (const rarity of rarities) {
    const matches = pool.filter((card) => card.rarity === rarity);
    if (matches.length) return pickRandom(matches);
  }
  return null;
}

export interface RollOptions {
  /** Sobres abiertos de este set sin sacar un chase. */
  packsSinceChase?: number;
  /** Ids que el usuario ya tiene, para marcar las nuevas. */
  ownedIds?: ReadonlySet<string>;
}

export interface RollResult {
  cards: PulledCard[];
  /** Contador de pity ya actualizado: 0 si este sobre trajo un chase. */
  packsSinceChase: number;
}

/**
 * Tira un sobre de 12 cartas: 6 comunes, 3 poco comunes, 2 raras y 1 hit.
 * El hit va al final porque la apertura revela en orden ascendente.
 */
export function rollPack(pack: PackDefinition, options: RollOptions = {}): RollResult {
  const { packsSinceChase = 0, ownedIds } = options;
  const basePool = pack.baseCards;
  const altArtPool = pack.cards.filter((card) => card.id !== card.code);

  // El sobre de promos reparte una sola carta: no tiene slots comunes, solo
  // el sorteo del "hit" sobre todo su fondo.
  if (pack.cardsPerPack === 1) {
    // Sortea sobre el fondo entero, variantes incluidas: un promo no tiene
    // slots ni numeración base que respetar, y las 449 alternativas también
    // forman parte de esas colecciones.
    const card = pickRandom(pack.cards);
    return {
      cards: [
        {
          card,
          tier: card.rarity === 'P' ? 'high' : 'mid',
          isNew: !ownedIds?.has(card.id),
          isAltArt: card.id !== card.code,
        },
      ],
      packsSinceChase: packsSinceChase + 1,
    };
  }

  const slots: { key: 'common' | 'uncommon' | 'rare'; count: number; tier: PullTier }[] = [
    { key: 'common', count: 6, tier: 'base' },
    { key: 'uncommon', count: 3, tier: 'base' },
    { key: 'rare', count: 2, tier: 'mid' },
  ];

  const pulled: PulledCard[] = [];
  const usedIds = new Set<string>();

  const push = (card: OnePieceCard, tier: PullTier) => {
    usedIds.add(card.id);
    pulled.push({
      card,
      tier,
      isNew: !ownedIds?.has(card.id),
      isAltArt: card.id !== card.code,
    });
  };

  for (const slot of slots) {
    for (let i = 0; i < slot.count; i += 1) {
      // Evita duplicados dentro del mismo sobre, como un booster real.
      const available = basePool.filter((card) => !usedIds.has(card.id));
      const card =
        pickByRarity(available, SLOT_RARITIES[slot.key]) ??
        pickByRarity(basePool, SLOT_RARITIES[slot.key]);
      if (card) push(card, slot.tier);
    }
  }

  const forceChase = packsSinceChase + 1 >= PITY_THRESHOLD;
  const table = forceChase ? PITY_OUTCOMES : HIT_TABLE;

  let hit: PulledCard | null = null;
  // Un set puede no tener la rareza sorteada; reintenta con el resto de la tabla.
  const remaining = [...table];
  while (remaining.length && !hit) {
    const outcome = pickWeighted(remaining);
    remaining.splice(remaining.indexOf(outcome), 1);

    if (outcome.altArt) {
      const available = altArtPool.filter((card) => !usedIds.has(card.id));
      if (available.length) {
        const card = pickRandom(available);
        hit = {
          card,
          tier: outcome.tier,
          isNew: !ownedIds?.has(card.id),
          isAltArt: true,
        };
      }
      continue;
    }

    const available = basePool.filter((card) => !usedIds.has(card.id));
    const card = pickByRarity(available, outcome.rarities);
    if (card) {
      hit = {
        card,
        tier: outcome.tier,
        isNew: !ownedIds?.has(card.id),
        isAltArt: card.id !== card.code,
      };
    }
  }

  if (hit) {
    usedIds.add(hit.card.id);
    pulled.push(hit);
  }

  return {
    cards: pulled,
    packsSinceChase: hit?.tier === 'chase' ? 0 : packsSinceChase + 1,
  };
}
