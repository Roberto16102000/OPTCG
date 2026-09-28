import { Image, type ImageProps } from 'expo-image';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { isLocalWebImageUri } from '../utils/localImages';
import { resolveDisplayImageUri } from '../utils/imageLoading';
import { getCardTrim } from '../utils/cardTrim';

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
  /**
   * Id de la carta para recortarle el marco claro del escaneo de Bandai.
   * Cuanto recortar sale de `card-trim-manifest.json`, medido imagen a imagen:
   * el marco va de 0 a un 2,8 % del ancho segun la carta, asi que un valor
   * fijo se comeria contenido en las que menos traen.
   */
  trimId?: string;
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
  trimId,
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

  // Solo se recorta la imagen local medida; el respaldo remoto es otro
  // encuadre y recortarlo a ciegas cortaria la carta.
  const trim = useMemo(
    () => (trimId && !useFallback ? getCardTrim(trimId) : null),
    [trimId, useFallback]
  );

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
          style={
            trim
              ? {
                  // La imagen se agranda y se desplaza para que el marco caiga
                  // fuera del recorte del contenedor.
                  width: width / (1 - trim.l - trim.r),
                  height: height / (1 - trim.t - trim.b),
                  marginLeft: -(width / (1 - trim.l - trim.r)) * trim.l,
                  marginTop: -(height / (1 - trim.t - trim.b)) * trim.t,
                }
              : { width, height }
          }
          // Recortando hay que estirar al hueco: con `contain` volveria a
          // dejar franjas, que es justo lo que se esta quitando.
          contentFit={trim ? 'fill' : contentFit}
          contentPosition={contentPosition}
          cachePolicy="memory-disk"
          priority={priority}
          recyclingKey={recyclingKey ?? displayUri}
          transition={120}
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
