import { Image } from 'expo-image';
import { Platform } from 'react-native';
import { resolveCardImageUrl } from './cards';
import { isLocalWebImageUri, resolveWebStaticPath } from './localImages';

/** Thumbnail size in catalog list (matches CardItem). */
export const CATALOG_THUMB = { width: 72, height: 100 } as const;

/** Large preview in card detail modal. */
export const DETAIL_IMAGE = { width: 300, height: 417 } as const;

export function resolveDisplayImageUri(
  uri: string,
  width: number,
  height: number
): string {
  if (Platform.OS !== 'web') return uri;
  if (isLocalWebImageUri(uri)) return resolveWebStaticPath(uri);
  return resolveCardImageUrl(uri, width, height);
}

/** Prefetch URLs into expo-image disk/memory cache. */
export async function prefetchImageUris(
  uris: string[],
  width: number,
  height: number
): Promise<void> {
  const unique = [...new Set(uris.filter(Boolean))];
  if (!unique.length) return;

  await Promise.all(
    unique.map((uri) => {
      const src = resolveDisplayImageUri(uri, width, height);
      if (Platform.OS === 'web' && isLocalWebImageUri(uri)) return Promise.resolve();
      return Image.prefetch(src).catch(() => undefined);
    })
  );
}
