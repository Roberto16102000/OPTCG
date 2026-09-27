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
  /** Versión reducida, para pantallas donde el dato no es lo principal. */
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Celda de dato: rótulo pequeño, cifra grande en oro y pista o barra debajo. */
export function StatBox({
  label,
  value,
  suffix,
  hint,
  progress,
  compact,
  style,
}: StatBoxProps) {
  return (
    <View style={[styles.box, compact && styles.boxCompact, style]}>
      <Text style={[styles.label, compact && styles.labelCompact]} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[styles.value, compact && styles.valueCompact]}>
        {value}
        {suffix ? (
          <Text style={[styles.suffix, compact && styles.suffixCompact]}>{suffix}</Text>
        ) : null}
      </Text>
      {progress !== undefined ? (
        <BountyBar progress={progress} style={styles.bar} />
      ) : hint ? (
        <Text style={[styles.hint, compact && styles.hintCompact]} numberOfLines={1}>
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
  boxCompact: {
    minWidth: 96,
    paddingVertical: spacing.xs + 1,
    paddingHorizontal: spacing.sm,
  },
  labelCompact: { fontSize: 9, letterSpacing: 0.4 },
  valueCompact: { fontSize: 16 },
  suffixCompact: { fontSize: 11 },
  hintCompact: { fontSize: 9 },
});
