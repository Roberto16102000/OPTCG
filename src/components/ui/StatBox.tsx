import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radii, spacing, typography } from '../../constants/theme';
import { BountyBar } from './BountyBar';

interface StatBoxProps {
  label: string;
  value: string;
  /** Parte atenuada del valor, p. ej. el `/119` de `46/119`. */
  suffix?: string;
  hint?: string;
  progress?: number;
  style?: StyleProp<ViewStyle>;
}

/** Celda de dato: rótulo pequeño, cifra grande en oro y pista o barra debajo. */
export function StatBox({ label, value, suffix, hint, progress, style }: StatBoxProps) {
  return (
    <View style={[styles.box, style]}>
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
      <Text style={styles.value}>
        {value}
        {suffix ? <Text style={styles.suffix}>{suffix}</Text> : null}
      </Text>
      {progress !== undefined ? (
        <BountyBar progress={progress} style={styles.bar} />
      ) : hint ? (
        <Text style={styles.hint} numberOfLines={1}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flex: 1,
    minWidth: 120,
    backgroundColor: colors.surfaceSunken,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    gap: 2,
  },
  label: {
    ...typography.caption,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  value: {
    ...typography.title,
    color: colors.goldInk,
  },
  suffix: {
    ...typography.body,
    color: colors.textFaint,
    fontWeight: '700',
  },
  hint: {
    ...typography.caption,
    color: colors.textFaint,
  },
  bar: {
    marginTop: spacing.xs,
  },
});
