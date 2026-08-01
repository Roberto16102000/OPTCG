/** Cards shown per pagination page (5 cols × 12 rows = 60). */

export const CATALOG_PAGE_SIZE = 60;



export const GRID_COLUMNS = 5;

export const GRID_GAP = 10;

export const GRID_HORIZONTAL_PADDING = 16;

export const CARD_ASPECT_RATIO = 1.39;



export function getGridColumns(_containerWidth?: number): number {

  return GRID_COLUMNS;

}



export function getTileSize(

  containerWidth: number,

  numColumns: number = GRID_COLUMNS

): { width: number; height: number } {

  const inner = containerWidth - GRID_HORIZONTAL_PADDING * 2;

  const totalGap = GRID_GAP * (numColumns - 1);

  const width = Math.floor((inner - totalGap) / numColumns);

  const height = Math.round(width * CARD_ASPECT_RATIO);

  return { width: Math.max(width, 80), height };

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


