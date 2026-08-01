/**
 * Cliente API TCG — One Piece
 * Documentación: https://docs.apitcg.com/api-reference
 *
 * Endpoints usados:
 * - Listado:  GET /api/one-piece/cards?page=&limit=&filtros
 * - Carta:    GET /api/one-piece/cards/{id}
 * - Auth:     header x-api-key
 * - Paginación: page, limit (máx. 100)
 */
import Constants from 'expo-constants';
import type { CardFilters, CardsPageResponse, OnePieceCard } from '../types/card';

/** https://docs.apitcg.com/api-reference/cards (usar www: apitcg.com redirige 308 y en web pierde x-api-key) */
export const API_CARDS_URL = 'https://www.apitcg.com/api/one-piece/cards';

/** https://docs.apitcg.com/api-reference/pagination */
export const MAX_PAGE_LIMIT = 100;

const DEFAULT_LIMIT = MAX_PAGE_LIMIT;

function getApiKey(): string | undefined {
  return (
    process.env.EXPO_PUBLIC_APITCG_API_KEY ??
    (Constants.expoConfig?.extra?.apiKey as string | undefined)
  );
}

export function hasApiKey(): boolean {
  const key = getApiKey();
  return Boolean(key && key.trim().length > 0);
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function apiFetch(path: string): Promise<Response> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new ApiError(
      'Configura tu API key en .env (EXPO_PUBLIC_APITCG_API_KEY). Obtén una en https://www.apitcg.com/platform'
    );
  }

  let response: Response;
  try {
    response = await fetch(`${API_CARDS_URL}${path}`, {
      headers: { 'x-api-key': apiKey },
    });
  } catch {
    throw new ApiError(
      'No se pudo conectar con la API. Comprueba tu conexión a internet.'
    );
  }

  if (!response.ok) {
    const body = await response.text();
    if (response.status === 401 || body.includes('Invalid API key')) {
      throw new ApiError(
        'API key inválida. Revisa tu clave en https://www.apitcg.com/platform',
        401
      );
    }
    throw new ApiError(`Error de API (${response.status})`, response.status);
  }

  return response;
}

function buildQuery(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') {
      search.set(key, String(value));
    }
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

/** Listado paginado con filtros (name, color, rarity, etc.) */
export async function fetchCardsPage(
  page = 1,
  limit = DEFAULT_LIMIT,
  filters: CardFilters = {}
): Promise<CardsPageResponse> {
  const cappedLimit = Math.min(limit, MAX_PAGE_LIMIT);
  const query = buildQuery({ page, limit: cappedLimit, ...filters });
  const response = await apiFetch(query);
  return response.json() as Promise<CardsPageResponse>;
}

/**
 * Carta individual por ID
 * @see https://docs.apitcg.com/api-reference/card
 * Ejemplo: GET https://www.apitcg.com/api/one-piece/cards/OP06-014
 */
export async function fetchCardById(id: string): Promise<OnePieceCard> {
  const response = await apiFetch(`/${encodeURIComponent(id)}`);
  const json = (await response.json()) as { data: OnePieceCard };
  return json.data;
}

/** Descarga todas las páginas (limit máx. 100 por página) */
export async function fetchAllCards(
  onProgress?: (current: number, total: number) => void
): Promise<OnePieceCard[]> {
  const first = await fetchCardsPage(1, MAX_PAGE_LIMIT);
  const all: OnePieceCard[] = [...first.data];
  onProgress?.(1, first.totalPages);

  for (let page = 2; page <= first.totalPages; page++) {
    const next = await fetchCardsPage(page, MAX_PAGE_LIMIT);
    all.push(...next.data);
    onProgress?.(page, first.totalPages);
  }

  return all;
}

export async function searchCardsByName(
  name: string,
  page = 1
): Promise<CardsPageResponse> {
  return fetchCardsPage(page, MAX_PAGE_LIMIT, { name });
}
