import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, elevation, radii, spacing } from '../../constants/theme';

type PanelTone = 'default' | 'raised' | 'sunken';

interface PanelProps {
  children: React.ReactNode;
  tone?: PanelTone;
  /** Filo dorado superior, como la tapa de un cofre. Para bloques destacados. */
  crowned?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Superficie base de la app: fondo, borde fino y esquinas redondeadas. */
export function Panel({ children, tone = 'default', crowned, style }: PanelProps) {
  return (
    <View style={[styles.base, TONES[tone], style]}>
      {crowned ? <View style={styles.crown} pointerEvents="none" /> : null}
      {children}
    </View>
  );
}

const TONES: Record<PanelTone, ViewStyle> = {
  default: { backgroundColor: colors.surface },
  raised: { backgroundColor: colors.surfaceRaised, ...elevation.medium },
  sunken: { backgroundColor: colors.surfaceSunken },
};

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    overflow: 'hidden',
  },
  crown: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: colors.gold,
    opacity: 0.75,
  },
});
