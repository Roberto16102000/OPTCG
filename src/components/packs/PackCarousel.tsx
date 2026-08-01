import { Pressable, StyleSheet, View } from 'react-native';
import { ART_CROPS, getBoosterImageUri } from '../../utils/boosterImages';
import type { PackDefinition } from '../../utils/packs';
import { BoosterArt } from './BoosterArt';

const CENTER_HEIGHT = 260;
const SIDE_HEIGHT = 190;
/** Cuánto se solapan los sobres laterales con el central. */
const OVERLAP = 44;

interface PackCarouselProps {
  packs: PackDefinition[];
  index: number;
  onSelect: (packId: string) => void;
}

/**
 * Sobre activo grande y centrado, con el anterior y el siguiente detrás,
 * más pequeños y atenuados. Da la vuelta al llegar a los extremos.
 */
export function PackCarousel({ packs, index, onSelect }: PackCarouselProps) {
  if (!packs.length) return null;

  const wrap = (i: number) => (i + packs.length) % packs.length;
  const prev = packs[wrap(index - 1)];
  const current = packs[index];
  const next = packs[wrap(index + 1)];

  const showSides = packs.length > 1;

  return (
    <View style={styles.stage}>
      {showSides ? (
        <Side pack={prev} side="left" onPress={() => onSelect(prev.id)} />
      ) : null}

      <View style={styles.center}>
        <BoosterArt uri={getBoosterImageUri(current.id) ?? ''} height={CENTER_HEIGHT} crop={ART_CROPS.booster} />
      </View>

      {showSides && next.id !== prev.id ? (
        <Side pack={next} side="right" onPress={() => onSelect(next.id)} />
      ) : null}
    </View>
  );
}

function Side({
  pack,
  side,
  onPress,
}: {
  pack: PackDefinition;
  side: 'left' | 'right';
  onPress: () => void;
}) {
  const uri = getBoosterImageUri(pack.id);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Ver sobre ${pack.label}`}
      style={({ pressed }) => [
        styles.side,
        side === 'left' ? styles.sideLeft : styles.sideRight,
        pressed && styles.sidePressed,
      ]}
    >
      <BoosterArt uri={uri ?? ''} height={SIDE_HEIGHT} crop={ART_CROPS.booster} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  stage: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: CENTER_HEIGHT + 24,
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
  sideLeft: {
    marginRight: -OVERLAP,
  },
  sideRight: {
    marginLeft: -OVERLAP,
  },
  sidePressed: {
    opacity: 0.85,
  },
});
