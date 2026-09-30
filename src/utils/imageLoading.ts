import { Image } from 'expo-image';
import { Platform } from 'react-native';
import { resolveCardImageUrl } from './cards';
import { getCardCrop } from './cardCrop';
import { getCardThumbUri } from './cardThumbs';
import { isLocalWebImageUri, resolveWebStaticPath } from './localImages';

/** Thumbnail size in catalog list (matches CardItem). */
export const CATALOG_THUMB = { width: 72, height: 100 } as const;

/** Large preview in card detail modal. */
export const DETAIL_IMAGE = { width: 300, height: 417 } as const;

export function resolveDisplayImageUri(
  uri: string,
  width: number,
  height: number,
  cardId?: string
): string {
  if (Platform.OS !== 'web') return uri;
  if (isLocalWebImageUri(uri)) return resolveWebStaticPath(uri);
  return resolveCardImageUrl(uri, width, height, getCardCrop(cardId));
}

/**
 * Deja las imágenes en la caché de expo-image antes de que se pinten.
 *
 * Si se pasan los códigos de carta se precarga exactamente la misma URL que va
 * a pedir `CardImage` -la miniatura propia cuando toca-. Precargar el proxy
 * mientras la rejilla tira de la miniatura descargaba las dos: el doble de
 * peticiones para pintar lo mismo.
 */
export async function prefetchImageUris(
  uris: string[],
  width: number,
  height: number,
  cardIds?: readonly (string | undefined)[]
): Promise<void> {
  const fuentes = new Set<string>();

  uris.forEach((uri, i) => {
    if (!uri) return;
    const thumb = getCardThumbUri(cardIds?.[i], width);
    if (thumb) {
      fuentes.add(thumb);
      return;
    }
    if (Platform.OS === 'web' && isLocalWebImageUri(uri)) return;
    fuentes.add(resolveDisplayImageUri(uri, width, height, cardIds?.[i]));
  });

  if (!fuentes.size) return;
  await Promise.all([...fuentes].map((src) => Image.prefetch(src).catch(() => undefined)));
}
