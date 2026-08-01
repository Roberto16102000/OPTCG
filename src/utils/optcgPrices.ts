const OPTCG_BASE = 'https://optcgapi.com';

export interface OptcgPriceRow {
  market_price: number | null;
  inventory_price: number | null;
  card_name: string;
  card_set_id?: string;
  card_image_id?: string;
  date_scraped?: string;
  rarity?: string;
}

const cache = new Map<string, OptcgPriceRow[] | null>();

/** Normalize catalog codes (e.g. OP01-001) for OPTCG API. */
export function normalizeCardCode(raw: string): string {
  const s = String(raw || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '');
  const m = s.match(/^([A-Z]{2,4})-?(\d{1,4}[A-Z]?)$/);
  if (!m) return s;
  const prefix = m[1].replace(/(\D+)(\d+)$/, (_, letters: string, digits: string) => {
    return letters + String(digits).padStart(2, '0');
  });
  const num = m[2].padStart(3, '0');
  return `${prefix}-${num}`;
}

export function formatUsd(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—';
  return `$${Number(value).toFixed(2)}`;
}

export function isParallelVariant(row: OptcgPriceRow): boolean {
  return Boolean(row.card_image_id?.match(/_p\d/i));
}

/** Catalog tile id (e.g. OP01-001_p1) denotes a parallel / alt-art print. */
export function isParallelCatalogId(catalogCardId: string): boolean {
  return /_(?:p|r)\d+/i.test(catalogCardId);
}

export function tcgplayerSearchUrl(query: string): string {
  return `https://www.tcgplayer.com/search/one-piece-cardgame/product?q=${encodeURIComponent(query)}`;
}

export async function fetchOptcgPrices(cardCode: string): Promise<OptcgPriceRow[]> {
  const key = normalizeCardCode(cardCode);
  if (!key) return [];
  if (cache.has(key)) return cache.get(key) ?? [];

  let res: Response;
  try {
    res = await fetch(`${OPTCG_BASE}/api/sets/card/${encodeURIComponent(key)}/`);
  } catch {
    cache.set(key, null);
    return [];
  }
  if (res.status === 404) {
    cache.set(key, null);
    return [];
  }
  let data: unknown;
  try {
    data = await res.json();
  } catch {
    cache.set(key, null);
    return [];
  }
  if (!res.ok) {
    cache.set(key, null);
    return [];
  }
  const rows: OptcgPriceRow[] = Array.isArray(data) ? data : [data];
  cache.set(key, rows);
  return rows;
}

export function clearOptcgPriceCache(): void {
  cache.clear();
}

function validPrices(rows: OptcgPriceRow[]): number[] {
  return rows
    .map((r) => r.market_price)
    .filter((p): p is number => p != null && !Number.isNaN(p));
}

/** Rows to display for this catalog tile (one variant only). */
export function priceRowsForCatalogCard(
  rows: OptcgPriceRow[],
  catalogCardId: string
): OptcgPriceRow[] {
  if (!rows.length) return [];
  if (!catalogCardId) {
    return rows.filter((r) => !isParallelVariant(r));
  }

  const targetUpper = catalogCardId.trim().toUpperCase();
  const exact = rows.filter((r) => (r.card_image_id || '').toUpperCase() === targetUpper);
  if (exact.length) return exact;

  const suffix = catalogCardId.match(/(_(?:p|r)\d+)$/i)?.[1]?.toLowerCase();
  if (suffix) {
    const bySuffix = rows.filter((r) =>
      (r.card_image_id || '').toLowerCase().endsWith(suffix)
    );
    if (bySuffix.length) return bySuffix;
  }

  if (isParallelCatalogId(catalogCardId)) {
    return rows.filter((r) => isParallelVariant(r));
  }

  return rows.filter((r) => !isParallelVariant(r));
}

/** Market price for bounty — same variant as shown in the modal. */
export function marketPriceForCatalogCard(
  rows: OptcgPriceRow[],
  catalogCardId: string
): number {
  const visible = priceRowsForCatalogCard(rows, catalogCardId);
  const prices = validPrices(visible);
  if (prices.length) return prices[0];
  return 0;
}

export async function fetchMarketPriceForCatalogCard(
  cardCode: string,
  catalogCardId: string
): Promise<number> {
  const rows = await fetchOptcgPrices(cardCode);
  return marketPriceForCatalogCard(rows, catalogCardId);
}

export async function fetchPriceRowsForCatalogCard(
  cardCode: string,
  catalogCardId: string
): Promise<OptcgPriceRow[]> {
  const rows = await fetchOptcgPrices(cardCode);
  return priceRowsForCatalogCard(rows, catalogCardId);
}
