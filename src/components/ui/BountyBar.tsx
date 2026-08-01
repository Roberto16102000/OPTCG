import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radii } from '../../constants/theme';

interface BountyBarProps {
  /** 0–1. Se recorta a ese rango. */
  progress: number;
  height?: number;
  style?: StyleProp<ViewStyle>;
}

/** Barra de progreso en oro sobre canal hundido. */
export function BountyBar({ progress, height = 8, style }: BountyBarProps) {
  const pct = Math.max(0, Math.min(1, progress)) * 100;
  return (
    <View
      style={[styles.track, { height, borderRadius: height / 2 }, style]}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(pct) }}
    >
      <View style={[styles.fill, { width: `${pct}%`, borderRadius: height / 2 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    backgroundColor: colors.surfaceSunken,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: colors.gold,
    borderRadius: radii.pill,
  },
});
