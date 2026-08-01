/** Sitio global EN (datos + imágenes por defecto) */
export const GLOBAL_CARDLIST_BASE = 'https://en.onepiece-cardgame.com';

/** Japanese site (card images only) */
export const JAPANESE_CARDLIST_BASE = 'https://www.onepiece-cardgame.com';

export type ImageRegion = 'global' | 'japanese';

export const IMAGE_REGION_OPTIONS = [
  { id: 'global' as const, label: 'Global (EN)' },
  { id: 'japanese' as const, label: 'Japanese (img)' },
];
