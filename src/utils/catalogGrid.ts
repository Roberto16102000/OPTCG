/** Cards shown per pagination page (5 cols × 12 rows = 60). */

export const CATALOG_PAGE_SIZE = 60;



/** Columnas en escritorio. En pantallas estrechas se calculan por ancho. */
export const GRID_COLUMNS = 5;

/** Ancho al que se aspira por carta; de ahí sale el número de columnas. */
const TARGET_TILE_WIDTH = 150;
const MIN_COLUMNS = 2;
const MAX_COLUMNS = 7;

export const GRID_GAP = 10;

export const GRID_HORIZONTAL_PADDING = 16;

export const CARD_ASPECT_RATIO = 1.39;



export function getGridColumns(containerWidth?: number): number {
  if (!containerWidth || containerWidth <= 0) return GRID_COLUMNS;
  const inner = containerWidth - GRID_HORIZONTAL_PADDING * 2;
  const fits = Math.floor((inner + GRID_GAP) / (TARGET_TILE_WIDTH + GRID_GAP));
  return Math.max(MIN_COLUMNS, Math.min(MAX_COLUMNS, fits));
}



export function getTileSize(

  containerWidth: number,

  numColumns: number = GRID_COLUMNS

): { width: number; height: number } {

  const inner = containerWidth - GRID_HORIZONTAL_PADDING * 2;

  const totalGap = GRID_GAP * (numColumns - 1);

  const width = Math.floor((inner - totalGap) / numColumns);

  const height = Math.round(width * CARD_ASPECT_RATIO);

  return { width: Math.max(width, 1), height };

}



export function getTotalPages(itemCount: number, pageSize = CATALOG_PAGE_SIZE): number {

  return Math.max(1, Math.ceil(itemCount / pageSize));

}



export function getPageSlice<T>(

  items: T[],

  page: number,

  pageSize = CATALOG_PAGE_SIZE

): T[] {

  const start = (page - 1) * pageSize;

  return items.slice(start, start + pageSize);

}


