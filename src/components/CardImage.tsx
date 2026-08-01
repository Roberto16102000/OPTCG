import { Image, type ImageProps } from 'expo-image';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { isLocalWebImageUri } from '../utils/localImages';
import { resolveDisplayImageUri } from '../utils/imageLoading';

interface CardImageProps {
  uri: string;
  width: number;
  height: number;
  style?: StyleProp<ViewStyle>;
  contentFit?: ImageProps['contentFit'];
  contentPosition?: ImageProps['contentPosition'];
  priority?: ImageProps['priority'];
  recyclingKey?: string;
  /** URL remota de respaldo si la local (/card-images/) falla en web. */
  fallbackUri?: string;
}

/** Card image with disk cache (native + web) and optional wsrv proxy on web. */
export function CardImage({
  uri,
  width,
  height,
  style,
  contentFit = 'contain',
  contentPosition = 'center',
  priority = 'normal',
  recyclingKey,
  fallbackUri,
}: CardImageProps) {
  const [failed, setFailed] = useState(false);
  const [useFallback, setUseFallback] = useState(false);

  const primaryUri = useMemo(
    () => resolveDisplayImageUri(uri, width, height),
    [uri, width, height]
  );

  const remoteFallbackUri = useMemo(() => {
    if (!fallbackUri) return undefined;
    return resolveDisplayImageUri(fallbackUri, width, height);
  }, [fallbackUri, width, height]);

  const displayUri =
    useFallback && remoteFallbackUri ? remoteFallbackUri : primaryUri;

  useEffect(() => {
    setFailed(false);
    setUseFallback(false);
  }, [primaryUri, remoteFallbackUri]);

  const handleError = () => {
    if (
      !useFallback &&
      remoteFallbackUri &&
      isLocalWebImageUri(uri) &&
      displayUri !== remoteFallbackUri
    ) {
      setUseFallback(true);
      return;
    }
    setFailed(true);
  };

  return (
    <View style={[styles.wrap, { width, height }, style]}>
      {!failed ? (
        <Image
          source={{ uri: displayUri }}
          style={{ width, height }}
          contentFit={contentFit}
          contentPosition={contentPosition}
          cachePolicy="memory-disk"
          priority={priority}
          recyclingKey={recyclingKey ?? displayUri}
          transition={120}
          placeholder={{ color: 'transparent' }}
          onError={handleError}
        />
      ) : (
        <Placeholder width={width} height={height} />
      )}
    </View>
  );
}

function Placeholder({ width, height }: { width: number; height: number }) {
  return (
    <View style={[styles.placeholder, { width, height }]}>
      <Text style={styles.placeholderText}>🃏</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  placeholderText: { fontSize: 28, opacity: 0.5 },
});
