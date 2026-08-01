import { Platform } from 'react-native';
import type { OnePieceCard } from '../types/card';
import { getLocalWebImageUri } from './localImages';

/**
 * El sitio oficial responde con Cross-Origin-Resource-Policy: same-site,
 * así que el navegador bloquea <img> desde localhost (ERR_BLOCKED_BY_RESPONSE.NotSameSite).
 * En web: preferir imágenes locales (npm run sync:images); si no, wsrv.nl.
 */
const WEB_IMAGE_PROXY = 'https://wsrv.nl/';
const resolvedUrlCache = new Map<string, string>();

export function getCardImageUri(
  card: OnePieceCard,
  size: 'small' | 'large' = 'small'
): string | undefined {
  const local = getLocalWebImageUri(card.id);
  if (local) return local;

  if (size === 'large') {
    return card.images?.large || card.images?.small || undefined;
  }
  return card.images?.small || card.images?.large || undefined;
}

/** URL lista para mostrar en <img> (en web pasa por proxy si no hay imagen local). */
export function resolveCardImageUrl(
  uri: string,
  width: number,
  height: number
): string {
  if (Platform.OS !== 'web') return uri;
  if (uri.startsWith('/card-images/')) return uri;
  if (uri.includes('wsrv.nl') || uri.includes('weserv.nl')) return uri;

  const cacheKey = `v4|${uri}|${width}`;
  const cached = resolvedUrlCache.get(cacheKey);
  if (cached) return cached;

  const params = new URLSearchParams({
    url: uri,
    w: String(Math.round(width * 2)),
    fit: 'inside',
    bg: 'transparent',
    output: 'webp',
    q: '80',
  });
  const resolved = `${WEB_IMAGE_PROXY}?${params.toString()}`;
  resolvedUrlCache.set(cacheKey, resolved);
  return resolved;
}

export function getCardSetName(card: OnePieceCard): string | null {
  const name = card.set?.name?.trim();
  return name || null;
}

const SET_TYPE_PREFIXES = [
  /^BOOSTER PACK\s*/i,
  /^STARTER DECK(?: EX)?\s*/i,
  /^EXTRA BOOSTER\s*/i,
  /^PREMIUM BOOSTER\s*/i,
  /^ULTRA DECK\s*/i,
  /^ULTIMATE DECK\s*/i,
  /^Promotion card\s*/i,
  /^Other Product Card\s*/i,
  /^Family Deck Set\s*/i,
  /^Limited Product Card\s*/i,
  /^Recording\s*/i,
  /^ALL\s*/i,
];

/** IDs del sitio EN cuyo título en el desplegable es solo la categoría (sin [código]). */
const PACK_ID_DISPLAY_NAMES: Record<string, string> = {
  '569901': 'Promotion card',
  '569801': 'Other Product Card',
};

/** Quita HTML y prefijos del sitio oficial; deja solo "NOMBRE [CÓDIGO]". */
export function formatSetDisplayName(raw: string): string {
  const trimmed = raw.trim();
  if (PACK_ID_DISPLAY_NAMES[trimmed]) return PACK_ID_DISPLAY_NAMES[trimmed];

  let s = trimmed
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&amp;/gi, '&')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  for (const prefix of SET_TYPE_PREFIXES) {
    s = s.replace(prefix, '');
  }

  s = s.replace(/^\s*-\s*/, '').trim();
  if (!s) return trimmed;

  const bracket = s.match(/\[([^\]]+)\]\s*$/);
  if (!bracket) return s;

  const code = bracket[1].trim();
  let title = s.slice(0, bracket.index).trim().replace(/^-\s*/, '').replace(/\s*-\s*$/, '');
  if (!title) return `[${code}]`;
  return `${title} [${code}]`;
}

/** Códigos de expansión extraídos del nombre, p. ej. "OP14", "ST-14" */
export function getSetCodeFromName(setName: string): string | null {
  const match = setName.match(/\[([^\]]+)\]\s*$/);
  return match ? match[1].trim() : null;
}

type SetGroup = 'OP' | 'ST' | 'PRB' | 'EB' | 'GC' | 'OTHER';

const SET_GROUP_ORDER: Record<SetGroup, number> = {
  OP: 0,
  ST: 1,
  PRB: 2,
  EB: 3,
  GC: 4,
  OTHER: 99,
};

function getSetGroup(code: string): SetGroup {
  const c = code.toUpperCase().replace(/\s/g, '');
  if (c.startsWith('OP')) return 'OP';
  if (c.startsWith('ST')) return 'ST';
  if (c.startsWith('PRB') || c.startsWith('PBR')) return 'PRB';
  if (c.startsWith('EB')) return 'EB';
  if (c.startsWith('GC')) return 'GC';
  return 'OTHER';
}

/** Primer número del código (OP-13 → 13, OP15-EB04 → 15). */
function getSetNumericOrder(code: string): number {
  const m = code.match(/(\d+)/);
  return m ? parseInt(m[1], 10) : 0;
}

/** Orden: OP → ST → PRB → EB → GC → resto; dentro de cada grupo por número. */
export function compareSetNames(a: string, b: string): number {
  const codeA = getSetCodeFromName(a) ?? '';
  const codeB = getSetCodeFromName(b) ?? '';

  const groupDiff =
    SET_GROUP_ORDER[getSetGroup(codeA)] - SET_GROUP_ORDER[getSetGroup(codeB)];
  if (groupDiff !== 0) return groupDiff;

  const numDiff = getSetNumericOrder(codeA) - getSetNumericOrder(codeB);
  if (numDiff !== 0) return numDiff;

  return codeA.localeCompare(codeB, 'en', { numeric: true });
}

export function extractUniqueSets(cards: OnePieceCard[]): string[] {
  const names = new Set<string>();
  for (const card of cards) {
    const setName = getCardSetName(card);
    if (setName) names.add(setName);
  }
  return [...names].sort(compareSetNames);
}

export function sortSetNames(names: string[]): string[] {
  return [...names].sort(compareSetNames);
}

/** Orden del catálogo: colección (OP→ST→PRB…) y luego código de carta. */
export function compareCards(a: OnePieceCard, b: OnePieceCard): number {
  const setA = getCardSetName(a) ?? '';
  const setB = getCardSetName(b) ?? '';

  if (setA !== setB) {
    if (!setA) return 1;
    if (!setB) return -1;
    const bySet = compareSetNames(setA, setB);
    if (bySet !== 0) return bySet;
  }

  const byCode = a.code.localeCompare(b.code, 'en', { numeric: true });
  if (byCode !== 0) return byCode;

  return a.id.localeCompare(b.id, 'en', { numeric: true });
}

export function sortCards(cards: OnePieceCard[]): OnePieceCard[] {
  return [...cards].sort(compareCards);
}
