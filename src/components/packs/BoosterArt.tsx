import { Image } from 'expo-image';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { type ArtCrop } from '../../utils/boosterImages';

interface BoosterArtProps {
  uri: string;
  /** Alto del sobre; el ancho sale de la proporción real del arte. */
  height: number;
  /** Encuadre a aplicar: sobres y mazos no comparten margen. */
  crop: ArtCrop;
  style?: StyleProp<ViewStyle>;
}

/**
 * Muestra el sobre recortado, sin el margen transparente del lienzo original,
 * de modo que llena por completo el marco que lo contiene.
 */
export function BoosterArt({ uri, height, crop, style }: BoosterArtProps) {
  const width = height * (crop.width / crop.height);
  // Escala a la que el recorte mide exactamente el marco.
  const scale = width / crop.width;

  return (
    <View style={[styles.frame, { width, height }, style]}>
      <Image
        source={{ uri }}
        style={{
          position: 'absolute',
          left: -crop.x * scale,
          top: -crop.y * scale,
          width: crop.canvasW * scale,
          height: crop.canvasH * scale,
        }}
        contentFit="fill"
        cachePolicy="memory-disk"
        transition={120}
        // Sin clave, expo-image recicla vistas y un sobre puede quedarse con el
        // bitmap del anterior: se veía el arte del promo bajo el marco de EB-01.
        recyclingKey={uri}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    overflow: 'hidden',
  },
});
