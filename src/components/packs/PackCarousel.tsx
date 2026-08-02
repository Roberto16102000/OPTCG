import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { getArtCrop, getBoosterImageUri } from '../../utils/boosterImages';
import type { PackDefinition } from '../../utils/packs';
import { BoosterArt } from './BoosterArt';

const CENTER_HEIGHT = 260;
const SIDE_HEIGHT = 190;
/** Ancho al que el carrusel se ve a tamaño completo. */
const FULL_WIDTH = 520;
/** Cuánto se solapan los sobres laterales con el central, a escala 1. */
const OVERLAP = 44;

interface PackCarouselProps {
  packs: PackDefinition[];
  index: number;
  onSelect: (packId: string) => void;
}

/**
 * Sobre activo grande y centrado, con el anterior y el siguiente detrás, más
 * pequeños y atenuados. Da la vuelta al llegar a los extremos.
 *
 * En pantalla estrecha se encoge en lugar de ocultar los laterales: son la
 * única forma de cambiar de sobre, así que esconderlos dejaría la pantalla sin
 * navegación.
 */
export function PackCarousel({ packs, index, onSelect }: PackCarouselProps) {
  const { width } = useWindowDimensions();
  const scale = Math.max(0.58, Math.min(1, width / FULL_WIDTH));

  if (!packs.length) return null;

  const wrap = (i: number) => (i + packs.length) % packs.length;
  const prev = packs[wrap(index - 1)];
  const current = packs[index];
  const next = packs[wrap(index + 1)];

  const centerHeight = Math.round(CENTER_HEIGHT * scale);
  const sideHeight = Math.round(SIDE_HEIGHT * scale);
  const overlap = Math.round(OVERLAP * scale);
  const showSides = packs.length > 1;

  return (
    <View style={[styles.stage, { height: centerHeight + 24 }]}>
      {showSides ? (
        <Side
          pack={prev}
          height={sideHeight}
          style={{ marginRight: -overlap }}
          onPress={() => onSelect(prev.id)}
        />
      ) : null}

      <View style={styles.center}>
        <BoosterArt
          uri={getBoosterImageUri(current.id) ?? ''}
          height={centerHeight}
          crop={getArtCrop(current.id)}
        />
      </View>

      {showSides && next.id !== prev.id ? (
        <Side
          pack={next}
          height={sideHeight}
          style={{ marginLeft: -overlap }}
          onPress={() => onSelect(next.id)}
        />
      ) : null}
    </View>
  );
}

function Side({
  pack,
  height,
  style,
  onPress,
}: {
  pack: PackDefinition;
  height: number;
  style: { marginLeft?: number; marginRight?: number };
  onPress: () => void;
}) {
  const uri = getBoosterImageUri(pack.id);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Ver sobre ${pack.label}`}
      style={({ pressed }) => [styles.side, style, pressed && styles.sidePressed]}
    >
      <BoosterArt uri={uri ?? ''} height={height} crop={getArtCrop(pack.id)} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  stage: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    zIndex: 2,
    ...({
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.5,
      shadowRadius: 20,
      elevation: 12,
    } as const),
  },
  side: {
    zIndex: 1,
    opacity: 0.55,
  },
  sidePressed: {
    opacity: 0.85,
  },
});
