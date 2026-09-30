import { Image, type ImageProps } from 'expo-image';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { mirrorProxyUrl } from '../utils/cards';
import { resolveDisplayImageUri } from '../utils/imageLoading';
import { getCardHdUri } from '../utils/cardHd';
import { useNearViewport } from '../hooks/useNearViewport';

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
   * Id de la carta. Con el, y si se pinta pequeña, se usa la miniatura propia
   * en vez de pasar por el proxy: es lo que aligera las rejillas, donde se
   * piden 60 imagenes de golpe.
   */
  cardId?: string;
  /** Avisa cuando la imagen definitiva ya esta en pantalla. */
  onLoaded?: () => void;
  /**
   * No descargar hasta que la carta se acerque a la pantalla.
   *
   * Para las rejillas, donde se pintan 60 de golpe y solo se ven unas pocas.
   * En la ficha y en la apertura de sobres NO se usa: ahi la carta es el
   * motivo de estar mirando, y esperar a que entre en pantalla la retrasaria.
   */
  lazy?: boolean;
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
  cardId,
  onLoaded,
  lazy = false,
}: CardImageProps) {
  const { ref: refVisible, visible } = useNearViewport<View>();
  const cargar = !lazy || visible;
  /** Cual de los candidatos se esta intentando; al agotarlos, el marcador. */
  const [intento, setIntento] = useState(0);

  const primaryUri = useMemo(
    () => resolveDisplayImageUri(uri, width, height, cardId),
    [uri, width, height, cardId]
  );

  const remoteFallbackUri = useMemo(() => {
    if (!fallbackUri) return undefined;
    return resolveDisplayImageUri(fallbackUri, width, height, cardId);
  }, [fallbackUri, width, height, cardId]);

  /*
    Cadena de intentos: la principal, luego la remota de respaldo y, por
    ultimo, cada una por el host espejo del proxy.

    Antes solo habia un respaldo y ademas exigia que la principal fuese local,
    asi que un fallo del proxy -que es intermitente cuando se piden 60 de golpe-
    dejaba la carta en el marcador para siempre, sin reintentar.
  */
  const candidatos = useMemo(() => {
    const lista: string[] = [];
    // La miniatura va primero cuando la carta se pinta pequeña; si no existe,
    // el `onError` pasa al siguiente candidato sin que se note.
    // La copia propia va antes que el proxy. Si falta, el `onError` cae al
    // proxy sin que se note.
    const propia = getCardHdUri(cardId);
    if (propia) lista.push(propia);
    lista.push(primaryUri);
    if (remoteFallbackUri && remoteFallbackUri !== primaryUri) lista.push(remoteFallbackUri);
    for (const u of [...lista]) {
      const espejo = mirrorProxyUrl(u);
      if (espejo && !lista.includes(espejo)) lista.push(espejo);
    }
    return lista;
  }, [primaryUri, remoteFallbackUri, cardId, width]);

  const displayUri = candidatos[intento];
  const failed = intento >= candidatos.length;


  useEffect(() => {
    setIntento(0);
  }, [candidatos]);

  const handleError = () => {
    setIntento((n) => n + 1);
  };

  return (
    <View ref={lazy ? refVisible : undefined} style={[styles.wrap, { width, height }, style]}>
      {!cargar ? (
        // Hueco del tamaño exacto, para que la rejilla no se mueva al llegar.
        <View style={{ width, height }} />
      ) : !failed ? (
        <Image
          source={{ uri: displayUri }}
          style={{ width, height }}
          contentFit={contentFit}
          contentPosition={contentPosition}
          cachePolicy="memory-disk"
          priority={priority}
          recyclingKey={recyclingKey ?? displayUri}
          transition={120}
          onError={handleError}
          onLoad={onLoaded}
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
